const ScoringGames = {
    xxDartsAt: {
        name: "XX Darts at XX",
        init: function() { return { type: 'scoring', mode: 'xxDartsAt', target: 20, score: 0, rounds: 1, history: [] }; },
        onHit: function(game, hitType) {
            // Hier addieren wir Punkte auf ein festes Ziel
            return { finished: game.rounds > 10 }; 
        }
    }
};