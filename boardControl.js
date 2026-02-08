const BoardControlGames = {
    atc: {
        name: "Around the Clock",
        init: function(level) {
            return {
                target: 1,
                targetHitsNeeded: level >= 4 ? 2 : 1,
                hitsCollected: 0,
                hearts: (level >= 2 && level <= 4) ? 3 : null,
                maxDartsPerTarget: (level === 2 ? 3 : (level === 3 ? 2 : (level === 4 ? 1 : 99))),
                dartsThrownThisTarget: 0,
                rounds: 1,
                dartsThisRound: 0,
                history: []
            };
        },
        calculateXP: function(hitType, dartNum, isFinished) {
            let xp = 0;
            if (hitType !== 'MISS') {
                xp += 10;
                if (dartNum === 1) xp += 15;
                else if (dartNum === 2) xp += 5;
            }
            if (isFinished) xp += 100;
            return xp;
        }
    }
};