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

let inputBuffer = "";

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

function toggleAuthMode() {
    isSignup = !isSignup;
    document.getElementById('invite-code').style.display = isSignup ? 'block' : 'none';
    document.getElementById('toggle-auth').innerText = isSignup ? 'Zurück zum Login' : 'Account erstellen';
    document.querySelector('.btn-primary').innerText = isSignup ? 'Registrieren' : 'Login';
}

async function login() {
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value.trim();
    const code = document.getElementById('invite-code').value.trim();

    if (!user || !pass) return alert("Daten eingeben.");

    const btn = document.querySelector('.btn-primary');
    btn.disabled = true;
    btn.innerText = "Lade...";

    try {
        const data = await apiCall({ 
            action: isSignup ? 'signup' : 'login', 
            username: user, password: pass, inviteCode: code 
        });

        if (data.success) {
            currentUser = data.user;
            if (typeof currentUser.stats === 'string') currentUser.stats = JSON.parse(currentUser.stats);
            showScreen('dashboard-screen');
            updateDashboard();
        } else {
            alert(data.message);
        }
    } catch (e) {
        alert("Fehler!");
    } finally {
        btn.disabled = false;
        btn.innerText = isSignup ? 'Registrieren' : 'Login';
    }
}

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

function startQuickplay() {
    gameState.score = 501;
    gameState.sessionStats = { throws: 0, hits_1: 0, hits_2: 0, hits_3: 0, doubles: 0, triples: 0 };
    throwHistory = [];
    currentMatchXP = 0;
    dartCount = 0;
    setMod(1);
    clearInput();
    updateGameUI();
    updateDartIcons();
    showScreen('game-screen');
}

function setMod(m) {
    gameState.multiplier = m;
    document.querySelectorAll('.mod-btn').forEach((b, i) => b.classList.toggle('active', i === m-1));
    updateInputDisplay();
}

function addScore(num) {
    if (inputBuffer.length < 3) {
        inputBuffer += num;
        updateInputDisplay();
    }
}

function submitTurn() {
    const val = parseInt(inputBuffer) || 0;
    const points = val * gameState.multiplier;

    if (points > 60 || (val > 20 && val !== 25 && val !== 50)) {
        alert("Ungültig!");
        clearInput();
        return;
    }

    if (gameState.score - points < 0 || gameState.score - points === 1) {
        alert("BUST!");
        dartCount = 0;
    } else {
        gameState.score -= points;
        trackDart(points, gameState.multiplier);
    }

    clearInput();
    setMod(1);
    updateGameUI();
    if (gameState.score === 0) finishGame();
}

function trackDart(points, mult) {
    let gain = 5;
    if (points >= 40) gain += 10;
    if (points >= 60) gain += 20;

    throwHistory.push({ points, mult, xp: gain, dartNum: dartCount + 1 });

    dartCount++;
    gameState.sessionStats.throws++;
    if (points > 0) gameState.sessionStats[`hits_${dartCount}`]++;
    if (mult === 2) gameState.sessionStats.doubles++;
    if (mult === 3) gameState.sessionStats.triples++;
    currentMatchXP += gain;

    updateDartIcons();
    if (dartCount >= 3) {
        setTimeout(() => { dartCount = 0; updateDartIcons(); }, 800);
    }
}

function undoLastThrow() {
    if (throwHistory.length === 0) return;
    const last = throwHistory.pop();
    gameState.score += last.points;
    gameState.sessionStats.throws--;
    if (last.points > 0) gameState.sessionStats[`hits_${last.dartNum}`]--;
    if (last.mult === 2) gameState.sessionStats.doubles--;
    if (last.mult === 3) gameState.sessionStats.triples--;
    currentMatchXP -= last.xp;
    dartCount = (dartCount === 0) ? 2 : last.dartNum - 1;
    updateGameUI();
    updateDartIcons();
}

function updateDartIcons() {
    for (let i = 1; i <= 3; i++) {
        document.getElementById(`dart-${i}`).classList.toggle('spent', i <= dartCount);
    }
}

function updateInputDisplay() {
    let p = gameState.multiplier === 2 ? "D" : (gameState.multiplier === 3 ? "T" : "");
    document.getElementById('current-input-display').innerText = p + (inputBuffer || "0");
}

function clearInput() { inputBuffer = ""; updateInputDisplay(); }

function updateGameUI() { document.getElementById('current-score').innerText = gameState.score; }

async function finishGame() {
    alert(`Leg beendet! +${currentMatchXP} XP`);
    const data = await apiCall({ 
        action: 'saveMatch', username: currentUser.username, 
        xp_gain: currentMatchXP, match_stats: gameState.sessionStats 
    });
    if (data.success) {
        currentUser.xp = data.newXP;
        currentUser.level = data.newLevel;
    }
    showScreen('dashboard-screen');
    updateDashboard();
}

function showScreen(id) {
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

function exitGame() { if (confirm("Spiel abbrechen?")) showScreen('dashboard-screen'); }