// Conjuntos para almacenar valores únicos
const competitionSet = new Set();
const teamSet = new Set();
const roundSet = new Set();

// Estado global de la aplicación
const state = {
  filtros: {
    genero: "todos",
    competicion: "todas",
    equipo: "",
    estadisticas: {
      puntos: { min: null, max: null },
      rebotes: { min: null, max: null },
      asistencias: { min: null, max: null }
    }
  },
  busqueda: "",
  jugadoresFiltrados: [],
  paginaActual: 1,
  jugadoresPorPagina: 49,
  allPlayersStats: [] // Nuevo: almacenará todos los datos de jugadores
};

// Elementos del DOM
const elementos = {
  grid: document.getElementById('playersGrid'),
  busqueda: document.getElementById('playerSearch'),
  filtrosOverlay: document.getElementById('filtersOverlay'),
  btnFiltros: document.getElementById('openFiltersBtn'),
  btnCerrarFiltros: document.getElementById('closeFiltersBtn'),
  btnLimpiarFiltros: document.getElementById('clearFiltersBtn'),
  btnAplicarFiltros: document.getElementById('applyFiltersBtn'),
  filtrosActivos: document.getElementById('filtersActive'),
  generoFiltros: document.getElementById('genderFilters'),
  competicionFiltros: document.getElementById('competitionFilters'),
  equipoFiltro: document.getElementById('teamFilter'),
  equipoBusqueda: document.getElementById('teamSearch'),
  teamFilter: document.getElementById('teamFilter'),
  teamFilterDropdown: document.getElementById('teamFilterDropdown')
};

// Inicialización
async function init() {
  try {
    await loadAllStats();
    setupEventListeners();
    initializeCollapsedFilters();
    
    // Asegurar que los botones de toggle se configuren después de todo
    setTimeout(() => {
      setupToggleButtons();
    }, 100);
    
  } catch (error) {
    console.error('Error loading statistics:', error);
    document.querySelector('.loader-text').textContent = 'Cargando...';
  }
}

// Cargar jugadores (simulado con datos de ejemplo)
function cargarJugadores() {
  state.jugadoresFiltrados = [...jugadores];
}

// Configurar event listeners
function setupEventListeners() {
  // Búsqueda
  elementos.busqueda.addEventListener('input', (e) => {
    state.busqueda = e.target.value.toLowerCase();
    state.paginaActual = 1;
    actualizarVista();
  });

  // Filtros
  elementos.btnFiltros.addEventListener('click', () => {
    elementos.filtrosOverlay.classList.add('open');
  });

  elementos.btnCerrarFiltros.addEventListener('click', () => {
    elementos.filtrosOverlay.classList.remove('open');
  });

  elementos.btnLimpiarFiltros.addEventListener('click', limpiarFiltros);
  elementos.btnAplicarFiltros.addEventListener('click', aplicarFiltros);

  // Filtros de género
  elementos.generoFiltros.addEventListener('click', (e) => {
    if (e.target.classList.contains('gender-btn')) {
      const genero = e.target.dataset.gender;
      state.filtros.genero = genero;
      
      // Actualizar los estilos de los botones
      elementos.generoFiltros.querySelectorAll('.gender-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      e.target.classList.add('active');
      
      actualizarFiltrosActivos();
      actualizarVista();
    }
  });

  // Búsqueda de equipo con debounce
  let searchTimeout;
  elementos.equipoBusqueda.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const busqueda = e.target.value.trim();
    
    // Actualizar inmediatamente si la búsqueda está vacía
    if (!busqueda) {
      actualizarFiltrosEquipo();
      return;
    }

    // Esperar 300ms después de que el usuario deje de escribir
    searchTimeout = setTimeout(() => {
      filtrarEquipos(busqueda);
    }, 300);
  });

  // Limpiar la búsqueda cuando se cierra el panel de filtros
  elementos.btnCerrarFiltros.addEventListener('click', () => {
    elementos.equipoBusqueda.value = '';
    actualizarFiltrosEquipo();
    elementos.filtrosOverlay.classList.remove('open');
  });

  // Filtro de equipo
  const teamFilter = elementos.teamFilter;
  const teamFilterDropdown = document.getElementById('teamFilterDropdown');

  console.log('Inicializando filtro de equipo:', {
    teamFilter,
    teamFilterDropdown,
    state: state.filtros
  });

  // Mostrar dropdown al hacer focus o click
  teamFilter.addEventListener('focus', () => {
    console.log('Focus en el filtro de equipo');
    teamFilterDropdown.classList.add('show');
    filtrarEquipos(teamFilter.value);
  });

  teamFilter.addEventListener('click', (e) => {
    console.log('Click en el filtro de equipo');
    e.stopPropagation();
    teamFilterDropdown.classList.add('show');
    filtrarEquipos(teamFilter.value);
  });

  // Ocultar dropdown al hacer click fuera
  document.addEventListener('click', (e) => {
    if (!teamFilter.contains(e.target) && !teamFilterDropdown.contains(e.target)) {
      console.log('Click fuera del filtro de equipo');
      teamFilterDropdown.classList.remove('show');
    }
  });

  // Filtrar equipos mientras se escribe (sin debounce para respuesta inmediata)
  teamFilter.addEventListener('input', (e) => {
    const busqueda = e.target.value.trim();
    // Asegurarse de que el dropdown esté visible mientras se escribe
    teamFilterDropdown.classList.add('show');
    filtrarEquipos(busqueda);
  });

  // Manejar la selección de equipo
  teamFilterDropdown.addEventListener('click', (e) => {
    const option = e.target.closest('.team-filter-option');
    console.log('Click en opción de equipo:', option);
    
    if (option && !option.classList.contains('no-results')) {
      const equipo = option.dataset.equipo;
      console.log('Equipo seleccionado:', equipo);
      state.filtros.equipo = equipo;
      teamFilter.value = equipo;
      teamFilterDropdown.classList.remove('show');
      actualizarFiltrosActivos();
      actualizarVista();
    }
  });

  // Limpiar el filtro de equipo cuando se cierra el panel
  elementos.btnCerrarFiltros.addEventListener('click', () => {
    teamFilter.value = '';
    state.filtros.equipo = '';
    teamFilterDropdown.classList.remove('show');
    elementos.filtrosOverlay.classList.remove('open');
  });

  // Event delegation para filtros desplegables como respaldo
  elementos.filtrosOverlay.addEventListener('click', (e) => {
    const header = e.target.closest('.filter-section-header');
    if (header && header.dataset.section) {
      e.preventDefault();
      e.stopPropagation();
      toggleFilterSection(header.dataset.section);
    }
  });

  // === Filtros de estadísticas (puntos, rebotes, asistencias) ===
  document.querySelectorAll('.stats-filters input[type="number"]').forEach((input, idx) => {
    input.addEventListener('input', (e) => {
      const value = e.target.value !== '' ? e.target.value : null;
      // Orden: 0=puntos min, 1=puntos max, 2=rebotes min, 3=rebotes max, 4=asistencias min, 5=asistencias max
      if (idx === 0) state.filtros.estadisticas.puntos.min = value;
      if (idx === 1) state.filtros.estadisticas.puntos.max = value;
      if (idx === 2) state.filtros.estadisticas.rebotes.min = value;
      if (idx === 3) state.filtros.estadisticas.rebotes.max = value;
      if (idx === 4) state.filtros.estadisticas.asistencias.min = value;
      if (idx === 5) state.filtros.estadisticas.asistencias.max = value;
      updateFiltersIndicator();
    });
  });
}

// Configurar botones de toggle para filtros desplegables
function setupToggleButtons() {
  // Configurar todos los headers de filtros para que sean clicables
  document.querySelectorAll('.filter-section-header').forEach(header => {
    const section = header.dataset.section;
    
    // Hacer que toda la cabecera sea clickeable
    header.style.cursor = 'pointer';
    
    // Configurar el event listener directamente en la cabecera
    header.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('Click detectado en filtro:', section);
      toggleFilterSection(section);
    };
  });
}

// Inicializar el estado visual de los filtros colapsados
function initializeCollapsedFilters() {
  // Configurar todos los íconos de chevron para que estén rotados por defecto
  document.querySelectorAll('.stats-toggle-btn.collapsed').forEach(btn => {
    const chevronIcon = btn.querySelector('.chevron-icon');
    if (chevronIcon) {
      chevronIcon.style.transform = 'rotate(-90deg)';
    }
  });
}

// Función para alternar la visibilidad de una sección de filtros
function toggleFilterSection(section) {
  const sectionElement = document.querySelector(`[data-section="${section}"]`);
  if (!sectionElement) {
    console.log('Error: No se encontró sectionElement para:', section);
    return;
  }
  
  const toggleBtn = sectionElement.querySelector('.stats-toggle-btn');
  const chevronIcon = toggleBtn ? toggleBtn.querySelector('.chevron-icon') : null;
  
  let contentElement;
  switch (section) {
    case 'gender':
      contentElement = document.getElementById('genderFilters');
      break;
    case 'competition':
      contentElement = document.getElementById('competitionFilters');
      break;
    case 'team':
      contentElement = document.querySelector('.team-filter-container');
      break;
    case 'stats':
      contentElement = document.querySelector('.stats-filters');
      break;
  }
  
  if (contentElement) {
    const isCollapsed = contentElement.classList.contains('collapsed');
    
    if (isCollapsed) {
      // Expandir
      console.log('✅ Expandiendo filtro:', section);
      contentElement.classList.remove('collapsed');
      if (toggleBtn) toggleBtn.classList.remove('collapsed');
      if (chevronIcon) chevronIcon.style.transform = 'rotate(0deg)';
    } else {
      // Colapsar
      console.log('📁 Colapsando filtro:', section);
      contentElement.classList.add('collapsed');
      if (toggleBtn) toggleBtn.classList.add('collapsed');
      if (chevronIcon) chevronIcon.style.transform = 'rotate(-90deg)';
    }
  } else {
    console.log('Error: No se encontró contentElement para:', section);
  }
}

// Actualizar la vista con los jugadores filtrados y paginados
function actualizarVista() {
  const jugadoresFiltrados = filtrarJugadores();
  // Ordenar por puntos de mayor a menor
  jugadoresFiltrados.sort((a, b) => b.estadisticas.puntos - a.estadisticas.puntos);
  state.jugadoresFiltrados = jugadoresFiltrados;
  renderizarJugadoresPaginados();
  renderizarPaginacion();
}

function renderizarJugadoresPaginados() {
  const inicio = (state.paginaActual - 1) * state.jugadoresPorPagina;
  const fin = inicio + state.jugadoresPorPagina;
  const jugadoresPagina = state.jugadoresFiltrados.slice(inicio, fin);
  renderizarJugadores(jugadoresPagina);
}

function renderizarPaginacion() {
  const total = state.jugadoresFiltrados.length;
  const totalPaginas = Math.ceil(total / state.jugadoresPorPagina);
  const paginacion = document.getElementById('pagination');
  if (totalPaginas <= 1) {
    paginacion.innerHTML = '';
    return;
  }
  let html = '';
  // Flecha anterior
  html += `<button class="page-btn" ${state.paginaActual === 1 ? 'disabled' : ''} data-page="${state.paginaActual - 1}">&laquo;</button>`;
  // Números de página (máximo 7 visibles: actual, 3 antes, 3 después)
  let start = Math.max(1, state.paginaActual - 3);
  let end = Math.min(totalPaginas, state.paginaActual + 3);
  if (state.paginaActual <= 4) end = Math.min(7, totalPaginas);
  if (state.paginaActual > totalPaginas - 4) start = Math.max(1, totalPaginas - 6);
  for (let i = start; i <= end; i++) {
    html += `<button class="page-btn${i === state.paginaActual ? ' active' : ''}" data-page="${i}">${i}</button>`;
  }
  // Flecha siguiente
  html += `<button class="page-btn" ${state.paginaActual === totalPaginas ? 'disabled' : ''} data-page="${state.paginaActual + 1}">&raquo;</button>`;
  paginacion.innerHTML = html;
  // Listeners
  paginacion.querySelectorAll('.page-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const page = Number(btn.dataset.page);
      if (page >= 1 && page <= totalPaginas && page !== state.paginaActual) {
        state.paginaActual = page;
        renderizarJugadoresPaginados();
        renderizarPaginacion();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });
}

// Filtrar jugadores según los criterios actuales
function filtrarJugadores() {
  // Obtener los valores de los filtros de estadísticas
  const stats = state.filtros.estadisticas;
  const puntosMin = stats.puntos.min ? parseFloat(stats.puntos.min) : null;
  const puntosMax = stats.puntos.max ? parseFloat(stats.puntos.max) : null;
  const rebotesMin = stats.rebotes.min ? parseFloat(stats.rebotes.min) : null;
  const rebotesMax = stats.rebotes.max ? parseFloat(stats.rebotes.max) : null;
  const asistenciasMin = stats.asistencias.min ? parseFloat(stats.asistencias.min) : null;
  const asistenciasMax = stats.asistencias.max ? parseFloat(stats.asistencias.max) : null;

  console.log('Filtros aplicados:', {
    puntos: { min: puntosMin, max: puntosMax },
    rebotes: { min: rebotesMin, max: rebotesMax },
    asistencias: { min: asistenciasMin, max: asistenciasMax }
  });

  return state.allPlayersStats.filter(jugador => {
    // Filtro de búsqueda
    if (state.busqueda && !jugador.nombre.toLowerCase().includes(state.busqueda)) {
      return false;
    }

    // Filtro de género
    if (state.filtros.genero !== 'todos' && jugador.genero !== state.filtros.genero) {
      return false;
    }

    // Filtro de competición
    if (state.filtros.competicion !== 'todas' && jugador.competicion !== state.filtros.competicion) {
      return false;
    }

    // Filtro de equipo
    if (state.filtros.equipo && jugador.equipo !== state.filtros.equipo) {
      return false;
    }

    // Filtros de estadísticas (usando promedios)
    const puntos = parseFloat(jugador.estadisticas.puntos);
    const rebotes = parseFloat(jugador.estadisticas.rebotes);
    const asistencias = parseFloat(jugador.estadisticas.asistencias);

    console.log('Estadísticas del jugador:', jugador.nombre, {
      puntos,
      rebotes,
      asistencias
    });

    if (puntosMin !== null && puntos < puntosMin) return false;
    if (puntosMax !== null && puntos > puntosMax) return false;
    if (rebotesMin !== null && rebotes < rebotesMin) return false;
    if (rebotesMax !== null && rebotes > rebotesMax) return false;
    if (asistenciasMin !== null && asistencias < asistenciasMin) return false;
    if (asistenciasMax !== null && asistencias > asistenciasMax) return false;

    return true;
  });
}

// Función para truncar nombres largos de equipos
function truncarNombreEquipo(nombre, maxLength = 15) {
  if (nombre.length <= maxLength) return nombre;
  return nombre.substring(0, maxLength) + '...';
}

// Función para truncar nombres largos de jugadores
function truncarNombreJugador(nombre, maxLength = 18) {
  if (nombre.length <= maxLength) return nombre;
  return nombre.substring(0, maxLength) + '...';
}
// Function to format competition names consistently
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

// Renderizar jugadores en el grid
function renderizarJugadores(jugadores) {
  elementos.grid.innerHTML = jugadores.map(jugador => {
    const teamLogo = jugador.team_logo || '';
    const playerPhoto = jugador.foto && jugador.foto.trim() !== '' ? 
      jugador.foto : 
      'player_placeholder.png';
    
    return `
    <a href="player_profile.html?player_id=${jugador.id}">
      <div class="player-card">
        <div class="player-header">
          <div class="team-logo-container">
            <img src="${teamLogo}" alt="Logo ${jugador.equipo}" class="team-logo-img" onerror="this.src='player_placeholder.png'">
          </div>
          <img src="${playerPhoto}" alt="${jugador.nombre}" class="player-photo" onerror="this.src='player_placeholder.png'">
        </div>
        <div class="player-info">
          <h3 class="player-name" title="${jugador.nombre}">${truncarNombreJugador(jugador.nombre)}</h3>
          <p class="player-team" title="${jugador.equipo}">${truncarNombreEquipo(jugador.equipo)}</p>
          <p class="player-competition" title="${jugador.competicion}">${formatCompetitionName(jugador.competicion)}</p>
          <div class="player-stats">
            <div class="stat-item">
              <div class="stat-value">${jugador.estadisticas.puntos}</div>
              <div class="stat-label">Puntos</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${jugador.estadisticas.rebotes}</div>
              <div class="stat-label">Rebotes</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${jugador.estadisticas.asistencias}</div>
              <div class="stat-label">Asistencias</div>
            </div>
          </div>
        </div>
      </div>
      </a>
    `;
  }).join('');
}

// Limpiar todos los filtros
function limpiarFiltros() {
  state.filtros = {
    genero: "todos",
    competicion: "todas",
    equipo: "",
    estadisticas: {
      puntos: { min: null, max: null },
      rebotes: { min: null, max: null },
      asistencias: { min: null, max: null }
    }
  };
  state.busqueda = "";
  state.paginaActual = 1;
  elementos.busqueda.value = "";
  actualizarFiltrosActivos();
  actualizarVista();
}

// Aplicar filtros
function aplicarFiltros() {
  // Solo actualizar la vista y cerrar el overlay, los valores ya están en el estado
  state.paginaActual = 1;
  actualizarVista();
  elementos.filtrosOverlay.classList.remove('open');
  updateFiltersIndicator();
}

// Actualizar chips de filtros activos
function actualizarFiltrosActivos() {
  const filtrosActivos = [];
  
  if (state.filtros.genero !== 'todos') {
    filtrosActivos.push({
      tipo: 'genero',
      valor: state.filtros.genero,
      label: `Género: ${state.filtros.genero}`
    });
  }

  if (state.filtros.competicion !== 'todas') {
    filtrosActivos.push({
      tipo: 'competicion',
      valor: state.filtros.competicion,
      label: `Competición: ${formatCompetitionName(state.filtros.competicion)}`
    });
  }

  if (state.filtros.equipo) {
    filtrosActivos.push({
      tipo: 'equipo',
      valor: state.filtros.equipo,
      label: `Equipo: ${state.filtros.equipo}`
    });
  }

  // Renderizar chips de filtros activos
  elementos.filtrosActivos.innerHTML = filtrosActivos.map(filtro => `
    <div class="filter-chip" data-tipo="${filtro.tipo}" data-valor="${formatCompetitionName(filtro.valor)}">
      ${filtro.label}
      <button class="remove-filter">&times;</button>
    </div>
  `).join('');

  // Añadir event listeners a los botones de eliminar filtro
  document.querySelectorAll('.remove-filter').forEach(btn => {
    btn.addEventListener('click', (e) => {
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
    case 'genero':
      state.filtros.genero = 'todos';
      break;
    case 'competicion':
      state.filtros.competicion = 'todas';
      break;
    case 'equipo':
      state.filtros.equipo = '';
      break;
  }
  actualizarFiltrosActivos();
  actualizarVista();
}

// Filtrar equipos en el select
function filtrarEquipos(busqueda = '') {
  console.log('Filtrando equipos con búsqueda:', busqueda);
  
  const equipos = [...new Set(state.allPlayersStats.map(j => j.equipo))].sort();
  console.log('Lista de equipos disponibles:', equipos);
  
  // Convertir la búsqueda a minúsculas para hacer la comparación case-insensitive
  const busquedaLower = busqueda.toLowerCase();
  const equiposFiltrados = equipos.filter(equipo => 
    equipo.toLowerCase().includes(busquedaLower)
  );
  console.log('Equipos filtrados:', equiposFiltrados);

  const dropdown = document.getElementById('teamFilterDropdown');
  
  // Reiniciar el scroll para que empiece arriba con los nuevos resultados
  dropdown.scrollTop = 0;

  if (equiposFiltrados.length === 0) {
    dropdown.innerHTML = `
      <div class="team-filter-option no-results">No se encontraron equipos</div>
    `;
  } else {
    dropdown.innerHTML = `
      <div class="team-filter-option ${state.filtros.equipo === '' ? 'selected' : ''}" data-equipo="">Todos</div>
      ${equiposFiltrados.map(equipo => `
        <div class="team-filter-option ${equipo === state.filtros.equipo ? 'selected' : ''}" data-equipo="${equipo}">
          ${equipo}
        </div>
      `).join('')}
    `;
  }
}

// Función para cargar estadísticas de jugadores
async function loadAllStats() {
  const loaderContainer = document.querySelector('.loader-container');
  const loaderText = document.querySelector('.loader-text');
  const progressBar = document.querySelector('.progress-bar-fill');

  try {
    loaderText.textContent = 'Cargando estadísticas...';
    progressBar.style.width = '50%';

    // Cargar el archivo de estadísticas precalculadas
    const response = await fetch('./player_stats.json');
    if (!response.ok) {
      throw new Error(`Error al cargar estadísticas: ${response.status}`);
    }

    state.allPlayersStats = await response.json();
    console.log('Estadísticas cargadas:', state.allPlayersStats);
    state.jugadoresFiltrados = [...state.allPlayersStats];

    // Actualizar los filtros de competición y equipo
    actualizarFiltrosCompeticion();
    actualizarFiltrosEquipo();
    
    // Inicializar el dropdown de equipos con todos los equipos
    filtrarEquipos('');

    // Actualizar el progreso
    progressBar.style.width = '100%';
    loaderText.textContent = 'Estadísticas cargadas';

    // Ocultar el loader después de un breve delay
    setTimeout(() => {
      loaderContainer.style.display = 'none';
      actualizarVista();
      // Configurar botones de toggle después de cargar
      setupToggleButtons();
      // Asegurar que los filtros estén colapsados después de cargar
      initializeCollapsedFilters();
    }, 500);

  } catch (error) {
    console.error('Error al cargar estadísticas:', error);
    loaderText.textContent = 'Error al cargar los datos. Por favor, recarga la página.';
    // Si falla la carga del archivo precalculado, usar datos de ejemplo
    state.allPlayersStats = jugadores;
    state.jugadoresFiltrados = [...jugadores];
    loaderContainer.style.display = 'none';
    actualizarVista();
    // Configurar botones de toggle después de cargar datos de fallback
    setupToggleButtons();
    // Asegurar que los filtros estén colapsados después de cargar datos de fallback
    initializeCollapsedFilters();
  }
}

// Función para actualizar los filtros de competición
function actualizarFiltrosCompeticion() {
  const competiciones = [...new Set(state.allPlayersStats.map(j => j.competicion))].sort();
  
  // Verificar si el contenedor está colapsado para mantener el estado
  const wasCollapsed = elementos.competicionFiltros.classList.contains('collapsed');
  
  elementos.competicionFiltros.innerHTML = `
    <button class="competition-btn active" data-competition="todas">Todas</button>
    ${competiciones.map(comp => `
      <button class="competition-btn" data-competition="${comp}">${formatCompetitionName(comp)}</button>
    `).join('')}
  `;

  // Mantener el estado colapsado si estaba colapsado
  if (wasCollapsed) {
    elementos.competicionFiltros.classList.add('collapsed');
  }

  // Añadir event listeners a los botones de competición
  elementos.competicionFiltros.querySelectorAll('.competition-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const competicion = e.target.dataset.competition;
      state.filtros.competicion = competicion;
      
      // Actualizar los estilos de los botones
      elementos.competicionFiltros.querySelectorAll('.competition-btn').forEach(b => {
        b.classList.remove('active');
      });
      e.target.classList.add('active');
      
      actualizarFiltrosActivos();
      actualizarVista();
    });
  });

  // Reconfigurar los botones de toggle después de actualizar los filtros
  setupToggleButtons();
}

// Función para actualizar los filtros de equipo
function actualizarFiltrosEquipo() {
  const teamFilter = elementos.teamFilter;
  teamFilter.value = state.filtros.equipo || '';
}

// Función para mostrar/ocultar el puntito en el botón de filtros
function updateFiltersIndicator() {
  const btn = elementos.btnFiltros;
  const filtros = state.filtros;
  // Hay filtro activo si alguno de estos no es el valor por defecto
  const hasActiveFilters = (filtros.genero && filtros.genero !== 'todos') ||
    (filtros.competicion && filtros.competicion !== 'todas') ||
    (filtros.equipo && filtros.equipo !== '') ||
    (filtros.estadisticas && (
      (filtros.estadisticas.puntos.min !== null && filtros.estadisticas.puntos.min !== '') ||
      (filtros.estadisticas.puntos.max !== null && filtros.estadisticas.puntos.max !== '') ||
      (filtros.estadisticas.rebotes.min !== null && filtros.estadisticas.rebotes.min !== '') ||
      (filtros.estadisticas.rebotes.max !== null && filtros.estadisticas.rebotes.max !== '') ||
      (filtros.estadisticas.asistencias.min !== null && filtros.estadisticas.asistencias.min !== '') ||
      (filtros.estadisticas.asistencias.max !== null && filtros.estadisticas.asistencias.max !== '')
    ));
  if (hasActiveFilters) {
    btn.classList.add('has-active-filters');
  } else {
    btn.classList.remove('has-active-filters');
  }
}

// Llama a updateFiltersIndicator después de aplicar filtros
const originalAplicarFiltros = aplicarFiltros;
aplicarFiltros = function() {
  originalAplicarFiltros.apply(this, arguments);
  updateFiltersIndicator();
};

// Llama a updateFiltersIndicator después de limpiar filtros
const originalLimpiarFiltros = limpiarFiltros;
limpiarFiltros = function() {
  originalLimpiarFiltros.apply(this, arguments);
  updateFiltersIndicator();
};

// Llama a updateFiltersIndicator después de eliminar un filtro individual
const originalEliminarFiltro = eliminarFiltro;
eliminarFiltro = function(tipo, valor) {
  originalEliminarFiltro.apply(this, arguments);
  updateFiltersIndicator();
};

// También llama a updateFiltersIndicator al iniciar y tras cambios de filtros
setTimeout(updateFiltersIndicator, 200);

// === Botón para subir arriba en Jugadores ===
const scrollTopBtn = document.getElementById('playersScrollTopBtn');
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

// Iniciar la aplicación
document.addEventListener('DOMContentLoaded', init);
