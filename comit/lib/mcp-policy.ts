export type McpToolAnnotations={
  readOnlyHint?:boolean;
  destructiveHint?:boolean;
  idempotentHint?:boolean;
  openWorldHint?:boolean;
};

export type McpToolDescriptor={
  server:string;
  name:string;
  description?:string;
  annotations?:McpToolAnnotations;
};

export type McpToolDecision={
  allowed:boolean;
  approvalRequired:boolean;
  risk:"read"|"internal_write"|"external_or_destructive"|"unknown";
  reason:string;
};

const serverAllowlist=(process.env.COMIT_MCP_ALLOWLIST||"")
  .split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);

export function classifyMcpTool(tool:McpToolDescriptor):McpToolDecision{
  const server=String(tool.server||"").trim().toLowerCase();
  if(!server||!serverAllowlist.includes(server)){
    return {allowed:false,approvalRequired:true,risk:"unknown",reason:"MCP server is not in COMIT_MCP_ALLOWLIST."};
  }

  const a=tool.annotations||{};
  if(a.destructiveHint===true||a.openWorldHint===true){
    return {
      allowed:true,approvalRequired:true,risk:"external_or_destructive",
      reason:"Tool can affect external state or is marked destructive/open-world."
    };
  }

  if(a.readOnlyHint===true){
    return {allowed:true,approvalRequired:false,risk:"read",reason:"Allowlisted server and read-only tool annotation."};
  }

  return {
    allowed:true,approvalRequired:true,risk:"internal_write",
    reason:"Allowlisted tool has no explicit read-only guarantee; require human approval."
  };
}

export function mcpPolicySummary(){
  return {
    default:"deny",
    allowlist:serverAllowlist,
    rules:[
      "Unknown MCP servers are denied.",
      "Read-only is automatic only when the server is allowlisted and the tool explicitly declares read-only behavior.",
      "Destructive or open-world tools always require human approval.",
      "Missing annotations are treated as write-risk, not as safe.",
      "Tool annotations are hints; COMIT may apply stricter local policy."
    ]
  };
}
