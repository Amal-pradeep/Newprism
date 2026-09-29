import {randomUUID} from "crypto";

export type TraceStage=
  |"mission.created"|"mission.step.unlocked"|"mission.paused"|"mission.completed"
  |"agent.started"|"agent.context.ready"|"agent.draft.ready"|"agent.evaluated"|"agent.reviewed";

export type TraceRecord={
  trace_id:string;
  span_id:string;
  parent_span_id?:string|null;
  stage:TraceStage;
  name:string;
  attributes:Record<string,string|number|boolean|null>;
  started_at:string;
  ended_at?:string|null;
};

export function createTraceId(){
  return randomUUID();
}

export function traceRecord(
  traceId:string,
  stage:TraceStage,
  name:string,
  attributes:Record<string,string|number|boolean|null>={},
  parentSpanId:string|null=null
):TraceRecord{
  return {
    trace_id:traceId,
    span_id:randomUUID(),
    parent_span_id:parentSpanId,
    stage,
    name:name.slice(0,160),
    attributes,
    started_at:new Date().toISOString()
  };
}

export function safeTraceAttributes(input:Record<string,unknown>={}){
  const out:Record<string,string|number|boolean|null>={};
  for(const [key,value] of Object.entries(input)){
    if(value===null||typeof value==="string"||typeof value==="number"||typeof value==="boolean"){
      out[key.slice(0,80)]=typeof value==="string"?value.slice(0,300):value;
    }
  }
  return out;
}
