// Figures the beam can trace. A figure is a list of strokes { p: [[x, y], ...], e } in a unit box (y down);
// e is the stroke's brightness (1 = full, lower = dim guide lines). place() resamples a figure to exactly N beam samples
// inside a CSS-px rect, inserting fast blanked retrace moves between strokes, so any two figures can morph sample-for-sample.
import { N } from './beam.js'

const TAU = Math.PI * 2
const BLANK = 0.05, JUMP_W = 0.18 // retrace brightness, and how much "time" the beam spends on a jump vs a drawn unit
const circle = (cx, cy, r, n = 40, a0 = 0) => Array.from({ length: n + 1 }, (_, i) => [cx + r * Math.cos(a0 + TAU * i / n), cy + r * Math.sin(a0 + TAU * i / n)])
const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]
const S = (p, e = 1) => ({ p, e })

let seed = 7
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)

/** Resample strokes into N samples placed in rect {x, y, w, h} (CSS px), keeping the figure's aspect `ar` (w/h);
    ax/ay align the fitted figure inside the rect (0 = left/top, 0.5 = centre). */
export function place(strokes, r, ar = 1, ax = 0.5, ay = 0.5, n = N, out = new Float32Array(n * 3)) {
  let w = r.w, h = r.h
  if (w / h > ar) w = h * ar; else h = w / ar
  const ox = r.x + (r.w - w) * ax, oy = r.y + (r.h - h) * ay
  // flatten into weighted segments
  const segs = []
  let prev = null, total = 0
  for (const s of strokes) {
    const pts = s.p.map(([x, y]) => [ox + x * w, oy + y * h])
    if (prev) { const L = Math.hypot(pts[0][0] - prev[0], pts[0][1] - prev[1]) * JUMP_W; segs.push([prev, pts[0], BLANK, L]); total += L }
    for (let i = 1; i < pts.length; i++) { const L = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push([pts[i - 1], pts[i], s.e, L]); total += L }
    prev = pts[pts.length - 1]
  }
  const first = segs[0][0]
  const Lc = Math.hypot(first[0] - prev[0], first[1] - prev[1]) * JUMP_W
  segs.push([prev, first, BLANK, Lc]); total += Lc // close the loop: the beam returns to the start to retrace
  out.drawn = segs.reduce((a, s) => a + (s[2] > BLANK ? s[3] : 0), 0) // drawn length in px, used to even out brightness
  let si = 0, acc = 0
  for (let i = 0; i < n; i++) {
    const target = (i / n) * total
    while (si < segs.length - 1 && acc + segs[si][3] < target) { acc += segs[si][3]; si++ }
    const [a, b, e, L] = segs[si], u = L > 0 ? Math.min(1, (target - acc) / L) : 0
    out[i * 3] = a[0] + (b[0] - a[0]) * u; out[i * 3 + 1] = a[1] + (b[1] - a[1]) * u; out[i * 3 + 2] = e
  }
  return out
}

/** The flat trace a scope shows with no input: a horizontal line. */
export const flat = () => [S([[0, 0.5], [1, 0.5]])]

/** His name from flattened Archivo outlines (name.json, em units, y up). Two stacked lines, or with oneLine the
    words side by side with a word space between (SPACE em). Returns strokes + aspect. */
const SPACE = 0.27
export function nameFigure(json, lineGap = 0.92, oneLine = false) {
  const L = json.lines
  const width = oneLine ? L.reduce((a, l) => a + l.advance, 0) + SPACE * (L.length - 1) : Math.max(...L.map((l) => l.advance))
  const height = oneLine ? lineGap : L.length * lineGap
  const strokes = []
  let x0 = 0
  L.forEach((l, li) => {
    const base = 0.78 + (oneLine ? 0 : li * lineGap)
    for (const c of l.contours) {
      const p = []
      for (let i = 0; i < c.length; i += 2) p.push([(x0 + c[i]) / width, (base - c[i + 1]) / height])
      strokes.push(S(p))
    }
    if (oneLine) x0 += l.advance + SPACE
  })
  return { strokes, ar: width / height }
}

/** The boot trace: a sine across the box, which the intro bends into the name. */
export const sine = (cycles = 6) => [S(Array.from({ length: 481 }, (_, i) => [i / 480, 0.5 - 0.5 * Math.sin((i / 480) * Math.PI * 2 * cycles)]))]

// ------------------------------------------------------------------ one figure per project (unit box)
// Each takes t (seconds) and is live on the scope: a part of it moves. (The dot markers that rode the paths are gone:
// "the bouncing balls, it's just annoying", 2026-10-30.)
/** TactileVLA-Edge: the nine-cell test grid, a pick from the held-out cell, and the drop into the cup. Illustration. */
function pick(t = 0) {
  const st = []
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) st.push(S(rect(0.18 + c * 0.17, 0.2 + r * 0.17, 0.33 + c * 0.17, 0.35 + r * 0.17), 0.45))
  st.push(S(circle(0.84, 0.8, 0.07, 48), 0.9))
  const path = []
  for (let i = 0; i <= 60; i++) { const t = i / 60; path.push([0.06 + (0.5 - 0.06) * t, 0.48 - Math.sin(Math.PI * t) * 0.3]) }
  path.push(...circle(0.5, 0.445, 0.035, 30, Math.PI / 2))
  for (let i = 0; i <= 60; i++) { const t = i / 60; path.push([0.5 + (0.84 - 0.5) * t, 0.48 + (0.8 - 0.48) * t - Math.sin(Math.PI * t) * 0.32]) }
  st.push(S(path, 0.75))
  return st
}
/** Gator Motorsports telemetry: an eye diagram of a serial link (illustration, not a capture). */
function eye() {
  seed = 11
  const st = [S(rect(0.04, 0.12, 0.96, 0.88), 0.35)]
  const lv = (b) => (b ? 0.26 : 0.74), rise = (t) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, t)))
  for (let k = 0; k < 30; k++) {
    const b = [rnd() > 0.5, rnd() > 0.5, rnd() > 0.5], jit = (rnd() - 0.5) * 0.035, p = []
    for (let i = 0; i <= 64; i++) {
      const x = i / 64
      let y = lv(b[0])
      y += (lv(b[1]) - lv(b[0])) * rise((x - 0.25 - jit) / 0.22 + 0.5)
      y += (lv(b[2]) - lv(b[1])) * rise((x - 0.75 - jit) / 0.22 + 0.5)
      p.push([0.04 + x * 0.92, y + (rnd() - 0.5) * 0.012])
    }
    st.push(S(p, 0.3))
  }
  return st
}
/** Zer0Sh0t: a spoken request becomes a motion plan with three targets. Illustration. */
function voice(t = 0) {
  const st = [], w = []
  for (let i = 0; i <= 220; i++) {
    const x = i / 220, env = Math.max(0, Math.sin(x * Math.PI * 5.2 - t * 2.2)) ** 1.6 * (0.6 + 0.4 * Math.sin(x * 13 + t))
    w.push([0.04 + x * 0.42, 0.5 + env * 0.26 * Math.sin(x * 190 - t * 9)])
  }
  st.push(S(w))
  const tg = [[0.66, 0.28], [0.82, 0.64], [0.93, 0.36]]
  const path = [[0.5, 0.5]]
  for (const [x, y] of tg) { const [px, py] = path[path.length - 1]; for (let i = 1; i <= 24; i++) { const t = i / 24; path.push([px + (x - px) * t, py + (y - py) * t - Math.sin(Math.PI * t) * 0.08]) } }
  st.push(S(path, 0.7))
  for (const [x, y] of tg) st.push(S(circle(x, y, 0.04, 36)))
  return st
}
/** Lucid Dreams: 48 synchronized views around one person. Illustration. */
function views(t = 0) {
  const st = []
  for (let i = 0; i < 48; i++) { const a = TAU * i / 48 + t * 0.22; st.push(S([[0.5 + Math.cos(a) * 0.44, 0.5 + Math.sin(a) * 0.44], [0.5 + Math.cos(a) * 0.38, 0.5 + Math.sin(a) * 0.38]], 0.9)) }
  for (let i = 0; i < 12; i++) { const a = TAU * i / 12 + t * 0.22; st.push(S([[0.5 + Math.cos(a) * 0.37, 0.5 + Math.sin(a) * 0.37], [0.5 + Math.cos(a) * 0.12, 0.5 + Math.sin(a) * 0.12]], 0.22)) }
  st.push(S(circle(0.5, 0.36, 0.055, 32, -Math.PI / 2)))
  st.push(S([[0.43, 0.68], [0.43, 0.5], [0.46, 0.44], [0.54, 0.44], [0.57, 0.5], [0.57, 0.68]]))
  return st
}
/** Sixth Sense: the camera's view, one detection and its distance. Illustration. */
function frustum(t = 0) {
  const st = [S([[0.08, 0.16], [0.5, 0.94], [0.92, 0.16]], 0.6), S([[0.08, 0.16], [0.92, 0.16]], 0.35)]
  const b = [0.38, 0.34, 0.62, 0.7], c = 0.05
  for (const [x, y, dx, dy] of [[b[0], b[1], 1, 1], [b[2], b[1], -1, 1], [b[2], b[3], -1, -1], [b[0], b[3], 1, -1]]) st.push(S([[x + dx * c, y], [x, y], [x, y + dy * c]]))
  for (let i = 0; i < 7; i++) { const y = 0.9 - i * 0.03; st.push(S([[0.485, y], [0.515, y]], 0.7)) }
  const y = 0.18 + ((t * 0.35) % 1) * 0.72, hw = 0.42 * (1 - (y - 0.16) / 0.78)
  st.push(S([[0.5 - hw + 0.01, y], [0.5 + hw - 0.01, y]], 0.5))
  return st
}
/** Midnight Decode: flywheel shots arcing into the goal. Illustration. */
function arcs(t = 0) {
  const st = [S(circle(0.13, 0.8, 0.07, 44)), S(rect(0.8, 0.18, 0.95, 0.3), 0.8)]
  for (let k = 0; k < 5; k++) {
    const p = [], ex = 0.86 + (k - 2) * 0.012, peak = 0.08 + k * 0.025
    for (let i = 0; i <= 50; i++) { const t = i / 50; p.push([0.17 + (ex - 0.17) * t, 0.75 + (0.24 - 0.75) * t - Math.sin(Math.PI * t) * (0.25 + peak)]) }
    st.push(S(p, 0.5))
  }
  return st
}
/** Midnight Into the Deep: the field, and a five-specimen autonomous path. Illustration. */
function field(t = 0) {
  const st = [S(rect(0.1, 0.1, 0.9, 0.9), 0.6)]
  for (let i = 1; i < 6; i++) { const v = 0.1 + i * 0.8 / 6; st.push(S([[v, 0.1], [v, 0.9]], 0.22), S([[0.1, v], [0.9, v]], 0.22)) }
  const wp = [[0.2, 0.82], [0.32, 0.45], [0.5, 0.3], [0.62, 0.58], [0.78, 0.36], [0.82, 0.18]]
  const p = []
  for (let k = 0; k < wp.length - 1; k++) { const [a, b] = [wp[k], wp[k + 1]]; for (let i = 0; i <= 20; i++) { const t = i / 20; p.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + Math.sin(Math.PI * t) * 0.04]) } }
  st.push(S(p, 0.75))
  for (const [x, y] of wp.slice(1)) st.push(S(rect(x - 0.02, y - 0.02, x + 0.02, y + 0.02), 0.9))
  return st
}
/** RL LDPC decoding: the Tanner graph of a small parity-check code (structure, not his matrix). */
function tanner() {
  const st = [], vx = (i) => 0.08 + i * 0.84 / 9, cx = (j) => 0.16 + j * 0.68 / 4
  const H = [[0, 1, 3, 6], [1, 2, 4, 7], [0, 4, 5, 8], [2, 3, 5, 9], [6, 7, 8, 9]]
  H.forEach((row, j) => row.forEach((i) => st.push(S([[vx(i), 0.27], [cx(j), 0.73]], 0.42))))
  for (let i = 0; i < 10; i++) st.push(S(circle(vx(i), 0.22, 0.035, 28)))
  for (let j = 0; j < 5; j++) st.push(S(rect(cx(j) - 0.035, 0.73, cx(j) + 0.035, 0.8)))
  return st
}
/** About: a noisy signal on the left resolving into a clean one on the right. */
function signal() {
  seed = 5
  const p = []
  for (let i = 0; i <= 400; i++) { const x = i / 400, clean = Math.sin(x * Math.PI * 6), noise = (rnd() - 0.5) * 1.6 * (1 - Math.min(1, x / 0.6)) ** 1.5; p.push([x, 0.5 + 0.2 * (clean + noise)]) }
  return [S(p)]
}
/** Contact: a 3:2 Lissajous, the figure a scope draws from two clean tones. */
function lissajous() {
  return [S(Array.from({ length: 721 }, (_, i) => { const t = TAU * i / 720; return [0.5 + 0.44 * Math.sin(3 * t + Math.PI / 2), 0.5 + 0.44 * Math.sin(2 * t)] }))]
}

export const FIGURES = { pick, eye, voice, views, frustum, arcs, field, tanner, signal, lissajous }
