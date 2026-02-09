const Dartboard = {
    radii: {
        double: 130,      
        doubleInner: 120, 
        triple: 85,       
        tripleInner: 75,  
        outerBull: 15,    
        bullseye: 7,      
        numbers: 145      
    },
    numbers: [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5],

    render(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';

        const size = 320; 
        const center = size / 2;
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
        
        const boardBg = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        boardBg.setAttribute("cx", center);
        boardBg.setAttribute("cy", center);
        boardBg.setAttribute("r", 160);
        boardBg.setAttribute("fill", "#0a0a0a");
        svg.appendChild(boardBg);

        this.numbers.forEach((num, i) => {
            const angle = (i * 18) - 90 - 9; 
            const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
            group.setAttribute("class", "sector"); 
            group.setAttribute("id", `target-path-${num}`);

            // Double Segment
            group.appendChild(this.createArc(center, center, this.radii.doubleInner, this.radii.double, angle, angle + 18, "slice double-ring"));
            // Outer Single
            group.appendChild(this.createArc(center, center, this.radii.triple, this.radii.doubleInner, angle, angle + 18, "slice single-outer"));
            // Triple Segment
            group.appendChild(this.createArc(center, center, this.radii.tripleInner, this.radii.triple, angle, angle + 18, "slice triple-ring"));
            // Inner Single
            group.appendChild(this.createArc(center, center, this.radii.outerBull, this.radii.tripleInner, angle, angle + 18, "slice single-inner"));

            // Overlay für Highlighting
            const overlay = this.createArc(center, center, this.radii.outerBull, this.radii.double, angle, angle + 18, "highlight-overlay");
            overlay.setAttribute("fill", "transparent");
            group.appendChild(overlay);

            svg.appendChild(group);
            this.renderNumber(svg, center, num, angle + 9);
        });

        // Bullseyes
        const ob = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        ob.setAttribute("cx", center); ob.setAttribute("cy", center);
        ob.setAttribute("r", this.radii.outerBull);
        ob.setAttribute("class", "slice outer-bull");
        ob.setAttribute("id", "target-path-25");
        svg.appendChild(ob);

        const be = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        be.setAttribute("cx", center); be.setAttribute("cy", center);
        be.setAttribute("r", this.radii.bullseye);
        be.setAttribute("class", "slice bullseye");
        be.setAttribute("id", "target-path-50");
        svg.appendChild(be);

        container.appendChild(svg);
    },

    createArc(cx, cy, rIn, rOut, startAngle, endAngle, className) {
        const startIn = this.polarToCartesian(cx, cy, rIn, endAngle);
        const endIn = this.polarToCartesian(cx, cy, rIn, startAngle);
        const startOut = this.polarToCartesian(cx, cy, rOut, endAngle);
        const endOut = this.polarToCartesian(cx, cy, rOut, startAngle);

        const d = [
            "M", startOut.x, startOut.y,
            "A", rOut, rOut, 0, 0, 0, endOut.x, endOut.y,
            "L", endIn.x, endIn.y,
            "A", rIn, rIn, 0, 0, 1, startIn.x, startIn.y,
            "Z"
        ].join(" ");

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", d);
        path.setAttribute("class", className);
        return path;
    },

    polarToCartesian(centerX, centerY, radius, angleInDegrees) {
        const radians = (angleInDegrees * Math.PI) / 180.0;
        return {
            x: centerX + radius * Math.cos(radians),
            y: centerY + radius * Math.sin(radians)
        };
    },

    renderNumber(svg, center, num, angle) {
        const pos = this.polarToCartesian(center, center, this.radii.numbers, angle);
        const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
        txt.setAttribute("x", pos.x);
        txt.setAttribute("y", pos.y);
        txt.setAttribute("text-anchor", "middle");
        txt.setAttribute("dominant-baseline", "middle");
        txt.setAttribute("fill", "white");
        txt.setAttribute("style", "font-size: 14px; font-weight: bold; opacity: 0.8; font-family: sans-serif;");
        txt.textContent = num;
        svg.appendChild(txt);
    },

    highlight(target) {
        document.querySelectorAll('.sector, .outer-bull, .bullseye').forEach(el => el.classList.remove('active-target'));
        const id = (target === "BULL" || target === 25) ? 25 : (target === "D-BULL" || target === 50) ? 50 : target;
        const el = document.getElementById(`target-path-${id}`);
        if (el) el.classList.add('active-target');
    }
};