import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { EQUIPMENT_DATA } from './data.js';

// ============================================================================
// 1. CONFIGURACIÓN ESCENA, CÁMARA Y RENDERERS
// ============================================================================
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f172a);
scene.fog = new THREE.FogExp2(0x0f172a, 0.014);

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
// 2. CONTROLES: MODO MAQUETA (ÓRBITA) Y MODO CAMINATA (1RA PERSONA WASD)
// ============================================================================
const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true;
orbitControls.dampingFactor = 0.06;
orbitControls.maxPolarAngle = Math.PI / 2 - 0.03;
orbitControls.minDistance = 2;
orbitControls.maxDistance = 42;
orbitControls.target.set(0, 1.2, 0);

const fpsControls = new PointerLockControls(camera, document.body);
let currentMode = 'orbit';
const moveState = { forward: false, backward: false, left: false, right: false, up: false, down: false };

// ============================================================================
// 3. ILUMINACIÓN
// ============================================================================
const ambientLight = new THREE.AmbientLight(0xdbeafe, 0.85);
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

const dcLight = new THREE.PointLight(0x38bdf8, 1.2, 12);
dcLight.position.set(-5.8, 3.4, 0.5);
scene.add(dcLight);

const officeLight = new THREE.PointLight(0xfef3c7, 0.9, 16);
officeLight.position.set(2.5, 3.6, 0);
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
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 248, 248);

  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.strokeRect(12, 12, 232, 232);

  ctx.fillStyle = '#090d11';
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 8; j++) {
      ctx.fillRect(28 + i * 52, 28 + j * 25, 38, 12);
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
  ctx.lineWidth = 6;
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
// 6. CONSTRUCCIÓN ARQUITECTÓNICA (PAREDES BLANCAS ALTAS Y PUERTAS BLANCO/NEGRO)
// ============================================================================
function buildEnvironmentAndArchitecture() {
  // 1. Césped exterior
  const grassGeo = new THREE.PlaneGeometry(45, 36);
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.95 });
  const grass = new THREE.Mesh(grassGeo, grassMat);
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.08;
  grass.receiveShadow = true;
  scene.add(grass);

  // Camino de piedras a la derecha
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xa8a29e, roughness: 0.85 });
  for (let z = -5.2; z <= 5.2; z += 0.75) {
    for (let x = 9.0; x <= 10.4; x += 0.65) {
      const sGeo = new THREE.CylinderGeometry(0.28, 0.32, 0.06, 7);
      const stone = new THREE.Mesh(sGeo, stoneMat);
      stone.position.set(x + (Math.random() - 0.5) * 0.2, -0.04, z + (Math.random() - 0.5) * 0.2);
      stone.receiveShadow = true;
      scene.add(stone);
    }
  }

  // Arbustos exteriores
  const bushPositions = [
    [-9.2, -2.5], [-8.8, 5.2], [-6.8, 5.9],
    [8.9, -1.8], [8.9, 2.5]
  ];
  const bushMat = new THREE.MeshStandardMaterial({ color: 0x3f6212, roughness: 0.8 });
  bushPositions.forEach(([bx, bz]) => {
    const bushGroup = new THREE.Group();
    const mainSphere = new THREE.Mesh(new THREE.SphereGeometry(0.65, 12, 12), bushMat);
    mainSphere.position.y = 0.45;
    mainSphere.castShadow = true;
    bushGroup.add(mainSphere);
    for (let i = 0; i < 4; i++) {
      const sub = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 10), bushMat);
      sub.position.set(Math.cos(i * 1.5) * 0.4, 0.3, Math.sin(i * 1.5) * 0.4);
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

  // 4. Muros Blancos con mayor altura (3.6m)
  const wallHeight = 3.6;
  const wallThickness = 0.24;
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.55 });
  const wallTopMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });

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

  // Muro Divisor Interno (X = -3.2) con puerta hacia el Data Center arriba
  addWallSegment(-3.2, -5.1, wallThickness, 0.8);
  addWallSegment(-3.2, 1.2, wallThickness, 8.6);

  // 5. Puertas Blancas con Bordes/Detalles en Negro y mayor altura (2.85m)
  const doorHeight = 2.85;
  const doorWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
  const doorBlackMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.35, metalness: 0.4 });

  function createWhiteBlackDoorLeaf(widthZ, zOffsetSign = 1) {
    const leafGroup = new THREE.Group();
    const zCenter = (widthZ / 2) * zOffsetSign;

    // Panel principal blanco
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.08, doorHeight, widthZ), doorWhiteMat);
    panel.position.set(0, doorHeight / 2, zCenter);
    panel.castShadow = true;
    leafGroup.add(panel);

    // Marco superior e inferior negro
    const topTrim = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.1, widthZ + 0.02), doorBlackMat);
    topTrim.position.set(0, doorHeight - 0.05, zCenter);
    leafGroup.add(topTrim);

    const botTrim = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.12, widthZ + 0.02), doorBlackMat);
    botTrim.position.set(0, 0.06, zCenter);
    leafGroup.add(botTrim);

    // Bordes verticales negros
    const sideTrim1 = new THREE.Mesh(new THREE.BoxGeometry(0.11, doorHeight, 0.08), doorBlackMat);
    sideTrim1.position.set(0, doorHeight / 2, 0.04 * zOffsetSign);
    leafGroup.add(sideTrim1);

    const sideTrim2 = new THREE.Mesh(new THREE.BoxGeometry(0.11, doorHeight, 0.08), doorBlackMat);
    sideTrim2.position.set(0, doorHeight / 2, (widthZ - 0.04) * zOffsetSign);
    leafGroup.add(sideTrim2);

    // Visor / franja central y manija negra
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.11, 1.1, 0.22), doorBlackMat);
    visor.position.set(0, doorHeight * 0.58, zCenter);
    leafGroup.add(visor);

    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.18), doorBlackMat);
    handle.position.set(0, 1.15, (widthZ - 0.22) * zOffsetSign);
    leafGroup.add(handle);

    return leafGroup;
  }

  // Puerta interna Data Center (X = -3.2, Z = -4.7)
  const dcDoorPivot = new THREE.Group();
  dcDoorPivot.position.set(-3.2, 0, -4.7);
  dcDoorPivot.add(createWhiteBlackDoorLeaf(1.5, 1));
  dcDoorPivot.rotation.y = Math.PI * 0.42;
  scene.add(dcDoorPivot);
  doorPivots.push({ pivot: dcDoorPivot, openRot: Math.PI * 0.42, closedRot: 0 });

  // Puerta doble principal Este (X = 8.0, Z = -1.4 y Z = +1.4)
  const mainDoorTopPivot = new THREE.Group();
  mainDoorTopPivot.position.set(8.0, 0, -1.4);
  mainDoorTopPivot.add(createWhiteBlackDoorLeaf(1.35, 1));
  mainDoorTopPivot.rotation.y = Math.PI * 0.45;
  scene.add(mainDoorTopPivot);
  doorPivots.push({ pivot: mainDoorTopPivot, openRot: Math.PI * 0.45, closedRot: 0 });

  const mainDoorBotPivot = new THREE.Group();
  mainDoorBotPivot.position.set(8.0, 0, 1.4);
  mainDoorBotPivot.add(createWhiteBlackDoorLeaf(1.35, -1));
  mainDoorBotPivot.rotation.y = -Math.PI * 0.42;
  scene.add(mainDoorBotPivot);
  doorPivots.push({ pivot: mainDoorBotPivot, openRot: -Math.PI * 0.42, closedRot: 0 });
}

// ============================================================================
// 7. EQUIPAMIENTO DEL CUARTO DE SERVIDORES (ZONA IZQUIERDA)
// ============================================================================
function buildDataCenterRoom() {
  const acGroup = new THREE.Group();
  const whiteMetalMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.35, metalness: 0.2 });
  const darkVentMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });

  const acCabinet = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.3, 2.2), whiteMetalMat);
  acCabinet.position.set(-7.1, 1.25, -4.0);
  acCabinet.castShadow = true;
  acGroup.add(acCabinet);

  const wallSplit = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.45, 0.45), whiteMetalMat);
  wallSplit.position.set(-6.4, 2.2, -1.65);
  wallSplit.castShadow = true;
  acGroup.add(wallSplit);

  scene.add(acGroup);
  registerInteractable(acGroup, 'ac_unit');
  addFloatingLabel('Climatizacion Data Center', new THREE.Vector3(-7.0, 2.65, -4.0), '#38bdf8');

  const shelfGroup = new THREE.Group();
  const shelfFrame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.1, 0.8), whiteMetalMat);
  shelfFrame.position.set(-4.8, 1.15, -4.4);
  shelfFrame.castShadow = true;
  shelfGroup.add(shelfFrame);
  for (let i = 0; i < 3; i++) {
    const slot = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.45, 0.82), darkVentMat);
    slot.position.set(-4.8, 0.6 + i * 0.6, -4.38);
    shelfGroup.add(slot);
  }
  scene.add(shelfGroup);

  // RACK PRINCIPAL DE SERVIDORES
  const rackGroup = new THREE.Group();
  rackGroup.position.set(-6.2, 0.16, 0.2);

  const rackFrameMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.7 });
  const serverChassisMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.8 });

  const rackBody = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.45, 2.2), rackFrameMat);
  rackBody.position.y = 1.225;
  rackBody.castShadow = true;
  rackBody.receiveShadow = true;
  rackGroup.add(rackBody);

  scene.add(rackGroup);
  registerInteractable(rackGroup, 'rack_main');
  addFloatingLabel('Rack Principal + Servidores UNAB', new THREE.Vector3(-6.2, 2.95, 0.2), '#22c55e');

  const serversGroup = new THREE.Group();
  serversGroup.position.copy(rackGroup.position);

  for (let i = 0; i < 4; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.55, 0.95), serverChassisMat);
    blade.position.set(-0.63 + i * 0.42, 2.15, -0.45);
    blade.castShadow = true;
    serversGroup.add(blade);

    const ledGreen = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x4ade80 })
    );
    ledGreen.position.set(-0.63 + i * 0.42, 2.44, -0.1);
    serversGroup.add(ledGreen);
    blinkingLEDs.push({ mesh: ledGreen, speed: 3 + i, baseColor: 0x4ade80 });
  }

  for (let r = 0; r < 2; r++) {
    const srv = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.36, 0.9), serverChassisMat);
    srv.position.set(0, 1.55 - r * 0.48, 0.68);
    srv.castShadow = true;
    serversGroup.add(srv);

    const ledG = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x22c55e })
    );
    ledG.position.set(0.65, 1.55 - r * 0.48, 1.15);
    serversGroup.add(ledG);
    blinkingLEDs.push({ mesh: ledG, speed: 5 + r * 2, baseColor: 0x22c55e });

    const ledP = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xe879f9 })
    );
    ledP.position.set(0.5, 1.55 - r * 0.48, 1.15);
    serversGroup.add(ledP);
    blinkingLEDs.push({ mesh: ledP, speed: 2 + r, baseColor: 0xe879f9 });
  }

  scene.add(serversGroup);
  registerInteractable(serversGroup, 'server_gps');

  // Patch Panel & Switch Administrable
  const switchGroup = new THREE.Group();
  switchGroup.position.set(-6.2, 0.16, 1.85);

  const swStand = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.9, 0.45), rackFrameMat);
  swStand.position.y = 0.45;
  swStand.castShadow = true;
  switchGroup.add(swStand);

  const swUnit = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.22, 0.5), serverChassisMat);
  swUnit.position.y = 0.98;
  switchGroup.add(swUnit);

  for (let p = 0; p < 8; p++) {
    const portLed = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.04, 0.04),
      new THREE.MeshBasicMaterial({ color: p % 2 === 0 ? 0x38bdf8 : 0x4ade80 })
    );
    portLed.position.set(-0.45 + p * 0.13, 1.1, 0.18);
    switchGroup.add(portLed);
    blinkingLEDs.push({ mesh: portLed, speed: 6 + p, baseColor: 0x38bdf8 });
  }

  scene.add(switchGroup);
  registerInteractable(switchGroup, 'switch_core');
  addFloatingLabel('Switch Core + Patch Panel', new THREE.Vector3(-6.2, 1.65, 1.85), '#38bdf8');

  // Router / Gateway
  const routerGroup = new THREE.Group();
  routerGroup.position.set(-6.3, 0.16, 2.95);

  const routerBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.75, 0.95),
    new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.4, metalness: 0.5 })
  );
  routerBody.position.y = 0.4;
  routerBody.castShadow = true;
  routerGroup.add(routerBody);

  const antenna = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.75, 10),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0 })
  );
  antenna.rotation.z = Math.PI / 2;
  antenna.position.set(-0.55, 0.55, 0);
  routerGroup.add(antenna);

  const modemBox = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.35, 0.45), rackFrameMat);
  modemBox.position.set(0.05, 0.25, 0.9);
  modemBox.castShadow = true;
  routerGroup.add(modemBox);

  scene.add(routerGroup);
  registerInteractable(routerGroup, 'router_gateway');
  addFloatingLabel('Router / Gateway GPS WAN', new THREE.Vector3(-6.3, 1.4, 3.2), '#f59e0b');

  // UPS
  const upsGroup = new THREE.Group();
  upsGroup.position.set(-4.35, 0.16, 4.45);

  const upsBody = new THREE.Mesh(
    new THREE.BoxGeometry(1.55, 0.75, 0.75),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.6 })
  );
  upsBody.position.y = 0.38;
  upsBody.castShadow = true;
  upsGroup.add(upsBody);

  const upsScreen = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.22, 0.45),
    new THREE.MeshBasicMaterial({ color: 0x4ade80 })
  );
  upsScreen.position.set(0.55, 0.76, 0);
  upsGroup.add(upsScreen);

  scene.add(upsGroup);
  registerInteractable(upsGroup, 'ups_power');
  addFloatingLabel('UPS Respaldo 3000VA', new THREE.Vector3(-4.35, 1.35, 4.45), '#4ade80');
}

// ============================================================================
// 8. SALA DE MONITOREO Y OFICINA DE CONTROL DE BUSES (ZONA DERECHA)
// ============================================================================
function createWorkstationDesk({ x, z, rotationY = 0, screenVariant = 1, hasTower = true, dataKey }) {
  const group = new THREE.Group();
  group.position.set(x, 0.12, z);
  group.rotation.y = rotationY;

  const woodDeskMat = new THREE.MeshStandardMaterial({ color: 0xd6c7b2, roughness: 0.6 });
  const legMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.5, roughness: 0.4 });
  const darkPlastic = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });

  const top = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.1, 1.35), woodDeskMat);
  top.position.y = 0.78;
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);

  const drawer = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.72, 1.2), woodDeskMat);
  drawer.position.set(-1.05, 0.38, 0);
  drawer.castShadow = true;
  group.add(drawer);

  const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.75, 0.08), legMat);
  leg1.position.set(1.45, 0.38, -0.58);
  const leg2 = leg1.clone();
  leg2.position.set(1.45, 0.38, 0.58);
  group.add(leg1, leg2);

  const monitorStand = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.18, 0.32, 12), darkPlastic);
  monitorStand.position.set(0, 0.95, -0.32);
  group.add(monitorStand);

  const monitorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.82, 0.08), darkPlastic);
  monitorFrame.position.set(0, 1.38, -0.32);
  monitorFrame.castShadow = true;
  group.add(monitorFrame);

  const screenGeo = new THREE.PlaneGeometry(1.28, 0.72);
  const screenMat = new THREE.MeshBasicMaterial({ map: createBusMapScreenTexture(screenVariant) });
  const screenMesh = new THREE.Mesh(screenGeo, screenMat);
  screenMesh.position.set(0, 1.38, -0.275);
  group.add(screenMesh);

  const keyboard = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.03, 0.26), darkPlastic);
  keyboard.position.set(0, 0.85, 0.18);
  group.add(keyboard);

  const mouse = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.2), darkPlastic);
  mouse.position.set(0.58, 0.85, 0.2);
  group.add(mouse);

  if (hasTower) {
    const tower = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.85, 0.92), darkPlastic);
    tower.position.set(1.18, 1.25, -0.1);
    tower.castShadow = true;
    group.add(tower);

    const binderColors = [0xdc2626, 0x3b82f6, 0x1e293b];
    binderColors.forEach((col, idx) => {
      const binder = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.52, 0.42),
        new THREE.MeshStandardMaterial({ color: col })
      );
      binder.position.set(-1.25 + idx * 0.2, 1.09, -0.25);
      binder.castShadow = true;
      group.add(binder);
    });
  }

  const chairGroup = new THREE.Group();
  chairGroup.position.set(0, 0, 1.05);
  const chairMat = new THREE.MeshStandardMaterial({ color: 0x3b5998, roughness: 0.6 });

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.12, 0.8), chairMat);
  seat.position.y = 0.52;
  seat.castShadow = true;
  chairGroup.add(seat);

  const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.78, 0.12), chairMat);
  backrest.position.set(0, 0.95, 0.36);
  backrest.castShadow = true;
  chairGroup.add(backrest);

  const chairBase = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.48, 10), darkPlastic);
  chairBase.position.y = 0.25;
  chairGroup.add(chairBase);

  group.add(chairGroup);

  scene.add(group);
  registerInteractable(group, dataKey);
}

function buildMonitoringOffice() {
  createWorkstationDesk({
    x: 0.2,
    z: -3.85,
    rotationY: 0,
    screenVariant: 1,
    hasTower: true,
    dataKey: 'pc_monitor_1'
  });
  addFloatingLabel('PC Monitoreo #1 (Mapa GPS)', new THREE.Vector3(0.2, 2.25, -4.1), '#38bdf8');

  createWorkstationDesk({
    x: 5.3,
    z: -3.85,
    rotationY: 0,
    screenVariant: 2,
    hasTower: true,
    dataKey: 'pc_monitor_2'
  });
  addFloatingLabel('PC Monitoreo #2 (Salidas/Llegadas)', new THREE.Vector3(5.3, 2.25, -4.1), '#38bdf8');

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
  printerGroup.position.set(-1.6, 0.12, 0.45);

  const tableMat = new THREE.MeshStandardMaterial({ color: 0xd6c7b2, roughness: 0.6 });
  const pTable = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.78, 1.3), tableMat);
  pTable.position.y = 0.39;
  pTable.castShadow = true;
  printerGroup.add(pTable);

  const printerBody = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.52, 0.85),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4 })
  );
  printerBody.position.y = 1.02;
  printerBody.castShadow = true;
  printerGroup.add(printerBody);

  const paper = new THREE.Mesh(
    new THREE.BoxGeometry(0.58, 0.02, 0.48),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  paper.position.set(0, 0.85, 0.48);
  printerGroup.add(paper);

  scene.add(printerGroup);
  registerInteractable(printerGroup, 'printer_net');
  addFloatingLabel('Impresora en Red', new THREE.Vector3(-1.6, 1.65, 0.45), '#f59e0b');

  const brownWood = new THREE.MeshStandardMaterial({ color: 0x9a6b4c, roughness: 0.65 });
  const whiteCabinetMat = new THREE.MeshStandardMaterial({ color: 0xdcdcdc, roughness: 0.5 });

  const cab1 = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.35, 1.75), brownWood);
  cab1.position.set(-2.5, 0.79, -0.95);
  cab1.castShadow = true;
  scene.add(cab1);

  const cab2 = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.95, 2.2), whiteCabinetMat);
  cab2.position.set(-2.45, 1.09, 3.6);
  cab2.castShadow = true;
  scene.add(cab2);

  const cab3 = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.95, 1.15), brownWood);
  cab3.position.set(6.55, 0.59, 4.25);
  cab3.castShadow = true;
  scene.add(cab3);
}

// ============================================================================
// 9. CABLEADO ESTRUCTURADO Y PAQUETES DE DATOS EN VIVO
// ============================================================================
const dataPackets = [];
let packetsEnabled = true;

function buildStructuredCabling() {
  const cablingGroup = new THREE.Group();
  const trayMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.35 });

  function addCableTray(x, y, z, w, h, d) {
    const tray = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), trayMat);
    tray.position.set(x, y, z);
    tray.receiveShadow = true;
    cablingGroup.add(tray);
  }

  addCableTray(2.7, 0.32, -5.25, 8.6, 0.18, 0.16);
  addCableTray(-2.98, 0.18, 1.65, 0.22, 0.12, 7.6);
  addCableTray(0.6, 0.18, 5.25, 7.2, 0.14, 0.18);
  addCableTray(-6.3, 0.2, -2.55, 2.2, 0.12, 0.25);
  addCableTray(-6.2, 0.2, -1.0, 0.3, 0.12, 1.5);

  const cableRoutes = [
    [
      new THREE.Vector3(-5.5, 0.55, 1.85),
      new THREE.Vector3(-4.8, 0.24, 1.85),
      new THREE.Vector3(-4.8, 0.24, -2.1),
      new THREE.Vector3(-3.0, 0.24, -2.1),
      new THREE.Vector3(-1.8, 0.24, -2.1),
      new THREE.Vector3(-1.8, 0.28, -5.2),
      new THREE.Vector3(1.38, 0.28, -5.2),
      new THREE.Vector3(1.38, 1.1, -4.0)
    ],
    [
      new THREE.Vector3(-5.2, 0.9, 0.3),
      new THREE.Vector3(-4.6, 0.25, 0.3),
      new THREE.Vector3(-4.6, 0.25, -1.75),
      new THREE.Vector3(1.38, 0.25, -1.75),
      new THREE.Vector3(1.38, 1.15, -3.85)
    ],
    [
      new THREE.Vector3(-5.5, 0.5, 1.85),
      new THREE.Vector3(-4.35, 0.25, 1.85),
      new THREE.Vector3(-4.35, 0.25, -1.55),
      new THREE.Vector3(6.48, 0.25, -1.55),
      new THREE.Vector3(6.48, 1.15, -3.85)
    ],
    [
      new THREE.Vector3(-5.5, 0.45, 1.85),
      new THREE.Vector3(-3.0, 0.24, 1.85),
      new THREE.Vector3(-3.0, 0.24, -1.35),
      new THREE.Vector3(-1.6, 0.24, -1.35),
      new THREE.Vector3(-1.6, 0.95, 0.35)
    ],
    [
      new THREE.Vector3(-5.5, 0.4, 1.85),
      new THREE.Vector3(-3.6, 0.24, 1.85),
      new THREE.Vector3(-3.6, 0.24, 5.2),
      new THREE.Vector3(4.1, 0.24, 5.2),
      new THREE.Vector3(4.1, 1.15, 4.35)
    ],
    [
      new THREE.Vector3(-6.2, 0.3, 3.85),
      new THREE.Vector3(-6.2, 0.3, 2.95),
      new THREE.Vector3(-6.2, 0.5, 1.85),
      new THREE.Vector3(-6.2, 0.9, 0.5)
    ],
    [
      new THREE.Vector3(-4.35, 0.35, 4.45),
      new THREE.Vector3(-4.35, 0.24, 5.15),
      new THREE.Vector3(-6.9, 0.24, 5.15),
      new THREE.Vector3(-6.9, 0.35, 3.85),
      new THREE.Vector3(-6.9, 0.9, 0.2)
    ]
  ];

  const cableMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    emissive: 0x0369a1,
    emissiveIntensity: 0.35,
    roughness: 0.3
  });

  const packetGeo = new THREE.SphereGeometry(0.09, 12, 12);
  const packetMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

  cableRoutes.forEach((points, routeIndex) => {
    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.08);
    const tubeGeo = new THREE.TubeGeometry(curve, 90, 0.045, 8, false);
    const cableMesh = new THREE.Mesh(tubeGeo, cableMat);
    cableMesh.castShadow = true;
    cablingGroup.add(cableMesh);

    for (let k = 0; k < 2; k++) {
      const pulse = new THREE.Mesh(packetGeo, packetMat);
      scene.add(pulse);
      dataPackets.push({
        mesh: pulse,
        curve,
        progress: (k * 0.5 + routeIndex * 0.13) % 1,
        speed: 0.16 + (routeIndex % 3) * 0.04
      });
    }
  });

  scene.add(cablingGroup);
  registerInteractable(cablingGroup, 'structured_cabling');
  addFloatingLabel('Paso de Cableado UTP Cat6A', new THREE.Vector3(-2.95, 0.85, -1.6), '#0284c7');
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

window.addEventListener('pointermove', (e) => {
  if (currentMode === 'fps' && fpsControls.isLocked) {
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

  if (currentMode === 'fps' && !fpsControls.isLocked) {
    fpsControls.lock();
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
// 11. BOTONES DE INTERFAZ Y MENÚ DESPLEGABLE DE VISTAS RÁPIDAS EN EL NAV
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

function activateOrbitMode() {
  currentMode = 'orbit';
  if (fpsControls.isLocked) fpsControls.unlock();
  orbitControls.enabled = true;
  btnOrbit.classList.add('active');
  btnFps.classList.remove('active');
  fpsCrosshair.classList.add('hidden');
}

function activateFpsMode() {
  currentMode = 'fps';
  orbitControls.enabled = false;
  btnFps.classList.add('active');
  btnOrbit.classList.remove('active');
  fpsCrosshair.classList.remove('hidden');
  viewsDropdownMenu.classList.add('hidden');
  btnToggleViews.classList.remove('active');

  camera.position.set(2.5, 1.72, 1.2);
  camera.lookAt(-4.5, 1.5, 0);
  fpsControls.lock();
}

btnOrbit.addEventListener('click', activateOrbitMode);
btnFps.addEventListener('click', activateFpsMode);

fpsControls.addEventListener('unlock', () => {
  if (currentMode === 'fps') {
    activateOrbitMode();
  }
});

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

// Toggle Altura de Muros
let wallsLowered = false;
const btnToggleWalls = document.getElementById('btn-toggle-walls');
btnToggleWalls.addEventListener('click', () => {
  wallsLowered = !wallsLowered;
  wallMeshes.forEach((w) => {
    w.scale.y = wallsLowered ? 0.16 : 1;
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
// 12. BUCLE DE ANIMACIÓN PRINCIPAL
// ============================================================================
const clock = new THREE.Clock();

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
  } else if (currentMode === 'fps' && fpsControls.isLocked) {
    const speed = 4.8 * delta;
    if (moveState.forward) fpsControls.moveForward(speed);
    if (moveState.backward) fpsControls.moveForward(-speed);
    if (moveState.left) fpsControls.moveRight(-speed);
    if (moveState.right) fpsControls.moveRight(speed);
    if (moveState.up) camera.position.y += speed * 0.7;
    if (moveState.down) camera.position.y = Math.max(0.8, camera.position.y - speed * 0.7);
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
