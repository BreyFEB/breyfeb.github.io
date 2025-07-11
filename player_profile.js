const queryParams = new URLSearchParams(window.location.search);

// Get specific parameter
const player_id = queryParams.get('player_id');

console.log(player_id);

// Global variable for player totals
let player_totals = null;

// Helper functions for minutes handling
function parseMinutes(minutesStr) {
  if (!minutesStr) return 0;
  const [mins, secs] = minutesStr.split(':').map(Number);
  return mins + (secs / 60);
}

function formatMinutes(totalMinutes) {
  const mins = Math.floor(totalMinutes);
  const secs = Math.round((totalMinutes - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
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

// Helper function to convert a string to title case, except words with a period (e.g., B.C.), and remove backticks, quotes, and accents. Single-letter words remain uppercase.
function toTitleCase(str) {
  return str.split(' ').map(word => {
    // Remove various quote/accent marks: ` " ' ´
    let cleanWord = word.replace(/[`"'´]/g, '');
    if (cleanWord.includes('.')) {
      return cleanWord; // Leave as is if it contains a period
    }
    // If single letter, keep uppercase
    if (cleanWord.length === 1 || cleanWord.length === 2) {
      return cleanWord.toUpperCase();
    }
    return cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1).toLowerCase();
  }).join(' ');
}

// Calculate stats for a specific competition
function calculateCompetitionStats(originalPlayer, competitionMatches, targetCompetition) {
  if (!competitionMatches || competitionMatches.length === 0) {
    return null;
  }
  
  // Calculate totals from the competition matches
  const totals = competitionMatches.reduce((acc, match) => ({
    pts: acc.pts + (match.pts || 0),
    t2i: acc.t2i + (match.t2i || 0),
    t2c: acc.t2c + (match.t2c || 0),
    t3i: acc.t3i + (match.t3i || 0),
    t3c: acc.t3c + (match.t3c || 0),
    tli: acc.tli + (match.tli || 0),
    tlc: acc.tlc + (match.tlc || 0),
    ro: acc.ro + (match.ro || 0),
    rd: acc.rd + (match.rd || 0),
    rt: acc.rt + (match.rt || 0),
    as: acc.as + (match.as || 0),
    br: acc.br + (match.br || 0),
    bp: acc.bp + (match.bp || 0),
    tp: acc.tp + (match.tp || 0),
    fc: acc.fc + (match.fc || 0),
    va: acc.va + (match.va || 0),
    pm: acc.pm + (match.pm || 0),
    seconds: acc.seconds + (parseMinutes(match.minutes) * 60)
  }), {
    pts: 0, t2i: 0, t2c: 0, t3i: 0, t3c: 0, tli: 0, tlc: 0,
    ro: 0, rd: 0, rt: 0, as: 0, br: 0, bp: 0, tp: 0, fc: 0, va: 0, pm: 0, seconds: 0
  });
  
  // Get team info from the first match of the selected competition
  const firstMatch = competitionMatches[0];
  
  // For multi-competition players, we need to determine the team name for this competition
  // We can try to find it from the original data or use the first match's team info
  let competitionTeamName = originalPlayer.teamName;
  let competitionTeamId = firstMatch.playerTeamId || originalPlayer.teamId;
  
  // If the player has a different team in this competition, we might need to get it from match data
  // For now, we'll use the original team name as it's likely consistent
  
  return {
    ...originalPlayer,
    ...totals,
    games: competitionMatches.length,
    competition: targetCompetition,
    matches: competitionMatches,
    teamId: competitionTeamId,
    teamName: competitionTeamName,
    // Keep original player photo and other info
  };
}

// Load precalculated stats
async function loadStats() {
  // Define available stats at the top so all functions can access
  const statOptions = [
    { value: 'pts', label: 'Puntos' },
    { value: 'rt', label: 'Rebotes totales' },
    // Añadir rebotes ofensivos y defensivos
    { value: 'ro', label: 'Rebotes ofensivos' },
    { value: 'rd', label: 'Rebotes defensivos' },
    { value: 'as', label: 'Asistencias' },
    { value: 'br', label: 'Robos' },
    { value: 'bp', label: 'Pérdidas' },
    { value: 'va', label: 'Valoración' },
    { value: 't2c', label: 'T2 Convertidos' },
    { value: 't2i', label: 'T2 Intentados' },
    { value: 't3c', label: 'T3 Convertidos' },
    { value: 't3i', label: 'T3 Intentados' },
    { value: 'tlc', label: 'TL Convertidos' },
    { value: 'tli', label: 'TL Intentados' },
    { value: 'tp', label: 'Tapones' },
    { value: 'fc', label: 'Faltas personales' },
    { value: 'pm', label: '+/-' }
  ];

  const response = await fetch('rankings_stats.json');
  const data = await response.json();

  // Find player totals and store in global variable
  const originalPlayer = data.players.find(player => player.id === player_id);
  if (!originalPlayer) {
    console.error('Player not found in rankings data');
    return;
  }

  // Check if a specific competition is selected via URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const selectedCompetition = urlParams.get('competition');
  
  // Get all competitions the player has played in
  const playerCompetitions = [...new Set(originalPlayer.matches.map(match => match.competition))];
  
  // Determine which competition to use
  let targetCompetition = selectedCompetition;
  if (!targetCompetition || !playerCompetitions.includes(targetCompetition)) {
    // Default to the main competition from the player data
    targetCompetition = originalPlayer.competition;
  }
  
  // Filter matches for the selected competition
  const competitionMatches = originalPlayer.matches.filter(match => match.competition === targetCompetition);
  
  // Get all competitions the player has played in from the original data
  const availablePlayerCompetitions = [...new Set(originalPlayer.matches.map(match => match.competition))];
  
  // Calculate stats for the selected competition
  player_totals = calculateCompetitionStats(originalPlayer, competitionMatches, targetCompetition);
  
  if (!player_totals) {
    console.error('Could not calculate player stats for selected competition');
    return;
  }

  // Update dorsal and player name
  const player_name_h1 = document.querySelector('.player-name');
  if (player_name_h1) {
    const player_dorsal = player_totals.dorsal;
    const player_name = player_totals.playerName;
    // Capitalize name and concatenate dorsal and name
    // Capitalize the first letter of each word in name
    const capitalized_name = player_name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
    const dorsal_nombre = "#" + player_dorsal + " - " + capitalized_name;
    player_name_h1.textContent = dorsal_nombre;
  }

  // Update player photo
  const player_photo = document.querySelector('.player-photo');
  if (player_photo) {
    if (player_totals.playerPhoto && player_totals.playerPhoto.trim() !== '') {
      player_photo.src = player_totals.playerPhoto;
    } else {
      player_photo.src = 'player_placeholder.png';
    }
    // Add error handler to fallback to placeholder if image fails to load
    player_photo.onerror = function() { this.src = 'player_placeholder.png'; };
  }

  // Update player main info with team, competition, and gender
  const player_main_info = document.querySelector('.player-main-info');
  if (player_main_info) {
    const team = toTitleCase(player_totals.teamName);
    const competition = formatCompetitionName(player_totals.competition);
    const gender = player_totals.gender === "M" ? "Femenino" : "Masculino";
    
    // Create competition selector if player has multiple competitions
    let competitionSelector = '';
    if (availablePlayerCompetitions.length > 1) {
      competitionSelector = `
        <div style="margin-bottom: 8px;">
          <label for="competitionSelector">Competición:</label>
          <select id="competitionSelector">
            ${availablePlayerCompetitions.map(comp => 
              `<option value="${comp}" ${comp === player_totals.competition ? 'selected' : ''}>${formatCompetitionName(comp)}</option>`
            ).join('')}
          </select>
        </div>
      `;
    } else {
      competitionSelector = `Competición: ${competition}<br>`;
    }
    
    // Get team info for the current competition
    const currentTeamId = player_totals.teamId;
    const currentTeamLogo = player_totals.teamLogo;
    
    // Team logo and name styled prominently
    player_main_info.innerHTML = `
      <a href="team_profile.html?team_id=${currentTeamId}" class="team-link">
        <img src="${currentTeamLogo}" alt="${team} logo">
        <span class="team-name">${team}</span>
      </a>
      <div class="player-meta">
        Género: ${gender}<br>
        ${competitionSelector}
      </div>
    `;
    
    // Add event listener for competition selector if it exists
    const competitionSelectorElement = document.getElementById('competitionSelector');
    if (competitionSelectorElement) {
      competitionSelectorElement.addEventListener('change', function() {
        const selectedCompetition = this.value;
        // Reload the page with the selected competition
        const urlParams = new URLSearchParams(window.location.search);
        urlParams.set('competition', selectedCompetition);
        window.location.search = urlParams.toString();
      });
    }
  } else {
    console.log('No se encontró el elemento .player-main-info');
  }

  // Helper to calculate percentile and color
  function getPercentileAndColor(value, arr) {
    if (!arr.length || arr.length === 1) return { percentile: 100, color: '#43a047' };
    const below = arr.filter(v => v < value).length;
    const percentile = Math.round((below / (arr.length - 1)) * 100);
    // Interpolate color from red (#e53935) to green (#43a047)
    // 0 = red, 100 = green
    function lerpColor(a, b, t) {
      const ah = parseInt(a.replace('#', ''), 16),
            bh = parseInt(b.replace('#', ''), 16),
            ar = ah >> 16, ag = (ah >> 8) & 0xff, ab = ah & 0xff,
            br = bh >> 16, bg = (bh >> 8) & 0xff, bb = bh & 0xff,
            rr = ar + t * (br - ar),
            rg = ag + t * (bg - ag),
            rb = ab + t * (bb - ab);
      return '#' + ((1 << 24) + (rr << 16) + (rg << 8) + (rb | 0)).toString(16).slice(1);
    }
    const color = lerpColor('#e53935', '#43a047', percentile / 100);
    return { percentile, color };
  }

  // Update PTS card
  const ptsCard = document.querySelector('.summary-card-pts');
  if (ptsCard) {
    const avg_pts = player_totals.pts / player_totals.games;
    ptsCard.querySelector('.summary-value').textContent = avg_pts.toFixed(1);
    // Calculate percentile for points (per game)
    const compPlayers = data.players.filter(p => p.competition === player_totals.competition);
    const ptsArr = compPlayers.map(p => p.pts / p.games);
    const { percentile, color } = getPercentileAndColor(avg_pts, ptsArr);
    const pill = ptsCard.querySelector('.summary-rank-pill');
    pill.textContent = `${percentile} pct`;
    pill.style.background = color;
    pill.title = `Percentil: ${percentile}. El jugador supera al ${percentile}% de los jugadores de la competición en puntos por partido.`;
  }

  // Upadte REB card
  const rebCard = document.querySelector('.summary-card-reb');
  if (rebCard) {
    const avg_reb = player_totals.rt / player_totals.games;
    rebCard.querySelector('.summary-value').textContent = avg_reb.toFixed(1);
    const compPlayers = data.players.filter(p => p.competition === player_totals.competition);
    const rebArr = compPlayers.map(p => p.rt / p.games);
    const { percentile, color } = getPercentileAndColor(avg_reb, rebArr);
    const pill = rebCard.querySelector('.summary-rank-pill');
    pill.textContent = `${percentile} pct`;
    pill.style.background = color;
    pill.title = `Percentil: ${percentile}. El jugador supera al ${percentile}% de los jugadores de la competición en rebotes por partido.`;
  }

  // Update AST card
  const astCard = document.querySelector('.summary-card-ast');
  if (astCard) {
    const avg_ast = player_totals.as / player_totals.games;
    astCard.querySelector('.summary-value').textContent = avg_ast.toFixed(1);
    const compPlayers = data.players.filter(p => p.competition === player_totals.competition);
    const astArr = compPlayers.map(p => p.as / p.games);
    const { percentile, color } = getPercentileAndColor(avg_ast, astArr);
    const pill = astCard.querySelector('.summary-rank-pill');
    pill.textContent = `${percentile} pct`;
    pill.style.background = color;
    pill.title = `Percentil: ${percentile}. El jugador supera al ${percentile}% de los jugadores de la competición en asistencias por partido.`;
  }

  // Update VAL card
  const valCard = document.querySelector('.summary-card-val');
  if (valCard) {
    const avg_val = player_totals.va / player_totals.games;
    valCard.querySelector('.summary-value').textContent = avg_val.toFixed(1);
    const compPlayers = data.players.filter(p => p.competition === player_totals.competition);
    const valArr = compPlayers.map(p => p.va / p.games);
    const { percentile, color } = getPercentileAndColor(avg_val, valArr);
    const pill = valCard.querySelector('.summary-rank-pill');
    pill.textContent = `${percentile} pct`;
    pill.style.background = color;
    pill.title = `Percentil: ${percentile}. El jugador supera al ${percentile}% de los jugadores de la competición en valoración por partido.`;
  }
  
  // After updating player info and before filling record cards
  // Insert chart controls and canvas if not already present
  const profileSection = document.getElementById('profileSection');
  if (profileSection && !document.getElementById('pointsEvolutionChart')) {
    const chartTitle = document.createElement('h3');
    chartTitle.textContent = 'Rendimiento del jugador partido a partido';
    chartTitle.style.textAlign = 'center';
    chartTitle.style.marginBottom = '20px';
    profileSection.appendChild(chartTitle);

    // Create a flex container for the selector and label
    const statSelectorRow = document.createElement('div');
    statSelectorRow.style.display = 'flex';
    statSelectorRow.style.flexDirection = 'column';
    statSelectorRow.style.justifyContent = 'center';
    statSelectorRow.style.alignItems = 'center';
    statSelectorRow.style.marginBottom = '10px';
    // Add label above selector
    const statLabel = document.createElement('span');
    statLabel.textContent = 'Estadística';
    statLabel.style.fontWeight = '600';
    statLabel.style.fontSize = '0.85em';
    statLabel.style.letterSpacing = '0.05em';
    statLabel.style.textTransform = 'uppercase';
    statLabel.style.color = '#888';
    statLabel.style.marginBottom = '4px';
    statSelectorRow.appendChild(statLabel);
    // Add stat selector
    const statSelector = document.createElement('select');
    statSelector.id = 'statSelector';
    statSelector.style.width = '200px';
    statSelector.style.marginBottom = '10px';
    statSelector.style.padding = '6px 12px';
    statSelector.style.border = '1.5px solid #1976d2';
    statSelector.style.borderRadius = '6px';
    statSelector.style.background = '#f5faff';
    statSelector.style.color = '#1976d2';
    statSelector.style.fontSize = '1rem';
    statSelector.style.fontFamily = 'inherit';
    statSelector.style.outline = 'none';
    statSelector.style.transition = 'border-color 0.2s, box-shadow 0.2s';
    statOptions.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      statSelector.appendChild(option);
    });
    statSelectorRow.appendChild(statSelector);
    profileSection.appendChild(statSelectorRow);
    // Create flex container for card and chart
    const evolutionFlex = document.createElement('div');
    evolutionFlex.className = 'chart-with-card';
    // Create info card
    const evolutionCard = document.createElement('div');
    evolutionCard.className = 'chart-info-card';
    evolutionCard.style.justifyContent = 'center';
    evolutionCard.innerHTML = `
      <div class="card-icon" style="font-size:2.2em;text-align:center;">ℹ️</div>
      <div class="card-explanation">Evalúa la evolución del rendimiento del jugador en diferentes estadísticas partido a partido.</div>
    `;
    // Create container div for the chart
    const evolutionChartContainer = document.createElement('div');
    evolutionChartContainer.id = 'evolutionChartContainer';
    const chartCanvas = document.createElement('canvas');
    chartCanvas.id = 'pointsEvolutionChart';
    chartCanvas.height = 120;
    evolutionChartContainer.appendChild(chartCanvas);
    // Assemble flex container
    evolutionFlex.appendChild(evolutionCard);
    evolutionFlex.appendChild(evolutionChartContainer);
    profileSection.appendChild(evolutionFlex);

    // Minimalistic separator after line chart
    const separator1 = document.createElement('hr');
    separator1.style.border = 'none';
    separator1.style.borderTop = '1px solid #e0e0e0';
    separator1.style.margin = '32px 0 32px 0';
    profileSection.appendChild(separator1);
  }

  // Insert scatter plot canvas below the line chart if not already present
  if (profileSection && !document.getElementById('pointsScatterChart')) {
    const scatterTitle = document.createElement('h3');
    scatterTitle.textContent = `Rendimiento en la competición (${formatCompetitionName(player_totals.competition)})`;
    scatterTitle.style.marginTop = '32px';
    scatterTitle.style.textAlign = 'center';
    scatterTitle.style.marginBottom = '20px';
    
    // Create container for title and selector
    const scatterHeader = document.createElement('div');
    scatterHeader.style.display = 'flex';
    scatterHeader.style.flexDirection = 'column';
    scatterHeader.style.alignItems = 'center';
    scatterHeader.appendChild(scatterTitle);

    // Create container for label and selector
    const selectorContainer = document.createElement('div');
    selectorContainer.style.display = 'flex';
    selectorContainer.style.flexDirection = 'column';
    selectorContainer.style.alignItems = 'center';
    selectorContainer.style.justifyContent = 'center';
    selectorContainer.style.marginTop = '8px';
    selectorContainer.style.marginBottom = '16px';
    selectorContainer.style.width = '100%';

    // Stat selector row (label above dropdown)
    const statRow = document.createElement('div');
    statRow.style.display = 'flex';
    statRow.style.flexDirection = 'column';
    statRow.style.alignItems = 'center';
    statRow.style.width = '100%';
    statRow.style.marginBottom = '8px';
    const scatterStatLabel = document.createElement('span');
    scatterStatLabel.textContent = 'Estadística';
    scatterStatLabel.style.fontWeight = '600';
    scatterStatLabel.style.fontSize = '0.85em';
    scatterStatLabel.style.letterSpacing = '0.05em';
    scatterStatLabel.style.textTransform = 'uppercase';
    scatterStatLabel.style.color = '#888';
    scatterStatLabel.style.marginBottom = '4px';
    statRow.appendChild(scatterStatLabel);
    const scatterStatSelector = document.createElement('select');
    scatterStatSelector.id = 'scatterStatSelector';
    scatterStatSelector.style.width = '200px';
    scatterStatSelector.style.marginBottom = '10px';
    scatterStatSelector.style.padding = '6px 12px';
    scatterStatSelector.style.border = '1.5px solid #1976d2';
    scatterStatSelector.style.borderRadius = '6px';
    scatterStatSelector.style.background = '#f5faff';
    scatterStatSelector.style.color = '#1976d2';
    scatterStatSelector.style.fontSize = '1rem';
    scatterStatSelector.style.fontFamily = 'inherit';
    scatterStatSelector.style.outline = 'none';
    scatterStatSelector.style.transition = 'border-color 0.2s, box-shadow 0.2s';
    statOptions.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      scatterStatSelector.appendChild(option);
    });
    statRow.appendChild(scatterStatSelector);
    selectorContainer.appendChild(statRow);

    // Value type selector row (label above dropdown)
    const valueTypeRow = document.createElement('div');
    valueTypeRow.style.display = 'flex';
    valueTypeRow.style.flexDirection = 'column';
    valueTypeRow.style.alignItems = 'center';
    valueTypeRow.style.width = '100%';
    const valueTypeLabel = document.createElement('span');
    valueTypeLabel.textContent = 'Totales/promedios';
    valueTypeLabel.style.fontWeight = '600';
    valueTypeLabel.style.fontSize = '0.85em';
    valueTypeLabel.style.letterSpacing = '0.05em';
    valueTypeLabel.style.textTransform = 'uppercase';
    valueTypeLabel.style.color = '#888';
    valueTypeLabel.style.marginBottom = '4px';
    valueTypeRow.appendChild(valueTypeLabel);
    const valueTypeSelector = document.createElement('select');
    valueTypeSelector.id = 'valueTypeSelector';
    valueTypeSelector.style.width = '200px';
    valueTypeSelector.style.padding = '6px 12px';
    valueTypeSelector.style.border = '1.5px solid #1976d2';
    valueTypeSelector.style.borderRadius = '6px';
    valueTypeSelector.style.background = '#f5faff';
    valueTypeSelector.style.color = '#1976d2';
    valueTypeSelector.style.fontSize = '1rem';
    valueTypeSelector.style.fontFamily = 'inherit';
    valueTypeSelector.style.outline = 'none';
    valueTypeSelector.style.transition = 'border-color 0.2s, box-shadow 0.2s';
    valueTypeSelector.innerHTML = `
      <option value="total">Valores totales</option>
      <option value="average">Valores por partido</option>
      <option value="per40">Por 40 minutos</option>
    `;
    valueTypeRow.appendChild(valueTypeSelector);
    selectorContainer.appendChild(valueTypeRow);

    scatterHeader.appendChild(selectorContainer);
    
    // Create flex container for card and chart
    const scatterFlex = document.createElement('div');
    scatterFlex.className = 'chart-with-card';
    // Create info card
    const scatterCard = document.createElement('div');
    scatterCard.className = 'chart-info-card';
    scatterCard.style.justifyContent = 'center';
    scatterCard.innerHTML = `
      <div class="card-icon" style="font-size:2.2em;text-align:center;">ℹ️</div>
      <div class="card-explanation">Evalúa el rendimiento del jugador en el contexto de la competición, comparándolo con todos los demás jugadores.</div>
    `;
    // Create container div for the scatter chart
    const scatterChartContainer = document.createElement('div');
    scatterChartContainer.id = 'scatterChartContainer';
    const scatterCanvas = document.createElement('canvas');
    scatterCanvas.id = 'pointsScatterChart';
    scatterCanvas.style.width = '100%';
    scatterCanvas.style.height = '100%';
    scatterCanvas.style.minHeight = '300px';
    scatterChartContainer.appendChild(scatterCanvas);
    // Assemble flex container
    scatterFlex.appendChild(scatterCard);
    scatterFlex.appendChild(scatterChartContainer);
    profileSection.appendChild(scatterHeader);
    profileSection.appendChild(scatterFlex);

    // Minimalistic separator after scatter chart
    const separator2 = document.createElement('hr');
    separator2.style.border = 'none';
    separator2.style.borderTop = '1px solid #e0e0e0';
    separator2.style.margin = '32px 0 32px 0';
    profileSection.appendChild(separator2);

    // Add bar chart for shooting percentages below the scatter plot
    if (!document.getElementById('shootingPercentagesChart')) {
      // Add header
      const barHeader = document.createElement('h3');
      barHeader.textContent = 'Efectividad en el tiro';
      barHeader.style.textAlign = 'center';
      barHeader.style.marginBottom = '20px';

      const barSection = document.createElement('div');
      barSection.className = 'chart-with-card';
      barSection.style.marginTop = '0px';

      // Insert header before the barSection
      profileSection.appendChild(barHeader);

      // Info card
      const barInfoCard = document.createElement('div');
      barInfoCard.className = 'chart-info-card';
      barInfoCard.style.justifyContent = 'center';
      barInfoCard.innerHTML = `
        <div class="card-icon" style="font-size:2.2em;text-align:center;">ℹ️</div>
        <div class="card-explanation">Evalúa los porcentajes de tiro del jugador en comparación con los valores medios de la liga.</div>
      `;

      // Chart container
      const barChartContainer = document.createElement('div');
      barChartContainer.id = 'barChartContainer';
      barChartContainer.style.flex = '0 0 80%';
      barChartContainer.style.width = '80%';
      barChartContainer.style.height = '100%';
      barChartContainer.style.display = 'flex';
      barChartContainer.style.alignItems = 'center';
      barChartContainer.style.justifyContent = 'center';
      barChartContainer.style.minHeight = '200px';
      const barCanvas = document.createElement('canvas');
      barCanvas.id = 'shootingPercentagesChart';
      barCanvas.style.width = '100%';
      barCanvas.style.height = '100%';
      barChartContainer.appendChild(barCanvas);

      // Assemble
      barSection.appendChild(barInfoCard);
      barSection.appendChild(barChartContainer);
      profileSection.appendChild(barSection);

      // Calculate percentages
      const t2pct = player_totals.t2i > 0 ? (player_totals.t2c / player_totals.t2i) * 100 : 0;
      const t3pct = player_totals.t3i > 0 ? (player_totals.t3c / player_totals.t3i) * 100 : 0;
      const tlpct = player_totals.tli > 0 ? (player_totals.tlc / player_totals.tli) * 100 : 0;

      // Calculate league averages for the same competition
      let leagueT2Pct = 0, leagueT3Pct = 0, leagueTLPct = 0;
      if (data && data.players && player_totals.competition) {
        const compPlayers = data.players.filter(p => p.competition === player_totals.competition);
        const t2s = compPlayers.filter(p => p.t2i > 0);
        const t3s = compPlayers.filter(p => p.t3i > 0);
        const tls = compPlayers.filter(p => p.tli > 0);
        leagueT2Pct = t2s.length > 0 ? t2s.reduce((sum, p) => sum + (p.t2c / p.t2i) * 100, 0) / t2s.length : 0;
        leagueT3Pct = t3s.length > 0 ? t3s.reduce((sum, p) => sum + (p.t3c / p.t3i) * 100, 0) / t3s.length : 0;
        leagueTLPct = tls.length > 0 ? tls.reduce((sum, p) => sum + (p.tlc / p.tli) * 100, 0) / tls.length : 0;
      }

      // Draw bar chart
      const ctxBar = barCanvas.getContext('2d');
      
      // Get screen width for responsive sizing
      const screenWidth = window.innerWidth;
      let titleFontSize, legendFontSize, barThickness, borderRadius, tickFontSize;
      
      // Responsive sizing based on screen width
      if (screenWidth < 768) { // Mobile
        titleFontSize = 14;
        legendFontSize = 12;
        barThickness = 40;
        borderRadius = 6;
        tickFontSize = 10;
      } else if (screenWidth < 1024) { // Tablet
        titleFontSize = 15;
        legendFontSize = 13;
        barThickness = 50;
        borderRadius = 7;
        tickFontSize = 11;
      } else { // Desktop
        titleFontSize = 16;
        legendFontSize = 14;
        barThickness = 60;
        borderRadius = 8;
        tickFontSize = 12;
      }
      
      // Create and store the chart instance
      window.shootingPercentagesChart = new Chart(ctxBar, {
        type: 'bar',
        data: {
          labels: ['2P%', '3P%', 'TL%'],
          datasets: [
            {
              label: 'Jugador',
              data: [t2pct, t3pct, tlpct],
              backgroundColor: [
                'rgba(25, 118, 210, 0.7)',
                'rgba(255, 158, 27, 0.7)',
                'rgba(200, 16, 46, 0.7)'
              ],
              borderColor: [
                '#1976d2',
                '#FF9E1B',
                '#C8102E'
              ],
              borderWidth: screenWidth < 768 ? 1 : 2,
              borderRadius: borderRadius,
              maxBarThickness: barThickness
            },
            {
              label: 'Media liga',
              data: [leagueT2Pct, leagueT3Pct, leagueTLPct],
              backgroundColor: [
                'rgba(25, 118, 210, 0.2)',
                'rgba(255, 158, 27, 0.2)',
                'rgba(200, 16, 46, 0.2)'
              ],
              borderColor: [
                '#1976d2',
                '#FF9E1B',
                '#C8102E'
              ],
              borderWidth: screenWidth < 768 ? 1 : 2,
              borderRadius: borderRadius,
              maxBarThickness: barThickness
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { 
              display: true, 
              position: screenWidth < 768 ? 'bottom' : 'top',
              labels: {
                font: {
                  size: legendFontSize
                },
                padding: screenWidth < 768 ? 15 : 20,
                boxWidth: screenWidth < 768 ? 15 : 20
              }
            },
            tooltip: {
              enabled: true,
              mode: 'index',
              intersect: false,
              callbacks: {
                label: function(context) {
                  return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`;
                }
              }
            },
            title: {
              display: true,
              text: 'Porcentajes de tiro',
              font: { 
                size: titleFontSize, 
                weight: 'bold' 
              },
              padding: {
                top: screenWidth < 768 ? 10 : 20,
                bottom: screenWidth < 768 ? 10 : 20
              }
            }
          },
          scales: {
            x: {
              title: { display: false },
              grid: { display: false },
              ticks: {
                font: {
                  size: tickFontSize
                }
              }
            },
            y: {
              beginAtZero: true,
              max: 100,
              ticks: {
                callback: function(value) {
                  return value + '%';
                },
                stepSize: screenWidth < 768 ? 25 : 20,
                font: {
                  size: tickFontSize
                }
              },
              title: { display: false },
              grid: { 
                color: 'rgba(0,0,0,0.07)',
                drawBorder: false
              }
            }
          },
          interaction: {
            mode: 'index',
            intersect: false
          },
          elements: {
            bar: {
              borderWidth: screenWidth < 768 ? 1 : 2
            }
          }
        }
      });
    }
  }

  // Draw the chart for a given stat
  function drawStatChart(statKey) {
    if (!(profileSection && player_totals.matches && player_totals.matches.length > 0)) return;
    const ctx = document.getElementById('pointsEvolutionChart').getContext('2d');
    const labels = player_totals.matches.map(match => match.matchDate.split(' - ')[0]);
    const rivals = player_totals.matches.map(match => match.rival);
    let dataArr;
    if (statKey === 'min') {
      dataArr = player_totals.matches.map(match => parseMinutes(match.minutes));
    } else {
      dataArr = player_totals.matches.map(match => match[statKey]);
    }
    const statLabel = statOptions.find(opt => opt.value === statKey)?.label || statKey;
    if (window.pointsEvolutionChart && typeof window.pointsEvolutionChart.destroy === 'function') {
      window.pointsEvolutionChart.destroy();
      window.pointsEvolutionChart = null;
    }
    window.pointsEvolutionChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: `${statLabel} por partido`,
          data: dataArr,
          borderColor: '#1976d2',
          backgroundColor: 'rgba(25, 118, 210, 0.1)',
          fill: true,
          pointRadius: 5,
          pointHoverRadius: 7,
          tension: 0.2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            callbacks: {
              label: function(context) {
                const rival = rivals[context.dataIndex];
                let value = context.parsed.y;
                if (statKey === 'min') {
                  value = formatMinutes(value);
                } else {
                  value = Math.round(value);
                }
                return [
                  `Rival: ${rival}`,
                  `${statLabel}: ${value}`
                ];
              },
              title: function(context) {
                return `Fecha: ${context[0].label}`;
              }
            }
          },
          legend: {
            display: false
          },
          title: {
            display: false
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Fecha'
            }
          },
          y: {
            title: {
              display: true,
              text: statLabel
            },
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                if (statKey === 'min') {
                  return formatMinutes(value);
                }
                return Number.isInteger(value) ? value : '';
              }
            }
          }
        }
      }
    });
  }

  // Draw the scatter plot for total points in the same competition
  function drawPointsScatter(statKey) {
    if (!(profileSection && player_totals && player_totals.competition)) return;
    const scatterCtx = document.getElementById('pointsScatterChart').getContext('2d');
    const valueTypeSelector = document.getElementById('valueTypeSelector');
    const valueType = valueTypeSelector ? valueTypeSelector.value : 'total';
    
    // Get all players in the same competition
    const allPlayers = Array.isArray(data.players) ? data.players : [];
    
    // For multi-competition scenarios, we need to filter players who have played in this competition
    // This is more complex because the original data structure has one entry per player with their primary competition
    let compPlayers = allPlayers.filter(p => p.competition === player_totals.competition);
    
    // If we don't find many players, it might be because this is a secondary competition
    // In that case, we should look for players who have matches in this competition
    if (compPlayers.length < 5) {
      console.log(`Found only ${compPlayers.length} players for competition ${player_totals.competition}, looking for players with matches in this competition`);
      
      compPlayers = allPlayers.filter(p => {
        // Check if player has matches in the target competition
        return p.matches && p.matches.some(match => match.competition === player_totals.competition);
      }).map(p => {
        // If this player has matches in our target competition but it's not their primary competition,
        // we need to calculate their stats for just this competition
        if (p.competition !== player_totals.competition) {
          const competitionMatches = p.matches.filter(match => match.competition === player_totals.competition);
          return calculateCompetitionStats(p, competitionMatches, player_totals.competition);
        }
        return p;
      }).filter(p => p !== null);
    }
    
    console.log(`Found ${compPlayers.length} players for competition: ${player_totals.competition}`);
    
    // Debug: Check if current player is in the competition players list
    const currentPlayerInCompPlayers = compPlayers.find(p => p.id === player_totals.id);
    console.log('Current player found in competition players:', currentPlayerInCompPlayers ? 'YES' : 'NO');

    
    // If still no players found for this competition, return early
    if (compPlayers.length === 0) {
      console.warn('No players found for competition:', player_totals.competition);
      return;
    }
    
    // Prepare scatter data
    const scatterData = compPlayers.map((p, i) => {
      const isCurrent = p.id === player_totals.id;
      
      // If this is the current player, use the filtered player_totals data instead
      let playerData = p;
      if (isCurrent) {
        playerData = player_totals;
      }
      
      // Use playerData.seconds for total minutes played
      const xVal = playerData.seconds ? playerData.seconds / 60 : 0;
      let yVal = 0;
      
      try {
      if (statKey === 'min') {
        yVal = xVal;
      } else {
          const statValue = playerData[statKey] || 0;
          const games = playerData.games || 1;
          
          if (valueType === 'average') {
            yVal = statValue / games;
          } else if (valueType === 'per40') {
            // Calculate per 40 minutes values
            const playerMinutes = playerData.seconds ? playerData.seconds / 60 : 0;
            yVal = playerMinutes > 0 ? (statValue / playerMinutes) * 40 : 0;
          } else {
            // Default to total values
            yVal = statValue;
          }
        }
      } catch (error) {
        console.warn('Error calculating stat for player:', playerData.playerName, error);
        yVal = 0;
      }
      
      return {
        x: xVal,
        y: yVal,
        playerName: playerData.playerName || 'Unknown Player',
        isCurrent,
        stat: yVal,
        min: xVal,
        games: playerData.games || 0
      };
    }).filter(data => data.x >= 0 && data.y >= 0); // Filter out invalid data
    
    // Debug: Check current player data
    console.log('Current player data for scatter chart:', {
      id: player_totals.id,
      name: player_totals.playerName,
      competition: player_totals.competition,
      games: player_totals.games,
      seconds: player_totals.seconds,
      statValue: player_totals[statKey]
    });
    
    // Ensure the current player is included even if not found in compPlayers
    const currentPlayerInData = scatterData.find(d => d.isCurrent);
    console.log('Current player found in scatter data:', currentPlayerInData);
    
    if (!currentPlayerInData && player_totals) {
      const xVal = player_totals.seconds ? player_totals.seconds / 60 : 0;
      let yVal = 0;
      
      try {
        if (statKey === 'min') {
          yVal = xVal;
        } else {
          const statValue = player_totals[statKey] || 0;
          const games = player_totals.games || 1;
          
          if (valueType === 'average') {
            yVal = statValue / games;
          } else if (valueType === 'per40') {
            const playerMinutes = player_totals.seconds ? player_totals.seconds / 60 : 0;
            yVal = playerMinutes > 0 ? (statValue / playerMinutes) * 40 : 0;
          } else {
            yVal = statValue;
          }
        }
      } catch (error) {
        console.warn('Error calculating stat for current player:', error);
        yVal = 0;
      }
      
      scatterData.push({
        x: xVal,
        y: yVal,
        playerName: player_totals.playerName || 'Jugador Actual',
        isCurrent: true,
        stat: yVal,
        min: xVal,
        games: player_totals.games || 0
      });
    }
    
    // Get stat label
    const statLabel = statOptions.find(opt => opt.value === statKey)?.label || statKey;
    // Calculate average minutes for the competition
    const avgMinutes = compPlayers.length > 0 ? compPlayers.reduce((sum, p) => sum + (p.seconds || 0), 0) / 60 / compPlayers.length : 0;
    
    // Get screen width for responsive sizing
    const screenWidth = window.innerWidth;
    let pointRadius, pointHoverRadius, legendFontSize, titleFontSize;
    
    // Responsive sizing based on screen width
    if (screenWidth < 768) { // Mobile
      pointRadius = 4;
      pointHoverRadius = 6;
      legendFontSize = 12;
      titleFontSize = 14;
    } else if (screenWidth < 1024) { // Tablet
      pointRadius = 5;
      pointHoverRadius = 7;
      legendFontSize = 13;
      titleFontSize = 15;
    } else { // Desktop
      pointRadius = 6;
      pointHoverRadius = 8;
      legendFontSize = 14;
      titleFontSize = 16;
    }
    
    // Destroy previous chart if exists
    if (window.pointsScatterChart && typeof window.pointsScatterChart.destroy === 'function') {
      window.pointsScatterChart.destroy();
      window.pointsScatterChart = null;
    }
    
    window.pointsScatterChart = new Chart(scatterCtx, {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: 'Otros jugadores',
            data: scatterData.filter(d => !d.isCurrent),
            backgroundColor: 'rgba(25, 118, 210, 0.15)',
            borderColor: 'rgba(25, 118, 210, 0.3)',
            borderWidth: 1,
            pointRadius: pointRadius,
            pointHoverRadius: pointHoverRadius,
            showLine: false
          },
          {
            label: player_totals.playerName || 'Jugador Actual',
            data: scatterData.filter(d => d.isCurrent),
            backgroundColor: 'rgba(255, 158, 27, 1)', // fully opaque
            borderColor: '#C8102E', // contrasting border
            borderWidth: 1,
            pointRadius: screenWidth < 768 ? 10 : 14, // Smaller current player point on mobile
            pointHoverRadius: screenWidth < 768 ? 14 : 18,
            showLine: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false, // Allow chart to resize freely
        plugins: {
          legend: { 
            display: true,
            position: screenWidth < 768 ? 'bottom' : 'top', // Move legend to bottom on mobile
            align: 'start',
            labels: {
              boxWidth: screenWidth < 768 ? 15 : 20,
              padding: screenWidth < 768 ? 15 : 20,
              font: {
                size: legendFontSize,
                weight: 'bold'
              },
              generateLabels: function(chart) {
                const datasets = chart.data.datasets;
                return datasets.map((dataset, i) => {
                  if (i === 1 && dataset.data && dataset.data.length > 0) { // Current player dataset
                  const currentPlayer = dataset.data[0];
                    if (currentPlayer && typeof currentPlayer.stat !== 'undefined') {
                    return {
                      text: screenWidth < 768 ? 
                          `${dataset.label}: ${Math.round(currentPlayer.stat || 0)}` : 
                          `${dataset.label}: ${Math.round(currentPlayer.stat || 0)} ${statLabel}${valueType === 'average' ? '/partido' : valueType === 'per40' ? '/40min' : ''}`,
                      fillStyle: dataset.backgroundColor,
                      strokeStyle: dataset.borderColor,
                      lineWidth: dataset.borderWidth,
                      hidden: false,
                      index: i
                    };
                    }
                  }
                  return {
                    text: dataset.label,
                    fillStyle: dataset.backgroundColor,
                    strokeStyle: dataset.borderColor,
                    lineWidth: dataset.borderWidth,
                    hidden: false,
                    index: i
                  };
                });
              }
            }
          },
          tooltip: {
            enabled: true,
            mode: 'nearest',
            intersect: false,
            callbacks: {
              label: function(context) {
                const d = context.raw;
                let yValue = d.stat;
                let xValue = d.min;
                let yLabel = statLabel;
                let xLabel = 'Minutos jugados';
                if (statKey === 'min') {
                  yValue = formatMinutes(yValue);
                  xValue = formatMinutes(xValue);
                } else {
                  yValue = Math.round(yValue);
                  xValue = Math.round(xValue);
                }
                return [
                  `Jugador: ${d.playerName}`,
                  `${yLabel}: ${yValue}${valueType === 'average' ? '/partido' : valueType === 'per40' ? '/40min' : ''}`,
                  `${xLabel}: ${xValue}`,
                  valueType === 'average' ? `Partidos jugados: ${d.games}` : ''
                ].filter(Boolean);
              }
            }
          },
          annotation: {
            annotations: {
              avgLine: {
                type: 'line',
                xMin: avgMinutes,
                xMax: avgMinutes,
                borderColor: '#1976d2',
                borderWidth: screenWidth < 768 ? 1 : 2,
                borderDash: [6, 6],
                label: {
                  content: 'Media',
                  enabled: screenWidth >= 768, // Hide label on mobile to save space
                  position: 'start',
                  color: '#1976d2',
                  font: { 
                    weight: 'bold',
                    size: screenWidth < 1024 ? 12 : 14
                  }
                }
              }
            }
          }
        },
        scales: {
          x: {
            title: { 
              display: true, 
              text: 'Minutos jugados',
              font: {
                size: titleFontSize
              }
            },
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return Math.round(value);
              },
              font: {
                size: screenWidth < 768 ? 10 : 12
              }
            },
            grid: {
              color: 'rgba(0,0,0,0.1)',
              drawBorder: false
            }
          },
          y: {
            title: { 
              display: true, 
              text: valueType === 'average' ? `${statLabel} por partido` : valueType === 'per40' ? `${statLabel} por 40 minutos` : statLabel,
              font: {
                size: titleFontSize
              }
            },
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                if (statKey === 'min') {
                  return formatMinutes(value);
                }
                if (valueType === 'average' || valueType === 'per40') {
                  return value % 1 === 0 ? value : value.toFixed(1);
                } else {
                  return Number.isInteger(value) ? value : '';
                }
              },
              font: {
                size: screenWidth < 768 ? 10 : 12
              }
            },
            grid: {
              color: 'rgba(0,0,0,0.1)',
              drawBorder: false
            }
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'xy',
          intersect: false
        },
        elements: {
          point: {
            hoverRadius: pointHoverRadius
          }
        }
      }
    });
  }

  // Initial draw (default to points)
  const statSelector = document.getElementById('statSelector');
  const scatterStatSelector = document.getElementById('scatterStatSelector');
  const valueTypeSelector = document.getElementById('valueTypeSelector');
  
  if (statSelector && scatterStatSelector) {
    const statKey = statSelector.value;
    const scatterStatKey = scatterStatSelector.value;
    drawStatChart(statKey);
    drawPointsScatter(scatterStatKey);

    // Add event listener for stat selector (line chart)
    statSelector.addEventListener('change', function() {
      drawStatChart(this.value);
    });

    // Add event listener for scatter stat selector (scatter chart)
    scatterStatSelector.addEventListener('change', function() {
      drawPointsScatter(this.value);
    });

    // Add event listener for value type selector (scatter chart)
    if (valueTypeSelector) {
      valueTypeSelector.addEventListener('change', function() {
        const currentScatterStatSelector = document.getElementById('scatterStatSelector');
        if (currentScatterStatSelector) {
          drawPointsScatter(currentScatterStatSelector.value);
        }
      });
    }
    
    // Add window resize listener for responsive chart updates
    let resizeTimeout;
    window.addEventListener('resize', function() {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(function() {
        // Redraw scatter chart with new responsive settings
        const currentStatKey = document.getElementById('scatterStatSelector')?.value || 'pts';
        drawPointsScatter(currentStatKey);
        
        // Redraw bar chart with new responsive settings
        redrawShootingPercentagesChart();
      }, 250); // Debounce resize events
    });
  }

  // Function to redraw the shooting percentages chart
  function redrawShootingPercentagesChart() {
    const barCanvas = document.getElementById('shootingPercentagesChart');
    if (!barCanvas || !player_totals) return;
    
    // Destroy existing chart if it exists
    if (window.shootingPercentagesChart && typeof window.shootingPercentagesChart.destroy === 'function') {
      window.shootingPercentagesChart.destroy();
      window.shootingPercentagesChart = null;
    }
    
    const ctxBar = barCanvas.getContext('2d');
    
    // Get screen width for responsive sizing
    const screenWidth = window.innerWidth;
    let titleFontSize, legendFontSize, barThickness, borderRadius, tickFontSize;
    
    // Responsive sizing based on screen width
    if (screenWidth < 768) { // Mobile
      titleFontSize = 14;
      legendFontSize = 12;
      barThickness = 40;
      borderRadius = 6;
      tickFontSize = 10;
    } else if (screenWidth < 1024) { // Tablet
      titleFontSize = 15;
      legendFontSize = 13;
      barThickness = 50;
      borderRadius = 7;
      tickFontSize = 11;
    } else { // Desktop
      titleFontSize = 16;
      legendFontSize = 14;
      barThickness = 60;
      borderRadius = 8;
      tickFontSize = 12;
    }
    
    // Calculate percentages
    const t2pct = player_totals.t2i > 0 ? (player_totals.t2c / player_totals.t2i) * 100 : 0;
    const t3pct = player_totals.t3i > 0 ? (player_totals.t3c / player_totals.t3i) * 100 : 0;
    const tlpct = player_totals.tli > 0 ? (player_totals.tlc / player_totals.tli) * 100 : 0;

    // Calculate league averages for the same competition
    let leagueT2Pct = 0, leagueT3Pct = 0, leagueTLPct = 0;
    if (data && data.players && player_totals.competition) {
      const compPlayers = data.players.filter(p => p.competition === player_totals.competition);
      const t2s = compPlayers.filter(p => p.t2i > 0);
      const t3s = compPlayers.filter(p => p.t3i > 0);
      const tls = compPlayers.filter(p => p.tli > 0);
      leagueT2Pct = t2s.length > 0 ? t2s.reduce((sum, p) => sum + (p.t2c / p.t2i) * 100, 0) / t2s.length : 0;
      leagueT3Pct = t3s.length > 0 ? t3s.reduce((sum, p) => sum + (p.t3c / p.t3i) * 100, 0) / t3s.length : 0;
      leagueTLPct = tls.length > 0 ? tls.reduce((sum, p) => sum + (p.tlc / p.tli) * 100, 0) / tls.length : 0;
    }
    
    window.shootingPercentagesChart = new Chart(ctxBar, {
      type: 'bar',
      data: {
        labels: ['2P%', '3P%', 'TL%'],
        datasets: [
          {
            label: 'Jugador',
            data: [t2pct, t3pct, tlpct],
            backgroundColor: [
              'rgba(25, 118, 210, 0.7)',
              'rgba(255, 158, 27, 0.7)',
              'rgba(200, 16, 46, 0.7)'
            ],
            borderColor: [
              '#1976d2',
              '#FF9E1B',
              '#C8102E'
            ],
            borderWidth: screenWidth < 768 ? 1 : 2,
            borderRadius: borderRadius,
            maxBarThickness: barThickness
          },
          {
            label: 'Media liga',
            data: [leagueT2Pct, leagueT3Pct, leagueTLPct],
            backgroundColor: [
              'rgba(25, 118, 210, 0.2)',
              'rgba(255, 158, 27, 0.2)',
              'rgba(200, 16, 46, 0.2)'
            ],
            borderColor: [
              '#1976d2',
              '#FF9E1B',
              '#C8102E'
            ],
            borderWidth: screenWidth < 768 ? 1 : 2,
            borderRadius: borderRadius,
            maxBarThickness: barThickness
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { 
            display: true, 
            position: screenWidth < 768 ? 'bottom' : 'top',
            labels: {
              font: {
                size: legendFontSize
              },
              padding: screenWidth < 768 ? 15 : 20,
              boxWidth: screenWidth < 768 ? 15 : 20
            }
          },
          tooltip: {
            enabled: true,
            mode: 'index',
            intersect: false,
            callbacks: {
              label: function(context) {
                return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`;
              }
            }
          },
          title: {
            display: true,
            text: 'Porcentajes de tiro',
            font: { 
              size: titleFontSize, 
              weight: 'bold' 
            },
            padding: {
              top: screenWidth < 768 ? 10 : 20,
              bottom: screenWidth < 768 ? 10 : 20
            }
          }
        },
        scales: {
          x: {
            title: { display: false },
            grid: { display: false },
            ticks: {
              font: {
                size: tickFontSize
              }
            }
          },
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: function(value) {
                return value + '%';
              },
              stepSize: screenWidth < 768 ? 25 : 20,
              font: {
                size: tickFontSize
              }
            },
            title: { display: false },
            grid: { 
              color: 'rgba(0,0,0,0.07)',
              drawBorder: false
            }
          }
        },
        interaction: {
          mode: 'index',
          intersect: false
        },
        elements: {
          bar: {
            borderWidth: screenWidth < 768 ? 1 : 2
          }
        }
      }
    });
  }

  // Fill record cards dynamically
  const recordTypes = [
    { type: 'pts', label: 'Puntos', field: 'pts' },
    { type: 'reb', label: 'Rebotes', field: 'rt' },
    { type: 'ast', label: 'Asistencias', field: 'as' },
    { type: 'rob', label: 'Robos', field: 'br' },
    { type: 'tap', label: 'Tapones', field: 'tp' },
    { type: '3pm', label: 'Triples', field: 't3c' },
    { type: 'tla', label: 'Tiros Libres', field: 'tlc' },
    { type: 't2c', label: 'Tiros de 2', field: 't2c' },
    { type: 'val', label: 'Valoración', field: 'va' }
  ];

  // Get all players data to find rival team logos
  const allPlayers = data.players || [];

  recordTypes.forEach(record => {
    const recordCards = document.querySelectorAll(`.record-card-${record.type}`);
    if (recordCards.length > 0) {
      // Find match with max value for this stat
      const maxMatch = player_totals.matches.reduce((max, match) => 
        match[record.field] > max[record.field] ? match : max, 
        player_totals.matches[0]
      );

      recordCards.forEach(card => {
        // Hide card if max value is 0
        if (maxMatch[record.field] === 0) {
          card.style.display = 'none';
          return;
        }

        // Get rival team logo
        const rivalLogo = getRivalTeamLogo(maxMatch.rival, allPlayers);

        // Update record value
        card.querySelector('.record-value').textContent = maxMatch[record.field];
        
        // Update record details with rival logo
        card.querySelector('.record-details').innerHTML = `
          <p>Rival: ${toTitleCase(maxMatch.rival)}</p>
          <p>Fecha: ${maxMatch.matchDate}</p>
          <a href="ficha.html?gameId=${maxMatch.game_id}">Ir al partido</a>
          <div class="rival-logo-container">
            <span class="vs-text">vs</span>
            <div class="rival-logo-circle">
              <img src="${rivalLogo || 'team_icon.png'}" alt="Logo ${toTitleCase(maxMatch.rival)}" class="rival-logo" onerror="this.src='team_icon.png'">
            </div>
          </div>
        `;
      });
    }
  });
  
  // Fill stats container with matches table
  const statsContainer = document.getElementById('statsContainer');
  if (statsContainer && player_totals.matches) {
    statsContainer.innerHTML = '';
    // Create table
    const table = document.createElement('table');
    table.classList.add('stats-table');
    
    // Create table header
    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th data-sort="date">Fecha</th>
        <th data-sort="rival">Rival</th>
        <th data-sort="marcador">Resultado</th>
        <th data-sort="minutes">Min</th>
        <th data-sort="pts">PTS</th>
        <th data-sort="t2c">T2C</th>
        <th data-sort="t2i">T2I</th>
        <th data-sort="t2pct">%T2</th>
        <th data-sort="t3c">T3C</th>
        <th data-sort="t3i">T3I</th>
        <th data-sort="t3pct">%T3</th>
        <th data-sort="tlc">TLC</th>
        <th data-sort="tli">TLI</th>
        <th data-sort="tlpct">%TL</th>
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
      </tr>
    `;
    table.appendChild(thead);

    // Create table body
    const tbody = document.createElement('tbody');
    
    // Store match data for sorting
    const matchData = [];

    // Function to create team acronym (first three valid letters)
    function createTeamAcronym(teamName) {
        const words = teamName.split(' ');
        for (const word of words) {
          const cleanWord = word.replace(/[^a-zA-Z]/g, '');
          if (cleanWord.length >= 3) {
            return cleanWord.slice(0, 3);
          }
        }
        return teamName.slice(0, 3);
    }

    // Function to determine if player's team won
    function didTeamWin(marcador) {
      if (!marcador) return false;
      const [teamScore, rivalScore] = marcador.split('-').map(Number);
      return teamScore > rivalScore;
    }

    // Function to format result with G/P indicator
    function formatResult(marcador) {
      const isWin = didTeamWin(marcador);
      const indicator = isWin
        ? '<b style="color:#008000;" title="Ganado">G</b>'
        : '<b style="color:#ff0000;" title="Perdido">P</b>';
      return `${marcador} ${indicator}`;
    }

    // Add each match as a row
    player_totals.matches.forEach(match => {
      const t2pct = match.t2i > 0 ? ((match.t2c / match.t2i) * 100).toFixed(1) : 0;
      const t3pct = match.t3i > 0 ? ((match.t3c / match.t3i) * 100).toFixed(1) : 0;
      const tlpct = match.tli > 0 ? ((match.tlc / match.tli) * 100).toFixed(1) : 0;
      const teamAcronym = createTeamAcronym(match.rival);
      const isWin = didTeamWin(match.marcador);
      // Extract only the date part (before ' - ')
      const onlyDate = match.matchDate.split(' - ')[0];

      // Get game_id from match
      const gameId = match.game_id;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${onlyDate}</td>
        <td title="${match.rival}">${teamAcronym}</td>
        <td><a href="ficha.html?gameId=${gameId}" style="text-decoration: none;">${formatResult(match.marcador)}</a></td>
        <td>${match.minutes}</td>
        <td>${match.pts}</td>
        <td>${match.t2c}</td>
        <td>${match.t2i}</td>
        <td>${t2pct}</td>
        <td>${match.t3c}</td>
        <td>${match.t3i}</td>
        <td>${t3pct}</td>
        <td>${match.tlc}</td>
        <td>${match.tli}</td>
        <td>${tlpct}</td>
        <td>${match.ro}</td>
        <td>${match.rd}</td>
        <td>${match.rt}</td>
        <td>${match.as}</td>
        <td>${match.br}</td>
        <td>${match.bp}</td>
        <td>${match.tp}</td>
        <td>${match.fc}</td>
        <td>${match.va}</td>
        <td>${match.pm}</td>
      `;
      
      // Add background color based on result
      if (isWin) {
        tr.style.backgroundColor = 'rgba(0, 255, 0, 0.1)'; // Light green
      } else {
        tr.style.backgroundColor = 'rgba(255, 0, 0, 0.1)'; // Light red
      }
      
      tbody.appendChild(tr);
    });

    // Add sorting functionality
    let currentSort = {
      column: null,
      direction: 'desc'
    };

    function sortTable(column) {
      const tbody = table.querySelector('tbody');
      const rows = Array.from(tbody.querySelectorAll('tr:not(.total-row):not(.prom-row):not(.per40-row)'));
      const totalRow = tbody.querySelector('.total-row');
      const promRow = tbody.querySelector('.prom-row');
      const per40Row = tbody.querySelector('.per40-row');

      // Remove sort indicators
      thead.querySelectorAll('th').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        // Remove any existing sort-arrow span
        const arrow = th.querySelector('.sort-arrow');
        if (arrow) arrow.remove();
      });

      // Update sort direction
      if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort.column = column;
        currentSort.direction = 'desc';
      }

      // Add sort indicator
      const header = thead.querySelector(`th[data-sort="${column}"]`);
      header.classList.add(`sort-${currentSort.direction}`);
      // Add arrow span right after the column name
      let arrowSymbol = currentSort.direction === 'asc' ? '▲' : '▼';
      // Remove any existing sort-arrow
      const oldArrow = header.querySelector('.sort-arrow');
      if (oldArrow) oldArrow.remove();
      // Insert arrow after the text node (column name)
      // Find the first text node in the th
      let inserted = false;
      for (let node of header.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          // Insert after this text node
          const arrowSpan = document.createElement('span');
          arrowSpan.className = 'sort-arrow';
          arrowSpan.style.marginLeft = '4px';
          arrowSpan.textContent = arrowSymbol;
          node.parentNode.insertBefore(arrowSpan, node.nextSibling);
          inserted = true;
          break;
        }
      }
      // If no text node found, just append
      if (!inserted) {
        const arrowSpan = document.createElement('span');
        arrowSpan.className = 'sort-arrow';
        arrowSpan.style.marginLeft = '4px';
        arrowSpan.textContent = arrowSymbol;
        header.appendChild(arrowSpan);
      }

      // Sort rows
      rows.sort((a, b) => {
        let aVal, bVal;
        // Handle special cases
        if (column === 'date') {
          aVal = a.children[getColumnIndex(column)].textContent.split('/').reverse().join('');
          bVal = b.children[getColumnIndex(column)].textContent.split('/').reverse().join('');
        } else if (column === 'minutes') {
          aVal = parseMinutes(a.children[getColumnIndex(column)].textContent) * 60;
          bVal = parseMinutes(b.children[getColumnIndex(column)].textContent) * 60;
        } else if (column === 'rival') {
          aVal = a.children[getColumnIndex(column)].getAttribute('title');
          bVal = b.children[getColumnIndex(column)].getAttribute('title');
        } else if (column === 'marcador') {
          let aScore = a.children[getColumnIndex(column)].innerHTML.split(' ')[0];
          let bScore = b.children[getColumnIndex(column)].innerHTML.split(' ')[0];
          const [aTeam, aRival] = aScore.split('-').map(Number);
          const [bTeam, bRival] = bScore.split('-').map(Number);
          aVal = aTeam - aRival;
          bVal = bTeam - bRival;
        } else if (column === 't2pct' || column === 't3pct' || column === 'tlpct') {
          // Sort by the percentage value in the respective column
          aVal = parseFloat(a.children[getColumnIndex(column)].textContent) || 0;
          bVal = parseFloat(b.children[getColumnIndex(column)].textContent) || 0;
        } else {
          aVal = parseFloat(a.children[getColumnIndex(column)].textContent) || 0;
          bVal = parseFloat(b.children[getColumnIndex(column)].textContent) || 0;
        }

        if (currentSort.direction === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });

      // Reorder rows
      rows.forEach(row => tbody.appendChild(row));
      
      // Reattach total and average rows
      if (totalRow) tbody.appendChild(totalRow);
      if (promRow) tbody.appendChild(promRow);
      if (per40Row) tbody.appendChild(per40Row);
    }

    function getColumnIndex(column) {
      const headers = Array.from(thead.querySelectorAll('th'));
      return headers.findIndex(th => th.getAttribute('data-sort') === column);
    }

    // Add click handlers to headers
    thead.querySelectorAll('th').forEach(th => {
      th.style.cursor = 'pointer';
      th.addEventListener('click', () => {
        const column = th.getAttribute('data-sort');
        if (column) {
          sortTable(column);
        }
      });
    });

    // Add CSS for row highlighting and sort arrow
    const style = document.createElement('style');
    style.textContent = `
      th { cursor: pointer; }
      .sort-arrow { font-size: 0.9em; vertical-align: middle; }
      tr:hover { background-color: rgba(0, 0, 0, 0.05) !important; }
      #statSelector, #valueTypeSelector {
        padding: 6px 12px;
        border: 1.5px solid #1976d2;
        border-radius: 6px;
        background: #f5faff;
        color: #1976d2;
        font-size: 1rem;
        font-family: inherit;
        margin-bottom: 16px;
        margin-top: 8px;
        outline: none;
        transition: border-color 0.2s, box-shadow 0.2s;
      }
      #statSelector:focus, #statSelector:hover,
      #valueTypeSelector:focus, #valueTypeSelector:hover {
        border-color: #125ea7;
        box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.15);
        background: #e3f0ff;
      }
      #evolutionChartContainer, #scatterChartContainer {
        flex: 0 0 80%;
        width: 80%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 300px;
      }
      
      #barChartContainer {
        flex: 0 0 80%;
        width: 80%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 200px;
      }
      
      /* Responsive adjustments for mobile and tablet */
      @media (max-width: 1024px) {
        #evolutionChartContainer, #scatterChartContainer {
          flex: 0 0 75%;
          width: 75%;
          min-height: 250px;
        }
        
        #barChartContainer {
          flex: 0 0 75%;
          width: 75%;
          min-height: 180px;
        }
      }
      
      @media (max-width: 768px) {
        #evolutionChartContainer, #scatterChartContainer {
          flex: 0 0 100%;
          width: 100%;
          min-height: 200px;
          margin-top: 15px;
        }
        
        #barChartContainer {
          flex: 0 0 100%;
          width: 100%;
          min-height: 150px;
          margin-top: 15px;
        }
        
        .chart-with-card {
          flex-direction: column;
          gap: 15px;
        }
        
        .chart-info-card {
          flex: 0 0 auto;
          width: 100%;
          margin-bottom: 10px;
        }
      }
      
      @media (max-width: 480px) {
        #evolutionChartContainer, #scatterChartContainer {
          min-height: 180px;
        }
        
        #barChartContainer {
          min-height: 120px;
        }
        
        .chart-info-card {
          padding: 15px;
        }
        
        .card-explanation {
          font-size: 0.9em;
        }
      }
      .card-icon {
        margin-bottom: 10px;
      }
      .card-explanation {
        font-size: 0.98em;
        color: #111C4E;
        text-align: center;
        margin-top: 8px;
      }
      
      /* Responsive styling for selectors */
      @media (max-width: 768px) {
        #statSelector, #scatterStatSelector, #valueTypeSelector {
          width: 100% !important;
          max-width: 250px;
          font-size: 14px;
          padding: 8px 12px;
        }
        
        .statSelectorRow, .selectorContainer {
          margin-bottom: 15px;
        }
        
        .statLabel, .scatterStatLabel, .valueTypeLabel {
          font-size: 0.8em !important;
          margin-bottom: 6px !important;
        }
      }
      
      @media (max-width: 480px) {
        #statSelector, #scatterStatSelector, #valueTypeSelector {
          max-width: 200px;
          font-size: 13px;
          padding: 6px 10px;
        }
      }
      
      /* Styling for percentile pills in table */
      .percentile-pill {
        display: inline-block;
        background: #1976d2;
        color: white;
        font-size: 0.7em;
        padding: 2px 6px;
        border-radius: 10px;
        margin-top: 2px;
        font-weight: bold;
        text-align: center;
        min-width: 30px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      }
      
      /* Table styling for totals and averages rows */
      .total-row, .prom-row, .per40-row {
        background-color: #f8f9fa !important;
        font-weight: bold;
      }
      
      .total-row td, .prom-row td, .per40-row td {
        text-align: center;
        vertical-align: middle;
        padding: 8px 4px;
      }
      
      .total-row td:first-child, .prom-row td:first-child, .per40-row td:first-child {
        text-align: center;
        font-weight: bold;
        background-color: #e9ecef;
      }
      
      /* Hover effects for game rows based on win/loss */
      tr[style*="rgba(0, 255, 0, 0.1)"]:hover {
        background-color: rgba(0, 255, 0, 0.25) !important;
      }
      
      tr[style*="rgba(255, 0, 0, 0.1)"]:hover {
        background-color: rgba(255, 0, 0, 0.25) !important;
      }
      
      /* Individual cell hover effects */
      tr[style*="rgba(0, 255, 0, 0.1)"] td:hover {
        background-color: rgba(0, 255, 0, 0.6) !important;
      }
      
      tr[style*="rgba(255, 0, 0, 0.1)"] td:hover {
        background-color: rgba(255, 0, 0, 0.6) !important;
      }
      
      /* Responsive table styling */
      @media (max-width: 768px) {
        .percentile-pill {
          font-size: 0.6em;
          padding: 1px 4px;
          min-width: 25px;
        }
        
        .total-row td, .prom-row td, .per40-row td {
          padding: 6px 2px;
          font-size: 0.9em;
        }
      }
    `;
    document.head.appendChild(style);

    // Calculate and add totals row
    const totals = player_totals.matches.reduce((acc, match) => ({
      min: acc.min + parseMinutes(match.minutes),
      pts: acc.pts + match.pts,
      t2i: acc.t2i + match.t2i,
      t2c: acc.t2c + match.t2c,
      t3i: acc.t3i + match.t3i,
      t3c: acc.t3c + match.t3c,
      tli: acc.tli + match.tli,
      tlc: acc.tlc + match.tlc,
      ro: acc.ro + match.ro,
      rd: acc.rd + match.rd,
      rt: acc.rt + match.rt,
      as: acc.as + match.as,
      br: acc.br + match.br,
      bp: acc.bp + match.bp,
      tp: acc.tp + match.tp,
      fc: acc.fc + match.fc,
      va: acc.va + match.va,
      pm: acc.pm + match.pm
    }), {
      min: 0, pts: 0, t2i: 0, t2c: 0, t3i: 0, t3c: 0, tli: 0, tlc: 0,
      ro: 0, rd: 0, rt: 0, as: 0, br: 0, bp: 0, tp: 0, fc: 0, va: 0, pm: 0
    });

    const totalT2Pct = totals.t2i > 0 ? ((totals.t2c / totals.t2i) * 100).toFixed(1) : 0;
    const totalT3Pct = totals.t3i > 0 ? ((totals.t3c / totals.t3i) * 100).toFixed(1) : 0;
    const totalTLPct = totals.tli > 0 ? ((totals.tlc / totals.tli) * 100).toFixed(1) : 0;

    // Function to create percentile pill for table cells
    function createPercentilePill(value, statKey, isTotal = true) {
      // Get all players in the same competition
      const compPlayers = data.players.filter(p => p.competition === player_totals.competition);
      
      let comparisonValue, comparisonArray;
      
      if (isTotal === true) {
        // For totals, compare against total values of other players
        comparisonArray = compPlayers.map(p => {
          switch(statKey) {
            case 'min': return p.seconds ? p.seconds / 60 : 0;
            case 'pts': return p.pts;
            case 't2c': return p.t2c;
            case 't2i': return p.t2i;
            case 't3c': return p.t3c;
            case 't3i': return p.t3i;
            case 'tlc': return p.tlc;
            case 'tli': return p.tli;
            case 'ro': return p.ro;
            case 'rd': return p.rd;
            case 'rt': return p.rt;
            case 'as': return p.as;
            case 'br': return p.br;
            case 'bp': return p.bp;
            case 'tp': return p.tp;
            case 'fc': return p.fc;
            case 'va': return p.va;
            case 'pm': return p.pm;
            case 't2pct': return p.t2i > 0 ? (p.t2c / p.t2i) * 100 : 0;
            case 't3pct': return p.t3i > 0 ? (p.t3c / p.t3i) * 100 : 0;
            case 'tlpct': return p.tli > 0 ? (p.tlc / p.tli) * 100 : 0;
            default: return 0;
          }
        });
        comparisonValue = value;
      } else if (isTotal === false) {
        // For averages, compare against average values of other players
        comparisonArray = compPlayers.map(p => {
          switch(statKey) {
            case 'min': return p.seconds ? (p.seconds / 60) / p.games : 0;
            case 'pts': return p.pts / p.games;
            case 't2c': return p.t2c / p.games;
            case 't2i': return p.t2i / p.games;
            case 't3c': return p.t3c / p.games;
            case 't3i': return p.t3i / p.games;
            case 'tlc': return p.tlc / p.games;
            case 'tli': return p.tli / p.games;
            case 'ro': return p.ro / p.games;
            case 'rd': return p.rd / p.games;
            case 'rt': return p.rt / p.games;
            case 'as': return p.as / p.games;
            case 'br': return p.br / p.games;
            case 'bp': return p.bp / p.games;
            case 'tp': return p.tp / p.games;
            case 'fc': return p.fc / p.games;
            case 'va': return p.va / p.games;
            case 'pm': return p.pm / p.games;
            case 't2pct': return p.t2i > 0 ? (p.t2c / p.t2i) * 100 : 0;
            case 't3pct': return p.t3i > 0 ? (p.t3c / p.t3i) * 100 : 0;
            case 'tlpct': return p.tli > 0 ? (p.tlc / p.tli) * 100 : 0;
            default: return 0;
          }
        });
        comparisonValue = value;
      } else if (isTotal === 'per40') {
        // For per 40 minutes, compare against per 40 minutes values of other players
        comparisonArray = compPlayers.map(p => {
          const playerMinutes = p.seconds ? p.seconds / 60 : 0;
          switch(statKey) {
            case 'min': return 40; // Always 40 for per 40 minutes
            case 'pts': return playerMinutes > 0 ? (p.pts / playerMinutes) * 40 : 0;
            case 't2c': return playerMinutes > 0 ? (p.t2c / playerMinutes) * 40 : 0;
            case 't2i': return playerMinutes > 0 ? (p.t2i / playerMinutes) * 40 : 0;
            case 't3c': return playerMinutes > 0 ? (p.t3c / playerMinutes) * 40 : 0;
            case 't3i': return playerMinutes > 0 ? (p.t3i / playerMinutes) * 40 : 0;
            case 'tlc': return playerMinutes > 0 ? (p.tlc / playerMinutes) * 40 : 0;
            case 'tli': return playerMinutes > 0 ? (p.tli / playerMinutes) * 40 : 0;
            case 'ro': return playerMinutes > 0 ? (p.ro / playerMinutes) * 40 : 0;
            case 'rd': return playerMinutes > 0 ? (p.rd / playerMinutes) * 40 : 0;
            case 'rt': return playerMinutes > 0 ? (p.rt / playerMinutes) * 40 : 0;
            case 'as': return playerMinutes > 0 ? (p.as / playerMinutes) * 40 : 0;
            case 'br': return playerMinutes > 0 ? (p.br / playerMinutes) * 40 : 0;
            case 'bp': return playerMinutes > 0 ? (p.bp / playerMinutes) * 40 : 0;
            case 'tp': return playerMinutes > 0 ? (p.tp / playerMinutes) * 40 : 0;
            case 'fc': return playerMinutes > 0 ? (p.fc / playerMinutes) * 40 : 0;
            case 'va': return playerMinutes > 0 ? (p.va / playerMinutes) * 40 : 0;
            case 'pm': return playerMinutes > 0 ? (p.pm / playerMinutes) * 40 : 0;
            case 't2pct': return p.t2i > 0 ? (p.t2c / p.t2i) * 100 : 0;
            case 't3pct': return p.t3i > 0 ? (p.t3c / p.t3i) * 100 : 0;
            case 'tlpct': return p.tli > 0 ? (p.tlc / p.tli) * 100 : 0;
            default: return 0;
          }
        });
        comparisonValue = value;
      }
      
      // Calculate percentile
      const { percentile, color } = getPercentileAndColor(comparisonValue, comparisonArray);
      
      return `<div class="percentile-pill" style="
        display: inline-block;
        background: ${color};
        color: white;
        font-size: 0.7em;
        padding: 2px 6px;
        border-radius: 10px;
        margin-top: 2px;
        font-weight: bold;
        text-align: center;
        min-width: 30px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      " title="El jugador supera al ${percentile}% de los jugadores de la competición en esta estadística.">${percentile} pct</div>`;
    }

    // Function to create table cell with value and percentile
    function createTableCell(value, statKey, isTotal = true) {
      const percentilePill = createPercentilePill(value, statKey, isTotal);
      return `<td style="text-align: center; vertical-align: top;">
        <div style="font-weight: bold;">${value}</div>
        ${percentilePill}
      </td>`;
    }

    // Function to create table cell for minutes with proper formatting
    function createMinutesTableCell(rawMinutes, statKey, isTotal = true) {
      const formattedMinutes = formatMinutes(rawMinutes);
      const percentilePill = createPercentilePill(rawMinutes, statKey, isTotal);
      return `<td style="text-align: center; vertical-align: top;">
        <div style="font-weight: bold;">${formattedMinutes}</div>
        ${percentilePill}
      </td>`;
    }

    const totalRow = document.createElement('tr');
    totalRow.classList.add('total-row');
    totalRow.innerHTML = `
      <td colspan="3" style="text-align: center; font-weight: bold;">TOTAL</td>
      ${createMinutesTableCell(totals.min, 'min', true)}
      ${createTableCell(totals.pts, 'pts', true)}
      ${createTableCell(totals.t2c, 't2c', true)}
      ${createTableCell(totals.t2i, 't2i', true)}
      ${createTableCell(parseFloat(totalT2Pct), 't2pct', true)}
      ${createTableCell(totals.t3c, 't3c', true)}
      ${createTableCell(totals.t3i, 't3i', true)}
      ${createTableCell(parseFloat(totalT3Pct), 't3pct', true)}
      ${createTableCell(totals.tlc, 'tlc', true)}
      ${createTableCell(totals.tli, 'tli', true)}
      ${createTableCell(parseFloat(totalTLPct), 'tlpct', true)}
      ${createTableCell(totals.ro, 'ro', true)}
      ${createTableCell(totals.rd, 'rd', true)}
      ${createTableCell(totals.rt, 'rt', true)}
      ${createTableCell(totals.as, 'as', true)}
      ${createTableCell(totals.br, 'br', true)}
      ${createTableCell(totals.bp, 'bp', true)}
      ${createTableCell(totals.tp, 'tp', true)}
      ${createTableCell(totals.fc, 'fc', true)}
      ${createTableCell(totals.va, 'va', true)}
      ${createTableCell(totals.pm, 'pm', true)}
    `;
    tbody.appendChild(totalRow);

    // Calculate and add averages row
    const numGames = player_totals.matches.length;
    const averages = {
      min: totals.min / numGames,
      pts: (totals.pts / numGames).toFixed(1),
      t2i: (totals.t2i / numGames).toFixed(1),
      t2c: (totals.t2c / numGames).toFixed(1),
      t3i: (totals.t3i / numGames).toFixed(1),
      t3c: (totals.t3c / numGames).toFixed(1),
      tli: (totals.tli / numGames).toFixed(1),
      tlc: (totals.tlc / numGames).toFixed(1),
      ro: (totals.ro / numGames).toFixed(1),
      rd: (totals.rd / numGames).toFixed(1),
      rt: (totals.rt / numGames).toFixed(1),
      as: (totals.as / numGames).toFixed(1),
      br: (totals.br / numGames).toFixed(1),
      bp: (totals.bp / numGames).toFixed(1),
      tp: (totals.tp / numGames).toFixed(1),
      fc: (totals.fc / numGames).toFixed(1),
      va: (totals.va / numGames).toFixed(1),
      pm: (totals.pm / numGames).toFixed(1)
    };

    const avgRow = document.createElement('tr');
    avgRow.classList.add('prom-row');
    avgRow.innerHTML = `
      <td colspan="3" style="text-align: center; font-weight: bold;">POR PARTIDO</td>
      ${createMinutesTableCell(averages.min, 'min', false)}
      ${createTableCell(averages.pts, 'pts', false)}
      ${createTableCell(averages.t2c, 't2c', false)}
      ${createTableCell(averages.t2i, 't2i', false)}
      ${createTableCell(parseFloat(totalT2Pct), 't2pct', false)}
      ${createTableCell(averages.t3c, 't3c', false)}
      ${createTableCell(averages.t3i, 't3i', false)}
      ${createTableCell(parseFloat(totalT3Pct), 't3pct', false)}
      ${createTableCell(averages.tlc, 'tlc', false)}
      ${createTableCell(averages.tli, 'tli', false)}
      ${createTableCell(parseFloat(totalTLPct), 'tlpct', false)}
      ${createTableCell(averages.ro, 'ro', false)}
      ${createTableCell(averages.rd, 'rd', false)}
      ${createTableCell(averages.rt, 'rt', false)}
      ${createTableCell(averages.as, 'as', false)}
      ${createTableCell(averages.br, 'br', false)}
      ${createTableCell(averages.bp, 'bp', false)}
      ${createTableCell(averages.tp, 'tp', false)}
      ${createTableCell(averages.fc, 'fc', false)}
      ${createTableCell(averages.va, 'va', false)}
      ${createTableCell(averages.pm, 'pm', false)}
    `;
    tbody.appendChild(avgRow);

    // Calculate and add per 40 minutes row
    const per40Minutes = {
      min: 40, // Always 40 minutes
      pts: totals.min > 0 ? (totals.pts / totals.min) * 40 : 0,
      t2i: totals.min > 0 ? (totals.t2i / totals.min) * 40 : 0,
      t2c: totals.min > 0 ? (totals.t2c / totals.min) * 40 : 0,
      t3i: totals.min > 0 ? (totals.t3i / totals.min) * 40 : 0,
      t3c: totals.min > 0 ? (totals.t3c / totals.min) * 40 : 0,
      tli: totals.min > 0 ? (totals.tli / totals.min) * 40 : 0,
      tlc: totals.min > 0 ? (totals.tlc / totals.min) * 40 : 0,
      ro: totals.min > 0 ? (totals.ro / totals.min) * 40 : 0,
      rd: totals.min > 0 ? (totals.rd / totals.min) * 40 : 0,
      rt: totals.min > 0 ? (totals.rt / totals.min) * 40 : 0,
      as: totals.min > 0 ? (totals.as / totals.min) * 40 : 0,
      br: totals.min > 0 ? (totals.br / totals.min) * 40 : 0,
      bp: totals.min > 0 ? (totals.bp / totals.min) * 40 : 0,
      tp: totals.min > 0 ? (totals.tp / totals.min) * 40 : 0,
      fc: totals.min > 0 ? (totals.fc / totals.min) * 40 : 0,
      va: totals.min > 0 ? (totals.va / totals.min) * 40 : 0,
      pm: totals.min > 0 ? (totals.pm / totals.min) * 40 : 0
    };

    // Format per 40 minutes values
    const per40Formatted = {
      min: '40:00',
      pts: per40Minutes.pts.toFixed(1),
      t2i: per40Minutes.t2i.toFixed(1),
      t2c: per40Minutes.t2c.toFixed(1),
      t3i: per40Minutes.t3i.toFixed(1),
      t3c: per40Minutes.t3c.toFixed(1),
      tli: per40Minutes.tli.toFixed(1),
      tlc: per40Minutes.tlc.toFixed(1),
      ro: per40Minutes.ro.toFixed(1),
      rd: per40Minutes.rd.toFixed(1),
      rt: per40Minutes.rt.toFixed(1),
      as: per40Minutes.as.toFixed(1),
      br: per40Minutes.br.toFixed(1),
      bp: per40Minutes.bp.toFixed(1),
      tp: per40Minutes.tp.toFixed(1),
      fc: per40Minutes.fc.toFixed(1),
      va: per40Minutes.va.toFixed(1),
      pm: per40Minutes.pm.toFixed(1)
    };

    // Function to create table cell with value and percentile for per 40 minutes
    function createPer40TableCell(value, statKey) {
      const percentilePill = createPercentilePill(value, statKey, 'per40');
      return `<td style="text-align: center; vertical-align: top;">
        <div style="font-weight: bold;">${value}</div>
        ${percentilePill}
      </td>`;
    }

    // Function to create table cell for per 40 minutes without percentile pill for minutes
    function createPer40MinutesTableCell(value, statKey) {
      // Don't show percentile pill for minutes in per 40 minutes row
      if (statKey === 'min') {
        return `<td style="text-align: center; vertical-align: top;">
          <div style="font-weight: bold;">${value}</div>
        </td>`;
      } else {
        const percentilePill = createPercentilePill(value, statKey, 'per40');
        return `<td style="text-align: center; vertical-align: top;">
          <div style="font-weight: bold;">${value}</div>
          ${percentilePill}
        </td>`;
      }
    }

    const per40Row = document.createElement('tr');
    per40Row.classList.add('per40-row');
    per40Row.innerHTML = `
      <td colspan="3" style="text-align: center; font-weight: bold;">POR 40 MINUTOS</td>
      ${createPer40MinutesTableCell(per40Formatted.min, 'min')}
      ${createPer40TableCell(per40Formatted.pts, 'pts')}
      ${createPer40TableCell(per40Formatted.t2c, 't2c')}
      ${createPer40TableCell(per40Formatted.t2i, 't2i')}
      ${createPer40TableCell(parseFloat(totalT2Pct), 't2pct')}
      ${createPer40TableCell(per40Formatted.t3c, 't3c')}
      ${createPer40TableCell(per40Formatted.t3i, 't3i')}
      ${createPer40TableCell(parseFloat(totalT3Pct), 't3pct')}
      ${createPer40TableCell(per40Formatted.tlc, 'tlc')}
      ${createPer40TableCell(per40Formatted.tli, 'tli')}
      ${createPer40TableCell(parseFloat(totalTLPct), 'tlpct')}
      ${createPer40TableCell(per40Formatted.ro, 'ro')}
      ${createPer40TableCell(per40Formatted.rd, 'rd')}
      ${createPer40TableCell(per40Formatted.rt, 'rt')}
      ${createPer40TableCell(per40Formatted.as, 'as')}
      ${createPer40TableCell(per40Formatted.br, 'br')}
      ${createPer40TableCell(per40Formatted.bp, 'bp')}
      ${createPer40TableCell(per40Formatted.tp, 'tp')}
      ${createPer40TableCell(per40Formatted.fc, 'fc')}
      ${createPer40TableCell(per40Formatted.va, 'va')}
      ${createPer40TableCell(per40Formatted.pm, 'pm')}
    `;
    tbody.appendChild(per40Row);

    table.appendChild(tbody);
    statsContainer.appendChild(table);
  }
  
  console.log(player_totals);

  // Hide Triplista badge if average is less than 2 threes made per game
  const triplistaBadge = document.querySelector('.badge-card img[alt="Triplista"]')?.closest('.badge-card');
  if (triplistaBadge) {
    const avgThrees = player_totals.t3c / player_totals.games;
    triplistaBadge.style.display = avgThrees >= 2 ? '' : 'none';
  }

  // Hide Anotadora Top badge if average is not more than 15 points per game
  const anotadoraTopBadge = Array.from(document.querySelectorAll('.badge-card')).find(card => {
    const title = card.querySelector('.badge-title');
    return title && title.textContent.trim() === 'Anotador Top';
  });
  if (anotadoraTopBadge) {
    const avgPoints = player_totals.pts / player_totals.games;
    anotadoraTopBadge.style.display = avgPoints > 15 ? '' : 'none';
  }

  // Hide Guante Robador badge if average is less than 2 steals per game
  const guanteRobadorBadge = Array.from(document.querySelectorAll('.badge-card')).find(card => {
    const title = card.querySelector('.badge-title');
    return title && title.textContent.trim() === 'Guante Robador';
  });
  if (guanteRobadorBadge) {
    const avgSteals = player_totals.br / player_totals.games;
    guanteRobadorBadge.style.display = avgSteals >= 2 ? '' : 'none';
  }

  // Hide Muro Defensivo badge if average is more than 2 blocks per game
  const muroDefensivoBadge = Array.from(document.querySelectorAll('.badge-card')).find(card => {
    const title = card.querySelector('.badge-title');
    return title && title.textContent.trim() === 'Muro Defensivo';
  });
  if (muroDefensivoBadge) {
    const avgBlocks = player_totals.tp / player_totals.games;
    muroDefensivoBadge.style.display = avgBlocks >= 2 ? '' : 'none';
  }

  // Show Reina del Rebote badge if average is more than 8 rebounds per game
  const reinaDelReboteBadge = Array.from(document.querySelectorAll('.badge-card')).find(card => {
    const title = card.querySelector('.badge-title');
    return title && title.textContent.trim() === 'Capturarebotes';
  });
  if (reinaDelReboteBadge) {
    const avgRebounds = player_totals.rt / player_totals.games;
    reinaDelReboteBadge.style.display = avgRebounds >= 8 ? '' : 'none';
  }

  // Show Maratonian@ badge if there is one game in matches with 40:00 minutes played
  const maratonianaBadge = Array.from(document.querySelectorAll('.badge-card')).find(card => {
    const title = card.querySelector('.badge-title');
    return title && title.textContent.trim() === 'Maratonian@';
  });
  if (maratonianaBadge) {
    maratonianaBadge.style.display = player_totals.matches.some(match => match.minutes === '40:00') ? '' : 'none';
  }

  // Show Asistente Top badge if there is one game with 10 assists or more
  const asistenteTopBadge = Array.from(document.querySelectorAll('.badge-card')).find(card => {
    const title = card.querySelector('.badge-title');
    return title && title.textContent.trim() === 'Asistente Top';
  });
  if (asistenteTopBadge) {
    asistenteTopBadge.style.display = player_totals.matches.some(match => match.as >= 10) ? '' : 'none';
  }

  // Show message if no badge-cards are visible
  const badgesContainer = document.querySelector('.badges-container');
  if (badgesContainer) {
    const anyVisible = Array.from(badgesContainer.querySelectorAll('.badge-card'))
      .some(card => card.style.display !== 'none');
    let noBadgeMsg = badgesContainer.querySelector('.no-badges-msg');
    if (noBadgeMsg) noBadgeMsg.remove();
    if (!anyVisible) {
      noBadgeMsg = document.createElement('p');
      noBadgeMsg.className = 'no-badges-msg';
      noBadgeMsg.textContent = 'Este jugador no tiene ningún logro por el momento.';
      badgesContainer.appendChild(noBadgeMsg);
    }
  }
}

loadStats();

document.addEventListener("DOMContentLoaded", () => {
  // Inicializa la galería de fotos (modal)
  initPhotoModal();

     // Configurar tabs para las secciones de la jugadora
    const tabLinks = document.querySelectorAll("#playerTabs .tab-link");

    tabLinks.forEach(tab => {
        tab.addEventListener("click", e => {
            e.preventDefault();
            const targetId = tab.getAttribute("href").substring(1);
            showSection(targetId); // Mostrar la sección correspondiente
            tabLinks.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
const images = document.querySelectorAll("#photosSection img");
const modal = document.getElementById("photoModal");
const modalImage = document.getElementById("modalImage");
const modalCaption = document.getElementById("caption");
const modalClose = document.getElementById("photoModalClose");
const modalPrev = document.getElementById("modalPrev");
const modalNext = document.getElementById("modalNext");
let currentImageIndex = 0;

images.forEach((img, index) => {
    img.addEventListener("click", () => {
        currentImageIndex = index;
        openModal(img.dataset.full, img.alt);
    });
});

modalClose.addEventListener("click", closeModal);
modalPrev.addEventListener("click", showPreviousImage);
modalNext.addEventListener("click", showNextImage);

function openModal(src, alt) {
    modalImage.src = src;
    modalCaption.textContent = alt;
    modal.style.display = "block";
}

function closeModal() {
    modal.style.display = "none";
}

function showPreviousImage() {
    currentImageIndex = (currentImageIndex - 1 + images.length) % images.length;
    openModal(images[currentImageIndex].dataset.full, images[currentImageIndex].alt);
}

function showNextImage() {
    currentImageIndex = (currentImageIndex + 1) % images.length;
    openModal(images[currentImageIndex].dataset.full, images[currentImageIndex].alt);
}
        });
    });

    // Mostrar la sección de Perfil por defecto (y activar la pestaña)
    showSection("profileSection");
    tabLinks.forEach(t => t.classList.remove("active"));
    document.querySelector('a[href="#profileSection"]').classList.add("active");

    // Función para mostrar la sección y ocultar las demás
    function showSection(targetId) {
        document.querySelectorAll(".player-section").forEach(section => {
            section.style.display = (section.id === targetId) ? "block" : "none";
        });
    }

    // Responsive Burger Menu for Header
    setupBurgerMenu();
});

/***********************************************
 * FUNCIONES PARA LAS TABLAS DE ESTADÍSTICAS
 ***********************************************/
function renderAllCategories(categories) {
  const container = document.getElementById("statsContainer");
  if (!container) return;
  let globalData = [];
  categories.forEach(cat => {
    const block = document.createElement("div");
    block.classList.add("category-block");
    const title = document.createElement("div");
    title.classList.add("category-title");
    title.textContent = cat.name;
    const table = document.createElement("table");
    table.classList.add("stats-table");
    table.innerHTML = `
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Rival</th>
          <th>Resultado</th>
          <th>Min</th>
          <th>PTS</th>
          <th>T2I</th>
          <th>T2C</th>
          <th>%T2</th>
          <th>T3I</th>
          <th>T3C</th>
          <th>%T3</th>
          <th>TLC</th>
          <th>TLI</th>
          <th>%TL</th>
          <th>RO</th>
          <th>RD</th>
          <th>RT</th>
          <th>AS</th>
          <th>BR</th>
          <th>BP</th>
          <th>TP</th>
          <th>FC</th>
          <th>VA</th>
          <th>+/-</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector("tbody");
    cat.data.forEach(row => {
      globalData.push(row);
      const tr = document.createElement("tr");
      const t2pct = row.t2i > 0 ? ((row.t2c / row.t2i)*100).toFixed(1) : 0;
      const t3pct = row.t3i > 0 ? ((row.t3c / row.t3i)*100).toFixed(1) : 0;
      const tlpct = row.tli > 0 ? ((row.tlc / row.tli)*100).toFixed(1) : 0;
      tr.innerHTML = `
        <td>${row.date}</td>
        <td class="team-hint" data-fullname="${row.rival}">${abbreviateTeam(row.rival)}</td>
        <td>${row.res}</td>
        <td>${row.min}</td>
        <td>${row.pts}</td>
        <td>${row.t2i}</td>
        <td>${row.t2c}</td>
        <td>${t2pct}</td>
        <td>${row.t3i}</td>
        <td>${row.t3c}</td>
        <td>${t3pct}</td>
        <td>${row.tlc}</td>
        <td>${row.tli}</td>
        <td>${tlpct}</td>
        <td>${row.ro}</td>
        <td>${row.rd}</td>
        <td>${row.rt}</td>
        <td>${row.as}</td>
        <td>${row.br}</td>
        <td>${row.bp}</td>
        <td>${row.tp}</td>
        <td>${row.fc}</td>
        <td>${row.va}</td>
        <td>${row.pm}</td>
      `;
      tbody.appendChild(tr);
    });
    const totals = calculateTotals(cat.data);
    const totalRow = document.createElement("tr");
    totalRow.classList.add("total-row");
    totalRow.innerHTML = createTotalsRow(totals, "TOTAL");
    tbody.appendChild(totalRow);
    const avg = calculateAverages(cat.data);
    const avgRow = document.createElement("tr");
    avgRow.classList.add("prom-row");
    avgRow.innerHTML = createTotalsRow(avg, "PROM");
    tbody.appendChild(avgRow);
    block.appendChild(title);
    block.appendChild(table);
    container.appendChild(block);
  });
  const grandTotals = calculateTotals(globalData);
  const grandAverages = calculateAverages(globalData);
  const block = document.createElement("div");
  block.classList.add("category-block");
  const title = document.createElement("div");
  title.classList.add("category-title");
  title.textContent = "GRAN TOTAL (todas las categorías)";
  const table = document.createElement("table");
  table.classList.add("stats-table");
  table.innerHTML = `
    <thead>
      <tr>
        <th></th><th></th><th></th><th>Min</th><th>PTS</th><th>T2I</th><th>T2C</th><th>%T2</th>
        <th>T3I</th><th>T3C</th><th>%T3</th><th>TLC</th><th>TLI</th><th>%TL</th>
        <th>RO</th><th>RD</th><th>RT</th><th>AS</th><th>BR</th><th>BP</th><th>TP</th><th>FC</th><th>VA</th><th>+/-</th>
      </tr>
    </thead>
    <tbody>
      <tr class="grand-total-row" id="grandTotalRow"></tr>
      <tr class="grand-total-row" id="grandAvgRow"></tr>
    </tbody>
  `;
  block.appendChild(title);
  block.appendChild(table);
  container.appendChild(block);
  const gTotalRow = document.getElementById("grandTotalRow");
  gTotalRow.innerHTML = createTotalsRow(grandTotals, "TOTAL");
  const gAvgRow = document.getElementById("grandAvgRow");
  gAvgRow.innerHTML = createTotalsRow(grandAverages, "PROM");
}

function createTotalsRow(obj, label) {
  const t2pct = obj.t2i > 0 ? ((obj.t2c / obj.t2i)*100).toFixed(1) : 0;
  const t3pct = obj.t3i > 0 ? ((obj.t3c / obj.t3i)*100).toFixed(1) : 0;
  const tlpct = obj.tli > 0 ? ((obj.tlc / obj.tli)*100).toFixed(1) : 0;
  return `
    <td></td>
    <td></td>
    <td>${label}</td>
    <td>${obj.min.toFixed(0)}</td>
    <td>${obj.pts.toFixed(0)}</td>
    <td>${obj.t2c.toFixed(0)}</td>
    <td>${obj.t2i.toFixed(0)}</td>
    <td>${t2pct}</td>
    <td>${obj.t3c.toFixed(0)}</td>
    <td>${obj.t3i.toFixed(0)}</td>
    <td>${t3pct}</td>
    <td>${obj.tlc.toFixed(0)}</td>
    <td>${obj.tli.toFixed(0)}</td>
    <td>${tlpct}</td>
    <td>${obj.ro.toFixed(0)}</td>
    <td>${obj.rd.toFixed(0)}</td>
    <td>${obj.rt.toFixed(0)}</td>
    <td>${obj.as.toFixed(0)}</td>
    <td>${obj.br.toFixed(0)}</td>
    <td>${obj.bp.toFixed(0)}</td>
    <td>${obj.tp.toFixed(0)}</td>
    <td>${obj.fc.toFixed(0)}</td>
    <td>${obj.va.toFixed(0)}</td>
    <td>${obj.pm.toFixed(0)}</td>
  `;
}

function calculateTotals(rows) {
  const sum = { min: 0, pts: 0, t2i: 0, t2c: 0, t3i: 0, t3c: 0, tlc: 0, tli: 0, ro: 0, rd: 0, rt: 0, as: 0, br: 0, bp: 0, tp: 0, fc: 0, va: 0, pm: 0 };
  rows.forEach(r => {
    sum.min += r.min;
    sum.pts += r.pts;
    sum.t2c += r.t2c;
    sum.t2i += r.t2i;
    sum.t3c += r.t3c;
    sum.t3i += r.t3i;
    sum.tlc += r.tlc;
    sum.tli += r.tli;
    sum.ro += r.ro;
    sum.rd += r.rd;
    sum.rt += r.rt;
    sum.as += r.as;
    sum.br += r.br;
    sum.bp += r.bp;
    sum.tp += r.tp;
    sum.fc += r.fc;
    sum.va += r.va;
    sum.pm += r.pm;
  });
  return sum;
}

function calculateAverages(rows) {
  const total = calculateTotals(rows);
  const n = rows.length;
  if (n === 0) return total;
  for (let k in total) {
    total[k] = total[k] / n;
  }
  return total;
}

function abbreviateTeam(name) {
  return name.slice(0, 3).toUpperCase();
}

/***********************************************
 * GALERÍA DE FOTOS (Modal)
 ***********************************************/
function initPhotoModal() {
  const photoModal = document.getElementById("photoModal");
  const modalImage = document.getElementById("modalImage");
  const captionText = document.getElementById("caption");
  const closeBtn = document.getElementById("photoModalClose");
  if (!photoModal) return;
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
}

// Fetch all players for search bar
let allPlayersList = [];

async function fetchAllPlayers() {
  const response = await fetch('rankings_stats.json');
  const data = await response.json();
  allPlayersList = data.players.map(p => ({
    id: p.id,
    name: p.playerName,
    team: p.teamName,
    photo: p.playerPhoto
  }));
}

// Setup player search bar
function setupPlayerSearchBar() {
  const input = document.getElementById('playerSearchInput');
  const btn = document.getElementById('playerSearchBtn');
  if (!input || !btn) return;

  // Add autocomplete dropdown
  let dropdown;
  input.addEventListener('input', function() {
    const value = this.value.trim().toLowerCase();
    if (dropdown) dropdown.remove();
    if (!value) return;
    const matches = allPlayersList.filter(p => p.name.toLowerCase().includes(value));
    if (matches.length === 0) return;
    dropdown = document.createElement('div');
    dropdown.className = 'player-search-dropdown';
    dropdown.style.position = 'absolute';
    dropdown.style.background = '#fff';
    dropdown.style.color = '#111C4E';
    dropdown.style.border = '1.5px solid #1976d2';
    dropdown.style.borderRadius = '8px';
    dropdown.style.width = input.offsetWidth + 'px';
    dropdown.style.maxHeight = '220px';
    dropdown.style.overflowY = 'auto';
    dropdown.style.zIndex = 1000;
    dropdown.style.left = input.getBoundingClientRect().left + window.scrollX + 'px';
    dropdown.style.top = (input.getBoundingClientRect().bottom + window.scrollY) + 'px';
    matches.forEach(p => {
      const option = document.createElement('div');
      option.style.display = 'flex';
      option.style.alignItems = 'center';
      option.style.padding = '10px 16px';
      option.style.cursor = 'pointer';

      // Player photo
      const img = document.createElement('img');
      img.src = p.photo && p.photo.trim() !== '' ? p.photo : 'player_placeholder.png';
      img.alt = p.name;
      img.style.width = '36px';
      img.style.height = '36px';
      img.style.objectFit = 'cover';
      img.style.borderRadius = '50%';
      img.style.marginRight = '12px';
      img.onerror = function() { this.src = 'player_placeholder.png'; };

      // Player name and team
      const text = document.createElement('span');
      text.textContent = `${p.name} (${toTitleCase(p.team)})`;

      option.appendChild(img);
      option.appendChild(text);

      option.addEventListener('mousedown', () => {
        input.value = p.name;
        window.location.href = `player_profile.html?player_id=${p.id}`;
      });
      dropdown.appendChild(option);
    });
    document.body.appendChild(dropdown);
    // Remove dropdown on blur
    input.addEventListener('blur', () => setTimeout(() => { if (dropdown) dropdown.remove(); }, 150));
  });

  // Search on button click
  btn.addEventListener('click', function() {
    const value = input.value.trim().toLowerCase();
    if (!value) return;
    const found = allPlayersList.find(p => p.name.toLowerCase() === value);
    if (found) {
      window.location.href = `player_profile.html?player_id=${found.id}`;
    } else {
      alert('Jugador no encontrado.');
    }
  });

  // Search on Enter key
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      btn.click();
    }
  });
}

// Initialize player search bar on DOMContentLoaded
fetchAllPlayers().then(setupPlayerSearchBar);

// Responsive Burger Menu for Header
function setupBurgerMenu() {
  const menuToggle = document.querySelector('.menu-toggle');
  const mainNav = document.querySelector('.main-nav');
  let navOverlay = document.querySelector('.nav-overlay');

  // Create overlay if not present
  if (!navOverlay) {
    navOverlay = document.createElement('div');
    navOverlay.className = 'nav-overlay';
    document.body.appendChild(navOverlay);
  }

  function closeMenu() {
    menuToggle.classList.remove('active');
    mainNav.classList.remove('active');
    navOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  menuToggle.addEventListener('click', function() {
    const isActive = menuToggle.classList.toggle('active');
    mainNav.classList.toggle('active');
    navOverlay.classList.toggle('active');
    document.body.style.overflow = isActive ? 'hidden' : '';
  });

  navOverlay.addEventListener('click', closeMenu);

  // Close menu when clicking a nav link (for single-page feel)
  mainNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMenu);
  });
}

// Shot Plot Functionality
let chart = null;
let allShots = [];
let playersData = {};

async function loadShotData() {
  // Get player_id from URL
  const urlParams = new URLSearchParams(window.location.search);
  const playerId = urlParams.get('player_id');
  if (!playerId) return;

  // Get player's competition from already loaded player_totals
  if (!player_totals) {
    console.error('Player data not loaded yet');
    return;
  }

  // Map competition name to JSON file name
  const competitionMappings = {
    "LF CHALLENGE": "players_shots_lf_challenge.json",
    "C ESP CLUBES JR MASC": "players_shots_c_esp_clubes_jr_masc.json",
    "PRIMERA FEB": "players_shots_primera_feb.json",
    "Fase Final 1ª División Femenin": "players_shots_fase_final_1a_división_femenin.json",
    "C ESP CLUBES CAD MASC": "players_shots_c_esp_clubes_cad_masc.json",
    "LF ENDESA": "players_shots_lf_endesa.json",
    "L.F.-2": "players_shots_lf2.json",
    "C ESP CLUBES CAD FEM": "players_shots_c_esp_clubes_cad_fem.json",
    "SEGUNDA FEB": "players_shots_segunda_feb.json",
    "TERCERA FEB": "players_shots_tercera_feb.json",
    "C ESP CLUBES INF FEM": "players_shots_c_esp_clubes_inf_fem.json",
    "C ESP CLUBES INF MASC": "players_shots_c_esp_clubes_inf_masc.json"
  };

  const jsonFileName = competitionMappings[player_totals.competition.trim()];
  if (!jsonFileName) {
    console.error('No shot data available for competition:', player_totals.competition);
    return;
  }

  // Load the league-wide JSON file
  const response = await fetch(`Tiros por liga/${jsonFileName}`);
  const data = await response.json();
  
  // Store all shots data
  playersData = data;
  
  // Only include matches for the selected player
  let playerShots = [];
  if (playerId) {
    playerShots = Object.values(data).flat().filter(shot => shot.player_id === playerId);
  }
  const uniqueMatches = [...new Set(playerShots.map(shot => shot.match))];
  const matchFiltersContainer = document.getElementById('matchFilters');
  matchFiltersContainer.innerHTML = '';
  uniqueMatches.forEach(match => {
    const label = document.createElement('label');
    label.className = 'option';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.name = 'match';
    checkbox.value = match;
    checkbox.addEventListener('change', updateChart);
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(match));
    matchFiltersContainer.appendChild(label);
  });

  // Add event listeners for all checkboxes and inputs
  document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', updateChart);
  });
  document.getElementById('quarterTime').addEventListener('input', updateChart);
  document.getElementById('minDistance').addEventListener('input', updateChart);
  document.getElementById('maxDistance').addEventListener('input', updateChart);

  // Initial chart render
  updateChart();
}

function getSelectedValues(name) {
  return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(cb => cb.value);
}

// Convert MM:SS time string to seconds
function timeToSeconds(timeStr) {
  const [minutes, seconds] = timeStr.split(':').map(Number);
  return minutes * 60 + seconds;
}

// Determine if a shot is a 3-pointer based on distance
function isThreePointer(shot) {
  return shot.desc_tiro && shot.desc_tiro.toUpperCase().includes('TIRO DE 3');
}

function isTwoPointer(shot) {
  return shot.desc_tiro && shot.desc_tiro.toUpperCase().includes('TIRO DE 2');
}

// Get score difference category
function getScoreDiffCategory(diff) {
  if (diff === 0) return 'tied';
  if (diff > 0) {
    if (diff <= 5) return 'ahead_1_5';
    if (diff <= 10) return 'ahead_6_10';
    return 'ahead_10_plus';
  } else {
    diff = Math.abs(diff);
    if (diff <= 5) return 'behind_1_5';
    if (diff <= 10) return 'behind_6_10';
    return 'behind_10_plus';
  }
}

function filterShots() {
  const urlParams = new URLSearchParams(window.location.search);
  const playerId = urlParams.get('player_id');
  if (!playerId) return [];
  
  // Get shots for selected player
  allShots = Object.values(playersData).flat().filter(shot => shot.player_id === playerId);
  
  const selectedMatches = getSelectedValues('match');
  const selectedQuarters = getSelectedValues('quarter');
  const selectedResults = getSelectedValues('result');
  const selectedShotTypes = getSelectedValues('shotType');
  const selectedScoreDiffs = getSelectedValues('scoreDiff');
  const selectedCourtSides = getSelectedValues('courtSide');
  const quarterTime = document.getElementById('quarterTime').value;
  const minDistance = document.getElementById('minDistance').value;
  const maxDistance = document.getElementById('maxDistance').value;

  const filteredShots = allShots.filter(shot => {
    if (selectedMatches.length > 0 && !selectedMatches.includes(shot.match)) return false;
    if (selectedQuarters.length > 0 && !selectedQuarters.includes(shot.cuarto)) return false;
    if (selectedResults.length > 0) {
      if (!selectedResults.includes(shot.made ? 'made' : 'missed')) return false;
    }
    if (selectedShotTypes.length > 0) {
      const isThree = isThreePointer(shot);
      const isTwo = isTwoPointer(shot);
      const isRim = shot.dist_al_aro <= 1.5;
      const isMidrange = shot.dist_al_aro > 1.5 && !isThreePointer(shot);
      const matchesSelectedType = selectedShotTypes.some(type => {
        switch(type) {
          case 'rim': return isRim;
          case 'midrange': return isMidrange;
          case '2': return isTwo;
          case '3': return isThree;
          default: return false;
        }
      });
      if (!matchesSelectedType) return false;
    }
    if (selectedScoreDiffs.length > 0) {
      const scoreDiffCategory = getScoreDiffCategory(shot.dif_marcador);
      if (!selectedScoreDiffs.includes(scoreDiffCategory)) return false;
    }
    if (selectedCourtSides.length > 0) {
      const isLeftSide = shot.coord_y > 50;
      if (!selectedCourtSides.includes(isLeftSide ? 'left' : 'right')) return false;
    }
    // Only filter by quarter time if a value is set
    if (quarterTime) {
      const shotTimeInSeconds = timeToSeconds(shot.tiempo);
      if (shotTimeInSeconds > parseFloat(quarterTime) * 60) return false;
    }
    if (minDistance && shot.dist_al_aro < parseFloat(minDistance)) return false;
    if (maxDistance && shot.dist_al_aro > parseFloat(maxDistance)) return false;
    return true;
  });

  return filteredShots;
}

function updateStats(filteredShots) {
  const urlParams = new URLSearchParams(window.location.search);
  const playerId = urlParams.get('player_id');
  if (!playerId) return;

  // Get player's team from the first shot
  const playerTeam = filteredShots[0]?.equipo_string;
  if (!playerTeam) {
    document.getElementById('fgPercentage').innerHTML = `
      <div style="text-align: center; padding: 20px; color: #666; font-style: italic;">
        No hay tiros que cumplan estos requisitos para el jugador.
      </div>
    `;
    return;
  }

  // Calculate player stats
  const totalShots = filteredShots.length;
  const madeShots = filteredShots.filter(shot => shot.made).length;
  const fgPercentage = totalShots > 0 ? (madeShots / totalShots * 100) : 0;
  
  // Get filter values for calculations
  const selectedMatches = getSelectedValues('match');
  const selectedQuarters = getSelectedValues('quarter');
  const selectedResults = getSelectedValues('result');
  const selectedShotTypes = getSelectedValues('shotType');
  const selectedScoreDiffs = getSelectedValues('scoreDiff');
  const selectedCourtSides = getSelectedValues('courtSide');
  const quarterTime = document.getElementById('quarterTime').value;
  const minDistance = document.getElementById('minDistance').value;
  const maxDistance = document.getElementById('maxDistance').value;

  // Helper function to check if shot matches filters
  function shotMatchesFilters(shot, includeMatches = false) {
    if (selectedQuarters.length > 0 && !selectedQuarters.includes(shot.cuarto)) return false;
      if (selectedResults.length > 0) {
      if (!selectedResults.includes(shot.made ? 'made' : 'missed')) return false;
      }
      if (selectedShotTypes.length > 0) {
        const isThree = isThreePointer(shot);
        const isTwo = isTwoPointer(shot);
        const isRim = shot.dist_al_aro <= 1;
        const isMidrange = shot.dist_al_aro > 1 && shot.dist_al_aro < 6.75;
        const matchesSelectedType = selectedShotTypes.some(type => {
          switch(type) {
            case 'rim': return isRim;
            case 'midrange': return isMidrange;
            case '2': return isTwo;
            case '3': return isThree;
            default: return false;
          }
        });
      if (!matchesSelectedType) return false;
      }
      if (selectedScoreDiffs.length > 0) {
        const scoreDiffCategory = getScoreDiffCategory(shot.dif_marcador);
      if (!selectedScoreDiffs.includes(scoreDiffCategory)) return false;
      }
      if (selectedCourtSides.length > 0) {
        const isLeftSide = shot.coord_y > 50;
      if (!selectedCourtSides.includes(isLeftSide ? 'left' : 'right')) return false;
      }
      const shotTimeInSeconds = timeToSeconds(shot.tiempo);
    if (quarterTime && shotTimeInSeconds > parseFloat(quarterTime) * 60) return false;
    if (minDistance && shot.dist_al_aro < parseFloat(minDistance)) return false;
    if (maxDistance && shot.dist_al_aro > parseFloat(maxDistance)) return false;
    
    if (includeMatches && selectedMatches.length > 0 && !selectedMatches.includes(shot.match)) return false;
    
    return true;
  }

  // Calculate team and league player rankings
  const teamPlayerStats = {};
  const leaguePlayerStats = {};
  
  Object.values(playersData).forEach(playerShots => {
    playerShots.forEach(shot => {
      if (!shotMatchesFilters(shot)) return;
      
      const shotPlayerId = shot.player_id;
      const shotPlayerTeam = shot.equipo_string;
      
      // Initialize player stats if not exists
      if (!leaguePlayerStats[shotPlayerId]) {
        leaguePlayerStats[shotPlayerId] = { made: 0, total: 0, team: shotPlayerTeam };
      }
      
      // Add to league stats
      leaguePlayerStats[shotPlayerId].total++;
      if (shot.made) leaguePlayerStats[shotPlayerId].made++;
      
      // Add to team stats if same team
      if (shotPlayerTeam === playerTeam) {
        if (!teamPlayerStats[shotPlayerId]) {
          teamPlayerStats[shotPlayerId] = { made: 0, total: 0 };
        }
        
        // For team stats, also check match filters
        if (shotMatchesFilters(shot, true)) {
          teamPlayerStats[shotPlayerId].total++;
          if (shot.made) teamPlayerStats[shotPlayerId].made++;
        }
      }
    });
  });

  // Calculate percentages and rankings
  const teamPlayers = Object.entries(teamPlayerStats)
    .filter(([id, stats]) => stats.total > 0)
    .map(([id, stats]) => ({
      id,
      percentage: (stats.made / stats.total) * 100,
      made: stats.made,
      total: stats.total
    }))
    .sort((a, b) => b.percentage - a.percentage);

  const leaguePlayers = Object.entries(leaguePlayerStats)
    .filter(([id, stats]) => stats.total > 0)
    .map(([id, stats]) => ({
      id,
      percentage: (stats.made / stats.total) * 100,
      made: stats.made,
      total: stats.total
    }))
    .sort((a, b) => b.percentage - a.percentage);

  // Find current player rankings
  const teamRank = teamPlayers.findIndex(p => p.id === playerId) + 1;
  const leagueRank = leaguePlayers.findIndex(p => p.id === playerId) + 1;
  
  const teamTotal = teamPlayers.length;
  const leagueTotal = leaguePlayers.length;
  
  // Calculate team and league averages
  const teamFgPercentage = teamPlayers.length > 0 ? 
    teamPlayers.reduce((sum, p) => sum + (p.made / p.total) * 100, 0) / teamPlayers.length : 0;
  const leagueFgPercentage = leaguePlayers.length > 0 ? 
    leaguePlayers.reduce((sum, p) => sum + (p.made / p.total) * 100, 0) / leaguePlayers.length : 0;

  // Helper functions for labels and progress
  function getPerformanceLabel(rank, total) {
    if (total === 0) return 'N/A';
    if (rank === 1) return 'EL MEJOR';
    const percentile = ((total - rank + 1) / total) * 100;
    if (percentile >= 90) return 'ÉLITE';
    if (percentile >= 80) return 'MUY BUENO';
    if (percentile >= 60) return 'BUENO';
    if (percentile >= 40) return 'PROMEDIO';
    if (percentile >= 20) return 'BAJO';
    return 'MUY BAJO';
  }

  function getProgressBarColor(rank, total) {
    if (total === 0) return '#ccc';
    if (rank === 1) return '#1b5e20'; // Even darker green for first rank
    const percentile = ((total - rank + 1) / total) * 100;
    if (percentile >= 90) return '#2e7d32'; // Darker green for elite
    if (percentile >= 80) return '#2e7d32'; // Dark green for very good
    if (percentile >= 60) return '#4caf50'; // Green for good
    if (percentile >= 40) return '#ff9800'; // Orange for average
    if (percentile >= 20) return '#f44336'; // Red for low
    return '#d32f2f'; // Dark red for very low
  }

  function getProgressBarWidth(rank, total) {
    if (total === 0) return 0;
    return Math.max(10, ((total - rank + 1) / total) * 100); // Minimum 10% width for visibility
  }

  // Helper function to get text color based on background color
  function getTextColor(backgroundColor) {
    // For dark colors, use white text; for light colors, use black text
    const darkColors = ['#2e7d32', '#d32f2f', '#1976d2'];
    // Use gold text for first rank EL MEJOR
    if (backgroundColor === '#1b5e20') return 'white';
    return darkColors.includes(backgroundColor) ? 'white' : 'black';
  }

  // Helper function to calculate percentile
  function calculatePercentile(playerPercentage, allPercentages) {
    if (allPercentages.length === 0) return 0;
    const betterCount = allPercentages.filter(p => p < playerPercentage).length;
    return Math.round((betterCount / allPercentages.length) * 100);
  }

  // Helper function to get progress bar color based on percentile
  function getPercentileColor(percentile) {
    if (percentile >= 90) return '#2e7d32'; // Darker green for elite
    if (percentile >= 80) return '#2e7d32'; // Dark green for very good (80-89)
    if (percentile >= 60) return '#4caf50'; // Green for good (60-79)
    if (percentile >= 40) return '#ff9800'; // Orange for average (40-59)
    if (percentile >= 20) return '#f44336'; // Red for low (20-39)
    return '#d32f2f'; // Dark red for very low (0-19)
  }

  // Helper function to get color based on ranking (for consistency between pills and progress bars)
  function getColorFromRank(rank, total) {
    if (total === 0) return '#ccc';
    if (rank === 1) return '#1b5e20'; // Even darker green for first rank (EL MEJOR)
    const percentile = ((total - rank + 1) / total) * 100;
    return getPercentileColor(percentile);
  }

  // Calculate percentiles for team and league comparisons
  const teamPercentages = teamPlayers.map(p => p.percentage);
  const leaguePercentages = leaguePlayers.map(p => p.percentage);
  
  const teamPercentile = calculatePercentile(fgPercentage, teamPercentages);
  const leaguePercentile = calculatePercentile(fgPercentage, leaguePercentages);

  // Calculate relative percentages
  const teamRelativePercentage = fgPercentage - teamFgPercentage;
  const leagueRelativePercentage = fgPercentage - leagueFgPercentage;
  
  // Helper function to get color and sign for relative percentage
  function getRelativePercentageDisplay(difference) {
    if (difference > 0) {
      return {
        color: '#4caf50', // Light green
        text: `+${difference.toFixed(1)}%`
      };
    } else if (difference < 0) {
      return {
        color: '#f44336', // Light red
        text: `${difference.toFixed(1)}%`
      };
    } else {
      return {
        color: '#666', // Gray for no difference
        text: '0.0%'
      };
    }
  }
  
  const teamRelativeDisplay = getRelativePercentageDisplay(teamRelativePercentage);
  const leagueRelativeDisplay = getRelativePercentageDisplay(leagueRelativePercentage);

  // Create the cards grid
  const fgPercentageElement = document.getElementById('fgPercentage');
  
  fgPercentageElement.innerHTML = `
    <div class="fg-cards-grid">
      <!-- Player Card -->
      <div class="fg-card player-card">
        <div class="fg-card-header">
          <h4>Jugador</h4>
    </div>
        <div class="fg-card-body">
          <div class="fg-stat-row">
            <span class="fg-stat-label">%TC</span>
            <span class="fg-stat-value">${fgPercentage.toFixed(1)}% </span>
            <span class="fg-stat-detail">(${madeShots}/${totalShots})</span>
        </div>
    </div>
        </div>

      <!-- Team Card -->
      <div class="fg-card team-card">
        <div class="fg-card-header">
          <h4>Equipo</h4>
    </div>
        <div class="fg-card-body">
          <div class="fg-stat-row">
            <span class="fg-stat-label">%TC</span>
            <span class="fg-stat-value">${teamFgPercentage.toFixed(1)}% </span>
            <span class="fg-stat-detail">(${teamPlayers.reduce((sum, p) => sum + p.made, 0)}/${teamPlayers.reduce((sum, p) => sum + p.total, 0)})</span>
          </div>
          <div class="fg-stat-row">
            <span class="fg-stat-label">%TC relativo del jugador</span>
            <span class="fg-stat-value" style="color: ${teamRelativeDisplay.color}; font-weight: bold;">${teamRelativeDisplay.text}</span>
          </div>
          <div class="fg-stat-row">
            <div class="fg-performance-container" title="Equipo: Ranking ${teamRank} de ${teamTotal} en su equipo (Percentil ${Math.round(((teamTotal - teamRank + 1) / teamTotal) * 100)})">
              <span class="fg-stat-label">Rendimiento con respecto al equipo</span>
              <span class="fg-performance-pill" style="background-color: ${getColorFromRank(teamRank, teamTotal)}; color: ${getTextColor(getColorFromRank(teamRank, teamTotal))};">${getPerformanceLabel(teamRank, teamTotal)}</span>
              <div class="fg-progress-bar-container">
                <div class="fg-progress-bar" style="background-color: ${getColorFromRank(teamRank, teamTotal)}; width: ${teamRank === 1 ? 100 : Math.round(((teamTotal - teamRank + 1) / teamTotal) * 100)}%;"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- League Card -->
      <div class="fg-card league-card">
        <div class="fg-card-header">
          <h4>Liga</h4>
        </div>
        <div class="fg-card-body">
          <div class="fg-stat-row">
            <span class="fg-stat-label">%TC</span>
            <span class="fg-stat-value">${leagueFgPercentage.toFixed(1)}%</span>
            <span class="fg-stat-detail">(${leaguePlayers.reduce((sum, p) => sum + p.made, 0)}/${leaguePlayers.reduce((sum, p) => sum + p.total, 0)})</span>
          </div>
          <div class="fg-stat-row">
            <span class="fg-stat-label">%TC relativo del jugador</span>
            <span class="fg-stat-value" style="color: ${leagueRelativeDisplay.color}; font-weight: bold;">${leagueRelativeDisplay.text}</span>
          </div>
          <div class="fg-stat-row">
            <div class="fg-performance-container" title="Liga: Ranking ${leagueRank} de ${leagueTotal} en la liga (Percentil ${Math.round(((leagueTotal - leagueRank + 1) / leagueTotal) * 100)})">
              <span class="fg-stat-label">Rendimiento con respecto a la liga</span>
              <span class="fg-performance-pill" style="background-color: ${getColorFromRank(leagueRank, leagueTotal)}; color: ${getTextColor(getColorFromRank(leagueRank, leagueTotal))};">${getPerformanceLabel(leagueRank, leagueTotal)}</span>
              <div class="fg-progress-bar-container">
                <div class="fg-progress-bar" style="background-color: ${getColorFromRank(leagueRank, leagueTotal)}; width: ${leagueRank === 1 ? 100 : Math.round(((leagueTotal - leagueRank + 1) / leagueTotal) * 100)}%;"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty Card for 2x2 grid balance -->
      <div class="fg-card empty-card" style="visibility: hidden;">
      </div>
    </div>
  `;
}

function updateSelectedFilters() {
  const selectedFiltersDiv = document.getElementById('selectedFilters');
  if (!selectedFiltersDiv) return;
  
  selectedFiltersDiv.innerHTML = '';
  
  // Helper function to create a filter tag
  function createFilterTag(filterType, value, originalValue) {
    const tag = document.createElement('div');
    tag.className = 'filter-tag';
    tag.dataset.filterType = filterType;
    tag.dataset.filterValue = originalValue;
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'filter-name';
    nameSpan.textContent = value;
    
    const deleteBtn = document.createElement('span');
    deleteBtn.className = 'delete-filter';
    deleteBtn.innerHTML = '×';
    deleteBtn.onclick = function(e) {
      e.stopPropagation();
      
      if (filterType === 'time') {
        // Clear the time input field
        document.getElementById('quarterTime').value = '';
      } else if (filterType === 'distance') {
        // Clear both distance input fields
        document.getElementById('minDistance').value = '';
        document.getElementById('maxDistance').value = '';
      } else {
        // For other filters, uncheck the corresponding checkbox
        const checkbox = document.querySelector(`input[name="${filterType}"][value="${originalValue}"]`);
        if (checkbox) {
          checkbox.checked = false;
        }
      }
      
      // Remove the tag
      tag.remove();
      // Update the chart
      updateChart();
    };
    
    tag.appendChild(nameSpan);
    tag.appendChild(deleteBtn);
    return tag;
  }
  
  // Add match filters
  const selectedMatches = getSelectedValues('match');
  if (selectedMatches.length > 0) {
    selectedMatches.forEach(match => {
      selectedFiltersDiv.appendChild(createFilterTag('match', `Partido: ${match}`, match));
    });
  }
  
  // Add quarter filters
  const selectedQuarters = getSelectedValues('quarter');
  if (selectedQuarters.length > 0) {
    selectedQuarters.forEach(quarter => {
      selectedFiltersDiv.appendChild(createFilterTag('quarter', `Cuarto: ${quarter}`, quarter));
    });
  }
  
  // Add result filters
  const selectedResults = getSelectedValues('result');
  if (selectedResults.length > 0) {
    selectedResults.forEach(result => {
      const displayValue = result === 'made' ? 'Anotado' : 'Fallado';
      selectedFiltersDiv.appendChild(createFilterTag('result', `Resultado: ${displayValue}`, result));
    });
  }
  
  // Add shot type filters
  const selectedShotTypes = getSelectedValues('shotType');
  if (selectedShotTypes.length > 0) {
    selectedShotTypes.forEach(type => {
      let displayName;
      switch(type) {
        case 'rim': displayName = 'Cerca del aro'; break;
        case '2': displayName = 'Tiros de 2'; break;
        case '3': displayName = 'Tiros de 3'; break;
        default: displayName = type;
      }
      selectedFiltersDiv.appendChild(createFilterTag('shotType', `Tipo de Tiro: ${displayName}`, type));
    });
  }
  
  // Add score difference filters
  const selectedScoreDiffs = getSelectedValues('scoreDiff');
  if (selectedScoreDiffs.length > 0) {
    selectedScoreDiffs.forEach(diff => {
      let displayName;
      switch(diff) {
        case 'tied': displayName = 'Empate'; break;
        case 'ahead_1_5': displayName = 'Ganando por 1-5'; break;
        case 'ahead_6_10': displayName = 'Ganando por 6-10'; break;
        case 'ahead_10_plus': displayName = 'Ganando por +10'; break;
        case 'behind_1_5': displayName = 'Perdiendo por 1-5'; break;
        case 'behind_6_10': displayName = 'Perdiendo por 6-10'; break;
        case 'behind_10_plus': displayName = 'Perdiendo por +10'; break;
        default: displayName = diff;
      }
      selectedFiltersDiv.appendChild(createFilterTag('scoreDiff', `Diferencia: ${displayName}`, diff));
    });
  }
  
  // Add court side filters
  const selectedCourtSides = getSelectedValues('courtSide');
  if (selectedCourtSides.length > 0) {
    selectedCourtSides.forEach(side => {
      const displayValue = side === 'left' ? 'Izquierda' : 'Derecha';
      selectedFiltersDiv.appendChild(createFilterTag('courtSide', `Lado: ${displayValue}`, side));
    });
  }
  
  // Add time filter
  const quarterTime = document.getElementById('quarterTime').value;
  if (quarterTime) {
    selectedFiltersDiv.appendChild(createFilterTag('time', `Tiempo: ${quarterTime} min`, quarterTime));
  }
  
  // Add distance filters
  const minDistance = document.getElementById('minDistance').value;
  const maxDistance = document.getElementById('maxDistance').value;
  if (minDistance || maxDistance) {
    let distanceText = 'Distancia: ';
    if (minDistance && maxDistance) {
      distanceText += `${minDistance}-${maxDistance} m`;
    } else if (minDistance) {
      distanceText += `>${minDistance} m`;
    } else {
      distanceText += `<${maxDistance} m`;
    }
    selectedFiltersDiv.appendChild(createFilterTag('distance', distanceText, `${minDistance || ''}-${maxDistance || ''}`));
  }
}

// Call updateSelectedFilters after any filter change and in updateChart
// ... existing code ...
function updateChart() {
  updateSelectedFilters();
  const filteredShots = filterShots();
  
  // Update stats
  updateStats(filteredShots);
  
  // Prepare data for Chart.js scatter plot (only X <= 50)
  const shotData = filteredShots
    .filter(shot => shot.coord_x <= 50)
    .map(shot => ({
      x: shot.coord_x,
      y: shot.coord_y,
      made: shot.made
    }));

  // Create a canvas if not present
  let canvas = document.getElementById('shotsChart');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'shotsChart';
    document.body.appendChild(canvas);
  }

  // Load the court image
  const courtImg = new Image();
  courtImg.src = 'court.png';

  // Wait for the image to load before rendering the chart
  courtImg.onload = function() {
    if (chart) {
      chart.destroy();
    }

    chart = new Chart(canvas.getContext('2d'), {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: 'Tiros Anotados',
            data: shotData.filter(shot => shot.made),
            backgroundColor: 'rgba(0, 255, 0, 0.7)'
          },
          {
            label: 'Tiros Fallados',
            data: shotData.filter(shot => !shot.made),
            backgroundColor: 'rgba(255, 0, 0, 0.7)'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 425/474,
        pointRadius: 6,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 20,
              font: {
                size: 14
              }
            }
          },
          tooltip: {
            enabled: false
          }
        },
        scales: {
          x: {
            type: 'linear',
            position: 'bottom',
            title: { display: false },
            min: 0,
            max: 50,
            ticks: { display: false },
            grid: { display: false }
          },
          y: {
            type: 'linear',
            title: { display: false },
            reverse: true,
            min: 0,
            max: 100,
            ticks: { display: false },
            grid: { display: false }
          }
        }
      },
      plugins: [{
        id: 'courtBackground',
        beforeDraw: (chart) => {
          const {ctx, chartArea} = chart;
          if (courtImg.complete && chartArea) {
            ctx.save();
            ctx.globalAlpha = 1.0;
            ctx.beginPath();
            ctx.rect(chartArea.left, chartArea.top, chartArea.width, chartArea.height);
            ctx.clip();
            ctx.drawImage(
              courtImg,
              0, 0, courtImg.width / 2, courtImg.height,
              chartArea.left, chartArea.top, chartArea.width, chartArea.height
            );
            ctx.restore();
          }
        }
      }]
    });
  };
}

// Add these functions to handle the dropdown functionality
function toggleDropdown(id) {
  const options = document.getElementById(id + 'Options');
  options.classList.toggle('active');
}

function selectAll(id) {
  const options = document.querySelectorAll(`#${id}Options input[type="checkbox"]`);
  options.forEach(option => option.checked = true);
  updateChart();
}

function deselectAll(id) {
  const options = document.querySelectorAll(`#${id}Options input[type="checkbox"]`);
  options.forEach(option => option.checked = false);
  updateChart();
}

function filterOptions(id) {
  const input = document.querySelector(`#${id}Options .select-search input`);
  const filter = input.value.toLowerCase();
  const options = document.querySelectorAll(`#${id}Options .option`);
  
  options.forEach(option => {
    const text = option.querySelector('span').textContent.toLowerCase();
    option.style.display = text.includes(filter) ? '' : 'none';
  });
}

// Close dropdowns when clicking outside
document.addEventListener('click', function(event) {
  const dropdowns = document.querySelectorAll('.select-options');
  dropdowns.forEach(dropdown => {
    if (!dropdown.contains(event.target) && !event.target.closest('.select-header')) {
      dropdown.classList.remove('active');
    }
  });
});

// Initialize shot plot when the page loads
window.addEventListener('load', async () => {
  await loadStats();
  loadShotData();
});

// Enforce min/max for time and distance filters
function enforceInputLimits(inputId, min, max) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.addEventListener('input', function() {
    let value = parseFloat(this.value);
    if (isNaN(value)) return;
    if (value < min) this.value = min;
    if (value > max) this.value = max;
  });
}

document.addEventListener('DOMContentLoaded', function() {
  enforceInputLimits('quarterTime', 0, 10);
  enforceInputLimits('minDistance', 0, 20);
  enforceInputLimits('maxDistance', 0, 20);
});

// Add Reset Filters functionality
function resetFilters() {
  // Uncheck all checkboxes
  document.querySelectorAll('#shotsSection input[type="checkbox"]').forEach(cb => { cb.checked = false; });
  // Clear all number inputs
  document.querySelectorAll('#shotsSection input[type="number"]').forEach(input => { input.value = ''; });
  // Update filters and chart
  updateSelectedFilters();
  updateChart();
}

document.addEventListener('DOMContentLoaded', function() {
  // ... existing code ...
  const resetBtn = document.getElementById('resetFiltersBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', resetFilters);
  }
});

// Add the getRivalTeamLogo function (add this after the existing helper functions)
function getRivalTeamLogo(rivalTeamName, allPlayers) {
  // Find a player from the rival team to get their team logo
  const rivalPlayer = allPlayers.find(p => p.teamName === rivalTeamName);
  return rivalPlayer ? rivalPlayer.teamLogo : null;
}

function buscarJugador() {
  const input = document.getElementById('playerSearchInput');
  const query = input.value.trim().toLowerCase();
  // Aquí deberías filtrar la lista de jugadores según el query
  // Si ya tienes una función de búsqueda, llama a esa función aquí
  if (typeof filtrarJugadores === 'function') {
    filtrarJugadores(query);
  } else {
    // Si no existe, puedes implementar el filtrado aquí
    // Por ejemplo, ocultar/mostrar elementos de la lista de jugadores
    // ...
  }
}