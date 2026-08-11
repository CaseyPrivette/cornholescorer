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

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
    initGame();

    // Event Bindings
    document.getElementById('btnAddPlayer').addEventListener('click', openAddPlayerModal);
    document.getElementById('btnCancelAddPlayer').addEventListener('click', closeAddPlayerModal);
    document.getElementById('btnSubmitAddPlayer').addEventListener('click', submitNewPlayer);
    document.getElementById('btnEndInning').addEventListener('click', calculateInning);
    document.getElementById('btnCancelEdit').addEventListener('click', closeEditModal);
    document.getElementById('btnSaveEdit').addEventListener('click', saveInningEdit);
    document.getElementById('practiceToggle').addEventListener('change', handlePracticeModeToggle);

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

function handlePracticeModeToggle() {
    const isPractice = document.getElementById('practiceToggle').checked;

    const setupGrid = document.getElementById('setup-grid');
    const matchupBox2 = document.getElementById('matchup-box-2');
    const blueP1Group = document.getElementById('blue-p1-group');
    const labelRedP1 = document.getElementById('label-red-p1');
    const matchupTitle1 = document.getElementById('matchup-title-1');
    
    const blueScoreBox = document.getElementById('blue-score-box');
    const redScoreLabel = document.getElementById('red-score-label');
    const blueTeamSection = document.getElementById('blue-team-section');
    
    const statsGrid = document.getElementById('stats-grid');
    const blueStatCol = document.getElementById('blue-stat-col');
    const boxRedP2 = document.getElementById('box-red-p2');
    const redStatHeader = document.getElementById('red-stat-header');

    const thRedPts = document.getElementById('th-red-pts');
    const thBlueP = document.getElementById('th-blue-p');
    const thBluePts = document.getElementById('th-blue-pts');
    const thInnScore = document.getElementById('th-inn-score');
    const thMatchScore = document.getElementById('th-match-score');

    const modalBlueTeam = document.getElementById('modal-blue-team');

    if (isPractice) {
        setupGrid.classList.add('practice-mode');
        matchupBox2.style.display = 'none';
        blueP1Group.style.display = 'none';
        labelRedP1.innerText = "Player Name";
        matchupTitle1.innerText = "Practice Player";

        blueScoreBox.style.display = 'none';
        redScoreLabel.innerText = "PRACTICE SCORE";

        blueTeamSection.style.display = 'none';

        statsGrid.classList.add('practice-mode');
        blueStatCol.style.display = 'none';
        boxRedP2.style.display = 'none';
        redStatHeader.innerText = "Player Stats";

        thRedPts.innerText = "Points";
        thBlueP.style.display = 'none';
        thBluePts.style.display = 'none';
        thInnScore.style.display = 'none';
        thMatchScore.innerText = "Total Score";

        modalBlueTeam.style.display = 'none';
    } else {
        setupGrid.classList.remove('practice-mode');
        matchupBox2.style.display = 'block';
        blueP1Group.style.display = 'block';
        labelRedP1.innerText = "Red Player 1";
        matchupTitle1.innerText = "1st Inning Matchup";

        blueScoreBox.style.display = 'flex';
        redScoreLabel.innerText = "RED";

        blueTeamSection.style.display = 'block';

        statsGrid.classList.remove('practice-mode');
        blueStatCol.style.display = 'flex';
        boxRedP2.style.display = 'block';
        redStatHeader.innerText = "Red Team";

        thRedPts.innerText = "Red Pts";
        thBlueP.style.display = '';
        thBluePts.style.display = '';
        thInnScore.style.display = '';
        thMatchScore.innerText = "Match Score";

        modalBlueTeam.style.display = 'block';
    }

    updateMatchupBanner();
    recalculateGame();
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
    const isPractice = document.getElementById('practiceToggle').checked;
    const red1 = document.getElementById('redP1Select').value;
    const blue1 = document.getElementById('blueP1Select').value;
    const red2 = document.getElementById('redP2Select').value;
    const blue2 = document.getElementById('blueP2Select').value;

    if (isPractice) {
        return {
            redActive: red1,
            blueActive: "N/A",
            redP1: red1,
            redP2: red1,
            blueP1: "N/A",
            blueP2: "N/A"
        };
    }

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
    const isPractice = document.getElementById('practiceToggle').checked;
    const pitchers = getActivePitchers(currentInning);

    if (isPractice) {
        document.getElementById('red-pitcher-label').innerText = "PLAYER: " + pitchers.redActive.toUpperCase();
    } else {
        document.getElementById('red-pitcher-label').innerText = "RED: " + pitchers.redActive.toUpperCase();
        document.getElementById('blue-pitcher-label').innerText = "BLUE: " + pitchers.blueActive.toUpperCase();
    }

    updatePitcherStats();
}

function updatePitcherStats() {
    const isPractice = document.getElementById('practiceToggle').checked;
    const pitchers = getActivePitchers(currentInning);
    const players = [pitchers.redP1, pitchers.redP2, pitchers.blueP1, pitchers.blueP2];

    let statsMap = {};
    players.forEach(p => {
        if (p !== "N/A") {
            statsMap[p] = { board: 0, hole: 0, missed: 0, pts: 0, innings: 0 };
        }
    });

    inningsHistory.forEach(item => {
        if (statsMap[item.redPitcher]) {
            let m = 4 - (item.rB + item.rH);
            statsMap[item.redPitcher].board += item.rB;
            statsMap[item.redPitcher].hole += item.rH;
            statsMap[item.redPitcher].missed += m;
            statsMap[item.redPitcher].pts += (item.rB * 1) + (item.rH * 3);
            statsMap[item.redPitcher].innings += 1;
        }
        if (statsMap[item.bluePitcher]) {
            let m = 4 - (item.bB + item.bH);
            statsMap[item.bluePitcher].board += item.bB;
            statsMap[item.bluePitcher].hole += item.bH;
            statsMap[item.bluePitcher].missed += m;
            statsMap[item.bluePitcher].pts += (item.bB * 1) + (item.bH * 3);
            statsMap[item.bluePitcher].innings += 1;
        }
    });

    const buildStatsHTML = (playerName, opponentName) => {
        const s = statsMap[playerName] || { board: 0, hole: 0, missed: 0, pts: 0, innings: 0 };
        const oppS = statsMap[opponentName] || { pts: 0 };

        const totalBags = s.innings * 4;
        const bPct = totalBags > 0 ? ((s.board / totalBags) * 100).toFixed(1) : "0.0";
        const hPct = totalBags > 0 ? ((s.hole / totalBags) * 100).toFixed(1) : "0.0";
        const mPct = totalBags > 0 ? ((s.missed / totalBags) * 100).toFixed(1) : "0.0";

        let diffText = "";
        if (!isPractice && opponentName !== "N/A") {
            let diff = s.pts - oppS.pts;
            let formattedDiff = diff > 0 ? `+${diff}` : `${diff}`;
            diffText = ` (${formattedDiff})`;
        }

        return `
            <div class="stat-line"><strong>Total Pts:</strong> ${s.pts}${diffText}</div>
            <div class="stat-line"><strong>Board:</strong> ${s.board} (${bPct}%)</div>
            <div class="stat-line"><strong>Hole:</strong> ${s.hole} (${hPct}%)</div>
            <div class="stat-line"><strong>Missed:</strong> ${s.missed} (${mPct}%)</div>
        `;
    };

    const setBox = (nameId, lineId, boxId, playerName, activeName, opponentName) => {
        const nameElem = document.getElementById(nameId);
        if (!nameElem) return;

        nameElem.innerText = playerName;
        document.getElementById(lineId).innerHTML = buildStatsHTML(playerName, opponentName);

        const boxElem = document.getElementById(boxId);
        if (playerName === activeName) {
            boxElem.classList.add('active-pitcher');
        } else {
            boxElem.classList.remove('active-pitcher');
        }
    };

    setBox('stat-red1-name', 'stat-red1-line', 'box-red-p1', pitchers.redP1, pitchers.redActive, pitchers.blueP1);
    setBox('stat-red2-name', 'stat-red2-line', 'box-red-p2', pitchers.redP2, pitchers.redActive, pitchers.blueP2);
    setBox('stat-blue1-name', 'stat-blue1-line', 'box-blue-p1', pitchers.blueP1, pitchers.blueActive, pitchers.redP1);
    setBox('stat-blue2-name', 'stat-blue2-line', 'box-blue-p2', pitchers.blueP2, pitchers.blueActive, pitchers.redP2);
}

function lockSetupInputs() {
    document.getElementById('redP1Select').disabled = true;
    document.getElementById('blueP1Select').disabled = true;
    document.getElementById('redP2Select').disabled = true;
    document.getElementById('blueP2Select').disabled = true;
    document.getElementById('practiceToggle').disabled = true;
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

function getPlayerCumulativeScore(playerName, targetInning) {
    let total = 0;
    inningsHistory.forEach(item => {
        if (item.inn <= targetInning) {
            if (item.redPitcher === playerName) {
                total += (item.rB * 1) + (item.rH * 3);
            }
            if (item.bluePitcher === playerName) {
                total += (item.bB * 1) + (item.bH * 3);
            }
        }
    });
    return total;
}

function calculateInning() {
    lockSetupInputs();
    const isLogging = document.getElementById('loggingToggle').checked;
    const isPractice = document.getElementById('practiceToggle').checked;

    let rB = activeScores.red.board;
    let rH = activeScores.red.hole;
    let bB = isPractice ? 0 : activeScores.blue.board;
    let bH = isPractice ? 0 : activeScores.blue.hole;

    const pitchers = getActivePitchers(currentInning);

    inningsHistory.push({
        inn: currentInning,
        rB: rB, rH: rH,
        bB: bB, bH: bH,
        redPitcher: pitchers.redActive,
        bluePitcher: pitchers.blueActive
    });

    if (isLogging) {
        logInningToSheets(
            currentInning, 
            pitchers.redActive, 
            pitchers.blueActive, 
            rB, rH, bB, bH, 
            isPractice
        );
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
    const isPractice = document.getElementById('practiceToggle').checked;
    let totalRed = 0, totalBlue = 0;

    const logBody = document.getElementById('log-body');
    logBody.innerHTML = '';

    inningsHistory.forEach((item, index) => {
        let rPts = (item.rB * 1) + (item.rH * 3);
        let bPts = (item.bB * 1) + (item.bH * 3);

        let innDiff = rPts - bPts;
        let innScoreText = "0";
        let innScoreClass = "inn-score-tie";

        if (isPractice) {
            totalRed += rPts;
        } else {
            if (innDiff > 0) {
                totalRed += innDiff;
                innScoreText = `+${innDiff}`;
                innScoreClass = "inn-score-red";
            } else if (innDiff < 0) {
                totalBlue += Math.abs(innDiff);
                innScoreText = `+${Math.abs(innDiff)}`;
                innScoreClass = "inn-score-blue";
            }
        }

        let row = logBody.insertRow(0);
        row.className = "clickable-row";
        row.onclick = () => openEditModal(index);

        row.insertCell(0).innerText = item.inn;
        row.insertCell(1).innerText = item.redPitcher;

        let redPtsCell = row.insertCell(2);
        redPtsCell.innerText = rPts;
        redPtsCell.className = "red-pts-cell";

        if (!isPractice) {
            row.insertCell(3).innerText = item.bluePitcher;

            let bluePtsCell = row.insertCell(4);
            bluePtsCell.innerText = bPts;
            bluePtsCell.className = "blue-pts-cell";

            let innScoreCell = row.insertCell(5);
            innScoreCell.innerText = innScoreText;
            innScoreCell.className = `inn-score-cell ${innScoreClass}`;

            let matchScoreCell = row.insertCell(6);
            matchScoreCell.className = "match-score-cell";
            matchScoreCell.innerHTML = `<span class="match-score-red">${totalRed}</span> - <span class="match-score-blue">${totalBlue}</span>`;

            row.insertCell(7).innerHTML = `<span class="edit-action-link">Edit</span>`;
        } else {
            let matchScoreCell = row.insertCell(3);
            matchScoreCell.className = "match-score-cell";
            matchScoreCell.innerHTML = `<span class="match-score-red">${totalRed}</span>`;

            row.insertCell(4).innerHTML = `<span class="edit-action-link">Edit</span>`;
        }
    });

    document.getElementById('red-total').innerText = totalRed;
    document.getElementById('blue-total').innerText = totalBlue;
    updatePitcherStats();

    if (!isPractice && (totalRed >= 21 || totalBlue >= 21)) {
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
    const isPractice = document.getElementById('practiceToggle').checked;
    
    document.getElementById('edit-inn-num').innerText = data.inn;
    document.getElementById('modal-red-pitcher-label').innerText = (isPractice ? "PLAYER: " : "RED: ") + data.redPitcher.toUpperCase();
    if (!isPractice) {
        document.getElementById('modal-blue-pitcher-label').innerText = "BLUE: " + data.bluePitcher.toUpperCase();
    }

    modalScores.red = { board: data.rB, hole: data.rH };
    modalScores.blue = { board: data.bB, hole: data.bH };

    renderSelectors('red', modalScores, 'modal-red-board-boxes', 'modal-red-hole-boxes');
    if (!isPractice) {
        renderSelectors('blue', modalScores, 'modal-blue-board-boxes', 'modal-blue-hole-boxes');
    }

    document.getElementById('editModal').style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    editingInningIndex = null;
}

function saveInningEdit() {
    if (editingInningIndex === null) return;
    const isPractice = document.getElementById('practiceToggle').checked;

    let rB = modalScores.red.board;
    let rH = modalScores.red.hole;
    let bB = isPractice ? 0 : modalScores.blue.board;
    let bH = isPractice ? 0 : modalScores.blue.hole;

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
            logInningToSheets(
                currentItem.inn, 
                currentItem.redPitcher, 
                currentItem.bluePitcher, 
                currentItem.rB, 
                currentItem.rH, 
                currentItem.bB, 
                currentItem.bH, 
                isPractice
            );
        }
    }

    closeEditModal();
}

function logInningToSheets(innNum, redName, blueName, redB, redH, blueB, blueH, isPractice = false) {
    const redPts = (redB * 1) + (redH * 3);
    const bluePts = (blueB * 1) + (blueH * 3);

    const playersToLog = isPractice ? [
        { name: redName, color: "Practice", board: redB, hole: redH, pts: redPts }
    ] : [
        { name: redName, color: "Red", board: redB, hole: redH, pts: redPts },
        { name: blueName, color: "Blue", board: blueB, hole: blueH, pts: bluePts }
    ];

    playersToLog.forEach(p => {
        const playerRunningTotal = getPlayerCumulativeScore(p.name, innNum);
        const missedBoard = 4 - (p.board + p.hole);

        const payload = {
            gameNumber: gameNumber,
            inningNumber: innNum,
            playerName: p.name,
            playerColor: p.color,
            boardCount: p.board,
            holeCount: p.hole,
            missedBoard: missedBoard,
            pointsScored: p.pts,
            playerRunningTotal: playerRunningTotal,
            isPractice: isPractice
        };

        fetch(SCRIPT_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify(payload)
        }).catch(err => console.error("Logging error:", err));
    });
}