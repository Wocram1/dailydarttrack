const FinishingGames = {
    nineDartsDO: {
        name: "121 (9 Darts DO)",
        icon: "fa-check-double",
        config: [
            { id: 'startScore', label: 'Start Score', type: 'number', default: 121 },
            { id: 'outMode', label: 'Out Modus', type: 'select', options: ['Double Out', 'Single Out'], default: 'Double Out' },
            { id: 'maxDarts', label: 'Darts pro Versuch', type: 'number', default: 9 }
        ],
        init: function(settings = {}) {
            return {
                type: 'finishing', mode: 'nineDartsDO',
                target: parseInt(settings.startScore) || 121,
                outMode: settings.outMode || 'Double Out',
                maxDarts: parseInt(settings.maxDarts) || 9,
                rounds: 1, history: []
            };
        },
        onHit: function(game, hitType, val) {
            let mult = hitType === 'S' ? 1 : (hitType === 'D' ? 2 : (hitType === 'T' ? 3 : 0));
            let points = val * mult;
            let canFinish = (game.outMode === 'Double Out') ? (hitType === 'D') : true;

            if (game.target - points === 0 && canFinish) {
                game.target = 0;
                return { finished: true, msg: "Checkout! Ziel erreicht." };
            } else if (game.target - points <= 1 && game.outMode === 'Double Out') {
                return { bust: true, msg: "Bust!" };
            } else if (game.target - points < 0) {
                return { bust: true, msg: "Bust!" };
            } else {
                game.target -= points;
                return { finished: false };
            }
        }
    }
};