import {NextResponse} from "next/server";
import {getSessionUser,requireAdminDb,AMAL_EMAIL,AADIL_EMAIL} from "@/lib/outreach";
import {buildCreativeBrief,creativeTaskGuidance,dailyCreativeFocus} from "@/lib/creative-ops";
import {teamUsers} from "@/lib/team-auth";

const ORG_ID="acda1757-1698-405a-8451-5674316ceeaf";
const ANEESH_EMAIL=(teamUsers.find(x=>x.name==="Aneesh")?.email||"msaneeshnath@gmail.com").toLowerCase();
const ALLOWED=new Set([ANEESH_EMAIL,AMAL_EMAIL.toLowerCase(),AADIL_EMAIL.toLowerCase()]);
const STATUSES=new Set(["todo","in_progress","blocked","done","cancelled"]);
const PRIORITIES=new Set(["low","medium","high","urgent"]);
const APPROVAL_STATES=new Set(["not_started","internal_review","client_review","revision","approved"]);
const UPDATE_TYPES=new Set(["note","revision","review","approval","handoff","blocker","completion"]);
export const dynamic="force-dynamic";

function clean(value:unknown,limit=1000){
  return typeof value==="string"?value.trim().slice(0,limit):"";
}
function allowed(user:{email:string}|null){
  return !!user&&ALLOWED.has(user.email.toLowerCase());
}
function validUuid(value:string){
  return /^[a-f0-9-]{36}$/i.test(value);
}
function validHttps(value:string){
  try{return new URL(value).protocol==="https:"}catch{return false}
}

async function loadTasks(db:any){
  const tasks=await db.from("tasks")
    .select("id,title,description,status,priority,due_at,assignee_email,automation_key,source,created_at,updated_at")
    .eq("organization_id",ORG_ID)
    .eq("assignee_email",ANEESH_EMAIL)
    .order("updated_at",{ascending:false})
    .limit(200);
  if(tasks.error)throw tasks.error;
  const ids=(tasks.data||[]).map((x:any)=>x.id);
  let details:any[]=[];
  let updates:any[]=[];
  if(ids.length){
    const [d,u]=await Promise.all([
      db.from("creative_task_details").select("*").eq("organization_id",ORG_ID).in("task_id",ids),
      db.from("creative_task_updates").select("*").eq("organization_id",ORG_ID).in("task_id",ids).order("created_at",{ascending:false}).limit(500)
    ]);
    if(d.error)throw d.error;if(u.error)throw u.error;
    details=d.data||[];updates=u.data||[];
  }
  return (tasks.data||[]).map((task:any)=>{
    const detail=details.find((x:any)=>x.task_id===task.id)||{};
    const input={
      ...task,
      clientName:detail.client_name,
      deliverableType:detail.deliverable_type,
      platform:detail.platform,
      objective:detail.objective,
      audience:detail.audience,
      offer:detail.offer,
      revisionCount:detail.revision_count,
      approvalState:detail.approval_state
    };
    return {
      ...task,
      detail,
      guidance:creativeTaskGuidance(input),
      updates:updates.filter((x:any)=>x.task_id===task.id).slice(0,20)
    };
  });
}


async function requireAneeshTask(db:any,taskId:string){
  if(!validUuid(taskId))throw new Error("Valid task id required.");
  const task=await db.from("tasks")
    .select("id,assignee_email")
    .eq("organization_id",ORG_ID)
    .eq("id",taskId)
    .eq("assignee_email",ANEESH_EMAIL)
    .single();
  if(task.error||!task.data)throw new Error("Aneesh creative task not found.");
  return task.data;
}

async function logEvent(db:any,type:string,taskId:string,payload:Record<string,unknown>){
  await db.from("events").insert({
    organization_id:ORG_ID,
    event_type:type,
    aggregate_type:"creative_task",
    aggregate_id:taskId,
    payload
  });
}

export async function GET(req:Request){
  const user=getSessionUser(req);
  if(!allowed(user))return NextResponse.json({ok:false,error:"Creative Ops access is limited to Aneesh and founders."},{status:403});
  try{
    const db=await requireAdminDb();
    const tasks=await loadTasks(db);
    const focus=dailyCreativeFocus(tasks.map((x:any)=>({
      ...x,
      clientName:x.detail?.client_name,
      deliverableType:x.detail?.deliverable_type,
      platform:x.detail?.platform,
      objective:x.detail?.objective,
      audience:x.detail?.audience,
      offer:x.detail?.offer,
      revisionCount:x.detail?.revision_count,
      approvalState:x.detail?.approval_state
    })));
    const summary={
      total:tasks.filter((x:any)=>x.status!=="cancelled").length,
      todo:tasks.filter((x:any)=>x.status==="todo").length,
      inProgress:tasks.filter((x:any)=>x.status==="in_progress").length,
      blocked:tasks.filter((x:any)=>x.status==="blocked").length,
      review:tasks.filter((x:any)=>["internal_review","client_review","revision"].includes(x.detail?.approval_state)).length,
      done:tasks.filter((x:any)=>x.status==="done").length
    };
    return NextResponse.json({
      ok:true,user,owner:{name:"Aneesh",email:ANEESH_EMAIL,role:"Design Lead · Creative"},
      tasks,focus,summary,
      collaborators:teamUsers.filter(x=>["Shahid","Jishnu","Amal","Aadil"].includes(x.name))
    });
  }catch(error:any){
    return NextResponse.json({ok:false,error:error?.message||"Creative Ops unavailable"},{status:503});
  }
}

export async function POST(req:Request){
  const user=getSessionUser(req);
  if(!allowed(user))return NextResponse.json({ok:false,error:"Creative Ops access is limited to Aneesh and founders."},{status:403});
  const body=await req.json().catch(()=>({}));
  const action=String(body.action||"");
  try{
    const db=await requireAdminDb();

    if(action==="create_task"){
      const title=clean(body.title,180);
      const priority=PRIORITIES.has(String(body.priority))?String(body.priority):"medium";
      const dueAt=clean(body.dueAt,60)||null;
      if(!title)return NextResponse.json({ok:false,error:"Task title is required."},{status:400});
      const created=await db.from("tasks").insert({
        organization_id:ORG_ID,
        title,
        description:clean(body.description,2000)||null,
        status:"todo",
        priority,
        due_at:dueAt,
        assignee_email:ANEESH_EMAIL,
        automation_key:"creative_ops",
        source:"creative_ops"
      }).select("*").single();
      if(created.error)throw created.error;
      const detailInput={
        clientName:clean(body.clientName,160),
        title,
        deliverableType:clean(body.deliverableType,120),
        platform:clean(body.platform,120),
        objective:clean(body.objective,500),
        audience:clean(body.audience,500),
        offer:clean(body.offer,500),
        dueAt,
        priority:priority as any,
        status:"todo",
        approvalState:"not_started"
      };
      const autoBrief=body.autoBrief===false?"":buildCreativeBrief(detailInput);
      const detail=await db.from("creative_task_details").insert({
        task_id:created.data.id,
        organization_id:ORG_ID,
        client_name:detailInput.clientName||null,
        deliverable_type:detailInput.deliverableType||null,
        platform:detailInput.platform||null,
        objective:detailInput.objective||null,
        audience:detailInput.audience||null,
        offer:detailInput.offer||null,
        brief:clean(body.brief,6000)||autoBrief||null,
        output_spec:clean(body.outputSpec,1000)||null,
        created_by:user!.email,
        updated_by:user!.email
      }).select("*").single();
      if(detail.error){
        await db.from("tasks").delete().eq("id",created.data.id);
        throw detail.error;
      }
      await logEvent(db,"creative.task.created",created.data.id,{by:user!.email,priority,client:detailInput.clientName||null});
      return NextResponse.json({ok:true,task:created.data,detail:detail.data},{status:201});
    }

    if(action==="update_task"){
      const taskId=String(body.taskId||"");
      if(!validUuid(taskId))return NextResponse.json({ok:false,error:"Valid task id required."},{status:400});
      const patch:any={updated_at:new Date().toISOString()};
      if(body.status!==undefined){
        if(!STATUSES.has(String(body.status)))return NextResponse.json({ok:false,error:"Invalid task status."},{status:400});
        patch.status=String(body.status);
      }
      if(body.priority!==undefined){
        if(!PRIORITIES.has(String(body.priority)))return NextResponse.json({ok:false,error:"Invalid task priority."},{status:400});
        patch.priority=String(body.priority);
      }
      if(body.dueAt!==undefined)patch.due_at=clean(body.dueAt,60)||null;
      if(body.title!==undefined)patch.title=clean(body.title,180);
      if(body.description!==undefined)patch.description=clean(body.description,2000)||null;
      const updated=await db.from("tasks").update(patch).eq("organization_id",ORG_ID).eq("id",taskId).eq("assignee_email",ANEESH_EMAIL).select("*").single();
      if(updated.error)throw updated.error;
      await logEvent(db,"creative.task.updated",taskId,{by:user!.email,status:patch.status||null,priority:patch.priority||null,due_at:patch.due_at??undefined});
      return NextResponse.json({ok:true,task:updated.data});
    }

    if(action==="update_brief"){
      const taskId=String(body.taskId||"");
      await requireAneeshTask(db,taskId);
      const current=await db.from("creative_task_details").select("*").eq("organization_id",ORG_ID).eq("task_id",taskId).single();
      if(current.error||!current.data)return NextResponse.json({ok:false,error:"Creative task details not found."},{status:404});
      const patch:any={updated_by:user!.email,updated_at:new Date().toISOString()};
      for(const [key,column,limit] of [
        ["clientName","client_name",160],["deliverableType","deliverable_type",120],["platform","platform",120],
        ["objective","objective",500],["audience","audience",500],["offer","offer",500],
        ["brief","brief",6000],["outputSpec","output_spec",1000],["clientFeedback","client_feedback",3000],
        ["handoffNote","handoff_note",1500]
      ] as any[]){
        if(body[key]!==undefined)patch[column]=clean(body[key],limit)||null;
      }
      if(body.handoffTo!==undefined){
        const target=clean(body.handoffTo,320).toLowerCase();
        if(target&&!teamUsers.some(member=>member.email.toLowerCase()===target)){
          return NextResponse.json({ok:false,error:"Handoff target must be a COMIT teammate."},{status:400});
        }
        patch.handoff_to=target||null;
      }
      if(body.approvalState!==undefined){
        if(!APPROVAL_STATES.has(String(body.approvalState)))return NextResponse.json({ok:false,error:"Invalid approval state."},{status:400});
        patch.approval_state=String(body.approvalState);
      }
      const updated=await db.from("creative_task_details").update(patch).eq("organization_id",ORG_ID).eq("task_id",taskId).select("*").single();
      if(updated.error)throw updated.error;
      if(patch.handoff_to){
        const target=teamUsers.find(member=>member.email.toLowerCase()===patch.handoff_to);
        if(target){
          await db.from("notifications").insert({
            organization_id:ORG_ID,
            type:"creative_handoff",
            title:"Creative handoff from Aneesh",
            body:"A creative task needs "+target.name+"'s input: "+String(updated.data.client_name||"Creative task")+".",
            metadata:{target_email:target.email,task_id:taskId,source:"creative_ops",link:"/creative-ops"}
          });
          await logEvent(db,"creative.task.handoff",taskId,{by:user!.email,to:target.email,note:patch.handoff_note||null});
        }
      }
      return NextResponse.json({ok:true,detail:updated.data});
    }

    if(action==="regenerate_brief"){
      const taskId=String(body.taskId||"");
      await requireAneeshTask(db,taskId);
      const task=await db.from("tasks").select("*").eq("organization_id",ORG_ID).eq("id",taskId).eq("assignee_email",ANEESH_EMAIL).single();
      const detail=await db.from("creative_task_details").select("*").eq("organization_id",ORG_ID).eq("task_id",taskId).single();
      if(task.error||detail.error)return NextResponse.json({ok:false,error:"Creative task not found."},{status:404});
      const brief=buildCreativeBrief({
        title:task.data.title,priority:task.data.priority,dueAt:task.data.due_at,status:task.data.status,
        clientName:detail.data.client_name,deliverableType:detail.data.deliverable_type,platform:detail.data.platform,
        objective:detail.data.objective,audience:detail.data.audience,offer:detail.data.offer,
        revisionCount:detail.data.revision_count,approvalState:detail.data.approval_state
      });
      const updated=await db.from("creative_task_details").update({brief,updated_by:user!.email,updated_at:new Date().toISOString()}).eq("task_id",taskId).select("*").single();
      if(updated.error)throw updated.error;
      return NextResponse.json({ok:true,brief,detail:updated.data});
    }

    if(action==="add_update"){
      const taskId=String(body.taskId||"");
      await requireAneeshTask(db,taskId);
      const updateType=String(body.updateType||"note");
      const note=clean(body.note,3000);
      if(!validUuid(taskId)||!UPDATE_TYPES.has(updateType)||!note)return NextResponse.json({ok:false,error:"Task, update type and note are required."},{status:400});
      const row=await db.from("creative_task_updates").insert({
        organization_id:ORG_ID,task_id:taskId,update_type:updateType,note,created_by:user!.email
      }).select("*").single();
      if(row.error)throw row.error;
      if(updateType==="revision"){
        const current=await db.from("creative_task_details").select("revision_count").eq("task_id",taskId).single();
        await db.from("creative_task_details").update({
          revision_count:Number(current.data?.revision_count||0)+1,
          approval_state:"revision",
          updated_by:user!.email,updated_at:new Date().toISOString()
        }).eq("task_id",taskId);
      }else if(updateType==="approval"){
        await db.from("creative_task_details").update({approval_state:"approved",updated_by:user!.email,updated_at:new Date().toISOString()}).eq("task_id",taskId);
      }else if(updateType==="blocker"){
        await db.from("tasks").update({status:"blocked",updated_at:new Date().toISOString()}).eq("id",taskId);
      }else if(updateType==="completion"){
        await db.from("tasks").update({status:"done",updated_at:new Date().toISOString()}).eq("id",taskId);
      }
      await logEvent(db,"creative.task.update_added",taskId,{by:user!.email,update_type:updateType});
      return NextResponse.json({ok:true,update:row.data});
    }

    if(action==="add_asset_link"){
      const taskId=String(body.taskId||"");
      await requireAneeshTask(db,taskId);
      const url=clean(body.url,1200);
      const label=clean(body.label,160)||"Creative asset";
      if(!validUuid(taskId)||!validHttps(url))return NextResponse.json({ok:false,error:"Add a valid HTTPS asset link."},{status:400});
      const current=await db.from("creative_task_details").select("asset_links").eq("organization_id",ORG_ID).eq("task_id",taskId).single();
      if(current.error)throw current.error;
      const links=Array.isArray(current.data.asset_links)?current.data.asset_links:[];
      const next=[...links.filter((x:any)=>x?.url!==url),{url,label,added_by:user!.email,added_at:new Date().toISOString()}].slice(-20);
      const updated=await db.from("creative_task_details").update({asset_links:next,updated_by:user!.email,updated_at:new Date().toISOString()}).eq("task_id",taskId).select("*").single();
      if(updated.error)throw updated.error;
      return NextResponse.json({ok:true,detail:updated.data});
    }

    return NextResponse.json({ok:false,error:"Unknown Creative Ops action."},{status:400});
  }catch(error:any){
    return NextResponse.json({ok:false,error:error?.message||"Creative Ops action failed"},{status:503});
  }
}
