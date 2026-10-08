window.runEditorChecks = async check => {
  tracksA = [{name:'First',time:'1:00'},{name:'Second',time:'2:00'}];
  tracksB = [{name:'Other side',time:'3:00'}];
  const logoOne = {id:'logo-one',type:'image',role:'logo',x:10,y:10,w:2,h:2};
  const logoTwo = {id:'logo-two',type:'image',role:'logo',x:20,y:20,w:3,h:3};
  state.jcard.layers.push(logoOne, logoTwo);
  syncTracksToCanvas();
  check(state.jcard.layers.includes(logoOne) && state.jcard.layers.includes(logoTwo), 'track refresh leaves independent logo layers intact');
  state.jcard.layers = state.jcard.layers.filter(layer => layer !== logoOne && layer !== logoTwo);
  const findTrack = name => state['jcard-back'].layers.find(layer => layer.text?.includes(name));
  let second = findTrack('Second');
  const secondId = second.id;
  second.size = 6.2; second.font = 'local:Arial'; second.x = 52; second.y = 37; second.rotation = 12;
  updateTrack('A', 1, 'name', 'Renamed');
  second = findTrack('Renamed');
  check(second.id === secondId && second.size === 6.2 && second.font === 'local:Arial' && second.x === 52 && second.rotation === 12,
    'track edits preserve font, size, placement and identity');
  document.getElementById('addNameA').value = 'Added';
  document.getElementById('addTimeA').value = '1:20';
  addTrack('A');
  check(findTrack('Renamed').size === 6.2 && findTrack('Added').size === 6.2 && findTrack('Added').font === 'local:Arial',
    'adding a track keeps existing styles and inherits adjacent styling');
  tracksA.splice(0,1); renderTracksUI();
  check(findTrack('Renamed').id === secondId && findTrack('Renamed').size === 6.2,
    'removing an earlier track preserves remaining track styles');
  selectTrackSide('A');
  const group = selectedTrackLayers();
  const original = group.map(layer => ({id:layer.id,x:layer.x,y:layer.y}));
  const other = state['jcard-back'].layers.find(layer => layer.role === 'backTrackB');
  const otherX = other.x, otherY = other.y;
  const bounds = trackGroupBounds();
  const rect = canvas.getBoundingClientRect();
  const scale = rect.width / currentPiece().w;
  const x = rect.left + (bounds.x + 1)*scale, y = rect.top + (bounds.y + 1)*scale;
  const capture = stage.setPointerCapture;
  stage.setPointerCapture = () => {};
  document.getElementById('freePlacementToggle').checked = true;
  snapToGrid = false;
  stage.dispatchEvent(new PointerEvent('pointerdown',{clientX:x,clientY:y,pointerId:1,bubbles:true}));
  stage.dispatchEvent(new PointerEvent('pointermove',{clientX:x+5*scale,clientY:y+7*scale,pointerId:1,bubbles:true}));
  stage.dispatchEvent(new PointerEvent('pointerup',{pointerId:1,bubbles:true}));
  stage.setPointerCapture = capture;
  check(original.every(old => {
    const layer = currentState().layers.find(layer => layer.id === old.id);
    return Math.abs(layer.x-old.x-5)<.01 && Math.abs(layer.y-old.y-7)<.01;
  }) && other.x === otherX && other.y === otherY, 'Side A list moves as one group without moving Side B');
  syncTracksToCanvas();
  check(original.every(old => Math.abs(currentState().layers.find(layer => layer.id === old.id).x-old.x-5)<.01),
    'group position survives track refresh');
  selectTrackSide('B');
  check(selectedTrackLayers().every(layer => ['backSideB','backTrackB'].includes(layer.role)), 'Side B whole-list selection');

  switchPiece('jcard');
  const source = state.jcard.layers.find(layer => layer.type === 'image');
  const cover = {...source,id:'cover-test',role:'coverArt',x:50,y:50,w:40,h:40,rotation:0,opacity:1};
  const image = {...source,id:'image-test',role:'image',x:25,y:25,w:10,h:10,rotation:0,opacity:1};
  state.jcard.layers = [cover,image];
  const originalCover = JSON.stringify({...cover,_img:undefined});
  selectedLayerId = null; syncImageControls();
  check(document.getElementById('artZoom').disabled && document.getElementById('btnRotateCW').disabled,
    'image controls disabled without selected image');
  for(const id of ['artZoom','artRotate','artOpacity']){
    const input = document.getElementById(id); input.value = '2'; input.dispatchEvent(new Event('input'));
  }
  for(const id of ['btnRotateCW','btnResetArt','btnArtFit','btnFlipHorizontal']) document.getElementById(id).dispatchEvent(new Event('click'));
  check(JSON.stringify({...cover,_img:undefined}) === originalCover, 'unselected cover ignores slider and button events');
  selectedLayerId = image.id; syncImageControls();
  const zoom = document.getElementById('artZoom'); zoom.value = '2'; zoom.dispatchEvent(new Event('input'));
  document.getElementById('btnRotateCW').click();
  check(image.w === 20 && image.h === 20 && image.rotation === 90 && JSON.stringify({...cover,_img:undefined}) === originalCover,
    'zoom and rotate change only selected image');
  state.jcard.layers.push({id:'text-test',type:'text',text:'Font test',font:'sans',size:5,x:40,y:40});
  selectedLayerId = 'text-test'; syncImageControls();
  document.getElementById('artRotate').dispatchEvent(new Event('input'));
  check(selectedLayer().rotation === undefined && JSON.stringify({...cover,_img:undefined}) === originalCover,
    'image controls do not affect selected text or cover');
  window.queryLocalFonts = async () => [{family:'Arial'},{family:'Arial'},{family:'Courier New'}];
  const load = document.getElementById('btnLoadPCFonts'); load.disabled = false; load.click();
  while(load.disabled) await new Promise(resolve => setTimeout(resolve,10));
  const select = document.getElementById('fontSelect');
  check(Array.from(select.options).filter(option => option.value === 'local:Arial').length === 1,
    'PC font families added without duplicates');
  syncFontPanelToLayer(selectedLayer());
  select.value = 'local:Arial'; select.dispatchEvent(new Event('change'));
  check(selectedLayer().font === 'local:Arial' && fontDefinition(selectedLayer().font).css.includes('Arial'),
    'PC font selection reaches canvas/export font resolver');
  const saved = await projectFiles.decode(await projectFiles.encode(getProjectSnapshot()));
  check(saved.state.jcard.layers.find(layer => layer.id === 'text-test').font === 'local:Arial', 'PC font choice survives project save');
};
