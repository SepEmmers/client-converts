// Imports removed for local file support (using global THREE)

// DOM Elements
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const imageCanvas = document.getElementById('image-canvas');
const ctx = imageCanvas.getContext('2d');
const generateBtn = document.getElementById('generate-btn');
const downloadBtn = document.getElementById('download-btn');
const threeContainer = document.getElementById('three-container');

// Inputs
const invertCheck = document.getElementById('invert');
const widthInput = document.getElementById('width-mm');
const heightInput = document.getElementById('height-mm');
const keepRatioCheck = document.getElementById('keep-ratio'); // New: Aspect Ratio Checkbox
const depthInput = document.getElementById('depth-mm');
const baseInput = document.getElementById('base-mm');
const smoothingInput = document.getElementById('smoothing');

// State
let originalImage = null;
let imageAspectRatio = 1.0; // New: Store aspect ratio
let stlBlob = null;

// Three.js Globals
let scene, camera, renderer, mesh, controls;

// Initialize Three.js
function initThree() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1e293b); // Matches bg-secondary

    // Camera
    camera = new THREE.PerspectiveCamera(45, threeContainer.clientWidth / threeContainer.clientHeight, 0.1, 1000);
    camera.position.set(0, -150, 150);
    camera.up.set(0, 0, 1); // Z is up

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(threeContainer.clientWidth, threeContainer.clientHeight);
    threeContainer.appendChild(renderer.domElement);

    // Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Lights
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(50, -50, 100);
    scene.add(directionalLight);
    
    const pointLight = new THREE.PointLight(0x38bdf8, 0.5);
    pointLight.position.set(-50, 50, 50);
    scene.add(pointLight);

    // Resize handler
    window.addEventListener('resize', onWindowResize);
    
    animate();
}

function onWindowResize() {
    if (!camera || !renderer) return;
    camera.aspect = threeContainer.clientWidth / threeContainer.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(threeContainer.clientWidth, threeContainer.clientHeight);
}

function animate() {
    requestAnimationFrame(animate);
    if (controls) controls.update();
    if (renderer && scene) renderer.render(scene, camera);
}

// Event Listeners
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--accent-primary)';
});
dropZone.addEventListener('dragleave', () => {
    dropZone.style.borderColor = 'var(--border-color)';
});
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--border-color)';
    if (e.dataTransfer.files.length) {
        handleFile(e.dataTransfer.files[0]);
    }
});
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
        handleFile(e.target.files[0]);
    }
});

// Aspect Ratio Logic
widthInput.addEventListener('input', () => {
    if (keepRatioCheck.checked && imageAspectRatio) {
        heightInput.value = (parseFloat(widthInput.value) / imageAspectRatio).toFixed(2);
    }
});

heightInput.addEventListener('input', () => {
    if (keepRatioCheck.checked && imageAspectRatio) {
        widthInput.value = (parseFloat(heightInput.value) * imageAspectRatio).toFixed(2);
    }
});

generateBtn.addEventListener('click', generateModel);
downloadBtn.addEventListener('click', downloadSTL);

// File Handling
function handleFile(file) {
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        originalImage = new Image();
        originalImage.onload = () => {
            // Calculate and store aspect ratio
            imageAspectRatio = originalImage.width / originalImage.height;
            
            // Auto-update height if ratio is checked
            if (keepRatioCheck.checked) {
                heightInput.value = (parseFloat(widthInput.value) / imageAspectRatio).toFixed(2);
            }

            drawImageToCanvas();
        };
        originalImage.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function drawImageToCanvas() {
    if (!originalImage) return;

    // Resize for performance (max 512px)
    const maxSize = 512;
    let w = originalImage.width;
    let h = originalImage.height;
    
    if (w > h) {
        if (w > maxSize) {
            h *= maxSize / w;
            w = maxSize;
        }
    } else {
        if (h > maxSize) {
            w *= maxSize / h;
            h = maxSize;
        }
    }

    imageCanvas.width = w;
    imageCanvas.height = h;
    ctx.drawImage(originalImage, 0, 0, w, h);
    
    // Apply smoothing if needed (simple blur)
    const smoothing = parseInt(smoothingInput.value);
    if (smoothing > 0) {
        ctx.filter = `blur(${smoothing / 2}px)`;
        ctx.drawImage(imageCanvas, 0, 0, w, h); // Redraw with filter
        ctx.filter = 'none';
    }
}

// Model Generation
// This function converts the 2D image data into a 3D mesh
function generateModel() {
    if (!originalImage) {
        alert('Please upload an image first.');
        return;
    }

    // 1. Prepare Data
    drawImageToCanvas(); // Ensure canvas is up to date (with smoothing)

    const width = imageCanvas.width;
    const height = imageCanvas.height;
    const ctx = imageCanvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data; // RGBA array: [r, g, b, a, r, g, b, a, ...]

    // User Parameters
    const targetWidthMM = parseFloat(widthInput.value);
    const targetHeightMM = parseFloat(heightInput.value);
    const maxDepthMM = parseFloat(depthInput.value);
    const baseThicknessMM = parseFloat(baseInput.value);
    const invert = invertCheck.checked;

    // 2. Geometry Setup
    // We use a BufferGeometry which stores vertex data in simple arrays (Float32Array)
    // This is efficient for large models.
    const geometry = new THREE.BufferGeometry();
    const vertices = []; // x, y, z coordinates
    const indices = [];  // Triangles (groups of 3 vertex indices)

    // Scale factors: Map pixel coordinates to physical mm size
    const scaleX = targetWidthMM / (width - 1);
    const scaleY = targetHeightMM / (height - 1);

    // Helper to get pixel data
    // Returns object with brightness (0-1) and alpha (0-1)
    function getPixel(x, y) {
        if (x < 0 || x >= width || y < 0 || y >= height) return { brightness: 0, alpha: 0 };
        const i = (y * width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        
        // Standard luminance formula
        let brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
        if (invert) brightness = 1.0 - brightness;
        
        return { 
            brightness: brightness, 
            alpha: a / 255.0 
        };
    }

    // 3. Generate Vertices
    // We generate a vertex for every pixel.
    // Z-height = (brightness * maxDepth) + baseThickness
    // If pixel is transparent, we still generate a vertex but mark it (we'll handle faces later)
    // Actually, for a clean mesh, we need to map 1:1.
    
    // To handle "Shape Masking" (Transparency), we need to know which pixels are valid.
    // We will generate vertices for ALL pixels to keep indexing simple, 
    // but we will only generate FACES (triangles) for valid pixels.
    
    const alphaThreshold = 0.1; // Pixels with alpha < 0.1 are considered transparent

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const pixel = getPixel(x, y);
            
            // Calculate Z
            // If transparent, Z doesn't matter much as we won't draw it, 
            // but let's keep it at base level to be safe.
            const z = (pixel.alpha > alphaThreshold) 
                ? (pixel.brightness * maxDepthMM) + baseThicknessMM 
                : 0;

            // Calculate X, Y (Centered around 0,0)
            const posX = (x * scaleX) - (targetWidthMM / 2);
            const posY = -((y * scaleY) - (targetHeightMM / 2)); // Flip Y for 3D

            vertices.push(posX, posY, z);
        }
    }

    // 4. Generate Faces (Top Surface)
    // We iterate through the grid squares. Each square has 4 corners:
    // (x,y), (x+1,y), (x,y+1), (x+1,y+1)
    // We only create triangles if the pixels are visible.
    
    for (let y = 0; y < height - 1; y++) {
        for (let x = 0; x < width - 1; x++) {
            const p1 = getPixel(x, y);
            const p2 = getPixel(x + 1, y);
            const p3 = getPixel(x, y + 1);
            const p4 = getPixel(x + 1, y + 1);

            // Check if this quad is valid (all corners visible)
            // You could also do "at least one", but "all" is safer for clean edges.
            // Let's use a center-point check or check if the *current* pixel is valid?
            // A common approach: A quad is valid if all 4 vertices are valid.
            const v1 = p1.alpha > alphaThreshold;
            const v2 = p2.alpha > alphaThreshold;
            const v3 = p3.alpha > alphaThreshold;
            const v4 = p4.alpha > alphaThreshold;

            if (v1 && v2 && v3 && v4) {
                const a = y * width + x;
                const b = y * width + (x + 1);
                const c = (y + 1) * width + x;
                const d = (y + 1) * width + (x + 1);

                // Triangle 1 (Top-Left, Top-Right, Bottom-Right)
                indices.push(a, b, d);
                // Triangle 2 (Top-Left, Bottom-Right, Bottom-Left)
                indices.push(a, d, c);
            }
        }
    }

    // 5. Generate Base and Sides (Solidify)
    // To make it printable, we need a bottom and sides.
    // Strategy:
    // - Duplicate all vertices at Z=0 (Bottom layer).
    // - Generate bottom faces (reverse winding).
    // - Generate side walls where a valid pixel meets an invalid one (or edge).

    const baseStartIndex = vertices.length / 3;

    // Add Bottom Vertices (Same X,Y, but Z=0)
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 3;
            vertices.push(vertices[i], vertices[i+1], 0); // Z=0
        }
    }

    // Add Bottom Faces
    for (let y = 0; y < height - 1; y++) {
        for (let x = 0; x < width - 1; x++) {
            const p1 = getPixel(x, y);
            const p2 = getPixel(x + 1, y);
            const p3 = getPixel(x, y + 1);
            const p4 = getPixel(x + 1, y + 1);

            if (p1.alpha > alphaThreshold && p2.alpha > alphaThreshold && 
                p3.alpha > alphaThreshold && p4.alpha > alphaThreshold) {
                
                const a = baseStartIndex + y * width + x;
                const b = baseStartIndex + y * width + (x + 1);
                const c = baseStartIndex + (y + 1) * width + x;
                const d = baseStartIndex + (y + 1) * width + (x + 1);

                // Reverse winding for bottom
                indices.push(a, d, b);
                indices.push(a, c, d);
            }
        }
    }

    // Add Side Walls
    // We check every pixel. If it is valid, we check its 4 neighbors.
    // If a neighbor is invalid (or out of bounds), we build a wall between Top and Bottom layers.
    
    // Helper to add a quad wall
    function addWall(topA, topB, bottomA, bottomB) {
        // Triangle 1
        indices.push(topA, bottomA, topB);
        // Triangle 2
        indices.push(bottomA, bottomB, topB);
    }

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const current = getPixel(x, y);
            if (current.alpha <= alphaThreshold) continue; // Skip invalid pixels

            const idx = y * width + x;
            const topIdx = idx;
            const botIdx = baseStartIndex + idx;

            // Check Top Neighbor (y-1)
            if (y === 0 || getPixel(x, y - 1).alpha <= alphaThreshold) {
                // Wall along top edge of this pixel
                // Vertices: Current(x,y) and Right(x+1,y) ? No, vertices are points.
                // We need to think in terms of grid edges.
                // A pixel (x,y) corresponds to vertex (x,y).
                // Wait, vertices are on grid points. Pixels are the squares?
                // In my logic above: "Generate Vertices for every pixel".
                // So vertex (x,y) is the center of pixel (x,y)? Or the corner?
                // Usually in heightmaps, vertices are corners.
                // If vertices are pixels, then a "quad" connects 4 pixels.
                
                // Let's stick to: Vertices are samples at (x,y).
                // A "Face" connects (x,y) to (x+1,y).
                // So if (x,y) is valid and (x,y-1) is invalid...
                // We need to close the gap between row y and row y-1?
                // Actually, if we only draw quads where ALL 4 corners are valid,
                // then the "edge" is the line between valid and invalid vertices.
                
                // Let's refine:
                // We have a grid of vertices.
                // We drew faces between valid vertices.
                // A "Side" is needed along the line connecting two valid vertices
                // if the face on the other side of that line is missing.
                
                // Horizontal Edges (between y and y+1)
                if (x < width - 1) {
                    const me = getPixel(x, y).alpha > alphaThreshold;
                    const right = getPixel(x + 1, y).alpha > alphaThreshold;
                    
                    // If both are valid, we have a line segment.
                    // Does it need a wall? Only if the face above or below is missing.
                    // This is getting complicated.
                    
                    // Alternative "Voxel-like" approach (easier for transparency):
                    // Treat each pixel as a column.
                    // But we want a smooth mesh.
                    
                    // Let's go back to the "Edge Loop" approach.
                    // We iterate all possible *edges* in the grid.
                    // Horizontal edge: (x,y) to (x+1,y).
                    // Vertical edge: (x,y) to (x,y+1).
                    
                    // An edge is a "boundary" if one side has a face and the other doesn't.
                    // Faces are defined by quads (x,y).
                    // Quad (x,y) exists if (x,y), (x+1,y), (x,y+1), (x+1,y+1) are valid.
                    
                    // Let's define Quad validity:
                    // Quad(x,y) is valid if pixels at corners are valid.
                }
            }
        }
    }
    
    // SIMPLIFIED SIDE GENERATION
    // Iterate all generated Quads.
    // For each edge of the quad, check if the neighbor quad exists.
    // If not, build a wall.
    
    // Map to store valid quads
    const validQuads = new Set();
    for (let y = 0; y < height - 1; y++) {
        for (let x = 0; x < width - 1; x++) {
            const p1 = getPixel(x, y).alpha > alphaThreshold;
            const p2 = getPixel(x + 1, y).alpha > alphaThreshold;
            const p3 = getPixel(x, y + 1).alpha > alphaThreshold;
            const p4 = getPixel(x + 1, y + 1).alpha > alphaThreshold;
            
            if (p1 && p2 && p3 && p4) {
                validQuads.add(`${x},${y}`);
            }
        }
    }

    // Now iterate valid quads and check neighbors
    for (let y = 0; y < height - 1; y++) {
        for (let x = 0; x < width - 1; x++) {
            if (!validQuads.has(`${x},${y}`)) continue;

            // Vertices for this quad
            const tl = y * width + x;           // Top-Left
            const tr = y * width + (x + 1);     // Top-Right
            const bl = (y + 1) * width + x;     // Bottom-Left
            const br = (y + 1) * width + (x + 1); // Bottom-Right

            const tl_b = baseStartIndex + tl;
            const tr_b = baseStartIndex + tr;
            const bl_b = baseStartIndex + bl;
            const br_b = baseStartIndex + br;

            // Check Top Neighbor (x, y-1)
            if (!validQuads.has(`${x},${y - 1}`)) {
                addWall(tl, tr, tl_b, tr_b);
            }
            // Check Bottom Neighbor (x, y+1)
            if (!validQuads.has(`${x},${y + 1}`)) {
                addWall(br, bl, br_b, bl_b); // Order for winding
            }
            // Check Left Neighbor (x-1, y)
            if (!validQuads.has(`${x - 1},${y}`)) {
                addWall(bl, tl, bl_b, tl_b);
            }
            // Check Right Neighbor (x+1, y)
            if (!validQuads.has(`${x + 1},${y}`)) {
                addWall(tr, br, tr_b, br_b);
            }
        }
    }

    // 6. Finalize Geometry
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    // Update Scene
    if (mesh) scene.remove(mesh);
    
    const material = new THREE.MeshStandardMaterial({ 
        color: 0xcccccc, 
        roughness: 0.5,
        metalness: 0.1,
        side: THREE.DoubleSide
    });
    
    mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Prepare STL
    prepareSTL(geometry);
    
    downloadBtn.disabled = false;
}

function prepareSTL(geometry) {
    // Simple Binary STL Writer
    const vertices = geometry.attributes.position.array;
    const indices = geometry.index.array;
    
    const triangleCount = indices.length / 3;
    const bufferLength = 80 + 4 + (50 * triangleCount);
    const buffer = new ArrayBuffer(bufferLength);
    const view = new DataView(buffer);

    // Header (80 bytes) - skip
    
    // Triangle count (4 bytes)
    view.setUint32(80, triangleCount, true);

    let offset = 84;
    
    for (let i = 0; i < indices.length; i += 3) {
        const idx1 = indices[i] * 3;
        const idx2 = indices[i + 1] * 3;
        const idx3 = indices[i + 2] * 3;

        // Normal (0,0,0 for now, slicers usually recalculate)
        view.setFloat32(offset, 0, true);
        view.setFloat32(offset + 4, 0, true);
        view.setFloat32(offset + 8, 0, true);

        // Vertex 1
        view.setFloat32(offset + 12, vertices[idx1], true);
        view.setFloat32(offset + 16, vertices[idx1 + 1], true);
        view.setFloat32(offset + 20, vertices[idx1 + 2], true);

        // Vertex 2
        view.setFloat32(offset + 24, vertices[idx2], true);
        view.setFloat32(offset + 28, vertices[idx2 + 1], true);
        view.setFloat32(offset + 32, vertices[idx2 + 2], true);

        // Vertex 3
        view.setFloat32(offset + 36, vertices[idx3], true);
        view.setFloat32(offset + 40, vertices[idx3 + 1], true);
        view.setFloat32(offset + 44, vertices[idx3 + 2], true);

        // Attribute byte count (2 bytes)
        view.setUint16(offset + 48, 0, true);

        offset += 50;
    }

    stlBlob = new Blob([buffer], { type: 'application/octet-stream' });
}

function downloadSTL() {
    if (!stlBlob) return;
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(stlBlob);
    link.download = 'model.stl';
    link.click();
}

// Init
initThree();
