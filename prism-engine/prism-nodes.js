const nodeLayer = document.getElementById('node-layer');

const NODE_PALETTE = {
    'User':         '#38bdf8',
    'Server':       '#818cf8',
    'Database':     '#fb923c',
    'Worker':       '#4ade80',
    'LoadBalancer': '#a78bfa',
    'Cache':        '#34d399',
    'Queue':        '#38bdf8',
    'CDN':          '#f472b6',
    'Security':     '#f87171',
    'default':      '#94a3b8',
};

function createNode(type, title, colorOverride) {
    const id  = 'node-' + Math.random().toString(36).substr(2, 6);
    const c   = toWorld(viewport.clientWidth/2, viewport.clientHeight/2);
    const x   = c.x + (Math.random() - 0.5) * 200;
    const y   = c.y + (Math.random() - 0.5) * 160;
    const bg  = colorOverride || NODE_PALETTE[type] || NODE_PALETTE.default;

    const el = document.createElement('div');
    el.className  = 'node';
    el.id         = id;
    el.style.left = x + 'px';
    el.style.top  = y + 'px';
    el.style.background = bg;

    el.innerHTML = `
        <button class="node-delete" title="Delete">×</button>
        <div class="node-label">${title}</div>
        <div class="port-zone top"    data-port="top">   <div class="port"></div></div>
        <div class="port-zone bottom" data-port="bottom"><div class="port"></div></div>
        <div class="port-zone left"   data-port="left">  <div class="port"></div></div>
        <div class="port-zone right"  data-port="right"> <div class="port"></div></div>
    `;

    attachNodeEvents(el, id);
    nodeLayer.appendChild(el);
    nodes.push({ id, el, x, y, type, title, color: bg });
}

function deleteNode(id) {
    connections = connections.filter(c => {
        if (c.from.n === id || c.to.n === id) { c.el.remove(); return false; }
        return true;
    });
    document.getElementById(id)?.remove();
    nodes = nodes.filter(n => n.id !== id);
}

function attachNodeEvents(el, id) {
    // ── Drag node ──
    el.addEventListener('mousedown', (e) => {
        if (e.target.closest('.port-zone') || e.target.classList.contains('node-delete')) return;
        el.parentElement.appendChild(el); // bring to front in DOM
        draggingNode = el;
        const wm = toWorld(e.clientX, e.clientY);
        dragOffset = { x: wm.x - parseFloat(el.style.left), y: wm.y - parseFloat(el.style.top) };
        el.style.zIndex = 100;
        e.stopPropagation();
    });

    // ── Hover glow when a wire is being dragged ──
    el.addEventListener('mouseenter', () => {
        hoveredNodeId = el.id;
        if (drawingCable && drawingCable.startNodeId !== el.id) el.classList.add('hover-target');
    });
    el.addEventListener('mouseleave', () => {
        if (hoveredNodeId === el.id) hoveredNodeId = null;
        el.classList.remove('hover-target');
    });

    // ── Delete ──
    el.querySelector('.node-delete').addEventListener('mousedown', (e) => {
        e.stopPropagation();
        deleteNode(id);
    });

    // ── Start wire from port zone ──
    el.querySelectorAll('.port-zone').forEach(zone => {
        zone.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            zone.classList.add('wire-active');
            const r = zone.getBoundingClientRect();
            const sx = r.left + r.width/2;
            const sy = r.top  + r.height/2;
            drawingCable = { startNodeId: el.id, startPort: zone.dataset.port, startX: sx, startY: sy };
            dragLine.setAttribute('d', `M ${sx} ${sy} L ${sx} ${sy}`);
            dragLine.style.display = 'block';
        });
    });
}

// ── CABLE MANAGEMENT ──────────────────────────────────────────────────────────
function createConnection(n1, p1, n2, p2) {
    const id = `${n1}:${p1}=>${n2}:${p2}`;
    if (document.getElementById(id)) return;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.id = id;
    path.classList.add('prism-cable');
    path.setAttribute('marker-end', 'url(#arrow)');
    cablesLayer.insertBefore(path, dragLine);

    connections.push({ id, el: path, from: { n: n1, p: p1 }, to: { n: n2, p: p2 } });
    updateAllCables();
}

function updateAllCables() {
    connections.forEach(c => {
        const s = getPortScreenCenter(c.from.n, c.from.p);
        const e = getPortScreenCenter(c.to.n,   c.to.p);
        if (s && e) c.el.setAttribute('d', getEdgePath(s.x, s.y, c.from.p, e.x, e.y, c.to.p));
    });
}
