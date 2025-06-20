// equipos.js

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
  if (nameMappings[comp && comp.trim()]) return nameMappings[comp.trim()];
  let formatted = (comp||"").replace(/_/g, ' ').replace(/\s+/g, ' ')
    .split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  return formatted;
}

let allTeams = [];
let filteredTeams = [];
let currentPage = 1;
const teamsPerPage = 50;

async function loadTeams() {
  const response = await fetch('rankings_stats.json');
  const data = await response.json();
  const teamsGrid = document.getElementById('teamsGrid');
  if (!teamsGrid) return;

  // Aggregate teams by teamId + competition
  const teamMap = new Map();
  data.players.forEach(player => {
    // For each teamId the player has
    const teamIds = [player.teamId];
    for (let i = 2; i < 10; i++) {
      if (player[`teamId_${i}`]) teamIds.push(player[`teamId_${i}`]);
    }
    teamIds.forEach(tid => {
      // Only consider matches for this team
      const matches = player.matches.filter(m => m.playerTeamId === tid);
      if (!matches.length) return;
      const comp = matches[0].competition;
      const key = `${tid}__${comp}`;
      if (!teamMap.has(key)) {
        teamMap.set(key, {
          teamId: tid,
          teamName: player.teamName,
          teamLogo: player.teamLogo,
          competition: comp,
          matches: [],
        });
      }
      teamMap.get(key).matches.push(...matches);
    });
  });

  // Calculate stats for each team
  allTeams = Array.from(teamMap.values()).map(team => {
    // --- Use same aggregation logic as team_profile.js to guarantee identical values ---
    const playersForTeam = data.players.filter(p => {
      if (p.teamId === team.teamId) return true;
      for (let i = 1; i < 10; i++) {
        if (p[`teamId_${i}`] === team.teamId) return true;
      }
      return false;
    });

    const matchesAgg = aggregateTeamMatchesDir(playersForTeam, team.competition, team.teamId);
    const validGames = matchesAgg.filter(g => g.pts > 0);
    const games = validGames.length || 1;

    let totalPts = 0, totalPtsAgainst = 0, totalPm = 0;
    validGames.forEach(m => {
      totalPts += m.pts;
      // points against and +/- from marcador
      const [ourPts, rivalPts] = m.marcador.split('-').map(Number);
      totalPtsAgainst += rivalPts;
      totalPm += (ourPts - rivalPts);
    });
    return {
      ...team,
      avgPts: (totalPts / games).toFixed(1),
      avgPtsAgainst: (totalPtsAgainst / games).toFixed(1),
      avgPm: (totalPm / games).toFixed(1),
    };
  });

  filteredTeams = allTeams.slice();
  renderTeamsGrid();
  renderPagination();
  setupTeamSearchBar();
}

function renderTeamsGrid() {
  const teamsGrid = document.getElementById('teamsGrid');
  if (!teamsGrid) return;
  filteredTeams.sort((a, b) => parseFloat(b.avgPm) - parseFloat(a.avgPm));
  const start = (currentPage - 1) * teamsPerPage;
  const end = start + teamsPerPage;
  const teamsToShow = filteredTeams.slice(start, end);
  teamsGrid.innerHTML = teamsToShow.map(team => `
    <a href="team_profile.html?team_id=${team.teamId}" class="team-card">
      <img src="${team.teamLogo || 'team_icon.png'}" alt="${team.teamName}" class="team-logo" onerror="this.src='team_icon.png'">
      <div class="team-name" title="${team.teamName}">${team.teamName}</div>
      <div class="team-league">${formatCompetitionName(team.competition)}</div>
      <div class="stats-title">Promedios</div>
      <div class="team-stats">
        <div class="team-stat-item">
          <div class="team-stat-value">${team.avgPts}</div>
          <div class="team-stat-label" title="Puntos anotados por partido">PTS</div>
        </div>
        <div class="team-stat-item">
          <div class="team-stat-value">${team.avgPtsAgainst}</div>
          <div class="team-stat-label" title="Puntos en contra por partido">PTSC</div>
        </div>
        <div class="team-stat-item">
          <div class="team-stat-value">${team.avgPm}</div>
          <div class="team-stat-label" title="Diferencia de puntos por partido">+/-</div>
        </div>
      </div>
    </a>
  `).join('');
}

function renderPagination() {
  const pagination = document.getElementById('teamsPagination');
  if (!pagination) return;
  const totalPages = Math.ceil(filteredTeams.length / teamsPerPage);
  if (totalPages <= 1) {
    pagination.innerHTML = '';
    return;
  }
  let html = '';
  html += `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">&laquo;</button>`;
  let start = Math.max(1, currentPage - 3);
  let end = Math.min(totalPages, currentPage + 3);
  if (currentPage <= 4) end = Math.min(7, totalPages);
  if (currentPage > totalPages - 4) start = Math.max(1, totalPages - 6);
  for (let i = start; i <= end; i++) {
    html += `<button class="page-btn${i === currentPage ? ' active' : ''}" data-page="${i}">${i}</button>`;
  }
  html += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">&raquo;</button>`;
  pagination.innerHTML = html;
  pagination.querySelectorAll('.page-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const page = Number(btn.dataset.page);
      if (page >= 1 && page <= totalPages && page !== currentPage) {
        currentPage = page;
        renderTeamsGrid();
        renderPagination();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });
}

function setupTeamSearchBar() {
  const searchInput = document.getElementById('teamSearchInput');
  const searchResults = document.getElementById('teamSearchResults');
  if (!searchInput) return;

  // Build search index
  const processedTeams = new Set();
  const allTeamsForSearch = allTeams.map(team => {
    const key = `${team.teamName}-${team.competition}`;
    if (!processedTeams.has(key)) {
      processedTeams.add(key);
      return {
        id: team.teamId,
        name: team.teamName,
        competition: team.competition,
        logo: team.teamLogo
      };
    }
    return null;
  }).filter(Boolean);

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase().trim();
    if (query.length < 2) {
      searchResults.style.display = 'none';
    } else {
      const filteredTeamsSearch = allTeamsForSearch.filter(team =>
        team.name.toLowerCase().includes(query)
      );
      searchResults.innerHTML = '';
      if (filteredTeamsSearch.length > 0) {
        filteredTeamsSearch.slice(0, 10).forEach(team => {
          const resultItem = document.createElement('a');
          resultItem.href = `team_profile.html?team_id=${team.id}`;
          resultItem.classList.add('search-result-item');
          resultItem.innerHTML = `
            <div class="search-result-logo-container">
              <img src="${team.logo || 'team_icon.png'}" alt="${team.name} Logo" class="search-result-logo" onerror="this.src='team_icon.png'">
            </div>
            <div class="search-result-info">
              <span class="search-result-name">${team.name}</span>
              <span class="search-result-context">(${formatCompetitionName(team.competition)})</span>
            </div>
          `;
          searchResults.appendChild(resultItem);
        });
        searchResults.style.display = 'block';
      } else {
        searchResults.style.display = 'none';
      }
    }
    // Filter grid as you type
    if (!query) {
      filteredTeams = allTeams.slice();
      currentPage = 1;
      renderTeamsGrid();
      renderPagination();
      return;
    }
    filteredTeams = allTeams.filter(team =>
      team.teamName.toLowerCase().includes(query)
    );
    currentPage = 1;
    renderTeamsGrid();
    renderPagination();
  });

  document.addEventListener('click', (e) => {
    if (!searchResults.contains(e.target) && e.target !== searchInput) {
      searchResults.style.display = 'none';
    }
  });
}

// Helper copied (simplified) from team_profile.js
function aggregateTeamMatchesDir(players, competitionFilter, teamIdFilter) {
  const matchMap = new Map();
  players.forEach(player => {
    player.matches.forEach(m => {
      if (competitionFilter && m.competition !== competitionFilter) return;
      if (teamIdFilter && m.playerTeamId !== teamIdFilter) return;

      const key = m.game_id;
      if (!matchMap.has(key)) {
        matchMap.set(key, {
          game_id: m.game_id,
          matchDate: m.matchDate.split(' - ')[0],
          rival: m.rival,
          marcador: m.marcador,
          pts: 0
        });
      }
      const agg = matchMap.get(key);
      agg.pts += m.pts;
    });
  });
  return Array.from(matchMap.values());
}

document.addEventListener('DOMContentLoaded', loadTeams); 