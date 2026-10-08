// ui.js
let currentTextColor = '#000000';
let activeColorMode = 'text'; // 'text' for Text Color, 'bg' for Background
const UI_COLOR_STORAGE_KEY = 'jcard_ui_color';
const UI_THEME_STORAGE_KEY = 'jcard_ui_theme';

// ── Default font settings (used when nothing is selected) ────────────────────
let defaultFontSettings = {
  font: 'sans',
  size: 5,
  fontWeight: 700,
  letterSpacing: 0,
  lineHeight: 1.25,
  align: 'center',
  smallCaps: false,
  italic: false,
  allCaps: false,
  shadow: false,
  outline: false,
  color: '#000000'
};

// ── Artwork state ─────────────────────────────────────────────────────────────
let artworkImages = []; // {img, url, name}
let selectedArtworkIdx = -1;
let restoredArtworkLibrary = [];
let restoredSelectedArtworkDataUrl = null;
let artSettings = { zoom: 1, rotate: 0, opacity: 1, sizing: 'fill', flipX: false, flipY: false };
let customLogoLibrary = [];
let restoredCustomLogoLibrary = [];

// ─────────────────────────────────────────────────────────────────────────────
function seedDefaults(){
  const jc = state['jcard'];
  jc.bgColor = '#E9E3D5';
  currentTextColor = '#000000';
  jc.layers.push({
    id: uid(), type: 'rect', fill: '#B47C4A', strokeOnly: true,
    w: 56, h: 85, x: 71.5, y: 50.75, rotation: 0, opacity: 1,
    role: 'frontFrame'
  });
  jc.layers.push({
    id: uid(), type: 'line', fill: '#B47C4A', thickness: 0.7,
    w: 42, x: 71.5, y: 78, rotation: 0, opacity: 1,
    role: 'frontDivider'
  });
  jc.layers.push({
    id: uid(), type: 'text', text: 'MIXTAPE • SIDE A + B',
    font: 'mono', size: 1.8, color: '#7A6045', bold: true, letterSpacing: 0.15,
    align: 'center', textCase: 'upper', x: 71.5, y: 20, rotation: 0, opacity: 1,
    role: 'coverKicker'
  });
  jc.layers.push({
    id: uid(), type: 'text', text: '10 TRACKS • 30:29',
    font: 'mono', size: 2, color: '#7A6045', bold: true, letterSpacing: 0.1,
    align: 'center', textCase: 'upper', x: 71.5, y: 85, rotation: 0, opacity: 1,
    role: 'coverTrackSummary'
  });

  // Flap Barcode
  jc.layers.push({
    id: uid(), type: 'barcode', barcodeValue: '001586476451', barcodeType: 'ean13',
    color: '#000000', bgColor: '#ffffff', w: 21, h: 10, x: 16.5, y: 84, rotation: 90, opacity: 1,
    role: 'flapBarcode'
  });

  // Flap Dolby
  jc.layers.push({
    id: uid(), type: 'text', text: 'DO STEREO SURROUND', font: 'sans', size: 2.2, color: '#000000',
    bold: true, align: 'center', textCase: 'upper', rotation: 90, opacity: 1,
    x: 5.5, y: 84, role: 'flapDolby'
  });

  const back = state['jcard-back'];
  back.bgColor = '#E9E3D5';

  state['label-a'].layers.push({
    id:uid(), type:'text', text:'Artist Name', font:'sans', size:3, color:'#1C1A16',
    bold:true, align:'center', textCase:'none', x:44.5, y:7, role:'labelArtist'
  });
  state['label-a'].layers.push({
    id:uid(), type:'wraptext', text:'1. TRACK 1 • 2. TRACK 2', font:'sans', size:2.4, color:'#B4436C',
    bold:true, align:'center', maxW:80, textCase:'none', x:44.5, y:12, role:'labelTracksA'
  });
  state['label-a'].layers.push({
    id:uid(), type:'text', text:'SIDE A', font:'sans', size:3.8, color:'#1C1A16',
    bold:true, align:'center', textCase:'upper', x:80, y:25.5, role:'labelSideA'
  });
  state['label-a'].layers.push({
    id:uid(), type:'text', text:'STEREO', font:'sans', size:2.4, color:'#1C1A16',
    bold:true, align:'left', textCase:'upper', x:5, y:25.5, role:'labelStereo'
  });
  state['label-a'].layers.push({
    id:uid(), type:'text', text:'Album Title', font:'sans', size:3, color:'#1C1A16',
    bold:true, align:'center', textCase:'none', x:44.5, y:39, role:'labelAlbum'
  });
  state['label-a'].layers.push({
    id:uid(), type:'text', text:'MIXTAPE', font:'sans', size:2.0, color:'#888',
    bold:false, align:'center', textCase:'none', x:44.5, y:42.5, role:'labelYear'
  });

  state['label-b'].layers.push({
    id:uid(), type:'text', text:'Artist Name', font:'sans', size:3, color:'#1C1A16',
    bold:true, align:'center', textCase:'none', x:44.5, y:7, role:'labelArtist'
  });
  state['label-b'].layers.push({
    id:uid(), type:'wraptext', text:'1. TRACK 5 • 2. TRACK 6', font:'sans', size:2.4, color:'#B4436C',
    bold:true, align:'center', maxW:80, textCase:'none', x:44.5, y:12, role:'labelTracksB'
  });
  state['label-b'].layers.push({
    id:uid(), type:'text', text:'SIDE B', font:'sans', size:3.8, color:'#1C1A16',
    bold:true, align:'center', textCase:'upper', x:80, y:25.5, role:'labelSideB'
  });
  state['label-b'].layers.push({
    id:uid(), type:'text', text:'STEREO', font:'sans', size:2.4, color:'#1C1A16',
    bold:true, align:'left', textCase:'upper', x:5, y:25.5, role:'labelStereo'
  });
  state['label-b'].layers.push({
    id:uid(), type:'text', text:'Album Title', font:'sans', size:3, color:'#1C1A16',
    bold:true, align:'center', textCase:'none', x:44.5, y:39, role:'labelAlbum'
  });
  state['label-b'].layers.push({
    id:uid(), type:'text', text:'MIXTAPE', font:'sans', size:2.0, color:'#888',
    bold:false, align:'center', textCase:'none', x:44.5, y:42.5, role:'labelYear'
  });
}

function updateLayerText(role, text) {
  PIECES.forEach(p => {
    state[p.id].layers.forEach(l => {
      if(l.role === role){
        l.text = text;
        if(/[\u0D00-\u0D7F]/.test(String(text))) l.font = 'malayalam';
      }
    });
  });
  render();
}

document.getElementById('albumNameInput').addEventListener('input', () => {
  const title = document.getElementById('albumNameInput').value.trim();
  const heading = document.getElementById('projectHeaderTitle');
  if(heading) heading.textContent = title || 'Untitled J-Card';
  if(window.syncTracksToCanvas) syncTracksToCanvas();
});
document.getElementById('artistNameInput').addEventListener('input', () => {
  if(window.syncTracksToCanvas) syncTracksToCanvas();
});


// ── Tab switching ─────────────────────────────────────────────────────────────
function initTabs(){
  const mainTabBtns = document.querySelectorAll('.main-tab');
  const panels = document.querySelectorAll('.tab-panel');

  mainTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      mainTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      panels.forEach(p => {
        p.classList.toggle('active', p.dataset.panel === target);
      });
    });
  });
}

function switchPiece(pieceId){
  selectedTrackGroup = null;
  currentPieceId = pieceId;
  selectedLayerId = null;
  if(window.syncImageControls) window.syncImageControls();
  const isSideB = pieceId === 'label-b' || pieceId === 'jcard-back';
  document.getElementById('btnSideA')?.classList.toggle('active', !isSideB);
  document.getElementById('btnSideB')?.classList.toggle('active', isSideB);
  buildTabs();
  resizeCanvasForPiece();
  updateLayoutControls();
  updateBgSwatchIndicator(currentState().bgColor || '#F4F0E6');
  if (activeColorMode === 'bg') updateColorUI(currentState().bgColor || '#F4F0E6');
  render();
  syncLabelShapeControls();
  if(window.syncLabelControlsFromCanvas) window.syncLabelControlsFromCanvas();
}
window.switchPiece = switchPiece;

// ── Piece tabs ────────────────────────────────────────────────────────────────
function buildTabs(){
  const wrap = document.getElementById('pieceTabs');
  wrap.innerHTML = '';
  PIECES.forEach((p) => {
    const btn = document.createElement('button');
    btn.className = 'sub-tab';
    btn.id = `pieceTab-${p.id}`;
    if(p.id === currentPieceId) btn.classList.add('active-piece');
    btn.textContent = p.tabLabel;
    btn.onclick = () => switchPiece(p.id);
    wrap.appendChild(btn);
  });

}

function addNewTextLayer(){
  pushHistory();
  const p = currentPiece();
  const layer = {
    id: uid(), type: 'text', text: 'New Text', font: defaultFontSettings.font,
    size: defaultFontSettings.size, color: defaultFontSettings.color,
    fontWeight: defaultFontSettings.fontWeight,
    letterSpacing: defaultFontSettings.letterSpacing,
    lineHeight: defaultFontSettings.lineHeight || 1.25,
    smallCaps: defaultFontSettings.smallCaps,
    italic: defaultFontSettings.italic, allCaps: defaultFontSettings.allCaps,
    shadow: defaultFontSettings.shadow, outline: defaultFontSettings.outline,
    bold: defaultFontSettings.fontWeight >= 700,
    align: defaultFontSettings.align || 'center', textCase: defaultFontSettings.allCaps ? 'upper' : 'none', rotation: 0, opacity: 1,
    x: snapToGrid ? Math.round((p.w/2) / gridSpacingMm) * gridSpacingMm : p.w/2,
    y: snapToGrid ? Math.round((p.h/2) / gridSpacingMm) * gridSpacingMm : p.h/2
  };
  currentState().layers.push(layer);
  selectedLayerId = layer.id;
  syncFontPanelToLayer(layer);
  render();
  openInlineEdit(layer, null);
}
document.getElementById('btnAddTextLayer')?.addEventListener('click', addNewTextLayer);

function addBarcodeLayer(value, type) {
  pushHistory();
  const p = currentPiece();
  const layer = {
    id: uid(),
    type: 'barcode',
    barcodeValue: value || '0000000000000',
    barcodeType: type || 'ean13',
    color: '#000000',
    bgColor: '#ffffff',
    w: 22, h: 14,
    x: p.w/2, y: p.h/2,
    rotation: 0, opacity: 1
  };
  currentState().layers.push(layer);
  selectedLayerId = layer.id;
  render();
  if(window.updateLayerToolbar) window.updateLayerToolbar();
}
window.addBarcodeLayer = addBarcodeLayer;

function addPrimitiveShape(type){
  if(!['line', 'rect', 'circle'].includes(type)) return;
  pushHistory();
  const p = currentPiece();
  const centerX = snapToGrid ? Math.round((p.w / 2) / gridSpacingMm) * gridSpacingMm : p.w / 2;
  const centerY = snapToGrid ? Math.round((p.h / 2) / gridSpacingMm) * gridSpacingMm : p.h / 2;
  const layer = {
    id: uid(),
    type,
    fill: '#B4436C',
    strokeOnly: type !== 'rect',
    x: centerX,
    y: centerY,
    rotation: 0,
    opacity: 1,
    ...(type === 'line' ? { w: 30, thickness: 2, name: 'Line' } :
      type === 'circle' ? { r: 9, name: 'Circle' } : { w: 18, h: 18, name: 'Square' })
  };
  currentState().layers.push(layer);
  selectedLayerId = layer.id;
  if(window.clearFontPanel) window.clearFontPanel();
  if(window.syncImageControls) window.syncImageControls();
  render();
  if(window.updateLayerToolbar) window.updateLayerToolbar();
}

document.getElementById('btnAddLineShape')?.addEventListener('click', () => addPrimitiveShape('line'));
document.getElementById('btnAddSquareShape')?.addEventListener('click', () => addPrimitiveShape('rect'));
document.getElementById('btnAddCircleShape')?.addEventListener('click', () => addPrimitiveShape('circle'));

const shapeColorInput = document.getElementById('shapeColorInput');
let shapeColorHistoryStarted = false;
function syncShapeColorControl(){
  if(!shapeColorInput) return;
  const layer = selectedLayer();
  const isShape = layer && ['line', 'rect', 'circle'].includes(layer.type);
  shapeColorInput.disabled = !isShape;
  if(isShape) shapeColorInput.value = /^#[0-9a-f]{6}$/i.test(layer.fill || '') ? layer.fill : '#000000';
  const status = document.getElementById('shapeColorStatus');
  if(status) status.textContent = isShape
    ? `Changing this color affects only the selected ${layer.name || layer.type}.`
    : 'Select a line, square, or circle to change its color.';
}
window.syncShapeColorControl = syncShapeColorControl;

shapeColorInput?.addEventListener('input', () => {
  const layer = selectedLayer();
  if(!layer || !['line', 'rect', 'circle'].includes(layer.type)) return;
  if(!shapeColorHistoryStarted){
    pushHistory();
    shapeColorHistoryStarted = true;
  }
  layer.fill = shapeColorInput.value;
  render();
});
shapeColorInput?.addEventListener('change', () => { shapeColorHistoryStarted = false; });
shapeColorInput?.addEventListener('blur', () => { shapeColorHistoryStarted = false; });

// ── Tracklist ─────────────────────────────────────────────────────────────────
let tracksA = [
  { name: 'Track 1', time: '0:00' },
  { name: 'Track 2', time: '0:00' },
  { name: 'Track 3', time: '0:00' },
  { name: 'Track 4', time: '0:00' }
];
let tracksB = [
  { name: 'Track 5', time: '0:00' },
  { name: 'Track 6', time: '0:00' },
  { name: 'Track 7', time: '0:00' },
  { name: 'Track 8', time: '0:00' },
  { name: 'Track 9', time: '0:00' },
  { name: 'Track 10', time: '0:00' }
];

function renderTracksUI(syncCanvas = true) {
  const renderList = (list, containerId, totalId, side) => {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    let totalSec = 0;
    list.forEach((t, i) => {
      const timeMatch = /^(\d{1,3}):([0-5]\d)$/.exec(String(t.time || ''));
      if(timeMatch) totalSec += parseInt(timeMatch[1], 10) * 60 + parseInt(timeMatch[2], 10);

      const row = document.createElement('div');
      row.className = 'tl-track';
      const index = document.createElement('span');
      index.className = 'idx';
      index.textContent = `${i + 1}.`;
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.className = 'name';
      nameInput.value = t.name;
      nameInput.setAttribute('aria-label', `Side ${side} track ${i + 1} name`);
      nameInput.addEventListener('input', () => updateTrack(side, i, 'name', nameInput.value));
      const timeInput = document.createElement('input');
      timeInput.type = 'text';
      timeInput.className = 'time';
      timeInput.value = t.time;
      timeInput.setAttribute('aria-label', `Side ${side} track ${i + 1} duration`);
      timeInput.addEventListener('input', () => updateTrack(side, i, 'time', timeInput.value));
      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'track-remove-btn';
      removeButton.textContent = '×';
      removeButton.title = `Remove side ${side} track ${i + 1}`;
      removeButton.setAttribute('aria-label', removeButton.title);
      removeButton.addEventListener('click', () => {
        pushHistory();
        state['jcard-back'].deletedTracks ||= [];
        state['jcard-back'].deletedTracks.push({ side, index: i, track: { ...list[i] },
          layers: state['jcard-back'].layers.filter(layer => layer.trackId === list[i].id).map(layer => ({ ...layer })) });
        list.splice(i, 1);
        renderTracksUI();
      });
      row.append(index, nameInput, timeInput, removeButton);
      container.appendChild(row);
    });
    const m = Math.floor(totalSec/60);
    const s = String(totalSec%60).padStart(2,'0');
    document.getElementById(totalId).textContent = `TOTAL ${m}:${s}`;
  };
  renderList(tracksA, 'tracksA', 'totalA', 'A');
  renderList(tracksB, 'tracksB', 'totalB', 'B');
  if(syncCanvas) syncTracksToCanvas();
}

window.updateTrack = (side, idx, field, val) => {
  const list = side === 'A' ? tracksA : tracksB;
  if(!list[idx]) return;
  list[idx][field] = val;
  let totalSec = 0;
  list.forEach(track => {
    const match = /^(\d{1,3}):([0-5]\d)$/.exec(String(track.time || ''));
    if(match) totalSec += parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
  });
  const total = document.getElementById(side === 'A' ? 'totalA' : 'totalB');
  if(total) total.textContent = `TOTAL ${Math.floor(totalSec / 60)}:${String(totalSec % 60).padStart(2, '0')}`;
  syncTracksToCanvas();
};

function addTrack(side) {
  const nameInput = document.getElementById(`addName${side}`);
  const timeInput = document.getElementById(`addTime${side}`);
  const list = side === 'A' ? tracksA : tracksB;
  const name = nameInput.value.trim();
  const time = timeInput.value.trim() || '0:00';
  if(!name){
    alert('Enter a track title before adding it.');
    nameInput.focus();
    return;
  }
  if(!/^(\d{1,3}):([0-5]\d)$/.test(time)){
    alert('Enter the duration as minutes:seconds, for example 3:45.');
    timeInput.focus();
    return;
  }
  pushHistory();
  list.push({ name, time });
  nameInput.value = '';
  timeInput.value = '';
  renderTracksUI();
}
document.getElementById('btnAddA').onclick = () => addTrack('A');
document.getElementById('btnAddB').onclick = () => addTrack('B');
['A', 'B'].forEach(side => {
  ['addName', 'addTime'].forEach(prefix => {
    document.getElementById(`${prefix}${side}`).addEventListener('keydown', event => {
      if(event.key === 'Enter') {
        event.preventDefault();
        addTrack(side);
      }
    });
  });
});

// ── Tracklist Settings State ──────────────────────────────────────────────────
let tracklistSettings = {
  showArtist: true,
  showTrackNum: true,
  showDuration: true,
  showBullet: true,
  sidePrefix: 'Side',
  hideTracklist: false,
  showProductionInfo: true,
  labelFormat: 'bullet' // 'bullet' | 'slash' | 'lines'
};

function formatTracklistForLabel(tracks, fmt = tracklistSettings.labelFormat){
  const sep = fmt === 'slash' ? ' / ' : fmt === 'lines' ? '\n' : (tracklistSettings.showBullet ? ' • ' : ' / ');
  return tracks.map((t, i) => {
    const num = tracklistSettings.showTrackNum ? `${i+1}. ` : '';
    const dur = (tracklistSettings.showDuration && t.time) ? ` (${t.time})` : '';
    return `${num}${t.name.toUpperCase()}${dur}`;
  }).join(sep);
}

function fontForText(text, fallback = 'sans'){
  return /[\u0D00-\u0D7F]/.test(String(text)) ? 'malayalam' : fallback;
}

function syncTracksToCanvas() {
  // Keep generated layer identity and user formatting while refreshing content.
  tracksA.forEach(track => track.id ||= uid());
  tracksB.forEach(track => track.id ||= uid());
  const previousLayers = new Map();
  for(const pieceId of ['jcard', 'jcard-back']){
    const counts = {};
    previousLayers.set(pieceId, (state[pieceId]?.layers || []).map(layer => {
      const index = counts[layer.role] || 0;
      counts[layer.role] = index + 1;
      if(layer.role === 'backTrackA') layer.trackId ||= tracksA[index]?.id;
      if(layer.role === 'backTrackB') layer.trackId ||= tracksB[index]?.id;
      return layer;
    }));
  }
  const jc = state['jcard'];
  if (!jc) return;

  const textColor = currentTextColor || '#000000';
  const prefix = tracklistSettings.sidePrefix || 'Side';
  const artist = document.getElementById('artistNameInput')?.value || 'Artist Name';
  const album = document.getElementById('albumNameInput')?.value || 'Album Title';
  const title = album;
  const allTracks = [...tracksA, ...tracksB];
  const runtimeSeconds = allTracks.reduce((total, track) => {
    const match = /^(\d{1,3}):([0-5]\d)$/.exec(String(track.time || ''));
    return total + (match ? Number(match[1]) * 60 + Number(match[2]) : 0);
  }, 0);
  const runtime = `${Math.floor(runtimeSeconds / 60)}:${String(runtimeSeconds % 60).padStart(2, '0')}`;

  // ── JCARD FRONT: strip ALL old dynamic layers ─────────────────────────────
  // The front side contains: Flap content + Spine text + clean Cover (album/artist title only)
  // NO tracklist on the front.
  jc.layers = jc.layers.filter(l =>
    l.role !== 'frontHeader' &&
    l.role !== 'frontSideA' &&
    l.role !== 'frontTrackA' &&
    l.role !== 'frontSideB' &&
    l.role !== 'frontTrackB' &&
    l.role !== 'spineText' &&
    l.role !== 'flapSideTitle' &&
    l.role !== 'flapTracks' &&
    l.role !== 'albumName' &&
    l.role !== 'artistName' &&
    l.role !== 'coverTrackSummary'
  );

  // 1. Spine Title (Rotated -90° centred on spine strip x=26.5..39mm → centre x=32.75)
  jc.layers.push({
    id: uid(), type: 'text', text: `${artist.toUpperCase()} • ARTIST NAME 2`,
    font: fontForText(artist, 'mono'), size: 2.4, color: textColor, bold: true, italic: false,
    align: 'center', textCase: 'upper', rotation: -90, opacity: 1,
    x: 32.75, y: 50.75, role: 'spineText'
  });

  // 2. Flap – "Side A" label (rotated 90°, sitting in the flap strip x=0..26.5)
  jc.layers.push({
    id: uid(), type: 'text', text: `${prefix} A`,
    font: fontForText(`${prefix} A`, 'display'), size: 3.6, color: textColor, bold: true, italic: false,
    align: 'center', textCase: 'none', rotation: 90, opacity: 1,
    x: 22.5, y: 35, role: 'flapSideTitle'
  });

  // 3. Flap – bullet tracklist (rotated 90°, condensed)
  if (!tracklistSettings.hideTracklist) {
    const bulletA = formatTracklistForLabel(tracksA);
    jc.layers.push({
      id: uid(), type: 'wraptext', text: bulletA,
      font: fontForText(bulletA, 'sans'), size: 2.5, color: textColor, bold: true, italic: false,
      align: 'center', rotation: 90, opacity: 1, maxW: 60, lineHeight: 1.35,
      x: 13, y: 35, role: 'flapTracks'
    });
  }

  // 4. Flap – barcode (once, not duplicated)
  if (!jc.layers.some(l => l.role === 'flapBarcode')) {
    jc.layers.push({
      id: uid(), type: 'barcode', barcodeValue: '001586476451', barcodeType: 'ean13',
      color: '#000000', bgColor: '#ffffff', w: 21, h: 10, x: 16.5, y: 84, rotation: 90, opacity: 1,
      role: 'flapBarcode'
    });
  }

  // 5. Flap – stereo/dolby badge (once)
  if (!jc.layers.some(l => l.role === 'flapDolby')) {
    jc.layers.push({
      id: uid(), type: 'text', text: 'DO STEREO SURROUND',
      font: 'sans', size: 2.2, color: textColor, bold: true,
      align: 'center', rotation: 90, opacity: 1,
      x: 5.5, y: 84, role: 'flapDolby'
    });
  }

  // 6. Front Cover – artist + album title only (no tracklist on the front)
  if (tracklistSettings.showArtist) {
    jc.layers.push({
      id: uid(), type: 'text',
      text: artist.toUpperCase(),
      font: fontForText(artist, 'mono'), size: 2.3, color: textColor, bold: true, italic: false,
      align: 'center', textCase: 'none', rotation: 0, opacity: 1,
      x: 71.5, y: 70, role: 'artistName'
    });
  }
  jc.layers.push({
    id: uid(), type: 'text',
    text: title,
    font: fontForText(title, 'display'), size: 5.4, color: textColor, bold: true, italic: false,
    lineHeight: 1.12, align: 'center', textCase: 'upper', rotation: 0, opacity: 1,
    x: 71.5, y: 46, role: 'albumName'
  });
  jc.layers.push({
    id: uid(), type: 'text', text: `${allTracks.length} TRACKS • ${runtime}`,
    font: 'mono', size: 2, color: '#7A6045', bold: true, letterSpacing: 0.1,
    align: 'center', textCase: 'upper', x: 71.5, y: 85, rotation: 0, opacity: 1,
    role: 'coverTrackSummary'
  });

  // ── JCARD BACK: clear old tracklist and rebuild ──────────────────────────
  const back = state['jcard-back'];
  if (back) {
    // Remove all previously-generated dynamic back layers
    back.layers = back.layers.filter(l =>
      l.role !== 'backHeader' &&
      l.role !== 'backSideA' &&
      l.role !== 'backTrackA' &&
      l.role !== 'backSideB' &&
      l.role !== 'backTrackB' &&
      l.role !== 'productionInfo'
    );

    // The back's "visible" tracklist panel occupies x = 39..104mm of the back canvas
    // (same coordinate space as jcard: Flap=0..26.5, Spine=26.5..39, Cover=39..104)
    const panelX = JCARD_FLAP_W + JCARD_SPINE_W; // = 39mm — left edge of cover panel

    // Header: Artist  …Album
    back.layers.push({
      id: uid(), type: 'text',
      text: `${album.toUpperCase()} • MUSIC: ${artist.toUpperCase()}`,
      font: fontForText(`${album} ${artist}`, 'mono'), size: 2.1, color: textColor, bold: true, italic: false,
      align: 'left', textCase: 'none', rotation: 0, opacity: 1,
      x: panelX + 3, y: 8, role: 'backHeader'
    });

    if (!tracklistSettings.hideTracklist) {
      // Side A header
      back.layers.push({
        id: uid(), type: 'text', text: `${prefix} A`,
        font: fontForText(`${prefix} A`, 'display'), size: 3.4, color: textColor, bold: true, italic: false,
        align: 'left', textCase: 'none', rotation: 0, opacity: 1,
        x: panelX + 3, y: 15, role: 'backSideA'
      });

      // Side A tracks
      tracksA.forEach((t, i) => {
        const numPrefix = tracklistSettings.showTrackNum ? `${i + 1}. ` : '';
        const durStr = (tracklistSettings.showDuration && t.time) ? ` (${t.time})` : '';
        back.layers.push({
          id: uid(), type: 'text',
          text: `${numPrefix}${t.name}${durStr}`,
          font: fontForText(t.name, 'sans'), size: 2.8, color: textColor, bold: false, italic: false,
          align: 'left', textCase: 'none', rotation: 0, opacity: 1,
          x: panelX + 5, y: 21 + i * 4.3, role: 'backTrackA', trackId: t.id
        });
      });

      // Side B header – dynamically positioned right below Side A tracks
      const sideBY = 21 + tracksA.length * 4.3 + 4;
      back.layers.push({
        id: uid(), type: 'text', text: `${prefix} B`,
        font: fontForText(`${prefix} B`, 'display'), size: 3.4, color: textColor, bold: true, italic: false,
        align: 'left', textCase: 'none', rotation: 0, opacity: 1,
        x: panelX + 3, y: sideBY, role: 'backSideB'
      });

      // Side B tracks
      tracksB.forEach((t, i) => {
        const numPrefix = tracklistSettings.showTrackNum ? `${i + 1}. ` : '';
        const durStr = (tracklistSettings.showDuration && t.time) ? ` (${t.time})` : '';
        back.layers.push({
          id: uid(), type: 'text',
          text: `${numPrefix}${t.name}${durStr}`,
          font: fontForText(t.name, 'sans'), size: 2.8, color: textColor, bold: false, italic: false,
          align: 'left', textCase: 'none', rotation: 0, opacity: 1,
          x: panelX + 5, y: sideBY + 6 + i * 4.3, role: 'backTrackB', trackId: t.id
        });
      });
    }

    // Production info (bottom of back panel)
    if (tracklistSettings.showProductionInfo) {
      const prodText = document.getElementById('productionInfoText')?.value
        || 'Produced by: Artist Name';
      back.layers.push({
        id: uid(), type: 'wraptext', text: prodText,
        font: fontForText(prodText, 'mono'), size: 2.4, color: textColor, bold: false,
        align: 'center', maxW: 60, x: panelX + 32.5, y: JCARD_H - 8,
        role: 'productionInfo'
      });
    }
  }

  const styleKeys = ['font', 'size', 'fontWeight', 'bold', 'italic', 'color', 'align', 'textCase', 'allCaps',
    'letterSpacing', 'lineHeight', 'smallCaps', 'shadow', 'outline', 'outlineColor', 'maxW', 'rotation', 'opacity'];
  for(const [pieceId, previous] of previousLayers){
    const pieceState = state[pieceId];
    if(!pieceState) continue;
    pieceState.layers = pieceState.layers.map(layer => {
      if(!layer.role || previous.includes(layer)) return layer;
      const old = previous.find(item => item.role === layer.role &&
        (layer.trackId ? item.trackId === layer.trackId : true));
      if(old){
        // Content follows track edits; typography, placement, and selection stay put.
        return { ...layer, ...old,
          text: old.isCustom && (old.generatedText === undefined || old.generatedText === layer.text) ? old.text : layer.text,
          generatedText: layer.text, trackId: layer.trackId };
      }
      if(layer.trackId){
        const siblings = pieceState.layers.filter(item => item.role === layer.role);
        const index = siblings.indexOf(layer);
        const preceding = siblings[index - 1];
        const template = previous.find(item => item.role === layer.role && item.trackId === preceding?.trackId)
          || previous.find(item => item.role === layer.role);
        if(template){
          styleKeys.forEach(key => { if(template[key] !== undefined) layer[key] = template[key]; });
          layer.x = template.x;
          layer.y = template.y + Math.max(4.3, (template.size || 2.8) * (template.lineHeight || 1.25)) *
            (preceding?.trackId === template.trackId ? 1 : index + 1);
        }
      }
      layer.generatedText = layer.text;
      return layer;
    });
  }

  const markDeletedDynamicLayers = (pieceId, repeatedRoles = []) => {
    const pieceState = state[pieceId];
    if(!pieceState) return;
    const repeatedRoleCounts = {};
    const repeated = new Set(repeatedRoles);
    pieceState.layers.forEach(layer => {
      if(!layer.role) return;
      if(repeated.has(layer.role)){
        const index = repeatedRoleCounts[layer.role] || 0;
        layer.dynamicKey = `${layer.role}:${layer.trackId || index}`;
        repeatedRoleCounts[layer.role] = index + 1;
      } else {
        layer.dynamicKey = layer.role;
      }
    });
    const deletedKeys = new Set(pieceState.deletedDynamicKeys || []);
    pieceState.layers = pieceState.layers.filter(layer => !deletedKeys.has(layer.dynamicKey));
  };
  markDeletedDynamicLayers('jcard', [
    'spineText', 'flapSideTitle', 'flapTracks', 'artistName', 'albumName', 'coverTrackSummary'
  ]);
  markDeletedDynamicLayers('jcard-back', [
    'backHeader', 'backSideA', 'backTrackA', 'backSideB', 'backTrackB', 'productionInfo'
  ]);

  syncTracksToLabel();
  render();
}

function syncTracksToLabel(forceOverwrite = false) {
  const bulletA = formatTracklistForLabel(tracksA);
  const bulletB = formatTracklistForLabel(tracksB);
  const album = document.getElementById('albumNameInput')?.value || '';
  const artist = document.getElementById('artistNameInput')?.value || '';
  const prefix = tracklistSettings.sidePrefix || 'SIDE';
  const stereo = document.getElementById('stereoTextInput')?.value || 'STEREO';

  // Label A
  const la = state['label-a'];
  if(la){
    la.layers.forEach(l => {
      if(forceOverwrite && ['labelTracksA', 'labelAlbum', 'labelArtist', 'labelSideA', 'labelSide', 'labelStereo'].includes(l.role)) l.isCustom = false;
      if(l.role === 'labelTracksA'){
        l.opacity = tracklistSettings.hideTracklist ? 0 : 1;
        if(!tracklistSettings.hideTracklist && (forceOverwrite || !l.isCustom)){
          l.text = bulletA;
          l.font ||= fontForText(bulletA, 'sans');
        }
      }
      if(l.role === 'labelAlbum' && (forceOverwrite || !l.isCustom)){
        l.text = album;
        l.font ||= fontForText(album, 'sans');
      }
      if(l.role === 'labelArtist'){
        if(!tracklistSettings.showArtist) l.opacity = 0;
        else {
          l.opacity = 1;
          if(forceOverwrite || !l.isCustom){
            l.text = artist;
            l.font ||= fontForText(artist, 'sans');
          }
        }
      }
      if((l.role === 'labelSideA' || l.role === 'labelSide') && (forceOverwrite || !l.isCustom)) l.text = `${prefix.toUpperCase()} A`;
      if(l.role === 'labelStereo' && (forceOverwrite || !l.isCustom)){
        l.text = stereo;
        l.font ||= fontForText(stereo, 'sans');
      }
    });
  }

  // Label B
  const lb = state['label-b'];
  if(lb){
    lb.layers.forEach(l => {
      if(forceOverwrite && ['labelTracksB', 'labelAlbum', 'labelArtist', 'labelSideB', 'labelSide', 'labelStereo'].includes(l.role)) l.isCustom = false;
      if(l.role === 'labelTracksB'){
        l.opacity = tracklistSettings.hideTracklist ? 0 : 1;
        if(!tracklistSettings.hideTracklist && (forceOverwrite || !l.isCustom)){
          l.text = bulletB;
          l.font ||= fontForText(bulletB, 'sans');
        }
      }
      if(l.role === 'labelAlbum' && (forceOverwrite || !l.isCustom)){
        l.text = album;
        l.font ||= fontForText(album, 'sans');
      }
      if(l.role === 'labelArtist'){
        if(!tracklistSettings.showArtist) l.opacity = 0;
        else {
          l.opacity = 1;
          if(forceOverwrite || !l.isCustom){
            l.text = artist;
            l.font ||= fontForText(artist, 'sans');
          }
        }
      }
      if((l.role === 'labelSideB' || l.role === 'labelSide') && (forceOverwrite || !l.isCustom)) l.text = `${prefix.toUpperCase()} B`;
      if(l.role === 'labelStereo' && (forceOverwrite || !l.isCustom)){
        l.text = stereo;
        l.font ||= fontForText(stereo, 'sans');
      }
    });
  }

  if(window.syncLabelControlsFromCanvas) window.syncLabelControlsFromCanvas();
}

function syncLabelControlsFromCanvas() {
  const isLabelB = currentPieceId === 'label-b';
  const pieceId = isLabelB ? 'label-b' : 'label-a';
  const pState = state[pieceId];
  if(!pState) return;

  const btnA = document.getElementById('lblQuickSideA');
  const btnB = document.getElementById('lblQuickSideB');
  if(btnA && btnB){
    btnA.classList.toggle('active-piece', !isLabelB);
    btnB.classList.toggle('active-piece', isLabelB);
  }

  const trackRole = isLabelB ? 'labelTracksB' : 'labelTracksA';
  const sideRole = isLabelB ? 'labelSideB' : 'labelSideA';

  const tLayer = pState.layers.find(l => l.role === trackRole || l.type === 'wraptext');
  const sideLayer = pState.layers.find(l => l.role === sideRole || l.role === 'labelSide');
  const artistLayer = pState.layers.find(l => l.role === 'labelArtist');
  const albumLayer = pState.layers.find(l => l.role === 'labelAlbum');
  const stereoLayer = pState.layers.find(l => l.role === 'labelStereo');
  const yearLayer = pState.layers.find(l => l.role === 'labelYear');

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if(el && document.activeElement !== el) el.value = val || '';
  };

  if(tLayer) setVal('lblTracksInput', tLayer.text);
  if(sideLayer) setVal('lblSideInput', sideLayer.text);
  if(artistLayer) setVal('lblArtistInput', artistLayer.text);
  if(albumLayer) setVal('lblAlbumInput', albumLayer.text);
  if(stereoLayer) setVal('lblStereoInput', stereoLayer.text);
  if(yearLayer) setVal('lblFooterInput', yearLayer.text);
}
window.syncLabelControlsFromCanvas = syncLabelControlsFromCanvas;

function initLabelControlsUI() {
  const getActiveLabel = () => state[currentPieceId === 'label-b' ? 'label-b' : 'label-a'];

  const bindLabelInput = (inputId, role) => {
    const el = document.getElementById(inputId);
    if(!el) return;
    el.addEventListener('input', (e) => {
      const p = getActiveLabel();
      if(!p) return;
      const layerRole = typeof role === 'function' ? role() : role;
      let layer = p.layers.find(l => l.role === layerRole);
      if(layer){
        layer.text = e.target.value;
        if(/[\u0D00-\u0D7F]/.test(e.target.value)) layer.font = 'malayalam';
        layer.isCustom = true;
      }
      render();
    });
  };

  bindLabelInput('lblArtistInput', 'labelArtist');
  bindLabelInput('lblAlbumInput', 'labelAlbum');
  bindLabelInput('lblSideInput', () => currentPieceId === 'label-b' ? 'labelSideB' : 'labelSideA');
  bindLabelInput('lblStereoInput', 'labelStereo');
  bindLabelInput('lblFooterInput', 'labelYear');

  const tracksInput = document.getElementById('lblTracksInput');
  if(tracksInput){
    tracksInput.addEventListener('input', (e) => {
      const p = getActiveLabel();
      if(!p) return;
      const role = currentPieceId === 'label-b' ? 'labelTracksB' : 'labelTracksA';
      let layer = p.layers.find(l => l.role === role || l.type === 'wraptext');
      if(layer){
        layer.text = e.target.value;
        if(/[\u0D00-\u0D7F]/.test(e.target.value)) layer.font = 'malayalam';
        layer.isCustom = true;
      }
      render();
    });
  }

  // Format buttons
  const setLabelFmt = (fmt) => {
    tracklistSettings.labelFormat = fmt;
    const isB = currentPieceId === 'label-b';
    const tracks = isB ? tracksB : tracksA;
    const formatted = formatTracklistForLabel(tracks, fmt);
    const p = getActiveLabel();
    const role = isB ? 'labelTracksB' : 'labelTracksA';
    let layer = p.layers.find(l => l.role === role || l.type === 'wraptext');
    if(layer){
      layer.text = formatted;
      layer.isCustom = true;
    }
    const input = document.getElementById('lblTracksInput');
    if(input) input.value = formatted;
    render();
  };

  document.getElementById('btnLblFmtBullet')?.addEventListener('click', () => setLabelFmt('bullet'));
  document.getElementById('btnLblFmtSlash')?.addEventListener('click', () => setLabelFmt('slash'));
  document.getElementById('btnLblFmtLines')?.addEventListener('click', () => setLabelFmt('lines'));
  document.getElementById('btnLblSyncTracks')?.addEventListener('click', () => {
    syncTracksToLabel(true);
    render();
  });
}

function syncLabelShapeControls(){
  const pState = state[currentPieceId];
  const controls = {
    enabled: document.getElementById('lblBevelEnabled'),
    top: document.getElementById('lblBevelTop'),
    bottom: document.getElementById('lblBevelBottom'),
    size: document.getElementById('lblBevelSize'),
    value: document.getElementById('lblBevelSizeValue')
  };
  if(!pState?.labelShape || !controls.enabled) return;
  const shape = pState.labelShape;
  controls.enabled.checked = shape.bevelEnabled !== false;
  controls.top.checked = shape.bevelTop !== false;
  controls.bottom.checked = shape.bevelBottom === true;
  controls.size.value = String(shape.bevelSize ?? 6);
  controls.size.disabled = !controls.enabled.checked;
  controls.top.disabled = !controls.enabled.checked;
  controls.bottom.disabled = !controls.enabled.checked;
  controls.value.textContent = `${controls.size.value} mm`;
}

function initLabelShapeControls(){
  const updateShape = (key, value) => {
    const shape = currentState().labelShape;
    if(!shape) return;
    shape[key] = value;
    render();
  };
  document.getElementById('lblBevelEnabled')?.addEventListener('change', event => {
    updateShape('bevelEnabled', event.target.checked);
    syncLabelShapeControls();
  });
  document.getElementById('lblBevelTop')?.addEventListener('change', event => {
    updateShape('bevelTop', event.target.checked);
  });
  document.getElementById('lblBevelBottom')?.addEventListener('change', event => {
    updateShape('bevelBottom', event.target.checked);
  });
  document.getElementById('lblBevelSize')?.addEventListener('input', event => {
    updateShape('bevelSize', parseFloat(event.target.value));
    document.getElementById('lblBevelSizeValue').textContent = `${event.target.value} mm`;
  });
  syncLabelShapeControls();
}

// ── Font Controls Panel ───────────────────────────────────────────────────────
function getFontPanelValues(){
  const layer = selectedLayer();
  return {
    font: document.getElementById('fontSelect').value,
    size: parseFloat(document.getElementById('fontSizeSlider').value),
    fontWeight: parseInt(document.getElementById('fontWeightSlider').value),
    letterSpacing: parseFloat(document.getElementById('letterSpacingSlider').value),
    color: fontColorPicker.value || defaultFontSettings.color,
    lineHeight: Number(document.getElementById('fontLineHeight').value),
    align: layer && ['text', 'wraptext'].includes(layer.type) ? layer.align || 'center' : defaultFontSettings.align || 'center',
    smallCaps: document.getElementById('chkSmallCaps').checked,
    italic: document.getElementById('chkItalic').checked,
    allCaps: document.getElementById('chkAllCaps').checked,
    shadow: document.getElementById('chkShadow').checked,
    outline: document.getElementById('chkOutline').checked,
  };
}

function updateFontPanelDisplay(){
  const size = parseFloat(document.getElementById('fontSizeSlider').value);
  const ls = parseFloat(document.getElementById('letterSpacingSlider').value);
  document.getElementById('fontSizeVal').textContent = size.toFixed(1) + 'mm';

  document.getElementById('letterSpacingVal').textContent = ls.toFixed(1) + 'px';
  window.refreshTypographyPreview?.();
}

function updateAlignButtons(align){
  const left = document.getElementById('btnAlignLeft');
  const center = document.getElementById('btnAlignCenter');
  const right = document.getElementById('btnAlignRight');
  if(left) left.classList.toggle('active', align === 'left');
  if(center) center.classList.toggle('active', align === 'center');
  if(right) right.classList.toggle('active', align === 'right');
  for(const [button, value] of [[left, 'left'], [center, 'center'], [right, 'right']]) button?.setAttribute('aria-pressed', String(align === value));
}

function initFontAlignControls(){
  ['left', 'center', 'right'].forEach(al => {
    const cap = al.charAt(0).toUpperCase() + al.slice(1);
    const btn = document.getElementById(`btnAlign${cap}`);
    if(!btn) return;
    btn.addEventListener('click', () => {
      const layer = selectedLayer();
      const targets = selectedTrackLayers().length ? selectedTrackLayers() : [layer].filter(item => item && ['text', 'wraptext'].includes(item.type));
      if(targets.length) targets.forEach(item => { item.align = al; });
      else defaultFontSettings.align = al;
      updateAlignButtons(al);
      render();
    });
  });
}

function selectTrackSide(side){
  switchPiece('jcard-back');
  const layers = currentState().layers.filter(layer => layer.role === `backSide${side}` || layer.role === `backTrack${side}`);
  if(!layers.length) return;
  selectedLayerId = layers[0].id;
  selectedTrackGroup = { pieceId: currentPieceId, side, anchor: selectedLayerId };
  closeInlineEdit();
  syncFontPanelToLayer(layers.find(layer => layer.role === `backTrack${side}`) || layers[0]);
  syncImageControls();
  render();
  updateLayerToolbar();
}
for(const side of ['A', 'B']) document.getElementById(`btnSelectTracks${side}`).addEventListener('click', () => selectTrackSide(side));

function applyFontToSelected(keys){
  const layer = selectedLayer();
  const vals = getFontPanelValues();
  const properties = keys || Object.keys(vals);
  // An empty or invalid precise input must never write NaN into a project.
  if(properties.some(key => ['size', 'fontWeight', 'letterSpacing', 'lineHeight'].includes(key) && !Number.isFinite(vals[key]))) return;
  const targets = selectedTrackLayers().length ? selectedTrackLayers() : [layer].filter(item => item && ['text', 'wraptext'].includes(item.type));
  for(const target of targets.length ? targets : [defaultFontSettings]){
    properties.forEach(key => { target[key] = vals[key]; });
    if(properties.includes('fontWeight')) target.bold = vals.fontWeight >= 700;
    if(properties.includes('allCaps')) target.textCase = vals.allCaps ? 'upper' : 'none';
  }
  updateFontPanelDisplay();
  render();
}

// Sync font panel FROM a layer (when layer clicked)
window.syncFontPanelToLayer = function(layer){
  if(!layer || (layer.type !== 'text' && layer.type !== 'wraptext')){ window.clearFontPanel(); return; }
  ensureFontOption(layer.font || 'sans');
  document.getElementById('fontSelect').value = layer.font || 'sans';
  document.getElementById('fontSizeSlider').value = layer.size || 5;
  window.ensureTypographyOption?.('fontWeightSlider', layer.fontWeight || (layer.bold ? 700 : 400));
  document.getElementById('fontWeightSlider').value = layer.fontWeight || (layer.bold ? 700 : 400);
  window.ensureTypographyOption?.('fontLineHeight', layer.lineHeight || 1.25);
  document.getElementById('fontLineHeight').value = layer.lineHeight || 1.25;
  document.getElementById('letterSpacingSlider').value = layer.letterSpacing || 0;
  document.getElementById('chkItalic').checked = !!layer.italic;
  document.getElementById('chkSmallCaps').checked = !!layer.smallCaps;
  document.getElementById('chkAllCaps').checked = !!(layer.allCaps || layer.textCase === 'upper');
  document.getElementById('chkShadow').checked = !!layer.shadow;
  document.getElementById('chkOutline').checked = !!layer.outline;
  const color = layer.color || '#1C1A16';
  document.getElementById('fontColorSwatch').style.backgroundColor = color;
  document.getElementById('fontColorPicker').value = /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#1c1a16';
  updateFontPanelDisplay();
  updateAlignButtons(layer.align || 'center');
};

window.clearFontPanel = function(){
  // Reset to defaults when nothing selected
  ensureFontOption(defaultFontSettings.font);
  document.getElementById('fontSelect').value = defaultFontSettings.font;
  document.getElementById('fontSizeSlider').value = defaultFontSettings.size;
  window.ensureTypographyOption?.('fontWeightSlider', defaultFontSettings.fontWeight);
  document.getElementById('fontWeightSlider').value = defaultFontSettings.fontWeight;
  document.getElementById('letterSpacingSlider').value = defaultFontSettings.letterSpacing;
  for(const [id, key] of Object.entries({chkItalic:'italic', chkSmallCaps:'smallCaps', chkAllCaps:'allCaps', chkShadow:'shadow', chkOutline:'outline'})) document.getElementById(id).checked = !!defaultFontSettings[key];
  window.ensureTypographyOption?.('fontLineHeight', defaultFontSettings.lineHeight || 1.25);
  document.getElementById('fontLineHeight').value = defaultFontSettings.lineHeight || 1.25;
  fontColorSwatch.style.backgroundColor = defaultFontSettings.color;
  fontColorPicker.value = defaultFontSettings.color;
  updateFontPanelDisplay();
  updateAlignButtons(defaultFontSettings.align || 'center');
};

// Precise fields commit on change so partially typed numbers never distort text.
for(const [id, key] of [['fontSizeSlider', 'size'], ['letterSpacingSlider', 'letterSpacing']]){
  const input = document.getElementById(id);
  input.addEventListener('change', () => {
    if(!input.value || !Number.isFinite(Number(input.value))){
      if(selectedLayer()?.type === 'text' || selectedLayer()?.type === 'wraptext') syncFontPanelToLayer(selectedLayer());
      else clearFontPanel();
      return;
    }
    input.value = Math.max(Number(input.min), Math.min(Number(input.max), Number(input.value)));
    applyFontToSelected([key]);
  });
}
for(const [id, key] of [['fontSelect','font'], ['fontWeightSlider','fontWeight'], ['fontLineHeight','lineHeight']]){
  document.getElementById(id).addEventListener('change', () => applyFontToSelected([key]));
}
for(const [id, key] of Object.entries({chkItalic:'italic', chkAllCaps:'allCaps', chkShadow:'shadow', chkOutline:'outline', chkSmallCaps:'smallCaps'})){
  document.getElementById(id).addEventListener('change', () => applyFontToSelected([key]));
}

// Font color swatch
const fontColorSwatch = document.getElementById('fontColorSwatch');
const fontColorPicker = document.getElementById('fontColorPicker');
fontColorSwatch.addEventListener('click', () => fontColorPicker.click());
fontColorPicker.addEventListener('input', () => {
  fontColorSwatch.style.backgroundColor = fontColorPicker.value;
  applyFontToSelected(['color']);
});
document.getElementById('btnResetFontColor').addEventListener('click', () => {
  fontColorPicker.value = '#1c1a16';
  fontColorSwatch.style.backgroundColor = fontColorPicker.value;
  applyFontToSelected(['color']);
});

document.getElementById('btnSaveDefaultFont').addEventListener('click', async () => {
  const vals = getFontPanelValues();
  Object.assign(defaultFontSettings, vals);
  const saved = await saveProject();
  const status = document.getElementById('defaultFontSaveStatus');
  status.textContent = saved ? 'Default font saved' : 'Could not save default font';
  setTimeout(() => { status.textContent = ''; }, 2500);
});

// ── Track List Settings ───────────────────────────────────────────────────────
function initTracklistSettings() {
  const chkArtist = document.getElementById('chkShowArtist');
  if(chkArtist){
    chkArtist.checked = tracklistSettings.showArtist;
    chkArtist.addEventListener('change', (e) => {
      tracklistSettings.showArtist = e.target.checked;
      syncTracksToCanvas();
    });
  }

  const chkNum = document.getElementById('chkShowTrackNum');
  if(chkNum){
    chkNum.checked = tracklistSettings.showTrackNum;
    chkNum.addEventListener('change', (e) => {
      tracklistSettings.showTrackNum = e.target.checked;
      syncTracksToCanvas();
    });
  }

  const chkDur = document.getElementById('chkShowDuration');
  if(chkDur){
    chkDur.checked = tracklistSettings.showDuration;
    chkDur.addEventListener('change', (e) => {
      tracklistSettings.showDuration = e.target.checked;
      syncTracksToCanvas();
    });
  }

  const chkBullet = document.getElementById('chkShowBullet');
  if(chkBullet){
    chkBullet.checked = tracklistSettings.showBullet;
    chkBullet.addEventListener('change', (e) => {
      tracklistSettings.showBullet = e.target.checked;
      syncTracksToCanvas();
    });
  }

  const sideInput = document.getElementById('sideLabel');
  if(sideInput){
    sideInput.value = tracklistSettings.sidePrefix;
    sideInput.addEventListener('input', (e) => {
      tracklistSettings.sidePrefix = e.target.value.trim() || 'Side';
      syncTracksToCanvas();
    });
  }

  const btnSideA = document.getElementById('btnSideA');
  const btnSideB = document.getElementById('btnSideB');
  if(btnSideA && btnSideB){
    btnSideA.addEventListener('click', () => {
      btnSideA.classList.add('active');
      btnSideB.classList.remove('active');
      if(currentPieceId === 'label-b') switchPiece('label-a');
      else if(currentPieceId === 'jcard-back') switchPiece('jcard');
      document.getElementById('sideA')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    btnSideB.addEventListener('click', () => {
      btnSideB.classList.add('active');
      btnSideA.classList.remove('active');
      if(currentPieceId === 'label-a') switchPiece('label-b');
      else if(currentPieceId === 'jcard') switchPiece('jcard-back');
      document.getElementById('sideB')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  const chkHide = document.getElementById('chkHideTracklist');
  if(chkHide){
    chkHide.checked = tracklistSettings.hideTracklist;
    document.getElementById('tracksA').style.display = chkHide.checked ? 'none' : '';
    document.getElementById('tracksB').style.display = chkHide.checked ? 'none' : '';
    chkHide.addEventListener('change', (e) => {
      tracklistSettings.hideTracklist = e.target.checked;
      document.getElementById('tracksA').style.display = e.target.checked ? 'none' : '';
      document.getElementById('tracksB').style.display = e.target.checked ? 'none' : '';
      syncTracksToCanvas();
    });
  }

  const chkProd = document.getElementById('chkShowProductionInfo');
  if(chkProd){
    chkProd.checked = tracklistSettings.showProductionInfo;
    chkProd.addEventListener('change', (e) => {
      tracklistSettings.showProductionInfo = e.target.checked;
      syncTracksToCanvas();
    });
  }

  const prodTa = document.getElementById('productionInfoText');
  if(prodTa){
    prodTa.addEventListener('input', () => {
      if(tracklistSettings.showProductionInfo) syncTracksToCanvas();
    });
  }

  const stereoInput = document.getElementById('stereoTextInput');
  if(stereoInput){
    stereoInput.addEventListener('input', (e) => {
      updateLayerText('labelStereo', e.target.value);
    });
  }

  const lyricsTa = document.getElementById('lyricsBlockText');
  if(lyricsTa){
    lyricsTa.addEventListener('input', (e) => {
      updateLayerText('lyrics', e.target.value);
    });
  }
}

// ── Cover Art Tab ─────────────────────────────────────────────────────────────
function initCoverArt(){
  const uploadInput = document.getElementById('artworkUpload');
  const dropZone = document.getElementById('caDropZone');
  const thumbsContainer = document.getElementById('caThumbs');
  const uploadCountEl = document.getElementById('uploadCount');
  let imageControlBase = null;
  const addImageButton = document.getElementById('btnAddSelectedImage');

  function handleFiles(files){
    Array.from(files).forEach(file => {
      if(!file.type.startsWith('image/')){
        alert(`"${file.name}" is not an image file.`);
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => {
        console.error('Failed to read artwork file:', file.name);
        alert(`Could not read "${file.name}".`);
      };
      reader.onload = () => {
        const dataUrl = String(reader.result || '');
        const img = new Image();
        img.onload = () => {
          artworkImages.push({ img, url: dataUrl, dataUrl, name: file.name });
          selectedArtworkIdx = artworkImages.length - 1;
          uploadCountEl.textContent = artworkImages.length;
          renderArtThumbs();
          applyArtworkToCanvas();
        };
        img.onerror = () => {
          console.error('Failed to decode artwork image:', file.name);
          alert(`Could not load "${file.name}".`);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
    uploadInput.value = '';
  }

  uploadInput.addEventListener('change', (e) => handleFiles(e.target.files));

  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
  });

  function renderArtThumbs(){
    thumbsContainer.innerHTML = '';
    addImageButton.disabled = selectedArtworkIdx < 0 || !artworkImages[selectedArtworkIdx];
    artworkImages.forEach((art, i) => {
      const thumb = document.createElement('div');
      thumb.className = 'ca-thumb' + (i === selectedArtworkIdx ? ' selected' : '');
      const img = document.createElement('img');
      img.src = art.url;
      thumb.appendChild(img);
      const label = document.createElement('span');
      label.textContent = `${art.img.width}px`;
      thumb.appendChild(label);
      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'ca-thumb-delete';
      deleteButton.textContent = '×';
      deleteButton.setAttribute('aria-label', `Remove ${art.name || 'image'} from artwork library`);
      deleteButton.title = 'Remove from artwork library';
      deleteButton.addEventListener('click', event => {
        event.stopPropagation();
        artworkImages.splice(i, 1);
        if(artworkImages.length === 0) selectedArtworkIdx = -1;
        else if(selectedArtworkIdx === i) selectedArtworkIdx = Math.min(i, artworkImages.length-1);
        else if(selectedArtworkIdx > i) selectedArtworkIdx--;
        uploadCountEl.textContent = artworkImages.length;
        renderArtThumbs();
      });
      thumb.appendChild(deleteButton);
      thumb.addEventListener('click', () => {
        selectedArtworkIdx = i;
        renderArtThumbs();
        applyArtworkToCanvas();
      });
      thumbsContainer.appendChild(thumb);
    });
  }

  function addSelectedImageLayer(){
    const art = artworkImages[selectedArtworkIdx];
    if(!art) return;
    pushHistory();
    const p = currentPiece();
    const aspect = art.img.width / art.img.height;
    const w = Math.min(p.w * 0.45, p.h * 0.45 * aspect);
    const h = w / aspect;
    const layer = {
      id: uid(), type: 'image', _img: art.img, src: art.dataUrl,
      name: art.name, w, h, x: p.w / 2, y: p.h / 2,
      rotation: 0, opacity: 1,
      crop: { left: 0, right: 0, top: 0, bottom: 0 },
      cropBaseSize: { w, h }
    };
    currentState().layers.push(layer);
    selectedLayerId = layer.id;
    render();
    updateLayerToolbar();
    window.syncImageControls();
  }

  addImageButton.addEventListener('click', addSelectedImageLayer);

  let artworkRestoreGeneration = 0;
  window.restoreArtworkLibrary = async () => {
    const generation = ++artworkRestoreGeneration;
    const library = restoredArtworkLibrary;
    const selected = restoredSelectedArtworkDataUrl;
    artworkImages = [];
    selectedArtworkIdx = -1;
    const restored = await Promise.all(library.map(savedArt => new Promise(resolve => {
      if(!savedArt?.dataUrl) return resolve(null);
      const img = new Image();
      img.onload = () => resolve({ img, url: savedArt.dataUrl, dataUrl: savedArt.dataUrl, name: savedArt.name || 'Restored artwork' });
      img.onerror = () => resolve(null);
      img.src = savedArt.dataUrl;
    })));
    if(generation !== artworkRestoreGeneration) return;
    artworkImages = restored.filter(Boolean);
    selectedArtworkIdx = artworkImages.findIndex(art => art.dataUrl === selected);
    uploadCountEl.textContent = artworkImages.length;
    renderArtThumbs();
  };
  window.restoreArtworkLibrary();

  function applyArtworkToCanvas(){
    const p = currentPiece();

    if(selectedArtworkIdx >= 0){
      const art = artworkImages[selectedArtworkIdx];
      currentState().layers = currentState().layers.filter(l => l.role !== 'coverArt');
      const aspect = art.img.width / art.img.height;
      let fitW, fitH;
      if(artSettings.sizing === 'fit'){
        if(aspect > (p.w / p.h)){
          fitW = p.w * artSettings.zoom;
          fitH = fitW / aspect;
        } else {
          fitH = p.h * artSettings.zoom;
          fitW = fitH * aspect;
        }
      } else {
        if(aspect > (p.w / p.h)){
          fitH = p.h * artSettings.zoom;
          fitW = fitH * aspect;
        } else {
          fitW = p.w * artSettings.zoom;
          fitH = fitW / aspect;
        }
      }
      currentState().layers.unshift({
        id: uid(), type: 'image', _img: art.img,
        src: art.dataUrl,
        w: Math.round(fitW * 10) / 10,
        h: Math.round(fitH * 10) / 10,
        x: p.w/2, y: p.h/2,
        rotation: artSettings.rotate, opacity: artSettings.opacity,
        flipX: artSettings.flipX, flipY: artSettings.flipY,
        role: 'coverArt'
      });
      selectedLayerId = currentState().layers[0].id;
      render();
      syncImageControls();
      return;
    }

  }

  function syncImageControls(){
    const layer = selectedLayer();
    const imageSelected = layer?.type === 'image';
    imageControlBase = imageSelected ? { id: layer.id, w: layer.w, h: layer.h } : null;
    const cropActive = imageSelected && window.isImageCropActive?.(layer.id) === true;
    if(imageSelected){
      document.getElementById('artZoom').value = '1';
      document.getElementById('artZoomVal').textContent = '1.00x';
      const rotation = layer.rotation || 0;
      const opacity = layer.opacity === undefined ? 1 : layer.opacity;
      document.getElementById('artRotate').value = String(rotation);
      document.getElementById('artRotateVal').textContent = `${rotation}°`;
      document.getElementById('artOpacity').value = String(Math.round(opacity * 100));
      document.getElementById('artOpacityVal').textContent = `${Math.round(opacity * 100)}%`;
    } else {
      document.getElementById('artZoom').value = String(artSettings.zoom);
      document.getElementById('artZoomVal').textContent = `${artSettings.zoom.toFixed(2)}x`;
      document.getElementById('artRotate').value = String(artSettings.rotate);
      document.getElementById('artRotateVal').textContent = `${artSettings.rotate}°`;
      document.getElementById('artOpacity').value = String(Math.round(artSettings.opacity * 100));
      document.getElementById('artOpacityVal').textContent = `${Math.round(artSettings.opacity * 100)}%`;
    }
    for(const id of ['artZoom', 'artRotate', 'artOpacity', 'btnArtFit', 'btnArtFill',
      'btnRotateCCW', 'btnRotateCW', 'btnResetRotate', 'btnResetArt']){
      document.getElementById(id).disabled = !imageSelected || cropActive;
    }
    const flipTarget = imageSelected ? layer : {};
    for(const [id, axis] of [['btnFlipHorizontal', 'flipX'], ['btnFlipVertical', 'flipY']]){
      const button = document.getElementById(id);
      button.setAttribute('aria-pressed', String(!!flipTarget[axis]));
      button.disabled = !imageSelected || cropActive;
    }

    document.getElementById('btnArtFit').classList.toggle('active', imageSelected && layer.sizing === 'fit');
    document.getElementById('btnArtFill').classList.toggle('active', imageSelected && layer.sizing === 'fill');
    document.getElementById('btnStartCrop').disabled = !imageSelected || cropActive;
    document.getElementById('btnApplyCrop').disabled = !cropActive;
    document.getElementById('btnCancelCrop').disabled = !cropActive;
    const stretchToggle = document.getElementById('chkImageStretch');
    stretchToggle.disabled = !imageSelected || cropActive;
    stretchToggle.checked = imageSelected && layer.freeTransform === true;
    document.getElementById('btnResetCrop').disabled = !imageSelected ||
      !Object.values(layer.crop || {}).some(value => Number(value) > 0);
    document.getElementById('cropStatus').textContent = cropActive
      ? 'Drag a corner inward to crop, then apply or cancel.'
      : 'Select an image layer, then adjust its crop directly on the canvas.';
  }
  window.syncImageControls = syncImageControls;
  for(const [id, axis] of [['btnFlipHorizontal', 'flipX'], ['btnFlipVertical', 'flipY']]){
    document.getElementById(id).addEventListener('click', () => {
      const layer = selectedLayer();
      if(layer?.type !== 'image' || imageCropLayerId) return;
      pushHistory();
      if(layer?.type === 'image'){
        layer[axis] = !layer[axis];
        render();
      }
      syncImageControls();
    });
  }

  document.getElementById('btnStartCrop').addEventListener('click', () => {
    const layer = selectedLayer();
    if(layer?.type === 'image' && window.startImageCrop(layer.id)){
      syncImageControls();
    }
  });
  document.getElementById('btnApplyCrop').addEventListener('click', () => {
    if(window.applyImageCrop()) syncImageControls();
  });
  document.getElementById('btnCancelCrop').addEventListener('click', () => {
    window.cancelImageCrop();
    syncImageControls();
  });
  document.getElementById('btnResetCrop').addEventListener('click', () => {
    window.resetImageCrop();
    syncImageControls();
  });
  document.getElementById('chkImageStretch').addEventListener('change', event => {
    const layer = selectedLayer();
    if(layer?.type !== 'image') return;
    layer.freeTransform = event.target.checked;
    render();
  });
  syncImageControls();

  const artZoom = document.getElementById('artZoom');
  const artRotate = document.getElementById('artRotate');
  const artOpacity = document.getElementById('artOpacity');
  const editableImage = () => {
    const layer = selectedLayer();
    return layer?.type === 'image' && !imageCropLayerId ? layer : null;
  };
  [artZoom, artRotate, artOpacity].forEach(input => {
    input.addEventListener('pointerdown', () => { if(editableImage()) pushHistory(); });
  });
  artZoom.addEventListener('input', () => {
    const layer = editableImage();
    if(!layer || imageControlBase?.id !== layer.id) return;
    const zoom = Number(artZoom.value);
    layer.w = imageControlBase.w * zoom;
    layer.h = imageControlBase.h * zoom;
    document.getElementById('artZoomVal').textContent = zoom.toFixed(2) + 'x';
    render();
  });
  artRotate.addEventListener('input', () => {
    const layer = editableImage();
    if(!layer) return;
    layer.rotation = Number(artRotate.value);
    document.getElementById('artRotateVal').textContent = layer.rotation + '°';
    render();
  });
  artOpacity.addEventListener('input', () => {
    const layer = editableImage();
    if(!layer) return;
    layer.opacity = Number(artOpacity.value) / 100;
    document.getElementById('artOpacityVal').textContent = artOpacity.value + '%';
    render();
  });
  for(const [id, sizing] of [['btnArtFit', 'fit'], ['btnArtFill', 'fill']]){
    document.getElementById(id).addEventListener('click', () => {
      const layer = editableImage();
      if(!layer) return;
      pushHistory();
      const piece = currentPiece();
      const ratio = sizing === 'fit' ? Math.min(piece.w/layer.w, piece.h/layer.h)
        : Math.max(piece.w/layer.w, piece.h/layer.h);
      layer.w *= ratio;
      layer.h *= ratio;
      layer.sizing = sizing;
      render();
      syncImageControls();
    });
  }
  for(const [id, delta] of [['btnRotateCCW', -90], ['btnRotateCW', 90]]){
    document.getElementById(id).addEventListener('click', () => {
      const layer = editableImage();
      if(!layer) return;
      pushHistory();
      layer.rotation = ((layer.rotation || 0) + delta + 540) % 360 - 180;
      render();
      syncImageControls();
    });
  }
  function resetRotation(){
    const layer = editableImage();
    if(!layer) return;
    pushHistory();
    layer.rotation = 0;
    render();
    syncImageControls();
  }
  document.getElementById('btnResetRotate').addEventListener('click', resetRotation);
  artRotate.addEventListener('dblclick', resetRotation);
  document.getElementById('btnResetArt').addEventListener('click', () => {
    const layer = editableImage();
    if(!layer) return;
    pushHistory();
    if(imageControlBase?.id === layer.id){ layer.w = imageControlBase.w; layer.h = imageControlBase.h; }
    layer.rotation = 0;
    layer.opacity = 1;
    layer.flipX = false;
    layer.flipY = false;
    render();
    syncImageControls();
  });
  syncImageControls();
}

// ── Studio / Logos ────────────────────────────────────────────────────────────
const STUDIO_LOGOS = {
  'lo-fi':  { src: 'assets/logos/logo_lofi.jpg',  name: 'Lo-Fi Stereo', w: 18, h: 12 },
  'hifi':   { src: 'assets/logos/logo_hifi.jpg',  name: 'Hi-Fi Stereo', w: 18, h: 12 },
  'hi-fi':  { src: 'assets/logos/logo_hifi.jpg',  name: 'Hi-Fi Stereo', w: 18, h: 12 },
  
};

// Preloaded logo images cache
const logoImgCache = {};
window.logoImgCache = logoImgCache;

function getOrLoadLogoImage(src, callback) {
  if (logoImgCache[src] && logoImgCache[src].complete) {
    callback(logoImgCache[src]);
    return;
  }
  const img = new Image();
  img.onload = () => {
    logoImgCache[src] = img;
    callback(img);
  };
  img.onerror = () => {
    console.error('Failed to load logo image:', src);
  };
  img.src = src;
}

function initStudio(){
  // Preload all default logos
  Object.values(STUDIO_LOGOS).forEach(item => {
    const img = new Image();
    img.src = item.src;
    logoImgCache[item.src] = img;
  });

  // Handle logo clicks
  document.querySelectorAll('.studio-logo-item').forEach(item => {
    item.addEventListener('click', () => {
      const logoId = item.dataset.logo;
      addLogoLayer(logoId);
      document.querySelectorAll('.studio-logo-item').forEach(el => el.classList.remove('selected'));
      item.classList.add('selected');
    });
  });

  const logoGrid = document.getElementById('studioLogosGrid');
  function renderCustomLogos(){
    logoGrid.querySelectorAll('[data-custom-logo]').forEach(item => item.remove());
    customLogoLibrary.forEach((logo, index) => {
      const item = document.createElement('div');
      item.className = 'studio-logo-item';
      item.dataset.customLogo = String(index);
      item.title = `${logo.name} — click to add to canvas`;

      const preview = document.createElement('div');
      preview.className = 'studio-logo-preview';
      const image = document.createElement('img');
      image.src = logo.dataUrl;
      image.alt = logo.name;
      image.className = 'studio-logo-img';
      preview.appendChild(image);

      const label = document.createElement('span');
      label.className = 'studio-logo-label';
      label.textContent = logo.name;

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'ca-thumb-delete studio-logo-delete';
      remove.textContent = '×';
      remove.title = 'Remove uploaded logo from library';
      remove.setAttribute('aria-label', `Remove ${logo.name} from production logos`);
      remove.addEventListener('click', event => {
        event.stopPropagation();
        customLogoLibrary.splice(index, 1);
        renderCustomLogos();
      });

      item.append(preview, label, remove);
      item.addEventListener('click', () => addLogoLayer(`custom:${index}`));
      logoGrid.appendChild(item);
    });
  }

  window.restoreLogoLibrary = () => {
    customLogoLibrary = restoredCustomLogoLibrary
      .filter(logo => typeof logo?.dataUrl === 'string' && logo.dataUrl.startsWith('data:image/'))
      .map(logo => ({ dataUrl: logo.dataUrl, name: logo.name || 'Uploaded logo' }));
    renderCustomLogos();
  };
  window.restoreLogoLibrary();

  // Handle custom logo image upload
  const uploadInput = document.getElementById('studioLogoUpload');
  if(uploadInput){
    uploadInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if(!file) return;
      if(!file.type.startsWith('image/')){
        alert('Choose an image file for the production logo.');
        uploadInput.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => {
        console.error('Could not read the uploaded production logo:', file.name);
        alert(`Could not read "${file.name}".`);
        uploadInput.value = '';
      };
      reader.onload = (evt) => {
        const customSrc = String(evt.target.result || '');
        getOrLoadLogoImage(customSrc, (img) => {
          const logo = {
            dataUrl: customSrc,
            name: file.name.replace(/\.[^/.]+$/, '') || 'Uploaded logo'
          };
          customLogoLibrary.push(logo);
          const logoIndex = customLogoLibrary.length - 1;
          renderCustomLogos();
          pushHistory();
          const p = currentPiece();
          const aspect = (img.naturalWidth || 1) / (img.naturalHeight || 1);
          const w = 18;
          const h = Math.round((w / aspect) * 10) / 10;
          const layer = {
            id: uid(),
            type: 'image',
            _img: img,
            src: customSrc,
            w: w,
            h: h,
            x: Math.round(p.w / 2),
            y: Math.max(10, Math.round(p.h - 15)),
            rotation: 0,
            opacity: 1,
            role: 'logo',
            name: logo.name
          };
          currentState().layers.push(layer);
          selectedLayerId = layer.id;
          const libraryItem = logoGrid.querySelector(`[data-custom-logo="${logoIndex}"]`);
          libraryItem?.classList.add('selected');
          render();
        });
      };
      reader.readAsDataURL(file);
      uploadInput.value = '';
    });
  }
}

function addLogoLayer(logoId){
  if(logoId.startsWith('custom:')){
    const index = Number(logoId.slice('custom:'.length));
    const logo = customLogoLibrary[index];
    if(!logo) return;
    getOrLoadLogoImage(logo.dataUrl, img => {
      pushHistory();
      const p = currentPiece();
      const aspect = (img.naturalWidth || 1) / (img.naturalHeight || 1);
      const w = 18;
      const layer = {
        id: uid(), type: 'image', _img: img, src: logo.dataUrl,
        w, h: Math.round((w / aspect) * 10) / 10,
        x: Math.round(p.w / 2), y: Math.max(10, Math.round(p.h - 15)),
        rotation: 0, opacity: 1, role: 'logo', name: logo.name
      };
      currentState().layers.push(layer);
      selectedLayerId = layer.id;
      document.querySelectorAll('.studio-logo-item').forEach(item => item.classList.remove('selected'));
      document.querySelector(`[data-custom-logo="${index}"]`)?.classList.add('selected');
      render();
    });
    return;
  }
  const def = STUDIO_LOGOS[logoId];
  if(!def) return;

  getOrLoadLogoImage(def.src, (img) => {
    pushHistory();
    const p = currentPiece();
    const aspect = (img.naturalWidth || 1) / (img.naturalHeight || 1);
    const targetW = def.w || 18;
    const targetH = Math.round((targetW / aspect) * 10) / 10;

    const layer = {
      id: uid(),
      type: 'image',
      _img: img,
      src: def.src,
      w: targetW,
      h: targetH,
      x: Math.round(p.w / 2),
      y: Math.max(10, Math.round(p.h - 14)),
      rotation: 0,
      opacity: 1,
      role: 'logo',
      name: def.name || logoId
    };

    currentState().layers.push(layer);
    selectedLayerId = layer.id;
    render();
  });
}


function getProjectSnapshot(){
  const fields = {};
  [
    'albumNameInput', 'artistNameInput', 'stereoTextInput',
    'lyricsBlockText', 'productionInfoText', 'lblSideInput',
    'lblStereoInput', 'lblArtistInput', 'lblAlbumInput',
    'lblTracksInput', 'lblFooterInput'
  ].forEach(id => {
    const field = document.getElementById(id);
    if(field) fields[id] = field.value;
  });
  const savedState = {};
  PIECES.forEach(piece => {
    const pieceState = state[piece.id];
    savedState[piece.id] = {
      ...pieceState,
      layers: pieceState.layers.map(layer => {
        const { _img, ...persistedLayer } = layer;
        return persistedLayer;
      })
    };
  });
  const selectedArtwork = artworkImages[selectedArtworkIdx];
  const artworkLibrary = artworkImages
    .filter(art => art.dataUrl)
    .map(({ dataUrl, name }) => ({ dataUrl, name }));

  return {
    version: 2,
    state: savedState,
    currentPieceId,
    tracksA,
    tracksB,
    tracklistSettings,
    fields,
    currentTextColor,
    activeColorMode,
    defaultFontSettings,
    artSettings,
    artworkLibrary,
    selectedArtworkDataUrl: selectedArtwork?.dataUrl || null,
    customLogoLibrary: customLogoLibrary.map(({ dataUrl, name }) => ({ dataUrl, name })),
    view: {
      showGuides,
      showCenterAlignment,
      showReelWindow,
      showCutLines,
      showGrid,
      snapToGrid,
      gridSpacingMm,
      measurementUnit,
      freePlacement: document.getElementById('freePlacementToggle')?.checked ?? true
    }
  };
}

async function saveProject(){
  try{
    await projectStorage.save(getProjectSnapshot());
    return true;
  }catch(error){
    console.error('Could not save the J-Card project:', error);
    const status = document.getElementById('projectSaveStatus');
    if(status) status.textContent = 'Browser save unavailable — use Save project for a file backup';
    alert('Could not save on this device. Storage may be full or blocked. Your current design is still open. Use Save project to save a file without browser storage, or free device storage and try again.');
    return false;
  }
}

async function restoreSavedProject(saved){
  try{
    if(saved === undefined) saved = await projectStorage.load();
    if(!saved) return false;
  }catch(error){
    console.error('Could not read the saved J-Card project:', error);
    alert('The saved project could not be read. A new design will be opened.');
    return false;
  }

  const savedState = saved && saved.state && typeof saved.state === 'object' ? saved.state : saved;
  if(!savedState || typeof savedState !== 'object'){
    console.error('Saved J-Card project has an invalid format.');
    alert('The saved project is invalid. A new design will be opened.');
    return false;
  }

  PIECES.forEach(piece => {
    const pieceData = savedState[piece.id];
    if(pieceData && Array.isArray(pieceData.layers)){
      state[piece.id] = {
        ...state[piece.id],
        ...pieceData,
        layers: pieceData.layers
      };
    }
  });

  if(PIECES.some(piece => savedState[piece.id] && !Array.isArray(savedState[piece.id].layers))){
    console.error('Saved J-Card project contains malformed piece data.');
    alert('The saved project contains invalid design data. A new design will be opened.');
    return false;
  }

  if(PIECES.some(piece => savedState[piece.id] && Array.isArray(savedState[piece.id].layers))){
    if(PIECES.some(piece => !Array.isArray(state[piece.id].layers))){
      console.error('Saved J-Card project is missing a required piece.');
      return false;
    }
  }

  if(saved && saved.version){
    if(PIECES.some(piece => savedState[piece.id] && Array.isArray(savedState[piece.id].layers))){
      if(PIECES.some(piece => !savedState[piece.id] || !Array.isArray(savedState[piece.id].layers))){
        console.error('Saved J-Card project is missing one or more required pieces.');
        alert('The saved project is incomplete. A new design will be opened.');
        return false;
      }
    }
    if(Array.isArray(saved.tracksA)) tracksA = saved.tracksA;
    if(Array.isArray(saved.tracksB)) tracksB = saved.tracksB;
    if(saved.tracklistSettings && typeof saved.tracklistSettings === 'object'){
      Object.assign(tracklistSettings, saved.tracklistSettings);
    }
    if(saved.fields && typeof saved.fields === 'object'){
      Object.entries(saved.fields).forEach(([id, value]) => {
        const field = document.getElementById(id);
        if(field && typeof value === 'string') field.value = value;
      });
    }
    if(typeof saved.currentTextColor === 'string') currentTextColor = saved.currentTextColor;
    if(saved.activeColorMode === 'text' || saved.activeColorMode === 'bg') activeColorMode = saved.activeColorMode;
    if(saved.defaultFontSettings && typeof saved.defaultFontSettings === 'object'){
      Object.assign(defaultFontSettings, saved.defaultFontSettings);
    }
    if(currentTextColor.toLowerCase() === '#17393a') currentTextColor = '#000000';
    if(defaultFontSettings.color?.toLowerCase() === '#17393a') defaultFontSettings.color = '#000000';
    if(saved.artSettings && typeof saved.artSettings === 'object'){
      Object.assign(artSettings, saved.artSettings);
    }
    if(Array.isArray(saved.artworkLibrary)) restoredArtworkLibrary = saved.artworkLibrary;
    if(Array.isArray(saved.customLogoLibrary)) restoredCustomLogoLibrary = saved.customLogoLibrary;
    if(typeof saved.selectedArtworkDataUrl === 'string') restoredSelectedArtworkDataUrl = saved.selectedArtworkDataUrl;
    if(saved.view && typeof saved.view === 'object'){
      showGuides = saved.view.showGuides !== false;
      showCenterAlignment = saved.view.showCenterAlignment !== false;
      showReelWindow = saved.view.showReelWindow !== false;
      showCutLines = saved.view.showCutLines !== false;
      showGrid = saved.view.showGrid === true;
      snapToGrid = saved.view.snapToGrid === true;
      gridSpacingMm = Math.min(8, Math.max(1, Number(saved.view.gridSpacingMm) || 4));
      measurementUnit = saved.view.measurementUnit === 'mm' ? 'mm' : 'in';
      const placement = document.getElementById('freePlacementToggle');
      if(placement && typeof saved.view.freePlacement === 'boolean') placement.checked = saved.view.freePlacement;
    }
    if(PIECES.some(piece => piece.id === saved.currentPieceId)) currentPieceId = saved.currentPieceId;
  }

  const sampleAlbum = 'Bethlehem Kudumba Unit (BKU)';
  const sampleArtist = 'Vishnu Vijay';
  const albumField = document.getElementById('albumNameInput');
  const artistField = document.getElementById('artistNameInput');
  if(albumField.value === sampleAlbum) albumField.value = 'Album Title';
  if(artistField.value === sampleArtist) artistField.value = 'Artist Name';
  if(document.getElementById('productionInfoText').value ===
    'Music & score: Vishnu Vijay\nLyrics: Vinayak Sasikumar, Suhail Koya'){
    document.getElementById('productionInfoText').value = 'Produced by: Artist Name\nRecorded at: Studio Name';
  }

  const sampleTracksA = [
    ['Maanthrikam', '3:16'], ['Illey Illa', '3:30'],
    ['Varnajaalam', '3:22'], ['Muttayi Vandi', '4:00']
  ];
  const sampleTracksB = [
    ['Kanmaniye', '3:12'], ['Piditharaa', '2:30'],
    ['Cha Cha Chi Chi Choo', '3:45'], ['Rakthasahodaran', '1:00'],
    ['Kochu Thanuppu', '2:36'], ['Indrajaalam', '3:18']
  ];
  const isSampleTracklist = (tracks, samples) =>
    tracks.length === samples.length &&
    tracks.every((track, index) => track.name === samples[index][0] && track.time === samples[index][1]);
  if(isSampleTracklist(tracksA, sampleTracksA)){
    tracksA = sampleTracksA.map((_, index) => ({ name: `Track ${index + 1}`, time: '0:00' }));
  }
  if(isSampleTracklist(tracksB, sampleTracksB)){
    tracksB = sampleTracksB.map((_, index) => ({ name: `Track ${index + 5}`, time: '0:00' }));
  }

  const sampleTextReplacements = new Map([
    ['ORIGINAL MOTION PICTURE SOUNDTRACK', 'MIXTAPE • SIDE A + B'],
    [sampleArtist, 'Artist Name'],
    [sampleAlbum, 'Album Title'],
    ['2026 • BETHLEHEM KUDUMBA UNIT', 'MIXTAPE']
  ]);
  PIECES.forEach(piece => {
    state[piece.id].layers.forEach(layer => {
      if(sampleTextReplacements.has(layer.text)) layer.text = sampleTextReplacements.get(layer.text);
    });
  });
  ['label-a', 'label-b'].forEach(pieceId => {
    const pieceState = state[pieceId];
    pieceState.layers.forEach(layer => {
      if(layer.role !== 'labelSideA' && layer.role !== 'labelSideB') return;
      const wasPreviousDefault =
        (layer.x === 85 && layer.y === 25.5 && layer.align === 'right') ||
        (layer.x === 5 && layer.y === 34 && layer.align === 'left');
      if(wasPreviousDefault){
        layer.x = 80;
        layer.y = 25.5;
        layer.align = 'center';
        layer.size = 3.8;
      }
    });
  });
  return true;
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  initUiColorPreference();
  seedDefaults();
  window.defaultLayerTemplates = Object.fromEntries(PIECES.map(piece => [piece.id, structuredClone(state[piece.id].layers)]));
  document.body.inert = true;
  let restored;
  try { restored = await restoreSavedProject(); }
  finally { document.body.inert = false; }
  buildTabs();
  initTabs();
  resizeCanvasForPiece();
  renderTracksUI();
  updateBgSwatchIndicator(currentState().bgColor || '#F4F0E6');
  updateColorUI(currentTextColor);
  clearFontPanel();
  fontColorSwatch.style.backgroundColor = defaultFontSettings.color;
  fontColorPicker.value = defaultFontSettings.color;
  initFontAlignControls();
  initTracklistSettings();
  initLabelControlsUI();
  initLabelShapeControls();
  initCoverArt();
  initStudio();
  updateLayoutControls();
  const heading = document.getElementById('projectHeaderTitle');
  if(heading) heading.textContent = document.getElementById('albumNameInput').value.trim() || 'Untitled J-Card';
  if(restored) document.getElementById('projectSaveStatus').textContent = 'Restored from this device';
  window.projectHistory?.reset();
  window.refreshDeletedItems?.();
  if(activeColorMode === 'bg') setColorMode('bg');
  else setColorMode('text');
}
window.onload = init;

// ── Popup Logic ───────────────────────────────────────────────────────────────
const btnLayout = document.getElementById('btnLayout');
const btnColorControls = document.getElementById('btnColorControls');
const layoutPopup = document.getElementById('layoutPopup');
const colorPopup = document.getElementById('colorPopup');

btnLayout.addEventListener('click', () => {
  layoutPopup.classList.toggle('open');
  colorPopup.classList.remove('open');
});

btnColorControls.addEventListener('click', () => {
  colorPopup.classList.toggle('open');
  layoutPopup.classList.remove('open');
  if (colorPopup.classList.contains('open')) {
    const activeColor = activeColorMode === 'text' ? currentTextColor : (currentState().bgColor || '#F4F0E6');
    updateColorUI(activeColor);
    updateBgSwatchIndicator(currentState().bgColor || '#F4F0E6');
  }
});

document.getElementById('closeLayoutBtn').addEventListener('click', () => layoutPopup.classList.remove('open'));
const closeColorBodyBtn = document.getElementById('closeColorBodyBtn');
if (closeColorBodyBtn) {
  closeColorBodyBtn.addEventListener('click', () => colorPopup.classList.remove('open'));
}

// ── Color Controls ────────────────────────────────────────────────────────────
const btnColorize = document.getElementById('btnColorize');
const btnBackground = document.getElementById('btnBackground');
const btnResetColor = document.getElementById('btnResetColor');
const cpHeaderTitle = document.getElementById('cpHeaderTitle');
const bgSwatchIndicator = document.getElementById('bgSwatchIndicator');
const activeColorPreview = document.getElementById('activeColorPreview');
const hexColorInput = document.getElementById('hexColorInput');
const nativeColorPicker = document.getElementById('nativeColorPicker');
const btnEyeDropper = document.getElementById('btnEyeDropper');

function darkenHex(hex, factor){
  const channels = hex.slice(1).match(/.{2}/g).map(value => Math.round(parseInt(value, 16) * factor));
  return `#${channels.map(value => value.toString(16).padStart(2, '0')).join('')}`;
}

function applyUiColor(accentColor, textColor){
  const root = document.documentElement;
  root.style.setProperty('--primary', accentColor);
  root.style.setProperty('--primary-hover', darkenHex(accentColor, 0.82));
  root.style.setProperty('--accent', accentColor);
  root.style.setProperty('--ui-header', darkenHex(accentColor, 0.55));
  root.style.setProperty('--text-main', textColor);
}

function initUiColorPreference(){
  const picker = document.getElementById('uiColorPicker');
  const preview = document.getElementById('uiColorPreview');
  const textPicker = document.getElementById('uiTextColorPicker');
  const textPreview = document.getElementById('uiTextColorPreview');
  const status = document.getElementById('uiColorStatus');
  try{
    const savedTheme = localStorage.getItem(UI_THEME_STORAGE_KEY);
    const theme = savedTheme ? JSON.parse(savedTheme) : null;
    const legacyAccent = localStorage.getItem(UI_COLOR_STORAGE_KEY);
    const accentColor = theme?.accentColor && /^#[0-9a-f]{6}$/i.test(theme.accentColor)
      ? theme.accentColor
      : (legacyAccent && /^#[0-9a-f]{6}$/i.test(legacyAccent) ? legacyAccent : picker.value);
    const textColor = theme?.textColor && /^#[0-9a-f]{6}$/i.test(theme.textColor)
      ? theme.textColor
      : textPicker.value;
    picker.value = accentColor;
    preview.style.backgroundColor = accentColor;
    textPicker.value = textColor;
    textPreview.style.backgroundColor = textColor;
    if(theme || legacyAccent){
      applyUiColor(accentColor, textColor);
      status.textContent = 'Saved interface color restored.';
    }
  }catch(error){
    console.error('Could not restore the saved interface theme:', error);
    preview.style.backgroundColor = picker.value;
    textPreview.style.backgroundColor = textPicker.value;
    status.textContent = 'Could not read the saved interface theme.';
  }

  picker.addEventListener('input', () => {
    preview.style.backgroundColor = picker.value;
    status.textContent = 'Preview only — select OK to save and apply both colors.';
  });
  textPicker.addEventListener('input', () => {
    textPreview.style.backgroundColor = textPicker.value;
    status.textContent = 'Preview only — select OK to save and apply both colors.';
  });
  document.getElementById('btnApplyUiColor').addEventListener('click', () => {
    const accentColor = picker.value;
    const textColor = textPicker.value;
    if(!/^#[0-9a-f]{6}$/i.test(accentColor) || !/^#[0-9a-f]{6}$/i.test(textColor)){
      status.textContent = 'Choose valid accent and text colors before applying.';
      return;
    }
    try{
      localStorage.setItem(UI_THEME_STORAGE_KEY, JSON.stringify({ accentColor, textColor }));
    }catch(error){
      console.error('Could not save the interface theme:', error);
      status.textContent = 'Could not save these colors. Check browser storage settings.';
      return;
    }
    applyUiColor(accentColor, textColor);
    status.textContent = 'Interface colors saved.';
  });
}

function updateBgSwatchIndicator(hex) {
  if (bgSwatchIndicator && hex) bgSwatchIndicator.style.backgroundColor = hex;
}

function updateColorUI(hex) {
  if (!hex) return;
  if (hexColorInput) hexColorInput.value = hex.toLowerCase();
  if (activeColorPreview) activeColorPreview.style.backgroundColor = hex;
  if (nativeColorPicker && /^#[0-9a-fA-F]{6}$/.test(hex)) nativeColorPicker.value = hex;
}

function colorToHex(c) {
  if (!c) return '#000000';
  if (c.startsWith('#')) return c;
  if (c.startsWith('rgb')) {
    const rgb = c.match(/\d+/g);
    if (rgb && rgb.length >= 3) return '#' + rgb.slice(0,3).map(x=>parseInt(x).toString(16).padStart(2,'0')).join('');
  }
  return c;
}

function setColorMode(mode) {
  activeColorMode = mode;
  if (mode === 'text') {
    btnColorize.classList.add('active'); btnBackground.classList.remove('active'); btnResetColor.classList.remove('active');
    if (cpHeaderTitle) cpHeaderTitle.textContent = 'Text Color';
    updateColorUI(currentTextColor);
  } else if (mode === 'bg') {
    btnBackground.classList.add('active'); btnColorize.classList.remove('active'); btnResetColor.classList.remove('active');
    if (cpHeaderTitle) cpHeaderTitle.textContent = 'Background';
    updateColorUI(currentState().bgColor || '#F4F0E6');
  }
}

if (btnColorize) btnColorize.addEventListener('click', () => setColorMode('text'));
if (btnBackground) btnBackground.addEventListener('click', () => setColorMode('bg'));

function resetColorsToDefault() {
  PIECES.forEach(p => { state[p.id].bgColor = p.bg || '#F4F0E6'; });
  updateBgSwatchIndicator(currentState().bgColor || '#E9E3D5');
  currentTextColor = '#000000';
  const jc = state['jcard'];
  if (jc) {
    jc.layers.forEach(l => {
      if (l.type === 'text') {
        if (l.role === 'artistName') l.color = '#555555';
        else if (l.text === 'side a / side b' || l.text === 'SIDE A') l.color = '#8A8578';
        else l.color = currentTextColor;
      } else if (l.type === 'line') { l.fill = '#B4436C'; }
    });
  }
  const jcBack = state['jcard-back'];
  if (jcBack) jcBack.layers.forEach(l => { if (l.type === 'text') l.color = currentTextColor; });
  ['label-a','label-b'].forEach(pid => { if(state[pid]) state[pid].layers.forEach(l => { if(l.type==='text') l.color='#1C1A16'; }); });
  syncTracksToCanvas();
  updateColorUI(activeColorMode==='text' ? currentTextColor : (currentState().bgColor||'#F4F0E6'));
  render();
}

if (btnResetColor) btnResetColor.addEventListener('click', () => resetColorsToDefault());

const DARK_MODE_STORAGE_KEY = 'jcard_dark_mode';
const darkModeButton = document.getElementById('btnToggleDarkMode');
function setDarkMode(enabled, persist = true){
  document.body.classList.toggle('dark-mode', enabled);
  if(darkModeButton){
    darkModeButton.setAttribute('aria-pressed', String(enabled));
    darkModeButton.textContent = enabled ? 'Light mode' : 'Dark mode';
  }
  if(persist){
    try{
      localStorage.setItem(DARK_MODE_STORAGE_KEY, String(enabled));
    }catch(error){
      console.error('Could not save the display mode:', error);
    }
  }
}
try{
  setDarkMode(localStorage.getItem(DARK_MODE_STORAGE_KEY) === 'true', false);
}catch(error){
  console.error('Could not read the display mode:', error);
}
darkModeButton?.addEventListener('click', () => {
  setDarkMode(!document.body.classList.contains('dark-mode'));
});

function applySelectedColor(hex) {
  if (!hex) return;
  updateColorUI(hex);
  if (activeColorMode === 'text') {
    currentTextColor = hex;
    PIECES.forEach(p => { state[p.id].layers.forEach(l => { if(l.type==='text') l.color=hex; }); });
    syncTracksToCanvas(); render();
  } else if (activeColorMode === 'bg') {
    currentState().bgColor = hex;
    if (currentPieceId==='jcard') state['jcard-back'].bgColor=hex;
    else if (currentPieceId==='jcard-back') state['jcard'].bgColor=hex;
    updateBgSwatchIndicator(hex); render();
  }
}

document.querySelectorAll('.swatch').forEach(sw => {
  sw.addEventListener('click', () => {
    const hex = colorToHex(sw.dataset.color || sw.style.backgroundColor);
    applySelectedColor(hex);
  });
});

if (nativeColorPicker) nativeColorPicker.addEventListener('input', (e) => applySelectedColor(e.target.value));
if (activeColorPreview && nativeColorPicker) activeColorPreview.addEventListener('click', () => nativeColorPicker.click());

if (hexColorInput) {
  hexColorInput.addEventListener('input', (e) => {
    let val = e.target.value.trim();
    if (!val.startsWith('#') && (val.length===3||val.length===6)) val = '#'+val;
    if (/^#[0-9a-fA-F]{6}$/.test(val)) applySelectedColor(val);
  });
  hexColorInput.addEventListener('blur', () => updateColorUI(activeColorMode==='text' ? currentTextColor : (currentState().bgColor||'#F4F0E6')));
}

if (btnEyeDropper) {
  if (!window.EyeDropper) { btnEyeDropper.style.display = 'none'; }
  else {
    btnEyeDropper.addEventListener('click', async () => {
      try {
        const result = await new EyeDropper().open();
        if(result?.sRGBHex) applySelectedColor(result.sRGBHex);
      } catch(error) {
        if(error.name !== 'AbortError') console.error('Could not pick a screen color:', error);
      }
    });
  }
}

// ── Layout / guide toggles ────────────────────────────────────────────────────
const btnToggleFold = document.getElementById('btnToggleFold');
const btnToggleCut = document.getElementById('btnToggleCut');
const btnToggleGrid = document.getElementById('btnToggleGrid');
const btnCenterAlignment = document.getElementById('btnCenterAlignment');
const gridSpacingInput = document.getElementById('gridSpacingInput');

function updateLayoutControls(){
  if(gridSpacingInput) gridSpacingInput.value = gridSpacingMm;
  const gridSpacingLabel = document.getElementById('gridSpacingLabel');
  if(gridSpacingLabel) gridSpacingLabel.textContent = `${gridSpacingMm} mm grid`;
  btnToggleFold.classList.toggle('active', showGuides);
  btnToggleCut.classList.toggle('active', showCutLines);
  if(btnToggleGrid) btnToggleGrid.classList.toggle('active', showGrid);
  if(btnCenterAlignment){
    btnCenterAlignment.classList.toggle('active', showCenterAlignment);
    btnCenterAlignment.setAttribute('aria-pressed', String(showCenterAlignment));
  }
  const btnSnapToGrid = document.getElementById('btnSnapToGrid');
  if(btnSnapToGrid){
    btnSnapToGrid.classList.toggle('active', snapToGrid);
    btnSnapToGrid.setAttribute('aria-pressed', String(snapToGrid));
  }
  document.querySelectorAll('.tg-btn[data-unit]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.unit === measurementUnit);
  });
  document.querySelectorAll('.lo-btn[data-piece]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.piece === currentPieceId);
  });
  const piece = currentPiece();
  const dimensions = document.getElementById('pieceDimensions');
  if(dimensions){
    const width = measurementUnit === 'mm' ? piece.w : piece.w / 25.4;
    const height = measurementUnit === 'mm' ? piece.h : piece.h / 25.4;
    dimensions.textContent = `${width.toFixed(1)} × ${height.toFixed(1)} ${measurementUnit}`;
  }
}

btnToggleFold.addEventListener('click', () => {
  showGuides = !showGuides;
  updateLayoutControls();
  render();
});
btnToggleCut.addEventListener('click', () => {
  showCutLines = !showCutLines;
  updateLayoutControls();
  render();
});
if(btnToggleGrid) btnToggleGrid.addEventListener('click', () => {
  showGrid = !showGrid;
  updateLayoutControls();
  render();
});
if(btnCenterAlignment) btnCenterAlignment.addEventListener('click', () => {
  showCenterAlignment = !showCenterAlignment;
  updateLayoutControls();
  render();
});
document.getElementById('btnSnapToGrid').addEventListener('click', () => {
  snapToGrid = !snapToGrid;
  updateLayoutControls();
});
if(gridSpacingInput) gridSpacingInput.addEventListener('input', () => {
  gridSpacingMm = Number(gridSpacingInput.value);
  updateLayoutControls();
  render();
});
document.getElementById('btnGridSpacingDown').addEventListener('click', () => {
  gridSpacingMm = Math.max(1, gridSpacingMm - 1);
  updateLayoutControls();
  render();
});
document.getElementById('btnGridSpacingUp').addEventListener('click', () => {
  gridSpacingMm = Math.min(8, gridSpacingMm + 1);
  updateLayoutControls();
  render();
});
document.querySelectorAll('.tg-btn[data-unit]').forEach(btn => {
  btn.addEventListener('click', () => {
    measurementUnit = btn.dataset.unit;
    updateLayoutControls();
  });
});
document.querySelectorAll('.lo-btn[data-piece]').forEach(btn => {
  btn.addEventListener('click', () => switchPiece(btn.dataset.piece));
});

// ── Action Bar ────────────────────────────────────────────────────────────────
document.getElementById('btnResetDesign').addEventListener('click', async () => {
  if(!confirm('Are you sure you want to reset your design? All saved progress will be lost.')) return;
  try{
    await projectStorage.clear();
    location.reload();
  }catch(error){
    console.error('Could not reset the saved J-Card project:', error);
    alert('The saved project could not be removed from browser storage.');
  }
});

// ── Wide Buttons ──────────────────────────────────────────────────────────────
document.getElementById('btnLyricSearch').addEventListener('click', () => {
  const allTracks = [...tracksA.map(t=>t.name), ...tracksB.map(t=>t.name)].join('%20');
  if(allTracks) window.open(`https://genius.com/search?q=${allTracks}`, '_blank');
  else alert('Please add some tracks first to search lyrics.');
});

document.getElementById('btnDiscogs').addEventListener('click', () => {
  const album = document.getElementById('albumNameInput').value;
  const artist = document.getElementById('artistNameInput').value;
  const query = encodeURIComponent(`${artist} ${album}`.trim());
  if(query) window.open(`https://www.discogs.com/search/?q=${query}&type=release`, '_blank');
  else alert('Please enter an Artist and Album Name to search Discogs.');
});

// ── applyCase (used by export.js) ─────────────────────────────────────────────
window.applyCase = function(str, c){
  if(c==='upper') return str.toUpperCase();
  if(c==='lower') return str.toLowerCase();
  return str;
};

// ── Panel Resizer ─────────────────────────────────────────────────────────────
(function() {
  const resizer = document.getElementById('panelResizer');
  const editor = document.getElementById('editorSection');
  if (!resizer || !editor) return;

  let isResizing = false;
  let startX = 0;
  let startWidth = 0;

  resizer.addEventListener('pointerdown', (e) => {
    isResizing = true;
    startX = e.clientX;
    startWidth = editor.getBoundingClientRect().width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    resizer.setPointerCapture(e.pointerId);
  });

  resizer.addEventListener('pointermove', (e) => {
    if (!isResizing) return;
    const dx = startX - e.clientX; // drag left = wider panel
    const newWidth = Math.min(900, Math.max(280, startWidth + dx));
    editor.style.width = newWidth + 'px';
  });

  resizer.addEventListener('pointerup', () => {
    isResizing = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });

  // Double-click to reset to default
  resizer.addEventListener('dblclick', () => {
    editor.style.width = '500px';
  });

  // Wide toggle button
  const btnToggle = document.getElementById('btnTogglePanelWidth');
  if (btnToggle) {
    let isWide = false;
    btnToggle.addEventListener('click', () => {
      isWide = !isWide;
      editor.style.width = isWide ? '720px' : '500px';
      btnToggle.title = isWide ? 'Collapse panel' : 'Toggle panel width (Standard / Wide)';
    });
  }
})();
