// ===== PERFIL PERSONAL CON SUPABASE =====

// Variables globales
let currentUser = null;
let currentSession = null;
let isUserLoggedIn = false;

// ===== INICIALIZACIÓN =====
async function initializeAuth() {
    console.log('🚀 Inicializando autenticación con Supabase...');

    if (!window.supabaseAuth) {
        console.error('🚨 supabaseAuth no está disponible');
        showAuthError();
        return;
    }

    const loginBtn = document.getElementById("login-btn");
    const loginBtnText = document.getElementById("login-btn-text");
    const userDropdown = document.getElementById("user-dropdown");
    const dropdownUsername = document.getElementById("dropdown-username");
    const logoutBtn = document.getElementById("logout-btn");

    try {
        currentSession = await window.supabaseAuth.getCurrentSession();
        currentUser = currentSession?.user || null;

        if (currentUser) {
            isUserLoggedIn = true;
            const nombre = getDisplayName(currentUser);
            console.log('✅ Usuario autenticado:', currentUser.email);

            if (loginBtnText) loginBtnText.innerHTML = `<span class="user-name">${nombre}</span>`;
            if (dropdownUsername) dropdownUsername.innerHTML = nombre;

            if (loginBtn) {
                loginBtn.removeAttribute('href');
                loginBtn.style.cursor = "pointer";
                loginBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (userDropdown) {
                        userDropdown.style.display = userDropdown.style.display === "block" ? "none" : "block";
                    }
                });
            }

            if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);

            document.addEventListener("click", function (e) {
                const loginContainer = document.querySelector(".login-container");
                if (loginContainer && !loginContainer.contains(e.target) && userDropdown) {
                    userDropdown.style.display = "none";
                }
            });
        } else {
            console.log('📝 Usuario no autenticado');
            setupLoginButton(loginBtn, loginBtnText);
        }
    } catch (error) {
        console.error('❌ Error inicializando auth:', error);
        setupLoginButton(loginBtn, loginBtnText);
    }

    window.supabaseAuth.onAuthStateChange((event, session) => {
        console.log('🔔 Estado de auth cambió:', event);
        handleAuthStateChange(event, session);
    });
}

function setupLoginButton(loginBtn, loginBtnText) {
    if (loginBtnText) loginBtnText.textContent = "Login";
    if (loginBtn) {
        loginBtn.href = "login.html";
        loginBtn.style.cursor = "pointer";
    }
}

function getDisplayName(user) {
    return user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario';
}

function showAuthError() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'auth-error';
    messageDiv.innerHTML = '⚠️ Error de configuración de autenticación. <a href="login.html">Ir al login</a>';
    document.body.prepend(messageDiv);
}

async function handleAuthStateChange(event, session) {
    currentSession = session;
    currentUser = session?.user || null;
    isUserLoggedIn = !!currentUser;

    if (event === 'SIGNED_OUT') {
        console.log('👋 Usuario cerró sesión');
        window.location.href = "../index.html";
    } else if (event === 'SIGNED_IN') {
        console.log('✅ Usuario inició sesión');
        location.reload();
    }
}

async function handleLogout() {
    const confirmar = confirm("¿De verdad quieres cerrar sesión?");
    if (!confirmar) return;

    try {
        await window.supabaseAuth.signOut();
        console.log('✅ Sesión cerrada exitosamente');
    } catch (error) {
        console.error('❌ Error cerrando sesión:', error);
        alert('Error cerrando sesión. Inténtalo de nuevo.');
    }
}

// ===== GESTIÓN DE PERFILES =====
async function loadSavedProfileData() {
    console.log('📥 Cargando datos del perfil desde Supabase...');

    if (!currentUser) {
        console.log('⚠️ No hay usuario autenticado');
        return;
    }

    try {
        const profile = await window.supabaseAuth.getProfile(currentUser.id);

        if (profile) {
            console.log('✅ Perfil encontrado:', profile);
            fillFormWithProfileData(profile);
        } else {
            console.log('📝 No se encontró perfil, será creado al guardar');
            document.querySelector('[name="email"]').value = currentUser.email;
        }
    } catch (error) {
        console.error('❌ Error cargando perfil:', error);
    }
}

function fillFormWithProfileData(profileData) {
    const fieldMapping = {
        'correo_electronico': 'email',
        'nombre': 'firstName',
        'apellido': 'lastName',
        'pais': 'country',
        'direccion': 'address',
        'ciudad': 'city',
        'codigo_postal': 'postalCode',
        'telefono': 'phone',
        'fecha_nacimiento': 'birthDate'
    };

    Object.keys(fieldMapping).forEach(dbField => {
        const formFieldName = fieldMapping[dbField];
        const input = document.querySelector(`[name="${formFieldName}"]`);

        if (input && profileData[dbField]) {
            if (dbField === 'fecha_nacimiento') {
                const date = new Date(profileData[dbField]);
                input.value = date.toISOString().split('T')[0];
            } else {
                input.value = profileData[dbField];
            }
        }
    });
}

// ===== EDICIÓN DE PERFIL =====
function setupProfileEditFunctionality() {
    const editButton = document.getElementById('editButton');
    const formActions = document.getElementById('formActions');
    const cancelButton = document.getElementById('cancelButton');
    const profileForm = document.getElementById('profileForm');
    const successMessage = document.getElementById('successMessage');

    let originalValues = {};

    if (editButton) {
        editButton.addEventListener('click', () => {
            const allInputs = document.querySelectorAll('#profileForm input, #profileForm select');
            allInputs.forEach(input => originalValues[input.name] = input.value);

            allInputs.forEach(input => {
                if (input.id !== 'email') input.removeAttribute('readonly');
            });
            document.getElementById('country').removeAttribute('disabled');

            if (formActions) formActions.style.display = 'flex';
            editButton.style.display = 'none';
        });
    }

    if (cancelButton) {
        cancelButton.addEventListener('click', () => {
            Object.keys(originalValues).forEach(name => {
                const input = document.querySelector(`[name="${name}"]`);
                if (input) input.value = originalValues[name];
            });

            document.querySelectorAll('#profileForm input').forEach(input => input.setAttribute('readonly', ''));
            document.getElementById('country').setAttribute('disabled', '');

            if (formActions) formActions.style.display = 'none';
            if (editButton) editButton.style.display = 'flex';
            if (successMessage) successMessage.style.display = 'none';
        });
    }

    if (profileForm) profileForm.addEventListener('submit', handleProfileSave);
}

async function handleProfileSave(e) {
    e.preventDefault();

    if (!isUserLoggedIn || !currentUser) {
        alert("Usuario no autenticado.");
        window.location.href = "login.html";
        return;
    }

    const profileForm = document.getElementById('profileForm');
    const successMessage = document.getElementById('successMessage');
    const formActions = document.getElementById('formActions');
    const editButton = document.getElementById('editButton');

    const formData = new FormData(profileForm);
    const data = Object.fromEntries(formData.entries());

    const profileData = {
        correo_electronico: currentUser.email,
        nombre: data.firstName || null,
        apellido: data.lastName || null,
        pais: data.country || null,
        direccion: data.address || null,
        ciudad: data.city || null,
        codigo_postal: data.postalCode || null,
        telefono: data.phone || null,
        fecha_nacimiento: data.birthDate || null
    };

    try {
        await window.supabaseAuth.saveProfile(currentUser.id, profileData);
        console.log("✅ Perfil guardado:", profileData);

        profileForm.classList.remove("loading");
        profileForm.querySelectorAll("input").forEach(input => input.setAttribute("readonly", ""));
        document.getElementById('country').setAttribute("disabled", "");

        if (formActions) formActions.style.display = "none";
        if (editButton) editButton.style.display = "flex";
        if (successMessage) {
            successMessage.style.display = "block";
            setTimeout(() => successMessage.style.display = "none", 5000);
        }

    } catch (error) {
        console.error("❌ Error guardando perfil:", error);
        alert("❌ Error guardando el perfil: " + error.message);
    }
}

// ===== GESTIÓN DE EQUIPOS FAVORITOS =====
let allTeams = [];
let favoriteTeams = [];

// ===== GESTIÓN DE JUGADORES FAVORITOS =====
let allPlayers = [];
let favoritePlayers = [];

async function loadTeamsData() {
    console.log('📊 Cargando datos de equipos...');
    
    // Ejecutar diagnóstico de Supabase
    if (window.supabaseAuth && currentUser) {
        console.log('🔍 Ejecutando diagnóstico de Supabase...');
        await window.supabaseAuth.diagnoseFavoriteTeamsTable();
        await window.supabaseAuth.testFavoriteTeamsStructure();
    }
    
    try {
        const response = await fetch('../Clasificacion/all_competitions_info.json');
        const data = await response.json();
        
        // Extraer todos los equipos únicos de todas las competiciones
        const teamsMap = new Map();
        
        Object.keys(data).forEach(competition => {
            data[competition].forEach(match => {
                // Agregar team_a
                if (!teamsMap.has(match.team_a.id)) {
                    teamsMap.set(match.team_a.id, {
                        id: match.team_a.id,
                        name: match.team_a.name,
                        logo: match.team_a.logo,
                        competitions: new Set()
                    });
                }
                teamsMap.get(match.team_a.id).competitions.add(competition);
                
                // Agregar team_b
                if (!teamsMap.has(match.team_b.id)) {
                    teamsMap.set(match.team_b.id, {
                        id: match.team_b.id,
                        name: match.team_b.name,
                        logo: match.team_b.logo,
                        competitions: new Set()
                    });
                }
                teamsMap.get(match.team_b.id).competitions.add(competition);
            });
        });
        
        // Convertir a array y preparar para mostrar
        allTeams = Array.from(teamsMap.values()).map(team => ({
            ...team,
            competitions: Array.from(team.competitions)
        }));
        
        console.log(`✅ Cargados ${allTeams.length} equipos únicos`);
        
        // Cargar competiciones en el filtro
        loadCompetitionsFilter(Object.keys(data));
        
        // Cargar equipos favoritos del usuario
        await loadFavoriteTeams();
        
    } catch (error) {
        console.error('❌ Error cargando datos de equipos:', error);
    }
}

function loadCompetitionsFilter(competitions) {
    const competitionFilter = document.getElementById('competition-filter');
    if (!competitionFilter) return;
    
    // Limpiar opciones existentes (excepto "Todas las competiciones")
    competitionFilter.innerHTML = '<option value="">Todas las competiciones</option>';
    
    competitions.forEach(comp => {
        const option = document.createElement('option');
        option.value = comp;
        option.textContent = formatCompetitionName(comp);
        competitionFilter.appendChild(option);
    });
}

function formatCompetitionName(comp) {
    const mappings = {
        'PRIMERA FEB': 'Primera FEB',
        'LF ENDESA': 'Liga Femenina Endesa',
        'C ESP CLUBES CAD MASC': 'Cadete Masculino',
        'C ESP CLUBES CAD FEM': 'Cadete Femenino',
        'C ESP CLUBES INF MASC': 'Infantil Masculino',
        'C ESP CLUBES INF FEM': 'Infantil Femenino',
        'C ESP CLUBES MINI MASC': 'Mini Masculino',
        'C ESP CLUBES MINI FEM': 'Mini Femenino'
    };
    
    return mappings[comp] || comp;
}

async function loadFavoriteTeams() {
    if (!currentUser) return;
    
    try {
        const supabaseTeams = await window.supabaseAuth.getFavoriteTeams(currentUser.id);
        
        // Convertir formato de Supabase al formato local
        favoriteTeams = supabaseTeams.map(team => ({
            id: team.team_id,
            name: team.team_name,
            logo: team.team_logo,
            competitions: team.competitions || []
        }));
        
        console.log(`📋 Cargados ${favoriteTeams.length} equipos favoritos desde Supabase`);
        displayFavoriteTeams();
    } catch (error) {
        console.error('❌ Error cargando equipos favoritos:', error);
        favoriteTeams = [];
        displayFavoriteTeams();
    }
}

function displayFavoriteTeams() {
    const favoriteTeamsList = document.getElementById('favorite-teams-list');
    if (!favoriteTeamsList) return;
    
    if (favoriteTeams.length === 0) {
        favoriteTeamsList.innerHTML = '<p class="no-favorites">No has agregado equipos favoritos aún</p>';
        return;
    }
    
    favoriteTeamsList.innerHTML = favoriteTeams.map(team => `
        <div class="favorite-team-card">
            <img src="${team.logo}" alt="${team.name}" class="team-logo" onerror="this.src='../team_icon.png'">
            <div class="team-info">
                <h4>${team.name}</h4>
                <span class="team-competitions">${team.competitions.map(formatCompetitionName).join(', ')}</span>
            </div>
            <button class="remove-favorite-btn" onclick="removeFavoriteTeam('${team.id}')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
    `).join('');
}

function setupTeamsSearch() {
    const searchInput = document.getElementById('team-search-input');
    const competitionFilter = document.getElementById('competition-filter');
    
    if (searchInput) {
        searchInput.addEventListener('input', debounce(searchTeams, 300));
    }
    
    if (competitionFilter) {
        competitionFilter.addEventListener('change', searchTeams);
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function searchTeams() {
    const searchInput = document.getElementById('team-search-input');
    const competitionFilter = document.getElementById('competition-filter');
    const resultsContainer = document.getElementById('teams-search-results');
    const teamsCount = document.getElementById('teams-count');
    
    if (!searchInput || !resultsContainer) return;
    
    const searchTerm = searchInput.value.toLowerCase().trim();
    const selectedCompetition = competitionFilter?.value || '';
    
    if (searchTerm.length < 2) {
        resultsContainer.innerHTML = '<p class="search-prompt">Escribe al menos 2 caracteres para buscar equipos</p>';
        teamsCount.textContent = '';
        return;
    }
    
    let filteredTeams = allTeams.filter(team => 
        team.name.toLowerCase().includes(searchTerm)
    );
    
    if (selectedCompetition) {
        filteredTeams = filteredTeams.filter(team =>
            team.competitions.includes(selectedCompetition)
        );
    }
    
    teamsCount.textContent = `(${filteredTeams.length} equipos encontrados)`;
    
    if (filteredTeams.length === 0) {
        resultsContainer.innerHTML = '<p class="no-results">No se encontraron equipos que coincidan con tu búsqueda</p>';
        return;
    }
    
    resultsContainer.innerHTML = filteredTeams.map(team => {
        const isFavorite = favoriteTeams.some(fav => fav.id === team.id);
        return `
            <div class="team-search-card">
                <img src="${team.logo}" alt="${team.name}" class="team-logo" onerror="this.src='../team_icon.png'">
                <div class="team-info">
                    <h4>${team.name}</h4>
                    <span class="team-competitions">${team.competitions.map(formatCompetitionName).join(', ')}</span>
                </div>
                <button class="favorite-btn ${isFavorite ? 'favorited' : ''}" 
                        onclick="${isFavorite ? `removeFavoriteTeam('${team.id}')` : `addFavoriteTeam('${team.id}')`}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="${isFavorite ? '#FF6B6B' : 'none'}" stroke="${isFavorite ? '#FF6B6B' : 'currentColor'}" stroke-width="2">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path>
                    </svg>
                    ${isFavorite ? 'Quitar' : 'Agregar'}
                </button>
            </div>
        `;
    }).join('');
}

window.addFavoriteTeam = async function(teamId) {
    if (!currentUser) {
        alert('Debes iniciar sesión para agregar favoritos');
        return;
    }
    
    const team = allTeams.find(t => t.id === teamId);
    if (!team || favoriteTeams.some(fav => fav.id === teamId)) return;
    
    try {
        console.log('🔄 Intentando agregar equipo a favoritos:', team);
        console.log('👤 Usuario actual:', currentUser.id);
        
        // Agregar a Supabase
        await window.supabaseAuth.addFavoriteTeam(currentUser.id, team);
        
        // Actualizar array local
        favoriteTeams.push(team);
        displayFavoriteTeams();
        searchTeams(); // Actualizar resultados de búsqueda
        
        console.log(`⭐ Equipo agregado a favoritos: ${team.name}`);
    } catch (error) {
        console.error('❌ Error agregando equipo a favoritos:', error);
        console.error('📋 Detalles del error:', error.message);
        console.error('🔍 Stack trace:', error.stack);
        alert(`Error agregando equipo a favoritos: ${error.message}`);
    }
};

window.removeFavoriteTeam = async function(teamId) {
    if (!currentUser) {
        alert('Debes iniciar sesión');
        return;
    }
    
    try {
        // Quitar de Supabase
        await window.supabaseAuth.removeFavoriteTeam(currentUser.id, teamId);
        
        // Actualizar array local
        favoriteTeams = favoriteTeams.filter(team => team.id !== teamId);
        displayFavoriteTeams();
        searchTeams(); // Actualizar resultados de búsqueda
        
        const team = allTeams.find(t => t.id === teamId);
        console.log(`💔 Equipo eliminado de favoritos: ${team?.name || teamId}`);
    } catch (error) {
        console.error('❌ Error quitando equipo de favoritos:', error);
        alert('Error quitando equipo de favoritos. Inténtalo de nuevo.');
    }
};

// ===== FUNCIONES DE JUGADORES FAVORITOS =====

async function loadPlayersData() {
    console.log('🏀 Cargando datos de jugadores...');
    
    try {
        const response = await fetch('../player_stats.json');
        const data = await response.json();
        
        // Guardar todos los jugadores
        allPlayers = data;
        
        console.log(`✅ Cargados ${allPlayers.length} jugadores`);
        
        // Cargar competiciones en el filtro de jugadores
        loadPlayersCompetitionsFilter();
        
        // Cargar jugadores favoritos del usuario
        await loadFavoritePlayers();
        
    } catch (error) {
        console.error('❌ Error cargando datos de jugadores:', error);
    }
}

function loadPlayersCompetitionsFilter() {
    const competitionFilter = document.getElementById('player-competition-filter');
    const teamFilter = document.getElementById('player-team-filter');
    
    if (competitionFilter) {
        // Obtener competiciones únicas
        const competitions = [...new Set(allPlayers.map(player => player.competicion))];
        
        // Limpiar opciones existentes
        competitionFilter.innerHTML = '<option value="">Todas las competiciones</option>';
        
        competitions.forEach(comp => {
            const option = document.createElement('option');
            option.value = comp;
            option.textContent = formatCompetitionName(comp);
            competitionFilter.appendChild(option);
        });
    }
    
    if (teamFilter) {
        // Obtener equipos únicos ordenados alfabéticamente
        const teams = [...new Set(allPlayers.map(player => player.equipo))].sort();
        
        // Limpiar opciones existentes
        teamFilter.innerHTML = '<option value="">Todos los equipos</option>';
        
        teams.forEach(team => {
            const option = document.createElement('option');
            option.value = team;
            option.textContent = team;
            teamFilter.appendChild(option);
        });
    }
}

async function loadFavoritePlayers() {
    if (!currentUser) return;
    
    try {
        const supabasePlayers = await window.supabaseAuth.getFavoritePlayers(currentUser.id);
        
        // Convertir formato de Supabase al formato local
        favoritePlayers = supabasePlayers.map(player => ({
            id: player.player_id,
            nombre: player.player_name,
            foto: player.player_photo,
            equipo: player.team_name,
            team_logo: player.team_logo,
            competicion: player.competition,
            genero: player.gender,
            estadisticas: player.stats || {}
        }));
        
        console.log(`📋 Cargados ${favoritePlayers.length} jugadores favoritos desde Supabase`);
        displayFavoritePlayers();
    } catch (error) {
        console.error('❌ Error cargando jugadores favoritos:', error);
        favoritePlayers = [];
        displayFavoritePlayers();
    }
}

function displayFavoritePlayers() {
    const favoritePlayersList = document.getElementById('favorite-players-list');
    if (!favoritePlayersList) return;
    
    if (favoritePlayers.length === 0) {
        favoritePlayersList.innerHTML = '<p class="no-favorites">No has agregado jugadores favoritos aún</p>';
        return;
    }
    
    favoritePlayersList.innerHTML = favoritePlayers.map(player => `
        <div class="favorite-player-card">
            <img src="${player.foto}" alt="${player.nombre}" class="player-photo" onerror="this.src='../player_placeholder.png'">
            <div class="player-info">
                <h4>${player.nombre}</h4>
                <span class="player-team">${player.equipo}</span>
                <span class="player-competition">${formatCompetitionName(player.competicion)}</span>
                <div class="player-stats-compact">
                    <span class="stat-compact">PTS: ${player.estadisticas.puntos || 0}</span>
                    <span class="stat-compact">REB: ${player.estadisticas.rebotes || 0}</span>
                    <span class="stat-compact">AST: ${player.estadisticas.asistencias || 0}</span>
                </div>
            </div>
            <button class="remove-favorite-btn" onclick="removeFavoritePlayer('${player.id}')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
    `).join('');
}

function setupPlayersSearch() {
    const searchInput = document.getElementById('player-search-input');
    const competitionFilter = document.getElementById('player-competition-filter');
    const teamFilter = document.getElementById('player-team-filter');
    const sortFilter = document.getElementById('player-sort-filter');
    
    // Filtros básicos
    if (searchInput) {
        searchInput.addEventListener('input', debounce(searchPlayers, 300));
    }
    
    if (competitionFilter) {
        competitionFilter.addEventListener('change', searchPlayers);
    }
    
    if (teamFilter) {
        teamFilter.addEventListener('change', searchPlayers);
    }
    
    if (sortFilter) {
        sortFilter.addEventListener('change', searchPlayers);
    }
    
    // Filtros avanzados - inputs de estadísticas
    const statInputs = [
        'points-min', 'points-max',
        'rebounds-min', 'rebounds-max', 
        'assists-min', 'assists-max'
    ];
    
    statInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('input', debounce(searchPlayers, 500));
        }
    });
    
    // Filtros avanzados - checkboxes
    const activePlayersCheckbox = document.getElementById('active-players-only');
    const topPerformersCheckbox = document.getElementById('top-performers-only');
    
    if (activePlayersCheckbox) {
        activePlayersCheckbox.addEventListener('change', searchPlayers);
    }
    
    if (topPerformersCheckbox) {
        topPerformersCheckbox.addEventListener('change', searchPlayers);
    }
    
    // Botón de toggle para filtros avanzados
    const toggleAdvancedBtn = document.getElementById('toggle-advanced-filters');
    const advancedContent = document.getElementById('advanced-filters-content');
    
    if (toggleAdvancedBtn && advancedContent) {
        toggleAdvancedBtn.addEventListener('click', () => {
            const isVisible = advancedContent.style.display !== 'none';
            advancedContent.style.display = isVisible ? 'none' : 'block';
            toggleAdvancedBtn.classList.toggle('active', !isVisible);
        });
    }
    
    // Botón de limpiar filtros
    const clearFiltersBtn = document.getElementById('clear-all-filters');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearAllPlayersFilters);
    }
}

function clearAllPlayersFilters() {
    // Limpiar inputs de texto y números
    const inputs = [
        'player-search-input',
        'points-min', 'points-max',
        'rebounds-min', 'rebounds-max',
        'assists-min', 'assists-max'
    ];
    
    inputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) input.value = '';
    });
    
    // Resetear selects
    const selects = [
        'player-competition-filter',
        'player-team-filter',
        'player-sort-filter'
    ];
    
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) select.selectedIndex = 0;
    });
    
    // Desmarcar checkboxes
    const checkboxes = [
        'active-players-only',
        'top-performers-only'
    ];
    
    checkboxes.forEach(checkboxId => {
        const checkbox = document.getElementById(checkboxId);
        if (checkbox) checkbox.checked = false;
    });
    
    // Ejecutar búsqueda con filtros limpios
    searchPlayers();
}

function searchPlayers() {
    const searchInput = document.getElementById('player-search-input');
    const competitionFilter = document.getElementById('player-competition-filter');
    const teamFilter = document.getElementById('player-team-filter');
    const sortFilter = document.getElementById('player-sort-filter');
    const resultsContainer = document.getElementById('players-search-results');
    const playersCount = document.getElementById('players-count');
    
    if (!searchInput || !resultsContainer) return;
    
    const searchTerm = searchInput.value.toLowerCase().trim();
    const selectedCompetition = competitionFilter?.value || '';
    const selectedTeam = teamFilter?.value || '';
    const sortOption = sortFilter?.value || 'name';
    
    // Filtros avanzados
    const pointsMin = parseFloat(document.getElementById('points-min')?.value) || null;
    const pointsMax = parseFloat(document.getElementById('points-max')?.value) || null;
    const reboundsMin = parseFloat(document.getElementById('rebounds-min')?.value) || null;
    const reboundsMax = parseFloat(document.getElementById('rebounds-max')?.value) || null;
    const assistsMin = parseFloat(document.getElementById('assists-min')?.value) || null;
    const assistsMax = parseFloat(document.getElementById('assists-max')?.value) || null;
    const activePlayersOnly = document.getElementById('active-players-only')?.checked || false;
    const topPerformersOnly = document.getElementById('top-performers-only')?.checked || false;
    
    // Si no hay término de búsqueda y no hay filtros aplicados, no mostrar resultados
    const hasFilters = selectedCompetition || selectedTeam || 
                      pointsMin !== null || pointsMax !== null || 
                      reboundsMin !== null || reboundsMax !== null ||
                      assistsMin !== null || assistsMax !== null ||
                      activePlayersOnly || topPerformersOnly;
    
    if (searchTerm.length < 2 && !hasFilters) {
        resultsContainer.innerHTML = '<p class="search-prompt">Escribe al menos 2 caracteres para buscar o usa los filtros</p>';
        playersCount.textContent = '';
        return;
    }
    
    // Filtrar jugadores
    let filteredPlayers = allPlayers.filter(player => {
        // Filtro de texto
        if (searchTerm.length >= 2) {
            const matchesSearch = player.nombre.toLowerCase().includes(searchTerm) ||
                                player.equipo.toLowerCase().includes(searchTerm);
            if (!matchesSearch) return false;
        }
        
        // Filtros básicos
        if (selectedCompetition && player.competicion !== selectedCompetition) return false;
        if (selectedTeam && player.equipo !== selectedTeam) return false;
        
        // Filtros de estadísticas
        const stats = player.estadisticas || {};
        const points = stats.puntos || 0;
        const rebounds = stats.rebotes || 0;
        const assists = stats.asistencias || 0;
        
        if (pointsMin !== null && points < pointsMin) return false;
        if (pointsMax !== null && points > pointsMax) return false;
        if (reboundsMin !== null && rebounds < reboundsMin) return false;
        if (reboundsMax !== null && rebounds > reboundsMax) return false;
        if (assistsMin !== null && assists < assistsMin) return false;
        if (assistsMax !== null && assists > assistsMax) return false;
        
        // Filtros especiales
        if (activePlayersOnly && (points === 0 && rebounds === 0 && assists === 0)) return false;
        if (topPerformersOnly && points <= 10) return false;
        
        return true;
    });
    
    // Ordenar jugadores
    filteredPlayers = sortPlayers(filteredPlayers, sortOption);
    
    playersCount.textContent = `(${filteredPlayers.length} jugadores encontrados)`;
    
    if (filteredPlayers.length === 0) {
        resultsContainer.innerHTML = '<p class="no-results">No se encontraron jugadores que coincidan con los filtros aplicados</p>';
        return;
    }
    
    // Limitar resultados para performance
    const maxResults = 100;
    const playersToShow = filteredPlayers.slice(0, maxResults);
    
    if (filteredPlayers.length > maxResults) {
        playersCount.textContent = `(Mostrando ${maxResults} de ${filteredPlayers.length} jugadores encontrados)`;
    }
    
    resultsContainer.innerHTML = playersToShow.map(player => {
        const isFavorite = favoritePlayers.some(fav => fav.id === player.id);
        const stats = player.estadisticas || {};
        
        return `
            <div class="player-search-card">
                <img src="${player.foto}" alt="${player.nombre}" class="player-photo" onerror="this.src='../player_placeholder.png'">
                <div class="player-info">
                    <h4>${player.nombre}</h4>
                    <span class="player-team">${player.equipo}</span>
                    <span class="player-competition">${formatCompetitionName(player.competicion)}</span>
                    <div class="player-stats-compact">
                        <span class="stat-compact">PTS: ${(stats.puntos || 0).toFixed(1)}</span>
                        <span class="stat-compact">REB: ${(stats.rebotes || 0).toFixed(1)}</span>
                        <span class="stat-compact">AST: ${(stats.asistencias || 0).toFixed(1)}</span>
                    </div>
                </div>
                <button class="favorite-btn ${isFavorite ? 'favorited' : ''}" 
                        onclick="${isFavorite ? `removeFavoritePlayer('${player.id}')` : `addFavoritePlayer('${player.id}')`}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="${isFavorite ? '#FF6B6B' : 'none'}" stroke="${isFavorite ? '#FF6B6B' : 'currentColor'}" stroke-width="2">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path>
                    </svg>
                    ${isFavorite ? 'Quitar' : 'Agregar'}
                </button>
            </div>
        `;
    }).join('');
}

function sortPlayers(players, sortOption) {
    const sortedPlayers = [...players];
    
    switch (sortOption) {
        case 'name':
            return sortedPlayers.sort((a, b) => a.nombre.localeCompare(b.nombre));
            
        case 'points-desc':
            return sortedPlayers.sort((a, b) => (b.estadisticas?.puntos || 0) - (a.estadisticas?.puntos || 0));
            
        case 'points-asc':
            return sortedPlayers.sort((a, b) => (a.estadisticas?.puntos || 0) - (b.estadisticas?.puntos || 0));
            
        case 'rebounds-desc':
            return sortedPlayers.sort((a, b) => (b.estadisticas?.rebotes || 0) - (a.estadisticas?.rebotes || 0));
            
        case 'assists-desc':
            return sortedPlayers.sort((a, b) => (b.estadisticas?.asistencias || 0) - (a.estadisticas?.asistencias || 0));
            
        case 'team':
            return sortedPlayers.sort((a, b) => a.equipo.localeCompare(b.equipo));
            
        default:
            return sortedPlayers;
    }
}

window.addFavoritePlayer = async function(playerId) {
    if (!currentUser) {
        alert('Debes iniciar sesión para agregar favoritos');
        return;
    }
    
    const player = allPlayers.find(p => p.id === playerId);
    if (!player || favoritePlayers.some(fav => fav.id === playerId)) return;
    
    try {
        console.log('🔄 Intentando agregar jugador a favoritos:', player);
        console.log('👤 Usuario actual:', currentUser.id);
        
        // Agregar a Supabase
        await window.supabaseAuth.addFavoritePlayer(currentUser.id, player);
        
        // Actualizar array local
        favoritePlayers.push(player);
        displayFavoritePlayers();
        searchPlayers(); // Actualizar resultados de búsqueda
        
        console.log(`⭐ Jugador agregado a favoritos: ${player.nombre}`);
    } catch (error) {
        console.error('❌ Error agregando jugador a favoritos:', error);
        console.error('📋 Detalles del error:', error.message);
        console.error('🔍 Stack trace:', error.stack);
        alert(`Error agregando jugador a favoritos: ${error.message}`);
    }
};

window.removeFavoritePlayer = async function(playerId) {
    if (!currentUser) {
        alert('Debes iniciar sesión');
        return;
    }
    
    try {
        // Quitar de Supabase
        await window.supabaseAuth.removeFavoritePlayer(currentUser.id, playerId);
        
        // Actualizar array local
        favoritePlayers = favoritePlayers.filter(player => player.id !== playerId);
        displayFavoritePlayers();
        searchPlayers(); // Actualizar resultados de búsqueda
        
        const player = allPlayers.find(p => p.id === playerId);
        console.log(`💔 Jugador eliminado de favoritos: ${player?.nombre || playerId}`);
    } catch (error) {
        console.error('❌ Error quitando jugador de favoritos:', error);
        alert('Error quitando jugador de favoritos. Inténtalo de nuevo.');
    }
};

// ===== GESTIÓN DE PESTAÑAS =====
function setupTabFunctionality() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;
            
            // Remover clase active de todos los botones
            tabButtons.forEach(btn => btn.classList.remove('active'));
            
            // Ocultar todos los contenidos
            tabContents.forEach(content => content.style.display = 'none');
            
            // Activar el botón clickeado
            button.classList.add('active');
            
            // Mostrar el contenido correspondiente
            const targetContent = document.getElementById(`${targetTab}-content`);
            if (targetContent) {
                targetContent.style.display = 'block';
            }
            
            // Si es la pestaña de equipos, cargar datos si es necesario
            if (targetTab === 'equipos' && allTeams.length === 0) {
                loadTeamsData();
            }
            
            // Si es la pestaña de jugadores, cargar datos si es necesario
            if (targetTab === 'jugadores' && allPlayers.length === 0) {
                loadPlayersData();
            }
            
            console.log(`📑 Cambiando a pestaña: ${targetTab}`);
        });
    });
}

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Inicializando aplicación con Supabase...');

    if (!window.supabaseAuth) {
        console.error('🚨 Supabase no está configurado correctamente');
        showAuthError();
        return;
    }

    await initializeAuth();
    await loadSavedProfileData();
    setupProfileEditFunctionality();
    setupTabFunctionality();
    setupTeamsSearch();
    setupPlayersSearch();

    const perfilContent = document.getElementById('perfil-content');
    if (perfilContent) perfilContent.style.display = 'block';
});
