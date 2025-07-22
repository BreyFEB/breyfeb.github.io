// Importar Supabase
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

        const supabase = createClient(
            'https://ovadhyvmvinklxjvnbgi.supabase.co',
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92YWRoeXZtdmlua2x4anZuYmdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwOTA0NTcsImV4cCI6MjA2ODY2NjQ1N30.bU0MqDZcf-MbSsC4vfMVuUk_5r2vHozBTf-V5LIZT1s'
        );

        // Variables globales para el login
        let isUserLoggedIn = false;
        const loginBtn = document.getElementById("login-btn");
        const loginBtnText = document.getElementById("login-btn-text");
        const userDropdown = document.getElementById("user-dropdown");
        const dropdownUsername = document.getElementById("dropdown-username");
        const logoutBtn = document.getElementById("logout-btn");

        // Menu hamburguesa
        const menuToggle = document.getElementById('menuToggle');
        const mainNav = document.querySelector('.main-nav');

        if (menuToggle && mainNav) {
            menuToggle.addEventListener('click', function() {
                mainNav.classList.toggle('active');
                menuToggle.classList.toggle('active');
                
                // Crear overlay si no existe
                let overlay = document.querySelector('.overlay');
                if (!overlay) {
                    overlay = document.createElement('div');
                    overlay.className = 'overlay';
                    document.body.appendChild(overlay);
                }
                overlay.classList.toggle('active');
            });

            // Cerrar menú al hacer clic en el overlay
            document.addEventListener('click', function(event) {
                const overlay = document.querySelector('.overlay');
                if (overlay && overlay.classList.contains('active') && event.target === overlay) {
                    mainNav.classList.remove('active');
                    menuToggle.classList.remove('active');
                    overlay.classList.remove('active');
                }
            });
        }

        // Verificar estado de autenticación al cargar la página
        checkAuthStatus();

        async function checkAuthStatus() {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                
                if (user) {
                    isUserLoggedIn = true;
                    loginBtn.style.display = "flex";
                    loginBtnText.textContent = user.user_metadata?.full_name || user.email || "Usuario";
                    dropdownUsername.textContent = user.user_metadata?.full_name || user.email || "Usuario";
                    
                    // Cambiar comportamiento del botón de login
                    loginBtn.onclick = function(e) {
                        e.preventDefault();
                        if (userDropdown.style.display === "none" || userDropdown.style.display === "") {
                            userDropdown.style.display = "block";
                        } else {
                            userDropdown.style.display = "none";
                        }
                    };
                } else {
                    isUserLoggedIn = false;
                    loginBtn.onclick = function() {
                        window.location.href = 'login.html';
                    };
                    loginBtnText.textContent = "Login";
                    userDropdown.style.display = "none";
                }
            } catch (error) {
                console.error('Error verificando autenticación:', error);
                isUserLoggedIn = false;
            }
        }

        // Manejar logout
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async function() {
                try {
                    const { error } = await supabase.auth.signOut();
                    if (error) {
                        console.error('Error al cerrar sesión:', error);
                        alert('Error al cerrar sesión. Por favor, inténtalo de nuevo.');
                    } else {
                        window.location.href = '../index.html';
                        window.location.reload();
                    }
                } catch (err) {
                    console.error('Error inesperado:', err);
                    alert('Error inesperado al cerrar sesión.');
                }
            });
        }

        // Cerrar dropdown al hacer clic fuera de él
        document.addEventListener('click', function(event) {
            if (!isUserLoggedIn) return;
            
            const loginContainer = document.querySelector('.login-container');
            if (loginContainer && !loginContainer.contains(event.target)) {
                if (userDropdown) {
                    userDropdown.style.display = "none";
                }
            }
        });

        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.getAttribute('data-tab');
                console.log('🔄 Cambiando a pestaña:', tabName);
                
                // Remove active class from all buttons
                document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
                // Add active class to clicked button
                button.classList.add('active');
                
                // Hide all tab contents
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.style.display = 'none';
                });
                
                // Show selected tab content
                const targetContent = document.getElementById(tabName + '-content');
                if (targetContent) {
                    targetContent.style.display = 'block';
                    
                    // Inicializar pestaña de equipos cuando se active
                    if (tabName === 'equipos') {
                        console.log('🏀 Pestaña equipos activada, inicializando...');
                        setTimeout(() => {
                            initializeTeamsTab();
                        }, 50);
                    }
                }
            });
        });

        // Edit functionality
        const editButton = document.getElementById('editButton');
        const formActions = document.getElementById('formActions');
        const formInputs = document.querySelectorAll('#profileForm input:not([readonly]), #profileForm select');
        const readonlyInputs = document.querySelectorAll('#profileForm input[readonly]');
        const disabledSelects = document.querySelectorAll('#profileForm select[disabled]');
        const cancelButton = document.getElementById('cancelButton');
        const profileForm = document.getElementById('profileForm');
        const successMessage = document.getElementById('successMessage');

        let originalValues = {};

        editButton.addEventListener('click', () => {
            // Save original values
            const allInputs = document.querySelectorAll('#profileForm input, #profileForm select');
            allInputs.forEach(input => {
                originalValues[input.name] = input.value;
            });

            // Enable editing
            readonlyInputs.forEach(input => {
                if (input.id !== 'email') { // Keep email readonly
                    input.removeAttribute('readonly');
                }
            });
            
            disabledSelects.forEach(select => {
                select.removeAttribute('disabled');
            });

            // Show form actions
            formActions.style.display = 'flex';
            editButton.style.display = 'none';
        });

        cancelButton.addEventListener('click', () => {
            // Restore original values
            Object.keys(originalValues).forEach(name => {
                const input = document.querySelector(`[name="${name}"]`);
                if (input) {
                    input.value = originalValues[name];
                }
            });

            // Disable editing
            readonlyInputs.forEach(input => {
                input.setAttribute('readonly', '');
            });
            
            disabledSelects.forEach(select => {
                select.setAttribute('disabled', '');
            });

            // Hide form actions
            formActions.style.display = 'none';
            editButton.style.display = 'flex';
            successMessage.style.display = 'none';
        });

        profileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Simulate saving (you would integrate with your backend here)
            const formData = new FormData(profileForm);
            const data = Object.fromEntries(formData.entries());
            
            console.log('Saving profile data:', data);
            
            // Simulate loading state
            profileForm.classList.add('loading');
            
            setTimeout(() => {
                // Disable editing
                readonlyInputs.forEach(input => {
                    input.setAttribute('readonly', '');
                });
                
                disabledSelects.forEach(select => {
                    select.setAttribute('disabled', '');
                });

                // Hide form actions
                formActions.style.display = 'none';
                editButton.style.display = 'flex';
                
                // Show success message
                successMessage.style.display = 'block';
                setTimeout(() => {
                    successMessage.style.display = 'none';
                }, 3000);
                
                // Remove loading state
                profileForm.classList.remove('loading');
            }, 1000);
        });

        // Initialize the page with the profile tab active
        document.getElementById('perfil-content').style.display = 'block';

        // ===== FUNCIONALIDAD DE EQUIPOS FAVORITOS =====
        let allTeams = [];
        let favoriteTeams = JSON.parse(localStorage.getItem('favoriteTeams') || '[]');
        let searchTimeout = null;
        let currentSearchPage = 1;
        const teamsPerSearchPage = 20; // Menos que equipos.js para mejor UX en favoritos

        // Formatear nombres de competición
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
            return nameMappings[comp?.trim()] || comp || '';
        }

        // Obtener género de la competición
        function getGenderFromCompetition(competition) {
            if (competition.toLowerCase().includes('fem')) return 'femenino';
            if (competition.toLowerCase().includes('masc')) return 'masculino';
            if (competition.toLowerCase().includes('femenin')) return 'femenino';
            if (competition.toLowerCase().includes('masculin')) return 'masculino';
            return 'mixto';
        }

        // Agregación de partidos de equipo (adaptado de equipos.js)
        function aggregateTeamMatchesDir(players, competitionFilter, teamIdFilter) {
            const matchMap = new Map();
            players.forEach(player => {
                if (!player.matches) return;
                player.matches.forEach(m => {
                    if (competitionFilter && m.competition !== competitionFilter) return;
                    if (teamIdFilter && m.playerTeamId !== teamIdFilter) return;

                    const key = m.game_id;
                    if (!matchMap.has(key)) {
                        matchMap.set(key, {
                            game_id: m.game_id,
                            matchDate: m.matchDate ? m.matchDate.split(' - ')[0] : '',
                            rival: m.rival,
                            marcador: m.marcador,
                            pts: 0
                        });
                    }
                    const agg = matchMap.get(key);
                    agg.pts += m.pts || 0;
                });
            });
            return Array.from(matchMap.values());
        }

        // Cargar datos de equipos con estadísticas (mejorado)
        async function loadTeamsData() {
            console.log('🏀 Iniciando carga de equipos...');
            try {
                console.log('📡 Cargando rankings_stats.json...');
                const response = await fetch('../rankings_stats.json'); // Ajustar ruta desde Login/
                
                if (!response.ok) {
                    throw new Error(`Error HTTP: ${response.status}`);
                }
                
                console.log('✅ Respuesta recibida, parseando JSON...');
                const data = await response.json();
                console.log('📊 Datos cargados:', {
                    playersCount: data.players ? data.players.length : 0
                });
                
                // Aggregate teams by teamId + competition (misma lógica que equipos.js)
                const teamMap = new Map();
                data.players.forEach(player => {
                    // For each teamId the player has
                    const teamIds = [player.teamId];
                    for (let i = 2; i < 10; i++) {
                        if (player[`teamId_${i}`]) teamIds.push(player[`teamId_${i}`]);
                    }
                    teamIds.forEach(tid => {
                        if (!tid) return;
                        // Only consider matches for this team
                        const matches = player.matches ? player.matches.filter(m => m.playerTeamId === tid) : [];
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
                                gender: getGenderFromCompetition(comp)
                            });
                        }
                        teamMap.get(key).matches.push(...matches);
                    });
                });

                // Calculate stats for each team (misma lógica que equipos.js)
                allTeams = Array.from(teamMap.values()).map(team => {
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
                        const [ourPts, rivalPts] = m.marcador ? m.marcador.split('-').map(Number) : [0, 0];
                        totalPtsAgainst += rivalPts || 0;
                        totalPm += (ourPts - rivalPts) || 0;
                    });
                    
                    return {
                        ...team,
                        id: team.teamId, // Normalizar nombre
                        name: team.teamName, // Normalizar nombre
                        logo: team.teamLogo, // Normalizar nombre
                        avgPts: (totalPts / games).toFixed(1),
                        avgPtsAgainst: (totalPtsAgainst / games).toFixed(1),
                        avgPm: (totalPm / games).toFixed(1),
                        totalGames: validGames.length
                    };
                }).sort((a, b) => a.name.localeCompare(b.name));
                
                console.log(`Cargados ${allTeams.length} equipos con estadísticas`);
                
                // Actualizar contador en UI
                updateTeamsCount();
                
                // Llenar select de competiciones con género
                populateCompetitionFilter();
                
                // Mostrar equipos favoritos guardados
                renderFavoriteTeams();
                
                // Restablecer estado de búsqueda
                resetSearchState();
                
            } catch (error) {
                console.error('Error cargando datos de equipos:', error);
                
                // Fallback: intentar cargar desde all_competitions_info.json
                try {
                    const fallbackResponse = await fetch('../Clasificacion/all_competitions_info.json');
                    const fallbackData = await fallbackResponse.json();
                    
                    const fallbackTeamsMap = new Map();
                    
                    Object.entries(fallbackData).forEach(([competition, matches]) => {
                        if (!Array.isArray(matches)) return;
                        matches.forEach(match => {
                            // Equipo A
                            if (match.team_a && match.team_a.name) {
                                const teamKey = `${match.team_a.id}_${competition}`;
                                if (!fallbackTeamsMap.has(teamKey)) {
                                    fallbackTeamsMap.set(teamKey, {
                                        id: match.team_a.id,
                                        name: match.team_a.name,
                                        logo: match.team_a.logo,
                                        competition: competition,
                                        gender: getGenderFromCompetition(competition)
                                    });
                                }
                            }
                            
                            // Equipo B
                            if (match.team_b && match.team_b.name) {
                                const teamKey = `${match.team_b.id}_${competition}`;
                                if (!fallbackTeamsMap.has(teamKey)) {
                                    fallbackTeamsMap.set(teamKey, {
                                        id: match.team_b.id,
                                        name: match.team_b.name,
                                        logo: match.team_b.logo,
                                        competition: competition,
                                        gender: getGenderFromCompetition(competition)
                                    });
                                }
                            }
                        });
                    });
                    
                    allTeams = Array.from(fallbackTeamsMap.values())
                        .sort((a, b) => a.name.localeCompare(b.name));
                    
                    console.log(`Fallback: Cargados ${allTeams.length} equipos`);
                    
                    updateTeamsCount();
                    populateCompetitionFilter();
                    renderFavoriteTeams();
                    resetSearchState();
                    
                } catch (fallbackError) {
                    console.error('Error en fallback:', fallbackError);
                    handleLoadingError();
                }
            }
        }

        // Manejar error de carga
        function handleLoadingError() {
            console.log('🧪 Usando datos de prueba...');
            allTeams = [
                {
                    id: '999999',
                    name: 'Equipo de Prueba',
                    logo: '../team_icon.png',
                    competition: 'C ESP CLUBES CAD MASC',
                    gender: 'masculino',
                    avgPts: '75.5',
                    avgPtsAgainst: '70.2',
                    avgPm: '+5.3',
                    totalGames: 10
                }
            ];
            
            updateTeamsCount();
            populateCompetitionFilter();
            renderFavoriteTeams();
            
            const searchResults = document.getElementById('teams-search-results');
            if (searchResults) {
                searchResults.innerHTML = '<p class="search-prompt">⚠️ Error cargando datos. Mostrando datos de prueba.</p>';
            }
        }

        // Llenar el select de filtro de competiciones con género
        function populateCompetitionFilter() {
            console.log('🔧 Poblando filtro de competiciones...');
            const select = document.getElementById('competition-filter');
            
            if (!select) {
                console.error('❌ No se encontró el elemento competition-filter');
                return;
            }
            
            const competitions = [...new Set(allTeams.map(team => team.competition))].sort();
            console.log('🏁 Competiciones encontradas:', competitions);
            
            select.innerHTML = '<option value="">Todas las competiciones</option>';
            
            // Agrupar por género para mejor UX
            const femeninas = competitions.filter(comp => getGenderFromCompetition(comp) === 'femenino');
            const masculinas = competitions.filter(comp => getGenderFromCompetition(comp) === 'masculino');
            const mixtas = competitions.filter(comp => getGenderFromCompetition(comp) === 'mixto');
            
            if (femeninas.length > 0) {
                const femGroup = document.createElement('optgroup');
                femGroup.label = 'Competiciones Femeninas';
                femeninas.forEach(comp => {
                    const option = document.createElement('option');
                    option.value = comp;
                    option.textContent = formatCompetitionName(comp);
                    femGroup.appendChild(option);
                });
                select.appendChild(femGroup);
            }
            
            if (masculinas.length > 0) {
                const mascGroup = document.createElement('optgroup');
                mascGroup.label = 'Competiciones Masculinas';
                masculinas.forEach(comp => {
                    const option = document.createElement('option');
                    option.value = comp;
                    option.textContent = formatCompetitionName(comp);
                    mascGroup.appendChild(option);
                });
                select.appendChild(mascGroup);
            }
            
            if (mixtas.length > 0) {
                const mixtasGroup = document.createElement('optgroup');
                mixtasGroup.label = 'Otras Competiciones';
                mixtas.forEach(comp => {
                    const option = document.createElement('option');
                    option.value = comp;
                    option.textContent = formatCompetitionName(comp);
                    mixtasGroup.appendChild(option);
                });
                select.appendChild(mixtasGroup);
            }
            
            console.log(`✅ Filtro poblado con ${competitions.length} competiciones (${femeninas.length} fem, ${masculinas.length} masc, ${mixtas.length} mixtas)`);
        }

        // Buscar equipos con dropdown (mejorado como equipos.js)
        function searchTeams(query = '', competitionFilter = '') {
            console.log('🔍 Buscando equipos:', { query, competitionFilter, totalTeams: allTeams.length });
            const searchInput = document.getElementById('team-search-input');
            const searchResults = document.getElementById('teams-search-results');
            
            if (!searchResults) {
                console.error('❌ No se encontró el elemento teams-search-results');
                return;
            }
            
            if (!allTeams.length) {
                searchResults.innerHTML = '<p class="search-prompt">⚠️ No hay equipos cargados</p>';
                return;
            }
            
            if (!query.trim() && !competitionFilter) {
                resetSearchState();
                return;
            }

            // Si la consulta es muy corta, mostrar dropdown con sugerencias
            if (query.trim() && query.trim().length < 3) {
                showSearchDropdown(query.trim());
                return;
            }

            let filteredTeams = allTeams.filter(team => {
                const matchesQuery = !query.trim() || 
                    team.name.toLowerCase().includes(query.toLowerCase());
                const matchesCompetition = !competitionFilter || 
                    team.competition === competitionFilter;
                return matchesQuery && matchesCompetition;
            });

            console.log(`📊 Equipos filtrados: ${filteredTeams.length}`);

            if (filteredTeams.length === 0) {
                searchResults.innerHTML = '<p class="search-prompt">No se encontraron equipos con esos criterios</p>';
                return;
            }

            // Paginación para mejor rendimiento
            const totalPages = Math.ceil(filteredTeams.length / teamsPerSearchPage);
            const startIndex = (currentSearchPage - 1) * teamsPerSearchPage;
            const endIndex = startIndex + teamsPerSearchPage;
            const teamsToShow = filteredTeams.slice(startIndex, endIndex);

            // Mostrar resultados con estadísticas
            let html = `
                <div class="search-results-header">
                    <h4>Resultados de búsqueda (${filteredTeams.length} equipos)</h4>
                </div>
                <div class="teams-grid-search">
                    ${teamsToShow.map(team => createTeamItemHTML(team, false)).join('')}
                </div>
            `;

            // Agregar paginación si es necesaria
            if (totalPages > 1) {
                html += createSearchPagination(totalPages);
            }

            searchResults.innerHTML = html;
            setupSearchPaginationListeners(filteredTeams);
            console.log(`✅ Mostrados ${teamsToShow.length} de ${filteredTeams.length} equipos`);
        }

        // Mostrar dropdown de búsqueda (como en equipos.js)
        function showSearchDropdown(query) {
            const searchResults = document.getElementById('teams-search-results');
            
            if (!query || query.length < 2) {
                resetSearchState();
                return;
            }

            const suggestions = allTeams
                .filter(team => team.name.toLowerCase().includes(query.toLowerCase()))
                .slice(0, 10);

            if (suggestions.length === 0) {
                searchResults.innerHTML = '<p class="search-prompt">Escribe al menos 3 caracteres para buscar</p>';
                return;
            }

            const html = `
                <div class="search-dropdown">
                    <div class="search-dropdown-header">Sugerencias:</div>
                    ${suggestions.map(team => `
                        <div class="search-dropdown-item" onclick="selectTeamFromDropdown('${team.name}', '${team.competition}')">
                            <img src="${team.logo || '../team_icon.png'}" alt="${team.name}" class="dropdown-team-logo" onerror="this.src='../team_icon.png'">
                            <div class="dropdown-team-info">
                                <div class="dropdown-team-name">${team.name}</div>
                                <div class="dropdown-team-competition">${formatCompetitionName(team.competition)}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;

            searchResults.innerHTML = html;
        }

        // Seleccionar equipo del dropdown
        function selectTeamFromDropdown(teamName, competition) {
            const searchInput = document.getElementById('team-search-input');
            const competitionFilter = document.getElementById('competition-filter');
            
            searchInput.value = teamName;
            competitionFilter.value = competition;
            
            // Buscar con los nuevos valores
            searchTeams(teamName, competition);
        }

        // Crear paginación para búsqueda
        function createSearchPagination(totalPages) {
            let html = '<div class="search-pagination">';
            
            // Botón anterior
            if (currentSearchPage > 1) {
                html += `<button class="search-page-btn" data-page="${currentSearchPage - 1}">&laquo;</button>`;
            }

            // Páginas
            const startPage = Math.max(1, currentSearchPage - 2);
            const endPage = Math.min(totalPages, currentSearchPage + 2);

            for (let i = startPage; i <= endPage; i++) {
                html += `<button class="search-page-btn${i === currentSearchPage ? ' active' : ''}" data-page="${i}">${i}</button>`;
            }

            // Botón siguiente
            if (currentSearchPage < totalPages) {
                html += `<button class="search-page-btn" data-page="${currentSearchPage + 1}">&raquo;</button>`;
            }

            html += '</div>';
            return html;
        }

        // Event listeners para paginación de búsqueda
        function setupSearchPaginationListeners(filteredTeams) {
            document.querySelectorAll('.search-page-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const page = parseInt(btn.dataset.page);
                    if (page !== currentSearchPage) {
                        currentSearchPage = page;
                        const searchInput = document.getElementById('team-search-input');
                        const competitionFilter = document.getElementById('competition-filter');
                        searchTeams(searchInput.value, competitionFilter.value);
                    }
                });
            });
        }

        // Restablecer estado de búsqueda
        function resetSearchState() {
            currentSearchPage = 1;
            const searchResults = document.getElementById('teams-search-results');
            if (searchResults) {
                searchResults.innerHTML = `<p class="search-prompt">Usa la barra de búsqueda para encontrar equipos (${allTeams.length} disponibles)</p>`;
            }
        }
        
        // Actualizar contador de equipos
        function updateTeamsCount() {
            const countElement = document.getElementById('teams-count');
            if (countElement && allTeams.length > 0) {
                const competitionsCount = new Set(allTeams.map(t => t.competition)).size;
                countElement.textContent = `(${allTeams.length} equipos, ${competitionsCount} competiciones)`;
                console.log('📊 Contador actualizado en UI');
            } else if (countElement) {
                countElement.textContent = '(Cargando...)';
            }
        }

        // Crear HTML para un equipo (mejorado con estadísticas)
        function createTeamItemHTML(team, isInFavorites = false) {
            const isFavorite = favoriteTeams.some(fav => fav.id === team.id && fav.competition === team.competition);
            const competitionName = formatCompetitionName(team.competition);
            
            // Mostrar estadísticas si están disponibles
            const statsHTML = team.avgPts ? `
                <div class="team-stats-compact">
                    <span class="stat-compact" title="Puntos por partido">PTS: ${team.avgPts}</span>
                    <span class="stat-compact" title="Diferencia por partido">+/-: ${team.avgPm}</span>
                    <span class="stat-compact" title="Partidos jugados">PJ: ${team.totalGames || 0}</span>
                </div>
            ` : '';
            
            return `
                <div class="team-item ${isFavorite ? 'is-favorite' : ''}" data-team-id="${team.id}" data-competition="${team.competition}">
                    <img src="${team.logo || '../team_icon.png'}" alt="${team.name}" class="team-logo" onerror="this.src='../team_icon.png'">
                    <div class="team-info">
                        <div class="team-name" title="${team.name}">${team.name}</div>
                        <div class="team-competition">${competitionName}</div>
                        ${statsHTML}
                    </div>
                    <div class="team-actions">
                        ${!isInFavorites ? `
                            <button class="favorite-btn ${isFavorite ? 'is-favorite' : ''}" onclick="toggleFavoriteTeam('${team.id}', '${team.competition}', '${team.name.replace(/'/g, "\\'")}', '${team.logo || '../team_icon.png'}')">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="${isFavorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                                    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"></polygon>
                                </svg>
                            </button>
                        ` : ''}
                        <a href="../team_profile.html?team_id=${team.id}" class="view-team-btn" title="Ver perfil del equipo">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="m9 18 6-6-6-6"/>
                            </svg>
                        </a>
                        ${isInFavorites ? `
                            <button class="remove-favorite" onclick="removeFavoriteTeam('${team.id}', '${team.competition}')" title="Quitar de favoritos">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }

        // Alternar equipo favorito
        function toggleFavoriteTeam(teamId, competition, teamName, teamLogo) {
            const existingIndex = favoriteTeams.findIndex(fav => fav.id === teamId && fav.competition === competition);
            
            if (existingIndex >= 0) {
                favoriteTeams.splice(existingIndex, 1);
            } else {
                favoriteTeams.push({
                    id: teamId,
                    name: teamName,
                    logo: teamLogo,
                    competition: competition
                });
            }
            
            localStorage.setItem('favoriteTeams', JSON.stringify(favoriteTeams));
            renderFavoriteTeams();
            
            // Actualizar la interfaz de búsqueda
            const searchInput = document.getElementById('team-search-input');
            const competitionFilter = document.getElementById('competition-filter');
            searchTeams(searchInput.value, competitionFilter.value);
        }

        // Remover equipo favorito
        function removeFavoriteTeam(teamId, competition) {
            const index = favoriteTeams.findIndex(fav => fav.id === teamId && fav.competition === competition);
            if (index >= 0) {
                favoriteTeams.splice(index, 1);
                localStorage.setItem('favoriteTeams', JSON.stringify(favoriteTeams));
                renderFavoriteTeams();
                
                // Actualizar la interfaz de búsqueda si está activa
                const searchInput = document.getElementById('team-search-input');
                const competitionFilter = document.getElementById('competition-filter');
                if (searchInput.value || competitionFilter.value) {
                    searchTeams(searchInput.value, competitionFilter.value);
                }
            }
        }

        // Renderizar equipos favoritos
        function renderFavoriteTeams() {
            console.log('💖 Renderizando equipos favoritos...');
            const container = document.getElementById('favorite-teams-list');
            
            if (!container) {
                console.error('❌ No se encontró el elemento favorite-teams-list');
                return;
            }
            
            console.log(`📋 Equipos favoritos: ${favoriteTeams.length}`);
            
            if (favoriteTeams.length === 0) {
                container.innerHTML = '<p class="no-favorites">No has agregado equipos favoritos aún</p>';
                console.log('✅ Mostrado mensaje de sin favoritos');
                return;
            }
            
            container.innerHTML = favoriteTeams.map(team => createTeamItemHTML(team, true)).join('');
            console.log(`✅ Renderizados ${favoriteTeams.length} equipos favoritos`);
        }

        // Event listeners
        function setupEventListeners() {
            console.log('🔧 Configurando event listeners...');
            
            const searchInput = document.getElementById('team-search-input');
            const competitionFilter = document.getElementById('competition-filter');
            
            if (searchInput) {
                console.log('✅ Event listener agregado para búsqueda');
                searchInput.addEventListener('input', function(e) {
                    clearTimeout(searchTimeout);
                    searchTimeout = setTimeout(() => {
                        console.log('🔍 Buscando equipos:', e.target.value);
                        currentSearchPage = 1; // Reset página al cambiar búsqueda
                        searchTeams(e.target.value, competitionFilter?.value || '');
                    }, 300);
                });
            } else {
                console.error('❌ No se encontró el elemento team-search-input');
            }
            
            if (competitionFilter) {
                console.log('✅ Event listener agregado para filtro');
                competitionFilter.addEventListener('change', function(e) {
                    console.log('🏁 Filtro cambiado:', e.target.value);
                    currentSearchPage = 1; // Reset página al cambiar filtro
                    searchTeams(searchInput?.value || '', e.target.value);
                });
            } else {
                console.error('❌ No se encontró el elemento competition-filter');
            }
        }
        
        // Ejecutar cuando el DOM esté listo
        document.addEventListener('DOMContentLoaded', function() {
            console.log('📄 DOM cargado, configurando listeners...');
            setupEventListeners();
        });

        // Mostrar estado de carga inicial
        function showLoadingState() {
            console.log('⏳ Mostrando estado de carga...');
            const searchResults = document.getElementById('teams-search-results');
            const favoritesList = document.getElementById('favorite-teams-list');
            
            if (searchResults) {
                searchResults.innerHTML = '<div class="loading-spinner">⏳ Cargando equipos...</div>';
                console.log('✅ Estado de carga mostrado en búsqueda');
            } else {
                console.warn('⚠️ No se encontró teams-search-results');
            }
            
            if (favoritesList) {
                favoritesList.innerHTML = '<div class="loading-spinner">⏳ Cargando favoritos...</div>';
                console.log('✅ Estado de carga mostrado en favoritos');
            } else {
                console.warn('⚠️ No se encontró favorite-teams-list');
            }
        }

        // Inicializar cuando se active la pestaña de equipos
        function initializeTeamsTab() {
            console.log('🏀 Inicializando pestaña de equipos...');
            showLoadingState();
            setupEventListeners();
            loadTeamsData();
        }

        // Cargar datos cuando se carga la página
        console.log('🚀 Iniciando aplicación...');
        
        // Si ya estamos en la pestaña de equipos, inicializar inmediatamente
        setTimeout(() => {
            const equiposTab = document.querySelector('[data-tab="equipos"]');
            if (equiposTab && equiposTab.classList.contains('active')) {
                console.log('🏀 Pestaña equipos ya activa, inicializando...');
                initializeTeamsTab();
            } else {
                console.log('📋 Pestaña equipos no activa, esperando...');
                loadTeamsData(); // Cargar datos de fondo de todas formas
            }
        }, 100);

        // Hacer las funciones globales para que funcionen con onclick
        window.toggleFavoriteTeam = toggleFavoriteTeam;
        window.removeFavoriteTeam = removeFavoriteTeam;
        window.selectTeamFromDropdown = selectTeamFromDropdown;