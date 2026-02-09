let currentUser = null;
let gameData = null;

// --- NAV & AUTH ---
function showScreen(id) {
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    const nav = document.getElementById('main-nav');
    (id === 'dashboard-screen' || id === 'subgame-screen') ? nav.classList.remove('hidden') : nav.classList.add('hidden');
}

function login() {
    currentUser = { username: document.getElementById('username').value || "Spieler" };
    showScreen('dashboard-screen');
    document.getElementById('display-username').innerText = currentUser.username;
}

// --- GAME HUB ---
function showSubGameMenu(cat) {
    const list = document.getElementById('game-list');
    list.innerHTML = '';
    const source = (cat === 'boardControl') ? BoardControlGames : (cat === 'finishing' ? FinishingGames : ScoringGames);
    
    Object.keys(source).forEach(key => {
        const div = document.createElement('div');
        div.className = 'cat-card';
        div.innerHTML = `<div class="cat-info"><h3>${source[key].name}</h3></div><i class="fa-solid fa-play"></i>`;
        div.onclick = () => startGame(cat, key);
        list.appendChild(div);
    });
    showScreen('subgame-screen');
}

function startGame(cat, key) {
    const source = (cat === 'boardControl') ? BoardControlGames : (cat === 'finishing') ? FinishingGames : ScoringGames;
    gameData = source[key].init();
    document.getElementById('atc-mode-name').innerText = source[key].name;
    Dartboard.render('dartboard-svg-container');
    updateGameUI();
    showScreen('atc-game-screen');
}

// --- UNIVERSAL INPUT HANDLER ---
function processInput(hitType) {
    const dartsThisRound = gameData.history.filter(d => d.round === gameData.rounds);
    if (dartsThisRound.length >= 3) return;

    // Speichere Wurf
    const entry = { round: gameData.rounds, type: hitType, prevTarget: gameData.target };
    gameData.history.push(entry);

    // Hole Logik aus der entsprechenden Datei
    let result;
    if (gameData.type === 'boardControl') result = BoardControlGames[gameData.mode].onHit(gameData, hitType);
    else if (gameData.type === 'finishing') result = FinishingGames[gameData.mode].onHit(gameData, hitType);
    else if (gameData.type === 'scoring') result = ScoringGames[gameData.mode].onHit(gameData, hitType);

    updateGameUI();
    if (result && result.finished) {
        alert("Spiel beendet!");
        showScreen('dashboard-screen');
    }
}

function undoLastAction() {
    const dartsThisRound = gameData.history.filter(d => d.round === gameData.rounds);
    if (dartsThisRound.length > 0) {
        const last = gameData.history.pop();
        gameData.target = last.prevTarget; // Ziel zurücksetzen
    } else if (gameData.rounds > 1) {
        if (confirm("Runde zurück?")) gameData.rounds--;
    }
    updateGameUI();
}

function confirmNextRound() {
    const darts = gameData.history.filter(d => d.round === gameData.rounds);
    if (darts.length === 0) return alert("Wirf erst deine Darts!");
    
    gameData.rounds++;
    // Spezialfall Shanghai: Ziel erhöht sich jede Runde
    if (gameData.mode === 'shanghai') gameData.target++;
    
    updateGameUI();
}

function updateGameUI() {
    document.getElementById('atc-current-target').innerText = gameData.target;
    document.getElementById('atc-rounds').innerText = gameData.rounds;
    document.querySelectorAll('.target-val').forEach(el => el.innerText = gameData.target);
    
    const darts = gameData.history.filter(d => d.round === gameData.rounds);
    for (let i = 1; i <= 3; i++) {
        const d = darts[i-1];
        document.getElementById(`slot-${i}`).innerText = d ? (d.type === 'MISS' ? 'X' : d.type + gameData.target) : '-';
        document.getElementById(`atc-dart-${i}`).classList.toggle('spent', i <= darts.length);
    }
    Dartboard.highlight(gameData.target);
}

function exitGame() { if(confirm("Abbrechen?")) showScreen('dashboard-screen'); }