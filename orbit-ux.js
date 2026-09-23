(function(){
const actions=[
['home','⌂','Command Center','Daily overview'],
['manager','◈','My Manager','Executive priorities'],
['outreach','🎯','Prospects & Email','Leads and follow-ups'],
['sales','💰','Sales','Pipeline'],
['clients','◉','Clients','Delivery and growth'],
['tasks','✓','Tasks','Your assigned work'],
['team','👥','Team','People and ownership'],
['marketing','✦','Marketing','Content and campaigns'],
['restaurantSales','🍽','Restaurant Sales','UAE restaurant pipeline'],
['reports','▣','Reports','Business reporting'],
['autopilot','⚡','Autopilot','Orbit flows'],
['settings','⚙','Settings','Workspace settings']
];
const css=`
.quickdock{position:fixed;right:18px;bottom:18px;z-index:60;display:flex;gap:7px;align-items:center;padding:7px;border:1px solid #ffffff1c;background:#0d0917ee;backdrop-filter:blur(18px);border-radius:16px;box-shadow:0 18px 60px #0009}
.quickdock button{border:1px solid transparent;background:#ffffff08;color:#eee;border-radius:11px;padding:9px 11px;cursor:pointer;font-size:12px;font-weight:700}
.quickdock button:hover{background:#ffffff14;border-color:#a855f744;transform:translateY(-1px)}
.quickdock .qk-primary{background:linear-gradient(135deg,#7c3aed,#ec4899);border:0}
.orbit-palette{position:fixed;inset:0;background:#0009;backdrop-filter:blur(10px);z-index:120;display:none;place-items:start center;padding:10vh 16px}
.orbit-palette.on{display:grid}
.palette-box{width:min(680px,100%);background:#10091a;border:1px solid #a855f755;border-radius:20px;box-shadow:0 30px 100px #000;overflow:hidden}
.palette-search{width:100%;border:0;border-bottom:1px solid #ffffff14;background:#ffffff08;color:white;padding:17px;font-size:16px;outline:0}
.palette-list{max-height:55vh;overflow:auto;padding:8px}
.palette-item{width:100%;display:flex;align-items:center;gap:12px;border:0;background:transparent;color:#eee;padding:12px;border-radius:11px;text-align:left;cursor:pointer}
.palette-item:hover,.palette-item:focus{background:#ffffff0d;outline:0}
.palette-item small{display:block;color:#a9a0ba;margin-top:2px}
@media(max-width:900px){.quickdock{left:10px;right:10px;bottom:calc(78px + env(safe-area-inset-bottom));justify-content:space-between;padding:6px}.quickdock button{flex:1;padding:9px 5px;font-size:11px}.quickdock button:nth-child(5){display:none}}
@media(prefers-reduced-motion:reduce){*,*:before,*:after{scroll-behavior:auto!important;animation-duration:.001ms!important;animation-iteration-count:1!important;transition:none!important}}
`;
function inject(){
 if(document.getElementById('orbitUxStyle'))return;
 const style=document.createElement('style');style.id='orbitUxStyle';style.textContent=css;document.head.appendChild(style);
 const dock=document.createElement('div');dock.id='orbitQuickDock';dock.className='quickdock';dock.setAttribute('aria-label','Orbit quick actions');
 dock.innerHTML='<button class="qk-primary" data-k="home">⌂ Home</button><button data-k="tasks">✓ Tasks</button><button data-k="outreach">🎯 Leads</button><button data-k="team">👥 Team</button><button data-palette="1">⌘K</button>';
 document.body.appendChild(dock);
 const palette=document.createElement('div');palette.id='orbitPalette';palette.className='orbit-palette';palette.innerHTML='<div class="palette-box"><input id="orbitPaletteSearch" class="palette-search" placeholder="Jump to a workspace… (Esc to close)" autocomplete="off"><div id="orbitPaletteList" class="palette-list"></div></div>';
 palette.addEventListener('click',e=>{if(e.target===palette)closePalette()});document.body.appendChild(palette);
 dock.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>window.show?.(b.dataset.k));
 dock.querySelector('[data-palette]').onclick=openPalette;
 const search=document.getElementById('orbitPaletteSearch');search.oninput=()=>renderPalette(search.value);
 document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openPalette()}if(e.key==='Escape')closePalette()});
 const gate=document.getElementById('authGate');if(gate&&getComputedStyle(gate).display!=='none')dock.style.display='none';
}
function renderPalette(q=''){
 const host=document.getElementById('orbitPaletteList');if(!host)return;
 const term=q.toLowerCase();const allowed=typeof allowedNav==='function'?allowedNav().map(x=>x[0]):actions.map(x=>x[0]);
 const list=actions.filter(a=>allowed.includes(a[0])&&(a[2]+' '+a[3]).toLowerCase().includes(term));
 host.innerHTML=list.map(a=>'<button class="palette-item" data-k="'+a[0]+'"><b style="font-size:18px;width:24px">'+a[1]+'</b><span><b>'+a[2]+'</b><small>'+a[3]+'</small></span></button>').join('')||'<div class="muted" style="padding:16px">No matching workspace.</div>';
 host.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{window.show?.(b.dataset.k);closePalette()});
}
function openPalette(){const p=document.getElementById('orbitPalette');if(!p)return;p.classList.add('on');const s=document.getElementById('orbitPaletteSearch');s.value='';renderPalette();setTimeout(()=>s.focus(),30)}
function closePalette(){document.getElementById('orbitPalette')?.classList.remove('on')}
window.orbitPalette=openPalette;window.closeOrbitPalette=closePalette;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inject);else inject();
})();