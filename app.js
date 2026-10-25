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
scene.fog = new THREE.FogExp2(0x0f172a, 0.013);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 18, 16);

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
// 2. CONTROLES FLUIDOS: MODO MAQUETA Y MODO CAMINATA (WASD + MOUSE SMOOTH)
// ============================================================================
const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true;
orbitControls.dampingFactor = 0.06;
orbitControls.maxPolarAngle = Math.PI / 2 - 0.03;
orbitControls.minDistance = 2;
orbitControls.maxDistance = 42;
orbitControls.target.set(0, 1.2, 0);

let currentMode = 'orbit';
let isPointerLocked = false;
const moveState = { forward: false, backward: false, left: false, right: false, up: false, down: false };
const fpsVelocity = new THREE.Vector3();

// Ángulos de cámara en 1ra persona con interpolación suave (sin tirones de navegador)
let yaw = 0;
let pitch = 0;
let targetYaw = 0;
let targetPitch = 0;

// ============================================================================
// 3. ILUMINACIÓN
// ============================================================================
const ambientLight = new THREE.AmbientLight(0xe2e8f0, 0.9);
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

const dcLight = new THREE.PointLight(0x38bdf8, 1.1, 12);
dcLight.position.set(-5.8, 3.2, 0.5);
scene.add(dcLight);

const officeLight = new THREE.PointLight(0xfef3c7, 0.95, 16);
officeLight.position.set(2.5, 3.4, 0);
scene.add(officeLight);

// ============================================================================
// 4. TEXTURAS PROCEDURALES
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

// ============================================================================
// 5. REGISTRO DE OBJETOS INTERACTIVOS Y ELEMENTOS ANIMADOS
// ============================================================================
const interactables = [];
const blinkingLEDs = [];
const floatingLabels = [];
const wallMeshes = [];
const doorPivots = [];
let doorsOpen = true;

function registerInteractable(meshOrGroup, dataKey) {
  meshOrGroup.traverse((child) => {
    if (child.isMesh) {
      child.userData.dataKey = dataKey;
      interactables.push(child);
    }
  });
}

function addFloatingLabel(text, position, color = '#38bdf8') {
  const div = document.createElement('div');
  div.style.padding = '3px 8px';
  div.style.background = 'rgba(15, 23, 42, 0.88)';
  div.style.border = `1px solid ${color}`;
  div.style.borderRadius = '6px';
  div.style.color = '#f8fafc';
  div.style.fontSize = '11px';
  div.style.fontWeight = '700';
  div.style.whiteSpace = 'nowrap';
  div.style.boxShadow = '0 2px 8px rgba(0,0,0,0.45)';
  div.textContent = text;

  const label = new CSS2DObject(div);
  label.position.copy(position);
  scene.add(label);
  floatingLabels.push(label);
}

// ============================================================================
// 6. ARQUITECTURA (SIN ARBUSTOS ATRAVESANDO PAREDES Y CON PUERTAS QUE BAJAN)
// ============================================================================
function buildEnvironmentAndArchitecture() {
  // 1. Césped exterior
  const grassGeo = new THREE.PlaneGeometry(48, 38);
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.95 });
  const grass = new THREE.Mesh(grassGeo, grassMat);
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.08;
  grass.receiveShadow = true;
  scene.add(grass);

  // Camino de piedras bien afuera de la puerta derecha (X >= 9.3)
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

  // Arbustos exteriores bien separados de los muros (mínimo 1.8m afuera para nunca atravesar)
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

  // 2. Piso Falso Técnico del Data Center
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

  // 3. Piso de Baldosas Claras de la Oficina
  const officeFloorGeo = new THREE.BoxGeometry(11.2, 0.12, 11.0);
  const officeFloorMat = new THREE.MeshStandardMaterial({
    map: createOfficeTileTexture(),
    roughness: 0.45
  });
  const officeFloor = new THREE.Mesh(officeFloorGeo, officeFloorMat);
  officeFloor.position.set(2.4, 0.06, 0);
  officeFloor.receiveShadow = true;
  scene.add(officeFloor);

  // 4. Muros Blancos Altos (3.6m) con zócalo inferior negro elegante
  const wallHeight = 3.6;
  const wallThickness = 0.24;
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
  const wallTopMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.4 });

  function addWallSegment(x, z, width, depth) {
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

  // Muro Norte (Z = -5.5)
  addWallSegment(0, -5.5, 16.24, wallThickness);
  // Muro Sur (Z = +5.5)
  addWallSegment(0, 5.5, 16.24, wallThickness);
  // Muro Oeste (X = -8.0)
  addWallSegment(-8.0, 0, wallThickness, 11.0);

  // Muro Este (X = +8.0) con abertura central para la puerta doble
  addWallSegment(8.0, -3.45, wallThickness, 4.1);
  addWallSegment(8.0, 3.45, wallThickness, 4.1);

  // Muro Divisor Interno (X = -3.2) con entrada amplia hacia el Data Center (Z de -4.65 a -3.05)
  addWallSegment(-3.2, -5.075, wallThickness, 0.85);
  addWallSegment(-3.2, 1.225, wallThickness, 8.55);

  // 5. Puertas Blancas con Negro (Se agregan a wallMeshes para que bajen junto con los muros)
  const doorHeight = 2.85;
  const doorWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 });
  const doorBlackMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.3, metalness: 0.4 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.35, roughness: 0.1 });

  function createWhiteBlackDoorLeaf(widthZ, zOffsetSign = 1) {
    const leafGroup = new THREE.Group();
    const zCenter = (widthZ / 2) * zOffsetSign;

    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.08, doorHeight, widthZ), doorWhiteMat);
    panel.position.set(0, doorHeight / 2, zCenter);
    panel.castShadow = true;
    leafGroup.add(panel);

    const topTrim = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.1, widthZ + 0.02), doorBlackMat);
    topTrim.position.set(0, doorHeight - 0.05, zCenter);
    leafGroup.add(topTrim);

    const botTrim = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.12, widthZ + 0.02), doorBlackMat);
    botTrim.position.set(0, 0.06, zCenter);
    leafGroup.add(botTrim);

    const sideTrim1 = new THREE.Mesh(new THREE.BoxGeometry(0.11, doorHeight, 0.08), doorBlackMat);
    sideTrim1.position.set(0, doorHeight / 2, 0.04 * zOffsetSign);
    leafGroup.add(sideTrim1);

    const sideTrim2 = new THREE.Mesh(new THREE.BoxGeometry(0.11, doorHeight, 0.08), doorBlackMat);
    sideTrim2.position.set(0, doorHeight / 2, (widthZ - 0.04) * zOffsetSign);
    leafGroup.add(sideTrim2);

    // Marco de mirilla negro + vidrio translúcido
    const visorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.15, 0.24), doorBlackMat);
    visorFrame.position.set(0, doorHeight * 0.58, zCenter);
    leafGroup.add(visorFrame);

    const visorGlass = new THREE.Mesh(new THREE.BoxGeometry(0.11, 1.05, 0.16), glassMat);
    visorGlass.position.set(0, doorHeight * 0.58, zCenter);
    leafGroup.add(visorGlass);

    // Manija tipo barra negra en ambos lados
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.22), doorBlackMat);
    handle.position.set(0, 1.12, (widthZ - 0.22) * zOffsetSign);
    leafGroup.add(handle);

    return leafGroup;
  }

  // Puerta interna Data Center: Abre hacia adentro del Data Center (-X) para dejar 100% libre el pasillo y el escritorio
  const dcDoorPivot = new THREE.Group();
  dcDoorPivot.position.set(-3.2, 0, -4.65);
  dcDoorPivot.add(createWhiteBlackDoorLeaf(1.45, 1));
  dcDoorPivot.rotation.y = -Math.PI * 0.45;
  scene.add(dcDoorPivot);
  doorPivots.push({ pivot: dcDoorPivot, openRot: -Math.PI * 0.45, closedRot: 0 });
  wallMeshes.push(dcDoorPivot); // Baja junto con las paredes

  // Puerta doble principal Este (X = 8.0, Z = -1.4 y Z = +1.4)
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
}

// ============================================================================
// 7. EQUIPAMIENTO DETALLADO DEL DATA CENTER (ENTRADA DESPEJADA Y MODELOS 3D RICOS)
// ============================================================================
function buildDataCenterRoom() {
  const whiteMetalMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.35, metalness: 0.25 });
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.75 });
  const rackPostMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.85 });
  const glassFrontMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.18,
    roughness: 0.1,
    metalness: 0.5
  });

  // 7.1 Unidad de Climatización de Precisión CRAC (Pegada a esquina sup-izq para despejar entrada)
  const acGroup = new THREE.Group();
  const acCabinet = new THREE.Mesh(new THREE.BoxGeometry(0.95, 2.35, 1.85), whiteMetalMat);
  acCabinet.position.set(-7.3, 1.25, -4.3);
  acCabinet.castShadow = true;
  acGroup.add(acCabinet);

  // Rejillas y panel digital del climatizador CRAC
  const acVent = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.75, 1.55), darkMetalMat);
  acVent.position.set(-6.81, 1.9, -4.3);
  acGroup.add(acVent);

  const acDisplay = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.18, 0.35),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
  );
  acDisplay.position.set(-6.81, 1.32, -4.3);
  acGroup.add(acDisplay);

  // Split de Aire Acondicionado sobre la pared del Rack
  const wallSplit = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.38, 0.4), whiteMetalMat);
  wallSplit.position.set(-6.3, 2.45, -1.65);
  wallSplit.castShadow = true;
  acGroup.add(wallSplit);

  const splitFlap = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 0.42), darkMetalMat);
  splitFlap.position.set(-6.3, 2.32, -1.64);
  acGroup.add(splitFlap);

  scene.add(acGroup);
  registerInteractable(acGroup, 'ac_unit');
  addFloatingLabel('Climatizacion Data Center', new THREE.Vector3(-7.3, 2.75, -4.3), '#38bdf8');

  // Estantería técnica de herramientas/repuestos (Movida hacia X = -5.75, Z = -4.9 para que la puerta quede totalmente despejada)
  const shelfGroup = new THREE.Group();
  const shelfBack = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.1, 0.08), whiteMetalMat);
  shelfBack.position.set(-5.75, 1.15, -5.28);
  shelfGroup.add(shelfBack);

  for (let i = 0; i < 4; i++) {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.65), whiteMetalMat);
    plate.position.set(-5.75, 0.35 + i * 0.55, -4.98);
    plate.castShadow = true;
    shelfGroup.add(plate);

    if (i < 3) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.32, 0.45), darkMetalMat);
      box.position.set(-6.0 + i * 0.25, 0.54 + i * 0.55, -4.95);
      shelfGroup.add(box);
    }
  }
  scene.add(shelfGroup);

  // 7.2 RACK PRINCIPAL DE SERVIDORES 42U DETALLADO (Con postes verticales, techo con extractores y puerta acrílica)
  const rackGroup = new THREE.Group();
  rackGroup.position.set(-6.2, 0.16, 0.2);

  // Base y techo del gabinete
  const rackBase = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.12, 2.1), rackPostMat);
  rackBase.position.y = 0.06;
  rackGroup.add(rackBase);

  const rackRoof = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.12, 2.1), rackPostMat);
  rackRoof.position.y = 2.48;
  rackRoof.castShadow = true;
  rackGroup.add(rackRoof);

  // 4 Columnas estructurales del Rack
  const postPositions = [
    [-0.88, -0.98],
    [0.88, -0.98],
    [-0.88, 0.98],
    [0.88, 0.98]
  ];
  postPositions.forEach(([px, pz]) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.45, 0.12), rackPostMat);
    post.position.set(px, 1.25, pz);
    post.castShadow = true;
    rackGroup.add(post);
  });

  // Paneles laterales semi-abiertos y puerta frontal de vidrio templado
  const sidePanelL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.35, 1.9), darkMetalMat);
  sidePanelL.position.set(-0.9, 1.25, 0);
  rackGroup.add(sidePanelL);

  const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.35, 1.9), glassFrontMat);
  frontGlass.position.set(0.9, 1.25, 0);
  rackGroup.add(frontGlass);

  scene.add(rackGroup);
  registerInteractable(rackGroup, 'rack_main');
  addFloatingLabel('Rack Principal + Servidores UNAB', new THREE.Vector3(-6.2, 2.95, 0.2), '#22c55e');

  // 7.3 SERVIDORES RACK (Bahías de discos Hot-Swap, asas metálicas y LEDs de estado)
  const serversGroup = new THREE.Group();
  serversGroup.position.copy(rackGroup.position);

  // 4 Nodos Blade superiores
  for (let i = 0; i < 4; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.58, 1.55), darkMetalMat);
    blade.position.set(-0.57 + i * 0.38, 2.08, -0.1);
    blade.castShadow = true;
    serversGroup.add(blade);

    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.06), whiteMetalMat);
    handle.position.set(-0.57 + i * 0.38, 1.88, 0.7);
    serversGroup.add(handle);

    const ledGreen = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x4ade80 })
    );
    ledGreen.position.set(-0.57 + i * 0.38, 2.28, 0.7);
    serversGroup.add(ledGreen);
    blinkingLEDs.push({ mesh: ledGreen, speed: 3 + i, baseColor: 0x4ade80 });
  }

  // 3 Servidores Rack 2U horizontales con bahías de discos SSD
  for (let r = 0; r < 3; r++) {
    const yPos = 1.48 - r * 0.42;
    const srv = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.32, 1.65), darkMetalMat);
    srv.position.set(0, yPos, 0);
    srv.castShadow = true;
    serversGroup.add(srv);

    // Bahías frontales de discos duros
    for (let b = 0; b < 6; b++) {
      const caddy = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 0.04), rackPostMat);
      caddy.position.set(-0.62 + b * 0.22, yPos, 0.84);
      serversGroup.add(caddy);
    }

    const ledG = new THREE.Mesh(
      new THREE.SphereGeometry(0.032, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x22c55e })
    );
    ledG.position.set(0.68, yPos + 0.05, 0.85);
    serversGroup.add(ledG);
    blinkingLEDs.push({ mesh: ledG, speed: 5 + r * 2, baseColor: 0x22c55e });

    const ledB = new THREE.Mesh(
      new THREE.SphereGeometry(0.032, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    ledB.position.set(0.56, yPos + 0.05, 0.85);
    serversGroup.add(ledB);
    blinkingLEDs.push({ mesh: ledB, speed: 2.5 + r, baseColor: 0x38bdf8 });
  }

  scene.add(serversGroup);
  registerInteractable(serversGroup, 'server_gps');

  // 7.4 GABINETE DE CONMUTACIÓN: SWITCH CORE 24 PUERTOS + PATCH PANEL CAT6A (Z = 1.95)
  const switchGroup = new THREE.Group();
  switchGroup.position.set(-6.2, 0.16, 1.95);

  const swCabinet = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.15, 0.65), rackPostMat);
  swCabinet.position.y = 0.575;
  swCabinet.castShadow = true;
  switchGroup.add(swCabinet);

  // Chasis Switch + Patch Panel superior
  const patchPanelMesh = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.16, 0.68), darkMetalMat);
  patchPanelMesh.position.y = 1.02;
  switchGroup.add(patchPanelMesh);

  const switchMesh = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.18, 0.68), whiteMetalMat);
  switchMesh.position.y = 0.78;
  switchGroup.add(switchMesh);

  // 12 puertos RJ45 con LEDs de actividad y latiguillos cortos (Patch Cords) entre Switch y Patch Panel
  const patchCordMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 });
  for (let p = 0; p < 10; p++) {
    const px = -0.5 + p * 0.11;
    const portLed = new THREE.Mesh(
      new THREE.BoxGeometry(0.045, 0.035, 0.03),
      new THREE.MeshBasicMaterial({ color: p % 2 === 0 ? 0x38bdf8 : 0x4ade80 })
    );
    portLed.position.set(px, 0.8, 0.35);
    switchGroup.add(portLed);
    blinkingLEDs.push({ mesh: portLed, speed: 6 + p, baseColor: 0x38bdf8 });

    // Pequeño arco de patch cord conectando Switch -> Patch Panel
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(px, 0.78, 0.34),
      new THREE.Vector3(px, 0.9, 0.44),
      new THREE.Vector3(px, 1.02, 0.34)
    ]);
    const cord = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.012, 6, false), patchCordMat);
    switchGroup.add(cord);
  }

  scene.add(switchGroup);
  registerInteractable(switchGroup, 'switch_core');
  addFloatingLabel('Switch Core + Patch Panel', new THREE.Vector3(-6.2, 1.65, 1.95), '#38bdf8');

  // 7.5 ROUTER / GATEWAY WAN CON DOBLE ANTENA Y FIREWALL (Z = 3.1)
  const routerGroup = new THREE.Group();
  routerGroup.position.set(-6.2, 0.16, 3.1);

  const routerPedestal = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.65, 0.65), rackPostMat);
  routerPedestal.position.y = 0.325;
  routerPedestal.castShadow = true;
  routerGroup.add(routerPedestal);

  const routerChassis = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.22, 0.58), whiteMetalMat);
  routerChassis.position.y = 0.76;
  routerChassis.castShadow = true;
  routerGroup.add(routerChassis);

  // 2 Antenas omnidireccionales verticales
  [-0.38, 0.38].forEach((ax) => {
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.55, 10), darkMetalMat);
    ant.position.set(ax, 1.1, -0.2);
    routerGroup.add(ant);
  });

  // Firewall / ONT Fibra debajo
  const firewallChassis = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.18, 0.58), darkMetalMat);
  firewallChassis.position.set(0, 0.52, 0.04);
  routerGroup.add(firewallChassis);

  scene.add(routerGroup);
  registerInteractable(routerGroup, 'router_gateway');
  addFloatingLabel('Router / Gateway GPS WAN', new THREE.Vector3(-6.2, 1.55, 3.1), '#f59e0b');

  // 7.6 UPS ONLINE TORRE DOBLE CONVERSIÓN (Abajo en el cuarto de servidores)
  const upsGroup = new THREE.Group();
  upsGroup.position.set(-4.55, 0.16, 4.45);

  const upsBody = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.85, 0.68), rackPostMat);
  upsBody.position.y = 0.425;
  upsBody.castShadow = true;
  upsGroup.add(upsBody);

  const upsBezel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.75, 0.58), darkMetalMat);
  upsBezel.position.set(0.66, 0.425, 0);
  upsGroup.add(upsBezel);

  const upsScreen = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.22, 0.35),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
  );
  upsScreen.position.set(0.67, 0.62, 0);
  upsGroup.add(upsScreen);

  scene.add(upsGroup);
  registerInteractable(upsGroup, 'ups_power');
  addFloatingLabel('UPS Respaldo 3000VA', new THREE.Vector3(-4.55, 1.38, 4.45), '#4ade80');
}

// ============================================================================
// 8. SALA DE MONITOREO CON MOBILIARIO Y EQUIPOS 3D DETALLADOS
// ============================================================================
function createWorkstationDesk({ x, z, rotationY = 0, screenVariant = 1, hasTower = true, dataKey }) {
  const group = new THREE.Group();
  group.position.set(x, 0.12, z);
  group.rotation.y = rotationY;

  const woodDeskMat = new THREE.MeshStandardMaterial({ color: 0xd6c7b2, roughness: 0.55 });
  const legMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6, roughness: 0.35 });
  const darkPlastic = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.35 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 });

  // Tablero del escritorio con borde biselado
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.85, 0.08, 1.3), woodDeskMat);
  top.position.y = 0.78;
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);

  // Cajonera con 3 gavetas y tiradores metálicos
  const drawerBox = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.72, 1.18), woodDeskMat);
  drawerBox.position.set(-0.98, 0.38, 0);
  drawerBox.castShadow = true;
  group.add(drawerBox);

  for (let d = 0; d < 3; d++) {
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.04), chromeMat);
    handle.position.set(-0.98, 0.22 + d * 0.2, 0.6);
    group.add(handle);
  }

  // Estructura de patas metálicas en U
  const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.74, 0.07), legMat);
  leg1.position.set(1.32, 0.38, -0.55);
  const leg2 = leg1.clone();
  leg2.position.set(1.32, 0.38, 0.55);
  const legBar = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 1.16), legMat);
  legBar.position.set(1.32, 0.06, 0);
  group.add(leg1, leg2, legBar);

  // Monitor Ultrawide con base plana, brazo articulado y pantalla GPS UNAB
  const monitorBase = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.03, 0.28), darkPlastic);
  monitorBase.position.set(-0.05, 0.83, -0.34);
  group.add(monitorBase);

  const monitorNeck = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.38, 0.08), legMat);
  monitorNeck.position.set(-0.05, 1.02, -0.38);
  group.add(monitorNeck);

  const monitorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.84, 0.06), darkPlastic);
  monitorFrame.position.set(-0.05, 1.38, -0.32);
  monitorFrame.castShadow = true;
  group.add(monitorFrame);

  const screenGeo = new THREE.PlaneGeometry(1.34, 0.76);
  const screenMat = new THREE.MeshBasicMaterial({ map: createBusMapScreenTexture(screenVariant) });
  const screenMesh = new THREE.Mesh(screenGeo, screenMat);
  screenMesh.position.set(-0.05, 1.38, -0.285);
  group.add(screenMesh);

  // Teclado con reposamuñecas, Mousepad y Mouse
  const keyboard = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.03, 0.24), darkPlastic);
  keyboard.position.set(-0.08, 0.84, 0.18);
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

  // Case / Torre PC con panel lateral y botón de encendido LED
  if (hasTower) {
    const tower = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.78, 0.78), darkPlastic);
    tower.position.set(1.06, 1.21, -0.1);
    tower.castShadow = true;
    group.add(tower);

    const pwrLed = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.03, 0.02),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    pwrLed.position.set(1.06, 1.52, 0.3);
    group.add(pwrLed);

    const binderColors = [0xdc2626, 0x2563eb, 0x0f172a];
    binderColors.forEach((col, idx) => {
      const binder = new THREE.Mesh(
        new THREE.BoxGeometry(0.13, 0.48, 0.36),
        new THREE.MeshStandardMaterial({ color: col })
      );
      binder.position.set(-1.15 + idx * 0.16, 1.06, -0.28);
      binder.castShadow = true;
      group.add(binder);
    });
  }

  // Silla ergonómica detallada (Base estrella de 5 ruedas, pistón, posabrazos y respaldo)
  const chairGroup = new THREE.Group();
  chairGroup.position.set(-0.05, 0, 0.98);
  const chairMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.55 });

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.1, 0.68), chairMat);
  seat.position.y = 0.52;
  seat.castShadow = true;
  chairGroup.add(seat);

  const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.78, 0.1), chairMat);
  backrest.position.set(0, 0.95, 0.32);
  backrest.castShadow = true;
  chairGroup.add(backrest);

  // Posabrazos en T
  [-0.38, 0.38].forEach((ax) => {
    const armVert = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.24, 0.05), darkPlastic);
    armVert.position.set(ax, 0.62, 0.05);
    const armPad = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.04, 0.32), darkPlastic);
    armPad.position.set(ax, 0.74, 0.05);
    chairGroup.add(armVert, armPad);
  });

  // Pistón central y estrella de 5 patas con ruedas
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

function buildMonitoringOffice() {
  // PC Operador 1 movida ligeramente a la derecha (X = 0.85) para dejar un corredor amplio frente a la puerta del servidor
  createWorkstationDesk({
    x: 0.85,
    z: -3.85,
    rotationY: 0,
    screenVariant: 1,
    hasTower: true,
    dataKey: 'pc_monitor_1'
  });
  addFloatingLabel('PC Monitoreo #1 (Mapa GPS)', new THREE.Vector3(0.85, 2.25, -4.1), '#38bdf8');

  // PC Operador 2
  createWorkstationDesk({
    x: 5.4,
    z: -3.85,
    rotationY: 0,
    screenVariant: 2,
    hasTower: true,
    dataKey: 'pc_monitor_2'
  });
  addFloatingLabel('PC Monitoreo #2 (Salidas/Llegadas)', new THREE.Vector3(5.4, 2.25, -4.1), '#38bdf8');

  // PC Administración de Red
  createWorkstationDesk({
    x: 4.1,
    z: 4.15,
    rotationY: Math.PI,
    screenVariant: 1,
    hasTower: false,
    dataKey: 'pc_admin'
  });
  addFloatingLabel('PC Administracion de Red', new THREE.Vector3(4.1, 2.25, 4.35), '#4ade80');

  // Impresora Multifuncional Corporativa sobre mesa
  const printerGroup = new THREE.Group();
  printerGroup.position.set(-1.75, 0.12, 0.65);

  const tableMat = new THREE.MeshStandardMaterial({ color: 0xd6c7b2, roughness: 0.6 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
  const lightGrayMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 });

  const pTable = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.76, 1.15), tableMat);
  pTable.position.y = 0.38;
  pTable.castShadow = true;
  printerGroup.add(pTable);

  const printerBase = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.42, 0.75), lightGrayMat);
  printerBase.position.y = 0.97;
  printerBase.castShadow = true;
  printerGroup.add(printerBase);

  const scannerTop = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.12, 0.78), darkMat);
  scannerTop.position.y = 1.24;
  printerGroup.add(scannerTop);

  const paper = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.02, 0.38),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  paper.position.set(0, 0.88, 0.44);
  printerGroup.add(paper);

  scene.add(printerGroup);
  registerInteractable(printerGroup, 'printer_net');
  addFloatingLabel('Impresora en Red', new THREE.Vector3(-1.75, 1.65, 0.65), '#f59e0b');

  // Muebles y Archivadores laterales
  const brownWood = new THREE.MeshStandardMaterial({ color: 0x8c5a3c, roughness: 0.6 });
  const whiteCabinetMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.45 });

  const cab1 = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.35, 1.55), brownWood);
  cab1.position.set(-2.55, 0.79, -1.1);
  cab1.castShadow = true;
  scene.add(cab1);

  const cab2 = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.95, 2.0), whiteCabinetMat);
  cab2.position.set(-2.5, 1.09, 3.5);
  cab2.castShadow = true;
  scene.add(cab2);

  const cab3 = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.95, 1.05), brownWood);
  cab3.position.set(6.55, 0.59, 4.25);
  cab3.castShadow = true;
  scene.add(cab3);
}

// ============================================================================
// 9. CABLEADO ESTRUCTURADO PROFESIONAL (DELGADO, ORDENADO POR PARED Y CANALETA)
// ============================================================================
// En instalaciones reales (ANSI/TIA-568), los cables NUNCA van sueltos a mitad del
// salón; viajan pegados a las paredes dentro de canaletas perimetrales de PVC,
// entran por pasamuros, llegan a cajas toma de red (faceplates RJ45) y de ahí
// suben ordenadamente a cada estación de trabajo.
const dataPackets = [];
let packetsEnabled = true;

function buildStructuredCabling() {
  const cablingGroup = new THREE.Group();
  const trayMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.3, metalness: 0.2 });
  const faceplateMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });

  function addCableTray(x, y, z, w, h, d) {
    const tray = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), trayMat);
    tray.position.set(x, y, z);
    tray.receiveShadow = true;
    cablingGroup.add(tray);
  }

  function addWallFaceplate(x, y, z, rotY = 0) {
    const fp = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.05), faceplateMat);
    fp.position.set(x, y, z);
    fp.rotation.y = rotY;
    cablingGroup.add(fp);
  }

  // 1. Canaletas perimetrales de PVC adosadas a los muros (ningún cable suelto cruzando el piso)
  // Canaleta Muro Norte (detrás de PC 1 y PC 2, desde el muro divisor X = -3.1 hasta X = 6.6)
  addCableTray(1.75, 0.32, -5.34, 9.7, 0.1, 0.08);
  // Canaleta Muro Divisor lado Oficina (X = -3.05, desde Z = -5.3 hasta Z = 5.3)
  addCableTray(-3.05, 0.32, 0.0, 0.08, 0.1, 10.6);
  // Canaleta Muro Sur hacia PC Administración (Z = 5.34, desde X = -3.05 hasta X = 4.2)
  addCableTray(0.58, 0.32, 5.34, 7.3, 0.1, 0.08);
  // Bandeja portacables interna del Data Center (X = -4.9, conectando Rack, Switch, Router y UPS)
  addCableTray(-4.9, 0.2, 1.2, 0.18, 0.06, 6.8);

  // Cajas Toma de Red RJ45 (Faceplates) en la pared detrás de cada equipo
  addWallFaceplate(1.9, 0.45, -5.32, 0); // Toma PC 1
  addWallFaceplate(6.45, 0.45, -5.32, 0); // Toma PC 2
  addWallFaceplate(-3.03, 0.45, 0.65, Math.PI / 2); // Toma Impresora
  addWallFaceplate(4.1, 0.45, 5.32, Math.PI); // Toma PC Admin

  // 2. Rutas ortogonales limpias y delgadas (Radio 0.018m) con pequeños offsets para que vayan en paralelo sin superponerse
  const cableRoutes = [
    // Cable 1: Switch Core -> Pasamuros -> Canaleta Divisor -> Canaleta Norte -> PC Monitoreo 1
    [
      new THREE.Vector3(-5.6, 0.78, 1.92),
      new THREE.Vector3(-4.92, 0.24, 1.92),
      new THREE.Vector3(-4.92, 0.24, -2.1),
      new THREE.Vector3(-3.04, 0.35, -2.1),
      new THREE.Vector3(-3.04, 0.35, -5.32),
      new THREE.Vector3(1.91, 0.35, -5.32),
      new THREE.Vector3(1.91, 1.15, -3.95)
    ],
    // Cable 2: Switch Core -> Pasamuros -> Canaleta Divisor -> Canaleta Norte -> PC Monitoreo 2
    [
      new THREE.Vector3(-5.6, 0.78, 1.96),
      new THREE.Vector3(-4.88, 0.24, 1.96),
      new THREE.Vector3(-4.88, 0.24, -2.15),
      new THREE.Vector3(-3.02, 0.31, -2.15),
      new THREE.Vector3(-3.02, 0.31, -5.3),
      new THREE.Vector3(6.46, 0.31, -5.3),
      new THREE.Vector3(6.46, 1.15, -3.95)
    ],
    // Cable 3: Switch Core -> Pasamuros -> Canaleta Divisor -> Toma Pared -> Impresora en Red
    [
      new THREE.Vector3(-5.6, 0.78, 2.0),
      new THREE.Vector3(-4.85, 0.24, 2.0),
      new THREE.Vector3(-4.85, 0.24, 0.65),
      new THREE.Vector3(-3.02, 0.33, 0.65),
      new THREE.Vector3(-1.75, 0.33, 0.65),
      new THREE.Vector3(-1.75, 0.95, 0.65)
    ],
    // Cable 4: Switch Core -> Pasamuros -> Canaleta Divisor -> Canaleta Sur -> PC Administración
    [
      new THREE.Vector3(-5.6, 0.78, 2.04),
      new THREE.Vector3(-4.9, 0.24, 2.04),
      new THREE.Vector3(-3.04, 0.29, 2.04),
      new THREE.Vector3(-3.04, 0.29, 5.32),
      new THREE.Vector3(4.1, 0.29, 5.32),
      new THREE.Vector3(4.1, 1.1, 4.35)
    ],
    // Cable 5 (Troncal Data Center): Router WAN -> Switch Core -> Servidor Principal en Rack
    [
      new THREE.Vector3(-5.8, 0.75, 3.1),
      new THREE.Vector3(-4.94, 0.26, 3.1),
      new THREE.Vector3(-4.94, 0.26, 1.95),
      new THREE.Vector3(-5.6, 0.78, 1.95),
      new THREE.Vector3(-4.94, 0.26, 1.95),
      new THREE.Vector3(-4.94, 0.26, 0.2),
      new THREE.Vector3(-5.5, 1.2, 0.2)
    ],
    // Cable 6 (Línea UPS Respaldo): UPS -> Router -> Switch -> Rack
    [
      new THREE.Vector3(-4.55, 0.35, 4.45),
      new THREE.Vector3(-4.86, 0.22, 4.45),
      new THREE.Vector3(-4.86, 0.22, 0.2),
      new THREE.Vector3(-5.5, 0.9, 0.2)
    ]
  ];

  const cableMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    emissive: 0x0369a1,
    emissiveIntensity: 0.35,
    roughness: 0.25
  });

  const packetGeo = new THREE.SphereGeometry(0.055, 10, 10);
  const packetMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

  // Función que genera esquinas rectas limpias (sin curvas grandes desordenadas)
  function createCleanPathCurve(pts) {
    const path = new THREE.CurvePath();
    for (let i = 0; i < pts.length - 1; i++) {
      path.add(new THREE.LineCurve3(pts[i], pts[i + 1]));
    }
    return path;
  }

  cableRoutes.forEach((points, routeIndex) => {
    const curvePath = createCleanPathCurve(points);
    const tubeGeo = new THREE.TubeGeometry(curvePath, 100, 0.018, 8, false);
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
  addFloatingLabel('Canaleta y Cableado UTP Cat6A', new THREE.Vector3(-3.0, 0.9, -2.0), '#0284c7');
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

// Manejo suave de rotación en Primera Persona (Filtra saltos bruscos del PointerLock en Windows)
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
  }
});

document.getElementById('btn-close-inspector').addEventListener('click', () => {
  inspectorPanel.classList.add('hidden');
});

// ============================================================================
// 11. BOTONES DE INTERFAZ Y MENÚ DESPLEGABLE DE VISTAS RÁPIDAS
// ============================================================================
const btnOrbit = document.getElementById('btn-mode-orbit');
const btnFps = document.getElementById('btn-mode-fps');
const fpsCrosshair = document.getElementById('fps-crosshair');

const btnToggleViews = document.getElementById('btn-toggle-views');
const viewsDropdownMenu = document.getElementById('views-dropdown-menu');
const btnCloseViews = document.getElementById('btn-close-views');

btnToggleViews.addEventListener('click', () => {
  const isHidden = viewsDropdownMenu.classList.toggle('hidden');
  btnToggleViews.classList.toggle('active', !isHidden);
});

btnCloseViews.addEventListener('click', () => {
  viewsDropdownMenu.classList.add('hidden');
  btnToggleViews.classList.remove('active');
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

function activateOrbitMode() {
  currentMode = 'orbit';
  clearMovementKeys();
  if (document.pointerLockElement) document.exitPointerLock();
  orbitControls.enabled = true;
  btnOrbit.classList.add('active');
  btnFps.classList.remove('active');
  fpsCrosshair.classList.add('hidden');
}

function activateFpsMode() {
  currentMode = 'fps';
  clearMovementKeys();
  orbitControls.enabled = false;
  btnFps.classList.add('active');
  btnOrbit.classList.remove('active');
  fpsCrosshair.classList.remove('hidden');
  viewsDropdownMenu.classList.add('hidden');
  btnToggleViews.classList.remove('active');

  // Posición inicial cómoda mirando hacia la puerta del cuarto de servidores
  camera.position.set(1.5, 1.7, 0.5);
  yaw = Math.PI / 2;
  pitch = 0;
  targetYaw = yaw;
  targetPitch = pitch;

  renderer.domElement.requestPointerLock();
}

document.addEventListener('pointerlockchange', () => {
  isPointerLocked = document.pointerLockElement === renderer.domElement;
  if (!isPointerLocked && currentMode === 'fps') {
    activateOrbitMode();
  }
});

window.addEventListener('blur', clearMovementKeys);

btnOrbit.addEventListener('click', activateOrbitMode);
btnFps.addEventListener('click', activateFpsMode);

let cameraTransition = null;
function flyToCamera(pos, target) {
  activateOrbitMode();
  cameraTransition = {
    startPos: camera.position.clone(),
    endPos: new THREE.Vector3(...pos),
    startTarget: orbitControls.target.clone(),
    endTarget: new THREE.Vector3(...target),
    alpha: 0
  };
}

const CAMERA_VIEWS = {
  top: { pos: [0, 22, 0.01], target: [0, 0, 0] },
  iso: { pos: [0, 17, 16], target: [0, 0.8, 0] },
  datacenter: { pos: [-1.5, 5.2, 4.0], target: [-6.0, 1.2, 0.8] },
  cabling: { pos: [-1.2, 5.4, 2.2], target: [-3.5, 0.4, -0.8] },
  monitoring: { pos: [2.8, 3.8, 0.8], target: [2.8, 1.3, -4.0] }
};

document.querySelectorAll('.preset-btn[data-view]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const viewName = btn.getAttribute('data-view');
    if (viewName === 'door') {
      doorsOpen = !doorsOpen;
      return;
    }
    const v = CAMERA_VIEWS[viewName];
    if (v) flyToCamera(v.pos, v.target);
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

// Toggle Altura de Muros y Puertas al mismo tiempo
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
    case 'Digit1':
      activateOrbitMode();
      break;
    case 'Digit2':
      activateFpsMode();
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
// 12. BUCLE DE ANIMACIÓN PRINCIPAL (CON MOVIMIENTO SUAVE E INERCIA EN 1RA PERSONA)
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
    // Interpolación suave de la mirada (evita que la cámara se quede colgada o salte)
    const lookSmoothing = Math.min(1, delta * 18);
    yaw += (targetYaw - yaw) * lookSmoothing;
    pitch += (targetPitch - pitch) * lookSmoothing;

    euler.set(pitch, yaw, 0, 'YXZ');
    camera.quaternion.setFromEuler(euler);

    // Dirección de avance horizontal en el plano XZ
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

    // Aceleración y frenado suaves
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
