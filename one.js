// one.js: the whole v7 page on one clock (Lenis + one rAF). The chip (renderer, textures, die, lid) is chip2.js lines 3-323
// unchanged; everything after the marker below is new: the paper rise, the closer rise, the rail, reveals, nav, Cmd+K, reduced motion.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import Lenis from "lenis";

const $ = (s) => document.querySelector(s);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (p, a, b) => clamp((p - a) / (b - a), 0, 1);
const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

const canvas = $("#gl");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.AgXToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 200);

// ---------------------------------------------------------------- studio light (softboxes -> PMREM)
function gradTex(stops) {
  const cv = Object.assign(document.createElement("canvas"), { width: 4, height: 256 }), g = cv.getContext("2d");
  const grd = g.createLinearGradient(0, 0, 0, 256);
  stops.forEach(([o, c]) => grd.addColorStop(o, c));
  g.fillStyle = grd; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function buildEnv() {
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x020202);
  const box = (w, h, pos, k, color = 0xffffff, map = null) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), map, side: THREE.DoubleSide })
    );
    m.position.copy(pos);
    m.lookAt(0, 0, 0);
    env.add(m);
  };
  const fall = gradTex([[0, "#ffffff"], [0.44, "#ececec"], [0.5, "#202020"], [1, "#000000"]]);
  // the sweep: a big gradient softbox where the lid reflects it at the hero angle
  const SWY = (new URLSearchParams(location.search).get("lid") || "c") === "c" ? 5.2 : 6.2; // C17: the sweep's light-to-dark edge now crosses the lid
  box(17, 7.5, new THREE.Vector3(4.4, SWY, -9.8).normalize().multiplyScalar(13), 2.4, 0xfff4e6, fall);
  box(7, 5, new THREE.Vector3(3, 13, -8), 1.3); // small high-back softbox: glints the die in the reveal
  box(1.2, 18, new THREE.Vector3(-11, 3, 1), 7.0); // left strip: edge highlights
  box(1.2, 18, new THREE.Vector3(10, 3, 3), 3.2, 0xffcf9a); // warm right strip
  box(12, 0.8, new THREE.Vector3(0, 1.6, 12), 1.0); // low front fill
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(env, 0.02).texture;
  pm.dispose();
  return tex;
}
scene.environment = buildEnv();

// ---------------------------------------------------------------- textures
await Promise.all(['600 100px "Switzer"', '500 70px "Switzer"', '500 40px "Geist Mono"'].map((f) => document.fonts.load(f))).catch(() => {});

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function ihsMaps() {
  const S = 2048;
  const col = Object.assign(document.createElement("canvas"), { width: S, height: S });
  const rou = Object.assign(document.createElement("canvas"), { width: S, height: S });
  const c = col.getContext("2d"), r = rou.getContext("2d");
  c.fillStyle = "#cfcdc8"; c.fillRect(0, 0, S, S);
  const LIDV = new URLSearchParams(location.search).get("lid") || "c"; // C17: c (smoother lid + lower sweep) is the default; ?lid=a is the old flat lid
  r.fillStyle = LIDV === "a" ? "rgb(58,58,58)" : "rgb(30,30,30)"; r.fillRect(0, 0, S, S);
  const R = rng(7);
  for (let i = 0; i < 26000; i++) { // fine brushed grain: short, faint strokes
    const x = R() * S, y = R() * S, w = 40 + R() * 420, a = R() * 0.035;
    r.fillStyle = R() < 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`;
    r.fillRect(x - w / 2, y, w, 1);
  }
  const etch = (draw) => {
    c.save(); r.save();
    c.fillStyle = "#87847e"; r.fillStyle = "rgb(196,196,196)";
    c.strokeStyle = "#87847e"; r.strokeStyle = "rgb(196,196,196)";
    draw(c); draw(r);
    c.restore(); r.restore();
  };
  const M = 170;
  etch((g) => {
    g.textBaseline = "alphabetic";
    g.font = '600 176px "Switzer"'; g.fillText("VISHAL NAVEEN", M - 6, 380);
    g.font = '500 70px "Switzer"'; g.fillText("SOFTWARE ENGINEER", M, 510);
    g.font = '500 54px "Geist Mono"';
    ["VN-29   PYTHON / C++ / ML", "ELECTRICAL ENGINEERING", "UNIVERSITY OF FLORIDA", "GAINESVILLE FL   2029"].forEach((t, i) => g.fillText(t, M, 680 + i * 84));
    g.font = '500 44px "Geist Mono"'; g.fillText("VN29-0412A   e4", M, 1830);
    // pin-1 triangle
    g.beginPath(); g.moveTo(M, 1700); g.lineTo(M, 1560); g.lineTo(M + 140, 1700); g.closePath(); g.fill();
    // 2D matrix code
    const Q = rng(29), cell = 22, n = 16, x0 = S - M - n * cell, y0 = S - M - n * cell;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const edge = i === 0 || j === n - 1 ? 1 : j === 0 ? (i % 2 === 0 ? 1 : 0) : i === n - 1 ? (j % 2 === 1 ? 1 : 0) : Q() < 0.48;
      if (edge) g.fillRect(x0 + j * cell, y0 + i * cell, cell - 1, cell - 1);
    }
  });
  const map = new THREE.CanvasTexture(col); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
  const rmap = new THREE.CanvasTexture(rou); rmap.anisotropy = 8;
  return { map, rmap };
}

// ---- v2: the die is made of his code. Regions = repositories (treemap by his authored lines); the cells are the
// verbatim source of those files in micro type (fetched from the local clones the server exposes, at the SHAs in
// city/city-data.json). The focus region also gets a high-res overlay that becomes legible when the camera dives in.
const Qp = new URLSearchParams(location.search);
const ZOOM = Qp.has("zoom") ? +Qp.get("zoom") : 0;
const CITY = await (await fetch("city/city-data.json")).json();
const META = {
  "Sixth Sense": { s: "iOS app: Swift, Core ML, ARKit", ink: [214, 178, 128] },
  "RL LDPC decoding": { s: "RL decoder: Python, PyTorch, stable-baselines3", ink: [190, 160, 120] },
  "Flash translation layer": { s: "Systems: C++17, GoogleTest", ink: [206, 196, 180] },
  "TactileVLA-Edge": { s: "Robot learning: Python, LeRobot, PyTorch", ink: [176, 150, 112] },
  "TactileVLA demo site": { s: "Web: JavaScript, three.js", ink: [200, 170, 140] },
};
const SRC = {}, BAKED = await (await fetch("city/src.json")).json(); // build: the die source is baked
await Promise.all(CITY.map(async (d) => {
  const parts = await Promise.all(d.files.map(async (f) => { const t = BAKED[`/${d.path}/${f.f}`]; return t != null ? `// ${f.f}\n` + t : ""; }));
  SRC[d.repo] = parts.join("\n").replace(/\t/g, "  ").split("\n");
}));
// The Sixth Sense region holds ~1,500 lines at die scale, so it starts at line 1700 of ViewController.swift (where the
// Kalman filter lives) and wraps; every line is verbatim and each run is headed with its file and line range.
{
  const vc = SRC["Sixth Sense"], i0 = vc.indexOf("// SixthSense/mapping.swift");
  const VC = vc.slice(1, i0 - 1), MAP = vc.slice(i0);
  SRC["Sixth Sense"] = [`// SixthSense/ViewController.swift, from line 1700`, ...VC.slice(1699), ...MAP, `// SixthSense/ViewController.swift, lines 1-1699`, ...VC.slice(0, 1699)];
}
function squarify(items, x, y, w, h) {
  const total = items.reduce((s, i) => s + i.v, 0), k = (w * h) / total;
  const nodes = items.map((i) => ({ ...i, a: i.v * k })).sort((a, b) => b.a - a.a);
  const out = []; let row = [], rx = x, ry = y, rw = w, rh = h;
  const worst = (r, side) => { const s = r.reduce((a, n) => a + n.a, 0), mx = Math.max(...r.map((n) => n.a)), mn = Math.min(...r.map((n) => n.a)); return Math.max((side * side * mx) / (s * s), (s * s) / (side * side * mn)); };
  const lay = (r) => { const s = r.reduce((a, n) => a + n.a, 0);
    if (rw >= rh) { const cw = s / rh; let yy = ry; for (const n of r) { const ch = n.a / cw; out.push({ ...n, x: rx, y: yy, w: cw, h: ch }); yy += ch; } rx += cw; rw -= cw; }
    else { const ch = s / rw; let xx = rx; for (const n of r) { const cw = n.a / ch; out.push({ ...n, x: xx, y: ry, w: cw, h: ch }); xx += cw; } ry += ch; rh -= ch; } };
  let i = 0;
  while (i < nodes.length) { const side = Math.min(rw, rh), n = nodes[i]; if (!row.length || worst([...row, n], side) <= worst(row, side)) { row.push(n); i++; } else { lay(row); row = []; } }
  if (row.length) lay(row);
  return out;
}
const TS = 4096, M0 = 150; // texture size, margin inside the bond-pad ring
const DIE_REGIONS = squarify(CITY.map((d) => ({ v: Math.sqrt(d.lines) * 40 + d.lines, d })), M0, M0, TS - 2 * M0, TS - 2 * M0).map((r) => {
  const m = META[r.d.repo];
  return { id: r.d.repo, x: r.x + 10, y: r.y + 10, w: r.w - 20, h: r.h - 20, ink: m.ink, side: r.x + r.w / 2 < TS / 2 ? "l" : "r",
    t: r.d.repo, s: m.s, p: `${r.d.lines.toLocaleString("en-US")} lines of mine (git blame), ${r.d.files.length} file${r.d.files.length === 1 ? "" : "s"} @${r.d.sha}`, lines: SRC[r.d.repo] };
});
// fill a rect with code in columns; returns nothing, never repeats a line (unused space stays bare silicon)
function codeFill(g, rg, fs, ink, alpha, hl = null, rec = null) {
  const u = fs / 4.6, lh = fs * 1.22, colW = fs * 0.6 * 64, gap = fs * 2, cols = Math.max(1, Math.floor((rg.w - 24 * u + gap) / (colW + gap)));
  g.font = `400 ${fs}px "Geist Mono"`; g.textBaseline = "top";
  let li = 0;
  for (let c = 0; c < cols && li < rg.lines.length; c++) {
    const x = rg.x + 12 * u + c * (colW + gap);
    for (let y = rg.y + 44 * u; y < rg.y + rg.h - lh && li < rg.lines.length; y += lh) {
      if (rec) rec[li] = [x, y];
      if (hl && hl.has(li)) { g.fillStyle = "rgba(96,124,255,.42)"; g.fillRect(x - 3 * u, y - 0.12 * lh, colW, lh); }
      const line = rg.lines[li++]; if (!line.trim()) continue;
      const isHead = /^\/\/ \S+\.\w+/.test(line);
      g.fillStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},${isHead ? 0.95 : alpha})`;
      g.fillText(line.slice(0, 64), x, y);
    }
  }
}
function dieMap() {
  const S = TS;
  const cv = Object.assign(document.createElement("canvas"), { width: S, height: S });
  const g = cv.getContext("2d");
  g.fillStyle = "#101116"; g.fillRect(0, 0, S, S);
  for (const rg of DIE_REGIONS) {
    // C16 A/B (?die=a keeps the old look): near-black cells and lighter ink, so the code reads as lit text, not brown on brown
    const DB = Qp.get("die") !== "a", bgK = DB ? 0.07 : 0.2, inkL = DB ? rg.ink.map((v) => Math.round(v + (244 - v) * 0.3)) : rg.ink;
    g.fillStyle = `rgba(${rg.ink[0] * bgK | 0},${rg.ink[1] * bgK | 0},${rg.ink[2] * bgK | 0},1)`; g.fillRect(rg.x, rg.y, rg.w, rg.h);
    codeFill(g, rg, 4.6, inkL, DB ? 0.92 : 0.85);
    // region marking, like a die's block name
    g.fillStyle = `rgba(${rg.ink[0]},${rg.ink[1]},${rg.ink[2]},.95)`; g.font = '500 30px "Geist Mono"'; g.textBaseline = "top";
    g.fillText(rg.t.toUpperCase(), rg.x + 12, rg.y + 10);
    g.strokeStyle = `rgba(${rg.ink[0]},${rg.ink[1]},${rg.ink[2]},.8)`; g.lineWidth = 4; g.strokeRect(rg.x + 2, rg.y + 2, rg.w - 4, rg.h - 4);
  }
  g.fillStyle = "#b99a62";
  for (let k = 90; k < S - 90; k += 70) { g.fillRect(k, 60, 40, 48); g.fillRect(k, S - 108, 40, 48); g.fillRect(60, k, 48, 40); g.fillRect(S - 108, k, 48, 40); }
  g.font = '500 44px "Geist Mono"'; g.fillStyle = "rgba(230,215,180,.75)"; g.textBaseline = "alphabetic"; g.fillText("VN29 (C) 2026  BUILT FROM MY OWN SOURCE", S - 1060, S - 128);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16;
  return t;
}
// high-res overlay for the focus region, so the dive is readable
function focusMap(rg) {
  const k = 3, cv = Object.assign(document.createElement("canvas"), { width: Math.round(rg.w * k), height: Math.round(rg.h * k) }), g = cv.getContext("2d");
  g.fillStyle = `rgba(${rg.ink[0] * 0.12 | 0},${rg.ink[1] * 0.12 | 0},${rg.ink[2] * 0.12 | 0},1)`; g.fillRect(0, 0, cv.width, cv.height);
  const L = rg.lines, find = (t) => L.findIndex((l) => l.includes(t));
  const HL = new Set([find("let estimatedDistance = (distanceByWidth"), find("let kalmanGain = errorEstimate"), find("let estimate = prediction + kalmanGain")]);
  rg.rec = []; rg.kal = find("let kalmanGain = errorEstimate"); rg.k = k;
  codeFill(g, { ...rg, x: 0, y: 0, w: cv.width, h: cv.height }, 4.6 * k, rg.ink, 0.8, HL, rg.rec);
  g.fillStyle = `rgba(${rg.ink[0]},${rg.ink[1]},${rg.ink[2]},.95)`; g.font = `500 ${30 * k}px "Geist Mono"`; g.textBaseline = "top"; g.fillText(rg.t.toUpperCase(), 12 * k, 10 * k);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16; return t;
}

function substrateMap() {
  const S = 2048;
  const cv = Object.assign(document.createElement("canvas"), { width: S, height: S });
  const g = cv.getContext("2d");
  g.fillStyle = "#120e0b"; g.fillRect(0, 0, S, S); // C25: warm graphite (the olive board edge cut across the die read)
  const R = rng(3);
  g.strokeStyle = "rgba(239,231,218,.07)"; g.lineWidth = 5;
  for (let i = 0; i < 70; i++) {
    let x = R() * S, y = R() * S; g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 4; k++) { if (R() < 0.5) x += (R() - 0.5) * 700; else y += (R() - 0.5) * 700; g.lineTo(x, y); }
    g.stroke();
  }
  g.fillStyle = "#c8a56a";
  g.beginPath(); g.moveTo(60, S - 60); g.lineTo(60, S - 190); g.lineTo(190, S - 60); g.closePath(); g.fill();
  // C19: the three round fiducials are gone (review 6: the one by the logo "reads as a floating ball")
  g.fillStyle = "rgba(235,235,225,.8)"; g.font = '500 40px "Geist Mono"'; g.fillText("VN-29  REV A", S - 420, S - 30);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

function shadowTex() {
  const S = 256, cv = Object.assign(document.createElement("canvas"), { width: S, height: S }), g = cv.getContext("2d");
  const grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grd.addColorStop(0, "rgba(0,0,0,.85)"); grd.addColorStop(0.45, "rgba(0,0,0,.45)"); grd.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grd; g.fillRect(0, 0, S, S);
  return new THREE.CanvasTexture(cv);
}

// ---------------------------------------------------------------- the chip
const chip = new THREE.Group();
scene.add(chip);
const SUB_T = 0.14;

const nickel = new THREE.MeshPhysicalMaterial({ color: 0xd8d6d1, metalness: 1, roughness: 0.24, anisotropy: 0.35 });
const { map: ihsMap, rmap: ihsRough } = ihsMaps();
const nickelTop = nickel.clone();
Object.assign(nickelTop, { map: ihsMap, roughnessMap: ihsRough, roughness: 1, color: new THREE.Color(0xffffff) });

const substrate = new THREE.Mesh(new RoundedBoxGeometry(4.5, SUB_T, 4.5, 4, 0.035), new THREE.MeshStandardMaterial({ color: 0x1a1511, roughness: 0.6 }));
chip.add(substrate);
const subTop = new THREE.Mesh(new THREE.PlaneGeometry(4.44, 4.44), new THREE.MeshPhysicalMaterial({ map: substrateMap(), roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.35 }));
subTop.rotation.x = -Math.PI / 2; subTop.position.y = SUB_T / 2 + 0.0006;
chip.add(subTop);

// SMD capacitors around the lid
const capBody = new THREE.InstancedMesh(new THREE.BoxGeometry(0.13, 0.065, 0.07), new THREE.MeshStandardMaterial({ color: 0x8a7656, roughness: 0.55 }), 120);
const capEnd = new THREE.InstancedMesh(new THREE.BoxGeometry(0.028, 0.07, 0.074), new THREE.MeshStandardMaterial({ color: 0xd9d9d6, metalness: 1, roughness: 0.25 }), 240);
{
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
  let bi = 0, ei = 0;
  const place = (x, z, rotY) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
    p.set(x, SUB_T / 2 + 0.033, z); m.compose(p, q, s); capBody.setMatrixAt(bi++, m);
    for (const d of [-0.065, 0.065]) { const o = new THREE.Vector3(d, 0, 0).applyQuaternion(q); p.set(x + o.x, SUB_T / 2 + 0.035, z + o.z); m.compose(p, q, s); capEnd.setMatrixAt(ei++, m); }
  };
  for (let side = 0; side < 4; side++) for (let k = -7; k <= 7; k++) {
    if (Math.abs(k) === 2 || Math.abs(k) === 5) continue;
    const a = k * 0.2, b = 2.04, r = (k % 2 === 0 ? 0 : Math.PI / 2);
    const [x, z] = side === 0 ? [a, b] : side === 1 ? [a, -b] : side === 2 ? [b, a] : [-b, a];
    place(x, z, side < 2 ? r : r + Math.PI / 2);
  }
  capBody.count = bi; capEnd.count = ei;
}
chip.add(capBody, capEnd);

// die
const DIE = 2.0;
const dieTex = dieMap();
const dieMat = new THREE.MeshPhysicalMaterial({ map: dieTex, emissiveMap: dieTex, emissive: 0xffffff, emissiveIntensity: 0.0, metalness: 0.5, roughness: 0.3, iridescence: 0.55, iridescenceIOR: 1.45, iridescenceThicknessRange: [120, 560], clearcoat: 0.5, clearcoatRoughness: 0.12 });
const dieBody = new THREE.Mesh(new THREE.BoxGeometry(DIE, 0.05, DIE), new THREE.MeshStandardMaterial({ color: 0x2a2c33, metalness: 0.6, roughness: 0.4 }));
dieBody.position.y = SUB_T / 2 + 0.025;
const dieTop = new THREE.Mesh(new THREE.PlaneGeometry(DIE, DIE), dieMat);
dieTop.rotation.x = -Math.PI / 2; dieTop.position.y = SUB_T / 2 + 0.0505;
const DIE_Y = dieTop.position.y;
chip.add(dieBody, dieTop);
const FOCUS = DIE_REGIONS.find((r) => r.id === "Sixth Sense");
const focusMat = new THREE.MeshPhysicalMaterial({ map: focusMap(FOCUS), emissiveMap: null, emissive: 0x000000, metalness: 0.5, roughness: 0.3, clearcoat: 0.5, clearcoatRoughness: 0.12, transparent: true, opacity: 0 });
const focusPlane = new THREE.Mesh(new THREE.PlaneGeometry((FOCUS.w / TS) * DIE, (FOCUS.h / TS) * DIE), focusMat);
focusPlane.rotation.x = -Math.PI / 2;
const FC = new THREE.Vector3(((FOCUS.x + FOCUS.w / 2) / TS - 0.5) * DIE, DIE_Y + 0.0004, ((FOCUS.y + FOCUS.h / 2) / TS - 0.5) * DIE);
focusPlane.position.copy(FC); chip.add(focusPlane);
const KP = (() => { const [px, py] = FOCUS.rec[FOCUS.kal]; const cw = 4.6 * 0.6 * 64; return new THREE.Vector3(((FOCUS.x + (px / FOCUS.k) + cw * 0.42) / TS - 0.5) * DIE, DIE_Y, ((FOCUS.y + py / FOCUS.k) / TS - 0.5) * DIE); })();
const COLW = (4.6 * 0.6 * 64 / TS) * DIE;

// lid (integrated heat spreader)
const ihs = new THREE.Group();
const flange = new THREE.Mesh(new RoundedBoxGeometry(3.7, 0.07, 3.7, 4, 0.05), nickel);
flange.position.y = SUB_T / 2 + 0.035;
const plateau = new THREE.Mesh(new RoundedBoxGeometry(3.1, 0.2, 3.1, 4, 0.06), nickel);
plateau.position.y = SUB_T / 2 + 0.07 + 0.1;
const lidTop = new THREE.Mesh(new THREE.PlaneGeometry(2.96, 2.96), nickelTop);
lidTop.rotation.x = -Math.PI / 2; lidTop.position.y = plateau.position.y + 0.1 + 0.0006;
ihs.add(flange, plateau, lidTop);
chip.add(ihs);

const shadow = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ map: shadowTex(), transparent: true, depthWrite: false, opacity: 0.55 }));
shadow.rotation.x = -Math.PI / 2; shadow.position.y = -0.85;
scene.add(shadow);

// ---------------------------------------------------------------- camera rig + layout
const rig = { R: 16, pitch: 28, yaw: -26, ty: 0.9, tx: 0, tz: 0 };
let W = 1, H = 1, aspect = 1, phone = false;
const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
const radiusFor = (size, frac) => size / (frac * 2 * tanH * Math.min(aspect, 1.9));
let heroR = 16, dieR = 7, heroTy = 1.0;
function resize() {
  W = canvas.clientWidth; H = canvas.clientHeight; aspect = W / H; phone = W < 820;
  renderer.setSize(W, H, false);
  camera.aspect = aspect; camera.updateProjectionMatrix();
  heroR = phone ? radiusFor(4.5, 0.94) : radiusFor(4.5, 0.43);
  dieR = phone ? radiusFor(DIE, 0.66) : radiusFor(DIE, 0.37);
  heroTy = phone ? 0.1 * heroR / 16 : 0.04 * heroR / 16; // C15: blind review 5 preferred the chip overlapping the name ("has depth") over C13's gap; 0.04 (C8 was 0.12) makes the overlap decisive, not a tangent
}
addEventListener("resize", resize);
resize();
function placeCamera() {
  const p = THREE.MathUtils.degToRad(rig.pitch), y = THREE.MathUtils.degToRad(rig.yaw);
  camera.position.set(rig.tx + Math.sin(y) * Math.cos(p) * rig.R, Math.sin(p) * rig.R + rig.ty, rig.tz + Math.cos(y) * Math.cos(p) * rig.R);
  camera.lookAt(rig.tx, rig.ty, rig.tz);
}

// ================================================================ one.js from here down: the page around the chip.
// Every window below is in svh of scroll from the top of the stage (TRANSITIONS.md section 6 has the table).
// 0-284 the camera story (hero, lid, die read, with a slow orbit so the die is never still). 284-354 the camera settles
// above the whole die and keeps creeping in; 346-398 the Sixth Sense region lifts off the die as a tile and flies to
// exactly where that project's media panel sits in the Work layout, its code fading to the panel; 396-416 the app's
// screens rise in; 406-458 the page grows outward from the panel behind a hairline frame; the page lets go at 460.
// Phases overlap so no stretch of scroll is dead (11-07: "make it more fluid").
// (11-07: the paper sliding up over a screen of code read as "cheap, disconnected". The chip now becomes the card.)
const RM = document.documentElement.classList.contains("rm");
const W_ = {
  // C27 ("add back the different repos but dont highlight them. just directly go into sixth sense"): hero -> lid off ->
  // a short read of the five repo labels (no hover map) -> straight into the Sixth Sense hand-off. Work at 282 svh.
  out: [3, 24], name: [6, 40], swing: [4, 80], lid: [40, 100], rheadIn: [92, 112], labels: [95, 135],
  dieOut: [150, 166], scrim: [160, 190], drift: [95, 170], glide: [140, 190], creep: [190, 282],
  scribe: [172, 188], lift: [186, 202], cut: [186, 198], dim: [182, 220], fly: [196, 238], sweep: [204, 232],
  panel: [236, 246], open: [244, 282], text: [256, 284], end: 284,
};
const STAGE = 384; // svh: the stage stays pinned until the paper lets go (W_.end + 100)
capBody.material.transparent = capEnd.material.transparent = true; // the SMD caps fade with the lid (they used to vanish at k2 .55: a pop)

// the die powers on as a wave from its front edge (the edge the lid uncovers first), with a soft bright band riding the
// front, so the code lights up as the lid leaves (stage) and again when the die wakes at the finale. uWake >= 1.22 = all on.
const UV = (x, y) => [x / TS, 1 - y / TS]; // texture px -> die uv
const CUTR = new THREE.Vector4(FOCUS.x / TS, 1 - (FOCUS.y + FOCUS.h) / TS, (FOCUS.x + FOCUS.w) / TS, 1 - FOCUS.y / TS);
const BLK_O = new THREE.Vector2(...UV(FOCUS.x + FOCUS.w / 2, FOCUS.y + FOCUS.h / 2)), BLK_IN = Math.min(FOCUS.w, FOCUS.h) / 2 / TS;
const WAKE = { uWake: { value: 1.22 }, uBand: { value: 1.3 }, uHot: { value: new THREE.Vector4(0, 0, 0, 0) }, uHotA: { value: 0 },
  uLid: { value: 9 }, uRad: { value: 0 }, uO: { value: BLK_O }, uCut: { value: CUTR }, uCutA: { value: 0 }, uBlk: { value: 0 } };
dieMat.onBeforeCompile = (sh) => {
  Object.assign(sh.uniforms, WAKE);
  sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
uniform float uWake; uniform float uBand; uniform vec4 uHot; uniform float uHotA; uniform float uLid; uniform float uRad; uniform vec2 uO; uniform vec4 uCut; uniform float uCutA; uniform float uBlk;
float inR(vec2 q, vec4 r, float e) { return smoothstep(r.x - e, r.x + e, q.x) * smoothstep(r.z + e, r.z - e, q.x) * smoothstep(r.y - e, r.y + e, q.y) * smoothstep(r.w + e, r.w - e, q.y); }`)
    .replace("#include <map_fragment>", `#include <map_fragment>
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.03, 0.024, 0.02), uCutA * inR(vMapUv, uCut, 0.0008)); /* the pocket the slab leaves, in the board colour */`)
    .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
  { vec2 q = vEmissiveMapUv; float d = mix(q.y, distance(q, uO), uRad); // linear from the front edge, or radial from the block
    float on = max(smoothstep(d, d + 0.14, uWake), uBlk * inR(q, uCut, 0.0008)) * smoothstep(q.y, q.y + 0.14, uLid); /* uBlk: the seated block is lit in its own right */ float band = exp(-pow((uWake - d - 0.07) / 0.035, 2.0));
    totalEmissiveRadiance *= on * (1.0 + uBand * band);
    totalEmissiveRadiance *= mix(1.0 - 0.5 * uHotA, 1.0 + 0.45 * uHotA, inR(q, uHot, 0.0015)); // the die as a map
    totalEmissiveRadiance *= 1.0 - uCutA * inR(q, uCut, 0.0008); }`);
};

// the finale (section 7): the same chip in a second pin at Contact, the stage's camera path run backwards. fp is svh of
// scroll from the moment the finale's pin reaches the top of the screen; the canvas moves in one screen before that.
// C24/C25: the slab that left at the hand-off comes back first: it glides in out of the dark, the light band turns it back to code, seats
// in its pocket, and the die powers on outward from it; then the lid, the camera, the name, the copy.
const FIN = { wake: [-70, 20], back: [-30, 14], sweepBack: [-24, 6], drop: [12, 26], seat: 26, wave: [26, 84], glide: [70, 130],
  rheadIn: [9000, 9001], read: [9000, 9001], drift: [9000, 9001], readOut: [0, 1], lid: [62, 140], swing: [100, 180],
  name: [155, 193], copy: [162, 213], go: 214 }; // C27: the repo read is back in the stage, so the finale is short again
// the die as a map: what clicking each block opens
const xcBy = (mg) => [...document.querySelectorAll(".xc")].find((x) => x.querySelector(".mg").textContent === mg);

// ---------------------------------------------------------------- labels (sizes cached in layout(): no layout reads per frame)
const labelsEl = $("#labels"), svg = $("#leaders"), rhead = $("#rhead");
const labels = DIE_REGIONS.map((rg, i) => {
  const el = document.createElement("div");
  el.className = "lab " + rg.side;
  el.innerHTML = `<div class="n mono">0${i + 1}</div><div class="t">${rg.t}</div><div class="p">${rg.s.split(": ").pop()}. ${rg.p.split(" lines")[0]} lines</div>`; // C25: one line, no hashes
  labelsEl.appendChild(el);
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  const dot = document.createElementNS("http://www.w3.org/2000/svg", "rect"); dot.setAttribute("width", "5"); dot.setAttribute("height", "5");
  const num = document.createElementNS("http://www.w3.org/2000/svg", "text"); num.textContent = "0" + (i + 1); num.setAttribute("class", "num");
  svg.append(path, dot, num);
  const cx = rg.x + rg.w / 2, cy = rg.y + rg.h / 2;
  return { rg, el, path, dot, num, w: 270, h: 80, local: new THREE.Vector3((cx / TS - 0.5) * DIE, DIE_Y, (cy / TS - 0.5) * DIE) };
});
const v = new THREE.Vector3();
const toScreen = (local) => { v.copy(local); chip.localToWorld(v); v.project(camera); return [(v.x * 0.5 + 0.5) * W, (-v.y * 0.5 + 0.5) * H]; };
const DL = new THREE.Vector3(-DIE / 2, DIE_Y, 0), DR = new THREE.Vector3(DIE / 2, DIE_Y, 0), DB = new THREE.Vector3(0, DIE_Y, DIE / 2);
let rheadBottom = 160;
function updateLabels(k3) {
  const left = toScreen(DL)[0], right = toScreen(DR)[0], dieBottom = toScreen(DB)[1], gap = 56;
  const pos = labels.map((L, i) => { const [ax, ay] = toScreen(L.local); return { L, i, ax, ay, lx: L.rg.side === "l" ? left - gap - L.w : right + gap, ly: ay - 14 }; });
  for (const sd of ["l", "r"]) {
    const col = pos.filter((q) => q.L.rg.side === sd).sort((a, b) => a.ly - b.ly);
    let y = sd === "l" ? rheadBottom + 22 : 70; // the left column starts below "20,043 lines" (C15)
    for (const q of col) { q.ly = Math.max(q.ly, y); y = q.ly + q.L.h + 18; }
    const over = y - 18 - (H - 20);
    if (over > 0) for (const q of col) q.ly -= over;
  }
  for (const q of pos) {
    const { L, i, ax, ay } = q; let { lx, ly } = q;
    const t = RM ? (k3 > 0 ? 1 : 0) : easeOut(seg(k3, i * 0.11, i * 0.11 + 0.45));
    if (phone) {
      lx = 18; ly = Math.min(dieBottom + 22, H - labels.length * 44 - 24) + i * 44; // C25: one column
      L.el.style.textAlign = "left"; L.path.style.opacity = 0;
    } else {
      const ex = L.rg.side === "l" ? lx + L.w + 10 : lx - 10, ey = ly + 23, mx = lerp(ax, ex, 0.5), m2 = mx + (ex - mx) * 0.25;
      L.path.setAttribute("d", `M${ax},${ay} L${mx},${ay} L${m2},${ey} L${ex},${ey}`);
      const len = Math.abs(mx - ax) + Math.hypot(m2 - mx, ey - ay) + Math.abs(ex - m2); // polyline length, no getTotalLength() per frame
      L.path.style.strokeDasharray = len; L.path.style.strokeDashoffset = len * (1 - t);
      L.path.style.opacity = t > 0 ? 1 : 0;
    }
    L.el.style.transform = `translate3d(${lx}px,${ly + (1 - t) * 8}px,0)`; L.el.style.left = "0px"; L.el.style.top = "0px";
    L.el.style.opacity = t;
    L.dot.setAttribute("x", ax - 2.5); L.dot.setAttribute("y", ay - 2.5); L.dot.style.opacity = t;
    L.num.setAttribute("x", ax + 8); L.num.setAttribute("y", ay - 7); L.num.style.opacity = phone ? t : 0;
  }
}

// ---------------------------------------------------------------- one clock: Lenis + this rAF
// C29 ("the scrolling is way too fast, slow it down at the start"): wheel and trackpad input is scaled to half at the top of
// the page and eases back to normal by the time the Sixth Sense block starts its glide; programmatic scrolls are untouched
const startSlow = () => (RM ? 1 : lerp(0.5, 1, smoother(seg(lenis.scroll / LY.U, 0, W_.fly[0]))));
const lenis = new Lenis({ autoRaf: false, lerp: 0.075, wheelMultiplier: 0.9, anchors: false, virtualScroll: (d) => { const k = startSlow(); d.deltaX *= k; d.deltaY *= k; } });
const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
addEventListener("pointermove", (e) => { pointer.x = (e.clientX / innerWidth) * 2 - 1; pointer.y = (e.clientY / innerHeight) * 2 - 1; });
const pin = $("#top"), tail = $("#tail"), paper = $("#paper"), rsp = $("#rsp"), closer = $("#closer"), xp = $(".xp");
const giant = $("#giant"), intro = $("#intro"), side = $("#side"), cue = $("#cue"), shade = $("#shade"), hscrim = $("#hscrim");
const mp = $("#p-sixth .mp"), phonesEls = [...document.querySelectorAll("#p-sixth .demo.phones img")], sixthText = $("#p-sixth > div:first-child");
const workSh = $("#work .sh"), workShSide = [workSh.querySelector(".k"), workSh.querySelector("p")], frameEl = $("#frame");

// ---- headings rise word by word (like the name in the hero)
function splitWords(el, stagger = true) { // stagger only for CSS-transitioned headings; a delay on a scrubbed one makes it lag
  const walk = (node) => { for (const n of [...node.childNodes]) {
    if (n.nodeType === 3) { const f = document.createDocumentFragment(); n.textContent.split(/(\s+)/).forEach((w) => { if (!w) return; if (/^\s+$/.test(w)) { f.append(w); return; } const o = document.createElement("span"), i = document.createElement("span"); o.className = "wd"; i.textContent = w; o.append(i); f.append(o); }); n.replaceWith(f); }
    else if (n.nodeType === 1 && n.tagName !== "BR") walk(n); } };
  walk(el); const ws = [...el.querySelectorAll(".wd>span")]; if (stagger) ws.forEach((w, i) => { w.style.transitionDelay = `${Math.min(i, 12) * 45}ms`; }); return ws;
}
const workWords = splitWords(workSh.querySelector("h2"), false);
document.querySelectorAll(".rv.wr h2").forEach(splitWords);

// ---- numbers roll into place like an odometer (one-shot, when their card arrives)
function odoPrep(b) {
  const txt = b.textContent, sr = document.createElement("span"); sr.className = "sr"; sr.textContent = txt; b.textContent = "";
  for (const ch of txt) {
    const c = document.createElement("span"); c.setAttribute("aria-hidden", "true");
    if (/\d/.test(ch)) { c.className = "odo"; c.dataset.d = ch; const st = document.createElement("span"); for (let d = 0; d < 10; d++) { const i = document.createElement("i"); i.textContent = d; st.append(i); } c.append(st); }
    else { c.className = "och"; c.textContent = ch; }
    b.append(c);
  }
  b.append(sr);
}
const odoRun = (root) => { const os = [...root.querySelectorAll(".odo")]; os.forEach((o, i) => { const st = o.firstChild; if (RM) st.style.transition = "none"; st.style.transitionDelay = `${120 + i * 40}ms`; st.style.transform = `translateY(${-o.dataset.d}em)`; }); };
// C25: no rolling digits (stills caught them mid-roll and they read broken); numbers fade with their card
let sixthOdo = false;

// ---- cursor spotlight on cards (pointer devices only)
document.querySelectorAll(".fc, .mc, .xc").forEach((c) => c.classList.add("spot"));
if (matchMedia("(hover: hover)").matches) addEventListener("pointermove", (e) => { const c = e.target.closest?.(".spot"); if (!c) return; const r = c.getBoundingClientRect(); c.style.setProperty("--mx", `${(e.clientX - r.left).toFixed(0)}px`); c.style.setProperty("--my", `${(e.clientY - r.top).toFixed(0)}px`); }, { passive: true });

// ---- nav: an underline that slides to the section you are in
const ind = $("#ind"), navA = { work: $('header a[data-go="work"]'), experience: $('header a[data-go="experience"]'), about: $('header a[data-go="about"]') };
let navOn = "";
function navTo(k) { if (k === navOn) return; navOn = k; const a = navA[k]; if (!a || !a.offsetWidth) { ind.style.opacity = 0; return; } ind.style.width = `${a.offsetWidth}px`; ind.style.transform = `translateX(${a.offsetLeft}px)`; ind.style.opacity = 1; }

// ---- parallax inside the media panels: the phones at three depths, the clip and the planner UI drift against the card
// panels after the first open like the first did (a clip from the panel's inset outward), scrubbed by where they sit
const panes = [...document.querySelectorAll("#paper .pane")].map((pn, i) => ({ pn, mp: pn.closest(".mp"), opens: i > 0, phones: [...pn.querySelectorAll(".demo.phones img")], media: pn.querySelector(".demo.par img, .demo.par video"), y: 0, h: 1 }));
// finale refs: its pin, the two names (the canvas sits right after whichever one is live), the copy that scrubs in
const fin = $("#contact"), fpin = $("#fpin"), heroName = $("h1.giant"), finName = $("h2.fname");
const fveil = $("#fveil"), fscrim = $("#fscrim"), finWords = [...document.querySelectorAll("#fname .w span")], finItems = [...document.querySelectorAll("#fcopy > *"), $("#fside")];
let inFin = false, nodT = -1, tNow = 0, tPrev = 0; // the chip nods when the email is copied (finale only); clocks in seconds
// ---------------------------------------------------------------- the slab (C24, rebuilt C25): the Sixth Sense block as a piece of silicon
// One face, three stacked layers: the code (the die's own material on a crop of the die texture, so it matches the die
// exactly as it lifts), the app (the card's media panel drawn 1:1, unlit, so it lands pixel-matched with the DOM) revealed
// behind a moving edge, and an additive band of light riding that edge. Corners round from the die block's to the card's
// radius; both images are cover-cropped as the face changes aspect, never stretched. A dark body gives it thickness.
focusPlane.visible = false; // unused since C21; it sat exactly where the slab seats
const RW = (FOCUS.w / TS) * DIE, RH = (FOCUS.h / TS) * DIE, SLT = 0.03, FACE = 0.5;
const SX0 = (FOCUS.x / TS - 0.5) * DIE, SX1 = ((FOCUS.x + FOCUS.w) / TS - 0.5) * DIE, SZ0 = (FOCUS.y / TS - 0.5) * DIE, SZ1 = ((FOCUS.y + FOCUS.h) / TS - 0.5) * DIE;
const SEAT = new THREE.Vector3((SX0 + SX1) / 2, DIE_Y - FACE * SLT + 0.0004, (SZ0 + SZ1) / 2); // seated: code face flush with the die
const cropCv = Object.assign(document.createElement("canvas"), { width: Math.round(FOCUS.w), height: Math.round(FOCUS.h) });
cropCv.getContext("2d").drawImage(dieTex.image, FOCUS.x, FOCUS.y, FOCUS.w, FOCUS.h, 0, 0, cropCv.width, cropCv.height);
const cropTex = new THREE.CanvasTexture(cropCv); cropTex.colorSpace = THREE.SRGBColorSpace; cropTex.anisotropy = 16;
const A0 = FOCUS.w / FOCUS.h; // the code crop's aspect
const FU = { uOp: { value: 1 }, uAsp: { value: A0 }, uRad: { value: 0.01 }, uEdge: { value: -2 }, uSoft: { value: 0.07 }, uBand: { value: 0 } };
const RRECT = `uniform float uOp; uniform float uAsp; uniform float uRad; varying vec2 vRaw;
float rrect(vec2 uv) { vec2 p = (uv - 0.5) * vec2(uAsp, 1.0); vec2 q = abs(p) - (vec2(uAsp, 1.0) * 0.5 - uRad); return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRad; }
float sweepS(vec2 uv) { return dot((uv - 0.5) * vec2(uAsp, 1.0), normalize(vec2(1.0, -0.38))); }`;
const withFace = (m, frag) => { m.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, FU);
  sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec2 vRaw;").replace("#include <uv_vertex>", "#include <uv_vertex>\nvRaw = uv;");
  sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform float uEdge; uniform float uSoft;\n" + RRECT).replace("#include <map_fragment>", "#include <map_fragment>\n" + frag); }; return m; };
const codeMat = withFace(new THREE.MeshPhysicalMaterial({ map: cropTex, emissiveMap: cropTex, emissive: 0xffffff, emissiveIntensity: 1.05, metalness: 0.5, roughness: 0.3, iridescence: 0.55, iridescenceIOR: 1.45, iridescenceThicknessRange: [120, 560], clearcoat: 0.5, clearcoatRoughness: 0.12, transparent: true }),
  "{ float sd = rrect(vRaw); diffuseColor.a *= (1.0 - smoothstep(-fwidth(sd), fwidth(sd), sd)) * uOp; }");
const appMat = withFace(new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true, depthWrite: false }),
  "{ float sd = rrect(vRaw); diffuseColor.a *= (1.0 - smoothstep(-fwidth(sd), fwidth(sd), sd)) * (1.0 - smoothstep(uEdge - uSoft, uEdge + uSoft, sweepS(vRaw))) * uOp; }");
const bandMat = new THREE.ShaderMaterial({ uniforms: FU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: "varying vec2 vRaw; void main() { vRaw = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: `uniform float uEdge; uniform float uBand; ${RRECT}
  void main() { float sd = rrect(vRaw), inside = 1.0 - smoothstep(-fwidth(sd), fwidth(sd), sd), x = sweepS(vRaw) - uEdge;
    float a = uOp * inside * uBand * (0.55 * exp(-x * x / 0.0032) + 0.1 * exp(-x * x / 0.09)); gl_FragColor = vec4(vec3(1.0, 0.95, 0.88) * a, a); }` });
const slab = new THREE.Group(), slabBody = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x24262c, metalness: 0.6, roughness: 0.35 }));
const face = (m, dy, ro) => { const f = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m); f.rotation.x = -Math.PI / 2; f.position.y = FACE + dy; f.renderOrder = ro; slab.add(f); return f; };
const codeFace = face(codeMat, 0.02, 1), appFace = face(appMat, 0.04, 2), bandFace = face(bandMat, 0.06, 3);
slab.add(slabBody); slab.visible = false; scene.add(slab);
// the scribe: two lines run from the block's back-left corner round to its front-right corner (a dicing cut), additive
const scribeMat = new THREE.MeshBasicMaterial({ color: 0xffe9cc, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
const scribe = [0, 1, 2, 3].map(() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), scribeMat); m.rotation.x = -Math.PI / 2; m.position.y = DIE_Y + 0.0009; m.visible = false; chip.add(m); return m; });
const SCW = 0.0045;
function scribeTo(sp) { // sp 0..1 of each tracer's path (half the perimeter)
  const w = SX1 - SX0, h = SZ1 - SZ0, c = sp * (w + h), L = [Math.min(c, w), clamp(c - w, 0, h), Math.min(c, h), clamp(c - h, 0, w)];
  const at = [[SX0 + L[0] / 2, SZ0, L[0], SCW], [SX1, SZ0 + L[1] / 2, SCW, L[1]], [SX0, SZ0 + L[2] / 2, SCW, L[2]], [SX0 + L[3] / 2, SZ1, L[3], SCW]];
  scribe.forEach((m, i) => { const [x, z, sx, sz] = at[i]; m.visible = sp > 0 && L[i] > 1e-4; m.position.x = x; m.position.z = z; m.scale.set(sx + SCW, sz + SCW, 1); });
}
const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10); // zero velocity and acceleration at both ends
// pose: L = lifted out of the seat (0..1), u = glide to the target rect (0..1, linear in), ed = the light edge (-1..1, -1 =
// all code, 1 = all app), band = the light's strength. The target is a plane parallel to the screen at the depth where the
// block's height projects to the rect's height, so the landing is exact for any layout.
const cX = new THREE.Vector3(), cY = new THREE.Vector3(), cZ = new THREE.Vector3(), sUp = new THREE.Vector3(), sP0 = new THREE.Vector3(), sP1 = new THREE.Vector3(), sTmp = new THREE.Vector3(), sAx = new THREE.Vector3();
const sQ0 = new THREE.Quaternion(), sQf = new THREE.Quaternion(), sQb = new THREE.Quaternion(), sM = new THREE.Matrix4();
function slabPose(L, u, ed, band, R) {
  const f = smoother(u);
  camera.updateMatrixWorld(); chip.updateMatrixWorld();
  cX.setFromMatrixColumn(camera.matrixWorld, 0); cY.setFromMatrixColumn(camera.matrixWorld, 1); cZ.setFromMatrixColumn(camera.matrixWorld, 2);
  chip.getWorldQuaternion(sQ0); sUp.set(0, 1, 0).applyQuaternion(sQ0);
  sP0.copy(SEAT); chip.localToWorld(sP0); sP0.addScaledVector(sUp, 0.2 * smoother(L));
  const z1 = (RH * H) / (2 * tanH * R.h), w1 = (R.w * 2 * z1 * tanH) / H, nx = ((R.x + R.w / 2) / W) * 2 - 1, ny = -((R.y + R.h / 2) / H) * 2 + 1;
  sP1.copy(camera.position).addScaledVector(cX, nx * tanH * aspect * z1).addScaledVector(cY, ny * tanH * z1).addScaledVector(cZ, -(z1 + (FACE + 0.06) * SLT));
  slab.position.lerpVectors(sP0, sP1, f);
  // orientation: square to the screen, with one gentle bank about the axis across the direction of travel (sine, <= 9 deg)
  sM.makeBasis(cX, cZ, sTmp.copy(cY).negate()); sQf.setFromRotationMatrix(sM);
  sTmp.subVectors(sP1, sP0); sTmp.addScaledVector(cZ, -sTmp.dot(cZ)); sAx.crossVectors(cZ, sTmp).normalize();
  sQb.setFromAxisAngle(sAx, -0.15 * Math.sin(Math.PI * f));
  slab.quaternion.copy(sQ0).slerp(sQf, f).premultiply(sQb);
  const w = lerp(RW, w1, f), asp = w / RH; slab.scale.set(w, SLT, RH);
  slabBody.scale.set(1 - 0.032 / w, 1, 1 - 0.032 / RH); // inset under the rounded corners
  // cover-crop both images to the face's current aspect (never stretch); round the corners from ~1.5 px to the card's 12 px
  cropTex.repeat.set(1, Math.min(1, A0 / asp)); cropTex.offset.set(0, (1 - cropTex.repeat.y) / 2);
  if (appTex) { const a1 = R.w / R.h; appTex.repeat.set(Math.min(1, asp / a1), 1); appTex.offset.set((1 - appTex.repeat.x) / 2, 0); }
  const depth = -sTmp.subVectors(slab.position, camera.position).dot(cZ), facePx = (RH * H) / (2 * depth * tanH);
  FU.uAsp.value = asp; FU.uRad.value = lerp(1.5, 12, f) / facePx; FU.uEdge.value = ed; FU.uBand.value = band;
}
// the app side: the Sixth Sense media panel, drawn like the DOM draws it (same gradient, phone sizes, radii, shadows)
const appCv = document.createElement("canvas"); let appTex = null;
const appReady = Promise.all(phonesEls.map((im) => im.decode().catch(() => {})));
function drawApp() {
  const T = LY.T, dpr = Math.min(devicePixelRatio, 2), cw = Math.max(2, Math.round(T.w * dpr)), ch = Math.max(2, Math.round(T.h * dpr)), g = appCv.getContext("2d");
  appCv.width = cw; appCv.height = ch;
  g.fillStyle = "#0E0A07"; g.fillRect(0, 0, cw, ch);
  g.save(); g.translate(cw * 0.5, ch * 0.4); g.scale((0.8 * cw) / (0.9 * ch), 1); const gr = g.createRadialGradient(0, 0, 0, 0, 0, 0.9 * ch); gr.addColorStop(0, "#2B2018"); gr.addColorStop(1, "#0E0A07"); g.fillStyle = gr; g.fillRect(-4 * cw, -4 * ch, 8 * cw, 8 * ch); g.restore();
  const ph = 0.84 * ch, pw = (ph * 443) / 960, gap = 0.04 * cw, x0 = (cw - (3 * pw + 2 * gap)) / 2, y0 = (ch - ph) / 2, r = 16 * dpr, P0 = panes[0];
  const d0 = clamp((-LY.k + P0.y + P0.h / 2 - LY.VH / 2) / LY.VH, -1, 1);
  phonesEls.forEach((im, i) => {
    const x = x0 + i * (pw + gap), yy = y0 + d0 * (10 + i * 9) * dpr;
    g.save(); g.shadowColor = "rgba(0,0,0,.5)"; g.shadowBlur = 20 * dpr; g.shadowOffsetY = 20 * dpr; g.fillStyle = "#000"; g.beginPath(); g.roundRect(x, yy, pw, ph, r); g.fill(); g.restore();
    g.save(); g.beginPath(); g.roundRect(x, yy, pw, ph, r); g.clip();
    if (im.naturalWidth) { const k = Math.max(pw / im.naturalWidth, ph / im.naturalHeight), sw = pw / k, sh = ph / k; g.drawImage(im, (im.naturalWidth - sw) / 2, (im.naturalHeight - sh) / 2, sw, sh, x, yy, pw, ph); }
    g.restore(); g.strokeStyle = "rgba(255,255,255,.08)"; g.lineWidth = dpr; g.beginPath(); g.roundRect(x - 0.5 * dpr, yy - 0.5 * dpr, pw + dpr, ph + dpr, r + 0.5 * dpr); g.stroke();
  });
  g.strokeStyle = "rgba(239,231,218,.06)"; g.lineWidth = dpr; g.strokeRect(0.5 * dpr, 0.5 * dpr, cw - dpr, ch - dpr);
  appTex?.dispose(); appTex = new THREE.CanvasTexture(appCv); appTex.colorSpace = THREE.SRGBColorSpace; appTex.anisotropy = 8;
  appMat.map = appTex; appMat.needsUpdate = true;
  ambDraw(ambs[0], appCv);
}
// ---- light from each project's media spills onto its card (a tiny pre-blurred copy of the media behind the panel)
const ambs = [...document.querySelectorAll("#paper .fc")].map((fc) => {
  const c = Object.assign(document.createElement("canvas"), { width: 120, height: 80, className: "amb" }); c.setAttribute("aria-hidden", "true"); fc.prepend(c);
  return { c, g: c.getContext("2d"), vid: fc.querySelector(".demo video"), img: fc.querySelector(".demo.par img"), t: -1 };
});
function ambDraw(a, src) { if (!a || !src) return; const g = a.g; g.clearRect(0, 0, 120, 80); g.filter = "blur(7px) saturate(1.05)"; try { g.drawImage(src, -14, -14, 148, 108); } catch {} g.filter = "none";
  // feather to a soft ellipse, so the glow has no edge of its own
  g.globalCompositeOperation = "destination-in"; g.setTransform(1, 0, 0, 80 / 120, 0, 0); const m = g.createRadialGradient(60, 60, 0, 60, 60, 60);
  m.addColorStop(0, "#000"); m.addColorStop(0.5, "rgba(0,0,0,.8)"); m.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = m; g.fillRect(0, 0, 120, 120);
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "source-over"; }
for (const a of ambs) { if (a.img) (a.img.complete ? Promise.resolve() : new Promise((r) => a.img.addEventListener("load", r, { once: true }))).then(() => ambDraw(a, a.img));
  if (a.vid) { const im = new Image(); im.src = a.vid.poster; im.decode().then(() => ambDraw(a, im)).catch(() => {}); } }
// ---- the About rows draw in like datasheet lines
const factRows = [...document.querySelectorAll(".facts .r")]; let factY = [];
factRows.forEach((r, i) => { r.classList.add("rv"); r.style.transitionDelay = `${i * 70}ms`; }); // C25: one-shot reveal
const setVar = (el, k, v) => { if (el.__c?.[k] !== v) { (el.__c ||= {})[k] = v; el.style.setProperty(k, v); } };

// layout constants, measured on resize/fonts/content changes only
const LY = { U: 1, VH: 1, VW: 1, k: 0, R: 0, T: { x: 0, y: 0, w: 1, h: 1 }, paperH: 1, tail: 0, paperAfter: 0, closer: 0, rail: 0, railH: 0, fin: 0, go: {} };
// document top of an element once the paper has let go (inside the paper) or in normal flow (the closer)
const docTop = (el) => { let y = 0; while (el && el !== tail && el !== paper) { y += el.offsetTop; el = el.offsetParent; } return y + (el === paper ? LY.paperAfter : tail.offsetTop); };
function layout() {
  LY.VH = pin.offsetHeight; LY.U = LY.VH / 100; LY.VW = paper.offsetWidth; LY.paperH = paper.offsetHeight;
  const pr = paper.getBoundingClientRect(), mr = mp.getBoundingClientRect();
  const m = { x: mr.left - pr.left, y: mr.top - pr.top, w: mr.width, h: mr.height }; // the media panel, in paper coordinates
  LY.k = Math.max(0, Math.round(m.y + m.h + 24 - LY.VH)); // short screens: hold the paper a little higher so the panel is whole
  LY.R = (W_.end - W_.panel[0]) * LY.U;
  paper.style.top = `${-LY.k}px`; rsp.style.height = `${LY.R}px`; // the paper is held (sticky) for exactly R of scroll
  tail.style.marginTop = `${(W_.panel[0] - STAGE) * LY.U - LY.k}px`; // ...starting the moment the panel window opens
  LY.T = { x: m.x, y: m.y - LY.k, w: m.w, h: m.h }; // where the panel sits on screen while the paper is held
  LY.tail = tail.offsetTop; LY.paperAfter = LY.tail + LY.R;
  LY.closer = docTop(closer); LY.rail = docTop(xp); LY.railH = xp.offsetHeight;
  LY.fin = docTop(fin);
  LY.go = { top: 0, work: W_.open[1] * LY.U, experience: docTop($("#experience")), about: LY.closer, contact: LY.fin + FIN.go * LY.U };
  const prt = paper.getBoundingClientRect().top; for (const P of panes) { const r = P.pn.getBoundingClientRect(); P.y = r.top - prt; P.h = r.height; }
  navOn = "-";
  for (const L of labels) { L.w = L.el.offsetWidth; L.h = L.el.offsetHeight; }
  rheadBottom = rhead.offsetTop + rhead.offsetHeight;
  factY = factRows.map(docTop);
  appReady.then(drawApp);
  buildRail();
}

// ---------------------------------------------------------------- the experience rail: drawn by scroll, reversible
const NS = "http://www.w3.org/2000/svg", rail = $("#rail");
const mk = (tag, at = {}) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); return e; };
let railClip = null, railNodes = [];
function buildRail() {
  const rows = [...document.querySelectorAll(".xc")], narrow = innerWidth < 860, X = (l) => (narrow ? 4 + l * 6 : 14 + l * 14), yOf = (el) => el.offsetTop + 34;
  rail.innerHTML = "";
  const cp = mk("clipPath", { id: "railclip" }); railClip = mk("rect", { x: -60, y: -60, width: 200, height: 0 }); cp.append(railClip);
  const defs = mk("defs"); defs.append(cp); rail.append(defs);
  const g = mk("g", { "clip-path": "url(#railclip)" }); rail.append(g);
  const line = (d, c) => g.append(mk("path", { d, fill: "none", stroke: c, "stroke-width": 1.5 }));
  const now = rows.filter((r) => r.hasAttribute("data-now")), past = rows.filter((r) => !r.hasAttribute("data-now")), yEnd = yOf(rows[rows.length - 1]);
  line(`M${X(0)},0 V${yEnd}`, "rgba(239,231,218,.22)");
  railNodes = [];
  const node = (row, x, y, s, c) => { const ring = mk("rect", { x: x - s / 2 - 4, y: y - s / 2 - 4, width: s + 8, height: s + 8, class: "ring" }); rail.append(ring); row.__ring = ring;
    const r = mk("rect", { x: x - s / 2, y: y - s / 2, width: s, height: s, fill: c }); r.style.transformBox = "fill-box"; r.style.transformOrigin = "center"; rail.append(r); railNodes.push({ r, y }); };
  // the open roles as copper: each lane forks off the main line at a 45-degree chamfer below its role and runs straight
  // up to "now", ending on a square via (11-07 section 7: PCB traces, no curves)
  const via = (x) => g.append(mk("rect", { x: x - 3.5, y: -3.5, width: 7, height: 7, fill: "#100C09", stroke: "#6670F0", "stroke-width": 1.5 }));
  now.forEach((r, i) => { const l = narrow ? 0 : i, y = yOf(r), x = X(l), x0 = X(0);
    line(l ? `M${x},0 V${y} L${x0},${y + (x - x0)}` : `M${x0},0 V${y}`, "#6670F0"); if (l || i === 0) via(x); node(r, x, y, 8, "#8E9AE6"); });
  past.forEach((r) => node(r, X(0), yOf(r), 7, "#8E8476"));
  // C24: a copper trace from each node to its card, with a pad at the card's edge; where it meets an open lane it passes
  // under it (a gap), as a second-layer trace would
  const railW = narrow ? 22 : 64, lanes = now.map((r, i) => ({ x: X(narrow ? 0 : i), y: yOf(r) }));
  rows.forEach((r) => { const isNow = r.hasAttribute("data-now"), li = now.indexOf(r), x = isNow ? X(narrow ? 0 : li) : X(0), y = yOf(r), c = isNow ? "#6670F0" : "#5F574D";
    const cuts = lanes.filter((l) => l.x > x + 2 && l.y > y).map((l) => l.x).sort((a, b) => a - b); let x0 = x + 5, d = "";
    d += `M${x0},${y} H${railW - 3}`;
    const tr = mk("path", { d, fill: "none", stroke: c, "stroke-width": 1.25, class: "tr" }); g.append(tr); r.__trace = tr;
    g.append(mk("rect", { x: railW - 3, y: y - 4, width: 3, height: 8, fill: c })); });
  if (!narrow) { const t = mk("text", { x: X(0) - 2, y: -10, "font-family": "Geist Mono", "font-size": 11, fill: "#8E9AE6" }); t.textContent = "now"; g.append(t); }
  railY = NaN;
}
let railY = NaN;
document.querySelectorAll(".xc").forEach((x) => { x.addEventListener("pointerenter", () => { x.__ring?.classList.add("on"); x.__trace?.classList.add("on"); }); x.addEventListener("pointerleave", () => { x.__ring?.classList.remove("on"); x.__trace?.classList.remove("on"); }); });
function drawRail(scrollY) {
  const d = clamp(Math.round(scrollY + LY.VH * 0.74 - LY.rail), -60, LY.railH + 60);
  if (d === railY || !railClip) return; railY = d;
  railClip.setAttribute("height", d + 60);
  for (const n of railNodes) { const k = RM ? (d >= n.y ? 1 : 0) : easeOut(seg(d, n.y - 6, n.y + 26)); n.r.style.opacity = k; n.r.style.transform = `scale(${0.4 + 0.6 * k})`; }
}

// ---------------------------------------------------------------- one-shot reveals, video only in view
const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("on"); odoRun(e.target); io.unobserve(e.target); } }), { threshold: 0.15 });
document.querySelectorAll(".rv").forEach((el) => io.observe(el));
document.querySelectorAll(".more .mc").forEach((el, i) => { el.style.transitionDelay = `${i * 60}ms`; });
const vio = new IntersectionObserver((es) => es.forEach((e) => { const vd = e.target; if (e.isIntersecting && !RM) { vd.preload = "auto"; vd.play().catch(() => {}); } else vd.pause(); }), { threshold: 0.25 });
document.querySelectorAll("video[data-inview]").forEach((vd) => vio.observe(vd));

// ---------------------------------------------------------------- navigation: a scroll through the story, never a cut
const goY = (y, dur) => { const d = Math.abs(y - lenis.scroll) / LY.VH; lenis.scrollTo(y, RM ? { immediate: true } : { duration: dur ?? clamp(0.7 + 0.12 * d, 0.9, 1.8), easing: easeIO }); };
document.addEventListener("click", (e) => { const a = e.target.closest("[data-go]"); if (!a) return; e.preventDefault(); const y = LY.go[a.dataset.go]; if (y != null) goY(y); });
const toast = $("#toast"); let toastT = 0;
const showToast = () => { toast.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => toast.classList.remove("on"), 2000); };
const copyMail = async () => { try { await navigator.clipboard.writeText("vishalnaveen@ufl.edu"); showToast(); if (inFin && !RM) nodT = tNow; } catch { location.href = "mailto:vishalnaveen@ufl.edu"; } };
$("#mail").addEventListener("click", copyMail);

// ---------------------------------------------------------------- the die as a map (pointer devices, during the label read)
// The pointer is cast onto the die; the block under it lights (an accent plate eases over it, its label lights with it)
// and a click scrolls through the story to that block's card. Hovering a label = hovering its block.
const HOVER = matchMedia("(hover: hover)").matches && !RM;
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), ptr = { x: 0, y: 0, over: false, lab: null };
addEventListener("pointermove", (e) => { ptr.x = e.clientX; ptr.y = e.clientY; ptr.over = e.target === canvas; ptr.lab = e.target.closest?.(".lab") || null; }, { passive: true });
const hotG = new THREE.Group(), hotFill = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x8e9ae6, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
hotFill.rotation.x = -Math.PI / 2;
const hotLine = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]].map(([x, z]) => new THREE.Vector3(x, 0, z))), new THREE.LineBasicMaterial({ color: 0xb4bdff, transparent: true, opacity: 0, depthWrite: false }));
hotG.add(hotFill, hotLine); hotG.position.y = DIE_Y + 0.0012; hotG.visible = false; chip.add(hotG);
const HS = { a: 0, x: 0, z: 0, w: 0.01, h: 0.01, rg: null };
const regionAt = (u, vv) => { const px = u * TS, py = (1 - vv) * TS; return DIE_REGIONS.find((r) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) || null; };
const MAP_GO = { "Sixth Sense": () => goY(LY.go.work, 2.6), "TactileVLA-Edge": () => goY(docTop($("#p-tvla")) - 96, 2.4), "TactileVLA demo site": () => goY(docTop($("#p-tvla")) - 96, 2.4),
  "RL LDPC decoding": () => goY(docTop(xcBy("USF")) - 96, 2.4), "Flash translation layer": () => goY(docTop(xcBy("FTL")) - 96, 2.4) };
let mapHot = null;
function mapTick(on, dt) {
  const ease = (r) => 1 - Math.exp(-r * dt); // time-based, so 60 Hz, 120 Hz and the capture clock all glide alike
  let hot = null;
  if (on) {
    if (ptr.lab) hot = labels.find((L) => L.el === ptr.lab)?.rg || null;
    else if (ptr.over) { camera.updateMatrixWorld(); chip.updateMatrixWorld(); ndc.set((ptr.x / W) * 2 - 1, -(ptr.y / H) * 2 + 1); ray.setFromCamera(ndc, camera); const h = ray.intersectObject(dieTop)[0]; if (h) hot = regionAt(h.uv.x, h.uv.y); }
  }
  if (hot !== mapHot) {
    for (const L of labels) { const o = L.rg === hot; L.el.classList.toggle("hot", o); /* the label lights via CSS colour only */ L.path.classList.toggle("hot", o); L.dot.classList.toggle("hot", o); }
    canvas.style.cursor = hot ? "pointer" : ""; mapHot = hot;
  }
  if (hot) { const tx = ((hot.x + hot.w / 2) / TS - 0.5) * DIE, tz = ((hot.y + hot.h / 2) / TS - 0.5) * DIE, tw = (hot.w / TS) * DIE, th = (hot.h / TS) * DIE, j = HS.a < 0.04 ? 1 : ease(14);
    HS.x += (tx - HS.x) * j; HS.z += (tz - HS.z) * j; HS.w += (tw - HS.w) * j; HS.h += (th - HS.h) * j; }
  HS.a += ((hot ? 1 : 0) - HS.a) * ease(10); if (HS.a < 0.003) HS.a = 0;
  hotG.visible = HS.a > 0; hotG.position.x = HS.x; hotG.position.z = HS.z; hotG.scale.set(HS.w, 1, HS.h);
  hotFill.material.opacity = 0.07 * HS.a; hotLine.material.opacity = 0.85 * HS.a;
  WAKE.uHotA.value = HS.a; WAKE.uHot.value.set((HS.x - HS.w / 2) / DIE + 0.5, 0.5 - (HS.z + HS.h / 2) / DIE, (HS.x + HS.w / 2) / DIE + 0.5, 0.5 - (HS.z - HS.h / 2) / DIE);
}
addEventListener("click", (e) => { if (!mapHot || !(e.target === canvas || e.target.closest?.(".lab"))) return; MAP_GO[mapHot.id]?.(); });

// Cmd+K: jump to a project, a role, or an action
const pk = $("#pk"), pkq = $("#pkq"), pkl = $("#pkl");
const toEl = (sel) => () => goY(docTop($(sel)) - 96);
const ITEMS = [
  ["Projects", "Sixth Sense", "iOS, Core ML, App Challenge 3rd", toEl("#p-sixth")],
  ["Projects", "TactileVLA-Edge", "Robot learning, LeRobot", toEl("#p-tvla")],
  ["Projects", "Zer0Sh0t", "SwampHacks XII, 3rd of 141", toEl("#p-zero")],
  ["Projects", "Lucid Dreams, Midnight", "More projects", toEl(".morehead")],
  ...[...document.querySelectorAll(".xc")].map((x, i) => ["Experience", `${x.querySelector(".org").textContent}, ${x.querySelector("h3").textContent}`, x.querySelector(".date").textContent, () => goY(docTop(x) - 96)]),
  ["Sections", "About", "Education, toolkit", () => goY(LY.go.about)],
  ["Sections", "Contact", "Email, résumé", () => goY(LY.go.contact)],
  ["Actions", "Copy email", "vishalnaveen@ufl.edu", copyMail],
  ["Actions", "Download résumé", "PDF", () => { location.href = "media/resume.pdf"; }],
  ["Actions", "Open GitHub", "github.com/vishal-naveen", () => open("https://github.com/vishal-naveen", "_blank", "noopener")],
  ["Actions", "Open LinkedIn", "linkedin.com/in/vishalnaveen", () => open("https://www.linkedin.com/in/vishalnaveen/", "_blank", "noopener")],
];
let pkSel = 0, pkShown = [], pkBack = null;
function pkRender() {
  const q = pkq.value.trim().toLowerCase();
  pkShown = ITEMS.filter((it) => !q || `${it[0]} ${it[1]} ${it[2]}`.toLowerCase().includes(q));
  pkSel = Math.min(pkSel, Math.max(0, pkShown.length - 1));
  pkl.innerHTML = ""; let grp = "";
  pkShown.forEach((it, i) => {
    if (it[0] !== grp) { grp = it[0]; const h = document.createElement("div"); h.className = "h mono"; h.textContent = grp; pkl.append(h); }
    const d = document.createElement("div"); d.className = "it" + (i === pkSel ? " sel" : ""); d.setAttribute("role", "option");
    d.innerHTML = "<span></span><em></em>"; d.firstChild.textContent = it[1]; d.lastChild.textContent = it[2];
    d.addEventListener("click", () => pkRun(i)); d.addEventListener("pointermove", () => { if (pkSel !== i) { pkSel = i; pkRender(); } });
    pkl.append(d);
  });
}
const pkOpen = () => { pkBack = document.activeElement; pk.classList.add("on"); lenis.stop(); pkq.value = ""; pkSel = 0; pkRender(); setTimeout(() => pkq.focus(), 0); };
const pkClose = () => { pk.classList.remove("on"); lenis.start(); pkBack?.focus?.(); };
const pkRun = (i) => { const it = pkShown[i]; if (!it) return; pkClose(); it[3](); };
$("#kbtn").addEventListener("click", pkOpen);
pk.addEventListener("click", (e) => { if (e.target === pk) pkClose(); });
pkq.addEventListener("input", () => { pkSel = 0; pkRender(); });
addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); pk.classList.contains("on") ? pkClose() : pkOpen(); return; }
  if (!pk.classList.contains("on")) return;
  if (e.key === "Escape") { e.preventDefault(); pkClose(); }
  else if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); pkSel = (pkSel + (e.key === "ArrowDown" ? 1 : -1) + pkShown.length) % Math.max(1, pkShown.length); pkRender(); pkl.querySelector(".sel")?.scrollIntoView({ block: "nearest" }); }
  else if (e.key === "Enter") { e.preventDefault(); pkRun(pkSel); }
});

// ---------------------------------------------------------------- layout triggers
let lyQ = 0; const queueLayout = () => { cancelAnimationFrame(lyQ); lyQ = requestAnimationFrame(layout); };
addEventListener("resize", queueLayout);
new ResizeObserver(queueLayout).observe(paper);
new ResizeObserver(queueLayout).observe(closer);
document.fonts.ready.then(queueLayout);
layout();

// ---------------------------------------------------------------- the frame
// ?perf=1: a frame-time readout for measuring in a real browser (headless timing has misled before)
const PERF = /[?&]perf=1/.test(location.search), pf = []; let pl = 0, pel = null;
if (PERF) { pel = document.createElement("div"); pel.style.cssText = "position:fixed;left:12px;bottom:12px;z-index:99;font:11px 'Geist Mono',monospace;background:rgba(0,0,0,.8);color:#fff;padding:6px 9px;border-radius:6px;pointer-events:none"; document.body.append(pel); }
function perfTick(now) {
  if (pl) pf.push(now - pl); pl = now;
  if (pf.length < 30 || pf.length % 30) return;
  const s = [...pf].sort((a, b) => a - b), q = (k) => s[Math.floor(k * (s.length - 1))], med = q(0.5);
  pel.textContent = `${pf.length} frames  p50 ${med.toFixed(1)} ms  p99 ${q(0.99).toFixed(1)} ms  slow ${((100 * pf.filter((d) => d > med * 1.5).length) / pf.length).toFixed(1)}%`;
}
const t0 = performance.now();
let first = true, labWas = false, rmState = -1, rmShown = 0, rmT = 0;
const set = (el, k, val) => { if (el.__c?.[k] !== val) { (el.__c ||= {})[k] = val; el.style[k] = val; } }; // write only on change
function frame(now) {
  requestAnimationFrame(frame);
  if (PERF) perfTick(now);
  lenis.raf(now);
  const t = (window.__tHold ?? now - t0) / 1000, y = lenis.scroll, sv = y / LY.U; // __tHold: capture tools freeze the idle motion
  const dt = clamp(t - tPrev, 0, 0.1); tPrev = t; tNow = t;
  let k1, k2, k3, g, intro01, outA, nameK, rheadA, rheadY, labA, scrimA, pa, op, tx, lift, dim, fly, swp, cut, scr;
  if (!RM) {
    intro01 = easeOut(clamp((t - 0.15) / 1.9, 0, 1));
    k1 = easeIO(seg(sv, ...W_.swing)); k2 = easeIO(seg(sv, ...W_.lid)); k3 = seg(sv, ...W_.labels); g = easeIO(seg(sv, ...W_.glide));
    outA = 1 - easeIO(seg(sv, ...W_.out)); nameK = easeIO(seg(sv, ...W_.name));
    const rin = easeOut(seg(sv, ...W_.rheadIn)), dout = seg(sv, ...W_.dieOut);
    rheadA = rin * (1 - dout); rheadY = (1 - rin) * 16; labA = 1 - dout; scrimA = seg(sv, ...W_.scrim);
    pa = easeOut(seg(sv, ...W_.panel)); op = easeIO(seg(sv, ...W_.open)); tx = easeOut(seg(sv, ...W_.text));
    lift = easeOut(seg(sv, ...W_.lift)); dim = seg(sv, ...W_.dim); fly = seg(sv, ...W_.fly); swp = seg(sv, ...W_.sweep); // linear: slabPose and the band ease them
    cut = easeOut(seg(sv, ...W_.cut)); scr = easeIO(seg(sv, ...W_.scribe));
  } else { // three still states; the canvas dips through the background (2 x 160 ms), type cross-fades (320 ms, CSS)
    const want = sv < 100 ? 0 : sv < W_.panel[0] ? 1 : 2;
    if (want !== rmState) { if (rmState < 0) rmShown = want; else { canvas.style.opacity = 0; rmT = now; } rmState = want; }
    if (rmShown !== rmState && now - rmT > 170) { rmShown = rmState; canvas.style.opacity = 1; }
    const s = rmShown, st = rmState; intro01 = 1;
    k1 = k2 = s > 0 ? 1 : 0; k3 = s === 1 ? 1 : 0; g = 0;
    outA = st === 0 ? 1 : 0; nameK = st === 0 ? 0 : 1; rheadA = labA = st === 1 ? 1 : 0; rheadY = 0; scrimA = 0; pa = st === 2 ? 1 : 0; tx = 1; lift = dim = fly = swp = cut = scr = 0;
    op = st === 2 ? 1 : 0; // (11-07 fix) op was pinned to 1 here, so reduced motion never rendered the chip and sat the hero under the shade
  }

  // the finale: from one screen before its pin sticks, the canvas lives there and the camera story runs backwards
  // (the die wakes, the lid seats, the camera returns to the hero pose). Pure function of scroll, like the stage.
  const finOn = LY.fin > 0 && y > LY.fin - LY.VH;
  let moved = false, wakeW = 1, wave = 9, fp = 0;
  if (finOn !== inFin) { inFin = finOn; (finOn ? finName : heroName).after(canvas); (finOn ? fpin : pin).append(labelsEl, rhead); moved = true; }
  if (finOn) {
    fp = (y - LY.fin) / LY.U; intro01 = 1; dim = 0;
    if (RM) { k1 = k2 = g = k3 = 0; rheadA = labA = 0; }
    else { wakeW = easeOut(seg(fp, ...FIN.wake)); wave = lerp(BLK_IN, 1.25, 1 - Math.pow(1 - seg(fp, ...FIN.wave), 2)); // from the block's inscribed radius (nothing outside lights in a step), surging out
      k2 = 1 - easeIO(seg(fp, ...FIN.lid)); g = 1 - easeIO(seg(fp, ...FIN.glide)); k1 = 1 - easeIO(seg(fp, ...FIN.swing));
      k3 = seg(fp, ...FIN.read); const rin = easeOut(seg(fp, ...FIN.rheadIn)), dout = seg(fp, ...FIN.readOut); rheadA = rin * (1 - dout); rheadY = (1 - rin) * 16; labA = 1 - dout; }
  }

  // camera: hero -> over the chip -> settles above the whole die (near top-down, so regions read as rectangles), as a
  // pure function of scroll (exactly reversible)
  const drift = RM ? 0 : finOn ? easeIO(seg(fp, ...FIN.drift)) : easeIO(seg(sv, ...W_.drift)), creep = RM || finOn ? 0 : seg(sv, ...W_.creep); // a slow orbit while you read the die, a slow push after
  const bR = lerp(heroR, dieR, k1) * (1 - 0.06 * drift), bPitch = lerp(27, 63, k1), bYaw = lerp(-24, -6, k1) + 9 * drift + (1 - intro01) * -30, bTy = lerp(heroTy, 0, k1);
  const T = LY.T, fR = ((DIE * (H / 2)) / (tanH * Math.min(0.72 * H, 0.86 * W))) * (1 - 0.07 * creep) * (1 + 0.08 * (RM || finOn ? 0 : smoother(fly))); // the die falls back a little as the slab comes forward
  rig.R = Math.exp(lerp(Math.log(bR), Math.log(fR), g)); rig.pitch = lerp(bPitch, 86, g); rig.yaw = lerp(bYaw, 0, g);
  rig.tx = 0; rig.tz = 0; rig.ty = lerp(bTy, DIE_Y, g);
  focusMat.opacity = 0;
  placeCamera();

  pointer.sx += (pointer.x - pointer.sx) * 0.05; pointer.sy += (pointer.y - pointer.sy) * 0.05;
  const free = RM ? 0 : (1 - k1 * 0.85) * (1 - g); // still by the time the region meets the panel
  const nt = t - nodT, nodX = finOn && !RM && nodT >= 0 && nt < 2.5 ? 0.07 * Math.sin(nt * 9) * Math.exp(-nt * 3.2) : 0;
  chip.rotation.x = pointer.sy * 0.16 * free + nodX;
  chip.rotation.z = -pointer.sx * 0.14 * free;
  chip.rotation.y = Math.sin(t * 0.22) * 0.05 * free + (1 - intro01) * 0.5;
  chip.position.y = Math.sin(t * 0.85) * 0.05 * free - (1 - intro01) * 1.4;
  const capA = 1 - seg(k2, 0.3, 0.65);
  capBody.visible = capEnd.visible = capA > 0.001; capBody.material.opacity = capEnd.material.opacity = capA;
  ihs.position.y = k2 * 1.4; ihs.position.z = -k2 * 9; ihs.rotation.x = -k2 * 0.8;
  // the die powers on behind the leaving lid (a wave from its front edge), and off again ahead of the lid at the finale
  // finale: the die goes dark exactly under the returning lid's front edge (z = 1.85 - 9 k2 in die units, uv.y = (1 - z) / 2);
  // tying it to k2's ease instead darkened the die before the lid was on screen (caught in the C23 walkthrough)
  // C24 finale: the die powers on radially from the seated block (it starts at the block's corners, so the seat is seamless)
  WAKE.uRad.value = finOn && !RM ? 1 : 0;
  WAKE.uWake.value = finOn ? (RM ? -0.16 : wave) : lerp(-0.16, 1.22, easeIO(seg(k2, 0.08, 0.95)));
  WAKE.uLid.value = finOn ? 4.5 * k2 - 0.425 : 9;
  dieMat.emissiveIntensity = 1.05 * (0.6 + 0.4 * k2) * (1 - 0.72 * dim); // the rest of the die dims as the region lifts
  renderer.toneMappingExposure = 1.12 * lerp(0.12, 1, wakeW); // the finale's chip rises out of the dark
  shadow.material.opacity = 0.5 * (1 - k1) * intro01;
  const sc = 1 - chip.position.y * 0.2; shadow.scale.set(sc, sc, sc);

  // type on the stage: one thing leads at a time
  set(giant, "opacity", (1 - nameK).toFixed(4)); set(giant, "transform", `translate3d(0,${(-24 * nameK).toFixed(2)}px,0)`);
  const o = outA.toFixed(4); set(intro, "opacity", o); set(side, "opacity", o); set(cue, "opacity", o);
  set(intro, "pointerEvents", outA < 0.5 ? "none" : "auto"); set(side, "pointerEvents", outA < 0.5 ? "none" : "auto");
  set(rhead, "opacity", rheadA.toFixed(4)); set(rhead, "transform", `translate3d(0,${rheadY.toFixed(2)}px,0)`);
  set(labelsEl, "opacity", labA.toFixed(4)); set(hscrim, "opacity", scrimA.toFixed(4));

  // T6a (C25): the scribe cuts the block out, it lifts straight out and glides to the panel while the light reveals the app
  let slabOn = false, sAlpha = 0, sp = 0;
  const edgeOf = (k) => lerp(-1.05, 1.05, easeIO(k)), bandOf = (k) => Math.sin(Math.PI * k);
  if (!RM && !finOn) {
    sp = scr; sAlpha = scr > 0 ? 1 - easeOut(seg(sv, 360, 386)) : 0;
    WAKE.uCutA.value = cut;
    FU.uOp.value = 1; slabBody.visible = true;
    if (lift > 0 && pa < 1) { slabOn = true; slabPose(lift, fly, edgeOf(swp), bandOf(swp), T); codeMat.emissiveIntensity = 1.05 * (1 + 0.12 * smoother(lift)); }
  } else if (finOn && !RM) {
    const fb = 1 - seg(fp, ...FIN.back), sb = 1 - seg(fp, ...FIN.sweepBack), fl = 1 - seg(fp, ...FIN.drop);
    WAKE.uCutA.value = fp < FIN.seat ? 1 : 0; WAKE.uBlk.value = fp < FIN.seat ? 0 : 1;
    FU.uOp.value = easeIO(seg(fp, -55, -32)); slabBody.visible = FU.uOp.value > 0.999;
    if (fp < FIN.seat) { slabOn = true; const cx = phone ? W * 0.5 : W * 0.64, cy = H * 0.3; /* starts inside the pin */ slabPose(fl, fb, edgeOf(sb), bandOf(sb), { x: cx - T.w / 2, y: cy - T.h / 2, w: T.w, h: T.h }); codeMat.emissiveIntensity = 1.05 * (1 + 0.12 * smoother(fl)); }
    sp = fp >= FIN.seat - 5 ? 1 : 0; sAlpha = seg(fp, FIN.seat - 5, FIN.seat) * (1 - easeOut(seg(fp, FIN.seat, FIN.seat + 24))); /* the seam brightens as it seats, then fades */
  } else WAKE.uCutA.value = 0;
  if (!finOn || RM) WAKE.uBlk.value = 0;
  slab.visible = slabOn; scribeTo(sAlpha > 0 ? sp : 0); scribeMat.opacity = sAlpha;
  // T6b: the region becomes the card. The paper is held (sticky) and clipped to the panel's rectangle; it fades in over
  // the region (code -> the app's screens), then the clip opens outward to the whole page while the die recedes.
  set(paper, "opacity", pa.toFixed(4)); set(paper, "visibility", pa > 0 ? "visible" : "hidden");
  if (op >= 1) set(paper, "clipPath", "none");
  else {
    const x0 = lerp(T.x, 0, op), y0 = lerp(T.y, 0, op), x1 = lerp(T.x + T.w, LY.VW, op), y1 = lerp(T.y + T.h, LY.VH, op);
    set(paper, "clipPath", `inset(${(y0 + LY.k).toFixed(1)}px ${(LY.VW - x1).toFixed(1)}px ${(LY.paperH - y1 - LY.k).toFixed(1)}px ${x0.toFixed(1)}px round ${(12 * (1 - op)).toFixed(1)}px)`);
  }
  // the hairline frame rides the opening edge and fades as it reaches the screen's edges
  if (op > 0 && op < 1 && !RM) {
    const x0 = lerp(T.x, 0, op), y0 = lerp(T.y, 0, op), x1 = lerp(T.x + T.w, LY.VW, op), y1 = lerp(T.y + T.h, LY.VH, op);
    set(frameEl, "visibility", "visible"); set(frameEl, "opacity", (Math.min(1, op * 12) * Math.pow(1 - op, 0.7)).toFixed(4));
    set(frameEl, "transform", `translate3d(${x0.toFixed(1)}px,${y0.toFixed(1)}px,0)`); set(frameEl, "width", `${(x1 - x0).toFixed(1)}px`); set(frameEl, "height", `${(y1 - y0).toFixed(1)}px`);
    set(frameEl, "borderRadius", `${(12 * (1 - op)).toFixed(1)}px`);
  } else set(frameEl, "visibility", "hidden");
  // paper position on screen (held at -k during the hand-off), for the panel parallax
  const pTop = y < LY.tail + LY.k ? LY.tail - y : y < LY.paperAfter + LY.k ? -LY.k : LY.paperAfter - y;
  for (const P of panes) {
    const d = RM ? 0 : clamp((pTop + P.y + P.h / 2 - LY.VH / 2) / LY.VH, -1, 1);
    if (P.phones.length) P.phones.forEach((im, i) => set(im, "transform", `translate3d(0,${(d * (10 + i * 9)).toFixed(1)}px,0)`)); // (C24: no rise; the slab lands showing them)
    // the later panels open from an inset as their top travels from the screen's bottom edge to 55% up; the footage
    // inside settles from a slight push-in at the same time
    let ok = 1;
    if (P.opens && !RM) { ok = easeOut(seg(LY.VH - (pTop + P.y), 0, LY.VH * 0.55));
      set(P.mp, "clipPath", ok >= 1 ? "none" : `inset(${((1 - ok) * 14).toFixed(2)}% ${((1 - ok) * 8).toFixed(2)}% round 12px)`); }
    if (P.media && Math.abs(d) < 1) set(P.media, "transform", `translate3d(0,${(d * 22).toFixed(1)}px,0) scale(${(1.08 + 0.14 * (1 - ok)).toFixed(4)})`);
    P.ok = ok;
  }
  // light spill: on with the page opening (first card) or with each panel's own opening; the clip's footage refreshes it
  ambs.forEach((a, i) => { set(a.c, "opacity", (0.3 * (i === 0 ? op : panes[i]?.ok ?? 1)).toFixed(4));
    if (a.vid && !a.vid.paused && a.vid.readyState >= 2 && now - a.t > 120) { a.t = now; ambDraw(a, a.vid); } });
  // About: each datasheet row draws its rule left to right, then its text, as it rises into view

  set(workShSide[0], "opacity", tx.toFixed(4)); set(workShSide[1], "opacity", tx.toFixed(4));
  workWords.forEach((w, i) => { const kk = RM ? 1 : easeOut(seg(tx, i * 0.14, i * 0.14 + 0.62)); set(w, "transform", kk >= 1 ? "none" : `translate3d(0,${((1 - kk) * 106).toFixed(1)}%,0)`); });
  const st2 = easeOut(seg(tx, 0.2, 1)); set(sixthText, "opacity", st2.toFixed(4)); set(sixthText, "transform", st2 >= 1 ? "none" : `translate3d(0,${((1 - st2) * 16).toFixed(1)}px,0)`);
  if (!sixthOdo && tx > 0.4) { sixthOdo = true; odoRun($("#p-sixth")); }
  // nav underline (none on the finale: it is the hero again)
  navTo(y < LY.go.work - LY.VH * 0.3 || y > LY.fin - LY.VH * 0.4 ? "" : y + LY.VH * 0.45 < LY.go.experience ? "work" : y + LY.VH * 0.45 < LY.go.about ? "experience" : "about");
  set(pin, "transform", RM || op <= 0 ? "none" : `scale(${(1 - 0.04 * op).toFixed(4)})`);
  set(shade, "opacity", (op * 0.5 + 0.5 * seg(sv, 433, 458)).toFixed(4));
  drawRail(y);
  // the finale's type: the name rises word by word behind the chip, then the contact copy (scrubbed, like the hero's exit)
  if (finOn) {
    finWords.forEach((w, i) => { const kk = RM ? 1 : easeOut(seg(fp, FIN.name[0] + i * 8, FIN.name[1] + i * 8)); set(w, "transform", kk >= 1 ? "none" : `translate3d(0,${((1 - kk) * 102).toFixed(1)}%,0)`); });
    finItems.forEach((el, i) => { const kk = RM ? 1 : easeOut(seg(fp, FIN.copy[0] + i * 5, FIN.copy[0] + 26 + i * 5)); set(el, "opacity", kk.toFixed(4)); set(el, "transform", kk >= 1 ? "none" : `translate3d(0,${((1 - kk) * 16).toFixed(1)}px,0)`); });
    set(finItems[0].parentNode, "pointerEvents", RM || fp > FIN.copy[0] + 12 ? "auto" : "none");
    set(fveil, "opacity", (RM ? 0 : 1 - easeIO(seg(fp, -18, 10))).toFixed(4));
    set(fscrim, "opacity", (RM ? 0 : seg(fp, 80, 100) * (1 - seg(fp, 140, 165))).toFixed(4));
  }

  // the die as a map, while its labels are up (pointer devices only)
  const mapOn = false; // C27: the labels are plain (no hover highlight, no click map)
  if (mapOn !== labelsEl.__live) { labelsEl.__live = mapOn; labelsEl.classList.toggle("live", mapOn); }
  if (mapOn || mapHot || HS.a > 0) mapTick(mapOn, dt);

  if (op < 1 || finOn || moved) {
    renderer.render(scene, camera);
    const labOn = k3 > 0 && labA > 0;
    if (labOn || labWas) updateLabels(k3);
    labWas = labOn;
  }
  if (first) { first = false; requestAnimationFrame(() => document.documentElement.classList.add("ready")); }
}
requestAnimationFrame(frame);
window.__one = { scene, camera, rig, renderer, lenis, LY, W_, FIN, hot: () => mapHot?.id ?? null, regions: () => labels.map((L) => ({ id: L.rg.id, xy: toScreen(L.local) })), inFin: () => inFin };
