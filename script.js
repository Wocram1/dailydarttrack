// script.js
let currentUser = null;
let gameState = {
    score: 501,
    history: [],
    currentTurn: [],
    multiplier: 1 // 1=Single, 2=Double, 3=Triple
};

// --- AUTHENTICATION ---
let isSignup = false;

function toggleAuthMode() {
    isSignup = !isSignup;
    document.getElementById('invite-code').style.display = isSignup ? 'block' : 'none';
    document.getElementById('toggle-auth').innerText = isSignup ? 'Zurück zum Login' : 'Account erstellen';
    document.querySelector('.btn-primary').innerText = isSignup ? 'Erstellen' : 'Login';
}

async function login() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    const code = document.getElementById('invite-code').value;

    if (!user || !pass) return alert("Bitte Felder ausfüllen");

    const btn = document.querySelector('.btn-primary');
    btn.disabled = true;
    btn.innerText = "Lade...";

    const action = isSignup ? 'signup' : 'login';
    const payload = { action, username: user, password: pass, inviteCode: code };

    try {
        // Fetch via Netlify Proxy (/api/)
        const res = await fetch('/api/', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.success) {
            currentUser = data.user;
            showScreen('dashboard-screen');
            updateDashboard();
        } else {
            alert(data.message);
        }
    } catch (e) {
        console.error(e);
        alert("Verbindungsfehler. Prüfe Netlify Proxy.");
    } finally {
        btn.disabled = false;
        btn.innerText = isSignup ? 'Erstellen' : 'Login';
    }
}

// --- DASHBOARD ---
function updateDashboard() {
    document.getElementById('display-username').innerText = currentUser.username;
    document.getElementById('display-level').innerText = `Lvl ${currentUser.level}`;
    
    // XP Berechnung (Level * 1000 als Basis)
    const nextLevelXP = currentUser.level * 1000;
    const progress = (currentUser.xp / nextLevelXP) * 100;
    
    document.getElementById('xp-text').innerText = `${currentUser.xp} / ${nextLevelXP} XP`;
    document.getElementById('xp-bar').style.width = `${Math.min(progress, 100)}%`;
}

// --- GAME LOGIC (501) ---
function startQuickplay() {
    gameState.score = 501;
    gameState.currentTurn = [];
    gameState.history = [];
    updateGameUI();
    showScreen('game-screen');
}

let inputBuffer = "";

function addScore(num) {
    if (inputBuffer.length > 2) return; // Max 3 digits
    inputBuffer += num;
    updateInputDisplay();
}

function toggleMod(type) {
    const btn = document.getElementById(`mod-${type.toLowerCase()}`);
    // Reset anderen Button
    if (type === 'D') document.getElementById('mod-t').classList.remove('active');
    else document.getElementById('mod-d').classList.remove('active');

    // Toggle aktuellen
    if (gameState.multiplier === (type === 'D' ? 2 : 3)) {
        gameState.multiplier = 1; // Reset to single
        btn.classList.remove('active');
    } else {
        gameState.multiplier = type === 'D' ? 2 : 3;
        btn.classList.add('active');
    }
    updateInputDisplay();
}

function updateInputDisplay() {
    let display = inputBuffer === "" ? "0" : inputBuffer;
    let prefix = gameState.multiplier === 2 ? "D" : (gameState.multiplier === 3 ? "T" : "");
    document.getElementById('current-input-display').innerText = prefix + display;
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
    
    let points = parseInt(inputBuffer) * gameState.multiplier;
    
    // Plausibilitätscheck (Max 60 pro Wurf)
    if (points > 60 || (parseInt(inputBuffer) > 20 && parseInt(inputBuffer) !== 25 && parseInt(inputBuffer) !== 50)) {
        alert("Ungültiger Wurf!");
        clearInput();
        return;
    }

    // Abziehen
    let newScore = gameState.score - points;

    if (newScore < 0 || newScore === 1) {
        alert("BUST!");
        // Logik für BUST (Zurücksetzen auf Anfang der Runde wäre komplexer, hier simplified)
    } else {
        gameState.score = newScore;
        // Tracking für Backend
        trackStats(points, gameState.multiplier);
    }
    
    clearInput();
    updateGameUI();

    if (gameState.score === 0) {
        finishGame();
    }
}

function updateGameUI() {
    document.getElementById('current-score').innerText = gameState.score;
}

// --- XP & STATS TRACKING ---
let sessionStats = { throws: 0, hits_1: 0, hits_2: 0, hits_3: 0, doubles: 0, triples: 0 };

function trackStats(points, multiplier) {
    sessionStats.throws++;
    if (multiplier === 2) sessionStats.doubles++;
    if (multiplier === 3) sessionStats.triples++;
    
    // XP Berechnung: Einfach 10 XP pro Wurf + Bonuspunkte für hohe Scores
    let xpGain = 10;
    if (points >= 60) xpGain += 20;
    if (points >= 100) xpGain += 50;
    if (points === 180) xpGain += 180;
    
    currentUser.xp += xpGain;
}

async function finishGame() {
    alert("SIEG! Spiel beendet.");
    
    // Daten an Backend senden
    const payload = {
        action: 'saveMatch',
        username: currentUser.username,
        xp_gain: currentUser.xp, // Hier senden wir den neuen Gesamtstand oder das Delta, oben im Script nutzen wir Delta, also Vorsicht:
        // Korrektur: Wir haben XP lokal hochgezählt. Senden wir einfach das Delta der Session.
        match_stats: sessionStats
    };
    
    // Für die Simplizität senden wir hier einen fixen XP Wert für den Sieg
    payload.xp_gain = 500; // Bonus für Sieg

    try {
        await fetch('/api/', { method: 'POST', body: JSON.stringify(payload) });
        // User neu laden um Level Update zu bekommen wäre sauber, hier nehmen wir an es hat geklappt
    } catch(e) { console.error(e); }

    sessionStats = { throws: 0, hits_1: 0, hits_2: 0, hits_3: 0, doubles: 0, triples: 0 };
    showScreen('dashboard-screen');
    updateDashboard(); // Aktualisiert die Bar visuell
}

// --- HELPER ---
function showScreen(id) {
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
    document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.remove('hidden');
    document.getElementById(id).classList.add('active');
}
function exitGame() {
    if(confirm("Spiel abbrechen?")) showScreen('dashboard-screen');
}