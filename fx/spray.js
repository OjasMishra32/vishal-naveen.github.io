// Electron spray: one particle per beam sample, simulated on the GPU (one RGBA32F ping-pong texture: xy position, zw
// velocity, CSS px). Docked, each particle is held on its sample and adds no light. In flight its spring goes soft, so it
// lags the moving ribbon and curl noise carries it off as a spark; at lock-on it is sucked back and snaps on. The cursor
// scatters them. Sparks are deposited into the persistence buffer, so each leaves real phosphor afterglow: fast sparks
// burn white-hot (fast phosphor), slow ones glow amber (slow phosphor). Technique after Igloo's GPGPU point clouds and
// Messenger's flock-to-a-path; written from scratch, no assets.
// state read from s: dt, t, dock (1 docked; else falls back to tail), cut, ptr {x, y}, gain. One frame of latency: the
// particles drawn this frame are the ones simulated last frame.
import { N } from '../beam.js'

const SW = 128, SH = N / SW // one texel per sample

const VS_QUAD = `#version 300 es
layout(location=0) in vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`

const FS_SIM = `#version 300 es
precision highp float;
uniform sampler2D uState; uniform sampler2D uTarget; uniform sampler2D uTargetPrev;
uniform float uDt, uT, uFly, uSnap, uInit; uniform vec3 uPtr; // ptr: x, y, strength
out vec4 o;
float h1(float n){ return fract(sin(n * 12.9898) * 43758.5453); }
// curl of a smooth sine potential: divergence-free swirl, analytic so it costs a handful of ALU ops
vec2 curl(vec2 q, float t){
  float a = 0.0061, b = 0.0047; // psi = sin(ax + .9t) cos(by - .6t) + 0.7 sin(1.7ax - .8by + t)
  float dpx = a * cos(q.x * a + t * 0.9) * cos(q.y * b - t * 0.6) + 0.7 * a * 1.7 * cos(q.x * a * 1.7 - q.y * b * 0.8 + t);
  float dpy = -b * sin(q.x * a + t * 0.9) * sin(q.y * b - t * 0.6) - 0.7 * b * 0.8 * cos(q.x * a * 1.7 - q.y * b * 0.8 + t);
  return vec2(dpy, -dpx) / max(a, b);
}
void main(){
  ivec2 c = ivec2(gl_FragCoord.xy); float id = float(c.y * ${SW} + c.x);
  vec4 st = texelFetch(uState, c, 0); vec3 T = texelFetch(uTarget, c, 0).xyz;
  if (uInit > 0.5) { o = vec4(T.xy, 0.0, 0.0); return; }
  vec2 p = st.xy, v = st.zw;
  float r = h1(id), r2 = h1(id + 7.31);
  float spark = step(0.96, r);                        // ~4% of samples (~490) can shed a spark: few, bright, fast
  // docked figures still move with the page (scroll, live figures): carry each particle with its sample so only flight
  // and the cursor can pull it loose
  p += (T.xy - texelFetch(uTargetPrev, c, 0).xy) * (1.0 - uFly * spark);
  // spring: stiff when docked, soft and varied in flight (the soft ones lag furthest and become the spray)
  float k = mix(420.0, mix(4.0, 30.0, r2), uFly * spark);
  float damp = mix(30.0, mix(1.2, 3.0, r2), uFly * spark);
  vec2 a = (T.xy - p) * k - v * damp;
  a += curl(p + r * 900.0, uT * (0.7 + 0.6 * r2)) * 2600.0 * uFly * spark;
  if (uPtr.z > 0.0) { // the cursor scatters: a radial kick with a little swirl, inside ~140 px
    vec2 d = p - uPtr.xy; float l = length(d) + 1e-3, f = exp(-l * l / 9800.0) * uPtr.z;
    a += (d / l + vec2(-d.y, d.x) / l * 0.35) * f * 3000.0 * spark;
  }
  v += a * uDt; p += v * uDt;
  float snap = 1.0 - exp(-uDt * 14.0 * uSnap);        // lock-on: sucked straight back onto the sample (~0.25 s)
  p = mix(p, T.xy, snap); v *= 1.0 - snap;
  if (length(p - T.xy) > 900.0) { p = T.xy; v = vec2(0.0); } // never leave the screen for good
  o = vec4(p, v);
}`

// each spark is a capsule from where it was one frame ago to where it is (motion blur), shaded like a beam segment:
// energy spread over its length, so a fast spark is a thin streak and a slow one a dot
const VS_PT = `#version 300 es
uniform sampler2D uState; uniform sampler2D uTarget; uniform vec2 uView; uniform float uW; uniform float uGain; uniform float uDt;
out vec2 vLocal; out float vLen; out float vE; out float vHot;
void main(){
  int id = gl_InstanceID; ivec2 c = ivec2(id % ${SW}, id / ${SW});
  vec4 st = texelFetch(uState, c, 0); vec3 T = texelFetch(uTarget, c, 0).xyz;
  float off = length(st.xy - T.xy), spd = length(st.zw);
  float spark = step(0.96, fract(sin(float(id) * 12.9898) * 43758.5453)); // same subset as the sim's h1(id)
  vE = spark * smoothstep(3.0, 26.0, off) * step(0.5, T.z) * uGain * (0.06 + pow(min(1.0, spd / 1100.0), 1.5)); // slow sparks fade: no fog
  vHot = min(1.0, spd / 1400.0);
  if (vE <= 0.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  vec2 b = st.xy, a = b - st.zw * uDt; vec2 d = b - a; float L = length(d);
  vec2 t = L > 1e-3 ? d / L : vec2(1.0, 0.0), n = vec2(-t.y, t.x);
  vec2 corner = vec2(float(gl_VertexID & 1), float(gl_VertexID >> 1) * 2.0 - 1.0);
  float along = corner.x * (L + 2.0 * uW) - uW;
  vLocal = vec2(along, corner.y * uW); vLen = L; vE /= max(L / uW, 1.0);
  vec2 p = a + t * along + n * corner.y * uW;
  gl_Position = vec4(p / uView * vec2(2.0, -2.0) + vec2(-1.0, 1.0), 0.0, 1.0);
}`

const FS_PT = `#version 300 es
precision highp float; in vec2 vLocal; in float vLen; in float vE; in float vHot; uniform float uW; out vec4 o;
void main(){
  float x = clamp(vLocal.x, 0.0, vLen); float d = length(vec2(vLocal.x - x, vLocal.y)) / uW;
  float g = exp(-d * d * 4.0) * vE;
  o = vec4(g * (0.5 + vHot), g * 0.12 * (1.4 - vHot), 0.0, 1.0); // fast phosphor when hot, amber when slow
}`

let gl, api, sim, pt, state = [], targets = [], vao, first = true, fly = 0

function sh(type, src) {
  const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s))
  return s
}
function prog(vs, fs) {
  const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p))
  const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS)
  for (let i = 0; i < n; i++) { const name = gl.getActiveUniform(p, i).name; u[name] = gl.getUniformLocation(p, name) }
  return { p, u }
}
function tex(fmt, f, type) {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t)
  gl.texImage2D(gl.TEXTURE_2D, 0, fmt, SW, SH, 0, f, type, null)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  return t
}

function init(g, a) {
  gl = g; api = a
  sim = prog(VS_QUAD, FS_SIM); pt = prog(VS_PT, FS_PT)
  for (let i = 0; i < 2; i++) {
    const t = tex(gl.RGBA32F, gl.RGBA, gl.FLOAT), f = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0)
    state.push({ t, f })
  }
  targets = [tex(gl.RGB32F, gl.RGB, gl.FLOAT), tex(gl.RGB32F, gl.RGB, gl.FLOAT)] // this frame's samples, last frame's
  vao = gl.createVertexArray() // attribute-less: the vertex shader reads everything from textures
}

function deposit(g, s) {
  const dt = Math.min(s.dt || 1 / 60, 1 / 30)
  // flight amount: docked -> 0, in flight -> 1, plus the middle of a chapter cut
  const dockFly = s.dock != null ? 1 - s.dock : (s.tail || 0)
  const cutFly = s.cut > 0 && s.cut < 1 ? Math.sin(Math.PI * s.cut) : 0
  const goal = Math.max(dockFly, cutFly)
  fly = goal > fly ? goal : fly + (goal - fly) * (1 - Math.exp(-dt * 6)) // let go at once, settle smoothly
  const docked = s.dock != null ? s.dock >= 1 : goal < 0.02
  const snap = docked ? 1 : 0
  const { w, h } = api.size
  // 1. draw last frame's sparks into the persistence buffer (bound by beam.js, additive)
  gl.useProgram(pt.p); gl.bindVertexArray(vao)
  api.bind(3, state[0].t); api.bind(4, targets[0])
  gl.uniform1i(pt.u.uState, 3); gl.uniform1i(pt.u.uTarget, 4)
  gl.uniform2f(pt.u.uView, w, h); gl.uniform1f(pt.u.uW, 1.3); gl.uniform1f(pt.u.uGain, 1.1 * Math.min(1, dt * 60)); gl.uniform1f(pt.u.uDt, dt)
  if (!first) gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, N)
  // 2. this frame's targets are the beam's samples (beam.js copied them into pts before depositing)
  ;[targets[0], targets[1]] = [targets[1], targets[0]]
  for (const t of first ? targets : [targets[0]]) { api.bind(4, t); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, SW, SH, gl.RGB, gl.FLOAT, api.pts, 0) }
  // 3. step the simulation
  gl.disable(gl.BLEND); gl.useProgram(sim.p)
  api.bind(3, state[0].t); api.bind(4, targets[0]); api.bind(5, targets[1])
  gl.uniform1i(sim.u.uState, 3); gl.uniform1i(sim.u.uTarget, 4); gl.uniform1i(sim.u.uTargetPrev, 5)
  gl.uniform1f(sim.u.uDt, dt); gl.uniform1f(sim.u.uT, s.t || 0); gl.uniform1f(sim.u.uFly, fly); gl.uniform1f(sim.u.uSnap, snap); gl.uniform1f(sim.u.uInit, first ? 1 : 0)
  const p = s.ptr
  gl.uniform3f(sim.u.uPtr, p ? p.x : 0, p ? p.y : 0, p && p.x != null ? (p.down ? 2.2 : 1) : 0)
  api.quad(state[1].f, SW, SH)
  ;[state[0], state[1]] = [state[1], state[0]]
  first = false
}

export default { init, deposit }
