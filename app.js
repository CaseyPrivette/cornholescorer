// GOOGLE APPS SCRIPT WEB APP ENDPOINT
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxecJjJPboMkAWxldzcUrdtUdIANECUZUehkIa_srKjlz_gImnS6k921TfF0QUL8hRy/exec';

// MATCH STATE
let gameState = {
    gameNumber: null,
    mode: '2v2',
    currentInning: 1,
    redScore: 0,
    blueScore: 0,
    roster: ['Red Player 1', 'Red Player 2', 'Blue Player 1', 'Blue Player 2'],
    players: {
        red1: { name: '', totalPts: 0, inningsCount: 0, totalHoles: 0, totalBoards: 0 },
        red2: { name: '', totalPts: 0, inningsCount: 0, totalHoles: 0, totalBoards: 0 },
        blue1: { name: '', totalPts: 0, inningsCount: 0, totalHoles: 0, totalBoards: 0 },
        blue2: { name: '', totalPts: 0, inningsCount: 0, totalHoles: 0, totalBoards: 0 }
    },
    currentInputs: {
        redBoard: 0,
        redHole: 0,
        blueBoard: 0,
        blueHole: 0
    },
    history: [],
    detailedPlayerLogs: [] // Detailed rows for Google Sheets logging
};

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    buildInputButtonGroups();
    toggleGameMode();
    fetchRosterFromSheet();
});

// TAB SWITCHING
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(`tab-${tabId}`).classList.add('active');
    if (event && event.target) {
        event.target.classList.add('active');
    }
}

// SETUP TOGGLES
function toggleGameMode() {
    const mode = document.getElementById('game-mode').value;
    gameState.mode = mode;

    const redP2 = document.getElementById('red-p2-group');
    const blueP2 = document.getElementById('blue-p2-group');
    const blueSetup = document.getElementById('blue-setup-section');
    const blueInputSection = document.getElementById('blue-team-section');
    const blueScoreBox = document.getElementById('blue-score-box');

    if (mode === 'practice') {
        if (redP2) redP2.style.display = 'none';
        if (blueSetup) blueSetup.style.display = 'none';
        if (blueInputSection) blueInputSection.style.display = 'none';
        if (blueScoreBox) blueScoreBox.style.display = 'none';
    } else if (mode === '1v1') {
        if (redP2) redP2.style.display = 'none';
        if (blueP2) blueP2.style.display = 'none';
        if (blueSetup) blueSetup.style.display = 'block';
        if (blueInputSection) blueInputSection.style.display = 'block';
        if (blueScoreBox) blueScoreBox.style.display = 'block';
    } else { // 2v2
        if (redP2) redP2.style.display = 'block';
        if (blueP2) blueP2.style.display = 'block';
        if (blueSetup) blueSetup.style.display = 'block';
        if (blueInputSection) blueInputSection.style.display = 'block';
        if (blueScoreBox) blueScoreBox.style.display = 'block';
    }
}

// ============================================================================
// GOOGLE SHEETS API INTEGRATION (ROSTER & LOGGING)
// ============================================================================

function fetchRosterFromSheet() {
    fetch(`${SCRIPT_URL}?action=getRoster`)
        .then(response => response.json())
        .then(roster => {
            if (Array.isArray(roster) && roster.length > 0) {
                gameState.roster = roster;
            }
            populateRosterDropdowns();
        })
        .catch(err => {
            console.warn('Falling back to default roster:', err);
            populateRosterDropdowns();
        });
}

function populateRosterDropdowns() {
    const dropdowns = document.querySelectorAll('.roster-select');
    dropdowns.forEach((select, index) => {
        const currentValue = select.value;
        select.innerHTML = '';
        
        gameState.roster.forEach(playerName => {
            const opt = document.createElement('option');
            opt.value = playerName;
            opt.textContent = playerName;
            select.appendChild(opt);
        });

        if (currentValue && gameState.roster.includes(currentValue)) {
            select.value = currentValue;
        } else if (gameState.roster[index]) {
            select.value = gameState.roster[index];
        }
    });
}

function addPlayerToSheet() {
    const input = document.getElementById('new-player-name');
    const name = input ? input.value.trim() : '';
    if (!name) return;

    fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'addPlayer', playerName: name })
    })
    .then(res => res.json())
    .then(data => {
        if (data.roster) {
            gameState.roster = data.roster;
            populateRosterDropdowns();
            if (input) input.value = '';
            alert(`Player "${name}" added to Google Sheets roster!`);
        }
    })
    .catch(err => alert('Failed to add player: ' + err));
}

function saveMatchToSheet() {
    if (gameState.detailedPlayerLogs.length === 0) {
        alert('No innings recorded yet to save!');
        return;
    }

    fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'logMatch', matchData: gameState })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            alert(`Match log saved to Google Sheets! (Game #${data.gameNumber})`);
        } else {
            alert('Error saving match: ' + data.message);
        }
    })
    .catch(err => alert('Save failed: ' + err));
}

// ============================================================================
// THROW INPUT BUTTON BUILDER
// ============================================================================

function buildInputButtonGroups() {
    createButtonGroup('red-board-boxes', 4, (val) => setThrowValue('redBoard', val));
    createButtonGroup('red-hole-boxes', 4, (val) => setThrowValue('redHole', val));
    createButtonGroup('blue-board-boxes', 4, (val) => setThrowValue('blueBoard', val));
    createButtonGroup('blue-hole-boxes', 4, (val) => setThrowValue('blueHole', val));
}

function createButtonGroup(containerId, maxBags, onClickCallback) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    for (let i = 0; i <= maxBags; i++) {
        const btn = document.createElement('button');
        btn.className = `box-btn ${i === 0 ? 'selected' : ''}`;
        btn.textContent = i;
        btn.onclick = () => {
            Array.from(container.children).forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            onClickCallback(i);
            updateButtonConstraints();
        };
        container.appendChild(btn);
    }
}

function setThrowValue(key, val) {
    gameState.currentInputs[key] = val;

    // Enforce 4-bag max limit per team dynamically
    if (key === 'redBoard' && (val + gameState.currentInputs.redHole > 4)) {
        gameState.currentInputs.redHole = 4 - val;
    } else if (key === 'redHole' && (val + gameState.currentInputs.redBoard > 4)) {
        gameState.currentInputs.redBoard = 4 - val;
    } else if (key === 'blueBoard' && (val + gameState.currentInputs.blueHole > 4)) {
        gameState.currentInputs.blueHole = 4 - val;
    } else if (key === 'blueHole' && (val + gameState.currentInputs.blueBoard > 4)) {
        gameState.currentInputs.blueBoard = 4 - val;
    }

    // Refresh button selection states and disabled locks
    updateButtonSelectionUI();
    updateButtonConstraints();
}

function updateButtonSelectionUI() {
    updateContainerSelection('red-board-boxes', gameState.currentInputs.redBoard);
    updateContainerSelection('red-hole-boxes', gameState.currentInputs.redHole);
    updateContainerSelection('blue-board-boxes', gameState.currentInputs.blueBoard);
    updateContainerSelection('blue-hole-boxes', gameState.currentInputs.blueHole);
}

function updateContainerSelection(containerId, activeVal) {
    const container = document.getElementById(containerId);
    if (!container) return;
    Array.from(container.children).forEach((btn, idx) => {
        if (idx === activeVal) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });
}

function updateButtonConstraints() {
    applyConstraints('red-board-boxes', 'red-hole-boxes', gameState.currentInputs.redBoard, gameState.currentInputs.redHole);
    if (gameState.mode !== 'practice') {
        applyConstraints('blue-board-boxes', 'blue-hole-boxes', gameState.currentInputs.blueBoard, gameState.currentInputs.blueHole);
    }
}

function applyConstraints(boardContainerId, holeContainerId, currentBoard, currentHole) {
    const maxBags = 4;
    
    const holeContainer = document.getElementById(holeContainerId);
    if (holeContainer) {
        Array.from(holeContainer.children).forEach((btn, index) => {
            if (index + currentBoard > maxBags) {
                btn.classList.add('disabled');
            } else {
                btn.classList.remove('disabled');
            }
        });
    }

    const boardContainer = document.getElementById(boardContainerId);
    if (boardContainer) {
        Array.from(boardContainer.children).forEach((btn, index) => {
            if (index + currentHole > maxBags) {
                btn.classList.add('disabled');
            } else {
                btn.classList.remove('disabled');
            }
        });
    }
}

// ============================================================================
// MATCH LOGIC & INNING SUBMISSION
// ============================================================================

function startMatch() {
    gameState.players.red1.name = document.getElementById('red-player-1')?.value || 'Red P1';
    gameState.players.red2.name = document.getElementById('red-player-2')?.value || 'Red P2';
    gameState.players.blue1.name = document.getElementById('blue-player-1')?.value || 'Blue P1';
    gameState.players.blue2.name = document.getElementById('blue-player-2')?.value || 'Blue P2';

    gameState.currentInning = 1;
    gameState.redScore = 0;
    gameState.blueScore = 0;
    gameState.history = [];
    gameState.detailedPlayerLogs = [];

    Object.keys(gameState.players).forEach(p => {
        gameState.players[p].totalPts = 0;
        gameState.players[p].inningsCount = 0;
        gameState.players[p].totalHoles = 0;
        gameState.players[p].totalBoards = 0;
    });

    updatePitcherLabels();
    updateScoreboardDisplay();
    renderLogTable();
    renderStatsTab();

    const scoreTabBtn = document.querySelectorAll('.tab-btn')[1];
    if (scoreTabBtn) scoreTabBtn.click();
}

function getActivePitcherKey(team) {
    if (team === 'red') {
        if (gameState.mode === '2v2') {
            return gameState.currentInning % 2 !== 0 ? 'red1' : 'red2';
        }
        return 'red1';
    } else {
        if (gameState.mode === '2v2') {
            return gameState.currentInning % 2 !== 0 ? 'blue1' : 'blue2';
        }
        return 'blue1';
    }
}

function updatePitcherLabels() {
    const redKey = getActivePitcherKey('red');
    const redLabel = document.getElementById('red-pitcher-label');
    if (redLabel) redLabel.textContent = `RED: ${gameState.players[redKey].name}`;

    if (gameState.mode !== 'practice') {
        const blueKey = getActivePitcherKey('blue');
        const blueLabel = document.getElementById('blue-pitcher-label');
        if (blueLabel) blueLabel.textContent = `BLUE: ${gameState.players[blueKey].name}`;
    }
    
    const innLabel = document.getElementById('display-inn-num');
    if (innLabel) innLabel.textContent = gameState.currentInning;
}

function submitInning() {
    const isPractice = gameState.mode === 'practice';
    const redBoard = gameState.currentInputs.redBoard;
    const redHole = gameState.currentInputs.redHole;
    const redMissed = 4 - (redBoard + redHole);
    const redGross = redBoard + (redHole * 3);

    const blueBoard = isPractice ? 0 : gameState.currentInputs.blueBoard;
    const blueHole = isPractice ? 0 : gameState.currentInputs.blueHole;
    const blueMissed = isPractice ? 0 : 4 - (blueBoard + blueHole);
    const blueGross = blueBoard + (blueHole * 3);

    let redNet = 0;
    let blueNet = 0;
    let netText = '0';

    if (isPractice) {
        redNet = redGross;
        gameState.redScore += redNet;
        netText = `+${redNet}`;
    } else {
        if (redGross > blueGross) {
            redNet = redGross - blueGross;
            gameState.redScore += redNet;
            netText = `+${redNet} Red`;
        } else if (blueGross > redGross) {
            blueNet = blueGross - redGross;
            gameState.blueScore += blueNet;
            netText = `+${blueNet} Blue`;
        } else {
            netText = 'Tie (0)';
        }
    }

    const redPitcherKey = getActivePitcherKey('red');
    const redPlayerName = gameState.players[redPitcherKey].name;
    
    gameState.players[redPitcherKey].totalPts += redGross;
    gameState.players[redPitcherKey].inningsCount += 1;
    gameState.players[redPitcherKey].totalBoards += redBoard;
    gameState.players[redPitcherKey].totalHoles += redHole;

    // Push Red Player log
    gameState.detailedPlayerLogs.push({
        inning: gameState.currentInning,
        team: 'Red',
        playerName: redPlayerName,
        board: redBoard,
        hole: redHole,
        missed: redMissed,
        inningScore: redGross,
        runningScore: gameState.redScore,
        isPractice: isPractice
    });

    let bluePlayerName = '-';
    if (!isPractice) {
        const bluePitcherKey = getActivePitcherKey('blue');
        bluePlayerName = gameState.players[bluePitcherKey].name;

        gameState.players[bluePitcherKey].totalPts += blueGross;
        gameState.players[bluePitcherKey].inningsCount += 1;
        gameState.players[bluePitcherKey].totalBoards += blueBoard;
        gameState.players[bluePitcherKey].totalHoles += blueHole;

        // Push Blue Player log
        gameState.detailedPlayerLogs.push({
            inning: gameState.currentInning,
            team: 'Blue',
            playerName: bluePlayerName,
            board: blueBoard,
            hole: blueHole,
            missed: blueMissed,
            inningScore: blueGross,
            runningScore: gameState.blueScore,
            isPractice: false
        });
    }

    gameState.history.push({
        inning: gameState.currentInning,
        redPitcher: redPlayerName,
        redGross,
        bluePitcher: bluePlayerName,
        blueGross,
        netText,
        matchScore: `${gameState.redScore} - ${gameState.blueScore}`
    });

    gameState.currentInning++;
    
    resetThrowInputs();
    updatePitcherLabels();
    updateScoreboardDisplay();
    renderLogTable();
    renderStatsTab();
}

function resetThrowInputs() {
    gameState.currentInputs = { redBoard: 0, redHole: 0, blueBoard: 0, blueHole: 0 };
    buildInputButtonGroups();
}

function updateScoreboardDisplay() {
    const redTotal = document.getElementById('red-total');
    const blueTotal = document.getElementById('blue-total');
    if (redTotal) redTotal.textContent = gameState.redScore;
    if (blueTotal) blueTotal.textContent = gameState.blueScore;
}

function renderLogTable() {
    const tbody = document.getElementById('log-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    [...gameState.history].reverse().forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${row.inning}</strong></td>
            <td>${row.redPitcher}</td>
            <td>${row.redGross}</td>
            <td class="blue-col">${row.bluePitcher}</td>
            <td class="blue-col">${row.blueGross}</td>
            <td><strong>${row.netText}</strong></td>
            <td><strong>${row.matchScore}</strong></td>
        `;
        tbody.appendChild(tr);
    });
}

function renderStatsTab() {
    const container = document.getElementById('stats-container');
    if (!container) return;
    container.innerHTML = '';

    // Calculate individual net +/- totals based on direct inning matchups
    const netScores = calculatePlayerNetScores();

    const activePlayers = [
        { key: 'red1', team: 'Red', colorClass: 'red-team-card' }
    ];

    if (gameState.mode === '2v2') {
        activePlayers.push({ key: 'red2', team: 'Red', colorClass: 'red-team-card' });
    }

    if (gameState.mode !== 'practice') {
        activePlayers.push({ key: 'blue1', team: 'Blue', colorClass: 'blue-team-card' });
        if (gameState.mode === '2v2') {
            activePlayers.push({ key: 'blue2', team: 'Blue', colorClass: 'blue-team-card' });
        }
    }

    activePlayers.forEach(({ key, team, colorClass }) => {
        const p = gameState.players[key];
        const avgPerInning = p.inningsCount > 0 ? (p.totalPts / p.inningsCount).toFixed(1) : '0.0';
        
        // Format +/- string and color state
        const netVal = netScores[key];
        let netDisplay = 'N/A';
        let netColorClass = 'net-neutral';

        if (gameState.mode !== 'practice') {
            if (netVal > 0) {
                netDisplay = `+${netVal}`;
                netColorClass = 'net-positive';
            } else if (netVal < 0) {
                netDisplay = `${netVal}`;
                netColorClass = 'net-negative';
            } else {
                netDisplay = '0';
                netColorClass = 'net-neutral';
            }
        }

        const card = document.createElement('div');
        card.className = `player-stat-card ${colorClass}`;
        card.innerHTML = `
            <div class="player-card-header">
                <div>
                    <span class="team-badge ${team.toLowerCase()}-badge">${team} Team</span>
                    <h3>${p.name}</h3>
                </div>
                <div class="highlight-metrics-group">
                    <div class="highlight-metric-box">
                        <span class="metric-label">AVG / INNING</span>
                        <span class="metric-value">${avgPerInning}</span>
                    </div>
                    <div class="highlight-metric-box ${netColorClass}">
                        <span class="metric-label">MATCH +/-</span>
                        <span class="metric-value">${netDisplay}</span>
                    </div>
                </div>
            </div>
            <div class="stats-grid">
                <div class="stat-box">
                    <span class="stat-value">${p.totalPts}</span>
                    <span class="stat-label">Total Points</span>
                </div>
                <div class="stat-box">
                    <span class="stat-value">${p.inningsCount}</span>
                    <span class="stat-label">Innings Pitched</span>
                </div>
                <div class="stat-box">
                    <span class="stat-value">${p.totalHoles}</span>
                    <span class="stat-label">Holes (3pt)</span>
                </div>
                <div class="stat-box">
                    <span class="stat-value">${p.totalBoards}</span>
                    <span class="stat-label">Boards (1pt)</span>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// Helper to sum differential (+/-) for matched pitchers
function calculatePlayerNetScores() {
    const nets = { red1: 0, red2: 0, blue1: 0, blue2: 0 };
    if (gameState.mode === 'practice') return nets;

    gameState.history.forEach(row => {
        const diff = row.redGross - row.blueGross;

        // Inning pitch assignments: odd innings = Pitcher 1s, even innings = Pitcher 2s (in 2v2)
        if (gameState.mode === '2v2' && row.inning % 2 === 0) {
            nets.red2 += diff;
            nets.blue2 -= diff;
        } else {
            nets.red1 += diff;
            nets.blue1 -= diff;
        }
    });

    return nets;
}