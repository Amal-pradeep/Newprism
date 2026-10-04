import { NextResponse } from "next/server";
import { getSessionUser, requireAdminDb } from "@/lib/outreach";
import {sameOrigin} from "@/lib/workspace-db";
const ORG_ID="acda1757-1698-405a-8451-5674316ceeaf";
export const dynamic="force-dynamic";

export async function GET(req: Request) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  try {
    const db = await requireAdminDb();
    const url = new URL(req.url);
    const pendingOnly = url.searchParams.get("pending") === "1";
    let query = db.from("prospects").select("*, companies(name,website,industry,location), outreach_approvals(*)").eq("organization_id",ORG_ID).order("score", { ascending: false });
    const { data, error } = await query;
    if (error) throw error;
    const prospects = (data || []).map((p: any) => ({
      ...p,
      approvals: pendingOnly ? (p.outreach_approvals || []).filter((a: any) => a.status === "pending") : (p.outreach_approvals || [])
    }));
    return NextResponse.json({ ok: true, data: prospects, user });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || "Failed to load prospects" }, { status: 500 });
  }
}

export async function POST(req:Request){
  if(!sameOrigin(req))return NextResponse.json({ok:false,error:"Invalid request origin."},{status:403});
  const user=await getSessionUser(req);
  if(!user)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
  try{
    const body=await req.json();
    const name=String(body.name||"").trim().slice(0,120),email=String(body.email||"").trim().toLowerCase().slice(0,254);
    const source=String(body.source||"").trim().slice(0,500),notes=String(body.notes||"").trim().slice(0,2000);
    const industry=String(body.industry||"").trim().slice(0,100),location=String(body.location||"").trim().slice(0,100);
    if(!name||!source||!notes||(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))return NextResponse.json({ok:false,error:"Name, an official source and research notes are required. Check the email format."},{status:400});
    let sourceUrl:URL;try{sourceUrl=new URL(source);}catch{return NextResponse.json({ok:false,error:"Use a valid official source URL."},{status:400});}
    if(!["http:","https:"].includes(sourceUrl.protocol))return NextResponse.json({ok:false,error:"Use an HTTP or HTTPS source URL."},{status:400});
    const db=await requireAdminDb();
    if(email){const existing=await db.from("prospects").select("id").eq("organization_id",ORG_ID).eq("email",email).limit(1);if(existing.error)throw existing.error;if(existing.data?.length)return NextResponse.json({ok:false,error:"This email is already in the sales database."},{status:409});}
    const result=await db.from("prospects").insert({organization_id:ORG_ID,name,email:email||null,source,notes,stage:"research",score:0,
      metadata:{industry,location,fit_reason:notes,owner_email:user.email,research_source:source,research_date:new Date().toISOString(),public_contact_verified:false}
    }).select("id").single();
    if(result.error)throw result.error;
    return NextResponse.json({ok:true,id:result.data.id},{status:201});
  }catch(error:any){return NextResponse.json({ok:false,error:error?.message||"Could not add this lead."},{status:500});}
}
