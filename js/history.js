window.projectHistory = (() => {
  const redoStack = [];
  const assets = [];
  const assetIds = new Map();
  let restoring = false, ready = false, scheduled = false, pending = null, editingTarget = null;

  function capture(){
    const snapshot = getProjectSnapshot();
    const pieceId = snapshot.currentPieceId;
    snapshot.currentPieceId = null; // Navigating between pieces is not an edit.
    const json = JSON.stringify(snapshot, (_key, value) => {
      if(typeof value === 'string' && value.startsWith('data:')){
        if(!assetIds.has(value)){ assetIds.set(value, assets.length); assets.push(value); }
        return { __historyAsset: assetIds.get(value) };
      }
      return value;
    });
    return { json, pieceId, selectedId: selectedLayerId, trackGroup: selectedTrackGroup ? { ...selectedTrackGroup } : null };
  }

  function update(){
    if(!ready || restoring) return;
    const current = capture();
    if(pending && pending.json !== current.json){ redoStack.length = 0; pending = null; }
    document.getElementById('btnUndo').disabled = !historyStack.some(entry => entry.json !== current.json);
    document.getElementById('btnRedo').disabled = redoStack.length === 0;
  }

  function scheduleUpdate(){
    if(scheduled || restoring || !ready) return;
    scheduled = true;
    queueMicrotask(() => { scheduled = false; update(); });
  }

  function record(){
    if(!ready || restoring) return;
    const entry = capture();
    if(historyStack.at(-1)?.json !== entry.json){
      historyStack.push(entry);
      if(historyStack.length > MAX_HISTORY) historyStack.shift();
    }
    pending = entry;
    scheduleUpdate();
  }

  async function travel(from, to){
    if(restoring || !ready) return;
    update();
    const current = capture();
    let target;
    while(from.length){
      const candidate = from.pop();
      if(candidate.json !== current.json){ target = candidate; break; }
    }
    if(!target){ update(); return; }
    restoring = true;
    pending = null;
    editingTarget = null;
    document.body.inert = true;
    closeInlineEdit();
    try{
      const snapshot = JSON.parse(target.json, (_key, value) =>
        value && typeof value === 'object' && Object.hasOwn(value, '__historyAsset') ? assets[value.__historyAsset] : value);
      snapshot.currentPieceId = target.pieceId;
      await projectFiles.apply(snapshot, { resetHistory: false });
      selectedLayerId = currentState().layers.some(layer => layer.id === target.selectedId) ? target.selectedId : null;
      selectedTrackGroup = target.trackGroup;
      if(selectedLayer()) window.syncFontPanelToLayer?.(selectedLayer());
      else window.clearFontPanel?.();
      window.syncImageControls?.();
      render();
      updateLayerToolbar();
      current.pieceId = target.pieceId;
      to.push(current);
      if(to.length > MAX_HISTORY) to.shift();
    }catch(error){
      from.push(target);
      console.error('Could not restore edit history:', error);
      alert('Could not restore this edit. Your history has been kept.');
    }finally{
      document.body.inert = false;
      restoring = false;
      update();
    }
  }

  function reset(){
    historyStack.length = 0;
    redoStack.length = 0;
    assets.length = 0;
    assetIds.clear();
    pending = null;
    editingTarget = null;
    ready = true;
    scheduleUpdate();
  }

  // Capture before text changes, and coalesce a typing/slider session into one edit.
  document.addEventListener('beforeinput', event => {
    if(event.inputType?.startsWith('history')) return;
    if(editingTarget !== event.target){ record(); editingTarget = event.target; }
  }, true);
  document.addEventListener('focusout', () => { editingTarget = null; scheduleUpdate(); });
  document.addEventListener('pointerdown', event => {
    if(event.target.matches('input[type="range"]') && event.target.id !== 'canvasZoom'){
      record(); editingTarget = event.target;
    }
  }, true);
  document.addEventListener('input', event => {
    if(event.target.matches('input[type="range"], input[type="color"]') &&
      event.target.id !== 'canvasZoom' && editingTarget !== event.target){
      record(); editingTarget = event.target;
    }
    scheduleUpdate();
  }, true);
  document.addEventListener('change', event => {
    if(event.target.matches('select, input[type="checkbox"], input[type="file"]')) record();
    scheduleUpdate();
  }, true);
  document.addEventListener('click', event => {
    const button = event.target.closest('button');
    if(button && (button.closest('.editor-section') || button.closest('#colorPopup')) &&
      !/^(btnSelectTracks|btnLoadPCFonts|btnAddPCFont)/.test(button.id)) record();
    scheduleUpdate();
  }, true);

  document.getElementById('btnUndo').addEventListener('click', () => travel(historyStack, redoStack));
  document.getElementById('btnRedo').addEventListener('click', () => travel(redoStack, historyStack));
  document.addEventListener('keydown', event => {
    if(!(event.ctrlKey || event.metaKey) || event.altKey) return;
    const target = event.target;
    if(target.isContentEditable || target.matches('textarea, input:not([type="range"]):not([type="checkbox"]):not([type="button"])')) return;
    const key = event.key.toLowerCase();
    if(key === 'z' || key === 'y'){
      event.preventDefault();
      if(key === 'y' || event.shiftKey) travel(redoStack, historyStack);
      else travel(historyStack, redoStack);
    }
  });
  return { record, scheduleUpdate, reset, undo: () => travel(historyStack, redoStack), redo: () => travel(redoStack, historyStack) };
})();
