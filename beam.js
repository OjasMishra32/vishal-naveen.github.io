// The beam: one continuous trace drawn like an XY-mode oscilloscope on a P7 phosphor.
// Each frame the beam re-traces the current figure (N samples, never lifted); every segment deposits energy into a
// persistence buffer that decays on two time constants (blue-white flash, amber afterglow). Bloom + grain on top.
// Figures are polylines in CSS px: Float32Array [x, y, e] per sample, e = 1 drawn, ~0.06 blanked (retrace).
export const N = 12288

const VS_SEG = `#version 300 es
layout(location=0) in vec3 aA; layout(location=1) in vec3 aB; layout(location=2) in vec2 aCorner;
uniform vec2 uView; uniform float uW; uniform float uHead; uniform float uN;
out vec2 vLocal; out float vLen; out float vE;
void main(){
  vec2 a = aA.xy, b = aB.xy; vec2 d = b - a; float L = length(d);
  vec2 t = L > 1e-4 ? d / L : vec2(1.0, 0.0); vec2 n = vec2(-t.y, t.x);
  float along = aCorner.x * (L + 2.0 * uW) - uW;          // extend past both ends by the spot radius
  vec2 p = a + t * along + n * aCorner.y * uW;
  vLocal = vec2(along, aCorner.y * uW); vLen = L;
  float i = float(gl_InstanceID);
  float dh = abs(i - uHead); dh = min(dh, uN - dh);         // distance to the racing beam head, wrapping
  vE = min(aA.z, aB.z) * (1.0 + 5.0 * exp(-dh * dh / 900.0)) / max(L, 0.35);
  gl_Position = vec4(p / uView * vec2(2.0, -2.0) + vec2(-1.0, 1.0), 0.0, 1.0);
}`
const FS_SEG = `#version 300 es
precision highp float; in vec2 vLocal; in float vLen; in float vE; uniform float uW; uniform float uGain; out vec4 o;
void main(){
  float x = clamp(vLocal.x, 0.0, vLen); float d = length(vec2(vLocal.x - x, vLocal.y)) / uW;
  float g = exp(-d * d * 4.0);
  float e = g * vE * uGain;
  o = vec4(e, e * 0.07, 0.0, 1.0); // the slow (amber) component integrates ~10x longer, so it gets a smaller share
}`
const VS_QUAD = `#version 300 es
layout(location=0) in vec2 p; out vec2 vUv; void main(){ vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`
const FS_DECAY = `#version 300 es
precision highp float; in vec2 vUv; uniform sampler2D uSrc; uniform vec2 uK; out vec4 o;
void main(){ vec2 v = texture(uSrc, vUv).rg * uK; o = vec4(v, 0.0, 1.0); }`
const FS_BLUR = `#version 300 es
precision highp float; in vec2 vUv; uniform sampler2D uSrc; uniform vec2 uDir; out vec4 o;
void main(){
  vec2 s = vec2(0.0); float w[5] = float[](0.227, 0.194, 0.122, 0.054, 0.016);
  s += texture(uSrc, vUv).rg * w[0];
  for (int i = 1; i < 5; i++) { s += (texture(uSrc, vUv + uDir * float(i)).rg + texture(uSrc, vUv - uDir * float(i)).rg) * w[i]; }
  o = vec4(s, 0.0, 1.0);
}`
const FS_COMP = `#version 300 es
precision highp float; in vec2 vUv; uniform sampler2D uP; uniform sampler2D uB1; uniform sampler2D uB2;
uniform vec2 uRes; uniform float uT; uniform float uGrid; uniform float uOn; uniform float uBg; out vec4 o;
uniform vec3 uTint; uniform float uAb; uniform float uScroll; uniform float uVel; uniform float uDust; uniform float uDpr;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
//FX_DECL
// phosphor dust: one sparse, twinkling mote per cell; each layer scrolls at its own speed (parallax) and stretches
// into a vertical streak with scroll velocity
float dust(vec2 px, float cell, float speed, float seed){
  vec2 q = px; q.y += uScroll * speed;
  vec2 id = floor(q / cell), f = fract(q / cell) - 0.5;
  float h = hash(id + seed); if (h < 0.62) return 0.0;
  vec2 off = vec2(hash(id + seed + 3.1), hash(id + seed + 7.7)) - 0.5;
  vec2 d = (f - off * 0.7) * cell / uDpr;
  float st = 1.0 + min(abs(uVel) * speed * 0.012, 40.0);
  d.y /= st;
  float tw = 0.55 + 0.45 * sin(uT * (0.8 + h * 2.6) + h * 40.0);
  return exp(-dot(d, d) / 1.3) * tw * (h - 0.62) * 2.6 / sqrt(st);
}
void main(){
  vec2 px = vUv * uRes;
  vec3 glass = mix(vec3(0.030, 0.043, 0.040), vec3(0.050, 0.068, 0.063), smoothstep(1.2, 0.0, length(vUv - vec2(0.55, 0.45)) * 1.4));
  // graticule: 10 x 8 divisions, minor ticks on the centre axes
  vec2 div = uRes / vec2(10.0, 8.0); vec2 g = abs(fract(px / div + 0.5) - 0.5) * div;
  float line = 1.0 - smoothstep(0.0, 1.0, min(g.x, g.y));
  vec2 c = abs(px - uRes * 0.5); vec2 tk = abs(fract(px / (div / 5.0) + 0.5) - 0.5) * (div / 5.0);
  float ticks = (1.0 - smoothstep(0.0, 1.0, tk.x)) * step(c.y, 4.0) + (1.0 - smoothstep(0.0, 1.0, tk.y)) * step(c.x, 4.0);
  vec3 col = glass * uBg + vec3(0.62, 0.78, 0.72) * (line * 0.05 + ticks * 0.06) * uGrid; // uBg 0: overlay mode (screen-blended over the page)
  // in flight the trace splits into RGB fringes (chromatic aberration grows from the centre outward)
  vec2 ab = ((vUv - 0.5) * 0.014 + vec2(0.0016, 0.0)) * uAb;
  vec2 e = texture(uP, vUv).rg; vec2 b = texture(uB1, vUv).rg * 0.9 + texture(uB2, vUv).rg * 0.8;
  float er = e.r, eb = e.r;
  if (uAb > 0.002) { er = texture(uP, vUv + ab).r; eb = texture(uP, vUv - ab).r; } // uniform branch: free when docked
  vec3 head = uTint, glow = vec3(0.98, 0.72, 0.30);
  vec3 core = vec3(1.0 - exp(-er * 1.4), 1.0 - exp(-e.r * 1.4), 1.0 - exp(-eb * 1.4));
  vec3 beam = head * mix(vec3(1.0 - exp(-e.r * 1.4)), core, min(1.0, uAb)) + glow * (1.0 - exp(-e.g * 0.9)) * 0.75;
  beam += (head * 0.55 * b.r + glow * 0.45 * b.g);
  float dz = uDust > 0.0 ? dust(px, 96.0 * uDpr, 0.3, 1.0) + dust(px, 190.0 * uDpr, 0.85, 3.0) * 1.6 : 0.0;
  col += mix(uTint, vec3(0.98, 0.72, 0.30), 0.25) * dz * 0.3 * uDust;
  col += beam * uOn;
  //FX_APPLY
  col *= mix(0.72, 1.0, smoothstep(1.15, 0.35, length((vUv - 0.5) * vec2(1.0, 0.85))));
  col += (hash(px + fract(uT) * 91.7) - 0.5) * 0.018;
  o = vec4(col, 1.0);
}`

function sh(gl, type, src) {
  const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s))
  return s
}
function prog(gl, vs, fs) {
  const p = gl.createProgram(); gl.attachShader(p, sh(gl, gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl, gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p))
  const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS)
  for (let i = 0; i < n; i++) { const name = gl.getActiveUniform(p, i).name; u[name] = gl.getUniformLocation(p, name) }
  return { p, u }
}

/** Returns null when WebGL2 + float render targets are unavailable (the page then simply shows its HTML).
 *  fx: effect modules (web/fx/*). Each may give GLSL `decl` (spliced at //FX_DECL) and `apply` (at //FX_APPLY, where
 *  `col`, `px`, `vUv`, `e`, `b` and the samplers uP/uB1/uB2 are in scope), and hooks: init(gl, api) once,
 *  deposit(gl, s) after the beam's own deposit (P[0] bound, additive blend on), uniforms(gl, comp, s) before the
 *  composite (comp = { p, u } with the composite program in use). */
export function createBeam(canvas, { fx = [] } = {}) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: 'high-performance' })
  if (!gl || !gl.getExtension('EXT_color_buffer_float')) return null
  gl.getExtension('OES_texture_float_linear')
  const seg = prog(gl, VS_SEG, FS_SEG), decay = prog(gl, VS_QUAD, FS_DECAY), blur = prog(gl, VS_QUAD, FS_BLUR), comp = prog(gl, VS_QUAD, FS_COMP.replace('//FX_DECL', fx.map((f) => f.decl || '').join('\n')).replace('//FX_APPLY', fx.map((f) => f.apply || '').join('\n')))

  // segment geometry: per-instance A = sample i, B = sample i+1 (same buffer, offset by one sample)
  const pts = new Float32Array((N + 1) * 3)
  const ptBuf = gl.createBuffer()
  const segVao = gl.createVertexArray(); gl.bindVertexArray(segVao)
  gl.bindBuffer(gl.ARRAY_BUFFER, ptBuf); gl.bufferData(gl.ARRAY_BUFFER, pts.byteLength, gl.DYNAMIC_DRAW)
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0); gl.vertexAttribDivisor(0, 1)
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 12, 12); gl.vertexAttribDivisor(1, 1)
  const corner = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, corner)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, -1, 1, -1, 0, 1, 1, 1]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0)
  const quadVao = gl.createVertexArray(); gl.bindVertexArray(quadVao)
  const qb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, qb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
  gl.bindVertexArray(null)

  const tex = (w, h) => {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG16F, w, h, 0, gl.RG, gl.HALF_FLOAT, null)
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v)
    const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0)
    return { t, f, w, h }
  }
  let P = [], H = [], Q = [], W = 0, Hh = 0, dpr = 1
  function resize(w, h, d) {
    W = w; Hh = h; dpr = d
    canvas.width = Math.round(w * d); canvas.height = Math.round(h * d)
    for (const x of [...P, ...H, ...Q]) { gl.deleteTexture(x.t); gl.deleteFramebuffer(x.f) }
    const pw = canvas.width, ph = canvas.height
    P = [tex(pw, ph), tex(pw, ph)]
    H = [tex(pw >> 1, ph >> 1), tex(pw >> 1, ph >> 1)]
    Q = [tex(pw >> 2, ph >> 2), tex(pw >> 2, ph >> 2)]
    for (const x of [...P, ...H, ...Q]) { gl.bindFramebuffer(gl.FRAMEBUFFER, x.f); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT) }
  }
  const quad = (target, w, h) => { gl.bindFramebuffer(gl.FRAMEBUFFER, target); gl.viewport(0, 0, w, h); gl.bindVertexArray(quadVao); gl.drawArrays(gl.TRIANGLES, 0, 3) }
  const bind = (unit, t) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t) }
  function blurInto(src, pair, step) {
    gl.useProgram(blur.p); gl.uniform1i(blur.u.uSrc, 0)
    bind(0, src.t); gl.uniform2f(blur.u.uDir, step / pair[0].w, 0); quad(pair[0].f, pair[0].w, pair[0].h)
    bind(0, pair[0].t); gl.uniform2f(blur.u.uDir, 0, step / pair[0].h); quad(pair[1].f, pair[1].w, pair[1].h)
  }

  const api = {
    gl, pts,
    resize,
    get dpr() { return dpr },
    /** samples: Float32Array of N*3 in CSS px. state: { dt, t, head, gain, width, on, grid, bg, tail, tint [r,g,b], ab, dust, scroll, vel } */
    frame(samples, s) {
      pts.set(samples, 0); pts[N * 3] = samples[(N - 1) * 3]; pts[N * 3 + 1] = samples[(N - 1) * 3 + 1]; pts[N * 3 + 2] = 0
      // 1. decay the persistence buffer: fast (blue-white) and slow (amber) phosphor components
      gl.disable(gl.BLEND)
      gl.useProgram(decay.p); gl.uniform1i(decay.u.uSrc, 0); bind(0, P[0].t)
      const tl = s.tail || 0 // 0..1: in flight the phosphor holds longer, so moving light leaves comet trails
      gl.uniform2f(decay.u.uK, Math.exp(-s.dt / (0.045 * (1 + 5 * tl))), Math.exp(-s.dt / (0.3 * (1 + 1.5 * tl)))); quad(P[1].f, P[1].w, P[1].h)
      ;[P[0], P[1]] = [P[1], P[0]]
      // 2. the beam deposits energy along every segment it traced this frame
      gl.bindFramebuffer(gl.FRAMEBUFFER, P[0].f); gl.viewport(0, 0, P[0].w, P[0].h)
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE)
      gl.useProgram(seg.p); gl.bindVertexArray(segVao)
      gl.bindBuffer(gl.ARRAY_BUFFER, ptBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, pts)
      gl.uniform2f(seg.u.uView, W, Hh); gl.uniform1f(seg.u.uW, s.width); gl.uniform1f(seg.u.uHead, s.head); gl.uniform1f(seg.u.uN, N)
      gl.uniform1f(seg.u.uGain, s.gain * Math.min(1, s.dt * 60))
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, N - 1)
      for (const f of fx) if (f.deposit) { f.deposit(gl, s); gl.bindFramebuffer(gl.FRAMEBUFFER, P[0].f); gl.viewport(0, 0, P[0].w, P[0].h); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE) }
      gl.disable(gl.BLEND)
      // 3. bloom at half and quarter resolution
      blurInto(P[0], H, 1.6); blurInto(H[1], Q, 2.2)
      // 4. composite: glass, graticule, phosphor, bloom, vignette, grain
      gl.useProgram(comp.p)
      gl.uniform1i(comp.u.uP, 0); gl.uniform1i(comp.u.uB1, 1); gl.uniform1i(comp.u.uB2, 2)
      bind(0, P[0].t); bind(1, H[1].t); bind(2, Q[1].t)
      gl.uniform2f(comp.u.uRes, canvas.width, canvas.height); gl.uniform1f(comp.u.uT, s.t); gl.uniform1f(comp.u.uGrid, s.grid); gl.uniform1f(comp.u.uOn, s.on); gl.uniform1f(comp.u.uBg, s.bg ?? 1)
      const tint = s.tint || [0.86, 0.95, 1.0]
      gl.uniform3f(comp.u.uTint, tint[0], tint[1], tint[2]); gl.uniform1f(comp.u.uAb, s.ab || 0); gl.uniform1f(comp.u.uDust, s.dust ?? 0)
      gl.uniform1f(comp.u.uScroll, (s.scroll || 0) * dpr); gl.uniform1f(comp.u.uVel, (s.vel || 0) * dpr); gl.uniform1f(comp.u.uDpr, dpr)
      for (const f of fx) if (f.uniforms) { f.uniforms(gl, comp, s); gl.useProgram(comp.p) }
      quad(null, canvas.width, canvas.height)
    },
    get size() { return { w: W, h: Hh, pw: canvas.width, ph: canvas.height } },
    get ptBuf() { return ptBuf },
    quad, bind,
  }
  for (const f of fx) f.init?.(gl, api)
  return api
}
