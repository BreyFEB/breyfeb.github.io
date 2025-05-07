document.addEventListener("DOMContentLoaded", () => {
  // URL del JSON (ajusta a la versión que necesites)
  const jsonURL = "https://raw.githubusercontent.com/emebullon/cadete2025/refs/heads/main/JSONs%20fichas/FullMatch_2469167_2025-05-03T13.json";

  fetch(jsonURL)
    .then(resp => resp.json())
    .then(data => {
      console.log("JSON cargado:", data); // Para depuración
      const header = data.HEADER;
      const tA = header.TEAM[0];
      const tB = header.TEAM[1];

      // Actualizar logos, nombres y marcador en el Hero (si se usa el bloque estático del nuevo hero)
      document.querySelector('.team-box:first-child .team-logo').src = tA.logo;
      document.querySelector('.team-box:first-child .team-name').textContent = tA.name;
      document.querySelector('.team-box:last-child .team-logo').src = tB.logo;
      document.querySelector('.team-box:last-child .team-name').textContent = tB.name;

      // Actualizar el marcador
      const scoreValueEl = document.querySelector('.score-value');
      scoreValueEl.textContent = `${tA.pts} - ${tB.pts}`;

      // Actualizar estado y fecha/hora
      const scoreStatusEl = document.querySelector('.score-status');
      scoreStatusEl.textContent = header.status || 'FINAL';
      const matchDatetimeEl = document.querySelector('.match-datetime');
      matchDatetimeEl.textContent = header.starttime || '01-01-2025 - 20:00';

      // Actualizar el video si existe videoUrl en el JSON (opcional)
      if (header.videoUrl) {
        const videoIframe = document.querySelector('.hero-video iframe');
        videoIframe.src = header.videoUrl;
      }

      // Actualizar hero phase
      // Get the div with class "hero-breadcrumb"
      const breadcrumbDiv = document.querySelector('.hero-breadcrumb');
      
      // Get the last <span> inside the div
      const lastSpan = breadcrumbDiv.querySelector('span:last-child');
      
      // Modify the content of the last <span> with variables
      lastSpan.textContent = `${tA.name} vs ${tB.name}`;

      // Actualizar hero-phase
      const herophaseDiv = document.querySelector('.hero-phase');
      const fase = header.round.trim()
      const competicion = header.competition
      const pabellon = header.field
      herophaseDiv.textContent =  `${fase} • ${competicion} • ${pabellon}`;
      
      // Construir diccionarios: fotos, nombres de jugadores y equipos
      buildPlayerPhotoDictionary(data);
      buildPlayerNamesDictionary(data);

      // Inicializar las secciones principales
      updateHeroFromJSON(data);
      setupMiniHeader(data);
      fillBoxScore(data);

      // Llenar el dropdown para filtrar por Cuarto
      fillQuarterFilter(data);

      // Cargar Play by Play
      loadPlayByPlay(data);

      // Rellenar filtros de Play by Play
      fillPBPFilters(data);

      // Llenar los dropdowns de comparación de jugadores
      fillComparisonSelectors(data);

      // Inicializar los gráficos
      initCharts(data);

      // Llenar el cuadro resumen por cuarto
      fillQuarterSummary(data);
    })
    .catch(err => console.error("Error al cargar JSON partido:", err));

  // Configuración de tabs (Resumen, Estadísticas, etc.)
  const tabs = document.querySelectorAll(".tab-link");
  tabs.forEach(tab => {
    tab.addEventListener("click", e => {
      e.preventDefault();
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      const targetId = tab.getAttribute("href").replace("#", "");
      document.querySelectorAll(".match-section").forEach(sec => {
        sec.style.display = (sec.id === targetId) ? "block" : "none";
      });
    });
  });
  document.querySelectorAll(".match-section").forEach(sec => {
    sec.style.display = (sec.id === "overview") ? "block" : "none";
  });

  // Filtro Play by Play
  const pbpFilterBtn = document.getElementById("pbpFilterBtn");
  if (pbpFilterBtn) {
    pbpFilterBtn.addEventListener("click", applyPBPFilters);
  }

  // Evento para comparar jugadores (Radar Chart)
  const compareBtn = document.getElementById("compareBtn");
  if (compareBtn) {
    compareBtn.addEventListener("click", () => {
      const p1Id = document.getElementById("comparePlayer1").value;
      const p2Id = document.getElementById("comparePlayer2").value;
      if (!p1Id || !p2Id) {
        alert("Selecciona ambos jugadores para comparar.");
        return;
      }
      const player1 = playersData.find(p => p.id === p1Id);
      const player2 = playersData.find(p => p.id === p2Id);
      if (player1 && player2) {
        updateRadarChart(player1, player2);
      }
    });
  }

  // Lógica para la galería de fotos (modal)
  const photoModal = document.getElementById("photoModal");
  const modalImage = document.getElementById("modalImage");
  const captionText = document.getElementById("caption");
  const closeBtn = document.getElementById("photoModalClose");

  const galleryImages = document.querySelectorAll(".photo-gallery img");
  galleryImages.forEach(img => {
    img.addEventListener("click", () => {
      photoModal.style.display = "block";
      modalImage.src = img.getAttribute("data-full") || img.src;
      captionText.innerHTML = img.alt;
    });
  });

  closeBtn.addEventListener("click", () => {
    photoModal.style.display = "none";
  });
  photoModal.addEventListener("click", (e) => {
    if (e.target === photoModal) {
      photoModal.style.display = "none";
    }
  });
});

/***********************************************
 * VARIABLES GLOBALES Y DICCIONARIOS
 ***********************************************/
let allPBPEvents = [];
let currentQuarter = "total";
const playerPhotos = {};
const playerNames = {};
const teamNames = {};
let playersData = [];
let teamA = null;
let teamB = null;

/***********************************************
 * Diccionarios de jugadores y equipos
 ***********************************************/
function buildPlayerPhotoDictionary(data) {
  if (!data.SCOREBOARD || !data.SCOREBOARD.TEAM) return;
  data.SCOREBOARD.TEAM.forEach(team => {
    if (!team.PLAYER) return;
    team.PLAYER.forEach(p => {
      playerPhotos[p.id] = p.logo || "https://via.placeholder.com/50";
    });
  });
}

function buildPlayerNamesDictionary(data) {
  if (!data.SCOREBOARD || !data.SCOREBOARD.TEAM) return;
  data.SCOREBOARD.TEAM.forEach(team => {
    if (team.id) teamNames[team.id] = team.name;
    if (!team.PLAYER) return;
    team.PLAYER.forEach(p => {
      playerNames[p.id] = p.name;
    });
  });
}

/***********************************************
 * HERO, MINI-HEADER, BOX SCORE
 ***********************************************/
function updateHeroFromJSON(data) {
  const heroDiv = document.querySelector(".hero-content");
  if (!heroDiv) return;
  const header = data.HEADER;
  const category = header.category || "A";
  const place = header.place || "";
  const field = header.field || "";
  const tA = header.TEAM[0];
  const tB = header.TEAM[1];
  teamA = tA;
  teamB = tB;
  const scoreA = tA.pts || "0";
  const scoreB = tB.pts || "0";
  const matchStatus = header.status || "FINAL";
  const matchDateTime = header.starttime || "01-01-2025 - 20:00";
  heroDiv.innerHTML = `
    <div class="hero-left">
      <div class="hero-pavilion-info">
        ${category} |<br>
        <a href="#" style="color:#FFD700; text-decoration:underline;">${place}, ${field}</a>
      </div>
      <div class="hero-top-logos">
        <div class="hero-team-box">
          <img src="${tA.logo}" alt="${tA.name}" class="hero-team-logo">
          <div class="hero-team-name">${tA.name}</div>
        </div>
        <div class="score-box">
          <div class="score-result">${scoreA} - ${scoreB}</div>
          <div class="score-status">${matchStatus}</div>
          <div style="font-size:0.8em; margin-top:5px;">${matchDateTime}</div>
        </div>
        <div class="hero-team-box">
          <img src="${tB.logo}" alt="${tB.name}" class="hero-team-logo">
          <div class="hero-team-name">${tB.name}</div>
        </div>
      </div>
    </div>
    <div class="hero-video">
      <iframe width="300" height="170" src="https://progressive.enetres.net/mp4Streamer.php?u=BD98BFE22A5946A8BB316B18D8F43054&f=dvr-ae42034e-070125-105812-LIVEMADRIDCADFEM.mp4&c=0" allowfullscreen></iframe>
    </div>
  `;
}

function setupMiniHeader(data) {
  const miniHeader = document.getElementById("miniHeader");
  if (!miniHeader) return;
  window.addEventListener("scroll", () => {
    if (window.scrollY > 100) {
      miniHeader.style.display = "flex";
      const tA = data.HEADER.TEAM[0];
      const tB = data.HEADER.TEAM[1];
      miniHeader.querySelector(".mini-score").innerHTML = `
        <div class="mini-score-team mini-score-team-left">
          <img src="${tA.logo}" alt="${tA.name}" class="mini-team-logo">
          <span class="mini-team-name">${tA.name}</span>
        </div>
        <div class="mini-score-info">
          <span class="mini-score-text">${tA.pts} - ${tB.pts}</span>
          <span class="mini-match-status">${data.HEADER.status || "LIVE"}</span>
        </div>
        <div class="mini-score-team mini-score-team-right">
          <span class="mini-team-name">${tB.name}</span>
          <img src="${tB.logo}" alt="${tB.name}" class="mini-team-logo">
        </div>
      `;
    } else {
      miniHeader.style.display = "none";
    }
  });
}

function fillBoxScore(data) {
  if (!data.SCOREBOARD || !data.SCOREBOARD.TEAM) return;
  const teamAPlayers = data.SCOREBOARD.TEAM[0].PLAYER || [];
  const teamBPlayers = data.SCOREBOARD.TEAM[1].PLAYER || [];
  const teamAData = mapPlayersToRows(teamAPlayers);
  const teamBData = mapPlayersToRows(teamBPlayers);
  window.boxScoreData = {
    "team-a-table": teamAData,
    "team-b-table": teamBData
  };
  populateTable("team-a-table", teamAData);
  populateTable("team-b-table", teamBData);

  // Llamada para agregar la fila de totales en cada tabla
  addBoxScoreTotals("team-a-table", teamAData);
  addBoxScoreTotals("team-b-table", teamBData);

  attachTableSortHandlers("team-a-table");
  attachTableSortHandlers("team-b-table");
  
  attachTableSortHandlers("team-a-table");
  attachTableSortHandlers("team-b-table");
  const teamAName = document.getElementById("team-a-name");
  if (teamAName) teamAName.textContent = data.SCOREBOARD.TEAM[0].name || "Equipo A";
  const teamBName = document.getElementById("team-b-name");
  if (teamBName) teamBName.textContent = data.SCOREBOARD.TEAM[1].name || "Equipo B";
}

function mapPlayersToRows(players) {
  return players.map(p => {
    const p2a = parseInt(p.p2a, 10) || 0;
    const p2m = parseInt(p.p2m, 10) || 0;
    const p2pValue = p2a > 0 ? (p2m / p2a) * 100 : 0;
    const p3a = parseInt(p.p3a, 10) || 0;
    const p3m = parseInt(p.p3m, 10) || 0;
    const p3pValue = p3a > 0 ? (p3m / p3a) * 100 : 0;
    const p1a = parseInt(p.p1a, 10) || 0;
    const p1m = parseInt(p.p1m, 10) || 0;
    const p1pValue = p1a > 0 ? (p1m / p1a) * 100 : 0;
    const playerPhoto = p.logo || "https://via.placeholder.com/50";
    const playerNameCell = `
      <div class="player-cell">
        <img src="${playerPhoto}" alt="${p.name}" class="player-photo">
        <span>${p.name}</span>
      </div>
    `;
    return [
      p.no || "",
      playerNameCell,
      p.minFormatted || "",
      parseInt(p.pts, 10) || 0,
      p2a,
      p2m,
      p2pValue.toFixed(1),
      p3a,
      p3m,
      p3pValue.toFixed(1),
      p1m,
      p1a,
      p1pValue.toFixed(1),
      parseInt(p.ro, 10) || 0,
      parseInt(p.rd, 10) || 0,
      parseInt(p.rt, 10) || 0,
      parseInt(p.assist, 10) || 0,
      parseInt(p.st, 10) || 0,
      parseInt(p.to, 10) || 0,
      parseInt(p.bs, 10) || 0,
      parseInt(p.pf, 10) || 0,
      parseInt(p.val, 10) || 0,
      parseInt(p.pllss, 10) || 0
    ];
  });
}

function populateTable(tableId, teamData) {
  const tbody = document.querySelector(`#${tableId} tbody`);
  if (!tbody) return;
  tbody.innerHTML = "";
  teamData.forEach(arr => {
    const row = tbody.insertRow();
    arr.forEach(val => {
      const cell = row.insertCell();
      cell.innerHTML = val;
    });
  });
}


// Función para añadir una fila de totales en el Box Score
function addBoxScoreTotals(tableId, teamData) {
  const tbody = document.querySelector(`#${tableId} tbody`);
  if (!tbody) return;
  // Inicializar un array de totales con la misma longitud de la fila (usamos la primera fila para contar columnas)
  const numCols = teamData[0].length;
  const totals = new Array(numCols).fill(0);
  // Recorremos cada fila (cada jugador)
  teamData.forEach(row => {
    // Suponemos que las columnas numéricas empiezan en la columna 3 (índice 2) en adelante (ajusta según tu caso)
    for (let i = 2; i < numCols; i++) {
      totals[i] += parseFloat(row[i]) || 0;
    }
  });
  // Deja vacías o fija las dos primeras columnas (número y nombre)
  totals[0] = "";
  totals[1] = "TOTAL";
  
  // Crear la fila de totales
  const row = document.createElement("tr");
  totals.forEach(total => {
    const cell = document.createElement("td");
    cell.innerHTML = (typeof total === "number" && !isNaN(total)) ? total.toFixed(0) : total;
    row.appendChild(cell);
  });
  // Añadir una clase para resaltar la fila total (opcional)
  row.classList.add("total-row");
  tbody.appendChild(row);
}


function attachTableSortHandlers(tableId) {
  const table = document.getElementById(tableId);
  if (!table) return;
  const headers = table.querySelectorAll("th");
  headers.forEach((header, index) => {
    header.addEventListener("click", function() {
      const sortType = header.getAttribute("data-sort");
      window.sortStates = window.sortStates || {};
      const key = tableId + "-" + index;
      let currentOrder = window.sortStates[key] || "desc";
      currentOrder = (currentOrder === "asc") ? "desc" : "asc";
      window.sortStates[key] = currentOrder;
      const data = window.boxScoreData[tableId];
      data.sort((a, b) => {
        let valA = a[index];
        let valB = b[index];
        if (sortType === "number") {
          valA = parseFloat(valA) || 0;
          valB = parseFloat(valB) || 0;
        } else {
          valA = valA.toString().toLowerCase();
          valB = valB.toString().toLowerCase();
        }
        if (valA < valB) return currentOrder === "asc" ? -1 : 1;
        if (valA > valB) return currentOrder === "asc" ? 1 : -1;
        return 0;
      });
      // Vacía el tbody y repuebla la tabla
      populateTable(tableId, data);
      // Vuelve a añadir la fila de totales para que siempre quede al final
      addBoxScoreTotals(tableId, data);
    });
  });
}

function loadPlayByPlay(data) {
  if (!data.PLAYBYPLAY || !data.PLAYBYPLAY.LINES) return;
  let events = data.PLAYBYPLAY.LINES;
  events = events.filter(e => {
    if (e.action && e.action.toLowerCase() === "rebound" && !e.idPlayer) return false;
    return true;
  });
  events.sort((a, b) => {
    if (a.quarter !== b.quarter) {
      return b.quarter - a.quarter;
    }
    return timeToSeconds(a.time) - timeToSeconds(b.time);
  });
  allPBPEvents = events;
  renderPBPEvents();
}

function timeToSeconds(t) {
  if (!t) return 0;
  const [m, s] = t.split(":").map(Number);
  return (m || 0) * 60 + (s || 0);
}

function renderPBPEvents() {
  const pbpContainer = document.getElementById("pbpEvents");
  if (!pbpContainer) return;
  pbpContainer.innerHTML = "";
  let filtered = (currentQuarter === "total")
    ? allPBPEvents
    : allPBPEvents.filter(ev => ev.quarter === currentQuarter);
  const actionVal = (document.getElementById("pbpActionFilter").value || "").trim().toLowerCase();
  const playerVal = (document.getElementById("pbpPlayerFilter").value || "").trim().toLowerCase();
  const teamVal   = (document.getElementById("pbpTeamFilter").value || "").trim().toLowerCase();
  filtered = filtered.filter(ev => {
    if (actionVal && ev.action.toLowerCase() !== actionVal) return false;
    if (playerVal && (!ev.text || !ev.text.toLowerCase().includes(playerVal))) return false;
    if (teamVal && (!ev.text || !ev.text.toLowerCase().includes(teamVal))) return false;
    return true;
  });
  filtered.forEach(ev => {
    const divEvent = createModernPBPEvent(ev);
    pbpContainer.appendChild(divEvent);
  });
}

function createModernPBPEvent(ev) {
  const div = document.createElement("div");
  div.classList.add("pbp-event");
  const leftBar = document.createElement("div");
  leftBar.style.position = "absolute";
  leftBar.style.left = "0";
  leftBar.style.top = "0";
  leftBar.style.bottom = "0";
  leftBar.style.width = "5px";
  leftBar.style.zIndex = "1";
  leftBar.style.backgroundColor = "transparent";
  const rightBar = document.createElement("div");
  rightBar.style.position = "absolute";
  rightBar.style.right = "0";
  rightBar.style.top = "0";
  rightBar.style.bottom = "0";
  rightBar.style.width = "5px";
  rightBar.style.zIndex = "1";
  rightBar.style.backgroundColor = "transparent";
  if (ev.idTeam && teamA && ev.idTeam === teamA.id) {
    leftBar.style.backgroundColor = "#FF9E1B";
  } else if (ev.idTeam && teamB && ev.idTeam === teamB.id) {
    rightBar.style.backgroundColor = "#C8102E";
  }
  div.appendChild(leftBar);
  div.appendChild(rightBar);
  if (ev.action && ev.action.toLowerCase() === "timeout") div.classList.add("timeout");
  if (ev.action && ev.action.toLowerCase() === "period") div.classList.add("period");
  const timeDiv = document.createElement("div");
  timeDiv.classList.add("pbp-time");
  timeDiv.textContent = ev.time || "00:00";
  const contentDiv = document.createElement("div");
  contentDiv.classList.add("pbp-content");
  if (ev.action.toLowerCase() === "shoot" && ev.text && ev.text.toLowerCase().includes("anotado") && ev.idPlayer && playerPhotos[ev.idPlayer]) {
    const img = document.createElement("img");
    img.src = playerPhotos[ev.idPlayer];
    img.alt = "Foto Jugador";
    img.classList.add("player-photo", "big");
    contentDiv.appendChild(img);
  }
  let playerName = "";
  let actionText = "";
  if (ev.text) {
    const regex = /^\s*\([^)]+\)\s+([^:]+):\s*(.+)$/;
    const match = ev.text.match(regex);
    if (match) {
      playerName = match[1].trim();
      actionText = match[2].trim();
    } else {
      actionText = ev.text;
    }
  }
  if (!playerName && ev.playerName) {
    playerName = ev.playerName;
  }
  const detailsDiv = document.createElement("div");
  detailsDiv.classList.add("pbp-details");
  const playerNameDiv = document.createElement("div");
  playerNameDiv.classList.add("pbp-player-name");
  playerNameDiv.textContent = playerName;
  const actionTextDiv = document.createElement("div");
  actionTextDiv.classList.add("pbp-action-text");
  actionTextDiv.textContent = actionText || ev.action;
  detailsDiv.appendChild(playerNameDiv);
  detailsDiv.appendChild(actionTextDiv);
  contentDiv.appendChild(detailsDiv);
  const scoreDiv = document.createElement("div");
  scoreDiv.classList.add("pbp-score");
  if (ev.scoreA != null && ev.scoreB != null) {
    scoreDiv.textContent = `${ev.scoreA} - ${ev.scoreB}`;
  } else {
    scoreDiv.textContent = "";
  }
  div.appendChild(timeDiv);
  div.appendChild(contentDiv);
  div.appendChild(scoreDiv);
  return div;
}

function fillPBPFilters(data) {
  if (!data.PLAYBYPLAY || !data.PLAYBYPLAY.LINES) return;
  const lines = allPBPEvents;
  const actionsSet = new Set();
  const playersSet = new Set();
  const teamsSet = new Set();
  lines.forEach(ev => {
    if (ev.action) actionsSet.add(ev.action.toLowerCase());
    if (ev.text) {
      const regex = /^\s*\(([^)]+)\)\s+([^:]+):/;
      const match = ev.text.match(regex);
      if (match) {
        playersSet.add(match[2].trim().toLowerCase());
        teamsSet.add(match[1].trim().toLowerCase());
      }
    }
  });
  const actionFilter = document.getElementById("pbpActionFilter");
  if (actionFilter) {
    actionFilter.innerHTML = '<option value="">Todas</option>';
    Array.from(actionsSet).sort().forEach(a => {
      const opt = document.createElement("option");
      opt.value = a;
      opt.textContent = a.toUpperCase();
      actionFilter.appendChild(opt);
    });
  }
  const playerFilter = document.getElementById("pbpPlayerFilter");
  if (playerFilter) {
    playerFilter.innerHTML = '<option value="">Todos</option>';
    Array.from(playersSet).sort().forEach(p => {
      const opt = document.createElement("option");
      opt.value = p;
      opt.textContent = p;
      playerFilter.appendChild(opt);
    });
    playerFilter.removeAttribute("multiple");
  }
  const teamFilter = document.getElementById("pbpTeamFilter");
  if (teamFilter) {
    teamFilter.innerHTML = '<option value="">Todos</option>';
    Array.from(teamsSet).sort().forEach(t => {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t;
      teamFilter.appendChild(opt);
    });
  }
}

function fillQuarterFilter(data) {
  const quarterFilter = document.getElementById("pbpQuarterFilter");
  if (!quarterFilter) {
    console.warn("No se encontró pbpQuarterFilter en el HTML.");
    return;
  }
  quarterFilter.innerHTML = '<option value="">Todos</option>';
  if (!data.HEADER || !data.HEADER.QUARTERS || !data.HEADER.QUARTERS.QUARTER) {
    console.warn("No se encontró data.HEADER.QUARTERS.QUARTER en el JSON:", data);
    return;
  }
  data.HEADER.QUARTERS.QUARTER.forEach(q => {
    const qNum = parseInt(q.n, 10);
    let label;
    if (qNum <= 4) {
      label = "Periodo " + q.n;
    } else {
      label = "Tiempo Extra " + (qNum - 4);
    }
    const opt = document.createElement("option");
    opt.value = q.n;
    opt.textContent = label;
    quarterFilter.appendChild(opt);
  });
  quarterFilter.addEventListener("change", () => {
    currentQuarter = quarterFilter.value || "total";
    renderPBPEvents();
  });
}

function applyPBPFilters() {
  renderPBPEvents();
}

function fillComparisonSelectors(data) {
  const teamAPlayers = data.SCOREBOARD.TEAM[0].PLAYER || [];
  const teamBPlayers = data.SCOREBOARD.TEAM[1].PLAYER || [];
  playersData = [...teamAPlayers, ...teamBPlayers];
  const select1 = document.getElementById("comparePlayer1");
  const select2 = document.getElementById("comparePlayer2");
  if (!select1 || !select2) return;
  select1.innerHTML = '<option value="">Selecciona un jugador</option>';
  select2.innerHTML = '<option value="">Selecciona un jugador</option>';
  playersData.forEach(player => {
    const opt1 = document.createElement("option");
    opt1.value = player.id;
    opt1.textContent = player.name;
    select1.appendChild(opt1);
    const opt2 = document.createElement("option");
    opt2.value = player.id;
    opt2.textContent = player.name;
    select2.appendChild(opt2);
  });
}

let radarChart;
function updateRadarChart(player1, player2) {
  const statsLabels = ['PTS', 'REB', 'AS', 'ST', 'TO', 'BS', 'VAL'];
  const player1Stats = [
    parseInt(player1.pts, 10) || 0,
    (parseInt(player1.ro, 10) || 0) + (parseInt(player1.rd, 10) || 0),
    parseInt(player1.assist, 10) || 0,
    parseInt(player1.st, 10) || 0,
    parseInt(player1.to, 10) || 0,
    parseInt(player1.bs, 10) || 0,
    parseInt(player1.val, 10) || 0
  ];
  const player2Stats = [
    parseInt(player2.pts, 10) || 0,
    (parseInt(player2.ro, 10) || 0) + (parseInt(player2.rd, 10) || 0),
    parseInt(player2.assist, 10) || 0,
    parseInt(player2.st, 10) || 0,
    parseInt(player2.to, 10) || 0,
    parseInt(player2.bs, 10) || 0,
    parseInt(player2.val, 10) || 0
  ];
  const ctx = document.getElementById("radarChart").getContext("2d");
  if (radarChart) {
    radarChart.destroy();
  }
  radarChart = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: statsLabels,
      datasets: [{
        label: player1.name,
        data: player1Stats,
        backgroundColor: 'rgba(239, 227, 76, 0.2)',
        borderColor: '#EFE34C',
        pointBackgroundColor: '#EFE34C'
      }, {
        label: player2.name,
        data: player2Stats,
        backgroundColor: 'rgba(182, 41, 41, 0.2)',
        borderColor: '#B62929',
        pointBackgroundColor: '#B62929'
      }]
    },
    options: {
      responsive: true,
      scales: {
        r: {
          beginAtZero: true
        }
      }
    }
  });
}

function getTeamTotalsForShots(teamPlayers) {
  let totalT2i = 0, totalT2c = 0;
  let totalT3i = 0, totalT3c = 0;
  let totalTLi = 0, totalTLc = 0;
  let totalRebOf = 0, totalRebDef = 0;
  let totalAssist = 0, totalSt = 0, totalTo = 0, totalBs = 0, totalPf = 0;
  teamPlayers.forEach(p => {
    const p2a = parseInt(p.p2a, 10) || 0;
    const p2m = parseInt(p.p2m, 10) || 0;
    const p3a = parseInt(p.p3a, 10) || 0;
    const p3m = parseInt(p.p3m, 10) || 0;
    const p1a = parseInt(p.p1a, 10) || 0;
    const p1m = parseInt(p.p1m, 10) || 0;
    totalT2i += p2a;
    totalT2c += p2m;
    totalT3i += p3a;
    totalT3c += p3m;
    totalTLi += p1a;
    totalTLc += p1m;
    totalRebOf += parseInt(p.ro, 10) || 0;
    totalRebDef += parseInt(p.rd, 10) || 0;
    totalAssist += parseInt(p.assist, 10) || 0;
    totalSt += parseInt(p.st, 10) || 0;
    totalTo += parseInt(p.to, 10) || 0;
    totalBs += parseInt(p.bs, 10) || 0;
    totalPf += parseInt(p.pf, 10) || 0;
  });
  return {
    t2i: totalT2i,
    t2c: totalT2c,
    t3i: totalT3i,
    t3c: totalT3c,
    tlc: totalTLi,
    tli: totalTLc,
    rebOf: totalRebOf,
    rebDef: totalRebDef,
    assist: totalAssist,
    st: totalSt,
    to: totalTo,
    bs: totalBs,
    pf: totalPf
  };
}

function fillComparativeCharts(data) {
  if (!data.SCOREBOARD || !data.SCOREBOARD.TEAM || data.SCOREBOARD.TEAM.length < 2) {
    console.warn("No se encontraron dos equipos en data.SCOREBOARD.TEAM");
    return;
  }
  const teamAobj = data.SCOREBOARD.TEAM[0];
  const teamBobj = data.SCOREBOARD.TEAM[1];
  const teamAName = teamAobj.name || "Equipo A";
  const teamBName = teamBobj.name || "Equipo B";
  const teamAPlayers = teamAobj.PLAYER || [];
  const teamBPlayers = teamBobj.PLAYER || [];
  const teamATotals = getTeamTotalsForShots(teamAPlayers);
  const teamBTotals = getTeamTotalsForShots(teamBPlayers);
  const teamA_T2 = teamATotals.t2i > 0 ? ((teamATotals.t2c / teamATotals.t2i) * 100).toFixed(1) : 0;
  const teamA_T3 = teamATotals.t3i > 0 ? ((teamATotals.t3c / teamATotals.t3i) * 100).toFixed(1) : 0;
  const teamA_TL = teamATotals.tlc > 0 ? ((teamATotals.tli / teamATotals.tlc) * 100).toFixed(1) : 0;
  const teamB_T2 = teamBTotals.t2i > 0 ? ((teamBTotals.t2c / teamBTotals.t2i) * 100).toFixed(1) : 0;
  const teamB_T3 = teamBTotals.t3i > 0 ? ((teamBTotals.t3c / teamBTotals.t3i) * 100).toFixed(1) : 0;
  const teamB_TL = teamBTotals.tlc > 0 ? ((teamBTotals.tli / teamBTotals.tlc) * 100).toFixed(1) : 0;
  const group1Labels = ['%TL', '%T2', '%T3'];
  const teamAGroup1 = [teamA_TL, teamA_T2, teamA_T3];
  const teamBGroup1 = [teamB_TL, teamB_T2, teamB_T3];
  const teamA_Reb = teamATotals.rebOf + teamATotals.rebDef;
  const teamB_Reb = teamBTotals.rebOf + teamBTotals.rebDef;
  const group2Labels = ['REB', 'AS', 'ST', 'TO', 'BS', 'PF'];
  const teamAGroup2 = [
    teamA_Reb,
    teamATotals.assist,
    teamATotals.st,
    teamATotals.to,
    teamATotals.bs,
    teamATotals.pf
  ];
  const teamBGroup2 = [
    teamB_Reb,
    teamBTotals.assist,
    teamBTotals.st,
    teamBTotals.to,
    teamBTotals.bs,
    teamBTotals.pf
  ];
  // Grupo 1 Chart
  const ctx1 = document.getElementById("chartGroup1");
  if (ctx1) {
    new Chart(ctx1.getContext("2d"), {
      type: 'bar',
      data: {
        labels: group1Labels,
        datasets: [{
          label: teamAName,
          data: teamAGroup1,
          backgroundColor: '#EFE34C'
        }, {
          label: teamBName,
          data: teamBGroup1,
          backgroundColor: '#B62929'
        }]
      },
      options: {
        responsive: true,
        scales: { y: { beginAtZero: true } }
      }
    });
  }
  // Grupo 2 Chart
  const ctx2 = document.getElementById("chartGroup2");
  if (ctx2) {
    new Chart(ctx2.getContext("2d"), {
      type: 'bar',
      data: {
        labels: group2Labels,
        datasets: [{
          label: teamAName,
          data: teamAGroup2,
          backgroundColor: '#EFE34C'
        }, {
          label: teamBName,
          data: teamBGroup2,
          backgroundColor: '#B62929'
        }]
      },
      options: {
        responsive: true,
        scales: { y: { beginAtZero: true } }
      }
    });
  }
}

/***********************************************
 * GRÁFICOS ADICIONALES
 ***********************************************/
function fillTeamComparisonChart(data) {
  const teamAobj = data.SCOREBOARD.TEAM[0];
  const teamBobj = data.SCOREBOARD.TEAM[1];
  const teamAName = teamAobj.name || "Equipo A";
  const teamBName = teamBobj.name || "Equipo B";
  const teamAPlayers = teamAobj.PLAYER || [];
  const teamBPlayers = teamBobj.PLAYER || [];
  const totalsA = getTeamTotalsForShots(teamAPlayers);
  const totalsB = getTeamTotalsForShots(teamBPlayers);
  const teamA_T2 = totalsA.t2i > 0 ? ((totalsA.t2c / totalsA.t2i) * 100).toFixed(1) : 0;
  const teamA_T3 = totalsA.t3i > 0 ? ((totalsA.t3c / totalsA.t3i) * 100).toFixed(1) : 0;
  const teamA_TL = totalsA.tlc > 0 ? ((totalsA.tli / totalsA.tlc) * 100).toFixed(1) : 0;
  const teamB_T2 = totalsB.t2i > 0 ? ((totalsB.t2c / totalsB.t2i) * 100).toFixed(1) : 0;
  const teamB_T3 = totalsB.t3i > 0 ? ((totalsB.t3c / totalsB.t3i) * 100).toFixed(1) : 0;
  const teamB_TL = totalsB.tlc > 0 ? ((totalsB.tli / totalsB.tlc) * 100).toFixed(1) : 0;
  const labels = ['%TL', '%T2', '%T3'];
  const dataA = [teamA_TL, teamA_T2, teamA_T3];
  const dataB = [teamB_TL, teamB_T2, teamB_T3];
  const ctx = document.getElementById("teamComparisonChart").getContext("2d");
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: teamAName,
        data: dataA,
        backgroundColor: '#EFE34C'
      }, {
        label: teamBName,
        data: dataB,
        backgroundColor: '#B62929'
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      scales: {
        x: { beginAtZero: true }
      }
    }
  });
}

function fillScoreEvolutionChart(data) {
  const quarters = data.HEADER.QUARTERS.QUARTER;
  const labels = quarters.map(q => {
    const num = parseInt(q.n, 10);
    return (num <= 4) ? "Periodo " + q.n : "TE " + (num - 4);
  });
  const teamAScores = quarters.map(q => parseInt(q.scoreA) || 0);
  const teamBScores = quarters.map(q => parseInt(q.scoreB) || 0);
  const ctx = document.getElementById("scoreEvolutionChart").getContext("2d");
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: data.HEADER.TEAM[0].name || "Equipo A",
        data: teamAScores,
        borderColor: '#EFE34C',
        backgroundColor: 'rgba(239, 227, 76, 0.2)',
        fill: false,
        tension: 0.1
      }, {
        label: data.HEADER.TEAM[1].name || "Equipo B",
        data: teamBScores,
        borderColor: '#B62929',
        backgroundColor: 'rgba(182, 41, 41, 0.2)',
        fill: false,
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

function fillTopPlayersChart(data) {
  const teamAPlayers = data.SCOREBOARD.TEAM[0].PLAYER || [];
  const teamBPlayers = data.SCOREBOARD.TEAM[1].PLAYER || [];
  const topA = teamAPlayers.sort((a, b) => (parseInt(b.pts) || 0) - (parseInt(a.pts) || 0))[0];
  const topB = teamBPlayers.sort((a, b) => (parseInt(b.pts) || 0) - (parseInt(a.pts) || 0))[0];
  const labels = [topA.name, topB.name];
  const dataPoints = [parseInt(topA.pts, 10) || 0, parseInt(topB.pts, 10) || 0];
  const ctx = document.getElementById("topPlayersChart").getContext("2d");
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Puntos',
        data: dataPoints,
        backgroundColor: ['#EFE34C', '#B62929']
      }]
    },
    options: {
      responsive: true,
      scales: { y: { beginAtZero: true } }
    }
  });
}

function fillBubblePointsChart(data) {
  const players = [];
  data.SCOREBOARD.TEAM.forEach(team => {
    if (team.PLAYER) {
      team.PLAYER.forEach(p => players.push(p));
    }
  });
  function timeToMinutes(t) {
    const parts = t.split(":").map(Number);
    return parts[0] + (parts[1] / 60);
  }
  const bubbleData = players.map(p => {
    const minutes = p.minFormatted ? timeToMinutes(p.minFormatted) : 0;
    const pts = parseInt(p.pts, 10) || 0;
    const ppm = minutes > 0 ? pts / minutes : 0;
    return { x: minutes, y: pts, r: ppm * 5 };
  });
  const ctx = document.getElementById("bubblePointsChart").getContext("2d");
  new Chart(ctx, {
    type: 'bubble',
    data: {
      datasets: [{
        label: 'Puntos vs Minutos',
        data: bubbleData,
        backgroundColor: 'rgba(239, 227, 76, 0.7)'
      }]
    },
    options: {
      responsive: true,
      scales: {
        x: { title: { display: true, text: 'Minutos Jugados' } },
        y: { title: { display: true, text: 'Puntos' }, beginAtZero: true }
      }
    }
  });
}

function fillBubbleValChart(data) {
  const players = [];
  data.SCOREBOARD.TEAM.forEach(team => {
    if (team.PLAYER) {
      team.PLAYER.forEach(p => players.push(p));
    }
  });
  function timeToMinutes(t) {
    const parts = t.split(":").map(Number);
    return parts[0] + (parts[1] / 60);
  }
  const bubbleData = players.map(p => {
    const minutes = p.minFormatted ? timeToMinutes(p.minFormatted) : 0;
    const val = parseInt(p.val, 10) || 0;
    const vpm = minutes > 0 ? val / minutes : 0;
    return { x: minutes, y: val, r: vpm * 5 };
  });
  const ctx = document.getElementById("bubbleValChart").getContext("2d");
  new Chart(ctx, {
    type: 'bubble',
    data: {
      datasets: [{
        label: 'Valoración vs Minutos',
        data: bubbleData,
        backgroundColor: 'rgba(182, 41, 41, 0.7)'
      }]
    },
    options: {
      responsive: true,
      scales: {
        x: { title: { display: true, text: 'Minutos Jugados' } },
        y: { title: { display: true, text: 'Valoración' }, beginAtZero: true }
      }
    }
  });
}

function fillEvolutionChart(data) {
  // Suponemos que data.HEADER.QUARTERS.QUARTER contiene los datos de cada periodo con propiedades "scoreA" y "scoreB"
  if (!data.HEADER || !data.HEADER.QUARTERS || !data.HEADER.QUARTERS.QUARTER) {
    console.warn("No se encontraron datos de cuartos en el JSON.");
    return;
  }
  
  const quarters = data.HEADER.QUARTERS.QUARTER;
  const labels = [];
  const acumuladoA = [];
  const acumuladoB = [];
  
  let totalA = 0;
  let totalB = 0;
  
  quarters.forEach(q => {
    const num = parseInt(q.n, 10);
    const label = (num <= 4) ? `Periodo ${q.n}` : `TE ${num - 4}`;
    labels.push(label);
    
    totalA += parseInt(q.scoreA, 10) || 0;
    totalB += parseInt(q.scoreB, 10) || 0;
    
    acumuladoA.push(totalA);
    acumuladoB.push(totalB);
  });
  
  // Dibujar la gráfica en el canvas con id "evolutionChart"
  const ctx = document.getElementById("evolutionChart").getContext("2d");
  
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: data.HEADER.TEAM[0].name || "Equipo A",
        data: acumuladoA,
        borderColor: '#EFE34C',
        backgroundColor: 'rgba(239, 227, 76, 0.2)',
        fill: false,
        tension: 0.1
      }, {
        label: data.HEADER.TEAM[1].name || "Equipo B",
        data: acumuladoB,
        borderColor: '#B62929',
        backgroundColor: 'rgba(182, 41, 41, 0.2)',
        fill: false,
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}


function initCharts(data) {
  fillTeamComparisonChart(data);
  fillScoreEvolutionChart(data);
  fillTopPlayersChart(data);
  fillBubblePointsChart(data);
  fillBubbleValChart(data);
  fillEvolutionChart(data);
  // El Radar Chart se actualizará mediante la interacción del usuario
}

/***********************************************
 * NUEVA FUNCIÓN: Cuadro Resumen por Cuarto
 ***********************************************/
function fillQuarterSummary(data) {
  if (!data.HEADER || !data.HEADER.QUARTERS || !data.HEADER.QUARTERS.QUARTER) return;
  const tbody = document.querySelector("#quarterTable tbody");
  tbody.innerHTML = "";
  let totalA = 0, totalB = 0;
  
  data.HEADER.QUARTERS.QUARTER.forEach(q => {
    const quarterNum = parseInt(q.n, 10);
    const label = quarterNum <= 4 ? `Periodo ${q.n}` : `Tiempo Extra ${quarterNum - 4}`;
    const scoreA = parseInt(q.scoreA, 10) || 0;
    const scoreB = parseInt(q.scoreB, 10) || 0;
    totalA += scoreA;
    totalB += scoreB;
    const row = document.createElement("tr");
    row.innerHTML = `<td>${label}</td><td>${scoreA}</td><td>${scoreB}</td>`;
    tbody.appendChild(row);
  });
  
  // Fila final con totales
  const totalRow = document.createElement("tr");
  totalRow.style.fontWeight = "bold";
  totalRow.innerHTML = `<td>TOTAL</td><td>${totalA}</td><td>${totalB}</td>`;
  tbody.appendChild(totalRow);
}
