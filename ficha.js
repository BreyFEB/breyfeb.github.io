// Get gameId from URL
function getGameIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('gameId');
}

// Function to use a short name for the team, only first three 3 letters for the first word that has
// three valid letters (no special characters). Length of short name should be 3
function getShortName(name) {
  const words = name.split(' ');
  for (const word of words) {
    const cleanWord = word.replace(/[^a-zA-Z]/g, '');
    if (cleanWord.length >= 3) {
      return cleanWord.slice(0, 3);
    }
  }
  return name.slice(0, 3);
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
    "TERCERA FEB": "Tercera FEB",
    "C ESP CLUBES INF FEM": "Clubes Infantil Femenino",
    "C ESP CLUBES INF MASC": "Clubes Infantil Masculino",
    "C ESP CLUBES MINI FEM": "Clubes Mini Femenino",
    "C ESP CLUBES MINI MASC": "Clubes Mini Masculino"
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

document.addEventListener("DOMContentLoaded", () => {
  const gameId = getGameIdFromUrl();
  if (!gameId) {
    alert("No se ha especificado ningún partido.");
    return;
  }
  // URL del JSON (ajusta a la versión que necesites)
  const jsonURL = `https://raw.githubusercontent.com/BreyFEB/breyfeb.github.io/refs/heads/main/JSONs%20fichas/FullMatch_${gameId}.json`;

  fetch(jsonURL)
    .then(resp => {
      if (!resp.ok) throw new Error("No disponible");
      return resp.json();
    })
    .then(data => {
      console.log("JSON cargado:", data); // Para depuración
      const header = data.HEADER;
      const tA = header.TEAM[0];
      const tB = header.TEAM[1];

      // Actualizar logos, nombres y marcador en el Hero (si se usa el bloque estático del nuevo hero)
      document.querySelector('.team-box:first-child .team-logo').src = tA.logo;
      // Use a short name for the team, only first three 3 letters for the first word that has
      // three valid letters (no special characters). Length of short name should be 3
      const shortNameA = getShortName(tA.name);
      document.querySelector('.team-box:first-child .team-name').textContent = shortNameA;
      document.querySelector('.team-box:first-child .team-name').title = tA.name;
      document.querySelector('.team-box:last-child .team-logo').src = tB.logo;
      const shortNameB = getShortName(tB.name);
      document.querySelector('.team-box:last-child .team-name').textContent = shortNameB;
      document.querySelector('.team-box:last-child .team-name').title = tB.name;

      // Actualizar el marcador
      const scoreValueEl = document.querySelector('.score-value');
      scoreValueEl.innerHTML = `<span class="score-a">${tA.pts}</span> - <span class="score-b">${tB.pts}</span>`;
      // Highlight the winner
      const scoreASpan = scoreValueEl.querySelector('.score-a');
      const scoreBSpan = scoreValueEl.querySelector('.score-b');
      scoreASpan.classList.remove('score-winner');
      scoreBSpan.classList.remove('score-winner');
      if (parseInt(tA.pts) > parseInt(tB.pts)) {
        scoreASpan.classList.add('score-winner');
      } else if (parseInt(tB.pts) > parseInt(tA.pts)) {
        scoreBSpan.classList.add('score-winner');
      }

      // Actualizar estado y fecha/hora
      const scoreStatusEl = document.querySelector('.score-status');
      scoreStatusEl.textContent = "Cuarto " + String(header.quarter) + " | " + header.time;
      const matchDatetimeEl = document.querySelector('.match-datetime');
      matchDatetimeEl.textContent = header.starttime || '01-01-2025 - 20:00';

      // Actualizar el video si existe videoUrl en el JSON (opcional)
      const videoIframe = document.querySelector('.hero-video iframe');
      if (header.videoUrl && videoIframe) {
        videoIframe.src = header.videoUrl;
        videoIframe.style.display = '';
      } else if (videoIframe) {
        videoIframe.style.display = 'none';
        const heroVideoDiv = document.querySelector('.hero-video');
        if (heroVideoDiv) {
          heroVideoDiv.innerHTML = `
            <div style="
              width: 100%;
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
              background: #fff3e6;
              border: 2px solid #FF9E1B;
              border-radius: 12px;
              color: #B62929;
              font-size: 1.3em;
              font-weight: 600;
              text-align: center;
              min-height: 170px;
            ">
              <span style="font-size:2em;color:#FF9E1B;margin-right:0.5em;vertical-align:middle;">&#128249;</span>
              Video no disponible para este partido
            </div>
          `;
        }
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
      // Format competition name as in other pages
      const competicion = formatCompetitionName(header.competition);
      const pabellon = header.field
      herophaseDiv.textContent =  `${fase} • ${competicion} • ${pabellon}`;

      // Meter resumen de ChatGPT
      fetch(`https://raw.githubusercontent.com/BreyFEB/breyfeb.github.io/main/JSONs%20fichas/FullMatch_${gameId}_cronica_chatgpt.html`)
        .then(res => {
          if (!res.ok) {
            throw new Error('Crónica no encontrada');
          }
          return res.text();
        })
        .then(html => {
          const target = document.querySelector(".cronicatext");
          if (target) target.innerHTML = html;
          else console.warn("Element '.cronicatext' not found.");
        })
        .catch(err => {
          const target = document.querySelector(".cronicatext");
          if (target) target.innerHTML = "La crónica estará disponible al acabar el partido.";
          console.error("Error loading crónica:", err);
        });
      
      // Construir diccionarios: fotos, nombres de jugadores y equipos
      buildPlayerPhotoDictionary(data);
      buildPlayerNamesDictionary(data);

      // Inicializar las secciones principales
      // updateHeroFromJSON(data);
      setupMiniHeader(data);
      fillBoxScore(data);

      // === NUEVO: Lógica para los tabs de selección de box score ===
      const teamStatsButtons = document.querySelectorAll('.team-stats-button');
      const teamABox = document.querySelector('.team-box-score:nth-of-type(1)');
      const teamBBox = document.querySelector('.team-box-score:nth-of-type(2)');
      // Rellenar los textos de los botones de equipo
      const teamAName = data.SCOREBOARD.TEAM[0].name || "Equipo A";
      const teamBName = data.SCOREBOARD.TEAM[1].name || "Equipo B";
      const btnA = document.querySelector('button[data-team="a"]');
      const btnB = document.querySelector('button[data-team="b"]');
      if (btnA) btnA.textContent = teamAName;
      if (btnB) btnB.textContent = teamBName;
      // Evento para los tabs
      teamStatsButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          teamStatsButtons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const val = btn.getAttribute('data-team');
          if (val === 'a') {
            teamABox.style.display = '';
            teamBBox.style.display = 'none';
          } else if (val === 'b') {
            teamABox.style.display = 'none';
            teamBBox.style.display = '';
          } else {
            teamABox.style.display = '';
            teamBBox.style.display = '';
          }
        });
      });
      // Mostrar ambos por defecto
      if (teamABox && teamBBox) {
        teamABox.style.display = '';
        teamBBox.style.display = '';
      }
      // === FIN NUEVO ===

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
    .catch(err => {
      // Try to get the game name from the breadcrumb or fallback
      let gameName = '';
      const breadcrumbDiv = document.querySelector('.hero-breadcrumb');
      if (breadcrumbDiv) {
        const lastSpan = breadcrumbDiv.querySelector('span:last-child');
        if (lastSpan && lastSpan.textContent.trim()) {
          gameName = lastSpan.textContent.trim();
        }
      }
      if (!gameName) gameName = 'Partido desconocido';
      const main = document.querySelector('.hero-content') || document.body;
      main.innerHTML = `
        <div style="
          max-width: 500px;
          margin: 60px auto 0 auto;
          background: #fff3e6;
          border: 2px solid #FF9E1B;
          border-radius: 16px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.07);
          padding: 40px 30px 32px 30px;
          text-align: center;
        ">
          <div style="font-size:3em; color:#FF9E1B; margin-bottom:0.2em;">
            <span style="vertical-align:middle;">&#9888;</span>
          </div>
          <div style="font-size:1.3em; color:#B62929; font-weight:600;">
            Los datos de este partido aún no están disponibles.
          </div>
          <div style="font-size:1em; color:#666; margin-top:1em;">
            Por favor, vuelve más tarde.
          </div>
        </div>
      `;
      console.error("Error al cargar JSON partido:", err);
    });

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

  // Filtro para mostrar box score de un equipo u otro
  // const teamStatsFilter = document.getElementById("teamStatsFilter");
  // const teamABox = document.querySelector('.team-box-score:nth-of-type(1)');
  // const teamBBox = document.querySelector('.team-box-score:nth-of-type(2)');
  // if (teamStatsFilter && teamABox && teamBBox) {
  //   teamStatsFilter.addEventListener('change', () => {
  //     if (teamStatsFilter.value === 'a') {
  //       teamABox.style.display = '';
  //       teamBBox.style.display = 'none';
  //     } else if (teamStatsFilter.value === 'b') {
  //       teamABox.style.display = 'none';
  //       teamBBox.style.display = '';
  //     } else {
  //       teamABox.style.display = '';
  //       teamBBox.style.display = '';
  //     }
  //   });
  // }

  // --- Lógica para mostrar/ocultar y restablecer filtros Play by Play ---
  const pbpShowFiltersBtn = document.getElementById("pbpShowFiltersBtn");
  const pbpResetFiltersBtn = document.getElementById("pbpResetFiltersBtn");
  const pbpFiltersDiv = document.querySelector(".pbp-filters");

  if (pbpShowFiltersBtn && pbpFiltersDiv && pbpResetFiltersBtn) {
    pbpShowFiltersBtn.addEventListener("click", () => {
      const visible = !pbpFiltersDiv.classList.contains("pbp-filters-hidden");
      if (visible) {
        pbpFiltersDiv.classList.add("pbp-filters-hidden");
        pbpShowFiltersBtn.textContent = "Mostrar filtros";
        pbpResetFiltersBtn.style.display = "none";
      } else {
        pbpFiltersDiv.classList.remove("pbp-filters-hidden");
        pbpShowFiltersBtn.textContent = "Ocultar filtros";
        pbpResetFiltersBtn.style.display = "inline-block";
      }
    });
    pbpResetFiltersBtn.addEventListener("click", () => {
      pbpFiltersDiv.querySelectorAll("select").forEach(sel => sel.selectedIndex = 0);
      if (typeof currentQuarter !== 'undefined') currentQuarter = "total";
      renderPBPEvents && renderPBPEvents();
      pbpFiltersDiv.classList.add("pbp-filters-hidden");
      pbpShowFiltersBtn.textContent = "Mostrar filtros";
      pbpResetFiltersBtn.style.display = "none";
    });
  }
});

// === Botón para subir arriba en el Play by Play (scroll global) ===
document.addEventListener('DOMContentLoaded', function() {
  const scrollTopBtn = document.getElementById('pbpScrollTopBtn');
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
      playerPhotos[p.id] = p.logo || "player_placeholder.png";
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
/*
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
*/

function setupMiniHeader(data) {
  const miniHeader = document.getElementById("miniHeader");
  if (!miniHeader) return;
  window.addEventListener("scroll", () => {
    if (window.scrollY > 100) {
      miniHeader.style.display = "flex";
      const tA = data.HEADER.TEAM[0];
      const tB = data.HEADER.TEAM[1];
      // Determinar el ganador
      let scoreAClass = "";
      let scoreBClass = "";
      if (parseInt(tA.pts) > parseInt(tB.pts)) {
        scoreAClass = " score-winner";
      } else if (parseInt(tB.pts) > parseInt(tA.pts)) {
        scoreBClass = " score-winner";
      }
      miniHeader.querySelector(".mini-score").innerHTML = `
        <div class="mini-score-team mini-score-team-left">
          <img src="${tA.logo}" alt="${tA.name}" class="mini-team-logo">
          <span class="mini-team-name">${tA.name}</span>
        </div>
        <div class="mini-score-info">
          <span class="mini-score-text"><span class="mini-score-a${scoreAClass}">${tA.pts}</span> - <span class="mini-score-b${scoreBClass}">${tB.pts}</span></span>
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
    
    // Use player_placeholder.png as fallback
    const playerPhoto = p.logo || "player_placeholder.png";
    const playerNameCell = `
      <div class="player-cell">
        <a href="player_profile.html?player_id=${p.id}" style="text-decoration: none; color: inherit;"> <img src="${playerPhoto}" alt="${p.name}" class="player-photo" onerror="this.onerror=null; this.src='player_placeholder.png';"> </a>
        <a href="player_profile.html?player_id=${p.id}" style="text-decoration: none; color: inherit;">${p.name}</a>
      </div>
    `;
    return [
      p.no || "",
      playerNameCell,
      p.minFormatted || "",
      parseInt(p.pts, 10) || 0,
      p2m,
      p2a,
      p2pValue.toFixed(1),
      p3m,
      p3a,
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
  const numCols = teamData[0].length;
  const totals = new Array(numCols).fill(0);
  
  // First pass: sum up all the raw numbers
  teamData.forEach(row => {
    for (let i = 2; i < numCols; i++) {
      totals[i] += parseFloat(row[i]) || 0;
    }
  });

  // Calculate percentages correctly
  // 2P% = (total 2PM / total 2PA) * 100
  const total2PM = totals[4]; // 2PM column
  const total2PA = totals[5]; // 2PA column
  totals[6] = total2PA > 0 ? ((total2PM / total2PA) * 100).toFixed(1) : "0.0";

  // 3P% = (total 3PM / total 3PA) * 100
  const total3PM = totals[7]; // 3PM column
  const total3PA = totals[8]; // 3PA column
  totals[9] = total3PA > 0 ? ((total3PM / total3PA) * 100).toFixed(1) : "0.0";

  // FT% = (total FTM / total FTA) * 100
  const totalFTM = totals[10]; // FTM column
  const totalFTA = totals[11]; // FTA column
  totals[12] = totalFTA > 0 ? ((totalFTM / totalFTA) * 100).toFixed(1) : "0.0";
  
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
    img.src = playerPhotos[ev.idPlayer] || "player_placeholder.png";
    img.onerror = function() {
      this.onerror = null;
      this.src = "player_placeholder.png";
    };
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
  // Cambia el orden: primero acción, luego nombre
  detailsDiv.appendChild(actionTextDiv);
  detailsDiv.appendChild(playerNameDiv);
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
  if (!data.PLAYBYPLAY || !data.PLAYBYPLAY.LINES) {
    console.warn("No se encontraron eventos de play by play en el JSON.");
    return;
  }

  // === Ajustar tamaño del contenedor y canvas ===
  const evolutionCanvas = document.getElementById("evolutionChart");
  if (!evolutionCanvas) return;
  const evolutionContainer = evolutionCanvas.parentElement;
  const CANVAS_W = 800;
  const CANVAS_H = 400;
  evolutionCanvas.width = CANVAS_W;
  evolutionCanvas.height = CANVAS_H;
  evolutionCanvas.style.width = CANVAS_W + "px";
  evolutionCanvas.style.height = CANVAS_H + "px";
  if (evolutionContainer) {
    evolutionContainer.style.width = CANVAS_W + "px";
    evolutionContainer.style.height = CANVAS_H + "px";
  }

  // === Preparar datos usando segundo transcurrido desde el inicio ===
  const competitionName = (data.HEADER.competition || '').toUpperCase();
  const isMini = competitionName.includes('MINI');

  const REG_Q_COUNT = isMini ? 6 : 4;              // Nº de cuartos "normales"
  const REG_Q_LEN   = isMini ? 480 : 600;          // Duración de cuarto normal (s)

  const allEvents = data.PLAYBYPLAY.LINES.slice().sort((a, b) => (a.num || 0) - (b.num || 0));

  const pointsA = [];
  const pointsB = [];
  const tooltipLabels = [];

  const quarterStartSeconds = [];
  const quarterLabelBySeconds = {};
  const seenQuarters = new Set();

  let currentScoreA = 0;
  let currentScoreB = 0;
  let lastQuarter = 1;

  function getQuarterBaseSec(q) {
    q = parseInt(q, 10);
    if (q <= REG_Q_COUNT) return (q - 1) * REG_Q_LEN;
    return REG_Q_COUNT * REG_Q_LEN + (q - (REG_Q_COUNT + 1)) * 300; // OT de 5 min
  }
  function getQuarterLengthSec(q) {
    return q <= REG_Q_COUNT ? REG_Q_LEN : 300;
  }

  // Punto inicial (0-0 en segundo 0)
  pointsA.push({ x: 0, y: 0 });
  pointsB.push({ x: 0, y: 0 });
  const firstQuarterLenSec = getQuarterLengthSec(1); // 600 o 480
  const firstQuarterStartTime = firstQuarterLenSec / 60; // 10 o 8 (en minutos)
  tooltipLabels.push(`C1 ${firstQuarterStartTime}:00`);
  quarterStartSeconds.push(0);
  quarterLabelBySeconds[0] = "C1";
  seenQuarters.add(1);

  allEvents.forEach(ev => {
    const q = parseInt(ev.quarter, 10);
    lastQuarter = q;
    const [mm, ss] = (ev.time || "0:0").split(":" ).map(Number);
    const timeRemaining = (mm || 0) * 60 + (ss || 0);
    const quarterLen = getQuarterLengthSec(q);
    const elapsedInQuarter = quarterLen - timeRemaining; // 0-600 or 0-300
    const xSec = getQuarterBaseSec(q) + elapsedInQuarter;

    // Detectar inicio de nuevo cuarto (primera vez que vemos este quarter)
    if (!seenQuarters.has(q)) {
      const qsSec = getQuarterBaseSec(q);
      const qLabel = (q <= REG_Q_COUNT) ? `C${q}` : `TE${q - REG_Q_COUNT}`;
      quarterStartSeconds.push(qsSec);
      quarterLabelBySeconds[qsSec] = qLabel;
      seenQuarters.add(q);
    }

    // Actualizar marcadores si hay info
    if (ev.scoreA !== null && ev.scoreA !== undefined) currentScoreA = parseInt(ev.scoreA, 10);
    if (ev.scoreB !== null && ev.scoreB !== undefined) currentScoreB = parseInt(ev.scoreB, 10);

    pointsA.push({ x: xSec, y: currentScoreA });
    pointsB.push({ x: xSec, y: currentScoreB });
    tooltipLabels.push(`C${q} ${ev.time}`);
  });

  // === Añadir punto final (FIN DEL PARTIDO) ===
  const finalSec = getQuarterBaseSec(lastQuarter) + getQuarterLengthSec(lastQuarter);
  if (pointsA[pointsA.length - 1].x < finalSec) {
    pointsA.push({ x: finalSec, y: currentScoreA });
    pointsB.push({ x: finalSec, y: currentScoreB });
    tooltipLabels.push('FINAL');
  }
  quarterLabelBySeconds[finalSec] = 'FINAL';

  const finalScoreA = currentScoreA;
  const finalScoreB = currentScoreB;

  const ctx = evolutionCanvas.getContext("2d");
  const finalMarkersPlugin = {
    id: 'finalMarkers',
    afterDraw(chart) {
      const xScale = chart.scales.x;
      const yScale = chart.scales.y;
      const xFinal = xScale.getPixelForValue(finalSec);
      const ctxP = chart.ctx;
      ctxP.save();
      ctxP.font = 'bold 12px Montserrat, Arial';
      ctxP.textAlign = 'left';
      ctxP.textBaseline = 'middle';
      // Score A
      ctxP.fillStyle = '#EFE34C';
      const yA = yScale.getPixelForValue(finalScoreA);
      ctxP.fillText(finalScoreA.toString(), xFinal + 6, yA);
      // Score B
      ctxP.fillStyle = '#B62929';
      const yB = yScale.getPixelForValue(finalScoreB);
      ctxP.fillText(finalScoreB.toString(), xFinal + 6, yB);
    }
  };

  new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [
        {
          label: data.HEADER.TEAM[0].name || "Equipo A",
          data: pointsA,
          borderColor: '#EFE34C',
          backgroundColor: 'rgba(239,227,76,0.15)',
          fill: false,
          tension: 0.1,
          pointRadius: 0,
        },
        {
          label: data.HEADER.TEAM[1].name || "Equipo B",
          data: pointsB,
          borderColor: '#B62929',
          backgroundColor: 'rgba(182,41,41,0.15)',
          fill: false,
          tension: 0.1,
          pointRadius: 0,
        }
      ]
    },
    options: {
      maintainAspectRatio: false,
      layout: {
        padding: { right: 60 }
      },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            title: context => tooltipLabels[context[0].dataIndex],
            label: ctx => `${ctx.dataset.label}: ${ctx.formattedValue}`
          },
          // No external drawing here; handled by hoverLinePlugin
        },
        legend: { display: true }
      },
      scales: {
        x: {
          type: 'linear',
          title: { display: true, text: 'Tiempo transcurrido' },
          min: 0,
          ticks: {
            stepSize: 300, // 5-minute granularity so FINAL tick always appears
            callback: value => {
              if (quarterLabelBySeconds[value]) return quarterLabelBySeconds[value];
              if (value === finalSec) return 'FINAL';
              return '';
            }
          },
          grid: {
            color: context => quarterLabelBySeconds[context.tick.value] ? '#bbb' : 'rgba(0,0,0,0)',
            lineWidth: context => quarterLabelBySeconds[context.tick.value] ? 1 : 0
          }
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Puntos anotados' }
        }
      }
    },
    plugins: [finalMarkersPlugin, {
      id: 'hoverLinePlugin',
      afterDraw(chart) {
        const tooltip = chart.tooltip;
        if (!tooltip || !tooltip._active || !tooltip._active.length) return;
        const ctx = chart.ctx;
        const active = tooltip._active[0];
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(active.element.x, chart.chartArea.top);
        ctx.lineTo(active.element.x, chart.chartArea.bottom);
        ctx.lineWidth = 2;
        // Light gray
        ctx.strokeStyle = '#bbb';
        ctx.setLineDash([]);
        ctx.stroke();
        ctx.restore();
      }
    }]
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
  // Rellenar cabeceras de tabla (th tags)
  const header_team_a = document.getElementById("quarterTable-header-team-a");
  header_team_a.textContent = data.HEADER.TEAM[0].name;
  
  const header_team_b = document.getElementById("quarterTable-header-team-b");
  header_team_b.textContent = data.HEADER.TEAM[1].name;
  
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

// Calculate each team's biggest lead
let biggestLeadLocal = 0;
let biggestLeadVisit = 0;

forEach()
