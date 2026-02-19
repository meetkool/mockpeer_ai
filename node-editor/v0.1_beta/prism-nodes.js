// const nodeLayer = document.getElementById('node-layer');

// function createNode(type, title, color) {
//     const id = 'node-' + Math.random().toString(36).substr(2, 5);
//     const center = toWorld(viewport.clientWidth / 2, viewport.clientHeight / 2);
//     const x = center.x + (Math.random() - 0.5) * 100;
//     const y = center.y + (Math.random() - 0.5) * 100;

//     const el = document.createElement('div');
//     el.className = 'node';
//     el.id = id;
//     el.style.left = x + 'px';
//     el.style.top = y + 'px';

//     // HTML Template for a Node
//     el.innerHTML = `
//         <div class="node-header" style="color:${color}">
//             <div style="width:8px;height:8px;background:${color};border-radius:50%"></div>
//             ${title}
//         </div>
//         <div class="node-body">Type: ${type} <br> ID: ${id}</div>

//         <div class="port top" data-port="top"></div>
//         <div class="port bottom" data-port="bottom"></div>
//         <div class="port left" data-port="left"></div>
//         <div class="port right" data-port="right"></div>
//     `;

//     attachNodeEvents(el);
//     nodeLayer.appendChild(el);
//     nodes.push({ id, el, x, y, type, title });
// }

// function attachNodeEvents(el) {
//     // 1. Start Dragging Node
//     el.addEventListener('mousedown', (e) => {
//         if(e.target.classList.contains('port')) return;

//         // FIX: Move this node to the end of the list (Visually brings to front)
//         el.parentElement.appendChild(el); 

//         draggingNode = el;

//         // We need offset in World Coordinates
//         const worldMouse = toWorld(e.clientX, e.clientY);
//         const currentLeft = parseFloat(el.style.left);
//         const currentTop = parseFloat(el.style.top);

//         dragOffset = { x: worldMouse.x - currentLeft, y: worldMouse.y - currentTop };
//         el.style.zIndex = 100;
//     });

//     // 2. Hover Effects (Hit Testing)
//     el.addEventListener('mouseenter', () => {
//         hoveredNodeId = el.id;
//         if(drawingCable && drawingCable.startNodeId !== el.id) {
//             el.classList.add('hover-target');
//         }
//     });

//     el.addEventListener('mouseleave', () => {
//         if(hoveredNodeId === el.id) hoveredNodeId = null;
//         el.classList.remove('hover-target');
//     });

//     // 3. Start Dragging Wire
//     el.querySelectorAll('.port').forEach(port => {
//         port.addEventListener('mousedown', (e) => {
//             e.stopPropagation();
//             const rect = port.getBoundingClientRect();
//             const screenX = rect.left + rect.width/2;
//             const screenY = rect.top + rect.height/2;

//             drawingCable = { 
//                 startNodeId: el.id, 
//                 startPort: port.dataset.port, 
//                 startX: screenX, 
//                 startY: screenY 
//             };

//             dragLine.setAttribute('d', `M ${screenX} ${screenY} L ${screenX} ${screenY}`);
//             dragLine.style.display = 'block';
//         });
//     });
// }

// // --- CABLE MANAGEMENT ---

// function createConnection(n1, p1, n2, p2) {
//     const id = `${n1}_${p1}__${n2}_${p2}`;
//     if(document.getElementById(id)) return;

//     const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
//     path.id = id;
//     path.setAttribute("stroke", "#94a3b8");
//     path.setAttribute("stroke-width", "2");
//     path.setAttribute("marker-end", "url(#arrow)");
//     cablesLayer.appendChild(path);

//     connections.push({ id, el: path, from: {n:n1, p:p1}, to: {n:n2, p:p2} });
//     updateAllCables();
// }

// function updateAllCables() {
//     connections.forEach(c => {
//         const start = getScreenPortPos(c.from.n, c.from.p);
//         const end = getScreenPortPos(c.to.n, c.to.p);
//         if (start && end) {
//             c.el.setAttribute('d', getBezierPath(start.x, start.y, end.x, end.y));
//         }
//     });

//     // Update active drag line if moving node
//     if (drawingCable) {
//          const start = getScreenPortPos(drawingCable.startNodeId, drawingCable.startPort);
//          if(start) {
//              drawingCable.startX = start.x;
//              drawingCable.startY = start.y;
//          }
//     }
// }

// function getScreenPortPos(nodeId, portType) {
//     const node = document.getElementById(nodeId);
//     if(!node) return null;
//     const port = node.querySelector(`.port.${portType}`);
//     const rect = port.getBoundingClientRect();
//     return { x: rect.left + rect.width/2, y: rect.top + rect.height/2 };
// }

// function getClosestPort(nodeEl, mouseX, mouseY) {
//     let min = Infinity; let best = 'top';
//     nodeEl.querySelectorAll('.port').forEach(p => {
//         const rect = p.getBoundingClientRect();
//         const px = rect.left + rect.width/2; 
//         const py = rect.top + rect.height/2;
//         const dist = Math.hypot(px - mouseX, py - mouseY);
//         if (dist < min) { min = dist; best = p.dataset.port; }
//     });
//     return best;
// }
const nodeLayer = document.getElementById('node-layer');

function createNode(type, title, color) {
    const id = 'node-' + Math.random().toString(36).substr(2, 5);
    const center = toWorld(viewport.clientWidth / 2, viewport.clientHeight / 2);
    const x = center.x + (Math.random() - 0.5) * 100;
    const y = center.y + (Math.random() - 0.5) * 100;

    const el = document.createElement('div');
    el.className = 'node';
    el.id = id;
    el.style.left = x + 'px';
    el.style.top = y + 'px';

    // HTML Template for a Node
    // Each port is now a large invisible .port-zone (36x36px hit area) wrapping the small visible .port dot
    el.innerHTML = `
        <div class="node-header" style="color:${color}">
            <div style="width:8px;height:8px;background:${color};border-radius:50%"></div>
            ${title}
        </div>
        <div class="node-body">Type: ${type} <br> ID: ${id}</div>
        
        <div class="port-zone top"    data-port="top">   <div class="port"></div></div>
        <div class="port-zone bottom" data-port="bottom"><div class="port"></div></div>
        <div class="port-zone left"   data-port="left">  <div class="port"></div></div>
        <div class="port-zone right"  data-port="right"> <div class="port"></div></div>
    `;

    attachNodeEvents(el);
    nodeLayer.appendChild(el);
    nodes.push({ id, el, x, y, type, title });
}

function attachNodeEvents(el) {
    // 1. Start Dragging Node
    el.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('port')) return;

        // FIX: Move this node to the end of the list (Visually brings to front)
        el.parentElement.appendChild(el);

        draggingNode = el;

        // We need offset in World Coordinates
        const worldMouse = toWorld(e.clientX, e.clientY);
        const currentLeft = parseFloat(el.style.left);
        const currentTop = parseFloat(el.style.top);

        dragOffset = { x: worldMouse.x - currentLeft, y: worldMouse.y - currentTop };
        el.style.zIndex = 100;
    });

    // 2. Hover Effects (Hit Testing)
    el.addEventListener('mouseenter', () => {
        hoveredNodeId = el.id;
        if (drawingCable && drawingCable.startNodeId !== el.id) {
            el.classList.add('hover-target');
        }
    });

    el.addEventListener('mouseleave', () => {
        if (hoveredNodeId === el.id) hoveredNodeId = null;
        el.classList.remove('hover-target');
    });

    // 3. Start Dragging Wire — listen on .port-zone (the big hit area)
    el.querySelectorAll('.port-zone').forEach(zone => {
        zone.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            const rect = zone.getBoundingClientRect();
            const screenX = rect.left + rect.width / 2;
            const screenY = rect.top + rect.height / 2;

            // Visual feedback — light up the dot
            zone.classList.add('active');

            drawingCable = {
                startNodeId: el.id,
                startPort: zone.dataset.port,
                startX: screenX,
                startY: screenY
            };

            dragLine.setAttribute('d', `M ${screenX} ${screenY} L ${screenX} ${screenY}`);
            dragLine.style.display = 'block';
        });

        // Remove active class when released
        zone.addEventListener('mouseup', () => zone.classList.remove('active'));
    });
}

// --- CABLE MANAGEMENT ---

function createConnection(n1, p1, n2, p2) {
    const id = `${n1}_${p1}__${n2}_${p2}`;
    if (document.getElementById(id)) return;

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.id = id;
    path.setAttribute("stroke", "#94a3b8");
    path.setAttribute("stroke-width", "2");
    path.setAttribute("marker-end", "url(#arrow)");
    cablesLayer.appendChild(path);

    connections.push({ id, el: path, from: { n: n1, p: p1 }, to: { n: n2, p: p2 } });
    updateAllCables();
}

function updateAllCables() {
    connections.forEach(c => {
        const start = getScreenPortPos(c.from.n, c.from.p);
        const end = getScreenPortPos(c.to.n, c.to.p);
        if (start && end) {
            c.el.setAttribute('d', getBezierPath(start.x, start.y, end.x, end.y));
        }
    });

    // Update active drag line if moving node
    if (drawingCable) {
        const start = getScreenPortPos(drawingCable.startNodeId, drawingCable.startPort);
        if (start) {
            drawingCable.startX = start.x;
            drawingCable.startY = start.y;
        }
    }
}

function getScreenPortPos(nodeId, portType) {
    const node = document.getElementById(nodeId);
    if (!node) return null;
    // Use the zone's center (same visual center as the dot)
    const zone = node.querySelector(`.port-zone.${portType}`);
    if (!zone) return null;
    const rect = zone.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function getClosestPort(nodeEl, mouseX, mouseY) {
    let min = Infinity;
    let best = 'top';
    nodeEl.querySelectorAll('.port-zone').forEach(zone => {
        const rect = zone.getBoundingClientRect();
        const px = rect.left + rect.width / 2;
        const py = rect.top + rect.height / 2;
        const dist = Math.hypot(px - mouseX, py - mouseY);
        if (dist < min) { min = dist; best = zone.dataset.port; }
    });
    return best;
}