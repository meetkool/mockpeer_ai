// ── GLOBAL STATE ──────────────────────────────────────────────────────────────
const viewport    = document.getElementById('viewport');
const world       = document.getElementById('world');
const cablesLayer = document.getElementById('cables-layer');
const dragLine    = document.getElementById('drag-line');

let nodes       = [];
let connections = [];
let view        = { scale: 1, x: 0, y: 0 };
let isPanning   = false;
let panStart    = { x: 0, y: 0 };

let draggingNode = null;
let dragOffset   = { x: 0, y: 0 };
let drawingCable = null;
let hoveredNodeId = null;

// ── COORD UTILS ───────────────────────────────────────────────────────────────
function toWorld(sx, sy) {
    return { x: (sx - view.x) / view.scale, y: (sy - view.y) / view.scale };
}
function applyTransform() {
    world.style.transform = `translate(${view.x}px,${view.y}px) scale(${view.scale})`;
}

// ── MOUSE MOVE ────────────────────────────────────────────────────────────────
window.addEventListener('mousemove', (e) => {
    if (isPanning) {
        view.x = e.clientX - panStart.x;
        view.y = e.clientY - panStart.y;
        applyTransform();
        updateAllCables();
        return;
    }
    if (draggingNode) {
        const wm = toWorld(e.clientX, e.clientY);
        const nx = wm.x - dragOffset.x;
        const ny = wm.y - dragOffset.y;
        draggingNode.style.left = nx + 'px';
        draggingNode.style.top  = ny + 'px';
        const nd = nodes.find(n => n.id === draggingNode.id);
        if (nd) { nd.x = nx; nd.y = ny; }
        updateAllCables();
    }
    if (drawingCable) {
        // Keep start updated if source node moved
        const sp = getPortScreenCenter(drawingCable.startNodeId, drawingCable.startPort);
        if (sp) { drawingCable.startX = sp.x; drawingCable.startY = sp.y; }
        dragLine.setAttribute('d', getEdgePath(
            drawingCable.startX, drawingCable.startY, drawingCable.startPort,
            e.clientX, e.clientY, null
        ));
    }
});

// ── MOUSE UP ──────────────────────────────────────────────────────────────────
window.addEventListener('mouseup', (e) => {
    if (isPanning) { isPanning = false; viewport.style.cursor = 'default'; }
    if (draggingNode) { draggingNode.style.zIndex = ''; draggingNode = null; }

    if (drawingCable) {
        if (hoveredNodeId && hoveredNodeId !== drawingCable.startNodeId) {
            const target = document.getElementById(hoveredNodeId);
            if (target) {
                target.classList.remove('hover-target');
                const bestPort = getClosestPort(target, e.clientX, e.clientY);
                createConnection(drawingCable.startNodeId, drawingCable.startPort, hoveredNodeId, bestPort);
            }
        }
        // Clear all active port zones
        document.querySelectorAll('.port-zone.wire-active').forEach(z => z.classList.remove('wire-active'));
        drawingCable = null;
        dragLine.style.display = 'none';
        dragLine.setAttribute('d', '');
    }
});

// ── ZOOM ──────────────────────────────────────────────────────────────────────
viewport.addEventListener('wheel', (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    const factor   = Math.exp(e.deltaY * -0.001);
    const newScale = Math.min(Math.max(0.08, view.scale * factor), 5);
    // Zoom toward cursor
    view.x -= (e.clientX - view.x) * (factor - 1);
    view.y -= (e.clientY - view.y) * (factor - 1);
    view.scale = newScale;
    applyTransform();
    updateAllCables();
}, { passive: false });

// ── PAN ───────────────────────────────────────────────────────────────────────
viewport.addEventListener('mousedown', (e) => {
    if (e.target === viewport || e.target === world || e.target.id === 'grid') {
        isPanning = true;
        panStart  = { x: e.clientX - view.x, y: e.clientY - view.y };
        viewport.style.cursor = 'grabbing';
    }
});

// ── REACTFLOW-STYLE EDGE PATH ─────────────────────────────────────────────────
// Key insight: control points EXIT PERPENDICULAR to their port side.
// top/bottom ports curve vertically first.
// left/right ports curve horizontally first.
// This is exactly how ReactFlow "smoothstep" / bezier edges behave.
function getEdgePath(x1, y1, port1, x2, y2, port2) {
    const dx  = x2 - x1;
    const dy  = y2 - y1;
    const len = Math.sqrt(dx*dx + dy*dy);

    // Arrow tip offset — pull back so head sits before the node surface
    const OFFSET = 12;
    if (len > OFFSET * 2 && port2) {
        // Pull back along port2's inward direction
        const inward = { top: [0,1], bottom:[0,-1], left:[1,0], right:[-1,0] };
        const [ix, iy] = inward[port2] || [0,0];
        x2 += ix * OFFSET;
        y2 += iy * OFFSET;
    } else if (len > OFFSET * 2) {
        // Drag line — pull back toward source
        x2 -= (dx/len) * OFFSET;
        y2 -= (dy/len) * OFFSET;
    }

    // Control point distance = 40% of total distance, min 60px
    const cpDist = Math.max(60, len * 0.4);

    // Source control point exits perpendicular from port1
    let cp1x = x1, cp1y = y1;
    if      (port1 === 'right')  cp1x += cpDist;
    else if (port1 === 'left')   cp1x -= cpDist;
    else if (port1 === 'bottom') cp1y += cpDist;
    else if (port1 === 'top')    cp1y -= cpDist;
    else { cp1x += dx * 0.4; cp1y += dy * 0.1; } // fallback for drag

    // Target control point enters perpendicular into port2
    let cp2x = x2, cp2y = y2;
    if      (port2 === 'left')   cp2x -= cpDist;
    else if (port2 === 'right')  cp2x += cpDist;
    else if (port2 === 'top')    cp2y -= cpDist;
    else if (port2 === 'bottom') cp2y += cpDist;
    else { cp2x -= dx * 0.4; cp2y -= dy * 0.1; } // fallback for drag

    return `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
}

// ── CABLE HELPERS ─────────────────────────────────────────────────────────────
function getPortScreenCenter(nodeId, portType) {
    const node = document.getElementById(nodeId);
    if (!node) return null;
    const zone = node.querySelector(`.port-zone.${portType}`);
    if (!zone) return null;
    const r = zone.getBoundingClientRect();
    return { x: r.left + r.width/2, y: r.top + r.height/2 };
}

function getClosestPort(nodeEl, mx, my) {
    let min = Infinity, best = 'top';
    nodeEl.querySelectorAll('.port-zone').forEach(z => {
        const r    = z.getBoundingClientRect();
        const dist = Math.hypot(r.left + r.width/2 - mx, r.top + r.height/2 - my);
        if (dist < min) { min = dist; best = z.dataset.port; }
    });
    return best;
}

// ── EXPORT ────────────────────────────────────────────────────────────────────
function exportJSON() {
    const data = {
        nodes: nodes.map(n => ({ id: n.id, type: n.type, title: n.title, x: n.x, y: n.y })),
        edges: connections.map(c => ({ source: c.from.n, target: c.to.n, sourcePort: c.from.p, targetPort: c.to.p }))
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), {
        href: url, download: 'prism-' + Date.now() + '.json'
    });
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
}
