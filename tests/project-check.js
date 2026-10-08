window.addEventListener('load', async () => {
  const output = document.createElement('pre'); output.id = 'verification'; document.body.append(output);
  const checks = [];
  const check = (condition, message) => { if(!condition) throw new Error(message); checks.push(message); output.textContent = "RUNNING: " + checks.join("; "); };
  const rejects = async (fn, message) => { let rejected = false; try { await fn(); } catch (_) { rejected = true; } check(rejected, message); };
  window.alert = message => { throw new Error('Unexpected alert: ' + message); };
  window.confirm = () => true;
  try {
    output.textContent = "RUNNING: waiting for initialization";
    while(!window.restoreArtworkLibrary || document.body.inert) await new Promise(resolve => setTimeout(resolve, 20));
    const c = document.createElement('canvas'); c.width = 20; c.height = 20;
    const ctx = c.getContext('2d'); ctx.fillStyle = 'red'; ctx.fillRect(0,0,20,20);
    const src = c.toDataURL();
    const snapshot = getProjectSnapshot();
    for(const piece of Object.values(snapshot.state)) piece.layers = [];
    snapshot.state.jcard.layers = [{ id: 'test-image', type: 'image', src, x: 20, y: 30, w: 20, h: 20, rotation: 30, flipX: true, flipY: true, crop: {left: .1}, opacity: .7 }];
    snapshot.artworkLibrary = [{ name: 'test.png', dataUrl: src }];
    snapshot.customLogoLibrary = [{ name: 'logo.png', dataUrl: src }];
    snapshot.selectedArtworkDataUrl = src;
    snapshot.fields.albumNameInput = 'File round trip';
    const packed = projectStorage.pack(snapshot);
    check(packed.assets.length === 1, 'deduplicate images across layers and libraries');
    check(JSON.stringify(await projectStorage.unpack(packed)) === JSON.stringify(snapshot), 'lossless image and metadata round trip');
    await projectStorage.clear();
    localStorage.setItem('jcard_state', JSON.stringify(snapshot));
    const migrated = await projectStorage.load();
    check(migrated.fields.albumNameInput === 'File round trip' && localStorage.getItem('jcard_state') === null, 'legacy save migrates after commit');
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = () => { throw new DOMException('Full', 'QuotaExceededError'); };
    await rejects(() => projectStorage.save({...snapshot, fields:{albumNameInput:'failed'}}), 'storage failure is reported');
    IDBObjectStore.prototype.put = put;
    check((await projectStorage.load()).fields.albumNameInput === 'File round trip', 'failed save preserves previous project');
    const large = structuredClone(snapshot);
    const largeImage = 'data:image/png;base64,' + 'AAAA'.repeat(2 * 1024 * 1024);
    large.artworkLibrary.push({name: 'large', dataUrl: largeImage});
    await projectStorage.save(large);
    check((await projectStorage.load()).artworkLibrary[1].dataUrl === largeImage, 'save and restore beyond localStorage limit');
    const bundled = structuredClone(snapshot);
    bundled.state.jcard.layers[0].src = 'assets/logos/logo_lofi.jpg';
    const portable = await projectFiles.decode(await projectFiles.encode(bundled));
    check(portable.state.jcard.layers[0].src.startsWith('data:image/jpeg;base64,'), 'bundled logo embedded in portable project');
    const file = await projectFiles.encode(large);
    const decoded = await projectFiles.decode(file);
    check(decoded.artworkLibrary[1].dataUrl === largeImage, 'large project file round trip');
    check(file.size < 7 * 1024 * 1024, 'binary assets avoid base64 file overhead');
    await rejects(() => projectFiles.decode(file.slice(0, file.size-1)), 'truncated file rejected');
    for(const contents of ['', '   ', 'JCARD', '{"version":']){
      try { await projectFiles.decode(new Blob([contents])); throw new Error('Invalid file accepted'); }
      catch(error){ check(!error.message.includes('JSON.parse') && /empty|incomplete/.test(error.message), 'clear error for empty or incomplete file'); }
    }
    check((await projectFiles.decode(new Blob(['\uFEFF'+JSON.stringify(snapshot)]))).version === 2, 'JSON with byte-order mark opens');
    await rejects(() => projectFiles.decode(new Blob(['{"version":2,"state":{}}'])), 'invalid project rejected');
    check((await projectFiles.decode(new Blob([JSON.stringify(snapshot)]))).fields.albumNameInput === 'File round trip', 'legacy JSON import');
    await projectFiles.apply(snapshot);
    check(document.getElementById('albumNameInput').value === 'File round trip', 'open restores fields');
    const invalid = structuredClone(snapshot); invalid.state.jcard.layers[0].w = 'invalid';
    await rejects(() => projectFiles.apply(invalid), 'invalid dimensions rejected before replacing design');
    check(state.jcard.layers[0].w === 20, 'invalid open preserves current design');
    check(selectedLayerId === null && historyStack.length === 0, 'open clears selection and undo history');
    check(artworkImages.length === 1 && customLogoLibrary.length === 1 && selectedArtworkIdx === 0, 'open restores artwork and logo libraries');
    check(state.jcard.layers[0]._img.naturalWidth === 20 && state.jcard.layers[0].flipX, 'open loads image pixels and transforms');
    let chosen = 0, writes = 0, lastBlob;
    window.showSaveFilePicker = async () => { chosen++; return {name:'test.jcard',createWritable:async()=>({write:async blob=>{writes++;lastBlob=blob;},close:async()=>{},abort:async()=>{}})}; };
    const storageSave = projectStorage.save;
    projectStorage.save = () => { throw new Error('Browser storage unavailable'); };
    await projectFiles.save(); await projectFiles.save();
    check(chosen === 1 && writes === 2, 'Save reuses chosen file without browser storage');
    await projectFiles.save(true);
    check(chosen === 2 && writes === 3, 'Save as chooses another file');
    check((await projectFiles.decode(lastBlob)).state.jcard.layers[0].flipY, 'saved file reopens with transforms');
    window.showSaveFilePicker = async () => { throw new DOMException('Canceled', 'AbortError'); };
    await projectFiles.save(true);
    check(writes === 3, 'cancel save leaves file untouched');
    window.showSaveFilePicker = undefined;
    let downloaded = '';
    HTMLAnchorElement.prototype.click = function(){ downloaded = this.download; };
    await projectFiles.save(true);
    check(downloaded.endsWith('.jcard'), 'unsupported browser downloads custom file');
    projectStorage.save = storageSave;
    await projectStorage.clear();
    check(await projectStorage.load() === null, 'reset clears browser save');
    document.getElementById('section-cover-art').scrollIntoView();
    const controls = document.querySelector('.ca-controls');
    controls.style.width = '250px';
    const horizontal = document.getElementById('btnFlipHorizontal');
    const vertical = document.getElementById('btnFlipVertical');
    for(const button of [horizontal, vertical]){
      const bounds = button.getBoundingClientRect();
      check(bounds.width > 70 && button.scrollWidth <= button.clientWidth && button.scrollHeight <= button.clientHeight, 'flip label fits narrow-panel button');
    }
    const a = horizontal.getBoundingClientRect(), b = vertical.getBoundingClientRect();
    check(a.right <= b.left || a.bottom <= b.top, 'flip buttons do not overlap');
    controls.style.width = '';
    output.textContent = 'PASS: ' + checks.join('; ');
  }catch(error){ output.textContent = 'FAIL: ' + error.stack + '\nPassed: ' + checks.join('; '); }
});
