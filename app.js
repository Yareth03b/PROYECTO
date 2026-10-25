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

const sunLight = new THREE.DirectionalLight(0xfffbeb, 1.3);
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
dcLight.position.set(-5.8, 2.9, 0.5);
scene.add(dcLight);

const officeLight = new THREE.PointLight(0xf8fafc, 1.1, 18);
officeLight.position.set(2.5, 2.95, 0);
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
// 6. ARQUITECTURA + FALSO CIELO RASO RETICULAR CON LUMINARIAS EMPOTRADAS
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

  // Muros Blancos Altos (3.6m)
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

  addWallSegment(0, -5.5, 16.24, wallThickness);
  addWallSegment(0, 5.5, 16.24, wallThickness);
  addWallSegment(-8.0, 0, wallThickness, 11.0);
  addWallSegment(8.0, -3.45, wallThickness, 4.1);
  addWallSegment(8.0, 3.45, wallThickness, 4.1);

  // Muro Divisor Interno (X = -3.2) con abertura para puerta en Z de -4.65 a -3.20
  addWallSegment(-3.2, -5.075, wallThickness, 0.85);
  addWallSegment(-3.2, 1.15, wallThickness, 8.7);

  // Puertas Blancas con Negro
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

    const visorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.15, 0.24), doorBlackMat);
    visorFrame.position.set(0, doorHeight * 0.58, zCenter);
    leafGroup.add(visorFrame);

    const visorGlass = new THREE.Mesh(new THREE.BoxGeometry(0.11, 1.05, 0.16), glassMat);
    visorGlass.position.set(0, doorHeight * 0.58, zCenter);
    leafGroup.add(visorGlass);

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

  // Falso Cielo Raso Acústico (Y = 3.15m)
  const ceilingTex = createAcousticCeilingTexture();
  const ceilingMat = new THREE.MeshStandardMaterial({
    map: ceilingTex,
    roughness: 0.75,
    side: THREE.DoubleSide
  });

  const ceilingSlab = new THREE.Mesh(new THREE.BoxGeometry(15.8, 0.05, 10.8), ceilingMat);
  ceilingSlab.position.set(0, 3.15, 0);
  ceilingGroup.add(ceilingSlab);

  const gridRailMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.4, roughness: 0.3 });
  for (let gx = -7.0; gx <= 7.0; gx += 2.0) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 10.8), gridRailMat);
    beam.position.set(gx, 3.14, 0);
    ceilingGroup.add(beam);
  }
  for (let gz = -4.5; gz <= 4.5; gz += 1.5) {
    const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(15.8, 0.06, 0.05), gridRailMat);
    crossBeam.position.set(0, 3.14, gz);
    ceilingGroup.add(crossBeam);
  }

  const lightFrameMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.6, roughness: 0.25 });
  const lightPanelMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const ceilingLightsCoords = [
    [-5.8, -2.25],
    [-5.8, 2.25],
    [0.0, -2.25],
    [0.0, 2.25],
    [5.0, -2.25],
    [5.0, 2.25]
  ];
  ceilingLightsCoords.forEach(([lx, lz]) => {
    const lFrame = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.07, 0.62), lightFrameMat);
    lFrame.position.set(lx, 3.14, lz);
    const lGlow = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.075, 0.52), lightPanelMat);
    lGlow.position.set(lx, 3.135, lz);
    ceilingGroup.add(lFrame, lGlow);
  });
}

// ============================================================================
// 7. EQUIPAMIENTO DEL DATA CENTER (EQUIPOS PEGADOS A LA PARED OESTE CON CANALETAS EN LA PARED)
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

  // 7.1 Unidad de Climatización CRAC (Pegada a la pared oeste X = -7.35, Z = -4.2)
  const acGroup = new THREE.Group();
  const acCabinet = new THREE.Mesh(new THREE.BoxGeometry(0.95, 2.35, 1.8), whiteMetalMat);
  acCabinet.position.set(-7.35, 1.25, -4.2);
  acCabinet.castShadow = true;
  acGroup.add(acCabinet);

  const acVent = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.75, 1.5), darkMetalMat);
  acVent.position.set(-6.86, 1.9, -4.2);
  acGroup.add(acVent);

  const acDisplay = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.18, 0.35),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
  );
  acDisplay.position.set(-6.86, 1.32, -4.2);
  acGroup.add(acDisplay);

  // Split de Aire Acondicionado en la pared oeste sobre el Rack
  const wallSplit = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.38, 1.85), whiteMetalMat);
  wallSplit.position.set(-7.65, 2.65, -2.0);
  wallSplit.castShadow = true;
  acGroup.add(wallSplit);

  scene.add(acGroup);
  registerInteractable(acGroup, 'ac_unit');
  addFloatingLabel('Climatizacion Data Center', new THREE.Vector3(-7.35, 2.75, -4.2), '#38bdf8');

  // Estantería técnica en la pared norte
  const shelfGroup = new THREE.Group();
  const shelfBack = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.1, 0.08), whiteMetalMat);
  shelfBack.position.set(-5.6, 1.15, -5.28);
  shelfGroup.add(shelfBack);

  for (let i = 0; i < 4; i++) {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.65), whiteMetalMat);
    plate.position.set(-5.6, 0.35 + i * 0.55, -4.98);
    plate.castShadow = true;
    shelfGroup.add(plate);

    if (i < 3) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.32, 0.45), darkMetalMat);
      box.position.set(-5.85 + i * 0.25, 0.54 + i * 0.55, -4.95);
      shelfGroup.add(box);
    }
  }
  scene.add(shelfGroup);

  // 7.2 RACK PRINCIPAL DE SERVIDORES 42U (Pegado hacia la pared izquierda/oeste: X = -6.75, Z = -0.1)
  const rackGroup = new THREE.Group();
  rackGroup.position.set(-6.75, 0.16, -0.1);

  const rackBase = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.12, 2.0), rackPostMat);
  rackBase.position.y = 0.06;
  rackGroup.add(rackBase);

  const rackRoof = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.12, 2.0), rackPostMat);
  rackRoof.position.y = 2.24;
  rackRoof.castShadow = true;
  rackGroup.add(rackRoof);

  const postPositions = [
    [-0.8, -0.92],
    [0.8, -0.92],
    [-0.8, 0.92],
    [0.8, 0.92]
  ];
  postPositions.forEach(([px, pz]) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.25, 0.12), rackPostMat);
    post.position.set(px, 1.15, pz);
    post.castShadow = true;
    rackGroup.add(post);
  });

  const sidePanelL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.15, 1.8), darkMetalMat);
  sidePanelL.position.set(-0.82, 1.15, 0);
  rackGroup.add(sidePanelL);

  const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.15, 1.8), glassFrontMat);
  frontGlass.position.set(0.82, 1.15, 0);
  rackGroup.add(frontGlass);

  scene.add(rackGroup);
  registerInteractable(rackGroup, 'rack_main');
  addFloatingLabel('Rack Principal + Servidores UNAB', new THREE.Vector3(-6.75, 2.65, -0.1), '#22c55e');

  // 7.3 SERVIDORES RACK (Sin ningún tubo ni cable atravesando el frente del gabinete)
  const serversGroup = new THREE.Group();
  serversGroup.position.copy(rackGroup.position);

  for (let i = 0; i < 4; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.52, 1.45), darkMetalMat);
    blade.position.set(-0.52 + i * 0.35, 1.9, -0.05);
    blade.castShadow = true;
    serversGroup.add(blade);

    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.06), whiteMetalMat);
    handle.position.set(-0.52 + i * 0.35, 1.72, 0.7);
    serversGroup.add(handle);

    const ledGreen = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x4ade80 })
    );
    ledGreen.position.set(-0.52 + i * 0.35, 2.08, 0.7);
    serversGroup.add(ledGreen);
    blinkingLEDs.push({ mesh: ledGreen, speed: 3 + i, baseColor: 0x4ade80 });
  }

  for (let r = 0; r < 3; r++) {
    const yPos = 1.35 - r * 0.4;
    const srv = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.3, 1.55), darkMetalMat);
    srv.position.set(0, yPos, 0);
    srv.castShadow = true;
    serversGroup.add(srv);

    for (let b = 0; b < 6; b++) {
      const caddy = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, 0.04), rackPostMat);
      caddy.position.set(-0.56 + b * 0.2, yPos, 0.79);
      serversGroup.add(caddy);
    }

    const ledG = new THREE.Mesh(
      new THREE.SphereGeometry(0.032, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x22c55e })
    );
    ledG.position.set(0.62, yPos + 0.05, 0.8);
    serversGroup.add(ledG);
    blinkingLEDs.push({ mesh: ledG, speed: 5 + r * 2, baseColor: 0x22c55e });

    const ledB = new THREE.Mesh(
      new THREE.SphereGeometry(0.032, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    ledB.position.set(0.5, yPos + 0.05, 0.8);
    serversGroup.add(ledB);
    blinkingLEDs.push({ mesh: ledB, speed: 2.5 + r, baseColor: 0x38bdf8 });
  }

  scene.add(serversGroup);
  registerInteractable(serversGroup, 'server_gps');

  // 7.4 GABINETE DE CONMUTACIÓN: SWITCH CORE + PATCH PANEL (Pegado a la pared oeste: X = -6.95, Z = 1.85)
  const switchGroup = new THREE.Group();
  switchGroup.position.set(-6.95, 0.16, 1.85);

  const swCabinet = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.15, 0.65), rackPostMat);
  swCabinet.position.y = 0.575;
  swCabinet.castShadow = true;
  switchGroup.add(swCabinet);

  const patchPanelMesh = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.16, 0.68), darkMetalMat);
  patchPanelMesh.position.y = 1.02;
  switchGroup.add(patchPanelMesh);

  const switchMesh = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.18, 0.68), whiteMetalMat);
  switchMesh.position.y = 0.78;
  switchGroup.add(switchMesh);

  // Latiguillos cortos (Patch Cords) limpios en el frente entre el Switch y el Patch Panel
  const patchCordMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 });
  for (let p = 0; p < 10; p++) {
    const px = -0.48 + p * 0.105;
    const portLed = new THREE.Mesh(
      new THREE.BoxGeometry(0.045, 0.035, 0.03),
      new THREE.MeshBasicMaterial({ color: p % 2 === 0 ? 0x38bdf8 : 0x4ade80 })
    );
    portLed.position.set(px, 0.8, 0.35);
    switchGroup.add(portLed);
    blinkingLEDs.push({ mesh: portLed, speed: 6 + p, baseColor: 0x38bdf8 });

    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(px, 0.78, 0.34),
      new THREE.Vector3(px, 0.9, 0.42),
      new THREE.Vector3(px, 1.02, 0.34)
    ]);
    const cord = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.01, 6, false), patchCordMat);
    switchGroup.add(cord);
  }

  scene.add(switchGroup);
  registerInteractable(switchGroup, 'switch_core');
  addFloatingLabel('Switch Core + Patch Panel', new THREE.Vector3(-6.95, 1.55, 1.85), '#38bdf8');

  // 7.5 ROUTER / GATEWAY WAN (Pegado a la pared oeste: X = -7.05, Z = 3.15)
  const routerGroup = new THREE.Group();
  routerGroup.position.set(-7.05, 0.16, 3.15);

  const routerPedestal = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.65, 0.65), rackPostMat);
  routerPedestal.position.y = 0.325;
  routerPedestal.castShadow = true;
  routerGroup.add(routerPedestal);

  const routerChassis = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.22, 0.58), whiteMetalMat);
  routerChassis.position.y = 0.76;
  routerChassis.castShadow = true;
  routerGroup.add(routerChassis);

  [-0.36, 0.36].forEach((ax) => {
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.52, 10), darkMetalMat);
    ant.position.set(ax, 1.08, 0.15);
    routerGroup.add(ant);
  });

  const firewallChassis = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.18, 0.58), darkMetalMat);
  firewallChassis.position.set(0, 0.52, 0.04);
  routerGroup.add(firewallChassis);

  scene.add(routerGroup);
  registerInteractable(routerGroup, 'router_gateway');
  addFloatingLabel('Router / Gateway GPS WAN', new THREE.Vector3(-7.05, 1.55, 3.15), '#f59e0b');

  // 7.6 UPS ONLINE TORRE DOBLE CONVERSIÓN (Abajo en el Data Center: X = -4.65, Z = 4.45)
  const upsGroup = new THREE.Group();
  upsGroup.position.set(-4.65, 0.16, 4.45);

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
  addFloatingLabel('UPS Respaldo 3000VA', new THREE.Vector3(-4.65, 1.38, 4.45), '#4ade80');
}

// ============================================================================
// 8. SALA DE MONITOREO Y OFICINA DE CONTROL DE BUSES
// ============================================================================
function createWorkstationDesk({ x, z, rotationY = 0, screenVariant = 1, hasTower = true, dataKey }) {
  const group = new THREE.Group();
  group.position.set(x, 0.12, z);
  group.rotation.y = rotationY;

  const woodDeskMat = new THREE.MeshStandardMaterial({ color: 0xd6c7b2, roughness: 0.55 });
  const legMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6, roughness: 0.35 });
  const darkPlastic = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.35 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 });

  const top = new THREE.Mesh(new THREE.BoxGeometry(2.85, 0.08, 1.3), woodDeskMat);
  top.position.y = 0.78;
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);

  const drawerBox = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.72, 1.18), woodDeskMat);
  drawerBox.position.set(-0.98, 0.38, 0);
  drawerBox.castShadow = true;
  group.add(drawerBox);

  for (let d = 0; d < 3; d++) {
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.04), chromeMat);
    handle.position.set(-0.98, 0.22 + d * 0.2, 0.6);
    group.add(handle);
  }

  const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.74, 0.07), legMat);
  leg1.position.set(1.32, 0.38, -0.55);
  const leg2 = leg1.clone();
  leg2.position.set(1.32, 0.38, 0.55);
  const legBar = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 1.16), legMat);
  legBar.position.set(1.32, 0.06, 0);
  group.add(leg1, leg2, legBar);

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

function buildMonitoringOffice() {
  createWorkstationDesk({
    x: 0.85,
    z: -3.85,
    rotationY: 0,
    screenVariant: 1,
    hasTower: true,
    dataKey: 'pc_monitor_1'
  });
  addFloatingLabel('PC Monitoreo #1 (Mapa GPS)', new THREE.Vector3(0.85, 2.25, -4.1), '#38bdf8');

  createWorkstationDesk({
    x: 5.4,
    z: -3.85,
    rotationY: 0,
    screenVariant: 2,
    hasTower: true,
    dataKey: 'pc_monitor_2'
  });
  addFloatingLabel('PC Monitoreo #2 (Salidas/Llegadas)', new THREE.Vector3(5.4, 2.25, -4.1), '#38bdf8');

  createWorkstationDesk({
    x: 4.1,
    z: 4.15,
    rotationY: Math.PI,
    screenVariant: 1,
    hasTower: false,
    dataKey: 'pc_admin'
  });
  addFloatingLabel('PC Administracion de Red', new THREE.Vector3(4.1, 2.25, 4.35), '#4ade80');

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
// 9. CABLEADO CONTINUO 100% CONECTADO: SUBE POR LA PARED DETRÁS DEL RACK -> BANDEJAS DE TECHO -> BAJANTES DE OFICINA
// ============================================================================
// Exactamente como en el Rack de tu universidad:
// - Ningún cable ni tubo sube por delante de la cara de los equipos.
// - Todos los cables salen por la parte posterior de los equipos (Rack, Switch, Router, UPS)
//   hacia una CANALETA VERTICAL DE PARED adosada al muro izquierdo (X = -7.82).
// - Por esa pared suben hasta la BANDEJA PORTACABLES AÉREA en el techo (Y = 3.32m),
//   que forma una red continua y totalmente interconectada sobre el falso techo,
//   y de ahí bajan por las canaletas blancas de la pared hacia cada PC e Impresora.
const dataPackets = [];
let packetsEnabled = true;

function buildStructuredCabling() {
  const cablingGroup = new THREE.Group();
  const ladderMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.35, metalness: 0.75 });
  const trayMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.35, metalness: 0.15 });
  const faceplateMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });

  // 9.1 BANDEJAS PORTACABLES AÉREAS TOTALMENTE CONECTADAS EN EL TECHO (Y = 3.32m)
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

  // Red continua de bandejas en el techo (todas unidas en las esquinas):
  // 1. Bandeja Troncal Pared Oeste (Pegada a la pared detrás del Rack: X = -7.65, desde Z = -5.15 hasta Z = 4.55)
  createPlenumLadderZ(-7.65, 3.32, -5.15, 4.55, 0.38);
  // 2. Bandeja Troncal Norte (Une X = -7.65 hasta X = 6.55 a lo largo de Z = -5.15)
  createPlenumLadderX(-5.15, 3.32, -7.65, 6.55, 0.38);
  // 3. Puente Transversal Data Center -> Muro Divisor (En Z = 1.85, une X = -7.65 con X = -3.02)
  createPlenumLadderX(1.85, 3.32, -7.65, -3.02, 0.38);
  // 4. Bandeja Muro Divisor (En X = -3.02, une desde la bandeja Norte Z = -5.15 hasta la bandeja Sur Z = 5.15)
  createPlenumLadderZ(-3.02, 3.32, -5.15, 5.15, 0.36);
  // 5. Bandeja Troncal Sur (En Z = 5.15, une X = -3.02 hasta X = 4.25 para alimentar PC Administración)
  createPlenumLadderX(5.15, 3.32, -3.02, 4.25, 0.36);

  // 9.2 CANALETAS EN LA PARED DETRÁS DEL RACK, SWITCH Y ROUTER (Muro Oeste X = -7.83)
  function addWallTrunking(x, y, z, w, h, d) {
    const trunk = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), trayMat);
    trunk.position.set(x, y, z);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    cablingGroup.add(trunk);
  }

  // Canaleta horizontal colectora en la pared izquierda detrás del Rack, Switch y Router (X = -7.83, Y = 0.95, de Z = -0.8 a Z = 4.5)
  addWallTrunking(-7.83, 0.95, 1.85, 0.08, 0.14, 5.4);

  // 3 Canaletas verticales adosadas a la pared izquierda que suben desde los equipos hasta la bandeja del techo (Y = 3.32m):
  // - Subida pared detrás del Rack (Z = -0.1)
  addWallTrunking(-7.83, 2.12, -0.1, 0.08, 2.42, 0.16);
  // - Subida pared detrás del Switch Core + Patch Panel (Z = 1.85)
  addWallTrunking(-7.83, 2.12, 1.85, 0.08, 2.42, 0.18);
  // - Subida pared detrás del Router WAN (Z = 3.15)
  addWallTrunking(-7.83, 2.12, 3.15, 0.08, 2.42, 0.14);
  // - Canaleta baja en pared sur/oeste desde el UPS hacia la pared del Rack
  addWallTrunking(-6.25, 0.35, 5.34, 3.2, 0.1, 0.08);
  addWallTrunking(-7.83, 0.65, 4.25, 0.08, 0.68, 2.2);

  // 9.3 BAJANTES DE CANALETA EN LAS PAREDES DE LA OFICINA (CONECTADAS DESDE LA BANDEJA DEL TECHO HASTA CADA EQUIPO)
  function addOfficeWallDrop(x, z, rotY = 0) {
    // Canaleta vertical blanca en la pared desde la bandeja del techo (Y = 3.32) hasta la toma RJ45 (Y = 0.45)
    const drop = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.9, 0.06), trayMat);
    drop.position.set(x, 1.88, z);
    drop.rotation.y = rotY;
    cablingGroup.add(drop);

    // Conector superior entre la bandeja aérea y la pared
    const fp = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.07), faceplateMat);
    fp.position.set(x, 0.45, z);
    fp.rotation.y = rotY;
    cablingGroup.add(fp);
  }

  addOfficeWallDrop(1.91, -5.34, 0); // Bajante pared PC Monitoreo 1
  addOfficeWallDrop(6.46, -5.34, 0); // Bajante pared PC Monitoreo 2
  addOfficeWallDrop(-3.04, 0.65, Math.PI / 2); // Bajante pared Impresora
  addOfficeWallDrop(4.1, 5.34, Math.PI); // Bajante pared PC Admin

  // Canaleta corta horizontal en pared para llevar el cable desde la toma RJ45 hasta la mesa de la impresora
  addWallTrunking(-2.4, 0.45, 0.65, 1.25, 0.07, 0.07);

  // 9.4 RUTAS DE CABLES UTP CAT6A (SUBEN POR LA PARED DETRÁS DEL RACK -> BANDEJAS DE TECHO -> BAJAN POR PARED A EQUIPOS)
  const cableRoutes = [
    // Ruta 1 (Switch Core -> Pared detrás del Switch -> Bandeja Techo Oeste -> Bandeja Techo Norte -> Bajante Pared -> PC Monitoreo 1)
    [
      new THREE.Vector3(-7.4, 0.98, 1.82),
      new THREE.Vector3(-7.8, 0.98, 1.82),
      new THREE.Vector3(-7.8, 3.35, 1.82),
      new THREE.Vector3(-7.68, 3.35, -5.12),
      new THREE.Vector3(1.91, 3.35, -5.12),
      new THREE.Vector3(1.91, 3.35, -5.32),
      new THREE.Vector3(1.91, 0.45, -5.32),
      new THREE.Vector3(1.91, 1.15, -3.95)
    ],
    // Ruta 2 (Switch Core -> Pared detrás del Switch -> Bandeja Techo Oeste -> Bandeja Techo Norte -> Bajante Pared -> PC Monitoreo 2)
    [
      new THREE.Vector3(-7.4, 0.98, 1.88),
      new THREE.Vector3(-7.8, 0.98, 1.88),
      new THREE.Vector3(-7.8, 3.36, 1.88),
      new THREE.Vector3(-7.62, 3.36, -5.18),
      new THREE.Vector3(6.46, 3.36, -5.18),
      new THREE.Vector3(6.46, 3.36, -5.32),
      new THREE.Vector3(6.46, 0.45, -5.32),
      new THREE.Vector3(6.46, 1.15, -3.95)
    ],
    // Ruta 3 (Switch Core -> Pared detrás del Switch -> Puente Techo Z=1.85 -> Bandeja Muro Divisor -> Bajante Pared -> Impresora)
    [
      new THREE.Vector3(-7.4, 0.95, 1.85),
      new THREE.Vector3(-7.8, 0.95, 1.85),
      new THREE.Vector3(-7.8, 3.35, 1.85),
      new THREE.Vector3(-3.02, 3.35, 1.85),
      new THREE.Vector3(-3.02, 3.35, 0.65),
      new THREE.Vector3(-3.02, 0.45, 0.65),
      new THREE.Vector3(-1.75, 0.45, 0.65),
      new THREE.Vector3(-1.75, 0.95, 0.65)
    ],
    // Ruta 4 (Switch Core -> Pared detrás del Switch -> Puente Techo -> Bandeja Muro Divisor -> Bandeja Sur -> Bajante Pared -> PC Admin)
    [
      new THREE.Vector3(-7.4, 0.92, 1.9),
      new THREE.Vector3(-7.8, 0.92, 1.9),
      new THREE.Vector3(-7.8, 3.35, 1.9),
      new THREE.Vector3(-3.0, 3.35, 1.9),
      new THREE.Vector3(-3.0, 3.35, 5.15),
      new THREE.Vector3(4.1, 3.35, 5.15),
      new THREE.Vector3(4.1, 3.35, 5.32),
      new THREE.Vector3(4.1, 0.45, 5.32),
      new THREE.Vector3(4.1, 1.1, 4.35)
    ],
    // Ruta 5 (Troncal Data Center por la Pared detrás del Rack: Router WAN -> Pared Oeste -> Switch Core -> Pared Oeste -> Servidores del Rack)
    [
      new THREE.Vector3(-7.4, 0.78, 3.15),
      new THREE.Vector3(-7.8, 0.78, 3.15),
      new THREE.Vector3(-7.8, 3.35, 3.15),
      new THREE.Vector3(-7.8, 3.35, 1.85),
      new THREE.Vector3(-7.8, 0.95, 1.85),
      new THREE.Vector3(-7.8, 3.35, 1.85),
      new THREE.Vector3(-7.8, 3.35, -0.1),
      new THREE.Vector3(-7.8, 1.4, -0.1),
      new THREE.Vector3(-7.2, 1.4, -0.1)
    ],
    // Ruta 6 (Línea UPS por Canaleta de Pared Sur/Oeste hacia Router, Switch y Rack):
    [
      new THREE.Vector3(-4.65, 0.35, 4.75),
      new THREE.Vector3(-4.65, 0.35, 5.32),
      new THREE.Vector3(-7.8, 0.35, 5.32),
      new THREE.Vector3(-7.8, 0.95, 3.15),
      new THREE.Vector3(-7.8, 0.95, 1.85),
      new THREE.Vector3(-7.8, 0.95, -0.1),
      new THREE.Vector3(-7.2, 0.95, -0.1)
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
  addFloatingLabel('Canaletas de Pared + Bandejas de Techo (Cat6A)', new THREE.Vector3(-7.6, 3.55, 0.8), '#0284c7');
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
  datacenter: { pos: [-1.5, 5.2, 4.0], target: [-6.5, 1.4, 0.8] },
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
    fpsHint.innerHTML = '<b>W, A, S, D</b> caminar &bull; <b>Tecla T</b> ocultar/ver techo &bull; <b>ESC</b> ir a Vista General Isométrica';
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
