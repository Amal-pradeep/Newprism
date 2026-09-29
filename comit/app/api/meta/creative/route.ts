import {NextResponse} from "next/server";
import {getSessionUser,isApprover,requireAdminDb} from "@/lib/outreach";
import {teamUsers} from "@/lib/team-auth";
import {buildMetaCreativePackage,evaluateMetaCreative,summarizeMetaInsights,type MetaCreativeInput} from "@/lib/meta-creative";
import {
  activateMetaAd,
  createInstagramContainer,
  createPausedMetaAd,
  getInstagramContainerStatus,
  getMetaAdPreview,
  getMetaInsights,
  metaConfigStatus,
  metaPermissionPlan,
  publishFacebookOrganic,
  publishInstagramContainer
} from "@/lib/meta-client";

const ORG_ID="acda1757-1698-405a-8451-5674316ceeaf";
const OBJECTIVES=new Set(["awareness","traffic","leads","messages","sales","engagement"]);
const CHANNELS=new Set(["instagram_organic","facebook_organic","meta_ads"]);
const EXTERNAL_ACTIONS=new Set(["publish_organic","create_paused_ad","activate_ad"]);
export const dynamic="force-dynamic";

function teamEmail(name:string){
  return teamUsers.find(u=>u.name.toLowerCase()===name.toLowerCase())?.email||"";
}
function isCreativeReviewer(user:{email:string}|null,mediaType:string){
  if(!user)return false;
  if(isApprover(user))return true;
  const email=user.email.toLowerCase();
  if(mediaType==="video")return [teamEmail("Aneesh"),teamEmail("Shahid")].map(x=>x.toLowerCase()).includes(email);
  return email===teamEmail("Aneesh").toLowerCase();
}
function safe(value:unknown,limit=1000){
  return typeof value==="string"?value.trim().slice(0,limit):"";
}
function specialCategoryRisk(values:string[]){
  const text=values.join(" ").toLowerCase();
  return /politic|election|social issue|housing|home loan|mortgage|employment|job vacancy|hiring|credit|financial product|financial service|insurance/.test(text);
}

async function logEvent(db:any,eventType:string,creativeId:string,payload:Record<string,unknown>){
  await db.from("events").insert({
    organization_id:ORG_ID,
    event_type:eventType,
    aggregate_type:"meta_creative",
    aggregate_id:creativeId,
    payload
  });
}
async function notify(db:any,emails:string[],title:string,body:string,metadata:Record<string,unknown>){
  const rows=[...new Set(emails.filter(Boolean))].map(email=>({
    organization_id:ORG_ID,
    type:"meta_approval",
    title,
    body,
    metadata:{...metadata,target_email:email}
  }));
  if(rows.length)await db.from("notifications").insert(rows);
}

async function draftById(db:any,id:string){
  const response=await db.from("meta_creative_drafts").select("*").eq("organization_id",ORG_ID).eq("id",id).single();
  if(response.error||!response.data)throw new Error("Meta creative draft not found.");
  return response.data;
}
async function approvalById(db:any,id:string){
  const response=await db.from("meta_action_approvals").select("*").eq("organization_id",ORG_ID).eq("id",id).single();
  if(response.error||!response.data)throw new Error("Meta approval request not found.");
  return response.data;
}
function selectedVariant(draft:any){
  const variants=Array.isArray(draft.creative_package?.variants)?draft.creative_package.variants:[];
  return variants.find((v:any)=>v.id===draft.selected_variant_id)||variants[0]||null;
}
async function markApprovalNotificationRead(db:any,approvalId:string,email:string){
  await db.from("notifications")
    .update({read_at:new Date().toISOString()})
    .eq("organization_id",ORG_ID)
    .contains("metadata",{approval_id:approvalId,target_email:email});
}

async function consumeApproval(db:any,approvalId:string){
  const now=new Date().toISOString();
  await db.from("meta_action_approvals").update({status:"consumed",consumed_at:now}).eq("organization_id",ORG_ID).eq("id",approvalId).eq("status","approved");
}

export async function GET(req:Request){
  const user=getSessionUser(req);
  if(!user)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
  try{
    const db=await requireAdminDb();
    const drafts=await db.from("meta_creative_drafts")
      .select("*").eq("organization_id",ORG_ID).order("created_at",{ascending:false}).limit(50);
    if(drafts.error)throw drafts.error;
    const ids=(drafts.data||[]).map((x:any)=>x.id);
    let approvals:any[]=[];
    if(ids.length){
      const response=await db.from("meta_action_approvals")
        .select("*").eq("organization_id",ORG_ID).in("creative_id",ids).order("created_at",{ascending:false}).limit(200);
      if(response.error)throw response.error;
      approvals=response.data||[];
    }
    let creativeAssets:any[]=[];
    const space=await db.from("creative_library_spaces").select("id").eq("organization_id",ORG_ID).eq("slug","shahid-video-creative").maybeSingle();
    if(space.data?.id){
      const assets=await db.from("creative_library_assets")
        .select("id,title,asset_type,storage_path,source_url,tags,metadata,created_at")
        .eq("space_id",space.data.id).order("created_at",{ascending:false}).limit(30);
      if(!assets.error){
        creativeAssets=await Promise.all((assets.data||[]).map(async (asset:any)=>{
          let url=asset.source_url||null;
          if(asset.storage_path){
            const signed=await db.storage.from("comit-creative-library").createSignedUrl(asset.storage_path,900);
            url=signed.data?.signedUrl||url;
          }
          return {...asset,url};
        }));
      }
    }
    return NextResponse.json({
      ok:true,
      user,
      permissions:{
        canCreativeReview:isCreativeReviewer(user,"image")||isCreativeReviewer(user,"video"),
        canPublish:isApprover(user)
      },
      integration:metaConfigStatus(),
      metaPermissionPlan,
      creativeAssets,
      workflow:{
        creative:"AI draft -> Aneesh/Shahid review -> creative approved",
        organic:"creative approved -> founder permission -> explicit publish",
        paid:"creative approved -> founder permission -> create PAUSED ad -> review Meta preview -> second founder permission -> ACTIVE"
      },
      drafts:(drafts.data||[]).map((draft:any)=>({
        ...draft,
        approvals:approvals.filter(a=>a.creative_id===draft.id)
      }))
    });
  }catch(error:any){
    return NextResponse.json({ok:false,error:error?.message||"Meta Studio unavailable"},{status:503});
  }
}

export async function POST(req:Request){
  const user=getSessionUser(req);
  if(!user)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
  const body=await req.json().catch(()=>({}));
  const action=String(body.action||"");
  try{
    const db=await requireAdminDb();

    if(action==="prepare"){
      const objective=String(body.objective||"") as MetaCreativeInput["objective"];
      const channel=String(body.channel||"");
      const client=safe(body.client,120);
      const audience=safe(body.audience,300);
      const offer=safe(body.offer,300);
      const proof=safe(body.proof,300);
      const sourceAssetUrl=safe(body.sourceAssetUrl,1000);
      const mediaType=body.mediaType==="image"?"image":"video";
      if(!client||!audience||!offer||!OBJECTIVES.has(objective)||!CHANNELS.has(channel)){
        return NextResponse.json({ok:false,error:"Client, audience, offer, objective and channel are required."},{status:400});
      }
      if(sourceAssetUrl){
        try{if(new URL(sourceAssetUrl).protocol!=="https:")throw new Error()}catch{
          return NextResponse.json({ok:false,error:"Source asset URL must use HTTPS."},{status:400});
        }
      }
      const input:MetaCreativeInput={
        client,
        brand:safe(body.brand,120)||client,
        industry:safe(body.industry,120),
        objective,
        audience,
        offer,
        proof,
        destinationUrl:safe(body.destinationUrl,1000),
        location:safe(body.location,120),
        placement:body.placement||undefined,
        primaryColor:safe(body.primaryColor,40),
        secondaryColor:safe(body.secondaryColor,40),
        mediaType
      };
      const creativePackage=buildMetaCreativePackage(input);
      const evaluations=creativePackage.variants.map(variant=>({variant_id:variant.id,...evaluateMetaCreative(input,variant)}));
      const best=[...evaluations].sort((a,b)=>b.score-a.score)[0];
      const categoryRisk=specialCategoryRisk([input.industry||"",offer,proof,audience]);
      const insert=await db.from("meta_creative_drafts").insert({
        organization_id:ORG_ID,
        client_name:client,
        brand_name:input.brand||client,
        objective,
        channel,
        placement:creativePackage.placement,
        media_type:mediaType,
        source_asset_url:sourceAssetUrl||null,
        creative_package:{...creativePackage,evaluations,special_category_review_required:categoryRisk},
        selected_variant_id:best?.variant_id||"v1",
        quality_evaluation:best||{},
        meta_payload:{
          audience,
          offer,
          proof,
          industry:input.industry||"",
          location:input.location||"",
          destination_url:input.destinationUrl||"",
          ad_set_id:safe(body.adSetId,80),
          image_hash:safe(body.imageHash,200),
          video_id:safe(body.videoId,200),
          thumbnail_url:safe(body.thumbnailUrl,1000)
        },
        status:"draft",
        created_by:user.email
      }).select("*").single();
      if(insert.error)throw insert.error;
      await logEvent(db,"meta.creative.prepared",insert.data.id,{
        by:user.email,
        quality_score:best?.score||0,
        variant:best?.variant_id||"v1",
        special_category_review_required:categoryRisk
      });
      return NextResponse.json({ok:true,draft:insert.data,categoryRisk},{status:201});
    }

    if(action==="select_variant"){
      const creativeId=String(body.creativeId||"");
      const variantId=String(body.variantId||"");
      const draft=await draftById(db,creativeId);
      if(!["draft","creative_review","creative_approved","rejected"].includes(draft.status)){
        return NextResponse.json({ok:false,error:"Variant cannot be changed after external Meta execution begins."},{status:409});
      }
      const evaluation=(draft.creative_package?.evaluations||[]).find((x:any)=>x.variant_id===variantId);
      const exists=(draft.creative_package?.variants||[]).some((x:any)=>x.id===variantId);
      if(!exists)return NextResponse.json({ok:false,error:"Creative variant not found."},{status:404});
      const updated=await db.from("meta_creative_drafts").update({
        selected_variant_id:variantId,
        quality_evaluation:evaluation||{},
        status:"draft",
        updated_at:new Date().toISOString()
      }).eq("organization_id",ORG_ID).eq("id",creativeId).select("*").single();
      if(updated.error)throw updated.error;
      return NextResponse.json({ok:true,draft:updated.data});
    }

    if(action==="request_creative_review"){
      const creativeId=String(body.creativeId||"");
      const draft=await draftById(db,creativeId);
      const quality=Number(draft.quality_evaluation?.score||0);
      if(quality<70)return NextResponse.json({ok:false,error:"Improve the creative before requesting review.",quality:draft.quality_evaluation},{status:409});
      const existing=await db.from("meta_action_approvals")
        .select("id").eq("organization_id",ORG_ID).eq("creative_id",creativeId).eq("action","creative_review").eq("status","pending").maybeSingle();
      if(existing.data)return NextResponse.json({ok:true,approvalId:existing.data.id,status:"already_pending"});
      const requested=await db.from("meta_action_approvals").insert({
        organization_id:ORG_ID,
        creative_id:creativeId,
        action:"creative_review",
        status:"pending",
        requested_by:user.email,
        proposed_payload:{variant_id:draft.selected_variant_id,quality_score:quality}
      }).select("*").single();
      if(requested.error)throw requested.error;
      await db.from("meta_creative_drafts").update({status:"creative_review",updated_at:new Date().toISOString()}).eq("id",creativeId);
      const reviewers=draft.media_type==="video"
        ?[teamEmail("Aneesh"),teamEmail("Shahid")]
        :[teamEmail("Aneesh")];
      await notify(db,reviewers,"Creative review requested",draft.client_name+" has a Meta creative waiting for review.",{creative_id:creativeId,approval_id:requested.data.id,stage:"creative_review"});
      await logEvent(db,"meta.creative.review_requested",creativeId,{by:user.email,reviewers});
      return NextResponse.json({ok:true,approval:requested.data});
    }

    if(action==="request_external_approval"){
      const creativeId=String(body.creativeId||"");
      const requestedAction=String(body.requestedAction||"");
      const draft=await draftById(db,creativeId);
      if(!EXTERNAL_ACTIONS.has(requestedAction))return NextResponse.json({ok:false,error:"Unsupported Meta action."},{status:400});
      if(requestedAction==="publish_organic"&&!["instagram_organic","facebook_organic"].includes(draft.channel)){
        return NextResponse.json({ok:false,error:"This creative is not an organic Meta post."},{status:400});
      }
      if(requestedAction==="create_paused_ad"&&draft.channel!=="meta_ads"){
        return NextResponse.json({ok:false,error:"This creative is not a paid Meta ad."},{status:400});
      }
      if(requestedAction==="activate_ad"&&draft.status!=="paused_on_meta"){
        return NextResponse.json({ok:false,error:"Only a reviewed PAUSED Meta ad can request activation."},{status:409});
      }
      if(requestedAction==="activate_ad"&&!draft.meta_payload?.preview){
        return NextResponse.json({ok:false,error:"Refresh and review the real Meta preview before requesting activation/spend approval."},{status:409});
      }
      if(requestedAction!=="activate_ad"&&draft.status!=="creative_approved"){
        return NextResponse.json({ok:false,error:"Creative review must be approved first."},{status:409});
      }
      if(draft.creative_package?.special_category_review_required===true){
        return NextResponse.json({ok:false,error:"This brief may fall into a Meta special/restricted ad category. Complete a manual compliance review before enabling external execution."},{status:409});
      }
      const existing=await db.from("meta_action_approvals")
        .select("id").eq("organization_id",ORG_ID).eq("creative_id",creativeId).eq("action",requestedAction).eq("status","pending").maybeSingle();
      if(existing.data)return NextResponse.json({ok:true,approvalId:existing.data.id,status:"already_pending"});
      const proposedPayload={
        variant_id:draft.selected_variant_id,
        meta_payload:draft.meta_payload,
        source_asset_url:draft.source_asset_url,
        meta_object_id:draft.meta_object_id
      };
      const requested=await db.from("meta_action_approvals").insert({
        organization_id:ORG_ID,
        creative_id:creativeId,
        action:requestedAction,
        status:"pending",
        requested_by:user.email,
        proposed_payload:proposedPayload
      }).select("*").single();
      if(requested.error)throw requested.error;
      await db.from("meta_creative_drafts").update({status:"publish_review",updated_at:new Date().toISOString()}).eq("id",creativeId);
      await notify(db,[teamEmail("Amal"),teamEmail("Aadil")],"Meta permission requested",draft.client_name+" is waiting for "+requestedAction.replaceAll("_"," ")+" approval.",{creative_id:creativeId,approval_id:requested.data.id,stage:requestedAction});
      await logEvent(db,"meta.external_approval.requested",creativeId,{by:user.email,action:requestedAction});
      return NextResponse.json({ok:true,approval:requested.data});
    }

    if(action==="review"){
      const approvalId=String(body.approvalId||"");
      const decision=String(body.decision||"");
      if(!["approve","reject"].includes(decision))return NextResponse.json({ok:false,error:"Choose approve or reject."},{status:400});
      const approval=await approvalById(db,approvalId);
      if(approval.status!=="pending")return NextResponse.json({ok:false,error:"This review has already been processed."},{status:409});
      const draft=await draftById(db,approval.creative_id);
      const creativeReview=approval.action==="creative_review";
      if(creativeReview){
        if(!isCreativeReviewer(user,draft.media_type))return NextResponse.json({ok:false,error:"Aneesh, Shahid for video, or a founder must review this creative."},{status:403});
      }else if(!isApprover(user)){
        return NextResponse.json({ok:false,error:"Only Amal or Aadil can approve publishing or paid-ad actions."},{status:403});
      }

      const now=new Date().toISOString();
      const nextApprovalStatus=decision==="approve"?"approved":"rejected";
      const reviewed=await db.from("meta_action_approvals").update({
        status:nextApprovalStatus,
        reviewed_by:user.email,
        reviewed_at:now
      }).eq("organization_id",ORG_ID).eq("id",approvalId).eq("status","pending").select("*").single();
      if(reviewed.error)throw reviewed.error;

      const nextDraftStatus=creativeReview
        ?(decision==="approve"?"creative_approved":"rejected")
        :(decision==="approve"?"approved":"creative_approved");
      await db.from("meta_creative_drafts").update({
        status:nextDraftStatus,
        reviewed_by:user.email,
        reviewed_at:now,
        updated_at:now
      }).eq("organization_id",ORG_ID).eq("id",draft.id);
      await markApprovalNotificationRead(db,approval.id,user.email);
      await logEvent(db,creativeReview?"meta.creative.reviewed":"meta.external_approval.reviewed",draft.id,{
        by:user.email,decision,action:approval.action
      });
      return NextResponse.json({ok:true,approval:reviewed.data,draftStatus:nextDraftStatus});
    }

    if(action==="execute"){
      if(!isApprover(user))return NextResponse.json({ok:false,error:"Only Amal or Aadil can execute an approved Meta action."},{status:403});
      const approvalId=String(body.approvalId||"");
      const approval=await approvalById(db,approvalId);
      if(approval.status!=="approved")return NextResponse.json({ok:false,error:"This Meta action does not have an active approval."},{status:409});
      const draft=await draftById(db,approval.creative_id);
      const variant=selectedVariant(draft);
      if(!variant)throw new Error("Selected creative variant is missing.");

      if(approval.action==="publish_organic"){
        if(!draft.source_asset_url&&draft.channel==="instagram_organic"){
          return NextResponse.json({ok:false,error:"Instagram publishing needs an HTTPS media asset URL."},{status:400});
        }
        if(draft.channel==="instagram_organic"){
          let containerId=String(draft.meta_payload?.instagram_container_id||"");
          if(!containerId){
            const created=await createInstagramContainer({
              mediaUrl:draft.source_asset_url,
              mediaType:draft.media_type,
              caption:variant.primaryText,
              altText:variant.altText
            });
            containerId=created.containerId;
            await db.from("meta_creative_drafts").update({
              status:"processing_on_meta",
              meta_payload:{...(draft.meta_payload||{}),instagram_container_id:containerId},
              updated_at:new Date().toISOString()
            }).eq("id",draft.id);
          }
          const status=await getInstagramContainerStatus(containerId);
          if(status.statusCode!=="FINISHED"){
            return NextResponse.json({ok:true,status:"processing_on_meta",containerId,metaStatus:status});
          }
          const published=await publishInstagramContainer(containerId);
          await db.from("meta_creative_drafts").update({
            status:"published",
            meta_object_id:published.mediaId,
            last_error:null,
            updated_at:new Date().toISOString()
          }).eq("id",draft.id);
          await consumeApproval(db,approval.id);
          await logEvent(db,"meta.organic.published",draft.id,{by:user.email,channel:draft.channel,meta_object_id:published.mediaId});
          return NextResponse.json({ok:true,status:"published",metaObjectId:published.mediaId});
        }

        const published=await publishFacebookOrganic({
          mediaType:draft.media_type,
          mediaUrl:draft.source_asset_url||undefined,
          message:variant.primaryText,
          link:draft.meta_payload?.destination_url||undefined
        });
        await db.from("meta_creative_drafts").update({
          status:"published",
          meta_object_id:published.postId,
          last_error:null,
          updated_at:new Date().toISOString()
        }).eq("id",draft.id);
        await consumeApproval(db,approval.id);
        await logEvent(db,"meta.organic.published",draft.id,{by:user.email,channel:draft.channel,meta_object_id:published.postId});
        return NextResponse.json({ok:true,status:"published",metaObjectId:published.postId});
      }

      if(approval.action==="create_paused_ad"){
        const adSetId=safe(draft.meta_payload?.ad_set_id,100);
        if(!adSetId)return NextResponse.json({ok:false,error:"A Meta ad set ID is required before creating the paused ad."},{status:400});
        if(draft.media_type==="video"&&!draft.meta_payload?.video_id)return NextResponse.json({ok:false,error:"Paid video/Reels ads need a Meta video ID already uploaded to this ad account."},{status:400});
        const created=await createPausedMetaAd({
          name:draft.client_name+" · "+variant.angle.slice(0,50),
          adSetId,
          message:variant.primaryText,
          headline:variant.headline,
          description:variant.description,
          destinationUrl:String(draft.meta_payload?.destination_url||""),
          sourceAssetUrl:draft.source_asset_url||undefined,
          imageHash:draft.meta_payload?.image_hash||undefined,
          videoId:draft.meta_payload?.video_id||undefined,
          thumbnailUrl:draft.meta_payload?.thumbnail_url||undefined,
          cta:variant.cta,
          enhancements:variant.metaEnhancements
        });
        const preview=await getMetaAdPreview(created.adId).catch(()=>null);
        await db.from("meta_creative_drafts").update({
          status:"paused_on_meta",
          meta_object_id:created.adId,
          meta_payload:{...(draft.meta_payload||{}),meta_creative_id:created.creativeId,preview},
          last_error:null,
          updated_at:new Date().toISOString()
        }).eq("id",draft.id);
        await consumeApproval(db,approval.id);
        await logEvent(db,"meta.ad.created_paused",draft.id,{by:user.email,ad_id:created.adId,creative_id:created.creativeId});
        return NextResponse.json({ok:true,status:"paused_on_meta",adId:created.adId,creativeId:created.creativeId,preview});
      }

      if(approval.action==="activate_ad"){
        if(!draft.meta_object_id)return NextResponse.json({ok:false,error:"Paused Meta ad ID is missing."},{status:409});
        const preview=await getMetaAdPreview(draft.meta_object_id);
        const activated=await activateMetaAd(draft.meta_object_id);
        await db.from("meta_creative_drafts").update({
          status:"active_on_meta",
          meta_payload:{...(draft.meta_payload||{}),activation_preview:preview},
          last_error:null,
          updated_at:new Date().toISOString()
        }).eq("id",draft.id);
        await consumeApproval(db,approval.id);
        await logEvent(db,"meta.ad.activated",draft.id,{by:user.email,ad_id:draft.meta_object_id});
        return NextResponse.json({ok:true,status:"active_on_meta",activated,preview});
      }
    }

    if(action==="refresh_preview"){
      const creativeId=String(body.creativeId||"");
      const draft=await draftById(db,creativeId);
      if(!draft.meta_object_id)return NextResponse.json({ok:false,error:"This creative has no Meta ad object yet."},{status:409});
      const preview=await getMetaAdPreview(draft.meta_object_id);
      await db.from("meta_creative_drafts").update({
        meta_payload:{...(draft.meta_payload||{}),preview},
        updated_at:new Date().toISOString()
      }).eq("id",draft.id);
      return NextResponse.json({ok:true,preview});
    }

    if(action==="refresh_insights"){
      const creativeId=String(body.creativeId||"");
      const draft=await draftById(db,creativeId);
      if(!draft.meta_object_id)return NextResponse.json({ok:false,error:"This creative has no Meta object yet."},{status:409});
      const insights=await getMetaInsights(draft.meta_object_id);
      const performance=summarizeMetaInsights(insights);
      await db.from("meta_performance_snapshots").insert({
        organization_id:ORG_ID,
        creative_id:draft.id,
        meta_object_id:draft.meta_object_id,
        object_type:draft.channel==="meta_ads"?"ad":"post",
        metrics:{raw:insights,summary:performance},
        source:"meta_api"
      });
      await db.from("meta_creative_drafts").update({
        creative_package:{...(draft.creative_package||{}),latest_performance:performance},
        updated_at:new Date().toISOString()
      }).eq("organization_id",ORG_ID).eq("id",draft.id);
      await logEvent(db,"meta.performance.refreshed",draft.id,{
        by:user.email,
        ctr:performance.metrics.ctr,
        cpc:performance.metrics.cpc,
        spend:performance.metrics.spend
      });
      return NextResponse.json({ok:true,insights,performance});
    }

    return NextResponse.json({ok:false,error:"Unknown Meta Studio action."},{status:400});
  }catch(error:any){
    const message=error?.message||"Meta Studio operation failed";
    return NextResponse.json({ok:false,error:message},{status:503});
  }
}
