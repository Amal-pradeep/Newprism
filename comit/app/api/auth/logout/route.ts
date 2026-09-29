import {NextResponse} from "next/server";

export async function POST(req:Request){
  const response=NextResponse.json({ok:true});
  for(const name of ["comit_access_token","comit_refresh_token","comit_session","comit_workspace"]){
    response.cookies.set(name,"",{httpOnly:true,secure:true,sameSite:name==="comit_refresh_token"?"strict":"lax",path:"/",maxAge:0});
  }
  return response;
}
