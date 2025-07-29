// --- NUEVO: Cargar datos dinámicamente desde all_competitions_info.json ---
let dynamicResultadosData = {};
let dynamicJornadasPorGrupo = {};
let dynamicClasificacionData = {};
let currentCompetition = "C ESP CLUBES CAD MASC"; // Variable global para la competición actual

async function cargarResultadosDinamicos() {
    try {
        const response = await fetch('Clasificacion/all_competitions_info.json');
        const data = await response.json();
        const partidos = data[currentCompetition];
        if (!partidos) {
            console.log(`No se encontraron partidos para ${currentCompetition}`);
            return;
        }

        // 1. Obtener todas las fechas únicas ordenadas
        const fechas = Array.from(new Set(partidos.map(p => p.datetime.split(' - ')[0].trim()))).sort();
        // 2. Mapear fecha a jornada (jornada 1 = primer día, etc)
        const fechaAJornada = {};
        fechas.forEach((fecha, idx) => { fechaAJornada[fecha] = (idx + 1).toString(); });

        // 3. Agrupar partidos por grupo y jornada
        dynamicResultadosData = {};
        dynamicJornadasPorGrupo = {};
        
        for (const partido of partidos) {
            const grupo = partido.ronda;
            // Solo letras A-H son fase de grupos
            if (!/^[A-H]$/.test(grupo)) continue;
            
            const fecha = partido.datetime.split(' - ')[0].trim();
            const hora = partido.datetime.split(' - ')[1]?.trim() || '';
            const jornada = fechaAJornada[fecha];
            
            if (!dynamicResultadosData[grupo]) dynamicResultadosData[grupo] = {};
            if (!dynamicResultadosData[grupo][jornada]) dynamicResultadosData[grupo][jornada] = [];
            
            dynamicResultadosData[grupo][jornada].push({
                equipos: {
                    local: partido.team_a.name.trim(),
                    visitante: partido.team_b.name.trim(),
                    localLogo: partido.team_a.logo,
                    visitanteLogo: partido.team_b.logo
                },
                resultado: `${partido.team_a.score} - ${partido.team_b.score}`,
                fecha: fecha,
                hora: hora,
                // Datos adicionales para calcular clasificación
                team_a: partido.team_a.name.trim(),
                team_b: partido.team_b.name.trim(),
                score_a: parseInt(partido.team_a.score),
                score_b: parseInt(partido.team_b.score),
                jornada: jornada,
                // NUEVO: IDs para enlaces
                match_id: partido.match_id,
                team_a_id: partido.team_a.id,
                team_b_id: partido.team_b.id
            });
            
            // Guardar jornadas disponibles por grupo
            if (!dynamicJornadasPorGrupo[grupo]) dynamicJornadasPorGrupo[grupo] = new Set();
            dynamicJornadasPorGrupo[grupo].add(jornada);
        }
        
        // Convertir sets a arrays ordenados
        for (const grupo in dynamicJornadasPorGrupo) {
            dynamicJornadasPorGrupo[grupo] = Array.from(dynamicJornadasPorGrupo[grupo]).sort((a,b)=>a-b);
        }
        
        // 4. Calcular clasificaciones por grupo y jornada
        calcularClasificaciones();
        
        console.log('Datos cargados:', dynamicResultadosData);
        console.log('Jornadas por grupo:', dynamicJornadasPorGrupo);
        console.log('Clasificaciones:', dynamicClasificacionData);
    } catch (error) {
        console.error('Error cargando datos:', error);
    }
}

function calcularClasificaciones() {
    dynamicClasificacionData = {};
    
    Object.keys(dynamicResultadosData).forEach(grupo => {
        dynamicClasificacionData[grupo] = {};
        const jornadas = Object.keys(dynamicResultadosData[grupo]).sort((a,b) => a-b);
        
        // Calcular para cada jornada acumulativa
        jornadas.forEach(jornadaActual => {
            const equipos = {};
            
            // Recopilar todos los partidos hasta esta jornada
            const partidosHastaJornada = [];
            jornadas.forEach(j => {
                if (parseInt(j) <= parseInt(jornadaActual)) {
                    partidosHastaJornada.push(...dynamicResultadosData[grupo][j]);
                }
            });
            
            // Inicializar equipos
            partidosHastaJornada.forEach(partido => {
                if (!equipos[partido.team_a]) {
                    equipos[partido.team_a] = {
                        nombre: partido.team_a,
                        pj: 0, pg: 0, pp: 0, pf: 0, pc: 0,
                        partidos: [], logo: partido.equipos.localLogo,
                        team_id: partido.team_a_id
                    };
                }
                if (!equipos[partido.team_b]) {
                    equipos[partido.team_b] = {
                        nombre: partido.team_b,
                        pj: 0, pg: 0, pp: 0, pf: 0, pc: 0,
                        partidos: [], logo: partido.equipos.visitanteLogo,
                        team_id: partido.team_b_id
                    };
                }
            });
            
            // Procesar partidos
            partidosHastaJornada.forEach(partido => {
                const equipoA = equipos[partido.team_a];
                const equipoB = equipos[partido.team_b];
                
                equipoA.pj++;
                equipoB.pj++;
                equipoA.pf += partido.score_a;
                equipoA.pc += partido.score_b;
                equipoB.pf += partido.score_b;
                equipoB.pc += partido.score_a;
                
                if (partido.score_a > partido.score_b) {
                    equipoA.pg++;
                    equipoB.pp++;
                    equipoA.partidos.push('G');
                    equipoB.partidos.push('P');
                } else {
                    equipoB.pg++;
                    equipoA.pp++;
                    equipoA.partidos.push('P');
                    equipoB.partidos.push('G');
                }
            });
            
            // Convertir a array y ordenar
            const clasificacion = Object.values(equipos).map((equipo, index) => {
                const pt = equipo.pf - equipo.pc;
                // Solo mostrar los partidos realmente jugados (sin rellenar hasta 5)
                const ultimosPartidos = equipo.partidos.join('');
                const racha = calcularRacha(equipo.partidos);
                
                return {
                    pos: index + 1,
                    equipo: equipo.nombre,
                    pj: equipo.pj,
                    pg: equipo.pg,
                    pp: equipo.pp,
                    pf: equipo.pf,
                    pc: equipo.pc,
                    pt: pt >= 0 ? `+${pt}` : `${pt}`,
                    racha: racha,
                    ultimos5: ultimosPartidos, // Solo los partidos realmente jugados
                    playoff: true, // Los primeros 4 van a playoff
                    logo: equipo.logo,
                    team_id: equipo.team_id
                };
            });
            
            // Ordenar por: 1) Victorias, 2) Diferencia de puntos, 3) Puntos a favor
            clasificacion.sort((a, b) => {
                if (b.pg !== a.pg) return b.pg - a.pg;
                const ptA = parseInt(a.pt.replace('+', ''));
                const ptB = parseInt(b.pt.replace('+', ''));
                if (ptB !== ptA) return ptB - ptA;
                return b.pf - a.pf;
            });
            
            // Actualizar posiciones y playoff status
            clasificacion.forEach((equipo, index) => {
                equipo.pos = index + 1;
                equipo.playoff = index < 4; // Primeros 4 van a playoff
            });
            
            dynamicClasificacionData[grupo][jornadaActual] = clasificacion;
        });
        
        // Agregar "todas" como la última jornada
        const ultimaJornada = Math.max(...jornadas.map(j => parseInt(j))).toString();
        dynamicClasificacionData[grupo]['todas'] = dynamicClasificacionData[grupo][ultimaJornada];
    });
}

function calcularRacha(partidos) {
    if (partidos.length === 0) return '';
    
    const ultimo = partidos[partidos.length - 1];
    let contador = 1;
    
    for (let i = partidos.length - 2; i >= 0; i--) {
        if (partidos[i] === ultimo) {
            contador++;
        } else {
            break;
        }
    }
    
    return `${contador}${ultimo}`;
}

// --- NUEVO: Función para crear abreviaciones de 3 letras ---
function createTeamAbbreviation(teamName) {
    if (!teamName) return '';
    
    // Limpiar el nombre del equipo
    const cleanName = teamName.trim()
        .replace(/[^\w\s]/g, ' ') // Reemplazar caracteres especiales con espacios
        .replace(/\s+/g, ' ') // Normalizar espacios múltiples
        .toUpperCase();
    
    const words = cleanName.split(' ').filter(word => word.length > 0);
    
    if (words.length === 0) return '';
    
    let abbreviation = '';
    
    // Tomar las primeras 3 letras válidas de las primeras 3 palabras
    for (let i = 0; i < Math.min(3, words.length) && abbreviation.length < 3; i++) {
        const word = words[i];
        for (let j = 0; j < word.length && abbreviation.length < 3; j++) {
            const char = word[j];
            if (/[A-Z]/.test(char)) { // Solo letras válidas
                abbreviation += char;
            }
        }
    }
    
    // Si no tenemos 3 letras, completar con las primeras letras de la primera palabra
    if (abbreviation.length < 3 && words.length > 0) {
        const firstWord = words[0];
        for (let i = 0; i < firstWord.length && abbreviation.length < 3; i++) {
            const char = firstWord[i];
            if (/[A-Z]/.test(char) && !abbreviation.includes(char)) {
                abbreviation += char;
            }
        }
    }
    
    // Rellenar con las primeras letras disponibles si aún faltan
    if (abbreviation.length < 3 && words.length > 0) {
        const allChars = cleanName.replace(/\s/g, '');
        for (let i = 0; i < allChars.length && abbreviation.length < 3; i++) {
            const char = allChars[i];
            if (/[A-Z]/.test(char) && !abbreviation.includes(char)) {
                abbreviation += char;
            }
        }
    }
    
    return abbreviation.padEnd(3, abbreviation.charAt(0) || 'X').substring(0, 3);
}

// --- Función para crear puntos de últimos partidos (movida a scope global) ---
function createUltimos5Dots(ultimosText) {
        const container = document.createElement('div');
        container.className = 'racha-tooltip';
        
        const dotsContainer = document.createElement('div');
        dotsContainer.className = 'racha-dots';
        
    // Crear solo tantos puntos como partidos realmente jugados
    for (let i = 0; i < ultimosText.length; i++) {
            const dot = document.createElement('span');
        const resultado = ultimosText[i];
            const tipo = resultado === 'G' ? 'ganado' : 'perdido';
            dot.className = `racha-dot ${tipo}`;
            dotsContainer.appendChild(dot);
        }
        
        // Crear tooltip
        const tooltip = document.createElement('span');
        tooltip.className = 'tooltip-text';
    tooltip.textContent = ultimosText || 'Sin partidos';
        
        container.appendChild(dotsContainer);
        container.appendChild(tooltip);
        
        return container;
    }

// --- NUEVO: Configuración de competiciones y detección de tipo ---
const competitionConfig = {
    'C ESP CLUBES CAD MASC': {
        name: 'Clubes Cadete Masculino',
        type: 'groups_playoffs', // grupos + playoffs
        hasGroups: true,
        hasPlayoffs: true,
        bracketImage: 'Clasificacion/bracket-cadete-masc.svg'
    },
    'C ESP CLUBES CAD FEM': {
        name: 'Clubes Cadete Femenino',
        type: 'groups_playoffs',
        hasGroups: true,
        hasPlayoffs: true,
        bracketImage: 'Clasificacion/bracket-cadete-fem.svg'
    },
    'C ESP CLUBES INF MASC': {
        name: 'Clubes Infantil Masculino',
        type: 'groups_playoffs',
        hasGroups: true,
        hasPlayoffs: true,
        bracketImage: 'Clasificacion/bracket-cadete-masc.svg' // Usar el mismo por ahora
    },
    'C ESP CLUBES INF FEM': {
        name: 'Clubes Infantil Femenino',
        type: 'groups_playoffs',
        hasGroups: true,
        hasPlayoffs: true,
        bracketImage: 'Clasificacion/bracket-cadete-fem.svg' // Usar el mismo por ahora
    },
    'C ESP CLUBES MINI MASC': {
        name: 'Clubes Mini Masculino',
        type: 'groups_playoffs',
        hasGroups: true,
        hasPlayoffs: true,
        bracketImage: 'Clasificacion/bracket-cadete-masc.svg' // Usar el mismo por ahora
    },
    'C ESP CLUBES MINI FEM': {
        name: 'Clubes Mini Femenino',
        type: 'groups_playoffs',
        hasGroups: true,
        hasPlayoffs: true,
        bracketImage: 'Clasificacion/bracket-cadete-fem.svg' // Usar el mismo por ahora
    }
};

// Función para detectar automáticamente el tipo de competición
function detectCompetitionType(partidos, competitionName = '') {
    if (!partidos || partidos.length === 0) return 'league';
    
    // Detectar competiciones profesionales por nombre
    const professionalCompetitions = ['PRIMERA FEB', 'LF ENDESA'];
    if (professionalCompetitions.includes(competitionName || currentCompetition)) {
        return 'professional';
    }
    
    const rounds = new Set(partidos.map(p => p.ronda));
    const hasGroupRounds = Array.from(rounds).some(r => /^[A-H]$/.test(r));
    const hasPlayoffRounds = Array.from(rounds).some(r => 
        ['Final', '1/2 Final', '1/4 Final', '1/8 Final', '3º-4º', '5º-6º', '7º-8º'].includes(r)
    );
    
    if (hasGroupRounds && hasPlayoffRounds) {
        return 'groups_playoffs';
    } else if (hasGroupRounds) {
        return 'groups';
    } else if (hasPlayoffRounds) {
        return 'playoffs';
    } else {
        return 'league'; // Liga simple
    }
}

// Función para mostrar/ocultar secciones según el tipo de competición
function updateUIForCompetitionType(competitionType) {
    const faseGruposTab = document.querySelector('.clasificacion-tab[data-section="fase-grupos"]');
    const playoffTab = document.querySelector('.clasificacion-tab[data-section="playoff"]');
    const finalTab = document.querySelector('.clasificacion-tab[data-section="clasificacion-final"]');
    const gruposNav = document.getElementById('gruposNav');
    
    // Obtener elementos específicos para competiciones profesionales
    const body = document.body;
    const faseSelect = document.getElementById('faseSelect');
    const grupoFilterItem = document.getElementById('grupoFilterItem');
    const jornadaFilterItem = document.getElementById('jornadaFilterItem');
    const jornadaFilterProItem = document.getElementById('jornadaFilterProItem');
    
    // Por defecto, ocultar todo y quitar modo profesional
    if (faseGruposTab) faseGruposTab.style.display = 'none';
    if (playoffTab) playoffTab.style.display = 'none';
    if (finalTab) finalTab.style.display = 'none';
    if (gruposNav) gruposNav.style.display = 'none';
    body.classList.remove('professional-mode');
    
    // Mostrar todas las opciones por defecto
    if (faseSelect) {
        const allOptions = faseSelect.querySelectorAll('option');
        allOptions.forEach(option => {
            option.style.display = 'block';
        });
    }
    
    switch (competitionType) {
        case 'professional':
            // Activar modo profesional
            body.classList.add('professional-mode');
            
            // Ocultar opciones de clubes y mostrar profesionales
            if (faseSelect) {
                const clubOptions = faseSelect.querySelectorAll('.club-competition');
                const proOptions = faseSelect.querySelectorAll('.professional-competition');
                
                clubOptions.forEach(option => option.style.display = 'none');
                proOptions.forEach(option => option.style.display = 'block');
                
                // Seleccionar "Liga Regular" por defecto
                faseSelect.value = 'liga-regular';
            }
            
            // Ocultar selectores de grupo y jornada de clubes, mostrar jornada profesional
            if (grupoFilterItem) grupoFilterItem.style.display = 'none';
            if (jornadaFilterItem) jornadaFilterItem.style.display = 'none';
            if (jornadaFilterProItem) jornadaFilterProItem.style.display = 'flex';
            if (gruposNav) gruposNav.style.display = 'none';
            
            // Activar sección profesional por defecto
            showProfessionalSection('liga-regular');
            break;
            
        case 'groups_playoffs':
            // Mostrar todo para competiciones de clubes
            if (faseGruposTab) faseGruposTab.style.display = 'block';
            if (playoffTab) playoffTab.style.display = 'block';
            if (finalTab) finalTab.style.display = 'block';
            if (grupoFilterItem) grupoFilterItem.style.display = 'flex';
            if (jornadaFilterItem) jornadaFilterItem.style.display = 'flex';
            if (jornadaFilterProItem) jornadaFilterProItem.style.display = 'none';
            
            // Mostrar navegación de grupos
            if (gruposNav) {
                gruposNav.classList.add('active');
                gruposNav.style.display = 'block';
            }
            break;
            
        case 'groups':
            // Solo grupos + clasificación final
            if (faseGruposTab) faseGruposTab.style.display = 'block';
            if (finalTab) finalTab.style.display = 'block';
            if (grupoFilterItem) grupoFilterItem.style.display = 'flex';
            if (jornadaFilterItem) jornadaFilterItem.style.display = 'flex';
            if (jornadaFilterProItem) jornadaFilterProItem.style.display = 'none';
            
            // Mostrar navegación de grupos
            if (gruposNav) {
                gruposNav.classList.add('active');
                gruposNav.style.display = 'block';
            }
            break;
            
        case 'playoffs':
            // Solo playoffs
            if (playoffTab) playoffTab.style.display = 'block';
            if (finalTab) finalTab.style.display = 'block';
            if (jornadaFilterProItem) jornadaFilterProItem.style.display = 'none';
            break;
            
        case 'league':
            // Solo tabla de liga - crear una nueva sección si no existe
            if (jornadaFilterProItem) jornadaFilterProItem.style.display = 'none';
            createLeagueTable();
            break;
    }
}

// Función para crear tabla de liga simple
function createLeagueTable() {
    // Verificar si ya existe la sección de liga
    let leagueSection = document.getElementById('content-league');
    
    if (!leagueSection) {
        // Crear nueva sección para liga
        leagueSection = document.createElement('div');
        leagueSection.id = 'content-league';
        leagueSection.className = 'content-section active';
        leagueSection.innerHTML = `
            <h2>Clasificación de Liga</h2>
            <div class="table-container">
                <table class="clasificacion-table" id="leagueTable">
                    <thead>
                        <tr>
                            <th data-sort="pos">Pos</th>
                            <th data-sort="equipo">Equipo</th>
                            <th data-sort="pj">PJ</th>
                            <th data-sort="pg">PG</th>
                            <th data-sort="pp">PP</th>
                            <th data-sort="pf">PF</th>
                            <th data-sort="pc">PC</th>
                            <th data-sort="pt">PT</th>
                            <th data-sort="racha">Racha</th>
                            <th data-sort="ultimos5">Últimos</th>
                        </tr>
                    </thead>
                    <tbody>
                    </tbody>
                </table>
            </div>
        `;
        
        // Insertar después del contenido existente
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.appendChild(leagueSection);
        }
    }
    
    // Mostrar solo esta sección
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    leagueSection.classList.add('active');
    
    // Ocultar tabs de navegación
    const tabs = document.querySelectorAll('.clasificacion-tab');
    tabs.forEach(tab => tab.style.display = 'none');
}

// Función para mostrar secciones profesionales
function showProfessionalSection(sectionName) {
    // Ocultar todas las secciones
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
        section.style.display = 'none';
    });
    
    // Mostrar la sección seleccionada
    const targetSection = document.getElementById(`content-${sectionName}`);
    if (targetSection) {
        targetSection.classList.add('active');
        targetSection.style.display = 'block';
        
        // Cargar datos según la sección
        if (sectionName === 'liga-regular') {
            loadProfessionalLeagueData();
        } else if (sectionName === 'clasificacion-final-pro') {
            loadProfessionalFinalClassification();
        }
    }
}

// Función para cargar datos de liga profesional
async function loadProfessionalLeagueData() {
    try {
        const response = await fetch('Clasificacion/all_competitions_info.json');
        const data = await response.json();
        const partidos = data[currentCompetition];
        
        if (!partidos || partidos.length === 0) {
            console.log(`No se encontraron partidos para ${currentCompetition}`);
            return;
        }

        // Identificar y poblar las jornadas
        populateProfessionalJornadas(partidos);
        
        // Calcular clasificación de liga profesional
        const clasificacion = calcularClasificacionProfesional(partidos);
        
        // Actualizar tabla de liga regular
        updateLigaRegularTable(clasificacion);
        
        // Actualizar tabla de resultados (todas las jornadas por defecto)
        updateResultadosProfesionalesTable(partidos);
        
    } catch (error) {
        console.error('Error cargando datos profesionales:', error);
        const ligaRegularTable = document.getElementById('ligaRegularTable');
        if (ligaRegularTable) {
            const tbody = ligaRegularTable.querySelector('tbody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="11" style="text-align: center; padding: 20px; color: #ff6b6b;">
                            Error al cargar datos de ${currentCompetition}
                        </td>
                    </tr>
                `;
            }
        }
    }
}

// Función para calcular clasificación profesional
function calcularClasificacionProfesional(partidos) {
    const equipos = {};
    
    // Inicializar estadísticas para todos los equipos
    partidos.forEach(partido => {
        const teamA = partido.team_a.name.trim();
        const teamB = partido.team_b.name.trim();
        
        if (!equipos[teamA]) {
            equipos[teamA] = {
                nombre: teamA,
                logo: partido.team_a.logo,
                id: partido.team_a.id,
                pj: 0, pg: 0, pp: 0, pf: 0, pc: 0, pts: 0,
                rachaActual: '', ultimos: []
            };
        }
        
        if (!equipos[teamB]) {
            equipos[teamB] = {
                nombre: teamB,
                logo: partido.team_b.logo,
                id: partido.team_b.id,
                pj: 0, pg: 0, pp: 0, pf: 0, pc: 0, pts: 0,
                rachaActual: '', ultimos: []
            };
        }
    });
    
    // Procesar cada partido
    partidos.forEach(partido => {
        const teamA = partido.team_a.name.trim();
        const teamB = partido.team_b.name.trim();
        const scoreA = parseInt(partido.team_a.score);
        const scoreB = parseInt(partido.team_b.score);
        
        // Solo procesar partidos con resultados válidos
        if (isNaN(scoreA) || isNaN(scoreB)) return;
        
        // Actualizar estadísticas del equipo A
        equipos[teamA].pj++;
        equipos[teamA].pf += scoreA;
        equipos[teamA].pc += scoreB;
        
        // Actualizar estadísticas del equipo B
        equipos[teamB].pj++;
        equipos[teamB].pf += scoreB;
        equipos[teamB].pc += scoreA;
        
        // Determinar ganador y asignar puntos (sistema profesional: Victoria=2pts, Derrota=1pt)
        if (scoreA > scoreB) {
            // Equipo A gana
            equipos[teamA].pg++;
            equipos[teamA].pts += 2;
            equipos[teamA].ultimos.push('V');
            
            equipos[teamB].pp++;
            equipos[teamB].pts += 1;
            equipos[teamB].ultimos.push('D');
        } else {
            // Equipo B gana
            equipos[teamB].pg++;
            equipos[teamB].pts += 2;
            equipos[teamB].ultimos.push('V');
            
            equipos[teamA].pp++;
            equipos[teamA].pts += 1;
            equipos[teamA].ultimos.push('D');
        }
    });
    
    // Mantener solo los últimos 5 resultados
    Object.values(equipos).forEach(equipo => {
        if (equipo.ultimos.length > 5) {
            equipo.ultimos = equipo.ultimos.slice(-5);
        }
        
        // Calcular racha actual
        if (equipo.ultimos.length > 0) {
            const ultimoResultado = equipo.ultimos[equipo.ultimos.length - 1];
            let racha = 1;
            for (let i = equipo.ultimos.length - 2; i >= 0; i--) {
                if (equipo.ultimos[i] === ultimoResultado) {
                    racha++;
                } else {
                    break;
                }
            }
            equipo.rachaActual = `${racha}${ultimoResultado}`;
        }
        
        // Calcular diferencia de puntos
        equipo.diferencia = equipo.pf - equipo.pc;
    });
    
    // Convertir a array y ordenar por puntos, luego por diferencia
    const clasificacionArray = Object.values(equipos).sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.diferencia !== a.diferencia) return b.diferencia - a.diferencia;
        return b.pf - a.pf; // En caso de empate, por puntos a favor
    });
    
    return clasificacionArray;
}

// Función para actualizar la tabla de liga regular
function updateLigaRegularTable(clasificacion) {
    const ligaRegularTable = document.getElementById('ligaRegularTable');
    if (!ligaRegularTable) return;
    
    const tbody = ligaRegularTable.querySelector('tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    clasificacion.forEach((equipo, index) => {
        const posicion = index + 1;
        let posicionClass = '';
        
        // Determinar clase de posición según la competición
        if (currentCompetition === 'PRIMERA FEB') {
            // Primeros 8 clasifican a playoffs
            if (posicion <= 8) posicionClass = 'playoff-position';
            else posicionClass = 'elimination-position';
        } else if (currentCompetition === 'LF ENDESA') {
            // Primeros 8 clasifican a playoffs
            if (posicion <= 8) posicionClass = 'playoff-position';
            else posicionClass = 'elimination-position';
        }
        
        const row = document.createElement('tr');
        row.className = posicionClass;
        
        // Columna de posición
        const posCell = document.createElement('td');
        posCell.textContent = posicion;
        row.appendChild(posCell);
        
        // Columna de equipo (usando la misma estructura que las tablas de clubes)
        const equipoCell = document.createElement('td');
        
        // Crear enlace al equipo
        const teamLink = document.createElement('a');
        teamLink.href = `team_profile.html?team_id=${equipo.id}`;
        teamLink.className = 'team-link';
        teamLink.style.textDecoration = 'none';
        teamLink.style.color = 'inherit';
        
        const teamContainer = document.createElement('div');
        teamContainer.className = 'team-container';
        teamContainer.title = equipo.nombre; // Tooltip con nombre completo
        
        if (equipo.logo) {
            const teamLogo = document.createElement('img');
            teamLogo.src = equipo.logo;
            teamLogo.alt = `Logo ${equipo.nombre}`;
            teamLogo.className = 'team-logo';
            teamLogo.onerror = function() { this.src = 'team_icon.png'; };
            teamContainer.appendChild(teamLogo);
        }
        
        const teamName = document.createElement('span');
        teamName.textContent = createTeamAbbreviation(equipo.nombre);
        teamName.className = 'team-name';
        
        teamContainer.appendChild(teamName);
        teamLink.appendChild(teamContainer);
        equipoCell.appendChild(teamLink);
        row.appendChild(equipoCell);
        
        // Resto de columnas
        const columns = [equipo.pj, equipo.pg, equipo.pp, equipo.pts, equipo.pf, equipo.pc, equipo.diferencia, equipo.rachaActual];
        columns.forEach((value, index) => {
            const td = document.createElement('td');
            
            // Aplicar clases específicas según la columna
            if (index === 3) { // Columna de puntos
                td.className = 'points-column';
            } else if (index === 6) { // Columna de diferencia
                td.className = value >= 0 ? 'positive' : 'negative';
                value = value > 0 ? `+${value}` : value;
            }
            
            td.textContent = value;
            row.appendChild(td);
        });
        
        // Columna de últimos partidos
        const ultimosCell = document.createElement('td');
        const ultimosContainer = document.createElement('div');
        ultimosContainer.className = 'ultimos-partidos';
        
        equipo.ultimos.forEach(resultado => {
            const badge = document.createElement('span');
            badge.className = `resultado-badge ${resultado === 'V' ? 'victoria' : 'derrota'}`;
            badge.textContent = resultado;
            ultimosContainer.appendChild(badge);
        });
        
        ultimosCell.appendChild(ultimosContainer);
        row.appendChild(ultimosCell);
        
        tbody.appendChild(row);
    });
}

// Función para actualizar tabla de resultados profesionales
function updateResultadosProfesionalesTable(partidos) {
    const resultadosTable = document.getElementById('resultadosProTable');
    if (!resultadosTable) return;
    
    const tbody = resultadosTable.querySelector('tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    // Determinar si estamos filtrando por jornada específica
    const jornadaSelect = document.getElementById('jornadaFilterPro');
    const isFiltering = jornadaSelect && jornadaSelect.value !== 'todas';
    
    // Si estamos filtrando por jornada específica, mostrar todos los partidos de esa jornada
    // Si no, mostrar los últimos 15 partidos más recientes
    const partidosAMostrar = isFiltering 
        ? partidos.sort((a, b) => {
            // Para jornada específica, ordenar por hora del mismo día
            const horaA = a.datetime.split(' - ')[1] || '00:00';
            const horaB = b.datetime.split(' - ')[1] || '00:00';
            return horaA.localeCompare(horaB);
          })
        : partidos
            .sort((a, b) => {
                // Para todas las jornadas, ordenar por fecha más reciente
                const fechaA = a.datetime.split(' - ')[0];
                const fechaB = b.datetime.split(' - ')[0];
                const [dayA, monthA, yearA] = fechaA.split('-');
                const [dayB, monthB, yearB] = fechaB.split('-');
                const dateA = new Date(yearA, monthA - 1, dayA);
                const dateB = new Date(yearB, monthB - 1, dayB);
                return dateB - dateA;
            })
                         .slice(0, 15); // Mostrar últimos 15 partidos
    
    // Verificar si hay partidos para mostrar
    if (partidosAMostrar.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 4;
        cell.style.textAlign = 'center';
        cell.style.padding = '20px';
        cell.style.color = '#6b7280';
        cell.textContent = 'No hay partidos disponibles para esta jornada';
        row.appendChild(cell);
        tbody.appendChild(row);
        return;
    }
    
    partidosAMostrar.forEach(partido => {
        const fecha = partido.datetime.split(' - ')[0];
        const hora = partido.datetime.split(' - ')[1] || '';
        const scoreA = parseInt(partido.team_a.score);
        const scoreB = parseInt(partido.team_b.score);
        
        const row = document.createElement('tr');
        
        // Columna de Partido (usando el mismo estilo que las tablas de clubes)
        const partidoCell = document.createElement('td');
        partidoCell.className = 'partido';
        
        // Crear enlace al partido
        const partidoLink = document.createElement('a');
        partidoLink.href = `ficha.html?gameId=${partido.match_id}`;
        partidoLink.className = 'partido-link';
        partidoLink.style.textDecoration = 'none';
        partidoLink.style.color = 'inherit';
        
        // Crear contenedor para el partido
        const partidoContainer = document.createElement('div');
        partidoContainer.className = 'partido-container';
        
        // Determinar quién ganó
        const localGano = scoreA > scoreB;
        const visitanteGano = scoreB > scoreA;
        
        // Equipo local
        const equipoLocal = document.createElement('div');
        equipoLocal.className = 'equipo-partido local';
        equipoLocal.title = partido.team_a.name; // Tooltip con nombre completo
        
        if (partido.team_a.logo) {
            const localLogo = document.createElement('img');
            localLogo.src = partido.team_a.logo;
            localLogo.alt = `Logo ${partido.team_a.name}`;
            localLogo.className = 'team-logo-small';
            localLogo.onerror = function() { this.src = 'team_icon.png'; };
            equipoLocal.appendChild(localLogo);
        }
        
        const localName = document.createElement('span');
        localName.textContent = createTeamAbbreviation(partido.team_a.name);
        localName.className = 'team-name-partido';
        equipoLocal.appendChild(localName);
        
        // Score del equipo local
        const scoreLocalSpan = document.createElement('span');
        scoreLocalSpan.textContent = scoreA;
        scoreLocalSpan.className = `score-team ${localGano ? 'winner' : 'loser'}`;
        equipoLocal.appendChild(scoreLocalSpan);
        
        // Separador
        const separador = document.createElement('span');
        separador.textContent = ' - ';
        separador.className = 'score-separator';
        
        // Score del equipo visitante  
        const scoreVisitanteSpan = document.createElement('span');
        scoreVisitanteSpan.textContent = scoreB;
        scoreVisitanteSpan.className = `score-team ${visitanteGano ? 'winner' : 'loser'}`;
        
        // Equipo visitante
        const equipoVisitante = document.createElement('div');
        equipoVisitante.className = 'equipo-partido visitante';
        equipoVisitante.title = partido.team_b.name; // Tooltip con nombre completo
        
        equipoVisitante.appendChild(scoreVisitanteSpan);
        
        if (partido.team_b.logo) {
            const visitanteLogo = document.createElement('img');
            visitanteLogo.src = partido.team_b.logo;
            visitanteLogo.alt = `Logo ${partido.team_b.name}`;
            visitanteLogo.className = 'team-logo-small';
            visitanteLogo.onerror = function() { this.src = 'team_icon.png'; };
            equipoVisitante.appendChild(visitanteLogo);
        }
        
        const visitanteName = document.createElement('span');
        visitanteName.textContent = createTeamAbbreviation(partido.team_b.name);
        visitanteName.className = 'team-name-partido';
        equipoVisitante.appendChild(visitanteName);
        
        // Ensamblar el contenedor del partido en una sola línea
        partidoContainer.appendChild(equipoLocal);
        partidoContainer.appendChild(separador);
        partidoContainer.appendChild(equipoVisitante);
        
        partidoLink.appendChild(partidoContainer);
        partidoCell.appendChild(partidoLink);
        row.appendChild(partidoCell);
        
        // Columna de fecha
        const fechaCell = document.createElement('td');
        fechaCell.textContent = fecha;
        row.appendChild(fechaCell);
        
        // Columna de hora
        const horaCell = document.createElement('td');
        horaCell.textContent = hora;
        row.appendChild(horaCell);
        
        // Columna de estado (opcional para profesionales)
        if (resultadosTable.querySelector('th[title*="Estado"]')) {
            const estadoCell = document.createElement('td');
            const estadoBadge = document.createElement('span');
            estadoBadge.className = 'estado-badge finalizado';
            estadoBadge.textContent = 'Finalizado';
            estadoCell.appendChild(estadoBadge);
            row.appendChild(estadoCell);
        }
        
        tbody.appendChild(row);
    });
}

// Función para identificar y poblar las jornadas profesionales
function populateProfessionalJornadas(partidos) {
    const jornadaSelect = document.getElementById('jornadaFilterPro');
    if (!jornadaSelect) return;
    
    // Extraer fechas únicas y ordenarlas
    const fechasUnicas = [...new Set(partidos.map(p => {
        const fecha = p.datetime.split(' - ')[0].trim();
        return fecha;
    }))].sort((a, b) => {
        // Convertir fechas DD-MM-YYYY a objetos Date para ordenar correctamente
        const [dayA, monthA, yearA] = a.split('-');
        const [dayB, monthB, yearB] = b.split('-');
        const dateA = new Date(yearA, monthA - 1, dayA);
        const dateB = new Date(yearB, monthB - 1, dayB);
        return dateA - dateB;
    });
    
    // Crear mapeo de fecha a jornada
    const fechaAJornada = {};
    fechasUnicas.forEach((fecha, index) => {
        fechaAJornada[fecha] = index + 1;
    });
    
    // Limpiar selector actual y repoblar
    jornadaSelect.innerHTML = '';
    
    // Opción para todas las jornadas
    const todasOption = document.createElement('option');
    todasOption.value = 'todas';
    todasOption.textContent = 'Todas las jornadas';
    todasOption.selected = true;
    jornadaSelect.appendChild(todasOption);
    
    // Añadir cada jornada
    fechasUnicas.forEach((fecha, index) => {
        const jornada = index + 1;
        const option = document.createElement('option');
        option.value = jornada.toString();
        option.textContent = `Jornada ${jornada} (${fecha})`;
        jornadaSelect.appendChild(option);
    });
    
    // El selector mantendrá el comportamiento de dropdown normal,
    // el scroll se activa automáticamente con los estilos CSS cuando hay muchas opciones
    
    // Guardar mapeo para uso posterior
    window.professionalJornadaMap = fechaAJornada;
    window.professionalMatches = partidos;
    
    console.log(`Identificadas ${fechasUnicas.length} jornadas para ${currentCompetition}:`, fechaAJornada);
}

// Función para filtrar los resultados por jornada
function filterProfessionalResultsByJornada(jornadaSeleccionada) {
    if (!window.professionalMatches || !window.professionalJornadaMap) return;
    
    let partidosFiltrados;
    
    if (jornadaSeleccionada === 'todas') {
        partidosFiltrados = window.professionalMatches;
    } else {
        // Encontrar la fecha correspondiente a la jornada seleccionada
        const fechaJornada = Object.keys(window.professionalJornadaMap).find(fecha => 
            window.professionalJornadaMap[fecha].toString() === jornadaSeleccionada
        );
        
        if (fechaJornada) {
            partidosFiltrados = window.professionalMatches.filter(partido => {
                const fechaPartido = partido.datetime.split(' - ')[0].trim();
                return fechaPartido === fechaJornada;
            });
        } else {
            partidosFiltrados = [];
        }
    }
    
    // Actualizar tabla de resultados
    updateResultadosProfesionalesTable(partidosFiltrados);
    
    // Actualizar título de la sección
    const tituloResultados = document.querySelector('#content-liga-regular .resultados-jornada-h3');
    if (tituloResultados) {
        if (jornadaSeleccionada === 'todas') {
            tituloResultados.textContent = 'Resultados - Todas las jornadas';
        } else {
            tituloResultados.textContent = `Resultados - Jornada ${jornadaSeleccionada}`;
        }
    }
}

// Función para cargar clasificación final profesional
async function loadProfessionalFinalClassification() {
    try {
        const response = await fetch('Clasificacion/all_competitions_info.json');
        const data = await response.json();
        const partidos = data[currentCompetition];
        
        if (!partidos || partidos.length === 0) {
            console.log(`No se encontraron partidos para ${currentCompetition}`);
            return;
        }

        // Calcular clasificación de liga profesional
        const clasificacion = calcularClasificacionProfesional(partidos);
        
        // Actualizar tabla de clasificación final profesional
        updateFinalProTable(clasificacion);
        
    } catch (error) {
        console.error('Error cargando clasificación final profesional:', error);
        const finalProTable = document.getElementById('finalProTable');
        if (finalProTable) {
            const tbody = finalProTable.querySelector('tbody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="10" style="text-align: center; padding: 20px; color: #ff6b6b;">
                            Error al cargar clasificación final de ${currentCompetition}
                        </td>
                    </tr>
                `;
            }
        }
    }
}

// Función para actualizar la tabla de clasificación final profesional
function updateFinalProTable(clasificacion) {
    const finalProTable = document.getElementById('finalProTable');
    if (!finalProTable) return;
    
    const tbody = finalProTable.querySelector('tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    clasificacion.forEach((equipo, index) => {
        const posicion = index + 1;
        const row = document.createElement('tr');
        
        // Determinar si obtuvieron medalla o logros especiales
        let logros = '';
        if (posicion === 1) logros = '🏆 Campeón';
        else if (posicion === 2) logros = '🥈 Subcampeón';
        else if (posicion === 3) logros = '🥉 Tercer puesto';
        else if (posicion <= 8) logros = 'Playoffs';
        
        // Columna de posición
        const posCell = document.createElement('td');
        posCell.textContent = posicion;
        posCell.className = 'posicion-final';
        row.appendChild(posCell);
        
        // Columna de equipo (usando la misma estructura que las otras tablas)
        const equipoCell = document.createElement('td');
        
        // Crear enlace al equipo
        const teamLink = document.createElement('a');
        teamLink.href = `team_profile.html?team_id=${equipo.id}`;
        teamLink.className = 'team-link';
        teamLink.style.textDecoration = 'none';
        teamLink.style.color = 'inherit';
        
        const teamContainer = document.createElement('div');
        teamContainer.className = 'team-container';
        teamContainer.title = equipo.nombre; // Tooltip con nombre completo
        
        if (equipo.logo) {
            const teamLogo = document.createElement('img');
            teamLogo.src = equipo.logo;
            teamLogo.alt = `Logo ${equipo.nombre}`;
            teamLogo.className = 'team-logo';
            teamLogo.onerror = function() { this.src = 'team_icon.png'; };
            teamContainer.appendChild(teamLogo);
        }
        
        const teamName = document.createElement('span');
        teamName.textContent = createTeamAbbreviation(equipo.nombre);
        teamName.className = 'team-name';
        
        teamContainer.appendChild(teamName);
        teamLink.appendChild(teamContainer);
        equipoCell.appendChild(teamLink);
        row.appendChild(equipoCell);
        
        // Resto de columnas (PJ, PG, PP, Pts, PF, PC, Dif, Logros)
        const columns = [equipo.pj, equipo.pg, equipo.pp, equipo.pts, equipo.pf, equipo.pc, equipo.diferencia, logros];
        columns.forEach((value, index) => {
            const td = document.createElement('td');
            
            // Aplicar clases específicas según la columna
            if (index === 3) { // Columna de puntos
                td.className = 'points-column';
            } else if (index === 6) { // Columna de diferencia
                td.className = value >= 0 ? 'positive' : 'negative';
                value = value > 0 ? `+${value}` : value;
            } else if (index === 7) { // Columna de logros
                td.className = 'logros-column';
                if (value.includes('🏆')) td.style.fontWeight = 'bold';
            }
            
            td.textContent = value;
            row.appendChild(td);
        });
        
        tbody.appendChild(row);
    });
}

// --- NUEVO: Función para calcular clasificación final ---
let finalClassificationData = [];

async function calcularClasificacionFinal() {
    try {
        const response = await fetch('Clasificacion/all_competitions_info.json');
        const data = await response.json();
        const partidos = data[currentCompetition];
        if (!partidos) {
            console.log(`No se encontraron partidos para ${currentCompetition}`);
            return;
        }

        // Filtrar solo partidos de playoff final
        const playoffMatches = partidos.filter(p => 
            p.ronda === "Final" || 
            p.ronda === "3º-4º" || 
            p.ronda === "5º-6º" || 
            p.ronda === "7º-8º"
        );

        // Obtener estadísticas completas del torneo para todos los equipos
        const tournamentStats = {};
        
        // Procesar todos los partidos del torneo (grupos + playoff)
        partidos.forEach(partido => {
            const teamA = partido.team_a.name.trim();
            const teamB = partido.team_b.name.trim();
            const scoreA = parseInt(partido.team_a.score);
            const scoreB = parseInt(partido.team_b.score);
            
            // Inicializar equipos si no existen
            if (!tournamentStats[teamA]) {
                tournamentStats[teamA] = {
                    nombre: teamA,
                    logo: partido.team_a.logo,
                    pj: 0, pg: 0, pp: 0, pf: 0, pc: 0,
                    partidos: [],
                    team_id: partido.team_a.id
                };
            }
            if (!tournamentStats[teamB]) {
                tournamentStats[teamB] = {
                    nombre: teamB,
                    logo: partido.team_b.logo,
                    pj: 0, pg: 0, pp: 0, pf: 0, pc: 0,
                    partidos: [],
                    team_id: partido.team_b.id
                };
            }
            
            // Actualizar estadísticas
            tournamentStats[teamA].pj++;
            tournamentStats[teamB].pj++;
            tournamentStats[teamA].pf += scoreA;
            tournamentStats[teamA].pc += scoreB;
            tournamentStats[teamB].pf += scoreB;
            tournamentStats[teamB].pc += scoreA;
            
            if (scoreA > scoreB) {
                tournamentStats[teamA].pg++;
                tournamentStats[teamB].pp++;
                tournamentStats[teamA].partidos.push('G');
                tournamentStats[teamB].partidos.push('P');
            } else {
                tournamentStats[teamB].pg++;
                tournamentStats[teamA].pp++;
                tournamentStats[teamA].partidos.push('P');
                tournamentStats[teamB].partidos.push('G');
            }
        });

        const finalStandings = [];

        // Procesar cada partido de playoff para determinar posiciones finales
        playoffMatches.forEach(partido => {
            const scoreA = parseInt(partido.team_a.score);
            const scoreB = parseInt(partido.team_b.score);
            const teamAWins = scoreA > scoreB;
            
            switch(partido.ronda) {
                case "Final":
                    // 1º y 2º lugar
                    if (teamAWins) {
                        finalStandings.push({
                            pos: 1,
                            equipo: partido.team_a.name.trim(),
                            medalla: "🥇"
                        });
                        finalStandings.push({
                            pos: 2,
                            equipo: partido.team_b.name.trim(),
                            medalla: "🥈"
                        });
                    } else {
                        finalStandings.push({
                            pos: 1,
                            equipo: partido.team_b.name.trim(),
                            medalla: "🥇"
                        });
                        finalStandings.push({
                            pos: 2,
                            equipo: partido.team_a.name.trim(),
                            medalla: "🥈"
                        });
                    }
                    break;
                    
                case "3º-4º":
                    // 3º y 4º lugar
                    if (teamAWins) {
                        finalStandings.push({
                            pos: 3,
                            equipo: partido.team_a.name.trim(),
                            medalla: "🥉"
                        });
                        finalStandings.push({
                            pos: 4,
                            equipo: partido.team_b.name.trim(),
                            medalla: ""
                        });
                    } else {
                        finalStandings.push({
                            pos: 3,
                            equipo: partido.team_b.name.trim(),
                            medalla: "🥉"
                        });
                        finalStandings.push({
                            pos: 4,
                            equipo: partido.team_a.name.trim(),
                            medalla: ""
                        });
                    }
                    break;
                    
                case "5º-6º":
                    // 5º y 6º lugar
                    if (teamAWins) {
                        finalStandings.push({
                            pos: 5,
                            equipo: partido.team_a.name.trim(),
                            medalla: ""
                        });
                        finalStandings.push({
                            pos: 6,
                            equipo: partido.team_b.name.trim(),
                            medalla: ""
                        });
                    } else {
                        finalStandings.push({
                            pos: 5,
                            equipo: partido.team_b.name.trim(),
                            medalla: ""
                        });
                        finalStandings.push({
                            pos: 6,
                            equipo: partido.team_a.name.trim(),
                            medalla: ""
                        });
                    }
                    break;
                    
                case "7º-8º":
                    // 7º y 8º lugar
                    if (teamAWins) {
                        finalStandings.push({
                            pos: 7,
                            equipo: partido.team_a.name.trim(),
                            medalla: ""
                        });
                        finalStandings.push({
                            pos: 8,
                            equipo: partido.team_b.name.trim(),
                            medalla: ""
                        });
                    } else {
                        finalStandings.push({
                            pos: 7,
                            equipo: partido.team_b.name.trim(),
                            medalla: ""
                        });
                        finalStandings.push({
                            pos: 8,
                            equipo: partido.team_a.name.trim(),
                            medalla: ""
                        });
                    }
                    break;
            }
        });

        // Si no hay partidos de playoff, generar clasificación basada en grupos
        if (finalStandings.length === 0) {
            console.log('No se encontraron partidos de playoff, generando clasificación basada en grupos');
            
            // Obtener todos los equipos de los grupos
            const allTeams = Object.keys(tournamentStats);
            
            // Ordenar equipos por estadísticas (PG, diferencia de puntos, PF)
            allTeams.sort((a, b) => {
                const statsA = tournamentStats[a];
                const statsB = tournamentStats[b];
                
                // Primero por partidos ganados
                if (statsB.pg !== statsA.pg) return statsB.pg - statsA.pg;
                
                // Luego por diferencia de puntos
                const difA = statsA.pf - statsA.pc;
                const difB = statsB.pf - statsB.pc;
                if (difB !== difA) return difB - difA;
                
                // Finalmente por puntos a favor
                return statsB.pf - statsA.pf;
            });
            
            // Generar posiciones finales
            allTeams.forEach((equipo, index) => {
                finalStandings.push({
                    pos: index + 1,
                    equipo: equipo,
                    medalla: index < 3 ? (index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉") : ""
                });
            });
        }

        // Combinar posiciones finales con estadísticas del torneo
        finalClassificationData = finalStandings.map(standing => {
            const stats = tournamentStats[standing.equipo];
            if (!stats) return null;
            
            const pt = stats.pf - stats.pc;
            const ultimosPartidos = stats.partidos.join('');
            const racha = calcularRacha(stats.partidos);
            
            return {
                pos: standing.pos,
                equipo: standing.equipo,
                logo: stats.logo,
                medalla: standing.medalla,
                pj: stats.pj,
                pg: stats.pg,
                pp: stats.pp,
                pf: stats.pf,
                pc: stats.pc,
                pt: pt >= 0 ? `+${pt}` : `${pt}`,
                racha: racha,
                ultimos5: ultimosPartidos,
                team_id: stats.team_id
            };
        }).filter(item => item !== null);

        // Ordenar por posición
        finalClassificationData.sort((a, b) => a.pos - b.pos);
        
        console.log('Clasificación final calculada:', finalClassificationData);
        
        // Actualizar tabla si está visible
        updateFinalTable();
        
    } catch (error) {
        console.error('Error calculando clasificación final:', error);
    }
}

// --- Función para actualizar tabla de clasificación final ---
function updateFinalTable() {
    const tableBody = document.querySelector('#finalTable tbody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (finalClassificationData.length === 0) {
        const row = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 10;
        td.textContent = 'No hay datos de clasificación final disponibles';
        td.style.textAlign = 'center';
        td.style.fontStyle = 'italic';
        td.style.color = '#666';
        row.appendChild(td);
        tableBody.appendChild(row);
        return;
    }
    
    finalClassificationData.forEach(equipo => {
        const row = document.createElement('tr');
        
        // Posición con medalla (solo para top 3)
        const posCell = document.createElement('td');
        posCell.className = 'posicion-final';
        posCell.textContent = equipo.pos;
        
        // Equipo con logo y medalla
        const equipoCell = document.createElement('td');
        
        // Crear enlace al equipo
        const teamLink = document.createElement('a');
        teamLink.href = `team_profile.html?team_id=${equipo.team_id}`;
        teamLink.className = 'team-link';
        teamLink.style.textDecoration = 'none';
        teamLink.style.color = 'inherit';
        
        const teamContainer = document.createElement('div');
        teamContainer.className = 'team-container';
        teamContainer.title = equipo.equipo;
        
        if (equipo.logo) {
            const teamLogo = document.createElement('img');
            teamLogo.src = equipo.logo;
            teamLogo.alt = `Logo ${equipo.equipo}`;
            teamLogo.className = 'team-logo';
            teamContainer.appendChild(teamLogo);
        }
        
        const teamName = document.createElement('span');
        teamName.textContent = createTeamAbbreviation(equipo.equipo);
        teamName.className = 'team-name';
        teamContainer.appendChild(teamName);
        
        // Añadir medalla a la derecha del nombre del equipo
        if (equipo.medalla) {
            const medallaSpan = document.createElement('span');
            medallaSpan.textContent = equipo.medalla;
            medallaSpan.className = 'medalla-equipo';
            teamContainer.appendChild(medallaSpan);
        }
        
        teamLink.appendChild(teamContainer);
        equipoCell.appendChild(teamLink);
        
        // Estadísticas del torneo
        const pjCell = document.createElement('td');
        pjCell.textContent = equipo.pj;
        pjCell.setAttribute('data-type', 'number');
        
        const pgCell = document.createElement('td');
        pgCell.textContent = equipo.pg;
        pgCell.setAttribute('data-type', 'number');
        
        const ppCell = document.createElement('td');
        ppCell.textContent = equipo.pp;
        ppCell.setAttribute('data-type', 'number');
        
        const pfCell = document.createElement('td');
        pfCell.textContent = equipo.pf;
        pfCell.setAttribute('data-type', 'number');
        
        const pcCell = document.createElement('td');
        pcCell.textContent = equipo.pc;
        pcCell.setAttribute('data-type', 'number');
        
        const ptCell = document.createElement('td');
        ptCell.textContent = equipo.pt;
        ptCell.className = equipo.pt.startsWith('+') ? 'positive' : 'negative';
        
        const rachaCell = document.createElement('td');
        rachaCell.textContent = equipo.racha;
        rachaCell.className = 'racha';
        if (equipo.racha.includes('G')) {
            rachaCell.classList.add('ganando');
        } else if (equipo.racha.includes('P')) {
            rachaCell.classList.add('perdiendo');
        }
        
        const ultimosCell = document.createElement('td');
        ultimosCell.className = 'ultimos5';
        ultimosCell.innerHTML = '';
        const ultimos5Dots = createUltimos5Dots(equipo.ultimos5);
        ultimosCell.appendChild(ultimos5Dots);
        
        row.appendChild(posCell);
        row.appendChild(equipoCell);
        row.appendChild(pjCell);
        row.appendChild(pgCell);
        row.appendChild(ppCell);
        row.appendChild(pfCell);
        row.appendChild(pcCell);
        row.appendChild(ptCell);
        row.appendChild(rachaCell);
        row.appendChild(ultimosCell);
        
        tableBody.appendChild(row);
    });
    
    // Reiniciar ordenación de la tabla final
    finalTableSortColumn = null;
    finalTableSortDirection = 'desc';
    document.querySelectorAll('#finalTable thead th').forEach(th => {
        th.classList.remove('sorted-asc', 'sorted-desc');
    });
}

// Funcionalidad de navegación
document.addEventListener('DOMContentLoaded', async function() {
    await cargarResultadosDinamicos();
    await calcularClasificacionFinal(); // Cargar clasificación final
    
    // Configurar imagen inicial del bracket de playoff
    const playoffBracketImage = document.querySelector('.playoff-bracket-image');
    if (playoffBracketImage) {
        if (currentCompetition === 'C ESP CLUBES CAD MASC') {
            playoffBracketImage.src = 'Clasificacion/bracket-cadete-masc.svg';
            playoffBracketImage.alt = 'Cuadro de eliminatorias cadetes masculino - Playoff 1-8';
        } else {
            playoffBracketImage.src = 'Clasificacion/bracket-cadete-fem.svg';
            playoffBracketImage.alt = 'Cuadro de eliminatorias cadetes femenino - Playoff 1-8';
        }
    }
    
    // --- Función para cambiar de competición (movida dentro del scope) ---
    async function cambiarCompeticion(nuevaCompeticion) {
        try {
            // Obtener nombre de la competición
            const competitionName = competitionConfig[nuevaCompeticion]?.name || nuevaCompeticion;
            
            // Mostrar indicador de carga
            const loadingIndicator = document.createElement('div');
            loadingIndicator.className = 'loading-indicator';
            loadingIndicator.innerHTML = `
                <div class="loading-spinner"></div>
                <p>Cargando datos de ${competitionName}...</p>
            `;
            document.body.appendChild(loadingIndicator);
            
            currentCompetition = nuevaCompeticion;
            
            // Limpiar datos anteriores
            dynamicResultadosData = {};
            dynamicJornadasPorGrupo = {};
            dynamicClasificacionData = {};
            finalClassificationData = [];
            
            // Reiniciar estados de ordenación
            currentSortColumn = null;
            currentSortDirection = 'desc';
            finalTableSortColumn = null;
            finalTableSortDirection = 'desc';
            
            // Recargar datos
            await cargarResultadosDinamicos();
            
            // Detectar tipo de competición
            const response = await fetch('Clasificacion/all_competitions_info.json');
            const data = await response.json();
            const partidos = data[currentCompetition];
            const competitionType = detectCompetitionType(partidos, currentCompetition);
            
            console.log(`Tipo de competición detectado: ${competitionType}`);
            
            // Actualizar UI según el tipo de competición
            updateUIForCompetitionType(competitionType);
            
            // Calcular clasificación final para competiciones que la necesitan
            if (competitionType === 'groups_playoffs' || competitionType === 'playoffs' || competitionType === 'groups') {
                await calcularClasificacionFinal();
            }
            
            // Actualizar UI específica según el tipo
            if (competitionType === 'groups_playoffs' || competitionType === 'groups') {
                // Mostrar navegación de grupos
                const gruposNav = document.getElementById('gruposNav');
                if (gruposNav) {
                    gruposNav.classList.add('active');
                    gruposNav.style.display = 'block';
                }
                
                // Activar primer grupo por defecto
                const firstGroupTab = document.querySelector('.grupo-tab[data-grupo="A"]');
                if (firstGroupTab) {
                    // Simular click en el primer grupo
                    setTimeout(() => {
                        firstGroupTab.click();
                    }, 100);
                }
                
                // Activar tab de fase de grupos por defecto
                const faseGruposTab = document.querySelector('.clasificacion-tab[data-section="fase-grupos"]');
                if (faseGruposTab) {
                    // Remover active de todos los tabs
                    document.querySelectorAll('.clasificacion-tab').forEach(tab => tab.classList.remove('active'));
                    faseGruposTab.classList.add('active');
                    
                    // Mostrar contenido de fase de grupos
                    document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));
                    const faseGruposContent = document.getElementById('content-fase-grupos');
                    if (faseGruposContent) {
                        faseGruposContent.classList.add('active');
                    }
                }
            } else if (competitionType === 'league') {
                // Para liga simple, calcular y mostrar clasificación única
                calcularClasificacionLiga(partidos);
            }
            
            // Actualizar imagen del bracket de playoff según la competición
            const playoffBracketImage = document.querySelector('.playoff-bracket-image');
            if (playoffBracketImage && competitionConfig[currentCompetition]) {
                const config = competitionConfig[currentCompetition];
                playoffBracketImage.src = config.bracketImage;
                playoffBracketImage.alt = `Cuadro de eliminatorias ${config.name} - Playoff 1-8`;
            }
            
            // Actualizar títulos dinámicos
            updateDynamicTitles();
            
            console.log(`Competición cambiada a: ${currentCompetition} (${competitionType})`);
            
            // Remover indicador de carga
            document.body.removeChild(loadingIndicator);
            
        } catch (error) {
            console.error('Error al cambiar competición:', error);
            // Remover indicador de carga en caso de error
            const loadingIndicator = document.querySelector('.loading-indicator');
            if (loadingIndicator) {
                document.body.removeChild(loadingIndicator);
            }
            
            // Mostrar mensaje de error
            alert('Error al cargar los datos de la competición. Por favor, inténtalo de nuevo.');
        }
    }
    
    // --- COMPETITION DROPDOWN LOGIC ---
    const dropdown = document.querySelector('.competition-dropdown');
    const dropdownBtn = document.getElementById('competitionDropdownBtn');
    const dropdownMenu = document.getElementById('competitionDropdownMenu');
    const selectedText = document.getElementById('selectedCompetitionText');
    const selectedLogo = document.getElementById('selectedCompetitionLogo');
    const searchInput = document.getElementById('competitionSearchInput');
    const optionsContainer = document.getElementById('competitionOptionsContainer');
    let allOptions = []; // Almacenar todas las opciones para el filtrado

    // Inicializar opciones
    function initializeCompetitionOptions() {
        allOptions = Array.from(optionsContainer.querySelectorAll('.competition-dropdown-option'));
        
        // Agregar event listeners a las opciones
        allOptions.forEach(option => {
            option.addEventListener('click', async function(e) {
                e.stopPropagation();
                // Actualiza el texto y logo
                const competitionName = this.querySelector('.competition-name').textContent;
                selectedText.textContent = competitionName;
                selectedLogo.src = this.getAttribute('data-logo');
                selectedLogo.alt = competitionName;
                
                // Marca como activa
                allOptions.forEach(opt => opt.classList.remove('active'));
                this.classList.add('active');
                
                // Limpiar búsqueda
                searchInput.value = '';
                filterCompetitions('');
                
                // Cierra el menú
                dropdown.classList.remove('open');
                
                // Cambia la competición
                const competition = this.getAttribute('data-competition');
                await cambiarCompeticion(competition);
            });
        });
    }

    // Filtrar competiciones
    function filterCompetitions(searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        let visibleCount = 0;
        
        allOptions.forEach(option => {
            const competitionName = option.querySelector('.competition-name').textContent.toLowerCase();
            const competitionDetails = option.querySelector('.competition-details').textContent.toLowerCase();
            const category = option.getAttribute('data-category').toLowerCase();
            const gender = option.getAttribute('data-gender').toLowerCase();
            
            // Buscar en nombre, detalles, categoría y género
            const matches = competitionName.includes(term) || 
                           competitionDetails.includes(term) ||
                           category.includes(term) ||
                           gender.includes(term);
            
            if (matches || term === '') {
                option.style.display = 'flex';
                visibleCount++;
            } else {
                option.style.display = 'none';
            }
        });
        
        // Mostrar mensaje de "no resultados" si no hay coincidencias
        showNoResults(visibleCount === 0 && term !== '');
    }

    // Mostrar mensaje de no resultados
    function showNoResults(show) {
        let noResultsMsg = optionsContainer.querySelector('.no-results-message');
        
        if (show && !noResultsMsg) {
            noResultsMsg = document.createElement('div');
            noResultsMsg.className = 'no-results-message';
            noResultsMsg.textContent = 'No se encontraron competiciones que coincidan con tu búsqueda';
            optionsContainer.appendChild(noResultsMsg);
        } else if (!show && noResultsMsg) {
            noResultsMsg.remove();
        }
    }

    // Event listeners
    // Abrir/cerrar menú
    dropdownBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        dropdown.classList.toggle('open');
        
        // Enfocar el input de búsqueda cuando se abre
        if (dropdown.classList.contains('open')) {
            setTimeout(() => searchInput.focus(), 100);
        }
    });

    // Filtrado en tiempo real
    searchInput.addEventListener('input', function(e) {
        filterCompetitions(e.target.value);
    });

    // Prevenir cerrar el menú al hacer click en el input
    searchInput.addEventListener('click', function(e) {
        e.stopPropagation();
    });

    // Cerrar menú al hacer click fuera
    document.addEventListener('click', function(e) {
        if (!dropdown.contains(e.target)) {
            dropdown.classList.remove('open');
        }
    });

    // Manejar teclas en el buscador
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            dropdown.classList.remove('open');
        } else if (e.key === 'Enter') {
            e.preventDefault();
            // Seleccionar la primera opción visible
            const firstVisible = optionsContainer.querySelector('.competition-dropdown-option[style*="flex"], .competition-dropdown-option:not([style*="none"])');
            if (firstVisible && firstVisible.style.display !== 'none') {
                firstVisible.click();
            }
        }
    });

    // Inicializar después de que el DOM esté listo
    initializeCompetitionOptions();
    
    // --- LÓGICA PARA LA NUEVA BARRA DE FILTROS HORIZONTAL ---
    const faseSelect = document.getElementById('faseSelect');
    const grupoSelectFilter = document.getElementById('grupoSelectFilter');
    const jornadaSelectFilter = document.getElementById('jornadaSelectFilter');
    const grupoFilterItem = document.getElementById('grupoFilterItem');
    const jornadaFilterItem = document.getElementById('jornadaFilterItem');
    
    // Función para mostrar/ocultar filtros según la fase
    function toggleFiltersVisibility(fase) {
        if (fase === 'fase-grupos') {
            if (grupoFilterItem) grupoFilterItem.style.display = 'flex';
            if (jornadaFilterItem) jornadaFilterItem.style.display = 'flex';
        } else {
            if (grupoFilterItem) grupoFilterItem.style.display = 'none';
            if (jornadaFilterItem) jornadaFilterItem.style.display = 'none';
        }
    }
    
    // Función para sincronizar con los tabs existentes
    function syncWithExistingTabs(fase, grupo) {
        // Sincronizar tabs de clasificación
        const clasificacionTabs = document.querySelectorAll('.clasificacion-tab');
        clasificacionTabs.forEach(tab => {
            tab.classList.remove('active');
            if (tab.getAttribute('data-section') === fase) {
                tab.classList.add('active');
            }
        });
        
        // Sincronizar tabs de grupos
        const grupoTabs = document.querySelectorAll('.grupo-tab');
        grupoTabs.forEach(tab => {
            tab.classList.remove('active');
            if (tab.getAttribute('data-grupo') === grupo) {
                tab.classList.add('active');
            }
        });
        
        // Mostrar/ocultar navegación de grupos
        const gruposNav = document.getElementById('gruposNav');
        if (gruposNav) {
            if (fase === 'fase-grupos') {
                gruposNav.classList.add('active');
            } else {
                gruposNav.classList.remove('active');
            }
        }
        
        // Mostrar sección correspondiente
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        const targetSection = document.getElementById(`content-${fase}`);
        if (targetSection) {
            targetSection.classList.add('active');
        }
    }
    
    // Event listeners para la nueva barra de filtros
    if (faseSelect) {
        faseSelect.addEventListener('change', function() {
            const selectedFase = this.value;
            const selectedGrupo = grupoSelectFilter?.value || 'A';
            
            // Verificar si estamos en modo profesional
            const isProfessional = document.body.classList.contains('professional-mode');
            
            if (isProfessional) {
                // Manejar secciones profesionales
                showProfessionalSection(selectedFase);
                
                // Ocultar/mostrar selector de jornada según la fase seleccionada
                const jornadaFilterProItem = document.getElementById('jornadaFilterProItem');
                if (jornadaFilterProItem) {
                    if (selectedFase === 'clasificacion-final-pro') {
                        jornadaFilterProItem.style.display = 'none';
                    } else {
                        jornadaFilterProItem.style.display = 'flex';
                    }
                }
            } else {
                // Lógica original para competiciones de clubes
                toggleFiltersVisibility(selectedFase);
                syncWithExistingTabs(selectedFase, selectedGrupo);
                
                // Mostrar contenido correspondiente
                document.querySelectorAll('.content-section').forEach(section => {
                    section.classList.remove('active');
                });
                
                const targetSection = document.getElementById(`content-${selectedFase}`);
                if (targetSection) {
                    targetSection.classList.add('active');
                }
                
                // Aplicar cambios según la fase
                if (selectedFase === 'fase-grupos') {
                    applyNewFilters();
                } else if (selectedFase === 'playoff') {
                    // Mostrar bracket de playoff
                } else if (selectedFase === 'clasificacion-final') {
                    updateFinalTable();
                }
                
                // Actualizar títulos dinámicos
                updateDynamicTitles();
            }
        });
    }
    
    if (grupoSelectFilter) {
        grupoSelectFilter.addEventListener('change', function() {
            const selectedGrupo = this.value;
            const selectedFase = faseSelect?.value || 'fase-grupos';
            
            syncWithExistingTabs(selectedFase, selectedGrupo);
            applyNewFilters();
        });
    }
    
    if (jornadaSelectFilter) {
        jornadaSelectFilter.addEventListener('change', function() {
            applyNewFilters();
        });
    }
    
    // Event listener para jornada profesional
    const jornadaFilterPro = document.getElementById('jornadaFilterPro');
    if (jornadaFilterPro) {
        jornadaFilterPro.addEventListener('change', function() {
            const selectedJornada = this.value;
            filterProfessionalResultsByJornada(selectedJornada);
        });
    }
    
    // Función para aplicar filtros desde la nueva barra
    function applyNewFilters() {
        const grupo = grupoSelectFilter?.value || 'A';
        const jornada = jornadaSelectFilter?.value || 'todas';
        
        // Actualizar tabla principal
        updateTable(grupo, '2024/2025', jornada);
        
        // Actualizar tabla de resultados si existe
        updateResultadosTable(grupo, '2024/2025', jornada);
        
        // Actualizar título del grupo
        const grupoTitle = document.getElementById('grupoTitle');
        if (grupoTitle) {
            if (jornada === 'todas') {
                grupoTitle.textContent = `Fase de Grupos - Grupo ${grupo}`;
            } else {
                grupoTitle.textContent = `Fase de Grupos - Grupo ${grupo} - Jornada ${jornada}`;
            }
        }
        
        // Actualizar títulos dinámicos
        updateDynamicTitles();
    }
    
    // Función para actualizar los títulos dinámicos
    function updateDynamicTitles() {
        const dynamicTitle = document.getElementById('dynamicCompetitionTitle');
        const dynamicSubtitle = document.getElementById('dynamicCompetitionSubtitle');
        
        // Actualizar título principal con el nombre de la competición
        if (dynamicTitle) {
            if (competitionConfig[currentCompetition]) {
                dynamicTitle.textContent = competitionConfig[currentCompetition].name;
            } else {
                // Para competiciones profesionales sin configuración específica
                dynamicTitle.textContent = currentCompetition;
            }
        }
        
        // Actualizar subtítulo con la configuración actual
        if (dynamicSubtitle) {
            const fase = faseSelect?.value || 'fase-grupos';
            const grupo = grupoSelectFilter?.value || 'A';
            const jornada = jornadaSelectFilter?.value || 'todas';
            const isProfessional = document.body.classList.contains('professional-mode');
            
            let subtitle = '';
            
            if (isProfessional) {
                // Subtítulos para competiciones profesionales
                switch (fase) {
                    case 'liga-regular':
                        subtitle = 'Liga Regular';
                        break;
                    case 'playoffs':
                        subtitle = 'Playoffs';
                        break;
                    case 'clasificacion-final-pro':
                        subtitle = 'Clasificación Final';
                        break;
                    default:
                        subtitle = 'Liga Regular';
                }
            } else {
                // Subtítulos para competiciones de clubes
                switch (fase) {
                    case 'fase-grupos':
                        if (jornada === 'todas') {
                            subtitle = `Fase de Grupos - Grupo ${grupo}`;
                        } else {
                            subtitle = `Fase de Grupos - Grupo ${grupo} - Jornada ${jornada}`;
                        }
                        break;
                    case 'playoff':
                        subtitle = 'Playoff 1-8';
                        break;
                    case 'clasificacion-final':
                        subtitle = 'Clasificación Final';
                        break;
                    default:
                        subtitle = 'Competición';
                }
            }
            
            dynamicSubtitle.textContent = subtitle;
        }
    }
    
    // Inicializar filtros
    toggleFiltersVisibility('fase-grupos');
    syncWithExistingTabs('fase-grupos', 'A');
    updateDynamicTitles();
    
    // Función para actualizar la nueva barra cuando se cambien los tabs existentes
    function updateNewFiltersFromTabs(fase, grupo, jornada) {
        if (faseSelect) faseSelect.value = fase;
        if (grupoSelectFilter) grupoSelectFilter.value = grupo;
        if (jornadaSelectFilter) jornadaSelectFilter.value = jornada || 'todas';
        
        toggleFiltersVisibility(fase);
    }
    
    // --- Función para calcular clasificación de liga simple ---
    function calcularClasificacionLiga(partidos) {
        if (!partidos || partidos.length === 0) return;
        
        const equipos = {};
        
        // Procesar todos los partidos
        partidos.forEach(partido => {
            const teamA = partido.team_a.name.trim();
            const teamB = partido.team_b.name.trim();
            const scoreA = parseInt(partido.team_a.score);
            const scoreB = parseInt(partido.team_b.score);
            
            // Inicializar equipos si no existen
            if (!equipos[teamA]) {
                equipos[teamA] = {
                    nombre: teamA,
                    logo: partido.team_a.logo,
                    pj: 0, pg: 0, pp: 0, pf: 0, pc: 0,
                    partidos: [],
                    team_id: partido.team_a.id
                };
            }
            if (!equipos[teamB]) {
                equipos[teamB] = {
                    nombre: teamB,
                    logo: partido.team_b.logo,
                    pj: 0, pg: 0, pp: 0, pf: 0, pc: 0,
                    partidos: [],
                    team_id: partido.team_b.id
                };
            }
            
            // Actualizar estadísticas
            equipos[teamA].pj++;
            equipos[teamB].pj++;
            equipos[teamA].pf += scoreA;
            equipos[teamA].pc += scoreB;
            equipos[teamB].pf += scoreB;
            equipos[teamB].pc += scoreA;
            
            if (scoreA > scoreB) {
                equipos[teamA].pg++;
                equipos[teamB].pp++;
                equipos[teamA].partidos.push('G');
                equipos[teamB].partidos.push('P');
            } else {
                equipos[teamB].pg++;
                equipos[teamA].pp++;
                equipos[teamA].partidos.push('P');
                equipos[teamB].partidos.push('G');
            }
        });
        
        // Convertir a array y calcular clasificación
        const clasificacion = Object.values(equipos).map((equipo, index) => {
            const pt = equipo.pf - equipo.pc;
            const ultimosPartidos = equipo.partidos.join('');
            const racha = calcularRacha(equipo.partidos);
            
            return {
                pos: index + 1,
                equipo: equipo.nombre,
                pj: equipo.pj,
                pg: equipo.pg,
                pp: equipo.pp,
                pf: equipo.pf,
                pc: equipo.pc,
                pt: pt >= 0 ? `+${pt}` : `${pt}`,
                racha: racha,
                ultimos5: ultimosPartidos,
                logo: equipo.logo,
                team_id: equipo.team_id
            };
        });
        
        // Ordenar por: 1) Victorias, 2) Diferencia de puntos, 3) Puntos a favor
        clasificacion.sort((a, b) => {
            if (b.pg !== a.pg) return b.pg - a.pg;
            const ptA = parseInt(a.pt.replace('+', ''));
            const ptB = parseInt(b.pt.replace('+', ''));
            if (ptB !== ptA) return ptB - ptA;
            return b.pf - a.pf;
        });
        
        // Actualizar posiciones
        clasificacion.forEach((equipo, index) => {
            equipo.pos = index + 1;
        });
        
        // Actualizar tabla de liga
        updateLeagueTable(clasificacion);
    }
    
    // Función para actualizar tabla de liga
    function updateLeagueTable(clasificacion) {
        const tableBody = document.querySelector('#leagueTable tbody');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        if (clasificacion.length === 0) {
            const row = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 10;
            td.textContent = 'No hay datos disponibles';
            td.style.textAlign = 'center';
            td.style.fontStyle = 'italic';
            td.style.color = '#666';
            row.appendChild(td);
            tableBody.appendChild(row);
            return;
        }
        
        clasificacion.forEach(equipo => {
            const row = document.createElement('tr');
            
            const columns = ['pos', 'equipo', 'pj', 'pg', 'pp', 'pf', 'pc', 'pt', 'racha', 'ultimos5'];
            const values = [equipo.pos, equipo.equipo, equipo.pj, equipo.pg, equipo.pp, equipo.pf, equipo.pc, equipo.pt, equipo.racha, equipo.ultimos5];
            
            values.forEach((value, index) => {
                const td = document.createElement('td');
                
                // Columna especial para equipo con logo
                if (columns[index] === 'equipo') {
                    // Crear enlace al equipo
                    const teamLink = document.createElement('a');
                    teamLink.href = `team_profile.html?team_id=${equipo.team_id}`;
                    teamLink.className = 'team-link';
                    teamLink.style.textDecoration = 'none';
                    teamLink.style.color = 'inherit';
                    
                    const teamContainer = document.createElement('div');
                    teamContainer.className = 'team-container';
                    teamContainer.title = value;
                    
                    if (equipo.logo) {
                        const teamLogo = document.createElement('img');
                        teamLogo.src = equipo.logo;
                        teamLogo.alt = `Logo ${value}`;
                        teamLogo.className = 'team-logo';
                        teamContainer.appendChild(teamLogo);
                    }
                    
                    const teamName = document.createElement('span');
                    teamName.textContent = createTeamAbbreviation(value);
                    teamName.className = 'team-name';
                    
                    teamContainer.appendChild(teamName);
                    teamLink.appendChild(teamContainer);
                    td.appendChild(teamLink);
                } else if (columns[index] !== 'ultimos5') {
                    td.textContent = value;
                }
                
                applyCellClasses(td, value, columns[index]);
                row.appendChild(td);
            });
            
            tableBody.appendChild(row);
        });
    }

    // Eliminar el event listener de los antiguos competition-btn (si existe)
    // const competitionButtons = document.querySelectorAll('.competition-btn');
    // competitionButtons.forEach(button => {
    //     button.addEventListener('click', async function() {
    //         const competition = this.getAttribute('data-competition');
            
    //         // Actualizar botones activos
    //         competitionButtons.forEach(btn => btn.classList.remove('active'));
    //         this.classList.add('active');
            
    //         // Cambiar competición
    //         await cambiarCompeticion(competition);
    //     });
    // });
    
    const clasificacionTabs = document.querySelectorAll('.clasificacion-tab');
    const gruposNav = document.getElementById('gruposNav');
    const contentSections = document.querySelectorAll('.content-section');
    const tableContainer = document.getElementById('tableContainer');
    const scrollLeftBtn = document.getElementById('scrollLeftBtn');
    const scrollRightBtn = document.getElementById('scrollRightBtn');
    let currentSortColumn = null;
    let currentSortDirection = 'desc';
    let finalTableSortColumn = null;
    let finalTableSortDirection = 'desc';

    // Función para aplicar clases CSS a los datos
    function applyCellClasses(td, value, column) {
        if (column === 'pt') {
            if (value.startsWith('+')) {
                td.classList.add('positive');
            } else if (value.startsWith('-')) {
                td.classList.add('negative');
            } else {
                td.classList.add('neutral');
            }
        } else if (column === 'racha') {
            td.classList.add('racha');
            if (value.includes('G')) {
                td.classList.add('ganando');
            } else if (value.includes('P')) {
                td.classList.add('perdiendo');
            }
        } else if (column === 'ultimos5') {
            td.classList.add('ultimos5');
            // Limpiar contenido y añadir puntos visuales
            td.innerHTML = '';
            const ultimos5Dots = createUltimos5Dots(value);
            td.appendChild(ultimos5Dots);
        } else if (['pj', 'pg', 'pp', 'pf', 'pc'].includes(column)) {
            td.setAttribute('data-type', 'number');
        }
    }

    // Función para obtener datos filtrados
    function getFilteredData(grupo, year, jornada) {
        const grupoData = gruposData[grupo];
        if (!grupoData || !grupoData[year]) {
            return []; // Retornar array vacío si no hay datos
        }
        
        return grupoData[year][jornada] || [];
    }

    // Función para obtener resultados filtrados
    function getFilteredResultados(grupo, year, jornada) {
        const grupoData = resultadosData[grupo];
        if (!grupoData || !grupoData[year]) {
            return []; // Retornar array vacío si no hay datos
        }
        
        return grupoData[year][jornada] || [];
    }

    // Función para actualizar la tabla de resultados
    function updateResultadosTable(grupo, year, jornada) {
        const tableBody = document.querySelector('#resultadosTable tbody');
        const titleElement = document.querySelector('.resultados-jornada-h2');
        
        // Usar datos dinámicos si existen
        let data = [];
        if (dynamicResultadosData[grupo]) {
            if (jornada === 'todas') {
                // Concatenar todos los partidos del grupo
                data = [];
                Object.keys(dynamicResultadosData[grupo]).forEach(j => {
                    data = data.concat(dynamicResultadosData[grupo][j]);
                });
                // Ordenar por fecha y hora
                data.sort((a, b) => {
                    const fechaA = new Date(a.fecha.split('-').reverse().join('-') + ' ' + a.hora);
                    const fechaB = new Date(b.fecha.split('-').reverse().join('-') + ' ' + b.hora);
                    return fechaA - fechaB;
                });
            } else if (dynamicResultadosData[grupo][jornada]) {
                data = dynamicResultadosData[grupo][jornada];
            }
        } else {
            data = getFilteredResultados(grupo, year, jornada);
        }
        
        // Actualizar título
        if (titleElement) {
            if (jornada === 'todas') {
                titleElement.textContent = `Resultados - Todas las jornadas`;
            } else {
                titleElement.textContent = `Resultados - Jornada ${jornada}`;
            }
        }
        
        if (!tableBody) return;
        tableBody.innerHTML = '';
        
        if (data.length === 0) {
            const row = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 3;
            td.textContent = 'No hay resultados disponibles para esta jornada';
            td.style.textAlign = 'center';
            td.style.fontStyle = 'italic';
            td.style.color = '#666';
            row.appendChild(td);
            tableBody.appendChild(row);
            return;
        }
        
        data.forEach(partido => {
            const row = document.createElement('tr');
            
            // Columna de Partido (equipos + resultado)
            const partidoCell = document.createElement('td');
            partidoCell.className = 'partido';
            
            // Crear enlace al partido
            const partidoLink = document.createElement('a');
            partidoLink.href = `ficha.html?gameId=${partido.match_id}`;
            partidoLink.className = 'partido-link';
            partidoLink.style.textDecoration = 'none';
            partidoLink.style.color = 'inherit';
            
            // Crear contenedor para el partido
            const partidoContainer = document.createElement('div');
            partidoContainer.className = 'partido-container';
            
            // Equipo local
            const equipoLocal = document.createElement('div');
            equipoLocal.className = 'equipo-partido local';
            equipoLocal.title = partido.equipos.local; // Tooltip con nombre completo
            
            if (partido.equipos.localLogo) {
            const localLogo = document.createElement('img');
                localLogo.src = partido.equipos.localLogo;
            localLogo.alt = `Logo ${partido.equipos.local}`;
            localLogo.className = 'team-logo-small';
                equipoLocal.appendChild(localLogo);
            }
            
            const localName = document.createElement('span');
            localName.textContent = createTeamAbbreviation(partido.equipos.local);
            equipoLocal.appendChild(localName);
            
            // Resultado
            const resultado = document.createElement('div');
            resultado.className = 'resultado-partido';
            
            // Determinar ganador y crear resultado con formato especial
            const scoreA = partido.score_a;
            const scoreB = partido.score_b;
            const teamAWins = scoreA > scoreB;
            const teamBWins = scoreB > scoreA;
            
            if (teamAWins) {
                // Team A gana - flecha a la izquierda del score
                resultado.innerHTML = `<span class="score-winner">${scoreA}</span> - <span class="score-loser">${scoreB}</span>`;
            } else if (teamBWins) {
                // Team B gana - flecha a la derecha del score
                resultado.innerHTML = `<span class="score-loser">${scoreA}</span> - <span class="score-winner">${scoreB}</span>`;
            } else {
                // Empate (caso raro en baloncesto, pero por si acaso)
                resultado.innerHTML = `<span class="score-tie">${scoreA}</span> - <span class="score-tie">${scoreB}</span>`;
            }
            
            // Equipo visitante
            const equipoVisitante = document.createElement('div');
            equipoVisitante.className = 'equipo-partido visitante';
            equipoVisitante.title = partido.equipos.visitante; // Tooltip con nombre completo
            
            const visitanteName = document.createElement('span');
            visitanteName.textContent = createTeamAbbreviation(partido.equipos.visitante);
            visitanteName.style.marginRight = '6px';
            equipoVisitante.appendChild(visitanteName);
            
            if (partido.equipos.visitanteLogo) {
            const visitanteLogo = document.createElement('img');
                visitanteLogo.src = partido.equipos.visitanteLogo;
            visitanteLogo.alt = `Logo ${partido.equipos.visitante}`;
            visitanteLogo.className = 'team-logo-small';
                equipoVisitante.appendChild(visitanteLogo);
            }
            
            // Ensamblar el partido
            partidoContainer.appendChild(equipoLocal);
            partidoContainer.appendChild(resultado);
            partidoContainer.appendChild(equipoVisitante);
            partidoLink.appendChild(partidoContainer);
            partidoCell.appendChild(partidoLink);
            
            // Columna de fecha
            const fechaCell = document.createElement('td');
            fechaCell.className = 'fecha';
            fechaCell.textContent = partido.fecha;
            
            // Columna de hora
            const horaCell = document.createElement('td');
            horaCell.className = 'hora';
            horaCell.textContent = partido.hora;
            
            row.appendChild(partidoCell);
            row.appendChild(fechaCell);
            row.appendChild(horaCell);
            
            tableBody.appendChild(row);
        });
    }

    // Función para actualizar la tabla
    function updateTable(grupo, year = '2024/2025', jornada = 'todas') {
        const tableBody = document.querySelector('#grupoTable tbody');
        const clasificacionTitle = document.querySelector('#content-fase-grupos h2:last-of-type');
        
        // Usar datos dinámicos si existen
        let data = [];
        if (dynamicClasificacionData[grupo] && dynamicClasificacionData[grupo][jornada]) {
            data = dynamicClasificacionData[grupo][jornada];
        } else {
            data = getFilteredData(grupo, year, jornada);
        }
        
        // Actualizar título de clasificación
        if (clasificacionTitle) {
            if (jornada === 'todas') {
                clasificacionTitle.textContent = `Clasificación - Todas las jornadas`;
            } else {
                clasificacionTitle.textContent = `Clasificación tras la Jornada ${jornada}`;
            }
        }
        
        if (!tableBody) return;
        tableBody.innerHTML = '';
        
        if (data.length === 0) {
            const row = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 10;
            td.textContent = 'No hay datos disponibles para esta combinación de filtros';
            td.style.textAlign = 'center';
            td.style.fontStyle = 'italic';
            td.style.color = '#666';
            row.appendChild(td);
            tableBody.appendChild(row);
            return;
        }
        
        data.forEach(equipo => {
            const row = document.createElement('tr');
            row.className = equipo.playoff ? 'playoff-position' : 'elimination-position';
            
            const columns = ['pos', 'equipo', 'pj', 'pg', 'pp', 'pf', 'pc', 'pt', 'racha', 'ultimos5'];
            const values = [equipo.pos, equipo.equipo, equipo.pj, equipo.pg, equipo.pp, equipo.pf, equipo.pc, equipo.pt, equipo.racha, equipo.ultimos5];
            
            values.forEach((value, index) => {
                const td = document.createElement('td');
                
                // Columna especial para equipo con logo
                if (columns[index] === 'equipo') {
                    // Crear enlace al equipo
                    const teamLink = document.createElement('a');
                    teamLink.href = `team_profile.html?team_id=${equipo.team_id}`;
                    teamLink.className = 'team-link';
                    teamLink.style.textDecoration = 'none';
                    teamLink.style.color = 'inherit';
                    
                    const teamContainer = document.createElement('div');
                    teamContainer.className = 'team-container';
                    teamContainer.title = value; // Tooltip con nombre completo
                    
                    if (equipo.logo) {
                    const teamLogo = document.createElement('img');
                        teamLogo.src = equipo.logo;
                    teamLogo.alt = `Logo ${value}`;
                    teamLogo.className = 'team-logo';
                        teamContainer.appendChild(teamLogo);
                    }
                    
                    const teamName = document.createElement('span');
                    teamName.textContent = createTeamAbbreviation(value);
                    teamName.className = 'team-name';
                    
                    teamContainer.appendChild(teamName);
                    teamLink.appendChild(teamContainer);
                    td.appendChild(teamLink);
                } else if (columns[index] !== 'ultimos5') {
                    // Solo añadir texto si no es la columna de últimos5
                    td.textContent = value;
                }
                
                applyCellClasses(td, value, columns[index]);
                row.appendChild(td);
            });
            
            tableBody.appendChild(row);
        });
        
        // Reiniciar ordenación
        currentSortColumn = null;
        currentSortDirection = 'desc';
        document.querySelectorAll('.clasificacion-table thead th').forEach(th => {
            th.classList.remove('sorted-asc', 'sorted-desc');
        });
    }

    // Función de ordenación para tabla de grupos
    function sortTable(column, direction) {
        const tableBody = document.querySelector('#grupoTable tbody');
        const rows = Array.from(tableBody.querySelectorAll('tr'));
        const columnIndex = ['pos', 'equipo', 'pj', 'pg', 'pp', 'pf', 'pc', 'pt', 'racha', 'ultimos5'].indexOf(column);
        
        rows.sort((a, b) => {
            let aVal = a.cells[columnIndex].textContent.trim();
            let bVal = b.cells[columnIndex].textContent.trim();
            
            // Convertir a números si es necesario
            if (['pos', 'pj', 'pg', 'pp', 'pf', 'pc'].includes(column)) {
                aVal = parseInt(aVal);
                bVal = parseInt(bVal);
            } else if (column === 'pt') {
                aVal = parseInt(aVal.replace('+', ''));
                bVal = parseInt(bVal.replace('+', ''));
            }
            
            if (direction === 'desc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });
        
        // Limpiar y rellenar la tabla
        tableBody.innerHTML = '';
        rows.forEach(row => tableBody.appendChild(row));
    }

    // Función de ordenación para tabla final
    function sortFinalTable(column, direction) {
        const tableBody = document.querySelector('#finalTable tbody');
        const rows = Array.from(tableBody.querySelectorAll('tr'));
        const columnIndex = ['pos', 'equipo', 'pj', 'pg', 'pp', 'pf', 'pc', 'pt', 'racha', 'ultimos5'].indexOf(column);
        
        rows.sort((a, b) => {
            let aVal = a.cells[columnIndex].textContent.trim();
            let bVal = b.cells[columnIndex].textContent.trim();
            
            // Convertir a números si es necesario
            if (['pos', 'pj', 'pg', 'pp', 'pf', 'pc'].includes(column)) {
                aVal = parseInt(aVal);
                bVal = parseInt(bVal);
            } else if (column === 'pt') {
                aVal = parseInt(aVal.replace('+', ''));
                bVal = parseInt(bVal.replace('+', ''));
            }
            
            if (direction === 'desc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });
        
        // Limpiar y rellenar la tabla
        tableBody.innerHTML = '';
        rows.forEach(row => tableBody.appendChild(row));
    }

    // Función de ordenación para tabla de liga
    function sortLeagueTable(column, direction) {
        const tableBody = document.querySelector('#leagueTable tbody');
        if (!tableBody) return;
        
        const rows = Array.from(tableBody.querySelectorAll('tr'));
        const columnIndex = ['pos', 'equipo', 'pj', 'pg', 'pp', 'pf', 'pc', 'pt', 'racha', 'ultimos5'].indexOf(column);
        
        rows.sort((a, b) => {
            let aVal = a.cells[columnIndex].textContent.trim();
            let bVal = b.cells[columnIndex].textContent.trim();
            
            // Convertir a números si es necesario
            if (['pos', 'pj', 'pg', 'pp', 'pf', 'pc'].includes(column)) {
                aVal = parseInt(aVal);
                bVal = parseInt(bVal);
            } else if (column === 'pt') {
                aVal = parseInt(aVal.replace('+', ''));
                bVal = parseInt(bVal.replace('+', ''));
            }
            
            if (direction === 'desc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });
        
        // Limpiar y rellenar la tabla
        tableBody.innerHTML = '';
        rows.forEach(row => tableBody.appendChild(row));
    }

    // Event listeners para ordenación
    document.querySelectorAll('.clasificacion-table thead th[data-sort]').forEach(th => {
        th.addEventListener('click', function() {
            const column = this.getAttribute('data-sort');
            const table = this.closest('table');
            const tableId = table.id;
            
            let sortColumn, sortDirection;
            
            // Determinar dirección de ordenación según la tabla
            if (tableId === 'grupoTable') {
                if (currentSortColumn === column) {
                    currentSortDirection = currentSortDirection === 'desc' ? 'asc' : 'desc';
                } else {
                    currentSortDirection = 'desc'; // Cambiar a descendente por defecto
                }
                sortColumn = currentSortColumn = column;
                sortDirection = currentSortDirection;
            } else if (tableId === 'finalTable') {
                if (finalTableSortColumn === column) {
                    finalTableSortDirection = finalTableSortDirection === 'desc' ? 'asc' : 'desc';
                } else {
                    finalTableSortDirection = 'desc'; // Cambiar a descendente por defecto
                }
                sortColumn = finalTableSortColumn = column;
                sortDirection = finalTableSortDirection;
            } else if (tableId === 'leagueTable') {
                // Usar variables para tabla de liga
                if (currentSortColumn === column) {
                    currentSortDirection = currentSortDirection === 'desc' ? 'asc' : 'desc';
                } else {
                    currentSortDirection = 'desc';
                }
                sortColumn = currentSortColumn = column;
                sortDirection = currentSortDirection;
            }
            
            // Actualizar clases visuales solo para la tabla actual
            table.querySelectorAll('thead th').forEach(header => {
                header.classList.remove('sorted-asc', 'sorted-desc');
            });
            
            this.classList.add(sortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc');
            
            // Aplicar ordenación según la tabla
            if (tableId === 'grupoTable') {
                sortTable(column, sortDirection);
            } else if (tableId === 'finalTable') {
                sortFinalTable(column, sortDirection);
            } else if (tableId === 'leagueTable') {
                sortLeagueTable(column, sortDirection);
            }
        });
    });

    // Funcionalidad de scroll horizontal (opcional - solo si existen los botones)
    function updateScrollButtons() {
        if (scrollLeftBtn && scrollRightBtn) {
            const scrollLeft = tableContainer.scrollLeft;
            const maxScroll = tableContainer.scrollWidth - tableContainer.clientWidth;
            
            scrollLeftBtn.disabled = scrollLeft <= 0;
            scrollRightBtn.disabled = scrollLeft >= maxScroll;
        }
    }

    if (scrollLeftBtn && scrollRightBtn) {
        scrollLeftBtn.addEventListener('click', function() {
            tableContainer.scrollBy({ left: -200, behavior: 'smooth' });
        });

        scrollRightBtn.addEventListener('click', function() {
            tableContainer.scrollBy({ left: 200, behavior: 'smooth' });
        });

        tableContainer.addEventListener('scroll', updateScrollButtons);
        window.addEventListener('resize', updateScrollButtons);

        // Inicializar botones de scroll
        updateScrollButtons();
    }

    // Funcionalidad de filtros
    const jornadaFilter = document.getElementById('jornadaFilter');
    const applyFiltersBtn = document.getElementById('applyFilters');

    function applyFilters() {
        const activeGrupoTab = document.querySelector('.grupo-tab.active');
        if (activeGrupoTab) {
            const grupo = activeGrupoTab.getAttribute('data-grupo');
            const jornada = jornadaFilter ? jornadaFilter.value : '1';
            
            // Actualizar ambas tablas
            updateTable(grupo, '2024/2025', jornada);
            updateResultadosTable(grupo, '2024/2025', jornada);
        }
    }

    // Event listeners para filtros
    if (applyFiltersBtn) {
    applyFiltersBtn.addEventListener('click', applyFilters);
    }
    
    // Aplicar filtros automáticamente al cambiar los selectores
    if (jornadaFilter) {
    jornadaFilter.addEventListener('change', applyFilters);
    }

    // Manejar clics en tabs de clasificación
    clasificacionTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remover clase active de todos los tabs
            clasificacionTabs.forEach(t => t.classList.remove('active'));
            // Agregar clase active al tab clickeado
            this.classList.add('active');
            
            const section = this.dataset.section;
            
            // Actualizar la nueva barra de filtros
            if (faseSelect) {
                faseSelect.value = section;
                toggleFiltersVisibility(section);
            }
            
            // Mostrar/ocultar navegación de grupos
            if (section === 'fase-grupos') {
                gruposNav.classList.add('active');
            } else {
                gruposNav.classList.remove('active');
            }
            
            // Mostrar contenido correspondiente
            contentSections.forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`content-${section}`).classList.add('active');
            
            // Actualizar tabla de clasificación final si es necesario
            if (section === 'clasificacion-final') {
                updateFinalTable();
            }
            
            // Actualizar títulos dinámicos
            updateDynamicTitles();
        });
    });

    // Manejar clics en tabs de grupos
    const grupoTabs = document.querySelectorAll('.grupo-tab');
    grupoTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remover clase active de todos los tabs de grupo
            grupoTabs.forEach(t => t.classList.remove('active'));
            // Agregar clase active al tab clickeado
            this.classList.add('active');
            
            const grupo = this.dataset.grupo;
            
            // Actualizar la nueva barra de filtros
            if (grupoSelectFilter) {
                grupoSelectFilter.value = grupo;
            }
            
            // Actualizar título del contenido
            const faseGruposContent = document.getElementById('content-fase-grupos');
            const title = faseGruposContent.querySelector('h2');
            title.textContent = `Fase de Grupos - Grupo ${grupo}`;
            
            // Actualizar dropdown de jornadas y seleccionar "Todas las jornadas" por defecto
            actualizarDropdownJornadas(grupo);
            if (jornadaFilter) {
                jornadaFilter.value = 'todas';
            }
            
            // Actualizar tablas con "todas las jornadas" por defecto
            const year = '2024/2025';
            const jornada = 'todas';
            updateTable(grupo, year, jornada);
            updateResultadosTable(grupo, year, jornada);
            
            // Actualizar títulos dinámicos
            updateDynamicTitles();
        });
    });

    // Inicializar tablas al cargar la página
    const initialGrupo = 'A';
    const initialYear = '2024/2025';
    const initialJornada = 'todas'; // Cambiar a 'todas' por defecto
    
    updateTable(initialGrupo, initialYear, initialJornada);
    updateResultadosTable(initialGrupo, initialYear, initialJornada);

    // Modificar el llenado del dropdown jornadaFilter si hay jornadas dinámicas
    function actualizarDropdownJornadas(grupo) {
        // Actualizar dropdown original
        if (dynamicJornadasPorGrupo[grupo] && jornadaFilter) {
            jornadaFilter.innerHTML = '<option value="todas">Todas las jornadas</option>';
            dynamicJornadasPorGrupo[grupo].forEach(j => {
                const opt = document.createElement('option');
                opt.value = j;
                opt.textContent = `Jornada ${j}`;
                jornadaFilter.appendChild(opt);
            });
            jornadaFilter.value = 'todas';
        }
        
        // Actualizar nuevo dropdown en la barra de filtros
        if (dynamicJornadasPorGrupo[grupo] && jornadaSelectFilter) {
            jornadaSelectFilter.innerHTML = '<option value="todas">Todas las jornadas</option>';
            dynamicJornadasPorGrupo[grupo].forEach(j => {
                const opt = document.createElement('option');
                opt.value = j;
                opt.textContent = `Jornada ${j}`;
                jornadaSelectFilter.appendChild(opt);
            });
            jornadaSelectFilter.value = 'todas';
        }
    }
    // Al cambiar de grupo, actualizar jornadas
    grupoTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const grupo = this.getAttribute('data-grupo');
            actualizarDropdownJornadas(grupo);
        });
    });
    // Al cargar, inicializar jornadas para el grupo inicial
    actualizarDropdownJornadas('A');

    // --- GRUPOS DROPDOWN LOGIC (MÓVIL) ---
    const gruposDropdownInner = document.querySelector('.grupos-dropdown-inner');
    const grupoDropdownBtn = document.getElementById('grupoDropdownBtn');
    const gruposDropdownMenu = document.getElementById('gruposDropdownMenu');
    const grupoDropdownText = document.getElementById('grupoDropdownText');
    const grupoTabsDropdown = gruposDropdownMenu ? gruposDropdownMenu.querySelectorAll('.grupo-tab') : [];

    // Inicializa el texto del botón con el grupo activo
    function updateGrupoDropdownText() {
      const activeTab = gruposDropdownMenu ? gruposDropdownMenu.querySelector('.grupo-tab.active') : null;
      if (activeTab) {
        grupoDropdownText.textContent = activeTab.textContent;
      }
    }
    updateGrupoDropdownText();

    // Abrir/cerrar menú
    if (grupoDropdownBtn) {
      grupoDropdownBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        gruposDropdownInner.classList.toggle('open');
      });
    }

    // Seleccionar grupo en el dropdown
    if (grupoTabsDropdown.length) {
      grupoTabsDropdown.forEach(tab => {
        tab.addEventListener('click', function(e) {
          e.stopPropagation();
          grupoTabsDropdown.forEach(t => t.classList.remove('active'));
          this.classList.add('active');
          updateGrupoDropdownText();
          gruposDropdownInner.classList.remove('open');
          // Dispara el evento de cambio de grupo (simula click en el tab original)
          // Busca el tab correspondiente fuera del dropdown y haz click si existe
          const grupo = this.getAttribute('data-grupo');
          const mainGrupoTab = document.querySelector('.grupos-nav > .grupo-tab[data-grupo="' + grupo + '"]');
          if (mainGrupoTab) mainGrupoTab.click();
        });
      });
    }

    // Cerrar menú al hacer click fuera
    if (gruposDropdownInner) {
      document.addEventListener('click', function(e) {
        if (!gruposDropdownInner.contains(e.target)) {
          gruposDropdownInner.classList.remove('open');
        }
      });
    }
});
