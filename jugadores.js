// Datos de ejemplo para jugadores
const jugadores = [
  { id: 1, nombre: "Juan Pérez", equipo: "Real Madrid", genero: "masculino", competicion: "Liga Cadete", foto: "https://randomuser.me/api/portraits/men/1.jpg", estadisticas: { puntos: 15.5, rebotes: 8.2, asistencias: 4.1 } },
  { id: 2, nombre: "Carlos Gómez", equipo: "FC Barcelona", genero: "masculino", competicion: "Liga Cadete", foto: "https://randomuser.me/api/portraits/men/2.jpg", estadisticas: { puntos: 12.3, rebotes: 7.1, asistencias: 5.2 } },
  { id: 3, nombre: "Miguel Torres", equipo: "Valencia Basket", genero: "masculino", competicion: "Liga Cadete", foto: "https://randomuser.me/api/portraits/men/3.jpg", estadisticas: { puntos: 18.7, rebotes: 6.5, asistencias: 3.9 } },
  { id: 4, nombre: "Pedro Sánchez", equipo: "Unicaja", genero: "masculino", competicion: "Liga Cadete", foto: "https://randomuser.me/api/portraits/men/4.jpg", estadisticas: { puntos: 10.2, rebotes: 9.1, asistencias: 2.7 } },
  { id: 5, nombre: "Luis Martínez", equipo: "Estudiantes", genero: "masculino", competicion: "Liga Cadete", foto: "https://randomuser.me/api/portraits/men/5.jpg", estadisticas: { puntos: 14.8, rebotes: 5.9, asistencias: 6.1 } },
  { id: 6, nombre: "Ana López", equipo: "Real Madrid", genero: "femenino", competicion: "Liga Cadete Femenina", foto: "https://randomuser.me/api/portraits/women/6.jpg", estadisticas: { puntos: 17.2, rebotes: 8.8, asistencias: 4.5 } },
  { id: 7, nombre: "María García", equipo: "FC Barcelona", genero: "femenino", competicion: "Liga Cadete Femenina", foto: "https://randomuser.me/api/portraits/women/7.jpg", estadisticas: { puntos: 13.9, rebotes: 7.4, asistencias: 5.0 } },
  { id: 8, nombre: "Lucía Fernández", equipo: "Valencia Basket", genero: "femenino", competicion: "Liga Cadete Femenina", foto: "https://randomuser.me/api/portraits/women/8.jpg", estadisticas: { puntos: 16.1, rebotes: 6.7, asistencias: 3.8 } },
  { id: 9, nombre: "Carmen Ruiz", equipo: "Unicaja", genero: "femenino", competicion: "Liga Cadete Femenina", foto: "https://randomuser.me/api/portraits/women/9.jpg", estadisticas: { puntos: 11.5, rebotes: 9.3, asistencias: 2.9 } },
  { id: 10, nombre: "Sara Díaz", equipo: "Estudiantes", genero: "femenino", competicion: "Liga Cadete Femenina", foto: "https://randomuser.me/api/portraits/women/10.jpg", estadisticas: { puntos: 15.0, rebotes: 5.7, asistencias: 6.3 } },
  { id: 11, nombre: "David Romero", equipo: "Gran Canaria", genero: "masculino", competicion: "Liga Cadete", foto: "https://randomuser.me/api/portraits/men/11.jpg", estadisticas: { puntos: 13.4, rebotes: 7.8, asistencias: 4.0 } },
  { id: 12, nombre: "Javier Navarro", equipo: "Joventut", genero: "masculino", competicion: "Liga Cadete", foto: "https://randomuser.me/api/portraits/men/12.jpg", estadisticas: { puntos: 16.9, rebotes: 8.0, asistencias: 3.5 } },
  { id: 13, nombre: "Paula Sanz", equipo: "Gran Canaria", genero: "femenino", competicion: "Liga Cadete Femenina", foto: "https://randomuser.me/api/portraits/women/13.jpg", estadisticas: { puntos: 14.2, rebotes: 6.9, asistencias: 5.7 } },
  { id: 14, nombre: "Elena Castro", equipo: "Joventut", genero: "femenino", competicion: "Liga Cadete Femenina", foto: "https://randomuser.me/api/portraits/women/14.jpg", estadisticas: { puntos: 12.8, rebotes: 7.2, asistencias: 4.9 } },
  { id: 15, nombre: "Marta Moreno", equipo: "Estudiantes", genero: "femenino", competicion: "Liga Cadete Femenina", foto: "https://randomuser.me/api/portraits/women/15.jpg", estadisticas: { puntos: 15.7, rebotes: 8.1, asistencias: 3.6 } }
];

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
  jugadoresPorPagina: 50,
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
  } catch (error) {
    console.error('Error loading statistics:', error);
    document.querySelector('.loader-text').textContent = 'Error al cargar los datos. Por favor, recarga la página.';
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
      actualizarFiltrosActivos();
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

  // Filtrar equipos mientras se escribe
  teamFilter.addEventListener('input', (e) => {
    console.log('Input en el filtro de equipo:', e.target.value);
    clearTimeout(searchTimeout);
    const busqueda = e.target.value.trim();
    
    searchTimeout = setTimeout(() => {
      filtrarEquipos(busqueda);
    }, 300);
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
    console.log('Limpiando filtro de equipo');
    teamFilter.value = '';
    state.filtros.equipo = '';
    teamFilterDropdown.classList.remove('show');
    elementos.filtrosOverlay.classList.remove('open');
  });
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

// Renderizar jugadores en el grid
function renderizarJugadores(jugadores) {
  elementos.grid.innerHTML = jugadores.map(jugador => {
    const teamLogo = jugador.team_logo || '';
    return `
      <div class="player-card">
        <div class="player-header">
          <div class="team-logo-container">
            <img src="${teamLogo}" alt="Logo ${jugador.equipo}" class="team-logo-img">
          </div>
          <img src="${jugador.foto}" alt="${jugador.nombre}" class="player-photo">
        </div>
        <div class="player-info">
          <h3 class="player-name" title="${jugador.nombre}">${truncarNombreJugador(jugador.nombre)}</h3>
          <p class="player-team" title="${jugador.equipo}">${truncarNombreEquipo(jugador.equipo)}</p>
          <p class="player-competition" title="${jugador.competicion}">${jugador.competicion}</p>
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
  // Obtener los valores de los inputs de estadísticas
  const statsInputs = document.querySelectorAll('.stat-filter input');
  statsInputs.forEach(input => {
    const statType = input.closest('.stat-filter').querySelector('label').textContent.toLowerCase();
    const isMin = input.placeholder.toLowerCase() === 'mín';
    const value = input.value ? parseFloat(input.value) : null;
    
    if (value !== null) {
      state.filtros.estadisticas[statType][isMin ? 'min' : 'max'] = value;
    } else {
      state.filtros.estadisticas[statType][isMin ? 'min' : 'max'] = null;
    }
  });

  // Asegurarse de que el equipo seleccionado se mantiene
  state.filtros.equipo = elementos.equipoFiltro.value;

  state.paginaActual = 1;
  actualizarVista();
  elementos.filtrosOverlay.classList.remove('open');
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
      label: `Competición: ${state.filtros.competicion}`
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
    <div class="filter-chip" data-tipo="${filtro.tipo}" data-valor="${filtro.valor}">
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
    }, 500);

  } catch (error) {
    console.error('Error al cargar estadísticas:', error);
    loaderText.textContent = 'Error al cargar los datos. Por favor, recarga la página.';
    // Si falla la carga del archivo precalculado, usar datos de ejemplo
    state.allPlayersStats = jugadores;
    state.jugadoresFiltrados = [...jugadores];
    loaderContainer.style.display = 'none';
    actualizarVista();
  }
}

// Función para actualizar los filtros de competición
function actualizarFiltrosCompeticion() {
  const competiciones = [...new Set(state.allPlayersStats.map(j => j.competicion))].sort();
  elementos.competicionFiltros.innerHTML = `
    <button class="competition-btn active" data-competition="todas">Todas</button>
    ${competiciones.map(comp => `
      <button class="competition-btn" data-competition="${comp}">${comp}</button>
    `).join('')}
  `;

  // Añadir event listeners a los botones de competición
  elementos.competicionFiltros.querySelectorAll('.competition-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const competicion = e.target.dataset.competition;
      state.filtros.competicion = competicion;
      actualizarFiltrosActivos();
      actualizarVista();
    });
  });
}

// Función para actualizar los filtros de equipo
function actualizarFiltrosEquipo() {
  const teamFilter = elementos.teamFilter;
  teamFilter.value = state.filtros.equipo || '';
}

// Iniciar la aplicación
document.addEventListener('DOMContentLoaded', init);