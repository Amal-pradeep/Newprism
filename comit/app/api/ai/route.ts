import {NextResponse} from "next/server";
import {getSessionUser} from "@/lib/outreach";
import {COMIT_SYSTEM_PROMPT,buildBusinessResponse} from "@/lib/ai-system";
export const runtime="nodejs";
export async function POST(req:Request){
 const user=getSessionUser(req); if(!user)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
 const body=await req.json().catch(()=>({})); const message=String(body.message||"").trim();
 if(!message)return NextResponse.json({ok:false,error:"message is required"},{status:400});
 const payload={system:COMIT_SYSTEM_PROMPT,message,context:body.context||{},requestedBy:user.email,timestamp:new Date().toISOString()};
 const webhook=process.env.N8N_COMIT_WEBHOOK_URL;
 if(webhook){try{const r=await fetch(webhook,{method:"POST",headers:{"Content-Type":"application/json","X-COMIT-Source":"vercel"},body:JSON.stringify(payload),cache:"no-store"});const data=await r.json().catch(()=>({}));if(r.ok)return NextResponse.json({ok:true,mode:"n8n",result:data});}catch{}}
 return NextResponse.json(buildBusinessResponse(message,body.context||{}));
}
export async function GET(req:Request){if(!getSessionUser(req))return NextResponse.json({ok:false,error:"Authentication required"},{status:401});return NextResponse.json({ok:true,mode:process.env.N8N_COMIT_WEBHOOK_URL?"n8n":"deterministic-no-billing",systemPromptVersion:"2026.09.business-v2"});}
