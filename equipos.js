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

// Estado global de filtros
const filters = {
  gender: "todos",
  competition: "todas",
  search: "",
  stats: {
    pts: { min: null, max: null },
    ptsc: { min: null, max: null },
    pm: { min: null, max: null }
  }
};

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
  setupFilters();
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
    filters.search = query;
    applyFilters();
  });

  document.addEventListener('click', (e) => {
    if (!searchResults.contains(e.target) && e.target !== searchInput) {
      searchResults.style.display = 'none';
    }
  });
}

// === Botón para subir arriba en Equipos ===
const scrollTopBtn = document.getElementById('teamsScrollTopBtn');
if (scrollTopBtn) {
  window.addEventListener('scroll', function() {
    if (window.scrollY > 300) {
      scrollTopBtn.style.display = 'block';
    } else {
      scrollTopBtn.style.display = 'none';
    }
  });
  scrollTopBtn.addEventListener('click', function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// Sistema de filtros
function setupFilters() {
  initializeGenderFilters();
  initializeCompetitionFilters();
  setupFilterEventListeners();
  setupAllToggleButtons();
}

function initializeGenderFilters() {
  // Marcar "Todos" como activo por defecto
  const todosBtn = document.querySelector('.gender-btn[data-gender="todos"]');
  if (todosBtn) todosBtn.classList.add('active');
}

// === Indicador de filtros activos (puntito) ===
function updateFiltersIndicator() {
  const btn = document.getElementById('openFiltersBtn');
  const f = filters;
  const hasActive = (f.gender && f.gender !== 'todos') ||
    (f.competition && f.competition !== 'todas') ||
    (f.stats && (
      (f.stats.pts.min !== null && f.stats.pts.min !== '') ||
      (f.stats.pts.max !== null && f.stats.pts.max !== '') ||
      (f.stats.ptsc.min !== null && f.stats.ptsc.min !== '') ||
      (f.stats.ptsc.max !== null && f.stats.ptsc.max !== '') ||
      (f.stats.pm.min !== null && f.stats.pm.min !== '') ||
      (f.stats.pm.max !== null && f.stats.pm.max !== '')
    ));
  if (hasActive) {
    btn.classList.add('has-active-filters');
  } else {
    btn.classList.remove('has-active-filters');
  }
}

// === Actualizar puntito al cambiar filtros ===
function setupFilterEventListeners() {
  const openFiltersBtn = document.getElementById('openFiltersBtn');
  const closeFiltersBtn = document.getElementById('closeFiltersBtn');
  const filtersOverlay = document.getElementById('filtersOverlay');
  const clearFiltersBtn = document.getElementById('clearFiltersBtn');
  const applyFiltersBtn = document.getElementById('applyFiltersBtn');

  // Abrir/cerrar overlay
  openFiltersBtn?.addEventListener('click', () => {
    filtersOverlay.classList.add('open');
  });

  closeFiltersBtn?.addEventListener('click', () => {
    filtersOverlay.classList.remove('open');
  });

  // Filtros de género
  const genderFilters = document.getElementById('genderFilters');
  genderFilters?.addEventListener('click', (e) => {
    if (e.target.classList.contains('gender-btn')) {
      document.querySelectorAll('.gender-btn').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      filters.gender = e.target.dataset.gender;
      updateActiveFilters();
      updateFiltersIndicator();
    }
  });

  // Filtros de competición
  const competitionFilters = document.getElementById('competitionFilters');
  competitionFilters?.addEventListener('click', (e) => {
    if (e.target.classList.contains('competition-btn')) {
      document.querySelectorAll('.competition-btn').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      filters.competition = e.target.dataset.competition;
      updateActiveFilters();
      updateFiltersIndicator();
    }
  });

  // Filtros de estadísticas (puntito en tiempo real)
  document.querySelectorAll('.stat-filter input[type="number"]').forEach((input, idx) => {
    input.addEventListener('input', (e) => {
      const value = e.target.value !== '' ? parseFloat(e.target.value) : null;
      // Orden: 0=PTS min, 1=PTS max, 2=PTSC min, 3=PTSC max, 4=+/- min, 5=+/- max
      if (idx === 0) filters.stats.pts.min = value;
      if (idx === 1) filters.stats.pts.max = value;
      if (idx === 2) filters.stats.ptsc.min = value;
      if (idx === 3) filters.stats.ptsc.max = value;
      if (idx === 4) filters.stats.pm.min = value;
      if (idx === 5) filters.stats.pm.max = value;
      updateFiltersIndicator();
    });
  });

  // Limpiar filtros
  clearFiltersBtn?.addEventListener('click', () => {
    clearAllFilters();
    updateFiltersIndicator();
  });

  // Aplicar filtros
  applyFiltersBtn?.addEventListener('click', () => {
    applyFilters();
    filtersOverlay.classList.remove('open');
    updateFiltersIndicator();
  });
}

function initializeCompetitionFilters() {
  const competitionFilters = document.getElementById('competitionFilters');
  if (!competitionFilters) return;

  const competitions = [...new Set(allTeams.map(team => team.competition))].sort();
  
  let html = '<button type="button" class="competition-btn active" data-competition="todas">Todas</button>';
  competitions.forEach(comp => {
    html += `<button type="button" class="competition-btn" data-competition="${comp}">${formatCompetitionName(comp)}</button>`;
  });
  
  competitionFilters.innerHTML = html;
}

function getGenderFromCompetition(competition) {
  if (competition.toLowerCase().includes('fem')) return 'femenino';
  if (competition.toLowerCase().includes('masc')) return 'masculino';
  if (competition.toLowerCase().includes('femenin')) return 'femenino';
  if (competition.toLowerCase().includes('masculin')) return 'masculino';
  return 'mixto';
}

function applyFilters() {
  // Obtener valores de estadísticas
  const statsInputs = document.querySelectorAll('.stat-filter input');
  statsInputs.forEach(input => {
    const statLabel = input.closest('.stat-filter').querySelector('label').textContent.toLowerCase();
    const isMin = input.placeholder.toLowerCase() === 'mín';
    const value = input.value ? parseFloat(input.value) : null;
    
    let statKey;
    if (statLabel === 'pts') statKey = 'pts';
    else if (statLabel === 'ptsc') statKey = 'ptsc';
    else if (statLabel === '+/-') statKey = 'pm';
    
    if (statKey) {
      filters.stats[statKey][isMin ? 'min' : 'max'] = value;
    }
  });

  filteredTeams = allTeams.filter(team => {
    // Filtro de género
    if (filters.gender !== 'todos') {
      const teamGender = getGenderFromCompetition(team.competition);
      if (teamGender !== filters.gender && teamGender !== 'mixto') {
        return false;
      }
    }

    // Filtro de competición
    if (filters.competition !== 'todas' && team.competition !== filters.competition) {
      return false;
    }

    // Filtro de búsqueda
    if (filters.search && !team.teamName.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }

    // Filtros de estadísticas
    const pts = parseFloat(team.avgPts);
    const ptsc = parseFloat(team.avgPtsAgainst);
    const pm = parseFloat(team.avgPm);

    if (filters.stats.pts.min !== null && pts < filters.stats.pts.min) return false;
    if (filters.stats.pts.max !== null && pts > filters.stats.pts.max) return false;
    if (filters.stats.ptsc.min !== null && ptsc < filters.stats.ptsc.min) return false;
    if (filters.stats.ptsc.max !== null && ptsc > filters.stats.ptsc.max) return false;
    if (filters.stats.pm.min !== null && pm < filters.stats.pm.min) return false;
    if (filters.stats.pm.max !== null && pm > filters.stats.pm.max) return false;

    return true;
  });

  currentPage = 1;
  renderTeamsGrid();
  renderPagination();
  updateActiveFilters();
  updateFiltersIndicator();
}

function clearAllFilters() {
  filters.gender = "todos";
  filters.competition = "todas";
  filters.search = "";
  filters.stats = {
    pts: { min: null, max: null },
    ptsc: { min: null, max: null },
    pm: { min: null, max: null }
  };

  // Limpiar UI
  document.querySelectorAll('.gender-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.gender === 'todos') btn.classList.add('active');
  });

  document.querySelectorAll('.competition-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.competition === 'todas') btn.classList.add('active');
  });

  document.querySelectorAll('.stat-filter input').forEach(input => {
    input.value = '';
  });

  const searchInput = document.getElementById('teamSearchInput');
  if (searchInput) searchInput.value = '';

  filteredTeams = allTeams.slice();
  currentPage = 1;
  renderTeamsGrid();
  renderPagination();
  updateActiveFilters();
  updateFiltersIndicator();
}

function updateActiveFilters() {
  const filtersActive = document.getElementById('filtersActive');
  if (!filtersActive) return;

  let activeFilters = [];

  if (filters.gender !== 'todos') {
    activeFilters.push({
      tipo: 'gender',
      valor: filters.gender,
      label: `Género: ${filters.gender}`
    });
  }

  if (filters.competition !== 'todas') {
    activeFilters.push({
      tipo: 'competition',
      valor: filters.competition,
      label: `Competición: ${formatCompetitionName(filters.competition)}`
    });
  }

  if (filters.search) {
    activeFilters.push({
      tipo: 'search',
      valor: filters.search,
      label: `Búsqueda: ${filters.search}`
    });
  }

  // Filtros de estadísticas
  Object.keys(filters.stats).forEach(stat => {
    const { min, max } = filters.stats[stat];
    if (min !== null || max !== null) {
      let label = stat.toUpperCase();
      if (stat === 'pm') label = '+/-';
      
      let range = '';
      if (min !== null && max !== null) {
        range = `${min} - ${max}`;
      } else if (min !== null) {
        range = `≥ ${min}`;
      } else if (max !== null) {
        range = `≤ ${max}`;
      }
      
      activeFilters.push({
        tipo: 'stats',
        valor: stat,
        label: `${label}: ${range}`
      });
    }
  });

  filtersActive.innerHTML = activeFilters.map(filter => 
    `<div class="filter-chip" data-tipo="${filter.tipo}" data-valor="${filter.valor}">
      ${filter.label}
      <button class="remove-filter">&times;</button>
    </div>`
  ).join('');

  // Añadir event listeners a los botones de eliminar filtro
  document.querySelectorAll('.remove-filter').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const chip = e.target.parentElement;
      const tipo = chip.dataset.tipo;
      const valor = chip.dataset.valor;
      eliminarFiltro(tipo, valor);
    });
  });
}

// Eliminar un filtro específico
function eliminarFiltro(tipo, valor) {
  switch (tipo) {
    case 'gender':
      filters.gender = 'todos';
      // Actualizar UI
      document.querySelectorAll('.gender-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.gender === 'todos') btn.classList.add('active');
      });
      break;
    case 'competition':
      filters.competition = 'todas';
      // Actualizar UI
      document.querySelectorAll('.competition-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.competition === 'todas') btn.classList.add('active');
      });
      break;
    case 'search':
      filters.search = '';
      // Limpiar input de búsqueda
      const searchInput = document.getElementById('teamSearchInput');
      if (searchInput) searchInput.value = '';
      break;
    case 'stats':
      filters.stats[valor] = { min: null, max: null };
      // Limpiar inputs de estadísticas
      document.querySelectorAll('.stat-filter').forEach(statFilter => {
        const label = statFilter.querySelector('label').textContent.toLowerCase();
        let statKey = label;
        if (label === '+/-') statKey = 'pm';
        if (statKey === valor) {
          statFilter.querySelectorAll('input').forEach(input => {
            input.value = '';
          });
        }
      });
      break;
  }

  // Aplicar filtros y actualizar vista
  currentPage = 1;
  applyFilters();
  updateFiltersIndicator();
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

function setupAllToggleButtons() {
  // Configurar toggle para género
  setupSectionToggle('genderToggleBtn', 'genderFilters', 'gender');
  
  // Configurar toggle para competición
  setupSectionToggle('competitionToggleBtn', 'competitionFilters', 'competition');
  
  // Configurar toggle para estadísticas
  setupSectionToggle('statsToggleBtn', 'statsFilters', 'stats');
}

function setupSectionToggle(toggleBtnId, filtersId, sectionType) {
  const toggleBtn = document.getElementById(toggleBtnId);
  const filtersContent = document.getElementById(filtersId);
  
  if (!toggleBtn || !filtersContent) return;

  // Encontrar el header correspondiente
  const filterSectionHeader = toggleBtn.closest('.filter-section').querySelector('.filter-section-header');
  
  if (!filterSectionHeader) return;

  // Estado inicial: colapsado
  let isCollapsed = true;

  // Aplicar estado inicial colapsado
  toggleBtn.classList.add('collapsed');
  filtersContent.classList.add('collapsed');

  // Función para alternar el estado
  function toggleSection() {
    isCollapsed = !isCollapsed;
    
    if (isCollapsed) {
      toggleBtn.classList.add('collapsed');
      filtersContent.classList.add('collapsed');
    } else {
      toggleBtn.classList.remove('collapsed');
      filtersContent.classList.remove('collapsed');
    }
  }

  // Event listeners para el botón y el header
  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleSection();
  });

  filterSectionHeader.addEventListener('click', (e) => {
    // Solo activar si el click fue en el header pero no en el botón
    if (e.target === filterSectionHeader || e.target.tagName === 'H4') {
      toggleSection();
    }
  });

  // Evitar que clicks en contenido activen el toggle
  filtersContent.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}

function setupStatsToggle() {
  // Esta función ya no es necesaria, se reemplaza por setupAllToggleButtons
  // La mantengo vacía para evitar errores
}

document.addEventListener('DOMContentLoaded', loadTeams); 
// Llamar al iniciar
setTimeout(updateFiltersIndicator, 200); 