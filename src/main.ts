import type { CatalogueStar } from './astro/starPosition.js';
import { CITIES, DEFAULT_CITY_ID } from './data/cities.js';
import { buildPlanisphereSvg, type ConstellationData } from './render/buildPlanisphereSvg.js';
import { exportDiscSvg, exportHolderSvg } from './render/exportSvg.js';

interface StarsFile {
  stars: CatalogueStar[];
}
interface ConstellationsFile {
  constellations: ConstellationData[];
}

const base = import.meta.env.BASE_URL;

async function loadData(): Promise<{
  stars: CatalogueStar[];
  constellations: ConstellationData[];
}> {
  const [starsRes, consRes] = await Promise.all([
    fetch(`${base}data/stars.json`),
    fetch(`${base}data/constellations.json`),
  ]);
  const starsFile = (await starsRes.json()) as StarsFile;
  const consFile = (await consRes.json()) as ConstellationsFile;
  return { stars: starsFile.stars, constellations: consFile.constellations };
}

function $<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el as T;
}

async function main() {
  const { stars, constellations } = await loadData();

  const svg = $<SVGSVGElement & HTMLElement>('disc-svg') as unknown as SVGSVGElement;
  const citySelect = $<HTMLSelectElement>('city');
  const cityNote = $<HTMLElement>('city-note');
  const latInput = $<HTMLInputElement>('lat');
  const latValue = $<HTMLOutputElement>('lat-value');
  const epochInput = $<HTMLInputElement>('epoch');
  const epochValue = $<HTMLOutputElement>('epoch-value');
  const magInput = $<HTMLInputElement>('mag');
  const magValue = $<HTMLOutputElement>('mag-value');
  const showConstellations = $<HTMLInputElement>('show-constellations');
  const showNames = $<HTMLInputElement>('show-names');
  const dateInput = $<HTMLInputElement>('date');
  const hourInput = $<HTMLInputElement>('hour');
  const hourValue = $<HTMLOutputElement>('hour-value');
  const lstReadout = $<HTMLElement>('readout-lst');
  const limitReadout = $<HTMLElement>('readout-limit');
  const themeInk = $<HTMLButtonElement>('theme-ink');
  const themeNight = $<HTMLButtonElement>('theme-night');
  const paperSize = $<HTMLSelectElement>('paper-size');
  const exportDiscBtn = $<HTMLButtonElement>('export-disc');
  const exportHolderBtn = $<HTMLButtonElement>('export-holder');

  for (const c of CITIES) {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    citySelect.appendChild(opt);
  }
  citySelect.value = DEFAULT_CITY_ID;

  const today = new Date();
  dateInput.value = today.toISOString().slice(0, 10);
  hourInput.value = String(today.getHours() + today.getMinutes() / 60);

  let dragRotationDeg = 0;
  let bakedRotationDeg = 0;

  function currentConfig() {
    const [y, m, d] = dateInput.value.split('-').map(Number);
    const date = new Date(Date.UTC(y ?? 2026, (m ?? 1) - 1, d ?? 1));
    return {
      latDeg: Number(latInput.value),
      epochYear: Number(epochInput.value),
      magLimit: Number(magInput.value),
      showConstellations: showConstellations.checked,
      showNames: showNames.checked,
      date,
      localHour: Number(hourInput.value),
      discRadius: 220,
    };
  }

  function render() {
    const config = currentConfig();
    const built = buildPlanisphereSvg(svg, stars, constellations, config);
    bakedRotationDeg = built.bakedRotationDeg;
    applyDragRotation();

    latValue.textContent = `${config.latDeg.toFixed(1)}°`;
    epochValue.textContent = formatEpoch(config.epochYear);
    magValue.textContent = config.magLimit.toFixed(1);
    hourValue.textContent = formatHour(config.localHour);
    lstReadout.textContent = `${built.bakedRotationDeg.toFixed(1)}°`;
    limitReadout.textContent = `dec ${(config.latDeg >= 0 ? -(90 - config.latDeg) : 90 + config.latDeg).toFixed(0)}°`;
  }

  function applyDragRotation() {
    // The star disc and its date ring are separate layers (the holder face sits
    // between them) that must turn together.
    for (const rotator of svg.querySelectorAll<SVGGElement>('.disc-rotator')) {
      rotator.setAttribute(
        'transform',
        `rotate(${(bakedRotationDeg + dragRotationDeg).toFixed(3)})`,
      );
    }
  }

  function formatEpoch(year: number): string {
    if (year <= 0) return `${1 - year} BCE`;
    return `${Math.round(year)} CE`;
  }
  function formatHour(hour: number): string {
    const h = Math.floor(hour);
    const m = Math.round((hour - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  citySelect.addEventListener('change', () => {
    const city = CITIES.find((c) => c.id === citySelect.value);
    if (!city) return;
    latInput.value = String(city.lat);
    epochInput.value = String(city.suggestedEpoch);
    cityNote.textContent = `${city.lat.toFixed(2)}°, ${city.lon.toFixed(2)}° — ${city.note}`;
    render();
  });

  for (const input of [latInput, epochInput, magInput, dateInput, hourInput]) {
    input.addEventListener('input', render);
  }
  showConstellations.addEventListener('change', render);
  showNames.addEventListener('change', render);

  // ---- Drag to rotate ----
  let dragging = false;
  let dragStartAngle = 0;
  let dragStartOffset = 0;

  function pointerAngle(clientX: number, clientY: number): number {
    const rect = svg.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI;
  }

  svg.addEventListener('pointerdown', (e) => {
    dragging = true;
    svg.setPointerCapture(e.pointerId);
    dragStartAngle = pointerAngle(e.clientX, e.clientY);
    dragStartOffset = dragRotationDeg;
  });
  svg.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const angle = pointerAngle(e.clientX, e.clientY);
    // The whole disc is drawn inside a scale(1,-1) wrapper, which reverses
    // the visual sense of a positive SVG rotation; negate here so dragging
    // clockwise on screen turns the disc clockwise on screen.
    dragRotationDeg = dragStartOffset - (angle - dragStartAngle);
    applyDragRotation();
  });
  function endDrag() {
    dragging = false;
  }
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);

  // ---- Theme ----
  function setTheme(theme: 'ink' | 'night') {
    document.documentElement.dataset.theme = theme === 'night' ? 'night' : 'light';
    themeInk.setAttribute('aria-pressed', String(theme === 'ink'));
    themeNight.setAttribute('aria-pressed', String(theme === 'night'));
  }
  themeInk.addEventListener('click', () => setTheme('ink'));
  themeNight.addEventListener('click', () => setTheme('night'));

  // ---- Export ----
  exportDiscBtn.addEventListener('click', () => {
    exportDiscSvg(stars, constellations, currentConfig(), paperSize.value as 'a4' | 'letter');
  });
  exportHolderBtn.addEventListener('click', () => {
    exportHolderSvg(currentConfig(), paperSize.value as 'a4' | 'letter');
  });

  // ---- Init ----
  const initialCity = CITIES.find((c) => c.id === DEFAULT_CITY_ID);
  if (initialCity) {
    latInput.value = String(initialCity.lat);
    epochInput.value = String(initialCity.suggestedEpoch);
    cityNote.textContent = `${initialCity.lat.toFixed(2)}°, ${initialCity.lon.toFixed(2)}° — ${initialCity.note}`;
  }
  magInput.value = '5.5';
  render();
}

main().catch((err) => {
  console.error(err);
  const stage = document.querySelector('.disc-stage');
  if (stage) stage.textContent = `Failed to load: ${(err as Error).message}`;
});
