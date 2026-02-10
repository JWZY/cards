# PROMPTS.md

Key prompts used to build this project, in order. Follow these to replicate the build.

---

## 2026-02-09 — Mobile Responsiveness & Polish

**Make cards half size on mobile**
- Triggered the mobile sizing work. Added CSS custom properties (`--card-w`, `--card-m`) with `clamp()` for responsive card widths inside a `@media (max-width: 1024px)` block.

**Fix: mobile media query wasn't applying**
- Cards were still full size on phone. Root cause: the media query was placed *before* the base `.card-slot` styles in the CSS, so the base `width: 186px` won the cascade. Fix: move the entire media query to the end of the stylesheet.

**Make fan layout actually fan on mobile, but default to flat**
- Mobile was forcing `transform: rotate(0deg)` on all cards, killing the fan. Removed that override so the base fan rotation works. Added JS to detect mobile via `matchMedia` and start in flat layout.

**Tighten fan spacing on mobile**
- Fan cards too far apart on mobile. Added a separate `--card-m-fan` variable with tighter negative margins for fan mode, iterated ~5% tighter.

**Scale border-radius proportionally to card size**
- Corner radii were clipping card art details at smaller sizes. Used the desktop lightbox (16px radius on ~362px wide) as the reference, then scaled proportionally: desktop cards 8px, mobile cards 4px, mobile lightbox 14px. Round down when between values to preserve detail.
