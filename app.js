import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { EQUIPMENT_DATA } from './data.js';

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
// 10. INTERACCIÓN CON EL MOUSE (RAYCASTER PARA INSPECCIONAR EQUIPOS)
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

function updateInspectorUI(dataKey) {
  const info = EQUIPMENT_DATA[dataKey];
  if (!info) return;

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
}

document.addEventListener('mousemove', (e) => {
  if (currentMode === 'fps' && isPointerLocked) {
    const dx = Math.max(-60, Math.min(60, e.movementX || 0));
    const dy = Math.max(-60, Math.min(60, e.movementY || 0));
    const sensitivity = 0.0022;
    targetYaw -= dx * sensitivity;
    targetPitch = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, targetPitch - dy * sensitivity));
  }
});

window.addEventListener('pointermove', (e) => {
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
  if (e.target.closest('header, aside')) return;

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
    fpsHint.innerHTML = '<b>W, A, S, D</b> caminar &bull; <b>Tecla E</b> cerrar ventana &bull; <b>Tecla T</b> techo &bull; <b>ESC</b> Vista General Isométrica';
  } else if (currentMode === 'fps') {
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
    case 'KeyE':
      inspectorPanel.classList.add('hidden');
      viewsDropdownMenu.classList.add('hidden');
      btnToggleViews.classList.remove('active');
      break;
    case 'Escape':
      if (currentMode === 'fps' && !isPointerLocked) {
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
  } else if (currentMode === 'fps') {
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
