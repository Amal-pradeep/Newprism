export type CapabilityRisk="read"|"draft"|"internal_write"|"external_write"|"code_execution";
export type Capability={
  id:string;
  name:string;
  category:"protocol"|"local_model"|"automation"|"plugin_host"|"workspace";
  openSource:boolean;
  noCostCore:boolean;
  purpose:string;
  risk:CapabilityRisk;
  enabledByDefault:boolean;
  notes:string;
  docs:string;
};

export const freeCapabilityRegistry:Capability[]=[
  {
    id:"mcp",name:"Model Context Protocol",category:"protocol",openSource:true,noCostCore:true,
    purpose:"Standard tool/resource interface so COMIT agents can discover narrowly scoped capabilities instead of custom one-off integrations.",
    risk:"internal_write",enabledByDefault:false,
    notes:"Use allowlisted servers only. Separate read tools from write tools and require approval for sensitive writes.",
    docs:"https://modelcontextprotocol.io/"
  },
  {
    id:"ollama",name:"Ollama",category:"local_model",openSource:true,noCostCore:true,
    purpose:"Run compatible local models for structured outputs and tool calling without a metered API.",
    risk:"code_execution",enabledByDefault:false,
    notes:"Use only when COMIT has a trusted machine with enough resources. Keep deterministic fallback paths.",
    docs:"https://ollama.com/"
  },
  {
    id:"llamacpp",name:"llama.cpp",category:"local_model",openSource:true,noCostCore:true,
    purpose:"Lightweight local inference server with OpenAI-style function calling for supported chat templates.",
    risk:"code_execution",enabledByDefault:false,
    notes:"Prefer native tool-call templates where possible. Do not expose shell/file tools broadly.",
    docs:"https://github.com/ggml-org/llama.cpp"
  },
  {
    id:"n8n",name:"n8n self-hosted + community nodes",category:"automation",openSource:true,noCostCore:true,
    purpose:"Compose event-driven workflows, schedules and agent/tool calls around COMIT.",
    risk:"external_write",enabledByDefault:false,
    notes:"Self-host for the no-charge constraint. Install only reviewed community nodes; unverified nodes can execute arbitrary code.",
    docs:"https://docs.n8n.io/"
  },
  {
    id:"openwebui",name:"Open WebUI Tools & Functions",category:"plugin_host",openSource:true,noCostCore:true,
    purpose:"Optional self-hosted plugin host for custom Tools, MCP and agent-style Pipe/Filter/Action functions.",
    risk:"code_execution",enabledByDefault:false,
    notes:"Admin-only. Community Functions execute arbitrary Python; review source before import. Prefer Tools/MCP over legacy Pipelines.",
    docs:"https://docs.openwebui.com/"
  },
  {
    id:"supabase",name:"Supabase",category:"workspace",openSource:true,noCostCore:true,
    purpose:"COMIT shared state, durable records, auth, training memory and mission checkpoints.",
    risk:"internal_write",enabledByDefault:true,
    notes:"Server-only service credentials; browser access remains RLS constrained.",
    docs:"https://supabase.com/docs"
  },
  {
    id:"github",name:"GitHub",category:"workspace",openSource:false,noCostCore:true,
    purpose:"Source of truth, feature branches, reviewable changes and code history.",
    risk:"internal_write",enabledByDefault:true,
    notes:"Keep deployment separate from code changes. Use draft PRs for review.",
    docs:"https://docs.github.com/"
  }
];

export function capabilitySummary(){
  return freeCapabilityRegistry.map(item=>({
    ...item,
    status:item.enabledByDefault?"core-ready":"optional-review"
  }));
}

export function allowedForAgent(risk:CapabilityRisk){
  if(risk==="read"||risk==="draft")return {auto:true,approval:false};
  if(risk==="internal_write")return {auto:false,approval:true};
  return {auto:false,approval:true};
}
