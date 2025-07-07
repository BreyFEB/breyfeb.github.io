// Add at the top with other globals
let teamPlayers = [];
let teamCompetition = null;
let allTeamsStats = [];
let allTeamsMatches = [];

// Helper: Format competition name as in rankings page
function formatCompetitionName(comp) {
  const nameMappings = {
    "LF CHALLENGE": "Liga Femenina Challenge",
    "C ESP CLUBES JR MASC": "Clubes Junior Masculino",
    "PRIMERA FEB": "Primera FEB",
    "Fase Final 1ª División Femenin": "Fase de ascenso a LF2",
    "C ESP CLUBES CAD MASC": "Clubes Cadete Masculino",
    "LF ENDESA": "Liga Femenina Endesa",
    "L.F.-2": "Liga Femenina 2",
    "C ESP CLUBES CAD FEM": "Clubes Cadete Femenino",
    "SEGUNDA FEB": "Segunda FEB",
    "TERCERA FEB": "Tercera FEB",
    "C ESP CLUBES INF FEM": "Clubes Infantil Femenino",
    "C ESP CLUBES INF MASC": "Clubes Infantil Masculino",
    "C ESP CLUBES MINI MASC": "Clubes Mini Masculino",
    "C ESP CLUBES MINI FEM": "Clubes Mini Femenino"
  };
  if (nameMappings[comp.trim()]) return nameMappings[comp.trim()];
  let formatted = comp.replace(/_/g, ' ').replace(/\s+/g, ' ')
    .split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  return formatted;
}

// Helper function to create team acronym
function createTeamAcronym(teamName) {
  const words = teamName.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/);
  let acronym = '';
  // Take first three valid characters of first word with 3 or more characters
  for (const w of words) {
    if (w.length >= 3) {
      acronym = w.substring(0, 3).toUpperCase();
      break;
    }
  }

  return acronym;
}

// Get URL params for team_id
function getTeamParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    teamId: params.get('team_id')
  };
}

// ---------- CONFIG & HELPERS ----------
const statOptions = [
  { value: 'pts', label: 'Puntos' },
  { value: 'rt', label: 'Rebotes totales' },
  { value: 'ro', label: 'Rebotes ofensivos' },
  { value: 'rd', label: 'Rebotes defensivos' },
  { value: 'as', label: 'Asistencias' },
  { value: 'br', label: 'Robos' },
  { value: 'bp', label: 'Pérdidas' },
  { value: 'va', label: 'Valoración' },
  { value: 't2c', label: 'T2 Convertidos' },
  { value: 't2i', label: 'T2 Intentados' },
  { value: 't2pct', label: '% T2' },
  { value: 't3c', label: 'T3 Convertidos' },
  { value: 't3i', label: 'T3 Intentados' },
  { value: 't3pct', label: '% T3' },
  { value: 'tlc', label: 'TL Convertidos' },
  { value: 'tli', label: 'TL Intentados' },
  { value: 'tlpct', label: '% TL' },
  { value: 'tp', label: 'Tapones' },
  { value: 'fc', label: 'Faltas cometidas' },
  { value: 'min', label: 'Minutos' },
  { value: 'pm', label: '+/-' }
];

function parseMinutes(minutesStr) {
  if (!minutesStr) return 0;
  const [mins, secs] = minutesStr.split(':').map(Number);
  return mins + secs / 60;
}
function formatMinutes(totalMinutes) {
  const mins = Math.floor(totalMinutes);
  const secs = Math.round((totalMinutes - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Helper function to convert a string to title case, except words with a period (e.g., B.C.), and remove backticks, quotes, and accents. Single-letter words remain uppercase.
function toTitleCase(str) {
  return str.split(' ').map(word => {
    // Remove various quote/accent marks: ` " ' ´
    let cleanWord = word.replace(/[`"'´]/g, '');
    if (cleanWord.includes('.')) {
      return cleanWord; // Leave as is if it contains a period
    }
    // If single letter, keep uppercase
    if (cleanWord.length === 1 || cleanWord.length === 2) {
      return cleanWord.toUpperCase();
    }
    return cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1).toLowerCase();
  }).join(' ');
}

let teamMatches = []; // aggregated matches

// Global ranking object to store current team rankings
let currentTeamRankings = {
  total: {},
  pergame: {},
  teamId: null,
  totalTeams: 0
};

// ---------- MAIN LOAD ----------
async function loadTeamInfo() {
  const { teamId } = getTeamParams();
  if (!teamId) return;
  
  const response = await fetch('rankings_stats.json');
  const data = await response.json();
  
  // Set up the search bar with all players data
  setupTeamSearchBar(data.players);
  
  // Store all players data globally for access in records
  window.allPlayersData = data.players;
  
  // Find all players for this team by searching all teamId fields
  const playersOnThisTeam = data.players.filter(p => {
    if (p.teamId === teamId) return true;
    for (let i = 1; i < 10; i++) { // Check for teamId_1, teamId_2, ... (starts at 1)
      if (p[`teamId_${i}`] === teamId) return true;
    }
    return false;
  });

  if (!playersOnThisTeam.length) {
    console.error("No players found for team ID:", teamId);
    return;
  }

  // Determine the primary competition for this team page by finding the first match played
  // for this team and getting its competition.
  let primaryCompetition = null;
  for (const player of playersOnThisTeam) {
    const matchForThisTeam = player.matches.find(m => m.playerTeamId === teamId);
    if (matchForThisTeam) {
      primaryCompetition = matchForThisTeam.competition;
      break; // Found it, no need to look further
    }
  }

  if (!primaryCompetition && playersOnThisTeam.length > 0) {
    // Fallback if, for some reason, no specific matches were found for this teamId.
    console.warn(`Could not determine competition from team matches. Falling back to the first player's default competition.`);
    primaryCompetition = playersOnThisTeam[0].competition;
  } else if (!primaryCompetition) {
     console.error("Could not determine competition: No players found.");
     return; // Can't proceed
  }
  
  // Set the global variables that will be used by other functions
  teamCompetition = primaryCompetition;
  teamPlayers = playersOnThisTeam;
  
  // Build allTeamsStats and allTeamsMatches for the current competition
  allTeamsStats = [];
  allTeamsMatches = [];
  const teamsInCompetition = new Map();

  // 1. Group and aggregate match stats for every team in the competition
  data.players.forEach(player => {
    player.matches.forEach(match => {
      if (match.competition === teamCompetition) {
        const tid = match.playerTeamId;
        const gid = match.game_id;

        if (!teamsInCompetition.has(tid)) {
          teamsInCompetition.set(tid, new Map());
        }
        const teamMatchMap = teamsInCompetition.get(tid);

        if (!teamMatchMap.has(gid)) {
          // Initialize a new aggregated match object
          teamMatchMap.set(gid, {
            game_id: gid,
            marcador: match.marcador, // This should be consistent across players
            rival: match.rival,
            matchDate: match.matchDate,
            pts: 0, rt: 0, as: 0, ro: 0, rd: 0, br: 0, bp: 0, va: 0,
            t2c: 0, t2i: 0, t3c: 0, t3i: 0, tlc: 0, tli: 0, tp: 0, fc: 0, minutes: 0, pm: 0
          });
        }

        // Sum the player's stats into the aggregated match
        const aggMatch = teamMatchMap.get(gid);
        aggMatch.pts += match.pts;
        aggMatch.rt += match.rt;
        aggMatch.as += match.as;
        aggMatch.ro += match.ro;
        aggMatch.rd += match.rd;
        aggMatch.br += match.br;
        aggMatch.bp += match.bp;
        aggMatch.va += match.va;
        aggMatch.t2c += match.t2c;
        aggMatch.t2i += match.t2i;
        aggMatch.t3c += match.t3c;
        aggMatch.t3i += match.t3i;
        aggMatch.tlc += match.tlc;
        aggMatch.tli += match.tli;
        aggMatch.tp += match.tp;
        aggMatch.fc += match.fc;
        aggMatch.minutes += parseMinutes(match.minutes) || 0;
        aggMatch.pm += match.pm;
      }
    });
  });

  // 2. Calculate final per-game stats for each team
  teamsInCompetition.forEach((teamMatchMap, tid) => {
    const uniqueMatches = Array.from(teamMatchMap.values());
    const playerForTeam = data.players.find(p => p.teamId === tid || p.teamId_2 === tid || p.teamId_3 === tid);
    const teamName = playerForTeam ? playerForTeam.teamName : "Unknown Team";

    if (uniqueMatches.length > 0) {
      const stats = calculateTeamStatsFromMatches(uniqueMatches);
      allTeamsStats.push({
        teamId: tid,
        teamName: teamName,
        stats: stats,
        games: uniqueMatches.length
      });
      allTeamsMatches.push(...uniqueMatches);
    }
  });

  // Use first player for team info (now that teamPlayers is correctly filtered)
  const teamPlayer = teamPlayers[0];
  
  // Update team logo (using a player who actually played for this team)
  const playerForLogo = teamPlayers.find(p => p.teamId === teamId) || teamPlayers[0];
  const teamLogoImg = document.querySelector('.player-photo');
  if (teamLogoImg) {
    teamLogoImg.src = playerForLogo.teamLogo || 'https://via.placeholder.com/150';
    teamLogoImg.alt = `${playerForLogo.teamName} logo`;
  }
  
  // Update team info
  document.getElementById('teamName').textContent = playerForLogo.teamName;
  document.getElementById('teamMainInfo').innerHTML =
    `Competición: ${formatCompetitionName(teamCompetition)}<br>Género: ${playerForLogo.gender === 'H' ? 'Masculino' : 'Femenino'}`;

  // Build aggregated matches for line chart, now using the correctly determined competition
  teamMatches = aggregateTeamMatches(teamPlayers, teamCompetition, teamId);
  
  // Calculate team stats from filtered matches
  const teamStats = calculateTeamStatsFromMatches(teamMatches);
  
  // Update summary cards
  document.getElementById('teamPts').textContent = teamStats.ptsPerGame.toFixed(1);
  document.getElementById('teamReb').textContent = teamStats.rebPerGame.toFixed(1);
  document.getElementById('teamAst').textContent = teamStats.astPerGame.toFixed(1);
  document.getElementById('teamVal').textContent = teamStats.pmPerGame.toFixed(1);

  // Insert chart controls/UI if not present and render initial chart
  insertLineChartUI();
  drawTeamStatChart('pts');

  // Render team stats table in Stats tab
  renderTeamStatsTable();

  // Render team records in Records tab
  renderTeamRecords();

  // Render team players in Plantilla tab
  renderTeamPlayers();

  // Event listener for selector
  const statSelector = document.getElementById('teamStatSelector');
  if (statSelector && !statSelector.dataset.listener) {
    statSelector.addEventListener('change', () => drawTeamStatChart(statSelector.value));
    statSelector.dataset.listener = 'true';
  }

  // Calculate and update team rankings
  updateTeamRankings(data.players, teamCompetition, teamId, teamStats);

  // Calculate all team rankings globally
  calculateAllTeamRankings(teamId);

  // Insert shooting bar chart
  insertShootingBarChart(data.players, teamPlayers, teamCompetition);

  // Add separator
  const separator = document.createElement('hr');
  separator.style.border = 'none';
  separator.style.borderTop = '1px solid #e0e0e0';
  separator.style.margin = '32px 0 32px 0';
  profileSection.appendChild(separator);

  // Insert horizontal bar chart for team points comparison using HTML/CSS
  insertTeamPointsBarHtml();

  // Load shot data after team info is loaded
  await loadTeamShotData();

  // Initialize lineups functionality
  initializeLineupsAfterTeamLoad();
}



function calculateTeamStatsFromMatches(matches){
  const totals = matches.reduce((acc,m)=>{
    acc.pts+=m.pts;
    acc.rt+=m.rt;
    acc.ro+=m.ro;
    acc.rd+=m.rd;
    acc.as+=m.as;
    acc.br+=m.br;
    acc.bp+=m.bp;
    acc.va+=m.va;
    acc.t2c+=m.t2c;
    acc.t2i+=m.t2i;
    acc.t3c+=m.t3c;
    acc.t3i+=m.t3i;
    acc.tlc+=m.tlc;
    acc.tli+=m.tli;
    acc.tp+=m.tp;
    acc.fc+=m.fc;
    acc.minutes+=m.minutes || 0;
    // Calculate point differential for each game
    const [teamPts, rivalPts] = m.marcador.split('-').map(Number);
    acc.pm += (teamPts - rivalPts);
    return acc;
  },{pts:0,rt:0,ro:0,rd:0,as:0,br:0,bp:0,va:0,t2c:0,t2i:0,t3c:0,t3i:0,tlc:0,tli:0,tp:0,fc:0,minutes:0,pm:0});
  const games = matches.length||1;
  return {
    ptsPerGame: totals.pts/games,
    rtPerGame: totals.rt/games,
    roPerGame: totals.ro/games,
    rdPerGame: totals.rd/games,
    asPerGame: totals.as/games,
    brPerGame: totals.br/games,
    bpPerGame: totals.bp/games,
    vaPerGame: totals.va/games,
    t2cPerGame: totals.t2c/games,
    t2iPerGame: totals.t2i/games,
    t3cPerGame: totals.t3c/games,
    t3iPerGame: totals.t3i/games,
    tlcPerGame: totals.tlc/games,
    tliPerGame: totals.tli/games,
    tpPerGame: totals.tp/games,
    fcPerGame: totals.fc/games,
    minPerGame: totals.minutes/games,
    pmPerGame: totals.pm/games,
    // Keep legacy names for compatibility
    rebPerGame: totals.rt/games,
    astPerGame: totals.as/games
  };
}

function calculateTeamStats(players) {
  let totalGames = 0;
  let totalPts = 0;
  let totalReb = 0;
  let totalAst = 0;
  let totalPm = 0;

  // Get unique games from all players
  const uniqueGames = new Set();
  players.forEach(player => {
    player.matches.forEach(match => {
      uniqueGames.add(match.game_id);
    });
  });
  totalGames = uniqueGames.size;

  // Sum up stats from all players
  players.forEach(player => {
    totalPts += player.pts;
    totalReb += player.rt || 0; // Total rebounds (ro + rd)
    totalAst += player.as || 0;
    totalPm += player.pm || 0;
  });

  return {
    ptsPerGame: totalPts / totalGames,
    rebPerGame: totalReb / totalGames,
    astPerGame: totalAst / totalGames,
    pmPerGame: totalPm / totalGames
  };
}

function updateTeamRankings(allPlayers, competition, teamId, teamStats) {
  // Use allTeamsStats for ranking
  const totalTeams = allTeamsStats.length;
  if (totalTeams === 0) return; // Guard against division by zero

  const ptsRank = getTeamRankForStat('ptsPerGame', teamId);
  const rebRank = getTeamRankForStat('rebPerGame', teamId);
  const astRank = getTeamRankForStat('astPerGame', teamId);
  const pmRank = getTeamRankForStat('pmPerGame', teamId);
  const formattedComp = formatCompetitionName(competition);
  updateRankPill('teamPts', ptsRank, totalTeams, formattedComp);
  updateRankPill('teamReb', rebRank, totalTeams, formattedComp);
  updateRankPill('teamAst', astRank, totalTeams, formattedComp);
  updateRankPill('teamVal', pmRank, totalTeams, formattedComp);
}

function getTeamRankForStat(statKey, teamId) {
  if (allTeamsStats.length === 0) return 0;
  // Sort allTeamsStats by the stat in descending order
  const sorted = [...allTeamsStats].sort((a, b) => b.stats[statKey] - a.stats[statKey]);
  // Find the rank of our team
  const rankIndex = sorted.findIndex(team => team.teamId === teamId);
  return rankIndex !== -1 ? rankIndex + 1 : 0;
}

// Global function to get team rank for any stat (total or per game)
function getGlobalTeamRank(statKey, type = 'pergame', teamId = null) {
  if (!teamId) teamId = getTeamParams().teamId;
  if (allTeamsStats.length === 0) {
    return { rank: 0, total: 0 };
  }

  const isPerGame = type === 'pergame';
  
  // Calculate values for all teams
  const teamValues = allTeamsStats.map(t => {
    let value;
    if (statKey === 'pm') {
      value = isPerGame ? t.stats.pmPerGame : (t.stats.pmPerGame * t.games);
    } else if (statKey === 'min') {
      value = isPerGame ? t.stats.minPerGame : (t.stats.minPerGame * t.games);
    } else if (statKey === 't2pct') {
      // Calculate 2P percentage
      const t2c = isPerGame ? t.stats.t2cPerGame : (t.stats.t2cPerGame * t.games);
      const t2i = isPerGame ? t.stats.t2iPerGame : (t.stats.t2iPerGame * t.games);
      value = t2i > 0 ? (t2c / t2i) * 100 : 0;
    } else if (statKey === 't3pct') {
      // Calculate 3P percentage
      const t3c = isPerGame ? t.stats.t3cPerGame : (t.stats.t3cPerGame * t.games);
      const t3i = isPerGame ? t.stats.t3iPerGame : (t.stats.t3iPerGame * t.games);
      value = t3i > 0 ? (t3c / t3i) * 100 : 0;
    } else if (statKey === 'tlpct') {
      // Calculate TL percentage
      const tlc = isPerGame ? t.stats.tlcPerGame : (t.stats.tlcPerGame * t.games);
      const tli = isPerGame ? t.stats.tliPerGame : (t.stats.tliPerGame * t.games);
      value = tli > 0 ? (tlc / tli) * 100 : 0;
    } else {
      const perGameStatKey = statKey + 'PerGame';
      const perGameStat = t.stats[perGameStatKey] || 0;
      value = isPerGame ? perGameStat : (perGameStat * t.games);
    }
    
    return {
      teamId: t.teamId,
      value: value,
      games: t.games
    };
  });

  // Sort by value (descending for most stats, but could be customized)
  const sorted = teamValues.sort((a, b) => {
    // For some stats like losses (bp), lower might be better, but generally higher is better
    return b.value - a.value;
  });

  // Find rank
  const rankIndex = sorted.findIndex(team => team.teamId === teamId);
  return {
    rank: rankIndex !== -1 ? rankIndex + 1 : 0,
    total: allTeamsStats.length,
    value: rankIndex !== -1 ? sorted[rankIndex].value : 0,
    teamValues: sorted // Include all team values for reference
  };
}

// Function to calculate and store all rankings for current team
function calculateAllTeamRankings(teamId = null) {
  if (!teamId) teamId = getTeamParams().teamId;
  if (!teamId || allTeamsStats.length === 0) return;

  currentTeamRankings.teamId = teamId;
  currentTeamRankings.totalTeams = allTeamsStats.length;
  currentTeamRankings.total = {};
  currentTeamRankings.pergame = {};

  // Calculate rankings for all stats
  statOptions.forEach(stat => {
    const totalRank = getGlobalTeamRank(stat.value, 'total', teamId);
    const perGameRank = getGlobalTeamRank(stat.value, 'pergame', teamId);
    
    currentTeamRankings.total[stat.value] = totalRank;
    currentTeamRankings.pergame[stat.value] = perGameRank;
  });

  return currentTeamRankings;
}

// Convenience functions to get specific ranking info
function getCurrentTeamRank(statKey, type = 'pergame') {
  if (!currentTeamRankings.teamId) return { rank: 0, total: 0 };
  
  const rankings = type === 'total' ? currentTeamRankings.total : currentTeamRankings.pergame;
  return rankings[statKey] || { rank: 0, total: 0 };
}

function getCurrentTeamRankText(statKey, type = 'pergame') {
  const rankInfo = getCurrentTeamRank(statKey, type);
  return `${rankInfo.rank} de ${rankInfo.total}`;
}

function isCurrentTeamTopRanked(statKey, type = 'pergame', topN = 1) {
  const rankInfo = getCurrentTeamRank(statKey, type);
  return rankInfo.rank <= topN && rankInfo.rank > 0;
}

// Helper to interpolate between two hex colors
function lerpColor(a, b, t) {
  const ah = parseInt(a.replace('#', ''), 16),
        bh = parseInt(b.replace('#', ''), 16),
        ar = ah >> 16, ag = (ah >> 8) & 0xff, ab = ah & 0xff,
        br = bh >> 16, bg = (bh >> 8) & 0xff, bb = bh & 0xff,
        rr = Math.round(ar + t * (br - ar)),
        rg = Math.round(ag + t * (bg - ag)),
        rb = Math.round(ab + t * (bb - ab));
  return '#' + ((1 << 24) + (rr << 16) + (rg << 8) + rb).toString(16).slice(1);
}

function getRankColor(rank, total) {
  // Rank 1 -> green (#43a047), Rank total -> red (#e53935)
  const t = 1 - (rank - 1) / (total - 1 || 1); // normalize 0..1 where 1 is best
  return lerpColor('#e53935', '#43a047', t);
}

function updateRankPill(statId, rank, totalTeams, competitionName) {
  const card = document.getElementById(statId)?.closest('.summary-card-pts, .summary-card-reb, .summary-card-ast, .summary-card-val');
  if (!card) return;
  let rankPill = card.querySelector('.summary-rank-pill');
  if (!rankPill) {
    rankPill = document.createElement('div');
    rankPill.className = 'summary-rank-pill';
    card.appendChild(rankPill);
  }
  rankPill.textContent = `${rank} de ${totalTeams}`;
  rankPill.style.background = getRankColor(rank, totalTeams);
  rankPill.title = `Ranking del equipo en la competición: ${competitionName}`;
}

// Helper function to create rank pill HTML for stats table
function createRankPillHtml(statKey, type = 'pergame') {
  // Check if rankings have been calculated
  if (!allTeamsStats.length) {
    return '';
  }
  
  const teamId = getTeamParams().teamId;
  if (!teamId) {
    return '';
  }
  
  // Use the working getGlobalTeamRank function directly
  const rankInfo = getGlobalTeamRank(statKey, type, teamId);
  
  if (!rankInfo || rankInfo.rank === 0) return '';
  
  const color = getRankColor(rankInfo.rank, rankInfo.total);
  const competitionName = formatCompetitionName(teamCompetition);
  
  return `<span class="stats-rank-pill" style="background: ${color}; color: white; padding: 2px 6px; border-radius: 10px; font-size: 0.75em; font-weight: bold; white-space: nowrap;" title="Ranking del equipo en la competición: ${competitionName}">${rankInfo.rank} de ${rankInfo.total}</span>`;
}

function aggregateTeamMatches(players, competitionFilter, teamIdFilter) {
  const matchMap = new Map();
  players.forEach(player => {
    player.matches.forEach(m => {
      // Filter by the specific competition AND team for this page
      if (competitionFilter && m.competition !== competitionFilter) return;
      if (teamIdFilter && m.playerTeamId !== teamIdFilter) return;

      const key = m.game_id;
      if (!matchMap.has(key)) {
        matchMap.set(key, {
          game_id: m.game_id,
          matchDate: m.matchDate.split(' - ')[0],
          rival: m.rival,
          marcador: m.marcador,
          minutes: 0,
          pts: 0,
          ro: 0,
          rd: 0,
          rt: 0,
          as: 0,
          br: 0,
          bp: 0,
          va: 0,
          t2c: 0,
          t2i: 0,
          t3c: 0,
          t3i: 0,
          tlc: 0,
          tli: 0,
          tp: 0,
          fc: 0,
          pm: 0
        });
      }
      const agg = matchMap.get(key);
      agg.minutes += parseMinutes(m.minutes);
      agg.pts += m.pts;
      agg.ro += m.ro;
      agg.rd += m.rd;
      agg.rt += m.rt;
      agg.as += m.as;
      agg.br += m.br;
      agg.bp += m.bp;
      agg.va += m.va;
      agg.t2c += m.t2c;
      agg.t2i += m.t2i;
      agg.t3c += m.t3c;
      agg.t3i += m.t3i;
      agg.tlc += m.tlc;
      agg.tli += m.tli;
      agg.tp += m.tp;
      agg.fc += m.fc;
      agg.pm += m.pm;
    });
  });
  // Remove games where team scored 0 points (in case of invalid data)
  const filteredMatches = Array.from(matchMap.values()).filter(m => m.pts > 0);

  return filteredMatches.sort((a,b)=> {
    // Handle both formats: dd-mm-yyyy and dd/mm/yyyy
    const aDateText = a.matchDate;
    const bDateText = b.matchDate;
    
    // Try hyphen format first (dd-mm-yyyy)
    let aParts = aDateText.split('-');
    let bParts = bDateText.split('-');
    
    // If no hyphens found, try slash format (dd/mm/yyyy)
    if (aParts.length !== 3) {
      aParts = aDateText.split('/');
    }
    if (bParts.length !== 3) {
      bParts = bDateText.split('/');
    }
    
    // Parse as day-month-year format
    const [aDay, aMonth, aYear] = aParts.map(Number);
    const [bDay, bMonth, bYear] = bParts.map(Number);
    
    const aDate = new Date(aYear, aMonth - 1, aDay);
    const bDate = new Date(bYear, bMonth - 1, bDay);
    
    return aDate - bDate;
  });
}

function insertLineChartUI() {
  const profileSection = document.getElementById('profileSection');
  if (!profileSection || document.getElementById('teamEvolutionChartContainer')) return;

  const chartTitle = document.createElement('h3');
  chartTitle.textContent = 'Rendimiento del equipo partido a partido';
  chartTitle.style.textAlign = 'center';
  chartTitle.style.marginBottom = '20px';
  profileSection.appendChild(chartTitle);

  // Selector row (similar styling)
  const selectorRow = document.createElement('div');
  selectorRow.style.display = 'flex';
  selectorRow.style.flexDirection = 'column';
  selectorRow.style.alignItems = 'center';
  selectorRow.style.marginBottom = '10px';
  const label = document.createElement('span');
  label.textContent = 'Estadística';
  label.style.fontWeight = '600';
  label.style.fontSize = '0.85em';
  label.style.letterSpacing = '0.05em';
  label.style.textTransform = 'uppercase';
  label.style.color = '#888';
  label.style.marginBottom = '4px';
  selectorRow.appendChild(label);
  const selector = document.createElement('select');
  selector.id = 'teamStatSelector';
  selector.style.width = '200px';
  selector.style.padding = '6px 12px';
  selector.style.border = '1.5px solid #1976d2';
  selector.style.borderRadius = '6px';
  selector.style.background = '#f5faff';
  selector.style.color = '#1976d2';
  statOptions.forEach(opt=>{
    const option=document.createElement('option');
    option.value=opt.value; option.textContent=opt.label; selector.appendChild(option);
  });
  selectorRow.appendChild(selector);
  profileSection.appendChild(selectorRow);

  // Flex container with info card and chart
  const evolutionFlex = document.createElement('div');
  evolutionFlex.className = 'chart-with-card';

  // Info card
  const infoCard = document.createElement('div');
  infoCard.className = 'chart-info-card';
  infoCard.innerHTML = `<div class="card-icon" style="font-size:2.2em;text-align:center;">ℹ️</div>
    <div class="card-explanation">Evalúa la evolución del rendimiento del equipo en diferentes estadísticas partido a partido.</div>`;
  evolutionFlex.appendChild(infoCard);

  // Chart container
  const chartContainer = document.createElement('div');
  chartContainer.id = 'teamEvolutionChartContainer';
  chartContainer.style.flex = '0 0 80%';
  chartContainer.style.width = '80%';
  chartContainer.style.height = '100%';
  chartContainer.style.display = 'flex';
  chartContainer.style.alignItems = 'center';
  chartContainer.style.justifyContent = 'center';
  const canvas = document.createElement('canvas');
  canvas.id = 'teamLineChart';
  canvas.height = 120;
  chartContainer.appendChild(canvas);
  evolutionFlex.appendChild(chartContainer);

  profileSection.appendChild(evolutionFlex);

  // separator
  const separator = document.createElement('hr');
  separator.style.border = 'none';
  separator.style.borderTop = '1px solid #e0e0e0';
  separator.style.margin = '32px 0 32px 0';
  profileSection.appendChild(separator);
}

function drawTeamStatChart(statKey) {
  if (!teamMatches.length) return;
  const ctx=document.getElementById('teamLineChart').getContext('2d');
  const labels=teamMatches.map(m=>m.matchDate);
  const dataArr=teamMatches.map(m=>{
    if(statKey==='pm') {
      // Calculate point differential for each game
      const [teamPts, rivalPts] = m.marcador.split('-').map(Number);
      return teamPts - rivalPts;
    }
    return m[statKey];
  });
  const statLabel=statOptions.find(o=>o.value===statKey)?.label||statKey;
  if(window.teamLineChart && typeof window.teamLineChart.destroy==='function') window.teamLineChart.destroy();
  window.teamLineChart=new Chart(ctx,{
    type:'line',
    data:{labels:labels, datasets:[{label:`${statLabel} por partido`, data:dataArr, borderColor:'#1976d2', backgroundColor:'rgba(25,118,210,0.1)', fill:true, pointRadius:5, pointHoverRadius:7, tension:0.2}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:function(context){let val=context.parsed.y;if(statKey==='min') val=formatMinutes(val); else val=Math.round(val);return `${statLabel}: ${val}`;},title:function(ctx){return `Fecha: ${ctx[0].label}`;}}}},scales:{y:{beginAtZero:true,ticks:{callback:function(value){if(statKey==='min') return formatMinutes(value); return Number.isInteger(value)?value:'';}}}}}
  });
}

function insertShootingBarChart(allTeamsPlayers, teamPlayers, competition) {
  const profileSection = document.getElementById('profileSection');
  if (!profileSection || document.getElementById('teamShootingChart')) return;
  // Header
  const barHeader = document.createElement('h3');
  barHeader.textContent = 'Efectividad en el tiro';
  barHeader.style.textAlign = 'center';
  barHeader.style.marginBottom = '20px';
  profileSection.appendChild(barHeader);
  const barFlex = document.createElement('div');
  barFlex.className = 'chart-with-card';
  const infoCard = document.createElement('div');
  infoCard.className = 'chart-info-card';
  infoCard.innerHTML = `<div class="card-icon" style="font-size:2.2em;text-align:center;">ℹ️</div><div class="card-explanation">Evalúa los porcentajes de tiro del equipo en comparación con los valores medios de la liga.</div>`;
  barFlex.appendChild(infoCard);
  const chartContainer = document.createElement('div');
  chartContainer.style.flex='0 0 80%';chartContainer.style.width='80%';chartContainer.style.height='100%';chartContainer.style.display='flex';chartContainer.style.alignItems='center';chartContainer.style.justifyContent='center';
  const canvas=document.createElement('canvas');canvas.id='teamShootingChart';canvas.height=120;chartContainer.appendChild(canvas);
  barFlex.appendChild(chartContainer);
  profileSection.appendChild(barFlex);
  // compute team totals
  const tTotals=teamPlayers.reduce((a,p)=>{['t2c','t2i','t3c','t3i','tlc','tli'].forEach(k=>a[k]+=p[k]);return a;},{t2c:0,t2i:0,t3c:0,t3i:0,tlc:0,tli:0});
  const t2pct=tTotals.t2i>0?(tTotals.t2c/tTotals.t2i)*100:0;
  const t3pct=tTotals.t3i>0?(tTotals.t3c/tTotals.t3i)*100:0;
  const tlpct=tTotals.tli>0?(tTotals.tlc/tTotals.tli)*100:0;
  // league averages
  const teamMap=new Map();
  allTeamsPlayers.forEach(p=>{if(p.competition!==competition) return; if(!teamMap.has(p.teamId)) teamMap.set(p.teamId,{t2c:0,t2i:0,t3c:0,t3i:0,tlc:0,tli:0}); const obj=teamMap.get(p.teamId); ['t2c','t2i','t3c','t3i','tlc','tli'].forEach(k=>obj[k]+=p[k]);});
  let l2=0,l3=0,lft=0; const n=teamMap.size;teamMap.forEach(t=>{l2+=t.t2i? (t.t2c/t.t2i)*100:0; l3+=t.t3i? (t.t3c/t.t3i)*100:0; lft+=t.tli? (t.tlc/t.tli)*100:0;}); if(n){l2/=n;l3/=n;lft/=n;}
  const ctx=canvas.getContext('2d');
  new Chart(ctx,{type:'bar',data:{labels:['2P%','3P%','TL%'],datasets:[{label:'Equipo',data:[t2pct,t3pct,tlpct],backgroundColor:['rgba(25,118,210,0.7)','rgba(255,158,27,0.7)','rgba(200,16,46,0.7)'],borderColor:['#1976d2','#FF9E1B','#C8102E'],borderWidth:2,borderRadius:8,maxBarThickness:60},{label:'Media liga',data:[l2,l3,lft],backgroundColor:['rgba(25,118,210,0.2)','rgba(255,158,27,0.2)','rgba(200,16,46,0.2)'],borderColor:['#1976d2','#FF9E1B','#C8102E'],borderWidth:2,borderRadius:8,maxBarThickness:60}]},options:{responsive:true,plugins:{legend:{display:true,position:'top'},tooltip:{callbacks:{label:ctx=>`${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)}%`}},title:{display:true,text:'Porcentajes de tiro',font:{size:16,weight:'bold'}}},scales:{x:{grid:{display:false}},y:{beginAtZero:true,max:100,ticks:{callback:v=>v+'%',stepSize:20},grid:{color:'rgba(0,0,0,0.07)'}}}}});
}

// Insert horizontal bar chart for team comparison using HTML/CSS with dropdown
function insertTeamPointsBarHtml() {
  const profileSection = document.getElementById('profileSection');
  if (!profileSection || document.getElementById('teamComparisonSection')) return;

  // Create main section container
  const sectionContainer = document.createElement('div');
  sectionContainer.id = 'teamComparisonSection';

  const header = document.createElement('h3');
  header.id = 'teamComparisonTitle';
  header.textContent = 'Comparación con equipos de la competición';
  header.style.textAlign = 'center';
  header.style.margin = '32px 0 20px 0';
  sectionContainer.appendChild(header);

  // Create dropdown container
  const dropdownContainer = document.createElement('div');
  dropdownContainer.style.display = 'flex';
  dropdownContainer.style.justifyContent = 'center';
  dropdownContainer.style.alignItems = 'center';
  dropdownContainer.style.gap = '20px';
  dropdownContainer.style.marginBottom = '20px';
  dropdownContainer.style.flexWrap = 'wrap';

  // First dropdown - Stat selection
  const statDropdownGroup = document.createElement('div');
  statDropdownGroup.style.display = 'flex';
  statDropdownGroup.style.alignItems = 'center';
  statDropdownGroup.style.gap = '8px';

  const statLabel = document.createElement('label');
  statLabel.textContent = 'Estadística:';
  statLabel.style.fontWeight = '600';
  statLabel.style.fontSize = '0.9em';
  statLabel.style.color = '#333';

  const statDropdown = document.createElement('select');
  statDropdown.id = 'teamComparisonStatSelector';
  statDropdown.style.padding = '8px 12px';
  statDropdown.style.border = '1.5px solid #1976d2';
  statDropdown.style.borderRadius = '6px';
  statDropdown.style.background = '#f5faff';
  statDropdown.style.color = '#1976d2';
  statDropdown.style.fontWeight = '500';
  statDropdown.style.minWidth = '160px';

  // Add stat options
  statOptions.forEach(opt => {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = opt.label;
    if (opt.value === 'pts') {
      option.selected = true;
    }
    statDropdown.appendChild(option);
  });

  statDropdownGroup.appendChild(statLabel);
  statDropdownGroup.appendChild(statDropdown);

  // Second dropdown - Total vs Per Game
  const typeDropdownGroup = document.createElement('div');
  typeDropdownGroup.style.display = 'flex';
  typeDropdownGroup.style.alignItems = 'center';
  typeDropdownGroup.style.gap = '8px';

  const typeLabel = document.createElement('label');
  typeLabel.textContent = 'Tipo:';
  typeLabel.style.fontWeight = '600';
  typeLabel.style.fontSize = '0.9em';
  typeLabel.style.color = '#333';

  const typeDropdown = document.createElement('select');
  typeDropdown.id = 'teamComparisonTypeSelector';
  typeDropdown.style.padding = '8px 12px';
  typeDropdown.style.border = '1.5px solid #1976d2';
  typeDropdown.style.borderRadius = '6px';
  typeDropdown.style.background = '#f5faff';
  typeDropdown.style.color = '#1976d2';
  typeDropdown.style.fontWeight = '500';
  typeDropdown.style.minWidth = '140px';

  // Add type options
  const typeOptions = [
    { value: 'total', label: 'Total' },
    { value: 'pergame', label: 'Por partido' }
  ];

  typeOptions.forEach(opt => {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = opt.label;
    if (opt.value === 'total') {
      option.selected = true;
    }
    typeDropdown.appendChild(option);
  });

  typeDropdownGroup.appendChild(typeLabel);
  typeDropdownGroup.appendChild(typeDropdown);

  dropdownContainer.appendChild(statDropdownGroup);
  dropdownContainer.appendChild(typeDropdownGroup);
  sectionContainer.appendChild(dropdownContainer);

  // Create chart container
  const chartWrapper = document.createElement('div');
  chartWrapper.id = 'dynamicTeamChart';
  chartWrapper.className = 'points-chart';
  sectionContainer.appendChild(chartWrapper);

  profileSection.appendChild(sectionContainer);

  // Add event listeners for dropdown changes
  const updateChart = () => {
    const selectedStat = statDropdown.value;
    const selectedType = typeDropdown.value;
    updateTeamComparisonChart(selectedStat, selectedType);
  };

  statDropdown.addEventListener('change', updateChart);
  typeDropdown.addEventListener('change', updateChart);

  // Initial chart render
  updateTeamComparisonChart('pts', 'total');
}

// Function to update the team comparison chart based on selected stat
function updateTeamComparisonChart(statKey, statType) {
  const chartWrapper = document.getElementById('dynamicTeamChart');
  const titleElement = document.getElementById('teamComparisonTitle');
  if (!chartWrapper || !titleElement) return;

  const isPerGame = statType === 'pergame';
  
  // Find the stat label
  const statInfo = statOptions.find(opt => opt.value === statKey);
  const statLabel = statInfo ? statInfo.label : statKey;

  // Update title
  // titleElement.textContent = `${statLabel} ${isPerGame ? 'por partido' : 'totales'} por equipo`;

  // Clear previous chart
  chartWrapper.innerHTML = '';

  // Get current team ID
  const currentId = getTeamParams().teamId;

  // Calculate data based on selected stat
  const chartData = allTeamsStats.map(t => {
    let value;
    if (statKey === 'pm') {
      // Special handling for +/- (point differential)
      value = isPerGame ? t.stats.pmPerGame : (t.stats.pmPerGame * t.games);
    } else if (statKey === 'min') {
      // Special handling for minutes
      value = isPerGame ? t.stats.minPerGame : (t.stats.minPerGame * t.games);
    } else if (statKey === 't2pct') {
      // Calculate 2P percentage
      const t2c = isPerGame ? t.stats.t2cPerGame : (t.stats.t2cPerGame * t.games);
      const t2i = isPerGame ? t.stats.t2iPerGame : (t.stats.t2iPerGame * t.games);
      value = t2i > 0 ? (t2c / t2i) * 100 : 0;
    } else if (statKey === 't3pct') {
      // Calculate 3P percentage
      const t3c = isPerGame ? t.stats.t3cPerGame : (t.stats.t3cPerGame * t.games);
      const t3i = isPerGame ? t.stats.t3iPerGame : (t.stats.t3iPerGame * t.games);
      value = t3i > 0 ? (t3c / t3i) * 100 : 0;
    } else if (statKey === 'tlpct') {
      // Calculate TL percentage
      const tlc = isPerGame ? t.stats.tlcPerGame : (t.stats.tlcPerGame * t.games);
      const tli = isPerGame ? t.stats.tliPerGame : (t.stats.tliPerGame * t.games);
      value = tli > 0 ? (tlc / tli) * 100 : 0;
    } else {
      // Regular stats
      const perGameStat = t.stats[statKey + 'PerGame'] || 0;
      value = isPerGame ? perGameStat : (perGameStat * t.games);
    }

    return {
      id: t.teamId,
      name: t.teamName,
      value: value,
      games: t.games,
      logo: getTeamLogo(t.teamId),
      isCurrent: t.teamId === currentId
    };
  }).sort((a, b) => b.value - a.value);

  // For +/- stat, we need to handle the full range from min to max
  let maxValue, minValue;
  if (statKey === 'pm') {
    minValue = Math.min(...chartData.map(d => d.value));
    maxValue = Math.max(...chartData.map(d => d.value));
  } else {
    maxValue = Math.max(...chartData.map(d => Math.abs(d.value)));
    minValue = 0;
  }
  const totalTeams = chartData.length;

  // Create legend
  const legend = document.createElement('div');
  legend.className = 'team-comparison-legend';
  legend.style.textAlign = 'center';
  legend.style.marginBottom = '16px';
  legend.style.padding = '12px';
  legend.style.background = '#f8f9fa';
  legend.style.borderRadius = '8px';
  legend.style.border = '1px solid #e9ecef';
  legend.style.fontSize = '0.9em';
  legend.style.color = '#666';
  
  // Find current team name
  const currentTeam = chartData.find(d => d.isCurrent);
  const currentTeamName = currentTeam ? toTitleCase(currentTeam.name) : 'Este equipo';
  
  legend.innerHTML = `<strong>${currentTeamName}</strong> resaltado en <span style="color: #FF9E1B; font-weight: bold;">naranja</span>`;
  
  chartWrapper.appendChild(legend);

  // Create grid container
  const gridContainer = document.createElement('div');
  gridContainer.className = 'team-comparison-grid';
  // Let CSS handle the responsive grid layout
  gridContainer.style.fontSize = 'small';

  chartData.forEach((d, idx) => {
    const card = document.createElement('div');
    card.className = 'team-comparison-card';
    if (d.isCurrent) {
      card.classList.add('current-team');
    }

    // Create tooltip
    const compName = formatCompetitionName(teamCompetition);
    let formattedValue;
    if (statKey === 'min') {
      formattedValue = formatMinutes(d.value);
    } else if (statKey === 't2pct' || statKey === 't3pct' || statKey === 'tlpct') {
      formattedValue = d.value.toFixed(1) + '%';
    } else if (isPerGame) {
      formattedValue = d.value.toFixed(1);
    } else {
      formattedValue = Math.round(d.value).toString();
    }
    const tooltipText = `${toTitleCase(d.name)}\n${statLabel}: ${formattedValue}${isPerGame ? ' por partido' : ' total'}\nPartidos: ${d.games}\n${compName}`;
    card.title = tooltipText;

    // Rank badge
    const rankBadge = document.createElement('div');
    rankBadge.className = 'team-rank-badge';
    if (d.isCurrent) {
      rankBadge.classList.add('current-team');
    }
    rankBadge.textContent = `${idx + 1} de ${totalTeams}`;
    card.appendChild(rankBadge);

    // Team logo and name container
    const teamInfoContainer = document.createElement('div');
    teamInfoContainer.style.display = 'flex';
    teamInfoContainer.style.flexDirection = 'column';
    teamInfoContainer.style.alignItems = 'center';
    teamInfoContainer.style.gap = '8px';
    teamInfoContainer.style.marginBottom = '12px';

    // Team logo
    const logo = document.createElement('img');
    logo.src = d.logo;
    logo.alt = d.name;
    logo.onerror = function(){ this.src='team_icon.png'; };
    logo.style.width = '40px';
    logo.style.height = '40px';
    logo.style.objectFit = 'contain';
    logo.style.borderRadius = '4px';
    teamInfoContainer.appendChild(logo);

    // Team abbreviation
    const teamAbbr = document.createElement('div');
    teamAbbr.className = 'team-abbreviation';
    if (d.isCurrent) {
      teamAbbr.classList.add('current-team');
    }
    teamAbbr.textContent = createTeamAcronym(d.name);
    teamAbbr.title = toTitleCase(d.name); // Full name as tooltip
    teamInfoContainer.appendChild(teamAbbr);

    card.appendChild(teamInfoContainer);

    // Stat value
    const statValue = document.createElement('div');
    statValue.className = 'team-stat-value';
    if (d.isCurrent) {
      statValue.classList.add('current-team');
    }
    
    if (statKey === 'min') {
      statValue.textContent = formatMinutes(d.value);
    } else if (statKey === 't2pct' || statKey === 't3pct' || statKey === 'tlpct') {
      statValue.textContent = d.value.toFixed(1) + '%';
    } else if (isPerGame) {
      statValue.textContent = d.value.toFixed(1);
    } else {
      statValue.textContent = Math.round(d.value).toString();
    }
    card.appendChild(statValue);

    // Progress bar container
    const progressContainer = document.createElement('div');
    progressContainer.className = 'team-progress-container';

    // Progress bar
    const progressBar = document.createElement('div');
    progressBar.className = 'team-progress-bar';
    
    // Calculate progress percentage
    let progressPercent;
    if (statKey === 'pm') {
      // For +/- stat, calculate percentage based on the full range
      const range = maxValue - minValue;
      if (range === 0) {
        progressPercent = 100; // If all values are the same, show full bar
      } else {
        progressPercent = ((d.value - minValue) / range) * 100;
      }
      // Use red for negative values, orange for positive
      if (d.value < 0) {
        progressBar.style.background = d.isCurrent ? '#FF6B6B' : '#BDBDBD';
      } else {
        progressBar.style.background = d.isCurrent ? '#FF9E1B' : '#9E9E9E';
      }
    } else {
      // For other stats, use the original logic
      if (d.value < 0) {
        // For negative values, use absolute value but show red
        progressPercent = (Math.abs(d.value) / maxValue) * 100;
        progressBar.style.background = d.isCurrent ? '#FF6B6B' : '#BDBDBD';
      } else {
        progressPercent = (d.value / maxValue) * 100;
        progressBar.style.background = d.isCurrent ? '#FF9E1B' : '#9E9E9E';
      }
    }
    
    progressBar.style.width = `${Math.min(progressPercent, 100)}%`;
    progressContainer.appendChild(progressBar);
    card.appendChild(progressContainer);

    gridContainer.appendChild(card);
  });

  chartWrapper.appendChild(gridContainer);
}

// -------- TAB NAVIGATION ---------
document.addEventListener('DOMContentLoaded',()=>{
  const tabLinks=document.querySelectorAll('#teamTabs .tab-link');
  const sections=document.querySelectorAll('.player-section');
  function showSection(id){sections.forEach(s=>{s.style.display=(s.id===id)?'block':'none';});}
  tabLinks.forEach(tab=>{
    tab.addEventListener('click',e=>{
      e.preventDefault();
      const targetId=tab.getAttribute('href').substring(1);
      showSection(targetId);
      tabLinks.forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');
    });
  });
  // default display
  showSection('playersSection');
  tabLinks.forEach(t=>t.classList.remove('active'));
  document.querySelector('#teamTabs .tab-link[href="#playersSection"]').classList.add('active');
});

// --- SHOT MAP FOR TEAM ---
const competitionMappings = {
  "LF CHALLENGE": "players_shots_lf_challenge.json",
  "C ESP CLUBES JR MASC": "players_shots_c_esp_clubes_jr_masc.json",
  "PRIMERA FEB": "players_shots_primera_feb.json",
  "Fase Final 1ª División Femenin": "players_shots_fase_final_1a_división_femenin.json",
  "C ESP CLUBES CAD MASC": "players_shots_c_esp_clubes_cad_masc.json",
  "LF ENDESA": "players_shots_lf_endesa.json",
  "L.F.-2": "players_shots_lf2.json",
  "C ESP CLUBES CAD FEM": "players_shots_c_esp_clubes_cad_fem.json",
  "SEGUNDA FEB": "players_shots_segunda_feb.json",
  "TERCERA FEB": "players_shots_tercera_feb.json",
  "C ESP CLUBES INF FEM": "players_shots_c_esp_clubes_inf_fem.json",
  "C ESP CLUBES INF MASC": "players_shots_c_esp_clubes_inf_masc.json",
  "C ESP CLUBES MINI MASC": "players_shots_c_esp_clubes_mini_masc.json",
  "C ESP CLUBES MINI FEM": "players_shots_c_esp_clubes_mini_fem.json"
};

let allTeamShots = [];
let allLeagueShots = [];

function getTeamId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('team_id');
}

async function loadTeamShotData() {
  const teamId = getTeamId();
  
  if (!teamId || !teamMatches.length || !teamPlayers.length) {
    return;
  }
  
  // Get competition from first match
  // Get first player which teamId matches the teamId in the URL and get the competition from the player
  const teamPlayer = teamPlayers.find(p => p.teamId === teamId);
  const competition = teamPlayer.competition;

  // const competition = (teamMatches[0] && teamMatches[0].competition) || (teamPlayers && teamPlayers[0] && teamPlayers[0].competition);
      if (!competition) {
      return;
    }
    
    const jsonFileName = competitionMappings[competition.trim()];
    if (!jsonFileName) {
      return;
    }
  
  try {
    // Load league-wide JSON
    const response = await fetch(`Tiros por liga/${jsonFileName}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const leagueShots = await response.json();
    allLeagueShots = Object.values(leagueShots).flat();
    
    // Get team name from the first player
    const teamName = teamPlayers[0].teamName;
    
    // Filter shots by team name using equipo_string
    allTeamShots = allLeagueShots.filter(s => s.equipo_string === teamName);
    
    buildTeamShotFiltersUI(allTeamShots);
    updateTeamShotChart();
  } catch (error) {
    console.error('Error loading shot data:', error);
  }
}

function buildTeamShotFiltersUI(shots) {
  const container = document.getElementById('shotsFiltersContainer');
  if (!container) {
    console.error('shotsFiltersContainer not found!');
    return;
  }
  
  container.innerHTML = '';

  // Create filter controls container
  const filterControls = document.createElement('div');
  filterControls.className = 'filter-controls';
  filterControls.style.marginBottom = '20px';
  filterControls.style.display = 'flex';
  filterControls.style.gap = '20px';
  filterControls.style.flexWrap = 'wrap';
  // Ensure dropdowns appear above court
  filterControls.style.position = 'relative';
  filterControls.style.zIndex = '1500';

  // --- NEW: Player filter ---
  // Get all team players (id and name)
  const playerOptions = teamPlayers.map(p => ({ value: p.id, label: p.playerName }));
  const playerSelect = createCustomSelect('player', 'Jugadores', playerOptions);
  filterControls.appendChild(playerSelect);

  // Get unique matches for this team
  const uniqueMatches = [...new Set(shots.map(shot => shot.match))];

  // Match filter
  const matchSelect = createCustomSelect('match', 'Partido', uniqueMatches);
  filterControls.appendChild(matchSelect);

  // Quarter filter
  const quarterSelect = createCustomSelect('quarter', 'Cuartos', ['1', '2', '3', '4']);
  filterControls.appendChild(quarterSelect);

  // Result filter
  const resultSelect = createCustomSelect('result', 'Resultado', [
    { value: 'made', label: 'Anotado' },
    { value: 'missed', label: 'Fallado' }
  ]);
  filterControls.appendChild(resultSelect);

  // Shot type filter
  const shotTypeSelect = createCustomSelect('shotType', 'Tipo de Tiro', [
    { value: 'rim', label: 'Cerca del aro' },
    { value: '2', label: 'Tiros de 2' },
    { value: '3', label: 'Tiros de 3' }
  ]);
  filterControls.appendChild(shotTypeSelect);

  // Score difference filter
  const scoreDiffSelect = createCustomSelect('scoreDiff', 'Diferencia de Puntos', [
    { value: 'tied', label: 'Empate' },
    { value: 'ahead_1_5', label: 'Ganando por 1-5' },
    { value: 'ahead_6_10', label: 'Ganando por 6-10' },
    { value: 'ahead_10_plus', label: 'Ganando por +10' },
    { value: 'behind_1_5', label: 'Perdiendo por 1-5' },
    { value: 'behind_6_10', label: 'Perdiendo por 6-10' },
    { value: 'behind_10_plus', label: 'Perdiendo por +10' }
  ]);
  filterControls.appendChild(scoreDiffSelect);

  // Court side filter
  const courtSideSelect = createCustomSelect('courtSide', 'Lado de la Cancha', [
    { value: 'left', label: 'Izquierda' },
    { value: 'right', label: 'Derecha' }
  ]);
  filterControls.appendChild(courtSideSelect);

  // Time filter
  const timeSelect = createTimeFilter();
  filterControls.appendChild(timeSelect);

  // Distance filter
  const distanceSelect = createDistanceFilter();
  filterControls.appendChild(distanceSelect);

  container.appendChild(filterControls);

  // Reset button
  const resetBtn = document.createElement('button');
  resetBtn.textContent = 'Restablecer filtros';
  resetBtn.style.padding = '6px 18px';
  resetBtn.style.background = '#1976d2';
  resetBtn.style.color = '#fff';
  resetBtn.style.border = 'none';
  resetBtn.style.borderRadius = '4px';
  resetBtn.style.fontWeight = 'bold';
  resetBtn.style.cursor = 'pointer';
  resetBtn.style.margin = '12px 0';
  resetBtn.onclick = resetTeamFilters;
  
  // Create a container to center the button
  const resetContainer = document.createElement('div');
  resetContainer.style.display = 'flex';
  resetContainer.style.justifyContent = 'center';
  resetContainer.style.alignItems = 'center';
  resetContainer.appendChild(resetBtn);
  container.appendChild(resetContainer);

  // Selected filters display
  const selectedFiltersDiv = document.createElement('div');
  selectedFiltersDiv.id = 'selectedTeamFilters';
  selectedFiltersDiv.style.margin = '10px 0 18px 0';
  container.appendChild(selectedFiltersDiv);

  // Add event listeners for all filters
  addTeamFilterEventListeners();
}

function createCustomSelect(name, label, options) {
  const selectDiv = document.createElement('div');
  selectDiv.className = 'custom-select';
  selectDiv.style.position = 'relative';
  selectDiv.style.minWidth = '200px';
  selectDiv.style.flex = '0 0 auto';

  const header = document.createElement('div');
  header.className = 'select-header';
  header.style.background = '#fff';
  header.style.padding = '10px 15px';
  header.style.borderRadius = '4px';
  header.style.cursor = 'pointer';
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
  header.style.minHeight = '42px';
  header.onclick = () => toggleTeamDropdown(name);

  const headerSpan = document.createElement('span');
  headerSpan.textContent = label;
  headerSpan.style.color = '#333';
  headerSpan.style.whiteSpace = 'nowrap';
  headerSpan.style.overflow = 'hidden';
  headerSpan.style.textOverflow = 'ellipsis';

  const arrow = document.createElement('span');
  arrow.className = 'arrow';
  arrow.textContent = '▼';
  arrow.style.fontSize = '12px';
  arrow.style.color = '#666';

  header.appendChild(headerSpan);
  header.appendChild(arrow);

  const optionsDiv = document.createElement('div');
  optionsDiv.className = 'select-options';
  optionsDiv.id = name + 'Options';
  optionsDiv.style.display = 'none';
  optionsDiv.style.position = 'absolute';
  optionsDiv.style.top = '100%';
  optionsDiv.style.left = '0';
  optionsDiv.style.right = '0';
  optionsDiv.style.background = '#fff';
  optionsDiv.style.borderRadius = '4px';
  optionsDiv.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
  optionsDiv.style.zIndex = '1000';
  optionsDiv.style.marginTop = '5px';
  optionsDiv.style.overflowY = 'visible'; // Only optionsList should scroll
  optionsDiv.style.overflowX = 'hidden'; // Prevent horizontal scroll

  // Default width for all dropdowns
  optionsDiv.style.minWidth = '240px';
  optionsDiv.style.maxWidth = '320px';

  // Make player dropdown wider
  if (name === 'player') {
    optionsDiv.style.minWidth = '260px';
    optionsDiv.style.maxWidth = '340px';
  }

  // Add search if there are many options
  if (options.length > 5) {
    const searchDiv = document.createElement('div');
    searchDiv.className = 'select-search';
    searchDiv.style.padding = '10px';
    searchDiv.style.borderBottom = '1px solid #eee';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Buscar...';
    searchInput.style.width = '100%';
    searchInput.style.padding = '8px';
    searchInput.style.border = '1px solid #ddd';
    searchInput.style.borderRadius = '4px';
    searchInput.onkeyup = () => filterTeamOptions(name);

    searchDiv.appendChild(searchInput);
    optionsDiv.appendChild(searchDiv);
  }

  // Select all/deselect all buttons
  const selectAllDiv = document.createElement('div');
  selectAllDiv.className = 'select-all-options';
  selectAllDiv.style.padding = '10px';
  selectAllDiv.style.borderBottom = '1px solid #eee';
  selectAllDiv.style.display = 'flex';
  selectAllDiv.style.gap = '10px';
  selectAllDiv.style.width = '100%';

  const selectAllBtn = document.createElement('button');
  selectAllBtn.textContent = 'Seleccionar todo';
  selectAllBtn.style.flex = '1';
  selectAllBtn.style.minWidth = '0';
  selectAllBtn.style.padding = '8px 10px';
  selectAllBtn.style.textAlign = 'center';
  selectAllBtn.style.whiteSpace = 'normal';
  selectAllBtn.style.wordBreak = 'break-word';
  selectAllBtn.style.border = 'none';
  selectAllBtn.style.borderRadius = '4px';
  selectAllBtn.style.cursor = 'pointer';
  selectAllBtn.style.background = '#1976d2';
  selectAllBtn.style.color = '#fff';
  selectAllBtn.style.fontWeight = 'bold';
  selectAllBtn.onclick = () => selectAllTeamOptions(name);

  const deselectAllBtn = document.createElement('button');
  deselectAllBtn.textContent = 'Deseleccionar todo';
  deselectAllBtn.style.flex = '1';
  deselectAllBtn.style.minWidth = '0';
  deselectAllBtn.style.padding = '8px 10px';
  deselectAllBtn.style.textAlign = 'center';
  deselectAllBtn.style.whiteSpace = 'normal';
  deselectAllBtn.style.wordBreak = 'break-word';
  deselectAllBtn.style.border = 'none';
  deselectAllBtn.style.borderRadius = '4px';
  deselectAllBtn.style.cursor = 'pointer';
  deselectAllBtn.style.background = '#c62828';
  deselectAllBtn.style.color = '#fff';
  deselectAllBtn.style.fontWeight = 'bold';
  deselectAllBtn.onclick = () => deselectAllTeamOptions(name);

  selectAllDiv.appendChild(selectAllBtn);
  selectAllDiv.appendChild(deselectAllBtn);
  optionsDiv.appendChild(selectAllDiv);

  // Options list
  const optionsList = document.createElement('div');
  optionsList.className = 'options-list';
  optionsList.style.maxHeight = '200px';
  optionsList.style.overflowY = 'auto';
  optionsList.style.padding = '10px';

  options.forEach(option => {
    const label = document.createElement('label');
    label.className = 'option';
    label.style.display = 'flex';
    label.style.flexDirection = 'row';
    label.style.alignItems = 'center';
    label.style.whiteSpace = 'normal';
    label.style.width = '100%';
    label.style.padding = '8px 0 8px 4px';
    label.style.cursor = 'pointer';
    label.style.userSelect = 'none';
    label.style.lineHeight = '1.3';
    label.style.borderBottom = '1px solid #f0f0f0';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.name = name;
    checkbox.value = typeof option === 'object' ? option.value : option;
    checkbox.style.flexShrink = '0';
    checkbox.style.marginRight = '8px';
    checkbox.addEventListener('change', updateTeamShotChart);

    const span = document.createElement('span');
    span.textContent = typeof option === 'object' ? option.label : option;
    span.style.flex = '1';
    span.style.wordBreak = 'break-word';
    span.style.whiteSpace = 'normal';
    span.style.display = 'block';
    span.style.fontSize = '14px';
    span.style.color = '#333';

    label.appendChild(checkbox);
    label.appendChild(span);
    optionsList.appendChild(label);
  });

  optionsDiv.appendChild(optionsList);
  selectDiv.appendChild(header);
  selectDiv.appendChild(optionsDiv);

  return selectDiv;
}

function createTimeFilter() {
  const selectDiv = document.createElement('div');
  selectDiv.className = 'custom-select';
  selectDiv.style.position = 'relative';
  selectDiv.style.minWidth = '200px';
  selectDiv.style.flex = '0 0 auto';

  const header = document.createElement('div');
  header.className = 'select-header';
  header.style.background = '#fff';
  header.style.padding = '10px 15px';
  header.style.borderRadius = '4px';
  header.style.cursor = 'pointer';
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
  header.style.minHeight = '42px';
  header.onclick = () => toggleTeamDropdown('time');

  const headerSpan = document.createElement('span');
  headerSpan.textContent = 'Tiempo restante en el cuarto (minutos)';
  headerSpan.style.color = '#333';
  headerSpan.style.whiteSpace = 'nowrap';
  headerSpan.style.overflow = 'hidden';
  headerSpan.style.textOverflow = 'ellipsis';

  const arrow = document.createElement('span');
  arrow.className = 'arrow';
  arrow.textContent = '▼';
  arrow.style.fontSize = '12px';
  arrow.style.color = '#666';

  header.appendChild(headerSpan);
  header.appendChild(arrow);

  const optionsDiv = document.createElement('div');
  optionsDiv.className = 'select-options';
  optionsDiv.id = 'timeOptions';
  optionsDiv.style.display = 'none';
  optionsDiv.style.position = 'absolute';
  optionsDiv.style.top = '100%';
  optionsDiv.style.left = '0';
  optionsDiv.style.right = '0';
  optionsDiv.style.background = '#fff';
  optionsDiv.style.borderRadius = '4px';
  optionsDiv.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
  optionsDiv.style.zIndex = '1000';
  optionsDiv.style.marginTop = '5px';

  const timeRange = document.createElement('div');
  timeRange.className = 'time-range';
  timeRange.style.display = 'flex';
  timeRange.style.flexDirection = 'column';
  timeRange.style.gap = '5px';
  timeRange.style.padding = '10px';

  const timeLabel = document.createElement('label');
  timeLabel.textContent = 'Tiempo restante: ';
  timeLabel.style.fontSize = '12px';
  timeLabel.style.color = '#666';

  const timeInput = document.createElement('input');
  timeInput.type = 'number';
  timeInput.id = 'teamQuarterTime';
  timeInput.placeholder = '0-10';
  timeInput.min = '0';
  timeInput.max = '10';
  timeInput.step = '0.1';
  timeInput.style.width = '100%';
  timeInput.style.padding = '8px';
  timeInput.style.border = '1px solid #ddd';
  timeInput.style.borderRadius = '4px';
  timeInput.addEventListener('input', updateTeamShotChart);

  timeRange.appendChild(timeLabel);
  timeRange.appendChild(timeInput);
  optionsDiv.appendChild(timeRange);

  selectDiv.appendChild(header);
  selectDiv.appendChild(optionsDiv);

  return selectDiv;
}

function createDistanceFilter() {
  const selectDiv = document.createElement('div');
  selectDiv.className = 'custom-select';
  selectDiv.style.position = 'relative';
  selectDiv.style.minWidth = '200px';
  selectDiv.style.flex = '0 0 auto';

  const header = document.createElement('div');
  header.className = 'select-header';
  header.style.background = '#fff';
  header.style.padding = '10px 15px';
  header.style.borderRadius = '4px';
  header.style.cursor = 'pointer';
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
  header.style.minHeight = '42px';
  header.onclick = () => toggleTeamDropdown('distance');

  const headerSpan = document.createElement('span');
  headerSpan.textContent = 'Distancia al aro (metros)';
  headerSpan.style.color = '#333';
  headerSpan.style.whiteSpace = 'nowrap';
  headerSpan.style.overflow = 'hidden';
  headerSpan.style.textOverflow = 'ellipsis';

  const arrow = document.createElement('span');
  arrow.className = 'arrow';
  arrow.textContent = '▼';
  arrow.style.fontSize = '12px';
  arrow.style.color = '#666';

  header.appendChild(headerSpan);
  header.appendChild(arrow);

  const optionsDiv = document.createElement('div');
  optionsDiv.className = 'select-options';
  optionsDiv.id = 'distanceOptions';
  optionsDiv.style.display = 'none';
  optionsDiv.style.position = 'absolute';
  optionsDiv.style.top = '100%';
  optionsDiv.style.left = '0';
  optionsDiv.style.right = '0';
  optionsDiv.style.background = '#fff';
  optionsDiv.style.borderRadius = '4px';
  optionsDiv.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
  optionsDiv.style.zIndex = '1000';
  optionsDiv.style.marginTop = '5px';

  const distanceRange = document.createElement('div');
  distanceRange.className = 'distance-range';
  distanceRange.style.display = 'flex';
  distanceRange.style.flexDirection = 'column';
  distanceRange.style.gap = '5px';
  distanceRange.style.padding = '10px';

  const minLabel = document.createElement('label');
  minLabel.textContent = 'Mín: ';
  minLabel.style.fontSize = '12px';
  minLabel.style.color = '#666';

  const minInput = document.createElement('input');
  minInput.type = 'number';
  minInput.id = 'teamMinDistance';
  minInput.placeholder = 'Mín';
  minInput.min = '0';
  minInput.max = '20';
  minInput.step = '0.1';
  minInput.style.width = '100%';
  minInput.style.padding = '8px';
  minInput.style.border = '1px solid #ddd';
  minInput.style.borderRadius = '4px';
  minInput.addEventListener('input', updateTeamShotChart);

  const maxLabel = document.createElement('label');
  maxLabel.textContent = 'Máx: ';
  maxLabel.style.fontSize = '12px';
  maxLabel.style.color = '#666';

  const maxInput = document.createElement('input');
  maxInput.type = 'number';
  maxInput.id = 'teamMaxDistance';
  maxInput.placeholder = 'Máx';
  maxInput.min = '0';
  maxInput.max = '20';
  maxInput.step = '0.1';
  maxInput.style.width = '100%';
  maxInput.style.padding = '8px';
  maxInput.style.border = '1px solid #ddd';
  maxInput.style.borderRadius = '4px';
  maxInput.addEventListener('input', updateTeamShotChart);

  distanceRange.appendChild(minLabel);
  distanceRange.appendChild(minInput);
  distanceRange.appendChild(maxLabel);
  distanceRange.appendChild(maxInput);
  optionsDiv.appendChild(distanceRange);

  selectDiv.appendChild(header);
  selectDiv.appendChild(optionsDiv);

  return selectDiv;
}

function toggleTeamDropdown(id) {
  const options = document.getElementById(id + 'Options');
  const allDropdowns = document.querySelectorAll('.select-options');
  
  // Close all other dropdowns
  allDropdowns.forEach(dropdown => {
    if (dropdown.id !== id + 'Options') {
      dropdown.classList.remove('active');
      dropdown.style.display = 'none';
    }
  });
  
  // Toggle the clicked dropdown
  if (options.style.display === 'block') {
    options.style.display = 'none';
  } else {
    options.style.display = 'block';
  }
}

function selectAllTeamOptions(id) {
  const options = document.querySelectorAll(`#${id}Options input[type="checkbox"]`);
  options.forEach(option => option.checked = true);
  updateTeamShotChart();
}

function deselectAllTeamOptions(id) {
  const options = document.querySelectorAll(`#${id}Options input[type="checkbox"]`);
  options.forEach(option => option.checked = false);
  updateTeamShotChart();
}

function filterTeamOptions(id) {
  const input = document.querySelector(`#${id}Options .select-search input`);
  const filter = input.value.toLowerCase();
  const options = document.querySelectorAll(`#${id}Options .option`);
  
  options.forEach(option => {
    const text = option.querySelector('span').textContent.toLowerCase();
    option.style.display = text.includes(filter) ? '' : 'none';
  });
}

function addTeamFilterEventListeners() {
  // Close dropdowns when clicking outside
  document.addEventListener('click', function(event) {
    const dropdowns = document.querySelectorAll('.select-options');
    dropdowns.forEach(dropdown => {
      if (!dropdown.contains(event.target) && !event.target.closest('.select-header')) {
        dropdown.classList.remove('active');
        dropdown.style.display = 'none';
      }
    });
  });

  // Add event listeners for all checkboxes and inputs
  document.addEventListener('change', function(event) {
    if (event.target.matches('input[type="checkbox"]') || 
        event.target.matches('input[type="number"]')) {
      updateTeamShotChart();
    }
  });
}

function resetTeamFilters() {
  // Uncheck all checkboxes
  document.querySelectorAll('#shotsSection input[type="checkbox"]').forEach(cb => { cb.checked = false; });
  // Clear all number inputs
  document.querySelectorAll('#shotsSection input[type="number"]').forEach(input => { input.value = ''; });
  // Update filters and chart
  updateSelectedTeamFilters();
  updateTeamShotChart();
}

function updateSelectedTeamFilters() {
  const selectedFiltersDiv = document.getElementById('selectedTeamFilters');
  if (!selectedFiltersDiv) return;
  
  selectedFiltersDiv.innerHTML = '';
  
  // Helper function to create a filter tag
  function createFilterTag(filterType, value, originalValue) {
    const tag = document.createElement('div');
    tag.className = 'filter-tag';
    tag.dataset.filterType = filterType;
    tag.dataset.filterValue = originalValue;
    tag.style.display = 'inline-flex';
    tag.style.alignItems = 'center';
    tag.style.background = '#f0f0f0';
    tag.style.padding = '6px 12px';
    tag.style.borderRadius = '16px';
    tag.style.margin = '4px';
    tag.style.fontSize = '0.9em';
    tag.style.color = '#333';
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'filter-name';
    nameSpan.textContent = value;
    nameSpan.style.marginRight = '8px';
    
    const deleteBtn = document.createElement('span');
    deleteBtn.className = 'delete-filter';
    deleteBtn.innerHTML = '×';
    deleteBtn.style.cursor = 'pointer';
    deleteBtn.style.color = '#666';
    deleteBtn.style.fontSize = '1.1em';
    deleteBtn.style.padding = '0 4px';
    deleteBtn.style.borderRadius = '50%';
    deleteBtn.style.transition = 'all 0.2s';
    deleteBtn.onclick = function(e) {
      e.stopPropagation();
      
      if (filterType === 'time') {
        document.getElementById('teamQuarterTime').value = '';
      } else if (filterType === 'distance') {
        document.getElementById('teamMinDistance').value = '';
        document.getElementById('teamMaxDistance').value = '';
      } else {
        const checkbox = document.querySelector(`input[name="${filterType}"][value="${originalValue}"]`);
        if (checkbox) {
          checkbox.checked = false;
        }
      }
      
      tag.remove();
      updateTeamShotChart();
    };
    
    tag.appendChild(nameSpan);
    tag.appendChild(deleteBtn);
    return tag;
  }
  
  // --- NEW: Player filter tags ---
  const selectedPlayers = getSelectedTeamValues('player');
  if (selectedPlayers.length > 0) {
    selectedPlayers.forEach(pid => {
      const player = teamPlayers.find(p => p.id === pid);
      const playerName = player ? player.playerName : pid;
      selectedFiltersDiv.appendChild(createFilterTag('player', `Jugador: ${playerName}`, pid));
    });
  }

  // Add match filters
  const selectedMatches = getSelectedTeamValues('match');
  if (selectedMatches.length > 0) {
    selectedMatches.forEach(match => {
      selectedFiltersDiv.appendChild(createFilterTag('match', `Partido: ${match}`, match));
    });
  }
  
  // Add quarter filters
  const selectedQuarters = getSelectedTeamValues('quarter');
  if (selectedQuarters.length > 0) {
    selectedQuarters.forEach(quarter => {
      selectedFiltersDiv.appendChild(createFilterTag('quarter', `Cuarto: ${quarter}`, quarter));
    });
  }
  
  // Add result filters
  const selectedResults = getSelectedTeamValues('result');
  if (selectedResults.length > 0) {
    selectedResults.forEach(result => {
      const displayValue = result === 'made' ? 'Anotado' : 'Fallado';
      selectedFiltersDiv.appendChild(createFilterTag('result', `Resultado: ${displayValue}`, result));
    });
  }
  
  // Add shot type filters
  const selectedShotTypes = getSelectedTeamValues('shotType');
  if (selectedShotTypes.length > 0) {
    selectedShotTypes.forEach(type => {
      let displayName;
      switch(type) {
        case 'rim': displayName = 'Cerca del aro'; break;
        case '2': displayName = 'Tiros de 2'; break;
        case '3': displayName = 'Tiros de 3'; break;
        default: displayName = type;
      }
      selectedFiltersDiv.appendChild(createFilterTag('shotType', `Tipo de Tiro: ${displayName}`, type));
    });
  }
  
  // Add score difference filters
  const selectedScoreDiffs = getSelectedTeamValues('scoreDiff');
  if (selectedScoreDiffs.length > 0) {
    selectedScoreDiffs.forEach(diff => {
      let displayName;
      switch(diff) {
        case 'tied': displayName = 'Empate'; break;
        case 'ahead_1_5': displayName = 'Ganando por 1-5'; break;
        case 'ahead_6_10': displayName = 'Ganando por 6-10'; break;
        case 'ahead_10_plus': displayName = 'Ganando por +10'; break;
        case 'behind_1_5': displayName = 'Perdiendo por 1-5'; break;
        case 'behind_6_10': displayName = 'Perdiendo por 6-10'; break;
        case 'behind_10_plus': displayName = 'Perdiendo por +10'; break;
        default: displayName = diff;
      }
      selectedFiltersDiv.appendChild(createFilterTag('scoreDiff', `Diferencia: ${displayName}`, diff));
    });
  }
  
  // Add court side filters
  const selectedCourtSides = getSelectedTeamValues('courtSide');
  if (selectedCourtSides.length > 0) {
    selectedCourtSides.forEach(side => {
      const displayValue = side === 'left' ? 'Izquierda' : 'Derecha';
      selectedFiltersDiv.appendChild(createFilterTag('courtSide', `Lado: ${displayValue}`, side));
    });
  }
  
  // Add time filter
  const quarterTime = document.getElementById('teamQuarterTime')?.value;
  if (quarterTime) {
    selectedFiltersDiv.appendChild(createFilterTag('time', `Tiempo: ${quarterTime} min`, quarterTime));
  }
  
  // Add distance filters
  const minDistance = document.getElementById('teamMinDistance')?.value;
  const maxDistance = document.getElementById('teamMaxDistance')?.value;
  if (minDistance || maxDistance) {
    let distanceText = 'Distancia: ';
    if (minDistance && maxDistance) {
      distanceText += `${minDistance}-${maxDistance} m`;
    } else if (minDistance) {
      distanceText += `>${minDistance} m`;
    } else {
      distanceText += `<${maxDistance} m`;
    }
    selectedFiltersDiv.appendChild(createFilterTag('distance', distanceText, `${minDistance || ''}-${maxDistance || ''}`));
  }
}

function getSelectedTeamValues(name) {
  return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(cb => cb.value);
}

function updateTeamShotChart() {
  updateSelectedTeamFilters();
  const filteredShots = filterTeamShots();
  
  // Update stats
  updateTeamShotStats(filteredShots);
  
  // Prepare data for Chart.js scatter plot (only X <= 50)
  const shotData = filteredShots
    .filter(shot => shot.coord_x <= 50)
    .map(shot => ({
      x: shot.coord_x,
      y: shot.coord_y,
      made: shot.made
    }));

  // Create a canvas if not present
  let canvas = document.getElementById('teamShotsChart');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'teamShotsChart';
    document.body.appendChild(canvas);
  }

  // Load the court image
  const courtImg = new Image();
  courtImg.src = 'court.png';

  // Wait for the image to load before rendering the chart
  courtImg.onload = function() {
    if (window.teamShotsChart && typeof window.teamShotsChart.destroy === 'function') {
      window.teamShotsChart.destroy();
    }

    window.teamShotsChart = new Chart(canvas.getContext('2d'), {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: 'Tiros Anotados',
            data: shotData.filter(shot => shot.made),
            backgroundColor: 'rgba(0, 255, 0, 0.7)'
          },
          {
            label: 'Tiros Fallados',
            data: shotData.filter(shot => !shot.made),
            backgroundColor: 'rgba(255, 0, 0, 0.7)'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 425/474,
        pointRadius: 6,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 20,
              font: { size: 14 }
            }
          },
          tooltip: { enabled: false }
        },
        scales: {
          x: {
            type: 'linear',
            position: 'bottom',
            title: { display: false },
            min: 0,
            max: 50,
            ticks: { display: false },
            grid: { display: false }
          },
          y: {
            type: 'linear',
            title: { display: false },
            reverse: true,
            min: 0,
            max: 100,
            ticks: { display: false },
            grid: { display: false }
          }
        }
      },
      plugins: [{
        id: 'courtBackground',
        beforeDraw: (chart) => {
          const {ctx, chartArea} = chart;
          if (courtImg.complete && chartArea) {
            ctx.save();
            ctx.globalAlpha = 1.0;
            ctx.beginPath();
            ctx.rect(chartArea.left, chartArea.top, chartArea.width, chartArea.height);
            ctx.clip();
            ctx.drawImage(
              courtImg,
              0, 0, courtImg.width / 2, courtImg.height,
              chartArea.left, chartArea.top, chartArea.width, chartArea.height
            );
            ctx.restore();
          }
        }
      }]
    });
  };
}

function filterTeamShots() {
  const selectedPlayers = getSelectedTeamValues('player');
  const selectedMatches = getSelectedTeamValues('match');
  const selectedQuarters = getSelectedTeamValues('quarter');
  const selectedResults = getSelectedTeamValues('result');
  const selectedShotTypes = getSelectedTeamValues('shotType');
  const selectedScoreDiffs = getSelectedTeamValues('scoreDiff');
  const selectedCourtSides = getSelectedTeamValues('courtSide');
  const quarterTime = document.getElementById('teamQuarterTime')?.value;
  const minDistance = document.getElementById('teamMinDistance')?.value;
  const maxDistance = document.getElementById('teamMaxDistance')?.value;

  const filteredShots = allTeamShots.filter(shot => {
    if (selectedPlayers.length > 0 && !selectedPlayers.includes(shot.player_id)) return false;
    if (selectedMatches.length > 0 && !selectedMatches.includes(shot.match)) return false;
    if (selectedQuarters.length > 0 && !selectedQuarters.includes(shot.cuarto)) return false;
    if (selectedResults.length > 0) {
      if (!selectedResults.includes(shot.made ? 'made' : 'missed')) return false;
    }
    if (selectedShotTypes.length > 0) {
      const isThree = isThreePointer(shot);
      const isTwo = isTwoPointer(shot);
      const isRim = shot.dist_al_aro <= 1.5;
      const isMidrange = shot.dist_al_aro > 1.5 && !isThreePointer(shot);
      const matchesSelectedType = selectedShotTypes.some(type => {
        switch(type) {
          case 'rim': return isRim;
          case 'midrange': return isMidrange;
          case '2': return isTwo;
          case '3': return isThree;
          default: return false;
        }
      });
      if (!matchesSelectedType) return false;
    }
    if (selectedScoreDiffs.length > 0) {
      const scoreDiffCategory = getScoreDiffCategory(shot.dif_marcador);
      if (!selectedScoreDiffs.includes(scoreDiffCategory)) return false;
    }
    if (selectedCourtSides.length > 0) {
      const isLeftSide = shot.coord_y > 50;
      if (!selectedCourtSides.includes(isLeftSide ? 'left' : 'right')) return false;
    }
    // Only filter by quarter time if a value is set
    if (quarterTime) {
      const shotTimeInSeconds = timeToSeconds(shot.tiempo);
      if (shotTimeInSeconds > parseFloat(quarterTime) * 60) return false;
    }
    if (minDistance && shot.dist_al_aro < parseFloat(minDistance)) return false;
    if (maxDistance && shot.dist_al_aro > parseFloat(maxDistance)) return false;
    return true;
  });

  return filteredShots;
}

function updateTeamShotStats(filteredShots) {
  // Calculate team FG%
  const totalShots = filteredShots.length;
  const madeShots = filteredShots.filter(shot => shot.made).length;
  const fgPercentage = totalShots > 0 ? (madeShots / totalShots * 100).toFixed(1) : 0;
  
  // Calculate league averages for the same filters
  const selectedQuarters = getSelectedTeamValues('quarter');
  const selectedResults = getSelectedTeamValues('result');
  const selectedShotTypes = getSelectedTeamValues('shotType');
  const selectedScoreDiffs = getSelectedTeamValues('scoreDiff');
  const selectedCourtSides = getSelectedTeamValues('courtSide');
  const quarterTime = document.getElementById('teamQuarterTime')?.value;
  const minDistance = document.getElementById('teamMinDistance')?.value;
  const maxDistance = document.getElementById('teamMaxDistance')?.value;

  // Get all shots from all players with the same filters
  let leagueShots = [];
  
  allLeagueShots.forEach(shot => {
    // Apply all filters for league, EXCEPT selectedMatches
    if (selectedQuarters.length > 0 && !selectedQuarters.includes(shot.cuarto)) return;
    if (selectedResults.length > 0) {
      if (!selectedResults.includes(shot.made ? 'made' : 'missed')) return;
    }
    if (selectedShotTypes.length > 0) {
      const isThree = isThreePointer(shot);
      const isTwo = isTwoPointer(shot);
      const isRim = shot.dist_al_aro <= 1;
      const isMidrange = shot.dist_al_aro > 1 && shot.dist_al_aro < 6.75;
      const matchesSelectedType = selectedShotTypes.some(type => {
        switch(type) {
          case 'rim': return isRim;
          case 'midrange': return isMidrange;
          case '2': return isTwo;
          case '3': return isThree;
          default: return false;
        }
      });
      if (!matchesSelectedType) return;
    }
    if (selectedScoreDiffs.length > 0) {
      const scoreDiffCategory = getScoreDiffCategory(shot.dif_marcador);
      if (!selectedScoreDiffs.includes(scoreDiffCategory)) return;
    }
    if (selectedCourtSides.length > 0) {
      const isLeftSide = shot.coord_y > 50;
      if (!selectedCourtSides.includes(isLeftSide ? 'left' : 'right')) return;
    }
    const shotTimeInSeconds = timeToSeconds(shot.tiempo);
    if (quarterTime && shotTimeInSeconds > parseFloat(quarterTime) * 60) return;
    if (minDistance && shot.dist_al_aro < parseFloat(minDistance)) return;
    if (maxDistance && shot.dist_al_aro > parseFloat(maxDistance)) return;
    // Add to league shots
    leagueShots.push(shot);
  });

  // Calculate league stats
  const leagueShotsFiltered = leagueShots.filter(shot => shot.coord_x <= 50);
  const leagueTotalShots = leagueShotsFiltered.length;
  const leagueMadeShots = leagueShotsFiltered.filter(shot => shot.made).length;
  const leagueFgPercentage = leagueTotalShots > 0 ? (leagueMadeShots / leagueTotalShots * 100).toFixed(1) : 0;
  
  // Helper functions for performance labels and colors
  function getPerformanceLabel(rank, total) {
    if (total === 0) return 'N/A';
    if (rank === 1) return 'EL MEJOR';
    const percentile = ((total - rank + 1) / total) * 100;
    if (percentile >= 90) return 'ÉLITE';
    if (percentile >= 80) return 'MUY BUENO';
    if (percentile >= 60) return 'BUENO';
    if (percentile >= 40) return 'PROMEDIO';
    if (percentile >= 20) return 'BAJO';
    return 'MUY BAJO';
  }

  function getProgressBarColor(rank, total) {
    if (total === 0) return '#ccc';
    if (rank === 1) return '#1b5e20'; // Even darker green for first rank
    const percentile = ((total - rank + 1) / total) * 100;
    if (percentile >= 90) return '#2e7d32'; // Darker green for elite
    if (percentile >= 80) return '#2e7d32'; // Dark green for very good
    if (percentile >= 60) return '#4caf50'; // Green for good
    if (percentile >= 40) return '#ff9800'; // Orange for average
    if (percentile >= 20) return '#f44336'; // Red for low
    return '#d32f2f'; // Dark red for very low
  }

  function getTextColor(backgroundColor) {
    // For dark colors, use white text; for light colors, use black text
    if (backgroundColor === '#1b5e20') return 'white';
    const darkColors = ['#2e7d32', '#d32f2f', '#1976d2'];
    return darkColors.includes(backgroundColor) ? 'white' : 'black';
  }

  function getRelativePercentageDisplay(difference) {
    if (difference > 0) {
      return {
        color: '#4caf50', // Light green
        text: `+${difference.toFixed(1)}%`
      };
    } else if (difference < 0) {
      return {
        color: '#f44336', // Light red
        text: `${difference.toFixed(1)}%`
      };
    } else {
      return {
        color: '#666', // Gray for no difference
        text: '0.0%'
      };
    }
  }

  // Calculate team rank in league
  const leagueTeamPercentages = [];
  const processedTeams = new Set();
  
  allLeagueShots.forEach(shot => {
    if (!processedTeams.has(shot.equipo_string)) {
      const teamShots = allLeagueShots.filter(s => s.equipo_string === shot.equipo_string);
      const teamMade = teamShots.filter(s => s.made).length;
      const teamTotal = teamShots.length;
      const teamPct = teamTotal > 0 ? (teamMade / teamTotal) * 100 : 0;
      
      leagueTeamPercentages.push({
        team: shot.equipo_string,
        percentage: teamPct
      });
      processedTeams.add(shot.equipo_string);
    }
  });

  // Sort teams by percentage (descending) and find current team rank
  leagueTeamPercentages.sort((a, b) => b.percentage - a.percentage);
  const currentTeamName = teamPlayers[0]?.teamName;
  const teamRankIndex = leagueTeamPercentages.findIndex(t => t.team === currentTeamName);
  const teamRank = teamRankIndex !== -1 ? teamRankIndex + 1 : leagueTeamPercentages.length;
  const totalTeams = leagueTeamPercentages.length;

  // Calculate relative percentage
  const leagueRelativePercentage = parseFloat(fgPercentage) - parseFloat(leagueFgPercentage);
  const leagueRelativeDisplay = getRelativePercentageDisplay(leagueRelativePercentage);

  // Update the stats display with card-based design
  const fgPercentageElement = document.getElementById('teamFgPercentage');
  
  fgPercentageElement.innerHTML = `
    <div class="fg-cards-grid">
      <!-- Team Card -->
      <div class="fg-card team-card">
        <div class="fg-card-header">
          <h4>Equipo</h4>
        </div>
        <div class="fg-card-body">
          ${totalShots > 0 ? `
            <div class="fg-stat-row">
              <span class="fg-stat-label">%TC</span>
              <span class="fg-stat-value">${fgPercentage}%</span>
              <span class="fg-stat-detail">(${madeShots}/${totalShots})</span>
            </div>
          ` : `
            <div class="fg-stat-row">
              <span class="fg-stat-value fg-stat-na">Sin tiros de este tipo</span>
            </div>
          `}
        </div>
      </div>

      <!-- League Card -->
      <div class="fg-card league-card">
        <div class="fg-card-header">
          <h4>Liga</h4>
        </div>
        <div class="fg-card-body">
          <div class="fg-stat-row">
            <span class="fg-stat-label">%TC</span>
            <span class="fg-stat-value">${leagueFgPercentage}%</span>
            <span class="fg-stat-detail">(${leagueMadeShots}/${leagueTotalShots})</span>
          </div>
          ${totalShots > 0 ? `
            <div class="fg-stat-row">
              <span class="fg-stat-label">%TC relativo del equipo</span>
              <span class="fg-stat-value" style="color: ${leagueRelativeDisplay.color}; font-weight: bold;">${leagueRelativeDisplay.text}</span>
            </div>
            <div class="fg-stat-row">
              <div class="fg-performance-container" title="Liga: Ranking ${teamRank} de ${totalTeams} en la liga">
                <span class="fg-performance-pill" style="background-color: ${getProgressBarColor(teamRank, totalTeams)}; color: ${getTextColor(getProgressBarColor(teamRank, totalTeams))};">${getPerformanceLabel(teamRank, totalTeams)}</span>
                <div class="fg-progress-bar-container">
                  <div class="fg-progress-bar" style="background-color: ${getProgressBarColor(teamRank, totalTeams)}; width: ${teamRank === 1 ? 100 : Math.round(((totalTeams - teamRank + 1) / totalTeams) * 100)}%;"></div>
                </div>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

// Helper functions for shot filtering
function isThreePointer(shot) {
  return shot.desc_tiro && shot.desc_tiro.toUpperCase().includes('TIRO DE 3');
}

function isTwoPointer(shot) {
  return shot.desc_tiro && shot.desc_tiro.toUpperCase().includes('TIRO DE 2');
}

function getScoreDiffCategory(diff) {
  if (diff === 0) return 'tied';
  if (diff > 0) {
    if (diff <= 5) return 'ahead_1_5';
    if (diff <= 10) return 'ahead_6_10';
    return 'ahead_10_plus';
  } else {
    diff = Math.abs(diff);
    if (diff <= 5) return 'behind_1_5';
    if (diff <= 10) return 'behind_6_10';
    return 'behind_10_plus';
  }
}

function timeToSeconds(timeStr) {
  const [minutes, seconds] = timeStr.split(':').map(Number);
  return minutes * 60 + seconds;
}

// ---------------- TEAM STATS TABLE (Stats Tab) ----------------
function renderTeamStatsTable() {
  const container = document.getElementById('teamStatsContainer');
  if (!container || !Array.isArray(teamMatches) || teamMatches.length === 0) return;
  container.innerHTML = '';
  


  function didTeamWin(marcador) {
    if (!marcador) return false;
    const [teamScore, rivalScore] = marcador.split('-').map(Number);
    return teamScore > rivalScore;
  }

  function formatResult(marcador) {
    const won = didTeamWin(marcador);
    const indicator = won ? '<b style="color:#008000;" title="Ganado">G</b>' : '<b style="color:#ff0000;" title="Perdido">P</b>';
    return `${marcador} ${indicator}`;
  }

  // Create table
  const table = document.createElement('table');
  table.className = 'stats-table';

  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr>
      <th data-sort="fecha">Fecha</th>
      <th>Rival</th>
      <th>Resultado</th>
      <th data-sort="pts">PTS</th>
      <th data-sort="t2c">T2C</th>
      <th data-sort="t2i">T2I</th>
      <th data-sort="t2pct">%T2</th>
      <th data-sort="t3c">T3C</th>
      <th data-sort="t3i">T3I</th>
      <th data-sort="t3pct">%T3</th>
      <th data-sort="tlc">T1C</th>
      <th data-sort="tli">T1I</th>
      <th data-sort="tlpct">%T1</th>
      <th data-sort="ro">RO</th>
      <th data-sort="rd">RD</th>
      <th data-sort="rt">RT</th>
      <th data-sort="as">AS</th>
      <th data-sort="br">BR</th>
      <th data-sort="bp">BP</th>
      <th data-sort="tp">TP</th>
      <th data-sort="fc">FC</th>
      <th data-sort="va">VA</th>
      <th data-sort="pm">+/-</th>
    </tr>`;
  table.appendChild(thead);
  const tbody = document.createElement('tbody');

  const totals = {pts:0,t2i:0,t2c:0,t3i:0,t3c:0,tli:0,tlc:0,ro:0,rd:0,rt:0,as:0,br:0,bp:0,tp:0,fc:0,va:0,pm:0};

  teamMatches.forEach(m=>{
    const [ourPts, rivalPts] = m.marcador.split('-').map(Number);
    const pmDiff = ourPts - rivalPts;
    const t2pct = m.t2i?((m.t2c/m.t2i)*100).toFixed(1):0;
    const t3pct = m.t3i?((m.t3c/m.t3i)*100).toFixed(1):0;
    const tlpct = m.tli?((m.tlc/m.tli)*100).toFixed(1):0;
    Object.assign(totals, {
      pts: totals.pts + m.pts,
      t2i: totals.t2i + m.t2i,
      t2c: totals.t2c + m.t2c,
      t3i: totals.t3i + m.t3i,
      t3c: totals.t3c + m.t3c,
      tli: totals.tli + m.tli,
      tlc: totals.tlc + m.tlc,
      ro: totals.ro + m.ro,
      rd: totals.rd + m.rd,
      rt: totals.rt + m.rt,
      as: totals.as + m.as,
      br: totals.br + m.br,
      bp: totals.bp + m.bp,
      tp: totals.tp + m.tp,
      fc: totals.fc + m.fc,
      va: totals.va + m.va,
      pm: totals.pm + pmDiff
    });

    const row = document.createElement('tr');
    row.style.backgroundColor = didTeamWin(m.marcador)?'rgba(0,255,0,0.1)':'rgba(255,0,0,0.1)';
    row.innerHTML = `
      <td>${m.matchDate}</td>
      <td class="team-hint" data-fullname="${m.rival}">${createTeamAcronym(m.rival)}</td>
      <td><a href="ficha.html?gameId=${m.game_id}" style="text-decoration:none;">${formatResult(m.marcador)}</a></td>
      <td>${m.pts}</td>
      <td>${m.t2c}</td>
      <td>${m.t2i}</td>
      <td>${t2pct}</td>
      <td>${m.t3c}</td>
      <td>${m.t3i}</td>
      <td>${t3pct}</td>
      <td>${m.tlc}</td>
      <td>${m.tli}</td>
      <td>${tlpct}</td>
      <td>${m.ro}</td>
      <td>${m.rd}</td>
      <td>${m.rt}</td>
      <td>${m.as}</td>
      <td>${m.br}</td>
      <td>${m.bp}</td>
      <td>${m.tp}</td>
      <td>${m.fc}</td>
      <td>${m.va}</td>
      <td>${pmDiff}</td>`;
    tbody.appendChild(row);
  });

  // Totals and averages rows similar update (compute pct)
  const games = teamMatches.length;
  const totalT2Pct = totals.t2i?((totals.t2c/totals.t2i)*100).toFixed(1):0;
  const totalT3Pct = totals.t3i?((totals.t3c/totals.t3i)*100).toFixed(1):0;
  const totalTLPct = totals.tli?((totals.tlc/totals.tli)*100).toFixed(1):0;
  const totalRow = document.createElement('tr');
  totalRow.className='total-row';
  totalRow.innerHTML=`<td colspan="3">TOTAL</td>
  <td><p>${totals.pts}</p>  
      ${createRankPillHtml('pts', 'total')}</td>
  <td><p>${totals.t2c}</p>
      ${createRankPillHtml('t2c', 'total')}</td>
  <td><p>${totals.t2i}</p>
      ${createRankPillHtml('t2i', 'total')}</td>
  <td><p>${totalT2Pct}</p>
      ${createRankPillHtml('t2pct', 'total')}</td>
  <td><p>${totals.t3c}</p>
      ${createRankPillHtml('t3c', 'total')}</td>
  <td><p>${totals.t3i}</p>
      ${createRankPillHtml('t3i', 'total')}</td>
  <td><p>${totalT3Pct}</p>
      ${createRankPillHtml('t3pct', 'total')}</td>
  <td><p>${totals.tlc}</p>
      ${createRankPillHtml('tlc', 'total')}</td>
  <td><p>${totals.tli}</p>
      ${createRankPillHtml('tli', 'total')}</td>
  <td><p>${totalTLPct}</p>
      ${createRankPillHtml('tlpct', 'total')}</td>
  <td><p>${totals.ro}</p>
      ${createRankPillHtml('ro', 'total')}</td>
  <td><p>${totals.rd}</p>
      ${createRankPillHtml('rd', 'total')}</td>
  <td><p>${totals.rt}</p>
      ${createRankPillHtml('rt', 'total')}</td>
  <td><p>${totals.as}</p>
      ${createRankPillHtml('as', 'total')}</td>
  <td><p>${totals.br}</p>
      ${createRankPillHtml('br', 'total')}</td>
  <td><p>${totals.bp}</p>
      ${createRankPillHtml('bp', 'total')}</td>
  <td><p>${totals.tp}</p>
      ${createRankPillHtml('tp', 'total')}</td>
  <td><p>${totals.fc}</p>
      ${createRankPillHtml('fc', 'total')}</td>
  <td><p>${totals.va}</p>
      ${createRankPillHtml('va', 'total')}</td>
  <td style="text-align:center;">
  <p>${totals.pm}</p>
      ${createRankPillHtml('pm', 'total')}</td>`;
  tbody.appendChild(totalRow);
  const avgRow=document.createElement('tr'); 
  avgRow.className='prom-row'; 
  
  avgRow.innerHTML=`<td colspan="3">PROMEDIO</td>
  <td><p style="text-align:center;">${(totals.pts/games).toFixed(1)}</p>
      ${createRankPillHtml('pts', 'pergame')}</td>
  <td><p style="text-align:center;">${(totals.t2c/games).toFixed(1)}</p>
      ${createRankPillHtml('t2c', 'pergame')}</td>
  <td><p style="text-align:center;">${(totals.t2i/games).toFixed(1)}</p>
      ${createRankPillHtml('t2i', 'pergame')}</td>
  <td><p>${totalT2Pct}</p>
      ${createRankPillHtml('t2pct', 'pergame')}</td>
  <td><p>${(totals.t3c/games).toFixed(1)}</p>
      ${createRankPillHtml('t3c', 'pergame')}</td>
  <td><p>${(totals.t3i/games).toFixed(1)}</p>
      ${createRankPillHtml('t3i', 'pergame')}</td>
  <td><p>${totalT3Pct}</p>
      ${createRankPillHtml('t3pct', 'pergame')}</td>
  <td><p>${(totals.tlc/games).toFixed(1)}</p>
      ${createRankPillHtml('tlc', 'pergame')}</td>
  <td><p>${(totals.tli/games).toFixed(1)}</p>
      ${createRankPillHtml('tli', 'pergame')}</td>
  <td><p>${totalTLPct}</p>
      ${createRankPillHtml('tlpct', 'pergame')}</td>
  <td><p>${(totals.ro/games).toFixed(1)}</p>
      ${createRankPillHtml('ro', 'pergame')}</td>
  <td><p>${(totals.rd/games).toFixed(1)}</p>
      ${createRankPillHtml('rd', 'pergame')}</td>
  <td><p>${(totals.rt/games).toFixed(1)}</p>
      ${createRankPillHtml('rt', 'pergame')}</td>
  <td><p>${(totals.as/games).toFixed(1)}</p>
      ${createRankPillHtml('as', 'pergame')}</td>
  <td><p>${(totals.br/games).toFixed(1)}</p>
      ${createRankPillHtml('br', 'pergame')}</td>
  <td><p>${(totals.bp/games).toFixed(1)}</p>
      ${createRankPillHtml('bp', 'pergame')}</td>
  <td><p>${(totals.tp/games).toFixed(1)}</p>
      ${createRankPillHtml('tp', 'pergame')}</td>
  <td><p>${(totals.fc/games).toFixed(1)}</p>
      ${createRankPillHtml('fc', 'pergame')}</td>
  <td><p>${(totals.va/games).toFixed(1)}</p>
      ${createRankPillHtml('va', 'pergame')}</td>
  <td><p>${(totals.pm/games).toFixed(1)}</p>
      ${createRankPillHtml('pm', 'pergame')}</td>`; 
  
  tbody.appendChild(avgRow);

  table.appendChild(tbody);
  container.appendChild(table);

  // ----- Sorting -----
  let currentSort={column:null,direction:'desc'};
  function getColumnIndex(key){const headers=[...thead.querySelectorAll('th')];return headers.findIndex(th=>th.getAttribute('data-sort')===key);}  
  
  // Function to update sort indicators
  function updateSortIndicators(column, direction) {
    // Remove all existing indicators
    thead.querySelectorAll('th[data-sort]').forEach(th => {
      th.innerHTML = th.innerHTML.replace(/[\u25BC\u25B2]$/, ''); // Remove existing arrows
    });
    
    // Add indicator to current sort column
    if (column) {
      const currentHeader = thead.querySelector(`th[data-sort="${column}"]`);
      if (currentHeader) {
        const arrow = direction === 'asc' ? ' \u25B2' : ' \u25BC';
        currentHeader.innerHTML += arrow;
      }
    }
  }
  
  function sortTable(col){
    const allRows=[...tbody.querySelectorAll('tr')];
    const dataRows=allRows.filter(r=>!r.classList.contains('total-row')&&!r.classList.contains('prom-row'));
    const totalRow=tbody.querySelector('.total-row');
    const promRow=tbody.querySelector('.prom-row');
    if(currentSort.column===col){currentSort.direction=currentSort.direction==='asc'?'desc':'asc';}else{currentSort.column=col;currentSort.direction='desc';}
    
    // Update visual indicators
    updateSortIndicators(currentSort.column, currentSort.direction);
    
    dataRows.sort((a,b)=>{
      const idx=getColumnIndex(col);
      let aVal,bVal;
      if(col==='fecha'){
        // Handle both formats: dd-mm-yyyy and dd/mm/yyyy
        const aDateText = a.children[idx].textContent.trim();
        const bDateText = b.children[idx].textContent.trim();
        
        // Try hyphen format first (dd-mm-yyyy)
        let aParts = aDateText.split('-');
        let bParts = bDateText.split('-');
        
        // If no hyphens found, try slash format (dd/mm/yyyy)
        if (aParts.length !== 3) {
          aParts = aDateText.split('/');
        }
        if (bParts.length !== 3) {
          bParts = bDateText.split('/');
        }
        
        // Parse as day-month-year format
        const [aDay, aMonth, aYear] = aParts.map(Number);
        const [bDay, bMonth, bYear] = bParts.map(Number);
        
        aVal = new Date(aYear, aMonth - 1, aDay).getTime();
        bVal = new Date(bYear, bMonth - 1, bDay).getTime();
      }else{
        aVal=parseFloat(a.children[idx].textContent)||0;
        bVal=parseFloat(b.children[idx].textContent)||0;
      }
      return currentSort.direction==='asc'?aVal-bVal:bVal-aVal;
    });
    // Reattach in new order
    dataRows.forEach(r=>tbody.appendChild(r));
    // Ensure total and average rows stay at bottom
    if(totalRow) tbody.appendChild(totalRow);
    if(promRow) tbody.appendChild(promRow);
  }
  thead.querySelectorAll('th[data-sort]').forEach(th=>{th.style.cursor='pointer'; th.addEventListener('click',()=>sortTable(th.getAttribute('data-sort')));});
}

// ---------------- TEAM RECORDS (Records Tab) ----------------
function getRivalTeamLogo(rivalTeamName, allPlayers) {
  // Find a player from the rival team to get their team logo
  const rivalPlayer = allPlayers.find(p => p.teamName === rivalTeamName);
  return rivalPlayer ? rivalPlayer.teamLogo : null;
}

function renderTeamRecords() {
  if (!Array.isArray(teamMatches) || teamMatches.length === 0) return;
  
  // Get all players data to find rival team logos
  const allPlayers = window.allPlayersData || [];
  
  // Define record types with their corresponding fields
  const recordTypes = [
    { type: 'pts', label: 'Puntos', field: 'pts' },
    { type: 'reb', label: 'Rebotes', field: 'rt' },
    { type: 'ast', label: 'Asistencias', field: 'as' },
    { type: 'rob', label: 'Robos', field: 'br' },
    { type: 'tap', label: 'Tapones', field: 'tp' },
    { type: '3pm', label: 'Triples', field: 't3c' },
    { type: 'tla', label: 'Tiros Libres', field: 'tlc' },
    { type: 't2c', label: 'Tiros de 2', field: 't2c' },
    { type: 'val', label: 'Valoración', field: 'va' }
  ];

  recordTypes.forEach(record => {
    const recordCards = document.querySelectorAll(`.record-card-${record.type}`);
    if (recordCards.length > 0) {
      // Find match with max value for this stat
      const maxMatch = teamMatches.reduce((max, match) => 
        match[record.field] > max[record.field] ? match : max, 
        teamMatches[0]
      );

      recordCards.forEach(card => {
        // Hide card if max value is 0
        if (maxMatch[record.field] === 0) {
          card.style.display = 'none';
          return;
        }

        // Get rival team logo
        const rivalLogo = getRivalTeamLogo(maxMatch.rival, allPlayers);

        // Update record value
        card.querySelector('.record-value').textContent = maxMatch[record.field];
        
        // Update record details with rival logo
        card.querySelector('.record-details').innerHTML = `
          <p>Rival: ${toTitleCase(maxMatch.rival)}</p>
          <p>Fecha: ${maxMatch.matchDate}</p>
          <a href="ficha.html?gameId=${maxMatch.game_id}">Ir al partido</a>
          <div class="rival-logo-container">
            <span class="vs-text">vs</span>
            <div class="rival-logo-circle">
              <img src="${rivalLogo || 'team_icon.png'}" alt="Logo ${toTitleCase(maxMatch.rival)}" class="rival-logo" onerror="this.src='team_icon.png'">
            </div>
          </div>
        `;
      });
    }
  });
}

// Render team players in Plantilla tab
function renderTeamPlayers() {
  const container = document.getElementById('teamPlayersContainer');
  if (!container || !Array.isArray(teamPlayers) || teamPlayers.length === 0) return;
  
  container.innerHTML = '';

  // Get teamId for filtering matches
  const { teamId } = getTeamParams();
  
  // Calculate averages for all players and sort by rating
  const playersWithAverages = teamPlayers.map(player => {
    // Filter matches to only include those played for this specific team and competition
    const filteredMatches = player.matches.filter(match => 
      match.playerTeamId === teamId && match.competition === teamCompetition
    );
    
    const totalGames = filteredMatches.length;
    
    // Calculate total minutes from all filtered matches
    let totalMinutes = 0;
    let totalPoints = 0;
    let totalRebounds = 0;
    let totalAssists = 0;
    let totalRating = 0;
    filteredMatches.forEach(match => {
      if (match.minutes) {
        totalMinutes += parseMinutes(match.minutes);
      }
      totalPoints += match.pts || 0;
      totalRebounds += match.rt || 0;
      totalAssists += match.as || 0;
      totalRating += match.va || 0;
    });
    
    const avgMinutes = totalGames > 0 ? totalMinutes / totalGames : 0;
    const avgPoints = totalGames > 0 ? totalPoints / totalGames : 0;
    const avgRebounds = totalGames > 0 ? totalRebounds / totalGames : 0;
    const avgAssists = totalGames > 0 ? totalAssists / totalGames : 0;
    const avgRating = totalGames > 0 ? totalRating / totalGames : 0;
    
    return {
      ...player,
      avgMinutes,
      avgPoints,
      avgRebounds,
      avgAssists,
      avgRating,
      totalGames
    };
  });
  
  // Sort players by average rating (highest to lowest)
  playersWithAverages.sort((a, b) => b.avgRating - a.avgRating);
  
  playersWithAverages.forEach(player => {
    // Create player card
    const playerCard = document.createElement('div');
    playerCard.className = 'player-card';
    
    playerCard.innerHTML = `
      <a href="player_profile.html?player_id=${player.id}" class="player-card-link">
        <div class="player-card-header">
          <div class="player-photo-container">
            <img src="${player.playerPhoto || 'player_placeholder.png'}" 
                 alt="${player.playerName}" 
                 onerror="this.src='player_placeholder.png'">
          </div>
          <div class="player-info">
            <h3 class="player-name">${toTitleCase(player.playerName)}</h3>
            <p class="player-dorsal">Dorsal: ${player.dorsal || 'N/A'}</p>
          </div>
        </div>
        <p style="text-align: center;">Promedios</p>
        <div class="player-stats">
          <div class="stat-item">
            <div class="stat-value">${formatMinutes(player.avgMinutes)}</div>
            <div class="stat-label">Min</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${player.avgPoints.toFixed(1)}</div>
            <div class="stat-label">Pts</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${player.avgRebounds.toFixed(1)}</div>
            <div class="stat-label">Reb</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${player.avgAssists.toFixed(1)}</div>
            <div class="stat-label">Ast</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${player.avgRating.toFixed(1)}</div>
            <div class="stat-label">Val</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${player.totalGames}</div>
            <div class="stat-label">Partidos</div>
          </div>
        </div>
      </a>
    `;
    
    container.appendChild(playerCard);
  });
}

// ... (at the end of the file, before the final DOMContentLoaded listener)

function setupTeamSearchBar(players) {
    const searchInput = document.getElementById('teamSearchInput');
    const searchResults = document.getElementById('teamSearchResults');

    if (!searchInput) return;

    const allTeamsForSearch = [];
    const processedTeams = new Set(); 

    players.forEach(player => {
        player.matches.forEach(match => {
            const competition = match.competition;
            const teamId = match.playerTeamId;

            // Find the canonical name for this teamId
            const teamOwnerPlayer = players.find(p => p.teamId === teamId);
            if (teamOwnerPlayer) {
                const teamName = teamOwnerPlayer.teamName;
                const teamLogo = teamOwnerPlayer.teamLogo;
                const key = `${teamName}-${competition}`;
                if (!processedTeams.has(key)) {
                    allTeamsForSearch.push({
                        id: teamId,
                        name: teamName,
                        competition: competition,
                        logo: teamLogo
                    });
                    processedTeams.add(key);
                }
            }
        });
    });
    
    // Sort for consistent display
    allTeamsForSearch.sort((a, b) => a.name.localeCompare(b.name));

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase().trim();
        if (query.length < 2) {
            searchResults.style.display = 'none';
            return;
        }

        const filteredTeams = allTeamsForSearch.filter(team => 
            team.name.toLowerCase().includes(query)
        );

        searchResults.innerHTML = '';
        if (filteredTeams.length > 0) {
            filteredTeams.slice(0, 10).forEach(team => { // Limit to 10 results
                const resultItem = document.createElement('a');
                resultItem.href = `team_profile.html?team_id=${team.id}`;
                resultItem.classList.add('search-result-item');
                resultItem.innerHTML = `
                    <div class="search-result-logo-container">
                      <img src="${team.logo || 'team_icon.png'}" alt="${team.name} Logo" class="search-result-logo" onerror="this.src='team_icon.png'">
                    </div>
                    <div class="search-result-info">
                      <span class="search-result-name">${toTitleCase(team.name)}</span>
                      <span class="search-result-context">(${formatCompetitionName(team.competition)})</span>
                    </div>
                `;
                searchResults.appendChild(resultItem);
            });
            searchResults.style.display = 'block';
        } else {
            searchResults.style.display = 'none';
        }
    });

    // Hide results when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchResults.contains(e.target) && e.target !== searchInput) {
            searchResults.style.display = 'none';
        }
    });
}

window.addEventListener('DOMContentLoaded', loadTeamInfo); 

// ------------------- HELPER: OBTENER LOGO DE EQUIPO -------------------
function getTeamLogo(teamId) {
  if (!window.allPlayersData) return 'team_icon.png';
  const player = window.allPlayersData.find(p => {
    if (p.teamId === teamId) return true;
    for (let i = 1; i < 10; i++) {
      if (p[`teamId_${i}`] === teamId) return true;
    }
    return false;
  });
  if (!player) return 'team_icon.png';
  return (player.teamLogo && player.teamLogo.trim() !== '') ? player.teamLogo : 'team_icon.png';
}

// ------------------- LINEUPS FUNCTIONALITY -------------------
let lineupPlayerPhotos = {};
let lineupTableData = {};
let currentLineupType = 'five';
let selectedLineupPlayers = new Set();
let selectedLineupPlayersOff = new Set();
let allLineupPlayers = new Set();
let showLineupPer100 = false;
let minLineupPossessions = null;
let maxLineupPossessions = null;
let visibleLineupColumns = new Set(['PTS', 'PTSC', 'T2I', 'T2C', 'T3I', 'T3C', 'T1I', 'T1C', 
                            'AST', 'REB', 'REBD', 'REBO', 'PER', 'ROB', 'TAP', 'TAPC', 
                            'FC', 'FR', 'T2CC', 'T3CC', 'T1CC', 'REBDC', 'REBOC', '+/-', 'Posesiones']);
let currentLineupSort = {
    column: null,
    direction: 'desc'
};

// Competition mapping for lineup files (similar to shots mapping)
const lineupCompetitionMappings = {
  "LF CHALLENGE": "lineups_lf_challenge.json.csv",
  "C ESP CLUBES JR MASC": "lineups_c_esp_clubes_jr_masc.json.csv",
  "PRIMERA FEB": "lineups_primera_feb.json.csv",
  "Fase Final 1ª División Femenin": "lineups_fase_final_1a_división_femenin.json.csv",
  "C ESP CLUBES CAD MASC": "lineups_c_esp_clubes_cad_masc.json.csv",
  "LF ENDESA": "lineups_lf_endesa.json.csv",
  "L.F.-2": "lineups_lf2.json.csv",
  "C ESP CLUBES CAD FEM": "lineups_c_esp_clubes_cad_fem.json.csv",
  "SEGUNDA FEB": "lineups_segunda_feb.json.csv",
  "TERCERA FEB": "lineups_tercera_feb.json.csv",
  "C ESP CLUBES INF FEM": "lineups_c_esp_clubes_inf_fem.json.csv",
  "C ESP CLUBES INF MASC": "lineups_c_esp_clubes_inf_masc.json.csv",
  "C ESP CLUBES MINI MASC": "lineups_c_esp_clubes_mini_masc.json.csv",
  "C ESP CLUBES MINI FEM": "lineups_c_esp_clubes_mini_fem.json.csv"
};

// Initialize lineups functionality
async function initializeLineups() {
  // Load player photos for lineups
  await loadLineupPlayerPhotos();
  
  // Set up event listeners
  setupLineupEventListeners();
  
  // Load lineup data
  await loadAllLineupData();
}

async function loadLineupPlayerPhotos() {
  try {
    const response = await fetch('Lineups/player_photos.json');
    const photosData = await response.json();
    
    // Convert the data structure to a more usable format
    lineupPlayerPhotos = {};
    Object.keys(photosData).forEach(playerId => {
      const playerInfo = photosData[playerId];
      if (Array.isArray(playerInfo) && playerInfo.length >= 2) {
        lineupPlayerPhotos[playerId] = {
          photo: playerInfo[0],
          name: playerInfo[1]
        };
      }
    });
  } catch (error) {
    console.error('Error loading player photos:', error);
    lineupPlayerPhotos = {};
  }
}

function setupLineupEventListeners() {
  // Lineup type tabs
  document.querySelectorAll('.lineup-tab-button').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.lineup-tab-button').forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      currentLineupType = button.dataset.lineup;
      // Reset selected players when changing lineup type
      selectedLineupPlayers.clear();
      selectedLineupPlayersOff.clear();
      updateLineupPlayerCheckboxes();
      if (lineupTableData[currentLineupType]) {
        // Reset sort to default (PTS descending) when switching tabs
        currentLineupSort = {
          column: 'PTS',
          direction: 'desc'
        };
        renderLineupTable(lineupTableData[currentLineupType]);
      }
      updateLineupTableHeaders();
    });
  });

  // Per 100 toggle
  const per100Toggle = document.getElementById('lineupPer100Toggle');
  if (per100Toggle) {
    per100Toggle.addEventListener('change', () => {
      showLineupPer100 = per100Toggle.checked;
      if (lineupTableData[currentLineupType]) {
        renderLineupTable(lineupTableData[currentLineupType]);
      }
    });
  }

  // Column selector dropdown
  const dropdownButton = document.querySelector('.lineup-column-selector .dropdown-button');
  const dropdownContent = document.querySelector('.lineup-column-selector .dropdown-content');
  if (dropdownButton && dropdownContent) {
    dropdownButton.addEventListener('click', () => {
      dropdownContent.parentElement.classList.toggle('active');
    });
  }

  // Select all/deselect all columns
  const selectAllBtn = document.getElementById('lineupSelectAllColumns');
  const deselectAllBtn = document.getElementById('lineupDeselectAllColumns');
  if (selectAllBtn) {
    selectAllBtn.addEventListener('click', () => {
      document.querySelectorAll('.lineup-column-selector input[type="checkbox"]').forEach(cb => {
        cb.checked = true;
        visibleLineupColumns.add(cb.dataset.column);
      });
      updateLineupTableHeaders();
      if (lineupTableData[currentLineupType]) {
        renderLineupTable(lineupTableData[currentLineupType]);
      }
    });
  }
  if (deselectAllBtn) {
    deselectAllBtn.addEventListener('click', () => {
      document.querySelectorAll('.lineup-column-selector input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
        visibleLineupColumns.delete(cb.dataset.column);
      });
      updateLineupTableHeaders();
      if (lineupTableData[currentLineupType]) {
        renderLineupTable(lineupTableData[currentLineupType]);
      }
    });
  }

  // Column visibility checkboxes
  document.querySelectorAll('.lineup-column-selector input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) {
        visibleLineupColumns.add(cb.dataset.column);
      } else {
        visibleLineupColumns.delete(cb.dataset.column);
      }
      updateLineupTableHeaders();
      if (lineupTableData[currentLineupType]) {
        renderLineupTable(lineupTableData[currentLineupType]);
      }
    });
  });

  // Possession filters
  const minPossessionsInput = document.getElementById('lineupMinPossessions');
  const maxPossessionsInput = document.getElementById('lineupMaxPossessions');
  const resetPossessionsBtn = document.getElementById('lineupResetPossessions');

  if (minPossessionsInput) {
    minPossessionsInput.addEventListener('input', () => {
      minLineupPossessions = minPossessionsInput.value ? parseInt(minPossessionsInput.value) : null;
      if (lineupTableData[currentLineupType]) {
        renderLineupTable(lineupTableData[currentLineupType]);
      }
    });
  }

  if (maxPossessionsInput) {
    maxPossessionsInput.addEventListener('input', () => {
      maxLineupPossessions = maxPossessionsInput.value ? parseInt(maxPossessionsInput.value) : null;
      if (lineupTableData[currentLineupType]) {
        renderLineupTable(lineupTableData[currentLineupType]);
      }
    });
  }

  if (resetPossessionsBtn) {
    resetPossessionsBtn.addEventListener('click', () => {
      minLineupPossessions = null;
      maxLineupPossessions = null;
      minPossessionsInput.value = '';
      maxPossessionsInput.value = '';
      if (lineupTableData[currentLineupType]) {
        renderLineupTable(lineupTableData[currentLineupType]);
      }
    });
  }

  // Collapsible sections
  document.querySelectorAll('.lineup-filter-section .collapsible-header').forEach(header => {
    header.addEventListener('click', () => {
      const section = header.parentElement;
      section.classList.toggle('collapsed');
    });
  });

  // Scroll arrows
  const scrollLeftBtn = document.getElementById('lineupScrollLeft');
  const scrollRightBtn = document.getElementById('lineupScrollRight');
  const tableWrapper = document.querySelector('.lineup-table-container .table-scroll-wrapper');

  if (scrollLeftBtn && tableWrapper) {
    scrollLeftBtn.addEventListener('click', () => {
      tableWrapper.scrollBy({ left: -200, behavior: 'smooth' });
    });
  }

  if (scrollRightBtn && tableWrapper) {
    scrollRightBtn.addEventListener('click', () => {
      tableWrapper.scrollBy({ left: 200, behavior: 'smooth' });
    });
  }

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.lineup-column-selector')) {
      document.querySelector('.lineup-column-selector .dropdown').classList.remove('active');
    }
  });
}

async function loadAllLineupData() {
  const { teamId } = getTeamParams();
  if (!teamId || !teamCompetition) {
    console.error('No team ID or competition found for lineups');
    return;
  }

  const csvFileName = lineupCompetitionMappings[teamCompetition.trim()];
  if (!csvFileName) {
    console.error('No lineup file found for competition:', teamCompetition);
    return;
  }

  try {
    const response = await fetch(`Lineups/${csvFileName}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const csvText = await response.text();
    const csvData = Papa.parse(csvText, { header: true });
    
    // Filter data by team_id
    const teamLineups = csvData.data.filter(row => row.team_id === teamId);
    
    // Group by n_jug (number of players)
    lineupTableData = {
      'five': [],
      'four': [],
      'three': [],
      'two': []
    };

    teamLineups.forEach(row => {
      const numPlayers = parseInt(row.n_jug);
      let lineupType;
      
      switch (numPlayers) {
        case 5: lineupType = 'five'; break;
        case 4: lineupType = 'four'; break;
        case 3: lineupType = 'three'; break;
        case 2: lineupType = 'two'; break;
        default: return; // Skip invalid lineup sizes
      }
      
      // Convert lineup string to player names
      const playerIds = row.lineup.split(' - ');
      const playerNames = playerIds.map(id => {
        const playerInfo = lineupPlayerPhotos[id];
        return playerInfo ? playerInfo.name : id;
      }).join(' - ');
      
      // Create lineup row with converted data
      const lineupRow = {
        Quinteto: playerNames,
        PTS: parseFloat(row.PTS) || 0,
        PTSC: parseFloat(row.PTSC) || 0,
        T2I: parseFloat(row.T2I) || 0,
        T2C: parseFloat(row.T2C) || 0,
        T3I: parseFloat(row.T3I) || 0,
        T3C: parseFloat(row.T3C) || 0,
        T1I: parseFloat(row.T1I) || 0,
        T1C: parseFloat(row.T1C) || 0,
        AST: parseFloat(row.AST) || 0,
        REB: parseFloat(row.REB) || 0,
        REBD: parseFloat(row.REBD) || 0,
        REBO: parseFloat(row.REBO) || 0,
        PER: parseFloat(row.PER) || 0,
        ROB: parseFloat(row.ROB) || 0,
        TAP: parseFloat(row.TAP) || 0,
        TAPC: parseFloat(row.TAPC) || 0,
        FC: parseFloat(row.FC) || 0,
        FR: parseFloat(row.FR) || 0,
        T2CC: parseFloat(row.T2CC) || 0,
        T3CC: parseFloat(row.T3CC) || 0,
        T1CC: parseFloat(row.T1CC) || 0,
        REBDC: parseFloat(row.REBDC) || 0,
        REBOC: parseFloat(row.REBOC) || 0,
        '+/-': parseFloat(row['+/-']) || 0,
        Posesiones: parseFloat(row.Posesiones) || 0,
        // Store original player IDs for filtering
        playerIds: playerIds
      };
      
      lineupTableData[lineupType].push(lineupRow);
    });
    
    // Collect all unique players from the data
    Object.values(lineupTableData).forEach(data => {
      data.forEach(row => {
        if (row.playerIds) {
          row.playerIds.forEach(playerId => allLineupPlayers.add(playerId));
        }
      });
    });
    
    updateLineupPlayerCheckboxes();
    if (lineupTableData[currentLineupType]) {
      // Set default sort to PTS descending
      currentLineupSort = {
        column: 'PTS',
        direction: 'desc'
      };
      renderLineupTable(lineupTableData[currentLineupType]);
    }
    updateLineupTableHeaders();
    
  } catch (error) {
    console.error('Error loading lineup data:', error);
    // Fallback to sample data if loading fails
    createSampleLineupData();
  }
}

function createSampleLineupData() {
  // Create sample data for demonstration (fallback)
  const samplePlayers = teamPlayers ? teamPlayers.slice(0, 8).map(p => p.playerName) : ['Player 1', 'Player 2', 'Player 3', 'Player 4', 'Player 5'];
  
  lineupTableData = {
    'five': [],
    'four': [],
    'three': [],
    'two': []
  };
}

function calculateLineupPer100(value, possessions) {
  if (!possessions || possessions === 0) return 0;
  return (value / possessions) * 100;
}

function formatLineupNumber(value, column) {
  if (showLineupPer100 && column !== 'Posesiones') {
    return value.toFixed(1);
  }
  
  const num = parseFloat(value) || 0;
  
  // For Posesiones column, always show as integer
  if (column === 'Posesiones') {
    return Math.round(num).toString();
  }
  
  // For other columns in 5-player lineups, show as is
  if (currentLineupType === 'five') {
    return value || '0';
  }
  
  // For sub-lineups, round to integer
  return Math.round(num).toString();
}

function showLineupErrorModal(message) {
  const modal = document.getElementById('lineupErrorModal');
  const modalMessage = document.getElementById('lineupModalMessage');
  const closeButton = modal.querySelector('.close-modal');
  const modalCloseButton = document.getElementById('lineupModalCloseButton');
  
  modalMessage.textContent = message;
  modal.classList.add('show');
  
  const closeModal = () => {
    modal.classList.remove('show');
  };
  
  closeButton.onclick = closeModal;
  modalCloseButton.onclick = closeModal;
  modal.onclick = (e) => {
    if (e.target === modal) {
      closeModal();
    }
  };
}

function updateLineupPlayerCheckboxes() {
  const playerCheckboxes = document.getElementById('lineupPlayerCheckboxes');
  const playerOffCheckboxes = document.getElementById('lineupPlayerOffCheckboxes');
  const filterInfo = document.getElementById('lineupPlayerFilterInfo');
  const filterOffInfo = document.getElementById('lineupPlayerOffFilterInfo');
  
  if (!playerCheckboxes || !playerOffCheckboxes) return;
  
  // Clear existing checkboxes
  playerCheckboxes.innerHTML = '';
  playerOffCheckboxes.innerHTML = '';
  
  const maxPlayers = {
    'five': 5,
    'four': 4,
    'three': 3,
    'two': 2
  }[currentLineupType];
  
  // Add checkboxes for each player
  Array.from(allLineupPlayers).sort().forEach(playerId => {
    const playerInfo = lineupPlayerPhotos[playerId];
    const playerName = playerInfo ? playerInfo.name : playerId;
    const playerPhoto = playerInfo ? playerInfo.photo : 'player_placeholder.png';
    
    // On-court player checkbox
    const checkboxContainer = document.createElement('div');
    checkboxContainer.className = 'player-checkbox-container';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `lineup-player-${playerId}`;
    checkbox.value = playerId;
    checkbox.checked = selectedLineupPlayers.has(playerId);
    checkbox.disabled = !checkbox.checked && selectedLineupPlayers.size >= maxPlayers;
    
    const label = document.createElement('label');
    label.htmlFor = `lineup-player-${playerId}`;
    
    // Add player photo
    const photo = document.createElement('img');
    photo.className = 'filter-player-photo';
    photo.src = playerPhoto;
    photo.alt = playerName;
    photo.title = playerName;
    photo.onerror = function() { this.src = 'player_placeholder.png'; };
    
    // Add player name
    const name = document.createElement('span');
    name.textContent = playerName;
    
    label.appendChild(photo);
    label.appendChild(name);
    
    checkboxContainer.appendChild(checkbox);
    checkboxContainer.appendChild(label);
    playerCheckboxes.appendChild(checkboxContainer);
    
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        if (selectedLineupPlayers.size < maxPlayers) {
          if (selectedLineupPlayersOff.has(playerId)) {
            showLineupErrorModal(`No se puede seleccionar a ${playerName} en pista y fuera de pista al mismo tiempo. ¡Eso sería una paradoja de la física!`);
            checkbox.checked = false;
            return;
          }
          selectedLineupPlayers.add(playerId);
        }
      } else {
        selectedLineupPlayers.delete(playerId);
      }
      updateLineupPlayerCheckboxes();
      updateLineupFilterInfo();
      if (lineupTableData[currentLineupType]) {
        renderLineupTable(lineupTableData[currentLineupType]);
      }
    });

    // Off-court player checkbox
    const checkboxContainerOff = document.createElement('div');
    checkboxContainerOff.className = 'player-checkbox-container';
    
    const checkboxOff = document.createElement('input');
    checkboxOff.type = 'checkbox';
    checkboxOff.id = `lineup-player-off-${playerId}`;
    checkboxOff.value = playerId;
    checkboxOff.checked = selectedLineupPlayersOff.has(playerId);
    
    const labelOff = document.createElement('label');
    labelOff.htmlFor = `lineup-player-off-${playerId}`;
    
    // Add player photo
    const photoOff = document.createElement('img');
    photoOff.className = 'filter-player-photo';
    photoOff.src = playerPhoto;
    photoOff.alt = playerName;
    photoOff.title = playerName;
    photoOff.onerror = function() { this.src = 'player_placeholder.png'; };
    
    // Add player name
    const nameSpanOff = document.createElement('span');
    nameSpanOff.textContent = playerName;
    
    labelOff.appendChild(photoOff);
    labelOff.appendChild(nameSpanOff);
    
    checkboxContainerOff.appendChild(checkboxOff);
    checkboxContainerOff.appendChild(labelOff);
    playerOffCheckboxes.appendChild(checkboxContainerOff);
    
    checkboxOff.addEventListener('change', () => {
      if (checkboxOff.checked) {
        if (selectedLineupPlayers.has(playerId)) {
          showLineupErrorModal(`No se puede seleccionar a ${playerName} en pista y fuera de pista al mismo tiempo. ¡Eso sería una paradoja de la física!`);
          checkboxOff.checked = false;
          return;
        }
        selectedLineupPlayersOff.add(playerId);
      } else {
        selectedLineupPlayersOff.delete(playerId);
      }
      updateLineupPlayerCheckboxes();
      updateLineupFilterOffInfo();
      if (lineupTableData[currentLineupType]) {
        renderLineupTable(lineupTableData[currentLineupType]);
      }
    });
  });
  
  updateLineupFilterInfo();
  updateLineupFilterOffInfo();
}

function updateLineupFilterInfo() {
  const filterInfo = document.getElementById('lineupPlayerFilterInfo');
  if (!filterInfo) return;
  
  const maxPlayers = {
    'five': 5,
    'four': 4,
    'three': 3,
    'two': 2
  }[currentLineupType];
  
  if (selectedLineupPlayers.size === 0) {
    filterInfo.textContent = `Selecciona hasta ${maxPlayers} jugadores para filtrar los quintetos/subquintetos`;
  } else {
    const selectedNames = Array.from(selectedLineupPlayers).map(playerId => {
      const playerInfo = lineupPlayerPhotos[playerId];
      return playerInfo ? playerInfo.name : playerId;
    });
    filterInfo.textContent = `Mostrando quintetos/subquintetos con ${selectedNames.join(', ')} (${selectedLineupPlayers.size}/${maxPlayers})`;
  }
}

function updateLineupFilterOffInfo() {
  const filterOffInfo = document.getElementById('lineupPlayerOffFilterInfo');
  if (!filterOffInfo) return;
  
  if (selectedLineupPlayersOff.size === 0) {
    filterOffInfo.textContent = 'Selecciona jugadores que NO deben estar en pista';
  } else {
    const selectedNames = Array.from(selectedLineupPlayersOff).map(playerId => {
      const playerInfo = lineupPlayerPhotos[playerId];
      return playerInfo ? playerInfo.name : playerId;
    });
    filterOffInfo.textContent = `Excluyendo quintetos/subquintetos con ${selectedNames.join(', ')}`;
  }
}

function filterLineups(data) {
  return data.filter(row => {
    if (!row.playerIds) return false;
    
    // Check if all selected on-court players are in the lineup
    if (selectedLineupPlayers.size > 0) {
      const hasAllSelected = Array.from(selectedLineupPlayers).every(playerId => 
        row.playerIds.includes(playerId)
      );
      if (!hasAllSelected) return false;
    }
    
    // Check if any selected off-court players are in the lineup
    if (selectedLineupPlayersOff.size > 0) {
      const hasOffCourtPlayer = Array.from(selectedLineupPlayersOff).some(playerId => 
        row.playerIds.includes(playerId)
      );
      if (hasOffCourtPlayer) return false;
    }
    
    // Check possession filter
    if (minLineupPossessions && row.Posesiones < minLineupPossessions) return false;
    if (maxLineupPossessions && row.Posesiones > maxLineupPossessions) return false;
    
    return true;
  });
}

function getLineupColumnStats(data, column, usePer100 = false) {
  const values = data.map(row => {
    let value = parseFloat(row[column]) || 0;
    if (usePer100 && column !== 'Posesiones') {
      value = calculateLineupPer100(value, row.Posesiones);
    }
    return value;
  });
  return {
    min: Math.min(...values),
    max: Math.max(...values)
  };
}

function getLineupColorForValue(value, min, max) {
  if (max === min) return 'rgba(0, 123, 255, 0.1)';
  const normalized = (value - min) / (max - min);
  const hue = 0 + normalized * 120; // Red (0°) to green (120°)
  return `hsla(${hue}, 70%, 50%, 0.1)`;
}

function renderLineupTable(data) {
  const tableBody = document.getElementById('lineupTableBody');
  if (!tableBody) return;
  
  const filteredData = filterLineups(data);
  
  // Sort by PTS in descending order by default
  filteredData.sort((a, b) => (b.PTS || 0) - (a.PTS || 0));
  
  tableBody.innerHTML = '';
  
  filteredData.forEach(row => {
    const tr = document.createElement('tr');
    
    // Players column
    const playersCell = document.createElement('td');
    const players = row.Quinteto.split(' - ');
    const playerPhotosDiv = document.createElement('div');
    playerPhotosDiv.className = 'player-photos';
    
    players.forEach(playerName => {
      const playerContainer = document.createElement('div');
      playerContainer.className = 'player-container';
      
      // Find player ID by name
      const playerId = Object.keys(lineupPlayerPhotos).find(id => 
        lineupPlayerPhotos[id] && lineupPlayerPhotos[id].name === playerName
      );
      
      const photo = document.createElement('img');
      photo.className = 'player-photo';
      if (playerId && lineupPlayerPhotos[playerId]) {
        photo.src = lineupPlayerPhotos[playerId].photo;
      } else {
        photo.src = 'player_placeholder.png';
      }
      photo.alt = playerName;
      photo.title = playerName;
      photo.onerror = function() { this.src = 'player_placeholder.png'; };
      
      const name = document.createElement('span');
      name.className = 'lineup-player-name';
      // Show only the last name
      // trim name first
      const trimmedName = playerName.trim();
      const nameParts = trimmedName.split(' ');
      const lastName = nameParts[1];
      name.textContent = lastName;
      name.title = playerName; // Full name as tooltip
      
      playerContainer.appendChild(photo);
      playerContainer.appendChild(name);
      playerPhotosDiv.appendChild(playerContainer);
    });
    
    playersCell.appendChild(playerPhotosDiv);
    tr.appendChild(playersCell);
    
    // Stats columns
    const columns = ['PTS', 'PTSC', 'T2I', 'T2C', 'T3I', 'T3C', 'T1I', 'T1C', 'AST', 'REB', 'REBD', 'REBO', 'PER', 'ROB', 'TAP', 'TAPC', 'FC', 'FR', 'T2CC', 'T3CC', 'T1CC', 'REBDC', 'REBOC', '+/-', 'Posesiones'];
    
    columns.forEach(column => {
      if (!visibleLineupColumns.has(column)) return;
      
      const td = document.createElement('td');
      let value = parseFloat(row[column]) || 0;
      
      if (showLineupPer100 && column !== 'Posesiones') {
        value = calculateLineupPer100(value, row.Posesiones);
      }
      
      td.textContent = formatLineupNumber(value, column);
      
      // Add color coding for numeric columns
      if (column !== 'Posesiones' && !isNaN(value)) {
        const stats = getLineupColumnStats(filteredData, column, showLineupPer100);
        const color = getLineupColorForValue(value, stats.min, stats.max);
        td.style.backgroundColor = color;
      }
      
      tr.appendChild(td);
    });
    
    tableBody.appendChild(tr);
  });
  
  // Add sorting functionality
  addLineupTableSorting();
}

function addLineupTableSorting() {
  const headers = document.querySelectorAll('.lineup-table-container th');
  headers.forEach((header) => {
    // Avoid attaching multiple listeners
    if (header.dataset.sortListener === 'true') return;
    header.dataset.sortListener = 'true';
    header.addEventListener('click', () => {
      const column = header.textContent.trim();
      sortLineupTable(column, header);
    });
  });
}

function sortLineupTable(column, headerElement) {
  const tableBody = document.getElementById('lineupTableBody');
  if (!tableBody) return;

  const rows = Array.from(tableBody.querySelectorAll('tr'));

  if (currentLineupSort.column === column) {
    currentLineupSort.direction = currentLineupSort.direction === 'asc' ? 'desc' : 'asc';
  } else {
    currentLineupSort.column = column;
    currentLineupSort.direction = 'desc';
  }

  // Update sort indicators
  document.querySelectorAll('.lineup-table-container th').forEach(th => {
    th.classList.remove('sorted', 'asc', 'desc');
  });
  if (headerElement) {
    headerElement.classList.add('sorted', currentLineupSort.direction);
  }

  // Build the array of currently visible columns (excluding the first one which is always visible)
  const allStatColumns = ['PTS', 'PTSC', 'T2I', 'T2C', 'T3I', 'T3C', 'T1I', 'T1C', 'AST', 'REB', 'REBD', 'REBO', 'PER', 'ROB', 'TAP', 'TAPC', 'FC', 'FR', 'T2CC', 'T3CC', 'T1CC', 'REBDC', 'REBOC', '+/-', 'Posesiones'];
  const visibleStatColumns = allStatColumns.filter(col => visibleLineupColumns.has(col));

  // Determine the actual cell index for the column in the current visible table
  let cellIndex;
  if (column === 'Jugadores en pista') {
    cellIndex = 0; // The first column is always the players on court
  } else {
    const idxInVisible = visibleStatColumns.indexOf(column);
    if (idxInVisible === -1) return; // Column not visible, nothing to sort
    cellIndex = 1 + idxInVisible; // +1 to account for the players column
  }

  // Sort rows based on the determined cell index
  rows.sort((a, b) => {
    let aValue, bValue;

    if (cellIndex === 0) {
      // Sort alphabetically by lineup when sorting the players column
      aValue = a.cells[0].textContent;
      bValue = b.cells[0].textContent;
    } else {
      aValue = parseFloat(a.cells[cellIndex]?.textContent) || 0;
      bValue = parseFloat(b.cells[cellIndex]?.textContent) || 0;
    }

    if (currentLineupSort.direction === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Reorder rows in the DOM
  rows.forEach(row => tableBody.appendChild(row));
}

function updateLineupTableHeaders() {
  const headers = document.querySelectorAll('.lineup-table-container th');
  const columns = ['Jugadores en pista', 'PTS', 'PTSC', 'T2I', 'T2C', 'T3I', 'T3C', 'T1I', 'T1C', 'AST', 'REB', 'REBD', 'REBO', 'PER', 'ROB', 'TAP', 'TAPC', 'FC', 'FR', 'T2CC', 'T3CC', 'T1CC', 'REBDC', 'REBOC', '+/-', 'Posesiones'];
  
  headers.forEach((header, index) => {
    if (index === 0) return; // Always show first column
    
    const column = columns[index];
    if (visibleLineupColumns.has(column)) {
      header.style.display = '';
    } else {
      header.style.display = 'none';
    }
  });
  
  // Update column checkboxes to match
  document.querySelectorAll('.lineup-column-selector input[type="checkbox"]').forEach(cb => {
    const column = cb.dataset.column;
    cb.checked = visibleLineupColumns.has(column);
  });
}

// Initialize lineups when team info is loaded
function initializeLineupsAfterTeamLoad() {
  if (teamPlayers && teamPlayers.length > 0) {
    initializeLineups();
  }
}

window.addEventListener('DOMContentLoaded', loadTeamInfo);