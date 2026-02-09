const BoardControlGames = {
    atc: {
        name: "Around the Clock",
        icon: "fa-bullseye",
        config: [
            { id: 'hitsNeeded', label: 'Treffer pro Feld', type: 'number', default: 1 },
            { id: 'direction', label: 'Richtung', type: 'select', options: ['Vorwärts', 'Rückwärts'], default: 'Vorwärts' }
        ],
        init: function(settings = {}) {
            return {
                type: 'boardControl', mode: 'atc',
                target: settings.direction === 'Rückwärts' ? 20 : 1,
                hitsNeeded: parseInt(settings.hitsNeeded) || 1,
                hitsCollected: 0, rounds: 1, history: [], settings: settings
            };
        },
        onHit: function(game, hitType) {
            if (hitType !== 'MISS') {
                game.hitsCollected++;
                if (game.hitsCollected >= game.hitsNeeded) {
                    game.hitsCollected = 0;
                    game.settings.direction === 'Rückwärts' ? game.target-- : game.target++;
                }
            }
            return { finished: game.target > 20 || game.target < 1 };
        }
    },
    shanghai: {
        name: "Shanghai",
        icon: "fa-bolt",
        config: [{ id: 'startTarget', label: 'Start bei Feld', type: 'number', default: 1 }],
        init: function(settings = {}) {
            return { type: 'boardControl', mode: 'shanghai', target: parseInt(settings.startTarget) || 1, score: 0, rounds: 1, history: [] };
        },
        onHit: function(game, hitType) {
            let mult = hitType === 'S' ? 1 : (hitType === 'D' ? 2 : (hitType === 'T' ? 3 : 0));
            game.score += (game.target * mult);
            return { finished: game.target > 20 };
        }
    },
    bermuda: {
        name: "Bermuda Triangle",
        icon: "fa-mountain",
        targets: [12, 13, 14, "D", 15, 16, 17, "T", 18, 19, 20, "B"],
        config: [{ id: 'startScore', label: 'Start Score', type: 'number', default: 0 }],
        init: function(settings = {}) {
            return { type: 'boardControl', mode: 'bermuda', targetIndex: 0, target: 12, score: parseInt(settings.startScore) || 0, rounds: 1, history: [] };
        },
        onHit: function(game, hitType) {
            let mult = hitType === 'S' ? 1 : (hitType === 'D' ? 2 : (hitType === 'T' ? 3 : 0));
            let val = typeof game.target === 'number' ? game.target : 25;
            game.score += (val * mult);
            return { finished: false };
        }
    }
};