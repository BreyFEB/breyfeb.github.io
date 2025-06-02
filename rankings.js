/***************************************
 * Variables globales
 ***************************************/
let allPlayersStats = [];
let competitionSet = new Set();
let teamSet = new Set();
let roundSet = new Set();

let currentSortCol = null;
let currentSortOrder = "desc";

let currentPage = 1;
const itemsPerPage = 50;

/***************************************
 * Funciones de Responsividad
 ***************************************/
function setupMobileColumns() {
  const toggleButton = document.getElementById('toggleColumns');
  const tableContainer = document.querySelector('.stats-table-container');
  
  if (toggleButton && tableContainer) {
    toggleButton.addEventListener('click', () => {
      tableContainer.classList.toggle('mobile-all-columns');
      
      // Actualizar el texto del botón
      if (tableContainer.classList.contains('mobile-all-columns')) {
        toggleButton.textContent = 'Mostrar datos básicos';
        // Ajustar el scroll para mostrar las estadísticas adicionales
        setTimeout(() => {
          tableContainer.scrollLeft = 0;
        }, 100);
      } else {
        toggleButton.textContent = 'Mostrar más datos';
        // Resetear el scroll cuando volvemos a la vista básica
        tableContainer.scrollLeft = 0;
      }
    });

    // Añadir indicador de scroll
    const scrollIndicator = document.createElement('div');
    scrollIndicator.className = 'scroll-indicator';
    tableContainer.appendChild(scrollIndicator);

    // Mostrar/ocultar indicador de scroll según sea necesario
    tableContainer.addEventListener('scroll', () => {
      const maxScroll = tableContainer.scrollWidth - tableContainer.clientWidth;
      if (tableContainer.classList.contains('mobile-all-columns')) {
        scrollIndicator.style.opacity = tableContainer.scrollLeft < maxScroll ? '1' : '0';
      } else {
        scrollIndicator.style.opacity = '0';
      }
    });
  }
}

function setupMobileMenu() {
  const menuToggle = document.getElementById('menuToggle');
  const mainNav = document.querySelector('.main-nav');
  const body = document.body;

  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  body.appendChild(overlay);

  if (menuToggle && mainNav) {
    menuToggle.addEventListener('click', () => {
      menuToggle.classList.toggle('active');
      mainNav.classList.toggle('active');
      overlay.classList.toggle('active');
      body.style.overflow = mainNav.classList.contains('active') ? 'hidden' : '';
    });

    overlay.addEventListener('click', () => {
      menuToggle.classList.remove('active');
      mainNav.classList.remove('active');
      overlay.classList.remove('active');
      body.style.overflow = '';
    });

    const navLinks = mainNav.querySelectorAll('a');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        menuToggle.classList.remove('active');
        mainNav.classList.remove('active');
        overlay.classList.remove('active');
        body.style.overflow = '';
      });
    });
  }
}

/***************************************
 * Funciones principales
 ***************************************/
// Añadir función para convertir segundos a formato MM:SS
function secondsToMinutes(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

async function loadAllStats() {
  const loaderText = document.querySelector('.loader-text');
  const progressBar = document.querySelector('.progress-bar-fill');

  try {
    // Load precalculated stats
    const response = await fetch('rankings_stats.json');
    const data = await response.json();

    // Update progress
    loaderText.textContent = 'Cargando estadísticas... 100%';
    progressBar.style.width = '100%';

    // Set the data - only use total records by default
    allPlayersStats = data.players;
    competitionSet = new Set(data.competitions);
    teamSet = new Set(data.teams);

    // Store phase records for later use
    window.phaseRecords = data.phase_records;

    fillSelects();
    applyFilters();
  } catch (error) {
    console.error("Error al cargar las estadísticas:", error);
    loaderText.textContent = 'Error al cargar los datos. Por favor, recarga la página.';
  }
}

function toggleDropdown(type) {
  const options = document.getElementById(`${type}Options`);
  const header = options.previousElementSibling;
  const arrow = header.querySelector('.arrow');
  
  // Close all other dropdowns
  document.querySelectorAll('.select-options').forEach(dropdown => {
    if (dropdown !== options) {
      dropdown.classList.remove('active');
      dropdown.previousElementSibling.querySelector('.arrow').style.transform = 'rotate(0deg)';
    }
  });

  // Toggle current dropdown
  options.classList.toggle('active');
  arrow.style.transform = options.classList.contains('active') ? 'rotate(180deg)' : 'rotate(0deg)';
}

function selectAll(type) {
  const options = document.querySelectorAll(`#${type}List .option input[type="checkbox"]`);
  options.forEach(checkbox => {
    checkbox.checked = true;
  });
  updateSelectHeader(type);
}

function deselectAll(type) {
  const options = document.querySelectorAll(`#${type}List .option input[type="checkbox"]`);
  options.forEach(checkbox => {
    checkbox.checked = false;
  });
  updateSelectHeader(type);
}

function filterOptions(type) {
  const input = document.querySelector(`#${type}Options .select-search input`);
  const options = document.querySelectorAll(`#${type}List .option`);
  const searchTerm = input.value.toLowerCase();

  options.forEach(option => {
    const text = option.querySelector('span').textContent.toLowerCase();
    option.style.display = text.includes(searchTerm) ? 'flex' : 'none';
  });

  // Update select all buttons state based on visible options
  updateSelectAllButtonsState(type);
}

function updateSelectAllButtonsState(type) {
  const visibleOptions = Array.from(document.querySelectorAll(`#${type}List .option`))
    .filter(option => option.style.display !== 'none');
  
  const allChecked = visibleOptions.every(option => 
    option.querySelector('input[type="checkbox"]').checked
  );
  
  const someChecked = visibleOptions.some(option => 
    option.querySelector('input[type="checkbox"]').checked
  );

  const selectAllBtn = document.querySelector(`#${type}Options .select-all-btn`);
  const deselectAllBtn = document.querySelector(`#${type}Options .deselect-all-btn`);

  if (selectAllBtn && deselectAllBtn) {
    selectAllBtn.textContent = allChecked ? 'Deseleccionar todo' : 'Seleccionar todo';
    selectAllBtn.onclick = allChecked ? 
      () => deselectAll(type) : 
      () => selectAll(type);
    
    // Show deselect all button when all options are selected or some options are selected
    deselectAllBtn.style.display = (allChecked || someChecked) ? 'block' : 'block';
  }
}

function getSelectedValues(type) {
  const checkboxes = document.querySelectorAll(`#${type}List input[type="checkbox"]:checked`);
  return Array.from(checkboxes).map(cb => cb.value);
}

function updateSelectHeader(type) {
  const header = document.querySelector(`#${type}Options`).previousElementSibling;
  const selectedValues = getSelectedValues(type);
  
  if (selectedValues.length === 0) {
    // Keep the original Spanish text
    const originalText = {
      'competition': 'Competición',
      'round': 'Fase',
      'team': 'Equipo',
      'gender': 'Género'
    };
    header.querySelector('span:first-child').textContent = originalText[type];
  } else {
    header.querySelector('span:first-child').textContent = `${selectedValues.length} seleccionados`;
  }
}

function formatCompetitionName(comp) {
  // Dictionary of competition name mappings
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
    "TERCERA FEB": "Tercera FEB"
  };

  // If we have a mapping for this competition, use it
  if (nameMappings[comp.trim()]) {
    return nameMappings[comp.trim()];
  }

  // For other competitions, apply some general formatting rules
  let formatted = comp
    // Replace underscores with spaces
    .replace(/_/g, ' ')
    // Replace multiple spaces with a single space
    .replace(/\s+/g, ' ')
    // Capitalize first letter of each word
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  return formatted;
}

function fillSelects() {
  // Define competition hierarchy with raw competition names
  const competitionHierarchy = {
    'Ligas profesionales masculinas': ['PRIMERA FEB', 'SEGUNDA FEB', 'TERCERA FEB'],
    'Ligas profesionales femeninas': ['LF ENDESA', 'LF CHALLENGE', 'L.F.-2'],
    'Otras competiciones': []
  };

  // Fill competition options
  const competitionList = document.getElementById('competitionList');
  competitionList.innerHTML = '';

  // First, add the main competitions in their specified order
  Object.entries(competitionHierarchy).forEach(([category, competitions]) => {
    // Add category header
    const categoryHeader = document.createElement('div');
    categoryHeader.className = 'option-category';
    categoryHeader.textContent = category;
    competitionList.appendChild(categoryHeader);

    // Add competitions for this category
    competitions.forEach(competition => {
      if (competitionSet.has(competition)) {
        const label = document.createElement('label');
        label.className = 'option';
        label.innerHTML = `
          <input type="checkbox" value="${competition}">
          <span>${formatCompetitionName(competition)}</span>
        `;
        competitionList.appendChild(label);
      }
    });
  });

  // Add remaining competitions to "Otras competiciones"
  const otherCompetitions = [...competitionSet].filter(comp => 
    !Object.values(competitionHierarchy).flat().includes(comp)
  ).sort((a, b) => a.localeCompare(b));

  if (otherCompetitions.length > 0) {
    otherCompetitions.forEach(competition => {
      const label = document.createElement('label');
      label.className = 'option';
      label.innerHTML = `
        <input type="checkbox" value="${competition}">
        <span>${formatCompetitionName(competition)}</span>
      `;
      competitionList.appendChild(label);
    });
  }

  // Fill team options
  const teamList = document.getElementById('teamList');
  teamList.innerHTML = '';
  [...teamSet].sort((a, b) => a.localeCompare(b)).forEach(t => {
    const label = document.createElement('label');
    label.className = 'option';
    label.innerHTML = `
      <input type="checkbox" value="${t}">
      <span>${t}</span>
    `;
    teamList.appendChild(label);
  });

  // Add change event listeners to all checkboxes
  document.querySelectorAll('.option input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      const type = checkbox.closest('.select-options').id.replace('Options', '');
      updateSelectHeader(type);
      updateSelectAllButtonsState(type);
    });
  });

  // Initialize select all buttons state for each dropdown
  ['competition', 'round', 'team', 'gender'].forEach(type => {
    updateSelectAllButtonsState(type);
  });
}

function applyFilters() {
  const selectedCompetitions = getSelectedValues('competition');
  const selectedTeams = getSelectedValues('team');
  const selectedGenders = getSelectedValues('gender');
  const selectedPhases = getSelectedValues('round');
  const modeToggle = document.getElementById("modeToggle");
  const searchInput = document.getElementById("searchPlayerTeam");
  const searchTerm = searchInput.value.toLowerCase();

  // Use phase records if a phase is selected, otherwise use total records
  let dataToFilter = selectedPhases.length > 0 ? 
    window.phaseRecords.filter(p => selectedPhases.includes(p.phaseType)) : 
    allPlayersStats;

  let filteredData = dataToFilter.filter(player => {
    const matchesComp = selectedCompetitions.length === 0 || selectedCompetitions.includes(player.competition);
    const matchesTeam = selectedTeams.length === 0 || selectedTeams.includes(player.teamName);
    const matchesGender = selectedGenders.length === 0 || selectedGenders.includes(player.gender);
    const matchesSearch = !searchTerm || 
      player.playerName.toLowerCase().includes(searchTerm) || 
      player.teamName.toLowerCase().includes(searchTerm);

    return matchesComp && matchesTeam && matchesGender && matchesSearch;
  });

  if (currentSortCol) {
    filteredData = sortArray(filteredData, currentSortCol, currentSortOrder, modeToggle.checked ? "promedios" : "totales");
  }

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  renderTable(paginatedData, modeToggle.checked ? "promedios" : "totales");
  updatePaginationInfo(filteredData.length);
}

function limitName(name, maxChars = 15) {
  return name.length > maxChars ? name.substring(0, maxChars) + "..." : name;
}

function getInitials(name) {
  return name.split(" ").map(word => word[0]).join("");
}

function showPlayerMatches(playerData) {
  // Encontrar la celda del jugador
  const playerCell = document.querySelector(`td.player-name[onclick*="${playerData.playerName}"]`);
  if (playerCell) {
    const row = playerCell.parentElement;
    toggleMatchDetails(row.querySelector('.games-cell'), playerData);
  }
}

function toTitleCase(str) {
  return str.toLowerCase().split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

function renderTable(data, mode = "totales") {
  const tbody = document.querySelector("#statsTable tbody");
  tbody.innerHTML = "";

  if (data.length === 0) {
    // Show message if no data
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 28; // Number of columns in the table
    cell.textContent = "No hay datos para los filtros seleccionados. Por favor, ajusta los filtros y vuelve a intentarlo.";
    cell.style.textAlign = "left";
    cell.style.fontWeight = "bold";
    cell.style.padding = "20px";
    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }

  data.forEach((player, index) => {
    const row = document.createElement("tr");
    const rank = (currentPage - 1) * itemsPerPage + index + 1;

    // Handle player photo with placeholder
    const playerPhoto = player.playerPhoto && player.playerPhoto.trim() !== '' ? 
      player.playerPhoto : 
      'player_placeholder.png';

    // Format player name with title case
    const formattedName = toTitleCase(player.playerName);

    // Calcular minutos promedio si es necesario
    const minutes = mode === "totales" 
      ? secondsToMinutes(player.seconds)
      : secondsToMinutes(Math.round(player.seconds / player.games));

    // Calcular los valores que se mostrarán
    const pts = mode === "totales" ? player.pts : (player.pts / player.games).toFixed(1);
    const t2c = mode === "totales" ? player.t2c : (player.t2c / player.games).toFixed(1);
    const t2i = mode === "totales" ? player.t2i : (player.t2i / player.games).toFixed(1);
    const t3c = mode === "totales" ? player.t3c : (player.t3c / player.games).toFixed(1);
    const t3i = mode === "totales" ? player.t3i : (player.t3i / player.games).toFixed(1);
    const tlc = mode === "totales" ? player.tlc : (player.tlc / player.games).toFixed(1);
    const tli = mode === "totales" ? player.tli : (player.tli / player.games).toFixed(1);
    const ro = mode === "totales" ? player.ro : (player.ro / player.games).toFixed(1);
    const rd = mode === "totales" ? player.rd : (player.rd / player.games).toFixed(1);
    const rt = mode === "totales" ? player.rt : (player.rt / player.games).toFixed(1);
    const as = mode === "totales" ? player.as : (player.as / player.games).toFixed(1);
    const br = mode === "totales" ? player.br : (player.br / player.games).toFixed(1);
    const bp = mode === "totales" ? player.bp : (player.bp / player.games).toFixed(1);
    const tp = mode === "totales" ? player.tp : (player.tp / player.games).toFixed(1);
    const fc = mode === "totales" ? player.fc : (player.fc / player.games).toFixed(1);
    const va = mode === "totales" ? player.va : (player.va / player.games).toFixed(1);
    const pm = mode === "totales" ? player.pm : (player.pm / player.games).toFixed(1);

    // Calcular porcentajes
    const pct2 = player.t2i > 0 ? ((player.t2c / player.t2i) * 100).toFixed(1) : "0.0";
    const pct3 = player.t3i > 0 ? ((player.t3c / player.t3i) * 100).toFixed(1) : "0.0";
    const pctTl = player.tli > 0 ? ((player.tlc / player.tli) * 100).toFixed(1) : "0.0";

    // Extraer solo los minutos del string "MM:SS"
    const minutesPlayed = parseInt(minutes.split(':')[0]);
    
    // Calcular el impacto
    const impact = minutesPlayed > 0 ? ((parseFloat(va) + parseFloat(pm)) / minutesPlayed).toFixed(2) : "0.00";

    // Abreviar nombre del equipo
    const teamName = player.teamName;
    const shortTeamName = teamName.length > 3 ? teamName.substring(0, 3) : teamName;

    row.innerHTML = `
      <td>${rank}</td>
      <td>${player.dorsal}</td>
      <td>
        <a href="player_profile.html?player_id=${player.id}" title="Ver perfil detallado">
          <img src="${playerPhoto}" alt="${formattedName}" class="player-photo" onerror="this.src='player_placeholder.png'">
        </a>
      </td>
      <td class="player-name" onclick='showPlayerMatches(${JSON.stringify(player).replace(/'/g, "\\'")})'
          title="${formattedName}">${formattedName}</td>
      <td class="team-name" data-fullname="${teamName}">${shortTeamName}</td>
      <td data-col="min">${minutes}</td>
      <td data-col="pts">${pts}</td>
      <td data-col="t2c">${t2c}</td>
      <td data-col="t2i">${t2i}</td>
      <td data-col="pct2" data-value="${parseFloat(pct2)}">${pct2}</td>
      <td data-col="t3c">${t3c}</td>
      <td data-col="t3i">${t3i}</td>
      <td data-col="pct3" data-value="${parseFloat(pct3)}">${pct3}</td>
      <td data-col="tlc">${tlc}</td>
      <td data-col="tli">${tli}</td>
      <td data-col="pctTl" data-value="${parseFloat(pctTl)}">${pctTl}</td>
      <td data-col="ro">${ro}</td>
      <td data-col="rd">${rd}</td>
      <td data-col="rt">${rt}</td>
      <td data-col="as">${as}</td>
      <td data-col="br">${br}</td>
      <td data-col="bp">${bp}</td>
      <td data-col="tp">${tp}</td>
      <td data-col="fc">${fc}</td>
      <td data-col="va">${va}</td>
      <td data-col="pm">${pm}</td>
      <td data-col="imp">${impact}</td>
      <td class="games-cell" onclick="toggleMatchDetails(this, ${JSON.stringify(player).replace(/"/g, '&quot;')})">${player.games}</td>
    `;

    tbody.appendChild(row);
  });
}

function toggleMatchDetails(cell, player) {
  const row = cell.parentElement;
  const nextRow = row.nextElementSibling;

  if (nextRow && nextRow.classList.contains("details-row")) {
    nextRow.remove();
  } else {
    const detailsRow = document.createElement("tr");
    detailsRow.className = "details-row";
    
    const detailsCell = document.createElement("td");
    detailsCell.colSpan = 28;
    
    const detailsTable = document.createElement("table");
    detailsTable.className = "match-details-table";

    // Encontrar los valores máximos para cada estadística
    const maxValues = {
      pts: Math.max(...player.matches.map(m => m.pts)),
      t2c: Math.max(...player.matches.map(m => m.t2c)),
      t2i: Math.max(...player.matches.map(m => m.t2i)),
      t3c: Math.max(...player.matches.map(m => m.t3c)),
      t3i: Math.max(...player.matches.map(m => m.t3i)),
      tlc: Math.max(...player.matches.map(m => m.tlc)),
      tli: Math.max(...player.matches.map(m => m.tli)),
      ro: Math.max(...player.matches.map(m => m.ro)),
      rd: Math.max(...player.matches.map(m => m.rd)),
      rt: Math.max(...player.matches.map(m => m.rt)),
      as: Math.max(...player.matches.map(m => m.as)),
      br: Math.max(...player.matches.map(m => m.br)),
      bp: Math.max(...player.matches.map(m => m.bp)),
      tp: Math.max(...player.matches.map(m => m.tp)),
      fc: Math.max(...player.matches.map(m => m.fc)),
      va: Math.max(...player.matches.map(m => m.va)),
      pm: Math.max(...player.matches.map(m => m.pm))
    };
    
    const thead = document.createElement("thead");
    thead.innerHTML = `
      <tr>
        <th data-sort="date">Fecha</th>
        <th data-sort="rival">Rival</th>
        <th data-sort="resultado">Resultado</th>
        <th data-sort="min">MIN</th>
        <th data-sort="pts">PTS</th>
        <th data-sort="t2c">T2C</th>
        <th data-sort="t2i">T2I</th>
        <th data-sort="pct2">%T2</th>
        <th data-sort="t3c">T3C</th>
        <th data-sort="t3i">T3I</th>
        <th data-sort="pct3">%T3</th>
        <th data-sort="tlc">TLC</th>
        <th data-sort="tli">TLI</th>
        <th data-sort="pctTl">%TL</th>
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
        <th data-sort="imp">IMP</th>
      </tr>
    `;

    // Añadir evento de click para ordenación
    thead.querySelectorAll('th').forEach(th => {
      th.addEventListener('click', () => {
        const sortKey = th.dataset.sort;
        const currentOrder = th.classList.contains('sorted-asc') ? 'desc' : 'asc';
        
        // Limpiar clases de ordenación previas
        thead.querySelectorAll('th').forEach(header => {
          header.classList.remove('sorted-asc', 'sorted-desc');
        });
        
        // Añadir clase de ordenación actual
        th.classList.add(`sorted-${currentOrder}`);
        
        // Ordenar los datos
        const tbody = detailsTable.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));
        
        rows.sort((a, b) => {
          let aVal = a.querySelector(`td[data-sort="${sortKey}"]`).dataset.value;
          let bVal = b.querySelector(`td[data-sort="${sortKey}"]`).dataset.value;
          
          // Forzar conversión a número para columnas numéricas y porcentajes
          if (
            ["pct2", "pct3", "pctTl", "t2c", "t2i", "t3c", "t3i", "tlc", "tli", "pts", "min", "ro", "rd", "rt", "as", "br", "bp", "tp", "fc", "va", "pm"].includes(sortKey)
          ) {
            aVal = parseFloat(aVal) || 0;
            bVal = parseFloat(bVal) || 0;
          }
          
          if (currentOrder === 'asc') {
            return aVal > bVal ? 1 : -1;
          } else {
            return aVal < bVal ? 1 : -1;
          }
        });
        
        // Reordenar las filas
        rows.forEach(row => tbody.appendChild(row));
      });
    });
    
    const tbody = document.createElement("tbody");
    
    // Ordenar los partidos por fecha (de más antiguo a más nuevo)
    player.matches.sort((a, b) => {
      // Convertir fechas en formato DD-MM-YYYY a objetos Date
      const [dayA, monthA, yearA] = a.matchDate.split('-');
      const [dayB, monthB, yearB] = b.matchDate.split('-');
      const dateA = new Date(yearA, monthA - 1, dayA);
      const dateB = new Date(yearB, monthB - 1, dayB);
      return dateA - dateB;
    });

    player.matches.forEach(match => {
      const resultadoStr = `<span style="color:${match.resultado === 'G' ? 'green' : 'red'};font-weight:bold">${match.resultado}</span> ${match.marcador}`;
      const rivalShort = match.rivalShort || (match.rival ? match.rival.substring(0, 3).toUpperCase() : "");
      const rivalFull = match.rivalFull || match.rival || "";
      
      // Calcular el impacto
      const minutes = parseInt(match.minutes.split(':')[0]);
      const impact = minutes > 0 ? ((match.va + match.pm) / minutes).toFixed(2) : "0.00";
      
      const matchRow = document.createElement("tr");
      matchRow.innerHTML = `
        <td data-sort="date" data-value="${match.matchDate}">${match.matchDate}</td>
        <td data-sort="rival" data-value="${rivalShort}" title="${rivalFull}">${rivalShort}</td>
        <td data-sort="resultado" data-value="${match.resultado}">${resultadoStr}</td>
        <td data-sort="min" data-value="${minutesToSeconds(match.minutes)}">${match.minutes}</td>
        <td data-sort="pts" data-value="${match.pts}" ${match.pts === maxValues.pts ? 'class="max-value"' : ''}>${match.pts}</td>
        <td data-sort="t2c" data-value="${match.t2c}" ${match.t2c === maxValues.t2c ? 'class="max-value"' : ''}>${match.t2c}</td>
        <td data-sort="t2i" data-value="${match.t2i}" ${match.t2i === maxValues.t2i ? 'class="max-value"' : ''}>${match.t2i}</td>
        <td data-sort="pct2" data-value="${match.pct2}">${match.pct2}</td>
        <td data-sort="t3c" data-value="${match.t3c}" ${match.t3c === maxValues.t3c ? 'class="max-value"' : ''}>${match.t3c}</td>
        <td data-sort="t3i" data-value="${match.t3i}" ${match.t3i === maxValues.t3i ? 'class="max-value"' : ''}>${match.t3i}</td>
        <td data-sort="pct3" data-value="${match.pct3}">${match.pct3}</td>
        <td data-sort="tlc" data-value="${match.tlc}" ${match.tlc === maxValues.tlc ? 'class="max-value"' : ''}>${match.tlc}</td>
        <td data-sort="tli" data-value="${match.tli}" ${match.tli === maxValues.tli ? 'class="max-value"' : ''}>${match.tli}</td>
        <td data-sort="pctTl" data-value="${match.pctTl}">${match.pctTl}</td>
        <td data-sort="ro" data-value="${match.ro}" ${match.ro === maxValues.ro ? 'class="max-value"' : ''}>${match.ro}</td>
        <td data-sort="rd" data-value="${match.rd}" ${match.rd === maxValues.rd ? 'class="max-value"' : ''}>${match.rd}</td>
        <td data-sort="rt" data-value="${match.rt}" ${match.rt === maxValues.rt ? 'class="max-value"' : ''}>${match.rt}</td>
        <td data-sort="as" data-value="${match.as}" ${match.as === maxValues.as ? 'class="max-value"' : ''}>${match.as}</td>
        <td data-sort="br" data-value="${match.br}" ${match.br === maxValues.br ? 'class="max-value"' : ''}>${match.br}</td>
        <td data-sort="bp" data-value="${match.bp}" ${match.bp === maxValues.bp ? 'class="max-value"' : ''}>${match.bp}</td>
        <td data-sort="tp" data-value="${match.tp}" ${match.tp === maxValues.tp ? 'class="max-value"' : ''}>${match.tp}</td>
        <td data-sort="fc" data-value="${match.fc}" ${match.fc === maxValues.fc ? 'class="max-value"' : ''}>${match.fc}</td>
        <td data-sort="va" data-value="${match.va}" ${match.va === maxValues.va ? 'class="max-value"' : ''}>${match.va}</td>
        <td data-sort="pm" data-value="${match.pm}" ${match.pm === maxValues.pm ? 'class="max-value"' : ''}>${match.pm}</td>
        <td data-sort="imp" data-value="${impact}">${impact}</td>
      `;
      tbody.appendChild(matchRow);
    });
    
    detailsTable.appendChild(thead);
    detailsTable.appendChild(tbody);
    detailsCell.appendChild(detailsTable);
    detailsRow.appendChild(detailsCell);
    row.parentNode.insertBefore(detailsRow, row.nextSibling);

    // Marcar visualmente la columna de fecha como ordenada ascendentemente
    const dateHeader = thead.querySelector('th[data-sort="date"]');
    dateHeader.classList.add('sorted-asc');
  }
}

function sortByColumn(colKey) {
  if (currentSortCol === colKey) {
    currentSortOrder = currentSortOrder === "asc" ? "desc" : "asc";
  } else {
    currentSortCol = colKey;
    currentSortOrder = "desc";
  }

  const modeToggle = document.getElementById("modeToggle");
  allPlayersStats = sortArray(
    allPlayersStats,
    colKey,
    currentSortOrder,
    modeToggle.checked ? "promedios" : "totales"
  );

  highlightSortedColumn(colKey);
  applyFilters();
}

function sortArray(array, colKey, order, mode) {
  const numericCols = [
    "min", "pts", "t2c", "t2i", "pct2", "t3c", "t3i", "pct3", "tlc", "tli", "pctTl",
    "ro", "rd", "rt", "as", "br", "bp", "tp", "fc", "va", "pm", "games", "+/-"
  ];

  return [...array].sort((a, b) => {
    let aValue = getSortValue(a, colKey, mode);
    let bValue = getSortValue(b, colKey, mode);

    if (numericCols.includes(colKey)) {
      aValue = parseFloat(aValue) || 0;
      bValue = parseFloat(bValue) || 0;
    }

    // LOG para depuración
    if (["pct2", "pct3", "pctTl", "t2c", "t2i", "t3c", "t3i", "tlc", "tli", "pts", "min", "ro", "rd", "rt", "as", "br", "bp", "tp", "fc", "va", "pm"].includes(colKey)) {
      console.log(`ORDENANDO POR ${colKey}:`, aValue, bValue, "| RAW:", getSortValue(a, colKey, mode), getSortValue(b, colKey, mode));
    }

    if (order === "asc") {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });
}

function getSortValue(obj, colKey, mode) {
  // Caso especial para minutos
  if (colKey === 'min') {
    if (mode === 'promedios' && obj.games > 0) {
      return obj.seconds / obj.games; // Use average seconds for averages mode
    }
    return obj.seconds; // Use total seconds for totals mode
  }

  // Forzar conversión a número para porcentajes
  if (['pct2', 'pct3', 'pctTl'].includes(colKey)) {
    // Calculate percentage directly from the raw values
    if (colKey === 'pct2') {
      return obj.t2i > 0 ? (obj.t2c / obj.t2i) * 100 : 0;
    } else if (colKey === 'pct3') {
      return obj.t3i > 0 ? (obj.t3c / obj.t3i) * 100 : 0;
    } else if (colKey === 'pctTl') {
      return obj.tli > 0 ? (obj.tlc / obj.tli) * 100 : 0;
    }
  }

  if (mode === "promedios" && obj.games > 0) {
    return obj[colKey] / obj.games;
  }

  if (colKey === 'imp') {
    const minutes = parseInt(secondsToMinutes(obj.seconds).split(':')[0]);
    return minutes > 0 ? (obj.va + obj.pm) / minutes : 0;
  }

  return obj[colKey];
}

function highlightSortedColumn(colKey) {
  const ths = document.querySelectorAll("#statsTable thead th");
  ths.forEach(th => {
    th.classList.remove("sorted-asc", "sorted-desc");
    if (th.dataset.col === colKey) {
      th.classList.add(currentSortOrder === "asc" ? "sorted-asc" : "sorted-desc");
    }
  });
}

function updatePaginationInfo(totalItems) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const pageInfo = document.getElementById("pageInfo");
  pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;

  const prevBtn = document.getElementById("prevPageBtn");
  const nextBtn = document.getElementById("nextPageBtn");

  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages;
}

// Add helper function to convert minutes to seconds
function minutesToSeconds(minutesStr) {
  if (!minutesStr) return 0;
  const [mins, secs] = minutesStr.split(':').map(Number);
  return mins * 60 + secs;
}

/***************************************
 * Inicialización
 ***************************************/
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // El loader ya está visible por defecto
        await loadAllStats();
        // Ordenar por puntos totales descendente al cargar
        currentSortCol = "pts";
        currentSortOrder = "desc";
        applyFilters();
        // Ocultamos el loader cuando todo está cargado
        document.querySelector('.loader-container').classList.add('loader-hidden');
    } catch (error) {
        console.error('Error loading statistics:', error);
        document.querySelector('.loader-text').textContent = 'Error al cargar los datos. Por favor, recarga la página.';
    }
});

document.addEventListener("DOMContentLoaded", () => {
  setupMobileMenu();
  setupMobileColumns();

  document.getElementById("btnApplyFilters").addEventListener("click", () => {
    currentPage = 1;
    applyFilters();
  });

  // Add reset filters functionality
  const btnResetFilters = document.getElementById("btnResetFilters");
  if (btnResetFilters) {
    btnResetFilters.addEventListener("click", () => {
      // Uncheck all checkboxes in dropdowns
      document.querySelectorAll('.option input[type="checkbox"]').forEach(cb => cb.checked = false);
      // Reset search input
      const searchInput = document.getElementById("searchPlayerTeam");
      if (searchInput) searchInput.value = "";
      // Reset mode toggle to Totales
      const modeToggle = document.getElementById("modeToggle");
      if (modeToggle) modeToggle.checked = false;
      // Reset dropdown headers
      ["competition", "round", "team", "gender"].forEach(type => {
        const header = document.querySelector(`#${type}Options`).previousElementSibling;
        if (header) {
          const originalText = {
            'competition': 'Competición',
            'round': 'Fase',
            'team': 'Equipo',
            'gender': 'Género'
          };
          header.querySelector('span:first-child').textContent = originalText[type];
        }
      });
      // Reset current page and sorting
      currentPage = 1;
      currentSortCol = "pts";
      currentSortOrder = "desc";
      applyFilters();
    });
  }

  // Add horizontal scroll arrow functionality
  const tableContainer = document.querySelector('.stats-table-container');
  const scrollLeftBtn = document.getElementById('scrollLeftBtn');
  const scrollRightBtn = document.getElementById('scrollRightBtn');
  const scrollAmount = 200;
  function updateArrowState() {
    if (!tableContainer) return;
    scrollLeftBtn.disabled = tableContainer.scrollLeft <= 0;
    scrollRightBtn.disabled = tableContainer.scrollLeft + tableContainer.clientWidth >= tableContainer.scrollWidth - 1;
  }
  if (scrollLeftBtn && scrollRightBtn && tableContainer) {
    scrollLeftBtn.addEventListener('click', () => {
      tableContainer.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      setTimeout(updateArrowState, 300);
    });
    scrollRightBtn.addEventListener('click', () => {
      tableContainer.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      setTimeout(updateArrowState, 300);
    });
    tableContainer.addEventListener('scroll', updateArrowState);
    updateArrowState();
  }

  const ths = document.querySelectorAll("#statsTable thead th");
  ths.forEach(th => {
    th.addEventListener("click", () => {
      const colKey = th.dataset.col;
      if (colKey) {
        sortByColumn(colKey);
      }
    });
  });

  const modeToggle = document.getElementById("modeToggle");
  if (modeToggle) {
    modeToggle.addEventListener("change", () => {
      currentPage = 1;
      applyFilters();
    });
  }

  const searchInput = document.getElementById("searchPlayerTeam");
  searchInput.addEventListener("input", () => {
    currentPage = 1;
    applyFilters();
  });

  document.getElementById("prevPageBtn").addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      applyFilters();
    }
  });

  document.getElementById("nextPageBtn").addEventListener("click", () => {
    currentPage++;
    applyFilters();
  });

  // Add click outside listener to close dropdowns
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.custom-select')) {
      document.querySelectorAll('.select-options').forEach(dropdown => {
        dropdown.classList.remove('active');
        dropdown.previousElementSibling.querySelector('.arrow').style.transform = 'rotate(0deg)';
      });
    }
  });
}); 
