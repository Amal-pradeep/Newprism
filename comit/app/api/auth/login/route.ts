import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {teamUser} from "@/lib/team-auth";

function authClient(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url&&key?createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}):null;
}

export async function POST(req:Request){
  const body=await req.json().catch(()=>({}));
  const client=authClient();
  if(!client)return NextResponse.json({ok:false,error:"Team authentication is not configured."},{status:503});

  if(body.accessToken){
    const accessToken=String(body.accessToken||"");
    const refreshToken=String(body.refreshToken||"");
    if(!accessToken||accessToken.length>8192||refreshToken.length>8192)return NextResponse.json({ok:false,error:"Invalid sign-in link."},{status:400});
    const {data,error}=await client.auth.getUser(accessToken);
    const verified=data.user?.email_confirmed_at&&data.user?.email?teamUser(data.user.email):null;
    if(error||!verified)return NextResponse.json({ok:false,error:"This sign-in link is invalid or the email is not authorized."},{status:401});

    const response=NextResponse.json({ok:true,user:verified});
    response.cookies.set("comit_access_token",accessToken,{httpOnly:true,sameSite:"lax",secure:true,path:"/",maxAge:2592000});
    if(refreshToken)response.cookies.set("comit_refresh_token",refreshToken,{httpOnly:true,sameSite:"strict",secure:true,path:"/",maxAge:2592000});
    response.cookies.set("comit_session","",{httpOnly:true,sameSite:"lax",secure:true,path:"/",maxAge:0});
    response.cookies.set("comit_workspace","",{httpOnly:true,sameSite:"strict",secure:true,path:"/",maxAge:0});
    return response;
  }

  const email=String(body.email||"").trim().toLowerCase();
  if(!teamUser(email))return NextResponse.json({ok:false,error:"This email is not authorized for COMIT."},{status:401});
  const origin=new URL(req.url).origin;
  const destination=body.next==="/workspace"?"?next=workspace":"";
  const {error}=await client.auth.signInWithOtp({
    email,
    options:{shouldCreateUser:true,emailRedirectTo:origin+"/auth/callback"+destination}
  });
  if(error)return NextResponse.json({ok:false,error:"Could not send a sign-in link. Check Supabase email sign-in and the allowed redirect URL."},{status:503});
  return NextResponse.json({ok:true,linkSent:true});
}
