const DATA_BASES = (window.CASPER_DATA && window.CASPER_DATA.pages) || [];
function joinUrl(base, path){ return String(base).replace(/\/$/, '') + '/' + String(path).replace(/^\//, ''); }
async function fetchFirst(path, asJson){
  let lastErr = null;
  for (const base of DATA_BASES){
    try {
      const res = await fetch(joinUrl(base, path), { cache: 'no-cache' });
      if (!res.ok){ lastErr = new Error(res.status + ' ' + path); continue; }
      STATE.source = base;
      return asJson ? await res.json() : await res.text();
    } catch (e){ lastErr = e; }
  }
  throw lastErr || new Error('Could not load ' + path);
}
function pct(x){ return ((x || 0) * 100).toFixed(1) + '%'; }
function currentSport(){ return PAGE.mode === 'hub' ? null : (STATE.sports[PAGE.sport] || null); }
function labelAward(code){ return (STATE.config.awardLabels && STATE.config.awardLabels[code]) || code; }
function regOf(name){ return (STATE.registry || {})[String(name || '').toLowerCase()] || null; }
function clubsOf(p){
  const r = regOf(p.name);
  if (r && r.clubs && r.clubs.length) return r.clubs.slice();
  return [...(p.teams || [])];
}
function clubLabel(p){
  const names = [];
  clubsOf(p).forEach(code => {
    STATE.sportsCfg.sports.forEach(cfg => {
      const t = STATE.sports[cfg.id] && STATE.sports[cfg.id].teams[code];
      if (t && names.indexOf(t.name) < 0) names.push(t.name);
    });
    if (!names.length) names.push(String(code).toUpperCase());
  });
  return names.join(' \u00b7 ') || '\u2014';
}
function allTourneys(){
  const out = [];
  STATE.sportsCfg.sports.forEach(cfg => {
    if (PAGE.mode !== 'hub' && cfg.id !== PAGE.sport) return;
    const sp = STATE.sports[cfg.id]; if (!sp) return;
    sp.tournaments.forEach(t => out.push({ t, sport: cfg, sp }));
  });
  return out;
}
function generateNews(){
  const items = [];
  STATE.sportsCfg.sports.forEach(cfg => {
    const sp = STATE.sports[cfg.id]; if (!sp) return;
    const ch = crownWinner(cfg);
    if (ch) items.push(teamName(sp, ch).toUpperCase() + ' HOLD THE ' + String(cfg.crown).toUpperCase());
    sp.tournaments.forEach(t => {
      if (t.aw && t.aw.ch){
        const holder = t.n[t.aw.ch] ? t.n[t.aw.ch].name : t.aw.ch;
        items.push((t.meta.e || t.meta.id).toUpperCase() + ': ' + String(holder).toUpperCase());
      }
    });
    sp.matches.slice(-2).reverse().forEach(m => {
      const hn = m.names && m.names[m.home] ? m.names[m.home].name : m.home;
      const an = m.names && m.names[m.away] ? m.names[m.away].name : m.away;
      const score = m.kind === 'cricket' ? (m.sh + '/' + m.hw + '-' + m.sa + '/' + m.aw) : (m.sh + '-' + m.sa);
      items.push((m.event || cfg.name).toUpperCase() + ': ' + hn.toUpperCase() + ' ' + score + ' ' + an.toUpperCase());
    });
  });
  return items;
}
function archiveFacts(){
  let matches = 0, tours = 0, pens = 0, et = 0, cs = 0, ht = 0, goals = 0, runs = 0, awards = 0;
  const clubs = new Set(), players = new Set();
  STATE.sportsCfg.sports.forEach(cfg => {
    const sp = STATE.sports[cfg.id]; if (!sp) return;
    tours += sp.tournaments.length; matches += sp.matches.length;
    Object.values(sp.teams).forEach(t => clubs.add(t.abbr));
    Object.values(sp.players).forEach(p => { players.add(p.name.toLowerCase()); ht += cfg.scoring === 'cricket' ? 0 : (p.hatTricks || 0); });
    sp.tournaments.forEach(t => { awards += Object.keys(t.aw || {}).length; });
    sp.matches.forEach(m => {
      if (m.p) pens++; if (m.et) et++;
      if (m.kind === 'cricket') runs += m.sh + m.sa;
      else { goals += m.sh + m.sa; if (m.sh === 0 || m.sa === 0) cs++; }
    });
  });
  return { clubs: clubs.size, players: players.size, matches, tours, pens, et, cs, ht, goals, runs, awards };
}
function collectPlayers(){
  const map = {};
  STATE.sportsCfg.sports.forEach(cfg => {
    if (PAGE.mode !== 'hub' && cfg.id !== PAGE.sport) return;
    const sp = STATE.sports[cfg.id]; if (!sp) return;
    Object.values(sp.players).forEach(p => {
      const k = p.name.toLowerCase();
      if (!map[k]) map[k] = { name: p.name, goals: 0, runs: 0, assists: 0, matches: 0, wins: 0, draws: 0, losses: 0, titles: 0, hatTricks: 0, conceded: 0, awards: [], trophies: [], teams: new Set(), clubNames: new Set(), bySport: {} };
      if (cfg.scoring === 'cricket') map[k].runs += p.goals; else { map[k].goals += p.goals; map[k].assists += p.assists; }
      map[k].matches += p.matches; map[k].wins += p.wins; map[k].draws += p.draws; map[k].losses += p.losses;
      map[k].titles += p.titles; map[k].hatTricks += cfg.scoring === 'cricket' ? 0 : p.hatTricks;
      map[k].awards = map[k].awards.concat(p.awards || []); map[k].trophies = map[k].trophies.concat(p.trophies || []);
      p.teams.forEach(t => map[k].teams.add(t)); p.clubNames.forEach(t => map[k].clubNames.add(t));
      map[k].bySport[cfg.id] = Object.assign({}, p, { runs: cfg.scoring === 'cricket' ? p.goals : 0, goals: cfg.scoring === 'cricket' ? 0 : p.goals });
    });
  });
  Object.values(map).forEach(p => {
    p.winRate = p.matches ? p.wins / p.matches : 0; p.gpg = p.matches ? p.goals / p.matches : 0;
    const r = regOf(p.name); if (r && r.clubs) r.clubs.forEach(c => p.teams.add(c));
  });
  return Object.values(map);
}
function collectTeams(){
  if (PAGE.mode !== 'hub') return Object.values((currentSport() || { teams: {} }).teams);
  const map = {};
  STATE.sportsCfg.sports.forEach(cfg => {
    const sp = STATE.sports[cfg.id]; if (!sp) return;
    Object.values(sp.teams).forEach(t => {
      if (!map[t.abbr]) map[t.abbr] = { abbr: t.abbr, name: t.name, player: t.player, matches: 0, wins: 0, draws: 0, losses: 0, titles: 0, gf: 0, ga: 0, trophies: [], rank: t.rank, bySport: {} };
      map[t.abbr].name = t.name; map[t.abbr].matches += t.matches; map[t.abbr].wins += t.wins; map[t.abbr].titles += t.titles;
      map[t.abbr].gf += t.gf; map[t.abbr].ga += t.ga; map[t.abbr].trophies = map[t.abbr].trophies.concat(t.trophies || []); map[t.abbr].bySport[cfg.id] = t;
    });
  });
  return Object.values(map);
}
function lastMatchesFor(name){
  const out = [];
  STATE.sportsCfg.sports.forEach(cfg => {
    const sp = STATE.sports[cfg.id]; if (!sp) return;
    sp.matches.forEach(m => {
      const hp = m.names && m.names[m.home] ? m.names[m.home].player : '';
      const ap = m.names && m.names[m.away] ? m.names[m.away].player : '';
      const named = [].concat(m.gh || [], m.ga || [], m.ah || [], m.aa || []).some(x => String(x.name).toLowerCase() === name);
      if (String(hp).toLowerCase() !== name && String(ap).toLowerCase() !== name && !named) return;
      const side = String(hp).toLowerCase() === name || (m.gh || []).some(x => String(x.name).toLowerCase() === name) ? 'H' : 'A';
      const res = resultOf(m);
      const letter = res === 'D' ? 'D' : ((res === 'H' && side === 'H') || (res === 'A' && side === 'A') ? 'W' : 'L');
      out.push({ cfg, m, letter, score: m.kind === 'cricket' ? (m.sh + '/' + m.hw + '-' + m.sa + '/' + m.aw) : (m.sh + '-' + m.sa) });
    });
  });
  return out.slice(-8).reverse();
}
function playerCompetitionRows(name){
  const key = String(name).toLowerCase(); const rows = [];
  STATE.sportsCfg.sports.forEach(cfg => {
    const sp = STATE.sports[cfg.id]; if (!sp) return;
    sp.tournaments.forEach(t => {
      let mp = 0, g = 0, a = 0, w = 0, d = 0, l = 0, runs = 0;
      const clubCodes = Object.keys(t.n || {}).filter(abbr => String((t.n[abbr].player || '')).toLowerCase() === key);
      t.m.forEach(m => {
        const listedH = t.n[m.home] && String(t.n[m.home].player || '').toLowerCase() === key;
        const listedA = t.n[m.away] && String(t.n[m.away].player || '').toLowerCase() === key;
        const scoredH = (m.gh || []).some(x => String(x.name).toLowerCase() === key);
        const scoredA = (m.ga || []).some(x => String(x.name).toLowerCase() === key);
        const asH = (m.ah || []).some(x => String(x.name).toLowerCase() === key);
        const asA = (m.aa || []).some(x => String(x.name).toLowerCase() === key);
        const side = listedH || scoredH || asH ? 'H' : (listedA || scoredA || asA ? 'A' : null);
        if (!side) return; mp++;
        const res = resultOf(m);
        if (res === 'D') d++; else if ((res === 'H' && side === 'H') || (res === 'A' && side === 'A')) w++; else l++;
        if (m.kind === 'cricket') runs += side === 'H' ? m.sh : m.sa;
        (side === 'H' ? (m.gh || []) : (m.ga || [])).forEach(x => { if (String(x.name).toLowerCase() === key) g += x.n; });
        (side === 'H' ? (m.ah || []) : (m.aa || [])).forEach(x => { if (String(x.name).toLowerCase() === key) a += x.n; });
        if (m.kind !== 'cricket' && !(side === 'H' ? (m.gh || []) : (m.ga || [])).length && (listedH || listedA)) g += side === 'H' ? m.sh : m.sa;
      });
      const titles = Object.keys(t.aw || {}).filter(code => {
        const val = String(t.aw[code] || '').toLowerCase();
        return val === key || clubCodes.indexOf(t.aw[code]) >= 0;
      }).length;
      if (mp || titles) rows.push({ sport: cfg, event: t.meta.e || t.meta.id, season: t.meta.s || '', mp, g, a, runs, w, d, l, titles });
    });
  });
  return rows;
}
function calcTable(t, cfg){
  const table = {};
  Object.keys(t.n).forEach(abbr => { table[abbr] = { abbr, name: t.n[abbr].name, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, runs: 0, wkts: 0, ballsF: 0, ballsB: 0, nrr: 0 }; });
  const quota = oversToBallsSafe(t.meta.ov || '1'), allOut = parseInt(t.meta.wk || '1', 10);
  t.m.forEach(m => {
    if (!table[m.home] || !table[m.away]) return;
    const a = table[m.home], b = table[m.away];
    a.p++; b.p++; a.gf += m.sh; b.gf += m.sa; a.ga += m.sa; b.ga += m.sh;
    if (m.kind === 'cricket'){
      a.runs += m.sh; b.runs += m.sa; a.wkts += m.hw; b.wkts += m.aw;
      const af = m.hw >= allOut ? quota : (m.hb != null ? m.hb : quota);
      const bf = m.aw >= allOut ? quota : (m.ab != null ? m.ab : quota);
      a.ballsF += af; b.ballsF += bf; a.ballsB += bf; b.ballsB += af;
    }
    const res = resultOf(m);
    if (res === 'H'){ a.w++; b.l++; a.pts += cfg.winPts; }
    else if (res === 'A'){ b.w++; a.l++; b.pts += cfg.winPts; }
    else { a.d++; b.d++; a.pts++; b.pts++; }
  });
  Object.values(table).forEach(r => { r.gd = r.gf - r.ga; r.nrr = (r.ballsF ? r.runs / (r.ballsF / 6) : 0) - (r.ballsB ? r.ga / (r.ballsB / 6) : 0); });
  return Object.values(table).sort((x, y) => y.pts - x.pts || y.nrr - x.nrr || y.gd - x.gd || y.gf - x.gf);
}
function scoreOf(m){ return m.kind === 'cricket' ? (m.sh + '/' + m.hw + ' \u2013 ' + m.sa + '/' + m.aw) : (m.sh + ' \u2013 ' + m.sa); }
function cabinetHtml(items){
  if (!items || !items.length) return '<p class="muted">No honours yet.</p>';
  return '<div class="cabinet">' + items.map(t => '<div class="trophy' + (t.code === 'ch' ? ' gold' : '') + '"><b>' + escapeHtml(t.label) + '</b><br><span class="muted">' + escapeHtml((t.event || '') + ' ' + (t.season || '')) + '</span></div>').join('') + '</div>';
}
function barRow(label, n){
  n = Math.max(0, Math.min(99, Math.round(n)));
  return '<div class="bar"><span>' + label + '</span><span><i style="width:' + n + '%"></i></span><b>' + n + '</b></div>';
}
