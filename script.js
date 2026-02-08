/**
 * Dart Tracker Pro - Master Script
 */

let currentUser = null;
let isSignup = false; // Steuert den Registrierungs-Modus
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

// --- API ANBINDUNG ---
async function apiCall(payload) {
    try {
        const res = await fetch('/api', {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload),
            redirect: 'follow'
        });
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
        return await res.json();
    } catch (e) {
        console.error("API Error:", e);
        throw e;
    }
}

// --- AUTHENTIFIZIERUNG ---
// Diese Funktion stellt sicher, dass man zwischen Login und Registrieren wechseln kann
function toggleAuthMode() {
    isSignup = !isSignup;
    const inviteInput = document.getElementById('invite-code');
    const toggleBtn = document.getElementById('toggle-auth');
    const mainBtn = document.querySelector('.btn-primary');

    if (isSignup) {
        inviteInput.style.display = 'block';
        toggleBtn.innerText = 'Zurück zum Login';
        mainBtn.innerText = 'Registrieren';
    } else {
        inviteInput.style.display = 'none';
        toggleBtn.innerText = 'Account erstellen';
        mainBtn.innerText = 'Login';
    }
}

async function login() {
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value.trim();
    const code = document.getElementById('invite-code').value.trim();

    if (!user || !pass) return alert("Bitte Daten eingeben.");

    const btn = document.querySelector('.btn-primary');
    btn.disabled = true;
    btn.innerText = "Lade...";

    try {
        const data = await apiCall({ 
            action: isSignup ? 'signup' : 'login', 
            username: user, 
            password: pass, 
            inviteCode: code 
        });

        if (data.success) {
            currentUser = data.user;
            if (typeof currentUser.stats === 'string') currentUser.stats = JSON.parse(currentUser.stats);
            showScreen('dashboard-screen');
            updateDashboard();
        } else {
            alert(data.message || "Fehler beim Login");
        }
    } catch (e) {
        alert("Verbindungsfehler! Code 01");
    } finally {
        btn.disabled = false;
        btn.innerText = isSignup ? 'Registrieren' : 'Login';
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

// --- DASHBOARD ---
function updateDashboard() {
    if (!currentUser) return;
    document.getElementById('display-username').innerText = currentUser.username;
    const level = parseInt(currentUser.level) || 1;
    const xp = parseInt(currentUser.xp) || 0;
    const nextLevelXP = level * 1000;
    const progress = (xp / nextLevelXP) * 100;

    document.getElementById('display-level').innerText = `Lvl ${level}`;
    document.getElementById('xp-text').innerText = `${xp} / ${nextLevelXP} XP`;
    document.getElementById('xp-bar').style.width = `${Math.min(progress, 100)}%`;
}

// --- 501 QUICKPLAY LOGIK ---
function startQuickplay() {
    currentGame = '501';
    gameState.score = 501;
    gameState.sessionStats = { throws: 0, hits_1: 0, hits_2: 0, hits_3: 0, doubles: 0, triples: 0 };
    throwHistory = [];
    currentMatchXP = 0;
    dartCount = 0;
    clearInput();
    updateGameUI();
    updateDartIcons('dart-'); 
    showScreen('game-screen');
}

// Numpad Funktion für 501
function addScore(num) {
    if (inputBuffer.length < 3) {
        inputBuffer += num;
        updateInputDisplay();
    }
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
    if (gameData.target > 20) finishGame("ATC");
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
    updateDartIcons('atc-dart-');
}

// --- GEMEINSAME HELPER ---
function updateDartIcons(prefix) {
    const count = (currentGame === 'atc') ? gameData.dartsThisRound : dartCount;
    for (let i = 1; i <= 3; i++) {
        const el = document.getElementById(`${prefix}${i}`);
        if (el) el.classList.toggle('spent', i <= count);
    }
}

function clearInput() {
    inputBuffer = "";
    gameState.multiplier = 1;
    updateInputDisplay();
}

function updateInputDisplay() {
    const display = document.getElementById('current-input-display');
    if (display && currentGame === '501') {
        let p = gameState.multiplier === 2 ? "D" : (gameState.multiplier === 3 ? "T" : "");
        display.innerText = p + (inputBuffer || "0");
    }
}

function updateGameUI() {
    if (currentGame === '501') document.getElementById('current-score').innerText = gameState.score;
}

function exitGame() {
    if (confirm("Spiel abbrechen?")) showScreen('dashboard-screen');
}

async function finishGame(mode) {
    alert(`Spiel beendet! +${currentMatchXP} XP`);
    // API Call hier...
    showScreen('dashboard-screen');
    updateDashboard();
}