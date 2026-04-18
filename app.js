// --- 1. CONFIG & SCENE ---
const particleCount = 100000; // 100 Ribu Partikel!
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false }); // Antialias off untuk performa 100k
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

camera.position.z = 20;

// --- 2. GEOMETRY & BUFFERS ---
const geometry = new THREE.BufferGeometry();
const positions = new Float32Array(particleCount * 3);
const colors = new Float32Array(particleCount * 3);

const shapes = {
    saturn: new Float32Array(particleCount * 3),
    eiffel: new Float32Array(particleCount * 3),
    earth: new Float32Array(particleCount * 3),
    earthCol: new Float32Array(particleCount * 3)
};

// --- 3. GENERATOR LOGIC ---
for (let i = 0; i < particleCount; i++) {
    const idx = i * 3;

    // A. SATURN (PERFECT GOLDEN PROPORTION)
    if (i < particleCount * 0.4) {
        const phi = Math.acos(-1 + (2 * i) / (particleCount * 0.4));
        const theta = Math.sqrt(particleCount * 0.4 * Math.PI) * phi;
        shapes.saturn[idx] = 3 * Math.cos(theta) * Math.sin(phi);
        shapes.saturn[idx+1] = 3 * Math.sin(theta) * Math.sin(phi);
        shapes.saturn[idx+2] = 3 * Math.cos(phi);
    } else {
        const a = Math.random() * Math.PI * 2;
        const r = 4.5 + Math.random() * 3.5;
        shapes.saturn[idx] = Math.cos(a) * r;
        shapes.saturn[idx+1] = (Math.random() - 0.5) * 0.3;
        shapes.saturn[idx+2] = Math.sin(a) * r;
    }

    // B. EIFFEL (MATHEMATICAL PRECISION)
    // Formula based on the exponential curve of the actual tower
    const y = (Math.random() * 18) - 8; 
    const normY = (y + 8) / 18; // 0 to 1
    const scale = 4 * Math.exp(-2.5 * normY); // Exponential taper
    
    // Create 4 main pillars with cross-beams
    let x, z;
    if (Math.random() > 0.15) { // Main pillars
        const section = Math.floor(Math.random() * 4);
        const offsetX = (section < 2 ? 1 : -1) * scale;
        const offsetZ = (section % 2 === 0 ? 1 : -1) * scale;
        x = offsetX + (Math.random() - 0.5) * 0.2;
        z = offsetZ + (Math.random() - 0.5) * 0.2;
    } else { // Cross girders
        x = (Math.random() - 0.5) * scale * 2;
        z = (Math.random() - 0.5) * scale * 2;
    }
    shapes.eiffel[idx] = x;
    shapes.eiffel[idx+1] = y;
    shapes.eiffel[idx+2] = z;

    // C. EARTH (REALISTIC CONTINENTS)
    const phi = Math.acos(-1 + (2 * i) / particleCount);
    const theta = Math.sqrt(particleCount * Math.PI) * phi;
    const r = 6;
    const ex = r * Math.cos(theta) * Math.sin(phi);
    const ey = r * Math.sin(theta) * Math.sin(phi);
    const ez = r * Math.cos(phi);
    shapes.earth[idx] = ex;
    shapes.earth[idx+1] = ey;
    shapes.earth[idx+2] = ez;

    // Procedural Earth Coloring (Simple Fractal Noise Simulation)
    const landTerm = Math.sin(ex * 0.5) * Math.cos(ey * 0.5) * Math.sin(ez * 0.5) +
                     Math.sin(ex * 1.2) * Math.cos(ey * 1.2);
    
    const c = new THREE.Color();
    if (Math.abs(ey) > 5.2) { // Poles (Ice)
        c.setHex(0xffffff);
    } else if (landTerm > 0.2) { // Continents
        c.setHex(0x2d5a27); // Deep Green
    } else if (landTerm > 0.1) { // Coasts
        c.setHex(0x76a665); // Light Green
    } else { // Oceans
        c.setHex(0x0a2a4a); // Deep Blue
    }
    shapes.earthCol[idx] = c.r;
    shapes.earthCol[idx+1] = c.g;
    shapes.earthCol[idx+2] = c.b;

    // INIT POSITIONS
    positions[idx] = shapes.saturn[idx];
    positions[idx+1] = shapes.saturn[idx+1];
    positions[idx+2] = shapes.saturn[idx+2];
    colors[idx] = 1; colors[idx+1] = 0.8; colors[idx+2] = 0.2;
}

geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

const material = new THREE.PointsMaterial({
    size: 0.015,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending
});

const points = new THREE.Points(geometry, material);
scene.add(points);

// --- 4. HANDS LOGIC ---
let currentTarget = shapes.saturn;
let currentTargetCol = null;
let targetBaseCol = new THREE.Color(0xffd700);

const hands = new Hands({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`});
hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.6 });

hands.onResults((res) => {
    if (res.multiHandLandmarks && res.multiHandLandmarks.length > 0) {
        const pts = res.multiHandLandmarks[0];
        
        // Smooth Follow
        points.position.x = THREE.MathUtils.lerp(points.position.x, (pts[9].x - 0.5) * -35, 0.1);
        points.position.y = THREE.MathUtils.lerp(points.position.y, (pts[9].y - 0.5) * -25, 0.1);

        const index = pts[8].y < pts[6].y - 0.05;
        const middle = pts[12].y < pts[10].y - 0.05;

        if (index && middle) { // 2 Jari = BUMI
            currentTarget = shapes.earth;
            currentTargetCol = shapes.earthCol;
        } else if (index) { // 1 Jari = EIFFEL
            currentTarget = shapes.eiffel;
            currentTargetCol = null;
            targetBaseCol.setHex(0xeeeeee);
        } else { // Kepal = SATURN
            currentTarget = shapes.saturn;
            currentTargetCol = null;
            targetBaseCol.setHex(0xffd700);
        }
    }
});

// Start Camera
const videoElement = document.getElementById('input_video');
new Camera(videoElement, { onFrame: async () => { await hands.send({image: videoElement}); }, width: 640, height: 480 }).start();

// --- 5. ANIMATE ---
function animate() {
    requestAnimationFrame(animate);
    const pos = geometry.attributes.position;
    const col = geometry.attributes.color;

    for (let i = 0; i < particleCount; i++) {
        const idx = i * 3;
        // Position Morphing
        pos.array[idx] += (currentTarget[idx] - pos.array[idx]) * 0.07;
        pos.array[idx+1] += (currentTarget[idx+1] - pos.array[idx+1]) * 0.07;
        pos.array[idx+2] += (currentTarget[idx+2] - pos.array[idx+2]) * 0.07;

        // Color Morphing
        if (currentTargetCol) {
            col.array[idx] += (currentTargetCol[idx] - col.array[idx]) * 0.1;
            col.array[idx+1] += (currentTargetCol[idx+1] - col.array[idx+1]) * 0.1;
            col.array[idx+2] += (currentTargetCol[idx+2] - col.array[idx+2]) * 0.1;
        } else {
            col.array[idx] += (targetBaseCol.r - col.array[idx]) * 0.1;
            col.array[idx+1] += (targetBaseCol.g - col.array[idx+1]) * 0.1;
            col.array[idx+2] += (targetBaseCol.b - col.array[idx+2]) * 0.1;
        }
    }
    
    pos.needsUpdate = true;
    col.needsUpdate = true;
    points.rotation.y += 0.004;
    renderer.render(scene, camera);
}
animate();
