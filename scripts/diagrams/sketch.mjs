// Tiny hand-drawn SVG builder on top of rough.js.
//
// Output SVGs are inlined into lesson pages by <SketchFigure>, so colours are CSS
// variables (--sk-*) defined in src/index.css and follow the light/dark theme.
// Fixed seeds make every run produce byte-identical files (clean git diffs).
import rough from 'roughjs';

const gen = rough.generator();

export const C = {
  ink: 'var(--sk-ink)',
  muted: 'var(--sk-muted)',
  blue: 'var(--sk-blue)',
  amber: 'var(--sk-amber)',
  green: 'var(--sk-green)',
  rose: 'var(--sk-rose)',
  violet: 'var(--sk-violet)',
  note: 'var(--sk-note)',
  // soft solid fills for boxes that contain text
  blueSoft: 'var(--sk-blue-soft)',
  amberSoft: 'var(--sk-amber-soft)',
  greenSoft: 'var(--sk-green-soft)',
  roseSoft: 'var(--sk-rose-soft)',
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const trim = (d) => d.replace(/-?\d+\.\d+/g, (n) => (+n).toFixed(1));

export class Sketch {
  constructor(width, height, { title, seed = 11 } = {}) {
    this.w = width;
    this.h = height;
    this.title = title;
    this.seed = seed;
    this.out = [];
  }

  _opts(o = {}) {
    const { color = C.ink, width = 1.8, fill, fillStyle = 'hachure', ...rest } = o;
    return {
      seed: this.seed++,
      roughness: 1.2,
      bowing: 1.2,
      stroke: color,
      strokeWidth: width,
      fill,
      fillStyle,
      hachureGap: 6,
      fillWeight: 1.2,
      ...rest,
    };
  }

  _emit(drawable, { dash } = {}) {
    for (const p of gen.toPaths(drawable)) {
      const style = [`stroke:${p.stroke}`, `fill:${p.fill || 'none'}`];
      if (dash) style.push(`stroke-dasharray:${dash}`);
      this.out.push(
        `<path d="${trim(p.d)}" style="${style.join(';')}" stroke-width="${p.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`,
      );
    }
    return this;
  }

  raw(svg) {
    this.out.push(svg);
    return this;
  }

  rect(x, y, w, h, o = {}) {
    return this._emit(gen.rectangle(x, y, w, h, this._opts(o)), o);
  }

  circle(cx, cy, d, o = {}) {
    return this._emit(gen.circle(cx, cy, d, this._opts(o)), o);
  }

  line(x1, y1, x2, y2, o = {}) {
    return this._emit(gen.line(x1, y1, x2, y2, this._opts(o)), o);
  }

  arrow(x1, y1, x2, y2, o = {}) {
    const { head = 12, ...rest } = o;
    this.line(x1, y1, x2, y2, rest);
    const a = Math.atan2(y2 - y1, x2 - x1);
    for (const s of [-1, 1]) {
      const b = a + Math.PI + s * 0.45;
      this.line(x2, y2, x2 + head * Math.cos(b), y2 + head * Math.sin(b), rest);
    }
    return this;
  }

  // Quadratic-ish curved arrow through a control point.
  curveArrow(x1, y1, cx, cy, x2, y2, o = {}) {
    const { head = 12, ...rest } = o;
    this._emit(gen.curve([[x1, y1], [cx, cy], [x2, y2]], this._opts(rest)), rest);
    const a = Math.atan2(y2 - cy, x2 - cx);
    for (const s of [-1, 1]) {
      const b = a + Math.PI + s * 0.45;
      this.line(x2, y2, x2 + head * Math.cos(b), y2 + head * Math.sin(b), rest);
    }
    return this;
  }

  // Grid of cells (a matrix sketch). Optional highlighted row.
  grid(x, y, rows, cols, cell, o = {}) {
    const { hiRow, hiColor = C.amber, ...rest } = o;
    if (hiRow !== undefined) {
      this.rect(x, y + hiRow * cell, cols * cell, cell, { color: hiColor, fill: hiColor, width: 1, roughness: 0.8 });
    }
    this.rect(x, y, cols * cell, rows * cell, rest);
    for (let r = 1; r < rows; r++) this.line(x, y + r * cell, x + cols * cell, y + r * cell, { ...rest, width: 0.8, color: C.muted });
    for (let c = 1; c < cols; c++) this.line(x + c * cell, y, x + c * cell, y + rows * cell, { ...rest, width: 0.8, color: C.muted });
    return this;
  }

  // Handwritten text. `lines` may be a string or an array of strings.
  text(x, y, lines, o = {}) {
    const { size = 22, anchor = 'middle', color = C.ink, font = 'hand', weight, rotate } = o;
    const arr = Array.isArray(lines) ? lines : [lines];
    const lh = size * 1.1;
    const tf = rotate ? ` transform="rotate(${rotate} ${x} ${y})"` : '';
    const fw = weight ? ` font-weight="${weight}"` : '';
    const spans = arr
      .map((t, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : lh}">${esc(t)}</tspan>`)
      .join('');
    this.out.push(
      `<text x="${x}" y="${y}" class="sk-${font}" font-size="${size}" text-anchor="${anchor}" style="fill:${color}"${fw}${tf}>${spans}</text>`,
    );
    return this;
  }

  // Sticky note with handwritten lines, slightly rotated.
  note(x, y, w, h, lines, o = {}) {
    const { size = 21, rotate = -1.5, color = C.ink } = o;
    this.out.push(`<g transform="rotate(${rotate} ${x + w / 2} ${y + h / 2})">`);
    this.rect(x, y, w, h, { color: C.amber, fill: C.note, fillStyle: 'solid', width: 1.2, roughness: 0.9 });
    this.text(x + 14, y + size + 8, lines, { size, anchor: 'start', color });
    this.out.push('</g>');
    return this;
  }

  toString() {
    const t = esc(this.title || 'diagram');
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.w} ${this.h}" role="img" aria-label="${t}" class="sketch">` +
      `<title>${t}</title>\n${this.out.join('\n')}\n</svg>\n`
    );
  }
}
