document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('jsonInput');
    const output = document.getElementById('jsonOutput');
    const graphOutput = document.getElementById('jsonGraph');
    const errorMessage = document.getElementById('errorMessage');
    const formatBtn = document.getElementById('formatBtn');
    const minifyBtn = document.getElementById('minifyBtn');
    const clearBtn = document.getElementById('clearBtn');
    const copyBtn = document.getElementById('copyBtn');
    const themeToggle = document.getElementById('themeToggle');
    const textModeBtn = document.getElementById('textModeBtn');
    const graphModeBtn = document.getElementById('graphModeBtn');
    const html = document.documentElement;

    let currentMode = 'text';
    let network = null;
    let virtualGraph = { nodes: [], edges: [] };
    let visNodes = new vis.DataSet([]);
    let visEdges = new vis.DataSet([]);

    // Config Logic
    if (typeof CONFIG !== 'undefined') {
        const logoLink = document.querySelector('.logo');
        if (logoLink && CONFIG.HOME_URL) {
            logoLink.href = CONFIG.HOME_URL;
        }
    }

    // Theme Logic
    const savedTheme = localStorage.getItem('theme') || 'light';
    html.setAttribute('data-theme', savedTheme);
    updateIcons(savedTheme);

    themeToggle.addEventListener('click', () => {
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateIcons(newTheme);
        if (currentMode === 'graph') updateGraphTheme();
    });

    function updateIcons(theme) {
        const sunIcon = document.querySelector('.sun-icon');
        const moonIcon = document.querySelector('.moon-icon');
        if (theme === 'dark') {
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
        } else {
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
        }
    }

    // View Mode Logic
    textModeBtn.addEventListener('click', () => switchMode('text'));
    graphModeBtn.addEventListener('click', () => switchMode('graph'));

    function switchMode(mode) {
        currentMode = mode;
        if (mode === 'text') {
            textModeBtn.classList.add('active');
            graphModeBtn.classList.remove('active');
            output.style.display = 'flex';
            graphOutput.style.display = 'none';
        } else {
            textModeBtn.classList.remove('active');
            graphModeBtn.classList.add('active');
            output.style.display = 'none';
            graphOutput.style.display = 'block';
            renderGraphFromInput();
        }
    }

    // JSON Logic
    function formatJSON() {
        const raw = input.value.trim();
        if (!raw) {
            output.innerHTML = '';
            if (network) network.destroy();
            hideError();
            return;
        }

        try {
            const parsed = JSON.parse(raw);
            renderTree(parsed);
            if (currentMode === 'graph') renderGraph(parsed);
            hideError();
        } catch (e) {
            showError(e.message);
        }
    }

    function minifyJSON() {
        const raw = input.value.trim();
        if (!raw) return;

        try {
            const parsed = JSON.parse(raw);
            const minified = JSON.stringify(parsed);
            input.value = minified;
            renderTree(parsed); 
            if (currentMode === 'graph') renderGraph(parsed);
            hideError();
        } catch (e) {
            showError(e.message);
        }
    }

    // Graph State
    
    function renderGraphFromInput() {
        const raw = input.value.trim();
        if (!raw) return;
        try {
            const parsed = JSON.parse(raw);
            buildVirtualGraph(parsed);
            initGraph();
        } catch (e) {
            // Error handled by formatJSON usually
        }
    }

    function buildVirtualGraph(data) {
        virtualGraph = { nodes: [], edges: [] };
        let idCounter = 0;

        function traverse(obj, parentId = null, label = null) {
            const currentId = idCounter++;
            let nodeLabel = label || 'Root';
            let color = '#6366f1'; // Default Accent
            let shape = 'box';
            let type = 'value';

            if (obj === null) {
                nodeLabel += ': null';
                color = '#94a3b8';
            } else if (typeof obj === 'object') {
                if (Array.isArray(obj)) {
                    nodeLabel = label || 'Array';
                    shape = 'ellipse';
                    color = '#f472b6';
                    type = 'array';
                } else {
                    nodeLabel = label || 'Object';
                    shape = 'ellipse';
                    color = '#6366f1';
                    type = 'object';
                }
            } else {
                nodeLabel += `: ${obj}`;
                if (typeof obj === 'string') color = '#4ade80';
                if (typeof obj === 'number') color = '#fb923c';
                if (typeof obj === 'boolean') color = '#f472b6';
            }

            const node = { 
                id: currentId, 
                label: String(nodeLabel), 
                color: { background: color, border: color }, 
                shape: shape, 
                font: { color: '#fff' },
                data: { type: type, expanded: false, parentId: parentId }
            };
            
            virtualGraph.nodes.push(node);

            if (parentId !== null) {
                virtualGraph.edges.push({ from: parentId, to: currentId });
            }

            if (typeof obj === 'object' && obj !== null) {
                Object.keys(obj).forEach(key => {
                    traverse(obj[key], currentId, key);
                });
            }
        }

        // Limit graph size for performance check
        if (JSON.stringify(data).length > 100000) {
             // Warn but try? Or just limit depth? For now, standard traversal.
        }

        traverse(data);
    }

    function initGraph() {
        const container = document.getElementById('graphContainer');
        
        // Initial View: Root + Immediate Children
        visNodes.clear();
        visEdges.clear();

        if (virtualGraph.nodes.length > 0) {
            const root = virtualGraph.nodes[0];
            root.data.expanded = true; // Root always expanded
            visNodes.add(root);
            addChildrenToView(root.id);
        }

        const data = { nodes: visNodes, edges: visEdges };
        const options = {
            nodes: {
                borderWidth: 0,
                shadow: true
            },
            edges: {
                color: { color: '#666' },
                smooth: { type: 'cubicBezier' }
            },
            layout: {
                hierarchical: {
                    enabled: false
                }
            },
            physics: {
                stabilization: false,
                barnesHut: {
                    gravitationalConstant: -2000,
                    springConstant: 0.04,
                    springLength: 95
                }
            },
            interaction: {
                dragNodes: true,
                zoomView: true,
                dragView: true,
                hover: true
            }
        };

        if (network) network.destroy();
        network = new vis.Network(container, data, options);

        network.on('click', function(params) {
            if (params.nodes.length > 0) {
                const nodeId = params.nodes[0];
                toggleNode(nodeId);
            }
        });
    }

    function addChildrenToView(parentId) {
        const childrenEdges = virtualGraph.edges.filter(e => e.from === parentId);
        const childrenIds = childrenEdges.map(e => e.to);
        const childrenNodes = virtualGraph.nodes.filter(n => childrenIds.includes(n.id));

        childrenNodes.forEach(node => {
            if (!visNodes.get(node.id)) {
                visNodes.add(node);
                visEdges.add({ from: parentId, to: node.id });
            }
        });
        
        // Mark parent as expanded in virtual graph (if we want to track state)
        const parent = virtualGraph.nodes.find(n => n.id === parentId);
        if (parent) parent.data.expanded = true;
    }

    function removeChildrenFromView(parentId) {
        // Recursive removal
        const childrenEdges = virtualGraph.edges.filter(e => e.from === parentId);
        const childrenIds = childrenEdges.map(e => e.to);
        
        childrenIds.forEach(childId => {
            removeChildrenFromView(childId); // Recurse first
            visNodes.remove(childId);
            const edgeToRemove = visEdges.get({ filter: item => item.to === childId });
            visEdges.remove(edgeToRemove);
            
            const child = virtualGraph.nodes.find(n => n.id === childId);
            if (child) child.data.expanded = false;
        });

        const parent = virtualGraph.nodes.find(n => n.id === parentId);
        if (parent) parent.data.expanded = false;
    }

    function toggleNode(nodeId) {
        const node = virtualGraph.nodes.find(n => n.id === nodeId);
        if (!node || (node.data.type !== 'object' && node.data.type !== 'array')) return;

        if (node.data.expanded) {
            removeChildrenFromView(nodeId);
        } else {
            addChildrenToView(nodeId);
        }
    }

    // Filter Logic
    const graphSearch = document.getElementById('graphSearch');
    graphSearch.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        if (!query) {
            // Reset to default view (Root + children)
            initGraph();
            return;
        }

        // Find matches
        const matches = virtualGraph.nodes.filter(n => n.label.toLowerCase().includes(query));
        
        // For each match, reveal path to root
        matches.forEach(match => {
            revealPathToRoot(match.id);
        });
    });

    function revealPathToRoot(nodeId) {
        let currentId = nodeId;
        const path = [];

        // Trace back
        while (currentId !== null) {
            path.unshift(currentId);
            const node = virtualGraph.nodes.find(n => n.id === currentId);
            if (!node) break;
            currentId = node.data.parentId;
        }

        // Expand down the path
        path.forEach(id => {
            if (!visNodes.get(id)) {
                const node = virtualGraph.nodes.find(n => n.id === id);
                visNodes.add(node);
                if (node.data.parentId !== null) {
                    visEdges.add({ from: node.data.parentId, to: id });
                }
            }
            // Ensure children are visible if it's a match or parent of match? 
            // For now, just ensuring the node itself is visible is enough.
            // But if we want to see the *match*, we need to ensure its parent is expanded.
            
            // Actually, simpler: just ensure the node is added. 
            // If we add a node, we must add its edge to parent.
        });
    }

    function updateGraphTheme() {
        if (currentMode === 'graph') renderGraphFromInput();
    }

    // Tree Renderer (Existing)
    function renderTree(data) {
        output.innerHTML = '';
        let lineNumber = 1;

        function createRow(content, indentLevel = 0, hasToggle = false) {
            const row = document.createElement('div');
            row.className = 'line-row';
            
            // Gutter (Line Number + Toggle)
            const gutter = document.createElement('div');
            gutter.className = 'line-gutter';
            
            // Toggle
            let toggle = null;
            if (hasToggle) {
                toggle = document.createElement('span');
                toggle.className = 'json-toggle expanded';
                gutter.appendChild(toggle);
            } else {
                // Spacer for alignment if no toggle
                const spacer = document.createElement('span');
                spacer.className = 'toggle-spacer';
                gutter.appendChild(spacer);
            }
            
            // Line Number
            const numSpan = document.createElement('span');
            numSpan.className = 'line-number';
            numSpan.textContent = lineNumber++;
            gutter.appendChild(numSpan);
            
            row.appendChild(gutter);

            // Content
            const contentDiv = document.createElement('div');
            contentDiv.className = 'line-content';
            contentDiv.style.paddingLeft = `${indentLevel * 1.5}rem`;
            contentDiv.innerHTML = content;
            row.appendChild(contentDiv);
            
            return { row, toggle };
        }

        function buildNode(value, indentLevel = 0, isLast = true, key = null) {
            const container = document.createElement('div');
            container.className = 'node-container';
            
            let lineContent = '';
            if (key !== null) {
                lineContent += `<span class="json-key">"${key}"</span>: `;
            }

            if (value === null) {
                lineContent += `<span class="json-null">null</span>`;
                if (!isLast) lineContent += ',';
                const { row } = createRow(lineContent, indentLevel);
                container.appendChild(row);
            } else if (typeof value === 'boolean') {
                lineContent += `<span class="json-boolean">${value}</span>`;
                if (!isLast) lineContent += ',';
                const { row } = createRow(lineContent, indentLevel);
                container.appendChild(row);
            } else if (typeof value === 'number') {
                lineContent += `<span class="json-number">${value}</span>`;
                if (!isLast) lineContent += ',';
                const { row } = createRow(lineContent, indentLevel);
                container.appendChild(row);
            } else if (typeof value === 'string') {
                const escaped = value.replace(/"/g, '\\"');
                lineContent += `<span class="json-string">"${escaped}"</span>`;
                if (!isLast) lineContent += ',';
                const { row } = createRow(lineContent, indentLevel);
                container.appendChild(row);
            } else if (Array.isArray(value)) {
                const hasItems = value.length > 0;
                const { row: startRow, toggle } = createRow(`${lineContent}<span class="json-brace">[</span>`, indentLevel, hasItems);
                container.appendChild(startRow);

                if (hasItems) {
                    const placeholder = document.createElement('span');
                    placeholder.className = 'json-placeholder';
                    placeholder.textContent = `Array(${value.length}) ...`;
                    startRow.querySelector('.line-content').appendChild(placeholder);

                    const childrenContainer = document.createElement('div');
                    childrenContainer.className = 'json-children show';
                    
                    value.forEach((item, index) => {
                        childrenContainer.appendChild(buildNode(item, indentLevel + 1, index === value.length - 1));
                    });
                    
                    container.appendChild(childrenContainer);

                    const handleToggle = (e) => {
                        e.stopPropagation();
                        const isExpanded = toggle.classList.contains('expanded');
                        if (isExpanded) {
                            toggle.classList.remove('expanded');
                            childrenContainer.classList.remove('show');
                            placeholder.classList.add('show');
                        } else {
                            toggle.classList.add('expanded');
                            childrenContainer.classList.add('show');
                            placeholder.classList.remove('show');
                        }
                    };

                    toggle.addEventListener('click', handleToggle);
                    // Make the placeholder clickable too
                    placeholder.addEventListener('click', handleToggle);
                }

                const { row: endRow } = createRow(`<span class="json-brace">]</span>${!isLast ? ',' : ''}`, indentLevel);
                container.appendChild(endRow);
            } else if (typeof value === 'object') {
                const keys = Object.keys(value);
                const hasItems = keys.length > 0;
                const { row: startRow, toggle } = createRow(`${lineContent}<span class="json-brace">{</span>`, indentLevel, hasItems);
                container.appendChild(startRow);

                if (hasItems) {
                    const placeholder = document.createElement('span');
                    placeholder.className = 'json-placeholder';
                    placeholder.textContent = `{...}`;
                    startRow.querySelector('.line-content').appendChild(placeholder);

                    const childrenContainer = document.createElement('div');
                    childrenContainer.className = 'json-children show';
                    
                    keys.forEach((k, index) => {
                        childrenContainer.appendChild(buildNode(value[k], indentLevel + 1, index === keys.length - 1, k));
                    });
                    
                    container.appendChild(childrenContainer);

                    const handleToggle = (e) => {
                        e.stopPropagation();
                        const isExpanded = toggle.classList.contains('expanded');
                        if (isExpanded) {
                            toggle.classList.remove('expanded');
                            childrenContainer.classList.remove('show');
                            placeholder.classList.add('show');
                        } else {
                            toggle.classList.add('expanded');
                            childrenContainer.classList.add('show');
                            placeholder.classList.remove('show');
                        }
                    };

                    toggle.addEventListener('click', handleToggle);
                    placeholder.addEventListener('click', handleToggle);
                }

                const { row: endRow } = createRow(`<span class="json-brace">}</span>${!isLast ? ',' : ''}`, indentLevel);
                container.appendChild(endRow);
            }

            return container;
        }

        output.appendChild(buildNode(data));
    }

    function showError(msg) {
        errorMessage.textContent = 'Invalid JSON: ' + msg;
        errorMessage.classList.add('show');
    }

    function hideError() {
        errorMessage.classList.remove('show');
    }

    // Event Listeners
    formatBtn.addEventListener('click', () => {
        const raw = input.value.trim();
        if (!raw) return;
        try {
            const parsed = JSON.parse(raw);
            input.value = JSON.stringify(parsed, null, 4);
            formatJSON();
        } catch (e) {
            showError(e.message);
        }
    });

    minifyBtn.addEventListener('click', minifyJSON);
    
    clearBtn.addEventListener('click', () => {
        input.value = '';
        output.innerHTML = '';
        if (network) network.destroy();
        hideError();
        input.focus();
    });

    copyBtn.addEventListener('click', () => {
        const raw = input.value.trim();
        if (!raw) return;
        try {
            // Copy formatted JSON
            const parsed = JSON.parse(raw);
            navigator.clipboard.writeText(JSON.stringify(parsed, null, 4)).then(() => {
                const originalIcon = copyBtn.innerHTML;
                copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
                setTimeout(() => {
                    copyBtn.innerHTML = originalIcon;
                }, 2000);
            });
        } catch (e) {
            showError(e.message);
        }
    });

    // Auto-format on input with debounce
    let debounceTimer;
    input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            formatJSON();
        }, 500);
    });

    // Auto-format on load if content exists
    if (input.value.trim()) {
        formatJSON();
    }
});
