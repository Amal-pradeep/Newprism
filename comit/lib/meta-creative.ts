export type MetaPlacement =
  | "instagram_reels"
  | "instagram_feed"
  | "facebook_reels"
  | "facebook_feed";

export type MetaCreativeInput = {
  client: string;
  brand?: string;
  industry?: string;
  objective: "awareness" | "traffic" | "leads" | "messages" | "sales" | "engagement";
  audience: string;
  offer: string;
  proof?: string;
  destinationUrl?: string;
  location?: string;
  placement?: MetaPlacement;
  primaryColor?: string;
  secondaryColor?: string;
  mediaType?: "image" | "video";
};

export type MetaCreativeVariant = {
  id: string;
  angle: string;
  hook: string;
  primaryText: string;
  headline: string;
  description: string;
  cta: string;
  placement: MetaPlacement;
  aspectRatio: "9:16" | "4:5" | "1:1";
  visualDirection: string[];
  hierarchy: string[];
  motionPlan: string[];
  audioPlan: string[];
  generationPrompt: string;
  altText: string;
  metaEnhancements: {
    text_generation: boolean;
    image_uncrop: boolean;
    image_background_gen: boolean;
  };
};

export type MetaCreativeEvaluation = {
  score: number;
  grade: "A" | "B" | "C" | "D";
  pass: boolean;
  dimensions: Array<{name:string;score:number;max:number;note:string}>;
  risks: string[];
  revisions: string[];
};

const ctaMap:Record<MetaCreativeInput["objective"],string>={
  awareness:"LEARN_MORE",
  traffic:"LEARN_MORE",
  leads:"GET_QUOTE",
  messages:"WHATSAPP_MESSAGE",
  sales:"SHOP_NOW",
  engagement:"LEARN_MORE"
};

function clean(value:unknown,limit=500){
  return typeof value==="string"?value.trim().replace(/\s+/g," ").slice(0,limit):"";
}
function clamp(n:number){return Math.max(0,Math.min(100,Math.round(n)))}
function short(value:string,limit:number){
  const valueText=clean(value,limit*3);
  return valueText.length<=limit?valueText:valueText.slice(0,Math.max(1,limit-1)).trimEnd()+"…";
}
function placementRatio(placement:MetaPlacement){
  if(placement==="instagram_reels"||placement==="facebook_reels")return "9:16" as const;
  return "4:5" as const;
}

function industryAngle(input:MetaCreativeInput){
  const industry=(input.industry||"").toLowerCase();
  if(/restaurant|cafe|food|hospitality|f&b/.test(industry))return [
    "Sensory hero: make the food the visual star and reduce copy.",
    "Emotion + locality: connect the dish to a familiar feeling, place or moment.",
    "Convenience + proof: show how easy it is to order, visit or choose the offer."
  ];
  if(/interior|architecture|real estate|construction/.test(industry))return [
    "Transformation: reveal the result first, then the problem that was solved.",
    "Detail + craft: use close-ups, material texture and restrained premium typography.",
    "Proof + consultation: pair portfolio evidence with one low-friction consultation CTA."
  ];
  if(/beauty|salon|wellness|fitness/.test(industry))return [
    "Experience: show the atmosphere, process and confident end-state without unrealistic claims.",
    "Proof-led: use real service details, social proof or process credibility.",
    "Offer-led: one service, one benefit, one booking action."
  ];
  return [
    "Outcome-led: make one customer result or use-case visually dominant.",
    "Proof-led: demonstrate why the offer is credible instead of listing services.",
    "Pattern-break: use a clean visual contrast, motion or composition that earns attention."
  ];
}

function baseVisualRules(input:MetaCreativeInput,placement:MetaPlacement){
  const vertical=placementRatio(placement)==="9:16";
  const rules=[
    "One dominant focal subject; remove decorative clutter.",
    "Three-layer hierarchy only: hook -> proof/hero -> CTA.",
    "Use strong contrast and generous negative space so the ad reads in under two seconds."
  ];
  rules.push(input.primaryColor
    ? "Use "+input.primaryColor+" as the dominant brand accent, not as a full-canvas fill."
    : "Use one dominant brand accent and one neutral background.");
  rules.push(input.secondaryColor
    ? "Use "+input.secondaryColor+" only for secondary emphasis."
    : "Keep secondary accents restrained.");
  rules.push(vertical
    ? "Build native 9:16 composition; keep critical copy, logo and CTA inside Meta Reels safe zones."
    : "Build a mobile-first 4:5 feed composition with the subject occupying most of the frame.");
  rules.push("Keep logo visible but smaller than the message and product/service proof.");
  rules.push("Use real client/product imagery when available; AI-generated assets must not invent product facts.");
  return rules;
}

function copyFor(input:MetaCreativeInput,angle:string,index:number){
  const brand=clean(input.brand||input.client,80)||"the brand";
  const location=clean(input.location,80);
  const offer=clean(input.offer,180);
  const proof=clean(input.proof,160);
  const audience=clean(input.audience,140);
  const hooks=[
    location?location+": this is worth your attention.":"Stop scrolling - this is built for "+(audience||"you")+".",
    proof?"The proof is in the result.":"One clear reason to choose "+brand+".",
    offer?"A better way to get "+offer.toLowerCase()+".":"See what "+brand+" does differently."
  ];
  const hook=short(hooks[index%hooks.length],48);
  const primary=short([hook,offer,proof].filter(Boolean).join(" "),90);
  const headline=short(
    input.objective==="messages"?"Message "+brand:
    input.objective==="leads"?"Talk to "+brand:
    input.objective==="sales"?"Choose "+brand:
    "Discover "+brand,
    25
  );
  const description=short(proof||angle,60);
  return {hook,primary,headline,description};
}

export function buildMetaCreativePackage(input:MetaCreativeInput){
  const placement=input.placement||((input.mediaType||"video")==="video"?"instagram_reels":"instagram_feed");
  const ratio=placementRatio(placement);
  const angles=industryAngle(input);
  const variants:MetaCreativeVariant[]=angles.map((angle,index)=>{
    const copy=copyFor(input,angle,index);
    const video=ratio==="9:16";
    return {
      id:"v"+(index+1),
      angle,
      hook:copy.hook,
      primaryText:copy.primary,
      headline:copy.headline,
      description:copy.description,
      cta:ctaMap[input.objective],
      placement,
      aspectRatio:ratio,
      visualDirection:baseVisualRules(input,placement),
      hierarchy:[
        "Top/first beat: one short hook or visual pattern-break.",
        "Middle: hero image/video plus one proof point.",
        "Final/lower-safe area: CTA and brand."
      ],
      motionPlan:video?[
        "0-2s: visual hook before explanation.",
        "2-6s: reveal product/service proof with close-up or transformation.",
        "6-12s: one benefit or offer; avoid text overload.",
        "12-18s: CTA/end card with logo and action."
      ]:["Use one still composition; do not simulate motion with excessive badges or arrows."],
      audioPlan:video?[
        "Use commercial-safe audio or Meta Sound Collection.",
        "Make the ad understandable without audio using captions and visual proof.",
        "Do not rely on copyrighted consumer-library music for business ads."
      ]:["No audio required."],
      generationPrompt:[
        "Create a premium "+ratio+" "+(video?"vertical ad frame/storyboard":"mobile feed ad")+" for "+clean(input.client,80)+".",
        "Objective: "+input.objective+". Audience: "+clean(input.audience,160)+".",
        "Offer: "+clean(input.offer,220)+".",
        input.proof?"Proof to show visually: "+clean(input.proof,180)+".":"",
        "Creative angle: "+angle,
        "Style: contemporary editorial advertising, strong focal subject, restrained typography, clean spacing, realistic lighting, brand-consistent, no clutter, no fake UI, no invented claims.",
        "Leave room for short hook and CTA; keep critical elements inside platform safe zones."
      ].filter(Boolean).join(" "),
      altText:short("Ad for "+input.client+". "+copy.headline+". "+input.offer+".",220),
      metaEnhancements:{
        text_generation:false,
        image_uncrop:false,
        image_background_gen:false
      }
    };
  });

  return {
    client:clean(input.client,120),
    objective:input.objective,
    audience:clean(input.audience,300),
    offer:clean(input.offer,300),
    proof:clean(input.proof,300),
    destinationUrl:clean(input.destinationUrl,1000),
    placement,
    variants,
    researchBasis:[
      "Reels: prefer native 9:16 video, quality audio and key messages in the safe zone.",
      "COMIT targets compact Meta creative copy: up to 25 headline characters and 90 primary-text characters for these variants.",
      "Use A/B tests that change one meaningful creative variable at a time.",
      "AI-generated Meta creative must be previewed before activation."
    ],
    approvalPolicy:{
      organic:"prepare -> review -> approve -> explicit publish",
      paid:"prepare -> review -> approve -> create PAUSED ad -> review Meta preview -> second approval -> activate"
    }
  };
}

export function evaluateMetaCreative(input:MetaCreativeInput,variant:MetaCreativeVariant):MetaCreativeEvaluation{
  const risks:string[]=[];
  const revisions:string[]=[];
  const dimensions:Array<{name:string;score:number;max:number;note:string}>=[];

  dimensions.push({name:"Objective fit",score:15,max:15,note:"One objective and one CTA are defined."});

  const hookScore=variant.hook.length>=8&&variant.hook.length<=48?15:9;
  dimensions.push({name:"Scroll-stop hook",score:hookScore,max:15,note:hookScore===15?"Hook is concise.":"Shorten the hook."});

  const visualScore=variant.visualDirection.length>=6?20:12;
  dimensions.push({name:"Visual hierarchy",score:visualScore,max:20,note:"Focal subject, hierarchy, contrast and spacing are specified."});

  const proofScore=input.proof?15:7;
  dimensions.push({name:"Proof",score:proofScore,max:15,note:input.proof?"A proof point is supplied.":"Add a truthful proof point or real asset."});
  if(!input.proof)revisions.push("Add one truthful proof point, customer outcome, process fact or product detail.");

  const ctaScore=variant.cta?10:0;
  dimensions.push({name:"CTA",score:ctaScore,max:10,note:"CTA matches the objective."});

  const placementScore=(variant.aspectRatio==="9:16"&&/reels/.test(variant.placement))||(variant.aspectRatio==="4:5"&&/feed/.test(variant.placement))?10:5;
  dimensions.push({name:"Placement fit",score:placementScore,max:10,note:"Creative format matches the selected placement."});

  const brandScore=(input.brand||input.primaryColor)?10:6;
  dimensions.push({name:"Brand system",score:brandScore,max:10,note:brandScore===10?"Brand identity input is present.":"Add brand colors/logo guidance."});

  const combined=(variant.primaryText+" "+variant.headline+" "+variant.description).toLowerCase();
  const unsafe=/guarantee|guaranteed|100%|instant results|no risk|best in the world|number one|you are overweight|you have diabetes|your debt|you are broke/i.test(combined);
  const policyScore=unsafe?0:5;
  dimensions.push({name:"Claim safety",score:policyScore,max:5,note:unsafe?"Potential unsupported/personal-attribute language detected.":"No obvious high-risk claim pattern detected."});
  if(unsafe)risks.push("Potential unsupported guarantee or personal-attribute style language.");

  if(variant.headline.length>25)revisions.push("Reduce headline to the compact recommended range.");
  if(variant.primaryText.length>90)revisions.push("Reduce primary text to the compact recommended range.");
  if(/reels/.test(variant.placement)&&variant.audioPlan.length===0)revisions.push("Add an audio/caption plan for Reels.");

  const score=clamp(dimensions.reduce((sum,d)=>sum+d.score,0));
  const grade:MetaCreativeEvaluation["grade"]=score>=90?"A":score>=80?"B":score>=70?"C":"D";
  return {score,grade,pass:score>=80&&risks.length===0,dimensions,risks,revisions};
}
