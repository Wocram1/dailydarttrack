/**
 * Dart Tracker Pro - Frontend Logic
 * Expert Version: Robust Error Handling & Modular Design
 */

let currentUser = null;
let isSignup = false;
let currentMatchXP = 0;

// Game State Management
let gameState = {
    score: 501,
    multiplier: 1,
    history: [],
    sessionStats: { throws: 0, hits_1: 0, hits_2: 0, hits_3: 0, doubles: 0, triples: 0 }
};

let inputBuffer = "";

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
        alert("Bitte Benutzernamen und Passwort eingeben.");
        return;
    }

    const btn = document.querySelector('.btn-primary');
    btn.disabled = true;
    btn.innerText = "Verbindung wird hergestellt...";

    const action = isSignup ? 'signup' : 'login';
    const payload = { 
        action: action, 
        username: user, 
        password: pass, 
        inviteCode: code 
    };

    try {
        // Der Request geht an den Netlify Proxy /api/
        const res = await fetch('/api/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        // Falls der Proxy einen Fehler wirft (z.B. 404 oder 500)
        if (!res.ok) {
            throw new Error(`Server-Antwort war nicht OK: ${res.status}`);
        }

        const data = await res.json();
        console.log("Backend Response:", data);

        if (data.success) {
            currentUser = data.user;
            // Falls stats noch als String kommen, parsen
            if (typeof currentUser.stats === 'string') {
                currentUser.stats = JSON.parse(currentUser.stats);
            }
            showScreen('dashboard-screen');
            updateDashboard();
        } else {
            // Zeigt die spezifische Fehlermeldung vom Google Script (z.B. "Falscher Invite Code")
            alert("Fehler: " + (data.message || "Unbekannter Fehler"));
        }
    } catch (e) {
        console.error("Auth Error:", e);
        alert("Verbindungsfehler: " + e.message + "\n\nBitte prüfe, ob die URL in deiner netlify.toml aktuell ist.");
    } finally {
        btn.disabled = false;
        btn.innerText = isSignup ? 'Registrieren' : 'Login';
    }
}

// --- DASHBOARD ---

function updateDashboard() {
    if (!currentUser) return;

    document.getElementById('display-username').innerText = currentUser.username;
    
    // Level & XP Logik
    const level = parseInt(currentUser.level) || 1;
    const xp = parseInt(currentUser.xp) || 0;
    const nextLevelXP = level * 1000;
    const progress = (xp / nextLevelXP) * 100;

    document.getElementById('display-level').innerText = `Level ${level}`;
    document.getElementById('xp-text').innerText = `${xp} / ${nextLevelXP} XP`;
    document.getElementById('xp-bar').style.width = `${Math.min(progress, 100)}%`;
}

// --- GAME LOGIC (501 QUICKPLAY) ---

function startQuickplay() {
    gameState.score = 501;
    gameState.sessionStats = { throws: 0, hits_1: 0, hits_2: 0, hits_3: 0, doubles: 0, triples: 0 };
    currentMatchXP = 0;
    inputBuffer = "";
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

function submitTurn() {
    if (inputBuffer === "") return;

    const val = parseInt(inputBuffer);
    const points = val * gameState.multiplier;

    // Validierung (Dart Regeln)
    if (points > 60 || (val > 20 && val !== 25 && val !== 50)) {
        alert("Ungültiger Score!");
        clearInput();
        return;
    }

    if (gameState.score - points < 0 || gameState.score - points === 1) {
        alert("BUST! (Überworfen)");
    } else {
        gameState.score -= points;
        trackThrowXP(points, gameState.multiplier);
    }

    clearInput();
    updateGameUI();

    if (gameState.score === 0) {
        finishGame();
    }
}

function trackThrowXP(points, mult) {
    gameState.sessionStats.throws++;
    if (mult === 2) gameState.sessionStats.doubles++;
    if (mult === 3) gameState.sessionStats.triples++;

    // XP Berechnung
    let gain = 5; // Basis pro Wurf
    if (points >= 40) gain += 10;
    if (points >= 60) gain += 20;
    if (points >= 100) gain += 50;
    
    currentMatchXP += gain;
}

function updateGameUI() {
    document.getElementById('current-score').innerText = gameState.score;
}

async function finishGame() {
    alert(`Leg beendet! Du hast ${currentMatchXP} XP verdient.`);
    
    const payload = {
        action: 'saveMatch',
        username: currentUser.username,
        xp_gain: currentMatchXP,
        match_stats: gameState.sessionStats
    };

    try {
        const res = await fetch('/api/', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (data.success) {
            currentUser.xp = data.newXP;
            currentUser.level = data.newLevel;
        }
    } catch (e) {
        console.error("Save Error:", e);
    }

    showScreen('dashboard-screen');
    updateDashboard();
}

// --- NAVIGATION ---

function showScreen(id) {
    document.querySelectorAll('section').forEach(s => {
        s.classList.add('hidden');
        s.classList.remove('active');
    });
    const active = document.getElementById(id);
    active.classList.remove('hidden');
    active.classList.add('active');
}

function exitGame() {
    if (confirm("Möchtest du das Spiel wirklich abbrechen?")) {
        showScreen('dashboard-screen');
    }
}