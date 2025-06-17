let playerPhotos = {};
let tableData = {};
let currentLineupType = 'five';
let selectedPlayers = new Set();
let selectedPlayersOff = new Set();
let allPlayers = new Set();
let showPer100 = false;
let minPossessions = null;
let maxPossessions = null;
let visibleColumns = new Set(['PTS', 'PTSC', 'T2I', 'T2C', 'T3I', 'T3C', 'T1I', 'T1C', 
                            'AST', 'REB', 'REBD', 'REBO', 'PER', 'ROB', 'TAP', 'TAPC', 
                            'FC', 'FR', '+/-', 'Posesiones']);
let currentSort = {
    column: null,
    direction: 'desc'
};

// Load player photos
fetch('fotos_barsa_lineups.json')
    .then(response => response.json())
    .then(data => {
        playerPhotos = data;
        loadAllLineupData();
    })
    .catch(error => console.error('Error loading player photos:', error));

function loadAllLineupData() {
    const lineupFiles = {
        'five': 'barsa_lineups_stats.csv',
        'four': 'four_man_lineups.csv',
        'three': 'three_man_lineups.csv',
        'two': 'two_man_lineups.csv'
    };

    // Load all lineup data
    Object.entries(lineupFiles).forEach(([type, file]) => {
        fetch(file)
            .then(response => response.text())
            .then(data => {
                Papa.parse(data, {
                    delimiter: ";",
                    header: true,
                    complete: function(results) {
                        // Filter out rows with invalid player names
                        tableData[type] = results.data.filter(row => {
                            if (!row.Quinteto) return false;
                            const players = row.Quinteto.split(' - ');
                            return players.every(player => player && player.trim() !== '');
                        });
                        
                        // Collect all unique players
                        tableData[type].forEach(row => {
                            const players = row.Quinteto.split(' - ');
                            players.forEach(player => allPlayers.add(player));
                        });
                        
                        if (type === currentLineupType) {
                            updatePlayerCheckboxes();
                            renderTable(tableData[type]);
                            updateTableHeaders();
                        }
                    }
                });
            })
            .catch(error => console.error(`Error loading ${type} lineup data:`, error));
    });
}

function calculatePer100(value, possessions) {
    if (!possessions || possessions === 0) return 0;
    return (value / possessions) * 100;
}

function formatNumber(value, lineupType) {
    if (showPer100) {
        // For per 100 stats, always show 1 decimal place
        return value.toFixed(1);
    }
    
    if (lineupType === 'five') {
        return value || '0';
    }
    // For 2, 3, and 4 man lineups, convert to integer
    const num = parseFloat(value) || 0;
    return Math.round(num).toString();
}

// Add modal functionality
function showErrorModal(message) {
    const modal = document.getElementById('errorModal');
    const modalMessage = document.getElementById('modalMessage');
    const closeButton = document.querySelector('.close-modal');
    const modalCloseButton = document.getElementById('modalCloseButton');
    
    modalMessage.textContent = message;
    modal.classList.add('show');
    
    const closeModal = () => {
        modal.classList.remove('show');
    };
    
    closeButton.onclick = closeModal;
    modalCloseButton.onclick = closeModal;
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeModal();
        }
    };
}

function updatePlayerCheckboxes() {
    const playerCheckboxes = document.getElementById('playerCheckboxes');
    const playerOffCheckboxes = document.getElementById('playerOffCheckboxes');
    const filterInfo = document.getElementById('playerFilterInfo');
    const filterOffInfo = document.getElementById('playerOffFilterInfo');
    
    // Clear existing checkboxes
    playerCheckboxes.innerHTML = '';
    playerOffCheckboxes.innerHTML = '';
    
    const maxPlayers = {
        'five': 5,
        'four': 4,
        'three': 3,
        'two': 2
    }[currentLineupType];
    
    // Add checkboxes for each player
    Array.from(allPlayers).sort().forEach(player => {
        // On-court player checkbox
        const checkboxContainer = document.createElement('div');
        checkboxContainer.className = 'player-checkbox-container';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `player-${player}`;
        checkbox.value = player;
        checkbox.checked = selectedPlayers.has(player);
        checkbox.disabled = !checkbox.checked && selectedPlayers.size >= maxPlayers;
        
        const label = document.createElement('label');
        label.htmlFor = `player-${player}`;
        
        // Add player photo
        const photo = document.createElement('img');
        photo.className = 'filter-player-photo';
        photo.src = playerPhotos[player] || 'https://via.placeholder.com/30';
        photo.alt = player;
        photo.title = player;
        
        // Add player name
        const nameSpan = document.createElement('span');
        nameSpan.textContent = player;
        
        label.appendChild(photo);
        label.appendChild(nameSpan);
        
        checkboxContainer.appendChild(checkbox);
        checkboxContainer.appendChild(label);
        playerCheckboxes.appendChild(checkboxContainer);
        
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                if (selectedPlayers.size < maxPlayers) {
                    if (selectedPlayersOff.has(player)) {
                        showErrorModal(`No se puede seleccionar a ${player} en pista y fuera de pista al mismo tiempo. ¡Eso sería una paradoja de la física!`);
                        checkbox.checked = false;
                        return;
                    }
                    selectedPlayers.add(player);
                }
            } else {
                selectedPlayers.delete(player);
            }
            updatePlayerCheckboxes();
            updateFilterInfo();
            if (tableData[currentLineupType]) {
                renderTable(tableData[currentLineupType]);
            }
        });

        // Off-court player checkbox
        const checkboxContainerOff = document.createElement('div');
        checkboxContainerOff.className = 'player-checkbox-container';
        
        const checkboxOff = document.createElement('input');
        checkboxOff.type = 'checkbox';
        checkboxOff.id = `player-off-${player}`;
        checkboxOff.value = player;
        checkboxOff.checked = selectedPlayersOff.has(player);
        
        const labelOff = document.createElement('label');
        labelOff.htmlFor = `player-off-${player}`;
        
        // Add player photo
        const photoOff = document.createElement('img');
        photoOff.className = 'filter-player-photo';
        photoOff.src = playerPhotos[player] || 'https://via.placeholder.com/30';
        photoOff.alt = player;
        photoOff.title = player;
        
        // Add player name
        const nameSpanOff = document.createElement('span');
        nameSpanOff.textContent = player;
        
        labelOff.appendChild(photoOff);
        labelOff.appendChild(nameSpanOff);
        
        checkboxContainerOff.appendChild(checkboxOff);
        checkboxContainerOff.appendChild(labelOff);
        playerOffCheckboxes.appendChild(checkboxContainerOff);
        
        checkboxOff.addEventListener('change', () => {
            if (checkboxOff.checked) {
                if (selectedPlayers.has(player)) {
                    showErrorModal(`No se puede seleccionar a ${player} en pista y fuera de pista al mismo tiempo. ¡Eso sería una paradoja de la física!`);
                    checkboxOff.checked = false;
                    return;
                }
                selectedPlayersOff.add(player);
            } else {
                selectedPlayersOff.delete(player);
            }
            updateFilterOffInfo();
            if (tableData[currentLineupType]) {
                renderTable(tableData[currentLineupType]);
            }
        });
    });
}

function updateFilterInfo() {
    const filterInfo = document.getElementById('playerFilterInfo');
    const maxPlayers = {
        'five': 5,
        'four': 4,
        'three': 3,
        'two': 2
    }[currentLineupType];
    
    if (selectedPlayers.size === 0) {
        filterInfo.textContent = '';
    } else if (selectedPlayers.size > maxPlayers) {
        filterInfo.textContent = `Demasiados jugadores seleccionados (${selectedPlayers.size}). Máximo permitido: ${maxPlayers}`;
    } else {
        filterInfo.textContent = `Mostrando quintetos que incluyen a: ${Array.from(selectedPlayers).join(', ')}`;
    }
}

function updateFilterOffInfo() {
    const filterOffInfo = document.getElementById('playerOffFilterInfo');
    if (selectedPlayersOff.size > 0) {
        filterOffInfo.textContent = `Mostrando quintetos que NO incluyen a: ${Array.from(selectedPlayersOff).join(', ')}`;
    } else {
        filterOffInfo.textContent = '';
    }
}

function filterLineups(data) {
    return data.filter(row => {
        // Check if lineup includes all selected players
        const players = row.Quinteto.split(' - ');
        const hasAllSelectedPlayers = Array.from(selectedPlayers).every(player => 
            players.includes(player)
        );

        // Check if lineup excludes all selected off-court players
        const hasNoOffCourtPlayers = Array.from(selectedPlayersOff).every(player => 
            !players.includes(player)
        );

        // Check possessions filter
        const possessions = parseFloat(row['Posesiones']) || 0;
        const meetsPossessionsFilter = (!minPossessions || possessions >= minPossessions) && 
                                     (!maxPossessions || possessions <= maxPossessions);

        return hasAllSelectedPlayers && hasNoOffCourtPlayers && meetsPossessionsFilter;
    });
}

function getColumnStats(data, column) {
    const values = data.map(row => parseFloat(row[column]) || 0);
    return {
        min: Math.min(...values),
        max: Math.max(...values)
    };
}

function getColorForValue(value, min, max) {
    // If min equals max, use a neutral color (middle of the gradient)
    if (min === max) {
        return 'rgb(205, 205, 155)';
    }
    
    // Normalize value between 0 and 1
    const normalized = (value - min) / (max - min);
    
    // Create a gradient from light red to light green
    const red = Math.round(255 - (normalized * 100)); // Start at 255 (light red), decrease to 155
    const green = Math.round(155 + (normalized * 100)); // Start at 155, increase to 255 (light green)
    const blue = 155; // Keep blue constant for a neutral tone
    
    return `rgb(${red}, ${green}, ${blue})`;
}

function renderTable(data) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    
    const filteredData = filterLineups(data);

    if (filteredData.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = visibleColumns.size + 1; // +1 for the lineup column
        td.textContent = 'No hay quintetos que cumplan los filtros elegidos.';
        td.style.textAlign = 'center';
        td.style.padding = '20px';
        td.style.color = '#666';
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
    }

    // Calculate min/max for each numeric column
    const columnStats = {};
    Array.from(visibleColumns).forEach(col => {
        columnStats[col] = getColumnStats(filteredData, col);
    });

    filteredData.forEach(row => {
        const tr = document.createElement('tr');
        
        // Create lineup cell with player photos
        const lineupCell = document.createElement('td');
        const playerPhotosDiv = document.createElement('div');
        playerPhotosDiv.className = 'player-photos';
        
        const players = row.Quinteto.split(' - ');
        players.forEach(player => {
            const photoUrl = playerPhotos[player] || 'https://via.placeholder.com/60';
            const playerContainer = document.createElement('div');
            playerContainer.className = 'player-container';
            playerContainer.innerHTML = `
                <img src="${photoUrl}" alt="${player}" class="player-photo" title="${player}">
                <div class="player-name">${player}</div>
            `;
            playerPhotosDiv.appendChild(playerContainer);
        });
        
        lineupCell.appendChild(playerPhotosDiv);
        tr.appendChild(lineupCell);

        // Add numeric columns with color gradient
        Array.from(visibleColumns).forEach(col => {
            const td = document.createElement('td');
            let value = parseFloat(row[col]) || 0;
            
            // Calculate per 100 possessions if toggle is on and it's not the possessions column
            if (showPer100 && col !== 'Posesiones') {
                const possessions = parseFloat(row['Posesiones']) || 0;
                value = calculatePer100(value, possessions);
            }
            
            td.textContent = formatNumber(value, currentLineupType);
            
            // Apply color gradient
            const stats = columnStats[col];
            td.style.backgroundColor = getColorForValue(value, stats.min, stats.max);
            
            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });
}

function sortTable(column) {
    // If clicking the same column, toggle direction. Otherwise, default to desc.
    if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = column;
        currentSort.direction = 'desc';
    }

    // Update visual indicators in headers
    document.querySelectorAll('th').forEach(th => {
        th.classList.remove('sorted', 'asc', 'desc');
        if (th.dataset.column === column) {
            th.classList.add('sorted', currentSort.direction);
        }
    });

    // Get the data to sort
    const data = tableData[currentLineupType];
    if (!data) return;

    // Sort the data
    const sortedData = [...data].sort((a, b) => {
        // Get the current values (either raw or per 100 possessions)
        let valueA = parseFloat(a[column]) || 0;
        let valueB = parseFloat(b[column]) || 0;

        // If per 100 possessions is enabled and it's not the possessions column
        if (showPer100 && column !== 'Posesiones') {
            const possessionsA = parseFloat(a['Posesiones']) || 0;
            const possessionsB = parseFloat(b['Posesiones']) || 0;
            valueA = calculatePer100(valueA, possessionsA);
            valueB = calculatePer100(valueB, possessionsB);
        }

        // Sort based on direction
        return currentSort.direction === 'asc' ? valueA - valueB : valueB - valueA;
    });

    // Render the sorted data
    renderTable(sortedData);
}

// Setup collapsible sections
document.querySelectorAll('.collapsible').forEach(section => {
    // Add collapsed class by default
    section.classList.add('collapsed');
    
    // Add click handler to header
    const header = section.querySelector('.collapsible-header');
    header.addEventListener('click', () => {
        section.classList.toggle('collapsed');
    });
});

// Setup tab switching
document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
        // Update active tab
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // Update current lineup type
        currentLineupType = button.dataset.lineup;
        
        // Clear selected players and possession filters when changing lineup type
        selectedPlayers.clear();
        selectedPlayersOff.clear();
        minPossessions = null;
        maxPossessions = null;
        document.getElementById('minPossessions').value = '';
        document.getElementById('maxPossessions').value = '';
        
        // Reset sorting state
        currentSort = { column: null, direction: 'desc' };
        
        // Remove sorting classes from all headers
        document.querySelectorAll('th').forEach(th => {
            th.classList.remove('sorted', 'asc', 'desc');
        });
        
        if (tableData[currentLineupType]) {
            updatePlayerCheckboxes();
            updateFilterInfo();
            updateFilterOffInfo();
            updateTableHeaders();
        }
    });
});

// Setup scroll arrows
document.getElementById('scrollLeft').addEventListener('click', () => {
    const wrapper = document.querySelector('.table-scroll-wrapper');
    wrapper.scrollBy({ left: -200, behavior: 'smooth' });
});

document.getElementById('scrollRight').addEventListener('click', () => {
    const wrapper = document.querySelector('.table-scroll-wrapper');
    wrapper.scrollBy({ left: 200, behavior: 'smooth' });
});

// Setup per 100 toggle
document.getElementById('per100Toggle').addEventListener('change', (e) => {
    showPer100 = e.target.checked;
    // Reset sorting state
    currentSort.column = null;
    currentSort.direction = 'desc';
    // Remove sorting classes from all headers
    document.querySelectorAll('th').forEach(th => {
        th.classList.remove('sorted', 'asc', 'desc');
    });
    if (tableData[currentLineupType]) {
        // Reinitialize table headers
        const headerRow = document.querySelector('thead tr');
        headerRow.innerHTML = '<th>Jugadores en pista</th>'; // Always show lineup column
        Array.from(visibleColumns).forEach(col => {
            const th = document.createElement('th');
            th.textContent = col;
            th.dataset.column = col;
            th.addEventListener('click', () => sortTable(col));
            headerRow.appendChild(th);
        });
        renderTable(tableData[currentLineupType]);
    }
});

// Setup possession filter
document.getElementById('minPossessions').addEventListener('input', (e) => {
    minPossessions = e.target.value ? parseInt(e.target.value) : null;
    if (tableData[currentLineupType]) {
        renderTable(tableData[currentLineupType]);
    }
});

document.getElementById('maxPossessions').addEventListener('input', (e) => {
    maxPossessions = e.target.value ? parseInt(e.target.value) : null;
    if (tableData[currentLineupType]) {
        renderTable(tableData[currentLineupType]);
    }
});

document.getElementById('resetPossessions').addEventListener('click', () => {
    document.getElementById('minPossessions').value = '';
    document.getElementById('maxPossessions').value = '';
    minPossessions = null;
    maxPossessions = null;
    if (tableData[currentLineupType]) {
        renderTable(tableData[currentLineupType]);
    }
});

// Setup column visibility
document.querySelectorAll('.column-checkboxes input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
        const column = checkbox.dataset.column;
        if (checkbox.checked) {
            visibleColumns.add(column);
        } else {
            visibleColumns.delete(column);
        }
        
        // Update table headers
        const headerRow = document.querySelector('thead tr');
        headerRow.innerHTML = '<th>Jugadores en pista</th>'; // Always show lineup column
        Array.from(visibleColumns).forEach(col => {
            const th = document.createElement('th');
            th.textContent = col;
            th.dataset.column = col;
            th.addEventListener('click', () => sortTable(col));
            
            // Add sort indicator if this column is currently sorted
            if (currentSort.column === col) {
                th.classList.add('sorted', currentSort.direction);
            }
            
            headerRow.appendChild(th);
        });
        
        if (tableData[currentLineupType]) {
            renderTable(tableData[currentLineupType]);
        }
    });
});

// Dropdown functionality
const dropdownButton = document.querySelector('.dropdown-button');
const dropdown = document.querySelector('.dropdown');

dropdownButton.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('active');
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target)) {
        dropdown.classList.remove('active');
    }
});

// Select/Deselect all functionality
document.getElementById('selectAllColumns').addEventListener('click', () => {
    document.querySelectorAll('.column-checkboxes input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = true;
        const column = checkbox.dataset.column;
        visibleColumns.add(column);
    });
    updateTableHeaders();
});

document.getElementById('deselectAllColumns').addEventListener('click', () => {
    document.querySelectorAll('.column-checkboxes input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
        const column = checkbox.dataset.column;
        visibleColumns.delete(column);
    });
    updateTableHeaders();
});

function updateTableHeaders() {
    const headerRow = document.querySelector('thead tr');
    headerRow.innerHTML = '<th>Jugadores en pista</th>'; // Always show lineup column
    Array.from(visibleColumns).forEach(col => {
        const th = document.createElement('th');
        th.textContent = col;
        th.dataset.column = col;
        th.addEventListener('click', () => sortTable(col));
        
        // Add sort indicator if this column is currently sorted
        if (currentSort.column === col) {
            th.classList.add('sorted', currentSort.direction);
        }
        
        headerRow.appendChild(th);
    });
    
    if (tableData[currentLineupType]) {
        renderTable(tableData[currentLineupType]);
    }
}