import {NextResponse} from "next/server";

const users=[
  {email:"amalpradeep25@gmail.com",name:"Amal"},
  {email:process.env.COMIT_AADIL_EMAIL || "aadil.sudhir279@gmail.com",name:"Aadil"},
  {email:process.env.COMIT_ANEESH_EMAIL || "msaneeshnath@gmail.com",name:"Aneesh"},
  {email:process.env.COMIT_JISHNU_EMAIL || "jishnu@prismofstories.com",name:"Jishnu"},
];

export async function POST(req:Request){
  const b=await req.json().catch(()=>({}));
  const email=String(b.email||"").trim().toLowerCase();
  const user=users.find(x=>String(x.email||"").trim().toLowerCase()===email);
  if(!user)return NextResponse.json({ok:false,error:"This email is not authorized for COMIT."},{status:401});

  const r=NextResponse.json({ok:true,user:{name:user.name,email:user.email}});
  r.cookies.set("comit_session",Buffer.from(JSON.stringify({email:user.email,name:user.name})).toString("base64url"),{httpOnly:true,sameSite:"lax",secure:true,path:"/",maxAge:604800});
  return r;
}