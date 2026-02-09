let gameData = null;
let pendingGame = null;

const Categories = {
    boardControl: { name: "Board Control", source: BoardControlGames },
    finishing: { name: "Finishing", source: FinishingGames },
    scoring: { name: "Scoring", source: ScoringGames }
};

// --- NAV ---
function showScreen(id) {
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    document.getElementById('main-nav').classList.toggle('hidden', id === 'login-screen' || id === 'atc-game-screen' || id === 'settings-screen');
    
    document.querySelectorAll('.nav-item').forEach(item => {
        const spanText = item.querySelector('span').innerText.toLowerCase();
        item.classList.toggle('active', id.includes(spanText));
    });

    if (id === 'training-screen') renderCategories();
}

function login() { showScreen('training-screen'); }

// --- TRAINING LOGIC ---
function renderCategories() {
    const container = document.getElementById('category-list');
    container.innerHTML = '';
    document.getElementById('game-selection-list').classList.add('hidden');
    container.classList.remove('hidden');

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

function backToCategories() {
    document.getElementById('game-selection-list').classList.add('hidden');
    document.getElementById('category-list').classList.remove('hidden');
}

// --- SETTINGS ---
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
    const gameSource = Categories[catKey].source[gameKey];
    let settings = {};
    gameSource.config.forEach(conf => {
        settings[conf.id] = document.getElementById(`conf-${conf.id}`).value;
    });

    gameData = gameSource.init(settings);
    document.getElementById('atc-mode-name').innerText = gameSource.name;
    Dartboard.render('dartboard-svg-container');
    updateGameUI();
    showScreen('atc-game-screen');
}

// --- GAMEPLAY ---
function processInput(hitType) {
    const darts = gameData.history.filter(d => d.round === gameData.rounds);
    if (darts.length >= 3) return;

    gameData.history.push({ round: gameData.rounds, type: hitType, target: gameData.target });
    const source = Categories[gameData.type].source;
    const result = source[gameData.mode].onHit(gameData, hitType, gameData.target);

    if (result && result.bust) { alert(result.msg); undoRound(); }
    updateGameUI();
    if (result && result.finished) { alert(result.msg || "Training beendet!"); showScreen('training-screen'); }
}

function confirmNextRound() {
    if (gameData.history.filter(d => d.round === gameData.rounds).length === 0) return;
    if (gameData.mode === 'shanghai') gameData.target++;
    if (gameData.mode === 'bermuda') {
        const hits = gameData.history.filter(d => d.round === gameData.rounds && d.type !== 'MISS');
        if (hits.length === 0) gameData.score = Math.floor(gameData.score / 2);
        gameData.targetIndex++;
        const bSource = BoardControlGames.bermuda;
        if (gameData.targetIndex >= bSource.targets.length) { alert("Spiel beendet!"); return showScreen('training-screen'); }
        gameData.target = bSource.targets[gameData.targetIndex];
    }
    gameData.rounds++;
    updateGameUI();
}

function updateGameUI() {
    document.getElementById('atc-current-target').innerText = gameData.target;
    document.getElementById('atc-rounds').innerText = gameData.rounds;
    document.querySelectorAll('.target-val').forEach(el => el.innerText = gameData.target);
    const label = document.getElementById('atc-label');
    label.innerText = (gameData.type === 'finishing') ? "REST" : (gameData.mode === 'shanghai' || gameData.mode === 'bermuda') ? "SCORE: " + gameData.score : "ZIEL";
    
    const darts = gameData.history.filter(d => d.round === gameData.rounds);
    for (let i = 1; i <= 3; i++) {
        document.getElementById(`slot-${i}`).innerText = darts[i-1] ? darts[i-1].type : '-';
        document.getElementById(`atc-dart-${i}`).classList.toggle('spent', i <= darts.length);
    }
    if (!isNaN(gameData.target)) Dartboard.highlight(gameData.target);
}

function exitGame() { if(confirm("Abbrechen?")) showScreen('training-screen'); }
function undoRound() { gameData.history = gameData.history.filter(d => d.round !== gameData.rounds); updateGameUI(); }
function undoLastAction() { gameData.history.pop(); updateGameUI(); }