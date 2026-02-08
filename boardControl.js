/**
 * Logik für Board Control Spiele
 */
const BoardControlGames = {
    atc: {
        name: "Around the Clock",
        maxLevel: 10,
        init: function(level) {
            return {
                target: 1,
                targetHitsNeeded: level >= 4 ? 2 : 1,
                hitsCollected: 0,
                hearts: (level >= 2 && level <= 4) ? 3 : null,
                dartsInHand: (level === 2) ? 3 : (level === 3 ? 2 : (level === 4 ? 1 : 99)),
                maxDartsPerTarget: (level >= 2 && level <= 4) ? (level === 2 ? 3 : (level === 3 ? 2 : 1)) : 999,
                dartsThrownThisTarget: 0,
                rounds: 1,
                dartsThisRound: 0,
                history: []
            };
        },
        // Berechnung der XP
        calculateXP: function(hitType, dartNum, isFinished) {
            let xp = 0;
            if (hitType !== 'MISS') {
                xp += 10; // Grund XP
                if (dartNum === 1) xp += 15; // Bonus 1. Dart
                else if (dartNum === 2) xp += 5; // Bonus 2. Dart
            }
            if (isFinished) xp += 100; // Finish Bonus
            return xp;
        }
    }
};