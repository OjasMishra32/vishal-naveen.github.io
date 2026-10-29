// #highlights: the proof strip under the hero. Six numbers from content.highlights, each with the one line
// of context it needs and a link to where it comes from (a case study or the experience section).
export async function mount(ctx) {
  const root = document.getElementById('highlights');
  if (!root) return;
  const { content, lib } = ctx;
  const { esc } = lib;
  const items = content.highlights || [];
  root.classList.add('hi');
  root.innerHTML =
    `<div class="container">` +
    `<h2 class="visually-hidden" id="highlights-title">Highlights</h2>` +
    `<ul class="hi__grid" role="list">${items.map((h, i) =>
      `<li class="reveal" style="--i:${i}"><a class="hi__item" href="${esc(h.href)}">` +
      `<span class="hi__value">${esc(h.value)}</span>` +
      `<span class="hi__label">${esc(h.label)}</span>` +
      `<span class="hi__detail">${esc(h.detail)}</span></a></li>`).join('')}</ul></div>`;

  // Case-study links open the overlay directly; the rest scroll like any in-page link (main.js).
  root.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#work/"]');
    if (!a || !ctx.openCase) return;
    e.preventDefault();
    ctx.openCase(a.getAttribute('href').slice(6));
  });
}
