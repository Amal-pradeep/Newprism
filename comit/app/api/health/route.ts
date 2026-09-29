import {NextResponse} from "next/server";

export const dynamic="force-dynamic";

export async function GET(){
  const runtime={
    supabasePublic:Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    authStrategy:"supabase-user-session-rls",
    gmail:Boolean(process.env.GOOGLE_CLIENT_ID&&process.env.GOOGLE_CLIENT_SECRET&&process.env.ORBIT_GMAIL_REFRESH_TOKEN),
    metaConfigured:Boolean(process.env.META_ACCESS_TOKEN),
    metaExternalWritesEnabled:process.env.META_EXTERNAL_WRITES_ENABLED==="true",
    n8n:Boolean(process.env.N8N_COMIT_WEBHOOK_URL||process.env.N8N_AGENT_WEBHOOK_URL)
  };
  return NextResponse.json({
    ok:runtime.supabasePublic,
    service:"COMIT",
    version:"2026.09-unified-ai-ops-runtime-auth",
    mode:runtime.n8n?"n8n-connected":"no-billing",
    capabilities:[
      "win-strategy","prospect-research","sales","marketing","meta-creative-studio",
      "finance-ai","creative-ops","client-growth","team-ops","team-wellness",
      "revenue-intelligence","automation","mission-control"
    ],
    runtime,
    timestamp:new Date().toISOString()
  });
}
