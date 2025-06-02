const queryParams = new URLSearchParams(window.location.search);

// Get specific parameter
const player_id = queryParams.get('player_id');

console.log(player_id);

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
    "C ESP CLUBES INF MASC": "Clubes Infantil Masculino"
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

  // Find player totals
  player_totals = data.players.find(player => player.id === player_id);

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
    player_photo.onerror = function() {
      if (this.src.indexOf('player_placeholder.png') === -1) {
        this.src = 'player_placeholder.png';
      }
    };
  }

  // Update player main info with team, competition, and gender
  const player_main_info = document.querySelector('.player-main-info');
  if (player_main_info) {
    const team = toTitleCase(player_totals.teamName);
    const competition = formatCompetitionName(player_totals.competition);
    const gender = player_totals.gender === "M" ? "Femenino" : "Masculino";
    player_main_info.innerHTML = `
      Equipo: ${team}<br>
      Competición: ${competition}<br>
      Género: ${gender}
    `;
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
    scatterCanvas.height = '100%';
    scatterCanvas.width = '100%';
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
      const barCanvas = document.createElement('canvas');
      barCanvas.id = 'shootingPercentagesChart';
      barCanvas.height = 120;
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
      new Chart(ctxBar, {
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
              borderWidth: 2,
              borderRadius: 8,
              maxBarThickness: 60
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
              borderWidth: 2,
              borderRadius: 8,
              maxBarThickness: 60
            }
          ]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: true, position: 'top' },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`;
                }
              }
            },
            title: {
              display: true,
              text: 'Porcentajes de tiro',
              font: { size: 16, weight: 'bold' }
            }
          },
          scales: {
            x: {
              title: { display: false },
              grid: { display: false }
            },
            y: {
              beginAtZero: true,
              max: 100,
              ticks: {
                callback: function(value) {
                  return value + '%';
                },
                stepSize: 20
              },
              title: { display: false },
              grid: { color: 'rgba(0,0,0,0.07)' }
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
      // Convert minutes string to total minutes as float
      dataArr = player_totals.matches.map(match => parseMinutes(match.minutes));
    } else {
      dataArr = player_totals.matches.map(match => match[statKey]);
    }
    const statLabel = statOptions.find(opt => opt.value === statKey)?.label || statKey;
    if (window.pointsEvolutionChart && typeof window.pointsEvolutionChart.destroy === 'function') {
      window.pointsEvolutionChart.destroy();
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
    const showAverages = valueTypeSelector ? valueTypeSelector.value === 'average' : false;
    
    // Get all players in the same competition
    const allPlayers = Array.isArray(data.players) ? data.players : [];
    const compPlayers = allPlayers.filter(p => p.competition === player_totals.competition);
    
    // Prepare scatter data
    const scatterData = compPlayers.map((p, i) => {
      const isCurrent = p.id === player_totals.id;
      // Use p.seconds for total minutes played
      const xVal = p.seconds ? p.seconds / 60 : 0;
      let yVal;
      if (statKey === 'min') {
        yVal = xVal;
      } else {
        yVal = showAverages ? p[statKey] / p.games : p[statKey];
      }
      return {
        x: xVal,
        y: yVal,
        playerName: p.playerName,
        isCurrent,
        stat: yVal,
        min: xVal,
        games: p.games
      };
    });
    
    // Get stat label
    const statLabel = statOptions.find(opt => opt.value === statKey)?.label || statKey;
    // Calculate average minutes for the competition
    const avgMinutes = compPlayers.length > 0 ? compPlayers.reduce((sum, p) => sum + (p.seconds || 0), 0) / 60 / compPlayers.length : 0;
    
    // Destroy previous chart if exists
    if (window.pointsScatterChart && typeof window.pointsScatterChart.destroy === 'function') {
      window.pointsScatterChart.destroy();
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
            pointRadius: 6,
            pointHoverRadius: 8,
            showLine: false
          },
          {
            label: player_totals.playerName,
            data: scatterData.filter(d => d.isCurrent),
            backgroundColor: 'rgba(255, 158, 27, 1)', // fully opaque
            borderColor: '#C8102E', // contrasting border
            borderWidth: 1,
            pointRadius: 14,
            pointHoverRadius: 18,
            showLine: false
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { 
            display: true,
            position: 'top',
            align: 'start',
            labels: {
              boxWidth: 20,
              padding: 20,
              font: {
                size: 14,
                weight: 'bold'
              },
              generateLabels: function(chart) {
                const datasets = chart.data.datasets;
                return datasets.map((dataset, i) => {
                  const currentPlayer = dataset.data[0];
                  if (i === 1) { // Current player dataset
                    return {
                      text: `${dataset.label}: ${Math.round(currentPlayer.stat)} ${statLabel}${showAverages ? '/partido' : ''}`,
                      fillStyle: dataset.backgroundColor,
                      strokeStyle: dataset.borderColor,
                      lineWidth: dataset.borderWidth,
                      hidden: false,
                      index: i
                    };
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
                  `${yLabel}: ${yValue}${showAverages ? '/partido' : ''}`,
                  `${xLabel}: ${xValue}`,
                  showAverages ? `Partidos jugados: ${d.games}` : ''
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
                borderWidth: 2,
                borderDash: [6, 6],
                label: {
                  content: 'Media',
                  enabled: true,
                  position: 'start',
                  color: '#1976d2',
                  font: { weight: 'bold' }
                }
              }
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: 'Minutos jugados' },
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return Math.round(value);
              }
            }
          },
          y: {
            title: { 
              display: true, 
              text: showAverages ? `${statLabel} por partido` : statLabel 
            },
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                if (statKey === 'min') {
                  return formatMinutes(value);
                }
                if (showAverages) {
                  return value % 1 === 0 ? value : value.toFixed(1);
                } else {
                  return Number.isInteger(value) ? value : '';
                }
              }
            }
          }
        }
      }
    });
  }

  // Initial draw (default to points)
  if (document.getElementById('statSelector') && document.getElementById('scatterStatSelector')) {
    const statKey = document.getElementById('statSelector').value;
    const scatterStatKey = document.getElementById('scatterStatSelector').value;
    drawStatChart(statKey);
    drawPointsScatter(scatterStatKey);

    // Add event listener for stat selector (line chart)
    document.getElementById('statSelector').addEventListener('change', function() {
      drawStatChart(this.value);
    });

    // Add event listener for scatter stat selector (scatter chart)
    document.getElementById('scatterStatSelector').addEventListener('change', function() {
      drawPointsScatter(this.value);
    });

    // Add event listener for value type selector (scatter chart)
    const valueTypeSelector = document.getElementById('valueTypeSelector');
    if (valueTypeSelector) {
      valueTypeSelector.addEventListener('change', function() {
        drawPointsScatter(document.getElementById('scatterStatSelector').value);
      });
    }
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

        // Update record value
        card.querySelector('.record-value').textContent = maxMatch[record.field];
        
        // Update record details
        card.querySelector('.record-details').innerHTML = `
          <p>Rival: ${toTitleCase(maxMatch.rival)}</p>
          <p>Fecha: ${maxMatch.matchDate}</p>
          <a href="#">Ver Video</a>
        `;
      });
    }
  });
  
  // Fill stats container with matches table
  const statsContainer = document.getElementById('statsContainer');
  if (statsContainer && player_totals.matches) {
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
        <th data-sort="t2i">T2I</th>
        <th data-sort="t2c">T2C</th>
        <th data-sort="t2pct">%T2</th>
        <th data-sort="t3i">T3I</th>
        <th data-sort="t3c">T3C</th>
        <th data-sort="t3pct">%T3</th>
        <th data-sort="tli">TLI</th>
        <th data-sort="tlc">TLC</th>
        <th data-sort="t2pct">%TL</th>
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
      // Remove special characters and split into words
      const words = teamName.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/);
      let acronym = '';
      
      // Get first letter of each word until we have 3 letters
      for (const word of words) {
        if (word.length > 0) {
          acronym += word[0].toUpperCase();
          if (acronym.length === 3) break;
        }
      }
      
      return acronym;
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

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${onlyDate}</td>
        <td title="${match.rival}">${teamAcronym}</td>
        <td>${formatResult(match.marcador)}</td>
        <td>${match.minutes}</td>
        <td>${match.pts}</td>
        <td>${match.t2i}</td>
        <td>${match.t2c}</td>
        <td>${t2pct}</td>
        <td>${match.t3i}</td>
        <td>${match.t3c}</td>
        <td>${t3pct}</td>
        <td>${match.tli}</td>
        <td>${match.tlc}</td>
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
      const rows = Array.from(tbody.querySelectorAll('tr:not(.total-row):not(.prom-row)'));
      const totalRow = tbody.querySelector('.total-row');
      const promRow = tbody.querySelector('.prom-row');

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
      .chart-with-card {
        display: flex;
        flex-direction: row;
        align-items: stretch;
        gap: 24px;
        margin-bottom: 32px;
        height: 400px;
        width: 90%;
        margin-left: auto;
        margin-right: auto;
      }
      .chart-info-card {
        background: #f9f9f9;
        border: none;
        border-radius: 8px;
        padding: 20px;
        flex: 0 0 20%;
        width: 20%;
        height: 80%;
        align-self: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        box-shadow: 0 2px 5px rgba(0,0,0,0.15);
        color: #111C4E;
      }
      #evolutionChartContainer, #scatterChartContainer {
        flex: 0 0 80%;
        width: 80%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
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

    const totalRow = document.createElement('tr');
    totalRow.classList.add('total-row');
    totalRow.innerHTML = `
      <td colspan="3">TOTAL</td>
      <td>${formatMinutes(totals.min)}</td>
      <td>${totals.pts}</td>
      <td>${totals.t2i}</td>
      <td>${totals.t2c}</td>
      <td>${totalT2Pct}</td>
      <td>${totals.t3i}</td>
      <td>${totals.t3c}</td>
      <td>${totalT3Pct}</td>
      <td>${totals.tli}</td>
      <td>${totals.tlc}</td>
      <td>${totalTLPct}</td>
      <td>${totals.ro}</td>
      <td>${totals.rd}</td>
      <td>${totals.rt}</td>
      <td>${totals.as}</td>
      <td>${totals.br}</td>
      <td>${totals.bp}</td>
      <td>${totals.tp}</td>
      <td>${totals.fc}</td>
      <td>${totals.va}</td>
      <td>${totals.pm}</td>
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
      <td colspan="3">PROMEDIO</td>
      <td>${formatMinutes(averages.min)}</td>
      <td>${averages.pts}</td>
      <td>${averages.t2i}</td>
      <td>${averages.t2c}</td>
      <td>${totalT2Pct}</td>
      <td>${averages.t3i}</td>
      <td>${averages.t3c}</td>
      <td>${totalT3Pct}</td>
      <td>${averages.tli}</td>
      <td>${averages.tlc}</td>
      <td>${totalTLPct}</td>
      <td>${averages.ro}</td>
      <td>${averages.rd}</td>
      <td>${averages.rt}</td>
      <td>${averages.as}</td>
      <td>${averages.br}</td>
      <td>${averages.bp}</td>
      <td>${averages.tp}</td>
      <td>${averages.fc}</td>
      <td>${averages.va}</td>
      <td>${averages.pm}</td>
    `;
    tbody.appendChild(avgRow);

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
    <td>${obj.t2i.toFixed(0)}</td>
    <td>${obj.t2c.toFixed(0)}</td>
    <td>${t2pct}</td>
    <td>${obj.t3i.toFixed(0)}</td>
    <td>${obj.t3c.toFixed(0)}</td>
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
    sum.t2i += r.t2i;
    sum.t2c += r.t2c;
    sum.t3i += r.t3i;
    sum.t3c += r.t3c;
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