// The Cut: a chapter change is a phosphor burn-through. A diagonal front sweeps the screen (the DOM clip-path uses the
// same line: k = x/W + 0.25 * y/H, y down; the new scene shows where k < F, F = mix(-0.05, 1.30, cut)). At the front the
// beam light splits into five spectral bands, broken into blocks that jitter sideways ("tech displacement"), with a
// bright retrace line whose afterglow trails behind it. All breakup stays inside +-0.06 of F, so the DOM's straight
// diagonal is always under the light. Technique after Igloo's scene compositor (diagonal falloff + spectral CA +
// block displacement); written from scratch, no assets. Light only: it adds to the beam layer, so over the page (overlay
// mode, uBg 0) it can brighten but never hide anything.
// state read from s: cut (0..1), cutDir (+1 forward, -1 back), vel (px/s, signed). Costs nothing while cut is 0 or 1.

const decl = /* glsl */ `
uniform float uCut; uniform float uCutDir; uniform float uCutVel;
// beam light at uv, rebuilt the way the composite builds it (fast + slow phosphor, both bloom levels)
vec3 cutLight(vec2 uv){
  vec2 e = texture(uP, uv).rg; vec2 b = texture(uB1, uv).rg * 0.9 + texture(uB2, uv).rg * 0.8;
  vec3 glow = vec3(0.98, 0.72, 0.30);
  return uTint * (1.0 - exp(-e.r * 1.4)) + glow * (1.0 - exp(-e.g * 0.9)) * 0.75 + uTint * 0.55 * b.r + glow * 0.45 * b.g;
}
`

const apply = /* glsl */ `
if (uCut > 0.0 && uCut < 1.0) { // uniform branch: docked frames never enter
  float k = vUv.x + 0.25 * (1.0 - vUv.y), F = mix(-0.05, 1.30, uCut), d0 = k - F;
  if (abs(d0) < 0.06) {
    // blocks: wide, short cells that re-roll ~14 times a second; about a third of them break the front
    vec2 cell = floor(px / (vec2(112.0, 10.0) * uDpr)); float fr = floor(uT * 14.0);
    float hb = hash(cell + fr * 1.37), hn = hash(cell.yy * 0.71 + fr);
    float brk = step(0.62, hb) * (hb - 0.62) / 0.38;                 // 0..1 on broken blocks
    float d = d0 + brk * (hn - 0.5) * 0.07 + (hash(vec2(cell.y, fr)) - 0.5) * 0.012; // |shift| <= 0.041
    float band = (1.0 - smoothstep(0.0, 0.045, abs(d))) * (1.0 - smoothstep(0.045, 0.06, abs(d0)));
    // spectral split across the front: five taps along the front's normal, spread grows with scroll speed
    float spd = 0.6 + 0.8 * min(1.0, abs(uCutVel) / 2500.0);
    vec2 dpx = normalize(vec2(uRes.y, 0.25 * uRes.x));               // the front's normal on screen (y down)
    vec2 nrm = vec2(dpx.x, -dpx.y) * uRes.x / uRes;                     // in uv (y up), 1.0 = screen width
    vec2 shift = vec2(brk * (hn - 0.5) * 0.05, 0.0);                  // broken blocks slide sideways
    float jit = hash(px + fract(uT) * 37.0) - 0.5;                     // dither hides tap banding
    vec3 acc = vec3(0.0), wsum = vec3(0.0);
    for (int i = 0; i < 5; i++) {
      float t = (float(i) + jit * 0.8) / 4.0;
      vec3 w = max(vec3(0.0), 1.0 - abs(vec3(t) - vec3(0.0, 0.5, 1.0)) * 2.0); // red, amber, green, cyan, blue
      acc += w * cutLight(vUv + shift * band + nrm * (t - 0.5) * 0.026 * spd * band); wsum += w;
    }
    col += (acc / max(wsum, vec3(1e-3)) - cutLight(vUv)) * band * uOn;
    // the retrace: a thin white-hot line on the broken front, its afterglow trailing on the side it has passed
    float pxk = 1.0 / uRes.x * uDpr;                                    // ~1 css px in k units
    float line = exp(-d * d / (pxk * pxk * 2.2));
    float behind = max(0.0, -d * uCutDir);
    // afterglow only on the opaque stage (uBg 1); over the page (uBg 0) a tint behind the front reads as a wash on text
    float trail = exp(-behind / 0.012) * step(0.0, -d * uCutDir) * 0.16 * (1.0 - smoothstep(0.045, 0.06, abs(d0))) * uBg;
    float blocks = brk * band * mix(0.05, 0.10, uBg) * (0.6 + 0.4 * hn); // faint lit cells where the front is torn
    col += mix(uTint, vec3(1.0), 0.65) * (line * 1.15 + blocks) * uOn + uTint * trail * uOn;
  }
}
`

function uniforms(gl, comp, s) {
  const u = comp.u
  if (u.uCut) gl.uniform1f(u.uCut, s.cut || 0)
  if (u.uCutDir) gl.uniform1f(u.uCutDir, s.cutDir || 1)
  if (u.uCutVel) gl.uniform1f(u.uCutVel, s.vel || 0)
}

export default { decl, apply, uniforms }
