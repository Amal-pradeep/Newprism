(()=>{ 
const KEY="prism_orbit_outreach_v4";
const AMAL="amalpradeep25@gmail.com", AADIL="aadil.sudhir279@gmail.com";
const SEED=[
{id:"uae-antonovich",company:"Antonovich Group",sector:"Interior Design",model:"Luxury Interior Design",city:"Dubai",email:"info@antonovich-group.ae",source:"https://antonovich-design.ae/contact-us.html",status:"New",owner:"Amal",lastContact:"",nextFollowup:"",notes:"Luxury architecture/interior design."},
{id:"uae-muse",company:"Muse Interior Design",sector:"Interior Design",model:"Interior Design",city:"Dubai",email:"info@musedesign.ae",source:"https://musedesign.ae/contact-us/",status:"New",owner:"Aadil",lastContact:"",nextFollowup:"",notes:"Dubai Design District; interior design."},
{id:"uae-zen",company:"Zen Interiors",sector:"Interior Design",model:"Turnkey Interiors",city:"Dubai",email:"sales@zeninteriors.net",source:"https://www.zeninteriors.net/contact-us/",status:"New",owner:"Amal",lastContact:"",nextFollowup:"",notes:"Residential interiors and turnkey solutions."},
{id:"uae-immersion",company:"Immersion Interior Design",sector:"Interior Design",model:"Commercial + Residential Design",city:"Dubai",email:"info@immersiondesigns.com",source:"https://immersiondesigns.com/contact/",status:"New",owner:"Aadil",lastContact:"",nextFollowup:"",notes:"Commercial, retail and residential design."},
{id:"uae-glee",company:"Glee Hospitality Solutions",sector:"Hospitality",model:"Hospitality Consulting",city:"Dubai",email:"info@gleehospitality.com",source:"https://www.gleehospitality.com/contact",status:"Drafted",owner:"Amal",lastContact:"",nextFollowup:"",notes:"Hospitality consulting and operations."},
{id:"uae-alsaraya",company:"Al Saraya Group",sector:"Restaurants",model:"Multi-brand Restaurant Group",city:"Dubai",email:"info@asah.me",source:"https://asah.me/",status:"Sent",owner:"Amal",lastContact:"2026-09-23",nextFollowup:"2026-09-26",notes:"40+ UAE food concepts; restaurant group outreach sent."},
{id:"uae-seventysix",company:"Seventy Six Group",sector:"Restaurants",model:"Delivery-first / Cloud Kitchen",city:"Dubai",email:"info@sevensixgroup.com",source:"https://www.sevensixgroup.com/",status:"Sent",owner:"Aadil",lastContact:"2026-09-23",nextFollowup:"2026-09-26",notes:"Delivery-first multi-brand operator; outreach sent."},
{id:"uae-foodfund",company:"FoodFund International",sector:"Restaurants",model:"Restaurant Group",city:"Dubai",email:"info@foodfund.ae",source:"https://www.foodfundint.com/",status:"Sent",owner:"Amal",lastContact:"2026-09-23",nextFollowup:"2026-09-26",notes:"Restaurant portfolio across UAE/Bahrain; outreach sent."},
{id:"uae-sunset",company:"Sunset Hospitality Group",sector:"Hospitality",model:"Lifestyle Hospitality Group",city:"Dubai",email:"info@sunsethospitality.com",source:"https://www.sunsethospitality.com/",status:"Sent",owner:"Aadil",lastContact:"2026-09-23",nextFollowup:"2026-09-26",notes:"Lifestyle hospitality group; outreach sent."},
{id:"uae-dynamic-kitchen",company:"Dynamic Kitchen",sector:"Restaurants",model:"Cloud Kitchen / Delivery Brands",city:"Dubai",email:"",source:"https://www.dynamic-kitchen.com/",status:"Researching",owner:"Amal",lastContact:"",nextFollowup:"",notes:"Research lead; public website identified, contact to verify before outreach."},
{id:"uae-just-group",company:"Just Group",sector:"Restaurants",model:"Restaurant + Cloud Kitchen + Catering",city:"Dubai",email:"info@justgroup.ae",source:"https://justgroup.ae/",status:"Researching",owner:"Aadil",lastContact:"",nextFollowup:"",notes:"Restaurant concepts, cloud kitchens and catering."},
{id:"uae-nawab",company:"Nawab Restaurant",sector:"Restaurants",model:"Multi-location Restaurant",city:"Dubai",email:"",source:"https://nawab.ae/",status:"Researching",owner:"Amal",lastContact:"",nextFollowup:"",notes:"Multiple Dubai locations; public website identified, contact to verify."},
{id:"uae-cloud10",company:"Cloud 10 Restaurant & Cafe",sector:"Restaurants",model:"Restaurant + Cafe",city:"Dubai",email:"",source:"https://www.cloud10.ae/",status:"Researching",owner:"Aadil",lastContact:"",nextFollowup:"",notes:"JVC restaurant/cafe; public website identified, contact to verify."}
];
const statuses=["New","Researching","Drafted","Sent","Follow-up","Replied","Meeting","Qualified","Won","Not interested","Opt out"];
const models=["","Interior Design","Luxury Interior Design","Turnkey Interiors","Commercial + Residential Design","Hospitality Consulting","Multi-brand Restaurant Group","Delivery-first / Cloud Kitchen","Restaurant Group","Lifestyle Hospitality Group","Cloud Kitchen / Delivery Brands","Restaurant + Cloud Kitchen + Catering","Multi-location Restaurant","Restaurant + Cafe"];
let S; try{S=JSON.parse(localStorage.getItem(KEY)||"null")}catch{S=null}
if(!S||!Array.isArray(S.leads)) S={leads:SEED.map(x=>({...x})),activities:[]};
if(!Array.isArray(S.activities))S.activities=[];
const old=JSON.parse(localStorage.getItem("prism_orbit_outreach_v3")||"null");
if(old?.leads?.length&&S.leads.length===SEED.length){S.leads=S.leads.map(x=>Object.assign({},SEED.find(y=>y.id===x.id)||{},x))}
const save=()=>localStorage.setItem(KEY,JSON.stringify(S));
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const today=()=>new Date().toISOString().slice(0,10);
const body=l=>{
 const pitch=l.model==="Delivery-first / Cloud Kitchen"?"delivery conversion, platform growth, offer creatives and repeat orders":
 l.model==="Multi-brand Restaurant Group"?"centralized content, paid acquisition, SEO and brand-level reporting":
 l.sector==="Interior Design"?"qualified lead generation, portfolio-led content, SEO and performance marketing":
 l.sector==="Hospitality"?"lead generation, content systems, SEO and digital operations":"digital growth, content and performance marketing";
 return "Hi "+l.company+" team,\n\nWe noticed your work in "+l.city+" and believe Prism of Stories could help strengthen "+pitch+" around your business.\n\nWe can share a short, no-obligation growth audit with 3–5 opportunities specific to your brand.\n\nWould you be open to a 15-minute conversation this week?\n\nRegards,\nAmal Pradeep\nPrism of Stories\nDigital Marketing · AI · Web Development\nprismofstories.com\n\nP.S. If this isn't relevant to your business, just let us know and we won't follow up.";
};
const log=(id,type,detail)=>{S.activities.unshift({id:"a-"+Date.now()+"-"+Math.random().toString(36).slice(2),leadId:id,type,detail,at:new Date().toISOString()});S.activities=S.activities.slice(0,200);save()};
function page(){
 return '<div class="card hero salesHero"><div class="ey">ORBIT · SALES OPERATIONS</div><h2>Prospect Command Center</h2><p>One pipeline for research, Gmail outreach, replies, follow-ups and revenue opportunities. External sending stays human-approved.</p><div class="toolbar"><button class="btn primary" onclick="prospectAdd()">+ Add Prospect</button><button class="btn" onclick="prospectSync()">↻ Sync Gmail</button><button class="btn" onclick="prospectExport()">Export CSV</button><button class="btn" onclick="prospectGmailConnect()">Connect Gmail</button></div><div id="gmailStatus" class="muted" style="margin-top:10px">Checking Gmail…</div></div>'+
 '<div class="grid g4" style="margin-top:12px"><div class="card"><div class="muted">Pipeline</div><div id="pcTotal" class="metric p">0</div></div><div class="card"><div class="muted">Sent</div><div id="pcSent" class="metric">0</div></div><div class="card"><div class="muted">Replies</div><div id="pcReplies" class="metric">0</div></div><div class="card"><div class="muted">Follow-ups due</div><div id="pcDue" class="metric">0</div></div></div>'+
 '<div class="card" style="margin-top:12px"><div class="top"><b>Prospects</b><div class="toolbar"><input id="pcSearch" class="input" placeholder="Search company, model or sector" oninput="renderProspects()"><select id="pcStatus" class="select" onchange="renderProspects()"><option value="">All stages</option>'+statuses.map(x=>'<option>'+x+'</option>').join("")+'</select><select id="pcModel" class="select" onchange="renderProspects()">'+models.map(x=>'<option value="'+esc(x)+'">'+(x||"All business models")+'</option>').join("")+'</select></div></div><div id="pcTable"></div></div>'+
 '<div class="card" style="margin-top:12px"><div class="ey">FOLLOW-UP QUEUE</div><div id="pcFollowups"></div></div>'+
 '<div class="card" style="margin-top:12px"><div class="ey">RECENT ACTIVITY</div><div id="pcActivity"></div></div>';
}
function renderProspects(){
 const host=document.getElementById("pcTable");if(!host)return;
 const q=(document.getElementById("pcSearch")?.value||"").toLowerCase(),st=document.getElementById("pcStatus")?.value||"",model=document.getElementById("pcModel")?.value||"";
 const leads=S.leads.filter(l=>(!q||[l.company,l.email,l.sector,l.model,l.notes].join(" ").toLowerCase().includes(q))&&(!st||l.status===st)&&(!model||l.model===model));
 const due=S.leads.filter(l=>l.nextFollowup&&l.nextFollowup<=today()&&!["Won","Not interested","Opt out"].includes(l.status));
 document.getElementById("pcTotal").textContent=S.leads.length;
 document.getElementById("pcSent").textContent=S.leads.filter(l=>["Sent","Follow-up","Replied","Meeting","Qualified","Won"].includes(l.status)).length;
 document.getElementById("pcReplies").textContent=S.leads.filter(l=>["Replied","Meeting","Qualified","Won"].includes(l.status)).length;
 document.getElementById("pcDue").textContent=due.length;
 host.innerHTML=leads.map(l=>{
  const disabled=!l.email?" disabled title=\"Public contact needs verification\"":"";
  return '<div class="row" style="align-items:flex-start"><div style="flex:1;min-width:0"><b>'+esc(l.company)+'</b><small class="muted" style="display:block">'+esc(l.email||"Contact to verify")+' · '+esc(l.model||l.sector)+' · '+esc(l.status)+'</small><small class="muted">'+esc(l.notes)+'</small></div><div class="toolbar"><select class="select" onchange="prospectStatus('+JSON.stringify(l.id)+',this.value)">'+statuses.map(x=>'<option '+(l.status===x?"selected":"")+'>'+x+'</option>').join("")+'</select><input class="input" type="date" value="'+esc(l.nextFollowup||"")+'" onchange="prospectFollowup('+JSON.stringify(l.id)+',this.value)"><button class="btn primary" onclick="prospectEmail('+JSON.stringify(l.id)+')"'+disabled+'>Gmail</button><a class="btn" href="'+esc(l.source||"#")+'" target="_blank" rel="noopener">Source</a></div></div>'
 }).join("")||'<div class="muted">No prospects match the current filters.</div>';
 document.getElementById("pcFollowups").innerHTML=due.map(l=>'<div class="row"><span><b>'+esc(l.company)+'</b><small class="muted" style="display:block">'+esc(l.model||l.sector)+' · due '+esc(l.nextFollowup)+'</small></span>'+ (l.email?'<button class="btn primary" onclick="prospectEmail('+JSON.stringify(l.id)+')">Follow up</button>':'<span class="tag amber">Verify contact</span>')+'</div>').join("")||'<div class="muted">No follow-ups due.</div>';
 document.getElementById("pcActivity").innerHTML=S.activities.slice(0,12).map(a=>'<div class="row"><span><b>'+esc(S.leads.find(l=>l.id===a.leadId)?.company||"Unknown")+'</b><small class="muted" style="display:block">'+esc(a.type)+' · '+esc(a.detail)+'</small></span><small class="muted">'+esc(a.at)+'</small></div>').join("")||'<div class="muted">No activity yet.</div>';
}
async function gs(){try{return await fetch("/api/gmail/status",{cache:"no-store"}).then(r=>r.json())}catch{return{configured:false,connected:false}}}
async function status(){const s=await gs(),e=document.getElementById("gmailStatus");if(!e)return;e.innerHTML=s.connected?"🟢 Gmail connected · "+esc(s.email)+" · <button class='btn' onclick='prospectGmailDisconnect()'>Disconnect</button>":s.configured?"🟡 Gmail configured · click Connect Gmail":"⚪ Gmail OAuth is not configured in production yet."}
window.prospectGmailConnect=()=>location.href="/api/gmail/connect";
window.prospectGmailDisconnect=async()=>{await fetch("/api/gmail/disconnect",{method:"POST"});status()};
window.prospectStatus=(id,v)=>{const l=S.leads.find(x=>x.id===id);if(!l)return;l.status=v;log(id,"Stage",v);renderProspects()};
window.prospectFollowup=(id,v)=>{const l=S.leads.find(x=>x.id===id);if(!l)return;l.nextFollowup=v;log(id,"Follow-up",v);renderProspects()};
window.prospectEmail=async id=>{
 const l=S.leads.find(x=>x.id===id),s=await gs();if(!l)return;if(!l.email)return toast("Verify a public business email before sending.");if(!s.connected)return toast("Connect Gmail first.");
 if(!confirm("Send this Prism of Stories outreach to "+l.email+"?"))return;
 const payload={to:l.email,cc:AMAL+", "+AADIL,subject:"A practical growth idea for "+l.company,body:body(l)};
 const r=await fetch("/api/gmail/send",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({payload:JSON.stringify(payload)})});
 const d=await r.json().catch(()=>({}));if(!r.ok){toast(d.error||"Gmail send failed");return}
 l.status="Sent";l.lastContact=today();l.nextFollowup=l.nextFollowup||new Date(Date.now()+259200000).toISOString().slice(0,10);l.gmailThreadId=d.threadId;log(id,"Gmail sent","Message "+(d.messageId||"sent"));renderProspects();toast("Email sent with Amal + Aadil CC");
};
window.prospectSync=async()=>{
 const s=await gs();if(!s.connected){toast("Connect Gmail first.");return}
 const qs=["in:sent newer_than:30d","in:inbox newer_than:30d"];
 const results=await Promise.all(qs.map(q=>fetch("/api/gmail/search?q="+encodeURIComponent(q),{cache:"no-store"}).then(r=>r.json()).catch(()=>({threads:[]}))));
 let replies=0;
 results.forEach((x,ix)=>(x.threads||[]).forEach(t=>(t.messages||[]).forEach(m=>{
  const h=Object.fromEntries((m.payload?.headers||[]).map(x=>[String(x.name).toLowerCase(),x.value])),from=(h.from||"").match(/<([^>]+)>/)?.[1]||h.from||"",to=(h.to||"").toLowerCase();
  S.leads.forEach(l=>{if(l.email&&((l.email.toLowerCase()===from.toLowerCase())||to.includes(l.email.toLowerCase()))){l.gmailThreadId=t.id;l.lastContact=(h.date||"").slice(0,10)||l.lastContact;if(ix===1&&l.status!=="Opt out"&&l.status!=="Won"&&l.status!=="Replied"){l.status="Replied";replies++;log(l.id,"Reply detected","Gmail thread "+t.id)}}})
 })));
 save();renderProspects();toast("Gmail sync complete · "+replies+" replies matched");
};
window.prospectAdd=()=>{const c=prompt("Company name"),e=prompt("Public business email (optional)");if(!c)return;S.leads.unshift({id:"lead-"+Date.now(),company:c,email:e||"",sector:"Other",model:"Other",city:"Dubai",status:"New",owner:"Amal",lastContact:"",nextFollowup:"",notes:"Added manually; verify public business contact before outreach."});save();renderProspects();toast("Prospect added")};
window.prospectExport=()=>{const rows=[["Company","Email","Sector","Business Model","City","Owner","Status","Last Contact","Next Follow-up","Notes"],...S.leads.map(l=>[l.company,l.email,l.sector,l.model,l.city,l.owner,l.status,l.lastContact,l.nextFollowup,l.notes])];const csv=rows.map(r=>r.map(v=>'"'+String(v||"").replaceAll('"','""')+'"').join(",")).join("\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="prism-orbit-prospects.csv";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
window.outreachPage=page;window.renderOutreach=renderProspects;window.outreachStatus=window.prospectStatus;window.outreachCompose=window.prospectEmail;
const nav=document.getElementById("nav"),bottom=document.getElementById("bottom");
if(nav&&!nav.querySelector('[data-k="outreach"]'))nav.insertAdjacentHTML("beforeend",'<button data-k="outreach" onclick="show(\'outreach\')"><i>🎯</i>Prospects & Email</button>');
if(bottom&&!bottom.querySelector('[data-k="outreach"]'))bottom.insertAdjacentHTML("beforeend",'<button data-k="outreach" onclick="show(\'outreach\')"><b>🎯</b>Prospects</button>');
if(window.P)window.P.outreach=page;
const oldShow=window.show;if(oldShow&&!window.__outreachWrapped){window.__outreachWrapped=true;window.show=function(k){oldShow(k);if(k==="outreach")setTimeout(()=>{renderProspects();status()},0)}}
})();