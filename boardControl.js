const BoardControlGames = {
    atc: {
        name: "Around the Clock",
        init: function() { return { type: 'boardControl', mode: 'atc', target: 1, rounds: 1, history: [] }; },
        onHit: function(game, hitType) {
            if (hitType !== 'MISS') game.target++;
            return { finished: game.target > 20 };
        }
    },
    shanghai: {
        name: "Shanghai",
        init: function() { return { type: 'boardControl', mode: 'shanghai', target: 1, score: 0, rounds: 1, history: [] }; },
        onHit: function(game, hitType) {
            // Logik: In jeder Runde steigt das Ziel automatisch nach 'Next Round'
            return { finished: game.target > 20 };
        }
    }
};