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
    detailedPlayerLogs: [],
    editingHistoryIndex: null
};

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    buildInputButtonGroups();
    toggleGameMode();
    populatePlayerLookupDropdown();
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

    const board1Card = document.querySelectorAll('.board-setup-card')[0];
    const board2Card = document.querySelectorAll('.board-setup-card')[1];
    
    const blueGroup1 = document.getElementById('blue-player-1')?.parentElement;
    const blueGroup2 = document.getElementById('blue-player-2')?.parentElement;
    const redGroup2 = document.getElementById('red-player-2')?.parentElement;

    const blueInputSection = document.getElementById('blue-team-section');
    const blueScoreBox = document.getElementById('blue-score-box');

    if (mode === 'practice') {
        // Hide Board 2 and all Blue elements
        if (board1Card) board1Card.style.display = 'block';
        if (board2Card) board2Card.style.display = 'none';
        if (blueGroup1) blueGroup1.style.display = 'none';
        if (blueInputSection) blueInputSection.style.display = 'none';
        if (blueScoreBox) blueScoreBox.style.display = 'none';
    } else if (mode === '1v1') {
        // Hide Board 2 (Player 2s), show Board 1 (Blue & Red)
        if (board1Card) board1Card.style.display = 'block';
        if (board2Card) board2Card.style.display = 'none';
        if (blueGroup1) blueGroup1.style.display = 'block';
        if (blueInputSection) blueInputSection.style.display = 'block';
        if (blueScoreBox) blueScoreBox.style.display = 'block';
    } else { 
        // 2v2: Show all boards and player inputs
        if (board1Card) board1Card.style.display = 'block';
        if (board2Card) board2Card.style.display = 'block';
        if (blueGroup1) blueGroup1.style.display = 'block';
        if (blueGroup2) blueGroup2.style.display = 'block';
        if (redGroup2) redGroup2.style.display = 'block';
        if (blueInputSection) blueInputSection.style.display = 'block';
        if (blueScoreBox) blueScoreBox.style.display = 'block';
    }
}

// ============================================================================
// GOOGLE SHEETS API INTEGRATION (ROSTER & LOGGING)
// ============================================================================

async function fetchRosterFromSheet() {
    const fallbackRoster = [...gameState.roster];

    // 1. Check if Firebase is attached to the window object
    if (!window.db || !window.firestoreTools) {
        console.warn('Firebase db not attached yet, falling back to local state.');
        populateRosterDropdowns(fallbackRoster);
        return;
    }

    try {
        const { collection, getDocs } = window.firestoreTools;
        const querySnapshot = await getDocs(collection(window.db, "rosters"));

        const namesList = [];

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data && data.name) {
                namesList.push(data.name);
            }
        });

        // 2. Sort names alphabetically (case-insensitive)
        namesList.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

        // 3. Update global gameState roster if names were retrieved
        if (namesList.length > 0) {
            gameState.roster = namesList;
        }

        populateRosterDropdowns(gameState.roster);
    } catch (err) {
        console.warn('Falling back to default roster:', err);
        populateRosterDropdowns(fallbackRoster);
    }
}

// Fixed: Default parameter if playerList is missing
function populateRosterDropdowns(playerList = gameState.roster) {
    const selectIds = ['blue-player-1', 'red-player-1', 'red-player-2', 'blue-player-2'];
    
    selectIds.forEach((id, index) => {
        const select = document.getElementById(id);
        if (!select) return;

        select.innerHTML = '';
        
        playerList.forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            select.appendChild(opt);
        });

        // Set sensible default selections across dropdowns
        if (select.children[index]) {
            select.selectedIndex = index;
        }
    });

    populatePlayerLookupDropdown();
}

function populatePlayerLookupDropdown() {
    const select = document.getElementById('player-stats-select');
    if (!select) return;

    select.innerHTML = '';
    const roster = [...gameState.roster];

    if (roster.length === 0) {
        const fallback = document.createElement('option');
        fallback.value = '';
        fallback.textContent = 'No players available';
        select.appendChild(fallback);
        return;
    }

    roster.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        select.appendChild(opt);
    });

    select.selectedIndex = 0;
}

async function addPlayerToSheet() {
    const input = document.getElementById('new-player-name');
    const name = input ? input.value.trim() : '';
    if (!name) return;

    try {
        const { collection, addDoc } = window.firestoreTools;
        await addDoc(collection(window.db, "rosters"), {
            name: name,
            createdAt: new Date()
        });

        gameState.roster.push(name);
        populateRosterDropdowns();
        if (input) input.value = '';
        alert(`Player "${name}" added to Firebase roster!`);
    } catch (err) {
        alert('Failed to add player: ' + err);
    }
}

async function saveMatchToSheet() {
    if (gameState.detailedPlayerLogs.length === 0) {
        alert('No innings recorded yet to save!');
        return;
    }

    try {
        const { collection, addDoc } = window.firestoreTools;
        const now = new Date();

        // 1. Write granular inning records to 'game_logs'
        for (const log of gameState.detailedPlayerLogs) {
            await addDoc(collection(window.db, "game_logs"), {
                timestamp: now,
                gameNumber: gameState.gameNumber || 1,
                inningNumber: log.inning,
                team: log.team,
                playerName: log.playerName,
                boardSide: log.side,
                board: log.board,
                hole: log.hole,
                missed: log.missed,
                inningScore: log.inningScore,
                runningScore: log.runningScore,
                isPractice: log.isPractice
            });
        }

        // 2. Write game summary to 'matches'
        await addDoc(collection(window.db, "matches"), {
            timestamp: now,
            gameNumber: gameState.gameNumber || 1,
            mode: gameState.mode,
            redScore: gameState.redScore,
            blueScore: gameState.blueScore,
            players: gameState.players
        });

        alert('Match logs saved successfully to Firestore!');
    } catch (err) {
        alert('Save failed: ' + err);
    }
}

async function loadPlayerDatabaseStats() {
    const select = document.getElementById('player-stats-select');
    const playerName = select ? select.value : '';
    const resultsContainer = document.getElementById('player-stats-results');

    if (!playerName) {
        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div class="player-stat-card">
                    <div class="player-card-header">
                        <div>
                            <span class="team-badge red-badge">PLAYER</span>
                            <h3>No player selected</h3>
                        </div>
                    </div>
                    <div class="stats-grid">
                        <div class="stat-box"><span class="stat-value">0</span><span class="stat-label">Games Played</span></div>
                        <div class="stat-box"><span class="stat-value">0.00</span><span class="stat-label">Avg / Inning</span></div>
                    </div>
                </div>
            `;
        }
        return;
    }

    if (!window.db || !window.firestoreTools) {
        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div class="player-stat-card">
                    <div class="player-card-header">
                        <div>
                            <span class="team-badge red-badge">PLAYER</span>
                            <h3>${playerName}</h3>
                        </div>
                    </div>
                    <div class="stats-grid">
                        <div class="stat-box"><span class="stat-value">N/A</span><span class="stat-label">Games Played</span></div>
                        <div class="stat-box"><span class="stat-value">N/A</span><span class="stat-label">Avg / Inning</span></div>
                    </div>
                </div>
            `;
        }
        return;
    }

    try {
        const { collection, getDocs } = window.firestoreTools;
        const snapshot = await getDocs(collection(window.db, 'game_logs'));

        const playerLogs = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data && data.playerName === playerName) {
                playerLogs.push(data);
            }
        });

        const gamesPlayed = new Set(playerLogs
            .map(log => log.gameNumber)
            .filter(gameNumber => gameNumber !== undefined && gameNumber !== null && gameNumber !== ''))
            .size;

        const totalInnings = playerLogs.length;
        const totalPoints = playerLogs.reduce((sum, log) => sum + Number(log.inningScore || 0), 0);
        const avgPerInning = totalInnings > 0 ? (totalPoints / totalInnings).toFixed(2) : '0.00';

        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div class="player-stat-card">
                    <div class="player-card-header">
                        <div>
                            <span class="team-badge red-badge">PLAYER</span>
                            <h3>${playerName}</h3>
                        </div>
                    </div>
                    <div class="stats-grid">
                        <div class="stat-box">
                            <span class="stat-value">${gamesPlayed}</span>
                            <span class="stat-label">Games Played</span>
                        </div>
                        <div class="stat-box">
                            <span class="stat-value">${avgPerInning}</span>
                            <span class="stat-label">Avg / Inning</span>
                        </div>
                        <div class="stat-box">
                            <span class="stat-value">${totalInnings}</span>
                            <span class="stat-label">Total Innings</span>
                        </div>
                        <div class="stat-box">
                            <span class="stat-value">${totalPoints}</span>
                            <span class="stat-label">Total Points</span>
                        </div>
                    </div>
                </div>
            `;
        }
    } catch (err) {
        console.error('Failed to load player stats:', err);
        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div class="player-stat-card">
                    <div class="player-card-header">
                        <div>
                            <span class="team-badge red-badge">PLAYER</span>
                            <h3>${playerName}</h3>
                        </div>
                    </div>
                    <div class="stats-grid">
                        <div class="stat-box"><span class="stat-value">N/A</span><span class="stat-label">Games Played</span></div>
                        <div class="stat-box"><span class="stat-value">N/A</span><span class="stat-label">Avg / Inning</span></div>
                    </div>
                </div>
            `;
        }
    }
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

// Initialize player setup and assign explicit board sides
function syncPlayerNamesFromSetup() {
    const getSelectedName = (id, fallback) => {
        const el = document.getElementById(id);
        return el ? (el.value || fallback) : fallback;
    };

    gameState.players.blue1.name = getSelectedName('blue-player-1', 'Blue P1') || 'Blue P1';
    gameState.players.blue1.side = 'Left';

    gameState.players.red1.name = getSelectedName('red-player-1', 'Red P1') || 'Red P1';
    gameState.players.red1.side = 'Right';

    gameState.players.red2.name = getSelectedName('red-player-2', 'Red P2') || 'Red P2';
    gameState.players.red2.side = 'Left';

    gameState.players.blue2.name = getSelectedName('blue-player-2', 'Blue P2') || 'Blue P2';
    gameState.players.blue2.side = 'Right';
}

function startMatch() {
    syncPlayerNamesFromSetup();

    gameState.currentInning = 1;
    gameState.redScore = 0;
    gameState.blueScore = 0;
    gameState.history = [];
    gameState.detailedPlayerLogs = [];
    gameState.editingHistoryIndex = null;

    const submitBtn = document.getElementById('btnEndInning');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Inning';
    }

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

function getPitcherKeyForInning(team, inningNumber) {
    const inning = inningNumber || gameState.currentInning;

    if (team === 'red') {
        if (gameState.mode === '2v2') {
            return inning % 2 !== 0 ? 'red1' : 'red2';
        }
        return 'red1';
    }

    if (gameState.mode === '2v2') {
        return inning % 2 !== 0 ? 'blue1' : 'blue2';
    }
    return 'blue1';
}

function getActivePitcherKey(team) {
    return getPitcherKeyForInning(team, gameState.currentInning);
}

function getPlayerDisplayName(playerKey, fallback) {
    const raw = gameState.players[playerKey]?.name;
    return raw && raw.trim() ? raw.trim() : fallback;
}

function getPlayerLabelFallback(playerKey) {
    const fallbackMap = {
        red1: 'Red P1',
        red2: 'Red P2',
        blue1: 'Blue P1',
        blue2: 'Blue P2'
    };
    return fallbackMap[playerKey] || 'Player';
}

function updatePitcherLabels() {
    const redKey = getActivePitcherKey('red');
    const redFallback = redKey === 'red1' ? 'Red P1' : 'Red P2';
    const redLabel = document.getElementById('red-pitcher-label');
    if (redLabel) redLabel.textContent = `RED: ${getPlayerDisplayName(redKey, redFallback)}`;

    if (gameState.mode !== 'practice') {
        const blueKey = getActivePitcherKey('blue');
        const blueFallback = blueKey === 'blue1' ? 'Blue P1' : 'Blue P2';
        const blueLabel = document.getElementById('blue-pitcher-label');
        if (blueLabel) blueLabel.textContent = `BLUE: ${getPlayerDisplayName(blueKey, blueFallback)}`;
    }
    
    const innLabel = document.getElementById('display-inn-num');
    if (innLabel) innLabel.textContent = gameState.currentInning;
}

function getNextInningNumber() {
    if (gameState.history.length === 0) return 1;
    return Math.max(...gameState.history.map(row => Number(row.inning || 0))) + 1;
}

function recalculateMatchFromHistory() {
    gameState.redScore = 0;
    gameState.blueScore = 0;
    gameState.detailedPlayerLogs = [];

    Object.keys(gameState.players).forEach(playerKey => {
        gameState.players[playerKey].totalPts = 0;
        gameState.players[playerKey].inningsCount = 0;
        gameState.players[playerKey].totalHoles = 0;
        gameState.players[playerKey].totalBoards = 0;
    });

    gameState.history.forEach(row => {
        const inningNumber = Number(row.inning || 1);
        const isPractice = gameState.mode === 'practice';
        const redBoard = Number(row.redBoard || 0);
        const redHole = Number(row.redHole || 0);
        const redMissed = 4 - (redBoard + redHole);
        const redGross = redBoard + (redHole * 3);

        const blueBoard = isPractice ? 0 : Number(row.blueBoard || 0);
        const blueHole = isPractice ? 0 : Number(row.blueHole || 0);
        const blueMissed = isPractice ? 0 : 4 - (blueBoard + blueHole);
        const blueGross = blueBoard + (blueHole * 3);

        const redPitcherKey = getPitcherKeyForInning('red', inningNumber);
        const redPlayer = gameState.players[redPitcherKey];

        redPlayer.totalPts += redGross;
        redPlayer.inningsCount += 1;
        redPlayer.totalBoards += redBoard;
        redPlayer.totalHoles += redHole;

        let newRedScore = gameState.redScore;
        let newBlueScore = gameState.blueScore;
        let netText = '0';

        if (isPractice) {
            newRedScore += redGross;
            gameState.redScore = newRedScore;
            netText = `+${redGross}`;
        } else {
            if (redGross > blueGross) {
                const redNet = redGross - blueGross;
                newRedScore += redNet;
                gameState.redScore = newRedScore;
                netText = `+${redNet} Red`;
            } else if (blueGross > redGross) {
                const blueNet = blueGross - redGross;
                newBlueScore += blueNet;
                gameState.blueScore = newBlueScore;
                netText = `+${blueNet} Blue`;
            } else {
                netText = 'Tie (0)';
            }
        }

        gameState.detailedPlayerLogs.push({
            inning: inningNumber,
            team: 'Red',
            playerName: redPlayer.name,
            side: redPlayer.side,
            board: redBoard,
            hole: redHole,
            missed: redMissed,
            inningScore: redGross,
            runningScore: gameState.redScore,
            isPractice: isPractice
        });

        if (!isPractice) {
            const bluePitcherKey = getPitcherKeyForInning('blue', inningNumber);
            const bluePlayer = gameState.players[bluePitcherKey];

            bluePlayer.totalPts += blueGross;
            bluePlayer.inningsCount += 1;
            bluePlayer.totalBoards += blueBoard;
            bluePlayer.totalHoles += blueHole;

            gameState.detailedPlayerLogs.push({
                inning: inningNumber,
                team: 'Blue',
                playerName: bluePlayer.name,
                side: bluePlayer.side,
                board: blueBoard,
                hole: blueHole,
                missed: blueMissed,
                inningScore: blueGross,
                runningScore: gameState.blueScore,
                isPractice: false
            });
        }

        row.redPitcher = redPlayer.name;
        row.redGross = redGross;
        row.bluePitcher = isPractice ? '-' : gameState.players[getPitcherKeyForInning('blue', inningNumber)].name;
        row.blueGross = blueGross;
        row.redBoard = redBoard;
        row.redHole = redHole;
        row.blueBoard = blueBoard;
        row.blueHole = blueHole;
        row.netText = netText;
        row.matchScore = `${gameState.redScore} - ${gameState.blueScore}`;
    });

    gameState.currentInning = getNextInningNumber();
}

function beginEditInning(historyIndex) {
    const entry = gameState.history[historyIndex];
    if (!entry) return;

    gameState.editingHistoryIndex = historyIndex;
    gameState.currentInning = Number(entry.inning || 1);
    gameState.currentInputs = {
        redBoard: Number(entry.redBoard || 0),
        redHole: Number(entry.redHole || 0),
        blueBoard: Number(entry.blueBoard || 0),
        blueHole: Number(entry.blueHole || 0)
    };

    const submitBtn = document.getElementById('btnEndInning');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Edited Inning';
    }

    updatePitcherLabels();
    updateButtonSelectionUI();
    updateButtonConstraints();
}

// Log side information alongside detailed player logs
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

    if (gameState.editingHistoryIndex !== null && gameState.editingHistoryIndex >= 0) {
        const redPitcherKey = getPitcherKeyForInning('red', gameState.currentInning);
        const redPlayer = gameState.players[redPitcherKey];

        const updatedEntry = {
            inning: gameState.currentInning,
            redPitcher: redPlayer.name,
            redBoard,
            redHole,
            redGross,
            bluePitcher: isPractice ? '-' : gameState.players[getPitcherKeyForInning('blue', gameState.currentInning)].name,
            blueBoard,
            blueHole,
            blueGross,
            netText: 'Tie (0)',
            matchScore: '0 - 0'
        };

        if (isPractice) {
            updatedEntry.netText = `+${redGross}`;
        } else if (redGross > blueGross) {
            updatedEntry.netText = `+${redGross - blueGross} Red`;
        } else if (blueGross > redGross) {
            updatedEntry.netText = `+${blueGross - redGross} Blue`;
        } else {
            updatedEntry.netText = 'Tie (0)';
        }

        gameState.history[gameState.editingHistoryIndex] = updatedEntry;
        gameState.editingHistoryIndex = null;
        recalculateMatchFromHistory();
        resetThrowInputs();

        const submitBtn = document.getElementById('btnEndInning');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Inning';
        }

        updatePitcherLabels();
        updateScoreboardDisplay();
        renderLogTable();
        renderStatsTab();
        checkMatchCompletion();
        return;
    }

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
    const redPlayer = gameState.players[redPitcherKey];
    
    redPlayer.totalPts += redGross;
    redPlayer.inningsCount += 1;
    redPlayer.totalBoards += redBoard;
    redPlayer.totalHoles += redHole;

    gameState.detailedPlayerLogs.push({
        inning: gameState.currentInning,
        team: 'Red',
        playerName: redPlayer.name,
        side: redPlayer.side,
        board: redBoard,
        hole: redHole,
        missed: redMissed,
        inningScore: redGross,
        runningScore: gameState.redScore,
        isPractice: isPractice
    });

    if (!isPractice) {
        const bluePitcherKey = getActivePitcherKey('blue');
        const bluePlayer = gameState.players[bluePitcherKey];

        bluePlayer.totalPts += blueGross;
        bluePlayer.inningsCount += 1;
        bluePlayer.totalBoards += blueBoard;
        bluePlayer.totalHoles += blueHole;

        gameState.detailedPlayerLogs.push({
            inning: gameState.currentInning,
            team: 'Blue',
            playerName: bluePlayer.name,
            side: bluePlayer.side,
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
        redPitcher: redPlayer.name,
        redBoard,
        redHole,
        redGross,
        bluePitcher: !isPractice ? gameState.players[getActivePitcherKey('blue')].name : '-',
        blueBoard,
        blueHole,
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

    checkMatchCompletion();
}

// Check score threshold and launch game end prompt
function checkMatchCompletion() {
    const WINNING_SCORE = 21;
    let winnerText = '';

    if (gameState.mode === 'practice' && gameState.redScore >= WINNING_SCORE) {
        winnerText = `Practice Target Reached! (${gameState.redScore} pts)`;
    } else if (gameState.redScore >= WINNING_SCORE && gameState.redScore > gameState.blueScore) {
        winnerText = `Red Team Wins! (${gameState.redScore} - ${gameState.blueScore})`;
    } else if (gameState.blueScore >= WINNING_SCORE && gameState.blueScore > gameState.redScore) {
        winnerText = `Blue Team Wins! (${gameState.blueScore} - ${gameState.redScore})`;
    }

    if (winnerText) {
        // Disable submission button once game is over
        const submitBtn = document.getElementById('btnEndInning');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Match Complete';
        }
        showGameEndModal(winnerText);
    }
}

// Dynamic Win Pop-up Modal Controls
function showGameEndModal(winnerText) {
    let modal = document.getElementById('game-end-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'game-end-modal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="modal-card">
            <span class="modal-badge">GAME OVER</span>
            <h2>${winnerText}</h2>
            <p>Would you like to save this game's logs and statistics Firestore?</p>
            <div class="modal-actions">
                <button class="btn btn-success" onclick="confirmSaveAndClose()">Save to Firestore</button>
                <button class="btn btn-secondary" onclick="closeGameEndModal()">Dismiss</button>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
}

function confirmSaveAndClose() {
    saveMatchToSheet();
    closeGameEndModal();
}

function closeGameEndModal() {
    const modal = document.getElementById('game-end-modal');
    if (modal) modal.style.display = 'none';
}

function resetThrowInputs() {
    gameState.currentInputs = { redBoard: 0, redHole: 0, blueBoard: 0, blueHole: 0 };
    buildInputButtonGroups();
    updateButtonSelectionUI();
    updateButtonConstraints();
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

    [...gameState.history].reverse().forEach((row, reverseIndex) => {
        const tr = document.createElement('tr');
        const originalIndex = gameState.history.length - 1 - reverseIndex;
        tr.innerHTML = `
            <td><strong>${row.inning}</strong></td>
            <td>${row.redPitcher}</td>
            <td>${row.redGross}</td>
            <td class="blue-col">${row.bluePitcher}</td>
            <td class="blue-col">${row.blueGross}</td>
            <td><strong>${row.netText}</strong></td>
            <td><strong>${row.matchScore}</strong></td>
            <td><button class="btn btn-secondary btn-sm" data-inning-index="${originalIndex}" onclick="beginEditInning(${originalIndex})">Edit</button></td>
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

    // Group players logically by board
    const boards = [
        {
            title: 'Board 1 Players',
            players: [
                { key: 'blue1', team: 'Blue', colorClass: 'blue-team-card' },
                { key: 'red1', team: 'Red', colorClass: 'red-team-card' }
            ]
        }
    ];

    if (gameState.mode === '2v2') {
        boards.push({
            title: 'Board 2 Players',
            players: [
                { key: 'red2', team: 'Red', colorClass: 'red-team-card' },
                { key: 'blue2', team: 'Blue', colorClass: 'blue-team-card' }
            ]
        });
    }

    boards.forEach(board => {
        // Create Board Section Header
        const boardHeader = document.createElement('h3');
        boardHeader.className = 'board-stats-header';
        boardHeader.textContent = board.title;
        container.appendChild(boardHeader);

        const boardGrid = document.createElement('div');
        boardGrid.className = 'board-stats-grid';

        board.players.forEach(({ key, team, colorClass }) => {
            if (gameState.mode === 'practice' && team === 'Blue') return;

            const p = gameState.players[key] || { name: '', side: '', totalPts: 0, inningsCount: 0, totalHoles: 0, totalBoards: 0 };
            const safeName = getPlayerDisplayName(key, document.getElementById(
                key === 'blue1' ? 'blue-player-1' :
                key === 'red1' ? 'red-player-1' :
                key === 'red2' ? 'red-player-2' :
                'blue-player-2'
            )?.value || getPlayerLabelFallback(key));
            const safeSide = p.side || (team === 'Blue' ? 'Left' : 'Right');
            const avgPerInning = p.inningsCount > 0 ? (p.totalPts / p.inningsCount).toFixed(1) : '0.0';

            const boardPercent = p.totalBoards + p.totalHoles > 0 ? ((p.totalBoards / (p.inningsCount*4)) * 100).toFixed(1) : '0.0';

            const holePercent = p.totalBoards + p.totalHoles > 0 ? ((p.totalHoles / (p.inningsCount*4)) * 100).toFixed(1) : '0.0';

            const misses = p.totalBoards + p.totalHoles > 0 ? (p.inningsCount*4 - p.totalBoards - p.totalHoles).toFixed(0) : '0';

            const missPercent = p.totalBoards + p.totalHoles > 0 ? (((p.inningsCount*4 - p.totalBoards - p.totalHoles) / (p.inningsCount*4)) * 100).toFixed(1) : '0.0';
            
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
                        <span class="team-badge ${team.toLowerCase()}-badge">${team} Team (${safeSide})</span>
                        <h3>${safeName}</h3>
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
                        <span class="stat-value">${p.inningsCount*4}</span>
                        <span class="stat-label">Total Throws</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-value">${p.totalHoles} (${holePercent}%)</span>
                        <span class="stat-label">Hole</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-value">${p.totalBoards} (${boardPercent}%)</span>
                        <span class="stat-label">Board</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-value">${misses} (${missPercent}%)</span>
                        <span class="stat-label">Misses</span>
                    </div>
                </div>
            `;
            boardGrid.appendChild(card);
        });

        container.appendChild(boardGrid);
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