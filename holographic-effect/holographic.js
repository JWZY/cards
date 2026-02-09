/**
 * HolographicEffect
 * Zero-dependency, framework-agnostic holographic card effect.
 *
 * Usage:
 *   <!-- Declarative -->
 *   <div data-holographic>...</div>
 *   <script src="holographic.js"></script>
 *
 *   <!-- Programmatic -->
 *   import { HolographicEffect } from './holographic.js'
 *   new HolographicEffect(element, { maxRotation: 20 })
 */

const DEFAULTS = {
  maxRotation: 15,
  perspective: 1000,
  glareMultiplier: 1.5,
  hoverTransition: '0.1s ease',
  leaveTransition: '0.8s cubic-bezier(0.23, 1, 0.32, 1)',
  tilt: true,
  holographic: true,
  shimmer: true,
  glare: true,
  idle: { holographic: 0.3, shimmer: 0.4, glare: 0.5 },
  hover: { holographic: 0.6, shimmer: 0.7, glare: 1.0 },
};

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

class HolographicEffect {
  /**
   * @param {HTMLElement} el - Target element
   * @param {object}      opts - Configuration (see DEFAULTS)
   */
  constructor(el, opts = {}) {
    if (!el || !(el instanceof HTMLElement)) {
      throw new Error('HolographicEffect: first argument must be an HTMLElement');
    }

    this.el = el;
    this.opts = { ...DEFAULTS, ...opts };

    // Merge nested opacity objects
    this.opts.idle = { ...DEFAULTS.idle, ...(opts.idle || {}) };
    this.opts.hover = { ...DEFAULTS.hover, ...(opts.hover || {}) };

    this._reducedMotion = prefersReducedMotion;
    this._state = { rx: 0, ry: 0, mx: 50, my: 50, active: false };
    this._layers = {};
    this._raf = null;
    this._dirty = false;

    this._setup();
    this._bindEvents();
    this._render(); // initial idle state
  }

  /* ---- Setup ---- */

  _setup() {
    const cs = getComputedStyle(this.el);
    if (cs.position === 'static') this.el.style.position = 'relative';
    if (cs.overflow !== 'hidden') this.el.style.overflow = 'hidden';

    // Skip overlays entirely for reduced-motion users
    if (this._reducedMotion) return;

    if (this.opts.holographic) {
      this._layers.holo = this._makeLayer('holo-color');
      this._layers.holo.style.mixBlendMode = 'overlay';
    }
    if (this.opts.shimmer) {
      this._layers.shimmer = this._makeLayer('holo-shimmer');
      this._layers.shimmer.style.mixBlendMode = 'soft-light';
    }
    if (this.opts.glare) {
      this._layers.glare = this._makeLayer('holo-glare');
    }
  }

  _makeLayer(cls) {
    const d = document.createElement('div');
    d.className = `holo-layer ${cls}`;
    d.style.cssText =
      'position:absolute;inset:0;pointer-events:none;border-radius:inherit;transition:opacity 0.3s ease;';
    this.el.appendChild(d);
    return d;
  }

  /* ---- Events ---- */

  _bindEvents() {
    this._onMove = this._handleMove.bind(this);
    this._onEnter = this._handleEnter.bind(this);
    this._onLeave = this._handleLeave.bind(this);
    this._onTouchMove = this._handleTouchMove.bind(this);
    this._onTouchEnd = this._handleLeave.bind(this);

    this.el.addEventListener('mousemove', this._onMove);
    this.el.addEventListener('mouseenter', this._onEnter);
    this.el.addEventListener('mouseleave', this._onLeave);
    this.el.addEventListener('touchmove', this._onTouchMove, { passive: true });
    this.el.addEventListener('touchstart', this._onEnter, { passive: true });
    this.el.addEventListener('touchend', this._onTouchEnd);
  }

  _handleMove(e) {
    this._updateFromPoint(e.clientX, e.clientY);
  }

  _handleTouchMove(e) {
    const t = e.touches[0];
    if (t) this._updateFromPoint(t.clientX, t.clientY);
  }

  _updateFromPoint(cx, cy) {
    const rect = this.el.getBoundingClientRect();
    const x = cx - rect.left;
    const y = cy - rect.top;
    const halfW = rect.width / 2;
    const halfH = rect.height / 2;

    this._state.rx = ((y - halfH) / halfH) * -this.opts.maxRotation;
    this._state.ry = ((x - halfW) / halfW) * this.opts.maxRotation;
    this._state.mx = (x / rect.width) * 100;
    this._state.my = (y / rect.height) * 100;

    this._scheduleRender();
  }

  _handleEnter() {
    this._state.active = true;
    this.el.style.transition = `transform ${this.opts.hoverTransition}`;
    this._scheduleRender();
  }

  _handleLeave() {
    this._state.active = false;
    this._state.rx = 0;
    this._state.ry = 0;
    this.el.style.transition = `transform ${this.opts.leaveTransition}`;
    this._scheduleRender();
  }

  /* ---- Render ---- */

  _scheduleRender() {
    if (!this._dirty) {
      this._dirty = true;
      this._raf = requestAnimationFrame(() => {
        this._dirty = false;
        this._render();
      });
    }
  }

  _render() {
    const { rx, ry, mx, my, active } = this._state;
    const o = this.opts;
    const opacity = active ? o.hover : o.idle;

    // Tilt (skip for reduced-motion)
    if (o.tilt && !this._reducedMotion) {
      this.el.style.transform =
        `perspective(${o.perspective}px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    }

    // Holographic color-shift gradient
    if (this._layers.holo) {
      this._layers.holo.style.backgroundImage = `linear-gradient(
        ${45 + mx / 5}deg,
        hsla(${mx * 0.8 + 180}, 100%, 50%, 0.5),
        hsla(${mx * 0.8 + 240}, 100%, 50%, 0.5),
        hsla(${mx * 0.8 + 300}, 100%, 60%, 0.5),
        hsla(${mx * 0.8 + 360}, 100%, 50%, 0.5)
      )`;
      this._layers.holo.style.opacity = opacity.holographic;
    }

    // Diffraction shimmer lines
    if (this._layers.shimmer) {
      this._layers.shimmer.style.backgroundImage = `repeating-linear-gradient(
        ${90 + mx / 2}deg,
        transparent,
        rgba(255,255,255,0.1) 1px,
        rgba(255,255,255,0.2) 2px,
        rgba(255,255,255,0.1) 3px,
        transparent 4px
      )`;
      this._layers.shimmer.style.opacity = opacity.shimmer;
    }

    // Spotlight glare
    if (this._layers.glare) {
      const gx = Math.min(100, Math.max(0, mx * o.glareMultiplier));
      const gy = Math.min(100, Math.max(0, my * o.glareMultiplier));
      this._layers.glare.style.background = `radial-gradient(
        circle at ${gx}% ${gy}%,
        rgba(255,255,255,0.15) 0%,
        rgba(255,255,255,0.05) 25%,
        transparent 50%
      )`;
      this._layers.glare.style.opacity = opacity.glare;
    }
  }

  /* ---- Public API ---- */

  /** Update options at runtime. */
  update(opts) {
    if (opts.idle) opts.idle = { ...this.opts.idle, ...opts.idle };
    if (opts.hover) opts.hover = { ...this.opts.hover, ...opts.hover };
    Object.assign(this.opts, opts);
    this._scheduleRender();
  }

  /** Remove all effects and listeners. */
  destroy() {
    cancelAnimationFrame(this._raf);

    this.el.removeEventListener('mousemove', this._onMove);
    this.el.removeEventListener('mouseenter', this._onEnter);
    this.el.removeEventListener('mouseleave', this._onLeave);
    this.el.removeEventListener('touchmove', this._onTouchMove);
    this.el.removeEventListener('touchstart', this._onEnter);
    this.el.removeEventListener('touchend', this._onTouchEnd);

    Object.values(this._layers).forEach((l) => l.remove());
    this._layers = {};

    this.el.style.transform = '';
    this.el.style.transition = '';
  }
}

/* ---- Auto-init from data attributes ---- */

function autoInit() {
  document.querySelectorAll('[data-holographic]').forEach((el) => {
    if (el._holographic) return; // already initialized

    // Parse options from data-holographic-* attributes
    const opts = {};
    const ds = el.dataset;
    if (ds.holographicMaxRotation) opts.maxRotation = Number(ds.holographicMaxRotation);
    if (ds.holographicPerspective) opts.perspective = Number(ds.holographicPerspective);
    if (ds.holographicTilt === 'false') opts.tilt = false;
    if (ds.holographicShimmer === 'false') opts.shimmer = false;
    if (ds.holographicGlare === 'false') opts.glare = false;
    if (ds.holographicEffect === 'false') opts.holographic = false;

    el._holographic = new HolographicEffect(el, opts);
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }
}

/* ---- Export ---- */

// ESM
export { HolographicEffect, DEFAULTS as HolographicDefaults };
export default HolographicEffect;

// UMD fallback — expose on window when loaded via <script>
if (typeof window !== 'undefined') {
  window.HolographicEffect = HolographicEffect;
}
