let currentUser = null;
let isSignup = false;
let currentMatchXP = 0;
let dartCount = 0; 
let throwHistory = []; 

let gameState = {
    score: 501,
    multiplier: 1,
    sessionStats: { throws: 0, hits_1: 0, hits_2: 0, hits_3: 0, doubles: 0, triples: 0 }
};

let gameData = null; 
let currentGame = null; 
let inputBuffer = "";

// --- AUTH ---
function toggleAuthMode() {
    isSignup = !isSignup;
    const inviteEl = document.getElementById('invite-code');
    const toggleBtn = document.getElementById('toggle-auth');
    const mainBtn = document.querySelector('.btn-primary');
    
    if(inviteEl) inviteEl.style.display = isSignup ? 'block' : 'none';
    if(toggleBtn) toggleBtn.innerText = isSignup ? 'Zurück zum Login' : 'Account erstellen';
    if(mainBtn) mainBtn.innerText = isSignup ? 'Registrieren' : 'Login';
}

async function login() {
    const userEl = document.getElementById('username');
    const passEl = document.getElementById('password');
    const codeEl = document.getElementById('invite-code');

    if (!userEl || !passEl) return;

    const user = userEl.value.trim();
    const pass = passEl.value.trim();
    const code = codeEl ? codeEl.value.trim() : "";

    if (!user || !pass) {
        alert("Bitte Daten eingeben.");
        return;
    }

    try {
        const res = await fetch('/api', {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: isSignup ? 'signup' : 'login', username: user, password: pass, inviteCode: code })
        });
        const data = await res.json();

        if (data.success) {
            currentUser = data.user;
            showScreen('dashboard-screen');
            updateDashboard();
        } else {
            alert(data.message);
        }
    } catch (e) {
        alert("Verbindungsfehler!");
    }
}

// --- NAVIGATION ---
function showScreen(id) {
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

function showCategoryMenu() { showScreen('category-screen'); }

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

// --- ATC LOGIK ---
function startAtc(level) {
    currentGame = 'atc';
    gameData = BoardControlGames.atc.init(level);
    currentMatchXP = 0;
    updateAtcUI();
    showScreen('atc-game-screen');
}

function atcHit(type) {
    if (gameData.dartsThisRound >= 3) return;
    const isHit = (type !== 'MISS');
    gameData.dartsThisRound++;
    gameData.dartsThrownThisTarget++;

    const xp = BoardControlGames.atc.calculateXP(type, gameData.dartsThisRound, false);
    currentMatchXP += xp;

    if (isHit) {
        gameData.hitsCollected++;
        if (gameData.hitsCollected >= gameData.targetHitsNeeded) {
            gameData.target++;
            gameData.hitsCollected = 0;
            gameData.dartsThrownThisTarget = 0;
            if (gameData.hearts !== null) gameData.hearts = 3;
        }
    } else {
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
        alert("Sieg! +" + currentMatchXP + " XP");
        showScreen('dashboard-screen');
    }
}

function nextAtcRound() {
    gameData.rounds++;
    gameData.dartsThisRound = 0;
    updateAtcUI();
}

function updateAtcUI() {
    document.getElementById('atc-current-target').innerText = gameData.target;
    document.getElementById('atc-rounds').innerText = gameData.rounds;
    document.querySelectorAll('.target-val').forEach(el => el.innerText = gameData.target);
    
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

function exitGame() { if(confirm("Abbrechen?")) showScreen('dashboard-screen'); }

function updateDashboard() {
    if (!currentUser) return;
    document.getElementById('display-username').innerText = currentUser.username;
    const level = parseInt(currentUser.level) || 1;
    const xp = parseInt(currentUser.xp) || 0;
    document.getElementById('display-level').innerText = `Lvl ${level}`;
    document.getElementById('xp-text').innerText = `${xp} / ${level * 1000} XP`;
    document.getElementById('xp-bar').style.width = `${(xp / (level * 1000)) * 100}%`;
}