// One clock: gsap.ticker drives Lenis, then the beam frame. The beam is a screen-blended overlay tracing ONE figure of
// N samples for the whole page, handed down a chain of stations as you scroll:
//   name (over the transparent h1) -> scope (projects) -> logic analyzer (experience) -> patch bay (tech stack) -> Lissajous
// Between two stations every sample flies, in drawing order, as a ribbon of light (with longer phosphor trails while in
// flight). Inside a station the figure morphs sample-for-sample when you pick something: a project, a role, a tool.
import { gsap } from './lib/gsap/index.js'
import { ScrambleTextPlugin } from './lib/gsap/ScrambleTextPlugin.js'
import Lenis from './lib/lenis/dist/lenis.mjs'
import { createBeam, N } from './beam.js'
import { FIGURES, place, sine, nameFigure } from './figures.js'
import cut from './fx/cut.js'
import spray from './fx/spray.js'
import degauss from './fx/degauss.js'

gsap.registerPlugin(ScrambleTextPlugin)
const $ = (s, r = document) => r.querySelector(s)
const $$ = (s, r = document) => [...r.querySelectorAll(s)]
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches
const PERF = new URLSearchParams(location.search).has('perf')

const canvas = $('#scope')
// light-only effects from web/fx (the effects partner's modules): degauss drags a wake through the light behind the
// cursor and wobbles it on a click, in the station colour. ?fx=a,b picks a set, ?fx= none.
// Off by his call (2026-10-30): the cut's dashed retrace front ("kinda ahh"), every rainbow/RGB split on scroll, and
// anything that flies loose across the page: the spray's sparks, the phosphor dust, the flight's depth tangle
// ("these annoying balls going everywhere").
const FXQ = new URLSearchParams(location.search), FXS = { cut, spray, degauss }
const fx = reduce ? [] : (FXQ.has('fx') ? FXQ.get('fx').split(',') : ['degauss']).map((n) => FXS[n]).filter(Boolean)
const beam = createBeam(canvas, { fx })
if (beam) start().catch((e) => { console.error(e); document.documentElement.classList.remove('beam'); canvas.style.display = 'none'; document.querySelector('.boot')?.remove() })
else { canvas.style.display = 'none'; document.querySelector('.boot')?.remove() }
setTimeout(() => document.querySelector('.boot')?.remove(), 6000) // whatever happens, never leave the screen covered

const smooth = (u) => { u = Math.min(1, Math.max(0, u)); return u * u * (3 - 2 * u) }
const stag = (m, k) => smooth(m * 1.35 - (k / N) * 0.35) // a new figure is written in drawing order
const S = (p, e = 1) => ({ p, e })
/** Strokes given in a station's own px -> N samples (place() with the box set to exactly the station's size). */
const px = (strokes, w, h, out) => place(strokes.map((s) => S(s.p.map(([x, y]) => [x / w, y / h]), s.e)), { x: 0, y: 0, w, h }, w / h, 0, 0, N, out)
const ring = (x, y, r = 3.5) => Array.from({ length: 25 }, (_, n) => [x + r * Math.cos(n / 24 * Math.PI * 2), y + r * Math.sin(n / 24 * Math.PI * 2)])

/** A station: an element whose rect is read each frame, and figures (in its local px) it can morph between. */
function station(el, get, { arc = 60, dur = 1.15, before, after, cache = true } = {}) {
  const st = { el, from: new Float32Array(N * 3), T: null, toI: 0, mt: { v: 1 }, dFrom: 1, dTo: 1, arc, w: 0, h: 0, memo: new Map() }
  st.fig = (i) => { if (cache && st.memo.has(i)) return st.memo.get(i); const f = get(i, st.w, st.h); if (cache) st.memo.set(i, f); return f }
  st.size = () => {
    const r = el.getBoundingClientRect()
    if (r.width === st.w && r.height === st.h && st.T) return
    st.w = r.width; st.h = r.height; st.memo.clear()
    st.T = st.fig(st.toI); st.from.set(st.T); st.dFrom = st.dTo = N / st.T.drawn; st.mt.v = 1
  }
  st.show = (i) => {
    if (i === st.toI) return
    const T = st.T
    for (let k = 0; k < N; k++) { const u = stag(st.mt.v, k), j = k * 3; for (let c = 0; c < 3; c++) st.from[j + c] += (T[j + c] - st.from[j + c]) * u }
    st.dFrom += (st.dTo - st.dFrom) * st.mt.v
    st.toI = i; before?.(i)
    st.T = st.fig(i); st.dTo = N / st.T.drawn
    st.mt.v = reduce ? 1 : 0
    if (!reduce) gsap.to(st.mt, { v: 1, duration: dur, ease: 'expo.inOut', overwrite: true })
    after?.(i)
  }
  st.density = () => st.dFrom + (st.dTo - st.dFrom) * st.mt.v
  return st
}

async function start() {
  const nameJson = await (await fetch(new URL('./name.json', import.meta.url))).json()
  await document.fonts.ready
  let NAME = nameFigure(nameJson, 0.92, innerWidth > 760) // one line on wide screens, matching the h1
  document.documentElement.classList.add('beam')
  // scatter for flights and morphs: smooth along the trace (neighbours move together), so the figure bends into a
  // continuous ribbon; per-sample random scatter would render invisible, since segment energy is divided by length
  const jx = new Float32Array(N), jy = new Float32Array(N), jz = new Float32Array(N) // jz: depth, for the flight camera
  for (let k = 0; k < N; k++) {
    jz[k] = 0.6 * Math.sin(k * 0.0017 + 0.2) + 0.4 * Math.sin(k * 0.0071 + 3.3)
    // only long wavelengths: the short ones curled the ribbon into tangles of little loops in flight (2026-10-30)
    jx[k] = 0.7 * Math.sin(k * 0.0029 + 1.3) + 0.3 * Math.sin(k * 0.0061 + 0.4)
    jy[k] = 0.7 * Math.sin(k * 0.0023 + 4.1) + 0.3 * Math.sin(k * 0.0057 + 2.6)
  }

  // ---------------------------------------------------------------- station 1: the scope (projects)
  const rows = $$('.proj'), bench = $('.bench'), screen = $('.scope .screen')
  const PFIG = rows.map((r) => ({ n: r.dataset.fig, s: FIGURES[r.dataset.fig](), ar: r.dataset.fig === 'signal' ? 2.4 : 1 }))
  const liveBuf = new Float32Array(N * 3), bayBuf = new Float32Array(N * 3) // the scope's and the board's figures, re-placed every frame while live
  const st = $('.scope .st'), sk = $('.scope .sk'), read = $('.scope .read')
  function readout(i, animate) {
    const r = rows[i], g = JSON.parse(r.dataset.glance)
    st.textContent = $('.pt b', r).textContent; sk.textContent = r.dataset.kind
    read.replaceChildren(...g.map(([v, l]) => {
      const d = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd')
      dd.textContent = l; d.append(dt, dd)
      if (animate) gsap.to(dt, { duration: 0.8, scrambleText: { text: v, chars: '0123456789', speed: 0.7 } }); else dt.textContent = v
      return d
    }))
    rows.forEach((x, n) => x.classList.toggle('on', n === i))
  }
  const SCOPE = station(screen, (i, w, h) => place(PFIG[i].s, { x: w * 0.07, y: h * 0.1, w: w * 0.86, h: h * 0.8 }, PFIG[i].ar), { after: (i) => { readout(i, !reduce); sfx.blip(880 + i * 60); if (!reduce) { screen.classList.remove('blip'); void screen.offsetWidth; screen.classList.add('blip') } } })
  readout(0, false)

  // ---------------------------------------------------------------- station 2: the logic analyzer (experience)
  const chans = $$('.chan'), roles = $$('.role'), laScreen = $('.la-screen')
  function busFigure(sel, w, h) { // each role is a data bus while it was active; the selected channel is lit
    const sr = laScreen.getBoundingClientRect(), strokes = []
    const step = Math.max(28, w / 24), d = 5
    chans.forEach((c, i) => {
      const lr = $('.lane', c).getBoundingClientRect(), cy = lr.top + lr.height / 2 - sr.top, hh = lr.height * 0.36
      const xa = (+c.dataset.a / 100) * w, xb = (+c.dataset.b / 100) * w, live = c.dataset.live === '1'
      const on = i === sel ? 1 : 0.42, idle = i === sel ? 0.3 : 0.16
      strokes.push(S([[0, cy], [Math.max(0, xa - d), cy]], idle))
      const xs = [xa]; for (let x = xa + step; x < xb - step * 0.5; x += step) xs.push(x); xs.push(xb)
      // two rails that swap at every crossing: pass 0 runs left to right on alternating rails, pass 1 returns on the
      // others. A live role's bus is not closed: both rails run on, open, past the "now" line.
      const last = xs.length - 2, tip = xb, rail = (n, pass) => ((n + pass) % 2 === 0 ? cy - hh : cy + hh)
      const pts0 = [[xa - d, cy]], pts1 = live ? [] : [[xb + d, cy]]
      for (let n = 0; n <= last; n++) pts0.push([xs[n] + d, rail(n, 0)], [n === last && live ? tip : xs[n + 1] - d, rail(n, 0)])
      if (!live) pts0.push([xb + d, cy])
      for (let n = last; n >= 0; n--) pts1.push([n === last && live ? tip : xs[n + 1] - d, rail(n, 1)], [xs[n] + d, rail(n, 1)])
      pts1.push([xa - d, cy])
      strokes.push(S(pts0, on), S(pts1, on))
      if (live) for (const y of [cy - hh, cy + hh]) for (let q = 0; q < 6; q++) { // still going: both rails fade out past now
        const x0 = Math.min(w - 2, xb + q * 6), x1 = Math.min(w - 2, x0 + 6); if (x1 > x0) strokes.push(S([[x0, y], [x1, y]], on * (1 - (q + 1) / 6.5)))
      }
      if (!live) strokes.push(S([[xb + d, cy], [w, cy]], idle))
    })
    const now = (+chans[0].dataset.b / 100) * w // the first role is live, so its end is "now"
    for (let y = 4; y < h - 26; y += 9) strokes.push(S([[now, y], [now, y + 4]], 0.32))
    return px(strokes, w, h)
  }
  const LA = station(laScreen, (i, w, h) => busFigure(i, w, h), {
    arc: 0, dur: 0.5,
    after: (i) => {
      sfx.blip(660 + i * 50, 0.05)
      chans.forEach((c, n) => c.classList.toggle('on', n === i))
      roles.forEach((r, n) => r.classList.toggle('on', n === i))
      fitRole(i) // measure once it is displayed
      if (!reduce) gsap.fromTo(roles[i], { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'expo.out', overwrite: true })
    },
  })
  chans.forEach((c, i) => {
    const b = $('button', c), go = () => LA.show(i)
    if (fine) c.addEventListener('pointerenter', go)
    b.addEventListener('focus', go)
    b.addEventListener('click', () => { go(); if (pinned && lenis) lenis.scrollTo(expA + ((expB - expA) * (i + 0.5)) / chans.length) })
  })
  chans[0].classList.add('on'); roles[0].classList.add('on')
  const track = $('.track'), laDetail = $('.la-detail'), playhead = $('.playhead'), phX = gsap.quickSetter(playhead, 'x', 'px')
  function fitRole(i) { // zoom a long role card down until it fits under the pinned diagram (never below 0.62)
    const r = roles[i]; r.style.zoom = 1
    if (!pinned) return
    const avail = laDetail.clientHeight - 28, need = r.scrollHeight
    if (need <= avail) return
    // columns reflow as the zoom changes, so height is not linear in zoom: binary-search the largest zoom that fits
    let lo = 0.62, hi = Math.min(1, avail / need + 0.25)
    for (let n = 0; n < 7; n++) { const z = (lo + hi) / 2; r.style.zoom = z.toFixed(3); if (r.getBoundingClientRect().height <= avail) lo = z; else hi = z }
    r.style.zoom = lo.toFixed(3)
  }

  // ---------------------------------------------------------------- station 3: the stack
  // Wide screens: a circuit board (below). Every tool sits on an edge, every project and role is a chip, and the beam draws every
  // tool-to-place link through the middle. Pick a tool and its links light; pick a place and every tool it used lights.
  // Narrow screens keep the patch bay: the tool grid, with the evidence seated under the picked tool's group.
  const bay = $('.bay'), box = $('.keys'), tools = $$('button.key'), placeEls = $$('.place'), evh = $('.evh'), evl = $('.evl')
  const { ev: EV, places: PL } = JSON.parse($('#evidence').textContent), evBox = $('.ev'), find = $('.find input')
  const T = tools.length, links = []
  EV.forEach((ev, t) => ev.forEach((x) => links.push([t, x.p])))
  const name = (k) => k.childNodes[1].textContent, norm = (t) => t.toLowerCase().replace(/[^a-z0-9+#]/g, '')
  let picked = 0, board = false
  // the board: every project and role is a chip in the middle, every tool a part on the left or right edge, and the
  // beam routes a copper trace (45-degree chamfers, vias) from each tool to each chip that used it. Pulses run along
  // the lit traces; idle traces carry a slow, dim pulse so the board always looks live. On arrival it fabricates:
  // the traces route themselves out from the tools.
  const geo = { links: [], tools: [], chips: [] } // board geometry in the tool box's px
  const LEFT = new Set([0, 1, 3]) // skill groups on the left edge: embedded, robotics, languages; ML and tools go right
  const fab = { v: 1 }
  function arrange() {
    board = innerWidth > 980
    bay.classList.toggle('board', board)
    const grps = $$('.grp', box), plc = $('.places')
    if (!board) { for (const el of [...$$('.key', box), ...placeEls, ...grps.map((g) => $('h3', g))]) el.style.transform = el.style.width = el.style.height = ''; box.style.height = ''; return }
    const bw = box.getBoundingClientRect().width, pad = 28, colW = 190, chipW = Math.min(400, bw * 0.32), chW = (bw - 2 * pad - 2 * colW - chipW) / 2
    const row = 20, head = 30, ys = { L: pad, R: pad }
    geo.tools = []
    grps.forEach((g, gi) => { // stack each group down its edge: a silkscreen label, then its parts
      const side = LEFT.has(gi) ? 'L' : 'R', x = side === 'L' ? pad : bw - pad - colW, h = $('h3', g)
      h.style.transform = `translate(${x + (side === 'L' ? colW - h.offsetWidth : 0)}px, ${ys[side] + 8}px)`
      ys[side] += head
      for (const k of $$('.key', g)) {
        k.classList.toggle('R', side === 'R'); k.style.width = `${colW}px`
        const nx = side === 'L' && !k.matches('button') ? x + colW - k.offsetWidth : x // footprints hug the board edge too
        k.style.transform = `translate(${nx}px, ${ys[side]}px)`
        if (k.matches('button')) geo.tools[tools.indexOf(k)] = { side, x: side === 'L' ? pad + colW + 4 : bw - pad - colW - 4, y: ys[side] + row / 2 }
        ys[side] += row
      }
      ys[side] += 6
    })
    const hb = Math.max(ys.L, ys.R) + pad - 6
    box.style.height = `${hb}px`
    const n = placeEls.length, chipH = Math.min(46, (hb - 2 * pad) / n - 8), gap = (hb - 2 * pad - n * chipH) / (n - 1), cx0 = pad + colW + chW
    const br = bay.getBoundingClientRect(), kb = box.getBoundingClientRect()
    plc.style.transform = `translate(${kb.left - br.left}px, ${kb.top - br.top}px)`
    geo.chips = placeEls.map((el, j) => {
      const y = pad + j * (chipH + gap)
      el.style.width = `${chipW}px`; el.style.height = `${chipH}px`; el.style.transform = `translate(${cx0}px, ${y}px)`
      return { y, h: chipH, l: cx0, r: cx0 + chipW }
    })
    // pins: each chip spreads its links down each side; lanes: each side's links get their own vertical in the channel
    geo.links = []
    for (const side of ['L', 'R']) {
      const ls = links.map(([t, p], i) => ({ t, p, i })).filter((l) => geo.tools[l.t].side === side).sort((a, b) => geo.tools[a.t].y - geo.tools[b.t].y)
      const byChip = new Map(); for (const l of ls) { if (!byChip.has(l.p)) byChip.set(l.p, []); byChip.get(l.p).push(l) }
      for (const [p, arr] of byChip) arr.forEach((l, k) => { const c = geo.chips[p]; l.py = c.y + (c.h * (k + 1)) / (arr.length + 1) })
      const x0 = side === 'L' ? pad + colW + 14 : cx0 + chipW + 14, x1 = side === 'L' ? cx0 - 14 : bw - pad - colW - 14
      ls.forEach((l, k) => {
        const tl = geo.tools[l.t], lx = side === 'L' ? x0 + ((x1 - x0) * (k + 0.5)) / ls.length : x1 - ((x1 - x0) * (k + 0.5)) / ls.length
        const ex = side === 'L' ? geo.chips[l.p].l - 2 : geo.chips[l.p].r + 2, dir = side === 'L' ? 1 : -1, dy = l.py - tl.y, s = Math.sign(dy) || 1, r = Math.min(7, Math.abs(dy) / 2)
        const pts = Math.abs(dy) < 1 ? [[tl.x, tl.y], [ex, l.py]] : [[tl.x, tl.y], [lx - dir * r, tl.y], [lx, tl.y + s * r], [lx, l.py - s * r], [lx + dir * r, l.py], [ex, l.py]]
        let L = 0; const cum = [0]; for (let q = 1; q < pts.length; q++) { L += Math.hypot(pts[q][0] - pts[q - 1][0], pts[q][1] - pts[q - 1][1]); cum.push(L) }
        geo.links[l.i] = { t: l.t, p: l.p, pts, cum, L, via: pts.length > 2 ? [pts[2], pts[3]] : [], ph: (l.i * 0.618) % 1 }
      })
    }
  }
  const lit = (sel) => { // which tools and places the selection lights
    const lt = new Set(), lp = new Set()
    if (sel < T) { lt.add(sel); for (const x of EV[sel]) lp.add(x.p) } else { lp.add(sel - T); for (const [t, p] of links) if (p === sel - T) lt.add(t) }
    return { lt, lp }
  }
  const cut = (g, a, b) => { // the part of a trace between arc lengths a and b
    const out = []
    for (let q = 1; q < g.pts.length; q++) {
      const s0 = g.cum[q - 1], s1 = g.cum[q]; if (s1 < a || s0 > b) continue
      const P = g.pts[q - 1], Q = g.pts[q], f = (s) => { const u = (s - s0) / (s1 - s0 || 1); return [P[0] + (Q[0] - P[0]) * u, P[1] + (Q[1] - P[1]) * u] }
      if (!out.length) out.push(f(Math.max(a, s0))); out.push(f(Math.min(b, s1)))
    }
    return out
  }
  function boardFigure(sel, w, h, t = null, out) {
    // the board's offset inside the station: measured on a pick or a re-layout, reused by the live per-frame redraw
    // (two rect reads a frame forced a style and layout pass on every frame)
    if (t === null || !geo.off) { const br = bay.getBoundingClientRect(), kb = box.getBoundingClientRect(); geo.off = [kb.left - br.left, kb.top - br.top] }
    const [ox, oy] = geo.off
    const { lt } = lit(sel), strokes = [], sh = (pts) => pts.map(([x, y]) => [x + ox, y + oy]), nL = geo.links.length
    const sq = (x, y, r) => [[x - r, y - r], [x + r, y - r], [x + r, y + r], [x - r, y + r], [x - r, y - r]]
    geo.links.forEach((g, i) => {
      if (!g) return
      const on = sel < T ? g.t === sel : g.p === sel - T
      const grow = Math.min(1, Math.max(0, fab.v * 1.45 - (i / nL) * 0.45)) // fabrication: traces route out in turn
      if (grow <= 0) return
      const len = g.L * grow
      strokes.push(S(sh(cut(g, 0, len)), on ? 1 : 0.13))
      if (on && grow >= 1) for (const v of g.via) strokes.push(S(sh(ring(v[0], v[1], 2.6)), 0.9))
      if (t !== null && grow >= 1) { // pulses: two bright comets on a lit trace, one slow dim one on every other trace
        const n = on ? 2 : 1, sp = on ? 0.55 : 0.16
        for (let k = 0; k < n; k++) { const u = (((t * sp + g.ph + k / n) % 1) + 1) % 1, a = u * g.L; strokes.push(S(sh(cut(g, Math.max(0, a - (on ? 18 : 10)), a)), on ? 2.8 : 0.5)) }
      }
    })
    for (const [i, tl] of geo.tools.entries()) if (tl) strokes.push(S(sh(sq(tl.x, tl.y, 2.6)), lt.has(i) ? 1 : 0.4))
    return px(strokes, w, h, out)
  }
  const seatEvidence = () => { // phone: the evidence sits right under the picked tool's group, so the wires stay short
    if (board || innerWidth > 760) { if (evBox.parentNode !== bay) bay.append(evBox); return }
    const g = tools[picked].closest('.grp'); if (g.nextElementSibling !== evBox) g.after(evBox)
  }
  const card = (x, label) => {
    const li = document.createElement('li'), a = document.createElement('a')
    a.href = x.h; a.innerHTML = '<small></small><b></b><span></span>'
    a.children[0].textContent = label || x.k; a.children[1].textContent = x.t; a.children[2].textContent = x.s
    a.addEventListener('click', (e) => { e.preventDefault(); jump(x.h) })
    li.append(a); return li
  }
  function renderPanel(i) {
    const { lt, lp } = lit(i)
    tools.forEach((k, n) => { k.classList.toggle('on', n === i); k.classList.toggle('lit', lt.has(n)) })
    placeEls.forEach((el, n) => { el.classList.toggle('on', n === i - T); el.classList.toggle('lit', lp.has(n)) })
    if (i < T) {
      picked = i; seatEvidence()
      const ev = EV[i]
      $('b', evh).textContent = name(tools[i])
      $('span', evh).textContent = `${$('h3', tools[i].closest('.grp')).textContent}, used in ${ev.length} ${ev.length === 1 ? 'place' : 'places'}${board ? `: ${ev.map((x) => x.t).join(', ')}` : ''}`
      evl.replaceChildren(...ev.map((x) => card(x)))
    } else {
      const x = PL[i - T], used = [...lt].sort((a, b) => a - b)
      $('b', evh).textContent = x.t
      $('span', evh).textContent = `${x.k}, ${used.length} tools${board ? `: ${used.map((u) => name(tools[u])).join(', ')}` : ''}`
      const li = document.createElement('li'); li.className = 'chipset'
      li.append(...used.map((t) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = name(tools[t]); b.addEventListener('click', () => BAY.show(t)); return b }))
      evl.replaceChildren(card(x, `Open the ${x.k.toLowerCase()}`), li)
    }
    if (!reduce) gsap.fromTo(evl.children, { autoAlpha: 0, x: 12 }, { autoAlpha: 1, x: 0, duration: 0.6, ease: 'expo.out', stagger: 0.05 })
  }
  function wires(i, w, h) { // patch cables from the tool to every place it was used, with a port at each end
    const br = bay.getBoundingClientRect(), kr = tools[i].getBoundingClientRect(), strokes = []
    const side = evl.getBoundingClientRect().left > kr.right // tablet: evidence to the right; phone: below
    const kx = (side ? kr.right + 5 : kr.left + kr.width / 2) - br.left, ky = (side ? kr.top + kr.height / 2 : kr.bottom + 5) - br.top
    strokes.push(S(ring(kx, ky)))
    for (const a of $$('a', evl)) {
      const r = a.getBoundingClientRect(), ix = r.left - 6 - br.left, iy = r.top + r.height / 2 - br.top
      const c1 = side ? [kx + (ix - kx) * 0.55, ky] : [kx, ky + (iy - ky) * 0.6], c2 = side ? [ix - (ix - kx) * 0.45, iy] : [ix - 60, iy]
      const p = Array.from({ length: 81 }, (_, n) => { const t = n / 80, u = 1 - t; return [u * u * u * kx + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * ix, u * u * u * ky + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * iy] })
      strokes.push(S(p, 0.55), S(ring(ix, iy)))
    }
    return px(strokes, w, h)
  }
  let k0 = 0; EV.forEach((e, i) => { if (e.length > EV[k0].length) k0 = i })
  arrange(); renderPanel(k0)
  const BAY = station(bay, (i, w, h) => (board ? boardFigure(i, w, h) : wires(i, w, h)), { arc: 40, dur: 0.9, cache: false, before: renderPanel, after: (i) => sfx.blip(990 + (i % 12) * 40, 0.04) })
  BAY.toI = k0
  const relayStack = () => { // re-seat the board or the grid for this width, then force the figure to be rebuilt
    arrange()
    if (!board && BAY.toI >= T) { BAY.toI = k0; renderPanel(k0) }
    seatEvidence(); BAY.w = -1
  }
  tools.forEach((k, i) => {
    const go = () => BAY.show(i)
    if (fine) k.addEventListener('pointerenter', go)
    k.addEventListener('focus', go); k.addEventListener('click', go)
  })
  placeEls.forEach((el, j) => {
    const go = () => BAY.show(T + j)
    if (fine) el.addEventListener('pointerenter', go)
    el.addEventListener('focus', go); el.addEventListener('click', () => jump(PL[j].h))
  })
  const names = tools.map((k) => norm(name(k))), plain = $$('.key.plain').map((k) => k.textContent)
  find.addEventListener('input', () => { // search: the first tool that starts with (else contains) the query
    const q = norm(find.value), lab = find.parentNode
    if (!q) { lab.removeAttribute('data-msg'); return }
    let i = names.findIndex((n) => n.startsWith(q)); if (i < 0) i = names.findIndex((n) => n.includes(q))
    const other = i < 0 && plain.find((t) => norm(t).includes(q))
    if (i >= 0) { lab.removeAttribute('data-msg'); BAY.show(i) } else geo.off = null, lab.dataset.msg = other ? `${other} is in my toolkit, but no project here lists it.` : 'Not in my stack yet.'
  })
  find.addEventListener('keydown', (e) => { if (e.key === 'Escape') { find.value = ''; find.parentNode.removeAttribute('data-msg') } })

  // ---------------------------------------------------------------- station 4: the Lissajous by the email
  const LISS = station($('.liss'), (i, w, h) => place(FIGURES.lissajous(), { x: 0, y: 0, w, h }, 1))
  const STATIONS = [null, SCOPE, LA, BAY, LISS] // 0 is the name
  // phosphor colour per station: blue-white (name), cyan (scope), P1 green (analyzer), amber (stack), blue-white (end)
  const TINT = [[0.86, 0.95, 1.0], [0.55, 0.93, 1.0], [0.52, 1.0, 0.68], [1.0, 0.8, 0.46], [0.86, 0.95, 1.0]]
  const root = document.documentElement.style, tint = [0, 0, 0], shown = [-1, -1, -1]
  // mix the two stations' colours for the beam. The page's own glow (--glow/--beam) switches once per flight, at its
  // midpoint, while every eye is on the ribbon: a smooth per-frame change restyled the whole page every frame
  function setTint(a, b, p) {
    for (let c = 0; c < 3; c++) tint[c] = a[c] + (b[c] - a[c]) * p
    const q = p < 0.5 ? a : b
    if (q[0] === shown[0] && q[1] === shown[1] && q[2] === shown[2]) return
    shown[0] = q[0]; shown[1] = q[1]; shown[2] = q[2]
    const g = q.map((v) => Math.round(255 * Math.max(0.24, 1 - (1 - v) * 2.6))), t = q.map((v) => Math.round(255 * (1 - (1 - v) * 0.6)))
    root.setProperty('--glow', g.join(', ')); root.setProperty('--beam', `rgb(${t.join(', ')})`)
  }

  // ---------------------------------------------------------------- layout: the name in document px, flight windows
  let W = innerWidth, H = innerHeight, dpr = Math.min(devicePixelRatio || 1, 2)
  let A = null, boot = null, dName = 1, pinned = false, expA = 0, expB = 1, busX = [], heroC = [0, 0], titles = [], scrollRole = -1
  const FLY = [] // FLY[i] = [start, end] scroll px of the flight from station i to i + 1
  const docTop = (el) => el.getBoundingClientRect().top + scrollY
  const docBottom = (el) => el.getBoundingClientRect().bottom + scrollY
  const tube = $('.tube'), tubeKids = $$('.tube > :not(.name)'), tsc = gsap.quickSetter(tube, 'scale'), tty = gsap.quickSetter(tube, 'y', 'px')
  let tubeY = 0, lastHp = -1
  const tubeSet = (s, hp) => { // shrink and sink the tube, and fade its readouts, as the hero scrolls away
    if (Math.abs(hp - lastHp) < 0.002) return
    lastHp = hp; tubeY = hp * 60; tsc(s); tty(tubeY)
    for (const k of tubeKids) k.style.opacity = Math.max(0, 1 - hp * 1.6).toFixed(3)
  }
  function layout() {
    tsc(1); tty(0); lastHp = -1 // measure the hero untransformed; the next frame re-applies the recede
    W = innerWidth; H = innerHeight
    beam.resize(W, H, dpr)
    const r = $('.name').getBoundingClientRect(), nr = { x: r.left, y: r.top + scrollY, w: r.width, h: r.height }
    NAME = nameFigure(nameJson, 0.92, innerWidth > 760)
    A = place(NAME.strokes, nr, NAME.ar, 0, 0); dName = N / A.drawn
    const bw = nr.w * 1.02, bh = nr.h * 0.55 // the boot signal: a sine the width of the name, which the intro bends into it
    boot = place(sine(innerWidth > 760 ? 9 : 5), { x: nr.x - nr.w * 0.01, y: nr.y + (nr.h - bh) / 2, w: bw, h: bh }, bw / bh)
    relayStack()
    for (const s of STATIONS) s?.size()
    // the pinned analyzer: scroll range, and each role's bus centre in screen px (where the playhead parks)
    pinned = innerWidth > 760
    const tt = docTop(track); expA = tt - 80; expB = Math.max(expA + 1, docBottom(track) - (H - 16))
    const lw = laScreen.getBoundingClientRect().width
    busX = chans.map((c) => ((+c.dataset.a + +c.dataset.b) / 200) * lw)
    const hr = $('.hero').getBoundingClientRect(); heroC = [hr.left + hr.width / 2, hr.top + scrollY + hr.height * 0.4]
    titles = $$('h2.big').map((h) => ({ el: h, top: docTop(h.parentElement), x: gsap.quickSetter(h, 'x', 'px') }))
    fitRole(LA.toI)
    const max = document.documentElement.scrollHeight - H
    const top = parseFloat(getComputedStyle(innerWidth <= 760 ? $('.scope-col') : $('.scope')).top) || 0
    // each flight ends where its station settles, and leaves only once that station is mostly scrolled past, so every
    // station holds while it is being read (the first flight starts on the first scroll tick, to show the name unravel)
    const ends = [docTop(bench) - top, docTop(track) - 80, docTop(bay) - 72, Math.min(max - 2, docTop($('.liss')) - H * 0.55)]
    const leave = [0, docBottom(bench) - top - $('.scope').offsetHeight * 0.4, docBottom(track) - H * 0.95, docBottom(bay) - H * 0.55]
    let prev = 0
    ends.forEach((b, i) => {
      const a = i === 0 ? Math.min(b * 0.5, H * 0.03) : Math.max(prev + 1, b - H * 0.75, Math.min(leave[i], b - H * 0.2))
      b = Math.max(a + 2, b)
      FLY[i] = [a, b]; prev = b
    })
  }
  layout()

  // ---------------------------------------------------------------- intro: CRT power-on, then the flat trace writes the name
  const out = new Float32Array(N * 3)
  const morph = { m: reduce ? 1 : 0 }, crt = { sx: reduce ? 1 : 0.002, on: reduce ? 1 : 0 }
  const ptr = { x: -1e4, y: -1e4, tx: -1e4, ty: -1e4, s: 0, ts: 0 }, lean = { x: 0, y: 0 }
  let head = 0, clock = 0
  const heroText = $$('.hud, .hero .side > *, .hero .ctas, .proof > div')
  const bootEl = $('.boot')
  if (!reduce && bootEl) {
    const B = 1.25, n = { v: 0 }
    gsap.set(heroText, { autoAlpha: 0, y: 12 })
    gsap.timeline({ onComplete: () => bootEl.remove() })
      .to(n, { v: 100, duration: 0.75, ease: 'power2.in', onUpdate: () => { $('em', bootEl).textContent = String(Math.round(n.v)).padStart(3, '0') } }, 0)
      .to($('.ln', bootEl), { scaleX: 1, duration: 0.38, ease: 'expo.inOut' }, 0.62)
      .to($('.bt', bootEl), { yPercent: -100, duration: 0.85, ease: 'expo.inOut' }, B - 0.2)
      .to($('.bb', bootEl), { yPercent: 100, duration: 0.85, ease: 'expo.inOut' }, B - 0.2)
      .to($('.ln', bootEl), { scaleY: 40, autoAlpha: 0, duration: 0.5, ease: 'expo.out' }, B - 0.1)
      .to($$('p', bootEl), { autoAlpha: 0, duration: 0.3 }, B - 0.25)
      .add(() => { ripples.push({ x: W / 2, y: H / 2, t: clock, a: 1.2 }); sfx.blip(220, 0.08) }, B)
      .to(crt, { on: 1, duration: 0.08 }, B + 0.02)
      .to(crt, { sx: 1, duration: 0.36, ease: 'power3.out' }, B + 0.06)
      .to(morph, { m: 1, duration: 1.6, ease: 'expo.inOut' }, B + 0.4)
      .to(heroText, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.05 }, B + 0.9)
  } else bootEl?.remove()

  // ---------------------------------------------------------------- effects: title reveal, magnetic buttons, lock-on
  if (!reduce) { // each section title scrambles in once, like a readout acquiring
    const io = new IntersectionObserver((es, o) => {
      for (const e of es) if (e.isIntersecting) { o.unobserve(e.target); const t = $('span', e.target); gsap.to(t, { duration: 1.1, scrambleText: { text: t.textContent, chars: 'upperAndLowerCase', revealDelay: 0.15, speed: 0.6 } }) }
    }, { threshold: 0.6 })
    $$('h2.big').forEach((h) => io.observe(h))
  }
  if (fine && !reduce) for (const el of $$('.btn, .pill')) { // buttons lean toward the cursor
    const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' }), yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' })
    el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); xTo((e.clientX - r.left - r.width / 2) * 0.3); yTo((e.clientY - r.top - r.height / 2) * 0.4) })
    el.addEventListener('pointerleave', () => { xTo(0); yTo(0) })
  }
  if (!reduce) { // content is scanned in: a bright edge wipes each row on as it arrives
    const groups = ['.work .head', '.proj', '.exp .head', '.chan', '.la-detail', '.tools .head', '.awards li', '.foot h2', '.mini > div', '.hello']
    // Chrome intersects a target through its own clip-path, so a fully clipped row would never count as visible:
    // watch each row's (unclipped) parent instead, and scan in all of its rows together, staggered
    const kids = new Map()
    const io = new IntersectionObserver((es, o) => { for (const e of es) if (e.isIntersecting) { o.unobserve(e.target); for (const k of kids.get(e.target)) k.classList.add('in') } }, { threshold: 0, rootMargin: '0px 0px -10% 0px' })
    for (const g of groups) $$(g).forEach((el, i) => {
      el.classList.add('scan'); el.style.setProperty('--d', `${(i % 8) * 0.055}s`)
      const par = el.parentElement; if (!kids.has(par)) { kids.set(par, []); io.observe(par) } kids.get(par).push(el)
    })
  }
  // sound, off until asked for: a low hum while on, a blip when an instrument changes, a hiss while the beam flies
  const sfx = (() => {
    let ctx = null, on = false, hiss = null
    const btn = $('.snd')
    const start = () => {
      ctx = ctx || new AudioContext()
      const out = ctx.createGain(); out.gain.value = 0.9; out.connect(ctx.destination)
      for (const [f, g] of [[55, 0.012], [110, 0.006]]) { const o = ctx.createOscillator(), v = ctx.createGain(); o.frequency.value = f; v.gain.value = g; o.connect(v).connect(out); o.start() }
      const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
      const n = ctx.createBufferSource(), bp = ctx.createBiquadFilter(); n.buffer = buf; n.loop = true; bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 0.7
      hiss = ctx.createGain(); hiss.gain.value = 0; n.connect(bp).connect(hiss).connect(out); n.start()
      sfx.out = out
    }
    if (btn) btn.addEventListener('click', () => {
      on = !on; btn.setAttribute('aria-pressed', on); btn.textContent = on ? 'Sound on' : 'Sound off'
      if (on && !ctx) start(); if (ctx) (on ? ctx.resume() : ctx.suspend())
    })
    return {
      out: null,
      blip(f = 880, g = 0.06) { if (!on || !ctx) return; const o = ctx.createOscillator(), v = ctx.createGain(), t = ctx.currentTime; o.type = 'sine'; o.frequency.setValueAtTime(f * 1.6, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.09); v.gain.setValueAtTime(g, t); v.gain.exponentialRampToValueAtTime(0.0001, t + 0.22); o.connect(v).connect(sfx.out); o.start(t); o.stop(t + 0.25) },
      fly(x) { if (on && hiss) hiss.gain.setTargetAtTime(x * 0.05, ctx.currentTime, 0.05) },
    }
  })()
  const flash = { v: 0 }
  const replay = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls) }
  function lockOn(i) { // the beam lands on an instrument: a bright pulse in the trace and on its bezel
    if (reduce) return
    gsap.fromTo(flash, { v: 1 }, { v: 0, duration: 0.9, ease: 'expo.out', overwrite: true })
    replay(STATIONS[i].el.closest('.scope, .la'), 'lock')
    const r = STATIONS[i].el.getBoundingClientRect()
    ripples.push({ x: r.left + r.width / 2, y: r.top + r.height / 2, t: clock, a: 0.7 }); if (ripples.length > 4) ripples.shift()
    sfx.blip(520 + i * 140, 0.09)
    if (STATIONS[i] === BAY && board) gsap.fromTo(fab, { v: 0 }, { v: 1, duration: 2.2, ease: 'power2.inOut', overwrite: true })
  }

  // ---------------------------------------------------------------- input
  const lenis = reduce ? null : new Lenis({ lerp: 0.085, wheelMultiplier: 0.95, smoothWheel: true, autoRaf: false })
  const scrollTo = (t, offset) => (lenis ? lenis.scrollTo(t, { offset }) : $(t).scrollIntoView())
  for (const a of $$('a[href^="#"]')) a.addEventListener('click', (e) => { e.preventDefault(); scrollTo(a.getAttribute('href'), -64) })
  function jump(h) { // from the patch bay to the project row (opened) or the role (selected on the analyzer)
    const el = $(h)
    if (el.classList.contains('proj')) { SCOPE.show(rows.indexOf(el)); if (!$('details', el).open) $('summary', el).click(); scrollTo(h, -110) }
    else { LA.show(roles.indexOf(el)); scrollTo('.la', -90) }
  }
  let touched = false
  rows.forEach((r, i) => {
    const d = $('details', r), more = $('.more', r)
    if (fine) r.addEventListener('pointerenter', () => { touched = true; SCOPE.show(i) })
    r.addEventListener('focusin', () => { touched = true; SCOPE.show(i) })
    $('summary', r).addEventListener('click', (e) => { // open/close the case study with a measured height tween
      touched = true; SCOPE.show(i)
      if (reduce) return
      e.preventDefault()
      if (!d.open) { d.open = true; gsap.fromTo(more, { height: 0 }, { height: 'auto', duration: 0.7, ease: 'expo.out', overwrite: true }); gsap.fromTo($('.in', more), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'expo.out', delay: 0.06 }) }
      else gsap.to(more, { height: 0, duration: 0.45, ease: 'expo.inOut', overwrite: true, onComplete: () => { d.open = false; gsap.set(more, { clearProps: 'height' }) } })
    })
  })
  if (fine) { // until someone points at the list, the scope steps through the projects by itself while it is on screen
    let seen = false
    new IntersectionObserver((es) => { seen = es[0].isIntersecting }, { threshold: 0.4 }).observe(bench)
    if (!reduce) setInterval(() => { if (seen && !touched && SCOPE.mt.v === 1) SCOPE.show((SCOPE.toI + 1) % rows.length) }, 3400)
  } else { // touch: the row crossing the lower third of the screen is on the scope
    const io = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) SCOPE.show(rows.indexOf(e.target)) }, { rootMargin: '-66% 0px -33% 0px' })
    rows.forEach((r) => io.observe(r))
  }
  if (fine) { // the scope cursor: crosshair across the tube, with its position in divisions from the centre
    const tube = $('.tube'), xh = $('.xh'), xl = $('.v', xh), yl = $('.h', xh), rd = $('b', xh)
    const sx = gsap.quickSetter(xl, 'x', 'px'), sy = gsap.quickSetter(yl, 'y', 'px'), rx = gsap.quickSetter(rd, 'x', 'px'), ry = gsap.quickSetter(rd, 'y', 'px')
    tube.addEventListener('pointermove', (e) => {
      const r = tube.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top
      sx(x); sy(y); rx(x + 14); ry(y + 12)
      rd.textContent = `X ${((x - r.width / 2) / (r.width / 10)).toFixed(2).padStart(5)} div\nY ${(-(y - r.height / 2) / (r.height / 8)).toFixed(2).padStart(5)} div`
    }, { passive: true })
  }
  const ripples = [] // a click or tap sends a shockwave through the light
  const fxp = { x: null, y: null, down: false } // the pointer as the effects see it (x null: no pointer, e.g. touch idle)
  addEventListener('pointerdown', (e) => { fxp.x = e.clientX; fxp.y = e.clientY; fxp.down = true }, { passive: true })
  addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') fxp.x = fxp.y = null }, { passive: true })
  // with degauss on, a click's wobble is its job; the flash and blip stay
  if (!reduce) addEventListener('pointerdown', (e) => { if (!fx.includes(degauss)) { ripples.push({ x: e.clientX, y: e.clientY, t: clock, a: 1 }); if (ripples.length > 4) ripples.shift() } sfx.blip(300, 0.05); gsap.fromTo(flash, { v: Math.max(flash.v, 0.45) }, { v: 0, duration: 0.8, ease: 'expo.out', overwrite: true }) }, { passive: true })
  if (fine && !reduce) {
    addEventListener('pointermove', (e) => { ptr.tx = fxp.x = e.clientX; ptr.ty = fxp.y = e.clientY; ptr.ts = 1 }, { passive: true })
    document.documentElement.addEventListener('pointerleave', () => { ptr.ts = 0; fxp.x = fxp.y = null })
  }
  let rz = 0
  const relayout = () => { clearTimeout(rz); rz = setTimeout(layout, 120) }
  addEventListener('resize', relayout)
  new ResizeObserver(relayout).observe(document.body) // late fonts, or a case study opening, change the page height

  // ---------------------------------------------------------------- the frame
  const damp = (a, b, lambda, dt) => b + (a - b) * Math.exp(-lambda * dt) // frame-rate independent
  let slow = 0, frames = 0, lastSy = scrollY, tail = 0, vel = 0, docked = -2 // -2: the first frame docks without a flash
  const perf = PERF ? (window.__perf = { dt: [], fly: FLY, st: STATIONS }) : null
  if (lenis) gsap.ticker.add((t) => lenis.raf(t * 1000))
  gsap.ticker.lagSmoothing(0)
  let X = 0, Y = 0, E = 0
  const at = (s, r, k) => { // sample k of station s (rect r), mid-morph
    const j = k * 3, v = stag(s.mt.v, k), a = Math.sin(Math.PI * v) * s.arc, F = s.from, T = s.T
    X = r.left + F[j] + (T[j] - F[j]) * v + jx[k] * a; Y = r.top + F[j + 1] + (T[j + 1] - F[j + 1]) * v + jy[k] * a; E = F[j + 2] + (T[j + 2] - F[j + 2]) * v
  }
  gsap.ticker.add((time, dtMs) => {
    const dt = Math.min(dtMs / 1000, 1 / 30)
    clock += dt
    if (perf) perf.dt.push(dtMs)
    frames++; slow = slow * 0.95 + (dtMs > 22 ? 1 : 0) * 0.05
    if (frames > 90 && slow > 0.5 && dpr > 1) { dpr = Math.max(1, dpr - 0.25); layout(); slow = 0; frames = 0 }

    const sy = scrollY
    // which leg of the chain are we on: station `seg`, flying to seg + 1 by p
    let seg = FLY.length - 1, p = 1
    for (let i = 0; i < FLY.length; i++) { const q = Math.min(1, Math.max(0, (sy - FLY[i][0]) / (FLY[i][1] - FLY[i][0]))); if (q < 1) { seg = i; p = q; break } }
    if (reduce) p = p < 0.5 ? 0 : 1
    const s0 = STATIONS[seg], s1 = STATIONS[seg + 1], r0 = s0 && s0.el.getBoundingClientRect(), r1 = s1.el.getBoundingClientRect()
    if (!reduce && board && (s0 === BAY || s1 === BAY) && BAY.mt.v === 1) { BAY.T = boardFigure(BAY.toI, BAY.w, BAY.h, clock, bayBuf); BAY.dTo = N / BAY.T.drawn }
    if (!reduce && (s0 === SCOPE || s1 === SCOPE) && SCOPE.mt.v === 1) { // the project figure is live: its parts move
      const f = PFIG[SCOPE.toI], w = SCOPE.w, h = SCOPE.h
      SCOPE.T = place(FIGURES[f.n](clock), { x: w * 0.07, y: h * 0.1, w: w * 0.86, h: h * 0.8 }, f.ar, 0.5, 0.5, N, liveBuf); SCOPE.dTo = N / SCOPE.T.drawn
    }
    vel = damp(vel, (sy - lastSy) / Math.max(dt, 1e-3), 10, dt); lastSy = sy
    const speed = Math.abs(vel)
    tail = damp(tail, p > 0 && p < 1 ? Math.min(1, speed / 1600) : 0, 8, dt)
    setTint(TINT[seg], TINT[seg + 1], smooth(p)); sfx.fly(tail)
    if (pinned) { // scrolling travels back through the roles: the playhead glides to each one, and it locks on
      const q = Math.min(1, Math.max(0, (sy - expA) / (expB - expA))) * chans.length - 0.5, fq = Math.min(chans.length - 1, Math.max(0, q))
      const ri = Math.round(fq); if (ri !== scrollRole) { scrollRole = ri; if (sy > expA - H * 0.2 && sy < expB + H * 0.2) LA.show(ri) }
      const a0 = Math.floor(fq), a1 = Math.min(chans.length - 1, a0 + 1), u = smooth(fq - a0)
      phX(busX[a0] + (busX[a1] - busX[a0]) * u)
    }
    const hp = reduce ? 0 : Math.min(1, sy / (H * 0.75)), hs = 1 - 0.12 * smooth(hp) // the tube recedes
    tubeSet(hs, hp)
    for (const t of titles) { const u = smooth(Math.min(1, Math.max(0, (sy + H - t.top) / (H * 0.85)))); t.x(reduce ? 0 : (1 - u) * W * 0.16) }
    const here = p >= 1 ? seg + 1 : p <= 0 ? seg : -1 // the station the beam is docked at, -1 in flight
    if (here !== docked) { if (here > 0 && docked !== -2 && here !== -1) lockOn(here); docked = here }

    ptr.x = damp(ptr.x, ptr.tx, 14, dt); ptr.y = damp(ptr.y, ptr.ty, 14, dt); ptr.s = damp(ptr.s, ptr.ts, 6, dt)
    head = (head + dt * N * 0.35) % N
    while (ripples.length && clock - ripples[0].t > 1.8) ripples.shift()
    const m = morph.m, cx = W / 2, R2 = 130 * 130, F = 30 * ptr.s, hum = reduce ? 0 : 0.3
    // flight camera: the ribbon gets depth and swings about the midpoint between the two stations, with perspective.
    // Each sample's share fades with sin(pi f), so a docked figure is never moved off its labels.
    const sp = smooth(p), c0x = r0 ? r0.left + r0.width / 2 : W / 2, c0y = r0 ? r0.top + r0.height / 2 : H / 2
    const pX = c0x + (r1.left + r1.width / 2 - c0x) * sp, pY = c0y + (r1.top + r1.height / 2 - c0y) * sp
    const yaw = 0, FD = 1500, DEPTH = 0 // the flight camera is off: its depth tangled the ribbon into loops (2026-10-30)
    // lean: a docked scope or Lissajous tilts toward the cursor like an object (the analyzer and the board never
    // move, their traces sit on DOM labels)
    const ls = p <= 0 ? s0 : p >= 1 ? s1 : null, leanOn = fine && !reduce && (ls === SCOPE || ls === LISS), lr = leanOn ? (ls === s0 ? r0 : r1) : r1
    lean.x = damp(lean.x, leanOn && ptr.ts ? Math.max(-1, Math.min(1, (ptr.tx - lr.left - lr.width / 2) / (lr.width / 2 + 160))) : 0, 3, dt)
    lean.y = damp(lean.y, leanOn && ptr.ts ? Math.max(-1, Math.min(1, (ptr.ty - lr.top - lr.height / 2) / (lr.height / 2 + 160))) : 0, 3, dt)
    const lx = lr.left + lr.width / 2, ly = lr.top + lr.height / 2, lyaw = lean.x * 0.22, lpit = -lean.y * 0.16, lcy = Math.cos(lyaw), lsy = Math.sin(lyaw), lcp = Math.cos(lpit), lsp = Math.sin(lpit)
    const leaning = Math.abs(lean.x) + Math.abs(lean.y) > 1e-3
    for (let k = 0; k < N; k++) {
      const j = k * 3
      let x = 0, y = 0, e = 0
      const f = p <= 0 ? 0 : p >= 1 ? 1 : smooth(p * 2 - k / N)
      if (f < 1) {
        if (s0) { at(s0, r0, k); x = X; y = Y; e = E } else { // the name (or still being written by the intro)
          const u = smooth(m * 1.5 - (k / N) * 0.5)
          x = boot[j] + (A[j] - boot[j]) * u; y = boot[j + 1] + (A[j + 1] - boot[j + 1]) * u; e = boot[j + 2] + (A[j + 2] - boot[j + 2]) * u
          x = heroC[0] + (x - heroC[0]) * hs; y = heroC[1] + (y - heroC[1]) * hs + tubeY - sy
        }
      }
      if (f > 0) {
        at(s1, r1, k)
        if (f >= 1) { x = X; y = Y; e = E } else { // in flight: a ribbon that converges on the next station
          const s = Math.sin(Math.PI * f)
          x += (X - x) * f + jx[k] * s * 170; y += (Y - y) * f + jy[k] * s * 110; e += (E - e) * f
          const z = jz[k] * s * DEPTH, a = yaw * s, ca = Math.cos(a), sa = Math.sin(a), dx = x - pX
          const X1 = dx * ca + z * sa, Z1 = -dx * sa + z * ca, pr = FD / Math.max(250, FD + Z1)
          x = pX + X1 * pr; y = pY + (y - pY) * pr
        }
      }
      if (leaning && (f <= 0 ? s0 === ls : f >= 1 && s1 === ls)) {
        const dx = x - lx, dy = y - ly, Z1 = -dx * lsy, Y1 = dy * lcp - Z1 * lsp, pr = FD / (FD + dy * lsp + Z1 * lcp)
        x = lx + dx * lcy * pr; y = ly + Y1 * pr
      }
      for (let q = 0; q < ripples.length; q++) { // a ring expanding at 900 px/s, pushing the trace outward as it passes
        const rp = ripples[q], age = clock - rp.t, dx = x - rp.x, dy = y - rp.y, r = Math.sqrt(dx * dx + dy * dy) + 1e-3, band = r - age * 900
        if (band > -260 && band < 260) { const a = 34 * rp.a * Math.exp(-(band * band) / 7200) * Math.exp(-age * 2.4); x += (dx / r) * a; y += (dy / r) * a }
      }
      if (F > 0.01) { // the cursor deflects the beam like a magnet near the tube
        const dx = x - ptr.x, dy = y - ptr.y, r2 = dx * dx + dy * dy
        if (r2 < R2 * 4) { const g = F * Math.exp(-r2 / R2), l = Math.sqrt(r2) + 1e-3; x += (dx - dy * 0.4) / l * g; y += (dy + dx * 0.4) / l * g }
      }
      x += Math.sin(clock * 4.4 + y * 0.013) * hum
      out[j] = cx + (x - cx) * crt.sx; out[j + 1] = y; out[j + 2] = e
    }
    const d0 = s0 ? s0.density() : dName
    const density = d0 + (s1.density() - d0) * p
    const gain = 0.32 * (1.18 / Math.max(0.2, density)) * (W < 760 ? 0.8 : 1) * (1 + 1.3 * flash.v)
    beam.frame(out, { dt, t: clock, head, gain, width: 1.25 * (1 + 0.5 * flash.v), on: crt.on, grid: 0, bg: 0, tail, tint, ab: 0, dust: 0, scroll: sy, vel,
      cut: p, cutDir: vel >= 0 ? 1 : -1, ptr: fxp, dock: here >= 0 ? 1 : 0 })
    fxp.down = false
  })
}
