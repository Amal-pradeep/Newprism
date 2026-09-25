import {NextResponse} from "next/server";
import {getSessionUser} from "@/lib/outreach";
import {COMIT_SYSTEM_PROMPT,buildBusinessResponse,type BusinessContext} from "@/lib/ai-system";
export const runtime="nodejs";
export async function POST(req:Request){
 const user=getSessionUser(req); if(!user)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
 const body=await req.json().catch(()=>({})); const message=typeof body.message==="string"?body.message.trim():"";
 if(!message || message.length>2000)return NextResponse.json({ok:false,error:"message must contain 1–2000 characters"},{status:400});
 const context:BusinessContext=body.context&&typeof body.context==="object"&&!Array.isArray(body.context)?body.context:{};
 const fallback=buildBusinessResponse(message,context);
 const payload={system:COMIT_SYSTEM_PROMPT,message,context:fallback,requestedBy:user.email,timestamp:new Date().toISOString()};
 const webhook=process.env.N8N_COMIT_WEBHOOK_URL;
 if(webhook){try{const r=await fetch(webhook,{method:"POST",headers:{"Content-Type":"application/json","X-COMIT-Source":"comit"},body:JSON.stringify(payload),cache:"no-store",signal:AbortSignal.timeout(8000)});const data=await r.json().catch(()=>({}));if(r.ok&&data&&typeof data==="object"&&data.ok!==false)return NextResponse.json({ok:true,mode:"n8n",result:data});}catch{}}
 return NextResponse.json({...fallback,automation:webhook?"n8n unavailable; rules-based plan returned":"n8n not configured"});
}
export async function GET(req:Request){if(!getSessionUser(req))return NextResponse.json({ok:false,error:"Authentication required"},{status:401});return NextResponse.json({ok:true,mode:process.env.N8N_COMIT_WEBHOOK_URL?"n8n-with-rules-fallback":"rules-based-no-billing",systemPromptVersion:"2026.09.evidence-v3"});}
