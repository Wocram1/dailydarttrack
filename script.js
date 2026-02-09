let currentUser = null;
let isSignup = false;
let currentMatchXP = 0;
let gameData = null; 
let currentGame = null;

// --- AUTH & NAV ---
function showScreen(id) {
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

function toggleAuthMode() {
    isSignup = !isSignup;
    document.getElementById('invite-code').style.display = isSignup ? 'block' : 'none';
    document.getElementById('toggle-auth').innerText = isSignup ? 'Zurück' : 'Account erstellen';
}

async function login() {
    const user = document.getElementById('username').value.trim();
    if (!user) return alert("User eingeben");
    currentUser = { username: user, level: 1, xp: 0 };
    showScreen('dashboard-screen');
    updateDashboard();
}

function showCategoryMenu() { showScreen('category-screen'); }

function showSubGameMenu(cat) {
    const list = document.getElementById('game-list');
    list.innerHTML = '';
    if (cat === 'boardControl') {
        Object.keys(BoardControlGames).forEach(key => {
            const btn = document.createElement('button');
            btn.className = 'game-item-btn';
            btn.innerHTML = BoardControlGames[key].name;
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

// --- ATC SPIEL ---
function startAtc(level) {
    currentGame = 'atc';
    gameData = BoardControlGames.atc.init(level);
    currentMatchXP = 0;
    Dartboard.render('dartboard-svg-container');
    updateAtcUI();
    updateDartSlots();
    showScreen('atc-game-screen');
}

function atcHit(type) {
    const currentRoundDarts = gameData.history.filter(d => d.round === gameData.rounds);
    if (currentRoundDarts.length >= 3) return alert("Runde beendet!");

    const isHit = (type !== 'MISS');
    const entry = {
        round: gameData.rounds,
        target: gameData.target,
        type: type,
        hitsCollected: gameData.hitsCollected,
        hearts: gameData.hearts,
        dartsThrownThisTarget: gameData.dartsThrownThisTarget,
        xp: BoardControlGames.atc.calculateXP(type, currentRoundDarts.length + 1, false)
    };

    gameData.history.push(entry);
    currentMatchXP += entry.xp;

    if (isHit) {
        gameData.hitsCollected++;
        if (gameData.hitsCollected >= gameData.targetHitsNeeded) {
            gameData.target++;
            gameData.hitsCollected = 0;
            gameData.dartsThrownThisTarget = 0;
            if (gameData.hearts !== null) gameData.hearts = 3;
        }
    } else {
        gameData.dartsThrownThisTarget++;
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
    updateDartSlots();
    if (gameData.target > 20) finishGame();
}

function undoAtc() {
    const currentRoundDarts = gameData.history.filter(d => d.round === gameData.rounds);
    if (currentRoundDarts.length > 0) {
        const removed = gameData.history.pop();
        currentMatchXP -= removed.xp;
        const last = gameData.history[gameData.history.length - 1];
        if (last) {
            gameData.target = last.target;
            gameData.hearts = last.hearts;
            gameData.hitsCollected = last.hitsCollected;
            gameData.dartsThrownThisTarget = last.dartsThrownThisTarget;
        } else {
            gameData.target = 1; gameData.hitsCollected = 0; gameData.dartsThrownThisTarget = 0;
            if (gameData.hearts !== null) gameData.hearts = 3;
        }
    } else if (gameData.rounds > 1) {
        if (confirm("Eine Runde zurückgehen?")) gameData.rounds--;
    }
    updateAtcUI();
    updateDartSlots();
}

function nextAtcRound() {
    const darts = gameData.history.filter(d => d.round === gameData.rounds);
    if (darts.length === 0) return alert("Wirf erst!");
    gameData.rounds++;
    updateAtcUI();
    updateDartSlots();
}

function updateAtcUI() {
    document.getElementById('atc-current-target').innerText = gameData.target;
    document.getElementById('atc-rounds').innerText = gameData.rounds;
    document.querySelectorAll('.target-val').forEach(el => el.innerText = gameData.target);
    Dartboard.highlight(gameData.target);
    
    // Herzen & Darts
    const h = document.getElementById('atc-hearts');
    h.innerHTML = '';
    if (gameData.hearts !== null) {
        for (let i = 0; i < gameData.hearts; i++) h.innerHTML += '<i class="fa-solid fa-heart"></i>';
    }
    const currentDartsCount = gameData.history.filter(d => d.round === gameData.rounds).length;
    for (let i = 1; i <= 3; i++) {
        document.getElementById(`atc-dart-${i}`).classList.toggle('spent', i <= currentDartsCount);
    }
}

function updateDartSlots() {
    const currentDarts = gameData.history.filter(d => d.round === gameData.rounds);
    for (let i = 1; i <= 3; i++) {
        const slot = document.getElementById(`slot-${i}`);
        const d = currentDarts[i - 1];
        slot.innerText = d ? (d.type === 'MISS' ? 'X' : d.type + d.target) : '-';
    }
}

function updateDashboard() {
    document.getElementById('display-username').innerText = currentUser.username;
    document.getElementById('xp-bar').style.width = "10%";
}
function exitGame() { if(confirm("Ende?")) showScreen('dashboard-screen'); }
function startQuickplay() { alert("501 startet..."); }