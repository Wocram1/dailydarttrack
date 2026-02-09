const Dartboard = {
    render: function(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const numbers = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
        let svgHTML = `<svg viewBox="0 0 200 200" width="100%" height="100%">
            <circle cx="100" cy="100" r="98" fill="#111" />
            <g id="segments-group">`;

        for (let i = 0; i < 20; i++) {
            const angle = (i * 18) - 99; // -90 minus 9 Grad Versatz für Zentrierung
            const x1 = 100 + 75 * Math.cos(angle * Math.PI / 180);
            const y1 = 100 + 75 * Math.sin(angle * Math.PI / 180);
            const x2 = 100 + 75 * Math.cos((angle + 18) * Math.PI / 180);
            const y2 = 100 + 75 * Math.sin((angle + 18) * Math.PI / 180);

            // Segmente
            svgHTML += `<path id="segment-${numbers[i]}" class="target-segment" 
                d="M100,100 L${x1},${y1} A75,75 0 0,1 ${x2},${y2} Z" 
                fill="${i % 2 === 0 ? '#222' : '#000'}" stroke="#444" stroke-width="0.5"/>`;

            // Zahlenbeschriftung
            const textAngle = angle + 9;
            const tx = 100 + 88 * Math.cos(textAngle * Math.PI / 180);
            const ty = 100 + 88 * Math.sin(textAngle * Math.PI / 180);
            svgHTML += `<text x="${tx}" y="${ty}" class="board-text" text-anchor="middle" dominant-baseline="central">${numbers[i]}</text>`;
        }

        svgHTML += `</g>
            <circle cx="100" cy="100" r="8" fill="#055d2d" stroke="#fff" stroke-width="0.2"/>
            <circle cx="100" cy="100" r="3.5" fill="#e10614" stroke="#fff" stroke-width="0.2"/>
        </svg>`;

        container.innerHTML = svgHTML;
    },

    highlight: function(number) {
        document.querySelectorAll('.target-segment').forEach(p => p.classList.remove('active-target'));
        const active = document.getElementById(`segment-${number}`);
        if (active) active.classList.add('active-target');
    }
};