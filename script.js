let currentUser = null;
let gameData = null;
let pendingGame = null;
let isSignupMode = false;

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx8eZeNE8MMa7zcpmyNNmBBKYlNTqh9xL6RWClxAZV6gd42DYC9a1opymHKiyhuSo1u/exec";

// ERZWINGE START AUF LOGIN
window.onload = () => {
    document.querySelectorAll('section, main, nav').forEach(el => el.classList.add('hidden'));
    document.getElementById('login-screen').classList.remove('hidden');
};

// NAVIGATION & BUGFIXES
function showScreen(id) {
    // 1. Clean Up Dartboard
    const board = document.getElementById('dartboard-svg-container');
    if(board) board.innerHTML = ''; 

    // 2. Hide All
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('main-content').classList.add('hidden');
    document.getElementById('atc-game-screen').classList.add('hidden');
    document.getElementById('main-nav').classList.add('hidden');

    // 3. Show Target Screen
    if (id === 'atc-game-screen') {
        document.getElementById('atc-game-screen').classList.remove('hidden');
    } else if (id === 'login-screen') {
        document.getElementById('login-screen').classList.remove('hidden');
    } else {
        document.getElementById('main-content').classList.remove('hidden');
        document.getElementById('main-nav').classList.remove('hidden');
        renderContent(id);
    }

    // 4. Update Nav Icons
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
        container.innerHTML = `<div class="float-anim" style="text-align:center; margin-top:40%"><i class="fa-solid fa-gears neon-blue" style="font-size:3rem"></i><p>COMING SOON</p></div>`;
    }
}

// TRAINING LOGIK (BOXEN STATS LISTE)
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
    container.innerHTML = `<button class="btn-neon" style="margin-bottom:20px; width:auto; padding: 8px 20px" onclick="renderTrainingCategories()">BACK</button><div class="game-grid"></div>`;
    const grid = container.querySelector('.game-grid');
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

// LOGIN
async function login() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    if(!user || !pass) return alert("Please fill all fields");
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
    } catch (e) { alert("Server Connection Error"); }
}

// SPIEL STARTEN & UPDATEN
function launchGame() {
    const { catKey, gameKey } = pendingGame;
    const source = Categories[catKey].source[gameKey];
    let settings = {};
    source.config.forEach(conf => { settings[conf.id] = document.getElementById(`conf-${conf.id}`).value; });
    gameData = source.init(settings);
    gameData.catKey = catKey;
    gameData.match_stats = { throws: 0, hits_1: 0, hits_2: 0, hits_3: 0, doubles: 0, triples: 0 };
    document.getElementById('atc-mode-name').innerText = source.name.toUpperCase();
    showScreen('atc-game-screen');
    Dartboard.render('dartboard-svg-container');
    updateGameUI();
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

// RESTLICHE FUNKTIONEN (DUMMIES / HELPER)
function exitGame() { if(confirm("ABORT SESSION?")) showScreen('training-screen'); }
function undoLastAction() { gameData.history.pop(); updateGameUI(); }
function confirmNextRound() { if (gameData.history.filter(d => d.round === gameData.rounds).length > 0) { gameData.rounds++; updateGameUI(); } }
function toggleAuthMode() { 
    isSignupMode = !isSignupMode; 
    document.getElementById('invite-code').classList.toggle('hidden', !isSignupMode); 
    document.getElementById('login-btn').classList.toggle('hidden', isSignupMode);
    document.getElementById('signup-btn').classList.toggle('hidden', !isSignupMode);
}