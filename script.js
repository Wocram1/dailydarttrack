let currentUser = null;
let gameData = null;
let pendingGame = null;
let isSignupMode = false;

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx8eZeNE8MMa7zcpmyNNmBBKYlNTqh9xL6RWClxAZV6gd42DYC9a1opymHKiyhuSo1u/exec";

// --- INITIALISIERUNG ---
window.onload = () => {
    document.querySelectorAll('section, main, nav').forEach(el => el.classList.add('hidden'));
    document.getElementById('login-screen').classList.remove('hidden');
};

// --- NAVIGATION ---
function showScreen(id) {
    const board = document.getElementById('dartboard-svg-container');
    if(board) board.innerHTML = ''; 

    document.querySelectorAll('section, main, nav').forEach(el => el.classList.add('hidden'));

    if (id === 'atc-game-screen') {
        document.getElementById('atc-game-screen').classList.remove('hidden');
    } else if (id === 'login-screen') {
        document.getElementById('login-screen').classList.remove('hidden');
    } else {
        document.getElementById('main-content').classList.remove('hidden');
        document.getElementById('main-nav').classList.remove('hidden');
        renderContent(id);
    }

    document.querySelectorAll('.nav-item').forEach(item => {
        const text = item.querySelector('span').innerText.toLowerCase();
        const map = { 'training': 'training-screen', 'stats': 'stats-screen', 'quickplay': 'quickplay-screen', 'challenge': 'challenge-screen' };
        item.classList.toggle('active', map[text] === id);
    });
}

function renderContent(id) {
    const container = document.getElementById('screen-container');
    container.innerHTML = '';
    if (id === 'training-screen') renderTrainingCategories();
    else if (id === 'stats-screen') renderStats();
    else {
        container.innerHTML = `<div style="text-align:center; margin-top:40%"><i class="fa-solid fa-gears" style="font-size:3rem; color:var(--neon-blue)"></i><p>COMING SOON</p></div>`;
    }
}

// --- TRAINING LOGIK ---
function renderTrainingCategories() {
    const container = document.getElementById('screen-container');
    container.innerHTML = `
        <h2 style="letter-spacing: 2px; text-transform: uppercase; font-size: 0.7rem; opacity: 0.7; margin-bottom: 20px;">Mission Hub</h2>
        <div class="game-grid">
            <div class="game-card" onclick="renderGamesList('boardControl')"><i class="fa-solid fa-bullseye"></i><span>Control</span></div>
            <div class="game-card" onclick="renderGamesList('finishing')"><i class="fa-solid fa-flag-checkered"></i><span>Finishing</span></div>
            <div class="game-card" onclick="renderGamesList('scoring')"><i class="fa-solid fa-bolt"></i><span>Scoring</span></div>
        </div>`;
}

function renderGamesList(catKey) {
    const container = document.getElementById('screen-container');
    container.innerHTML = `<button class="btn-neon" style="margin-bottom:20px; width:auto; padding: 8px 20px" onclick="renderTrainingCategories()">BACK</button><div class="game-grid"></div>`;
    const grid = container.querySelector('.game-grid');
    const source = Categories[catKey].source;
    Object.keys(source).forEach(key => {
        const game = source[key];
        grid.innerHTML += `<div class="game-card" onclick="openGameSettings('${catKey}', '${key}')"><i class="fa-solid ${game.icon || 'fa-gamepad'}"></i><span>${game.name}</span></div>`;
    });
}

function openGameSettings(catKey, gameKey) {
    pendingGame = { catKey, gameKey };
    const game = Categories[catKey].source[gameKey];
    const container = document.getElementById('screen-container');
    container.innerHTML = `
        <div class="liquid-panel">
            <i class="fa-solid ${game.icon || 'fa-gear'}" style="font-size: 3rem; color: var(--neon-blue); margin-bottom: 15px;"></i>
            <h2>${game.name}</h2>
            <div id="set-form" style="text-align: left; margin: 20px 0;"></div>
            <button class="btn-neon" onclick="launchGame()">START MISSION</button>
            <button class="btn-neon" style="border-color: rgba(255,255,255,0.1); color: white; margin-top: 10px;" onclick="renderGamesList('${catKey}')">CANCEL</button>
        </div>`;
    game.config.forEach(conf => {
        document.getElementById('set-form').innerHTML += `
            <div style="margin-bottom: 15px;">
                <label style="display: block; font-size: 0.7rem; opacity: 0.6; margin-bottom: 5px;">${conf.label}</label>
                <input type="number" id="conf-${conf.id}" value="${conf.default}" style="width: 100%; padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); color: white; border-radius: 10px;">
            </div>`;
    });
}

function launchGame() {
    const { catKey, gameKey } = pendingGame;
    const source = Categories[catKey].source[gameKey];
    let settings = {};
    source.config.forEach(conf => { settings[conf.id] = parseInt(document.getElementById(`conf-${conf.id}`).value); });
    
    gameData = source.init(settings);
    gameData.catKey = catKey;
    gameData.mode = gameKey;
    gameData.match_stats = { throws: 0, hits_1: 0, hits_2: 0, hits_3: 0, doubles: 0, triples: 0 };
    
    document.getElementById('atc-mode-name').innerText = source.name.toUpperCase();
    showScreen('atc-game-screen');
    setTimeout(() => {
        if (typeof Dartboard !== 'undefined') {
            Dartboard.render('dartboard-svg-container');
            updateGameUI();
        }
    }, 50);
}

// --- GAMEPLAY LOGIK ---
function processInput(hitType) {
    const dartsInRound = gameData.history.filter(d => d.round === gameData.rounds);
    if (dartsInRound.length >= 3) return;

    gameData.match_stats.throws++;
    if (hitType === 'S') gameData.match_stats.hits_1++;
    if (hitType === 'D') gameData.match_stats.doubles++;
    if (hitType === 'T') gameData.match_stats.triples++;

    gameData.history.push({ round: gameData.rounds, type: hitType, target: gameData.target });
    const result = Categories[gameData.catKey].source[gameData.mode].onHit(gameData, hitType, gameData.target);

    updateGameUI();
    if (result && result.finished) setTimeout(() => finishSession(), 500);
}

function updateGameUI() {
    const dartsInRound = gameData.history.filter(d => d.round === gameData.rounds);
    const displayTarget = gameData.target;

    document.getElementById('atc-current-target').innerText = displayTarget;
    document.getElementById('atc-rounds').innerText = `ROUND ${gameData.rounds}`;
    
    // Dart-Icons oben (Status)
    for (let i = 1; i <= 3; i++) {
        const icon = document.getElementById(`dart-icon-${i}`);
        icon.classList.toggle('spent', i <= dartsInRound.length);
    }

    // Treffer-Slots unten
    for (let i = 1; i <= 3; i++) {
        const slot = document.getElementById(`slot-${i}`);
        const dart = dartsInRound[i-1];
        slot.innerText = dart ? dart.type : '';
    }

    // Button-Styling
    const nextBtn = document.getElementById('btn-next-round');
    if (dartsInRound.length === 3) {
        nextBtn.classList.add('ready');
        nextBtn.innerText = "CONFIRM ROUND";
    } else {
        nextBtn.classList.remove('ready');
        nextBtn.innerText = "NEXT ROUND";
    }

    if (typeof Dartboard !== 'undefined' && displayTarget) Dartboard.highlight(displayTarget);
}

function confirmNextRound() { 
    const dartsInRound = gameData.history.filter(d => d.round === gameData.rounds);
    if (dartsInRound.length > 0) {
        gameData.rounds++; 
        updateGameUI(); 
    } 
}

function undoLastAction() {
    if(gameData.history.length > 0) {
        gameData.history.pop();
        updateGameUI();
    }
}

// --- STATS & XP ---
function renderStats() {
    const container = document.getElementById('screen-container');
    if (!currentUser) return;
    const progress = (currentUser.xp % 1000) / 10;
    const stats = currentUser.stats || { throws: 0, hits_1: 0, doubles: 0, triples: 0 };
    container.innerHTML = `
        <div class="xp-card">
            <h3 style="margin:0">LEVEL ${currentUser.level}</h3>
            <div class="xp-bar-bg"><div class="xp-bar-fill" style="width: ${progress}%"></div></div>
            <div style="display:flex; justify-content:space-between; font-size:0.6rem; opacity:0.5">
                <span>${currentUser.xp} XP TOTAL</span><span>${1000-(currentUser.xp%1000)} TO NEXT</span>
            </div>
        </div>
        <div class="game-grid">
            <div class="game-card"><span>Darts</span><strong>${stats.throws}</strong></div>
            <div class="game-card"><span>Singles</span><strong>${stats.hits_1}</strong></div>
            <div class="game-card"><span>Doubles</span><strong>${stats.doubles}</strong></div>
            <div class="game-card"><span>Triples</span><strong>${stats.triples}</strong></div>
        </div>`;
}

// --- AUTH & SERVER ---
async function login() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    if(!user || !pass) return alert("Credentials required.");
    try {
        const res = await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'login', username: user, password: pass }) });
        const result = await res.json();
        if (result.success) { currentUser = result.user; showScreen('training-screen'); }
        else alert(result.message);
    } catch (e) { alert("Server Offline"); }
}

async function finishSession() {
    spawnConfetti();
    const stats = gameData.match_stats;
    const xpGain = (stats.hits_1 * 5) + (stats.doubles * 15) + (stats.triples * 25) + 50;
    try {
        const res = await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'saveMatch', username: currentUser.username, xp_gain: xpGain, match_stats: stats }) });
        const r = await res.json();
        if (r.success) { currentUser.xp = r.newXP; currentUser.level = r.newLevel; currentUser.stats = r.stats; }
    } catch (e) { console.error("Sync Error"); }
    alert(`MISSION SUCCESS! +${xpGain} XP`);
    showScreen('training-screen');
}

// --- SPIEL DEFINITIONEN (ERFORDERLICH) ---
const BoardControlGames = {
    atc: {
        name: "Around the Clock",
        icon: "fa-repeat",
        config: [{ id: 'start', label: 'Start Number', default: 1 }, { id: 'end', label: 'End Number', default: 20 }],
        init: (conf) => ({ rounds: 1, target: conf.start, end: conf.end, history: [] }),
        onHit: (data, type, target) => {
            if (type !== 'M') {
                if (data.target >= data.end) return { finished: true };
                data.target++;
            }
            return { finished: false };
        }
    }
};

const Categories = {
    boardControl: { name: "Control", source: BoardControlGames },
    finishing: { name: "Finishing", source: {} },
    scoring: { name: "Scoring", source: {} }
};

function spawnConfetti() {
    const container = document.getElementById('confetti-container');
    if(!container) return;
    for (let i = 0; i < 30; i++) {
        const p = document.createElement('div');
        p.className = 'confetti';
        p.style.left = Math.random() * 100 + 'vw';
        p.style.backgroundColor = ['#00d4ff','#ffd60a','#00ff88'][Math.floor(Math.random()*3)];
        p.style.animation = `fall ${Math.random() * 2 + 2}s linear forwards`;
        container.appendChild(p);
        setTimeout(() => p.remove(), 3000);
    }
}
function exitGame() { if(confirm("ABORT MISSION?")) showScreen('training-screen'); }