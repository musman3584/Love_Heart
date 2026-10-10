
const canvas = document.getElementById("heartCanvas");
const ctx = canvas.getContext("2d");

const messages = [
    "I LOVE YOU",
    "Je t'aime",
    "Te amo",
    "أحبك",
    "愛してる",
    "사랑해",
    "Seni seviyorum",
    "Ti amo",
    "Ich liebe dich",
    "Eu te amo",
    "Я тебя люблю",
    "میں تم سے پیار کرتا ہوں",
    "我爱你",
    "Ik hou van jou",
    "Kocham cię",
    "I LOVE YOU ♥"
];

const colors = [
    "#ff8fbd",
    "#ffffff",
    "#ffb2d2",
    "#ff5b9c",
    "#ffd6e8",
    "#ff79ae"
];

let points = [];
let scanRows = [];
let animationStart = null;
const animationDuration = 12000;

function heartX(t) {
    return 16 * Math.pow(Math.sin(t), 3);
}

function heartY(t) {
    return 13 * Math.cos(t)
        - 5 * Math.cos(2 * t)
        - 2 * Math.cos(3 * t)
        - Math.cos(4 * t);
}

function buildHeart() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const width = rect.width;
    const height = rect.height;

    // Scale the complete heart to fit the canvas.
    const scale = Math.min(
        (width - 18) / 32,
        (height - 18) / 34
    );

    const centerX = width / 2;
    const centerY = height / 2;

    points = [];

    const totalPoints = 3000;

    for (let i = 0; i < totalPoints; i++) {
        const t = (i / totalPoints) * Math.PI * 2;

        points.push({
            x: centerX + heartX(t) * scale,
            y: centerY - heartY(t) * scale
        });
    }

    // Calculate every inside section of each horizontal row.
    // This handles both left and right heart lobes correctly.
    scanRows = [];

    const minY = Math.min(...points.map(p => p.y));
    const maxY = Math.max(...points.map(p => p.y));
    const rowGap = 12;

    for (
        let y = minY + 3;
        y < maxY - 3;
        y += rowGap
    ) {
        const intersections = [];

        for (let i = 0; i < points.length; i++) {
            const a = points[i];
            const b = points[(i + 1) % points.length];

            if (
                (a.y <= y && b.y > y) ||
                (b.y <= y && a.y > y)
            ) {
                const ratio = (y - a.y) / (b.y - a.y);

                intersections.push(
                    a.x + ratio * (b.x - a.x)
                );
            }
        }

        intersections.sort((a, b) => a - b);

        const spans = [];

        // Pair intersections to find each inside section.
        for (let i = 0; i + 1 < intersections.length; i += 2) {
            const left = intersections[i] + 3;
            const right = intersections[i + 1] - 3;

            if (right > left) {
                spans.push({ left, right, y });
            }
        }

        scanRows.push({ y, spans });
    }
}

function makeHeartClip() {
    ctx.beginPath();

    points.forEach((point, i) => {
        if (i === 0) {
            ctx.moveTo(point.x, point.y);
        } else {
            ctx.lineTo(point.x, point.y);
        }
    });

    ctx.closePath();
    ctx.clip();
}

function fitMessage(message, maxWidth) {
    // Choose a font size that fits the available space.
    for (let size = 12; size >= 4; size--) {
        ctx.font = `bold ${size}px Arial, sans-serif`;

        if (ctx.measureText(message).width <= maxWidth) {
            return {
                message,
                size,
                width: ctx.measureText(message).width
            };
        }
    }

    return null;
}

function drawFilledRow(span, rowIndex, spanIndex) {
    const width = span.right - span.left;

    if (width < 5) return;

    ctx.save();

    ctx.beginPath();
    ctx.rect(span.left, span.y - 6, width, 12);
    ctx.clip();

    let x = span.left;
    let messageIndex = (rowIndex + spanIndex * 3) % messages.length;
    let safety = 0;

    while (x < span.right - 1 && safety < 300) {
        safety++;

        const remaining = span.right - x;

        // Find a phrase that fits the remaining width.
        let chosen = null;

        for (let i = 0; i < messages.length; i++) {
            const candidate = messages[
                (messageIndex + i) % messages.length
            ];

            const fitted = fitMessage(candidate, remaining);

            if (fitted) {
                chosen = fitted;
                messageIndex = (messageIndex + i + 1) % messages.length;
                break;
            }
        }

        if (!chosen) break;

        // Keep text inside the heart, away from the outline.
        ctx.font = `bold ${chosen.size}px Arial, sans-serif`;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillStyle = colors[
            (rowIndex + spanIndex + safety) % colors.length
        ];
        ctx.shadowColor = "#ff1675";
        ctx.shadowBlur = 2;

        ctx.fillText(chosen.message, x, span.y);

        x += chosen.width + 3;
    }

    ctx.restore();
}

function drawHeartBorder() {
    ctx.save();

    ctx.beginPath();

    points.forEach((point, i) => {
        if (i === 0) {
            ctx.moveTo(point.x, point.y);
        } else {
            ctx.lineTo(point.x, point.y);
        }
    });

    ctx.closePath();

    ctx.strokeStyle = "#ff4d98";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#ff1680";
    ctx.shadowBlur = 12;
    ctx.stroke();

    ctx.restore();
}

function render(timestamp) {
    if (animationStart === null) {
        animationStart = timestamp;
    }

    const rect = canvas.getBoundingClientRect();

    ctx.clearRect(0, 0, rect.width, rect.height);

    // Reveal rows gradually from top to bottom.
    const progress = Math.min(
        (timestamp - animationStart) / animationDuration,
        1
    );

    const visibleCount = Math.ceil(scanRows.length * progress);

    ctx.save();
    makeHeartClip();

    for (let i = 0; i < visibleCount; i++) {
        const row = scanRows[i];

        row.spans.forEach((span, spanIndex) => {
            drawFilledRow(span, i, spanIndex);
        });
    }

    ctx.restore();

    drawHeartBorder();

    if (progress < 1) {
        requestAnimationFrame(render);
    }
}

function start() {
    animationStart = null;
    buildHeart();
    requestAnimationFrame(render);
}

window.addEventListener("resize", start);

start();
