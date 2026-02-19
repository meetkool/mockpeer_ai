// --- GLOBAL STATE ---
const viewport = document.getElementById('viewport');
const world = document.getElementById('world');
const cablesLayer = document.getElementById('cables-layer');
const dragLine = document.getElementById('drag-line');

let nodes = [];
let connections = [];
let view = { scale: 1, x: 0, y: 0 };
let isPanning = false;
let panStart = { x: 0, y: 0 };

// Interaction State
let draggingNode = null;
let dragOffset = { x: 0, y: 0 };
let drawingCable = null;
let hoveredNodeId = null;

// --- COORDINATE SYSTEMS ---
// Converts Screen Pixels -> World Pixels (For placing Nodes)
function toWorld(screenX, screenY) {
    return {
        x: (screenX - view.x) / view.scale,
        y: (screenY - view.y) / view.scale
    };
}

// --- GLOBAL EVENT LISTENERS ---

// 1. Mouse Move (The "Game Loop")
window.addEventListener('mousemove', (e) => {
    // A. Pan World
    if (isPanning) {
        view.x = e.clientX - panStart.x;
        view.y = e.clientY - panStart.y;
        world.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
        updateAllCables();
        return;
    }

    // B. Drag Node
    if (draggingNode) {
        const worldMouse = toWorld(e.clientX, e.clientY);
        const newX = worldMouse.x - dragOffset.x;
        const newY = worldMouse.y - dragOffset.y;

        draggingNode.style.left = newX + 'px';
        draggingNode.style.top = newY + 'px';

        // Update Data
        const n = nodes.find(x => x.id === draggingNode.id);
        if (n) { n.x = newX; n.y = newY; }

        updateAllCables();
    }

    // C. Drag Cable
    if (drawingCable) {
        const d = getBezierPath(drawingCable.startX, drawingCable.startY, e.clientX, e.clientY);
        dragLine.setAttribute('d', d);
    }
});

// 2. Mouse Up (Drop Logic)
window.addEventListener('mouseup', (e) => {
    isPanning = false;
    viewport.style.cursor = 'grab';
    if (draggingNode) { draggingNode.style.zIndex = ""; draggingNode = null; }

    // Finish Connection
    if (drawingCable) {
        if (hoveredNodeId && hoveredNodeId !== drawingCable.startNodeId) {
            const targetNode = document.getElementById(hoveredNodeId);
            if (targetNode) {
                targetNode.classList.remove('hover-target');
                const bestPort = getClosestPort(targetNode, e.clientX, e.clientY);
                createConnection(drawingCable.startNodeId, drawingCable.startPort, hoveredNodeId, bestPort);
            }
        }
        drawingCable = null;
        dragLine.style.display = 'none';
    }
});

// 3. Zoom Logic
viewport.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
        e.preventDefault();
        const s = Math.exp(e.deltaY * -0.001);
        const newScale = Math.min(Math.max(0.1, view.scale * s), 4);

        const worldMouseBefore = toWorld(e.clientX, e.clientY);
        view.scale = newScale;
        const worldMouseAfter = toWorld(e.clientX, e.clientY);

        view.x += (worldMouseAfter.x - worldMouseBefore.x) * view.scale;
        view.y += (worldMouseAfter.y - worldMouseBefore.y) * view.scale;

        world.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
        updateAllCables();
    }
}, { passive: false });

// 4. Pan Start
viewport.addEventListener('mousedown', (e) => {
    // Only pan if clicking empty space (or the grid)
    if (e.target === viewport || e.target === world || e.target.id === 'grid') {
        isPanning = true;
        panStart = { x: e.clientX - view.x, y: e.clientY - view.y };
        viewport.style.cursor = 'grabbing';
    }
});

// Helper: Draw smooth bezier curves
// OFFSET: We pull the endpoint back by ~16px along the line direction
// so the arrowhead sits visibly OUTSIDE the node instead of stabbing into it
function getBezierPath(x1, y1, x2, y2) {
    // Calculate direction vector and normalize it
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);

    // Only offset if line is long enough to matter
    const ARROW_OFFSET = 14; // px — matches marker refX
    if (len > ARROW_OFFSET * 2) {
        const nx = dx / len;
        const ny = dy / len;
        // Pull the end point back along the direction vector
        x2 = x2 - nx * ARROW_OFFSET;
        y2 = y2 - ny * ARROW_OFFSET;
    }

    const cp1x = x1 + (x2 - x1) * 0.5;
    const cp2x = x1 + (x2 - x1) * 0.5;
    return `M ${x1} ${y1} C ${cp1x} ${y1}, ${cp2x} ${y2}, ${x2} ${y2}`;
}

function exportJSON() {
    const data = {
        nodes: nodes.map(n => ({ id: n.id, type: n.type, title: n.title, x: n.x, y: n.y })),
        edges: connections.map(c => ({ source: c.from.n, target: c.to.n, sourcePort: c.from.p, targetPort: c.to.p }))
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'prism-export-' + new Date().toISOString().split('T')[0] + '.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}