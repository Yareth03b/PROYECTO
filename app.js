import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { EQUIPMENT_DATA, NETWORK_SIM_STATE } from './data.js';

// ============================================================================
// 1. CONFIGURACIÓN ESCENA, CÁMARA Y RENDERERS
// ============================================================================
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f172a);
scene.fog = new THREE.FogExp2(0x0f172a, 0.012);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0px';
labelRenderer.domElement.style.pointerEvents = 'none';
labelRenderer.domElement.style.zIndex = '5';
container.appendChild(labelRenderer.domElement);

// ============================================================================
// 2. CONTROLES: INICIA EN MODO CAMINATA (WASD) Y CON ESC PASA A VISTA ISOMÉTRICA
// ============================================================================
const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true;
orbitControls.dampingFactor = 0.06;
orbitControls.maxPolarAngle = Math.PI / 2 - 0.03;
orbitControls.minDistance = 2;
orbitControls.maxDistance = 42;
orbitControls.target.set(0, 1.2, 0);
orbitControls.enabled = false;

let currentMode = 'fps';
let isPointerLocked = false;
const moveState = { forward: false, backward: false, left: false, right: false, up: false, down: false };
const fpsVelocity = new THREE.Vector3();

camera.position.set(2.2, 1.7, 0.4);
let yaw = Math.PI / 2;
let pitch = 0;
let targetYaw = yaw;
let targetPitch = pitch;

// ============================================================================
// 3. ILUMINACIÓN
// ============================================================================
const ambientLight = new THREE.AmbientLight(0xe2e8f0, 0.95);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfffbeb, 1.35);
sunLight.position.set(12, 26, 14);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 65;
const d = 16;
sunLight.shadow.camera.left = -d;
sunLight.shadow.camera.right = d;
sunLight.shadow.camera.top = d;
sunLight.shadow.camera.bottom = -d;
sunLight.shadow.bias = -0.0005;
scene.add(sunLight);

const rackBlueLight = new THREE.PointLight(0x3b82f6, 2.2, 6);
rackBlueLight.position.set(-6.1, 1.6, 0.2);
scene.add(rackBlueLight);

const officeLight = new THREE.PointLight(0xf8fafc, 1.1, 18);
officeLight.position.set(2.5, 2.95, 0);
scene.add(officeLight);

// ============================================================================
// 4. TEXTURAS PROCEDURALES (INCLUYE VIDRIO REFLECTIVO AZUL, UPS LCD Y CRAC)
// ============================================================================
function createRaisedFloorTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#1e242b';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = '#0f1317';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 250, 250);

  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, 236, 236);

  ctx.fillStyle = '#090d11';
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 8; j++) {
      ctx.fillRect(28 + i * 52, 28 + j * 25, 38, 11);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 11);
  return tex;
}

function createOfficeTileTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#e7dec8';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = '#cbbba0';
  ctx.lineWidth = 5;
  ctx.strokeRect(0, 0, 256, 256);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(9, 10);
  return tex;
}

function createAcousticCeilingTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = '#e2e8f0';
  for (let i = 0; i < 420; i++) {
    const rx = (i * 73) % 250;
    const ry = (i * 137) % 250;
    ctx.fillRect(rx, ry, 2, 2);
  }

  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 10;
  ctx.strokeRect(0, 0, 256, 256);

  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  ctx.strokeRect(5, 5, 246, 246);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 11);
  return tex;
}

// Textura de muro cortina de vidrio reflectivo azul con cielo/nubes (Referencia Imagen 4)
function createReflectiveCurtainGlassTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, '#0284c7');
  grad.addColorStop(0.35, '#38bdf8');
  grad.addColorStop(0.55, '#bae6fd');
  grad.addColorStop(0.75, '#0369a1');
  grad.addColorStop(1, '#0c4a6e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Reflejos diagonales suaves tipo nubes/brillo de vidrio arquitectónico UNAB
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.beginPath();
  ctx.ellipse(160, 140, 140, 50, -0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(360, 320, 160, 65, -0.35, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  return tex;
}

// Pantalla LCD Azul "220V" del UPS Kenga Tech (Referencia Imagen 1)
function createUpsLcdTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 180;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#0284c7';
  ctx.fillRect(0, 0, 256, 180);

  ctx.strokeStyle = '#7dd3fc';
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, 244, 168);

  ctx.fillStyle = '#e0f2fe';
  ctx.font = 'bold 58px monospace';
  ctx.fillText('220', 48, 78);
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('V', 165, 55);
  ctx.fillText('Hz', 165, 80);

  // Iconos inferiores de batería y onda senoidal
  ctx.strokeStyle = '#e0f2fe';
  ctx.lineWidth = 3;
  ctx.strokeRect(32, 110, 48, 28);
  ctx.strokeRect(104, 110, 48, 28);
  ctx.strokeRect(176, 110, 48, 28);
  ctx.font = 'bold 14px monospace';
  ctx.fillText('AC', 44, 130);
  ctx.fillText('BAT', 114, 130);
  ctx.fillText('OK', 190, 130);

  return new THREE.CanvasTexture(c);
}

// Malla perforada negra + Logo EDApower para el Climatizador de Precisión (Referencia Imagen 2)
function createCracMeshTexture(withLogo = false) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#18181b';
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = '#09090b';
  for (let x = 8; x < 248; x += 8) {
    for (let y = 8; y < 248; y += 8) {
      ctx.fillRect(x, y, 4, 4);
    }
  }

  if (withLogo) {
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('EDApower', 62, 135);
  }

  return new THREE.CanvasTexture(c);
}

function createBusMapScreenTexture(variant = 1) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 300;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#0f2942';
  ctx.fillRect(0, 0, 512, 300);

  ctx.fillStyle = '#14532d';
  ctx.fillRect(20, 40, 180, 110);
  ctx.fillRect(280, 150, 190, 120);
  ctx.fillRect(60, 190, 140, 85);

  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(0, 145);
  ctx.lineTo(512, 145);
  ctx.moveTo(235, 0);
  ctx.lineTo(235, 300);
  ctx.stroke();

  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 6;
  ctx.setLineDash([10, 6]);
  ctx.beginPath();
  ctx.moveTo(45, 240);
  ctx.lineTo(235, 240);
  ctx.lineTo(235, 95);
  ctx.lineTo(430, 95);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.arc(430, 95, 14, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(variant === 1 ? 235 : 140, variant === 1 ? 165 : 240, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0284c7';
  ctx.fillRect(0, 0, 512, 36);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(
    variant === 1
      ? 'UNAB BUS GPS - MAPA EN TIEMPO REAL'
      : 'UNAB CONTROL DE FLOTA - ESTADO DE SALIDAS',
    14,
    24
  );

  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.fillRect(310, 48, 188, 95);
  ctx.fillStyle = '#4ade80';
  ctx.font = 'bold 14px monospace';
  ctx.fillText('BUS #01: EN RUTA', 320, 70);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText('Llegada UNAB: 4 min', 320, 92);
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('BUS #02: YA SALIO', 320, 118);

  return new THREE.CanvasTexture(c);
}

function createPrintedChartTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = '#16a34a';
  ctx.fillRect(20, 20, 12, 216);

  ctx.fillStyle = '#2563eb';
  ctx.fillRect(48, 35, 140, 12);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(48, 60, 110, 10);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(48, 85, 160, 10);

  const colors = ['#ec4899', '#8b5cf6', '#06b6d4', '#eab308', '#22c55e'];
  colors.forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(85 + i * 32, 185, 14, 0, Math.PI * 2);
    ctx.fill();
  });

  return new THREE.CanvasTexture(c);
}

// ============================================================================
// 5. REGISTRO DE OBJETOS INTERACTIVOS Y ELEMENTOS ANIMADOS
// ============================================================================
const interactables = [];
const blinkingLEDs = [];
const floatingLabels = [];
const wallMeshes = [];
const doorPivots = [];
let doorsOpen = true;
const ceilingGroup = new THREE.Group();
scene.add(ceilingGroup);
let ceilingVisible = true;

function registerInteractable(meshOrGroup, dataKey) {
  meshOrGroup.traverse((child) => {
    if (child.isMesh) {
      child.userData.dataKey = dataKey;
      interactables.push(child);
    }
  });
}

function addFloatingLabel(text, position) {
  const div = document.createElement('div');
  div.className = 'floating-label-pill';
  div.textContent = text;

  const label = new CSS2DObject(div);
  label.position.copy(position);
  scene.add(label);
  floatingLabels.push(label);
}

// ============================================================================
// 6. ARQUITECTURA: MUROS CON TRAMOS DE VIDRIO REFLECTIVO, DINTELES SOBRE PUERTAS Y MARCOS SIN PARPADEO
// ============================================================================
function buildEnvironmentAndArchitecture() {
  const grassGeo = new THREE.PlaneGeometry(48, 38);
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.95 });
  const grass = new THREE.Mesh(grassGeo, grassMat);
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.08;
  grass.receiveShadow = true;
  scene.add(grass);

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xa8a29e, roughness: 0.85 });
  for (let z = -5.0; z <= 5.0; z += 0.85) {
    for (let x = 9.4; x <= 10.8; x += 0.7) {
      const sGeo = new THREE.CylinderGeometry(0.28, 0.32, 0.06, 7);
      const stone = new THREE.Mesh(sGeo, stoneMat);
      stone.position.set(x + (Math.random() - 0.5) * 0.15, -0.04, z + (Math.random() - 0.5) * 0.15);
      stone.receiveShadow = true;
      scene.add(stone);
    }
  }

  const bushPositions = [
    [-10.2, -3.2],
    [-10.2, 4.8],
    [-6.5, 7.2],
    [10.2, -3.6],
    [10.2, 3.6]
  ];
  const bushMat = new THREE.MeshStandardMaterial({ color: 0x3f6212, roughness: 0.8 });
  bushPositions.forEach(([bx, bz]) => {
    const bushGroup = new THREE.Group();
    const mainSphere = new THREE.Mesh(new THREE.SphereGeometry(0.62, 12, 12), bushMat);
    mainSphere.position.y = 0.45;
    mainSphere.castShadow = true;
    bushGroup.add(mainSphere);
    for (let i = 0; i < 4; i++) {
      const sub = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 10), bushMat);
      sub.position.set(Math.cos(i * 1.5) * 0.35, 0.28, Math.sin(i * 1.5) * 0.35);
      bushGroup.add(sub);
    }
    bushGroup.position.set(bx, 0, bz);
    scene.add(bushGroup);
  });

  // Piso Falso Técnico del Data Center
  const dcFloorGeo = new THREE.BoxGeometry(4.8, 0.16, 11.0);
  const dcFloorMat = new THREE.MeshStandardMaterial({
    map: createRaisedFloorTexture(),
    roughness: 0.55,
    metalness: 0.25
  });
  const dcFloor = new THREE.Mesh(dcFloorGeo, dcFloorMat);
  dcFloor.position.set(-5.6, 0.08, 0);
  dcFloor.receiveShadow = true;
  scene.add(dcFloor);

  // Piso de Baldosas Claras de la Oficina
  const officeFloorGeo = new THREE.BoxGeometry(11.2, 0.12, 11.0);
  const officeFloorMat = new THREE.MeshStandardMaterial({
    map: createOfficeTileTexture(),
    roughness: 0.45
  });
  const officeFloor = new THREE.Mesh(officeFloorGeo, officeFloorMat);
  officeFloor.position.set(2.4, 0.06, 0);
  officeFloor.receiveShadow = true;
  scene.add(officeFloor);

  const wallHeight = 3.6;
  const wallThickness = 0.24;
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
  const wallTopMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.4 });
  const reflectiveGlassTex = createReflectiveCurtainGlassTexture();
  const curtainGlassMat = new THREE.MeshStandardMaterial({
    map: reflectiveGlassTex,
    color: 0x93c5fd,
    metalness: 0.65,
    roughness: 0.08,
    transparent: true,
    opacity: 0.72
  });

  function addSolidWallSegment(x, z, width, depth) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(width, wallHeight, depth), wallMat);
    body.position.y = wallHeight / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const cap = new THREE.Mesh(new THREE.BoxGeometry(width + 0.02, 0.08, depth + 0.02), wallTopMat);
    cap.position.y = wallHeight + 0.04;
    group.add(cap);

    const baseboard = new THREE.Mesh(new THREE.BoxGeometry(width + 0.03, 0.12, depth + 0.03), wallTopMat);
    baseboard.position.y = 0.14;
    group.add(baseboard);

    group.position.set(x, 0, z);
    scene.add(group);
    wallMeshes.push(group);
  }

  // Función para crear tramos de Muro Cortina de Vidrio Reflectivo Azul con retícula de aluminio negro (Referencia Imagen 4)
  function addCurtainGlassWallSegment(x, z, length, alongAxis = 'z') {
    const group = new THREE.Group();
    const isZ = alongAxis === 'z';
    const w = isZ ? wallThickness : length;
    const d = isZ ? length : wallThickness;

    // Zócalo inferior blanco/negro y viga superior hasta Y = 3.6m
    const lowWall = new THREE.Mesh(new THREE.BoxGeometry(w, 0.42, d), wallMat);
    lowWall.position.y = 0.21;
    group.add(lowWall);

    const topHeader = new THREE.Mesh(new THREE.BoxGeometry(w, 0.42, d), wallMat);
    topHeader.position.y = 3.39;
    group.add(topHeader);

    const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, 0.08, d + 0.02), wallTopMat);
    cap.position.y = wallHeight + 0.04;
    group.add(cap);

    // Panel central de vidrio reflectivo azul (desde Y = 0.42 hasta Y = 3.18)
    const gW = isZ ? 0.06 : length - 0.08;
    const gD = isZ ? length - 0.08 : 0.06;
    const glassPane = new THREE.Mesh(new THREE.BoxGeometry(gW, 2.76, gD), curtainGlassMat);
    glassPane.position.y = 1.8;
    group.add(glassPane);

    // Perfiles horizontales y verticales de aluminio oscuro (Mullions) formando los cuadros de la fachada UNAB
    const numCols = Math.max(2, Math.floor(length / 0.85));
    for (let c = 0; c <= numCols; c++) {
      const offset = -length / 2 + (c / numCols) * length;
      const vBar = new THREE.Mesh(
        new THREE.BoxGeometry(isZ ? 0.12 : 0.05, 2.78, isZ ? 0.05 : 0.12),
        wallTopMat
      );
      vBar.position.set(isZ ? 0 : offset, 1.8, isZ ? offset : 0);
      group.add(vBar);
    }

    [0.42, 1.34, 2.26, 3.18].forEach((hy) => {
      const hBar = new THREE.Mesh(
        new THREE.BoxGeometry(isZ ? 0.12 : length, 0.05, isZ ? length : 0.12),
        wallTopMat
      );
      hBar.position.y = hy;
      group.add(hBar);
    });

    group.position.set(x, 0, z);
    scene.add(group);
    wallMeshes.push(group);
  }

  // Función para cerrar el espacio vacío encima de las puertas (Dintel / Transom desde Y = 2.85 hasta Y = 3.60m)
  function addDoorwayHeaderWall(x, z, width, depth) {
    const headerH = 3.6 - 2.85; // 0.75m
    const group = new THREE.Group();

    const lintel = new THREE.Mesh(new THREE.BoxGeometry(width, headerH, depth), wallMat);
    lintel.position.y = 2.85 + headerH / 2;
    lintel.castShadow = true;
    lintel.receiveShadow = true;
    group.add(lintel);

    // Marco negro inferior del dintel donde cierra la puerta
    const bottomFrame = new THREE.Mesh(new THREE.BoxGeometry(width + 0.02, 0.06, depth + 0.02), wallTopMat);
    bottomFrame.position.y = 2.87;
    group.add(bottomFrame);

    const cap = new THREE.Mesh(new THREE.BoxGeometry(width + 0.02, 0.08, depth + 0.02), wallTopMat);
    cap.position.y = wallHeight + 0.04;
    group.add(cap);

    group.position.set(x, 0, z);
    scene.add(group);
    wallMeshes.push(group);
  }

  // 1. Muro Norte (Z = -5.5): Sólido para alojar las canaletas de las PCs
  addSolidWallSegment(0, -5.5, 16.24, wallThickness);

  // 2. Muro Oeste (X = -8.0): Sólido detrás del Rack y Data Center
  addSolidWallSegment(-8.0, 0, wallThickness, 11.0);

  // 3. Muro Sur (Z = +5.5): Combinación de Muro Sólido + Ventanal de Vidrio Reflectivo Azul UNAB en la oficina
  addSolidWallSegment(-4.6, 5.5, 6.8, wallThickness);
  addCurtainGlassWallSegment(0.2, 5.5, 2.8, 'x');
  addSolidWallSegment(4.8, 5.5, 6.4, wallThickness);

  // 4. Fachada Principal Este (X = +8.0): Con Muros de Vidrio Reflectivo Azul a ambos lados de la puerta doble y Dintel arriba de la puerta (¡Cero hueco vacío arriba!)
  addSolidWallSegment(8.0, -4.9, wallThickness, 1.2);
  addCurtainGlassWallSegment(8.0, -2.85, 2.9, 'z');
  addDoorwayHeaderWall(8.0, 0, wallThickness, 2.8); // Cierra el hueco sobre la puerta doble (Z de -1.4 a +1.4)
  addCurtainGlassWallSegment(8.0, 2.85, 2.9, 'z');
  addSolidWallSegment(8.0, 4.9, wallThickness, 1.2);

  // 5. Muro Divisor Interno (X = -3.2): Con Dintel sobre la puerta del servidor + Ventanal de Vidrio Reflectivo para ver el Data Center desde la oficina
  addSolidWallSegment(-3.2, -5.075, wallThickness, 0.85);
  addDoorwayHeaderWall(-3.2, -3.925, wallThickness, 1.45); // Cierra el hueco sobre la puerta del Data Center
  addSolidWallSegment(-3.2, -1.75, wallThickness, 2.9);
  addCurtainGlassWallSegment(-3.2, 1.1, 2.8, 'z'); // Ventanal de vidrio reflectivo entre oficina y cuarto de servidores
  addSolidWallSegment(-3.2, 4.0, wallThickness, 3.0);

  // 6. PUERTAS BLANCAS CON MARCO NEGRO GEOMÉTRICAMENTE SEPARADO (CERO PARPADEO / Z-FIGHTING)
  // El parpadeo ocurría porque el panel blanco y los bordes negros compartían el mismo largo/alto.
  // Ahora el marco exterior es una estructura y el panel blanco va encajado adentro sin superponerse jamás.
  const doorHeight = 2.84;
  const doorWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 });
  const doorBlackMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.3, metalness: 0.4 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.4, roughness: 0.1 });

  function createWhiteBlackDoorLeaf(widthZ, zOffsetSign = 1) {
    const leafGroup = new THREE.Group();
    const zCenter = (widthZ / 2) * zOffsetSign;
    const frameW = 0.09;

    // 1. Panel interior blanco recortado para que NO toque los bordes negros
    const innerH = doorHeight - frameW * 2;
    const innerZ = widthZ - frameW * 2;
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.075, innerH, innerZ), doorWhiteMat);
    panel.position.set(0, doorHeight / 2, zCenter);
    panel.castShadow = true;
    leafGroup.add(panel);

    // 2. Marco negro superior e inferior (ocupan todo el ancho sin chocar con el panel blanco)
    const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.09, frameW, widthZ), doorBlackMat);
    topRail.position.set(0, doorHeight - frameW / 2, zCenter);
    leafGroup.add(topRail);

    const botRail = new THREE.Mesh(new THREE.BoxGeometry(0.09, frameW, widthZ), doorBlackMat);
    botRail.position.set(0, frameW / 2, zCenter);
    leafGroup.add(botRail);

    // 3. Marcos negros verticales izquierdo y derecho (entre el riel superior e inferior, sin superponerse en las esquinas)
    const stileH = doorHeight - frameW * 2;
    const stile1 = new THREE.Mesh(new THREE.BoxGeometry(0.09, stileH, frameW), doorBlackMat);
    stile1.position.set(0, doorHeight / 2, (frameW / 2) * zOffsetSign);
    leafGroup.add(stile1);

    const stile2 = new THREE.Mesh(new THREE.BoxGeometry(0.09, stileH, frameW), doorBlackMat);
    stile2.position.set(0, doorHeight / 2, (widthZ - frameW / 2) * zOffsetSign);
    leafGroup.add(stile2);

    // 4. Mirilla central con marco negro que sobresale limpiamente en X (0.11m vs 0.075m)
    const visorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.105, 1.15, 0.24), doorBlackMat);
    visorFrame.position.set(0, doorHeight * 0.58, zCenter);
    leafGroup.add(visorFrame);

    const visorGlass = new THREE.Mesh(new THREE.BoxGeometry(0.118, 1.03, 0.15), glassMat);
    visorGlass.position.set(0, doorHeight * 0.58, zCenter);
    leafGroup.add(visorGlass);

    // 5. Manija negra
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.22), doorBlackMat);
    handle.position.set(0, 1.12, (widthZ - 0.22) * zOffsetSign);
    leafGroup.add(handle);

    return leafGroup;
  }

  const dcDoorPivot = new THREE.Group();
  dcDoorPivot.position.set(-3.2, 0, -4.65);
  dcDoorPivot.add(createWhiteBlackDoorLeaf(1.45, 1));
  dcDoorPivot.rotation.y = -Math.PI * 0.45;
  scene.add(dcDoorPivot);
  doorPivots.push({ pivot: dcDoorPivot, openRot: -Math.PI * 0.45, closedRot: 0 });
  wallMeshes.push(dcDoorPivot);

  const mainDoorTopPivot = new THREE.Group();
  mainDoorTopPivot.position.set(8.0, 0, -1.4);
  mainDoorTopPivot.add(createWhiteBlackDoorLeaf(1.35, 1));
  mainDoorTopPivot.rotation.y = Math.PI * 0.45;
  scene.add(mainDoorTopPivot);
  doorPivots.push({ pivot: mainDoorTopPivot, openRot: Math.PI * 0.45, closedRot: 0 });
  wallMeshes.push(mainDoorTopPivot);

  const mainDoorBotPivot = new THREE.Group();
  mainDoorBotPivot.position.set(8.0, 0, 1.4);
  mainDoorBotPivot.add(createWhiteBlackDoorLeaf(1.35, -1));
  mainDoorBotPivot.rotation.y = -Math.PI * 0.42;
  scene.add(mainDoorBotPivot);
  doorPivots.push({ pivot: mainDoorBotPivot, openRot: -Math.PI * 0.42, closedRot: 0 });
  wallMeshes.push(mainDoorBotPivot);

  // 7. FALSO CIELO RASO ACÚSTICO CUBRIENDO EL 100% DEL ÁREA HASTA LOS DINTELES DE LAS PUERTAS (16.0m x 11.0m)
  const ceilingTex = createAcousticCeilingTexture();
  const ceilingMat = new THREE.MeshStandardMaterial({
    map: ceilingTex,
    roughness: 0.75,
    side: THREE.DoubleSide
  });

  const ceilingSlab = new THREE.Mesh(new THREE.BoxGeometry(16.0, 0.04, 11.0), ceilingMat);
  ceilingSlab.position.set(0, 3.16, 0);
  ceilingGroup.add(ceilingSlab);

  const gridRailMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.4, roughness: 0.3 });
  for (let gx = -7.0; gx <= 7.0; gx += 2.0) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.025, 10.9), gridRailMat);
    beam.position.set(gx, 3.125, 0);
    ceilingGroup.add(beam);
  }
  for (let gz = -4.5; gz <= 4.5; gz += 1.5) {
    const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(15.9, 0.022, 0.05), gridRailMat);
    crossBeam.position.set(0, 3.122, gz);
    ceilingGroup.add(crossBeam);
  }

  const lightFrameMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.6, roughness: 0.25 });
  const lightPanelMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1
  });
  const ceilingLightsCoords = [
    [-5.8, -2.25],
    [-5.8, 2.25],
    [0.0, -2.25],
    [0.0, 2.25],
    [5.0, -2.25],
    [5.0, 2.25]
  ];
  ceilingLightsCoords.forEach(([lx, lz]) => {
    const lFrame = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.03, 0.62), lightFrameMat);
    lFrame.position.set(lx, 3.12, lz);
    const lGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.52), lightPanelMat);
    lGlow.rotation.x = Math.PI / 2;
    lGlow.position.set(lx, 3.102, lz);
    ceilingGroup.add(lFrame, lGlow);
  });
}

// ============================================================================
// 7. MODELOS 3D REALISTAS DE OBJETOS
// ============================================================================
function createIndoorPlanter(x, z) {
  const planterGroup = new THREE.Group();
  planterGroup.position.set(x, 0.12, z);

  const potMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.35, metalness: 0.2 });
  const potGeo = new THREE.CylinderGeometry(0.32, 0.21, 0.92, 4);
  potGeo.rotateY(Math.PI / 4);
  const pot = new THREE.Mesh(potGeo, potMat);
  pot.position.y = 0.46;
  pot.castShadow = true;
  pot.receiveShadow = true;
  planterGroup.add(pot);

  const soil = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.04, 0.42),
    new THREE.MeshStandardMaterial({ color: 0x271c15, roughness: 0.9 })
  );
  soil.position.y = 0.91;
  planterGroup.add(soil);

  const stemMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.8 });
  const leafMat1 = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.5, side: THREE.DoubleSide });
  const leafMat2 = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.5, side: THREE.DoubleSide });

  for (let s = 0; s < 3; s++) {
    const sx = (s - 1) * 0.08;
    const sz = (s % 2 === 0 ? 1 : -1) * 0.05;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.03, 0.65, 7), stemMat);
    stem.position.set(sx, 1.18, sz);
    planterGroup.add(stem);

    for (let l = 0; l < 14; l++) {
      const angle = (l / 14) * Math.PI * 2 + s * 0.5;
      const tier = l % 3;
      const leafGeo = new THREE.BoxGeometry(0.045, 0.58 - tier * 0.08, 0.008);
      const leaf = new THREE.Mesh(leafGeo, l % 2 === 0 ? leafMat1 : leafMat2);

      const leafPivot = new THREE.Group();
      leafPivot.position.set(sx, 1.32 + tier * 0.16, sz);
      leafPivot.rotation.y = angle;
      leafPivot.rotation.x = 0.28 + tier * 0.18;

      leaf.position.y = 0.24;
      leaf.castShadow = true;
      leafPivot.add(leaf);
      planterGroup.add(leafPivot);
    }
  }

  scene.add(planterGroup);
}

function createWhiteFiveTierBookcase(x, z, rotY = 0) {
  const group = new THREE.Group();
  group.position.set(x, 0.12, z);
  group.rotation.y = rotY;

  const whiteWood = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 });
  const width = 1.05;
  const height = 2.35;
  const depth = 0.42;
  const thick = 0.035;

  const back = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.02), whiteWood);
  back.position.set(0, height / 2, -depth / 2 + 0.01);
  back.castShadow = true;
  group.add(back);

  const sideL = new THREE.Mesh(new THREE.BoxGeometry(thick, height, depth), whiteWood);
  sideL.position.set(-width / 2 + thick / 2, height / 2, 0);
  sideL.castShadow = true;
  const sideR = sideL.clone();
  sideR.position.set(width / 2 - thick / 2, height / 2, 0);
  group.add(sideL, sideR);

  const binderGray = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5 });
  const spineLabelMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const bookColors = [0x7c2d12, 0x9a3412, 0x1e3a8a, 0x14532d, 0xb45309, 0x334155];
  const vaseMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });

  for (let i = 0; i <= 5; i++) {
    const sy = 0.06 + i * 0.45;
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(width - thick, thick, depth), whiteWood);
    shelf.position.set(0, sy, 0);
    shelf.castShadow = true;
    shelf.receiveShadow = true;
    group.add(shelf);

    if (i < 5) {
      const binderOnLeft = i % 2 === 0;
      const bx = binderOnLeft ? -width / 2 + 0.11 : width / 2 - 0.11;
      const binder = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.36, 0.32), binderGray);
      binder.position.set(bx, sy + 0.2, 0.02);
      group.add(binder);

      const label = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.26, 0.01), spineLabelMat);
      label.position.set(bx, sy + 0.21, 0.185);
      group.add(label);

      const numBooks = 5 + (i % 3);
      for (let b = 0; b < numBooks; b++) {
        const bHeight = 0.26 + ((b + i) % 3) * 0.03;
        const book = new THREE.Mesh(
          new THREE.BoxGeometry(0.055, bHeight, 0.26),
          new THREE.MeshStandardMaterial({ color: bookColors[(b + i) % bookColors.length] })
        );
        const startX = binderOnLeft ? -0.26 + b * 0.062 : -0.38 + b * 0.062;
        book.position.set(startX, sy + bHeight / 2 + 0.015, 0.02);
        group.add(book);
      }

      const vx = binderOnLeft ? 0.28 : -0.05;
      const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.065, 0.18, 12), vaseMat);
      vase.position.set(vx, sy + 0.11, 0.04);
      group.add(vase);
    }
  }

  scene.add(group);
}

// ============================================================================
// 7.3 CUARTO DE SERVIDORES: CLIMATIZADOR CRAC EDAPOWER (IMAGEN 2), RACK TODO-EN-UNO Y UPS KENGA TECH (IMAGEN 1)
// ============================================================================
function buildDataCenterRoom() {
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.7 });
  const blackCabinetMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.4, metalness: 0.55 });
  const silverRailMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.25, metalness: 0.85 });
  const glassDoorMat = new THREE.MeshStandardMaterial({
    color: 0x60a5fa,
    transparent: true,
    opacity: 0.22,
    roughness: 0.08,
    metalness: 0.4
  });

  // 1. CLIMATIZADOR DE PRECISIÓN CRAC "EDApower" NEGRO MATE CON MALLA PERFORADA Y PANTALLA TÁCTIL (Referencia Imagen 2)
  const acGroup = new THREE.Group();
  acGroup.position.set(-7.25, 0.16, -4.1);

  // Gabinete alto negro mate
  const cracBody = new THREE.Mesh(new THREE.BoxGeometry(0.92, 2.38, 1.15), blackCabinetMat);
  cracBody.position.y = 1.22;
  cracBody.castShadow = true;
  acGroup.add(cracBody);

  // Patas niveladoras inferiores (como en la foto EDApower)
  [
    [-0.4, -0.5],
    [0.4, -0.5],
    [-0.4, 0.5],
    [0.4, 0.5]
  ].forEach(([fx, fz]) => {
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.06, 10), silverRailMat);
    foot.position.set(fx, 0.03, fz);
    acGroup.add(foot);
  });

  // Panel superior de malla perforada con logo "EDApower"
  const topMeshPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(0.95, 0.55),
    new THREE.MeshBasicMaterial({ map: createCracMeshTexture(true) })
  );
  topMeshPanel.rotation.y = Math.PI / 2;
  topMeshPanel.position.set(0.465, 2.05, 0);
  acGroup.add(topMeshPanel);

  // Pantalla táctil HMI con bisel plateado y fondo blanco en el centro (igual a la foto)
  const hmiBezel = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.24, 0.34), silverRailMat);
  hmiBezel.position.set(0.465, 1.58, 0);
  const hmiScreen = new THREE.Mesh(
    new THREE.BoxGeometry(0.035, 0.19, 0.28),
    new THREE.MeshBasicMaterial({ color: 0xf8fafc })
  );
  hmiScreen.position.set(0.468, 1.58, 0);
  acGroup.add(hmiBezel, hmiScreen);

  // Panel inferior largo de malla perforada negra + manija abatible negra con cerradura
  const botMeshPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(0.95, 1.25),
    new THREE.MeshBasicMaterial({ map: createCracMeshTexture(false) })
  );
  botMeshPanel.rotation.y = Math.PI / 2;
  botMeshPanel.position.set(0.465, 0.76, 0);
  acGroup.add(botMeshPanel);

  const swingHandle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.24, 0.06), darkMetalMat);
  swingHandle.position.set(0.47, 0.92, 0.42);
  acGroup.add(swingHandle);

  scene.add(acGroup);
  registerInteractable(acGroup, 'ac_unit');
  addFloatingLabel('Climatizador de Precision CRAC (EDApower)', new THREE.Vector3(-7.25, 2.75, -4.1), '#38bdf8');

  // Estante blanco en el cuarto de servidores
  createWhiteFiveTierBookcase(-5.45, -5.02, 0);

  // 2. GABINETE RACK PRINCIPAL NEGRO CON RUEDAS, TIRA LED AZUL Y PUERTA ABIERTA
  const rackX = -6.75;
  const rackZ = 0.45;
  const rackGroup = new THREE.Group();
  rackGroup.position.set(rackX, 0.16, rackZ);

  [
    [-0.55, -0.68],
    [0.55, -0.68],
    [-0.55, 0.68],
    [0.55, 0.68]
  ].forEach(([cx, cz]) => {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.05, 12), silverRailMat);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(cx, 0.055, cz);
    rackGroup.add(wheel);
  });

  const rackBase = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.1, 1.55), blackCabinetMat);
  rackBase.position.y = 0.14;
  rackGroup.add(rackBase);

  const rackRoof = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.12, 1.55), blackCabinetMat);
  rackRoof.position.y = 2.46;
  rackRoof.castShadow = true;
  rackGroup.add(rackRoof);

  const backWall = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.25, 1.52), blackCabinetMat);
  backWall.position.set(-0.64, 1.28, 0);
  backWall.castShadow = true;
  rackGroup.add(backWall);

  const sideNorth = new THREE.Mesh(new THREE.BoxGeometry(1.32, 2.25, 0.05), blackCabinetMat);
  sideNorth.position.set(0, 1.28, -0.75);
  sideNorth.castShadow = true;
  const sideSouth = sideNorth.clone();
  sideSouth.position.set(0, 1.28, 0.75);
  rackGroup.add(sideNorth, sideSouth);

  const ledStripMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  [-0.64, 0.64].forEach((rz) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.2, 0.06), silverRailMat);
    rail.position.set(0.52, 1.28, rz);
    rackGroup.add(rail);

    const blueStrip = new THREE.Mesh(new THREE.BoxGeometry(0.025, 2.15, 0.025), ledStripMat);
    blueStrip.position.set(0.58, 1.28, rz * 1.04);
    rackGroup.add(blueStrip);
  });

  const yellowLabel = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.09, 0.58),
    new THREE.MeshBasicMaterial({ color: 0xfacc15 })
  );
  yellowLabel.position.set(0.56, 2.33, 0);
  rackGroup.add(yellowLabel);

  const rackDoorPivot = new THREE.Group();
  rackDoorPivot.position.set(0.65, 1.28, 0.75);
  const doorFrameR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.22, 0.14), blackCabinetMat);
  doorFrameR.position.set(0, 0, -0.07);
  const doorGlass = new THREE.Mesh(new THREE.BoxGeometry(0.025, 2.18, 1.32), glassDoorMat);
  doorGlass.position.set(0, 0, -0.75);
  const doorEdgeGlow = new THREE.Mesh(new THREE.BoxGeometry(0.03, 2.18, 0.02), ledStripMat);
  doorEdgeGlow.position.set(0, 0, -1.42);
  rackDoorPivot.add(doorFrameR, doorGlass, doorEdgeGlow);
  rackDoorPivot.rotation.y = Math.PI * 0.36;
  rackGroup.add(rackDoorPivot);

  scene.add(rackGroup);
  registerInteractable(rackGroup, 'rack_main');
  addFloatingLabel('Rack Principal de Telecomunicaciones (42U)', new THREE.Vector3(rackX, 2.8, rackZ), '#38bdf8');

  // EQUIPOS INTERNOS DEL RACK
  const patchCordBlueMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    emissive: 0x0369a1,
    emissiveIntensity: 0.3,
    roughness: 0.25
  });
  const bootYellowMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
  const labelStripYellow = new THREE.MeshBasicMaterial({ color: 0xfef08a });

  const patchPanelGroup = new THREE.Group();
  patchPanelGroup.position.set(rackX, 0.16, rackZ);

  [2.15, 1.92].forEach((py, idx) => {
    const ppChassis = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.11, 1.32), blackCabinetMat);
    ppChassis.position.set(0.38, py, 0);
    patchPanelGroup.add(ppChassis);

    const yStrip = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.022, 1.15), labelStripYellow);
    yStrip.position.set(0.56, py + 0.035, 0);
    patchPanelGroup.add(yStrip);

    const count = idx === 0 ? 16 : 9;
    for (let c = 0; c < count; c++) {
      const cz = -0.54 + c * 0.07;
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.02), bootYellowMat);
      boot.position.set(0.57, py, cz);
      patchPanelGroup.add(boot);

      const arc = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.57, py, cz),
        new THREE.Vector3(0.66, py - 0.05, cz),
        new THREE.Vector3(0.55, py - 0.09, cz)
      ]);
      const patchMesh = new THREE.Mesh(new THREE.TubeGeometry(arc, 10, 0.011, 6, false), patchCordBlueMat);
      patchPanelGroup.add(patchMesh);
    }
  });

  scene.add(patchPanelGroup);
  registerInteractable(patchPanelGroup, 'patch_panel');

  const switchGroup = new THREE.Group();
  switchGroup.position.set(rackX, 0.16, rackZ);

  [1.66, 1.44].forEach((sy, sIdx) => {
    const swChassis = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.12, 1.32),
      sIdx === 0 ? blackCabinetMat : darkMetalMat
    );
    swChassis.position.set(0.28, sy, 0);
    switchGroup.add(swChassis);

    for (let l = 0; l < 8; l++) {
      const led = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.02, 0.02),
        new THREE.MeshBasicMaterial({ color: l % 2 === 0 ? 0x4ade80 : 0x38bdf8 })
      );
      led.position.set(0.56, sy, -0.5 + l * 0.045);
      switchGroup.add(led);
      blinkingLEDs.push({ mesh: led, speed: 5 + l + sIdx, baseColor: 0x4ade80 });
    }

    for (let p = 0; p < 10; p++) {
      const pz = -0.05 + p * 0.055;
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.02), bootYellowMat);
      boot.position.set(0.57, sy, pz);
      switchGroup.add(boot);

      const arc = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.57, sy, pz),
        new THREE.Vector3(0.65, sy - 0.045, pz),
        new THREE.Vector3(0.55, sy - 0.08, pz)
      ]);
      const cord = new THREE.Mesh(new THREE.TubeGeometry(arc, 10, 0.01, 6, false), patchCordBlueMat);
      switchGroup.add(cord);
    }
  });

  scene.add(switchGroup);
  registerInteractable(switchGroup, 'switch_core');

  const routerGroup = new THREE.Group();
  routerGroup.position.set(rackX, 0.16, rackZ);

  const routerShelf = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.03, 1.32), blackCabinetMat);
  routerShelf.position.set(0.08, 1.05, 0);
  routerGroup.add(routerShelf);

  const whiteRouterMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25 });
  const routerBody = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.1, 0.68), whiteRouterMat);
  routerBody.position.set(0.18, 1.12, -0.15);
  routerBody.castShadow = true;
  routerGroup.add(routerBody);

  [-0.38, 0.08].forEach((az) => {
    const ant = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.28, 0.04), whiteRouterMat);
    ant.position.set(-0.04, 1.25, az);
    ant.rotation.z = 0.25;
    routerGroup.add(ant);
  });

  scene.add(routerGroup);
  registerInteractable(routerGroup, 'router_gateway');

  const serversGroup = new THREE.Group();
  serversGroup.position.set(rackX, 0.16, rackZ);

  const srvShelf = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.03, 1.32), blackCabinetMat);
  srvShelf.position.set(0.08, 0.72, 0);
  serversGroup.add(srvShelf);

  const srv1U = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.12, 0.88), darkMetalMat);
  srv1U.position.set(0.18, 0.8, -0.1);
  srv1U.castShadow = true;
  serversGroup.add(srv1U);

  const nasShelf = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.03, 1.32), blackCabinetMat);
  nasShelf.position.set(0.08, 0.28, 0);
  serversGroup.add(nasShelf);

  const nasBox = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.34, 0.52), blackCabinetMat);
  nasBox.position.set(0.18, 0.47, -0.15);
  nasBox.castShadow = true;
  serversGroup.add(nasBox);

  for (let b = 0; b < 4; b++) {
    const bay = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.24, 0.09), darkMetalMat);
    bay.position.set(0.46, 0.46, -0.31 + b * 0.11);
    serversGroup.add(bay);
  }

  const pduBar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 1.25), blackCabinetMat);
  pduBar.position.set(0.5, 0.21, 0);
  const redSwitch = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.04, 0.05),
    new THREE.MeshBasicMaterial({ color: 0xef4444 })
  );
  redSwitch.position.set(0.57, 0.21, -0.48);
  serversGroup.add(pduBar, redSwitch);

  scene.add(serversGroup);
  registerInteractable(serversGroup, 'server_gps');

  // 3. SISTEMA DE UPS ONLINE DOBLE CONVERSIÓN (3 MÓDULOS ESCALONADOS CON RANURAS VERTICALES, RUEDAS Y PANTALLA AZUL "220V" - Referencia Imagen 1)
  const upsGroup = new THREE.Group();
  upsGroup.position.set(-5.25, 0.16, 4.35);

  const upsLcdTex = createUpsLcdTexture();
  const upsConfigs = [
    { xOffset: -0.52, h: 1.05, w: 0.42, d: 0.78, hasWheels: true },
    { xOffset: 0.0, h: 0.78, w: 0.38, d: 0.68, hasWheels: false },
    { xOffset: 0.46, h: 0.58, w: 0.34, d: 0.58, hasWheels: false }
  ];

  upsConfigs.forEach((cfg) => {
    const unit = new THREE.Group();
    unit.position.set(cfg.xOffset, 0, 0);
    const yBase = cfg.hasWheels ? 0.08 : 0.0;

    if (cfg.hasWheels) {
      [
        [-cfg.w * 0.32, -cfg.d * 0.35],
        [cfg.w * 0.32, -cfg.d * 0.35],
        [-cfg.w * 0.32, cfg.d * 0.35],
        [cfg.w * 0.32, cfg.d * 0.35]
      ].forEach(([wx, wz]) => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.04, 10), blackCabinetMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(wx, 0.04, wz);
        unit.add(wheel);
      });
    }

    // Chasis negro mate de la torre UPS (mirando hacia el norte -Z)
    const body = new THREE.Mesh(new THREE.BoxGeometry(cfg.w, cfg.h, cfg.d), blackCabinetMat);
    body.position.set(0, yBase + cfg.h / 2, 0);
    body.castShadow = true;
    unit.add(body);

    // Bisel frontal con ranuras verticales de ventilación
    const numSlats = 9;
    for (let s = 0; s < numSlats; s++) {
      const sx = -cfg.w * 0.38 + (s / (numSlats - 1)) * (cfg.w * 0.76);
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.015, cfg.h * 0.86, 0.02), darkMetalMat);
      slat.position.set(sx, yBase + cfg.h * 0.5, -cfg.d / 2 - 0.008);
      unit.add(slat);
    }

    // Panel superior del bisel donde va la pantalla LCD azul "220V" y los 3 botones grises
    const lcdFrame = new THREE.Mesh(new THREE.BoxGeometry(cfg.w * 0.56, 0.22, 0.028), blackCabinetMat);
    lcdFrame.position.set(0, yBase + cfg.h - 0.16, -cfg.d / 2 - 0.01);
    unit.add(lcdFrame);

    const lcdScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(cfg.w * 0.42, 0.13),
      new THREE.MeshBasicMaterial({ map: upsLcdTex })
    );
    lcdScreen.rotation.y = Math.PI;
    lcdScreen.position.set(0, yBase + cfg.h - 0.14, -cfg.d / 2 - 0.026);
    unit.add(lcdScreen);

    // 3 Botones rectangulares grises debajo del LCD
    [-0.045, 0, 0.045].forEach((bx) => {
      const btn = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.016, 0.01), silverRailMat);
      btn.position.set(bx, yBase + cfg.h - 0.23, -cfg.d / 2 - 0.026);
      unit.add(btn);
    });

    upsGroup.add(unit);
  });

  scene.add(upsGroup);
  registerInteractable(upsGroup, 'ups_power');
  addFloatingLabel('Banco de UPS Online 220V (3000VA)', new THREE.Vector3(-5.25, 1.48, 4.35), '#38bdf8');
}

// ============================================================================
// 8. SALA DE MONITOREO
// ============================================================================
function createWorkstationDesk({ x, z, rotationY = 0, screenVariant = 1, dataKey }) {
  const group = new THREE.Group();
  group.position.set(x, 0.12, z);
  group.rotation.y = rotationY;

  const woodDeskMat = new THREE.MeshStandardMaterial({ color: 0xd6c7b2, roughness: 0.55 });
  const legMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6, roughness: 0.35 });
  const darkPlastic = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.35 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 });

  const top = new THREE.Mesh(new THREE.BoxGeometry(2.75, 0.08, 1.25), woodDeskMat);
  top.position.y = 0.78;
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);

  const drawerBox = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.72, 1.15), woodDeskMat);
  drawerBox.position.set(-0.95, 0.38, 0);
  drawerBox.castShadow = true;
  group.add(drawerBox);

  for (let d = 0; d < 3; d++) {
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.04), chromeMat);
    handle.position.set(-0.95, 0.22 + d * 0.2, 0.58);
    group.add(handle);
  }

  const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.74, 0.07), legMat);
  leg1.position.set(1.28, 0.38, -0.52);
  const leg2 = leg1.clone();
  leg2.position.set(1.28, 0.38, 0.52);
  const legBar = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 1.1), legMat);
  legBar.position.set(1.28, 0.06, 0);
  group.add(leg1, leg2, legBar);

  const monitorBase = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.03, 0.28), darkPlastic);
  monitorBase.position.set(0, 0.83, -0.32);
  group.add(monitorBase);

  const monitorNeck = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.38, 0.08), legMat);
  monitorNeck.position.set(0, 1.02, -0.36);
  group.add(monitorNeck);

  const monitorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.84, 0.06), darkPlastic);
  monitorFrame.position.set(0, 1.38, -0.3);
  monitorFrame.castShadow = true;
  group.add(monitorFrame);

  const screenGeo = new THREE.PlaneGeometry(1.34, 0.76);
  const screenMat = new THREE.MeshBasicMaterial({ map: createBusMapScreenTexture(screenVariant) });
  const screenMesh = new THREE.Mesh(screenGeo, screenMat);
  screenMesh.position.set(0, 1.38, -0.265);
  group.add(screenMesh);

  const keyboard = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.03, 0.24), darkPlastic);
  keyboard.position.set(-0.05, 0.84, 0.18);
  group.add(keyboard);

  const mousepad = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.01, 0.28),
    new THREE.MeshStandardMaterial({ color: 0x1e293b })
  );
  mousepad.position.set(0.48, 0.825, 0.18);
  group.add(mousepad);

  const mouse = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.035, 0.17), darkPlastic);
  mouse.position.set(0.48, 0.84, 0.18);
  group.add(mouse);

  // Torre PC en el piso
  const tower = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.62, 0.68), darkPlastic);
  tower.position.set(0.95, 0.32, -0.08);
  tower.castShadow = true;
  group.add(tower);

  const pwrLed = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.025, 0.02),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
  );
  pwrLed.position.set(0.95, 0.55, 0.265);
  group.add(pwrLed);

  const chairGroup = new THREE.Group();
  chairGroup.position.set(0, 0, 0.96);
  const chairMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.55 });

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.1, 0.68), chairMat);
  seat.position.y = 0.52;
  seat.castShadow = true;
  chairGroup.add(seat);

  const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.78, 0.1), chairMat);
  backrest.position.set(0, 0.95, 0.32);
  backrest.castShadow = true;
  chairGroup.add(backrest);

  [-0.38, 0.38].forEach((ax) => {
    const armVert = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.24, 0.05), darkPlastic);
    armVert.position.set(ax, 0.62, 0.05);
    const armPad = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.04, 0.32), darkPlastic);
    armPad.position.set(ax, 0.74, 0.05);
    chairGroup.add(armVert, armPad);
  });

  const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.42, 10), darkPlastic);
  piston.position.y = 0.26;
  chairGroup.add(piston);

  for (let l = 0; l < 5; l++) {
    const angle = (l * Math.PI * 2) / 5;
    const legStar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.36), darkPlastic);
    legStar.position.set(Math.sin(angle) * 0.16, 0.06, Math.cos(angle) * 0.16);
    legStar.rotation.y = angle;
    chairGroup.add(legStar);
  }

  group.add(chairGroup);

  scene.add(group);
  registerInteractable(group, dataKey);
}

function buildEpsonEcoTankPrinter(x, z) {
  const printerGroup = new THREE.Group();
  printerGroup.position.set(x, 0.12, z);

  const tableMat = new THREE.MeshStandardMaterial({ color: 0xd6c7b2, roughness: 0.55 });
  const blackMatte = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.45, metalness: 0.2 });
  const darkGloss = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.2, metalness: 0.4 });

  const pTable = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.76, 1.1), tableMat);
  pTable.position.y = 0.38;
  pTable.castShadow = true;
  pTable.receiveShadow = true;
  printerGroup.add(pTable);

  const mainBody = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.34, 0.68), blackMatte);
  mainBody.position.set(-0.08, 0.93, 0);
  mainBody.castShadow = true;
  printerGroup.add(mainBody);

  const tankModule = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.36, 0.74), blackMatte);
  tankModule.position.set(0.38, 0.94, 0.04);
  tankModule.castShadow = true;
  printerGroup.add(tankModule);

  const ecoBadge = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.045, 0.01),
    new THREE.MeshBasicMaterial({ color: 0xe2e8f0 })
  );
  ecoBadge.position.set(0.38, 1.03, 0.415);
  printerGroup.add(ecoBadge);

  const inkColors = [0x27272a, 0xeab308, 0xdb2777, 0x0284c7];
  inkColors.forEach((col, idx) => {
    const vial = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.11, 0.015),
      new THREE.MeshStandardMaterial({ color: col, roughness: 0.15 })
    );
    vial.position.set(0.28 + idx * 0.065, 0.85, 0.412);
    printerGroup.add(vial);
  });

  const scannerLid = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.03, 0.7), darkGloss);
  scannerLid.position.set(0.04, 1.15, -0.02);
  scannerLid.rotation.x = -0.08;
  printerGroup.add(scannerLid);

  const powerBtn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.01, 12),
    new THREE.MeshBasicMaterial({ color: 0x84cc16 })
  );
  powerBtn.rotation.x = Math.PI / 2;
  powerBtn.position.set(-0.4, 1.07, 0.345);
  printerGroup.add(powerBtn);

  const outTray = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.02, 0.38), darkGloss);
  outTray.position.set(-0.08, 0.79, 0.36);
  printerGroup.add(outTray);

  const printedSheet = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.36),
    new THREE.MeshBasicMaterial({ map: createPrintedChartTexture(), side: THREE.DoubleSide })
  );
  printedSheet.rotation.x = -Math.PI / 2 + 0.04;
  printedSheet.position.set(-0.08, 0.81, 0.38);
  printerGroup.add(printedSheet);

  scene.add(printerGroup);
  registerInteractable(printerGroup, 'printer_net');
  addFloatingLabel('Impresora Epson EcoTank en Red', new THREE.Vector3(x, 1.55, z), '#f59e0b');
}

function buildMonitoringOffice() {
  createWorkstationDesk({
    x: 0.85,
    z: -3.85,
    rotationY: 0,
    screenVariant: 1,
    dataKey: 'pc_monitor_1'
  });
  addFloatingLabel('PC Monitoreo #1 (Mapa GPS)', new THREE.Vector3(0.85, 2.25, -4.1), '#38bdf8');

  createWorkstationDesk({
    x: 5.4,
    z: -3.85,
    rotationY: 0,
    screenVariant: 2,
    dataKey: 'pc_monitor_2'
  });
  addFloatingLabel('PC Monitoreo #2 (Salidas/Llegadas)', new THREE.Vector3(5.4, 2.25, -4.1), '#38bdf8');

  createWorkstationDesk({
    x: 4.1,
    z: 4.15,
    rotationY: Math.PI,
    screenVariant: 1,
    dataKey: 'pc_admin'
  });
  addFloatingLabel('PC Administracion de Red', new THREE.Vector3(4.1, 2.25, 4.35), '#4ade80');

  buildEpsonEcoTankPrinter(-1.75, 0.65);

  createWhiteFiveTierBookcase(-2.72, 3.55, Math.PI / 2);

  createIndoorPlanter(-2.6, -1.15);
  createIndoorPlanter(6.65, 4.35);
}

// ============================================================================
// 9. CABLEADO CONTINUO 100% CONECTADO
// ============================================================================
const dataPackets = [];
let packetsEnabled = true;

function buildStructuredCabling() {
  const cablingGroup = new THREE.Group();
  const ladderMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.35, metalness: 0.75 });
  const trayMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.35, metalness: 0.15 });
  const faceplateMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });

  function createPlenumLadderZ(x, y, zStart, zEnd, width = 0.38) {
    const length = Math.abs(zEnd - zStart);
    const zMid = (zStart + zEnd) / 2;
    const railL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, length), ladderMat);
    railL.position.set(x - width / 2, y, zMid);
    const railR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, length), ladderMat);
    railR.position.set(x + width / 2, y, zMid);
    cablingGroup.add(railL, railR);

    const numRungs = Math.floor(length / 0.35);
    for (let i = 0; i <= numRungs; i++) {
      const rz = Math.min(zStart, zEnd) + i * 0.35;
      const rung = new THREE.Mesh(new THREE.BoxGeometry(width, 0.02, 0.04), ladderMat);
      rung.position.set(x, y - 0.015, rz);
      cablingGroup.add(rung);
    }
  }

  function createPlenumLadderX(z, y, xStart, xEnd, width = 0.38) {
    const length = Math.abs(xEnd - xStart);
    const xMid = (xStart + xEnd) / 2;
    const railF = new THREE.Mesh(new THREE.BoxGeometry(length, 0.05, 0.04), ladderMat);
    railF.position.set(xMid, y, z - width / 2);
    const railB = new THREE.Mesh(new THREE.BoxGeometry(length, 0.05, 0.04), ladderMat);
    railB.position.set(xMid, y, z + width / 2);
    cablingGroup.add(railF, railB);

    const numRungs = Math.floor(length / 0.35);
    for (let i = 0; i <= numRungs; i++) {
      const rx = Math.min(xStart, xEnd) + i * 0.35;
      const rung = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, width), ladderMat);
      rung.position.set(rx, y - 0.015, z);
      cablingGroup.add(rung);
    }
  }

  createPlenumLadderZ(-7.65, 3.32, -5.15, 4.55, 0.38);
  createPlenumLadderX(-5.15, 3.32, -7.65, 6.55, 0.38);
  createPlenumLadderX(-0.9, 3.32, -7.65, -3.02, 0.38);
  createPlenumLadderZ(-3.02, 3.32, -5.15, 5.15, 0.36);
  createPlenumLadderX(5.15, 3.32, -3.02, 4.25, 0.36);

  function addWallTrunking(x, y, z, w, h, d) {
    const trunk = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), trayMat);
    trunk.position.set(x, y, z);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    cablingGroup.add(trunk);
  }

  addWallTrunking(-7.83, 1.85, 0.45, 0.08, 2.95, 0.26);
  addWallTrunking(-6.25, 0.35, 5.34, 3.2, 0.1, 0.08);
  addWallTrunking(-7.83, 0.35, 2.9, 0.08, 0.1, 4.9);

  function addOfficeWallDrop(x, z, rotY = 0) {
    const drop = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.9, 0.06), trayMat);
    drop.position.set(x, 1.88, z);
    drop.rotation.y = rotY;
    cablingGroup.add(drop);

    const fp = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.07), faceplateMat);
    fp.position.set(x, 0.45, z);
    fp.rotation.y = rotY;
    cablingGroup.add(fp);
  }

  addOfficeWallDrop(1.8, -5.34, 0);
  addOfficeWallDrop(6.35, -5.34, 0);
  addOfficeWallDrop(-3.04, -0.8, Math.PI / 2); // En el tramo sólido del muro divisor junto a la impresora
  addOfficeWallDrop(3.15, 5.34, Math.PI);

  addWallTrunking(-2.4, 0.45, -0.05, 0.07, 0.07, 1.55);

  const cableRoutes = [
    // Ruta 1 (Rack -> Pared detrás del Rack -> Bandeja Techo Norte -> Bajante Pared -> Torre PC 1)
    [
      new THREE.Vector3(-7.35, 1.8, 0.38),
      new THREE.Vector3(-7.8, 1.8, 0.38),
      new THREE.Vector3(-7.8, 3.35, 0.38),
      new THREE.Vector3(-7.68, 3.35, -5.12),
      new THREE.Vector3(1.8, 3.35, -5.12),
      new THREE.Vector3(1.8, 3.35, -5.32),
      new THREE.Vector3(1.8, 0.45, -5.32),
      new THREE.Vector3(1.8, 0.45, -3.95)
    ],
    // Ruta 2 (Rack -> Pared detrás del Rack -> Bandeja Techo Norte -> Bajante Pared -> Torre PC 2)
    [
      new THREE.Vector3(-7.35, 1.8, 0.42),
      new THREE.Vector3(-7.8, 1.8, 0.42),
      new THREE.Vector3(-7.8, 3.36, 0.42),
      new THREE.Vector3(-7.62, 3.36, -5.18),
      new THREE.Vector3(6.35, 3.36, -5.18),
      new THREE.Vector3(6.35, 3.36, -5.32),
      new THREE.Vector3(6.35, 0.45, -5.32),
      new THREE.Vector3(6.35, 0.45, -3.95)
    ],
    // Ruta 3 (Rack -> Pared detrás del Rack -> Puente Techo Z=-0.9 -> Bajante Muro Sólido -> Impresora Epson)
    [
      new THREE.Vector3(-7.35, 1.65, 0.45),
      new THREE.Vector3(-7.8, 1.65, 0.45),
      new THREE.Vector3(-7.8, 3.35, 0.45),
      new THREE.Vector3(-7.8, 3.35, -0.9),
      new THREE.Vector3(-3.02, 3.35, -0.9),
      new THREE.Vector3(-3.02, 0.45, -0.8),
      new THREE.Vector3(-2.4, 0.45, 0.65),
      new THREE.Vector3(-1.75, 0.45, 0.65),
      new THREE.Vector3(-1.75, 0.9, 0.65)
    ],
    // Ruta 4 (Rack -> Pared detrás del Rack -> Puente Techo -> Bandeja Muro Divisor -> Bandeja Sur -> Bajante Pared -> Torre PC Admin)
    [
      new THREE.Vector3(-7.35, 1.65, 0.5),
      new THREE.Vector3(-7.8, 1.65, 0.5),
      new THREE.Vector3(-7.8, 3.35, 0.5),
      new THREE.Vector3(-7.8, 3.35, -0.9),
      new THREE.Vector3(-3.0, 3.35, -0.9),
      new THREE.Vector3(-3.0, 3.35, 5.15),
      new THREE.Vector3(3.15, 3.35, 5.15),
      new THREE.Vector3(3.15, 3.35, 5.32),
      new THREE.Vector3(3.15, 0.45, 5.32),
      new THREE.Vector3(3.15, 0.45, 4.25)
    ],
    // Ruta 5 (Respaldo Eléctrico Banco UPS 220V -> Canaleta Pared Sur/Oeste -> PDU del Rack Principal):
    [
      new THREE.Vector3(-5.25, 0.35, 4.75),
      new THREE.Vector3(-5.25, 0.35, 5.32),
      new THREE.Vector3(-7.8, 0.35, 5.32),
      new THREE.Vector3(-7.8, 0.35, 0.45),
      new THREE.Vector3(-7.2, 0.35, 0.45)
    ]
  ];

  const cableMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    emissive: 0x0369a1,
    emissiveIntensity: 0.35,
    roughness: 0.25
  });

  const packetGeo = new THREE.SphereGeometry(0.05, 10, 10);
  const packetMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

  function createCleanPathCurve(pts) {
    const path = new THREE.CurvePath();
    for (let i = 0; i < pts.length - 1; i++) {
      path.add(new THREE.LineCurve3(pts[i], pts[i + 1]));
    }
    return path;
  }

  cableRoutes.forEach((points, routeIndex) => {
    const curvePath = createCleanPathCurve(points);
    const tubeGeo = new THREE.TubeGeometry(curvePath, 110, 0.016, 8, false);
    const cableMesh = new THREE.Mesh(tubeGeo, cableMat);
    cableMesh.castShadow = true;
    cablingGroup.add(cableMesh);

    for (let k = 0; k < 2; k++) {
      const pulse = new THREE.Mesh(packetGeo, packetMat);
      scene.add(pulse);
      dataPackets.push({
        mesh: pulse,
        curve: curvePath,
        progress: (k * 0.5 + routeIndex * 0.15) % 1,
        speed: 0.14 + (routeIndex % 3) * 0.03
      });
    }
  });

  scene.add(cablingGroup);
  registerInteractable(cablingGroup, 'structured_cabling');
  addFloatingLabel('Canaletas de Pared + Bandejas de Techo (Cat6A)', new THREE.Vector3(-7.6, 3.55, 0.45), '#0284c7');
}

buildEnvironmentAndArchitecture();
buildDataCenterRoom();
buildMonitoringOffice();
buildStructuredCabling();

// ============================================================================
// 10. INTERACCIÓN CON EL MOUSE Y CONSOLA INTERACTIVA (ESTILO PACKET TRACER)
// ============================================================================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const tooltip = document.getElementById('hover-tooltip');
const fpsHint = document.getElementById('fps-hint');

const inspectorCategory = document.getElementById('inspector-category');
const inspectorTitle = document.getElementById('inspector-title');
const inspectorDesc = document.getElementById('inspector-desc');
const inspectorSpecs = document.getElementById('inspector-specs');
const inspectorPanel = document.getElementById('inspector-panel');
const btnOpenConsole = document.getElementById('btn-open-console');

const deviceModal = document.getElementById('device-modal');
const modalDeviceBadge = document.getElementById('modal-device-badge');
const modalDeviceTitle = document.getElementById('modal-device-title');
const modalTabs = document.getElementById('modal-tabs');
const modalBody = document.getElementById('modal-body');
const btnCloseModal = document.getElementById('btn-close-modal');

let activeInspectedKey = null;
let isDeviceModalOpen = false;
let activeGpsCanvas = null;

function isConsoleSupported(dataKey) {
  return Boolean(dataKey && dataKey !== 'structured_cabling');
}

function updateInspectorUI(dataKey) {
  const info = EQUIPMENT_DATA[dataKey];
  if (!info) return;

  activeInspectedKey = dataKey;
  inspectorPanel.classList.remove('hidden');
  inspectorCategory.textContent = info.category;
  inspectorTitle.textContent = info.title;
  inspectorDesc.textContent = info.description;

  inspectorSpecs.innerHTML = '';
  Object.entries(info.specs).forEach(([label, val]) => {
    const row = document.createElement('div');
    row.className = 'spec-row';
    row.innerHTML = `<span class="spec-label">${label}:</span><span class="spec-value">${val}</span>`;
    inspectorSpecs.appendChild(row);
  });

  if (isConsoleSupported(dataKey)) {
    btnOpenConsole.classList.remove('hidden');
    if (dataKey.startsWith('pc_')) {
      btnOpenConsole.textContent = 'Usar Monitor / Consola PC (Tecla F)';
    } else if (['rack_main', 'server_gps', 'switch_core', 'router_gateway', 'patch_panel'].includes(dataKey)) {
      btnOpenConsole.textContent = 'Configurar Servidor / Router / Switch (Tecla F)';
    } else {
      btnOpenConsole.textContent = 'Abrir Panel de Control (Tecla F)';
    }
  } else {
    btnOpenConsole.classList.add('hidden');
  }
}

// Verifica si un equipo tiene su puerto de switch UP
function isDeviceLinkUp(dataKey) {
  const portObj = NETWORK_SIM_STATE.switchPorts.find((p) => p.targetKey === dataKey);
  return portObj ? portObj.up : true;
}

function resolveHostOrIp(target) {
  const clean = target.trim().toLowerCase();
  if (/^\d+\.\d+\.\d+\.\d+$/.test(clean)) {
    return { ip: clean, resolvedByDns: false };
  }
  const serverPortUp = NETWORK_SIM_STATE.switchPorts.find((p) => p.port === 'Gi0/2')?.up ?? true;
  if (!NETWORK_SIM_STATE.server.services.dns || !serverPortUp) {
    return { ip: null, error: 'DNS_OFF' };
  }
  const rec = NETWORK_SIM_STATE.server.dnsRecords.find((r) => r.domain.toLowerCase() === clean);
  if (rec) return { ip: rec.ip, resolvedByDns: true, domain: rec.domain };
  return { ip: null, error: 'NXDOMAIN' };
}

function isIpReachableFromLan(targetIp) {
  const srvUp = NETWORK_SIM_STATE.switchPorts.find((p) => p.port === 'Gi0/2')?.up ?? true;
  const rtrUp = (NETWORK_SIM_STATE.switchPorts.find((p) => p.port === 'Gi0/1')?.up ?? true) && NETWORK_SIM_STATE.router.lanUp;

  if (targetIp === NETWORK_SIM_STATE.server.ip && srvUp) return true;
  if (targetIp === NETWORK_SIM_STATE.router.lanIp && rtrUp) return true;
  if (targetIp === '192.168.20.2') return true;
  if (targetIp === NETWORK_SIM_STATE.printer.ip && isDeviceLinkUp('printer_net')) return true;

  for (const [k, pc] of Object.entries(NETWORK_SIM_STATE.pcs)) {
    if (pc.ip === targetIp && isDeviceLinkUp(k)) return true;
  }
  return false;
}

// ============================================================================
// RENDERIZADO DE PESTAÑAS PARA LAS 3 PCs (WEB GPS, IP CONFIG, CMD)
// ============================================================================
function renderPcWebTab(pcKey) {
  activeGpsCanvas = null;
  const pc = NETWORK_SIM_STATE.pcs[pcKey];
  const linkUp = isDeviceLinkUp(pcKey);
  const srvUp = NETWORK_SIM_STATE.switchPorts.find((p) => p.port === 'Gi0/2')?.up ?? true;
  const httpUp = NETWORK_SIM_STATE.server.services.httpGps && NETWORK_SIM_STATE.server.services.postgres && srvUp;
  const sameSubnet = pc.ip.startsWith('192.168.20.');

  if (!linkUp || !sameSubnet || !httpUp) {
    let reason = 'El servicio HTTP / API GPS o PostgreSQL está apagado en el Servidor Central (192.168.20.10).';
    if (!linkUp) reason = `El puerto ${pc.switchPort} del Switch conectado a esta PC está administrativamente apagado (DOWN).`;
    else if (!sameSubnet) reason = `La dirección IP actual (${pc.ip}) está fuera de la red LAN 192.168.20.0/24.`;

    modalBody.innerHTML = `
      <div class="gps-browser-bar">
        <span>URL: http://gps.unab.edu.pe/dashboard</span>
        <span class="pt-status-pill off">SIN CONEXIÓN</span>
      </div>
      <div class="pt-card">
        <div class="pt-card-title">No se puede acceder a este sitio web (ERR_CONNECTION_REFUSED)</div>
        <p style="font-size:0.82rem;color:#a1a1aa;line-height:1.5;">
          <b>Diagnóstico de Red:</b> ${reason}<br/>
          Ve a la pestaña <b>IP Configuration</b> de esta PC o abre la consola del <b>Rack Principal</b> para verificar los servicios <b>HTTP/GPS</b> y el estado de los puertos del Switch.
        </p>
      </div>
    `;
    return;
  }

  modalBody.innerHTML = `
    <div class="gps-browser-bar">
      <span>URL: http://gps.unab.edu.pe/dashboard (${NETWORK_SIM_STATE.server.ip}:443)</span>
      <span class="pt-status-pill">CONECTADO EN TIEMPO REAL</span>
    </div>
    <canvas id="gps-live-canvas" class="gps-live-canvas" width="780" height="200"></canvas>
    <div class="pt-card">
      <div class="pt-card-header">
        <span class="pt-card-title">Flota de Buses UNAB - Telemetría GPS Activa</span>
        <button id="btn-print-fleet" class="pt-pill-btn primary">Imprimir Reporte en Epson (${NETWORK_SIM_STATE.printer.ip})</button>
      </div>
      <table class="pt-table">
        <thead>
          <tr>
            <th>Unidad / Placa</th>
            <th>Ruta Asignada</th>
            <th>Velocidad</th>
            <th>Ocupación</th>
            <th>Estado</th>
            <th>Acción de Despacho</th>
          </tr>
        </thead>
        <tbody id="bus-fleet-tbody"></tbody>
      </table>
      <div id="print-feedback" style="font-size:0.78rem;color:#a1a1aa;"></div>
    </div>
  `;

  activeGpsCanvas = document.getElementById('gps-live-canvas');
  const tbody = document.getElementById('bus-fleet-tbody');

  function refreshBusTable() {
    tbody.innerHTML = '';
    NETWORK_SIM_STATE.buses.forEach((b, idx) => {
      const tr = document.createElement('tr');
      const isMoving = b.status === 'EN RUTA';
      tr.innerHTML = `
        <td><b>${b.id}</b> (${b.plate})</td>
        <td>${b.route}</td>
        <td>${isMoving ? b.speed + ' km/h' : '0 km/h'}</td>
        <td>${b.passengers}/${b.capacity} est.</td>
        <td><span class="pt-status-pill ${isMoving ? '' : 'off'}">${b.status}</span></td>
        <td>
          <button class="pt-pill-btn" data-bus-idx="${idx}">
            ${isMoving ? 'Detener en Paradero' : 'Despachar a Ruta'}
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('button[data-bus-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const i = Number(btn.getAttribute('data-bus-idx'));
        const bus = NETWORK_SIM_STATE.buses[i];
        if (bus.status === 'EN RUTA') {
          bus.status = 'EN PARADERO';
          bus.speed = 0;
        } else {
          bus.status = 'EN RUTA';
          bus.speed = 45;
        }
        refreshBusTable();
      });
    });
  }

  refreshBusTable();

  document.getElementById('btn-print-fleet').addEventListener('click', () => {
    const feedback = document.getElementById('print-feedback');
    if (!isDeviceLinkUp('printer_net')) {
      feedback.textContent = 'Error de Impresión: El puerto Gi0/6 de la impresora en el Switch está apagado.';
      return;
    }
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const nextId = 100 + NETWORK_SIM_STATE.printer.jobs.length + 1;
    NETWORK_SIM_STATE.printer.jobs.unshift({
      id: nextId,
      doc: `Reporte_GPS_${pc.hostname}.pdf`,
      user: pc.hostname,
      pages: 2,
      time: timeStr,
      state: 'Impreso OK'
    });
    feedback.textContent = `Trabajo #${nextId} enviado por red (TCP 9100) a la Impresora Epson EcoTank (${NETWORK_SIM_STATE.printer.ip}).`;
  });
}

function renderPcIpConfigTab(pcKey) {
  activeGpsCanvas = null;
  const pc = NETWORK_SIM_STATE.pcs[pcKey];
  const isDhcp = pc.mode === 'DHCP';

  modalBody.innerHTML = `
    <div class="pt-card">
      <div class="pt-card-header">
        <span class="pt-card-title">Configuración de Interfaz FastEthernet0 (${pc.hostname})</span>
        <div style="display:flex;gap:8px;">
          <button id="btn-mode-dhcp" class="pt-pill-btn ${isDhcp ? 'active' : ''}">DHCP</button>
          <button id="btn-mode-static" class="pt-pill-btn ${!isDhcp ? 'active' : ''}">Static</button>
        </div>
      </div>
      <div class="pt-grid-2">
        <div class="pt-form-row">
          <label>IPv4 Address:</label>
          <input id="inp-pc-ip" class="pt-input" value="${pc.ip}" ${isDhcp ? 'disabled' : ''} />
        </div>
        <div class="pt-form-row">
          <label>Subnet Mask:</label>
          <input id="inp-pc-mask" class="pt-input" value="${pc.mask}" ${isDhcp ? 'disabled' : ''} />
        </div>
        <div class="pt-form-row">
          <label>Default Gateway:</label>
          <input id="inp-pc-gw" class="pt-input" value="${pc.gateway}" ${isDhcp ? 'disabled' : ''} />
        </div>
        <div class="pt-form-row">
          <label>DNS Server:</label>
          <input id="inp-pc-dns" class="pt-input" value="${pc.dns}" ${isDhcp ? 'disabled' : ''} />
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
        <span id="ip-status-msg" style="font-size:0.78rem;color:#a1a1aa;">
          Dirección MAC: ${pc.mac} &bull; Puerto Switch: ${pc.switchPort}
        </span>
        <button id="btn-save-ip" class="pt-pill-btn primary">Aplicar Configuración IP</button>
      </div>
    </div>
  `;

  const statusMsg = document.getElementById('ip-status-msg');

  document.getElementById('btn-mode-dhcp').addEventListener('click', () => {
    pc.mode = 'DHCP';
    const srvUp = NETWORK_SIM_STATE.switchPorts.find((p) => p.port === 'Gi0/2')?.up ?? true;
    if (NETWORK_SIM_STATE.server.services.dhcp && srvUp && isDeviceLinkUp(pcKey)) {
      const hostNum = pcKey === 'pc_monitor_1' ? 101 : pcKey === 'pc_monitor_2' ? 102 : 103;
      pc.ip = `192.168.20.${hostNum}`;
      pc.mask = NETWORK_SIM_STATE.server.dhcpConfig.subnetMask;
      pc.gateway = NETWORK_SIM_STATE.server.dhcpConfig.defaultGateway;
      pc.dns = NETWORK_SIM_STATE.server.dhcpConfig.dnsServer;
      syncPcSpecsToData(pcKey);
      renderPcIpConfigTab(pcKey);
      document.getElementById('ip-status-msg').textContent = 'DHCP request successful (Asignado por 192.168.20.10).';
    } else {
      pc.ip = `169.254.${Math.floor(Math.random() * 200 + 10)}.${Math.floor(Math.random() * 200 + 10)}`;
      pc.mask = '255.255.0.0';
      pc.gateway = '0.0.0.0';
      syncPcSpecsToData(pcKey);
      renderPcIpConfigTab(pcKey);
      document.getElementById('ip-status-msg').textContent = 'DHCP failed. APIPA is being used (Verifica el servicio DHCP del Servidor).';
    }
  });

  document.getElementById('btn-mode-static').addEventListener('click', () => {
    pc.mode = 'Static';
    renderPcIpConfigTab(pcKey);
  });

  document.getElementById('btn-save-ip').addEventListener('click', () => {
    if (pc.mode === 'Static') {
      pc.ip = document.getElementById('inp-pc-ip').value.trim();
      pc.mask = document.getElementById('inp-pc-mask').value.trim();
      pc.gateway = document.getElementById('inp-pc-gw').value.trim();
      pc.dns = document.getElementById('inp-pc-dns').value.trim();
    }
    syncPcSpecsToData(pcKey);
    statusMsg.textContent = `Configuración guardada: ${pc.ip} / ${pc.mask}`;
  });
}

function syncPcSpecsToData(pcKey) {
  const pc = NETWORK_SIM_STATE.pcs[pcKey];
  if (EQUIPMENT_DATA[pcKey]) {
    EQUIPMENT_DATA[pcKey].specs['Dirección IP'] = `${pc.ip} (${pc.mode})`;
    EQUIPMENT_DATA[pcKey].specs['Máscara / Gateway'] = `${pc.mask} / ${pc.gateway}`;
    if (activeInspectedKey === pcKey) updateInspectorUI(pcKey);
  }
}

function renderPcCmdTab(pcKey) {
  activeGpsCanvas = null;
  const pc = NETWORK_SIM_STATE.pcs[pcKey];

  modalBody.innerHTML = `
    <div class="pt-quick-cmds">
      <button class="pt-pill-btn" data-cmd="ipconfig /all">ipconfig /all</button>
      <button class="pt-pill-btn" data-cmd="ping 192.168.20.10">ping Servidor (192.168.20.10)</button>
      <button class="pt-pill-btn" data-cmd="ping gps.unab.edu.pe">ping gps.unab.edu.pe</button>
      <button class="pt-pill-btn" data-cmd="ping 192.168.20.1">ping Gateway (192.168.20.1)</button>
      <button class="pt-pill-btn" data-cmd="ping 192.168.20.200">ping Impresora (192.168.20.200)</button>
      <button class="pt-pill-btn" data-cmd="arp -a">arp -a</button>
      <button class="pt-pill-btn" data-cmd="cls">cls</button>
    </div>
    <div class="pt-terminal">
      <div id="cmd-output" class="pt-terminal-output">UNAB Windows Command Processor [Versión 10.0.22631]
Estación: ${pc.hostname} (${pc.ip})
Escribe "help" o usa los botones superiores para ejecutar pruebas de red.
</div>
      <div class="pt-terminal-input-row">
        <span class="pt-terminal-prompt">C:\\Users\\${pc.hostname}&gt;</span>
        <input id="cmd-input" class="pt-terminal-input" placeholder="Escribe un comando (ej. ping 192.168.20.10, ipconfig, arp -a)..." autocomplete="off" />
      </div>
    </div>
  `;

  const out = document.getElementById('cmd-output');
  const inp = document.getElementById('cmd-input');
  inp.focus();

  function appendLine(text) {
    out.textContent += `\n${text}\n`;
    out.scrollTop = out.scrollHeight;
  }

  function runCommand(raw) {
    const cmdLine = raw.trim();
    if (!cmdLine) return;
    out.textContent += `\nC:\\Users\\${pc.hostname}> ${cmdLine}`;

    const parts = cmdLine.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const arg = parts[1] || '';

    if (cmd === 'cls' || cmd === 'clear') {
      out.textContent = '';
      return;
    }
    if (cmd === 'help') {
      appendLine(
        `Comandos disponibles:\n  ipconfig [/all]         Muestra la configuración IPv4, MAC y DNS\n  ping <ip|dominio>       Envía 4 paquetes ICMP Echo Request\n  nslookup <dominio>      Consulta el servidor DNS (192.168.20.10)\n  tracert <ip>            Traza la ruta hacia el destino\n  arp -a                  Muestra la tabla ARP de la interfaz\n  cls                     Limpia la pantalla`
      );
      return;
    }
    if (cmd === 'ipconfig') {
      appendLine(
        `Configuración IP de Windows (${pc.hostname})\n\nAdaptador de Ethernet FastEthernet0:\n   Estado del enlace . . . . . . . : ${isDeviceLinkUp(pcKey) ? 'Conectado (1 Gbps)' : 'Medios desconectados'}\n   Modo de asignación. . . . . . . : ${pc.mode}\n   Dirección física (MAC). . . . . : ${pc.mac}\n   Dirección IPv4. . . . . . . . . : ${pc.ip}\n   Máscara de subred . . . . . . . : ${pc.mask}\n   Puerta de enlace predeterminada : ${pc.gateway}\n   Servidor DNS. . . . . . . . . . : ${pc.dns}`
      );
      return;
    }
    if (cmd === 'arp') {
      appendLine(
        `Interfaz: ${pc.ip} --- 0x1\n  Dirección de Internet    Dirección física      Tipo\n  192.168.20.1             00-90-2b-a1-10-01     dinámico\n  192.168.20.10            00-e0-4c-68-20-10     dinámico\n  192.168.20.200           00-26-ab-7c-40-99     dinámico`
      );
      return;
    }
    if (cmd === 'nslookup') {
      if (!arg) {
        appendLine('Uso: nslookup <dominio> (ej. nslookup gps.unab.edu.pe)');
        return;
      }
      const res = resolveHostOrIp(arg);
      if (res.ip) {
        appendLine(`Servidor:  srv-buses-unab.local\nAddress:  ${pc.dns}\n\nNombre:    ${arg}\nAddress:   ${res.ip}`);
      } else if (res.error === 'DNS_OFF') {
        appendLine(`DNS request timed out.\n*** El servicio DNS en ${pc.dns} está inactivo.`);
      } else {
        appendLine(`*** ${pc.dns} no encuentra ${arg}: Non-existent domain.`);
      }
      return;
    }
    if (cmd === 'ping' || cmd === 'tracert') {
      if (!arg) {
        appendLine(`Uso: ${cmd} <dirección IP o nombre de dominio>`);
        return;
      }
      if (!isDeviceLinkUp(pcKey)) {
        appendLine(`PING: fallo en la transmisión. El puerto ${pc.switchPort} del Switch está apagado (DOWN).`);
        return;
      }
      const res = resolveHostOrIp(arg);
      if (!res.ip) {
        appendLine(
          res.error === 'DNS_OFF'
            ? `La solicitud de ping no pudo encontrar el host ${arg}. El servidor DNS (192.168.20.10) está apagado.`
            : `La solicitud de ping no pudo encontrar el host ${arg}. Compruebe el nombre.`
        );
        return;
      }
      const sameLan = pc.ip.startsWith('192.168.20.') && res.ip.startsWith('192.168.20.');
      const ok = sameLan && isIpReachableFromLan(res.ip);
      if (cmd === 'tracert') {
        appendLine(
          ok
            ? `Traza a la dirección ${arg} [${res.ip}] sobre un máximo de 30 saltos:\n  1    <1 ms    <1 ms    <1 ms  ${res.ip}\nTraza completa.`
            : `Traza a la dirección ${arg} [${res.ip}]:\n  1     *        *        *     Tiempo de espera agotado para esta solicitud.`
        );
        return;
      }
      if (ok) {
        appendLine(
          `Haciendo ping a ${arg} [${res.ip}] con 32 bytes de datos:\nRespuesta desde ${res.ip}: bytes=32 tiempo<1m TTL=64\nRespuesta desde ${res.ip}: bytes=32 tiempo=1ms TTL=64\nRespuesta desde ${res.ip}: bytes=32 tiempo<1m TTL=64\nRespuesta desde ${res.ip}: bytes=32 tiempo=1ms TTL=64\n\nEstadísticas de ping para ${res.ip}:\n    Paquetes: enviados = 4, recibidos = 4, perdidos = 0 (0% perdidos)`
        );
      } else {
        appendLine(
          `Haciendo ping a ${arg} [${res.ip}] con 32 bytes de datos:\nTiempo de espera agotado para esta solicitud.\nTiempo de espera agotado para esta solicitud.\n\nEstadísticas de ping para ${res.ip}:\n    Paquetes: enviados = 4, recibidos = 0, perdidos = 4 (100% perdidos)`
        );
      }
      return;
    }

    appendLine(`"${cmd}" no se reconoce como un comando interno o externo. Escribe "help".`);
  }

  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      runCommand(inp.value);
      inp.value = '';
    }
  });

  modalBody.querySelectorAll('button[data-cmd]').forEach((btn) => {
    btn.addEventListener('click', () => {
      runCommand(btn.getAttribute('data-cmd'));
      inp.focus();
    });
  });
}

// ============================================================================
// RENDERIZADO DE PESTAÑAS PARA EL RACK (SERVIDOR, ROUTER, SWITCH, CLI)
// ============================================================================
function renderServerServicesTab() {
  activeGpsCanvas = null;
  const srv = NETWORK_SIM_STATE.server;
  const dhcp = srv.dhcpConfig;

  modalBody.innerHTML = `
    <div class="pt-grid-2">
      <div class="pt-card">
        <div class="pt-card-header">
          <span class="pt-card-title">Servicios Activos (${srv.hostname} - ${srv.ip})</span>
        </div>
        <div class="pt-form-row">
          <label>HTTP / API REST GPS (Puerto 80/443):</label>
          <button class="pt-pill-btn ${srv.services.httpGps ? 'active' : ''}" data-srv-toggle="httpGps">
            ${srv.services.httpGps ? 'ON (Activo)' : 'OFF (Inactivo)'}
          </button>
        </div>
        <div class="pt-form-row">
          <label>Motor Base de Datos PostgreSQL (5432):</label>
          <button class="pt-pill-btn ${srv.services.postgres ? 'active' : ''}" data-srv-toggle="postgres">
            ${srv.services.postgres ? 'ON (Activo)' : 'OFF (Inactivo)'}
          </button>
        </div>
        <div class="pt-form-row">
          <label>Servicio DHCP Server (UDP 67/68):</label>
          <button class="pt-pill-btn ${srv.services.dhcp ? 'active' : ''}" data-srv-toggle="dhcp">
            ${srv.services.dhcp ? 'ON (Activo)' : 'OFF (Inactivo)'}
          </button>
        </div>
        <div class="pt-form-row">
          <label>Servicio DNS Server (UDP/TCP 53):</label>
          <button class="pt-pill-btn ${srv.services.dns ? 'active' : ''}" data-srv-toggle="dns">
            ${srv.services.dns ? 'ON (Activo)' : 'OFF (Inactivo)'}
          </button>
        </div>
      </div>

      <div class="pt-card">
        <div class="pt-card-header">
          <span class="pt-card-title">Configuración Pool DHCP (${dhcp.poolName})</span>
        </div>
        <div class="pt-form-row">
          <label>Default Gateway:</label>
          <input id="inp-dhcp-gw" class="pt-input" value="${dhcp.defaultGateway}" />
        </div>
        <div class="pt-form-row">
          <label>DNS Server:</label>
          <input id="inp-dhcp-dns" class="pt-input" value="${dhcp.dnsServer}" />
        </div>
        <div class="pt-form-row">
          <label>Start IP Address:</label>
          <input id="inp-dhcp-start" class="pt-input" value="${dhcp.startIp}" />
        </div>
        <div class="pt-form-row">
          <label>Subnet Mask:</label>
          <input id="inp-dhcp-mask" class="pt-input" value="${dhcp.subnetMask}" />
        </div>
        <button id="btn-save-dhcp" class="pt-pill-btn primary">Guardar Pool DHCP</button>
      </div>
    </div>

    <div class="pt-card">
      <div class="pt-card-header">
        <span class="pt-card-title">Tabla de Registros DNS (Zona Directa UNAB)</span>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <input id="inp-dns-domain" class="pt-input" placeholder="dominio.unab.local" style="width:165px;" />
          <input id="inp-dns-ip" class="pt-input" placeholder="192.168.20.X" style="width:135px;" />
          <button id="btn-add-dns" class="pt-pill-btn primary">+ Añadir Registro A</button>
        </div>
      </div>
      <table class="pt-table">
        <thead>
          <tr><th>Nombre de Dominio</th><th>Tipo</th><th>Dirección IPv4</th><th>Acción</th></tr>
        </thead>
        <tbody id="dns-records-tbody"></tbody>
      </table>
    </div>
  `;

  modalBody.querySelectorAll('button[data-srv-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const k = btn.getAttribute('data-srv-toggle');
      srv.services[k] = !srv.services[k];
      renderServerServicesTab();
    });
  });

  document.getElementById('btn-save-dhcp').addEventListener('click', (e) => {
    dhcp.defaultGateway = document.getElementById('inp-dhcp-gw').value.trim();
    dhcp.dnsServer = document.getElementById('inp-dhcp-dns').value.trim();
    dhcp.startIp = document.getElementById('inp-dhcp-start').value.trim();
    dhcp.subnetMask = document.getElementById('inp-dhcp-mask').value.trim();
    e.target.textContent = 'Pool DHCP Actualizado';
  });

  const dnsTbody = document.getElementById('dns-records-tbody');
  srv.dnsRecords.forEach((rec, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${rec.domain}</td>
      <td>${rec.type}</td>
      <td>${rec.ip}</td>
      <td><button class="pt-pill-btn" data-del-dns="${idx}">Eliminar</button></td>
    `;
    dnsTbody.appendChild(tr);
  });

  dnsTbody.querySelectorAll('button[data-del-dns]').forEach((btn) => {
    btn.addEventListener('click', () => {
      srv.dnsRecords.splice(Number(btn.getAttribute('data-del-dns')), 1);
      renderServerServicesTab();
    });
  });

  document.getElementById('btn-add-dns').addEventListener('click', () => {
    const dom = document.getElementById('inp-dns-domain').value.trim();
    const ip = document.getElementById('inp-dns-ip').value.trim();
    if (dom && ip) {
      srv.dnsRecords.push({ domain: dom, type: 'A', ip });
      renderServerServicesTab();
    }
  });
}

function renderRouterConfigTab() {
  activeGpsCanvas = null;
  const rtr = NETWORK_SIM_STATE.router;

  modalBody.innerHTML = `
    <div class="pt-grid-2">
      <div class="pt-card">
        <div class="pt-card-header">
          <span class="pt-card-title">Interfaz GigabitEthernet0/0 (WAN Fibra UNAB)</span>
          <button id="btn-toggle-wan" class="pt-pill-btn ${rtr.wanUp ? 'active' : ''}">
            Port Status: ${rtr.wanUp ? 'ON' : 'OFF'}
          </button>
        </div>
        <div class="pt-form-row">
          <label>IPv4 Address:</label>
          <input id="inp-rtr-wan-ip" class="pt-input" value="${rtr.wanIp}" />
        </div>
        <div class="pt-form-row">
          <label>Subnet Mask:</label>
          <input id="inp-rtr-wan-mask" class="pt-input" value="${rtr.wanMask}" />
        </div>
      </div>

      <div class="pt-card">
        <div class="pt-card-header">
          <span class="pt-card-title">Interfaz GigabitEthernet0/1 (Gateway LAN)</span>
          <button id="btn-toggle-lan" class="pt-pill-btn ${rtr.lanUp ? 'active' : ''}">
            Port Status: ${rtr.lanUp ? 'ON' : 'OFF'}
          </button>
        </div>
        <div class="pt-form-row">
          <label>IPv4 Gateway:</label>
          <input id="inp-rtr-lan-ip" class="pt-input" value="${rtr.lanIp}" />
        </div>
        <div class="pt-form-row">
          <label>Subnet Mask:</label>
          <input id="inp-rtr-lan-mask" class="pt-input" value="${rtr.lanMask}" />
        </div>
      </div>
    </div>

    <div class="pt-card">
      <div class="pt-card-header">
        <span class="pt-card-title">Reglas de NAT / Port Forwarding (Telemetría 4G Buses UNAB)</span>
        <button id="btn-save-rtr" class="pt-pill-btn primary">Guardar Cambios Router</button>
      </div>
      <table class="pt-table">
        <thead>
          <tr><th>Protocolo</th><th>Puerto Externo WAN</th><th>IP Interna Destino</th><th>Puerto Interno</th><th>Descripción</th></tr>
        </thead>
        <tbody>
          <tr><td>UDP / TCP</td><td>5055</td><td>${NETWORK_SIM_STATE.server.ip}</td><td>5055</td><td>Tramas GPS Buses UNAB (Traccar Protocol)</td></tr>
          <tr><td>TCP</td><td>443</td><td>${NETWORK_SIM_STATE.server.ip}</td><td>443</td><td>API HTTPS App Estudiantes UNAB</td></tr>
        </tbody>
      </table>
    </div>
  `;

  document.getElementById('btn-toggle-wan').addEventListener('click', () => {
    rtr.wanUp = !rtr.wanUp;
    renderRouterConfigTab();
  });
  document.getElementById('btn-toggle-lan').addEventListener('click', () => {
    rtr.lanUp = !rtr.lanUp;
    renderRouterConfigTab();
  });
  document.getElementById('btn-save-rtr').addEventListener('click', (e) => {
    rtr.wanIp = document.getElementById('inp-rtr-wan-ip').value.trim();
    rtr.wanMask = document.getElementById('inp-rtr-wan-mask').value.trim();
    rtr.lanIp = document.getElementById('inp-rtr-lan-ip').value.trim();
    rtr.lanMask = document.getElementById('inp-rtr-lan-mask').value.trim();
    e.target.textContent = 'Configuración Aplicada';
  });
}

function renderSwitchPortsTab() {
  activeGpsCanvas = null;

  modalBody.innerHTML = `
    <div class="pt-card">
      <div class="pt-card-header">
        <span class="pt-card-title">Switch Administrable 24 Puertos (192.168.20.2) & Patch Panel Cat6A</span>
        <span class="pt-status-pill">IEEE 802.1Q VLANs Activas</span>
      </div>
      <table class="pt-table">
        <thead>
          <tr>
            <th>Puerto Switch</th>
            <th>Equipo Conectado</th>
            <th>VLAN Asignada</th>
            <th>Dirección IP</th>
            <th>Estado Enlace</th>
            <th>Control</th>
          </tr>
        </thead>
        <tbody id="sw-ports-tbody"></tbody>
      </table>
    </div>
  `;

  const tbody = document.getElementById('sw-ports-tbody');
  NETWORK_SIM_STATE.switchPorts.forEach((sp, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><b>${sp.port}</b></td>
      <td>${sp.device}</td>
      <td>${sp.vlan}</td>
      <td>${sp.ip}</td>
      <td><span class="pt-status-pill ${sp.up ? '' : 'off'}">${sp.up ? 'UP (1000Mbps)' : 'DOWN (Shutdown)'}</span></td>
      <td>
        <button class="pt-pill-btn ${sp.up ? 'active' : ''}" data-port-idx="${idx}">
          ${sp.up ? 'Apagar Puerto' : 'Encender Puerto'}
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('button[data-port-idx]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.getAttribute('data-port-idx'));
      NETWORK_SIM_STATE.switchPorts[idx].up = !NETWORK_SIM_STATE.switchPorts[idx].up;
      renderSwitchPortsTab();
    });
  });
}

function renderRackCliTab() {
  activeGpsCanvas = null;
  const rtr = NETWORK_SIM_STATE.router;

  modalBody.innerHTML = `
    <div class="pt-quick-cmds">
      <button class="pt-pill-btn" data-cli="show ip interface brief">show ip interface brief</button>
      <button class="pt-pill-btn" data-cli="show vlan brief">show vlan brief</button>
      <button class="pt-pill-btn" data-cli="show running-config">show running-config</button>
      <button class="pt-pill-btn" data-cli="show ip route">show ip route</button>
      <button class="pt-pill-btn" data-cli="show ip dhcp binding">show ip dhcp binding</button>
      <button class="pt-pill-btn" data-cli="clear">clear</button>
    </div>
    <div class="pt-terminal">
      <div id="cli-output" class="pt-terminal-output">Cisco IOS Software, UNAB-Transporte Router/Switch Core (Version 15.6(3)M)
Copyright (c) Cisco Systems, Inc.
Presiona un botón rápido o escribe "help" para ver los comandos de administración.
</div>
      <div class="pt-terminal-input-row">
        <span class="pt-terminal-prompt">${rtr.hostname}#</span>
        <input id="cli-input" class="pt-terminal-input" placeholder="Escribe comando IOS (ej. show ip interface brief, show vlan brief)..." autocomplete="off" />
      </div>
    </div>
  `;

  const out = document.getElementById('cli-output');
  const inp = document.getElementById('cli-input');
  inp.focus();

  function runIosCommand(raw) {
    const cmd = raw.trim().toLowerCase();
    if (!cmd) return;
    out.textContent += `\n${rtr.hostname}# ${raw.trim()}\n`;

    if (cmd === 'clear' || cmd === 'cls') {
      out.textContent = '';
      return;
    }
    if (cmd === 'help' || cmd === '?') {
      out.textContent += `Comandos EXEC privilegiados:\n  show ip interface brief    Estado de interfaces del Router y Switch\n  show vlan brief            Tabla de VLANs configuradas en el Switch\n  show running-config        Configuración activa en memoria RAM\n  show ip route              Tabla de enrutamiento IPv4\n  show ip dhcp binding       Asignaciones de IPs del pool DHCP\n  clear                      Limpia la terminal\n`;
    } else if (cmd.includes('interface brief')) {
      const rows = NETWORK_SIM_STATE.switchPorts
        .map((p) => `${p.port.padEnd(22)}${p.ip.padEnd(17)}YES manual ${(p.up ? 'up' : 'administratively down').padEnd(22)}${p.up ? 'up' : 'down'}`)
        .join('\n');
      out.textContent += `Interface             IP-Address       OK? Method Status                Protocol\nGigabitEthernet0/0    ${rtr.wanIp.padEnd(17)}YES NVRAM  ${(rtr.wanUp ? 'up' : 'down').padEnd(22)}${rtr.wanUp ? 'up' : 'down'}\nGigabitEthernet0/1    ${rtr.lanIp.padEnd(17)}YES NVRAM  ${(rtr.lanUp ? 'up' : 'down').padEnd(22)}${rtr.lanUp ? 'up' : 'down'}\n${rows}\n`;
    } else if (cmd.includes('vlan')) {
      out.textContent += `VLAN Name                             Status    Ports\n---- -------------------------------- --------- -------------------------------\n1    default                          active    Gi0/7-24\n10   SERVIDORES_TRANSPORTE            active    Gi0/1, Gi0/2\n20   MONITOREO_GPS_BUSES              active    Gi0/3, Gi0/4, Gi0/6\n30   GESTION_RED_TI                   active    Gi0/5\n`;
    } else if (cmd.includes('running-config')) {
      out.textContent += `Building configuration...\nCurrent configuration : 1482 bytes\n!\nhostname ${rtr.hostname}\n!\nip dhcp pool ${NETWORK_SIM_STATE.server.dhcpConfig.poolName}\n network 192.168.20.0 255.255.255.0\n default-router ${rtr.lanIp}\n dns-server ${NETWORK_SIM_STATE.server.ip}\n!\ninterface GigabitEthernet0/0\n description ENLACE_WAN_FIBRA_UNAB\n ip address ${rtr.wanIp} ${rtr.wanMask}\n ip nat outside\n!\ninterface GigabitEthernet0/1\n description LAN_AREA_TRANSPORTE\n ip address ${rtr.lanIp} ${rtr.lanMask}\n ip nat inside\n!\nip nat inside source static udp ${NETWORK_SIM_STATE.server.ip} 5055 interface GigabitEthernet0/0 5055\n!\nend\n`;
    } else if (cmd.includes('route')) {
      out.textContent += `Codes: C - connected, S - static, O - OSPF, * - candidate default\n\nGateway of last resort is ${rtr.wanIp} to network 0.0.0.0\n\nC    192.168.20.0/24 is directly connected, GigabitEthernet0/1\nC    200.48.225.12/30 is directly connected, GigabitEthernet0/0\nS*   0.0.0.0/0 [1/0] via 200.48.225.13\n`;
    } else if (cmd.includes('dhcp')) {
      const pcs = Object.values(NETWORK_SIM_STATE.pcs);
      out.textContent += `IP address       Client-ID/Hardware address   Lease expiration        Type\n` +
        pcs.map((p) => `${p.ip.padEnd(17)}${p.mac.padEnd(29)}Infinite                ${p.mode}`).join('\n') + '\n';
    } else {
      out.textContent += `% Invalid input detected. Type "help" for available commands.\n`;
    }
    out.scrollTop = out.scrollHeight;
  }

  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      runIosCommand(inp.value);
      inp.value = '';
    }
  });

  modalBody.querySelectorAll('button[data-cli]').forEach((btn) => {
    btn.addEventListener('click', () => {
      runIosCommand(btn.getAttribute('data-cli'));
      inp.focus();
    });
  });
}

// ============================================================================
// RENDERIZADO PARA IMPRESORA EPSON, UPS 220V Y AIRE ACONDICIONADO CRAC
// ============================================================================
function renderPrinterConsole() {
  activeGpsCanvas = null;
  const prn = NETWORK_SIM_STATE.printer;

  modalBody.innerHTML = `
    <div class="pt-grid-2">
      <div class="pt-card">
        <div class="pt-card-header">
          <span class="pt-card-title">Parámetros TCP/IP Epson EcoTank</span>
          <span class="pt-status-pill">${isDeviceLinkUp('printer_net') ? 'ONLINE (9100)' : 'OFFLINE'}</span>
        </div>
        <div class="pt-form-row"><label>IPv4 Estática:</label><input id="inp-prn-ip" class="pt-input" value="${prn.ip}" /></div>
        <div class="pt-form-row"><label>Máscara Subred:</label><input class="pt-input" value="${prn.mask}" disabled /></div>
        <div class="pt-form-row"><label>Gateway:</label><input class="pt-input" value="${prn.gateway}" disabled /></div>
        <button id="btn-save-prn" class="pt-pill-btn primary">Actualizar IP Impresora</button>
      </div>
      <div class="pt-card">
        <div class="pt-card-header">
          <span class="pt-card-title">Niveles de Tinta Sistema EcoTank</span>
          <button id="btn-test-print" class="pt-pill-btn primary">Imprimir Página de Prueba</button>
        </div>
        <div class="pt-form-row"><label> Negro (BK 504):</label><span>${prn.ink.bk}%</span></div>
        <div class="pt-form-row"><label> Cian (C 504):</label><span>${prn.ink.c}%</span></div>
        <div class="pt-form-row"><label> Magenta (M 504):</label><span>${prn.ink.m}%</span></div>
        <div class="pt-form-row"><label> Amarillo (Y 504):</label><span>${prn.ink.y}%</span></div>
      </div>
    </div>
    <div class="pt-card">
      <span class="pt-card-title">Cola de Impresión de Red ( Trabajos Recibidos desde Estaciones UNAB )</span>
      <table class="pt-table">
        <thead><tr><th>ID</th><th>Documento</th><th>Estación Origen</th><th>Páginas</th><th>Hora</th><th>Estado</th></tr></thead>
        <tbody>
          ${prn.jobs.map((j) => `<tr><td>#${j.id}</td><td>${j.doc}</td><td>${j.user}</td><td>${j.pages}</td><td>${j.time}</td><td><span class="pt-status-pill">${j.state}</span></td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById('btn-save-prn').addEventListener('click', () => {
    prn.ip = document.getElementById('inp-prn-ip').value.trim();
    EQUIPMENT_DATA.printer_net.specs['Dirección IP'] = `${prn.ip} (IP Estática)`;
    if (activeInspectedKey === 'printer_net') updateInspectorUI('printer_net');
  });

  document.getElementById('btn-test-print').addEventListener('click', () => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    prn.jobs.unshift({
      id: 100 + prn.jobs.length + 1,
      doc: 'Test_Diagnostico_Red_Epson.pdf',
      user: 'Panel Local',
      pages: 1,
      time: now,
      state: 'Impreso OK'
    });
    renderPrinterConsole();
  });
}

function renderPowerAndClimateConsole(dataKey) {
  activeGpsCanvas = null;
  if (dataKey === 'ups_power') {
    const ups = NETWORK_SIM_STATE.ups;
    const onBattery = ups.inputVoltage === 0;
    modalBody.innerHTML = `
      <div class="pt-card">
        <div class="pt-card-header">
          <span class="pt-card-title">Sistema UPS Online Doble Conversión 3000VA (3 Módulos)</span>
          <button id="btn-sim-blackout" class="pt-pill-btn primary">
            ${onBattery ? 'Restaurar Energía Comercial AC (220V)' : 'Simular Corte Eléctrico en Campus'}
          </button>
        </div>
        <div class="pt-grid-2">
          <div class="pt-form-row"><label>Modo de Operación:</label><span>${ups.mode}</span></div>
          <div class="pt-form-row"><label>Voltaje Entrada AC:</label><span>${ups.inputVoltage} V</span></div>
          <div class="pt-form-row"><label>Voltaje Salida Regulado:</label><span>${ups.outputVoltage} V / 60 Hz</span></div>
          <div class="pt-form-row"><label>Carga del Rack Principal:</label><span>${ups.loadPercent}% (918 W)</span></div>
          <div class="pt-form-row"><label>Nivel Banco de Baterías:</label><span>${ups.batteryPercent}%</span></div>
        </div>
      </div>
    `;
    document.getElementById('btn-sim-blackout').addEventListener('click', () => {
      if (ups.inputVoltage > 0) {
        ups.inputVoltage = 0;
        ups.mode = 'Respaldo Batería Online (Inversor 220V Activo)';
        ups.batteryPercent = 96;
      } else {
        ups.inputVoltage = 220;
        ups.mode = 'AC Normal (Doble Conversión)';
        ups.batteryPercent = 100;
      }
      renderPowerAndClimateConsole('ups_power');
    });
  } else {
    const crac = NETWORK_SIM_STATE.crac;
    modalBody.innerHTML = `
      <div class="pt-card">
        <div class="pt-card-header">
          <span class="pt-card-title">Climatizador de Precisión EDApower CRAC</span>
          <button id="btn-crac-pwr" class="pt-pill-btn ${crac.power ? 'active' : ''}">
            Estado: ${crac.power ? 'ENCENDIDO' : 'APAGADO'}
          </button>
        </div>
        <div class="pt-grid-2">
          <div class="pt-form-row">
            <label>Temperatura Objetivo (°C):</label>
            <input id="inp-crac-temp" type="number" step="0.5" min="16" max="26" class="pt-input" value="${crac.targetTemp}" />
          </div>
          <div class="pt-form-row"><label>Temperatura Retorno Actual:</label><span>${crac.currentTemp} °C</span></div>
          <div class="pt-form-row"><label>Humedad Relativa:</label><span>${crac.humidity}%</span></div>
          <div class="pt-form-row"><label>Inyección Piso Técnico:</label><span>${crac.fanSpeed}</span></div>
        </div>
        <button id="btn-save-crac" class="pt-pill-btn primary">Aplicar Setpoint Térmico</button>
      </div>
    `;
    document.getElementById('btn-crac-pwr').addEventListener('click', () => {
      crac.power = !crac.power;
      crac.currentTemp = crac.power ? crac.targetTemp : 27.5;
      renderPowerAndClimateConsole('ac_unit');
    });
    document.getElementById('btn-save-crac').addEventListener('click', () => {
      crac.targetTemp = Number(document.getElementById('inp-crac-temp').value) || 20.0;
      crac.currentTemp = crac.targetTemp;
      EQUIPMENT_DATA.ac_unit.specs['Temperatura Objetivo'] = `${crac.targetTemp.toFixed(1)} °C ± 1.0 °C`;
      if (activeInspectedKey === 'ac_unit') updateInspectorUI('ac_unit');
      renderPowerAndClimateConsole('ac_unit');
    });
  }
}

function openDeviceConsole(dataKey) {
  if (!isConsoleSupported(dataKey)) return;
  isDeviceModalOpen = true;
  clearMovementKeys();
  if (document.pointerLockElement) document.exitPointerLock();

  const info = EQUIPMENT_DATA[dataKey];
  modalDeviceBadge.textContent = info.category;
  modalDeviceTitle.textContent = info.title;
  deviceModal.classList.remove('hidden');

  let tabs = [];
  if (dataKey.startsWith('pc_')) {
    tabs = [
      { id: 'web', label: 'Sistema GPS UNAB (Web)', render: () => renderPcWebTab(dataKey) },
      { id: 'ip', label: 'IP Configuration', render: () => renderPcIpConfigTab(dataKey) },
      { id: 'cmd', label: 'Command Prompt (CMD)', render: () => renderPcCmdTab(dataKey) }
    ];
  } else if (['rack_main', 'server_gps', 'switch_core', 'router_gateway', 'patch_panel'].includes(dataKey)) {
    tabs = [
      { id: 'srv', label: 'Servidor: Services (DHCP / DNS / HTTP)', render: renderServerServicesTab },
      { id: 'rtr', label: 'Router: Config & NAT', render: renderRouterConfigTab },
      { id: 'sw', label: 'Switch: VLANs & Puertos', render: renderSwitchPortsTab },
      { id: 'cli', label: 'CLI (Cisco IOS)', render: renderRackCliTab }
    ];
  } else if (dataKey === 'printer_net') {
    tabs = [{ id: 'prn', label: 'Cola de Impresión & Red TCP/IP', render: renderPrinterConsole }];
  } else {
    tabs = [{ id: 'ctrl', label: 'Panel de Control & Telemetría', render: () => renderPowerAndClimateConsole(dataKey) }];
  }

  modalTabs.innerHTML = '';
  tabs.forEach((t, i) => {
    const btn = document.createElement('button');
    btn.className = `modal-tab-btn ${i === 0 ? 'active' : ''}`;
    btn.textContent = t.label;
    btn.addEventListener('click', () => {
      modalTabs.querySelectorAll('.modal-tab-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      t.render();
    });
    modalTabs.appendChild(btn);
  });

  tabs[0].render();
}

function closeDeviceConsole() {
  if (!isDeviceModalOpen) return;
  isDeviceModalOpen = false;
  activeGpsCanvas = null;
  deviceModal.classList.add('hidden');
}

btnOpenConsole.addEventListener('click', () => {
  if (activeInspectedKey) openDeviceConsole(activeInspectedKey);
});

btnCloseModal.addEventListener('click', closeDeviceConsole);

document.addEventListener('mousemove', (e) => {
  if (currentMode === 'fps' && isPointerLocked && !isDeviceModalOpen) {
    const dx = Math.max(-60, Math.min(60, e.movementX || 0));
    const dy = Math.max(-60, Math.min(60, e.movementY || 0));
    const sensitivity = 0.0022;
    targetYaw -= dx * sensitivity;
    targetPitch = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, targetPitch - dy * sensitivity));
  }
});

window.addEventListener('pointermove', (e) => {
  if (isDeviceModalOpen) return;
  if (currentMode === 'fps' && isPointerLocked) {
    mouse.set(0, 0);
  } else {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }

  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(interactables, false);

  if (hits.length > 0) {
    const key = hits[0].object.userData.dataKey;
    const info = EQUIPMENT_DATA[key];
    if (info && currentMode === 'orbit') {
      document.body.style.cursor = 'pointer';
      tooltip.textContent = info.title;
      tooltip.style.left = `${e.clientX}px`;
      tooltip.style.top = `${e.clientY}px`;
      tooltip.classList.remove('hidden');
      return;
    }
  }

  document.body.style.cursor = 'default';
  tooltip.classList.add('hidden');
});

window.addEventListener('click', (e) => {
  if (e.target.closest('header, aside, #device-modal')) return;

  if (currentMode === 'fps' && !isPointerLocked) {
    renderer.domElement.requestPointerLock();
    return;
  }

  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(interactables, false);
  if (hits.length > 0) {
    const key = hits[0].object.userData.dataKey;
    updateInspectorUI(key);
  } else {
    inspectorPanel.classList.add('hidden');
  }
});

document.getElementById('btn-close-inspector').addEventListener('click', () => {
  inspectorPanel.classList.add('hidden');
});

// ============================================================================
// 11. MODOS DE CÁMARA Y CONTROL DEL FALSO TECHO
// ============================================================================
const btnFps = document.getElementById('btn-mode-fps');
const fpsCrosshair = document.getElementById('fps-crosshair');

const btnToggleViews = document.getElementById('btn-toggle-views');
const viewsDropdownMenu = document.getElementById('views-dropdown-menu');
const btnCloseViews = document.getElementById('btn-close-views');
const btnToggleCeiling = document.getElementById('btn-toggle-ceiling');

let cameraTransition = null;

const CAMERA_VIEWS = {
  iso: { pos: [0, 17, 16], target: [0, 0.8, 0] },
  datacenter: { pos: [-3.6, 2.3, 2.2], target: [-6.75, 1.35, 0.45] },
  cabling: { pos: [-0.5, 8.2, 6.0], target: [-3.0, 2.5, 0.0] },
  monitoring: { pos: [2.8, 3.8, 0.8], target: [2.8, 1.3, -4.0] }
};

function setCeilingState(visible) {
  ceilingVisible = visible;
  ceilingGroup.visible = ceilingVisible;
  btnToggleCeiling.classList.toggle('active', ceilingVisible);
  btnToggleCeiling.textContent = `Techo: ${ceilingVisible ? 'ON' : 'OFF'}`;
}

btnToggleCeiling.addEventListener('click', () => {
  setCeilingState(!ceilingVisible);
});

function clearMovementKeys() {
  moveState.forward = false;
  moveState.backward = false;
  moveState.left = false;
  moveState.right = false;
  moveState.up = false;
  moveState.down = false;
  fpsVelocity.set(0, 0, 0);
}

function switchToCameraView(viewKey = 'iso') {
  currentMode = 'orbit';
  clearMovementKeys();
  if (document.pointerLockElement) document.exitPointerLock();
  orbitControls.enabled = true;
  btnFps.classList.remove('active');
  fpsCrosshair.classList.add('hidden');

  setCeilingState(false);

  const v = CAMERA_VIEWS[viewKey] || CAMERA_VIEWS.iso;
  cameraTransition = {
    startPos: camera.position.clone(),
    endPos: new THREE.Vector3(...v.pos),
    startTarget: orbitControls.target.clone(),
    endTarget: new THREE.Vector3(...v.target),
    alpha: 0
  };
}

function activateFpsMode() {
  closeDeviceConsole();
  cameraTransition = null;
  currentMode = 'fps';
  clearMovementKeys();
  orbitControls.enabled = false;
  btnFps.classList.add('active');
  fpsCrosshair.classList.remove('hidden');
  viewsDropdownMenu.classList.add('hidden');
  btnToggleViews.classList.remove('active');

  setCeilingState(true);

  camera.position.set(2.2, 1.7, 0.4);
  yaw = Math.PI / 2;
  pitch = 0;
  targetYaw = yaw;
  targetPitch = pitch;

  renderer.domElement.requestPointerLock();
}

document.addEventListener('pointerlockchange', () => {
  isPointerLocked = document.pointerLockElement === renderer.domElement;
  if (isPointerLocked) {
    fpsHint.innerHTML = '<b>W, A, S, D</b> caminar &bull; <b>Click / Tecla F</b> usar monitor o rack &bull; <b>Tecla E</b> cerrar ventana &bull; <b>ESC</b> Vista General';
  } else if (currentMode === 'fps' && !isDeviceModalOpen) {
    switchToCameraView('iso');
  }
});

window.addEventListener('blur', clearMovementKeys);

btnFps.addEventListener('click', activateFpsMode);

btnToggleViews.addEventListener('click', () => {
  const isHidden = viewsDropdownMenu.classList.toggle('hidden');
  btnToggleViews.classList.toggle('active', !isHidden);
});

btnCloseViews.addEventListener('click', () => {
  viewsDropdownMenu.classList.add('hidden');
  btnToggleViews.classList.remove('active');
});

document.querySelectorAll('.preset-btn[data-view]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const viewName = btn.getAttribute('data-view');
    if (viewName === 'door') {
      doorsOpen = !doorsOpen;
      return;
    }
    switchToCameraView(viewName);
  });
});

// Toggle Flujo de Paquetes
const btnTogglePackets = document.getElementById('btn-toggle-packets');
btnTogglePackets.addEventListener('click', () => {
  packetsEnabled = !packetsEnabled;
  dataPackets.forEach((p) => (p.mesh.visible = packetsEnabled));
  btnTogglePackets.classList.toggle('active', packetsEnabled);
  btnTogglePackets.textContent = `Flujo de Datos: ${packetsEnabled ? 'ON' : 'OFF'}`;
});

// Toggle Altura de Muros y Puertas
let wallsLowered = false;
const btnToggleWalls = document.getElementById('btn-toggle-walls');
btnToggleWalls.addEventListener('click', () => {
  wallsLowered = !wallsLowered;
  wallMeshes.forEach((w) => {
    w.scale.y = wallsLowered ? 0.14 : 1;
  });
  btnToggleWalls.classList.toggle('active', wallsLowered);
  btnToggleWalls.textContent = `Vista Muros: ${wallsLowered ? 'Bajos' : 'Normal'}`;
});

// Toggle Etiquetas Flotantes
let labelsVisible = true;
const btnToggleLabels = document.getElementById('btn-toggle-labels');
btnToggleLabels.addEventListener('click', () => {
  labelsVisible = !labelsVisible;
  floatingLabels.forEach((l) => (l.visible = labelsVisible));
  btnToggleLabels.classList.toggle('active', labelsVisible);
  btnToggleLabels.textContent = `Etiquetas: ${labelsVisible ? 'ON' : 'OFF'}`;
});

window.addEventListener('keydown', (e) => {
  // Si el usuario está escribiendo dentro de un input (IP o Terminal CMD/CLI), no activar WASD ni atajos
  if (e.target.tagName === 'INPUT') {
    if (e.code === 'Escape') {
      e.target.blur();
      closeDeviceConsole();
    }
    return;
  }

  switch (e.code) {
    case 'KeyW':
    case 'ArrowUp':
      moveState.forward = true;
      break;
    case 'KeyS':
    case 'ArrowDown':
      moveState.backward = true;
      break;
    case 'KeyA':
    case 'ArrowLeft':
      moveState.left = true;
      break;
    case 'KeyD':
    case 'ArrowRight':
      moveState.right = true;
      break;
    case 'Space':
      moveState.up = true;
      break;
    case 'ShiftLeft':
    case 'ShiftRight':
      moveState.down = true;
      break;
    case 'KeyF': {
      // Si ya hay un equipo inspeccionado o se apunta directamente a uno con la mira, abrir su consola
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(interactables, false);
      if (hits.length > 0) {
        const key = hits[0].object.userData.dataKey;
        updateInspectorUI(key);
        openDeviceConsole(key);
      } else if (activeInspectedKey && !inspectorPanel.classList.contains('hidden')) {
        openDeviceConsole(activeInspectedKey);
      }
      break;
    }
    case 'KeyE':
      if (isDeviceModalOpen) {
        closeDeviceConsole();
      } else {
        inspectorPanel.classList.add('hidden');
        viewsDropdownMenu.classList.add('hidden');
        btnToggleViews.classList.remove('active');
      }
      break;
    case 'Escape':
      if (isDeviceModalOpen) {
        closeDeviceConsole();
      } else if (currentMode === 'fps' && !isPointerLocked) {
        switchToCameraView('iso');
      }
      break;
    case 'KeyT':
      btnToggleCeiling.click();
      break;
    case 'KeyC':
      btnTogglePackets.click();
      break;
    case 'KeyM':
      btnToggleWalls.click();
      break;
    case 'KeyL':
      btnToggleLabels.click();
      break;
  }
});

window.addEventListener('keyup', (e) => {
  switch (e.code) {
    case 'KeyW':
    case 'ArrowUp':
      moveState.forward = false;
      break;
    case 'KeyS':
    case 'ArrowDown':
      moveState.backward = false;
      break;
    case 'KeyA':
    case 'ArrowLeft':
      moveState.left = false;
      break;
    case 'KeyD':
    case 'ArrowRight':
      moveState.right = false;
      break;
    case 'Space':
      moveState.up = false;
      break;
    case 'ShiftLeft':
    case 'ShiftRight':
      moveState.down = false;
      break;
  }
});

// Dibuja el mapa GPS interactivo en vivo dentro del navegador de las PCs
function drawLiveGpsCanvas(canvas, delta) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = '#09131e';
  ctx.fillRect(0, 0, w, h);

  // Cuadrícula satelital
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Carretera Panamericana Norte y accesos a Campus UNAB
  const routes = [
    { y: 48, label: 'Paradero Paramonga / Pativilca' },
    { y: 102, label: 'Paradero Supe / Puerto Supe' },
    { y: 156, label: 'Plaza de Armas Barranca' }
  ];

  routes.forEach((r) => {
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(60, r.y);
    ctx.lineTo(w - 110, r.y);
    ctx.stroke();

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(60, r.y);
    ctx.lineTo(w - 110, r.y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(r.label, 65, r.y - 10);
  });

  // Nodo Destino: CAMPUS UNAB
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(w - 105, 28, 88, 145);
  ctx.fillStyle = '#09090b';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('CAMPUS', w - 88, 95);
  ctx.fillText('UNAB', w - 80, 112);

  // Actualizar y dibujar cada Bus UNAB
  NETWORK_SIM_STATE.buses.forEach((bus, i) => {
    if (bus.status === 'EN RUTA') {
      bus.progress = (bus.progress + delta * 0.08) % 1;
    }
    const ry = routes[i] ? routes[i].y : 100;
    const bx = 70 + bus.progress * (w - 195);

    ctx.fillStyle = bus.status === 'EN RUTA' ? '#ffffff' : '#71717a';
    ctx.beginPath();
    ctx.roundRect(bx - 26, ry - 9, 52, 18, 9);
    ctx.fill();

    ctx.fillStyle = '#09090b';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(bus.id, bx - 18, ry + 4);
  });
}

// ============================================================================
// 12. BUCLE DE ANIMACIÓN PRINCIPAL
// ============================================================================
const clock = new THREE.Clock();
const euler = new THREE.Euler(0, 0, 0, 'YXZ');
const forwardDir = new THREE.Vector3();
const rightDir = new THREE.Vector3();

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.1);
  const elapsed = clock.getElapsedTime();

  if (activeGpsCanvas && isDeviceModalOpen) {
    drawLiveGpsCanvas(activeGpsCanvas, delta);
  }

  if (cameraTransition) {
    cameraTransition.alpha += delta * 2.2;
    const t = Math.min(cameraTransition.alpha, 1);
    const smoothT = t * t * (3 - 2 * t);
    camera.position.lerpVectors(cameraTransition.startPos, cameraTransition.endPos, smoothT);
    orbitControls.target.lerpVectors(cameraTransition.startTarget, cameraTransition.endTarget, smoothT);
    if (t >= 1) cameraTransition = null;
  }

  if (currentMode === 'orbit') {
    orbitControls.update();
  } else if (currentMode === 'fps' && !isDeviceModalOpen) {
    const lookSmoothing = Math.min(1, delta * 18);
    yaw += (targetYaw - yaw) * lookSmoothing;
    pitch += (targetPitch - pitch) * lookSmoothing;

    euler.set(pitch, yaw, 0, 'YXZ');
    camera.quaternion.setFromEuler(euler);

    forwardDir.set(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    rightDir.set(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);

    const inputZ = (moveState.forward ? 1 : 0) - (moveState.backward ? 1 : 0);
    const inputX = (moveState.right ? 1 : 0) - (moveState.left ? 1 : 0);
    const inputY = (moveState.up ? 1 : 0) - (moveState.down ? 1 : 0);

    const targetVel = new THREE.Vector3();
    if (inputZ !== 0 || inputX !== 0) {
      targetVel.addScaledVector(forwardDir, inputZ);
      targetVel.addScaledVector(rightDir, inputX);
      targetVel.normalize().multiplyScalar(5.5);
    }
    targetVel.y = inputY * 3.8;

    fpsVelocity.lerp(targetVel, Math.min(1, delta * 12));
    camera.position.addScaledVector(fpsVelocity, delta);
    camera.position.y = Math.max(0.85, Math.min(14, camera.position.y));
  }

  if (packetsEnabled) {
    dataPackets.forEach((pkt) => {
      pkt.progress = (pkt.progress + delta * pkt.speed) % 1;
      const pos = pkt.curve.getPointAt(pkt.progress);
      pkt.mesh.position.copy(pos);
    });
  }

  blinkingLEDs.forEach((led) => {
    const on = Math.sin(elapsed * led.speed) > -0.2;
    led.mesh.material.color.setHex(on ? led.baseColor : 0x0f172a);
  });

  doorPivots.forEach((d) => {
    const targetRot = doorsOpen ? d.openRot : d.closedRot;
    d.pivot.rotation.y += (targetRot - d.pivot.rotation.y) * delta * 6;
  });

  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
});

