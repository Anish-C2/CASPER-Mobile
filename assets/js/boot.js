function setSport(id){
  if(!id||id==='hub'){PAGE.mode='hub';PAGE.sport=null;}else{PAGE.mode='sport';PAGE.sport=id;}
  paintPills();
}
function paintPills(){
  const cur=PAGE.mode==='hub'?'hub':PAGE.sport,slot=document.getElementById('sport-pills'); if(!slot)return;
  slot.innerHTML='<a href="#home" data-sport="hub"'+(cur==='hub'?' class="on"':'')+'>All sports</a>'+STATE.sportsCfg.sports.map(s=>'<a href="#sport/'+encodeURIComponent(s.id)+'" data-sport="'+escapeHtml(s.id)+'"'+(cur===s.id?' class="on"':'')+'>'+escapeHtml(s.name)+'</a>').join('');
}
function setActive(view){document.querySelectorAll('.m-tabbar a').forEach(a=>a.classList.toggle('active',a.getAttribute('data-view')===view));}
function route(){
  if(!STATE.ready)return;
  const hash=(location.hash||'#home').slice(1),parts=hash.split('/'),view=parts[0],arg=parts.slice(1).join('/');
  if(view==='sport'&&arg){setSport(decodeURIComponent(arg));location.hash='#home';return;}
  const tab=['competition','player','team'].includes(view)?(view==='player'?'players':view==='team'?'teams':'archive'):view; setActive(tab);
  let html='';
  if(view==='home'||!view)html=renderHome();
  else if(view==='archive'||view==='competitions')html=renderArchive();
  else if(view==='competition'&&arg)html=renderCompetition(decodeURIComponent(arg));
  else if(view==='players')html=renderPlayers();
  else if(view==='player'&&arg)html=renderPlayer(arg);
  else if(view==='teams')html=renderTeams();
  else if(view==='team'&&arg)html=renderTeam(decodeURIComponent(arg));
  else if(view==='awards')html=renderAwards(); else if(view==='ranking')html=renderRanking(); else if(view==='records')html=renderRecords(); else if(view==='statistics')html=renderStatistics(); else if(view==='news')html=renderNews(); else if(view==='about')html=renderAbout(); else html=renderHome();
  document.getElementById('app').innerHTML=html; window.scrollTo(0,0); closeDrawer();
}
function closeDrawer(){document.getElementById('drawer').hidden=true;document.getElementById('scrim').hidden=true;}
function wireChrome(){
  document.getElementById('menu-btn').onclick=()=>{document.getElementById('drawer').hidden=false;document.getElementById('scrim').hidden=false;};
  document.getElementById('drawer-close').onclick=closeDrawer; document.getElementById('scrim').onclick=closeDrawer;
  document.getElementById('search-btn').onclick=()=>{const bar=document.getElementById('search-bar');bar.hidden=!bar.hidden;if(!bar.hidden)document.getElementById('search-input').focus();};
  document.getElementById('search-form').onsubmit=e=>{e.preventDefault();const q=document.getElementById('search-input').value.trim().toLowerCase();if(!q)return;const pl=collectPlayers().find(p=>p.name.toLowerCase()===q)||collectPlayers().find(p=>p.name.toLowerCase().includes(q));const tm=collectTeams().find(t=>t.name.toLowerCase()===q||t.abbr.toLowerCase()===q)||collectTeams().find(t=>t.name.toLowerCase().includes(q));const comp=allTourneys().find(x=>String(x.t.meta.e||'').toLowerCase().includes(q)||String(x.t.meta.id||'').toLowerCase()===q);if(pl)location.hash='#player/'+encodeURIComponent(pl.name);else if(tm)location.hash='#team/'+encodeURIComponent(tm.abbr);else if(comp)location.hash='#competition/'+encodeURIComponent(comp.t.meta.id);else location.hash='#players';};
}
async function loadSport(cfg){
  let manifest=await fetchFirst(cfg.manifest,true);
  if(!Array.isArray(manifest))manifest=Array.isArray(manifest.files)?manifest.files:Array.isArray(manifest.entries)?manifest.entries:[];
  const tours=[];
  for(const f of manifest){
    if(!f||typeof f!=='string')continue;
    try{const text=await fetchFirst(cfg.dataDir+'/'+f,false);const parsed=parseCSN(text);if(Array.isArray(parsed))tours.push.apply(tours,parsed);}catch(e){console.warn('CASPER Mobile: skipped '+f,e);}
  }
  return buildSport(cfg,tours);
}
async function boot(){
  try{
    STATE.config=await fetchFirst('config.json',true);
    STATE.sportsCfg=await fetchFirst('sports.json',true);
    STATE.misc=await fetchFirst('misc.json',true);
    STATE.registry=Object.assign({},await fetchFirst('player-registry.json',true),STATE.config.playerRegistry||{});
    STATE.api=null;STATE.apiSectors=[];
    if(window.CASPER_API){try{STATE.api=await CASPER_API.all({season:STATE.config.defaultSeason||'2026A'});STATE.apiSectors=await CASPER_API.sectors({});}catch(e){console.warn('CASPER API snapshot unavailable; archive parser remains active.',e);}}
    if(!STATE.apiSectors.length){try{const sectors=await fetchFirst('sectors.json',true);STATE.apiSectors=Array.isArray(sectors)?sectors:(sectors.sectors||[]);}catch(e){}}
    const results=await Promise.all(STATE.sportsCfg.sports.map(async cfg=>({cfg,sp:await loadSport(cfg)})));
    results.forEach(x=>{STATE.sports[x.cfg.id]=x.sp;});
    STATE.ready=true;
    const parserMatches=Object.values(STATE.sports).reduce((n,sp)=>n+(sp.matches||[]).length,0),parserComps=Object.values(STATE.sports).reduce((n,sp)=>n+(sp.tournaments||[]).length,0);
    const apiMatches=STATE.api&&Array.isArray(STATE.api.matches)?STATE.api.matches.length:parserMatches;
    const apiComps=STATE.api&&Array.isArray(STATE.api.competitions)?STATE.api.competitions.length:parserComps;
    document.getElementById('header-sub').textContent='Live archive · '+(STATE.config.defaultSeason||'2026A');
    document.getElementById('ticker').textContent=apiComps+' competitions · '+apiMatches+' matches · '+STATE.apiSectors.length+' sectors · API v'+(window.CASPER_API?CASPER_API.version:'archive');
    paintPills();wireChrome();route();window.addEventListener('hashchange',route);
  }catch(err){
    console.error(err);
    document.getElementById('app').innerHTML='<div class="card err"><h3>Could not load archive</h3><p>CASPER Mobile could not load the public archive data.</p><p class="tiny">'+escapeHtml(err&&err.message?err.message:String(err))+'</p><button class="retry" onclick="location.reload()">Retry</button></div>';
  }
}
boot();
