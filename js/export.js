// export.js

const PRINT_DPI = 300;
const MM_TO_IN = 1/25.4;

// ── Render a single piece to an off-screen canvas ────────────────────────────
function renderPieceToCanvas(pieceId, dpi, { cutMarks = false } = {}){
  const p = PIECES.find(x=>x.id===pieceId);
  const s = state[pieceId];
  const scale = dpi * MM_TO_IN;
  const off = document.createElement('canvas');
  off.width  = Math.round(p.w * scale);
  off.height = Math.round(p.h * scale);
  const octx = off.getContext('2d');
  octx.save();
  if(p.shape === 'label') clipLabelArtwork(octx, p, scale, s.labelShape);
  octx.fillStyle = s.bgColor || '#F4F0E6';

  if(p.shape==='label'){
    traceCassetteLabelShape(octx, 0, 0, off.width, off.height, scale, s.labelShape);
    octx.fill();
  } else {
    octx.fillRect(0, 0, off.width, off.height);
  }

  s.layers.forEach(layer => drawLayerScaled(octx, layer, scale));
  octx.restore();
  if(cutMarks) drawPrintCutMarks(octx, p, scale, s.labelShape);
  return off;
}

function drawPrintCutMarks(context, piece, scale, shape){
  context.save();
  context.strokeStyle = '#828282';
  context.lineWidth = 0.25 * scale;
  context.setLineDash([1 * scale, 0.7 * scale]);
  const inset = context.lineWidth / 2;
  if(piece.shape === 'label'){
    traceCassetteLabelShape(context, inset, inset, piece.w * scale - inset * 2,
      piece.h * scale - inset * 2, scale, shape);
    context.stroke();
    for(const hole of piece.reelHoles || []){
      context.beginPath();
      context.arc(hole.x * scale, hole.y * scale, hole.r * scale, 0, Math.PI * 2);
      context.stroke();
    }
  } else context.strokeRect(inset, inset, piece.w * scale - inset * 2, piece.h * scale - inset * 2);
  context.restore();
}

// ── Draw one layer into an off-screen canvas at any DPI ──────────────────────
function drawLayerScaled(octx, layer, scale){
  octx.save();
  const cx = layer.x*scale, cy = layer.y*scale;
  octx.translate(cx, cy);
  octx.rotate((layer.rotation||0) * Math.PI/180);
  octx.globalAlpha = layer.opacity !== undefined ? layer.opacity : 1;

  if(layer.type==='text'){
    const fontDef = fontDefinition(layer.font);
    const weight  = layer.fontWeight || (layer.bold ? 700 : 400);
    const style   = layer.italic ? 'italic' : 'normal';
    const variant = layer.smallCaps ? 'small-caps ' : '';
    octx.font         = `${style} ${variant}${weight} ${layer.size*scale}px ${fontDef.css}`;
    octx.fillStyle    = layer.color;
    octx.textBaseline = 'middle';
    octx.textAlign    = layer.align || 'left';

    const applyCaseText = window.applyCase
      ? window.applyCase(String(layer.text), layer.textCase)
      : String(layer.text);

    const lines  = applyCaseText.split('\n');
    const lh     = layer.size * scale * 1.25;
    const totalH = lh * (lines.length - 1);
    lines.forEach((ln, i) => {
      const y = -totalH/2 + i*lh;
      if(layer.shadow){
        octx.save();
        octx.shadowColor = 'rgba(0,0,0,0.4)';
        octx.shadowBlur = 4 * scale;
        octx.shadowOffsetX = 2 * scale;
        octx.shadowOffsetY = 2 * scale;
      }
      const spacing = (layer.letterSpacing || 0) * scale;
      if(spacing) drawTextWithSpacing(octx, ln, 0, y, spacing);
      else octx.fillText(ln, 0, y);
      if(layer.shadow) octx.restore();
      if(layer.outline){
        octx.strokeStyle = layer.outlineColor || '#000000';
        octx.lineWidth = 1.5 * scale;
        octx.strokeText(ln, 0, y);
      }
    });

  } else if(layer.type==='wraptext'){
    const fontDef = fontDefinition(layer.font);
    const weight  = layer.fontWeight || (layer.bold ? 700 : 400);
    const style   = layer.italic ? 'italic' : 'normal';
    const variant = layer.smallCaps ? 'small-caps ' : '';
    const size    = (layer.size||3) * scale;
    octx.font         = `${style} ${variant}${weight} ${size}px ${fontDef.css}`;
    octx.fillStyle    = layer.color || '#1C1A16';
    octx.textBaseline = 'top';
    octx.textAlign    = layer.align || 'center';
    const maxW = (layer.maxW || 75) * scale;
    const lh   = size * (layer.lineHeight || 1.35);
    let rawStr = String(layer.text || '');
    if(layer.allCaps || layer.textCase === 'upper') rawStr = rawStr.toUpperCase();
    const rawParagraphs = rawStr.split('\n');
    const wlines = [];
    for(const par of rawParagraphs){
      const words = par.split(' ');
      let cur = '';
      for(const w of words){
        const test = cur ? cur + ' ' + w : w;
        if(octx.measureText(test).width > maxW && cur){ wlines.push(cur); cur = w; }
        else { cur = test; }
      }
      if(cur) wlines.push(cur);
      else if(rawParagraphs.length > 1) wlines.push('');
    }
    if(!wlines.length) wlines.push('');
    const totalH = lh * wlines.length;
    wlines.forEach((ln, i) => {
      const tx = layer.align==='center' ? 0 : layer.align==='right' ? maxW/2 : -maxW/2;
      octx.fillText(ln, tx, -totalH/2 + i*lh);
    });

  } else if(layer.type==='rect'){
    const w=layer.w*scale, h=layer.h*scale;
    if(layer.strokeOnly){ octx.strokeStyle=layer.fill; octx.lineWidth=2; octx.strokeRect(-w/2,-h/2,w,h); }
    else { octx.fillStyle=layer.fill; octx.fillRect(-w/2,-h/2,w,h); }

  } else if(layer.type==='circle'){
    const r=layer.r*scale;
    octx.beginPath(); octx.arc(0,0,r,0,Math.PI*2);
    if(layer.strokeOnly){ octx.strokeStyle=layer.fill; octx.lineWidth=2; octx.stroke(); }
    else { octx.fillStyle=layer.fill; octx.fill(); }

  } else if(layer.type==='line'){
    const w=layer.w*scale;
    octx.strokeStyle=layer.fill;
    octx.lineWidth=(layer.thickness||1)*scale*0.35;
    octx.beginPath(); octx.moveTo(-w/2,0); octx.lineTo(w/2,0); octx.stroke();

  } else if(layer.type==='image'){
    const img = layer._img || (layer.src && window.logoImgCache && window.logoImgCache[layer.src]);
    if(img && (img.complete || img.naturalWidth > 0)){
      const w=layer.w*scale, h=layer.h*scale;
      const crop = layer.crop || {};
      const left = Math.min(0.9, Math.max(0, Number(crop.left) || 0));
      const right = Math.min(0.9 - left, Math.max(0, Number(crop.right) || 0));
      const top = Math.min(0.9, Math.max(0, Number(crop.top) || 0));
      const bottom = Math.min(0.9 - top, Math.max(0, Number(crop.bottom) || 0));
      const sourceX = img.naturalWidth * left;
      const sourceY = img.naturalHeight * top;
      const sourceW = img.naturalWidth * (1 - left - right);
      const sourceH = img.naturalHeight * (1 - top - bottom);
      octx.scale(layer.flipX ? -1 : 1, layer.flipY ? -1 : 1);
      octx.drawImage(img,sourceX,sourceY,sourceW,sourceH,-w/2,-h/2,w,h);
    }

  } else if(layer.type==='barcode'){
    // Use canvas.js barcode renderer if exposed, else draw a placeholder
    if(window.drawBarcodeExport) {
      window.drawBarcodeExport(octx, layer, scale);
    } else {
      octx.fillStyle='#888';
      octx.fillRect(-(layer.w||20)*scale/2, -(layer.h||10)*scale/2, (layer.w||20)*scale, (layer.h||10)*scale);
    }
  }
  octx.restore();
}

// ── Build the folded single-sheet canvas ─────────────────────────────────────
//
//  Unfolded J-card physical layout (left to right when looking at BACK of sheet):
//    [ FLAP 26.5mm ][ SPINE 12.5mm ][ FRONT COVER 65mm ][ BACK / TRACKLIST 65mm ]
//    <──────────────────────── 169mm total ────────────────────────────────────>
//
//  jcard       holds: Flap(0..26.5) + Spine(26.5..39) + Front(39..104)
//  jcard-back  holds: Flap(0..26.5) + Spine(26.5..39) + Back(39..104)
//
//  Single-sheet: blit jcard at dstX=0, then blit jcard-back[39..104] at dstX=104
//
function renderFoldedJcardCanvas(dpi, { cutMarks = false } = {}){
  const scale  = dpi * MM_TO_IN;
  const totalW = JCARD_FLAP_W + JCARD_SPINE_W + JCARD_FRONT_W + JCARD_FRONT_W; // 169mm
  const totalH = JCARD_H;

  const out  = document.createElement('canvas');
  out.width  = Math.round(totalW * scale);
  out.height = Math.round(totalH * scale);
  const octx = out.getContext('2d');

  // Draw front (left three panels)
  const frontCanvas = renderPieceToCanvas('jcard', dpi);
  octx.drawImage(frontCanvas, 0, 0);

  // Draw only the back panel (x=39..104mm) of jcard-back at dstX=104mm
  const backCanvas = renderPieceToCanvas('jcard-back', dpi);
  const srcX = Math.round((JCARD_FLAP_W + JCARD_SPINE_W) * scale);
  const srcW = Math.round(JCARD_FRONT_W * scale);
  const dstX = Math.round((JCARD_FLAP_W + JCARD_SPINE_W + JCARD_FRONT_W) * scale);

  octx.drawImage(backCanvas,
    srcX, 0, srcW, out.height,
    dstX, 0, srcW, out.height
  );

  if(cutMarks) drawPrintCutMarks(octx, { w: totalW, h: totalH }, scale);
  return out;
}

// ── jsPDF loader ─────────────────────────────────────────────────────────────
let __jspdfLoadPromise = null;
function ensureJsPDF(){
  if(window.jspdf && window.jspdf.jsPDF) return Promise.resolve();
  if(__jspdfLoadPromise) return __jspdfLoadPromise;
  __jspdfLoadPromise = new Promise((resolve, reject)=>{
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload  = ()=>resolve();
    s.onerror = ()=>reject(new Error('Could not load PDF library'));
    document.head.appendChild(s);
  });
  return __jspdfLoadPromise;
}

const PRINT_PAGE_WIDTH_MM = 297;
const PRINT_PAGE_HEIGHT_MM = 210;
const PRINT_LABEL_WIDTH_MM = 89;
const PRINT_LABEL_HEIGHT_MM = 45;
const PRINT_LABEL_GAP_MM = 6;
let printLayout = getAutoPackedPrintLayout();
let printPreviewOpener = null;
let manualPrintPlacementEnabled = false;
let printShowCutMarks = true;
let selectedPrintItem = 'card';

function restorePrintLayout(saved){
  printLayout = getAutoPackedPrintLayout();
  for(const key of Object.keys(printLayout)){
    const rect = saved?.[key];
    if(rect && ['x','y','w','h'].every(field => Number.isFinite(rect[field])) &&
      rect.w >= 5 && rect.h >= 5 && rect.w <= PRINT_PAGE_WIDTH_MM && rect.h <= PRINT_PAGE_HEIGHT_MM){
      printLayout[key] = {w:rect.w, h:rect.h,
        x:Math.max(0, Math.min(rect.x, PRINT_PAGE_WIDTH_MM-rect.w)),
        y:Math.max(0, Math.min(rect.y, PRINT_PAGE_HEIGHT_MM-rect.h))};
    }
  }
  updatePrintPreviewItems();
}

function resizePrintItem(width, height){
  if(!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;
  const rect = printLayout[selectedPrintItem];
  if(document.getElementById('printLockRatio').checked){
    const scale = Math.min(PRINT_PAGE_WIDTH_MM / width, PRINT_PAGE_HEIGHT_MM / height,
      Math.max(1, 5 / width, 5 / height));
    width *= scale; height *= scale;
  }
  rect.w = Math.max(5, Math.min(PRINT_PAGE_WIDTH_MM, width));
  rect.h = Math.max(5, Math.min(PRINT_PAGE_HEIGHT_MM, height));
  rect.x = Math.max(0, Math.min(rect.x, PRINT_PAGE_WIDTH_MM - rect.w));
  rect.y = Math.max(0, Math.min(rect.y, PRINT_PAGE_HEIGHT_MM - rect.h));
  updatePrintPreviewItems();
}

function getAutoPackedPrintLayout(){
  const cardWidth = JCARD_FLAP_W + JCARD_SPINE_W + JCARD_FRONT_W * 2;
  const groupWidth = PRINT_LABEL_WIDTH_MM * 2 + PRINT_LABEL_GAP_MM;
  const cardHeight = JCARD_H;
  const labelsHeight = PRINT_LABEL_HEIGHT_MM;
  const verticalGap = 8;
  const groupHeight = cardHeight + verticalGap + labelsHeight;
  const top = (PRINT_PAGE_HEIGHT_MM - groupHeight) / 2;
  return {
    card: { x: (PRINT_PAGE_WIDTH_MM - cardWidth) / 2, y: top, w: cardWidth, h: cardHeight },
    labelA: { x: (PRINT_PAGE_WIDTH_MM - groupWidth) / 2, y: top + cardHeight + verticalGap, w: PRINT_LABEL_WIDTH_MM, h: PRINT_LABEL_HEIGHT_MM },
    labelB: { x: (PRINT_PAGE_WIDTH_MM - groupWidth) / 2 + PRINT_LABEL_WIDTH_MM + PRINT_LABEL_GAP_MM, y: top + cardHeight + verticalGap, w: PRINT_LABEL_WIDTH_MM, h: PRINT_LABEL_HEIGHT_MM }
  };
}

function updatePrintPreviewItems(){
  const page = document.getElementById('printPage');
  if(!page) return;
  const pageWidthPx = page.getBoundingClientRect().width;
  const pxPerMm = pageWidthPx / PRINT_PAGE_WIDTH_MM;
  const items = [
    ['printPageCard', printLayout.card],
    ['printPageLabelA', printLayout.labelA],
    ['printPageLabelB', printLayout.labelB]
  ];
  items.forEach(([id, rect]) => {
    const element = document.getElementById(id);
    if(!element) return;
    element.style.left = `${rect.x * pxPerMm}px`;
    element.style.top = `${rect.y * pxPerMm}px`;
    element.style.width = `${rect.w * pxPerMm}px`;
    element.style.height = `${rect.h * pxPerMm}px`;
  });
  const rect = printLayout[selectedPrintItem];
  const overlay = document.getElementById('printDimensions');
  overlay.hidden = !manualPrintPlacementEnabled;
  Object.assign(overlay.style, {left:`${rect.x*pxPerMm}px`, top:`${rect.y*pxPerMm}px`,
    width:`${rect.w*pxPerMm}px`, height:`${rect.h*pxPerMm}px`});
  document.getElementById('printDimensionWidth').textContent = `${rect.w.toFixed(1)} mm`;
  document.getElementById('printDimensionHeight').textContent = `${rect.h.toFixed(1)} mm`;
  document.getElementById('printSelectedItem').value = selectedPrintItem;
  document.getElementById('printItemWidth').value = +rect.w.toFixed(2);
  document.getElementById('printItemHeight').value = +rect.h.toFixed(2);
}

function preparePrintPreview(){
  const page = document.getElementById('printPage');
  const cardCanvas = document.getElementById('printPageCard');
  const labelACanvas = document.getElementById('printPageLabelA');
  const labelBCanvas = document.getElementById('printPageLabelB');
  if(!page || !cardCanvas || !labelACanvas || !labelBCanvas) return false;

  const previewDpi = 120;
  const previews = [
    [cardCanvas, renderFoldedJcardCanvas(previewDpi, { cutMarks: printShowCutMarks })],
    [labelACanvas, renderPieceToCanvas('label-a', previewDpi, { cutMarks: printShowCutMarks })],
    [labelBCanvas, renderPieceToCanvas('label-b', previewDpi, { cutMarks: printShowCutMarks })]
  ];
  previews.forEach(([target, source]) => {
    target.width = source.width;
    target.height = source.height;
    const targetContext = target.getContext('2d');
    targetContext.clearRect(0, 0, target.width, target.height);
    targetContext.drawImage(source, 0, 0);
  });
  updatePrintPreviewItems();
  return true;
}

function setPrintCutMarks(enabled){
  printShowCutMarks = !!enabled;
  document.getElementById('printShowCutMarks').checked = printShowCutMarks;
  if(document.getElementById('printPreviewModal').classList.contains('open')) preparePrintPreview();
}
document.getElementById('printShowCutMarks').addEventListener('change', event => setPrintCutMarks(event.target.checked));

function setManualPrintPlacement(enabled){
  manualPrintPlacementEnabled = enabled;
  const page = document.getElementById('printPage');
  const warning = document.getElementById('printManualWarning');
  const status = document.getElementById('printPreviewStatus');
  page?.classList.toggle('manual-placement', enabled);
  document.getElementById('printSizeControls').hidden = !enabled;
  updatePrintPreviewItems();
  if(warning) warning.hidden = !enabled;
  if(status) status.textContent = enabled
    ? 'Drag artwork to move it. Drag its corner handle or enter dimensions to resize.'
    : 'Enable Manual placement to drag artwork.';
}

function openPrintPreview(){
  const modal = document.getElementById('printPreviewModal');
  const manualToggle = document.getElementById('printManualPlacement');
  if(!modal || !preparePrintPreview()) return;
  printPreviewOpener = document.activeElement;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  manualToggle.checked = manualPrintPlacementEnabled;
  setManualPrintPlacement(manualPrintPlacementEnabled);
  requestAnimationFrame(updatePrintPreviewItems);
  document.getElementById('printPreviewExport')?.focus();
}

function closePrintPreview(){
  const modal = document.getElementById('printPreviewModal');
  if(!modal?.classList.contains('open')) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  if(printPreviewOpener instanceof HTMLElement && printPreviewOpener.isConnected) printPreviewOpener.focus();
  printPreviewOpener = null;
}

function beginPrintItemDrag(event){
  if(event.button !== 0 || !manualPrintPlacementEnabled) return;
  pushHistory();
  const item = event.currentTarget;
  const layoutKey = item.dataset.layoutKey;
  selectedPrintItem = layoutKey;
  updatePrintPreviewItems();
  const startLayout = printLayout[layoutKey];
  const page = document.getElementById('printPage');
  const bounds = page.getBoundingClientRect();
  const pxPerMm = bounds.width / PRINT_PAGE_WIDTH_MM;
  const startX = event.clientX;
  const startY = event.clientY;
  const originalX = startLayout.x;
  const originalY = startLayout.y;
  item.setPointerCapture(event.pointerId);
  event.preventDefault();

  const move = moveEvent => {
    const next = printLayout[layoutKey];
    next.x = Math.min(Math.max(0, originalX + (moveEvent.clientX - startX) / pxPerMm), PRINT_PAGE_WIDTH_MM - next.w);
    const minY = 0;
    next.y = Math.min(Math.max(minY, originalY + (moveEvent.clientY - startY) / pxPerMm), PRINT_PAGE_HEIGHT_MM - next.h);
    updatePrintPreviewItems();
    const status = document.getElementById('printPreviewStatus');
    if(status) status.textContent = `${item.getAttribute('aria-label')} at ${next.x.toFixed(1)} mm, ${next.y.toFixed(1)} mm.`;
  };
  const end = () => {
    window.projectHistory?.scheduleUpdate();
    item.removeEventListener('pointermove', move);
    item.removeEventListener('pointerup', end);
    item.removeEventListener('pointercancel', end);
  };
  item.addEventListener('pointermove', move);
  item.addEventListener('pointerup', end);
  item.addEventListener('pointercancel', end);
}

document.getElementById('printPageCard')?.addEventListener('pointerdown', beginPrintItemDrag);
document.getElementById('printPageLabelA')?.addEventListener('pointerdown', beginPrintItemDrag);
document.getElementById('printPageLabelB')?.addEventListener('pointerdown', beginPrintItemDrag);
document.getElementById('printPageCard')?.setAttribute('data-layout-key', 'card');
document.getElementById('printPageLabelA')?.setAttribute('data-layout-key', 'labelA');
document.getElementById('printPageLabelB')?.setAttribute('data-layout-key', 'labelB');
document.getElementById('printManualPlacement')?.addEventListener('change', event => setManualPrintPlacement(event.target.checked));
document.getElementById('printSelectedItem').addEventListener('change', event => {
  selectedPrintItem = event.target.value;
  updatePrintPreviewItems();
});
for(const [id, field] of [['printItemWidth','w'], ['printItemHeight','h']]){
  document.getElementById(id).addEventListener('change', event => {
    const rect = printLayout[selectedPrintItem];
    const value = Number(event.target.value);
    if(value > 0 && Number.isFinite(value)){
      pushHistory();
      const factor = value / rect[field];
      const locked = document.getElementById('printLockRatio').checked;
      resizePrintItem(field === 'w' ? value : rect.w * (locked ? factor : 1),
        field === 'h' ? value : rect.h * (locked ? factor : 1));
    }else updatePrintPreviewItems();
  });
}
document.getElementById('printResetSize').addEventListener('click', () => {
  pushHistory();
  const standard = getAutoPackedPrintLayout()[selectedPrintItem];
  resizePrintItem(standard.w, standard.h);
});
document.getElementById('printResizeHandle').addEventListener('pointerdown', event => {
  if(event.button !== 0 || !manualPrintPlacementEnabled) return;
  event.preventDefault();
  pushHistory();
  const handle = event.currentTarget;
  const original = {...printLayout[selectedPrintItem]};
  const startX = event.clientX, startY = event.clientY;
  const pxPerMm = document.getElementById('printPage').getBoundingClientRect().width / PRINT_PAGE_WIDTH_MM;
  handle.setPointerCapture(event.pointerId);
  const move = next => {
    let w = Math.max(5, original.w + (next.clientX-startX)/pxPerMm);
    let h = Math.max(5, original.h + (next.clientY-startY)/pxPerMm);
    if(document.getElementById('printLockRatio').checked){
      const factor = Math.abs(w/original.w-1) >= Math.abs(h/original.h-1) ? w/original.w : h/original.h;
      w = original.w*factor; h = original.h*factor;
    }
    resizePrintItem(w,h);
  };
  const end = () => {
    window.projectHistory?.scheduleUpdate();
    handle.removeEventListener('pointermove', move);
    handle.removeEventListener('pointerup', end);
    handle.removeEventListener('pointercancel', end);
  };
  handle.addEventListener('pointermove', move);
  handle.addEventListener('pointerup', end);
  handle.addEventListener('pointercancel', end);
});
document.getElementById('printAutoPack')?.addEventListener('click', () => {
  pushHistory();
  printLayout = getAutoPackedPrintLayout();
  if(preparePrintPreview()){
    manualPrintPlacementEnabled = false;
    setManualPrintPlacement(false);
    document.getElementById('printManualPlacement').checked = false;
    const status = document.getElementById('printPreviewStatus');
    if(status) status.textContent = 'All artwork restored to the centered auto-packed layout.';
  }
});
document.getElementById('printPreviewClose')?.addEventListener('click', closePrintPreview);
document.getElementById('printPreviewCancel')?.addEventListener('click', closePrintPreview);
document.getElementById('printPreviewModal')?.addEventListener('click', event => {
  if(event.target.id === 'printPreviewModal') closePrintPreview();
});
document.getElementById('btnPrintPreview')?.addEventListener('click', openPrintPreview);
window.addEventListener('resize', updatePrintPreviewItems);
document.addEventListener('keydown', event => {
  if(event.key === 'Escape') closePrintPreview();
});

// ── Main export ───────────────────────────────────────────────────────────────
async function exportJcardPDF(){
  try {
    await ensureJsPDF();
    const { jsPDF } = window.jspdf;
    const dpi = PRINT_DPI;

    // A4 landscape: 297 x 210mm  — 169mm card fits with comfortable margins
    const pageW = PRINT_PAGE_WIDTH_MM, pageH = PRINT_PAGE_HEIGHT_MM;
    const pdf = new jsPDF({ unit:'mm', format:'a4', orientation:'landscape' });

    // ── PAGE 1: SINGLE-SHEET FOLDED PRINT ─────────────────────────────────────
    const sheetW = printLayout.card.w;
    const sheetH = printLayout.card.h;
    const sheetX = printLayout.card.x;
    const sheetY = printLayout.card.y;

    const sheetCanvas  = renderFoldedJcardCanvas(dpi, { cutMarks: printShowCutMarks });
    pdf.addImage(sheetCanvas.toDataURL('image/png'), 'PNG', sheetX, sheetY, sheetW, sheetH);

    // Panel labels above card
    pdf.setFontSize(6);
    pdf.setTextColor(120,60,80);
    const panelLabels = [
      { cx: JCARD_FLAP_W/2,                                     label:'FLAP' },
      { cx: JCARD_FLAP_W + JCARD_SPINE_W/2,                     label:'SPINE' },
      { cx: JCARD_FLAP_W + JCARD_SPINE_W + JCARD_FRONT_W/2,     label:'FRONT COVER' },
      { cx: JCARD_FLAP_W + JCARD_SPINE_W + JCARD_FRONT_W*1.5,   label:'BACK / TRACKLIST' },
    ];
    panelLabels.forEach(l=>{
      pdf.text(l.label, sheetX+l.cx * sheetW / (JCARD_FLAP_W + JCARD_SPINE_W + JCARD_FRONT_W*2), sheetY-5, { align:'center' });
    });

    // Instruction below card
    pdf.setFontSize(7);
    pdf.setTextColor(80,80,80);
    const labelAImage = renderPieceToCanvas('label-a', dpi, { cutMarks: printShowCutMarks }).toDataURL('image/png');
    const labelBImage = renderPieceToCanvas('label-b', dpi, { cutMarks: printShowCutMarks }).toDataURL('image/png');
    pdf.addImage(labelAImage, 'PNG', printLayout.labelA.x, printLayout.labelA.y, printLayout.labelA.w, printLayout.labelA.h);
    pdf.addImage(labelBImage, 'PNG', printLayout.labelB.x, printLayout.labelB.y, printLayout.labelB.w, printLayout.labelB.h);
    pdf.setFontSize(6); pdf.setTextColor(120,60,80);
    pdf.text('LABEL A', printLayout.labelA.x + printLayout.labelA.w/2, printLayout.labelA.y - 2, { align:'center' });
    pdf.text('LABEL B', printLayout.labelB.x + printLayout.labelB.w/2, printLayout.labelB.y - 2, { align:'center' });

    // ── PAGE 2: FRONT reference ───────────────────────────────────────────────
    pdf.addPage('a4','landscape');
    const cX=(pageW-JCARD_W)/2, cY=(pageH-JCARD_H)/2;
    pdf.addImage(renderPieceToCanvas('jcard',dpi, { cutMarks: printShowCutMarks }).toDataURL('image/png'),'PNG',cX,cY,JCARD_W,JCARD_H);
    pdf.setFontSize(7); pdf.setTextColor(80,80,80);
    pdf.text('Page 2 \u2014 FRONT SIDE (Flap + Spine + Cover) \u2014 reference for 2-sided printing', pageW/2, cY-4, {align:'center'});

    // ── PAGE 3: BACK reference ────────────────────────────────────────────────
    pdf.addPage('a4','landscape');
    pdf.addImage(renderPieceToCanvas('jcard-back',dpi, { cutMarks: printShowCutMarks }).toDataURL('image/png'),'PNG',cX,cY,JCARD_W,JCARD_H);
    pdf.setFontSize(7); pdf.setTextColor(80,80,80);
    pdf.text('Page 3 \u2014 BACK SIDE (Tracklist) \u2014 reference for 2-sided printing', pageW/2, cY-4, {align:'center'});

    pdf.save('mixtape-jcard.pdf');
    return true;

  } catch(err) {
    alert('Could not build the PDF: ' + err.message);
    console.error(err);
    return false;
  }
}

document.getElementById('exportBtn')?.addEventListener('click', openPrintPreview);
document.getElementById('printPreviewExport')?.addEventListener('click', async () => {
  const button = document.getElementById('printPreviewExport');
  button.disabled = true;
  button.textContent = 'Building PDF…';
  const exported = await exportJcardPDF();
  button.disabled = false;
  button.textContent = 'Save to PDF';
  if(exported) closePrintPreview();
});
