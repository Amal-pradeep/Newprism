import {NextResponse} from "next/server";
import {getSessionUser} from "@/lib/outreach";
const nudges=["Take a deep breath and reset for 60 seconds.","Quick hydration check — have some water.","Review your top 3 revenue tasks before starting new work.","If a task is blocked, flag it instead of carrying it silently."];
export async function GET(req:Request){const u=getSessionUser(req);if(!u)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});const hour=new Date().getHours();return NextResponse.json({ok:true,user:u,nudge:nudges[hour%nudges.length],channels:["in-app","browser"],whatsapp:"configured via member environment variables"});}
