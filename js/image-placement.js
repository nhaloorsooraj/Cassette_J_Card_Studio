function oppositePieceId(){
  return { 'label-a':'label-b', 'label-b':'label-a', jcard:'jcard-back', 'jcard-back':'jcard' }[currentPieceId];
}
let copyPlacementSource = null;
function syncImagePlacementControls(){
  const source = selectedLayer();
  const select = document.getElementById('copyImageTarget');
  const button = document.getElementById('btnCopyImagePlacement');
  const destination = oppositePieceId();
  const side = destination === 'label-b' || destination === 'jcard-back' ? 'B' : 'A';
  button.textContent = `Copy placement to Side ${side}`;
  const enabled = source?.type === 'image' && !window.isImageCropActive?.(source.id);
  select.disabled = button.disabled = !enabled;
  if(!enabled){ select.replaceChildren(); copyPlacementSource = null; return; }
  const previous = copyPlacementSource === source.id ? select.value : null;
  const images = state[destination].layers.filter(layer => layer.type === 'image');
  select.replaceChildren(new Option(`Add this image to Side ${side}`, '__new__'));
  images.forEach((image, index) => select.add(new Option(`${image.name || (image.role === 'coverArt' ? 'Cover image' : `Image ${index + 1}`)} · Side ${side}`, image.id)));
  const matching = images.find(image => image.src === source.src) || (images.length === 1 ? images[0] : null);
  select.value = previous && Array.from(select.options).some(option => option.value === previous)
    ? previous : matching?.id || '__new__';
  if(copyPlacementSource !== source.id) document.getElementById('imagePlacementStatus').textContent = '';
  copyPlacementSource = source.id;
}
window.syncImagePlacementControls = syncImagePlacementControls;

document.getElementById('btnCopyImagePlacement').addEventListener('click', () => {
  const source = selectedLayer();
  if(source?.type !== 'image' || window.isImageCropActive?.(source.id)) return;
  const destination = oppositePieceId();
  const layers = state[destination].layers;
  const targetId = document.getElementById('copyImageTarget').value;
  let target = layers.find(layer => layer.type === 'image' && layer.id === targetId);
  if(!target && targetId !== '__new__') return;
  pushHistory();
  if(!target){
    const { _img, ...data } = source;
    target = { ...structuredClone(data), id: uid(), _img };
    if(target.role === 'coverArt' && layers.some(layer => layer.role === 'coverArt')) target.role = 'image';
    delete target.dynamicKey;
    layers.push(target);
  }
  for(const key of ['x','y','w','h','rotation','flipX','flipY','crop','cropBaseSize','freeTransform','sizing']){
    if(source[key] === undefined) delete target[key];
    else target[key] = structuredClone(source[key]);
  }
  render();
  syncImagePlacementControls();
  document.getElementById('copyImageTarget').value = target.id;
  const side = destination === 'label-b' || destination === 'jcard-back' ? 'B' : 'A';
  document.getElementById('imagePlacementStatus').textContent = `Placement copied to Side ${side}.`;
});
