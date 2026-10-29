// #lab: the "Selected work" heading and the featured projects (content.projects with `featured`), each one
// compact card that opens its case study. TactileVLA-Edge keeps its two portrait rollouts side by side; the
// others lead with one wide loop. The remaining projects are the grid in #work (work.js).
//
// Every fact renders from content.js. Vision-only: nothing here claims tactile sensing. No B2 rate, no Hz.

// A 3x3 glyph of the workspace grid: eight trained cells, B2 held out (dashed, marked).
function gridGlyph() {
  const cell = 20, gap = 4;
  let out = '';
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const x = c * (cell + gap), y = r * (cell + gap);
      if (c === 1 && r === 1) {
        out += `<rect class="gg-held" x="${x + 0.5}" y="${y + 0.5}" width="${cell - 1}" height="${cell - 1}" rx="4"/>` +
          `<circle class="gg-dot" cx="${x + cell / 2}" cy="${y + cell / 2}" r="2.4"/>`;
      } else {
        out += `<rect class="gg-cell" x="${x}" y="${y}" width="${cell}" height="${cell}" rx="4"/>`;
      }
    }
  }
  return `<svg class="fx__glyph" viewBox="0 0 68 68" role="img" aria-label="3 by 3 workspace grid: eight outer cells trained, centre cell B2 held out">${out}</svg>`;
}

export async function mount(ctx) {
  const root = document.getElementById('lab');
  if (!root) return;
  const { content, lib, reduced } = ctx;
  const { esc } = lib;
  const featured = content.projects.filter((p) => p.featured && p.card);
  if (!featured.length) return;

  const video = (m, wide) =>
    `<figure class="fx__vid"><div class="fx__frame${wide ? ' fx__frame--wide' : ''}"${wide && m.ar ? ` style="aspect-ratio:${esc(m.ar)}"` : ''}>` +
    `<video muted loop playsinline preload="none" poster="${esc(m.poster)}" src="${esc(m.src)}" aria-label="${esc(m.caption)}" disablepictureinpicture${reduced ? ' controls' : ''}></video>` +
    `</div><figcaption>${esc(m.caption)}</figcaption></figure>`;
  const btnLink = (l) => `<a class="btn btn--sm" href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.label)}</a>`;

  function card(p, i) {
    const c = p.card;
    const portrait = p.media.filter((m) => m.type === 'video' && m.portrait).slice(0, 2);
    const wideMedia = p.media.find((m) => m.card);
    const wide = !portrait.length && !!wideMedia;
    const pr = p.links.find((l) => /pull\/\d+/.test(l.href));
    const links = p.links.filter((l) => l !== pr).slice(0, 2);
    const main =
      `<div class="fx__main">` +
      (p.award ? `<p class="fx__award"><i aria-hidden="true"></i>${esc(p.award)}</p>` : '') +
      `<h3 class="fx__title" id="fx-title-${p.id}">${esc(p.title)}</h3>` +
      `<p class="fx__sum">${esc(c.summary)}</p>` +
      (p.pitch ? `<p class="fx__pitch">“${esc(p.pitch)}” <span>${esc(p.scope)}</span></p>` : '') +
      `<ul class="chips fx__chips" aria-label="Stack">${c.chips.map((s) => `<li class="chip">${esc(s)}</li>`).join('')}</ul>` +
      `<div class="fx__metrics">${c.metrics.map(([v, l]) => `<div class="metric"><span class="metric__value">${esc(v)}</span><span class="metric__label">${esc(l)}</span></div>`).join('')}</div>` +
      (c.grid ? `<div class="fx__grid">${gridGlyph()}<p>${esc(c.grid)}</p></div>` : '') +
      (p.team ? `<p class="fx__team"><b>Team of ${p.team.size}.</b> ${esc(p.team.mine)}</p>` : '') +
      `<div class="fx__cta">` +
      `<button class="btn btn--hot btn--sm" type="button" data-open-case="${p.id}">Case study</button>` +
      links.map(btnLink).join('') +
      `</div>` +
      (pr ? `<p class="fx__pr"><a class="link" href="${esc(pr.href)}" target="_blank" rel="noopener">${esc(pr.label)}</a>, submitted and closed, not merged</p>` : '') +
      `</div>`;
    const media = wide
      ? `<div class="fx__media fx__media--wide">${video(wideMedia, true)}</div>`
      : `<div class="fx__media">${portrait.map((m) => video(m, false)).join('')}</div>`;
    return (
      `<article class="card fx${wide ? ' fx--wide' : ''} reveal" data-case="${p.id}" aria-labelledby="fx-title-${p.id}" style="--i:${i}">` +
      (wide ? media + main : main + media) +
      `</article>`
    );
  }

  root.innerHTML =
    `<div class="container">` +
    `<header class="sec-head"><h2 class="d1 lines" id="lab-title">${lib.lines(['Selected work'])}</h2>` +
    `<p class="lead reveal">Robot learning and two award-placed hackathon builds first, then an iOS aid for blind and low-vision users, competition robot code and coding-theory research.</p></header>` +
    `<div class="fx-list">${featured.map(card).join('')}</div></div>`;

  // A card opens its case study, except where a link, button or video control was hit.
  root.addEventListener('click', (e) => {
    const open = e.target.closest('[data-open-case]');
    if (open) { ctx.openCase && ctx.openCase(open.dataset.openCase); return; }
    if (e.target.closest('a, button, video')) return;
    const cardEl = e.target.closest('[data-case]');
    if (cardEl) ctx.openCase && ctx.openCase(cardEl.dataset.case);
  });

  /* ── Video: muted loops that play only while in view, and never while a case study is open ── */
  const state = { caseOpen: false };
  const recs = [...root.querySelectorAll('video')].map((el) => {
    el.muted = true;
    el.defaultMuted = true;
    return { el, vis: false };
  });
  const sync = () => recs.forEach((r) => {
    const go = !reduced && r.vis && !document.hidden && !state.caseOpen;
    if (go && r.el.paused) { r.el.preload = 'auto'; r.el.play().catch(() => {}); }
    else if (!go && !r.el.paused && !reduced) r.el.pause();
  });
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { recs.find((r) => r.el === e.target).vis = e.intersectionRatio >= 0.35; });
      sync();
    }, { threshold: [0, 0.35, 0.7] });
    recs.forEach((r) => io.observe(r.el));
    // Warm each rollout a little before its card arrives so it starts without a stall.
    const warm = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      warm.unobserve(e.target);
      e.target.querySelectorAll('video').forEach((v) => { if (v.preload === 'none') v.preload = 'metadata'; });
    }), { rootMargin: '1200px 0px' });
    root.querySelectorAll('.fx').forEach((el) => warm.observe(el));
  } else recs.forEach((r) => { r.vis = true; });
  document.addEventListener('visibilitychange', sync);
  ctx.on('case:open', () => { state.caseOpen = true; sync(); });
  ctx.on('case:close', () => { state.caseOpen = false; sync(); });
}
