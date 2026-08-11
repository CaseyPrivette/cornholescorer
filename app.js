// MATCH STATE
let gameState = {
    mode: '2v2', // '2v2', '1v1', 'practice'
    currentInning: 1,
    redScore: 0,
    blueScore: 0,
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
    history: []
};

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    buildInputButtonGroups();
    toggleGameMode();
});

// TAB SWITCHING
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(`tab-${tabId}`).classList.add('active');
    event.target.classList.add('active');
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
        redP2.style.display = 'none';
        blueSetup.style.display = 'none';
        blueInputSection.style.display = 'none';
        blueScoreBox.style.display = 'none';
    } else if (mode === '1v1') {
        redP2.style.display = 'none';
        blueP2.style.display = 'none';
        blueSetup.style.display = 'block';
        blueInputSection.style.display = 'block';
        blueScoreBox.style.display = 'block';
    } else { // 2v2
        redP2.style.display = 'block';
        blueP2.style.display = 'block';
        blueSetup.style.display = 'block';
        blueInputSection.style.display = 'block';
        blueScoreBox.style.display = 'block';
    }
}

// DYNAMIC INPUT BUTTON BUILDER
function buildInputButtonGroups() {
    createButtonGroup('red-board-boxes', 4, (val) => setThrowValue('redBoard', val));
    createButtonGroup('red-hole-boxes', 4, (val) => setThrowValue('redHole', val));
    createButtonGroup('blue-board-boxes', 4, (val) => setThrowValue('blueBoard', val));
    createButtonGroup('blue-hole-boxes', 4, (val) => setThrowValue('blueHole', val));
}

function createButtonGroup(containerId, maxBags, onClickCallback) {
    const container = document.getElementById(containerId);
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
}

// PREVENT ENTERING MORE THAN 4 BAGS TOTAL PER INNING
function updateButtonConstraints() {
    applyConstraints('red-board-boxes', 'red-hole-boxes', gameState.currentInputs.redBoard, gameState.currentInputs.redHole);
    if (gameState.mode !== 'practice') {
        applyConstraints('blue-board-boxes', 'blue-hole-boxes', gameState.currentInputs.blueBoard, gameState.currentInputs.blueHole);
    }
}

function applyConstraints(boardContainerId, holeContainerId, currentBoard, currentHole) {
    const maxBags = 4;
    
    // Constraint for Hole buttons based on selected Board
    const holeContainer = document.getElementById(holeContainerId);
    Array.from(holeContainer.children).forEach((btn, index) => {
        if (index + currentBoard > maxBags) {
            btn.classList.add('disabled');
        } else {
            btn.classList.remove('disabled');
        }
    });

    // Constraint for Board buttons based on selected Hole
    const boardContainer = document.getElementById(boardContainerId);
    Array.from(boardContainer.children).forEach((btn, index) => {
        if (index + currentHole > maxBags) {
            btn.classList.add('disabled');
        } else {
            btn.classList.remove('disabled');
        }
    });
}

// START MATCH
function startMatch() {
    gameState.players.red1.name = document.getElementById('red-player-1').value || 'Red P1';
    gameState.players.red2.name = document.getElementById('red-player-2').value || 'Red P2';
    gameState.players.blue1.name = document.getElementById('blue-player-1').value || 'Blue P1';
    gameState.players.blue2.name = document.getElementById('blue-player-2').value || 'Blue P2';

    gameState.currentInning = 1;
    gameState.redScore = 0;
    gameState.blueScore = 0;
    gameState.history = [];

    // Reset player stats
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

    // Switch to scoring tab
    document.querySelectorAll('.tab-btn')[1].click();
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
    document.getElementById('red-pitcher-label').textContent = `RED: ${gameState.players[redKey].name}`;

    if (gameState.mode !== 'practice') {
        const blueKey = getActivePitcherKey('blue');
        document.getElementById('blue-pitcher-label').textContent = `BLUE: ${gameState.players[blueKey].name}`;
    }
    document.getElementById('display-inn-num').textContent = gameState.currentInning;
}

// SUBMIT INNING
function submitInning() {
    const redBoard = gameState.currentInputs.redBoard;
    const redHole = gameState.currentInputs.redHole;
    const blueBoard = gameState.mode === 'practice' ? 0 : gameState.currentInputs.blueBoard;
    const blueHole = gameState.mode === 'practice' ? 0 : gameState.currentInputs.blueHole;

    const redGross = redBoard + (redHole * 3);
    const blueGross = blueBoard + (blueHole * 3);

    // Dynamic Cancellation Scoring
    let redNet = 0;
    let blueNet = 0;
    let netText = '0';

    if (gameState.mode === 'practice') {
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

    // Accumulate player stats
    const redPitcherKey = getActivePitcherKey('red');
    gameState.players[redPitcherKey].totalPts += redGross;
    gameState.players[redPitcherKey].inningsCount += 1;
    gameState.players[redPitcherKey].totalBoards += redBoard;
    gameState.players[redPitcherKey].totalHoles += redHole;

    if (gameState.mode !== 'practice') {
        const bluePitcherKey = getActivePitcherKey('blue');
        gameState.players[bluePitcherKey].totalPts += blueGross;
        gameState.players[bluePitcherKey].inningsCount += 1;
        gameState.players[bluePitcherKey].totalBoards += blueBoard;
        gameState.players[bluePitcherKey].totalHoles += blueHole;
    }

    // Add log history record
    gameState.history.push({
        inning: gameState.currentInning,
        redPitcher: gameState.players[redPitcherKey].name,
        redGross,
        bluePitcher: gameState.mode === 'practice' ? '-' : gameState.players[getActivePitcherKey('blue')].name,
        blueGross,
        netText,
        matchScore: `${gameState.redScore} - ${gameState.blueScore}`
    });

    // Advance Inning
    gameState.currentInning++;
    
    // Reset throw selection inputs
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
    document.getElementById('red-total').textContent = gameState.redScore;
    document.getElementById('blue-total').textContent = gameState.blueScore;
}

function renderLogTable() {
    const tbody = document.getElementById('log-body');
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

// RENDER PLAYER STATS WITH FEATURED AVG / INNING
function renderStatsTab() {
    const container = document.getElementById('stats-container');
    container.innerHTML = '';

    const activeKeys = [];
    activeKeys.push('red1');
    if (gameState.mode === '2v2') activeKeys.push('red2');

    if (gameState.mode !== 'practice') {
        activeKeys.push('blue1');
        if (gameState.mode === '2v2') activeKeys.push('blue2');
    }

    activeKeys.forEach(key => {
        const p = gameState.players[key];
        
        // Compute Average Points Per Inning safely
        const avgPerInning = p.inningsCount > 0 ? (p.totalPts / p.inningsCount).toFixed(1) : '0.0';

        const card = document.createElement('div');
        card.className = 'player-stat-card';
        card.innerHTML = `
            <div class="player-card-header">
                <h3>${p.name}</h3>
                <div class="highlight-metric-box">
                    <span class="metric-label">AVG / INNING</span>
                    <span class="metric-value">${avgPerInning}</span>
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