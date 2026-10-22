document.addEventListener("DOMContentLoaded", async function () {
    const grid = document.getElementById("bento");
    const boxes = Array.from(grid.querySelectorAll(".bento-box"));
    const GAP_DESKTOP = 12, GAP_TABLET = 10, GAP_MOBILE = 8;

    // Add hover caption (from alt text) and keyboard focus to every box
    boxes.forEach(function (box) {
        const img = box.querySelector("img");
        const cap = document.createElement("figcaption");
        cap.className = "bento-caption";
        cap.textContent = img.alt;
        box.appendChild(cap);
        box.tabIndex = 0;
        box.setAttribute("role", "button");
        box.setAttribute("aria-label", "View " + img.alt);
    });

    // Wait for all images so natural sizes are known
    await Promise.all(boxes.map(function (box) {
        const img = box.querySelector("img");
        return new Promise(function (resolve) {
            if (img.complete && img.naturalWidth) return resolve();
            img.addEventListener("load", resolve);
            img.addEventListener("error", function () {
                console.error("Image not found: " + img.src);
                resolve();
            });
        });
    }));

    const items = boxes.map(function (box) {
        const img = box.querySelector("img");
        return { box: box, ratio: (img.naturalWidth / img.naturalHeight) || 0.7 };
    });

    let firstRun = true;

    function getGap(width) {
        return width < 600 ? GAP_MOBILE : width < 1000 ? GAP_TABLET : GAP_DESKTOP;
    }

    function buildRows(width, target, gap) {
        const rows = [];
        let row = [], sum = 0;
        items.forEach(function (it) {
            row.push(it);
            sum += it.ratio;
            if (sum * target + gap * (row.length - 1) >= width) {
                rows.push({ items: row, sum: sum });
                row = []; sum = 0;
            }
        });
        if (row.length) rows.push({ items: row, sum: sum, last: true });
        return rows;
    }

    function lastRowFill(rows, width, target, gap) {
        const last = rows[rows.length - 1];
        if (!last.last) return 1;
        return Math.min(1, (last.sum * target + gap * (last.items.length - 1)) / width);
    }

    function layout() {
        const width = Math.floor(grid.clientWidth);
        if (!width) return;

        const gap = getGap(width);
        const base = width < 600 ? 190 : width < 1000 ? 260 : 340;
        let best = base, bestScore = -1;

        for (let t = base * 0.75; t <= base * 1.3; t += 4) {
            const rows = buildRows(width, t, gap);
            const score = lastRowFill(rows, width, t, gap) - Math.abs(t - base) / base * 0.05;
            if (score > bestScore) { bestScore = score; best = t; }
        }

        const rows = buildRows(width, best, gap);
        grid.innerHTML = "";

        let index = 0;
        rows.forEach(function (r) {
            const usable = width - gap * (r.items.length - 1);
            let h = usable / r.sum;
            if (r.last) h = Math.min(h, best * 1.25);

            const rowEl = document.createElement("div");
            rowEl.className = "bento-row";
            r.items.forEach(function (it) {
                it.box.style.width = (it.ratio * h) + "px";
                it.box.style.height = h + "px";
                rowEl.appendChild(it.box);

                if (firstRun) {
                    // staggered entrance
                    it.box.style.transitionDelay = (index * 60) + "ms";
                    requestAnimationFrame(function () {
                        requestAnimationFrame(function () { it.box.classList.add("show"); });
                    });
                    setTimeout(function () {
                        it.box.style.transitionDelay = "";
                        it.box.classList.add("settled");
                    }, 900 + index * 60);
                }
                index++;
            });
            grid.appendChild(rowEl);
        });

        firstRun = false;
    }

    layout();

    let timer;
    window.addEventListener("resize", function () {
        clearTimeout(timer);
        timer = setTimeout(layout, 120);
    });

    /* ================= LIGHTBOX ================= */
    const lightbox = document.getElementById("lightbox");
    const lbImg = document.getElementById("lightboxImg");
    const lbCap = document.getElementById("lightboxCaption");
    let current = 0;

    function show(i) {
        current = (i + items.length) % items.length;
        const img = items[current].box.querySelector("img");
        lbImg.src = img.currentSrc || img.src;
        lbImg.alt = img.alt;
        lbCap.textContent = img.alt;
    }

    function open(i) {
        show(i);
        lightbox.classList.add("open");
        lightbox.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
    }

    function close() {
        lightbox.classList.remove("open");
        lightbox.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
    }

    items.forEach(function (it, i) {
        it.box.addEventListener("click", function () { open(i); });
        it.box.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(i); }
        });
    });

    document.getElementById("lightboxClose").addEventListener("click", close);
    document.getElementById("lightboxPrev").addEventListener("click", function (e) { e.stopPropagation(); show(current - 1); });
    document.getElementById("lightboxNext").addEventListener("click", function (e) { e.stopPropagation(); show(current + 1); });

    lightbox.addEventListener("click", function (e) {
        if (e.target === lightbox) close();
    });

    document.addEventListener("keydown", function (e) {
        if (!lightbox.classList.contains("open")) return;
        if (e.key === "Escape") close();
        if (e.key === "ArrowLeft") show(current - 1);
        if (e.key === "ArrowRight") show(current + 1);
    });

    console.log("Manhwa collection loaded: " + items.length + " covers.");
});