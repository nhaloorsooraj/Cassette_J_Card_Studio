// Compact Audio Cassette (Philips IEC 60094 / ISO 1134) & Norelco Jewel Case 3D Preview
const PREVIEW_SCALE = 0.1; // 1 mm = 0.1 Three.js units

// Authentic real-world dimensions (mm)
const CASSETTE_MM = {
  width: 100.4,
  height: 63.8,
  bodyDepth: 8.8,
  trapezoidDepth: 12.0,
  trapezoidBottomW: 58.0,
  trapezoidTopW: 68.0,
  trapezoidH: 12.0, // physically accurate tape head height
  labelW: 89.0,
  labelH: 45.0,
  labelCenterY: 3.0, // Offset 3.0 mm up from center, matches JCardMaker 25.5mm hole position
  reelDistance: 44.0, // Center-to-center distance between reel holes (±22 mm)
  holeRadius: 4.5 // Radius of reel holes (9 mm diameter)
};

const CASSETTE = {
  width: CASSETTE_MM.width * PREVIEW_SCALE,
  height: CASSETTE_MM.height * PREVIEW_SCALE,
  depth: CASSETTE_MM.trapezoidDepth * PREVIEW_SCALE,
  bodyDepth: CASSETTE_MM.bodyDepth * PREVIEW_SCALE,
  labelW: CASSETTE_MM.labelW * PREVIEW_SCALE,
  labelH: CASSETTE_MM.labelH * PREVIEW_SCALE,
  labelCenterY: CASSETTE_MM.labelCenterY * PREVIEW_SCALE
};

// Standard Norelco Cassette Jewel Box dimensions (mm)
const CASE_MM = {
  width: 70.0,
  height: 110.0,
  depth: 16.5
};

const JCASE = {
  width: CASE_MM.width * PREVIEW_SCALE,
  height: CASE_MM.height * PREVIEW_SCALE,
  depth: CASE_MM.depth * PREVIEW_SCALE
};

const CAMERA_FOV = 34;

let renderer3d = null;
let scene3d = null;
let camera3d = null;
let product3d = null;
let rotatingProduct3d = null;
let animationFrame3d = null;
let inputController3d = null;
let buildVersion3d = 0;
let isDragging3d = false;
let dragMode3d = 'rotate';
let displayMode3d = 'cassette';
const CASE_MODES_3D = new Set(['closed-case']);
let lastPointer3d = { x: 0, y: 0 };
let rotation3d = { x: -0.08, y: 0.04 };
let targetRotation3d = { x: -0.08, y: 0.04 };
let position3d = { x: 0, y: 0 };
let targetPosition3d = { x: 0, y: 0 };
let zoom3d = 42;
let targetDistance3d = 16;
let baseDistance3d = 20;
let autoRotate3d = false;
let activeSide3d = 'A';
let labelArtworkVisible3d = true;
let lastFrameTime3d = 0;

// ── 2D Canvas Helpers for Textures ──────────────────────────────────────────

function makeLabelCanvas(pieceId) {
  const piece = PIECES.find(item => item.id === pieceId);
  if (!piece || typeof renderPieceToCanvas !== 'function') {
    throw new Error(`Cannot render cassette label "${pieceId}".`);
  }
  const canvas = renderPieceToCanvas(pieceId, 220);
  const context = canvas.getContext('2d');
  if (!context) throw new Error(`Could not prepare the "${pieceId}" label texture.`);

  // Punch out ONLY the two reel holes matching state.js exactly
  if (piece.reelHoles) {
    context.save();
    context.globalCompositeOperation = 'destination-out';
    piece.reelHoles.forEach(hole => {
      const x = (hole.x / piece.w) * canvas.width;
      const y = (hole.y / piece.h) * canvas.height;
      const radius = ((hole.r + 0.5) / piece.w) * canvas.width;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    });
    context.restore();
  }
  return canvas;
}

function makeLabelTexture(pieceId, isBack = false) {
  const canvas = makeLabelCanvas(pieceId);
  const texture = new THREE.CanvasTexture(canvas);
  texture.encoding = THREE.sRGBEncoding;
  texture.anisotropy = Math.min(renderer3d ? renderer3d.capabilities.getMaxAnisotropy() : 4, 8);
  texture.needsUpdate = true;
  return texture;
}

function makeJcardFrontCanvas() {
  const source = renderPieceToCanvas('jcard', 220);
  const canvas = document.createElement('canvas');
  const sourceX = Math.round(((JCARD_FLAP_W + JCARD_SPINE_W) / JCARD_W) * source.width);
  const sourceWidth = Math.round((JCARD_FRONT_W / JCARD_W) * source.width);
  canvas.width = sourceWidth;
  canvas.height = source.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not prepare J-card front cover texture.');
  context.drawImage(source, sourceX, 0, sourceWidth, source.height, 0, 0, sourceWidth, source.height);
  return canvas;
}

function makeJcardSpineCanvas() {
  const source = renderPieceToCanvas('jcard', 220);
  const canvas = document.createElement('canvas');
  const sourceX = Math.round((JCARD_FLAP_W / JCARD_W) * source.width);
  const sourceWidth = Math.round((JCARD_SPINE_W / JCARD_W) * source.width);
  canvas.width = sourceWidth;
  canvas.height = source.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not prepare J-card spine texture.');
  context.drawImage(source, sourceX, 0, sourceWidth, source.height, 0, 0, sourceWidth, source.height);
  return canvas;
}

function makeJcardFlapCanvas() {
  const source = renderPieceToCanvas('jcard', 220);
  const canvas = document.createElement('canvas');
  const sourceWidth = Math.round((JCARD_FLAP_W / JCARD_W) * source.width);
  canvas.width = sourceWidth;
  canvas.height = source.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not prepare J-card flap texture.');
  context.drawImage(source, 0, 0, sourceWidth, source.height, 0, 0, sourceWidth, source.height);
  return canvas;
}

function makeCanvasTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.encoding = THREE.sRGBEncoding;
  texture.anisotropy = Math.min(renderer3d ? renderer3d.capabilities.getMaxAnisotropy() : 4, 8);
  texture.needsUpdate = true;
  return texture;
}

function makeLabelMaterial(texture) {
  return new THREE.MeshStandardMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.01,
    roughness: 0.65,
    metalness: 0.0,
    toneMapped: false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
    depthWrite: false
  });
}

// ── Cassette Geometry Builder ───────────────────────────────────────────────

function createRoundedRectShape(w, h, r) {
  const shape = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  const radius = Math.min(r, w / 2, h / 2);
  shape.moveTo(x + radius, y);
  shape.lineTo(x + w - radius, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + radius);
  shape.lineTo(x + w, y + h - radius);
  shape.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  shape.lineTo(x + radius, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

function buildCassette3d() {
  const textureA = makeLabelTexture('label-a', false);
  const textureB = makeLabelTexture('label-b', true);

  const group = new THREE.Group();

  // Materials
  const shellColor = 0x222527; // Clean matte dark graphite
  const shellMaterial = new THREE.MeshStandardMaterial({
    color: shellColor,
    roughness: 0.55,
    metalness: 0.08
  });
  const seamMaterial = new THREE.MeshStandardMaterial({
    color: 0x141617,
    roughness: 0.72
  });
  const screwMaterial = new THREE.MeshStandardMaterial({
    color: 0x90989e,
    roughness: 0.28,
    metalness: 0.85
  });
  const tapeMaterial = new THREE.MeshStandardMaterial({
    color: 0x1c1410, // Dark magnetic tape
    roughness: 0.35,
    metalness: 0.2
  });
  const hubMaterial = new THREE.MeshStandardMaterial({
    color: 0xe8e6de, // Cream white drive hub teeth
    roughness: 0.42,
    metalness: 0.05
  });
  const rollerMaterial = new THREE.MeshStandardMaterial({
    color: 0xd2d5d0,
    roughness: 0.35,
    metalness: 0.1
  });

  // Precise Coordinates
  // Reel holes are exactly centered vertically (Y = 0)
  // Label center is offset by +3.0mm (Y = +0.3 in 3D) to match JCardMaker label design
  const holeX = (CASSETTE_MM.reelDistance / 2) * PREVIEW_SCALE; // 2.2
  const holeY = 0; // Exactly centered
  const holeRadius = CASSETTE_MM.holeRadius * PREVIEW_SCALE; // 0.45

  // 1. Main Upper Shell (8.8 mm thick) with ONLY the two reel holes (Nothing in the middle!)
  const shellW = CASSETTE_MM.width * PREVIEW_SCALE;
  const shellH = CASSETTE_MM.height * PREVIEW_SCALE;
  const shellD = CASSETTE_MM.bodyDepth * PREVIEW_SCALE;
  const cornerR = 2.5 * PREVIEW_SCALE;

  const shellShape = createRoundedRectShape(shellW, shellH, cornerR);

  // Add ONLY the two circular reel holes to shellShape (CLEAN - no middle window clutter)
  [-holeX, holeX].forEach(rx => {
    const hole = new THREE.Path();
    hole.absarc(rx, holeY, holeRadius, 0, Math.PI * 2, true);
    shellShape.holes.push(hole);
  });

  const shellGeom = new THREE.ExtrudeGeometry(shellShape, {
    depth: shellD,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.02,
    bevelThickness: 0.02,
    curveSegments: 36
  });
  shellGeom.translate(0, 0, -shellD / 2);
  const shellMesh = new THREE.Mesh(shellGeom, shellMaterial);
  group.add(shellMesh);

  // 2. Center Seam Line (Split-half shell perimeter)
  const seamGeom = new THREE.ExtrudeGeometry(shellShape, {
    depth: 0.015,
    bevelEnabled: false,
    curveSegments: 36
  });
  seamGeom.translate(0, 0, -0.015 / 2);
  const seamMesh = new THREE.Mesh(seamGeom, seamMaterial);
  group.add(seamMesh);

  // 3. Lower Tape Path Trapezoid (12.0 mm thick - standard ISO 1134 projection)
  // Sits below the label from bottomY up to bottomY + trapH (-1.39), entirely below the label (-1.35)
  const trapBottomW = CASSETTE_MM.trapezoidBottomW * PREVIEW_SCALE;
  const trapTopW = CASSETTE_MM.trapezoidTopW * PREVIEW_SCALE;
  const trapH = CASSETTE_MM.trapezoidH * PREVIEW_SCALE;
  const trapD = CASSETTE_MM.trapezoidDepth * PREVIEW_SCALE;
  const bottomY = -shellH / 2;

  const trapShape = new THREE.Shape();
  trapShape.moveTo(-trapBottomW / 2, bottomY);
  trapShape.lineTo(trapBottomW / 2, bottomY);
  trapShape.lineTo(trapTopW / 2, bottomY + trapH);
  trapShape.lineTo(-trapTopW / 2, bottomY + trapH);
  trapShape.closePath();

  // Head openings cutout at the bottom edge
  const headHole = new THREE.Path();
  headHole.moveTo(-0.7, bottomY);
  headHole.lineTo(0.7, bottomY);
  headHole.lineTo(0.7, bottomY + 0.5);
  headHole.lineTo(-0.7, bottomY + 0.5);
  headHole.closePath();
  trapShape.holes.push(headHole);

  const trapGeom = new THREE.ExtrudeGeometry(trapShape, {
    depth: trapD,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.025,
    bevelThickness: 0.025,
    curveSegments: 24
  });
  trapGeom.translate(0, 0, -trapD / 2);
  const trapMesh = new THREE.Mesh(trapGeom, shellMaterial);
  group.add(trapMesh);

  // Tape ribbon in bottom opening
  const tapeRibbonGeom = new THREE.BoxGeometry(trapBottomW + 0.2, 0.38, 0.02);
  const tapeRibbon = new THREE.Mesh(tapeRibbonGeom, tapeMaterial);
  tapeRibbon.position.set(0, bottomY + 0.3, 0);
  group.add(tapeRibbon);

  // Corner guide rollers
  [-1, 1].forEach(sign => {
    const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.45, 18), rollerMaterial);
    roller.rotation.x = Math.PI / 2;
    roller.position.set(sign * (trapTopW / 2 - 0.25), bottomY + trapH * 0.45, 0);
    group.add(roller);
  });

  // 4. Two Reel Holes with Drive Teeth (Open pass-through holes - completely blank inside!)
  [-holeX, holeX].forEach(rx => {
    const reelGroup = new THREE.Group();
    reelGroup.position.set(rx, holeY, 0);

    // 6 Inward drive splines (teeth) along the rim of the hole
    for (let s = 0; s < 6; s++) {
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, shellD * 0.95), hubMaterial);
      const angle = (s * Math.PI) / 3;
      tooth.position.set(Math.cos(angle) * (holeRadius - 0.05), Math.sin(angle) * (holeRadius - 0.05), 0);
      tooth.rotation.z = angle;
      reelGroup.add(tooth);
    }

    group.add(reelGroup);
  });

  // 5. 5 Corner/Top Assembly Screws on the cassette shell
  const screwPositions = [
    [-shellW / 2 + 0.45, shellH / 2 - 0.4],
    [shellW / 2 - 0.45, shellH / 2 - 0.4],
    [-shellW / 2 + 0.45, -shellH / 2 + 0.55],
    [shellW / 2 - 0.45, -shellH / 2 + 0.55],
    [0, shellH / 2 - 0.38]
  ];
  screwPositions.forEach(([sx, sy]) => {
    [-1, 1].forEach(sign => {
      const screwHead = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.11, 0.04, 16),
        screwMaterial
      );
      screwHead.rotation.x = Math.PI / 2;
      screwHead.position.set(sx, sy, sign * (shellD / 2 + 0.01));

      const slot1 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.025, 0.015), seamMaterial);
      const slot2 = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.14, 0.015), seamMaterial);
      slot1.position.set(sx, sy, sign * (shellD / 2 + 0.02));
      slot2.position.set(sx, sy, sign * (shellD / 2 + 0.02));
      group.add(screwHead, slot1, slot2);
    });
  });

  // 6. Labels A and B - Mapped on the exterior face of the cassette
  const labelY = CASSETTE.labelCenterY; // 0.90
  const labelGeom = new THREE.PlaneGeometry(CASSETTE.labelW, CASSETTE.labelH);
  const labelZ = shellD / 2 + 0.02 + 0.008; // 0.468 - in front of shell 0.460!

  // Side A Label on Front (+Z)
  const frontLabel = new THREE.Mesh(labelGeom, makeLabelMaterial(textureA));
  frontLabel.name = 'frontLabel';
  frontLabel.position.set(0, labelY, labelZ);
  frontLabel.renderOrder = 5;
  group.add(frontLabel);

  // Side B Label on Back (-Z) - ALWAYS PRESENT AND UN-MIRRORED!
  const backLabel = new THREE.Mesh(labelGeom, makeLabelMaterial(textureB));
  backLabel.name = 'backLabel';
  backLabel.position.set(0, labelY, -labelZ);
  backLabel.rotation.y = Math.PI;
  backLabel.renderOrder = 5;
  group.add(backLabel);

  return group;
}

// ── Closed Norelco Jewel Case Builder ───────────────────────────────────────

function buildClosedCase3d() {
  const frontTex = makeCanvasTexture(makeJcardFrontCanvas());
  const spineTex = makeCanvasTexture(makeJcardSpineCanvas());
  const flapTex = makeCanvasTexture(makeJcardFlapCanvas());

  const group = new THREE.Group();

  const caseW = JCASE.width;
  const caseH = JCASE.height;
  const caseD = JCASE.depth;

  // Clear acrylic materials for the Norelco box
  const clearLidMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xe8f4ee,
    roughness: 0.12,
    metalness: 0.02,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const clearEdgeMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xc8dad3,
    roughness: 0.18,
    metalness: 0.06,
    transparent: true,
    opacity: 0.55,
    depthWrite: false
  });
  const paperBackingMaterial = new THREE.MeshStandardMaterial({
    color: 0xf6f3eb,
    roughness: 0.88
  });

  // 1. Clear Outer Shell Box (Lid & Tray)
  const outerBoxGeom = new THREE.BoxGeometry(caseW, caseH, caseD);
  const outerBox = new THREE.Mesh(outerBoxGeom, clearLidMaterial);
  group.add(outerBox);

  // Edge frames / rails representing wall thickness
  const wall = 0.08;
  const rails = [
    [wall, caseH, caseD, -caseW / 2 + wall / 2, 0],
    [wall, caseH, caseD, caseW / 2 - wall / 2, 0],
    [caseW, wall, caseD, 0, caseH / 2 - wall / 2],
    [caseW, wall, caseD, 0, -caseH / 2 + wall / 2]
  ];
  rails.forEach(([w, h, d, rx, ry]) => {
    const railMesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), clearEdgeMaterial);
    railMesh.position.set(rx, ry, 0);
    group.add(railMesh);
  });

  // Side hinge barrels near bottom
  [-1, 1].forEach(sign => {
    const hinge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.65, 16),
      clearEdgeMaterial
    );
    hinge.position.set(sign * (caseW / 2 + 0.02), -caseH * 0.32, 0);
    group.add(hinge);
  });

  // Two spindle holding prongs in the back tray
  [-1, 1].forEach(sign => {
    const prong = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.45, 0.5, 20),
      clearEdgeMaterial
    );
    prong.rotation.x = Math.PI / 2;
    prong.position.set(0, sign * (CASSETTE_MM.reelDistance * PREVIEW_SCALE / 2), -caseD / 2 + 0.3);
    group.add(prong);
  });

  // 2. Realistic J-Card Wrapped Inside the Case
  const cardH = JCARD_H * PREVIEW_SCALE;
  const frontW = JCARD_FRONT_W * PREVIEW_SCALE;
  const spineW = JCARD_SPINE_W * PREVIEW_SCALE;
  const flapW = JCARD_FLAP_W * PREVIEW_SCALE;

  const cardZFront = caseD / 2 - wall - 0.01;
  const cardZBack = cardZFront - spineW;

  // A. Front Cover Panel
  const frontMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(frontW, cardH),
    new THREE.MeshStandardMaterial({ map: frontTex, roughness: 0.75, toneMapped: false, side: THREE.FrontSide })
  );
  frontMesh.name = 'closedCaseFrontArtwork';
  frontMesh.position.set(-caseW / 2 + wall + frontW / 2, 0, cardZFront);
  group.add(frontMesh);

  // Front panel paper backing
  const frontBacking = new THREE.Mesh(new THREE.PlaneGeometry(frontW, cardH), paperBackingMaterial);
  frontBacking.rotation.y = Math.PI;
  frontBacking.position.set(frontMesh.position.x, 0, cardZFront - 0.005);
  group.add(frontBacking);

  // B. Spine Panel (folds 90 degrees along left edge)
  const spineMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(spineW, cardH),
    new THREE.MeshStandardMaterial({ map: spineTex, roughness: 0.75, toneMapped: false, side: THREE.FrontSide })
  );
  spineMesh.name = 'closedCaseSpine';
  spineMesh.rotation.y = -Math.PI / 2;
  spineMesh.position.set(-caseW / 2 + wall, 0, cardZFront - spineW / 2);
  group.add(spineMesh);

  // Spine paper backing facing inside
  const spineBacking = new THREE.Mesh(new THREE.PlaneGeometry(spineW, cardH), paperBackingMaterial);
  spineBacking.rotation.y = Math.PI / 2;
  spineBacking.position.set(-caseW / 2 + wall + 0.004, 0, cardZFront - spineW / 2);
  group.add(spineBacking);

  // C. Back Flap Panel (folds 90 degrees around to back of case - completely clean, NO screws!)
  const flapMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(flapW, cardH),
    new THREE.MeshStandardMaterial({ map: flapTex, roughness: 0.75, toneMapped: false, side: THREE.FrontSide })
  );
  flapMesh.name = 'closedCaseFlap';
  flapMesh.rotation.y = Math.PI;
  flapMesh.position.set(-caseW / 2 + wall + flapW / 2, 0, cardZBack);
  group.add(flapMesh);

  // Flap paper backing facing inside
  const flapBacking = new THREE.Mesh(new THREE.PlaneGeometry(flapW, cardH), paperBackingMaterial);
  flapBacking.position.set(flapMesh.position.x, 0, cardZBack + 0.004);
  group.add(flapBacking);

  return group;
}

// ── Soft Contact Shadows ───────────────────────────────────────────────────

function makeSoftShadow(dimensions) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create contact shadow.');

  const gradient = context.createRadialGradient(128, 128, 12, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(28, 38, 34, 0.35)');
  gradient.addColorStop(0.5, 'rgba(28, 38, 34, 0.12)');
  gradient.addColorStop(1, 'rgba(28, 38, 34, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(dimensions.width * 1.4, dimensions.width * 0.95),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -dimensions.height / 2 - 0.02;
  shadow.renderOrder = -1;
  return shadow;
}

// ── Resource Cleanup ────────────────────────────────────────────────────────

function disposeObject3d(object) {
  if (!object) return;
  object.traverse(child => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach(mat => {
        if (mat.map) mat.map.dispose();
        mat.dispose();
      });
    }
  });
}

// ── Zoom & View Controls ────────────────────────────────────────────────────

function updateZoomTarget() {
  const slider = document.getElementById('view3d_zoom');
  if (slider) zoom3d = Number(slider.value);
  targetDistance3d = baseDistance3d * (1 - 0.55 * (zoom3d / 100));
}

function setSide3d(side) {
  activeSide3d = side;
  const sideAButton = document.getElementById('view3d_sideA');
  const sideBButton = document.getElementById('view3d_sideB');
  if (sideAButton) {
    sideAButton.classList.toggle('active', side === 'A');
    sideAButton.setAttribute('aria-pressed', String(side === 'A'));
  }
  if (sideBButton) {
    sideBButton.classList.toggle('active', side === 'B');
    sideBButton.setAttribute('aria-pressed', String(side === 'B'));
  }

  // Smoothly turn cassette to face the chosen side (Both labels stay visible!)
  const baseAngle = 0.04;
  targetRotation3d.y = side === 'A' ? baseAngle : baseAngle + Math.PI;
}

function setProductMode3d(mode) {
  displayMode3d = mode;
  if (!product3d) return;

  const cassette = product3d.getObjectByName('cassetteView');
  const closedCase = product3d.getObjectByName('closedCaseView');

  if (cassette) cassette.visible = mode === 'cassette';
  if (closedCase) closedCase.visible = mode === 'closed-case';

  rotatingProduct3d = mode === 'cassette' ? cassette : closedCase;

  const cassetteShadow = product3d.getObjectByName('cassetteShadow');
  const closedCaseShadow = product3d.getObjectByName('closedCaseShadow');

  if (cassetteShadow) cassetteShadow.visible = mode === 'cassette';
  if (closedCaseShadow) closedCaseShadow.visible = mode === 'closed-case';

  const cassetteButton = document.getElementById('view3d_cassette');
  const closedCaseButton = document.getElementById('view3d_closedCase');
  if (cassetteButton) {
    cassetteButton.classList.toggle('active', mode === 'cassette');
    cassetteButton.setAttribute('aria-pressed', String(mode === 'cassette'));
  }
  if (closedCaseButton) {
    closedCaseButton.classList.toggle('active', mode === 'closed-case');
    closedCaseButton.setAttribute('aria-pressed', String(mode === 'closed-case'));
  }

  const modal = document.getElementById('modal3d');
  if (modal) modal.classList.toggle('case-mode', CASE_MODES_3D.has(mode));

  // Update real-world dimensions badge
  const dimCassette = document.querySelector('.preview-dimension-cassette');
  if (dimCassette) {
    const span = dimCassette.querySelector('span');
    const small = dimCassette.querySelector('small');
    if (span) {
      span.textContent = mode === 'cassette'
        ? '100.4 × 63.8 × 12.0 mm'
        : '65 × 101.5 mm';
    }
    if (small) {
      small.textContent = mode === 'cassette'
        ? '3.95 × 2.51 × 0.47 in · ISO 1134'
        : '2.56 × 4.00 in · front cover';
    }
    if (dimCassette.firstChild) {
      dimCassette.firstChild.textContent = mode === 'cassette'
        ? 'CASSETTE (W × H × D) '
        : 'J-CARD FRONT ';
    }
  }

  const dimCase = document.querySelector('.preview-dimension-case');
  if (dimCase) {
    const span = dimCase.querySelector('span');
    const small = dimCase.querySelector('small');
    if (dimCase.firstChild) {
      dimCase.firstChild.textContent = 'CASE (W × H × D) ';
    }
    if (span) span.textContent = '70 × 110 × 16.5 mm';
    if (small) small.textContent = '2.76 × 4.33 × 0.65 in';
  }

  const title = document.getElementById('modal3dTitle');
  if (title) {
    title.textContent = mode === 'cassette'
      ? 'Cassette labels (Sides A & B)'
      : 'Cassette case · J-card cover';
  }

  targetRotation3d.x = CASE_MODES_3D.has(mode) ? -0.16 : -0.08;
  targetRotation3d.y = CASE_MODES_3D.has(mode) ? 0.28 : 0.04;
  resizeRenderer3d();
}

function resetView3d() {
  setSide3d('A');
  const defaultRotation = CASE_MODES_3D.has(displayMode3d) ? { x: -0.16, y: 0.28 } : { x: -0.08, y: 0.04 };
  rotation3d = { ...defaultRotation };
  targetRotation3d = { ...defaultRotation };
  position3d = { x: 0, y: 0 };
  targetPosition3d = { x: 0, y: 0 };
  const slider = document.getElementById('view3d_zoom');
  if (slider) slider.value = '42';
  zoom3d = 42;
  updateZoomTarget();
}

function setLabelArtworkVisible3d(visible) {
  labelArtworkVisible3d = visible;
  const button = document.getElementById('view3d_label');
  if (button) {
    button.classList.toggle('active', visible);
    button.setAttribute('aria-pressed', String(visible));
    button.textContent = `Label artwork ${visible ? 'on' : 'off'}`;
  }

  // Toggles BOTH labels on the cassette simultaneously!
  if (product3d) {
    const frontLabel = product3d.getObjectByName('frontLabel');
    const backLabel = product3d.getObjectByName('backLabel');
    if (frontLabel) frontLabel.visible = visible;
    if (backLabel) backLabel.visible = visible;
  }
}

function resizeRenderer3d() {
  if (!renderer3d || !camera3d) return;
  const body = document.getElementById('modal3dBody');
  if (!body) return;
  const width = body.clientWidth;
  const height = body.clientHeight;
  if (!width || !height) return;

  renderer3d.setSize(width, height, false);
  camera3d.aspect = width / height;
  camera3d.updateProjectionMatrix();

  const dimensions = CASE_MODES_3D.has(displayMode3d) ? JCASE : CASSETTE;
  const halfHeight = dimensions.height / 2 + 0.35;
  const productWidth = displayMode3d === 'closed-case' ? JCASE.width : CASSETTE.width;
  const halfWidth = productWidth / 2 + 0.35;
  const halfFov = (CAMERA_FOV * Math.PI) / 360;

  baseDistance3d = (Math.max(halfHeight, halfWidth / camera3d.aspect) / Math.tan(halfFov)) * 1.45;
  updateZoomTarget();
}

// ── WebGL Engine Initialization ─────────────────────────────────────────────

function startRenderer3d(body) {
  renderer3d = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer3d.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer3d.setClearColor(0x000000, 0);
  renderer3d.outputEncoding = THREE.sRGBEncoding;
  renderer3d.toneMapping = THREE.ACESFilmicToneMapping;
  renderer3d.toneMappingExposure = 1.05;
  body.appendChild(renderer3d.domElement);

  scene3d = new THREE.Scene();
  camera3d = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 100);
  camera3d.position.set(0, 0, targetDistance3d);

  // Studio lighting
  scene3d.add(new THREE.HemisphereLight(0xf6faf7, 0x82948b, 0.65));

  const keyLight = new THREE.DirectionalLight(0xfff6ea, 1.45);
  keyLight.position.set(-4, 7, 8);
  scene3d.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xdcf2e8, 0.52);
  fillLight.position.set(6, 2, 5);
  scene3d.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xffffff, 0.85);
  rimLight.position.set(0, 3, -7);
  scene3d.add(rimLight);

  inputController3d = new AbortController();
  wireControls3d(renderer3d.domElement, inputController3d.signal);
  resizeRenderer3d();
}

function wireControls3d(canvas, signal) {
  const onPointerDown = event => {
    if (event.button !== 0 && event.button !== 1 && event.button !== 2) return;
    isDragging3d = true;
    dragMode3d = event.button === 2 || event.shiftKey || event.button === 1 ? 'move' : 'rotate';
    lastPointer3d = { x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
  };
  canvas.addEventListener('pointerdown', onPointerDown, { signal });

  canvas.addEventListener('pointermove', event => {
    if (!isDragging3d) return;
    const dx = event.clientX - lastPointer3d.x;
    const dy = event.clientY - lastPointer3d.y;
    if (dragMode3d === 'rotate') {
      targetRotation3d.y += dx * 0.006;
      targetRotation3d.x = Math.max(-0.95, Math.min(0.95, targetRotation3d.x + dy * 0.005));
    } else {
      const unitsPerPixel = (targetDistance3d * Math.tan((CAMERA_FOV * Math.PI) / 360) * 2) / canvas.clientHeight;
      targetPosition3d.x += dx * unitsPerPixel;
      targetPosition3d.y -= dy * unitsPerPixel;
    }
    lastPointer3d = { x: event.clientX, y: event.clientY };
  }, { signal });

  const endPointer = () => { isDragging3d = false; };
  canvas.addEventListener('pointerup', endPointer, { signal });
  canvas.addEventListener('pointercancel', endPointer, { signal });
  canvas.addEventListener('lostpointercapture', endPointer, { signal });
  canvas.addEventListener('contextmenu', event => event.preventDefault(), { signal });

  canvas.addEventListener('wheel', event => {
    event.preventDefault();
    targetDistance3d = Math.max(
      baseDistance3d * 0.42,
      Math.min(baseDistance3d * 1.15, targetDistance3d * Math.exp(event.deltaY * 0.001))
    );
    zoom3d = Math.round(((1 - targetDistance3d / baseDistance3d) / 0.55) * 100);
    const slider = document.getElementById('view3d_zoom');
    if (slider) slider.value = String(Math.max(0, Math.min(100, zoom3d)));
  }, { passive: false, signal });

  window.addEventListener('resize', resizeRenderer3d, { signal });
}

function animate3d(time) {
  animationFrame3d = requestAnimationFrame(animate3d);
  if (!renderer3d || !scene3d || !camera3d) return;

  const delta = lastFrameTime3d ? Math.min((time - lastFrameTime3d) / 1000, 0.05) : 0;
  lastFrameTime3d = time;
  const easing = 1 - Math.exp(-delta * 7.0);

  if (autoRotate3d && !isDragging3d) targetRotation3d.y += delta * 0.22;
  rotation3d.x += (targetRotation3d.x - rotation3d.x) * easing;
  rotation3d.y += (targetRotation3d.y - rotation3d.y) * easing;
  position3d.x += (targetPosition3d.x - position3d.x) * easing;
  position3d.y += (targetPosition3d.y - position3d.y) * easing;
  targetDistance3d = Math.max(baseDistance3d * 0.42, Math.min(baseDistance3d * 1.15, targetDistance3d));

  if (rotatingProduct3d) {
    rotatingProduct3d.rotation.set(rotation3d.x, rotation3d.y, 0);
  }
  if (product3d) {
    product3d.position.set(position3d.x, position3d.y, 0);
  }
  camera3d.position.set(0, 0, targetDistance3d);
  camera3d.lookAt(0, 0, 0);
  renderer3d.render(scene3d, camera3d);
}

function showPreviewError(error) {
  console.error('Could not render the 3D cassette preview:', error);
  const loading = document.getElementById('modal3dLoading');
  const text = document.getElementById('modal3dLoadingText');
  if (loading) {
    loading.style.display = 'flex';
    const spinner = loading.querySelector('.preview-spinner');
    if (spinner) spinner.style.display = 'none';
  }
  if (text) text.textContent = 'The cassette preview could not be rendered. Close it and try again.';
}

function openPreview3d() {
  const modal = document.getElementById('modal3d');
  const body = document.getElementById('modal3dBody');
  const loading = document.getElementById('modal3dLoading');
  const loadingText = document.getElementById('modal3dLoadingText');
  const spinner = loading ? loading.querySelector('.preview-spinner') : null;
  const buildVersion = ++buildVersion3d;

  if (modal) modal.classList.add('open');
  if (loading) loading.style.display = 'flex';
  if (spinner) spinner.style.display = '';
  if (loadingText) loadingText.textContent = 'Preparing your cassette…';

  if (typeof THREE === 'undefined') {
    showPreviewError(new Error('Three.js is unavailable.'));
    return;
  }

  try {
    if (!renderer3d) startRenderer3d(body);

    const nextProduct = buildCassette3d();
    const nextClosedCase = buildClosedCase3d();

    if (buildVersion !== buildVersion3d || !modal.classList.contains('open')) {
      disposeObject3d(nextProduct);
      disposeObject3d(nextClosedCase);
      return;
    }

    if (product3d) {
      scene3d.remove(product3d);
      disposeObject3d(product3d);
    }

    product3d = new THREE.Group();

    const cassetteView = new THREE.Group();
    cassetteView.name = 'cassetteView';
    cassetteView.add(nextProduct);

    const closedCaseView = new THREE.Group();
    closedCaseView.name = 'closedCaseView';
    closedCaseView.add(nextClosedCase);
    closedCaseView.visible = false;

    const cassetteShadow = makeSoftShadow(CASSETTE);
    cassetteShadow.name = 'cassetteShadow';

    const closedCaseShadow = makeSoftShadow(JCASE);
    closedCaseShadow.name = 'closedCaseShadow';
    closedCaseShadow.visible = false;

    product3d.add(
      cassetteShadow,
      closedCaseShadow,
      cassetteView,
      closedCaseView
    );

    scene3d.add(product3d);
    setProductMode3d(displayMode3d);
    resetView3d();
    resizeRenderer3d();
    lastFrameTime3d = 0;

    if (animationFrame3d) cancelAnimationFrame(animationFrame3d);
    animate3d(performance.now());
    if (loading) loading.style.display = 'none';
  } catch (error) {
    if (buildVersion === buildVersion3d) showPreviewError(error);
  }
}

function closePreview3d() {
  buildVersion3d++;
  const modal = document.getElementById('modal3d');
  if (modal) modal.classList.remove('open');
  if (animationFrame3d) cancelAnimationFrame(animationFrame3d);
  animationFrame3d = null;
  if (inputController3d) inputController3d.abort();
  inputController3d = null;
  isDragging3d = false;
  if (product3d) disposeObject3d(product3d);
  product3d = null;
  rotatingProduct3d = null;
  scene3d = null;
  camera3d = null;
  if (renderer3d) {
    renderer3d.dispose();
    renderer3d.domElement.remove();
    renderer3d = null;
  }
}

// ── DOM Event Listeners ────────────────────────────────────────────────────

document.getElementById('preview3dBtn')?.addEventListener('click', openPreview3d);
document.getElementById('modal3dClose')?.addEventListener('click', closePreview3d);
document.getElementById('modal3d')?.addEventListener('click', event => {
  if (event.target === event.currentTarget) closePreview3d();
});
document.getElementById('view3d_sideA')?.addEventListener('click', () => setSide3d('A'));
document.getElementById('view3d_sideB')?.addEventListener('click', () => setSide3d('B'));
document.getElementById('view3d_label')?.addEventListener('click', () => setLabelArtworkVisible3d(!labelArtworkVisible3d));
document.getElementById('view3d_cassette')?.addEventListener('click', () => setProductMode3d('cassette'));
document.getElementById('view3d_closedCase')?.addEventListener('click', () => setProductMode3d('closed-case'));
document.getElementById('view3d_reset')?.addEventListener('click', resetView3d);
document.getElementById('view3d_zoom')?.addEventListener('input', updateZoomTarget);
document.getElementById('view3d_auto')?.addEventListener('click', function() {
  autoRotate3d = !autoRotate3d;
  this.textContent = `Auto-rotate ${autoRotate3d ? 'on' : 'off'}`;
  this.classList.toggle('active', autoRotate3d);
  this.setAttribute('aria-pressed', String(autoRotate3d));
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && document.getElementById('modal3d')?.classList.contains('open')) {
    closePreview3d();
  }
});
