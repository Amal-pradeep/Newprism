export type ContextEntry={
  kind:"working"|"business"|"training";
  label:string;
  value:string;
  provenance:"mission"|"crm"|"reviewed_knowledge"|"founder_lesson";
};

const privateKeys=new Set([
  "water","water_ml","water_target_ml","energy","energy_level","meal",
  "screen_break","movement","wellness","health","medical"
]);

function text(value:unknown,limit=800){
  if(typeof value==="string")return value.trim().slice(0,limit);
  if(typeof value==="number"||typeof value==="boolean")return String(value);
  return "";
}

export function buildAgentContextEnvelope(
  context:Record<string,unknown>,
  knowledge:Array<{title?:string;text?:string;source?:string}>=[],
  lessons:string[]=[]
){
  const entries:ContextEntry[]=[];
  const contextMap:Array<[string,string,"mission"|"crm"]>=[
    ["business","Business","crm"],
    ["industry","Industry","crm"],
    ["location","Location","crm"],
    ["stage","CRM stage","crm"],
    ["score","CRM score","crm"],
    ["fit_reason","Fit reason","crm"],
    ["trigger","Current trigger","crm"],
    ["evidence","Evidence","crm"],
    ["decision_maker_known","Decision maker known","crm"],
    ["budget_signal","Budget signal","crm"],
    ["proof_available","Proof available","crm"],
    ["missionStepTitle","Mission step","mission"],
    ["missionSuccess","Success condition","mission"],
    ["missionRisk","Risk class","mission"]
  ];
  for(const [key,label,provenance] of contextMap){
    const value=context[key];
    if(value===undefined||value===null)continue;
    const normalized=Array.isArray(value)?value.map(v=>text(v,300)).filter(Boolean).join(" | "):text(value);
    if(normalized)entries.push({kind:"working",label,value:normalized,provenance});
  }

  for(const item of knowledge.slice(0,6)){
    const value=text(item.text,700);
    if(value)entries.push({
      kind:"business",
      label:text(item.title,120)||"Reviewed knowledge",
      value,
      provenance:"reviewed_knowledge"
    });
  }

  for(const lesson of lessons.slice(0,6)){
    const value=text(lesson,400);
    if(value)entries.push({kind:"training",label:"Founder-approved lesson",value,provenance:"founder_lesson"});
  }

  const excluded=Object.keys(context).filter(key=>privateKeys.has(key.toLowerCase())||[...privateKeys].some(fragment=>key.toLowerCase().includes(fragment)));

  return {
    version:"1",
    entries,
    excluded_private_fields:excluded,
    policy:[
      "Use working state for the current mission only.",
      "Treat reviewed business knowledge as context, not as proof of current prospect facts unless explicitly sourced.",
      "Treat founder-approved lessons as guidance, not immutable truth.",
      "Never inject teammate private wellness or medical-style data into business, sales or performance agents.",
      "Persist conclusions, artifacts and outcomes; do not persist hidden reasoning."
    ]
  };
}
