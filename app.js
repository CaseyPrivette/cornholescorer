const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxecJjJPboMkAWxldzcUrdtUdIANECUZUehkIa_srKjlz_gImnS6k921TfF0QUL8hRy/exec";

let currentInning = 1, gameNumber = 1;
let inningsHistory = [];
let editingInningIndex = null;
let playerRoster = ["Red Player 1", "Blue Player 1", "Red Player 2", "Blue Player 2"];

let activeScores = {
    red: { board: 0, hole: 0 },
    blue: { board: 0, hole: 0 }
};

let modalScores = {
    red: { board: 0, hole: 0 },
    blue: { board: 0, hole: 0 }
};

// Initialize Application when DOM Content is Loaded
document.addEventListener("DOMContentLoaded", () => {
    initGame();

    // Attach Event Listeners
    document.getElementById('btnAddPlayer').addEventListener('click', openAddPlayerModal);
    document.getElementById('btnCancelAddPlayer').addEventListener('click', closeAddPlayerModal);
    document.getElementById('btnSubmitAddPlayer').addEventListener('click', submitNewPlayer);
    document.getElementById('btnEndInning').addEventListener('click', calculateInning);
    document.getElementById('btnCancelEdit').addEventListener('click', closeEditModal);
    document.getElementById('btnSaveEdit').addEventListener('click', saveInningEdit);

    ['redP1Select', 'blueP1Select', 'redP2Select', 'blueP2Select'].forEach(id => {
        document.getElementById(id).addEventListener('change', updateMatchupBanner);
    });
});

function initGame() {
    let storedGame = localStorage.getItem('cornholeGameNum');
    gameNumber = storedGame ? parseInt(storedGame) : 1;
    document.getElementById('display-game-num').innerText = gameNumber;
    
    fetchRosterFromSheets();
    renderSelectors('red', activeScores, 'red-board-boxes', 'red-hole-boxes');
    renderSelectors('blue', activeScores, 'blue-board-boxes', 'blue-hole-boxes');
}

function fetchRosterFromSheets() {
    fetch(SCRIPT_URL)
        .then(res => res.json())
        .then(data => {
            if (data && data.players && data.players.length > 0) {
                playerRoster = data.players;
            }
            populatePlayerDropdowns();
        })
        .catch(err => {
            console.log("Using fallback roster:", err);
            populatePlayerDropdowns();
        });
}

function populatePlayerDropdowns() {
    const dropdownIds = ['redP1Select', 'blueP1Select', 'redP2Select', 'blueP2Select'];
    dropdownIds.forEach((id, index) => {
        const select = document.getElementById(id);
        const currentVal = select.value;
        select.innerHTML = '';
        
        playerRoster.forEach(name => {
            let opt = document.createElement('option');
            opt.value = name;
            opt.innerText = name;
            select.appendChild(opt);
        });

        if (currentVal && playerRoster.includes(currentVal)) {
            select.value = currentVal;
        } else if (playerRoster[index]) {
            select.value = playerRoster[index];
        }
    });

    updateMatchupBanner();
}

function openAddPlayerModal() {
    document.getElementById('addPlayerModal').style.display = 'flex';
    document.getElementById('newPlayerNameInput').focus();
}

function closeAddPlayerModal() {
    document.getElementById('addPlayerModal').style.display = 'none';
    document.getElementById('newPlayerNameInput').value = '';
}

function submitNewPlayer() {
    const newName = document.getElementById('newPlayerNameInput').value.trim();
    if (!newName) return;

    if (!playerRoster.includes(newName)) {
        playerRoster.push(newName);
        populatePlayerDropdowns();
    }

    fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "addPlayer", playerName: newName })
    }).catch(err => console.error("Error saving new player:", err));

    closeAddPlayerModal();
}

function getActivePitchers(innNum) {
    const red1 = document.getElementById('redP1Select').value;
    const blue1 = document.getElementById('blueP1Select').value;
    const red2 = document.getElementById('redP2Select').value;
    const blue2 = document.getElementById('blueP2Select').value;

    const isOdd = (innNum % 2 !== 0);

    return {
        redActive: isOdd ? red1 : red2,
        blueActive: isOdd ? blue1 : blue2,
        redP1: red1,
        redP2: red2,
        blueP1: blue1,
        blueP2: blue2
    };
}

function updateMatchupBanner() {
    const pitchers = getActivePitchers(currentInning);
    document.getElementById('red-pitcher-label').innerText = "RED: " + pitchers.redActive.toUpperCase();
    document.getElementById('blue-pitcher-label').innerText = "BLUE: " + pitchers.blueActive.toUpperCase();

    updatePitcherStats();
}

function updatePitcherStats() {
    const pitchers = getActivePitchers(currentInning);
    const players = [pitchers.redP1, pitchers.redP2, pitchers.blueP1, pitchers.blueP2];

    let statsMap = {};
    players.forEach(p => {
        statsMap[p] = { board: 0, hole: 0, pts: 0 };
    });

    inningsHistory.forEach(item => {
        if (statsMap[item.redPitcher]) {
            statsMap[item.redPitcher].board += item.rB;
            statsMap[item.redPitcher].hole += item.rH;
            statsMap[item.redPitcher].pts += (item.rB * 1) + (item.rH * 3);
        }
        if (statsMap[item.bluePitcher]) {
            statsMap[item.bluePitcher].board += item.bB;
            statsMap[item.bluePitcher].hole += item.bH;
            statsMap[item.bluePitcher].pts += (item.bB * 1) + (item.bH * 3);
        }
    });

    const setBox = (nameId, lineId, boxId, playerName, activeName) => {
        document.getElementById(nameId).innerText = playerName;
        const s = statsMap[playerName] || { pts: 0, board: 0, hole: 0 };
        document.getElementById(lineId).innerText = `${s.pts} pts (${s.board}B / ${s.hole}H)`;

        const boxElem = document.getElementById(boxId);
        if (playerName === activeName) {
            boxElem.classList.add('active-pitcher');
        } else {
            boxElem.classList.remove('active-pitcher');
        }
    };

    setBox('stat-red1-name', 'stat-red1-line', 'box-red-p1', pitchers.redP1, pitchers.redActive);
    setBox('stat-red2-name', 'stat-red2-line', 'box-red-p2', pitchers.redP2, pitchers.redActive);
    setBox('stat-blue1-name', 'stat-blue1-line', 'box-blue-p1', pitchers.blueP1, pitchers.blueActive);
    setBox('stat-blue2-name', 'stat-blue2-line', 'box-blue-p2', pitchers.blueP2, pitchers.blueActive);
}

function lockSetupInputs() {
    document.getElementById('redP1Select').disabled = true;
    document.getElementById('blueP1Select').disabled = true;
    document.getElementById('redP2Select').disabled = true;
    document.getElementById('blueP2Select').disabled = true;
}

function renderSelectors(team, stateObj, boardContainerId, holeContainerId) {
    const boardContainer = document.getElementById(boardContainerId);
    const holeContainer = document.getElementById(holeContainerId);

    const curBoard = stateObj[team].board;
    const curHole = stateObj[team].hole;

    boardContainer.innerHTML = '';
    holeContainer.innerHTML = '';

    for (let i = 0; i <= 4; i++) {
        let bBtn = document.createElement('button');
        bBtn.className = 'box-btn' + (curBoard === i ? ' selected' : '');
        bBtn.innerText = i;
        if (i + curHole > 4) {
            bBtn.classList.add('disabled');
        } else {
            bBtn.onclick = () => {
                stateObj[team].board = i;
                renderSelectors(team, stateObj, boardContainerId, holeContainerId);
            };
        }
        boardContainer.appendChild(bBtn);

        let hBtn = document.createElement('button');
        hBtn.className = 'box-btn' + (curHole === i ? ' selected' : '');
        hBtn.innerText = i;
        if (i + curBoard > 4) {
            hBtn.classList.add('disabled');
        } else {
            hBtn.onclick = () => {
                stateObj[team].hole = i;
                renderSelectors(team, stateObj, boardContainerId, holeContainerId);
            };
        }
        holeContainer.appendChild(hBtn);
    }
}

function getRunningTotalsUpTo(targetInning) {
    let redTotal = 0;
    let blueTotal = 0;

    inningsHistory.forEach(item => {
        if (item.inn <= targetInning) {
            let rPts = (item.rB * 1) + (item.rH * 3);
            let bPts = (item.bB * 1) + (item.bH * 3);

            if (rPts > bPts) {
                redTotal += (rPts - bPts);
            } else if (bPts > rPts) {
                blueTotal += (bPts - rPts);
            }
        }
    });

    return { redTotal, blueTotal };
}

function calculateInning() {
    lockSetupInputs();
    const isLogging = document.getElementById('loggingToggle').checked;

    let rB = activeScores.red.board;
    let rH = activeScores.red.hole;
    let bB = activeScores.blue.board;
    let bH = activeScores.blue.hole;

    const pitchers = getActivePitchers(currentInning);

    inningsHistory.push({
        inn: currentInning,
        rB: rB, rH: rH,
        bB: bB, bH: bH,
        redPitcher: pitchers.redActive,
        bluePitcher: pitchers.blueActive
    });

    const totals = getRunningTotalsUpTo(currentInning);

    if (isLogging) {
        logInningToSheets(currentInning, pitchers.redActive, pitchers.blueActive, rB, rH, bB, bH, totals.redTotal, totals.blueTotal, false);
    }

    recalculateGame();

    currentInning++;
    document.getElementById('display-inn-num').innerText = currentInning;
    activeScores.red = { board: 0, hole: 0 };
    activeScores.blue = { board: 0, hole: 0 };
    renderSelectors('red', activeScores, 'red-board-boxes', 'red-hole-boxes');
    renderSelectors('blue', activeScores, 'blue-board-boxes', 'blue-hole-boxes');
    updateMatchupBanner();
}

function recalculateGame() {
    let totalRed = 0, totalBlue = 0;

    const logBody = document.getElementById('log-body');
    logBody.innerHTML = '';

    inningsHistory.forEach((item, index) => {
        let rPts = (item.rB * 1) + (item.rH * 3);
        let bPts = (item.bB * 1) + (item.bH * 3);

        let innDiff = rPts - bPts;
        let innScoreText = "0";
        let innScoreClass = "inn-score-tie";

        if (innDiff > 0) {
            totalRed += innDiff;
            innScoreText = `+${innDiff}`;
            innScoreClass = "inn-score-red";
        } else if (innDiff < 0) {
            totalBlue += Math.abs(innDiff);
            innScoreText = `+${Math.abs(innDiff)}`;
            innScoreClass = "inn-score-blue";
        }

        let row = logBody.insertRow(0);
        row.className = "clickable-row";
        row.onclick = () => openEditModal(index);

        // Column 0: Inning Number
        row.insertCell(0).innerText = item.inn;

        // Column 1: Red Pitcher Name (No Parentheses)
        row.insertCell(1).innerText = item.redPitcher;

        // Column 2: Red Points (Color Coded)
        let redPtsCell = row.insertCell(2);
        redPtsCell.innerText = rPts;
        redPtsCell.className = "red-pts-cell";

        // Column 3: Blue Pitcher Name (No Parentheses)
        row.insertCell(3).innerText = item.bluePitcher;

        // Column 4: Blue Points (Color Coded)
        let bluePtsCell = row.insertCell(4);
        bluePtsCell.innerText = bPts;
        bluePtsCell.className = "blue-pts-cell";

        // Column 5: Inning Score (+Net Points colored by winning team or black for tie)
        let innScoreCell = row.insertCell(5);
        innScoreCell.innerText = innScoreText;
        innScoreCell.className = `inn-score-cell ${innScoreClass}`;

        // Column 6: Running Matchup Score
        row.insertCell(6).innerText = `${totalRed} - ${totalBlue}`;

        // Column 7: Action Link
        row.insertCell(7).innerHTML = `<span class="edit-action-link">Edit</span>`;
    });

    document.getElementById('red-total').innerText = totalRed;
    document.getElementById('blue-total').innerText = totalBlue;
    updatePitcherStats();

    if (totalRed >= 21 || totalBlue >= 21) {
        const winner = totalRed >= 21 ? "Red" : "Blue";
        setTimeout(() => {
            alert(winner + " Wins!");
            if (document.getElementById('loggingToggle').checked) {
                localStorage.setItem('cornholeGameNum', gameNumber + 1);
            }
            location.reload();
        }, 100);
    }
}

function openEditModal(index) {
    editingInningIndex = index;
    let data = inningsHistory[index];
    
    document.getElementById('edit-inn-num').innerText = data.inn;
    document.getElementById('modal-red-pitcher-label').innerText = "RED: " + data.redPitcher.toUpperCase();
    document.getElementById('modal-blue-pitcher-label').innerText = "BLUE: " + data.bluePitcher.toUpperCase();

    modalScores.red = { board: data.rB, hole: data.rH };
    modalScores.blue = { board: data.bB, hole: data.bH };

    renderSelectors('red', modalScores, 'modal-red-board-boxes', 'modal-red-hole-boxes');
    renderSelectors('blue', modalScores, 'modal-blue-board-boxes', 'modal-blue-hole-boxes');

    document.getElementById('editModal').style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    editingInningIndex = null;
}

function saveInningEdit() {
    if (editingInningIndex === null) return;

    let rB = modalScores.red.board;
    let rH = modalScores.red.hole;
    let bB = modalScores.blue.board;
    let bH = modalScores.blue.hole;

    let item = inningsHistory[editingInningIndex];
    item.rB = rB;
    item.rH = rH;
    item.bB = bB;
    item.bH = bH;

    recalculateGame();

    const isLogging = document.getElementById('loggingToggle').checked;

    if (isLogging) {
        for (let i = editingInningIndex; i < inningsHistory.length; i++) {
            let currentItem = inningsHistory[i];
            let totals = getRunningTotalsUpTo(currentItem.inn);
            logInningToSheets(
                currentItem.inn, 
                currentItem.redPitcher, 
                currentItem.bluePitcher, 
                currentItem.rB, 
                currentItem.rH, 
                currentItem.bB, 
                currentItem.bH, 
                totals.redTotal, 
                totals.blueTotal, 
                true
            );
        }
    }

    closeEditModal();
}

function logInningToSheets(innNum, redName, blueName, redB, redH, blueB, blueH, redRunningTotal, blueRunningTotal, isEdit = false) {
    const redPts = (redB * 1) + (redH * 3);
    const bluePts = (blueB * 1) + (blueH * 3);

    const playersToLog = [
        { name: redName, color: "Red", board: redB, hole: redH, pts: redPts },
        { name: blueName, color: "Blue", board: blueB, hole: blueH, pts: bluePts }
    ];

    playersToLog.forEach(p => {
        const payload = {
            gameNumber: gameNumber,
            inningNumber: innNum,
            playerName: p.name,
            playerColor: p.color,
            boardCount: p.board,
            holeCount: p.hole,
            pointsScored: p.pts,
            redRunningTotal: redRunningTotal,
            blueRunningTotal: blueRunningTotal,
            isEdit: isEdit
        };

        fetch(SCRIPT_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify(payload)
        }).catch(err => console.error("Logging error:", err));
    });
}