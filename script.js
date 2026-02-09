let currentUser = null;
let gameData = null;
let pendingGame = null;
let isSignupMode = false;

// Deine Google Apps Script URL
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx8eZeNE8MMa7zcpmyNNmBBKYlNTqh9xL6RWClxAZV6gd42DYC9a1opymHKiyhuSo1u/exec";

// --- INITIALISIERUNG BEIM START ---
window.onload = () => {
    document.querySelectorAll('section, main, nav').forEach(el => el.classList.add('hidden'));
    document.getElementById('login-screen').classList.remove('hidden');
};

// --- NAVIGATION & SCREEN CONTROL ---
function showScreen(id) {
    // Dartboard aufräumen
    const board = document.getElementById('dartboard-svg-container');
    if(board) board.innerHTML = ''; 

    // Alles verstecken
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('main-content').classList.add('hidden');
    document.getElementById('atc-game-screen').classList.add('hidden');
    document.getElementById('main-nav').classList.add('hidden');

    // Ziel-Screen aktivieren
    if (id === 'atc-game-screen') {
        document.getElementById('atc-game-screen').classList.remove('hidden');
    } else if (id === 'login-screen') {
        document.getElementById('login-screen').classList.remove('hidden');
    } else {
        document.getElementById('main-content').classList.remove('hidden');
        document.getElementById('main-nav').classList.remove('hidden');
        renderContent(id);
    }

    // Nav-Icon Status Update
    document.querySelectorAll('.nav-item').forEach(item => {
        const text = item.querySelector('span').innerText.toLowerCase();
        const map = { 
            'training': 'training-screen', 
            'stats': 'stats-screen', 
            'quickplay': 'quickplay-screen', 
            'challenge': 'challenge-screen' 
        };
        item.classList.toggle('active', map[text] === id);
    });
}

function renderContent(id) {
    const container = document.getElementById('screen-container');
    container.innerHTML = '';
    
    if (id === 'training-screen') renderTrainingCategories();
    else if (id === 'stats-screen') renderStats();
    else {
        container.innerHTML = `<div class="float-anim" style="text-align:center; margin-top:40%"><i class="fa-solid fa-gears neon-blue" style="font-size:3rem"></i><p>COMMING SOON</p></div>`;
    }
}

// --- TRAINING & SPIEL-AUSWAHL ---
function renderTrainingCategories() {
    const container = document.getElementById('screen-container');
    container.innerHTML = `
        <h2 style="letter-spacing: 2px; text-transform: uppercase; font-size: 1rem; opacity: 0.7; margin-bottom: 20px;">Mission Hub</h2>
        <div class="game-grid">
            <div class="game-card" onclick="renderGamesList('boardControl')"><i class="fa-solid fa-bullseye"></i><span>Control</span></div>
            <div class="game-card" onclick="renderGamesList('finishing')"><i class="fa-solid fa-flag-checkered"></i><span>Finishing</span></div>
            <div class="game-card" onclick="renderGamesList('scoring')"><i class="fa-solid fa-bolt"></i><span>Scoring</span></div>
        </div>`;
}

function renderGamesList(catKey) {
    const container = document.getElementById('screen-container');
    container.innerHTML = `
        <button class="btn-neon" style="margin-bottom:20px; width:auto; padding: 8px 20px" onclick="renderTrainingCategories()">BACK</button>
        <div class="game-grid"></div>`;
    const grid = container.querySelector('.game-grid');
    const source = Categories[catKey].source;
    Object.keys(source).forEach(key => {
        const game = source[key];
        grid.innerHTML += `
            <div class="game-card" onclick="openGameSettings('${catKey}', '${key}')">
                <i class="fa-solid ${game.icon || 'fa-gamepad'}"></i>
                <span>${game.name}</span>
            </div>`;
    });
}

const Categories = {
    boardControl: { name: "Control", source: typeof BoardControlGames !== 'undefined' ? BoardControlGames : {} },
    finishing: { name: "Finishing", source: typeof FinishingGames !== 'undefined' ? FinishingGames : {} },
    scoring: { name: "Scoring", source: typeof ScoringGames !== 'undefined' ? ScoringGames : {} }
};

// --- SPIEL-START & EINSTELLUNGEN ---
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

    const form = document.getElementById('set-form');
    game.config.forEach(conf => {
        form.innerHTML += `
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
    source.config.forEach(conf => {
        settings[conf.id] = parseInt(document.getElementById(`conf-${conf.id}`).value);
    });

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
    const darts = gameData.history.filter(d => d.round === gameData.rounds);
    if (darts.length >= 3) return;

    gameData.match_stats.throws++;
    if (hitType === 'S') gameData.match_stats.hits_1++;
    if (hitType === 'D') gameData.match_stats.doubles++;
    if (hitType === 'T') gameData.match_stats.triples++;

    gameData.history.push({ round: gameData.rounds, type: hitType, target: gameData.target });
    const result = Categories[gameData.catKey].source[gameData.mode].onHit(gameData, hitType, gameData.target);

    updateGameUI();
    if (result && result.finished) finishSession();
}

function updateGameUI() {
    document.getElementById('atc-current-target').innerText = gameData.target;
    document.getElementById('atc-rounds').innerText = gameData.rounds;
    document.querySelectorAll('.target-val').forEach(el => el.innerText = gameData.target);
    
    const darts = gameData.history.filter(d => d.round === gameData.rounds);
    for (let i = 1; i <= 3; i++) {
        document.getElementById(`atc-dart-${i}`).classList.toggle('spent', i <= darts.length);
        const slot = document.getElementById(`slot-${i}`);
        slot.innerText = darts[i-1] ? darts[i-1].type : '-';
        slot.style.borderColor = darts[i-1] ? 'var(--neon-blue)' : 'var(--glass-border)';
    }
    if (typeof Dartboard !== 'undefined' && !isNaN(gameData.target)) Dartboard.highlight(gameData.target);
}

// --- STATS SEITE RENDERN ---
function renderStats() {
    const container = document.getElementById('screen-container');
    if (!currentUser) return;

    // XP Fortschritt berechnen (Beispiel: 1000 XP pro Level)
    const progress = (currentUser.xp % 1000) / 10;
    const stats = currentUser.stats || { throws: 0, hits_1: 0, doubles: 0, triples: 0 };

    container.innerHTML = `
        <h2 style="letter-spacing: 2px; text-transform: uppercase; font-size: 1rem; opacity: 0.7; margin-bottom: 20px;">Pilot Profile</h2>
        
        <div class="xp-card" style="background: var(--glass-bg); padding: 25px; border-radius: 25px; border: 1px solid var(--glass-border); margin-bottom: 25px; text-align: center;">
            <div style="font-size: 0.8rem; color: var(--neon-blue); font-weight: bold; margin-bottom: 5px;">RANK</div>
            <h3 style="font-size: 2rem; margin: 0; color: white;">LEVEL ${currentUser.level}</h3>
            
            <div class="xp-bar-bg" style="background: rgba(255,255,255,0.05); height: 12px; border-radius: 6px; margin: 20px 0; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
                <div class="xp-bar-fill" style="width: ${progress}%; background: linear-gradient(90deg, var(--neon-blue), #00ff88); height: 100%; box-shadow: 0 0 15px var(--neon-blue);"></div>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.65rem; opacity: 0.5;">
                <span>${currentUser.xp} XP TOTAL</span>
                <span>${1000 - (currentUser.xp % 1000)} XP TO NEXT LEVEL</span>
            </div>
        </div>

        <div class="game-grid">
            <div class="game-card" style="padding: 15px; cursor: default;">
                <span style="font-size: 0.6rem; opacity: 0.6;">Darts Thrown</span>
                <strong style="font-size: 1.5rem; display: block; color: var(--neon-blue);">${stats.throws || 0}</strong>
            </div>
            <div class="game-card" style="padding: 15px; cursor: default;">
                <span style="font-size: 0.6rem; opacity: 0.6;">Single Hits</span>
                <strong style="font-size: 1.5rem; display: block;">${stats.hits_1 || 0}</strong>
            </div>
            <div class="game-card" style="padding: 15px; cursor: default; border-color: #ff4757;">
                <span style="font-size: 0.6rem; opacity: 0.6;">Doubles</span>
                <strong style="font-size: 1.5rem; display: block; color: #ff4757;">${stats.doubles || 0}</strong>
            </div>
            <div class="game-card" style="padding: 15px; cursor: default; border-color: var(--neon-gold);">
                <span style="font-size: 0.6rem; opacity: 0.6;">Triples</span>
                <strong style="font-size: 1.5rem; display: block; color: var(--neon-gold);">${stats.triples || 0}</strong>
            </div>
        </div>`;
}

// --- AUTH & SERVER INTERACTION ---
async function login() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    if(!user || !pass) return alert("Credentials required.");

    try {
        const res = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'login', username: user, password: pass })
        });
        const result = await res.json();
        if (result.success) {
            currentUser = result.user;
            showScreen('training-screen');
        } else alert(result.message);
    } catch (e) { alert("Server Offline"); }
}

async function finishSession() {
    spawnConfetti();
    const stats = gameData.match_stats;
    const xpGain = (stats.hits_1 * 5) + (stats.doubles * 15) + (stats.triples * 25) + 50;

    try {
        const res = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ 
                action: 'saveMatch', 
                username: currentUser.username, 
                xp_gain: xpGain, 
                match_stats: stats 
            })
        });
        const r = await res.json();
        if (r.success) {
            currentUser.xp = r.newXP;
            currentUser.level = r.newLevel;
            currentUser.stats = r.stats;
        }
    } catch (e) { console.error("Sync Error"); }
    
    alert(`MISSION SUCCESS! +${xpGain} XP`);
    showScreen('training-screen');
}

// --- HELPER ---
function exitGame() { if(confirm("ABORT MISSION?")) showScreen('training-screen'); }
function undoLastAction() { if(gameData.history.length > 0) { gameData.history.pop(); updateGameUI(); } }
function confirmNextRound() { 
    const currentRoundDarts = gameData.history.filter(d => d.round === gameData.rounds);
    if (currentRoundDarts.length > 0) {
        gameData.rounds++; 
        updateGameUI(); 
    } 
}
function toggleAuthMode() {
    isSignupMode = !isSignupMode;
    document.getElementById('invite-code').classList.toggle('hidden', !isSignupMode);
    document.getElementById('login-btn').classList.toggle('hidden', isSignupMode);
    document.getElementById('signup-btn').classList.toggle('hidden', !isSignupMode);
}
function spawnConfetti() {
    const container = document.getElementById('confetti-container');
    for (let i = 0; i < 30; i++) {
        const p = document.createElement('div');
        p.className = 'confetti';
        p.style.left = Math.random() * 100 + 'vw';
        p.style.backgroundColor = ['#00d4ff','#ffd60a','#00ff88'][Math.floor(Math.random()*3)];
        p.style.width = p.style.height = (Math.random() * 8 + 5) + 'px';
        p.style.animation = `fall ${Math.random() * 2 + 2}s linear forwards`;
        container.appendChild(p);
        setTimeout(() => p.remove(), 3000);
    }
}