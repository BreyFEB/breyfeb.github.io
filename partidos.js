/*********************************
 * Variables globales para los filtros
 *********************************/
let selectedDate = null;
let selectedCompetition = null;
let selectedGender = "todos";
let selectedVenue = "";

/*********************************
 * Set para almacenar fechas con partidos
 *********************************/
let matchDatesSet = new Set();

/*********************************
 * Set para almacenar competiciones detectadas
 *********************************/
let competitionSet = new Set();

/*********************************
 * Set para almacenar pabellones únicos
 *********************************/
let venueSet = new Set();

/*********************************
 * 1) OBTENER LA LISTA DE ARCHIVOS JSON DESDE GITHUB
 *********************************/
async function fetchMatchFiles() {
  const apiUrl = "https://api.github.com/repos/BreyFEB/breyfeb.github.io/contents/Partidos%20calendario";
  try {
    // Intentar con el API de GitHub primero
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        // Añadir un User-Agent para evitar problemas con la API de GitHub
        'User-Agent': 'Cadete2025-WebApp'
      }
    });
    
    if (!response.ok) {
      throw new Error(`GitHub API responded with status: ${response.status}`);
    }
    
    const files = await response.json();
    // Filtrar solo archivos .json
    const jsonFiles = files.filter(file => file.name.endsWith(".json"));
    return jsonFiles.map(file => file.download_url);
  } catch (error) {
    console.error("Error al obtener la lista de archivos desde GitHub:", error);
    
    // Fallback: Intentar cargar desde el directorio local
    try {
      const localResponse = await fetch('/JSONs/');
      const text = await localResponse.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');
      const links = Array.from(doc.querySelectorAll('a'));
      const jsonFiles = links
        .map(link => link.href)
        .filter(href => href.endsWith('.json'))
        .map(href => `/JSONs/${href.split('/').pop()}`);
      return jsonFiles;
    } catch (localError) {
      console.error("Error al obtener la lista de archivos locales:", localError);
      return [];
    }
  }
}

/*********************************
 * 2) CARGAR PARTIDOS DESDE EL REPOSITORIO
 *********************************/
async function loadMatchesFromRepo() {
  const urls = await fetchMatchFiles();
  const allMatches = [];

  if (urls.length === 0) {
    console.error("No se pudieron cargar los archivos de partidos");
    // Mostrar mensaje de error al usuario
    const matchesList = document.getElementById("matchesList");
    if (matchesList) {
      matchesList.innerHTML = `
        <div class="error-message">
          <p>No se pudieron cargar los partidos. Por favor, intente recargar la página.</p>
          <p>Si el problema persiste, contacte al administrador.</p>
        </div>
      `;
    }
    return;
  }

  for (const url of urls) {
    try {
      const resp = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Cadete2025-WebApp'
        }
      });
      
      if (!resp.ok) {
        throw new Error(`Failed to fetch ${url}: ${resp.status}`);
      }
      
      const data = await resp.json();
      const matchesArray = parseMatchesData(data);
      allMatches.push(...matchesArray);
      matchesArray.forEach(match => {
        if (match.competition) competitionSet.add(match.competition);
        const dateStr = `${match.day}-${match.month}-${match.year}`;
        matchDatesSet.add(dateStr);
        // Añadir pabellón al set
        if (match.venuePlace) venueSet.add(match.venuePlace);
        else if (match.venueAddress) venueSet.add(match.venueAddress);
        else if (match.venue) venueSet.add(match.venue);
      });
    } catch (err) {
      console.error("Error al cargar", url, err);
    }
  }

  // Generar pestañas y filtros de competiciones
  generateCompetitionTabs(Array.from(competitionSet));
  generateCompetitionFilters(Array.from(competitionSet));

  // Ordenar los partidos por hora
  allMatches.sort((a, b) => {
    const [hourA, minuteA] = a.time.split(':').map(Number);
    const [hourB, minuteB] = b.time.split(':').map(Number);
    return hourA !== hourB ? hourA - hourB : minuteA - minuteB;
  });

  // Crear todas las tarjetas pero inicialmente ocultas
  allMatches.forEach(match => {
    const card = createMatchCard(match);
    card.style.display = 'none'; // Ocultar todas las tarjetas inicialmente
    matchesList.appendChild(card);
  });

  // Marcar en el calendario los días que tienen partidos
  markDatesWithMatches();
  
  // Establecer la fecha actual como activa en el calendario
  setDefaultActiveDate();
  
  // Aplicar el filtro inicial para mostrar solo los partidos del día actual
  applyAllFilters();

  generateVenueFilter(Array.from(venueSet));
  
  // Añadir funcionalidad de drag para scroll en escritorio
  addDragScrollFunctionality();
}

/*********************************
 * 3) PARSEAR LOS DATOS DE UN ARCHIVO JSON
 *********************************/
function parseMatchesData(json, targetCompetitionName = "PRIMERA FEB") {
  console.log("JSON recibido:", json);
  const matches = [];

  if (
    json.OVERVIEW &&
    Array.isArray(json.OVERVIEW.COMPETITIONS)
  ) {
    json.OVERVIEW.COMPETITIONS.forEach(competition => {
      const compName = competition.name || "Competición";

      // ✅ Only parse if no filter OR it matches the target
      // if (compName === targetCompetitionName) {
      if (true) {
        if (Array.isArray(competition.GAMES)) {
          competition.GAMES.forEach(game => {
            const starttimeRaw = game.StartTime || "0000-00-00T00:00:00";
            const [datePart, timePart] = starttimeRaw.split("T");
            const [year, month, day] = datePart.split("-");
            const time = (timePart || "").slice(0, 5); // HH:MM

            const status = game.Time === "00:00" ? "Pendiente" : game.Time;

            // Inferir género por el nombre exacto de la competición o por MASC/FEM
            let gender = "";
            if (
              compName === "Primera FEB" ||
              compName === "Segunda FEB" ||
              compName === "Tercera FEB" ||
              compName.toUpperCase().includes("MASC")
            ) {
              gender = "masculino";
            } else if (
              compName === "Liga Femenina Endesa" ||
              compName === "Liga Femenina Challenge" ||
              compName === "L.F.-2" ||
              compName.toUpperCase().includes("FEM")
            ) {
              gender = "femenino";
            }
            matches.push({
              starttime: starttimeRaw,
              day,
              month,
              year,
              time,
              competition: compName,
              status,
              teamAName: game.TeamA || "Equipo A",
              teamALogo: game.LogoA || "https://via.placeholder.com/50",
              teamAPts: parseInt(game.ScoreA, 10) || 0,
              teamBName: game.TeamB || "Equipo B",
              teamBLogo: game.LogoB || "https://via.placeholder.com/50",
              teamBPts: parseInt(game.ScoreB, 10) || 0,
              venue: game.field || "",
              venueAddress: game.place || "",
              venuePlace: game.Place || "",
              gender: gender,
              game_id: game.ID
            });
          });
        }
      }
    });
  }

  return matches;
}

/*********************************
 * 4) CREAR TARJETA DE PARTIDO
 *********************************/
function createMatchCard(match) {
  const card = document.createElement("div");
  card.className = "match-card";
  const dateStr = `${match.day}-${match.month}-${match.year}`;
  card.setAttribute("data-match-date", dateStr);
  card.setAttribute("data-competition", formatCompetitionName(match.competition));
  // Añadir el atributo data-gender para el filtrado
  if (match.gender) {
    card.setAttribute("data-gender", match.gender);
  }
  // Añadir data-venue para el filtrado
  if (match.venuePlace) {
    card.setAttribute("data-venue", match.venuePlace);
  } else if (match.venueAddress) {
    card.setAttribute("data-venue", match.venueAddress);
  } else if (match.venue) {
    card.setAttribute("data-venue", match.venue);
  }

  // Formato de la fecha
  const formattedDate = new Date(match.starttime).toLocaleString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Cambiar el nombre de la competición SOLO para la cabecera de la tarjeta
  let competitionName = match.competition;
  const headerDiv = document.createElement("div");
  headerDiv.className = "match-header";
  headerDiv.textContent = `${formattedDate} | ${formatCompetitionName(competitionName)}`;

  // Equipos
  const teamsDiv = document.createElement("div");
  teamsDiv.className = "teams";

  // Equipo A
  const teamARow = document.createElement("div");
  teamARow.className = "team-row";
  const teamAInfo = document.createElement("div");
  teamAInfo.className = "team-info";
  const teamALogoImg = document.createElement("img");
  teamALogoImg.className = "team-logo";
  teamALogoImg.src = match.teamALogo;
  const teamANameSpan = document.createElement("span");
  teamANameSpan.className = "team-name";
  teamANameSpan.textContent = match.teamAName;
  teamAInfo.appendChild(teamALogoImg);
  teamAInfo.appendChild(teamANameSpan);

  // Equipo B
  const teamBRow = document.createElement("div");
  teamBRow.className = "team-row";
  const teamBInfo = document.createElement("div");
  teamBInfo.className = "team-info";
  const teamBLogoImg = document.createElement("img");
  teamBLogoImg.className = "team-logo";
  teamBLogoImg.src = match.teamBLogo;
  const teamBNameSpan = document.createElement("span");
  teamBNameSpan.className = "team-name";
  teamBNameSpan.textContent = match.teamBName;
  teamBInfo.appendChild(teamBLogoImg);
  teamBInfo.appendChild(teamBNameSpan);

  // Marcadores
  const teamAScore = parseInt(match.teamAPts, 10);
  const teamBScore = parseInt(match.teamBPts, 10);

  const teamAScoreSpan = document.createElement("span");
  teamAScoreSpan.className = "team-score";
  teamAScoreSpan.textContent = match.teamAPts;

  const teamBScoreSpan = document.createElement("span");
  teamBScoreSpan.className = "team-score";
  teamBScoreSpan.textContent = match.teamBPts;

  // Marcar ganador
  if (!isNaN(teamAScore) && !isNaN(teamBScore)) {
    if (teamAScore > teamBScore) {
      teamAScoreSpan.classList.add("winner");
    } else if (teamBScore > teamAScore) {
      teamBScoreSpan.classList.add("winner");
    }
  }

  teamARow.appendChild(teamAInfo);
  teamARow.appendChild(teamAScoreSpan);

  teamBRow.appendChild(teamBInfo);
  teamBRow.appendChild(teamBScoreSpan);

  teamsDiv.appendChild(teamARow);
  teamsDiv.appendChild(teamBRow);

  // Footer
  const footerDiv = document.createElement("div");
  footerDiv.className = "match-footer";
  const statusDiv = document.createElement("div");
  statusDiv.className = "match-status";
  statusDiv.textContent = match.status;

  // Enlace al pabellón
  if (match.venuePlace) {
    const venueQuery = match.venuePlace;
    const venueLink = document.createElement("a");
    venueLink.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venueQuery)}`;
    venueLink.target = "_blank";
    venueLink.rel = "noopener noreferrer";
    venueLink.className = "venue-link";
    venueLink.innerHTML = `<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"20\" height=\"20\" fill=\"#FF9E1B\" viewBox=\"0 0 24 24\"><path d=\"M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z\"/></svg>`;
    footerDiv.appendChild(venueLink);
  } else if (match.venueAddress || match.venue) {
    const venueQuery = match.venueAddress || match.venue;
    const venueLink = document.createElement("a");
    venueLink.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venueQuery)}`;
    venueLink.target = "_blank";
    venueLink.rel = "noopener noreferrer";
    venueLink.className = "venue-link";
    venueLink.innerHTML = `<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"20\" height=\"20\" fill=\"#FF9E1B\" viewBox=\"0 0 24 24\"><path d=\"M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z\"/></svg>`;
    footerDiv.appendChild(venueLink);
  }

  const moreBtn = document.createElement("button");
  moreBtn.className = "btn-more";
  moreBtn.textContent = "Más";
  moreBtn.addEventListener("click", () => {
    window.location.href = `ficha.html?gameId=${match.game_id}`;
  });

  footerDiv.appendChild(statusDiv);
  footerDiv.appendChild(moreBtn);

  card.appendChild(headerDiv);
  card.appendChild(teamsDiv);
  card.appendChild(footerDiv);

  return card;
}

/*********************************
 * 5) GENERAR CALENDARIO DE FECHAS
 *********************************/
function generateCalendarDays() {
  const datesList = document.getElementById("datesList");
  datesList.innerHTML = "";
  const currentYear = new Date().getFullYear();
  const start = new Date(currentYear, 0, 1); // Jan 1st of current year
  const end = new Date(currentYear + 1, 0, 1); // Jan 1st of next year

  let current = new Date(start);
  while (current < end) {
    const li = document.createElement("li");
    li.className = "date-item";

    const day = current.getDate().toString().padStart(2, "0");
    const month = (current.getMonth() + 1).toString().padStart(2, "0");
    const year = current.getFullYear();
    const fullDate = `${day}-${month}-${year}`;
    li.dataset.date = fullDate;

    const dayOfWeek = current.toLocaleString("es-ES", { weekday: "short" });
    const dayNumber = current.getDate();
    const dayOfWeekSpan = document.createElement("span");
    dayOfWeekSpan.className = "dayOfWeek";
    dayOfWeekSpan.textContent =
      dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1);

    const dayNumberSpan = document.createElement("span");
    dayNumberSpan.className = "dayNumber";
    dayNumberSpan.textContent = dayNumber;

    li.appendChild(dayOfWeekSpan);
    li.appendChild(dayNumberSpan);

    datesList.appendChild(li);
    current.setDate(current.getDate() + 1);
  }
}
generateCalendarDays();

// Añadir funcionalidad de drag scroll después de generar los días
addDragScrollFunctionality();

/*********************************
 * 6) ACTUALIZAR TÍTULO DEL MES SEGÚN FECHA ACTIVA
 *********************************/
function updateMonthTitle() {
  const activeItem = document.querySelector(".dates-list .date-item.active");
  if (!activeItem) return;
  const fullDate = activeItem.dataset.date; // "DD-MM-YYYY"
  const [day, month, year] = fullDate.split("-");
  // Crear la fecha con el formato correcto
  const dateObj = new Date(year, parseInt(month) - 1, day);
  const monthName = dateObj.toLocaleString("es-ES", { month: "long" });
  document.getElementById("monthTitle").textContent =
    monthName.charAt(0).toUpperCase() + monthName.slice(1) + " " + year;
}

/*********************************
 * 7) ESTABLECER POR DEFECTO EL DÍA ACTUAL Y CENTRARLO
 *********************************/
function setDefaultActiveDate() {
  const today = new Date();
  const day = today.getDate().toString().padStart(2, "0");
  const month = (today.getMonth() + 1).toString().padStart(2, "0");
  const year = today.getFullYear();
  const todayStr = `${day}-${month}-${year}`;

  // Establecer la fecha global seleccionada
  selectedDate = todayStr;

  const targetItem = document.querySelector(
    `.date-item[data-date="${todayStr}"]`
  );

  if (targetItem) {
    targetItem.classList.add("active");
    updateMonthTitle();
    // Centrar la vista en el elemento activo sin animación al cargar
    targetItem.scrollIntoView({ behavior: "auto", inline: "center" });
  } else {
    // Fallback por si hoy no está en la lista (ej. año nuevo)
    const first = document.querySelector(".dates-list .date-item");
    if (first) {
      first.classList.add("active");
      updateMonthTitle();
      selectedDate = first.dataset.date;
    }
  }
}
setDefaultActiveDate();

/*********************************
 * 8) SCROLL DE FECHAS CON FLECHAS
 *********************************/
const arrowLeft = document.getElementById("arrowLeft");
const arrowRight = document.getElementById("arrowRight");
const datesListScroll = document.getElementById("datesList");

arrowLeft.addEventListener("click", () => {
  datesListScroll.scrollBy({ left: -datesListScroll.clientWidth / 2, behavior: "smooth" });
});
arrowRight.addEventListener("click", () => {
  datesListScroll.scrollBy({ left: datesListScroll.clientWidth / 2, behavior: "smooth" });
});

// Actualizar título del mes al hacer scroll
let scrollTimeout;
datesListScroll.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        const containerRect = datesListScroll.getBoundingClientRect();
        const containerCenter = containerRect.left + containerRect.width / 2;
        let closestItem = null;
        let minDistance = Infinity;

        const dateItems = datesListScroll.querySelectorAll('.date-item');
        dateItems.forEach(item => {
            const itemRect = item.getBoundingClientRect();
            const itemCenter = itemRect.left + itemRect.width / 2;
            const distance = Math.abs(containerCenter - itemCenter);
            if (distance < minDistance) {
                minDistance = distance;
                closestItem = item;
            }
        });

        if (closestItem) {
            const fullDate = closestItem.dataset.date;
            const [day, month, year] = fullDate.split("-");
            const dateObj = new Date(year, parseInt(month) - 1, day);
            const monthName = dateObj.toLocaleString("es-ES", { month: "long" });
            document.getElementById("monthTitle").textContent =
                monthName.charAt(0).toUpperCase() + monthName.slice(1) + " " + year;
        }
    }, 150);
});

/*********************************
 * 9) SELECCIÓN DE DÍA Y FILTRADO (combinado)
 *********************************/
function handleDateClick(clickedItem) {
  if (!clickedItem) return;

  // Ejecutar lógica de clic
  [...document.querySelectorAll(".date-item")].forEach(item => item.classList.remove("active"));
  clickedItem.classList.add("active");
  updateMonthTitle();

  selectedDate = clickedItem.dataset.date;
  applyAllFilters();
}


/*********************************
 * 10) FLATPICKR EN UN MODAL
 *********************************/
const datePickerModal = document.createElement("div");
datePickerModal.id = "datePickerModal";
datePickerModal.style.position = "fixed";
datePickerModal.style.top = "0";
datePickerModal.style.left = "0";
datePickerModal.style.width = "100%";
datePickerModal.style.height = "100%";
datePickerModal.style.backgroundColor = "rgba(0,0,0,0.5)";
datePickerModal.style.display = "none";
datePickerModal.style.alignItems = "center";
datePickerModal.style.justifyContent = "center";
datePickerModal.innerHTML = `
  <div style="background: #ffffff; padding: 20px; border-radius: 8px; text-align: center;">
    <h3 style="color: #111C4E;">Selecciona una fecha</h3>
    <div id="modalDatePicker"></div>
    <br>
    <button id="modalDatePickerBtn" style="padding: 8px 16px; background: #FF9E1B; color: #111C4E; border: none; border-radius: 4px; font-weight: bold;">Cerrar</button>
  </div>
`;
document.body.appendChild(datePickerModal);

flatpickr("#modalDatePicker", {
  inline: true,
  defaultDate: new Date(),
  dateFormat: "d-m-Y",
  onChange: function(selectedDates, dateStr, instance) {
    selectedDate = dateStr;
    datePickerModal.style.display = "none";

    const targetItem = document.querySelector(`.date-item[data-date="${dateStr}"]`);
    if (targetItem) {
      targetItem.scrollIntoView({ behavior: "smooth", inline: "center" });
      [...document.querySelectorAll(".date-item")].forEach(item => item.classList.remove("active"));
      targetItem.classList.add("active");
      updateMonthTitle();
    }
    applyAllFilters();
  }
});

document.getElementById("modalDatePickerBtn").addEventListener("click", () => {
  datePickerModal.style.display = "none";
});

const openDatePicker = document.getElementById("openDatePicker");
openDatePicker.addEventListener("click", () => {
  datePickerModal.style.display = "flex";
});

/*********************************
 * 11) COMPETITION TABS (COMBINADO)
 *********************************/
const competitionsBar = document.getElementById("competitionsBar");
function formatCompetitionName(comp) {
  // Dictionary of competition name mappings
  const nameMappings = {
    'C ESP CLUBES JR MASC': 'Clubes Junior Masculino',
    'C ESP CLUBES JR FEM': 'Clubes Junior Femenino',
    'Liga Femenina Endesa': 'Liga Femenina Endesa',
    'Liga Femenina Challenge': 'Liga Femenina Challenge',
    'L.F.-2': 'Liga Femenina 2',
    'Primera FEB': 'Primera FEB',
    'Segunda FEB': 'Segunda FEB',
    'Tercera FEB': 'Tercera FEB',
    'CE Clubes Cad Fem': 'Clubes Cadete Femenino',
    'CE Clubes Cad Masc': 'Clubes Cadete Masculino',
    'CE Clubes Inf Fem': 'Clubes Infantil Femenino',
    'CE Clubes Inf Masc': 'Clubes Infantil Masculino',  
    'Liga Cadete Femenina': 'Liga Cadete Femenina',
    'F.Ascenso Lf2': 'Fase de ascenso a LF2',
    'CE Clubes Mini Masc': 'Clubes Mini Masculino',
    'CE Clubes Mini Fem': 'Clubes Mini Femenino'
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

function generateCompetitionTabs(competitions) {
  competitionsBar.innerHTML = "";
  const allBtn = document.createElement("button");
  allBtn.className = "competition-tab active";
  allBtn.textContent = "TODAS";
  allBtn.dataset.competition = "";
  competitionsBar.appendChild(allBtn);

  competitions.forEach(comp => {
    const btn = document.createElement("button");
    btn.className = "competition-tab";
    btn.textContent = formatCompetitionName(comp);
    btn.dataset.competition = comp;
    competitionsBar.appendChild(btn);
  });

  competitionsBar.querySelectorAll(".competition-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      competitionsBar.querySelectorAll(".competition-tab").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedCompetition = btn.dataset.competition || "";
      applyAllFilters();
    });
  });
}

/*********************************
 * 12) FILTROS EN EL OVERLAY (competición y género)
 *********************************/
function generateCompetitionFilters(competitions) {
  const compFiltersList = document.getElementById("competitionFilters");
  compFiltersList.innerHTML = "";
  // Ordenar según la lógica deseada
  const order = [
    "Liga Femenina Endesa",
    "Liga Femenina Challenge",
    "L.F.-2",
    "Primera FEB",
    "Segunda FEB",
    "Tercera FEB"
  ];
  const ordered = [
    ...order.filter(c => competitions.includes(c)),
    ...competitions.filter(c => !order.includes(c)).sort()
  ];
  // Botón 'TODAS'
  const allBtn = document.createElement("button");
  allBtn.type = "button";
  allBtn.className = "competition-btn" + (selectedCompetition ? "" : " active");
  allBtn.dataset.competition = "";
  allBtn.textContent = "TODAS";
  compFiltersList.appendChild(allBtn);

  ordered.forEach(comp => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "competition-btn" + (selectedCompetition === comp ? " active" : "");
    btn.dataset.competition = comp;
    btn.textContent = formatCompetitionName(comp);
    compFiltersList.appendChild(btn);
  });

  // Evento: solo uno activo, filtra inmediatamente
  compFiltersList.querySelectorAll('.competition-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      compFiltersList.querySelectorAll('.competition-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedCompetition = btn.dataset.competition;
      updateVenueFilterOptions();
      applyAllFilters();
    });
  });
}

// Al filtrar por género, actualizar el listado de competiciones
function getFilteredCompetitions() {
  // Devuelve solo las competiciones de los partidos visibles por género
  const allCards = Array.from(document.querySelectorAll('.match-card'));
  const filtered = allCards.filter(card => {
    if (selectedGender && selectedGender !== "todos") {
      const gen = card.getAttribute('data-gender') || '';
      return selectedGender === gen;
    }
    return true;
  });
  const comps = new Set();
  filtered.forEach(card => {
    const comp = card.getAttribute('data-competition');
    if (comp) comps.add(comp);
  });
  return Array.from(comps);
}

// Al limpiar filtros, limpiar también los botones de género y competición
const clearFiltersBtn = document.getElementById("clearFiltersBtn");
clearFiltersBtn.addEventListener("click", () => {
  selectedCompetition = null;
  selectedGender = "todos";
  filtersOverlay.classList.remove("open");
  document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('active'));
  generateCompetitionFilters(getFilteredCompetitions());
  applyAllFilters();
  selectedVenue = "";
  if (venueFilter) venueFilter.value = "";
  if (venueSearch) venueSearch.value = "";
  generateVenueFilter(Array.from(venueSet));
});

// Al aplicar filtros, actualizar competiciones
const applyFiltersBtn = document.getElementById("applyFiltersBtn");
applyFiltersBtn.addEventListener("click", () => {
  filtersOverlay.classList.remove("open");
  generateCompetitionFilters(getFilteredCompetitions());
  applyAllFilters();
});

// Al cargar, generar los filtros de competición iniciales tras cargar partidos
setTimeout(() => {
  generateCompetitionFilters(getFilteredCompetitions());
  // Activar el botón "Todos" por defecto
  const todosBtn = document.querySelector('.gender-btn[data-gender="todos"]');
  if (todosBtn) todosBtn.classList.add('active');
}, 1000);

/*********************************
 * 13) APLICAR TODOS LOS FILTROS (DÍA, COMPETICIÓN, GÉNERO)
 *********************************/
function applyAllFilters() {
  document.querySelectorAll(".match-card").forEach(card => {
    let show = true;

    // 1) Filtro por fecha
    if (selectedDate) {
      const matchDate = card.getAttribute("data-match-date");
      if (matchDate !== selectedDate) {
        show = false;
      }
    }

    // 2) Filtro por competición
    if (selectedCompetition) {
      const comp = card.getAttribute("data-competition") || "";
      if (selectedCompetition !== "" && comp !== formatCompetitionName(selectedCompetition)) {
        show = false;
      }
    }

    // 3) Filtro por género
    if (selectedGender && selectedGender !== "todos") {
      const gen = card.getAttribute("data-gender") || "";
      if (gen !== selectedGender) {
        show = false;
      }
    }

    // 4) Filtro por pabellón
    if (selectedVenue && selectedVenue !== "") {
      const venue = card.getAttribute("data-venue") || "";
      if (venue !== selectedVenue) {
        show = false;
      }
    }

    card.style.display = show ? "flex" : "none";
  });
  
  // Actualizar el breadcrumb de filtros activos
  updateFiltersBreadcrumb();
  
  // Actualizar los puntitos del calendario según los partidos visibles
  markDatesWithMatches();
  // Mostrar mensaje si no hay partidos visibles
  const visibleCards = Array.from(document.querySelectorAll('.match-card')).filter(card => card.style.display !== 'none');
  const noMatchesMsg = document.getElementById('noMatchesMsg');
  if (visibleCards.length === 0) {
    let msg = "Este día no hay partidos";
    if (selectedCompetition && selectedCompetition !== "") {
      msg += ` en \"${formatCompetitionName(selectedCompetition)}\"`;
    }
    if (selectedVenue && selectedVenue !== "") {
      msg += ` en \"${selectedVenue}\"`;
    }
    noMatchesMsg.textContent = msg;
    noMatchesMsg.style.display = '';
  } else {
    noMatchesMsg.style.display = 'none';
  }
  updateOverlayFilterChips();
}

/*********************************
 * 14) ACTUALIZAR BREADCRUMB DE FILTROS ACTIVOS
 *********************************/
function updateFiltersBreadcrumb() {
  const filtersBreadcrumb = document.getElementById('filtersBreadcrumb');
  const breadcrumbChips = document.getElementById('breadcrumbChips');
  
  if (!filtersBreadcrumb || !breadcrumbChips) return;
  
  // Limpiar chips existentes
  breadcrumbChips.innerHTML = '';
  
  // Recolectar filtros activos
  const activeFilters = [];
  
  // Filtro de género
  if (selectedGender && selectedGender !== "todos") {
    activeFilters.push({
      type: 'gender',
      label: selectedGender === 'masculino' ? 'Masculino' : 'Femenino',
      value: selectedGender
    });
  }
  
  // Filtro de competición
  if (selectedCompetition && selectedCompetition !== "") {
    activeFilters.push({
      type: 'competition',
      label: formatCompetitionName(selectedCompetition),
      value: selectedCompetition
    });
  }
  
  // Filtro de pabellón
  if (selectedVenue && selectedVenue !== "") {
    activeFilters.push({
      type: 'venue',
      label: toTitleCase(selectedVenue),
      value: selectedVenue
    });
  }
  
  // Mostrar/ocultar breadcrumb según si hay filtros activos
  if (activeFilters.length === 0) {
    filtersBreadcrumb.style.display = 'none';
    return;
  }
  
  filtersBreadcrumb.style.display = 'block';
  
  // Crear chips para cada filtro activo
  activeFilters.forEach(filter => {
    const chip = document.createElement('div');
    chip.className = 'breadcrumb-chip';
    chip.innerHTML = `
      ${filter.label}
      <button class="breadcrumb-chip-remove" data-filter-type="${filter.type}" data-filter-value="${filter.value}">
        ×
      </button>
    `;
    breadcrumbChips.appendChild(chip);
  });
}

/*********************************
 * 15) ELIMINAR FILTRO INDIVIDUAL
 *********************************/
function removeFilter(filterType, filterValue) {
  switch (filterType) {
    case 'gender':
      selectedGender = 'todos';
      // Actualizar botón activo en el panel de filtros
      const genderBtns = document.querySelectorAll('.gender-btn');
      genderBtns.forEach(btn => btn.classList.remove('active'));
      const todosBtn = document.querySelector('.gender-btn[data-gender="todos"]');
      if (todosBtn) todosBtn.classList.add('active');
      break;
      
    case 'competition':
      selectedCompetition = null;
      // Actualizar botones de competición
      const compBtns = document.querySelectorAll('.competition-btn');
      compBtns.forEach(btn => btn.classList.remove('active'));
      break;
      
    case 'venue':
      selectedVenue = '';
      // Actualizar select de pabellón
      const venueSelect = document.getElementById('venueFilter');
      if (venueSelect) venueSelect.value = '';
      // Limpiar búsqueda de pabellón
      const venueSearch = document.getElementById('venueSearch');
      if (venueSearch) venueSearch.value = '';
      break;
  }
  
  // Actualizar competiciones y pabellones disponibles
  generateCompetitionFilters(getFilteredCompetitions());
  updateVenueFilterOptions();
  
  // Aplicar filtros
  applyAllFilters();
}

/*********************************
 * 16) LIMPIAR TODOS LOS FILTROS
 *********************************/
function clearAllFilters() {
  // Resetear todas las variables de filtro
  selectedGender = 'todos';
  selectedCompetition = null;
  selectedVenue = '';
  
  // Actualizar botones de género
  const genderBtns = document.querySelectorAll('.gender-btn');
  genderBtns.forEach(btn => btn.classList.remove('active'));
  const todosBtn = document.querySelector('.gender-btn[data-gender="todos"]');
  if (todosBtn) todosBtn.classList.add('active');
  
  // Actualizar botones de competición
  const compBtns = document.querySelectorAll('.competition-btn');
  compBtns.forEach(btn => btn.classList.remove('active'));
  
  // Actualizar select de pabellón
  const venueSelect = document.getElementById('venueFilter');
  if (venueSelect) venueSelect.value = '';
  
  // Limpiar búsqueda de pabellón
  const venueSearch = document.getElementById('venueSearch');
  if (venueSearch) venueSearch.value = '';
  
  // Actualizar competiciones y pabellones disponibles
  generateCompetitionFilters(getFilteredCompetitions());
  updateVenueFilterOptions();
  
  // Aplicar filtros
  applyAllFilters();
}

/*********************************
 * 17) MARCAR EN EL CALENDARIO LOS DÍAS QUE TIENEN PARTIDOS
 *********************************/
function markDatesWithMatches() {
  const dateItems = document.querySelectorAll(".date-item");
  // Primero, quitar todos los indicadores
  dateItems.forEach(li => {
    const indicator = li.querySelector(".match-indicator");
    if (indicator) indicator.remove();
  });
  // Filtrar tarjetas por TODOS los filtros excepto la fecha
  const allCards = Array.from(document.querySelectorAll('.match-card'));
  const filtered = allCards.filter(card => {
    // Filtro por competición
    if (selectedCompetition && selectedCompetition !== "") {
      const comp = card.getAttribute('data-competition') || '';
      if (comp !== formatCompetitionName(selectedCompetition)) return false;
    }
    // Filtro por género
    if (selectedGender && selectedGender !== "todos") {
      const gen = card.getAttribute('data-gender') || '';
      if (gen !== selectedGender) return false;
    }
    // Filtro por pabellón
    if (selectedVenue && selectedVenue !== "") {
      const venue = card.getAttribute('data-venue') || '';
      if (venue !== selectedVenue) return false;
    }
    return true;
  });
  // Obtener los días con partidos filtrados
  const datesWithMatches = new Set(filtered.map(card => card.getAttribute('data-match-date')));
  dateItems.forEach(li => {
    if (datesWithMatches.has(li.dataset.date)) {
      if (!li.querySelector(".match-indicator")) {
        const indicator = document.createElement("span");
        indicator.className = "match-indicator";
        li.appendChild(indicator);
      }
    }
  });
}

/*********************************
 * 15) FUNCIONALIDAD DE DRAG PARA SCROLL DE FECHAS
 *********************************/
function addDragScrollFunctionality() {
  const datesList = document.getElementById('datesList');
  let isDown = false;
  let startX;
  let scrollLeft;
  let isDragging = false;
  let targetElement = null;

  function getClientX(e) {
    return e.touches ? e.touches[0].clientX : e.clientX;
  }

  function startInteraction(e) {
    isDown = true;
    isDragging = false;
    targetElement = e.target;
    datesList.style.cursor = 'grabbing';
    startX = getClientX(e) - datesList.offsetLeft;
    scrollLeft = datesList.scrollLeft;
  }

  function endInteraction() {
    isDown = false;
    datesList.style.cursor = 'grab';

    if (!isDragging) {
      const clickedItem = targetElement.closest(".date-item");
      handleDateClick(clickedItem);
    }
    isDragging = false;
  }

  function moveInteraction(e) {
    if (!isDown) return;

    const x = getClientX(e) - datesList.offsetLeft;
    const walk = x - startX;

    if (Math.abs(walk) > 10) { // Umbral para considerar drag
      isDragging = true;
    }

    if (isDragging) {
      e.preventDefault(); // Prevenir scroll nativo SOLO si es drag
      const newScrollLeft = scrollLeft - walk;
      datesList.scrollLeft = newScrollLeft;
    }
  }

  // Eventos de mouse
  datesList.addEventListener('mousedown', startInteraction);
  datesList.addEventListener('mouseleave', endInteraction);
  datesList.addEventListener('mouseup', endInteraction);
  datesList.addEventListener('mousemove', moveInteraction);

  // Eventos de touch
  datesList.addEventListener('touchstart', startInteraction, { passive: false });
  datesList.addEventListener('touchend', endInteraction);
  datesList.addEventListener('touchmove', moveInteraction, { passive: false });

  datesList.style.cursor = 'grab';
  datesList.classList.add('draggable-scroll');
}

/*********************************
 * 16) INICIAR CARGA DE PARTIDOS
 *********************************/
const matchesList = document.getElementById("matchesList");
loadMatchesFromRepo();

console.log("Si subes nuevos JSON al repositorio, se cargarán automáticamente al recargar la página.");

// Evento para los botones de género tipo toggle
const genderFilters = document.getElementById("genderFilters");
genderFilters.addEventListener("click", (e) => {
  const btn = e.target.closest(".gender-btn");
  if (!btn) return;
  const gender = btn.getAttribute("data-gender");
  if (!gender) return;
  // Desactivar todos y activar solo el pulsado
  Array.from(genderFilters.children).forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  selectedGender = gender;
  // Actualizar competiciones disponibles según el género seleccionado
  generateCompetitionFilters(getFilteredCompetitions());
  updateVenueFilterOptions();
  applyAllFilters();
});

const openFiltersBtn = document.getElementById("openFiltersBtn");
const closeFiltersBtn = document.getElementById("closeFiltersBtn");
const filtersOverlay = document.getElementById("filtersOverlay");
// ACORDEÓN PARA FILTROS OVERLAY
function setupAccordionFilters() {
  const sections = document.querySelectorAll('.accordion-section');
  sections.forEach(section => {
    const header = section.querySelector('.accordion-header');
    if (header) {
      header.addEventListener('click', () => {
        if (section.classList.contains('open')) {
          section.classList.remove('open');
          section.classList.add('closed');
        } else {
          section.classList.add('open');
          section.classList.remove('closed');
        }
      });
    }
  });
}
// Ejecutar al abrir el overlay de filtros
openFiltersBtn.addEventListener("click", () => {
  filtersOverlay.classList.add("open");
  setupAccordionFilters();
});
closeFiltersBtn.addEventListener("click", () => {
  filtersOverlay.classList.remove("open");
});

// Event listeners para el breadcrumb de filtros
document.addEventListener("click", (e) => {
  // Manejar clicks en los botones de eliminar filtros individuales
  if (e.target.classList.contains("breadcrumb-chip-remove")) {
    const filterType = e.target.getAttribute("data-filter-type");
    const filterValue = e.target.getAttribute("data-filter-value");
    removeFilter(filterType, filterValue);
  }
});

// Event listener para el botón de limpiar todos los filtros
const clearAllFiltersBtn = document.getElementById("clearAllFilters");
if (clearAllFiltersBtn) {
  clearAllFiltersBtn.addEventListener("click", clearAllFilters);
}

/*********************************
 * 16) GENERAR FILTRO DE PABELLÓN
 *********************************/
// Función para convertir a formato Título
function toTitleCase(str) {
  return str.toLowerCase().replace(/\b([a-záéíóúüñ])/giu, c => c.toUpperCase());
}

function generateVenueFilter(venues) {
  const venueFilter = document.getElementById("venueFilter");
  venueFilter.innerHTML = '<option value="">Todos</option>';
  venues.sort((a, b) => a.localeCompare(b, 'es', {sensitivity: 'base'}));
  venues.forEach(venue => {
    if (venue && venue.trim() !== "") {
      const opt = document.createElement("option");
      opt.value = venue;
      opt.textContent = toTitleCase(venue);
      venueFilter.appendChild(opt);
    }
  });
}

/*********************************
 * 17) FILTRAR OPCIONES DEL SELECT AL ESCRIBIR EN EL INPUT
 *********************************/
const venueSearch = document.getElementById("venueSearch");
const venueFilter = document.getElementById("venueFilter");
if (venueSearch && venueFilter) {
  venueSearch.addEventListener("input", function() {
    const search = this.value.toLowerCase();
    Array.from(venueFilter.options).forEach(opt => {
      if (opt.value === "") {
        opt.style.display = "";
        return;
      }
      opt.style.display = opt.value.toLowerCase().includes(search) ? "" : "none";
    });
    // Si hay coincidencia, selecciona la primera visible
    const firstVisible = Array.from(venueFilter.options).find(opt => opt.style.display !== "none" && opt.value !== "");
    if (firstVisible) {
      venueFilter.value = firstVisible.value;
    } else {
      venueFilter.value = "";
    }
  });
}

/*********************************
 * 18) AL CAMBIAR EL SELECT, ACTUALIZAR EL FILTRO
 *********************************/
if (venueFilter) {
  venueFilter.addEventListener("change", function() {
    selectedVenue = this.value;
    applyAllFilters();
  });
}

// 1. Modifica getFilteredVenues para devolver solo los pabellones de los partidos visibles por género y competición
function getFilteredVenues() {
  const allCards = Array.from(document.querySelectorAll('.match-card'));
  const filtered = allCards.filter(card => {
    // Filtro por género
    if (selectedGender && selectedGender !== "todos") {
      const gen = card.getAttribute('data-gender') || '';
      if (selectedGender !== gen) return false;
    }
    // Filtro por competición
    if (selectedCompetition && selectedCompetition !== "") {
      const comp = card.getAttribute('data-competition') || '';
      if (formatCompetitionName(selectedCompetition) !== comp) return false;
    }
    return true;
  });
  const venues = new Set();
  filtered.forEach(card => {
    const venue = card.getAttribute('data-venue');
    if (venue) venues.add(venue);
  });
  return Array.from(venues);
}

// 2. Al cambiar género o competición, actualiza el select de pabellón
function updateVenueFilterOptions() {
  const venues = getFilteredVenues();
  generateVenueFilter(venues);
  // Si el valor seleccionado ya no está, resetea
  if (!venues.includes(selectedVenue)) {
    selectedVenue = "";
    if (venueFilter) venueFilter.value = "";
    if (venueSearch) venueSearch.value = "";
  }
}

// Mostrar filtros aplicados como chips en el overlay de filtros
function updateOverlayFilterChips() {
  const filtersActive = document.getElementById('filtersActive');
  if (!filtersActive) return;
  filtersActive.innerHTML = '';
  const activeFilters = [];
  if (selectedGender && selectedGender !== 'todos') {
    activeFilters.push({
      type: 'gender',
      label: selectedGender === 'masculino' ? 'Masculino' : 'Femenino',
      value: selectedGender
    });
  }
  if (selectedCompetition && selectedCompetition !== '') {
    activeFilters.push({
      type: 'competition',
      label: formatCompetitionName(selectedCompetition),
      value: selectedCompetition
    });
  }
  if (selectedVenue && selectedVenue !== '') {
    activeFilters.push({
      type: 'venue',
      label: toTitleCase(selectedVenue),
      value: selectedVenue
    });
  }
  if (activeFilters.length === 0) {
    filtersActive.style.display = 'none';
    return;
  }
  filtersActive.style.display = 'flex';
  activeFilters.forEach(filter => {
    const chip = document.createElement('div');
    chip.className = 'filter-chip';
    chip.innerHTML = `
      ${filter.label}
      <button class="breadcrumb-chip-remove" data-filter-type="${filter.type}" data-filter-value="${filter.value}">×</button>
    `;
    filtersActive.appendChild(chip);
  });
}

// Función para mostrar/ocultar el circulito en el botón de filtros
function updateFiltersIndicator() {
  const btn = document.getElementById('openFiltersBtn');
  // Hay filtro activo si alguno de estos no es el valor por defecto
  const hasActiveFilters = (selectedGender && selectedGender !== 'todos') ||
                          (selectedCompetition && selectedCompetition !== null && selectedCompetition !== '') ||
                          (selectedVenue && selectedVenue !== '');
  if (hasActiveFilters) {
    btn.classList.add('has-active-filters');
  } else {
    btn.classList.remove('has-active-filters');
  }
}

// Llama a updateFiltersIndicator después de aplicar filtros
const originalApplyAllFilters = applyAllFilters;
applyAllFilters = function() {
  originalApplyAllFilters.apply(this, arguments);
  updateFiltersIndicator();
};

// Llama a updateFiltersIndicator después de limpiar filtros
const originalClearAllFilters = clearAllFilters;
clearAllFilters = function() {
  originalClearAllFilters.apply(this, arguments);
  updateFiltersIndicator();
};

// Llama a updateFiltersIndicator después de remover un filtro individual
const originalRemoveFilter = removeFilter;
removeFilter = function(filterType, filterValue) {
  originalRemoveFilter.apply(this, arguments);
  updateFiltersIndicator();
};

document.addEventListener('DOMContentLoaded', function() {
  const footerLogos = document.querySelectorAll('.footer-logo');
  footerLogos.forEach(function(logo) {
    logo.style.cursor = 'pointer';
    logo.addEventListener('click', function() {
      window.location.href = 'index.html';
    });
  });
});
