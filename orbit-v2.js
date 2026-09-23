(()=> {
  'use strict';

  const VERSION = '2026.09.23-orbit-v2';
  const LEAD_KEY = 'prism_orbit_outreach_v4';
  const TASK_KEY = 'prism_orbit_v10';

  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'
  }[c]));

  const readJSON = (key, fallback) => {
    try {
      const v = JSON.parse(localStorage.getItem(key) || 'null');
      return v ?? fallback;
    } catch (_) { return fallback; }
  };

  const leads = () => {
    const d = readJSON(LEAD_KEY, {leads:[]});
    return Array.isArray(d.leads) ? d.leads : [];
  };

  const tasks = () => {
    const d = readJSON(TASK_KEY, {tasks:[]});
    return Array.isArray(d.tasks) ? d.tasks : [];
  };

  const activeLeads = () => leads().filter(l => !['Won','Opt out','Not interested'].includes(l.status));
  const sentLeads = () => leads().filter(l => ['Sent','Follow-up','Replied','Meeting','Qualified','Won'].includes(l.status));
  const dueLeads = () => {
    const today = new Date().toISOString().slice(0,10);
    return leads().filter(l => l.nextFollowup && l.nextFollowup <= today && !['Won','Opt out','Not interested'].includes(l.status));
  };

  function kpi(label,value,sub,cls='') {
    return '<div class="v2-kpi '+cls+'"><div class="v2-kpi-label">'+esc(label)+'</div><div class="v2-kpi-value">'+esc(value)+'</div><div class="v2-kpi-sub">'+esc(sub)+'</div></div>';
  }

  function pill(text,kind='') { return '<span class="v2-pill '+kind+'">'+esc(text)+'</span>'; }

  function section(title, eyebrow, body, action='') {
    return '<section class="v2-card"><div class="v2-section-head"><div><div class="v2-ey">'+esc(eyebrow)+'</div><h3>'+esc(title)+'</h3></div>'+action+'</div>'+body+'</section>';
  }

  function modelCounts() {
    const map = {};
    leads().forEach(l => { const k=l.model||l.sector||'Other'; map[k]=(map[k]||0)+1; });
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,6);
  }

  function pipelineRows() {
    return leads().slice(0,10).map(l =>
      '<div class="v2-row"><div class="v2-main"><b>'+esc(l.company)+'</b><small>'+esc(l.model||l.sector||'Other')+' · '+esc(l.city||'UAE')+' · '+esc(l.owner||'Unassigned')+'</small></div>'+pill(l.status||'New', l.status==='Sent'?'ok':l.status==='Replied'||l.status==='Meeting'?'hot':'')+'</div>'
    ).join('') || '<div class="v2-empty">No prospects yet. Open <b>Prospects & Email</b> to add one.</div>';
  }

  async function productionHealth() {
    const out={health:null,monitoring:null};
    try { const r=await fetch('/api/health',{cache:'no-store'}); out.health=await r.json(); } catch (_) {}
    try { const r=await fetch('/api/monitoring/summary',{cache:'no-store'}); if(r.ok) out.monitoring=await r.json(); } catch (_) {}
    return out;
  }

  function healthMarkup(d) {
    if (!d.health) return '<div class="v2-health-off">Unable to reach Orbit health endpoint.</div>';
    const m=d.monitoring;
    const err=m?.requests?.error_rate ?? 0;
    const mem=m?.resources?.rss_mb ?? 0;
    return '<div class="v2-health-line">'+
      pill('API online','ok')+
      pill('Version '+(d.health.version||VERSION),'')+
      pill('Node '+(d.health.node||'unknown'),'')+
      pill((err*100).toFixed(2)+'% error rate',err>0.02?'warn':'ok')+
      pill(mem+' MB RSS',mem>300?'warn':'')+
      '</div>';
  }

  function refreshHomeData() {
    const host=document.getElementById('v2-live');
    if(!host)return;
    const ls=leads(), ts=tasks(), due=dueLeads();
    host.innerHTML=
      kpi('Prospects',ls.length,'Tracked in Orbit')+
      kpi('Contacted',sentLeads().length,'Sent / follow-up / reply','hot')+
      kpi('Follow-ups',due.length,due.length?'Needs attention':'Nothing due','')+
      kpi('Tasks',ts.length,'Workspace tasks','');
    productionHealth().then(d=>{
      const h=document.getElementById('v2-health');
      if(h)h.innerHTML=healthMarkup(d);
      const note=document.getElementById('v2-runtime-note');
      if(note)note.textContent=d.health ? 'Runtime verified '+new Date().toLocaleTimeString() : 'Runtime check failed';
    });
    const p=document.getElementById('v2-pipeline');
    if(p)p.innerHTML=pipelineRows();
    const mc=document.getElementById('v2-models');
    if(mc)mc.innerHTML=modelCounts().map(([m,n])=>'<div class="v2-row"><div class="v2-main"><b>'+esc(m)+'</b><small>Business-model segment</small></div>'+pill(n+' leads','')+'</div>').join('')||'<div class="v2-empty">No segments yet.</div>';
  }

  function orbitV2Home() {
    return '<style id="orbitV2Styles">'+
      '.v2-shell{display:grid;gap:14px}.v2-hero{position:relative;overflow:hidden;padding:24px;background:radial-gradient(circle at 85% 10%,#a855f72b,transparent 35%),radial-gradient(circle at 5% 90%,#38bdf822,transparent 35%),linear-gradient(145deg,#ffffff10,#ffffff04)}'+
      '.v2-hero:after{content:"";position:absolute;width:320px;height:320px;border-radius:50%;right:-130px;top:-170px;border:1px solid #ffffff18;box-shadow:0 0 100px #8b5cf633}.v2-ey{font-size:10px;letter-spacing:.18em;color:#c4b5fd;text-transform:uppercase}.v2-hero h1{font-size:clamp(32px,5vw,58px);line-height:1;margin:8px 0 12px;max-width:800px}.v2-hero h1 span{background:linear-gradient(90deg,#fff,#c4b5fd,#f0abfc);-webkit-background-clip:text;color:transparent}.v2-hero p{max-width:760px;color:#b8aec6;line-height:1.65;margin:0}.v2-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px;position:relative;z-index:2}.v2-btn{border:1px solid #ffffff18;background:#ffffff08;color:#fff;border-radius:12px;padding:10px 13px;cursor:pointer;font-weight:750}.v2-btn:hover{background:#ffffff14;transform:translateY(-1px)}.v2-btn.primary{border:0;background:linear-gradient(135deg,#7c3aed,#ec4899)}.v2-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.v2-kpi{border:1px solid #ffffff12;background:#ffffff07;border-radius:16px;padding:14px}.v2-kpi-label{font-size:11px;color:#aaa0b8}.v2-kpi-value{font-size:28px;font-weight:900;margin-top:5px}.v2-kpi-sub{font-size:10px;color:#8f8599;margin-top:4px}.v2-card{border:1px solid #ffffff13;background:linear-gradient(145deg,#ffffff0a,#ffffff03);border-radius:18px;padding:16px}.v2-section-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:10px}.v2-section-head h3{margin:4px 0 0;font-size:17px}.v2-two{display:grid;grid-template-columns:1.2fr .8fr;gap:14px}.v2-row{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid #ffffff0c}.v2-row:last-child{border-bottom:0}.v2-main{min-width:0}.v2-main b{display:block;font-size:12px}.v2-main small{display:block;color:#91889c;margin-top:3px;font-size:10px}.v2-pill{display:inline-flex;align-items:center;border:1px solid #ffffff14;background:#ffffff08;color:#c9bfd1;border-radius:999px;padding:5px 8px;font-size:9px;white-space:nowrap}.v2-pill.ok{color:#bbf7d0;border-color:#22c55e33;background:#22c55e12}.v2-pill.hot{color:#f5d0fe;border-color:#d946ef33;background:#d946ef12}.v2-pill.warn{color:#fde68a;border-color:#f59e0b33;background:#f59e0b12}.v2-health-line{display:flex;flex-wrap:wrap;gap:7px}.v2-empty,.v2-health-off{color:#8f8599;padding:10px 0;font-size:12px}.v2-checklist{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.v2-check{border:1px solid #ffffff10;background:#ffffff05;border-radius:13px;padding:11px}.v2-check b{display:block;font-size:11px}.v2-check span{font-size:10px;color:#8f8599}.v2-segment{display:flex;gap:7px;flex-wrap:wrap}.v2-segment .v2-pill{cursor:pointer}.v2-runtime{font-size:10px;color:#81788b}.v2-risk{border-left:3px solid #f59e0b;padding-left:10px;color:#b9afc1;font-size:12px;line-height:1.5}.v2-footer{display:flex;justify-content:space-between;gap:8px;align-items:center;color:#777080;font-size:10px;padding:2px 3px 10px}@media(max-width:1000px){.v2-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.v2-two{grid-template-columns:1fr}}@media(max-width:600px){.v2-grid,.v2-checklist{grid-template-columns:1fr}.v2-hero{padding:18px}.v2-hero h1{font-size:34px}.v2-card{padding:13px}}'+
    '</style>'+
    '<div class="v2-shell">'+
      '<section class="v2-card v2-hero">'+
        '<div class="v2-ey">PRISM ORBIT · VERSION 2</div>'+
        '<h1>One command center for the <span>whole agency.</span></h1>'+
        '<p>Orbit now puts business intelligence, UAE prospecting, Gmail outreach, tasks, clients, marketing, finance, automation and production observability behind one safer operating layer. Propose first. Approve sensitive actions. Learn from outcomes.</p>'+
        '<div class="v2-actions">'+
          '<button class="v2-btn primary" onclick="show(\\'outreach\\')">🎯 Open sales pipeline</button>'+
          '<button class="v2-btn" onclick="show(\\'manager\\')">♛ Executive priorities</button>'+
          '<button class="v2-btn" onclick="show(\\'monitoring\\')">📈 Production health</button>'+
          '<button class="v2-btn" onclick="openVoice()">◉ Ask Orbit</button>'+
          '<button class="v2-btn" onclick="v2Refresh()">↻ Refresh</button>'+
        '</div>'+
      '</section>'+
      '<div id="v2-live" class="v2-grid"></div>'+
      '<div class="v2-card"><div class="v2-section-head"><div><div class="v2-ey">RUNTIME TRUST LAYER</div><h3>Production health</h3></div><span id="v2-runtime-note" class="v2-runtime">Checking…</span></div><div id="v2-health"></div></div>'+
      '<div class="v2-two">'+
        section('Active pipeline','UAE SALES INTELLIGENCE','<div id="v2-pipeline"></div>','<button class="v2-btn" onclick="show(\\'outreach\\')">Manage →</button>')+
        section('Business-model map','SEGMENTATION','<div id="v2-models"></div>')+
      '</div>'+
      '<div class="v2-two">'+
        section('Operating system','PROMISED CAPABILITIES','<div class="v2-checklist">'+
          '<div class="v2-check"><b>Research intelligence</b><span>Market studies, opportunity discovery and knowledge base.</span></div>'+
          '<div class="v2-check"><b>Sales intelligence</b><span>Leads, ownership, stages, follow-ups and export.</span></div>'+
          '<div class="v2-check"><b>Cold email control</b><span>Prism of Stories identity, CC Amal + Aadil, opt-out, no Orbit links.</span></div>'+
          '<div class="v2-check"><b>Gmail tracking</b><span>OAuth, send, inbox/sent matching and reply detection.</span></div>'+
          '<div class="v2-check"><b>Marketing & creative</b><span>Campaign planning, audience ideas, creative lab and content workflows.</span></div>'+
          '<div class="v2-check"><b>Clients & projects</b><span>Delivery context, project tracking, tasks and team ownership.</span></div>'+
          '<div class="v2-check"><b>Automation</b><span>Trigger/action workflows with human approval for external actions.</span></div>'+
          '<div class="v2-check"><b>Observability</b><span>Health endpoint, request metrics, error capture and runtime advice.</span></div>'+
        '</div>')+
        section('AI operating rule','SAFETY + QUALITY','<div class="v2-risk">Orbit can prepare, organize and recommend work. External communication, ad spend and other sensitive actions remain approval-gated. No live metric is invented; integrations are shown as connected only when verified.</div><div class="v2-actions"><button class="v2-btn" onclick="show(\\'ai\\')">Open Orbit AI</button><button class="v2-btn" onclick="show(\\'autopilot\\')">Open Autopilot</button><button class="v2-btn" onclick="show(\\'reports\\')">Open Reports</button></div>')+
      '</div>'+
      '<div class="v2-footer"><span>Orbit V2 · '+VERSION+'</span><span>Prism of Stories · prismofstories.com</span></div>'+
    '</div>';
  }

  window.v2Refresh = refreshHomeData;
  window.orbitV2Version = VERSION;

  function install() {
    if (typeof P === 'undefined' || typeof NAV === 'undefined') return;
    P.home = orbitV2Home;
    if (Array.isArray(NAV[0])) NAV[0][2] = 'Orbit Command Center';
    const old=document.getElementById('p-home');
    if(old) old.remove();
    if(typeof buildRoleAwareNav==='function') buildRoleAwareNav();
    if(typeof show==='function') show('home');
    setTimeout(refreshHomeData,20);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();