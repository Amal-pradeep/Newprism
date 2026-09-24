import {NextResponse} from "next/server";
import {createHmac} from "crypto";

const users=[
  {email:"amalpradeep25@gmail.com",name:"Amal"},
  {email:process.env.COMIT_AADIL_EMAIL || "aadil.sudhir279@gmail.com",name:"Aadil"},
  {email:process.env.COMIT_ANEESH_EMAIL || "msaneeshnath@gmail.com",name:"Aneesh"},
  {email:process.env.COMIT_JISHNU_EMAIL || "jishnu@prismofstories.com",name:"Jishnu"},
];
function secret(){return process.env.COMIT_SESSION_SECRET||process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.GOOGLE_CLIENT_SECRET||""}
function sign(payload:string){const s=secret();if(!s)throw new Error("COMIT session signing is not configured.");return createHmac("sha256",s).update(payload).digest("base64url")}

export async function POST(req:Request){
  const b=await req.json().catch(()=>({}));
  const email=String(b.email||"").trim().toLowerCase();
  const user=users.find(x=>String(x.email||"").trim().toLowerCase()===email);
  if(!user)return NextResponse.json({ok:false,error:"This email is not authorized for COMIT."},{status:401});
  try{
    const payload=Buffer.from(JSON.stringify({email:user.email,name:user.name,iat:Date.now()})).toString("base64url");
    const token=`${payload}.${sign(payload)}`;
    const r=NextResponse.json({ok:true,user:{name:user.name,email:user.email}});
    r.cookies.set("comit_session",token,{httpOnly:true,sameSite:"lax",secure:true,path:"/",maxAge:604800});
    return r;
  }catch(error:any){return NextResponse.json({ok:false,error:error?.message||"Secure login is not configured."},{status:500})}
}
