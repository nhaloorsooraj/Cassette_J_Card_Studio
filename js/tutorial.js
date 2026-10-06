(() => {
  const steps = [
    {
      target: '#canvasWrap',
      title: 'Your artwork canvas',
      text: 'Arrange the cassette insert and labels here. Select an item to edit or drag it. Center alignment can snap an object to the piece center or line it up with nearby objects.'
    },
    {
      target: '#pieceTabs',
      title: 'Choose a piece',
      text: 'Switch between the J-card front, J-card back, and the two cassette labels. Each piece keeps its own layers.'
    },
    {
      target: '#projectDetails',
      title: 'Set up your project',
      text: 'Enter the album and artist names, then add or edit tracks below. Track changes update the artwork automatically.'
    },
    {
      target: '#btnAddTextLayer',
      title: 'Add and style text',
      text: 'Add a movable text layer, then use the typography controls to choose its font, size, weight, alignment, and color.'
    },
    {
      target: '#caDropZone',
      title: 'Add cover artwork',
      text: 'Upload or choose artwork, then adjust its placement, crop, rotation, and opacity. You can also add it as a separate layer.'
    },
    {
      target: '#section-shapes',
      title: 'Add colored shapes',
      text: 'Add a line, square, or circle. Select a shape to change its color independently, then drag or resize it on the canvas.'
    },
    {
      target: '#layerStack',
      title: 'Change front and back order',
      text: 'Drag a thumbnail to change which layer sits in front. The top item is drawn in front; the same order is used when exporting.'
    },
    {
      target: '#studioLogosGrid',
      title: 'Add production logos',
      text: 'Choose a built-in logo or upload your own. Uploaded production logos stay in this gallery so you can reuse them.'
    },
    {
      target: '#lblBevelEnabled',
      title: 'Adjust cassette label cuts',
      text: 'On Label A or Label B, turn the corner bevel on or off, choose top and bottom cuts, and adjust the bevel size.'
    },
    {
      target: '#btnLayout',
      title: 'Guides and piece layout',
      text: 'Open Layout to switch pieces or control fold lines, cut lines, grid, and measurement units.'
    },
    {
      target: '#canvasZoom',
      title: 'Zoom and appearance',
      text: 'Zoom the canvas with these controls or the mouse wheel over the canvas. Dark mode changes the editor appearance, not print colors.'
    },
    {
      target: '#exportBtn',
      title: 'Save and export',
      text: 'Save your project on this device, or export the finished artwork for printing. You can reopen this tutorial whenever you need it.'
    }
  ];

  const openButton = document.getElementById('btnTutorial');
  if(!openButton) return;

  let overlay = null;
  let activeStep = 0;
  let opener = null;
  let positionFrame = 0;
  let positionTimeout = 0;

  function makeButton(label, className, onClick){
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = label;
    button.addEventListener('click', onClick);
    return button;
  }

  function createOverlay(){
    const root = document.createElement('div');
    root.className = 'tutorial-overlay';
    root.setAttribute('aria-hidden', 'false');

    const shades = ['top', 'right', 'bottom', 'left'].map(side => {
      const shade = document.createElement('div');
      shade.className = `tutorial-shade tutorial-shade-${side}`;
      shade.addEventListener('click', closeTutorial);
      root.appendChild(shade);
      return shade;
    });

    const spotlight = document.createElement('div');
    spotlight.className = 'tutorial-spotlight';
    spotlight.setAttribute('aria-hidden', 'true');
    root.appendChild(spotlight);

    const card = document.createElement('section');
    card.className = 'tutorial-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-labelledby', 'tutorialTitle');
    card.setAttribute('aria-describedby', 'tutorialDescription');

    const head = document.createElement('div');
    head.className = 'tutorial-card-head';
    const progress = document.createElement('span');
    progress.className = 'tutorial-progress';
    progress.id = 'tutorialProgress';
    const close = makeButton('×', 'tutorial-close', closeTutorial);
    close.setAttribute('aria-label', 'Close tutorial');
    head.append(progress, close);

    const title = document.createElement('h2');
    title.id = 'tutorialTitle';
    const description = document.createElement('p');
    description.id = 'tutorialDescription';
    const progressTrack = document.createElement('div');
    progressTrack.className = 'tutorial-progress-track';
    progressTrack.setAttribute('aria-hidden', 'true');
    const progressFill = document.createElement('div');
    progressFill.className = 'tutorial-progress-fill';
    progressTrack.appendChild(progressFill);

    const actions = document.createElement('div');
    actions.className = 'tutorial-actions';
    const back = makeButton('Back', 'action-btn', () => showStep(activeStep - 1));
    back.id = 'tutorialBack';
    const actionsRight = document.createElement('div');
    actionsRight.className = 'tutorial-actions-right';
    const skip = makeButton('Close', 'action-btn', closeTutorial);
    const next = makeButton('Next', 'action-btn primary', () => showStep(activeStep + 1));
    next.id = 'tutorialNext';
    actionsRight.append(skip, next);
    actions.append(back, actionsRight);

    card.append(head, title, description, progressTrack, actions);
    root.appendChild(card);
    document.body.appendChild(root);

    return { root, shades, spotlight, card, progress, progressFill, title, description, back, next };
  }

  function getStepTarget(step){
    const node = document.querySelector(step.target);
    if(!node) return null;
    if(step.target === '#lblBevelEnabled') return node.closest('label') || node;
    return node;
  }

  function setRect(element, left, top, width, height){
    element.style.left = `${left}px`;
    element.style.top = `${top}px`;
    element.style.width = `${Math.max(0, width)}px`;
    element.style.height = `${Math.max(0, height)}px`;
  }

  function positionOverlay(){
    if(!overlay) return;
    const target = getStepTarget(steps[activeStep]);
    const viewWidth = window.innerWidth;
    const viewHeight = window.innerHeight;
    const padding = target ? 8 : 0;
    const bounds = target?.getBoundingClientRect();
    const left = bounds ? Math.max(0, bounds.left - padding) : 0;
    const top = bounds ? Math.max(0, bounds.top - padding) : 0;
    const right = bounds ? Math.min(viewWidth, bounds.right + padding) : 0;
    const bottom = bounds ? Math.min(viewHeight, bounds.bottom + padding) : 0;

    setRect(overlay.shades[0], 0, 0, viewWidth, top);
    setRect(overlay.shades[1], right, top, viewWidth - right, bottom - top);
    setRect(overlay.shades[2], 0, bottom, viewWidth, viewHeight - bottom);
    setRect(overlay.shades[3], 0, top, left, bottom - top);
    if(bounds){
      setRect(overlay.spotlight, left, top, right - left, bottom - top);
      overlay.spotlight.style.display = 'block';
    } else {
      overlay.spotlight.style.display = 'none';
    }

    const cardRect = overlay.card.getBoundingClientRect();
    const cardWidth = cardRect.width;
    const cardHeight = cardRect.height;
    let cardLeft = Math.max(16, Math.min((viewWidth - cardWidth) / 2, viewWidth - cardWidth - 16));
    let cardTop = Math.max(16, (viewHeight - cardHeight) / 2);
    if(bounds){
      cardLeft = Math.max(16, Math.min(bounds.left + bounds.width / 2 - cardWidth / 2, viewWidth - cardWidth - 16));
      const below = bounds.bottom + 22;
      const above = bounds.top - cardHeight - 22;
      if(below + cardHeight <= viewHeight - 16) cardTop = below;
      else if(above >= 16) cardTop = above;
      else cardTop = Math.max(16, Math.min(below, viewHeight - cardHeight - 16));
    }
    const maxCardTop = Math.max(16, viewHeight - cardHeight - 16);
    cardTop = Math.max(16, Math.min(cardTop, maxCardTop));
    overlay.card.style.left = `${cardLeft}px`;
    overlay.card.style.top = `${cardTop}px`;
  }

  function schedulePosition(){
    if(!overlay || positionFrame) return;
    positionFrame = requestAnimationFrame(() => {
      positionFrame = 0;
      positionOverlay();
    });
  }

  function showStep(index){
    if(!overlay) return;
    if(index >= steps.length){
      closeTutorial();
      return;
    }
    activeStep = Math.max(0, index);
    const step = steps[activeStep];
    overlay.progress.textContent = `STEP ${activeStep + 1} OF ${steps.length}`;
    overlay.title.textContent = step.title;
    overlay.description.textContent = step.text;
    overlay.progressFill.style.width = `${((activeStep + 1) / steps.length) * 100}%`;
    overlay.back.disabled = activeStep === 0;
    overlay.next.textContent = activeStep === steps.length - 1 ? 'Finish' : 'Next';

    const target = getStepTarget(step);
    if(target){
      target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    } else {
      console.error(`Tutorial target not found: ${step.target}`);
    }
    schedulePosition();
    window.clearTimeout(positionTimeout);
    positionTimeout = window.setTimeout(schedulePosition, 250);
  }

  function openTutorial(){
    if(overlay) return;
    opener = document.activeElement;
    overlay = createOverlay();
    window.addEventListener('resize', schedulePosition);
    window.addEventListener('scroll', schedulePosition, true);
    document.addEventListener('keydown', onKeyDown, true);
    showStep(0);
    overlay.next.focus();
  }

  function closeTutorial(){
    if(!overlay) return;
    window.removeEventListener('resize', schedulePosition);
    window.removeEventListener('scroll', schedulePosition, true);
    document.removeEventListener('keydown', onKeyDown, true);
    window.clearTimeout(positionTimeout);
    if(positionFrame) cancelAnimationFrame(positionFrame);
    overlay.root.remove();
    overlay = null;
    if(opener instanceof HTMLElement && opener.isConnected) opener.focus();
    opener = null;
  }

  function onKeyDown(event){
    if(!overlay) return;
    if(event.key === 'Escape'){
      event.preventDefault();
      closeTutorial();
    } else if(event.key === 'ArrowRight'){
      if(overlay.card.contains(document.activeElement)){
        event.preventDefault();
        showStep(activeStep + 1);
      }
    } else if(event.key === 'ArrowLeft'){
      if(overlay.card.contains(document.activeElement)){
        event.preventDefault();
        showStep(activeStep - 1);
      }
    } else if(event.key === 'Tab'){
      const focusable = [...overlay.card.querySelectorAll('button:not(:disabled)')];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if(!overlay.card.contains(document.activeElement)){
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if(event.shiftKey && document.activeElement === first){
        event.preventDefault();
        last.focus();
      } else if(!event.shiftKey && document.activeElement === last){
        event.preventDefault();
        first.focus();
      }
    }
  }

  openButton.addEventListener('click', openTutorial);
})();
