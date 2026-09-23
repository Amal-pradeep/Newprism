import {NextResponse} from "next/server";

const users=[
  {email:"amalpradeep25@gmail.com",name:"Amal",passwordRequired:false},
  {email:process.env.COMIT_ADHIL_EMAIL,name:"Adhil",passwordHash:process.env.COMIT_ADHIL_PASSWORD_SHA256,passwordRequired:true},
  {email:process.env.COMIT_ANEESH_EMAIL,name:"Aneesh",passwordHash:process.env.COMIT_ANEESH_PASSWORD_SHA256,passwordRequired:true},
];

export async function POST(req:Request){
  const b=await req.json().catch(()=>({}));
  const email=String(b.email||"").trim().toLowerCase();
  const password=String(b.password||"");
  const user=users.find(x=>String(x.email||"").trim().toLowerCase()===email);
  if(!user)return NextResponse.json({ok:false,error:"Invalid email"},{status:401});
  if(user.passwordRequired){
    const {createHash}=await import("crypto");
    const hash=createHash("sha256").update(password).digest("hex");
    if(hash!==user.passwordHash)return NextResponse.json({ok:false,error:"Invalid email or password"},{status:401});
  }
  const r=NextResponse.json({ok:true,user:{name:user.name,email:user.email}});
  r.cookies.set("comit_session",Buffer.from(JSON.stringify({email:user.email,name:user.name})).toString("base64url"),{httpOnly:true,sameSite:"lax",secure:true,path:"/",maxAge:604800});
  return r;
}