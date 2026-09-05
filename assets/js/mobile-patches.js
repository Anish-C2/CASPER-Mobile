/* CASPER Mobile UI/data patches: keeps mobile aligned with the desktop archive. */
function sportGoalTotals(){
  const out = {};
  STATE.sportsCfg.sports.forEach(cfg => {
    const sp = STATE.sports[cfg.id];
    if (!sp) return;
    let total = 0;
    if (cfg.scoring === 'cricket') {
      sp.matches.forEach(m => { total += 0; });
    } else {
      sp.matches.forEach(m => { total += Number(m.sh || 0) + Number(m.sa || 0); });
    }
    out[cfg.id] = total;
  });
  return out;
}

function renderHome(){
  const f = archiveFacts();
  const sports = PAGE.mode === 'hub' ? STATE.sportsCfg.sports : STATE.sportsCfg.sports.filter(s => s.id === PAGE.sport);
  const people = collectPlayers();
  const goals = sportGoalTotals();
  const footballers = people.map(p => ({p, n: p.bySport && p.bySport.football ? p.bySport.football.goals : 0})).filter(x => x.n > 0).sort((a,b) => b.n-a.n).slice(0,5);
  const futsalers = people.map(p => ({p, n: p.bySport && p.bySport.futsal ? p.bySport.futsal.goals : 0})).filter(x => x.n > 0).sort((a,b) => b.n-a.n).slice(0,5);
  const open = allTourneys().filter(x => /progress|upcoming|remain/i.test(String(x.t.meta.sts || '')));
  const cards = sports.map(cfg => {
    const sp = STATE.sports[cfg.id]; if (!sp) return '';
    const ch = crownWinner(cfg);
    const last = sp.tournaments.filter(t => (t.meta.e || '').toLowerCase() !== 'seasonal awards').slice(-1)[0];
    const unit = cfg.scoring === 'cricket' ? 'runs' : 'goals';
    const total = cfg.scoring === 'cricket' ? f.runs : goals[cfg.id] || 0;
    return '<a class="sport-card" href="#sport/' + cfg.id + '"><div class="sport-card-top"><span class="sport-badge ' + cfg.id + '">' + escapeHtml(cfg.name) + '</span><span class="sport-arrow">›</span></div>' +
      (ch ? '<h3>' + escapeHtml(teamName(sp, ch)) + '</h3><p class="muted tiny">Current ' + escapeHtml(cfg.crown) + ' holder</p>' : '<h3>Archive</h3>') +
      '<div class="sport-mini"><span>' + sp.tournaments.length + ' comps</span><span>' + sp.matches.length + ' matches</span><span>' + total + ' ' + unit + '</span></div>' +
      (last ? '<p class="tiny muted">Latest: ' + escapeHtml(last.meta.e || '') + '</p>' : '') + '</a>';
  }).join('');
  const scorerBlock = (title, rows, unit) => '<div class="card"><h3>' + title + '</h3>' + (rows.length ? rows.map((x,i) => '<a class="list-row" href="#player/' + encodeURIComponent(x.p.name) + '"><div class="meta"><span>' + (i+1) + '. ' + escapeHtml(x.p.name) + '</span><b>' + x.n + ' ' + unit + '</b></div></a>').join('') : '<div class="empty">No scoring data.</div>') + '</div>';
  return '<section class="hero"><div class="eyebrow">COMPETITION ARCHIVE & HISTORICAL RECORD SYSTEM</div><h2>CASPER</h2><p>Futsal · Football · Cricket — one archive, one record system.</p><div class="hero-meta"><span>' + f.tours + ' competitions</span><span>' + f.matches + ' matches</span><span>' + f.players + ' players</span></div></section>' +
    '<div class="stats stats-main">' + [['Clubs', f.clubs], ['Players', f.players], ['Competitions', f.tours], ['Matches', f.matches], ['Awards', f.awards], ['Sectors', (STATE.apiSectors || []).length]].map(x => '<div class="stat"><b>' + x[1] + '</b><span>' + x[0] + '</span></div>').join('') + '</div>' +
    '<section class="section-heading"><h3>Sports</h3><span>Explore archive</span></section>' + cards +
    '<div class="goal-grid">' + scorerBlock('Futsal top scorers', futsalers, 'G') + scorerBlock('Football top scorers', footballers, 'G') + '</div>' +
    (open.length ? '<div class="card"><h3>Open competitions</h3>' + open.map(x => '<a class="list-row" href="#competition/' + encodeURIComponent(x.t.meta.id) + '"><b>' + escapeHtml(x.t.meta.e || x.t.meta.id) + '</b><div class="meta"><span class="chip ' + x.sport.id + '">' + escapeHtml(x.sport.name) + '</span><span>' + escapeHtml(x.t.meta.sts || '') + '</span></div></a>').join('') + '</div>' : '') +
    '<div class="card"><h3>Latest archive activity</h3>' + generateNews().slice(0,6).map(n => '<div class="list-row">' + escapeHtml(n) + '</div>').join('') + '</div>';
}

function renderPlayers(){
  const rows = collectPlayers().sort((a,b) => ((b.goals||0)+(b.runs||0)) - ((a.goals||0)+(a.runs||0)) || a.name.localeCompare(b.name));
  return '<div class="page-head"><div><div class="eyebrow dark">PLAYER DATABASE</div><h2>Players</h2><p class="muted">Player records from the CASPER archive.</p></div></div>' +
    '<div class="card player-table-card"><div class="player-row player-row-head"><span>Player</span><span>Futsal G</span><span>Football G</span><span>Cricket R</span></div>' +
    rows.map(p => { const fg=p.bySport?.futsal?.goals||0, bg=p.bySport?.football?.goals||0, cr=p.bySport?.cricket?.runs||0; return '<a class="player-row" href="#player/' + encodeURIComponent(p.name) + '"><strong>' + escapeHtml(p.name) + '</strong><span>' + fg + '</span><span>' + bg + '</span><span>' + cr + '</span></a>'; }).join('') +
    '</div>';
}

function renderPlayer(name){
  const key = decodeURIComponent(name).toLowerCase();
  const p = collectPlayers().find(x => x.name.toLowerCase() === key);
  if (!p) return '<div class="card"><div class="empty">Player not found.</div></div>';
  const info = regOf(p.name) || {};
  const fs = p.bySport?.futsal || {goals:0,matches:0,titles:0};
  const bs = p.bySport?.football || {goals:0,matches:0,titles:0};
  const cs = p.bySport?.cricket || {runs:0,matches:0,titles:0};
  const last = lastMatchesFor(key);
  const comps = playerCompetitionRows(p.name);
  return '<div class="card profile-card"><div class="profile-head"><div class="mark">' + escapeHtml(p.name.slice(0,2).toUpperCase()) + '</div><div><div class="eyebrow dark">PLAYER PROFILE</div><h2>' + escapeHtml(p.name) + '</h2><p class="muted">' + escapeHtml(clubLabel(p)) + (info.id ? ' · ' + escapeHtml(info.id) : '') + '</p></div></div>' +
    '<div class="sport-stat-grid"><div><span>Futsal</span><b>' + fs.goals + ' G</b><small>' + fs.matches + ' matches</small></div><div><span>Football</span><b>' + bs.goals + ' G</b><small>' + bs.matches + ' matches</small></div><div><span>Cricket</span><b>' + cs.runs + ' R</b><small>' + cs.matches + ' matches</small></div></div>' +
    '<div class="kv"><div><span>Total matches</span><b>' + p.matches + '</b></div><div><span>Assists</span><b>' + (p.assists||0) + '</b></div><div><span>Titles</span><b>' + p.titles + '</b></div><div><span>Win %</span><b>' + pct(p.winRate) + '</b></div></div>' +
    (info.position ? '<p class="tiny">Position: ' + escapeHtml(info.position) + '</p>' : '') + '</div>' +
    '<div class="card"><h3>Competitions</h3>' + (comps.map(r => '<div class="list-row"><b>' + escapeHtml(r.event) + '</b><div class="meta"><span class="chip ' + r.sport.id + '">' + escapeHtml(r.sport.name) + '</span><span>' + r.mp + ' MP · ' + r.g + ' G · ' + r.runs + ' R</span></div></div>').join('') || '<div class="empty">No competition rows.</div>') + '</div>' +
    '<div class="card"><h3>Recent matches</h3>' + (last.map(x => '<div class="list-row"><div class="meta"><span>' + escapeHtml(x.cfg.name) + ' · ' + escapeHtml(x.m.event||'') + '</span><b>' + x.letter + '</b></div><div class="score">' + x.score + '</div></div>').join('') || '<div class="empty">No matches.</div>') + '</div>' +
    '<div class="card"><h3>Honours</h3>' + cabinetHtml(p.trophies && p.trophies.length ? p.trophies : p.awards) + '</div>';
}
