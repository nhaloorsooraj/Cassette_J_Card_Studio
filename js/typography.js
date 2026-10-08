const typographyPresets = {
  caption: { label: 'Caption', size: 2, fontWeight: 400, letterSpacing: 0, lineHeight: 1.25 },
  tracks: { label: 'Track list', size: 2.8, fontWeight: 400, letterSpacing: 0, lineHeight: 1.35 },
  heading: { label: 'Heading', size: 3.8, fontWeight: 700, letterSpacing: 0.2, lineHeight: 1.2 },
  title: { label: 'Title', size: 5.4, fontWeight: 800, letterSpacing: 0, lineHeight: 1.12 }
};

window.ensureTypographyOption = (id, value) => {
  const select = document.getElementById(id);
  if(Array.from(select.options).some(option => option.value === String(value))) return;
  const option = document.createElement('option');
  option.value = String(value);
  option.textContent = id === 'fontLineHeight' ? ({ '1.12':'Close', '1.2':'Balanced', '1.35':'Easy reading' }[String(value)] || 'Custom') : 'Custom';
  select.appendChild(option);
};

window.refreshTypographyPreview = () => {
  const preview = document.getElementById('fontLivePreview');
  const group = selectedTrackLayers();
  const layer = selectedLayer();
  const textSelected = layer && ['text', 'wraptext'].includes(layer.type);
  const vals = getFontPanelValues();
  if(!Number.isFinite(vals.size)) return;
  document.getElementById('fontEditingTarget').textContent = group.length
    ? `Side ${selectedTrackGroup.side} · whole list` : textSelected ? 'Selected text' : 'Style for new text';
  const sample = textSelected ? String(layer.text || 'Your text').slice(0, 160) : 'Your next great mixtape';
  preview.textContent = vals.allCaps ? sample.toUpperCase() : sample;
  preview.style.fontFamily = fontDefinition(vals.font).css;
  preview.style.fontSize = `${Math.min(56, Math.max(12, vals.size * 5))}px`;
  preview.style.fontWeight = vals.fontWeight;
  preview.style.fontStyle = vals.italic ? 'italic' : 'normal';
  preview.style.fontVariant = vals.smallCaps ? 'small-caps' : 'normal';
  preview.style.letterSpacing = `${vals.letterSpacing * 0.625}px`;
  preview.style.lineHeight = vals.lineHeight;
  preview.style.color = vals.color;
  preview.style.backgroundColor = currentState().bgColor || '#f4f0e6';
  preview.style.textAlign = textSelected ? layer.align || 'center' : defaultFontSettings.align || 'center';
  preview.style.textShadow = vals.shadow ? '1px 2px 3px rgba(0,0,0,.4)' : 'none';
  preview.style.webkitTextStroke = vals.outline ? '0.5px currentColor' : '0';
  const description = vals.size <= 2.2 ? 'Caption' : vals.size <= 3.1 ? 'Track list' : vals.size <= 4.2 ? 'Heading' : 'Title';
  document.getElementById('fontSizeDescription').textContent = description;
  document.getElementById('btnFontSmaller').disabled = vals.size <= 0.5;
  document.getElementById('btnFontLarger').disabled = vals.size >= 30;
  document.querySelectorAll('[data-type-preset]').forEach(button => {
    const preset = typographyPresets[button.dataset.typePreset];
    const active = ['size', 'fontWeight', 'letterSpacing', 'lineHeight'].every(key => Math.abs(vals[key] - preset[key]) < 0.001);
    button.setAttribute('aria-pressed', String(active));
  });
  document.querySelectorAll('[data-type-spacing]').forEach(button => {
    button.setAttribute('aria-pressed', String(Math.abs(vals.letterSpacing - Number(button.dataset.typeSpacing)) < 0.001));
  });
};

for(const [id, factor] of [['btnFontSmaller', 1/1.125], ['btnFontLarger', 1.125]]){
  document.getElementById(id).addEventListener('click', () => {
    const input = document.getElementById('fontSizeSlider');
    input.value = Math.max(0.5, Math.min(30, Math.round(Number(input.value) * factor * 10)/10));
    applyFontToSelected(['size']);
  });
}
document.querySelectorAll('[data-type-preset]').forEach(button => button.addEventListener('click', () => {
  const preset = typographyPresets[button.dataset.typePreset];
  document.getElementById('fontSizeSlider').value = preset.size;
  document.getElementById('fontWeightSlider').value = preset.fontWeight;
  document.getElementById('letterSpacingSlider').value = preset.letterSpacing;
  ensureTypographyOption('fontLineHeight', preset.lineHeight);
  document.getElementById('fontLineHeight').value = preset.lineHeight;
  applyFontToSelected(['size', 'fontWeight', 'letterSpacing', 'lineHeight']);
}));
document.querySelectorAll('[data-type-spacing]').forEach(button => button.addEventListener('click', () => {
  document.getElementById('letterSpacingSlider').value = button.dataset.typeSpacing;
  applyFontToSelected(['letterSpacing']);
}));

function filterFontFamilies(){
  const query = document.getElementById('fontSearch').value.trim().toLocaleLowerCase();
  const options = Array.from(document.getElementById('fontSelect').options);
  let matches = 0;
  options.forEach(option => {
    option.hidden = !option.textContent.toLocaleLowerCase().includes(query);
    if(!option.hidden) matches++;
  });
  document.getElementById('fontSearchStatus').textContent = query
    ? matches ? `${matches} matching font${matches === 1 ? '' : 's'}` : 'No matching fonts. Clear the search or add a PC font.' : '';
}
document.getElementById('fontSearch').addEventListener('input', filterFontFamilies);
document.getElementById('btnClearFontSearch').addEventListener('click', () => {
  document.getElementById('fontSearch').value = '';
  filterFontFamilies();
});
new MutationObserver(filterFontFamilies).observe(document.getElementById('fontSelect'), { childList: true, subtree: true });
