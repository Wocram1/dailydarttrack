const FinishingGames = {
    nineDartsDO: {
        name: "9 Darts DO",
        init: function() { return { type: 'finishing', mode: 'nineDartsDO', target: 121, rounds: 1, history: [] }; },
        onHit: function(game, hitType) {
            // Hier folgt später die Logik zum Abziehen von 121
            return { finished: game.target <= 0 };
        }
    }
};