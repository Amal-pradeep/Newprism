import {NextResponse} from "next/server";
export async function GET(){return NextResponse.json({ok:true,service:"COMIT",version:"2026.09-business-v2",mode:process.env.N8N_COMIT_WEBHOOK_URL?"n8n-connected":"no-billing",capabilities:["win-strategy","prospect-research","sales","marketing","client-growth","team-ops","revenue-intelligence","automation"],timestamp:new Date().toISOString()});}
