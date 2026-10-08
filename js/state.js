// state.js
const MM_PX = 8;
const JCARD_FLAP_W = 26.5, JCARD_SPINE_W = 12.5, JCARD_FRONT_W = 65, JCARD_H = 101.5;
const JCARD_W = JCARD_FLAP_W + JCARD_SPINE_W + JCARD_FRONT_W;

const PIECES = [
  {
    id:'jcard', label:'J-CARD (FRONT SIDE)', tabLabel:'J-Card Front', w:JCARD_W, h:JCARD_H,
    guides:{ vertical:[ {x:JCARD_FLAP_W/JCARD_W}, {x:(JCARD_FLAP_W+JCARD_SPINE_W)/JCARD_W} ]},
    bg:'#E9E3D5'
  },
  {
    id:'jcard-back', label:'J-CARD (BACK SIDE)', tabLabel:'J-Card Back', w:JCARD_W, h:JCARD_H,
    guides:{ vertical:[ {x:JCARD_FLAP_W/JCARD_W}, {x:(JCARD_FLAP_W+JCARD_SPINE_W)/JCARD_W} ]},
    bg:'#E9E3D5'
  },
  {
    id:'label-a', label:'CASSETTE LABEL A', tabLabel:'Label A', w:89, h:45, shape:'label',
    reelWindow:{x:44.5, y:25.5, w:14, h:5},
    reelHoles:[{x:22.5, y:25.5, r:4}, {x:66.5, y:25.5, r:4}], bg:'#F4F0E6'
  },
  {
    id:'label-b', label:'CASSETTE LABEL B', tabLabel:'Label B', w:89, h:45, shape:'label',
    reelWindow:{x:44.5, y:25.5, w:14, h:5},
    reelHoles:[{x:22.5, y:25.5, r:4}, {x:66.5, y:25.5, r:4}], bg:'#F4F0E6'
  }
];

function traceCassetteLabelShape(context, x, y, w, h, scale, settings = {}){
  const bevelEnabled = settings.bevelEnabled !== false;
  const bevelSize = bevelEnabled ? Math.max(0, Number(settings.bevelSize) || 0) * scale : 0;
  const topBevel = settings.bevelTop !== false ? Math.min(bevelSize, w/2, h/2) : 0;
  const bottomBevel = settings.bevelBottom === true ? Math.min(bevelSize, w/2, h/2) : 0;
  const bottomRadius = bottomBevel ? 0 : Math.min(3 * scale, w/2, h/2);

  context.beginPath();
  context.moveTo(x + topBevel, y);
  context.lineTo(x + w - topBevel, y);
  context.lineTo(x + w, y + topBevel);
  context.lineTo(x + w, y + h - bottomRadius - bottomBevel);
  if(bottomBevel){
    context.lineTo(x + w - bottomBevel, y + h);
    context.lineTo(x + bottomBevel, y + h);
    context.lineTo(x, y + h - bottomBevel);
  } else {
    context.arcTo(x + w, y + h, x + w - bottomRadius, y + h, bottomRadius);
    context.lineTo(x + bottomRadius, y + h);
    context.arcTo(x, y + h, x, y + h - bottomRadius, bottomRadius);
  }
  context.lineTo(x, y + topBevel);
  context.closePath();
}

const FONTS = [
  {id:'mono', css:"'JetBrains Mono', monospace", label:'Mono'},
  {id:'display', css:"'Archivo Expanded', sans-serif", label:'Display'},
  {id:'sans', css:"'Inter', sans-serif", label:'Sans'},
  {id:'malayalam', css:"'Noto Sans Malayalam', 'Nirmala UI', sans-serif", label:'Malayalam'}
];
const COLORS = ['#1C1A16','#EDE8DC','#C17A3E','#B4436C','#4A6C6F','#8A8578','#FFFDF8','#9B5E2B'];

let state = {};
PIECES.forEach(p => state[p.id] = {
  layers: [],
  bgColor: p.bg,
  deletedDynamicKeys: [],
  ...(p.shape === 'label' ? {
    labelShape: { bevelEnabled: true, bevelTop: true, bevelBottom: false, bevelSize: 6 }
  } : {})
});
let currentPieceId = PIECES[0].id;
let selectedLayerId = null;
let selectedTrackGroup = null;
function selectedTrackLayers(){
  if(!selectedTrackGroup || selectedTrackGroup.pieceId !== currentPieceId || selectedTrackGroup.anchor !== selectedLayerId) return [];
  const side = selectedTrackGroup.side;
  return currentState().layers.filter(layer => layer.role === `backSide${side}` || layer.role === `backTrack${side}`);
}
function fontDefinition(id){
  if(typeof id === 'string' && id.startsWith('local:')){
    return { id, label: id.slice(6), css: `${JSON.stringify(id.slice(6))}, sans-serif` };
  }
  return FONTS.find(font => font.id === id) || FONTS[0];
}
let historyStack = [];
const MAX_HISTORY = 40;

let dragState = null;
let tool = 'select';
let showGuides = true;
let showCenterAlignment = true;
let showReelWindow = true;
let showCutLines = true;
let showGrid = false;
let snapToGrid = false;
let gridSpacingMm = 4;
let measurementUnit = 'in';

function uid(){ return 'L' + Math.random().toString(36).slice(2,9); }
function currentPiece(){ return PIECES.find(p=>p.id===currentPieceId); }
function currentState(){ return state[currentPieceId]; }
function selectedLayer(){
  const s = currentState();
  return s.layers.find(l=>l.id===selectedLayerId) || null;
}

function pushHistory(){ window.projectHistory?.record(); }
function undo(){ return window.projectHistory?.undo(); }
function redo(){ return window.projectHistory?.redo(); }
