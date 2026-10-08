// .jcard v1: 8-byte signature, little-endian manifest length, UTF-8 manifest,
// then the original image bytes. Repeated image references share one asset.
const projectFiles = (() => {
  const signature = 'JCARD001';
  const types = [{ description: 'J-Card Studio project', accept: { 'application/octet-stream': ['.jcard'] } }];
  let currentHandle = null;
  let busy = false;

  async function encode(snapshot){
    // Include bundled logos too, so the file contains every layer's image.
    const portable = JSON.parse(JSON.stringify(snapshot));
    const sources = new Map();
    for(const piece of Object.values(portable.state)){
      for(const layer of piece.layers){
        if(layer.type !== 'image' || !layer.src || layer.src.startsWith('data:')) continue;
        if(!sources.has(layer.src)) sources.set(layer.src, (async () => {
          const response = await fetch(layer.src);
          if(!response.ok) throw new Error('Could not include an image in the project file.');
          const blob = await response.blob();
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
          });
        })());
        layer.src = await sources.get(layer.src);
      }
    }
    const record = projectStorage.pack(portable);
    const manifest = new TextEncoder().encode(JSON.stringify({
      version: 1, json: record.json,
      assets: record.assets.map(asset => ({ prefix: asset.prefix, size: asset.blob.size }))
    }));
    const length = new Uint8Array(4);
    new DataView(length.buffer).setUint32(0, manifest.length, true);
    return new Blob([signature, length, manifest, ...record.assets.map(asset => asset.blob)], { type: 'application/octet-stream' });
  }

  function validate(snapshot){
    if(!snapshot || snapshot.version !== 2 || !snapshot.state ||
      !PIECES.every(piece => Array.isArray(snapshot.state[piece.id]?.layers))) {
      throw new Error('This is not a supported J-Card Studio project.');
    }
    const supported = ['text', 'wraptext', 'image', 'rect', 'circle', 'line', 'barcode'];
    for(const piece of PIECES){
      for(const layer of snapshot.state[piece.id].layers){
        if(!layer || !supported.includes(layer.type) || typeof layer.id !== 'string' ||
          !Number.isFinite(layer.x) || !Number.isFinite(layer.y)) throw new Error('The project contains invalid layers.');
        for(const key of ['w', 'h', 'r', 'size', 'rotation', 'opacity', 'maxW']){
          if(layer[key] !== undefined && !Number.isFinite(layer[key])) throw new Error('The project contains invalid layer dimensions.');
        }
        if(layer.type === 'image' && (typeof layer.src !== 'string' || !layer.src || !(layer.w > 0) || !(layer.h > 0))){
          throw new Error('The project contains an invalid image layer.');
        }
        // Runtime image caches must always be rebuilt from the file's sources.
        delete layer._img;
      }
    }
    for(const key of ['tracksA', 'tracksB']){
      if(snapshot[key] !== undefined && (!Array.isArray(snapshot[key]) || snapshot[key].some(track =>
        !track || typeof track.name !== 'string' || typeof track.time !== 'string'))){
        throw new Error('The project contains an invalid track list.');
      }
    }
    for(const key of ['artworkLibrary', 'customLogoLibrary']){
      if(snapshot[key] !== undefined && (!Array.isArray(snapshot[key]) || snapshot[key].some(asset =>
        !asset || typeof asset.dataUrl !== 'string' || !asset.dataUrl.startsWith('data:image/')))){
        throw new Error('The project contains an invalid image library.');
      }
    }
    return snapshot;
  }

  function parseProjectJSON(text){
    const contents = text.replace(/^\uFEFF/, '').trim();
    if(!contents) throw new Error('This project file is empty. Choose a completed .jcard save or save the open design again.');
    try { return JSON.parse(contents); }
    catch (_) { throw new Error('This project file is incomplete or is not a valid J-Card project. Choose another copy, or save it again from the original design.'); }
  }

  async function decode(file){
    if(file.size === 0) throw new Error('This project file is empty (0 bytes). Save the original design again and wait for the saved confirmation before opening it.');
    const header = await file.slice(0, 12).arrayBuffer();
    if(new TextDecoder().decode(header.slice(0, 8)) !== signature){
      // Backwards compatibility with Share project's JSON downloads.
      const prefix = new TextDecoder().decode(header);
      if(prefix.startsWith('JCARD')) throw new Error('This project file is incomplete or uses an unsupported version.');
      return validate(parseProjectJSON(await file.text()));
    }
    if(header.byteLength < 12) throw new Error('The project file is incomplete.');
    const length = new DataView(header).getUint32(8, true);
    if(length === 0 || length > file.size - 12) throw new Error('The project file is incomplete.');
    const manifest = parseProjectJSON(await file.slice(12, 12 + length).text());
    if(manifest.version !== 1 || typeof manifest.json !== 'string' || !Array.isArray(manifest.assets)) {
      throw new Error('Unsupported project file version.');
    }
    let offset = 12 + length;
    const assets = manifest.assets.map(asset => {
      if(!Number.isSafeInteger(asset.size) || asset.size < 0 || offset + asset.size > file.size ||
        typeof asset.prefix !== 'string' || !/^data:image\/[^,]+;base64,$/.test(asset.prefix)) {
        throw new Error('The project contains an incomplete image.');
      }
      const blob = file.slice(offset, offset + asset.size);
      offset += asset.size;
      return { prefix: asset.prefix, blob };
    });
    if(offset !== file.size) throw new Error('The project file has unexpected data.');
    parseProjectJSON(manifest.json);
    return validate(await projectStorage.unpack({ ...manifest, assets }));
  }

  function setBusy(value){
    busy = value;
    for(const id of ['btnSave', 'btnSaveAs', 'btnOpenProject']) document.getElementById(id).disabled = value;
  }

  function download(blob, name){
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  async function save(asNew = false){
    if(busy) return;
    setBusy(true);
    const status = document.getElementById('projectSaveStatus');
    const previousStatus = status.textContent;
    try{
      let handle = asNew ? null : currentHandle;
      const name = (document.getElementById('albumNameInput').value.trim() || 'Untitled J-Card')
        .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') + '.jcard';
      // The picker must run directly from the user's click, before encoding.
      if(!handle && window.showSaveFilePicker){
        handle = await window.showSaveFilePicker({ suggestedName: name, types });
      }
      status.textContent = 'Saving projectÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦';
      const snapshot = getProjectSnapshot();
      const blob = await encode(snapshot);
      if(handle){
        const writable = await handle.createWritable();
        try { await writable.write(blob); await writable.close(); }
        catch(error){ await writable.abort().catch(() => {}); throw error; }
        currentHandle = handle;
        status.textContent = `Saved ${handle.name}`;
      } else {
        download(blob, name);
        status.textContent = `Download started: ${name}`;
      }
    }catch(error){
      if(error.name === 'AbortError') status.textContent = previousStatus;
      else {
        console.error('Project file save failed:', error);
        status.textContent = 'Project not saved';
        alert('Could not save the project file. Your design is still open. ' + error.message);
      }
    }finally{ setBusy(false); }
  }

  async function apply(snapshot){
    snapshot = validate(JSON.parse(JSON.stringify(snapshot))); // Keep the caller's snapshot separate from live image caches.
    selectedLayerId = null;
    dragState = null;
    historyStack = [];
    imageCropLayerId = null;
    cropDraft = null;
    restoredArtworkLibrary = [];
    restoredCustomLogoLibrary = [];
    restoredSelectedArtworkDataUrl = null;
    await restoreSavedProject(snapshot);
    await window.restoreArtworkLibrary();
    window.restoreLogoLibrary();
    renderTracksUI();
    for(const [id, key] of Object.entries({
      chkShowArtist: 'showArtist', chkShowTrackNum: 'showTrackNum', chkShowDuration: 'showDuration',
      chkShowBullet: 'showBullet', chkHideTracklist: 'hideTracklist', chkShowProductionInfo: 'showProductionInfo'
    })) document.getElementById(id).checked = !!tracklistSettings[key];
    document.getElementById('sideLabel').value = tracklistSettings.sidePrefix;
    for(const id of ['tracksA', 'tracksB']) document.getElementById(id).style.display = tracklistSettings.hideTracklist ? 'none' : '';
    switchPiece(currentPieceId);
    window.syncImageControls();
    updateFontPanelDisplay();
    fontColorSwatch.style.backgroundColor = defaultFontSettings.color;
    fontColorPicker.value = defaultFontSettings.color;
    setColorMode(activeColorMode);
    document.getElementById('projectHeaderTitle').textContent = document.getElementById('albumNameInput').value.trim() || 'Untitled J-Card';
    // Ensure every image is ready for immediate PDF/3D use, including other pieces.
    await Promise.all(Object.values(state).flatMap(piece => piece.layers).filter(layer => layer.type === 'image' && layer.src)
      .map(layer => new Promise(resolve => {
        const image = new Image();
        image.onload = image.onerror = resolve;
        layer._img = image;
        image.src = layer.src;
      })));
    render();
  }

  async function openFile(file, handle = null){
    const snapshot = await decode(file);
    if(!confirm('Open this project and replace the current design? Save your current project first if you want to keep it.')) return;
    document.body.inert = true;
    try{
      await apply(snapshot);
      currentHandle = file.name.toLowerCase().endsWith('.jcard') ? handle : null;
      document.getElementById('projectSaveStatus').textContent = `Opened ${file.name}`;
    }finally{ document.body.inert = false; }
  }

  async function open(){
    if(busy) return;
    if(!window.showOpenFilePicker){ document.getElementById('projectFileInput').click(); return; }
    setBusy(true);
    try{
      const [handle] = await window.showOpenFilePicker({ multiple: false, types: [
        ...types, { description: 'Legacy project JSON', accept: { 'application/json': ['.json'] } }
      ] });
      await openFile(await handle.getFile(), handle);
    }catch(error){ if(error.name !== 'AbortError') alert('Could not open the project. ' + error.message); }
    finally{ setBusy(false); }
  }

  document.getElementById('btnSave').addEventListener('click', () => save());
  document.getElementById('btnSaveAs').addEventListener('click', () => save(true));
  document.getElementById('btnOpenProject').addEventListener('click', open);
  document.getElementById('projectFileInput').addEventListener('change', async event => {
    const file = event.target.files[0];
    event.target.value = '';
    if(!file || busy) return;
    setBusy(true);
    try { await openFile(file); }
    catch(error){ alert('Could not open the project. ' + error.message); }
    finally{ setBusy(false); }
  });
  return { encode, decode, apply, save, openFile };
})();
