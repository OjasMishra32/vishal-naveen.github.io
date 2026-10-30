// Degauss: the cursor bends the phosphor like a magnet held to a colour CRT. Moving the pointer stamps a wake into a
// small field (1/8 resolution, ping-pong); the composite reads the beam light through the field's gradient, so the trace
// and its afterglow smear along the wake. A click or tap fires a degauss: a decaying radial wobble for ~1.2 s. Station
// tint only: no hue, rainbow or spectral colour (rejected by Vishal 2026-10-30, research/igloo-effects.md). Light only: it
// moves beam light plus a faint glow along the wake; the page underneath is never touched. Field after Igloo's pointer splat (segment
// stamp, spread, damping); written from scratch, no assets. Idle pointer = no pass and no composite work.
// state read from s: dt, ptr {x, y, down} (CSS px, viewport), tint via uTint.

const VS_QUAD = `#version 300 es
layout(location=0) in vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`

const FS_FIELD = `#version 300 es
precision highp float;
uniform sampler2D uPrev; uniform vec2 uA, uB, uView, uSize; uniform float uR, uDecay, uSpread, uStamp; out vec4 o;
float seg(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-4), 0.0, 1.0); return length(pa - ba * h); }
void main(){
  ivec2 c = ivec2(gl_FragCoord.xy), m = ivec2(uSize) - 1;
  float v = texelFetch(uPrev, c, 0).r;
  float avg = 0.25 * (texelFetch(uPrev, clamp(c + ivec2(1, 0), ivec2(0), m), 0).r + texelFetch(uPrev, clamp(c - ivec2(1, 0), ivec2(0), m), 0).r
                    + texelFetch(uPrev, clamp(c + ivec2(0, 1), ivec2(0), m), 0).r + texelFetch(uPrev, clamp(c - ivec2(0, 1), ivec2(0), m), 0).r);
  float next = mix(v, max(v, avg), uSpread) * uDecay;  // the wake blooms outward a little and fades
  vec2 uv = gl_FragCoord.xy / uSize, P = vec2(uv.x, 1.0 - uv.y) * uView; // css px, y down (pointer space)
  next += (1.0 - smoothstep(0.0, uR, seg(P, uA, uB))) * uStamp;
  next = min(next, 1.0);
  o = vec4(next, 0.0, 0.0, 1.0);
}`

const decl = /* glsl */ `
uniform sampler2D uDgField; uniform vec2 uDgTexel; uniform float uDgOn;
uniform vec3 uDg; // degauss: centre x, y (css px, y down), strength 0..1
uniform float uDgAge; uniform vec2 uDgView;
vec3 dgLight(vec2 uv){
  vec2 e = texture(uP, uv).rg; vec2 b = texture(uB1, uv).rg * 0.9 + texture(uB2, uv).rg * 0.8;
  vec3 glow = vec3(0.98, 0.72, 0.30);
  return uTint * (1.0 - exp(-e.r * 1.4)) + glow * (1.0 - exp(-e.g * 0.9)) * 0.75 + uTint * 0.55 * b.r + glow * 0.45 * b.g;
}
`

const apply = /* glsl */ `
if (uDgOn > 0.0) { // uniform branch: an idle pointer costs nothing
  float f = texture(uDgField, vUv).r;
  vec2 g = vec2(texture(uDgField, vUv + vec2(uDgTexel.x, 0.0)).r - texture(uDgField, vUv - vec2(uDgTexel.x, 0.0)).r,
                texture(uDgField, vUv + vec2(0.0, uDgTexel.y)).r - texture(uDgField, vUv - vec2(0.0, uDgTexel.y)).r);
  vec2 cp = vec2(vUv.x, 1.0 - vUv.y) * uDgView, rv = cp - uDg.xy; float r = length(rv) + 1e-3;
  float wob = uDg.z * sin(r * 0.04 - uDgAge * 26.0) * exp(-r / 650.0);  // the degauss: rings racing out, decaying
  vec2 off = g * 0.06 +vec2(rv.x, -rv.y) / r * wob * 14.0 / uDgView;
  float amt = clamp(f * 1.6 + uDg.z, 0.0, 1.0);
  if (amt > 0.003) {
    vec3 L0 = dgLight(vUv), L1 = dgLight(vUv + off);
    col += (L1 - L0) * amt * uOn;
    col += uTint * clamp(length(g) * 2.0, 0.0, 1.0) * 0.035 * uOn; // the wake itself glows faintly at its edges
  }
}
`

let gl, api, fld, F = [], fw = 0, fh = 0, last = null, idle = 99, deg = { x: 0, y: 0, age: 9 }, wasDown = false

function prog(vs, fs) {
  const mk = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x }
  const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p))
  const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS)
  for (let i = 0; i < n; i++) { const name = gl.getActiveUniform(p, i).name; u[name] = gl.getUniformLocation(p, name) }
  return { p, u }
}
function alloc(w, h) { // field at 1/8 of the viewport in CSS px, cleared
  for (const x of F) { gl.deleteTexture(x.t); gl.deleteFramebuffer(x.f) }
  F = []; fw = w; fh = h
  for (let i = 0; i < 2; i++) {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, w, h, 0, gl.RED, gl.HALF_FLOAT, null)
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v)
    const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0)
    gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT)
    F.push({ t, f })
  }
}

function init(g, a) { gl = g; api = a; fld = prog(VS_QUAD, FS_FIELD) }

function deposit(g, s) { // runs every frame; only steps the field while the pointer has been active recently
  const dt = Math.min(s.dt || 1 / 60, 1 / 30), { w, h } = api.size
  const W8 = Math.max(8, Math.ceil(w / 8)), H8 = Math.max(8, Math.ceil(h / 8))
  if (W8 !== fw || H8 !== fh) alloc(W8, H8)
  const p = s.ptr, has = p && p.x != null
  const moved = has && last && (Math.abs(p.x - last.x) + Math.abs(p.y - last.y)) > 0.5
  if (has && p.down && !wasDown) { deg = { x: p.x, y: p.y, age: 0 } } // a press degausses from where it lands
  wasDown = !!(has && p.down)
  deg.age += dt
  idle = moved ? 0 : idle + dt
  if (idle > 3 && deg.age > 1.4) { last = has ? { x: p.x, y: p.y } : null; return } // field has faded: skip the pass
  const speed = moved ? Math.hypot(p.x - last.x, p.y - last.y) / dt : 0
  gl.disable(gl.BLEND); gl.useProgram(fld.p)
  api.bind(6, F[0].t); gl.uniform1i(fld.u.uPrev, 6)
  gl.uniform2f(fld.u.uA, last ? last.x : 0, last ? last.y : 0); gl.uniform2f(fld.u.uB, has ? p.x : 0, has ? p.y : 0)
  gl.uniform2f(fld.u.uView, w, h); gl.uniform2f(fld.u.uSize, fw, fh)
  gl.uniform1f(fld.u.uR, 18 + Math.min(40, speed * 0.02)); gl.uniform1f(fld.u.uDecay, Math.exp(-dt * 2.6)); gl.uniform1f(fld.u.uSpread, Math.min(1, dt * 60) * 0.6)
  gl.uniform1f(fld.u.uStamp, moved ? Math.min(0.5, speed / 3000) * Math.min(1, dt * 60) : 0)
  api.quad(F[1].f, fw, fh)
  ;[F[0], F[1]] = [F[1], F[0]]
  last = has ? { x: p.x, y: p.y } : null
}

function uniforms(g, comp, s) {
  const u = comp.u, on = idle <= 3 || deg.age <= 1.4
  if (u.uDgOn) gl.uniform1f(u.uDgOn, on ? 1 : 0)
  if (!on) return
  api.bind(6, F[0].t)
  if (u.uDgField) gl.uniform1i(u.uDgField, 6)
  if (u.uDgTexel) gl.uniform2f(u.uDgTexel, 1 / fw, 1 / fh)
  const { w, h } = api.size
  if (u.uDgView) gl.uniform2f(u.uDgView, w, h)
  const k = deg.age < 1.4 ? Math.exp(-deg.age * 2.4) * (1 - Math.exp(-deg.age * 30)) : 0 // fast attack, ~1.2 s decay
  if (u.uDg) gl.uniform3f(u.uDg, deg.x, deg.y, k)
  if (u.uDgAge) gl.uniform1f(u.uDgAge, deg.age)
}

export default { decl, apply, init, deposit, uniforms }
