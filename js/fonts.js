// Local family names are stored in layers so saved projects keep their choice.
function ensureFontOption(id){
  const select = document.getElementById('fontSelect');
  if(Array.from(select.options).some(option => option.value === id)) return;
  const font = fontDefinition(id);
  const option = document.createElement('option');
  option.value = id;
  option.textContent = font.label;
  option.style.fontFamily = font.css;
  (document.getElementById('pcFontOptions') || select).appendChild(option);
}

const localFontStatus = document.getElementById('localFontStatus');
if(!window.queryLocalFonts){
  document.getElementById('btnLoadPCFonts').disabled = true;
  localFontStatus.textContent = 'This browser cannot list PC fonts. Enter an installed font’s exact family name below.';
}
document.getElementById('btnLoadPCFonts').addEventListener('click', async () => {
  const button = document.getElementById('btnLoadPCFonts');
  button.disabled = true;
  try{
    const fonts = await window.queryLocalFonts();
    const families = [...new Set(fonts.map(font => font.family))].sort((a, b) => a.localeCompare(b));
    families.forEach(family => ensureFontOption(`local:${family}`));
    localFontStatus.textContent = `${families.length} PC font families added to the font list.`;
  }catch(error){
    localFontStatus.textContent = 'Font access was not granted. Allow access and try again, or enter an installed font name.';
  }finally{ button.disabled = false; }
});

async function addLocalFont(){
  const input = document.getElementById('localFontName');
  const family = input.value.trim();
  if(!family) return;
  const button = document.getElementById('btnAddPCFont');
  button.disabled = true;
  try{
    // FontFace.load rejects unavailable names instead of silently using fallback.
    await new FontFace('JCardLocalFontCheck', `local(${JSON.stringify(family)})`).load();
    const id = `local:${family}`;
    ensureFontOption(id);
    document.getElementById('fontSelect').value = id;
    applyFontToSelected(['font']);
    localFontStatus.textContent = `${family} is available in the font list.`;
    render();
  }catch(error){
    localFontStatus.textContent = `Could not access “${family}”. Check its installed family name and browser font permissions.`;
  }finally{ button.disabled = false; }
}
document.getElementById('btnAddPCFont').addEventListener('click', addLocalFont);
document.getElementById('localFontName').addEventListener('keydown', event => {
  if(event.key === 'Enter'){ event.preventDefault(); addLocalFont(); }
});
