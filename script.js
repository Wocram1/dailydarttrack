let currentUser = null;
let gameData = null;
let pendingGame = null;
let isSignupMode = false;

const GOOGLE_SCRIPT_URL = "1XfA5fLlmhGKLsUjRkFMJtWBnPQbnu1xCh6o24UvYUqM";

// --- AUTH ---
function toggleAuthMode() {
    isSignupMode = !isSignupMode;
    document.getElementById('invite-code').classList.toggle('hidden', !isSignupMode);
    document.getElementById('login-btn').classList.toggle('hidden', isSignupMode);
    document.getElementById('signup-btn').classList.toggle('hidden', !isSignupMode);
    document.getElementById('toggle-text').innerText = isSignupMode ? "Bereits registriert?" : "Noch keinen Account?";
    document.getElementById('toggle-link').innerText = isSignupMode ? "Zum Login" : "Jetzt registrieren";
}

async function login() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'login', username: user, password: pass })
        });
        const result = await response.json();
        if (result.success) {
            currentUser = result.user;
            showScreen('training-screen');
        } else alert(result.message);
    } catch (e) { alert("Serverfehler"); }
}

async function signup() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    const invite = document.getElementById('invite-code').value;
    
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'signup', username: user, password: pass, inviteCode: invite })
        });
        const result = await response.json();
        if (result.success) {
            alert("Erfolg! Bitte einloggen.");
            toggleAuthMode();
        } else alert(result.message);
    } catch (e) { alert("Serverfehler"); }
}

// --- GAME LOGIC ---
const Categories = {
    boardControl: { name: "Board Control", source: BoardControlGames },
    finishing: { name: "Finishing", source: FinishingGames },
    scoring: { name: "Scoring", source: ScoringGames }
};

function showScreen(id) {
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    document.getElementById('main-nav').classList.toggle('hidden', id === 'login-screen' || id === 'atc-game-screen' || id === 'settings-screen');
    
    if (id === 'training-screen') renderCategories();
    if (id === 'stats-screen') renderStats();
}

function renderCategories() {
    const container = document.getElementById('category-list');
    container.innerHTML = '';
    document.getElementById('game-selection-list').classList.add('hidden');
    container.classList.remove('hidden');
    if(currentUser) document.getElementById('display-username').innerText = `Hi, ${currentUser.username}`;

    Object.keys(Categories).forEach(key => {
        const card = document.createElement('div');
        card.className = 'cat-card';
        card.innerHTML = `<span>${Categories[key].name}</span> <i class="fa-solid fa-chevron-right"></i>`;
        card.onclick = () => renderGames(key);
        container.appendChild(card);
    });
}

function renderGames(catKey) {
    const container = document.getElementById('games-container');
    container.innerHTML = '';
    document.getElementById('category-list').classList.add('hidden');
    document.getElementById('game-selection-list').classList.remove('hidden');

    const source = Categories[catKey].source;
    Object.keys(source).forEach(gameKey => {
        const card = document.createElement('div');
        card.className = 'cat-card';
        card.innerHTML = `<span><i class="fa-solid ${source[gameKey].icon}"></i> ${source[gameKey].name}</span>`;
        card.onclick = () => openGameSettings(catKey, gameKey);
        container.appendChild(card);
    });
}

function openGameSettings(catKey, gameKey) {
    const game = Categories[catKey].source[gameKey];
    pendingGame = { catKey, gameKey };
    document.getElementById('settings-title').innerText = game.name;
    const content = document.getElementById('settings-content');
    content.innerHTML = '';

    game.config.forEach(conf => {
        const row = document.createElement('div');
        row.className = 'setting-row';
        row.innerHTML = `<label>${conf.label}</label>`;
        if (conf.type === 'select') {
            let opts = conf.options.map(o => `<option value="${o}">${o}</option>`).join('');
            row.innerHTML += `<select id="conf-${conf.id}">${opts}</select>`;
        } else {
            row.innerHTML += `<input type="number" id="conf-${conf.id}" value="${conf.default}">`;
        }
        content.appendChild(row);
    });
    showScreen('settings-screen');
}

function launchGame() {
    const { catKey, gameKey } = pendingGame;
    const source = Categories[catKey].source[gameKey];
    let settings = {};
    source.config.forEach(conf => { settings[conf.id] = document.getElementById(`conf-${conf.id}`).value; });

    gameData = source.init(settings);
    gameData.catKey = catKey;
    gameData.match_stats = { throws: 0, hits_1: 0, hits_2: 0, hits_3: 0, doubles: 0, triples: 0 };
    
    document.getElementById('atc-mode-name').innerText = source.name;
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
    const totalXP = (gameData.match_stats.hits_1 * 5) + (gameData.match_stats.doubles * 15) + (gameData.match_stats.triples * 25) + 50;
    
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'saveMatch',
                username: currentUser.username,
                xp_gain: totalXP,
                match_stats: gameData.match_stats
            })
        });
        const res = await response.json();
        if (res.success) {
            currentUser.xp = res.newXP;
            currentUser.level = res.newLevel;
            currentUser.stats = res.stats;
        }
    } catch (e) { console.error("Sync Error"); }
    
    alert(`Training beendet! +${totalXP} XP`);
    showScreen('training-screen');
}

function renderStats() {
    const container = document.getElementById('stats-screen');
    if (!currentUser) return;
    const progress = (currentUser.xp % 1000) / 10;

    container.innerHTML = `
        <header class="section-header"><h2>Statistiken</h2></header>
        <div class="stats-container">
            <div class="xp-card">
                <h3>Level ${currentUser.level}</h3>
                <div class="xp-bar-bg"><div class="xp-bar-fill" style="width: ${progress}%"></div></div>
                <p>${currentUser.xp} / ${currentUser.level * 1000} XP</p>
            </div>
            <div class="stats-grid">
                <div class="mini-card"><span>Darts</span><strong>${currentUser.stats.throws || 0}</strong></div>
                <div class="mini-card"><span>Singles</span><strong>${currentUser.stats.hits_1 || 0}</strong></div>
                <div class="mini-card"><span>Doubles</span><strong>${currentUser.stats.doubles || 0}</strong></div>
                <div class="mini-card"><span>Triples</span><strong>${currentUser.stats.triples || 0}</strong></div>
            </div>
        </div>
    `;
}

function updateGameUI() {
    document.getElementById('atc-current-target').innerText = gameData.target;
    document.getElementById('atc-rounds').innerText = gameData.rounds;
    document.querySelectorAll('.target-val').forEach(el => el.innerText = gameData.target);
    const darts = gameData.history.filter(d => d.round === gameData.rounds);
    for (let i = 1; i <= 3; i++) {
        document.getElementById(`slot-${i}`).innerText = darts[i-1] ? darts[i-1].type : '-';
        document.getElementById(`atc-dart-${i}`).classList.toggle('spent', i <= darts.length);
    }
    if (!isNaN(gameData.target)) Dartboard.highlight(gameData.target);
}

function backToCategories() { renderCategories(); }
function exitGame() { if(confirm("Abbrechen?")) showScreen('training-screen'); }
function undoLastAction() { gameData.history.pop(); updateGameUI(); }
function confirmNextRound() { 
    if (gameData.history.filter(d => d.round === gameData.rounds).length > 0) {
        gameData.rounds++; updateGameUI(); 
    }
}