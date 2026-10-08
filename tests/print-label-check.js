window.runPrintLabelChecks = async check => {
  const makeImage = async color => {
    const c = document.createElement('canvas'); c.width=20; c.height=20;
    c.getContext('2d').fillStyle=color; c.getContext('2d').fillRect(0,0,20,20);
    const img = new Image();
    await new Promise(resolve => { img.onload=resolve; img.src=c.toDataURL(); });
    return img;
  };
  const image = await makeImage('red');
  const otherImage = await makeImage('blue');
  const source = {id:'label-image',type:'image',src:image.src,_img:image,x:44.5,y:22.5,w:180,h:120,rotation:17,flipX:true,flipY:false,crop:{left:.1,right:.2,top:.1,bottom:.1},opacity:.8};
  state['label-a'].layers = [source]; state['label-b'].layers = [];
  state['label-a'].labelShape = {bevelEnabled:true,bevelTop:true,bevelBottom:true,bevelSize:6};
  switchPiece('label-a'); showGuides=false; showCutLines=false; showGrid=false; render();
  const alpha = (surface,x,y,scale) => surface.getContext('2d').getImageData(Math.floor(x*scale),Math.floor(y*scale),1,1).data[3];
  const dpi = 203.2; const scale = 8;
  const printed = renderPieceToCanvas('label-a',dpi);
  for(const surface of [canvas,printed]){
    check(alpha(surface,1,1,scale)===0 && alpha(surface,1,44,scale)===0, 'label artwork clipped to top and bottom bevels');
    check(alpha(surface,22.5,25.5,scale)===0 && alpha(surface,66.5,25.5,scale)===0, 'both circular cutouts remain transparent');
    check(alpha(surface,44.5,8,scale)>0, 'label interior artwork remains visible');
  }
  state['label-a'].labelShape.bevelEnabled=false;
  check(alpha(renderPieceToCanvas('label-a',dpi),1,1,scale)>0, 'mask follows bevel setting changes');
  state['label-a'].labelShape.bevelEnabled=true;
  selectedLayerId=source.id; syncImageControls();
  document.getElementById('btnCopyImagePlacement').click();
  let target=state['label-b'].layers[0];
  check(target && target.id!==source.id && target.src===source.src && target.x===source.x && target.rotation===source.rotation && target.crop.left===.1,
    'A-to-B copy creates matching image and transform');
  document.getElementById('btnCopyImagePlacement').click();
  check(state['label-b'].layers.length===1, 'repeated placement copy updates instead of duplicating');
  target.src=otherImage.src; target._img=otherImage; target.x=30; target.y=18; target.w=90; target.h=70; target.rotation=-30; target.flipX=false;
  switchPiece('label-b'); selectedLayerId=target.id; syncImageControls();
  projectHistory.reset();
  document.getElementById('btnCopyImagePlacement').click();
  check(source.src===image.src && source.x===30 && source.w===90 && source.rotation===-30 && !source.flipX,
    'B-to-A copy preserves destination artwork and transfers placement');
  await undo();
  check(state['label-a'].layers[0].x===44.5 && state['label-a'].layers[0].src===image.src, 'cross-side placement copy is undoable');
  const layout=JSON.stringify(printLayout);
  openPrintPreview();
  setPrintCutMarks(false);
  const plain=document.getElementById('printPageLabelA').toDataURL();
  setPrintCutMarks(true);
  const marked=document.getElementById('printPageLabelA').toDataURL();
  check(plain!==marked && JSON.stringify(printLayout)===layout, 'cut-mark toggle updates preview without moving print items');
  check(getProjectSnapshot().print.showCutMarks===true, 'print cut-mark preference included in project file');
  setManualPrintPlacement(true);
  const picker=document.getElementById('printSelectedItem');
  picker.value='labelA'; picker.dispatchEvent(new Event('change',{bubbles:true}));
  const widthField=document.getElementById('printItemWidth');
  widthField.value='100'; widthField.dispatchEvent(new Event('change',{bubbles:true}));
  check(printLayout.labelA.w===100 && Math.abs(printLayout.labelA.h-4500/89)<.001,
    'print size fields preserve proportions');
  check(document.getElementById('printDimensionWidth').textContent==='100.0 mm', 'CAD width annotation updates to physical size');
  document.getElementById('printLockRatio').checked=false;
  const heightField=document.getElementById('printItemHeight');
  heightField.value='60'; heightField.dispatchEvent(new Event('change',{bubbles:true}));
  check(printLayout.labelA.h===60 && printLayout.labelA.w===100, 'unlocked print height changes independently');
  const handle=document.getElementById('printResizeHandle');
  handle.setPointerCapture=()=>{};
  const ppm=document.getElementById('printPage').getBoundingClientRect().width/297;
  handle.dispatchEvent(new PointerEvent('pointerdown',{button:0,clientX:100,clientY:100,pointerId:1}));
  handle.dispatchEvent(new PointerEvent('pointermove',{clientX:100+10*ppm,clientY:100+5*ppm,pointerId:1}));
  handle.dispatchEvent(new PointerEvent('pointerup',{pointerId:1}));
  check(Math.abs(printLayout.labelA.w-110)<.01 && Math.abs(printLayout.labelA.h-65)<.01 &&
    document.getElementById('printDimensionHeight').textContent==='65.0 mm', 'drag resize updates real dimensions live');
  delete handle.setPointerCapture;
  const savedPrint=getProjectSnapshot();
  restorePrintLayout(null);
  restorePrintLayout(savedPrint.print.layout);
  check(Math.abs(printLayout.labelA.w-110)<.01 && Math.abs(printLayout.labelA.h-65)<.01, 'saved print sizes and placement restore');
  widthField.value=''; widthField.dispatchEvent(new Event('change'));
  check(Math.abs(printLayout.labelA.w-110)<.01, 'empty dimension keeps previous size');
  resizePrintItem(900,900);
  check(printLayout.labelA.x+printLayout.labelA.w<=297 && printLayout.labelA.y+printLayout.labelA.h<=210, 'resized artwork stays inside A4');
  restorePrintLayout(savedPrint.print.layout);
  const originalPDF=window.jspdf;
  const originalRenderer=renderPieceToCanvas;
  const originalFolded=renderFoldedJcardCanvas;
  let rendered=[], folded=[];
  const pdfImages=[];
  window.jspdf={jsPDF:class { constructor(){ return new Proxy({}, {get:(_target,key)=> (...args)=>{if(key==='addImage') pdfImages.push(args);}}); } }};
  renderPieceToCanvas=(id,dpi,options)=>{ rendered.push({id,options}); return originalRenderer(id,dpi,options); };
  renderFoldedJcardCanvas=(dpi,options)=>{folded.push(options); return originalFolded(dpi,options);};
  try{
    setPrintCutMarks(false); rendered=[]; folded=[];
    check(await exportJcardPDF(), 'PDF export succeeds with cut marks hidden');
    check(Math.abs(pdfImages[1][4]-110)<.01 && Math.abs(pdfImages[1][5]-65)<.01,
      'PDF image dimensions match resized preview millimetres');
    check(rendered.every(call=>!call.options?.cutMarks) && folded.every(options=>!options?.cutMarks), 'PDF omits cut marks when disabled');
    setPrintCutMarks(true); rendered=[]; folded=[];
    check(await exportJcardPDF(), 'PDF export succeeds with cut marks shown');
    check(['label-a','label-b','jcard','jcard-back'].every(id=>rendered.some(call=>call.id===id && call.options?.cutMarks)) && folded.some(options=>options?.cutMarks), 'PDF includes cut outlines on all printed pieces');
  }finally{ window.jspdf=originalPDF; renderPieceToCanvas=originalRenderer; renderFoldedJcardCanvas=originalFolded; closePrintPreview(); }
  document.getElementById('printResetSize').click();
  check(printLayout.labelA.w===89 && printLayout.labelA.h===45, 'reset restores standard label dimensions');
  setManualPrintPlacement(false);
  check(document.getElementById('printDimensions').hidden, 'manual dimension annotations hide outside manual placement');
};
