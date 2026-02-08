/**
 * Dart Tracker Pro - Frontend Logic
 * Expert Version: Fixes CORS, handles granular throw tracking & XP
 */

let currentUser = null;
let isSignup = false;
let currentMatchXP = 0;
let dartCount = 0; // Trackt den aktuellen Dart (1, 2 oder 3)

// Game State Management
let gameState = {
    score: 501,
    multiplier: 1,
    sessionStats: { throws: 0, hits_1: 0, hits_2: 0, hits_3: 0, doubles: 0, triples: 0 }
};

let inputBuffer = "";

// --- CENTRAL API WRAPPER (Der CORS-Killer) ---

async function apiCall(payload) {
    try {
        const res = await fetch('/api', {
            method: 'POST',
            // Wir verwenden text/plain, um den Browser-Preflight zu umgehen (CORS-Optimierung)
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

// --- AUTHENTICATION ---

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

    if (!user || !pass) {
        alert("Bitte Daten eingeben.");
        return;
    }

    const btn = document.querySelector('.btn-primary');
    btn.disabled = true;
    btn.innerText = "Lade...";

    const payload = { 
        action: isSignup ? 'signup' : 'login', 
        username: user, 
        password: pass, 
        inviteCode: code 
    };

    try {
        const data = await apiCall(payload);

        if (data.success) {
            currentUser = data.user;
            if (typeof currentUser.stats === 'string') {
                currentUser.stats = JSON.parse(currentUser.stats);
            }
            showScreen('dashboard-screen');
            updateDashboard();
        } else {
            alert(data.message || "Fehler beim Login");
        }
    } catch (e) {
        alert("Verbindungsfehler. Bitte prüfe deine Netlify-Config.");
    } finally {
        btn.disabled = false;
        btn.innerText = isSignup ? 'Registrieren' : 'Login';
    }
}

// --- DASHBOARD ---

function updateDashboard() {
    if (!currentUser) return;

    document.getElementById('display-username').innerText = currentUser.username;
    
    const level = parseInt(currentUser.level) || 1;
    const xp = parseInt(currentUser.xp) || 0;
    const nextLevelXP = level * 1000;
    const progress = (xp / nextLevelXP) * 100;

    document.getElementById('display-level').innerText = `Level ${level}`;
    document.getElementById('xp-text').innerText = `${xp} / ${nextLevelXP} XP`;
    document.getElementById('xp-bar').style.width = `${Math.min(progress, 100)}%`;
}

// --- GAME LOGIC ---

function startQuickplay() {
    gameState.score = 501;
    gameState.sessionStats = { throws: 0, hits_1: 0, hits_2: 0, hits_3: 0, doubles: 0, triples: 0 };
    currentMatchXP = 0;
    dartCount = 0;
    clearInput();
    updateGameUI();
    showScreen('game-screen');
}

function addScore(num) {
    if (inputBuffer.length < 3) {
        inputBuffer += num;
        updateInputDisplay();
    }
}

function toggleMod(type) {
    const btnD = document.getElementById('mod-d');
    const btnT = document.getElementById('mod-t');

    if (type === 'D') {
        gameState.multiplier = (gameState.multiplier === 2) ? 1 : 2;
        btnT.classList.remove('active');
        btnD.classList.toggle('active', gameState.multiplier === 2);
    } else {
        gameState.multiplier = (gameState.multiplier === 3) ? 1 : 3;
        btnD.classList.remove('active');
        btnT.classList.toggle('active', gameState.multiplier === 3);
    }
    updateInputDisplay();
}

function submitTurn() {
    // Auch wenn 0 eingegeben wurde (Miss), tracken wir den Wurf
    const val = parseInt(inputBuffer) || 0;
    const points = val * gameState.multiplier;

    // Validierung
    if (points > 60 || (val > 20 && val !== 25 && val !== 50)) {
        alert("Ungültiger Score!");
        clearInput();
        return;
    }

    // Bust Check
    if (gameState.score - points < 0 || gameState.score - points === 1) {
        alert("BUST!");
        dartCount = 0; // Runde beendet nach Bust
    } else {
        gameState.score -= points;
        trackDart(points, gameState.multiplier);
    }

    clearInput();
    updateGameUI();

    if (gameState.score === 0) {
        finishGame();
    }
}

function trackDart(points, mult) {
    dartCount++;
    gameState.sessionStats.throws++;
    
    // Tracke welcher Dart der Runde getroffen hat
    if (points > 0) {
        gameState.sessionStats[`hits_${dartCount}`]++;
    }
    
    if (mult === 2) gameState.sessionStats.doubles++;
    if (mult === 3) gameState.sessionStats.triples++;

    // XP Logik
    let gain = 5; 
    if (points >= 40) gain += 10;
    if (points >= 60) gain += 20;
    if (points === 180) gain += 100; // Bonus für Maximum (theoretisch)
    
    currentMatchXP += gain;

    if (dartCount >= 3) dartCount = 0; // Reset für nächste Aufnahme
}

function updateInputDisplay() {
    let prefix = gameState.multiplier === 2 ? "D" : (gameState.multiplier === 3 ? "T" : "");
    document.getElementById('current-input-display').innerText = prefix + (inputBuffer || "0");
}

function clearInput() {
    inputBuffer = "";
    gameState.multiplier = 1;
    document.getElementById('mod-d').classList.remove('active');
    document.getElementById('mod-t').classList.remove('active');
    updateInputDisplay();
}

function updateGameUI() {
    document.getElementById('current-score').innerText = gameState.score;
}

async function finishGame() {
    alert(`Leg beendet! +${currentMatchXP} XP`);
    
    const payload = {
        action: 'saveMatch',
        username: currentUser.username,
        xp_gain: currentMatchXP,
        match_stats: gameState.sessionStats
    };

    try {
        const data = await apiCall(payload);
        if (data.success) {
            currentUser.xp = data.newXP;
            currentUser.level = data.newLevel;
        }
    } catch (e) {
        console.error("Fehler beim Speichern");
    }

    showScreen('dashboard-screen');
    updateDashboard();
}

// --- NAVIGATION ---

function showScreen(id) {
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

function exitGame() {
    if (confirm("Spiel abbrechen?")) showScreen('dashboard-screen');
}