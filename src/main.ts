import './fonts/fonts.css';
import { angleDelta, formatHour, parseDateInput, quarterHour } from './controls.js';
import { CITIES, DEFAULT_CITY_ID } from './data/cities.js';
import { type Catalogue, loadCatalogue } from './data/loadCatalogue.js';
import { discRotationDeg } from './geometry/dial.js';
import { buildPlanisphereSvg } from './render/buildPlanisphereSvg.js';
import { exportDiscSvg, exportHolderSvg } from './render/exportSvg.js';
import type { PlanisphereConfig } from './render/types.js';

function $<T extends Element>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el as unknown as T;
}
const svg = $<SVGSVGElement>('disc-svg');
const workbench = $<HTMLFieldSetElement>('workbench');
const loading = $<HTMLElement>('load-status');
const retry = $<HTMLButtonElement>('retry');
const citySelect = $<HTMLSelectElement>('city');
const cityNote = $<HTMLElement>('city-note');
const latInput = $<HTMLInputElement>('lat');
const epochInput = $<HTMLInputElement>('epoch');
const magInput = $<HTMLInputElement>('mag');
const namesInput = $<HTMLInputElement>('show-names');
const linesInput = $<HTMLInputElement>('show-constellations');
const dateInput = $<HTMLInputElement>('date');
const hourInput = $<HTMLInputElement>('hour');
const dateError = $<HTMLElement>('date-error');
const earlier = $<HTMLButtonElement>('earlier');
const later = $<HTMLButtonElement>('later');
const paper = $<HTMLSelectElement>('paper-size');
const exportDisc = $<HTMLButtonElement>('export-disc');
const exportHolder = $<HTMLButtonElement>('export-holder');
const fullView = $<HTMLButtonElement>('chart-full');
const detailView = $<HTMLButtonElement>('chart-detail');
let skyDetail = false;
let catalogue: Catalogue | null = null;
let committed: PlanisphereConfig | null = null;
let rotator: SVGGElement | null = null;
let pointerId: number | null = null;
let previousAngle = 0;
let dragHour = 0;

const formatEpoch = (year: number) => (year <= 0 ? `${1 - year} BCE` : `${year} CE`);
const formatLatitude = (lat: number) => `${Math.abs(lat).toFixed(1)}°${lat < 0 ? 'S' : 'N'}`;
for (const city of CITIES) {
  const option = document.createElement('option');
  option.value = city.id;
  option.textContent = city.name;
  citySelect.appendChild(option);
}
const custom = document.createElement('option');
custom.value = 'custom';
custom.textContent = 'Custom latitude';
citySelect.appendChild(custom);
const initialCity = CITIES.find((city) => city.id === DEFAULT_CITY_ID);
if (!initialCity) throw new Error('Missing default site');
function chooseCity() {
  const city = CITIES.find((item) => item.id === citySelect.value);
  if (!city) {
    cityNote.textContent =
      'The holder is cut for your chosen latitude. Enter local mean time for your site.';
    return;
  }
  latInput.value = String(city.lat);
  epochInput.value = String(city.suggestedEpoch);
  cityNote.textContent = `${city.lat.toFixed(2)}°, ${city.lon.toFixed(2)}° — ${city.note}`;
}
citySelect.value = DEFAULT_CITY_ID;
chooseCity();
const now = new Date();
// Start at the selected site's local mean solar time, not the browser's civil clock.
const localNow = new Date(now.getTime() + (initialCity.lon / 15) * 3_600_000);
const roundedLocal = new Date(Math.round(localNow.getTime() / 900_000) * 900_000);
dateInput.value = roundedLocal.toISOString().slice(0, 10);
hourInput.value = String(
  quarterHour(roundedLocal.getUTCHours() + roundedLocal.getUTCMinutes() / 60),
);
magInput.value = '5.5';

function configFromControls(): PlanisphereConfig | null {
  updateControlOutputs();
  const date = parseDateInput(dateInput.value);
  const invalid = !date;
  dateInput.setAttribute('aria-invalid', String(invalid));
  dateError.hidden = !invalid;
  dateError.textContent = invalid
    ? 'Enter a valid Gregorian date from year 0001 to 9999. The preview retains your last valid settings; downloads are paused.'
    : '';
  for (const button of [exportDisc, exportHolder, earlier, later])
    button.disabled = invalid || !catalogue;
  svg.setAttribute('aria-disabled', String(invalid || !catalogue));
  if (!date) return null;
  return {
    latDeg: Number(latInput.value),
    epochYear: Number(epochInput.value),
    magLimit: Number(magInput.value),
    showConstellations: linesInput.checked,
    showNames: namesInput.checked,
    date,
    localHour: Number(hourInput.value),
  };
}

function updateControlOutputs() {
  $<HTMLOutputElement>('lat-value').textContent = formatLatitude(Number(latInput.value));
  $<HTMLOutputElement>('epoch-value').textContent = formatEpoch(Number(epochInput.value));
  $<HTMLOutputElement>('mag-value').textContent = Number(magInput.value).toFixed(1);
  $<HTMLOutputElement>('hour-value').textContent = formatHour(Number(hourInput.value));
  latInput.setAttribute('aria-valuetext', formatLatitude(Number(latInput.value)));
  epochInput.setAttribute('aria-valuetext', formatEpoch(Number(epochInput.value)));
  hourInput.setAttribute(
    'aria-valuetext',
    `${formatHour(Number(hourInput.value))} local mean time`,
  );
}

function updateReadouts(config: PlanisphereConfig) {
  const angle = ((config.localHour - 12) * 15 * Math.PI) / 180;
  const guide = svg.querySelector('.alignment-guide');
  for (const [name, value] of Object.entries({
    x1: 75.5 * Math.cos(angle),
    y1: 75.5 * Math.sin(angle),
    x2: 86.5 * Math.cos(angle),
    y2: 86.5 * Math.sin(angle),
  }))
    guide?.setAttribute(name, value.toFixed(3));
  updateControlOutputs();
  $<HTMLElement>('readout-lst').textContent =
    `${discRotationDeg(config.date, config.localHour).toFixed(1)}°`;
  $<HTMLElement>('readout-limit').textContent =
    `dec ${(config.latDeg >= 0 ? -(90 - config.latDeg) : 90 + config.latDeg).toFixed(1)}°`;
  $<HTMLElement>('preview-setting').textContent =
    `${formatLatitude(config.latDeg)} · ${formatEpoch(config.epochYear)} · ${config.date.toISOString().slice(0, 10)} · ${formatHour(config.localHour)} mean time`;
  $<HTMLElement>('date-scale-note').textContent =
    `Printed date scale: ${config.date.getUTCFullYear()}. Regenerate the wheel if you change years.`;
}

function endDrag() {
  pointerId = null;
}
function setChartView(detail: boolean) {
  skyDetail = detail;
  $<HTMLElement>('disc-stage').dataset.view = detail ? 'detail' : 'full';
  fullView.setAttribute('aria-pressed', String(!detail));
  detailView.setAttribute('aria-pressed', String(detail));
  const boxes = [...svg.querySelectorAll<SVGGraphicsElement>('.window-cut')].map((path) =>
    path.getBBox(),
  );
  if (detail && boxes.length) {
    const minX = Math.min(...boxes.map((box) => box.x));
    const maxX = Math.max(...boxes.map((box) => box.x + box.width));
    const height = Math.max(...boxes.map((box) => box.height));
    const size = Math.max(maxX - minX, height * 2 + 2.4) + 12;
    svg.setAttribute('viewBox', `${(minX + maxX - size) / 2} ${-size / 2} ${size} ${size}`);
  } else svg.setAttribute('viewBox', '-100 -100 200 200');
  $<HTMLElement>('drag-hint').textContent = detail
    ? 'Drag the sky to change mean time. Use the full instrument to see date alignment.'
    : 'Drag the rim. The red guide aligns date and mean time.';
}
fullView.addEventListener('click', () => setChartView(false));
detailView.addEventListener('click', () => setChartView(true));
function render() {
  endDrag();
  if (!catalogue) return;
  const config = configFromControls();
  if (!config) return;
  const built = buildPlanisphereSvg(svg, catalogue.stars, catalogue.constellations, config);
  rotator = built.discRotator;
  committed = config;
  fullView.disabled = false;
  detailView.disabled = false;
  setChartView(skyDetail);
  updateReadouts(config);
}
function setHour(hour: number) {
  hourInput.value = String(quarterHour(hour));
  updateControlOutputs();
  if (!catalogue || !committed || !parseDateInput(dateInput.value)) return;
  const localHour = quarterHour(hour);
  committed = { ...committed, localHour };
  rotator?.setAttribute(
    'transform',
    `rotate(${discRotationDeg(committed.date, localHour).toFixed(4)})`,
  );
  updateReadouts(committed);
}
citySelect.addEventListener('change', () => {
  chooseCity();
  render();
});
latInput.addEventListener('input', () => {
  citySelect.value = 'custom';
  chooseCity();
  render();
});
for (const input of [epochInput, magInput, dateInput]) input.addEventListener('input', render);
for (const input of [namesInput, linesInput]) input.addEventListener('change', render);
hourInput.addEventListener('input', () => setHour(Number(hourInput.value)));
earlier.addEventListener('click', () => {
  endDrag();
  setHour(Number(hourInput.value) - 0.25);
});
later.addEventListener('click', () => {
  endDrag();
  setHour(Number(hourInput.value) + 0.25);
});

function pointerAngle(event: PointerEvent): number | null {
  const transform = svg.getScreenCTM();
  if (!transform) return null;
  const { x, y } = new DOMPoint(event.clientX, event.clientY).matrixTransform(transform.inverse());
  // Coordinates stay relative to the real pivot in a panned sky-detail view.
  return Math.hypot(x, y) < 2 ? null : (Math.atan2(y, x) * 180) / Math.PI;
}
svg.addEventListener('pointerdown', (event) => {
  if (
    !catalogue ||
    !committed ||
    !parseDateInput(dateInput.value) ||
    !event.isPrimary ||
    event.button !== 0
  )
    return;
  const angle = pointerAngle(event);
  if (angle === null) return;
  pointerId = event.pointerId;
  previousAngle = angle;
  dragHour = committed.localHour;
  svg.setPointerCapture(event.pointerId);
});
svg.addEventListener('pointermove', (event) => {
  if (pointerId !== event.pointerId) return;
  const angle = pointerAngle(event);
  if (angle === null) return;
  // The global SVG y-flip reverses rotation; update mean time itself so the
  // control, readout and printed date/hour alignment always describe one state.
  dragHour -= angleDelta(previousAngle, angle) / 15;
  previousAngle = angle;
  setHour(dragHour);
});
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture'])
  svg.addEventListener(event, endDrag);

const ink = $<HTMLButtonElement>('theme-ink');
const night = $<HTMLButtonElement>('theme-night');
function setTheme(theme: 'ink' | 'night') {
  document.documentElement.dataset.theme = theme === 'night' ? 'night' : 'light';
  ink.setAttribute('aria-pressed', String(theme === 'ink'));
  night.setAttribute('aria-pressed', String(theme === 'night'));
  try {
    localStorage.setItem('planisphere-theme', theme);
  } catch {
    /* storage may be disabled */
  }
}
let savedTheme: string | null = null;
try {
  savedTheme = localStorage.getItem('planisphere-theme');
} catch {
  /* use the system preference */
}
setTheme(
  savedTheme === 'night' || (!savedTheme && matchMedia('(prefers-color-scheme: dark)').matches)
    ? 'night'
    : 'ink',
);
ink.addEventListener('click', () => setTheme('ink'));
night.addEventListener('click', () => setTheme('night'));
exportDisc.addEventListener('click', () => {
  if (catalogue && committed && configFromControls())
    exportDiscSvg(
      catalogue.stars,
      catalogue.constellations,
      committed,
      paper.value as 'a4' | 'letter',
    );
});
exportHolder.addEventListener('click', () => {
  if (committed && configFromControls()) exportHolderSvg(committed, paper.value as 'a4' | 'letter');
});

let generation = 0;
let request: AbortController | null = null;
async function load() {
  const owner = ++generation;
  request?.abort();
  request = new AbortController();
  const controller = request;
  workbench.disabled = true;
  for (const button of [earlier, later, exportDisc, exportHolder]) button.disabled = true;
  fullView.disabled = true;
  detailView.disabled = true;
  loading.hidden = false;
  loading.textContent = 'Loading the star catalogue…';
  retry.textContent = 'Restart catalogue loading';
  retry.hidden = false;
  const timeout = setTimeout(
    () => controller.abort(new Error('Catalogue request timed out.')),
    15_000,
  );
  svg.setAttribute('aria-disabled', 'true');
  try {
    const data = await loadCatalogue(import.meta.env.BASE_URL, controller.signal);
    if (owner !== generation) return;
    catalogue = data;
    workbench.disabled = false;
    loading.hidden = true;
    render();
  } catch (error) {
    if (owner !== generation) return;
    const reason = controller.signal.aborted ? controller.signal.reason : error;
    controller.abort();
    loading.textContent = `${reason instanceof Error ? reason.message : 'Catalogue could not be loaded.'} Check your connection and retry.`;
    retry.textContent = 'Retry loading catalogue';
    retry.hidden = false;
  } finally {
    clearTimeout(timeout);
    if (owner === generation) request = null;
  }
}
retry.addEventListener('click', () => {
  void load();
});
void load();
