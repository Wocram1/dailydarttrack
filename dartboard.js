const Dartboard = {
    // Radien für die Ringe (Standard-Proportionen einer Dartscheibe)
    radii: {
        double: 140,
        triple: 90,
        outerBull: 15,
        bullseye: 7,
        board: 150
    },
    // Die Reihenfolge der Zahlen auf einer Dartscheibe
    numbers: [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5],

    render(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = ''; // Reset

        const size = 300;
        const center = size / 2;
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
        svg.style.width = "100%";
        svg.style.height = "100%";

        // 1. Hintergrund-Scheibe (Schwarz)
        const bg = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        bg.setAttribute("cx", center);
        bg.setAttribute("cy", center);
        bg.setAttribute("r", this.radii.board);
        bg.setAttribute("fill", "#111");
        svg.appendChild(bg);

        // 2. Segmente zeichnen
        this.numbers.forEach((num, i) => {
            const angle = (i * 18) - 90 - 9; // -90 für 12 Uhr Start, -9 für Zentrierung des Segments
            const sectorGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
            sectorGroup.setAttribute("class", `sector sec-${num}`);
            sectorGroup.setAttribute("id", `target-path-${num}`);

            // Große Single-Fläche (außen)
            sectorGroup.appendChild(this.createArc(center, center, this.radii.double - 15, this.radii.double, angle, angle + 18, "slice single-outer"));
            // Triple Ring
            sectorGroup.appendChild(this.createArc(center, center, this.radii.triple - 10, this.radii.triple, angle, angle + 18, "slice triple-ring"));
            // Kleine Single-Fläche (innen)
            sectorGroup.appendChild(this.createArc(center, center, this.radii.outerBull + 5, this.radii.triple - 10, angle, angle + 18, "slice single-inner"));
            // Double Ring
            sectorGroup.appendChild(this.createArc(center, center, this.radii.double, this.radii.double + 10, angle, angle + 18, "slice double-ring"));

            // Einfaches Overlay für das gesamte Tortenstück (zum Highlighten)
            const highlightSlice = this.createArc(center, center, this.radii.outerBull + 5, this.radii.double + 10, angle, angle + 18, "slice highlight-overlay");
            highlightSlice.setAttribute("fill", "transparent");
            highlightSlice.setAttribute("style", "pointer-events: none;");
            sectorGroup.appendChild(highlightSlice);

            svg.appendChild(sectorGroup);

            // Zahlenbeschriftung
            this.renderNumber(svg, center, num, angle + 9);
        });

        // 3. Bullseyes
        const outerBull = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        outerBull.setAttribute("cx", center);
        outerBull.setAttribute("cy", center);
        outerBull.setAttribute("r", this.radii.outerBull);
        outerBull.setAttribute("class", "slice outer-bull");
        outerBull.setAttribute("id", "target-path-25");
        svg.appendChild(outerBull);

        const bullseye = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        bullseye.setAttribute("cx", center);
        bullseye.setAttribute("cy", center);
        bullseye.setAttribute("r", this.radii.bullseye);
        bullseye.setAttribute("class", "slice bullseye");
        bullseye.setAttribute("id", "target-path-50");
        svg.appendChild(bullseye);

        container.appendChild(svg);
    },

    createArc(cx, cy, rIn, rOut, startAngle, endAngle, className) {
        const d = this.describeArc(cx, cy, rIn, rOut, startAngle, endAngle);
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", d);
        path.setAttribute("class", className);
        return path;
    },

    describeArc(x, y, rIn, rOut, startAngle, endAngle) {
        const startIn = this.polarToCartesian(x, y, rIn, endAngle);
        const endIn = this.polarToCartesian(x, y, rIn, startAngle);
        const startOut = this.polarToCartesian(x, y, rOut, endAngle);
        const endOut = this.polarToCartesian(x, y, rOut, startAngle);

        const arcSweep = endAngle - startAngle <= 180 ? "0" : "1";

        return [
            "M", startOut.x, startOut.y,
            "A", rOut, rOut, 0, arcSweep, 0, endOut.x, endOut.y,
            "L", endIn.x, endIn.y,
            "A", rIn, rIn, 0, arcSweep, 1, startIn.x, startIn.y,
            "L", startOut.x, startOut.y,
            "Z"
        ].join(" ");
    },

    polarToCartesian(centerX, centerY, radius, angleInDegrees) {
        const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
        return {
            x: centerX + radius * Math.cos(angleInRadians),
            y: centerY + radius * Math.sin(angleInRadians)
        };
    },

    renderNumber(svg, center, num, angle) {
        const pos = this.polarToCartesian(center, center, 175, angle);
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", pos.x);
        text.setAttribute("y", pos.y);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("dominant-baseline", "middle");
        text.setAttribute("fill", "white");
        text.setAttribute("style", "font-size: 14px; font-weight: bold; opacity: 0.5;");
        text.textContent = num;
        svg.appendChild(text);
    },

    highlight(target) {
        // Zuerst alle Highlights entfernen
        document.querySelectorAll('.sector, .outer-bull, .bullseye').forEach(el => {
            el.classList.remove('active-target');
        });

        // Spezielle Logik für Bullseye
        let id = target;
        if (target === "BULL") id = 25;
        if (target === "D-BULL") id = 50;

        const targetEl = document.getElementById(`target-path-${id}`);
        if (targetEl) {
            targetEl.classList.add('active-target');
        }
    }
};