let currentUser = null;
let gameData = null;
let pendingGame = null;
let isSignupMode = false;

// URL DEINER GOOGLE APPS SCRIPT WEB-APP HIER EINTRAGEN
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx8eZeNE8MMa7zcpmyNNmBBKYlNTqh9xL6RWClxAZV6gd42DYC9a1opymHKiyhuSo1u/exec";

// --- FX ---
function spawnConfetti() {
    const container = document.getElementById('confetti-container');
    const colors = ['#00d4ff', '#ffd60a', '#00ff88', '#ff0055', '#ffffff'];
    for (let i = 0; i < 40; i++) {
        const p = document.createElement('div');
        p.className = 'confetti';
        p.style.left = Math.random() * 100 + 'vw';
        p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        p.style.width = p.style.height = Math.random() * 8 + 5 + 'px';
        p.style.animationDelay = Math.random() * 2 + 's';
        container.appendChild(p);
        setTimeout(() => p.remove(), 4000);
    }
}

// --- AUTH ---
function toggleAuthMode() {
    isSignupMode = !isSignupMode;
    document.getElementById('invite-code').classList.toggle('hidden', !isSignupMode);
    document.getElementById('login-btn').classList.toggle('hidden', isSignupMode);
    document.getElementById('signup-btn').classList.toggle('hidden', !isSignupMode);
}

async function login() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    try {
        const res = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'login', username: user, password: pass })
        });
        const result = await res.json();
        if (result.success) {
            currentUser = result.user;
            document.getElementById('login-screen').classList.add('hidden');
            showScreen('training-screen');
        } else alert(result.message);
    } catch (e) { alert("Connection Error"); }
}

async function signup() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    const invite = document.getElementById('invite-code').value;
    try {
        const res = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'signup', username: user, password: pass, inviteCode: invite })
        });
        const result = await res.json();
        if (result.success) {
            spawnConfetti(); alert("Account Created! Login now."); toggleAuthMode();
        } else alert(result.message);
    } catch (e) { alert("Connection Error"); }
}

// --- NAVIGATION & RENDERING ---
function showScreen(id) {
    const board = document.getElementById('dartboard-svg-container');
    if(board) board.innerHTML = ''; // Bugfix: Dartboard beim Wechsel killen

    document.getElementById('main-nav').classList.toggle('hidden', id === 'login-screen' || id === 'atc-game-screen');
    const main = document.getElementById('main-content');
    const container = document.getElementById('screen-container');
    
    main.classList.remove('hidden');
    container.innerHTML = ''; 

    if (id === 'training-screen') renderTrainingCategories();
    else if (id === 'stats-screen') renderStats();
    else if (id === 'quickplay-screen' || id === 'challenge-screen') {
        container.innerHTML = `<div class="float-anim"><i class="fa-solid fa-gears neon-blue" style="font-size:3rem"></i><p>COMMING SOON</p></div>`;
    }

    // Active Nav Status
    document.querySelectorAll('.nav-item').forEach(item => {
        const text = item.querySelector('span').innerText.toLowerCase();
        const map = { 'training': 'training-screen', 'stats': 'stats-screen', 'quickplay': 'quickplay-screen', 'challenge': 'challenge-screen' };
        item.classList.toggle('active', map[text] === id);
    });
}

function renderTrainingCategories() {
    const container = document.getElementById('screen-container');
    container.innerHTML = `<h2>TRAINING</h2><div class="game-grid">
        <div class="game-card" onclick="renderGamesList('boardControl')"><i class="fa-solid fa-bullseye"></i><span>Control</span></div>
        <div class="game-card" onclick="renderGamesList('finishing')"><i class="fa-solid fa-flag-checkered"></i><span>Finishing</span></div>
        <div class="game-card" onclick="renderGamesList('scoring')"><i class="fa-solid fa-bolt"></i><span>Scoring</span></div>
    </div>`;
}

function renderGamesList(catKey) {
    const container = document.getElementById('screen-container');
    container.innerHTML = `<button class="btn-neon" style="margin-bottom:20px" onclick="renderTrainingCategories()">BACK</button><div class="game-grid" id="g-grid"></div>`;
    const grid = document.getElementById('g-grid');
    const source = Categories[catKey].source;
    Object.keys(source).forEach(key => {
        const game = source[key];
        grid.innerHTML += `<div class="game-card" onclick="openGameSettings('${catKey}', '${key}')">
            <i class="fa-solid ${game.icon || 'fa-gamepad'}"></i><span>${game.name}</span>
        </div>`;
    });
}

const Categories = {
    boardControl: { name: "Control", source: BoardControlGames },
    finishing: { name: "Finishing", source: FinishingGames },
    scoring: { name: "Scoring", source: ScoringGames }
};

function openGameSettings(catKey, gameKey) {
    pendingGame = { catKey, gameKey };
    const game = Categories[catKey].source[gameKey];
    const container = document.getElementById('screen-container');
    container.innerHTML = `<div class="liquid-panel">
        <h2>${game.name}</h2>
        <div id="set-form"></div>
        <button class="btn-neon" onclick="launchGame()">START MISSION</button>
        <button class="btn-neon" style="border-color:rgba(255,255,255,0.1); color:white; margin-top:10px" onclick="renderGamesList('${catKey}')">CANCEL</button>
    </div>`;
    game.config.forEach(conf => {
        document.getElementById('set-form').innerHTML += `<div style="margin-bottom:15px"><label style="display:block; font-size:0.7rem; opacity:0.6; margin-bottom:5px">${conf.label}</label>
        <input type="number" id="conf-${conf.id}" value="${conf.default}" style="width:100%; padding:10px; background:rgba(255,255,255,0.05); border:1px solid var(--glass-border); color:white; border-radius:8px"></div>`;
    });
}

// --- GAMEPLAY ---
function launchGame() {
    const { catKey, gameKey } = pendingGame;
    const source = Categories[catKey].source[gameKey];
    let settings = {};
    source.config.forEach(conf => { settings[conf.id] = document.getElementById(`conf-${conf.id}`).value; });

    gameData = source.init(settings);
    gameData.catKey = catKey;
    gameData.match_stats = { throws: 0, hits_1: 0, hits_2: 0, hits_3: 0, doubles: 0, triples: 0 };
    
    document.getElementById('atc-mode-name').innerText = source.name.toUpperCase();
    Dartboard.render('dartboard-svg-container');
    updateGameUI();
    showScreen('atc-game-screen');
}

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

async function finishSession() {
    spawnConfetti();
    const totalXP = (gameData.match_stats.hits_1 * 5) + (gameData.match_stats.doubles * 15) + (gameData.match_stats.triples * 25) + 50;
    try {
        const res = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'saveMatch', username: currentUser.username, xp_gain: totalXP, match_stats: gameData.match_stats })
        });
        const r = await res.json();
        if (r.success) {
            if(r.newLevel > currentUser.level) spawnConfetti();
            currentUser.xp = r.newXP; currentUser.level = r.newLevel; currentUser.stats = r.stats;
        }
    } catch (e) { console.error("Sync fail"); }
    alert(`MISSION COMPLETE! +${totalXP} XP`);
    showScreen('training-screen');
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

function renderStats() {
    const container = document.getElementById('screen-container');
    if (!currentUser) return;
    const progress = (currentUser.xp % 1000) / 10;
    container.innerHTML = `<h2>USER DATA</h2><div class="xp-card">
        <h3>LEVEL ${currentUser.level}</h3>
        <div class="xp-bar-bg"><div class="xp-bar-fill" style="width:${progress}%"></div></div>
        <p style="font-size:0.7rem; opacity:0.5">${currentUser.xp} TOTAL XP</p>
    </div>
    <div class="game-grid">
        <div class="mini-card"><span>Darts</span><strong>${currentUser.stats.throws || 0}</strong></div>
        <div class="mini-card"><span>Singles</span><strong>${currentUser.stats.hits_1 || 0}</strong></div>
        <div class="mini-card"><span>Doubles</span><strong>${currentUser.stats.doubles || 0}</strong></div>
        <div class="mini-card"><span>Triples</span><strong>${currentUser.stats.triples || 0}</strong></div>
    </div>`;
}

function exitGame() { if(confirm("ABORT?")) showScreen('training-screen'); }
function undoLastAction() { gameData.history.pop(); updateGameUI(); }
function confirmNextRound() { if (gameData.history.filter(d => d.round === gameData.rounds).length > 0) { gameData.rounds++; updateGameUI(); } }