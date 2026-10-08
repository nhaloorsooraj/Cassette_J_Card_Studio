function deletedProjectItems(){
  return PIECES.flatMap(piece => [
    ...(state[piece.id].deletedLayers || []).map(entry => ({ pieceId: piece.id, kind: 'layer', entry })),
    ...(state[piece.id].deletedTracks || []).map(entry => ({ pieceId: piece.id, kind: 'track', entry }))
  ]);
}

function restoreDeletedItems(items){
  if(!items.length) return;
  pushHistory();
  let tracksChanged = false;
  for(const { pieceId, kind, entry } of items){
    const piece = state[pieceId];
    if(kind === 'track'){
      const tracks = entry.side === 'A' ? tracksA : tracksB;
      if(!entry.track.id || !tracks.some(track => track.id === entry.track.id)) tracks.splice(Math.min(entry.index, tracks.length), 0, { ...entry.track });
      for(const layer of entry.layers || []){
        if(!piece.layers.some(item => item.id === layer.id)) piece.layers.push(structuredClone(layer));
      }
      piece.deletedTracks = piece.deletedTracks.filter(item => item !== entry);
      tracksChanged = true;
    } else {
      if(!piece.layers.some(layer => layer.id === entry.layer.id)){
        piece.layers.splice(Math.min(entry.index, piece.layers.length), 0, structuredClone(entry.layer));
      }
      const key = entry.layer.dynamicKey || entry.layer.role;
      piece.deletedDynamicKeys = (piece.deletedDynamicKeys || []).filter(item => item !== key);
      piece.deletedLayers = piece.deletedLayers.filter(item => item !== entry);
    }
  }
  if(tracksChanged) renderTracksUI();
  render();
}

function restoreMissingGeneratedText(){
  pushHistory();
  const piece = currentState();
  // Recover archived formatting first; older projects only have deletion markers.
  restoreDeletedItems(deletedProjectItems().filter(item => item.pieceId === currentPieceId &&
    item.kind === 'layer' && ['text', 'wraptext'].includes(item.entry.layer.type)));
  piece.deletedDynamicKeys = [];
  for(const template of window.defaultLayerTemplates?.[currentPieceId] || []){
    if(['text', 'wraptext'].includes(template.type) && !piece.layers.some(layer => layer.role === template.role)){
      piece.layers.push({ ...structuredClone(template), id: uid() });
    }
  }
  syncTracksToCanvas();
  render();
}

let deletedItemsSignature = '';
function refreshDeletedItems(){
  const items = deletedProjectItems();
  const signature = JSON.stringify(items.map(item => [item.pieceId, item.kind, item.entry.index,
    item.entry.layer?.id, item.entry.layer?.text, item.entry.layer?.name, item.entry.track?.id, item.entry.track?.name]));
  if(signature === deletedItemsSignature) return;
  deletedItemsSignature = signature;
  const list = document.getElementById('deletedItemsList');
  list.replaceChildren();
  if(!items.length){
    const empty = document.createElement('p');
    empty.className = 'editor-help';
    empty.textContent = 'No deleted items. For older projects, restore missing labels and tracks below.';
    list.appendChild(empty);
  }
  items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'deleted-item-row';
    const label = document.createElement('span');
    const title = item.kind === 'track' ? `Side ${item.entry.side}: ${item.entry.track.name}`
      : item.entry.layer.name || item.entry.layer.text || item.entry.layer.role || item.entry.layer.type;
    label.textContent = `${PIECES.find(piece => piece.id === item.pieceId).tabLabel}: ${String(title).slice(0, 90)}`;
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'action-btn'; button.textContent = 'Restore';
    button.addEventListener('click', () => {
      // Resolve against live state: undo/redo may replace an equal-looking entry.
      const live = deletedProjectItems().find(candidate => candidate.pieceId === item.pieceId && candidate.kind === item.kind &&
        (item.kind === 'layer' ? candidate.entry.layer.id === item.entry.layer.id
          : candidate.entry.track.id === item.entry.track.id && candidate.entry.side === item.entry.side));
      if(live) restoreDeletedItems([live]);
    });
    row.append(label, button); list.appendChild(row);
  });
  document.getElementById('btnRestoreAllDeleted').disabled = !items.length;
}
window.refreshDeletedItems = refreshDeletedItems;
document.getElementById('btnRestoreAllDeleted').addEventListener('click', () => restoreDeletedItems(deletedProjectItems()));
document.getElementById('btnRestoreGenerated').addEventListener('click', restoreMissingGeneratedText);
