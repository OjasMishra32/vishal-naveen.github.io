// #experience: education first, then each role as a row: org, role, a one-line plain summary, its strongest
// bullets, and the rest under "Details" (a native <details>, so it works without JavaScript).
import { esc, hl, secHead } from './util.js';

function diagram(d) {
  const node = (n) =>
    `<div class="xd__node"><p class="xd__t">${esc(n.title)}<span>${esc(n.sub)}</span></p>` +
    `<ul role="list">${n.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul></div>`;
  return (
    `<figure class="xd" aria-label="System diagram">` +
    `<div class="xd__row">${node(d.nodes[0])}` +
    `<div class="xd__link"><span class="xd__wire"><i></i></span>${d.link.map((l) => `<span>${esc(l)}</span>`).join('')}</div>` +
    `${node(d.nodes[1])}</div>` +
    `<figcaption>${esc(d.caption)}</figcaption></figure>`
  );
}

function row(x) {
  const more = x.more || [];
  const hasMore = more.length || x.diagram || x.note;
  return (
    `<li class="xp__row reveal"><div class="xp__when"><time>${esc(x.period)}</time><span>${esc(x.location || '')}</span></div>` +
    `<div class="xp__body">` +
    `<h3 class="xp__org">${esc(x.org)}</h3>` +
    `<p class="xp__role">${esc(x.role)}${x.context ? `<span> · ${esc(x.context)}</span>` : ''}</p>` +
    (x.summary ? `<p class="xp__sum">${esc(x.summary)}</p>` : '') +
    (x.top && x.top.length ? `<ul class="xp__bullets" role="list">${x.top.map((b) => `<li>${hl(b)}</li>`).join('')}</ul>` : '') +
    (hasMore
      ? `<details class="xp__more"><summary><span>Details</span><i aria-hidden="true"></i></summary>` +
        (x.diagram ? diagram(x.diagram) : '') +
        (more.length ? `<ul class="xp__bullets xp__bullets--more" role="list">${more.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>` : '') +
        (x.note ? `<p class="xp__note">${esc(x.note)}</p>` : '') +
        `</details>`
      : '') +
    (x.stack && x.stack.length ? `<ul class="chips xp__chips" aria-label="Stack">${x.stack.map((s) => `<li class="chip">${esc(s)}</li>`).join('')}</ul>` : '') +
    (x.link ? `<p class="xp__link"><a class="link" href="${esc(x.link)}">Case study</a></p>` : '') +
    `</div></li>`
  );
}

export function mountExperience(el, ctx) {
  const { experience, education } = ctx.content;
  const edu = {
    period: `Graduating ${education.grad}`, location: education.location,
    org: education.school, role: education.degree, context: education.minor,
    summary: [`GPA ${education.gpa}`, ...education.honors].join(' · '),
  };
  el.classList.add('xp');
  el.innerHTML =
    `<div class="container">` +
    secHead('experience-title', ['Experience'], 'Firmware, research and engineering roles, newest first. Open Details for how each system works.') +
    `<ol class="xp__list" role="list">${[edu, ...experience].map(row).join('')}</ol></div>`;
}
