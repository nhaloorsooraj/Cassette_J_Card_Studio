// canvas.js

const canvas = document.getElementById('designCanvas');
const ctx = canvas.getContext('2d');
const canvasWrap = document.getElementById('canvasWrap');
const stage = canvasWrap.closest('.stage');
const selectionCanvas = document.createElement('canvas');
selectionCanvas.id = 'selectionCanvas';
selectionCanvas.setAttribute('aria-hidden', 'true');
stage.appendChild(selectionCanvas);

// Draw editor controls across the visible workspace, independently of print bounds.
function renderSelectionOverlay(){
  const viewport = stage.getBoundingClientRect();
  const artwork = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  selectionCanvas.style.left = `${viewport.left}px`;
  selectionCanvas.style.top = `${viewport.top}px`;
  selectionCanvas.style.width = `${stage.clientWidth}px`;
  selectionCanvas.style.height = `${stage.clientHeight}px`;
  selectionCanvas.width = Math.round(stage.clientWidth * dpr);
  selectionCanvas.height = Math.round(stage.clientHeight * dpr);
  const overlay = selectionCanvas.getContext('2d');
  const scaleX = artwork.width / (currentPiece().w * MM_PX);
  const scaleY = artwork.height / (currentPiece().h * MM_PX);
  overlay.setTransform(dpr * scaleX, 0, 0, dpr * scaleY,
    dpr * (artwork.left - viewport.left), dpr * (artwork.top - viewport.top));
  const layer = selectedLayer();
  const group = trackGroupBounds();
  if(group){
    overlay.strokeStyle = '#3b82f6';
    overlay.lineWidth = 1.5;
    overlay.setLineDash([6, 3]);
    overlay.strokeRect(group.x * MM_PX, group.y * MM_PX, group.w * MM_PX, group.h * MM_PX);
    return;
  }
  if(layer && imageCropLayerId === layer.id) drawImageCropOverlay(layer, overlay);
  else if(layer) drawSelection(layer, overlay);
}
window.addEventListener('resize', renderSelectionOverlay);
document.addEventListener('scroll', renderSelectionOverlay, true);
const selectionObserver = new ResizeObserver(renderSelectionOverlay);
selectionObserver.observe(canvas);
selectionObserver.observe(stage);
let imageCropLayerId = null;
let cropDraft = null;
let canvasZoom = 1;
let centerAlignmentGuides = { vertical: [], horizontal: [] };
const CENTER_SNAP_TOLERANCE_MM = 2;

function updateCanvasZoom(){
  const p = currentPiece();
  const zoomInput = document.getElementById('canvasZoom');
  if(zoomInput) zoomInput.value = String(Math.round(canvasZoom * 100));
  canvas.style.width = `${p.w * MM_PX * canvasZoom}px`;
  canvas.style.height = `${p.h * MM_PX * canvasZoom}px`;
  const resetButton = document.getElementById('btnZoomReset');
  if(resetButton) resetButton.textContent = `${Math.round(canvasZoom * 100)}%`;
  renderSelectionOverlay();
}

function resizeCanvasForPiece(){
  const p = currentPiece();
  const dpr = window.devicePixelRatio || 1;
  const wPx = p.w * MM_PX, hPx = p.h * MM_PX;
  canvas.width = wPx * dpr;
  canvas.height = hPx * dpr;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  updateCanvasZoom();
}

function setCanvasZoom(value){
  canvasZoom = Math.min(2, Math.max(0.5, value));
  updateCanvasZoom();
}
document.getElementById('canvasZoom')?.addEventListener('input', event => {
  setCanvasZoom(parseInt(event.target.value, 10) / 100);
});
document.getElementById('btnZoomOut')?.addEventListener('click', () => setCanvasZoom(canvasZoom - 0.1));
document.getElementById('btnZoomIn')?.addEventListener('click', () => setCanvasZoom(canvasZoom + 0.1));
document.getElementById('btnZoomReset')?.addEventListener('click', () => setCanvasZoom(1));
canvasWrap.addEventListener('wheel', event => {
  event.preventDefault();
  const zoomStep = event.deltaY < 0 ? 0.1 : -0.1;
  setCanvasZoom(canvasZoom + zoomStep);
}, { passive: false });

function drawRoundedRect(x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}

function applyCase(str, c){
  if(c==='upper') return str.toUpperCase();
  if(c==='lower') return str.toLowerCase();
  return str;
}

function drawCassetteLabelShape(x, y, w, h, settings = currentState().labelShape || {}) {
  traceCassetteLabelShape(ctx, x, y, w, h, MM_PX, settings);
}

function drawReelWindowShape(rw) {
  const cx = rw.x * MM_PX;
  const cy = rw.y * MM_PX;
  const w = rw.w * MM_PX;
  const h = rw.h * MM_PX;
  const r = h / 2;
  drawRoundedRect(cx - w/2, cy - h/2, w, h, r);
}

function drawImageCropOverlay(layer, ctx){
  if(!cropDraft || cropDraft.layerId !== layer.id) return;
  const { left, top, right, bottom } = cropDraft;
  const width = layer.w * MM_PX, height = layer.h * MM_PX;
  const x1 = -width/2 + left*width, x2 = -width/2 + right*width;
  const y1 = -height/2 + top*height, y2 = -height/2 + bottom*height;
  ctx.save();
  ctx.translate(layer.x*MM_PX, layer.y*MM_PX);
  ctx.rotate((layer.rotation || 0) * Math.PI/180);
  ctx.fillStyle = 'rgba(12, 20, 20, 0.58)';
  ctx.beginPath();
  ctx.rect(-width/2, -height/2, width, height);
  ctx.rect(x1, y1, x2-x1, y2-y1);
  ctx.fill('evenodd');
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 4]);
  ctx.strokeRect(x1, y1, x2-x1, y2-y1);
  ctx.setLineDash([]);
  ctx.strokeStyle = '#276c68';
  ctx.lineWidth = 1.5;
  const handleSize = 12;
  [[x1,y1],[x2,y1],[x1,y2],[x2,y2]].forEach(([x,y]) => {
    ctx.fillStyle = '#fffefa';
    ctx.fillRect(x-handleSize/2, y-handleSize/2, handleSize, handleSize);
    ctx.strokeRect(x-handleSize/2, y-handleSize/2, handleSize, handleSize);
  });
  ctx.restore();
}

function startImageCrop(layerId){
  const layer = currentState().layers.find(item => item.id === layerId);
  if(!layer || layer.type !== 'image') return false;
  pushHistory();
  imageCropLayerId = layer.id;
  cropDraft = {
    layerId: layer.id, left: 0, top: 0, right: 1, bottom: 1,
    baseSize: layer.cropBaseSize ? { ...layer.cropBaseSize } : { w: layer.w, h: layer.h }
  };
  render();
  return true;
}

function applyImageCrop(){
  const layer = selectedLayer();
  if(!layer || layer.type !== 'image' || !cropDraft || cropDraft.layerId !== layer.id) return false;
  const { left, top, right, bottom } = cropDraft;
  layer.cropBaseSize ||= cropDraft.baseSize;
  const currentCrop = layer.crop || {};
  const oldLeft = Math.min(0.9, Math.max(0, Number(currentCrop.left) || 0));
  const oldRight = Math.min(0.9-oldLeft, Math.max(0, Number(currentCrop.right) || 0));
  const oldTop = Math.min(0.9, Math.max(0, Number(currentCrop.top) || 0));
  const oldBottom = Math.min(0.9-oldTop, Math.max(0, Number(currentCrop.bottom) || 0));
  const sourceW = 1-oldLeft-oldRight, sourceH = 1-oldTop-oldBottom;
  const offsetX = layer.w * ((left+right)/2-0.5);
  const offsetY = layer.h * ((top+bottom)/2-0.5);
  const angle = (layer.rotation || 0) * Math.PI/180;
  layer.x += offsetX*Math.cos(angle)-offsetY*Math.sin(angle);
  layer.y += offsetX*Math.sin(angle)+offsetY*Math.cos(angle);
  layer.crop = {
    left: oldLeft + (layer.flipX ? 1-right : left)*sourceW,
    right: oldRight + (layer.flipX ? left : 1-right)*sourceW,
    top: oldTop + (layer.flipY ? 1-bottom : top)*sourceH,
    bottom: oldBottom + (layer.flipY ? top : 1-bottom)*sourceH
  };
  layer.w *= right-left;
  layer.h *= bottom-top;
  imageCropLayerId = null;
  cropDraft = null;
  render();
  if(window.syncImageControls) window.syncImageControls();
  return true;
}

function cancelImageCrop(){
  imageCropLayerId = null;
  cropDraft = null;
  render();
}

function resetImageCrop(){
  const layer = selectedLayer();
  if(!layer || layer.type !== 'image') return;
  if(!layer.cropBaseSize) layer.cropBaseSize = { w: layer.w, h: layer.h };
  pushHistory();
  if(layer.cropBaseSize){
    layer.w = layer.cropBaseSize.w;
    layer.h = layer.cropBaseSize.h;
  }
  layer.crop = { left: 0, right: 0, top: 0, bottom: 0 };
  cancelImageCrop();
  if(window.syncImageControls) window.syncImageControls();
}

window.startImageCrop = startImageCrop;
window.applyImageCrop = applyImageCrop;
window.cancelImageCrop = cancelImageCrop;
window.resetImageCrop = resetImageCrop;
window.isImageCropActive = layerId => imageCropLayerId === layerId;

function render(){
  window.refreshTypographyPreview?.();
  window.projectHistory?.scheduleUpdate();
  window.refreshDeletedItems?.();
  const p = currentPiece();
  const s = currentState();
  const W = p.w*MM_PX, H = p.h*MM_PX;
  ctx.clearRect(0,0,W,H);

  ctx.save();
  if(p.shape === 'label') clipLabelArtwork(ctx, p, MM_PX, s.labelShape);

  // Background
  ctx.fillStyle = s.bgColor || '#F4F0E6';
  if(p.shape === 'label'){
    drawCassetteLabelShape(0, 0, W, H);
    ctx.fill();
  } else {
    ctx.fillRect(0,0,W,H);
  }

  if(showGrid && gridSpacingMm > 0){
    ctx.save();
    ctx.strokeStyle = 'rgba(28,26,22,0.14)';
    ctx.lineWidth = 0.5;
    for(let x = gridSpacingMm * MM_PX; x < W; x += gridSpacingMm * MM_PX){
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for(let y = gridSpacingMm * MM_PX; y < H; y += gridSpacingMm * MM_PX){
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.restore();
  }

  // Layers
  s.layers.forEach(layer => drawLayer(layer));
  ctx.restore();

  renderSelectionOverlay();

  if(showCenterAlignment && (centerAlignmentGuides.vertical.length || centerAlignmentGuides.horizontal.length)){
    ctx.save();
    ctx.strokeStyle = '#00a8e8';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    centerAlignmentGuides.vertical.forEach(centerX => {
      ctx.beginPath();
      ctx.moveTo(centerX, 0);
      ctx.lineTo(centerX, H);
      ctx.stroke();
    });
    centerAlignmentGuides.horizontal.forEach(centerY => {
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(W, centerY);
      ctx.stroke();
    });
    ctx.restore();
  }

  // Guides
  if(showGuides){
    ctx.save();
    ctx.strokeStyle = 'rgba(180,67,108,0.55)';
    ctx.setLineDash([4,3]);
    ctx.lineWidth = 1;
    if(p.guides && p.guides.vertical){
      p.guides.vertical.forEach(g=>{
        const x = g.x * W;
        ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke();
      });
    }
    if(p.shape === 'label' && p.reelWindow && showReelWindow){
      drawReelWindowShape(p.reelWindow);
      ctx.stroke();
    }
    ctx.restore();
  }

  if(showCutLines){
    ctx.save();
    ctx.strokeStyle = 'rgba(28,26,22,0.55)';
    ctx.setLineDash([4,3]);
    ctx.lineWidth = 1;
    if(p.shape === 'label'){
      drawCassetteLabelShape(0.5, 0.5, W-1, H-1);
      ctx.stroke();
      if(p.reelHoles){
        ctx.setLineDash([1,2]);
        p.reelHoles.forEach(hole => {
          ctx.beginPath();
          ctx.arc(hole.x * MM_PX, hole.y * MM_PX, hole.r * MM_PX, 0, Math.PI * 2);
          ctx.stroke();
        });
      }
    } else {
      ctx.strokeRect(0.5, 0.5, W-1, H-1);
    }
    ctx.restore();
  }
  renderLayerStack();
  if(window.syncShapeColorControl) window.syncShapeColorControl();
}

function getLayerStackLabel(layer){
  if(layer.name) return layer.name;
  if(layer.type === 'text' || layer.type === 'wraptext'){
    return String(layer.text || 'Text').replace(/\s+/g, ' ').trim().slice(0, 48) || 'Text';
  }
  if(layer.type === 'barcode') return 'Barcode';
  if(layer.type === 'image') return 'Image';
  return layer.type ? layer.type[0].toUpperCase() + layer.type.slice(1) : 'Layer';
}

function renderLayerStack(){
  const stack = document.getElementById('layerStack');
  if(!stack) return;
  stack.replaceChildren();

  const layersFrontToBack = [...currentState().layers].reverse();
  if(layersFrontToBack.length === 0){
    const empty = document.createElement('div');
    empty.className = 'layer-stack-empty';
    empty.textContent = 'Add text or artwork to see layers here.';
    stack.appendChild(empty);
    return;
  }

  layersFrontToBack.forEach(layer => {
    const row = document.createElement('div');
    row.className = `layer-stack-item${layer.id === selectedLayerId ? ' selected' : ''}`;
    row.draggable = true;
    row.dataset.layerId = layer.id;
    row.title = `${getLayerStackLabel(layer)} — drag to change front/back order`;
    row.setAttribute('aria-label', `${getLayerStackLabel(layer)}, ${layer.id === selectedLayerId ? 'selected' : 'not selected'}, drag to reorder`);

    const thumb = document.createElement('div');
    thumb.className = 'layer-stack-thumb';
    if(layer.type === 'image' && layer.src){
      const image = document.createElement('img');
      image.src = layer.src;
      image.alt = '';
      thumb.appendChild(image);
    } else {
      thumb.textContent = layer.type === 'text' || layer.type === 'wraptext' ? 'T' :
        layer.type === 'barcode' ? '▥' : layer.type === 'circle' ? '●' :
          layer.type === 'line' ? '╱' : layer.type === 'rect' ? '■' : '•';
      if(layer.fill) thumb.style.color = layer.fill;
    }

    const name = document.createElement('span');
    name.className = 'layer-stack-name';
    name.textContent = getLayerStackLabel(layer);
    row.append(thumb, name);

    row.addEventListener('click', () => {
      selectedTrackGroup = null;
      selectedLayerId = layer.id;
      if(layer.type === 'text' || layer.type === 'wraptext'){
        if(window.syncFontPanelToLayer) window.syncFontPanelToLayer(layer);
      } else if(window.clearFontPanel){
        window.clearFontPanel();
      }
      if(window.syncImageControls) window.syncImageControls();
      render();
      updateLayerToolbar();
    });
    row.addEventListener('dragstart', event => {
      event.dataTransfer?.setData('text/plain', layer.id);
      if(event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
      row.classList.add('dragging');
    });
    row.addEventListener('dragover', event => {
      event.preventDefault();
      if(event.dataTransfer) event.dataTransfer.dropEffect = 'move';
      stack.querySelectorAll('.drag-before, .drag-after').forEach(item => {
        item.classList.remove('drag-before', 'drag-after');
      });
      const bounds = row.getBoundingClientRect();
      row.classList.add(event.clientY < bounds.top + bounds.height / 2 ? 'drag-before' : 'drag-after');
    });
    row.addEventListener('dragleave', event => {
      if(!row.contains(event.relatedTarget)) row.classList.remove('drag-before', 'drag-after');
    });
    row.addEventListener('drop', event => {
      event.preventDefault();
      event.stopPropagation();
      const sourceId = event.dataTransfer?.getData('text/plain');
      if(!sourceId || sourceId === layer.id) return;
      const visualOrder = [...currentState().layers].reverse();
      const sourceIndex = visualOrder.findIndex(item => item.id === sourceId);
      const targetIndex = visualOrder.findIndex(item => item.id === layer.id);
      if(sourceIndex < 0 || targetIndex < 0) return;

      const [movedLayer] = visualOrder.splice(sourceIndex, 1);
      const adjustedTargetIndex = visualOrder.findIndex(item => item.id === layer.id);
      const bounds = row.getBoundingClientRect();
      const insertIndex = adjustedTargetIndex + (event.clientY >= bounds.top + bounds.height / 2 ? 1 : 0);
      visualOrder.splice(insertIndex, 0, movedLayer);
      if(visualOrder.every((item, index) => item.id === layersFrontToBack[index]?.id)) return;

      pushHistory();
      currentState().layers = visualOrder.reverse();
      selectedLayerId = movedLayer.id;
      render();
      updateLayerToolbar();
    });
    row.addEventListener('dragend', () => {
      stack.querySelectorAll('.dragging, .drag-before, .drag-after').forEach(item => {
        item.classList.remove('dragging', 'drag-before', 'drag-after');
      });
    });
    stack.appendChild(row);
  });
}

function drawLayer(layer){
  ctx.save();
  const cx = layer.x*MM_PX, cy = layer.y*MM_PX;
  ctx.translate(cx,cy);
  ctx.rotate((layer.rotation||0) * Math.PI/180);
  ctx.globalAlpha = layer.opacity!==undefined ? layer.opacity : 1;

  if(layer.type === 'text'){
    const fontDef = fontDefinition(layer.font);
    const weight = (layer.bold || layer.fontWeight >= 700) ? (layer.fontWeight||700) : (layer.fontWeight||400);
    const style = layer.italic ? 'italic' : 'normal';
    const variant = layer.smallCaps ? 'small-caps ' : '';
    const size = layer.size * MM_PX;
    ctx.font = `${style} ${variant}${weight} ${size}px ${fontDef.css}`;
    ctx.fillStyle = layer.color;
    ctx.textBaseline = 'middle';
    ctx.textAlign = layer.align || 'left';

    // Letter spacing via manual glyph placement
    const ls = layer.letterSpacing || 0; // px extra per char

    // Apply small caps: shrink size for lowercase
    const textContent = applyCase(String(layer.text), layer.textCase || (layer.allCaps ? 'upper' : 'none'));
    const lines = textContent.split('\n');
    const lh = size * (layer.lineHeight || 1.25);
    const totalH = lh * (lines.length - 1);

    lines.forEach((ln, i) => {
      const y = -totalH/2 + i*lh;
      if(ls !== 0){
        drawTextWithSpacing(ctx, ln, 0, y, ls);
      } else {
        ctx.fillText(ln, 0, y);
      }
      // Shadow
      if(layer.shadow){
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.fillText(ln, 0, y);
        ctx.restore();
      }
      // Outline
      if(layer.outline){
        ctx.strokeStyle = layer.outlineColor || '#000000';
        ctx.lineWidth = 1.5;
        ctx.strokeText(ln, 0, y);
      }
    });

    layer._w = Math.max(...lines.map(ln=>ctx.measureText(ln).width + (ln.length-1)*ls));
    layer._h = lh*lines.length;

  } else if(layer.type === 'rect'){
    const w = layer.w*MM_PX, h = layer.h*MM_PX;
    ctx.fillStyle = layer.fill;
    if(layer.strokeOnly){
      ctx.strokeStyle = layer.fill; ctx.lineWidth = 2; ctx.strokeRect(-w/2,-h/2,w,h);
    } else {
      ctx.fillRect(-w/2,-h/2,w,h);
    }
  } else if(layer.type === 'circle'){
    const r = layer.r*MM_PX;
    ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2);
    if(layer.strokeOnly){ ctx.strokeStyle=layer.fill; ctx.lineWidth=2; ctx.stroke(); }
    else { ctx.fillStyle=layer.fill; ctx.fill(); }
  } else if(layer.type === 'line'){
    const w = layer.w*MM_PX;
    ctx.strokeStyle = layer.fill; ctx.lineWidth = (layer.thickness||1)*MM_PX*0.35;
    ctx.beginPath(); ctx.moveTo(-w/2,0); ctx.lineTo(w/2,0); ctx.stroke();
  } else if(layer.type === 'image'){
    if(!layer._img && layer.src){
      layer._img = new Image();
      layer._img.src = layer.src;
      layer._img.onload = () => { if(window.render) window.render(); };
    }
    if(layer._img && (layer._img.complete || layer._img.naturalWidth > 0)){
      const w = layer.w*MM_PX, h = layer.h*MM_PX;
      const crop = layer.crop || {};
      const left = Math.min(0.9, Math.max(0, Number(crop.left) || 0));
      const right = Math.min(0.9 - left, Math.max(0, Number(crop.right) || 0));
      const top = Math.min(0.9, Math.max(0, Number(crop.top) || 0));
      const bottom = Math.min(0.9 - top, Math.max(0, Number(crop.bottom) || 0));
      const sourceX = layer._img.naturalWidth * left;
      const sourceY = layer._img.naturalHeight * top;
      const sourceW = layer._img.naturalWidth * (1 - left - right);
      const sourceH = layer._img.naturalHeight * (1 - top - bottom);
      ctx.save();
      ctx.globalAlpha = layer.opacity !== undefined ? layer.opacity : 1;
      ctx.scale(layer.flipX ? -1 : 1, layer.flipY ? -1 : 1);
      ctx.drawImage(layer._img, sourceX, sourceY, sourceW, sourceH, -w/2,-h/2,w,h);
      ctx.restore();
    }
  } else if(layer.type === 'wraptext'){
    // Wrapped text block for cassette labels
    const fontDef = fontDefinition(layer.font);
    const weight = (layer.bold || (layer.fontWeight||0) >= 700) ? (layer.fontWeight||700) : (layer.fontWeight||400);
    const style = layer.italic ? 'italic' : 'normal';
    const variant = layer.smallCaps ? 'small-caps ' : '';
    const size = (layer.size||3) * MM_PX;
    ctx.font = `${style} ${variant}${weight} ${size}px ${fontDef.css}`;
    ctx.fillStyle = layer.color || '#1C1A16';
    ctx.textBaseline = 'top';
    ctx.textAlign = layer.align || 'center';
    if(layer.shadow){
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1.5;
      ctx.shadowOffsetY = 1.5;
    }
    const maxW = (layer.maxW || 75) * MM_PX;
    const lh = size * (layer.lineHeight || 1.35);
    let rawStr = String(layer.text || '');
    if(layer.allCaps || layer.textCase === 'upper') rawStr = rawStr.toUpperCase();
    const rawParagraphs = rawStr.split('\n');
    const lines = [];
    for(const p of rawParagraphs){
      const words = p.split(' ');
      let cur = '';
      for(const w of words){
        const test = cur ? cur + ' ' + w : w;
        if(ctx.measureText(test).width > maxW && cur){
          lines.push(cur); cur = w;
        } else { cur = test; }
      }
      if(cur) lines.push(cur);
      else if(rawParagraphs.length > 1) lines.push('');
    }
    if(lines.length === 0) lines.push('');
    const totalH = lh * lines.length;
    lines.forEach((ln, i) => {
      const tx = layer.align === 'center' ? 0 : layer.align === 'right' ? maxW/2 : -maxW/2;
      const ty = -totalH/2 + i*lh;
      if(layer.outline){
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = Math.max(1, size * 0.08);
        ctx.strokeText(ln, tx, ty);
      }
      ctx.fillText(ln, tx, ty);
    });
    layer._w = maxW / MM_PX;
    layer._h = totalH / MM_PX;
  } else if(layer.type === 'barcode'){
    drawBarcode(ctx, layer);
  }
  ctx.restore();
}

function drawTextWithSpacing(ctx, text, x, y, spacing){
  const chars = [...text];
  let cx = x;
  // Adjust start for textAlign
  const total = chars.reduce((sum,c)=>sum+ctx.measureText(c).width+spacing,0)-spacing;
  if(ctx.textAlign==='center') cx -= total/2;
  else if(ctx.textAlign==='right') cx -= total;
  const origAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  chars.forEach(c=>{
    ctx.fillText(c, cx, y);
    cx += ctx.measureText(c).width + spacing;
  });
  ctx.textAlign = origAlign;
}

// ── EAN-13 Barcode Renderer ─────────────────────────────────────────────────
function ean13CheckDigit(d12){
  let sum = 0;
  for(let i=0;i<12;i++) sum += parseInt(d12[i])*(i%2===0?1:3);
  return (10-(sum%10))%10;
}
function encodeEAN13(raw){
  // L, G, R encoding tables for digits 0-9
  const L=['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'];
  const G=['0100111','0110011','0011011','0100001','0011101','0111001','0000101','0010001','0001001','0010111'];
  const R=['1110010','1100110','1101100','1000010','1011100','1001110','1010000','1000100','1001000','1110100'];
  // Parity of first digit determines L/G mix for left group
  const parity=[
    'LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG',
    'LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL'
  ];
  let digits = raw.replace(/\D/g,'');
  if(digits.length<12) digits = digits.padStart(12,'0');
  if(digits.length>=13) digits = digits.slice(0,12);
  const check = ean13CheckDigit(digits);
  const d = (digits + check).split('').map(Number);
  const pat = parity[d[0]];
  let bits = '101'; // left guard
  for(let i=1;i<=6;i++) bits += pat[i-1]==='L'?L[d[i]]:G[d[i]];
  bits += '01010'; // center guard
  for(let i=7;i<=12;i++) bits += R[d[i]];
  bits += '101'; // right guard
  return { bits, digits: d.join('') };
}

function drawBarcode(ctx, layer){
  const W = (layer.w||20)*MM_PX;
  const H = (layer.h||12)*MM_PX;
  const color = layer.color || '#000000';
  const bg = layer.bgColor || null;

  if(bg){
    ctx.fillStyle = bg;
    ctx.fillRect(-W/2,-H/2,W,H);
  }

  const val = String(layer.barcodeValue||'0000000000000');
  let bits, digits;

  if(layer.barcodeType==='custom' || val.replace(/\D/g,'').length!==13){
    // Simple custom barcode: encode each char as narrow/wide bars (Code 39-style)
    const customChars = val.slice(0,20);
    bits = '1010011010'; // start
    for(const c of customChars){
      const code = c.charCodeAt(0);
      bits += ((code>>4)&1?'1':'0') + ((code>>3)&1?'1':'0') + ((code>>2)&1?'1':'0') + ((code>>1)&1?'1':'0') + (code&1?'1':'0') + '0';
    }
    bits += '1010011010'; // stop
    digits = val;
  } else {
    const enc = encodeEAN13(val);
    bits = enc.bits; digits = enc.digits;
  }

  const barH = H * 0.82;
  const numH = H - barH;
  const moduleW = W / bits.length;
  let bx = -W/2;

  ctx.fillStyle = color;
  for(const bit of bits){
    if(bit === '1') ctx.fillRect(Math.round(bx), -H/2, Math.max(1, Math.round(moduleW)), barH);
    bx += moduleW;
  }

  // Render number string below bars
  const fontSize = Math.max(5, numH * 0.7);
  ctx.font = `${fontSize}px 'JetBrains Mono', monospace`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(digits, 0, H/2);
}

// Expose barcode renderer for export.js (uses scale factor instead of MM_PX)
window.drawBarcodeExport = function(octx, layer, scale) {
  const W = (layer.w||20)*scale;
  const H = (layer.h||12)*scale;
  const color = layer.color || '#000000';
  const bg = layer.bgColor || null;

  if(bg){ octx.fillStyle=bg; octx.fillRect(-W/2,-H/2,W,H); }

  const val = String(layer.barcodeValue||'0000000000000');
  let bits, digits;

  if(layer.barcodeType==='custom' || val.replace(/\D/g,'').length!==13){
    const customChars = val.slice(0,20);
    bits = '1010011010';
    for(const c of customChars){
      const code = c.charCodeAt(0);
      bits += ((code>>4)&1?'1':'0') + ((code>>3)&1?'1':'0') + ((code>>2)&1?'1':'0') + ((code>>1)&1?'1':'0') + (code&1?'1':'0') + '0';
    }
    bits += '1010011010';
    digits = val;
  } else {
    const enc = encodeEAN13(val);
    bits = enc.bits; digits = enc.digits;
  }

  const barH = H * 0.82;
  const numH = H - barH;
  const moduleW = W / bits.length;
  let bx = -W/2;

  octx.fillStyle = color;
  for(const bit of bits){
    if(bit==='1') octx.fillRect(Math.round(bx), -H/2, Math.max(1, Math.round(moduleW)), barH);
    bx += moduleW;
  }

  const fontSize = Math.max(5*scale/MM_PX, numH*0.7);
  octx.font = `${fontSize}px 'JetBrains Mono', monospace`;
  octx.fillStyle = color;
  octx.textAlign = 'center';
  octx.textBaseline = 'bottom';
  octx.fillText(digits, 0, H/2);
};


function layerBounds(layer){
  let w,h;
  if(layer.type==='text'){
    w = (layer._w || layer.size*3*MM_PX)/MM_PX + 4;
    h = (layer._h || layer.size*1.25*MM_PX)/MM_PX + 2;
  } else if(layer.type==='wraptext'){
    w = layer.maxW || 40;
    h = layer._h || (layer.size||3)*2;
  } else if(layer.type==='barcode'){
    w = layer.w || 20; h = layer.h || 12;
  } else if(layer.type==='rect' || layer.type==='image'){
    w = layer.w; h = layer.h;
  } else if(layer.type==='circle'){
    w = layer.r*2; h = layer.r*2;
  } else if(layer.type==='line'){
    w = layer.w; h = Math.max(layer.thickness||1,3);
  }
  return {x: layer.x - w/2, y: layer.y - h/2, w, h};
}

function layerVisualCenter(layer){
  let localOffsetX = 0;
  if(layer.type === 'text'){
    const bounds = layerBounds(layer);
    if(layer.align === 'left') localOffsetX = bounds.w / 2;
    else if(layer.align === 'right') localOffsetX = -bounds.w / 2;
  }
  const rotation = (layer.rotation || 0) * Math.PI / 180;
  return {
    x: layer.x + localOffsetX * Math.cos(rotation),
    y: layer.y + localOffsetX * Math.sin(rotation)
  };
}

const HANDLE_SIZE = 6; // px on screen

function drawSelection(layer, ctx){
  const b = layerBounds(layer);
  ctx.save();
  ctx.translate(layer.x*MM_PX, layer.y*MM_PX);
  ctx.rotate((layer.rotation||0)*Math.PI/180);
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);
  const w = b.w*MM_PX, h = b.h*MM_PX;
  
  let left = -w/2, right = w/2;
  if (layer.type === 'text') {
    if (layer.align === 'left') { left = 0; right = w; }
    else if (layer.align === 'right') { left = -w; right = 0; }
  }
  
  ctx.strokeRect(left, -h/2, w, h);

  // Corner handles (filled white, blue border)
  const corners = [[left,-h/2], [right,-h/2], [left,h/2], [right,h/2]];
  corners.forEach(([hx,hy])=>{
    ctx.fillStyle = '#fff';
    ctx.fillRect(hx-HANDLE_SIZE/2, hy-HANDLE_SIZE/2, HANDLE_SIZE, HANDLE_SIZE);
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(hx-HANDLE_SIZE/2, hy-HANDLE_SIZE/2, HANDLE_SIZE, HANDLE_SIZE);
  });

  if(layer.type !== 'image' || layer.freeTransform){
    const edges = [[(left+right)/2,-h/2], [right,0], [(left+right)/2,h/2], [left,0]];
    edges.forEach(([hx,hy])=>{
      ctx.fillStyle = '#fff';
      ctx.fillRect(hx-HANDLE_SIZE/2, hy-HANDLE_SIZE/2, HANDLE_SIZE, HANDLE_SIZE);
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(hx-HANDLE_SIZE/2, hy-HANDLE_SIZE/2, HANDLE_SIZE, HANDLE_SIZE);
    });
  }

  // Rotate handle stalk and circular handle at top
  const rotX = (left+right)/2;
  const rotDist = 16;
  ctx.beginPath();
  ctx.moveTo(rotX, -h/2);
  ctx.lineTo(rotX, -h/2 - rotDist);
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(rotX, -h/2 - rotDist, 4.5, 0, Math.PI*2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
}

// --- Handle hit testing ---
function hitHandle(mx, my, layer){
  const b = layerBounds(layer);
  const rad = -(layer.rotation||0)*Math.PI/180;
  const dx = mx - layer.x, dy = my - layer.y;
  const lx = dx*Math.cos(rad) - dy*Math.sin(rad);
  const ly = dx*Math.sin(rad) + dy*Math.cos(rad);

  const hw = b.w/2, hh = b.h/2;
  const hs = HANDLE_SIZE/MM_PX; // handle size in mm
  
  let left = -hw, right = hw;
  if (layer.type === 'text') {
    if (layer.align === 'left') { left = 0; right = b.w; }
    else if (layer.align === 'right') { left = -b.w; right = 0; }
  }

  // Check rotate handle
  const rotX = (left+right)/2;
  const rotY = -hh - (16 / MM_PX);
  if(Math.hypot(lx - rotX, ly - rotY) <= (6.5 / MM_PX)){
    return 'rotate';
  }

  const corners = [
    {id:'tl', px:left, py:-hh},
    {id:'tr', px:right, py:-hh},
    {id:'bl', px:left, py: hh},
    {id:'br', px:right, py: hh},
  ];
  const edges = [
    {id:'tm', px:(left+right)/2, py:-hh},
    {id:'rm', px:right, py:0  },
    {id:'bm', px:(left+right)/2, py: hh},
    {id:'lm', px:left, py:0  },
  ];

  const handles = layer.type === 'image' && !layer.freeTransform ? corners : [...corners, ...edges];
  for(const h of handles){
    if(Math.abs(lx - h.px) <= hs && Math.abs(ly - h.py) <= hs) return h.id;
  }
  return null;
}

function hitImageCropHandle(mx, my, layer){
  if(!cropDraft || cropDraft.layerId !== layer.id) return null;
  const dx = mx-layer.x, dy = my-layer.y;
  const angle = -(layer.rotation || 0)*Math.PI/180;
  const localX = dx*Math.cos(angle)-dy*Math.sin(angle);
  const localY = dx*Math.sin(angle)+dy*Math.cos(angle);
  const halfW = layer.w/2, halfH = layer.h/2;
  const corners = [
    { id: 'tl', x: -halfW+cropDraft.left*layer.w, y: -halfH+cropDraft.top*layer.h },
    { id: 'tr', x: -halfW+cropDraft.right*layer.w, y: -halfH+cropDraft.top*layer.h },
    { id: 'bl', x: -halfW+cropDraft.left*layer.w, y: -halfH+cropDraft.bottom*layer.h },
    { id: 'br', x: -halfW+cropDraft.right*layer.w, y: -halfH+cropDraft.bottom*layer.h }
  ];
  const hitDistance = 9/MM_PX;
  return corners.find(corner => Math.abs(localX-corner.x) <= hitDistance &&
    Math.abs(localY-corner.y) <= hitDistance)?.id || null;
}

function trackGroupBounds(){
  const layers = selectedTrackLayers();
  if(!layers.length) return null;
  const points = layers.flatMap(layer => {
    const b = layerBounds(layer);
    const left = layer.type === 'text' && layer.align === 'left' ? 0
      : layer.type === 'text' && layer.align === 'right' ? -b.w : -b.w / 2;
    const angle = (layer.rotation || 0) * Math.PI / 180;
    return [[left,-b.h/2],[left+b.w,-b.h/2],[left,b.h/2],[left+b.w,b.h/2]].map(([x,y]) => ({
      x: layer.x + x*Math.cos(angle)-y*Math.sin(angle),
      y: layer.y + x*Math.sin(angle)+y*Math.cos(angle)
    }));
  });
  const x = Math.min(...points.map(p => p.x)) - 1;
  const y = Math.min(...points.map(p => p.y)) - 1;
  return { x, y, w: Math.max(...points.map(p => p.x)) - x + 1, h: Math.max(...points.map(p => p.y)) - y + 1 };
}

// Pointer Events
function hitTest(mx,my){
  const s = currentState();
  for(let i=s.layers.length-1;i>=0;i--){
    const layer = s.layers[i];
    const b = layerBounds(layer);
    const dx = mx - layer.x, dy = my - layer.y;
    const rad = -(layer.rotation||0)*Math.PI/180;
    const lx = dx*Math.cos(rad) - dy*Math.sin(rad);
    const ly = dx*Math.sin(rad) + dy*Math.cos(rad);
    
    let left = -b.w/2, right = b.w/2;
    if (layer.type === 'text') {
      if (layer.align === 'left') { left = 0; right = b.w; }
      else if (layer.align === 'right') { left = -b.w; right = 0; }
    }
    
    if(lx >= left && lx <= right && Math.abs(ly) <= b.h/2) return layer;
  }
  return null;
}

stage.addEventListener('pointerdown', (e)=>{
  if(e.target.closest('button, input, textarea')) return;
  stage.setPointerCapture(e.pointerId);
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / (window.devicePixelRatio || 1) / rect.width;
  const scaleY = canvas.height / (window.devicePixelRatio || 1) / rect.height;
  const x = (e.clientX-rect.left) * scaleX / MM_PX;
  const y = (e.clientY-rect.top) * scaleY / MM_PX;

  const group = trackGroupBounds();
  if(group && x >= group.x && x <= group.x + group.w && y >= group.y && y <= group.y + group.h){
    dragState = { mode: 'trackGroup', startX: x, startY: y,
      members: selectedTrackLayers().map(layer => ({ layer, x: layer.x, y: layer.y })) };
    return;
  }
  selectedTrackGroup = null;
  if(imageCropLayerId && selectedLayer()?.id === imageCropLayerId){
    const layer = selectedLayer();
    const corner = hitImageCropHandle(x, y, layer);
    if(corner){
      dragState = { mode: 'crop', corner, layer };
      e.preventDefault();
    }
    return;
  }

  // Check if we're clicking a handle on the selected layer
  if(selectedLayerId){
    const layer = selectedLayer();
    if(layer){
      const handle = hitHandle(x, y, layer);
      if(handle === 'rotate'){
            dragState = {
          mode: 'rotate',
          handle: 'rotate',
          layer,
          startX: x,
          startY: y,
          origRotation: layer.rotation || 0
        };
        return;
      }
      if(handle){
            dragState = {
          mode: 'resize',
          handle,
          startX: x, startY: y,
          origX: layer.x, origY: layer.y,
          origSize: layer.size || 5,
          origW: layer.w, origH: layer.h,
          origCropBaseSize: layer.cropBaseSize ? { ...layer.cropBaseSize } : null,
          origR: layer.r,
          layer
        };
        return;
      }
    }
  }

  const hit = hitTest(x,y);
  if(hit){
    selectedLayerId = hit.id;
    dragState = { mode:'move', startX:x, startY:y, origX:hit.x, origY:hit.y };
    centerAlignmentGuides = { vertical: [], horizontal: [] };
    // Sync font panel to this layer
    if(window.syncFontPanelToLayer) window.syncFontPanelToLayer(hit);
    if(window.syncImageControls) window.syncImageControls();
  } else {
    selectedLayerId = null;
    centerAlignmentGuides = { vertical: [], horizontal: [] };
    if(window.clearFontPanel) window.clearFontPanel();
    if(window.syncImageControls) window.syncImageControls();
    closeInlineEdit();
  }
  render();
  updateLayerToolbar();
});

stage.addEventListener('dblclick', (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / (window.devicePixelRatio || 1) / rect.width;
  const scaleY = canvas.height / (window.devicePixelRatio || 1) / rect.height;
  const x = (e.clientX - rect.left) * scaleX / MM_PX;
  const y = (e.clientY - rect.top) * scaleY / MM_PX;
  const hit = hitTest(x, y);
  if(hit && (hit.type === 'text' || hit.type === 'wraptext' || hit.type === 'barcode')){
    selectedLayerId = hit.id;
    if(window.syncFontPanelToLayer) window.syncFontPanelToLayer(hit);
    if(window.syncImageControls) window.syncImageControls();
    render();
    updateLayerToolbar();
    openInlineEdit(hit, e);
  }
});

stage.addEventListener('pointermove', (e)=>{
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / (window.devicePixelRatio || 1) / rect.width;
  const scaleY = canvas.height / (window.devicePixelRatio || 1) / rect.height;
  const x = (e.clientX-rect.left) * scaleX / MM_PX;
  const y = (e.clientY-rect.top) * scaleY / MM_PX;
  const layer = selectedLayer();
  if(!layer) return;

  if(dragState && !dragState.historySaved){
    if(dragState.startX !== undefined && Math.hypot(x-dragState.startX, y-dragState.startY) < 0.05) return;
    pushHistory();
    dragState.historySaved = true;
  }
  if(dragState?.mode === 'trackGroup'){
    if(!document.getElementById('freePlacementToggle').checked) return;
    let dx = x - dragState.startX, dy = y - dragState.startY;
    if(snapToGrid){ dx = Math.round(dx/gridSpacingMm)*gridSpacingMm; dy = Math.round(dy/gridSpacingMm)*gridSpacingMm; }
    dragState.members.forEach(member => { member.layer.x = member.x + dx; member.layer.y = member.y + dy; });
    render();
    return;
  }
  if(!dragState && trackGroupBounds()){
    const group = trackGroupBounds();
    stage.style.cursor = x >= group.x && x <= group.x + group.w && y >= group.y && y <= group.y + group.h ? 'move' : 'default';
    return;
  }
  if(dragState?.mode === 'crop' && cropDraft?.layerId === layer.id){
    const dx = x-layer.x, dy = y-layer.y;
    const angle = -(layer.rotation || 0)*Math.PI/180;
    const localX = dx*Math.cos(angle)-dy*Math.sin(angle);
    const localY = dx*Math.sin(angle)+dy*Math.cos(angle);
    const px = Math.max(0, Math.min(1, localX/layer.w+0.5));
    const py = Math.max(0, Math.min(1, localY/layer.h+0.5));
    const minSpan = Math.min(0.2, 8/Math.max(1, Math.min(layer.w, layer.h)));
    const corner = dragState.corner;
    if(corner.includes('l')) cropDraft.left = Math.min(px, cropDraft.right-minSpan);
    if(corner.includes('r')) cropDraft.right = Math.max(px, cropDraft.left+minSpan);
    if(corner.includes('t')) cropDraft.top = Math.min(py, cropDraft.bottom-minSpan);
    if(corner.includes('b')) cropDraft.bottom = Math.max(py, cropDraft.top+minSpan);
    cropDraft.left = Math.max(0, cropDraft.left);
    cropDraft.top = Math.max(0, cropDraft.top);
    cropDraft.right = Math.min(1, cropDraft.right);
    cropDraft.bottom = Math.min(1, cropDraft.bottom);
    render();
    return;
  }

  if(dragState?.mode === 'rotate'){
    const dx = x - layer.x;
    const dy = y - layer.y;
    let ang = Math.atan2(dy, dx) * 180 / Math.PI + 90;
    while(ang > 180) ang -= 360;
    while(ang <= -180) ang += 360;
    // Snapping near cardinal angles
    if(Math.abs(ang) < 3) ang = 0;
    else if(Math.abs(ang - 90) < 3) ang = 90;
    else if(Math.abs(ang + 90) < 3) ang = -90;
    else if(Math.abs(ang - 180) < 3 || Math.abs(ang + 180) < 3) ang = 180;
    else if(Math.abs(ang - 45) < 3) ang = 45;
    else if(Math.abs(ang + 45) < 3) ang = -45;

    layer.rotation = Math.round(ang);

    if(layer.role === 'coverArt'){
      const rSlider = document.getElementById('artRotate');
      if(rSlider) rSlider.value = layer.rotation;
      const rVal = document.getElementById('artRotateVal');
      if(rVal) rVal.textContent = layer.rotation + '°';
    }
    render();
    return;
  }

  if(dragState?.mode === 'move' && document.getElementById('freePlacementToggle').checked){
    const nextX = dragState.origX + (x-dragState.startX);
    const nextY = dragState.origY + (y-dragState.startY);
    layer.x = snapToGrid ? Math.round(nextX / gridSpacingMm) * gridSpacingMm : nextX;
    layer.y = snapToGrid ? Math.round(nextY / gridSpacingMm) * gridSpacingMm : nextY;
    const piece = currentPiece();
    centerAlignmentGuides = { vertical: [], horizontal: [] };
    if(showCenterAlignment){
      const visualCenter = layerVisualCenter(layer);
      const peerCenters = currentState().layers
        .filter(other => other.id !== layer.id && (other.opacity === undefined || other.opacity > 0))
        .map(layerVisualCenter);
      const verticalTargets = [piece.w / 2, ...peerCenters.map(center => center.x)];
      const horizontalTargets = [piece.h / 2, ...peerCenters.map(center => center.y)];
      const closestTarget = (current, targets) => targets
        .map(target => ({ target, distance: Math.abs(current - target) }))
        .filter(candidate => candidate.distance <= CENTER_SNAP_TOLERANCE_MM)
        .sort((a, b) => a.distance - b.distance)[0]?.target;
      const verticalTarget = closestTarget(visualCenter.x, verticalTargets);
      const horizontalTarget = closestTarget(visualCenter.y, horizontalTargets);
      if(verticalTarget !== undefined){
        layer.x += verticalTarget - visualCenter.x;
        centerAlignmentGuides.vertical = [verticalTarget * MM_PX];
      }
      if(horizontalTarget !== undefined){
        layer.y += horizontalTarget - visualCenter.y;
        centerAlignmentGuides.horizontal = [horizontalTarget * MM_PX];
      }
    }
    render();
  }

  if(dragState?.mode === 'resize'){
    const dx = x - dragState.startX;
    const dy = y - dragState.startY;

    if(layer.type === 'text' || layer.type === 'wraptext'){
      const h = dragState.handle;
      if (layer.type === 'wraptext' && (h === 'rm' || h === 'lm')) {
        const dxSign = h === 'rm' ? 1 : -1;
        layer.maxW = Math.max(10, (layer.maxW || 40) + dxSign * dx);
      } else {
        const dist = Math.sqrt(dx*dx + dy*dy);
        const sign = ((h==='br'||h==='rm'||h==='bm') ? 1 : (h==='tl'||h==='lm'||h==='tm') ? -1 : 1);
        const newSize = Math.max(1, dragState.origSize + sign * dist * 0.3);
        layer.size = Math.round(newSize * 10) / 10;
      }
    } else if(layer.type === 'image'){
      const h = dragState.handle;
      const aspect = (dragState.origW / dragState.origH) || 1;
      const angle = -(layer.rotation || 0)*Math.PI/180;
      const pointerX = (x-dragState.origX)*Math.cos(angle)-(y-dragState.origY)*Math.sin(angle);
      const pointerY = (x-dragState.origX)*Math.sin(angle)+(y-dragState.origY)*Math.cos(angle);
      const movesLeft = h.includes('l');
      const movesRight = h.includes('r');
      const movesTop = h.includes('t');
      const movesBottom = h.includes('b');
      const hasHorizontalHandle = movesLeft || movesRight;
      const hasVerticalHandle = movesTop || movesBottom;
      const anchorX = movesLeft ? dragState.origW/2 : -dragState.origW/2;
      const anchorY = movesTop ? dragState.origH/2 : -dragState.origH/2;
      const rawW = hasHorizontalHandle ? Math.max(3, Math.abs(pointerX-anchorX)) : dragState.origW;
      const rawH = hasVerticalHandle ? Math.max(3, Math.abs(pointerY-anchorY)) : dragState.origH;
      let newW = rawW, newH = rawH;
      if(!layer.freeTransform && hasHorizontalHandle && hasVerticalHandle){
        if(Math.abs(rawW-dragState.origW)/dragState.origW >= Math.abs(rawH-dragState.origH)/dragState.origH){
          newH = newW/aspect;
        } else {
          newW = newH*aspect;
        }
      }
      layer.w = Math.round(newW*10)/10;
      layer.h = Math.round(newH*10)/10;
      let centerLocalX = 0, centerLocalY = 0;
      if(hasHorizontalHandle) centerLocalX = (anchorX + (movesLeft ? anchorX-newW : anchorX+newW))/2;
      if(hasVerticalHandle) centerLocalY = (anchorY + (movesTop ? anchorY-newH : anchorY+newH))/2;
      const rotation = (layer.rotation || 0)*Math.PI/180;
      layer.x = dragState.origX + centerLocalX*Math.cos(rotation)-centerLocalY*Math.sin(rotation);
      layer.y = dragState.origY + centerLocalX*Math.sin(rotation)+centerLocalY*Math.cos(rotation);
      if(layer.cropBaseSize && dragState.origCropBaseSize){
        layer.cropBaseSize.w = dragState.origCropBaseSize.w * layer.w / dragState.origW;
        layer.cropBaseSize.h = dragState.origCropBaseSize.h * layer.h / dragState.origH;
      }
    } else if(layer.type === 'rect' || layer.type === 'barcode'){
      const h = dragState.handle;
      if(h==='br'){ layer.w = Math.max(2, dragState.origW + dx); layer.h = Math.max(2, dragState.origH + dy); }
      else if(h==='tr'){ layer.w = Math.max(2, dragState.origW + dx); layer.h = Math.max(2, dragState.origH - dy); }
      else if(h==='bl'){ layer.w = Math.max(2, dragState.origW - dx); layer.h = Math.max(2, dragState.origH + dy); }
      else if(h==='tl'){ layer.w = Math.max(2, dragState.origW - dx); layer.h = Math.max(2, dragState.origH - dy); }
      else if(h==='rm'){ layer.w = Math.max(2, dragState.origW + dx); }
      else if(h==='lm'){ layer.w = Math.max(2, dragState.origW - dx); }
      else if(h==='bm'){ layer.h = Math.max(2, dragState.origH + dy); }
      else if(h==='tm'){ layer.h = Math.max(2, dragState.origH - dy); }
    } else if(layer.type === 'circle'){
      const dist = Math.sqrt(dx*dx + dy*dy);
      layer.r = Math.max(1, dragState.origR + dist * 0.5);
    } else if(layer.type === 'line'){
      layer.w = Math.max(1, dragState.origW + dx);
    }

    // Sync font panel if it's a text layer
    if(layer.type==='text' && window.syncFontPanelToLayer) window.syncFontPanelToLayer(layer);
    render();
  }

  // Update cursor based on handle hover
  if(!dragState){
    if(selectedLayerId){
      const layer = selectedLayer();
      if(layer){
        const handle = hitHandle(x, y, layer);
        if(handle){
          if(handle === 'rotate'){
            stage.style.cursor = 'grab';
            return;
          }
          const cursors = {tl:'nw-resize',tr:'ne-resize',bl:'sw-resize',br:'se-resize',tm:'n-resize',bm:'s-resize',lm:'w-resize',rm:'e-resize'};
          stage.style.cursor = cursors[handle] || 'default';
          return;
        }
      }
    }
    const hit = hitTest(x,y);
    stage.style.cursor = hit ? 'move' : 'default';
  }
});

stage.addEventListener('dblclick', (e)=>{
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / (window.devicePixelRatio || 1) / rect.width;
  const scaleY = canvas.height / (window.devicePixelRatio || 1) / rect.height;
  const x = (e.clientX-rect.left) * scaleX / MM_PX;
  const y = (e.clientY-rect.top) * scaleY / MM_PX;

  // Double-click on text layer => open inline edit
  const hit = hitTest(x, y);
  if(hit && hit.type === 'text'){
    selectedLayerId = hit.id;
    render();
    openInlineEdit(hit, e);
    return;
  }

  // Double-click on anything => reset rotation
  if(selectedLayerId){
    const layer = selectedLayer();
    if(layer){
      const handle = hitHandle(x, y, layer);
      if(handle === 'rotate' || layer.rotation !== 0){
        layer.rotation = 0;
        if(layer.role === 'coverArt'){
          const rSlider = document.getElementById('artRotate');
          if(rSlider) rSlider.value = 0;
          const rVal = document.getElementById('artRotateVal');
          if(rVal) rVal.textContent = '0°';
        }
        if(window.syncImageControls) window.syncImageControls();
        render();
        return;
      }
    }
  }
  if(hit && hit.rotation !== 0){
    hit.rotation = 0;
    if(hit.role === 'coverArt'){
      const rSlider = document.getElementById('artRotate');
      if(rSlider) rSlider.value = 0;
      const rVal = document.getElementById('artRotateVal');
      if(rVal) rVal.textContent = '0°';
    }
    if(window.syncImageControls) window.syncImageControls();
    render();
  }
});

function endDrag(){
  dragState = null;
  const hadCenterGuide = centerAlignmentGuides.vertical.length > 0 || centerAlignmentGuides.horizontal.length > 0;
  centerAlignmentGuides = { vertical: [], horizontal: [] };
  stage.style.cursor = 'default';
  if(hadCenterGuide) render();
  if(window.syncImageControls) window.syncImageControls();
  updateLayerToolbar();
}
stage.addEventListener('pointerup', endDrag);
stage.addEventListener('pointercancel', endDrag);

// ── Delete selected layer with Delete/Backspace key ──────────────────────────
document.addEventListener('keydown', (e) => {
  // Don't intercept when typing in an input/textarea
  const tag = document.activeElement.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  if ((e.key === 'Delete' || e.key === 'Backspace') && selectedLayerId) {
    e.preventDefault();
    deleteSelectedLayer();
  }
  // Escape to deselect
  if (e.key === 'Escape') {
    if(imageCropLayerId) cancelImageCrop();
    selectedLayerId = null;
    closeInlineEdit();
    if (window.clearFontPanel) window.clearFontPanel();
    if(window.syncImageControls) window.syncImageControls();
    render();
    updateLayerToolbar();
  }
});

function deleteSelectedLayer(){
  if(!selectedLayerId) return;
  pushHistory();
  const pieceState = currentState();
  const removed = selectedTrackLayers().length ? selectedTrackLayers() : [selectedLayer()].filter(Boolean);
  pieceState.deletedLayers ||= [];
  pieceState.deletedDynamicKeys ||= [];
  removed.forEach(layer => {
    const { _img, ...savedLayer } = layer;
    pieceState.deletedLayers.push({ layer: structuredClone(savedLayer), index: pieceState.layers.indexOf(layer) });
    const key = layer.dynamicKey || layer.role;
    if(key && !pieceState.deletedDynamicKeys.includes(key)) pieceState.deletedDynamicKeys.push(key);
  });
  const ids = new Set(removed.map(layer => layer.id));
  pieceState.layers = pieceState.layers.filter(layer => !ids.has(layer.id));
  selectedTrackGroup = null;
  selectedLayerId = null;
  closeInlineEdit();
  if(window.clearFontPanel) window.clearFontPanel();
  if(window.syncImageControls) window.syncImageControls();
  render();
  updateLayerToolbar();
}

// ── Floating Layer Toolbar ───────────────────────────────────────────────────
let _layerToolbar = null;
function getLayerToolbar(){
  if(!_layerToolbar){
    _layerToolbar = document.createElement('div');
    _layerToolbar.id = 'layerToolbar';
    _layerToolbar.style.cssText = [
      'position:absolute',
      'display:none',
      'align-items:center',
      'gap:4px',
      'background:#fff',
      'border:1px solid #e5e7eb',
      'border-radius:8px',
      'padding:4px 6px',
      'box-shadow:0 4px 12px rgba(0,0,0,0.15)',
      'z-index:50',
      'pointer-events:auto',
      'font-size:12px',
      'font-family:Inter,sans-serif',
      'white-space:nowrap'
    ].join(';');

    // Edit button (only for text)
    const editBtn = document.createElement('button');
    editBtn.id = 'layerToolbarEdit';
    editBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit`;
    editBtn.style.cssText = 'background:transparent;border:none;cursor:pointer;display:flex;align-items:center;gap:4px;color:#374151;padding:3px 7px;border-radius:5px;font-size:12px;';
    editBtn.onmouseenter = () => editBtn.style.background = '#f3f4f6';
    editBtn.onmouseleave = () => editBtn.style.background = 'transparent';
    editBtn.onclick = (ev) => {
      ev.stopPropagation();
      const layer = selectedLayer();
      if(layer && (layer.type === 'text' || layer.type === 'wraptext' || layer.type === 'barcode')) openInlineEdit(layer, null);
    };

    const sep = document.createElement('div');
    sep.style.cssText = 'width:1px;height:16px;background:#e5e7eb;margin:0 2px;';

    // Delete button
    const delBtn = document.createElement('button');
    delBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg> Delete`;
    delBtn.style.cssText = 'background:transparent;border:none;cursor:pointer;display:flex;align-items:center;gap:4px;color:#ef4444;padding:3px 7px;border-radius:5px;font-size:12px;';
    delBtn.onmouseenter = () => delBtn.style.background = '#fef2f2';
    delBtn.onmouseleave = () => delBtn.style.background = 'transparent';
    delBtn.onclick = (ev) => { ev.stopPropagation(); deleteSelectedLayer(); };

    _layerToolbar.appendChild(editBtn);
    _layerToolbar.appendChild(sep);
    _layerToolbar.appendChild(delBtn);
    canvasWrap.style.position = 'relative';
    canvasWrap.appendChild(_layerToolbar);
  }
  return _layerToolbar;
}

function updateLayerToolbar(){
  const tb = getLayerToolbar();
  if(!selectedLayerId || selectedTrackLayers().length){
    tb.style.display = 'none';
    return;
  }
  const layer = selectedLayer();
  if(!layer){ tb.style.display = 'none'; return; }

  // Position toolbar above the selection bounding box
  const rect = canvas.getBoundingClientRect();
  const wrapRect = canvasWrap.getBoundingClientRect();
  const b = layerBounds(layer);
  const scaleX = rect.width / (canvas.width / (window.devicePixelRatio || 1));
  const scaleY = rect.height / (canvas.height / (window.devicePixelRatio || 1));

  const topPx = (layer.y - b.h/2) * MM_PX * scaleY;
  const centerPx = layer.x * MM_PX * scaleX;
  const offsetTop = rect.top - wrapRect.top;
  const offsetLeft = rect.left - wrapRect.left;

  // Show edit button for text, wraptext, and barcode layers
  const editBtn = document.getElementById('layerToolbarEdit');
  const isEditable = layer.type === 'text' || layer.type === 'wraptext' || layer.type === 'barcode';
  if(editBtn) editBtn.style.display = isEditable ? 'flex' : 'none';
  const sep = tb.querySelector('div');
  if(sep) sep.style.display = isEditable ? 'block' : 'none';

  tb.style.display = 'flex';
  // Position after display so we can read width
  const tbW = tb.offsetWidth;
  const tbH = tb.offsetHeight;
  let left = offsetLeft + centerPx - tbW / 2;
  let top = offsetTop + topPx - tbH - 10;
  // Clamp within wrap
  left = Math.max(0, Math.min(left, wrapRect.width - tbW));
  top = Math.max(0, top);
  tb.style.left = left + 'px';
  tb.style.top = top + 'px';
}

// ── Inline Edit Popovers ──────────────────────────────────────────────────────
let _inlineEditEl = null;
let _inlineEditLayerId = null;

function openInlineEdit(layer, pointerEvent){
  selectedTrackGroup = null;
  closeInlineEdit();
  _inlineEditLayerId = layer.id;

  if(layer.type === 'barcode'){
    openBarcodeEdit(layer); return;
  }

  const wrap = document.createElement('div');
  wrap.id = 'inlineTextEdit';
  wrap.style.cssText = [
    'position:absolute','background:#1e293b','border:1.5px solid #3b82f6',
    'border-radius:10px','padding:10px 12px','box-shadow:0 8px 24px rgba(0,0,0,0.25)',
    'z-index:100','min-width:220px','display:flex','flex-direction:column','gap:8px',
    'font-family:Inter,sans-serif'
  ].join(';');

  const hdr = document.createElement('div');
  hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;color:#e2e8f0;font-size:12px;font-weight:600;letter-spacing:0.4px;';
  hdr.innerHTML = `<span>✏ Edit Text</span>`;
  const closeBtnT = document.createElement('button');
  closeBtnT.innerHTML = '✕';
  closeBtnT.style.cssText = 'background:none;border:none;color:#94a3b8;cursor:pointer;font-size:14px;padding:0;line-height:1;';
  closeBtnT.onclick = () => closeInlineEdit();
  hdr.appendChild(closeBtnT);
  wrap.appendChild(hdr);

  const ta = document.createElement('textarea');
  ta.value = layer.text || '';
  ta.rows = Math.max(2, (layer.text || '').split('\n').length);
  ta.style.cssText = 'width:100%;background:#0f172a;color:#f1f5f9;border:1px solid #334155;border-radius:6px;padding:7px 10px;font-size:14px;font-family:Inter,sans-serif;resize:vertical;outline:none;min-height:48px;line-height:1.5;box-sizing:border-box;';
  ta.oninput = () => {
    const l = currentState().layers.find(x => x.id === _inlineEditLayerId);
    if(l){
      l.text = ta.value;
      if(/[\u0D00-\u0D7F]/.test(ta.value)){
        l.font = 'malayalam';
        if(window.syncFontPanelToLayer) window.syncFontPanelToLayer(l);
      }
      l.isCustom = true;
      render();
      if(window.syncLabelControlsFromCanvas) window.syncLabelControlsFromCanvas();
    }
  };
  ta.addEventListener('pointerdown', e => e.stopPropagation());
  wrap.appendChild(ta);

  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:6px;justify-content:flex-end;';
  const delBtnT = document.createElement('button');
  delBtnT.textContent = 'Delete Layer';
  delBtnT.style.cssText = 'background:#dc2626;color:#fff;border:none;border-radius:5px;padding:5px 10px;font-size:12px;cursor:pointer;font-family:Inter,sans-serif;';
  delBtnT.onclick = () => { closeInlineEdit(); deleteSelectedLayer(); };
  const doneBtnT = document.createElement('button');
  doneBtnT.textContent = 'Done';
  doneBtnT.style.cssText = 'background:#3b82f6;color:#fff;border:none;border-radius:5px;padding:5px 14px;font-size:12px;cursor:pointer;font-family:Inter,sans-serif;font-weight:600;';
  doneBtnT.onclick = () => closeInlineEdit();
  row.appendChild(delBtnT); row.appendChild(doneBtnT);
  wrap.appendChild(row);

  canvasWrap.style.position = 'relative';
  canvasWrap.appendChild(wrap);
  _inlineEditEl = wrap;
  _positionPopover(wrap, layer);
  ta.focus(); ta.select();
}

function openBarcodeEdit(layer){
  const wrap = document.createElement('div');
  wrap.id = 'inlineTextEdit';
  wrap.style.cssText = [
    'position:absolute','background:#1e293b','border:1.5px solid #f59e0b',
    'border-radius:10px','padding:12px 14px','box-shadow:0 8px 24px rgba(0,0,0,0.3)',
    'z-index:100','min-width:260px','display:flex','flex-direction:column','gap:10px',
    'font-family:Inter,sans-serif'
  ].join(';');

  const labelStyle = 'color:#94a3b8;font-size:11px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;display:block;margin-bottom:2px;';
  const inputStyle = 'width:100%;background:#0f172a;color:#f1f5f9;border:1px solid #334155;border-radius:6px;padding:6px 10px;font-size:13px;font-family:JetBrains Mono,monospace;outline:none;box-sizing:border-box;';

  const hdr = document.createElement('div');
  hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;';
  hdr.innerHTML = `<span style="color:#f59e0b;font-size:13px;font-weight:700;">&#9638; Barcode Editor</span>`;
  const closeBtnB = document.createElement('button');
  closeBtnB.innerHTML = '&#x2715;';
  closeBtnB.style.cssText = 'background:none;border:none;color:#94a3b8;cursor:pointer;font-size:14px;padding:0;';
  closeBtnB.onclick = () => closeInlineEdit();
  hdr.appendChild(closeBtnB);
  wrap.appendChild(hdr);

  // Type toggle
  const typeRow = document.createElement('div');
  typeRow.style.cssText = 'display:flex;gap:6px;';
  ['ean13','custom'].forEach(t => {
    const btn = document.createElement('button');
    btn.textContent = t === 'ean13' ? 'EAN-13' : 'Custom';
    const isActive = (layer.barcodeType||'ean13') === t;
    btn.style.cssText = `flex:1;padding:5px;border-radius:5px;border:1px solid ${isActive?'#f59e0b':'#334155'};background:${isActive?'rgba(245,158,11,0.15)':'transparent'};color:${isActive?'#f59e0b':'#94a3b8'};font-size:12px;cursor:pointer;`;
    btn.addEventListener('pointerdown', e => e.stopPropagation());
    btn.onclick = () => {
      const l = currentState().layers.find(x => x.id === _inlineEditLayerId);
      if(l){ l.barcodeType = t; render(); }
      const fresh = currentState().layers.find(x => x.id === _inlineEditLayerId);
      if(fresh){ closeInlineEdit(); openInlineEdit(fresh, null); }
    };
    typeRow.appendChild(btn);
  });
  wrap.appendChild(typeRow);

  const valLabel = document.createElement('span');
  valLabel.style.cssText = labelStyle;
  valLabel.textContent = layer.barcodeType === 'custom' ? 'Barcode Value (text)' : 'Barcode Number (13 digits)';
  wrap.appendChild(valLabel);

  const valInput = document.createElement('input');
  valInput.type = 'text';
  valInput.value = layer.barcodeValue || '0000000000000';
  valInput.maxLength = layer.barcodeType === 'custom' ? 20 : 13;
  valInput.style.cssText = inputStyle;
  valInput.oninput = () => {
    const l = currentState().layers.find(x => x.id === _inlineEditLayerId);
    if(l){ l.barcodeValue = valInput.value; render(); }
  };
  valInput.addEventListener('pointerdown', e => e.stopPropagation());
  wrap.appendChild(valInput);

  // Color pickers
  const colorRow = document.createElement('div');
  colorRow.style.cssText = 'display:flex;gap:10px;align-items:center;flex-wrap:wrap;';
  [[' Bars','color',layer.color||'#000000'],['BG','bgColor',layer.bgColor||'#ffffff']].forEach(([lbl,prop,val]) => {
    const lblEl = document.createElement('span');
    lblEl.style.cssText = 'color:#94a3b8;font-size:11px;';
    lblEl.textContent = lbl;
    const sw = document.createElement('input');
    sw.type = 'color'; sw.value = val;
    sw.style.cssText = 'width:28px;height:22px;border:none;background:none;cursor:pointer;padding:0;border-radius:3px;';
    sw.oninput = () => {
      const l = currentState().layers.find(x => x.id === _inlineEditLayerId);
      if(l){ l[prop] = sw.value; render(); }
    };
    sw.addEventListener('pointerdown', e => e.stopPropagation());
    colorRow.appendChild(lblEl); colorRow.appendChild(sw);
  });
  wrap.appendChild(colorRow);

  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:6px;justify-content:flex-end;margin-top:2px;';
  const delBtnB = document.createElement('button');
  delBtnB.textContent = 'Delete';
  delBtnB.style.cssText = 'background:#dc2626;color:#fff;border:none;border-radius:5px;padding:5px 10px;font-size:12px;cursor:pointer;';
  delBtnB.onclick = () => { closeInlineEdit(); deleteSelectedLayer(); };
  const doneBtnB = document.createElement('button');
  doneBtnB.textContent = 'Done';
  doneBtnB.style.cssText = 'background:#f59e0b;color:#000;border:none;border-radius:5px;padding:5px 14px;font-size:12px;cursor:pointer;font-weight:700;';
  doneBtnB.onclick = () => closeInlineEdit();
  row.appendChild(delBtnB); row.appendChild(doneBtnB);
  wrap.appendChild(row);

  canvasWrap.style.position = 'relative';
  canvasWrap.appendChild(wrap);
  _inlineEditEl = wrap;
  _positionPopover(wrap, layer);
  valInput.focus(); valInput.select();
}

function _positionPopover(wrap, layer){
  const rect = canvas.getBoundingClientRect();
  const wrapRect = canvasWrap.getBoundingClientRect();
  const b = layerBounds(layer);
  const scaleX = rect.width / (canvas.width / (window.devicePixelRatio || 1));
  const scaleY = rect.height / (canvas.height / (window.devicePixelRatio || 1));
  const offsetTop = rect.top - wrapRect.top;
  const offsetLeft = rect.left - wrapRect.left;
  const centerPx = layer.x * MM_PX * scaleX;
  const topPx = (layer.y - b.h/2) * MM_PX * scaleY;
  let left = offsetLeft + centerPx - wrap.offsetWidth/2;
  let top = offsetTop + topPx - wrap.offsetHeight - 10;
  left = Math.max(0, Math.min(left, wrapRect.width - wrap.offsetWidth));
  top = Math.max(0, top);
  wrap.style.left = left + 'px';
  wrap.style.top = top + 'px';
}

function closeInlineEdit(){
  if(_inlineEditEl){ _inlineEditEl.remove(); _inlineEditEl = null; }
  _inlineEditLayerId = null;
}

window.render = render;
window.deleteSelectedLayer = deleteSelectedLayer;
