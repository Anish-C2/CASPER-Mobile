function setSport(id) {
  if (!id || id === 'hub') { PAGE.mode = 'hub'; PAGE.sport = null; }
  else { PAGE.mode = 'sport'; PAGE.sport = id; }
  paintPills();
}
function paintPills() {
  const cur = PAGE.mode === 'hub' ? 'hub' : PAGE.sport;
  const slot = document.getElementById('sport-pills');
  if (!slot) return;
  slot.innerHTML = '<a href="#home" data-sport="hub"' + (cur === 'hub' ? ' class="on"' : '') + '>All sports</a>' +
    STATE.sportsCfg.sports.map(s => '<a href="#sport/' + s.id + '" data-sport="' + s.id + '"' + (cur === s.id ? ' class="on"' : '') + '>' + escapeHtml(s.name) + '</a>').join('');
}
function setActive(view) {
  document.querySelectorAll('.m-tabbar a').forEach(a => a.classList.toggle('active', a.getAttribute('data-view') === view));
}
function route() {
  if (!STATE.ready) return;
  const hash = (location.hash || '#home').slice(1);
  const parts = hash.split('/');
  const view = parts[0], arg = parts.slice(1).join('/');
  if (view === 'sport' && arg) { setSport(arg); location.hash = '#home'; return; }
  const tab = ['competition', 'player', 'team'].includes(view) ? (view === 'player' ? 'players' : view === 'team' ? 'teams' : 'archive') : view;
  setActive(tab);
  let html = '';
  if (view === 'home' || !view) html = renderHome();
  else if (view === 'archive' || view === 'competitions') html = renderArchive();
  else if (view === 'competition' && arg) html = renderCompetition(arg);
  else if (view === 'players') html = renderPlayers();
  else if (view === 'player' && arg) html = renderPlayer(arg);
  else if (view === 'teams') html = renderTeams();
  else if (view === 'team' && arg) html = renderTeam(arg);
  else if (view === 'awards') html = renderAwards();
  else if (view === 'ranking') html = renderRanking();
  else if (view === 'records') html = renderRecords();
  else if (view === 'statistics') html = renderStatistics();
  else if (view === 'news') html = renderNews();
  else if (view === 'about') html = renderAbout();
  else html = renderHome();
  document.getElementById('app').innerHTML = html;
  window.scrollTo(0, 0);
  closeDrawer();
}
function closeDrawer() {
  document.getElementById('drawer').hidden = true;
  document.getElementById('scrim').hidden = true;
}
function wireChrome() {
  document.getElementById('menu-btn').onclick = () => { document.getElementById('drawer').hidden = false; document.getElementById('scrim').hidden = false; };
  document.getElementById('drawer-close').onclick = closeDrawer;
  document.getElementById('scrim').onclick = closeDrawer;
  document.getElementById('search-btn').onclick = () => {
    const bar = document.getElementById('search-bar');
    bar.hidden = !bar.hidden;
    if (!bar.hidden) document.getElementById('search-input').focus();
  };
  document.getElementById('search-form').onsubmit = (e) => {
    e.preventDefault();
    const q = document.getElementById('search-input').value.trim().toLowerCase();
    if (!q) return;
    const pl = collectPlayers().find(p => p.name.toLowerCase() === q) || collectPlayers().find(p => p.name.toLowerCase().includes(q));
    const tm = collectTeams().find(t => t.name.toLowerCase() === q || t.abbr.toLowerCase() === q) || collectTeams().find(t => t.name.toLowerCase().includes(q));
    const comp = allTourneys().find(x => String(x.t.meta.e || '').toLowerCase().includes(q) || String(x.t.meta.id || '').toLowerCase() === q);
    if (pl) location.hash = '#player/' + encodeURIComponent(pl.name);
    else if (tm) location.hash = '#team/' + encodeURIComponent(tm.abbr);
    else if (comp) location.hash = '#competition/' + encodeURIComponent(comp.t.meta.id);
    else location.hash = '#players';
  };
}
async function boot() {
  try {
    STATE.config = await fetchFirst('config.json', true);
    STATE.sportsCfg = await fetchFirst('sports.json', true);
    STATE.misc = await fetchFirst('misc.json', true);
    STATE.registry = Object.assign({}, await fetchFirst('player-registry.json', true), STATE.config.playerRegistry || {});

    // CASPER API v1.1 is the mobile site's live data contract. The legacy
    // archive parser remains available for rich match/standings rendering.
    STATE.api = null;
    if (window.CASPER_API) {
      try {
        STATE.api = await CASPER_API.all({ season: STATE.config.defaultSeason || '2026A' });
        STATE.apiSectors = await CASPER_API.sectors({});
      } catch (e) {
        console.warn('CASPER API snapshot unavailable; using archive fallback.', e);
      }
    }

    for (const cfg of STATE.sportsCfg.sports) {
      let files = [];
      try { files = await fetchFirst(cfg.manifest, true); } catch (e) { files = []; }
      const tours = [];
      for (const f of files) {
        try { tours.push.apply(tours, parseCSN(await fetchFirst(cfg.dataDir + '/' + f, false))); } catch (e) { console.warn('Could not parse', f, e); }
      }
      STATE.sports[cfg.id] = buildSport(cfg, tours);
    }

    STATE.ready = true;
    const apiMatches = STATE.api && Array.isArray(STATE.api.matches) ? STATE.api.matches.length : 0;
    const apiComps = STATE.api && Array.isArray(STATE.api.competitions) ? STATE.api.competitions.length : 0;
    document.getElementById('header-sub').textContent = 'Live archive · ' + (STATE.config.defaultSeason || '2026A');
    document.getElementById('ticker').textContent = apiComps + ' competitions · ' + apiMatches + ' matches · ' + ((STATE.apiSectors || []).length) + ' sectors · API v' + (window.CASPER_API ? CASPER_API.version : '—');
    paintPills();
    wireChrome();
    route();
    window.addEventListener('hashchange', route);
  } catch (err) {
    document.getElementById('app').innerHTML = '<div class="card err"><h3>Could not load archive</h3><p>CASPER Mobile could not reach the public archive.</p><p class="tiny">' + escapeHtml(err && err.message ? err.message : String(err)) + '</p><button class="retry" onclick="location.reload()">Retry</button></div>';
  }
}
boot();
