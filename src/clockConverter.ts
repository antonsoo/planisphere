import { type ClockField, civilToMeanTime } from './astro/civilTime.js';
import { formatHour } from './controls.js';

/** A draft conversion never changes the wheel until the user applies it. */
export class ClockConverter {
  private inputs: Record<ClockField, HTMLInputElement>;
  private result: HTMLElement;
  private applied: HTMLElement;
  private button: HTMLButtonElement;

  constructor(root: HTMLElement, apply: (date: string, hour: number) => boolean) {
    const get = <T extends HTMLElement>(selector: string): T => {
      const node = root.querySelector<T>(selector);
      if (!node) throw new Error(`Missing clock converter element: ${selector}`);
      return node;
    };
    this.inputs = {
      civil: get('#civil-clock'),
      offset: get('#civil-offset'),
      longitude: get('#civil-longitude'),
    };
    this.result = get('#clock-result');
    this.applied = get('#clock-applied');
    this.button = get('#clock-apply');
    for (const input of Object.values(this.inputs))
      input.addEventListener('input', () => this.update());
    this.button.addEventListener('click', () => {
      const conversion = this.update();
      if (conversion.ok && apply(conversion.wheelDate, conversion.wheelHour)) {
        this.applied.textContent = `Wheel set to ${conversion.wheelDate} at ${formatHour(conversion.wheelHour)} local mean time.`;
      }
    });
    this.update();
  }

  setLongitude(longitude: number | null) {
    this.inputs.longitude.value = longitude === null ? '' : String(longitude);
    this.update();
  }

  clearApplied() {
    this.applied.textContent = '';
  }

  private update() {
    this.clearApplied();
    const conversion = civilToMeanTime(
      this.inputs.civil.value,
      this.inputs.offset.value,
      this.inputs.longitude.value,
    );
    for (const [field, input] of Object.entries(this.inputs)) {
      input.setAttribute(
        'aria-invalid',
        String(Boolean(input.value) && !conversion.ok && conversion.field === field),
      );
    }
    this.button.disabled = !conversion.ok;
    if (!conversion.ok) {
      this.result.textContent = conversion.message;
      return conversion;
    }
    const stamp = (value: Date) =>
      value
        .toISOString()
        .slice(0, 23)
        .replace('T', ' ')
        .replace(/\.000$/, '');
    const rounding =
      conversion.roundingSeconds === 0
        ? 'No rounding needed.'
        : `Nearest quarter-hour: ${Math.abs(conversion.roundingSeconds).toFixed(1)} seconds ${conversion.roundingSeconds < 0 ? 'earlier' : 'later'}.`;
    this.result.replaceChildren();
    const lines = [
      `UTC: ${stamp(conversion.utc)}`,
      `Mean time: ${stamp(conversion.meanTime)}`,
      `Wheel: ${conversion.wheelDate} ${formatHour(conversion.wheelHour)}`,
      rounding,
    ];
    for (const text of lines) {
      const line = document.createElement('p');
      line.textContent = text;
      this.result.appendChild(line);
    }
    return conversion;
  }
}
