function renderHome(){
  const f = archiveFacts();
  const sports = PAGE.mode === 'hub' ? STATE.sportsCfg.sports : STATE.sportsCfg.sports.filter(s => s.id === PAGE.sport);
  const people = collectPlayers();
  const scorers = people.slice().sort((a, b) => b.goals - a.goals).slice(0, 6);
  const news = generateNews().slice(0, 6);
  const open = allTourneys().filter(x => /progress|upcoming|remain/i.test(String(x.t.meta.sts || '')));
  const cards = sports.map(cfg => {
    const sp = STATE.sports[cfg.id]; if (!sp) return '';
    const ch = crownWinner(cfg);
    const last = sp.tournaments.filter(t => (t.meta.e || '').toLowerCase() !== 'seasonal awards').slice(-1)[0];
    return '<a class="card" href="#sport/' + cfg.id + '"><h3>' + escapeHtml(cfg.name) + '</h3>' +
      (ch ? '<p><b>' + escapeHtml(teamName(sp, ch)) + '</b><br><span class="muted">' + escapeHtml(cfg.crown) + ' holders</span></p>' : '') +
      '<p class="tiny muted">' + sp.tournaments.length + ' comps \u00b7 ' + sp.matches.length + ' matches' +
      (last ? ' \u00b7 last: ' + escapeHtml(last.meta.e || '') : '') + '</p></a>';
  }).join('');
  return '<section class="hero"><div class="eyebrow">MOBILE ARCHIVE</div><h2>CASPER</h2><p>One association. Three sports. Same records as the desktop site.</p></section>' +
    '<div class="stats">' + [['Clubs', f.clubs], ['Players', f.players], ['Comps', f.tours], ['Matches', f.matches], ['Goals', f.goals], ['Runs', f.runs]].map(x => '<div class="stat"><b>' + x[1] + '</b><span>' + x[0] + '</span></div>').join('') + '</div>' +
    cards +
    (open.length ? '<div class="card"><h3>Open competitions</h3>' + open.map(x => '<a class="list-row" href="#competition/' + encodeURIComponent(x.t.meta.id) + '"><b>' + escapeHtml(x.t.meta.e || x.t.meta.id) + '</b><div class="meta"><span>' + escapeHtml(x.sport.name) + '</span><span>' + escapeHtml(x.t.meta.sts || '') + '</span></div></a>').join('') + '</div>' : '') +
    '<div class="card"><h3>Top goals</h3>' + (scorers.map((p, i) => '<a class="list-row" href="#player/' + encodeURIComponent(p.name) + '"><div class="meta"><span>' + (i + 1) + '. ' + escapeHtml(p.name) + '</span><b>' + p.goals + '</b></div></a>').join('') || '<p class="muted">No players.</p>') + '</div>' +
    '<div class="card"><h3>Latest</h3>' + news.map(n => '<div class="list-row">' + escapeHtml(n) + '</div>').join('') + '</div>';
}
function renderNews(){ return '<div class="card"><h3>News desk</h3>' + generateNews().map(n => '<div class="list-row">' + escapeHtml(n) + '</div>').join('') + '</div>'; }
function renderArchive(){
  return '<div class="card"><h3>Competitions</h3>' + allTourneys().filter(x => x.t.meta.e !== 'Seasonal Awards').map(({ t, sport }) => {
    const ch = t.aw.ch ? (t.n[t.aw.ch] ? t.n[t.aw.ch].name : t.aw.ch) : '\u2014';
    return '<a class="list-row" href="#competition/' + encodeURIComponent(t.meta.id) + '"><b>' + escapeHtml(t.meta.e || t.meta.id) + '</b><div class="meta"><span class="chip ' + sport.id + '">' + escapeHtml(sport.name) + '</span><span>' + t.m.length + ' matches</span></div><div class="meta"><span>' + escapeHtml(ch) + '</span><span>' + escapeHtml(t.meta.sts || '') + '</span></div></a>';
  }).join('') + '</div>';
}
function renderCompetition(id){
  let found = null, sport = null;
  STATE.sportsCfg.sports.forEach(cfg => {
    const t = (STATE.sports[cfg.id] || { tournaments: [] }).tournaments.find(x => x.meta.id === id);
    if (t){ found = t; sport = STATE.sports[cfg.id]; }
  });
  if (!found) return '<div class="card"><p>Competition not found.</p></div>';
  const cfg = sport.cfg, stand = calcTable(found, cfg);
  const standRows = stand.map((r, i) => '<tr' + (i === 0 ? ' class="rank-gold"' : '') + '><td>' + (i + 1) + '</td><td><a href="#team/' + encodeURIComponent(r.abbr) + '">' + escapeHtml(r.name) + '</a></td><td>' + r.p + '</td><td>' + r.w + '</td><td>' + r.d + '</td><td>' + r.l + '</td><td>' + r.pts + '</td></tr>').join('');
  const matches = found.m.map(m => {
    const hn = found.n[m.home] ? found.n[m.home].name : m.home;
    const an = found.n[m.away] ? found.n[m.away].name : m.away;
    const pens = m.p ? ' (p ' + m.p[0] + '-' + m.p[1] + ')' : '';
    return '<div class="match-card"><div class="meta"><span>' + escapeHtml(m.stageLabel || m.stage || '') + '</span><span class="chip">' + escapeHtml(cfg.name) + '</span></div><b>' + escapeHtml(hn) + ' vs ' + escapeHtml(an) + '</b><div class="score">' + scoreOf(m) + pens + '</div></div>';
  }).join('');
  const awards = Object.keys(found.aw || {}).map(code => '<div class="list-row"><div class="meta"><span>' + escapeHtml(labelAward(code)) + '</span><b>' + escapeHtml(found.n[found.aw[code]] ? found.n[found.aw[code]].name : found.aw[code]) + '</b></div></div>').join('');
  return '<div class="card"><h2>' + escapeHtml(found.meta.e || found.meta.id) + '</h2><p class="muted">' + escapeHtml(cfg.name) + ' \u00b7 ' + escapeHtml(found.meta.s || '') + '<br>' + escapeHtml(found.meta.sts || '') + '</p></div>' +
    '<div class="card"><h3>Table</h3><div class="table-wrap"><table><thead><tr><th>#</th><th>Club</th><th>P</th><th>W</th><th>D</th><th>L</th><th>Pts</th></tr></thead><tbody>' + standRows + '</tbody></table></div></div>' +
    '<div class="card"><h3>Awards</h3>' + (awards || '<p class="muted">No awards.</p>') + '</div>' +
    '<div class="card"><h3>Matches</h3>' + matches + '</div>';
}
function renderPlayers(){
  return '<div class="card"><h3>Players</h3>' + collectPlayers().sort((a, b) => b.goals - a.goals || b.runs - a.runs || a.name.localeCompare(b.name)).map(p =>
    '<a class="list-row" href="#player/' + encodeURIComponent(p.name) + '"><b>' + escapeHtml(p.name) + '</b><div class="meta"><span>' + escapeHtml(clubLabel(p)) + '</span><span>' + p.goals + ' G \u00b7 ' + p.runs + ' R</span></div></a>'
  ).join('') + '</div>';
}
function renderPlayer(name){
  const key = decodeURIComponent(name).toLowerCase();
  const p = collectPlayers().find(x => x.name.toLowerCase() === key);
  if (!p) return '<div class="card"><p>Player not found.</p></div>';
  const info = regOf(p.name) || {};
  const ctx = STATE.config.playerContext && STATE.config.playerContext[p.name.toLowerCase()];
  const last = lastMatchesFor(key);
  const comps = playerCompetitionRows(p.name);
  return '<div class="card"><div class="profile-head"><div class="mark">' + escapeHtml(p.name.slice(0, 2).toUpperCase()) + '</div><div><h2>' + escapeHtml(p.name) + '</h2><p class="muted">' + escapeHtml(clubLabel(p)) + (info.id ? ' \u00b7 ' + escapeHtml(info.id) : '') + '</p></div></div>' +
    '<div class="kv"><div><span>Matches</span><b>' + p.matches + '</b></div><div><span>Goals</span><b>' + p.goals + '</b></div><div><span>Assists</span><b>' + (p.assists || 0) + '</b></div><div><span>Runs</span><b>' + p.runs + '</b></div><div><span>Titles</span><b>' + p.titles + '</b></div><div><span>Win %</span><b>' + pct(p.winRate) + '</b></div></div>' +
    (info.position ? '<p class="tiny">Position: ' + escapeHtml(info.position) + '</p>' : '') +
    (ctx ? '<p class="muted tiny">' + escapeHtml(ctx) + '</p>' : '') + '</div>' +
    '<div class="card"><h3>Competitions</h3>' + (comps.map(r => '<div class="list-row"><b>' + escapeHtml(r.event) + '</b><div class="meta"><span class="chip ' + r.sport.id + '">' + escapeHtml(r.sport.name) + '</span><span>' + r.mp + ' MP \u00b7 ' + r.g + ' G \u00b7 ' + r.titles + ' titles</span></div></div>').join('') || '<p class="muted">No rows.</p>') + '</div>' +
    '<div class="card"><h3>Last matches</h3>' + (last.map(x => '<div class="list-row"><div class="meta"><span>' + escapeHtml(x.cfg.name) + ' \u00b7 ' + escapeHtml(x.m.event || '') + '</span><b>' + x.letter + '</b></div><div class="score">' + x.score + '</div></div>').join('') || '<p class="muted">No matches.</p>') + '</div>' +
    '<div class="card"><h3>Honours</h3>' + cabinetHtml(p.trophies && p.trophies.length ? p.trophies : p.awards) + '</div>' +
    '<div class="card"><h3>Play style</h3>' + barRow('Finishing', Math.min(99, (p.gpg || 0) * 28 + (p.hatTricks || 0) * 3)) + barRow('Passing', 40 + (p.assists || 0) * 4) + barRow('Defending', Math.min(99, p.matches ? (p.wins / p.matches) * 70 : 20)) + '</div>';
}
function renderTeams(){
  return '<div class="card"><h3>Clubs</h3>' + collectTeams().sort((a, b) => (b.titles || 0) - (a.titles || 0) || (a.rank || 99) - (b.rank || 99)).map(t =>
    '<a class="list-row" href="#team/' + encodeURIComponent(t.abbr) + '"><b>' + escapeHtml(t.name) + '</b><div class="meta"><span>' + escapeHtml(t.player || t.abbr.toUpperCase()) + '</span><span>' + t.titles + ' titles \u00b7 ' + t.matches + ' P</span></div></a>'
  ).join('') + '</div>';
}
function renderTeam(abbr){
  abbr = decodeURIComponent(abbr);
  const t = collectTeams().find(x => x.abbr === abbr);
  if (!t) return '<div class="card"><p>Club not found.</p></div>';
  const owners = Object.keys(STATE.registry || {}).filter(k => (STATE.registry[k].clubs || []).indexOf(abbr) >= 0).map(k => STATE.registry[k].name || k);
  const blocks = STATE.sportsCfg.sports.map(cfg => {
    const row = t.bySport && t.bySport[cfg.id]; if (!row) return '';
    return '<div class="card"><h3>' + escapeHtml(cfg.name) + '</h3><div class="kv"><div><span>Rank</span><b>' + row.rank + '</b></div><div><span>P</span><b>' + row.matches + '</b></div><div><span>W-D-L</span><b>' + row.wins + '-' + row.draws + '-' + row.losses + '</b></div><div><span>Titles</span><b>' + row.titles + '</b></div></div></div>';
  }).join('');
  return '<div class="card"><div class="profile-head"><div class="mark">' + escapeHtml(t.abbr.toUpperCase()) + '</div><div><h2>' + escapeHtml(t.name) + '</h2><p class="muted">' + (owners.length ? owners.map(n => '<a href="#player/' + encodeURIComponent(n) + '">' + escapeHtml(n) + '</a>').join(', ') : escapeHtml(t.player || '\u2014')) + '</p></div></div></div>' + blocks +
    '<div class="card"><h3>Trophy cabinet</h3>' + cabinetHtml(t.trophies) + '</div>';
}
function renderAwards(){
  const rows = [];
  allTourneys().forEach(({ t, sport }) => {
    Object.keys(t.aw || {}).forEach(code => {
      rows.push({ sport: sport.name, sid: sport.id, event: t.meta.e || '', id: t.meta.id, award: labelAward(code), holder: t.n[t.aw[code]] ? t.n[t.aw[code]].name : t.aw[code] });
    });
  });
  return '<div class="card"><h3>Awards</h3>' + rows.map(r => '<a class="list-row" href="#competition/' + encodeURIComponent(r.id) + '"><b>' + escapeHtml(r.award) + '</b><div class="meta"><span class="chip ' + r.sid + '">' + escapeHtml(r.sport) + '</span><span>' + escapeHtml(r.holder) + '</span></div><div class="muted tiny">' + escapeHtml(r.event) + '</div></a>').join('') + '</div>';
}
function renderRanking(){
  return '<div class="card"><h3>Global club ranking</h3>' + globalRanks().map((r, i) => '<a class="list-row" href="#team/' + encodeURIComponent(r.abbr) + '"><div class="meta"><span>' + (i + 1) + '. ' + escapeHtml(r.name) + '</span><b>' + r.avgRank.toFixed(2) + '</b></div><div class="tiny muted">score ' + Math.round(r.totalScore) + '</div></a>').join('') + '</div>';
}
function renderRecords(){
  const out = (STATE.misc.records || []).map(r => '<div class="list-row"><b>' + escapeHtml(r.label) + '</b><div class="meta"><span>' + escapeHtml(r.holder) + '</span><b>' + escapeHtml(r.value) + '</b></div><div class="tiny muted">' + escapeHtml(r.context || '') + '</div></div>');
  STATE.sportsCfg.sports.forEach(cfg => {
    const sp = STATE.sports[cfg.id]; if (!sp) return;
    const top = Object.values(sp.players).sort((a, b) => b.goals - a.goals)[0];
    if (top) out.push('<div class="list-row"><b>Most ' + unitOf(cfg).toLowerCase() + ' \u00b7 ' + escapeHtml(cfg.name) + '</b><div class="meta"><span>' + escapeHtml(top.name) + '</span><b>' + top.goals + '</b></div></div>');
  });
  return '<div class="card"><h3>Records</h3>' + out.join('') + '</div>';
}
function renderStatistics(){
  const f = archiveFacts();
  return '<div class="card"><h3>Archive totals</h3><div class="stats">' +
    [['Clubs', f.clubs], ['Players', f.players], ['Comps', f.tours], ['Matches', f.matches], ['Goals', f.goals], ['Awards', f.awards]].map(x => '<div class="stat"><b>' + x[1] + '</b><span>' + x[0] + '</span></div>').join('') +
    '</div></div><div class="card"><h3>By sport</h3>' +
    STATE.sportsCfg.sports.map(cfg => {
      const sp = STATE.sports[cfg.id]; if (!sp) return '';
      return '<div class="list-row"><b>' + escapeHtml(cfg.name) + '</b><div class="meta"><span>' + sp.tournaments.length + ' comps</span><span>' + sp.matches.length + ' matches</span></div></div>';
    }).join('') + '</div>';
}
function renderAbout(){
  return '<div class="card"><h3>About</h3><p>' + escapeHtml(STATE.config.about || 'CASPER archive.') + '</p><p class="muted tiny">Mobile site reads live files from the desktop CASPER repo. Update scores and notes there only.</p><p class="tiny"><a href="https://anish-c2.github.io/CASPER/">Desktop site</a> \u00b7 source ' + escapeHtml(STATE.source || '\u2014') + '</p></div>';
}
