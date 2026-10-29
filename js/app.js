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
const SLIDES = ['01', '02', '03', '04', '05', '06', '07'];

// zones, per slide. x / y = centre, r = radius — all in fractions of the image width
// (y is also a fraction of the image width, so circles stay round).
// kind : 'defect' (red in Figma → price goes down) / 'quality' (green → price goes up)
// From the Figma page « Défauts — zones ».
const DEFECTS = {
  '02': [ { kind: 'defect',  x: 0.6587, y: 0.0850, r: 0.07 } ],   // image swapped 2 ↔ 6
  '03': [ { kind: 'defect',  x: 0.8765, y: 0.1695, r: 0.0859 },
          { kind: 'defect',  x: 0.7949, y: 0.4540, r: 0.07 },
          { kind: 'defect',  x: 0.1648, y: 0.1996, r: 0.07 } ],
  '04': [ { kind: 'quality', x: 0.8681, y: 0.0906, r: 0.1113 } ],
  '05': [ { kind: 'defect',  x: 0.9254, y: 0.0804, r: 0.07 },   // tear (zoom of the InDesign layout)
          { kind: 'defect',  x: 0.3470, y: 0.3648, r: 0.07 },
          { kind: 'defect',  x: 0.7611, y: 0.3338, r: 0.07 },
          { kind: 'defect',  x: 0.8456, y: 0.2597, r: 0.07 } ],
  '06': [ { kind: 'quality', x: 0.1376, y: 0.1029, r: 0.07 } ],   // image swapped 2 ↔ 6
  '07': [ { kind: 'defect',  x: 0.0700, y: 0.6390, r: 0.07 },
          { kind: 'defect',  x: 0.7508, y: 0.3470, r: 0.07 } ],
};

const ZOOM = 4;               // finger loupe magnification (Figma zoom : 1403 / 355 ≈ ×4)
const LOUPE = 200;            // finger loupe diameter (design px)
const THUMB = 50;             // found circle (design px)

const $ = (s, el = document) => el.querySelector(s);

// ---------- catalog
const grid = $('#grid');
grid.innerHTML = BOOKS.map((b, i) => `
  <button type="button" class="card" ${b.link ? `data-link="${b.link}"` : `disabled aria-label="${b.title} (not available in this demo)"`}>
    <img class="card__cover" src="assets/catalog/${b.slug}.jpg" alt="${b.title}"
         width="518" height="777" loading="eager" decoding="async">
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
         loading="eager" decoding="async">
  </div>`).join('');

const counter = $('#counter');
const updateCounter = () => {
  const i = Math.round(slider.scrollLeft / slider.clientWidth);
  const index = Math.min(i, SLIDES.length - 1);
  counter.textContent = `${index + 1}/${SLIDES.length}`;
  const image = slider.children[index]?.querySelector('img');
  if (image && productEl.clientWidth) {
    const imageRect = image.getBoundingClientRect();
    const productRect = productEl.getBoundingClientRect();
    const scale = productRect.width / productEl.clientWidth || 1;
    counter.style.top = `${(imageRect.bottom - productRect.top) / scale + 5 * unit()}px`;
  }
};
slider.addEventListener('scroll', () => requestAnimationFrame(updateCounter), { passive: true });

// ---------- loupe + defects
const loupe = $('#loupe');
const found = $('#found');
const productEl = $('#product');
const captured = new Set();
const phoneEl = document.querySelector('.phone');
const unit = () => (productEl.clientWidth || phoneEl.clientWidth) / 375; // 1 design px in CSS px

// Preload every image used by the catalog and the product experience.
const preloadImages = [
  ...BOOKS.map(book => `assets/catalog/${book.slug}.jpg`),
  ...SLIDES.flatMap(n => [`assets/slides/${n}.jpg`, `assets/slides-full/${n}.jpg`]),
];
preloadImages.forEach(src => {
  const image = new Image();
  image.decoding = 'async';
  image.fetchPriority = 'low';
  image.src = src;
});

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
  h.fx = Math.min(1, Math.max(0, h.fx));
  h.fy = Math.min(h.r.height / h.r.width, Math.max(0, h.fy));
  const u = unit(), size = LOUPE * u, p = productEl.getBoundingClientRect();
  loupe.hidden = false;
  loupe.style.left = `${clientX - p.left}px`;
  loupe.style.top = `${clientY - p.top - (lift ? (LOUPE / 2 + 20) * u : 0)}px`; // finger : loupe above it
  paintZoom(loupe, img, h, size);
}

function paintSpot(el, s, size, zoom, fill) {
  const W = 355 * unit() * zoom;                          // every slide image is 355 wide
  let fx = s.fx, fy = s.fy;
  if (fill) {                                             // keep the circle full of image (no white at the edges)
    const r = size / 2 / W;
    fx = Math.min(Math.max(fx, r), 1 - r);
    fy = Math.min(Math.max(fy, r), s.ratio - r);
  }
  el.style.backgroundImage = `url(${s.full})`;
  el.style.backgroundSize = `${W}px ${W * s.ratio}px`;
  el.style.backgroundPosition = `${size / 2 - fx * W}px ${size / 2 - fy * W}px`;
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
    dot._spot = { full: img.dataset.full, fx: h.fx, fy: h.fy, ratio: h.r.height / h.r.width };
    // same view as the loupe at release, scaled down from 200 to 50
    paintSpot(dot, dot._spot, THUMB * unit(), ZOOM * THUMB / LOUPE);
    dot.dataset.kind = d.kind;                 // 'defect' / 'quality'
    dot._zone = { full: img.dataset.full, fx: d.x, fy: d.y, ratio: h.r.height / h.r.width, slide, k };
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
  const bottom = H - 10 - 0.726 * 35 - 10;                      // caps of the large price − 10
  const rows = Math.max(1, Math.floor((bottom - 56.75 + 5) / (THUMB + 5)));
  found.style.setProperty('--rows', rows);
}
window.addEventListener('resize', fitFound);
window.addEventListener('resize', updateCounter);
window.addEventListener('hashchange', () => setTimeout(fitFound, 0));
fitFound();

// touch : hold still ~0.2 s on an image → loupe ; move right away → normal swipe
let press = null;
slider.addEventListener('touchstart', e => {
  const slide = e.target.closest('.slide');
  const img = slide?.querySelector('img');
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
  const img = e.target.closest('.slide')?.querySelector('img');
  img ? showLoupe(img, e.clientX, e.clientY, false) : hideLoupe();
});
slider.addEventListener('pointerleave', hideLoupe);
slider.addEventListener('pointerdown', e => {
  if (e.pointerType !== 'mouse') return;
  drag = { x: e.clientX, left: slider.scrollLeft, moved: false, img: e.target.closest('.slide')?.querySelector('img') };
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

let current = 'catalog';
function show(view) {
  if (view === 'end') view = 'recap';
  if (view !== 'recap' && checkoutPending) {
    cancelAnimationFrame(checkoutFrame);
    clearTimeout(checkoutTimer);
    checkoutPending = false;
    recapTrack.style.transform = 'translate3d(0, 0, 0)';
  }
  const inProduct = ['product', 'recap'].includes(view);
  choice.hidden = view !== 'choice';
  product.hidden = !inProduct;
  product.classList.toggle('is-recap', view === 'recap');
  document.body.classList.toggle('locked', view !== 'catalog');
  if (view === 'product' && current !== 'recap') { slider.scrollLeft = 0; updateCounter(); }
  if (view === 'recap') openRecap();
  if (view === 'catalog' && current === 'recap') {
    recapCircles.replaceChildren();
    clearSelection();
  }
  current = view;
}

function route() {
  const v = location.hash.replace('#', '');
  show(['choice', 'product', 'recap', 'end'].includes(v) ? v : 'catalog');
}
window.addEventListener('hashchange', route);
queueMicrotask(route);                                   // after the whole script is loaded

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


// ---------- live price : starts at £95.00, defect −£10.00, quality +£15.00
// (all 12 zones found → £25.00 = the « Buy used » price)
const PRICE_START = 95;
const PRICE_STEP = { defect: -10, quality: +15 };
let price = PRICE_START;

const amount = $('#amount');
const fmt = v => v.toFixed(2);                       // '95.00'
// strip : [blank, 0–9, 0–9, 0–9] → a digit rests in the middle cycle (11 + d)
const CELLS = [' ', ...'0123456789'.repeat(3)];
const rest = d => 11 + d;

// digit widths in em (independent of the screen size and of the view being hidden)
const widths = {};
function measure() {
  const m = document.createElement('span');
  m.className = 't product__amount';
  m.style.cssText = 'position:absolute;visibility:hidden;left:-9999px;top:0;bottom:auto';
  m.style.setProperty('--u', String(unit()));
  document.body.appendChild(m);
  const fs = parseFloat(getComputedStyle(m).fontSize);
  for (const ch of '0123456789') { m.textContent = ch; widths[ch] = m.getBoundingClientRect().width / fs; }
  m.remove();
}
const w = ch => ch === ' ' ? '0em' : `${widths[ch]}em`;

function column(ch) {
  const col = document.createElement('span');
  col.className = 'roll';
  col.innerHTML = `<span class="roll__ghost">${ch === ' ' ? '' : ch}</span><span class="roll__strip">${CELLS.map(c => `<span>${c === ' ' ? '&nbsp;' : c}</span>`).join('')}</span>`;
  col._strip = col.lastChild;
  col._digit = ch;
  col._pos = ch === ' ' ? 0 : rest(+ch);
  col.style.width = w(ch);
  place(col, false);
  return col;
}
// position in CSS units (one cell = one line = 42 design px) : correct even while the view is hidden
function place(col, animate) {
  const s = col._strip;
  s.classList.toggle('is-moving', animate);
  if (!animate) void s.offsetWidth;                  // apply the jump without transition
  s.style.transform = `translateY(calc(${-col._pos} * 42 * var(--u)))`;
}

// static render : £ + one column per digit + .
function renderPrice(v) {
  measure();
  amount.textContent = '£';
  for (const ch of fmt(v)) amount.appendChild(ch === '.' ? document.createTextNode('.') : column(ch));
  amount.setAttribute('aria-label', `£${fmt(v)}`);
}

let timers = [];
// finish any running roll instantly (keeps fast successive finds clean)
function settle() {
  timers.forEach(clearTimeout); timers = [];
  amount.querySelectorAll('.roll').forEach(col => {
    if (col._digit === ' ') { col.remove(); return; }
    col._pos = rest(+col._digit); place(col, false);
  });
}

function rollTo(v) {
  settle();
  const from = fmt(price), to = fmt(v), up = v > price;
  price = v;
  amount.setAttribute('aria-label', `£${to}`);
  // align on the right (95 → 110 adds a column on the left, 110 → 95 removes it)
  const len = Math.max(from.length, to.length);
  const A = from.padStart(len, ' ').replace('.', ''), B = to.padStart(len, ' ').replace('.', '');
  const cols = [...amount.querySelectorAll('.roll')];
  while (cols.length < A.length) { const c = column(' '); amount.insertBefore(c, amount.childNodes[1]); cols.unshift(c); }
  cols.forEach((col, i) => {
    const o = A[i], n = B[i];
    if (o === n) return;
    timers.push(setTimeout(() => {
      if (n === ' ') col._pos = 0;                                  // goes away : rolls down to the blank cell
      else if (o === ' ') col._pos = 1 + +n;                         // appears : rolls up from the blank cell
      else col._pos += up ? (+n - +o + 10) % 10 : -((+o - +n + 10) % 10);
      col._digit = n;
      col.firstChild.textContent = n === ' ' ? '' : n;
      col.style.width = w(n);
      place(col, true);
      timers.push(setTimeout(() => {                                  // end : back to the middle cycle
        if (col._digit !== n) return;
        if (n === ' ') col.remove(); else { col._pos = rest(+n); place(col, false); }
      }, 520));
    }, i * 40));                                                      // slight left → right stagger
  });
}

document.addEventListener('zonefound', e => {
  const next = Math.max(0, price + PRICE_STEP[e.detail.kind]);
  if (next !== price) rollTo(next);
});
(document.fonts ? document.fonts.ready : Promise.resolve()).then(() => renderPrice(price));

// A browser may restore this page from its back/forward cache. Clear temporary
// inspection marks on navigation and restore the starting price on return.
function clearSelection() {
  timers.forEach(clearTimeout);
  timers = [];
  captured.clear();
  found.replaceChildren();
  recapTrack.style.transform = 'translate3d(0, 0, 0)';
  price = PRICE_START;
  renderPrice(price);
  $('#end-price').textContent = `£${price.toFixed(2)}`;
}
window.addEventListener('pagehide', () => {
  captured.clear();
  found.replaceChildren();
});
window.addEventListener('pageshow', event => {
  if (event.persisted) clearSelection();
});

// ---------- recap : tap the price → the found zones cross the screen, circle after circle
// (355 Ø, ×5.54, 20 apart, each stops on the screen axis), then « Add to cart » + current price.
const BIG = 355;                     // circle = the column
const BIG_ZOOM = 1968.16 / 355;      // InDesign page 4 ≈ ×5.54
const recap = $('#recap');
const recapTrack = $('#recap-track');
const recapCircles = $('#recap-circles');
const checkoutStatus = $('#checkout-status');
let checkoutPending = false;
let checkoutFrame = 0;
let checkoutTimer = 0;

function openRecap() {
  const zones = [...found.children].map(d => d._zone)
    .sort((a, b) => a.slide.localeCompare(b.slide) || a.k - b.k);          // order of the images
  recapCircles.innerHTML = zones.map(() => '<div class="recap__circle"></div>').join('');
  [...recapCircles.children].forEach((c, i) => paintSpot(c, zones[i], BIG * unit(), BIG_ZOOM, true));
  $('#end-price').textContent = `£${price.toFixed(2)}`;
  $('#end-label').textContent = 'Added to Cart';
  recapTrack.style.transform = 'translate3d(0, 0, 0)';
  if (checkoutPending) requestAnimationFrame(() => animateCheckout(zones.length));
}

function animateCheckout(circleCount) {
  const target = checkoutStatus.offsetTop;
  const duration = circleCount ? Math.min(16000, Math.max(4500, circleCount * 1350)) : 0;
  const started = performance.now();

  const finish = () => {
    checkoutFrame = 0;
    $('#end-label').textContent = 'Added to Cart';
    $('#end-price').textContent = `£${price.toFixed(2)}`;
    checkoutTimer = setTimeout(() => {
      checkoutPending = false;
      location.hash = '';
    }, 2000);
  };

  if (!duration || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    recapTrack.style.transform = `translate3d(0, -${target}px, 0)`;
    finish();
    return;
  }

  const tick = now => {
    const progress = Math.min(1, (now - started) / duration);
    const easedIn = Math.pow(progress, 2.5);
    const easedOut = Math.pow(1 - progress, 2.5);
    const eased = easedIn / (easedIn + easedOut);
    recapTrack.style.transform = `translate3d(0, -${target * eased}px, 0)`;
    if (progress < 1) checkoutFrame = requestAnimationFrame(tick);
    else {
      recapTrack.style.transform = `translate3d(0, -${target}px, 0)`;
      finish();
    }
  };
  checkoutFrame = requestAnimationFrame(tick);
}

// ---------- add to cart → animated checkout → return to the catalog
let cart = 0;
$('#product-add').addEventListener('click', () => {
  cart += 1;
  document.querySelectorAll('.cart').forEach(c => { c.textContent = `Cart (${cart})`; });
  checkoutPending = true;
  location.hash = 'recap';
});

})();
