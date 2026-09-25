import {NextResponse} from "next/server";
import {createHmac} from "crypto";
import {createClient} from "@supabase/supabase-js";
import {teamUser} from "@/lib/team-auth";

function authClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? createClient(url, key, {auth:{persistSession:false}}) : null;
}
function secret(){return process.env.COMIT_SESSION_SECRET || ""}

export async function POST(req:Request){
  const body=await req.json().catch(()=>({}));
  const client=authClient();
  if(!client || !secret()) return NextResponse.json({ok:false,error:"Team authentication is not configured."},{status:503});

  if(body.accessToken){
    const accessToken=String(body.accessToken);
    if(accessToken.length>8192)return NextResponse.json({ok:false,error:"Invalid sign-in link."},{status:400});
    const {data,error}=await client.auth.getUser(accessToken);
    const verified=data.user?.email_confirmed_at && data.user?.email ? teamUser(data.user.email) : null;
    if(error || !verified)return NextResponse.json({ok:false,error:"This sign-in link is invalid or the email is not authorized."},{status:401});
    const payload=Buffer.from(JSON.stringify({email:verified.email,name:verified.name,iat:Date.now()})).toString("base64url");
    const signature=createHmac("sha256",secret()).update(payload).digest("base64url");
    const response=NextResponse.json({ok:true,user:verified});
    response.cookies.set("comit_session",`${payload}.${signature}`,{httpOnly:true,sameSite:"lax",secure:true,path:"/",maxAge:604800});
    return response;
  }

  const email=String(body.email||"").trim().toLowerCase();
  if(!teamUser(email))return NextResponse.json({ok:false,error:"This email is not authorized for COMIT."},{status:401});
  const origin=new URL(req.url).origin;
  const {error}=await client.auth.signInWithOtp({email,options:{shouldCreateUser:true,emailRedirectTo:`${origin}/auth/callback`}});
  if(error)return NextResponse.json({ok:false,error:"Could not send a sign-in link. Check Supabase email sign-in and the allowed redirect URL."},{status:503});
  return NextResponse.json({ok:true,linkSent:true});
}
