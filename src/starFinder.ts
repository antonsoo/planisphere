import {
  bestWindowHour,
  buildStarEvidence,
  inspectStar,
  searchStars,
  starName,
} from './astro/inspectStar.js';
import type { CatalogueStar } from './astro/starPosition.js';
import type { Catalogue } from './data/loadCatalogue.js';
import { escapeXml } from './render/artwork.js';
import type { PlanisphereConfig } from './render/types.js';

const epochLabel = (year: number) => (year <= 0 ? `${1 - year} BCE` : `${year} CE`);
const fixed = (value: number, places = 3) => value.toFixed(places);
const raLabel = (ra: number) => `${fixed(ra / 15, 5)} h`;
const decLabel = (dec: number) => `${dec >= 0 ? '+' : ''}${fixed(dec, 5)}°`;
const STATES: Record<string, string> = {
  'outside-disc': 'Outside this latitude’s printed sky field',
  'fainter-than-limit': 'Fainter than the chosen magnitude limit',
  'below-horizon': 'At or below the geometric horizon',
  'behind-hub': 'Above the horizon, hidden by the center hub',
  'behind-support': 'Above the horizon, hidden by a paper support',
  'in-window': 'Star center is visible through the holder',
};

/** A bounded catalogue index beside the existing physical chart. */
export class StarFinder {
  private catalogue: Catalogue | null = null;
  private config: PlanisphereConfig | null = null;
  private selected: CatalogueStar | null = null;
  private valid = false;
  private fieldset: HTMLFieldSetElement;
  private search: HTMLInputElement;
  private results: HTMLElement;
  private detail: HTMLElement;
  private count: HTMLElement;

  constructor(
    private container: HTMLElement,
    private svg: SVGSVGElement,
    private callbacks: {
      locate: () => void;
      setHour: (hour: number) => void;
      include: (magnitude: number) => void;
    },
  ) {
    container.innerHTML = `<h2>Find a star</h2><p class="finder-intro">Follow a point on the wheel back to its catalogue record and the sky at your selected epoch.</p>
      <fieldset disabled><legend class="sr-only">Catalogue search and star evidence</legend>
      <label class="star-search-label" for="star-search">Name, designation, or catalogue ID</label>
      <input id="star-search" type="search" maxlength="100" placeholder="Sirius, 61 Cyg, HIP 104214" autocomplete="off" aria-describedby="star-search-status">
      <div class="star-examples"><span>Try</span><button type="button" data-hip="11767">Polaris</button><button type="button" data-hip="69673">Arcturus</button><button type="button" data-hip="104214">61 Cyg</button></div>
      <p id="star-search-status" class="hint" role="status">Search the 2,865-star catalogue, including stars hidden by your current settings.</p>
      <ul class="star-results" aria-label="Matching stars"></ul>
      <div class="star-detail" id="star-detail"></div></fieldset>`;
    const required = <T extends Element>(selector: string): T => {
      const element = container.querySelector<T>(selector);
      if (!element) throw new Error(`Missing star finder element: ${selector}`);
      return element;
    };
    this.fieldset = required('fieldset');
    this.search = required('#star-search');
    this.results = required('.star-results');
    this.detail = required('.star-detail');
    this.count = required('#star-search-status');
    this.search.addEventListener('input', () => this.renderResults());
    container.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
      if (!button || !this.catalogue) return;
      const star = button.dataset.hip
        ? this.catalogue.stars.find((star) => star.hip === Number(button.dataset.hip))
        : button.dataset.starId
          ? this.catalogue.stars.find((star) => star.id === Number(button.dataset.starId))
          : undefined;
      if (star) {
        this.selected = star;
        this.renderDetail();
        this.renderMarker();
        for (const item of this.results.querySelectorAll<HTMLButtonElement>('button'))
          item.setAttribute('aria-pressed', String(Number(item.dataset.starId) === star.id));
      }
      if (button.id === 'locate-star' && this.valid) this.callbacks.locate();
      if (button.id === 'include-star' && this.selected && this.valid)
        this.callbacks.include(this.selected.mag);
      if (button.id === 'star-window-time' && this.selected && this.config && this.valid) {
        const hour = bestWindowHour(this.selected, this.config);
        if (hour !== null) this.callbacks.setHour(hour);
      }
      if (button.id === 'export-star' && this.selected && this.config && this.valid) {
        const evidence = buildStarEvidence(this.selected, this.config, this.catalogue.provenance);
        const url = URL.createObjectURL(
          new Blob([`${JSON.stringify(evidence, null, 2)}\n`], { type: 'application/json' }),
        );
        const link = document.createElement('a');
        link.href = url;
        link.download = `planisphere-star-${this.selected.id}-epoch-${this.config.epochYear}.json`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    });
  }

  setCatalogue(catalogue: Catalogue) {
    this.catalogue = catalogue;
    if (this.selected)
      this.selected = catalogue.stars.find((star) => star.id === this.selected?.id) ?? null;
    this.fieldset.disabled = false;
    this.renderResults();
  }

  update(config: PlanisphereConfig | null, valid: boolean) {
    if (config) this.config = config;
    this.valid = valid;
    this.renderDetail();
    this.renderMarker();
  }

  setLoading() {
    this.fieldset.disabled = true;
  }

  private renderResults() {
    if (!this.catalogue) return;
    const found = searchStars(this.catalogue.stars, this.search.value);
    this.count.textContent = !this.search.value.trim()
      ? `Search ${this.catalogue.stars.length.toLocaleString('en-US')} stars, or choose an example.`
      : found.length
        ? `Showing ${Math.min(12, found.length)} of ${found.length} matches. Refine the search to narrow the list.`
        : 'No matching star. Try a name, constellation abbreviation, or HIP/HYG number.';
    this.results.innerHTML = found
      .slice(0, 12)
      .map(
        (star) =>
          `<li><button type="button" data-star-id="${star.id}" aria-pressed="${star.id === this.selected?.id}" aria-controls="star-detail"><span>${escapeXml(starName(star))}</span><small>${star.hip !== null ? `HIP ${star.hip}` : `HYG ${star.id}`} · mag ${fixed(star.mag, 2)}</small></button></li>`,
      )
      .join('');
  }

  private renderDetail() {
    if (!this.selected || !this.config) {
      this.detail.innerHTML = '';
      return;
    }
    const focused = this.container.contains(document.activeElement)
      ? (document.activeElement as HTMLElement).id
      : '';
    const assumptionsOpen = this.detail.querySelector<HTMLDetailsElement>('details')?.open ?? false;
    const star = this.selected;
    const config = this.config;
    const result = inspectStar(star, config);
    const bestHour = bestWindowHour(star, config);
    const disabled = this.valid ? '' : 'disabled';
    const perspective =
      star.distancePc == null
        ? 'Distance is unavailable or dubious. Radial perspective is omitted.'
        : star.radialVelocityKmSec == null
          ? 'Radial velocity is unavailable; this model assumes zero.'
          : star.radialVelocityKmSec === 0
            ? 'The catalogue supplies zero radial velocity; measurement completeness is unspecified.'
            : 'Distance and radial velocity are included in the motion calculation.';
    this.detail.innerHTML = `<header><div><p class="finder-kicker">Catalogue record</p><h3>${escapeXml(starName(star))}</h3><p class="star-identifiers">HYG ${star.id}${star.hip !== null ? ` · HIP ${star.hip}` : ''}${star.bayer ? ` · ${escapeXml(star.bayer)} ${escapeXml(star.con)}` : ''}</p></div><div class="star-epoch">${epochLabel(config.epochYear)}<small>selected stellar epoch</small></div></header>
      <p class="star-visibility" role="status">${STATES[result.state]}</p>
      ${!this.valid ? '<p class="control-error">The date draft is invalid. Evidence below retains the last valid chart; actions are paused.</p>' : ''}
      <div class="star-actions"><button type="button" id="locate-star" ${!result.onDisc ? 'disabled' : disabled}>Locate on uncovered disc</button><button type="button" id="star-window-time" ${bestHour === null ? 'disabled' : disabled}>Set a visible time</button>${!result.includedByMagnitude ? `<button type="button" id="include-star" ${disabled}>Include this magnitude</button>` : ''}<button type="button" id="export-star" ${disabled}>Download star evidence</button></div>
      <p class="hint">Visible time chooses the highest star-center altitude through a window among the 15-minute settings. ${bestHour === null ? 'No such setting exists for this epoch and holder.' : 'It changes mean time only.'} The locator is a preview guide; print files stay unmarked.</p>
      <dl class="star-observation"><div><dt>Altitude</dt><dd>${fixed(result.altitudeDeg, 2)}°</dd></div><div><dt>Azimuth, from north</dt><dd>${result.azimuthDeg === null ? 'Undefined at zenith/nadir' : `${fixed(result.azimuthDeg, 2)}°`}</dd></div><div><dt>Catalogue magnitude</dt><dd>${fixed(star.mag, 2)}</dd></div><div><dt>Motion from J2000</dt><dd>${fixed(result.motionDisplacementDeg, 4)}°</dd></div></dl>
      <div class="star-coordinate-scroll" tabindex="0" role="region" aria-label="Star coordinate transformations"><table class="star-coordinates"><caption>From catalogue to the printed point</caption><thead><tr><th scope="col">Coordinate step</th><th scope="col">Right ascension</th><th scope="col">Declination</th></tr></thead><tbody>
      <tr><th scope="row">J2000 catalogue</th><td>${raLabel(star.ra)}</td><td>${decLabel(star.dec)}</td></tr><tr><th scope="row">After motion, J2000 axes</th><td>${raLabel(result.moved.ra)}</td><td>${decLabel(result.moved.dec)}</td></tr><tr><th scope="row">Mean axes of ${epochLabel(config.epochYear)}</th><td>${raLabel(result.position.ra)}</td><td>${decLabel(result.position.dec)}</td></tr></tbody></table></div>
      <details class="star-assumptions" ${assumptionsOpen ? 'open' : ''}><summary>Motion inputs and limits</summary><dl><div><dt>RA motion, including cos(dec)</dt><dd>${fixed(star.pmRa)} mas/year</dd></div><div><dt>Declination motion</dt><dd>${fixed(star.pmDec)} mas/year</dd></div><div><dt>Distance</dt><dd>${star.distancePc == null ? 'Unavailable / dubious' : `${fixed(star.distancePc, 4)} pc`}</dd></div><div><dt>Radial velocity, receding positive</dt><dd>${star.radialVelocityKmSec == null ? 'Unavailable' : `${fixed(star.radialVelocityKmSec, 2)} km/s`}</dd></div></dl><p>${perspective}</p><p>Constant space velocity, followed by P03 precession. Light travel time, relativistic effects, binary orbits, atmospheric refraction, and changing brightness are not modeled. Catalogue values are not precise reconstructions of ancient observing conditions.</p></details>
      <p class="hint">Geometric sky for latitude ${fixed(config.latDeg, 1)}°, date ring ${config.date.toISOString().slice(0, 10)}, mean time ${fixed(config.localHour, 2)} h. The date ring and stellar epoch are independent. HYG v4.1 · CC BY-SA 4.0.</p>`;
    if (focused) {
      const next = this.container.querySelector<HTMLElement>(`#${focused}`);
      // Including a star removes that action; leave the keyboard at the next
      // useful action rather than dropping focus to the page body.
      const fallback =
        focused === 'include-star'
          ? this.detail.querySelector<HTMLButtonElement>('button:not([disabled])')
          : null;
      (next ?? fallback)?.focus({ preventScroll: true });
    }
  }

  private renderMarker() {
    this.svg.querySelector('.star-locator')?.remove();
    if (!this.selected || !this.config) return;
    const result = inspectStar(this.selected, this.config);
    if (!result.onDisc) return;
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    marker.setAttribute('class', 'star-locator');
    marker.setAttribute('data-preview-only', 'true');
    marker.setAttribute('data-star-id', String(this.selected.id));
    marker.setAttribute('aria-hidden', 'true');
    marker.setAttribute('transform', `translate(${result.discPointMm.x},${result.discPointMm.y})`);
    marker.innerHTML = '<circle r="1.6"/><path d="M -3 0 H -2 M 2 0 H 3 M 0 -3 V -2 M 0 2 V 3"/>';
    this.svg.querySelector('.disc-rotator')?.append(marker);
  }
}
