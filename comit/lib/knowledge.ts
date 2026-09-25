// Reviewed, non-sensitive business knowledge. New entries require a source, owner review and date.
// This lexical retrieval works on Cloudflare without a model, vector service or per-token API.
export type KnowledgeEntry={id:string;title:string;text:string;tags:string[];source:string;reviewed_at:string;status:"owner-supplied"|"verified"};

export const knowledge:KnowledgeEntry[]=[
  {id:"prism-services",title:"Prism of Stories services",text:"Prism of Stories offers website and app development, AI development, SEO, Google Ads, Meta Ads, branding, social content, video editing, animations, sales funnels, employee training, business consultation, market research and cold calling.",tags:["prism","services","marketing","sales","web","ai"],source:"Amal's Prism of Stories business brief",reviewed_at:"2026-09-22",status:"owner-supplied"},
  {id:"prism-team",title:"Prism team responsibilities",text:"Amal and Aadil are founders. Amal handles operations, client meetings and payments. Aadil handles accounts and legal matters. Aneesh leads design. Jishnu develops AI tools. Shahid handles video shoots, production, edits and spot edits.",tags:["team","roles","amal","aadil","aneesh","jishnu","shahid"],source:"Amal's team instructions",reviewed_at:"2026-09-24",status:"owner-supplied"},
  {id:"lunes-purpose",title:"Lunes AI product direction",text:"Lunes AI is intended to help businesses monitor digital activity, create marketing assets, suggest improvements and support customer and business operations. These are product goals, not verified live integrations.",tags:["lunes","loons","product","business","ai","roadmap"],source:"Amal's Lunes AI product brief",reviewed_at:"2026-09-24",status:"owner-supplied"},
  {id:"nostaza-brief",title:"Nostaza restaurant brief",text:"Nostaza Restaurant is a Prism client in Al Warqa, Dubai. Amal requested marketing centered on Kerala homely food and stated delivery availability on Keeta, Smile, Noon and Talabat. Recheck each platform and menu detail with the restaurant before publishing.",tags:["nostaza","restaurant","dubai","food","delivery","keeta","talabat"],source:"Amal's Nostaza campaign instructions",reviewed_at:"2026-09-25",status:"owner-supplied"},
  {id:"approval-policy",title:"COMIT outbound approval",text:"Drafts and plans may be generated automatically. A founder must approve external outreach, publishing and ad spend before execution. Record observed outcomes for review; do not claim a model is retrained by a logged event.",tags:["approval","outreach","campaign","automation","learning","policy"],source:"COMIT product requirements",reviewed_at:"2026-09-25",status:"owner-supplied"},
];

const stop=new Set(["about","after","and","are","can","comit","for","from","have","how","into","more","our","the","this","what","with","would","your","give","make","need","want","that","will","business"]);
export function retrieveKnowledge(query:string,limit=3){
  const tokens=[...new Set((query.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu)||[]).filter(x=>!stop.has(x)))];
  if(!tokens.length)return [];
  return knowledge.map(entry=>{
    const title=entry.title.toLowerCase(),tags=entry.tags.join(" ").toLowerCase(),body=entry.text.toLowerCase();
    const score=tokens.reduce((n,token)=>n+(entry.tags.includes(token)?5:0)+(title.includes(token)?3:0)+(body.includes(token)?1:0),0);
    return {entry,score};
  }).filter(x=>x.score>=3).sort((a,b)=>b.score-a.score).slice(0,Math.max(0,Math.min(limit,5))).map(x=>x.entry);
}
