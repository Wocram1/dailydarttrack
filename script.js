let currentGame = null;
let gameData = null;

// NAVIGATION & MENÜS
function showCategoryMenu() {
    showScreen('category-screen');
}

function showSubGameMenu(category) {
    const list = document.getElementById('game-list');
    list.innerHTML = '';
    
    if (category === 'boardControl') {
        Object.keys(BoardControlGames).forEach(key => {
            const game = BoardControlGames[key];
            const btn = document.createElement('button');
            btn.className = 'game-item-btn';
            btn.innerHTML = `${game.name} <i class="fa-solid fa-chevron-right" style="float:right"></i>`;
            btn.onclick = () => showLevelSelect(key);
            list.appendChild(btn);
        });
        showScreen('subgame-screen');
    }
}

function showLevelSelect(gameKey) {
    const grid = document.getElementById('level-grid');
    grid.innerHTML = '';
    for (let i = 1; i <= 10; i++) {
        const btn = document.createElement('button');
        btn.className = 'level-btn';
        btn.innerText = i;
        btn.onclick = () => startAtc(i);
        grid.appendChild(btn);
    }
    showScreen('level-select-screen');
}

// ATC SPIEL LOGIK
function startAtc(level) {
    gameData = BoardControlGames.atc.init(level);
    currentGame = 'atc';
    updateAtcUI();
    showScreen('atc-game-screen');
}

function atcHit(type) {
    if (gameData.dartsThisRound >= 3) return;

    const isHit = (type !== 'MISS');
    gameData.dartsThisRound++;
    gameData.dartsThrownThisTarget++;

    const entry = {
        target: gameData.target,
        type: type,
        xp: BoardControlGames.atc.calculateXP(type, gameData.dartsThisRound, false)
    };
    gameData.history.push(entry);
    currentMatchXP += entry.xp;

    if (isHit) {
        gameData.hitsCollected++;
        if (gameData.hitsCollected >= gameData.targetHitsNeeded) {
            // Ziel erreicht
            gameData.target++;
            gameData.hitsCollected = 0;
            gameData.dartsThrownThisTarget = 0;
            if (gameData.hearts !== null) gameData.hearts = 3; // Herzen erneuern
        }
    } else {
        // Miss Logik für Herzen
        if (gameData.hearts !== null && gameData.dartsThrownThisTarget >= gameData.maxDartsPerTarget) {
            gameData.hearts--;
            gameData.dartsThrownThisTarget = 0;
            if (gameData.hearts <= 0) {
                if (gameData.target > 1) gameData.target--;
                gameData.hearts = 3;
            }
        }
    }

    updateAtcUI();

    if (gameData.target > 20) {
        finishAtc();
    }
}

function nextAtcRound() {
    gameData.rounds++;
    gameData.dartsThisRound = 0;
    updateAtcUI();
}

function undoAtc() {
    if (gameData.history.length === 0) return;
    const last = gameData.history.pop();
    // Einfache Rücksetzung (für komplexe Herzen/Targets müsste man den State im History-Objekt mitspeichern)
    location.reload(); // Quick & Dirty für den Prototyp, oder State-Snapshot nutzen
}

function updateAtcUI() {
    document.getElementById('atc-current-target').innerText = gameData.target;
    document.getElementById('atc-rounds').innerText = gameData.rounds;
    document.querySelectorAll('.target-val').forEach(el => el.innerText = gameData.target);
    
    // Herzen
    const hContainer = document.getElementById('atc-hearts');
    hContainer.innerHTML = '';
    if (gameData.hearts !== null) {
        for (let i = 0; i < gameData.hearts; i++) {
            hContainer.innerHTML += '<i class="fa-solid fa-heart"></i>';
        }
    }

    // Darts
    for (let i = 1; i <= 3; i++) {
        document.getElementById(`atc-dart-${i}`).classList.toggle('spent', i <= gameData.dartsThisRound);
    }
}

async function finishAtc() {
    const finalXP = currentMatchXP + 100;
    alert(`Gratulation! Around the Clock beendet. +${finalXP} XP`);
    // API Call wie bei Quickplay...
    showScreen('dashboard-screen');
}

// ... Rest deiner bisherigen Funktionen (login, showScreen etc.) ...