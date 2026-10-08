// Large project storage. A single transaction replaces metadata and image blobs
// together, so a failed save leaves the previous project intact.
const projectStorage = (() => {
  const legacyKey = 'jcard_state';
  let queue = Promise.resolve();

  function openDatabase(){
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('jcard-projects', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('projects');
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Close other studio tabs and try again.'));
      request.onsuccess = () => resolve(request.result);
    });
  }

  async function transact(mode, operation){
    const db = await openDatabase();
    try{
      return await new Promise((resolve, reject) => {
        const transaction = db.transaction('projects', mode);
        const request = operation(transaction.objectStore('projects'));
        transaction.oncomplete = () => resolve(request.result);
        transaction.onabort = () => reject(transaction.error || request.error || new Error('Storage transaction aborted.'));
        transaction.onerror = () => {}; // onabort reports failure after rollback.
      });
    }finally{
      db.close();
    }
  }

  function pack(snapshot){
    const images = new Map();
    const assets = [];
    const json = JSON.stringify(snapshot, (_key, value) => {
      if(typeof value !== 'string' || !/^data:image\/[^,]+;base64,/.test(value)) return value;
      if(!images.has(value)){
        const comma = value.indexOf(',');
        const bytes = atob(value.slice(comma + 1));
        const chunks = [];
        for(let start = 0; start < bytes.length; start += 65536){
          const chunk = bytes.slice(start, start + 65536);
          chunks.push(Uint8Array.from(chunk, char => char.charCodeAt(0)));
        }
        images.set(value, assets.length);
        assets.push({ prefix: value.slice(0, comma + 1), blob: new Blob(chunks) });
      }
      return { __jcardImage: images.get(value) };
    });
    return { version: 1, json, assets };
  }

  async function unpack(record){
    if(record.version !== 1) throw new Error('Unsupported saved project version.');
    const images = await Promise.all(record.assets.map(asset => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => resolve(asset.prefix + reader.result.split(',')[1]);
      reader.readAsDataURL(asset.blob);
    })));
    return JSON.parse(record.json, (_key, value) => {
      if(value && typeof value === 'object' && Object.hasOwn(value, '__jcardImage')){
        if(!Number.isInteger(value.__jcardImage) || !images[value.__jcardImage]) throw new Error('Missing saved image.');
        return images[value.__jcardImage];
      }
      return value;
    });
  }

  function enqueue(operation){
    const result = queue.then(operation);
    queue = result.catch(() => {});
    return result;
  }

  function save(snapshot){
    // Capture immediately, before edits can change the snapshot while queued.
    const record = pack(snapshot);
    return enqueue(async () => {
      await transact('readwrite', store => store.put(record, 'current'));
      try { localStorage.removeItem(legacyKey); } catch (_) { /* Save already committed. */ }
    });
  }

  async function load(){
    let storageError;
    try{
      const record = await transact('readonly', store => store.get('current'));
      if(record) return await unpack(record);
    }catch(error){ storageError = error; }
    const legacy = localStorage.getItem(legacyKey);
    if(legacy){
      const snapshot = JSON.parse(legacy);
      // Keep the old save if migration fails; the design can still be restored.
      try { await save(snapshot); } catch(error) { console.warn('Project migration deferred:', error); }
      return snapshot;
    }
    if(storageError) throw storageError;
    return null;
  }

  function clear(){
    return enqueue(async () => {
      localStorage.removeItem(legacyKey);
      await transact('readwrite', store => store.delete('current'));
    });
  }

  return { save, load, clear, pack, unpack };
})();
