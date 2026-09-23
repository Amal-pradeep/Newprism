import {NextResponse} from "next/server";
import {getSessionUser} from "@/lib/outreach";
const agents=[
{id:"prospect-research",name:"Prospect Research Agent",owner:"Aadil",goal:"Find, qualify and evidence new prospects.",triggers:["new prospect","daily research"]},
{id:"outreach",name:"Outreach Agent",owner:"Amal",goal:"Draft personalized outreach and route it through approval.",triggers:["qualified prospect","follow-up due"]},
{id:"creative",name:"Creative Agency Agent",owner:"Aneesh",goal:"Turn client goals into poster, carousel and reel briefs.",triggers:["content request","campaign launch"]},
{id:"client-growth",name:"Client Growth Agent",owner:"Jishnu",goal:"Detect client growth opportunities and propose next actions.",triggers:["client signal","weekly review"]},
{id:"team-ops",name:"Team Operations Agent",owner:"Amal",goal:"Track tasks, blockers, workload and healthy working rhythms.",triggers:["task overdue","daily check-in"]},
{id:"revenue",name:"Revenue Intelligence Agent",owner:"Amal",goal:"Surface pipeline gaps, follow-ups and monetizable opportunities.",triggers:["pipeline change","weekly revenue review"]}];
export async function GET(req:Request){if(!getSessionUser(req))return NextResponse.json({ok:false,error:"Authentication required"},{status:401});return NextResponse.json({ok:true,agents});}
export async function POST(req:Request){const u=getSessionUser(req);if(!u)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});const b=await req.json().catch(()=>({}));const agent=agents.find(a=>a.id===b.agentId);if(!agent)return NextResponse.json({ok:false,error:"Unknown agent"},{status:404});return NextResponse.json({ok:true,status:"queued",agent,requestedBy:u.email,mode:"rule-engine",message:"Agent execution queued. Connect a free/self-hosted n8n worker for autonomous execution; COMIT will not create paid API usage."});}
