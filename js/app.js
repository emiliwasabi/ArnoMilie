(function () {
// IDEA — prototype
// Flow (same as the Figma prototype) :
// catalog → tap « Photo November 1983 N194 » → choice → « Buy vintage » → product slideshow

const BOOKS = [
  { slug: 'tulsa',    title: 'Larry Clark Tulsa 1st Ed',          price: '£400.00' },
  { slug: 'korine',   title: 'Harmony Korine The Bad Son',        price: '£750.00' },
  { slug: 'hirst',    title: 'Damien Hirst ICA 1991',             price: '£200.00' },
  { slug: 'teller',   title: 'Juergen Teller Go-Sees',            price: '£550.00' },
  { slug: 'lostboys', title: 'Lost Boys A Life In Tunnels',       price: '£325.00' },
  { slug: 'ibiza',    title: 'Las Chicas de Ibiza',               price: '£350.00' },
  { slug: 'photo',    title: 'Photo November 1983 N194',          price: '£280.00', link: 'choice' },
  { slug: 'edo',      title: 'Edo Bertoglio New York Polaroids',  price: '£400.00' },
  { slug: 'cocaine',  title: 'Cocaine Calendar 1980',             price: '£250.00' },
  { slug: 'dicaprio', title: 'Leonardo DiCaprio Romantic Hero',   price: '£65.00'  },
  { slug: 'teller96', title: 'Juergen Teller 1996',               price: '£225.00' },
  { slug: 'living',   title: 'Living Interiors Japan 1980-1985',  price: '£525.00' },
];

// slideshow : order of the files in « magazine_abimé/images »
// slides/ = screen version, slides-full/ = full resolution (5160 px) for the zoom
const SLIDES = ['01', '02', '03', '04', '05', '06'];

// zones, per slide. x / y = centre, r = radius — all in fractions of the image width
// (y is also a fraction of the image width, so circles stay round).
// kind : 'defect' (red in Figma → price goes down) / 'quality' (green → price goes up)
// From the Figma page « Défauts — zones ».
const DEFECTS = {
  '02': [ { kind: 'quality', x: 0.1376, y: 0.1029, r: 0.07 } ],
  '03': [ { kind: 'defect',  x: 0.8765, y: 0.1695, r: 0.0859 },
          { kind: 'defect',  x: 0.7949, y: 0.4540, r: 0.07 },
          { kind: 'defect',  x: 0.1648, y: 0.1996, r: 0.07 } ],
  '04': [ { kind: 'defect',  x: 0.9254, y: 0.0804, r: 0.07 },   // tear (zoom of the InDesign layout)
          { kind: 'defect',  x: 0.3470, y: 0.3648, r: 0.07 },
          { kind: 'defect',  x: 0.7611, y: 0.3338, r: 0.07 },
          { kind: 'defect',  x: 0.8456, y: 0.2597, r: 0.07 } ],
  '05': [ { kind: 'defect',  x: 0.6587, y: 0.0850, r: 0.07 } ],
  '06': [ { kind: 'defect',  x: 0.0700, y: 0.6390, r: 0.07 },
          { kind: 'defect',  x: 0.7508, y: 0.3470, r: 0.07 } ],
};

const ZOOM = 4;          // loupe magnification (Figma zoom : 1403 / 355 ≈ ×4)
const LOUPE = 200;       // loupe diameter (design px)
const THUMB = 50;        // found-defect circle (design px)

const $ = (s, el = document) => el.querySelector(s);

// ---------- catalog
const grid = $('#grid');
grid.innerHTML = BOOKS.map((b, i) => `
  <button type="button" class="card" ${b.link ? `data-link="${b.link}"` : 'disabled aria-label="'+b.title+' (not available in this demo)"'}>
    <img class="card__cover" src="assets/catalog/${b.slug}.jpg" alt="${b.title}"
         width="518" height="777" ${i > 3 ? 'loading="lazy"' : ''}>
    <div class="card__info">
      <span class="t">${b.title}</span>
      <span class="t muted price">${b.price}</span>
    </div>
  </button>`).join('');

// ---------- product slides
const slider = $('#slider');
slider.innerHTML = SLIDES.map((n, i) => `
  <div class="slide" data-n="${n}">
    <img src="assets/slides/${n}.jpg" data-full="assets/slides-full/${n}.jpg"
         alt="Photo November 1983 N194 — ${i + 1}/${SLIDES.length}" draggable="false"
         ${i ? 'loading="lazy"' : ''}>
  </div>`).join('');

const counter = $('#counter');
const updateCounter = () => {
  const i = Math.round(slider.scrollLeft / slider.clientWidth);
  counter.textContent = `${Math.min(i, SLIDES.length - 1) + 1}/${SLIDES.length}`;
};
slider.addEventListener('scroll', () => requestAnimationFrame(updateCounter), { passive: true });

// ---------- loupe + defects
const loupe = $('#loupe');
const found = $('#found');
const productEl = $('#product');
const captured = new Set();
const unit = () => productEl.clientWidth / 375;           // 1 design px in CSS px

// preload full-resolution images
SLIDES.forEach(n => { const i = new Image(); i.src = `assets/slides-full/${n}.jpg`; });

function hit(img, clientX, clientY) {
  const r = img.getBoundingClientRect();
  const fx = (clientX - r.left) / r.width;
  const fy = (clientY - r.top) / r.width;                 // fraction of the width (round circles)
  const inside = fx >= 0 && fx <= 1 && fy >= 0 && fy <= r.height / r.width;
  return { r, fx, fy, inside };
}

function paintZoom(el, img, h, size) {
  // background of a circle of `size` px showing the image ×ZOOM around (fx, fy)
  const W = h.r.width * ZOOM, H = h.r.height * ZOOM;
  el.style.backgroundImage = `url(${img.dataset.full})`;
  el.style.backgroundSize = `${W}px ${H}px`;
  el.style.backgroundPosition = `${size / 2 - h.fx * W}px ${size / 2 - h.fy * h.r.width * ZOOM}px`;
}

function showLoupe(img, clientX, clientY, lift) {
  const h = hit(img, clientX, clientY);
  if (!h.inside) { loupe.hidden = true; return; }
  const u = unit(), size = LOUPE * u, p = productEl.getBoundingClientRect();
  loupe.hidden = false;
  loupe.style.left = `${clientX - p.left}px`;
  loupe.style.top = `${clientY - p.top - (lift ? (LOUPE / 2 + 20) * u : 0)}px`; // finger : loupe above it
  paintZoom(loupe, img, h, size);
}

function capture(img, clientX, clientY) {
  const h = hit(img, clientX, clientY);
  if (!h.inside) return;
  const slide = img.closest('.slide').dataset.n;
  (DEFECTS[slide] || []).forEach((d, k) => {
    const key = `${slide}-${k}`;
    if (captured.has(key)) return;
    const dist = Math.hypot(h.fx - d.x, h.fy - d.y);
    if (dist > d.r) return;
    captured.add(key);
    const dot = document.createElement('span');
    // same view as the loupe at release, scaled down from 200 to 50
    const s = THUMB / LOUPE, W = h.r.width * ZOOM * s, size = THUMB * unit();
    dot.style.backgroundImage = `url(${img.dataset.full})`;
    dot.style.backgroundSize = `${W}px ${h.r.height * ZOOM * s}px`;
    dot.style.backgroundPosition = `${size / 2 - h.fx * W}px ${size / 2 - h.fy * h.r.width * ZOOM * s}px`;
    dot.dataset.kind = d.kind;                 // 'defect' / 'quality' → for the live price (next step)
    found.appendChild(dot);
    document.dispatchEvent(new CustomEvent('zonefound', { detail: { slide, index: k, kind: d.kind } }));
  });
}

function hideLoupe() { loupe.hidden = true; }

// found circles : as many rows as fit between 56.75 and 10 above the caps of the bottom line
function fitFound() {
  const width = productEl.clientWidth || Math.min(window.innerWidth, 430);
  const height = productEl.clientHeight || window.innerHeight;
  const u = width / 375;
  const H = height / u;                             // screen height in design px
  const bottom = H - 10 - 8.47 - 10;                            // caps of « 1/6 » − 10
  const rows = Math.max(1, Math.floor((bottom - 56.75 + 5) / (THUMB + 5)));
  found.style.setProperty('--rows', rows);
}
window.addEventListener('resize', fitFound);
window.addEventListener('hashchange', () => setTimeout(fitFound, 0));
fitFound();

// touch : hold still ~0.2 s on an image → loupe ; move right away → normal swipe
let press = null;
slider.addEventListener('touchstart', e => {
  const img = e.target.closest('.slide img');
  if (!img || e.touches.length > 1) return;
  const t = e.touches[0];
  press = { img, x: t.clientX, y: t.clientY, active: false };
  press.timer = setTimeout(() => {
    if (!press) return;
    press.active = true;
    slider.classList.add('is-zooming');
    showLoupe(img, press.x, press.y, true);
  }, 200);
}, { passive: true });

slider.addEventListener('touchmove', e => {
  if (!press) return;
  const t = e.touches[0];
  if (!press.active) {
    if (Math.hypot(t.clientX - press.x, t.clientY - press.y) > 8) { clearTimeout(press.timer); press = null; }
    return;
  }
  e.preventDefault();                                     // no swipe while zooming
  press.x = t.clientX; press.y = t.clientY;
  showLoupe(press.img, press.x, press.y, true);
}, { passive: false });

const endPress = () => {
  if (!press) return;
  clearTimeout(press.timer);
  capture(press.img, press.x, press.y);       // after the loupe, or a quick tap on the zone
  slider.classList.remove('is-zooming');
  hideLoupe();
  press = null;
};
slider.addEventListener('touchend', endPress);
slider.addEventListener('touchcancel', endPress);
slider.addEventListener('contextmenu', e => e.preventDefault());

// desktop : hover = loupe, click = capture, drag = swipe
let drag = null;
slider.addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse' || drag?.moved) return;
  const img = e.target.closest('.slide img');
  img ? showLoupe(img, e.clientX, e.clientY, false) : hideLoupe();
});
slider.addEventListener('pointerleave', hideLoupe);
slider.addEventListener('pointerdown', e => {
  if (e.pointerType !== 'mouse') return;
  drag = { x: e.clientX, left: slider.scrollLeft, moved: false, img: e.target.closest('.slide img') };
  slider.style.scrollSnapType = 'none';
});
window.addEventListener('pointermove', e => {
  if (!drag) return;
  if (Math.abs(e.clientX - drag.x) > 5) { drag.moved = true; hideLoupe(); }
  if (drag.moved) slider.scrollLeft = drag.left - (e.clientX - drag.x);
});
window.addEventListener('pointerup', e => {
  if (!drag) return;
  const w = slider.clientWidth, dx = e.clientX - drag.x;
  if (!drag.moved && drag.img) capture(drag.img, e.clientX, e.clientY);
  let i = Math.round(drag.left / w);
  if (Math.abs(dx) > w * 0.15) i += dx < 0 ? 1 : -1;
  i = Math.max(0, Math.min(SLIDES.length - 1, i));
  slider.style.scrollSnapType = '';
  slider.scrollTo({ left: i * w, behavior: 'smooth' });
  drag = null;
});

// ?zones → draw the defect zones in red (to check them)
if (new URLSearchParams(location.search).has('zones')) {
  const drawZones = () => {
    document.querySelectorAll('.zone').forEach(z => z.remove());
    document.querySelectorAll('.slide').forEach(s => {
      const img = s.querySelector('img');
      s.style.position = 'relative';
      (DEFECTS[s.dataset.n] || []).forEach(d => {
        const z = document.createElement('div'); z.className = 'zone';
        if (d.kind === 'quality') z.style.borderColor = '#48ff00';
        const w = img.clientWidth, d2 = d.r * 2 * w;
        z.style.width = z.style.height = `${d2}px`;
        z.style.left = `${img.offsetLeft + d.x * w - d2 / 2}px`;
        z.style.top = `${img.offsetTop + d.y * w - d2 / 2}px`;
        s.appendChild(z);
      });
    });
  };
  window.addEventListener('load', drawZones); window.addEventListener('resize', drawZones);
  document.querySelectorAll('.slide img').forEach(i => i.addEventListener('load', drawZones));
  window.addEventListener('hashchange', () => setTimeout(drawZones, 50));
}

// ---------- views
const choice = $('#choice');
const product = $('#product');

function show(view) {
  choice.hidden = view !== 'choice';
  product.hidden = view !== 'product';
  document.body.classList.toggle('locked', view !== 'catalog');
  if (view === 'product') { slider.scrollLeft = 0; updateCounter(); }
}

function route() {
  const v = location.hash.replace('#', '');
  show(['choice', 'product'].includes(v) ? v : 'catalog');
}
window.addEventListener('hashchange', route);
route();

// catalog → choice
grid.addEventListener('click', e => {
  const card = e.target.closest('[data-link]');
  if (card) location.hash = card.dataset.link;
});

// choice : vintage → product, tap on the veil → back to the catalog
choice.addEventListener('click', e => {
  const btn = e.target.closest('[data-choice]');
  if (btn) {
    if (btn.dataset.choice === 'vintage') location.hash = 'product';
    return; // « Buy new » : no destination yet (same as Figma)
  }
  if (!e.target.closest('.choice__band')) history.back();
});

})();
