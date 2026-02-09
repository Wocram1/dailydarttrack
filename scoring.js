const ScoringGames = {
    xxDartsAt: {
        name: "XX Darts at XX",
        icon: "fa-fire",
        config: [
            { id: 'targetSegment', label: 'Ziel Feld', type: 'number', default: 20 },
            { id: 'numRounds', label: 'Anzahl Runden', type: 'number', default: 10 }
        ],
        init: function(settings = {}) {
            return { 
                type: 'scoring', mode: 'xxDartsAt', 
                target: parseInt(settings.targetSegment) || 20, 
                maxRounds: parseInt(settings.numRounds) || 10,
                score: 0, rounds: 1, history: [] 
            };
        },
        onHit: function(game, hitType) {
            let points = hitType === 'S' ? 1 : (hitType === 'D' ? 2 : (hitType === 'T' ? 3 : 0));
            game.score += points;
            return { finished: false };
        }
    }
};