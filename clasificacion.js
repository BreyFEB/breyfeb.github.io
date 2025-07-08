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
            // Mostrar indicador de carga
            const loadingIndicator = document.createElement('div');
            loadingIndicator.className = 'loading-indicator';
            loadingIndicator.innerHTML = `
                <div class="loading-spinner"></div>
                <p>Cargando datos de ${nuevaCompeticion === 'C ESP CLUBES CAD MASC' ? 'Cadete Masculino' : 'Cadete Femenino'}...</p>
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
            await calcularClasificacionFinal();
            
            // Actualizar UI
            const activeGrupoTab = document.querySelector('.grupo-tab.active');
            if (activeGrupoTab) {
                const grupo = activeGrupoTab.getAttribute('data-grupo');
                const jornadaFilter = document.getElementById('jornadaFilter');
                const jornada = jornadaFilter ? jornadaFilter.value : 'todas';
                
                // Actualizar tablas
                updateTable(grupo, '2024/2025', jornada);
                updateResultadosTable(grupo, '2024/2025', jornada);
            }
            
            // Actualizar tabla final si está visible
            const finalSection = document.getElementById('content-clasificacion-final');
            if (finalSection && finalSection.classList.contains('active')) {
                updateFinalTable();
            }
            
            // Actualizar imagen del bracket de playoff según la competición
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
            
            console.log(`Competición cambiada a: ${currentCompetition}`);
            
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
    const options = dropdownMenu.querySelectorAll('.competition-dropdown-option');

    // Abrir/cerrar menú
    dropdownBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });

    // Seleccionar opción
    options.forEach(option => {
      option.addEventListener('click', async function(e) {
        e.stopPropagation();
        // Actualiza el texto y logo
        selectedText.textContent = this.querySelector('span').textContent;
        selectedLogo.src = this.getAttribute('data-logo');
        selectedLogo.alt = this.querySelector('span').textContent;
        // Marca como activa
        options.forEach(opt => opt.classList.remove('active'));
        this.classList.add('active');
        // Cierra el menú
        dropdown.classList.remove('open');
        // Cambia la competición (usa tu función existente)
        const competition = this.getAttribute('data-competition');
        await cambiarCompeticion(competition);
      });
    });

    // Cerrar menú al hacer click fuera
    document.addEventListener('click', function(e) {
      if (!dropdown.contains(e.target)) {
        dropdown.classList.remove('open');
      }
    });

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
        if (!dynamicJornadasPorGrupo[grupo] || !jornadaFilter) return;
        jornadaFilter.innerHTML = '<option value="todas">Todas las jornadas</option>';
        dynamicJornadasPorGrupo[grupo].forEach(j => {
            const opt = document.createElement('option');
            opt.value = j;
            opt.textContent = `Jornada ${j}`;
            jornadaFilter.appendChild(opt);
        });
        // Seleccionar "Todas las jornadas" por defecto
        jornadaFilter.value = 'todas';
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
