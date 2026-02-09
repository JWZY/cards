import { HolographicEffect } from './holographic-effect/holographic.js';

// ---- Constants ----
const CARD_COUNT = 6;
const MAX_FIELD = 3;
const HOLD_DELAY = 400;
const DRAG_THRESHOLD = 8;

// ---- DOM refs ----
const hand = document.getElementById('hand');
const playArea = document.getElementById('playArea');
const lightbox = document.getElementById('lightbox');
const lightboxCard = document.getElementById('lightboxCard');
const toggleBtn = document.getElementById('toggleBtn');
const resetBtn = document.getElementById('resetBtn');

// ---- State ----
let cards = [];          // { slot, inner, img, holoEffect } objects in hand
let playedCards = [];    // cards dropped onto the play area
let isFan = true;
let lightboxEffect = null;

// ---- Card Creation ----

function createCard(index, total) {
  const slot = document.createElement('div');
  slot.className = 'card-slot';
  slot.style.setProperty('--i', index);
  slot.style.setProperty('--n', total);

  const inner = document.createElement('div');
  inner.className = 'card-inner';

  const img = document.createElement('img');
  img.src = 'syndicate.png';
  img.alt = 'Card';
  img.draggable = false;

  inner.appendChild(img);
  slot.appendChild(inner);

  const holoEffect = new HolographicEffect(inner);

  return { slot, inner, img, holoEffect };
}

function initHand() {
  for (let i = 0; i < CARD_COUNT; i++) {
    const card = createCard(i, CARD_COUNT);
    cards.push(card);
    hand.appendChild(card.slot);
  }
}

function reindexHand() {
  const n = cards.length;
  cards.forEach((card, i) => {
    card.slot.style.setProperty('--i', i);
    card.slot.style.setProperty('--n', n);
  });
}

// ---- Layout Toggle ----

toggleBtn.addEventListener('click', () => {
  isFan = !isFan;
  hand.classList.toggle('flat', !isFan);
  toggleBtn.textContent = isFan ? 'Flat Layout' : 'Fan Layout';
});

// ---- Reset ----

resetBtn.addEventListener('click', () => {
  // Return all played cards to hand
  while (playedCards.length > 0) {
    const card = playedCards.pop();
    card.holoEffect.destroy();
    hand.appendChild(card.slot);
    cards.push(card);
    card.holoEffect = new HolographicEffect(card.inner);
  }
  reindexHand();
});

// ---- Hover ----

hand.addEventListener('pointerover', (e) => {
  const slot = e.target.closest('.card-slot');
  if (slot && hand.contains(slot) && !slot.classList.contains('dragging')) {
    slot.classList.add('hovered');
  }
});

hand.addEventListener('pointerout', (e) => {
  const slot = e.target.closest('.card-slot');
  if (slot && hand.contains(slot)) {
    // Only remove hover if pointer actually left the slot
    const related = e.relatedTarget;
    if (!related || !slot.contains(related)) {
      slot.classList.remove('hovered');
    }
  }
});

// ---- Lightbox ----

function openLightbox() {
  lightbox.classList.add('active');
  lightboxEffect = new HolographicEffect(lightboxCard);
}

function closeLightbox() {
  lightbox.classList.remove('active');
  if (lightboxEffect) {
    lightboxEffect.destroy();
    lightboxEffect = null;
  }
}

lightbox.addEventListener('click', (e) => {
  // Close when clicking backdrop (not the card itself inner content)
  if (e.target === lightbox || e.target === lightboxCard) {
    closeLightbox();
  }
});

// ---- Pointer State Machine (hold vs drag) ----

let pointerState = null;
// { card, startX, startY, holdTimer, isDragging,
//   offsetX, offsetY, placeholder, originalIndex }

hand.addEventListener('pointerdown', (e) => {
  const slot = e.target.closest('.hand .card-slot');
  if (!slot) return;

  const card = cards.find(c => c.slot === slot);
  if (!card) return;

  e.preventDefault();
  slot.classList.remove('hovered');

  const rect = slot.getBoundingClientRect();
  pointerState = {
    card,
    pointerId: e.pointerId,
    startX: e.clientX,
    startY: e.clientY,
    offsetX: e.clientX - rect.left,
    offsetY: e.clientY - rect.top,
    isDragging: false,
    holdTimer: setTimeout(() => {
      if (pointerState && !pointerState.isDragging) {
        // Hold detected — open lightbox
        cleanupPointer(true);
        openLightbox();
      }
    }, HOLD_DELAY),
    placeholder: null,
    originalIndex: cards.indexOf(card),
  };
});

document.addEventListener('pointermove', (e) => {
  if (!pointerState) return;

  const dx = e.clientX - pointerState.startX;
  const dy = e.clientY - pointerState.startY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (!pointerState.isDragging && dist > DRAG_THRESHOLD) {
    // Transition to drag mode
    clearTimeout(pointerState.holdTimer);
    startDrag(e);
  }

  if (pointerState.isDragging) {
    updateDrag(e);
  }
});

document.addEventListener('pointerup', (e) => {
  if (!pointerState) return;

  if (pointerState.isDragging) {
    endDrag(e);
  } else {
    // Short click (no hold, no drag) — do nothing (hold timer handles lightbox)
    cleanupPointer(true);
  }
});

function cleanupPointer(clearTimer) {
  if (!pointerState) return;
  if (clearTimer) clearTimeout(pointerState.holdTimer);
  pointerState = null;
}

// ---- Drag & Drop ----

function startDrag(e) {
  const { card } = pointerState;
  pointerState.isDragging = true;

  // Destroy holographic during drag
  card.holoEffect.destroy();

  // Insert placeholder
  const placeholder = document.createElement('div');
  placeholder.className = 'card-placeholder';
  card.slot.parentNode.insertBefore(placeholder, card.slot);
  pointerState.placeholder = placeholder;

  // Go fixed
  const rect = card.slot.getBoundingClientRect();
  card.slot.classList.add('dragging');
  card.slot.style.left = rect.left + 'px';
  card.slot.style.top = rect.top + 'px';
  card.slot.style.width = rect.width + 'px';
  card.slot.style.height = rect.height + 'px';

  // Move to body so it floats above everything
  document.body.appendChild(card.slot);
}

function updateDrag(e) {
  const { card, offsetX, offsetY, placeholder } = pointerState;

  // Move card with pointer
  card.slot.style.left = (e.clientX - offsetX) + 'px';
  card.slot.style.top = (e.clientY - offsetY) + 'px';

  // Check if over play area
  const playRect = playArea.getBoundingClientRect();
  const overPlay = (
    e.clientX >= playRect.left && e.clientX <= playRect.right &&
    e.clientY >= playRect.top && e.clientY <= playRect.bottom
  );

  const fieldFull = playedCards.length >= MAX_FIELD;
  playArea.classList.toggle('drop-hover', overPlay && !fieldFull);
  playArea.classList.toggle('field-full', overPlay && fieldFull);

  // If over hand, update placeholder position for reorder
  if (!overPlay) {
    const handRect = hand.getBoundingClientRect();
    const overHand = (
      e.clientX >= handRect.left && e.clientX <= handRect.right &&
      e.clientY >= handRect.top - 60 && e.clientY <= handRect.bottom + 20
    );

    if (overHand) {
      // Find insert position by comparing X to each card midpoint
      let insertBefore = null;
      for (const c of cards) {
        if (c === pointerState.card) continue;
        const r = c.slot.getBoundingClientRect();
        const midX = r.left + r.width / 2;
        if (e.clientX < midX) {
          insertBefore = c.slot;
          break;
        }
      }

      // Move placeholder
      if (insertBefore) {
        hand.insertBefore(placeholder, insertBefore);
      } else {
        hand.appendChild(placeholder);
      }
    }
  }
}

function endDrag(e) {
  const { card, placeholder, originalIndex } = pointerState;

  // Check drop target
  const playRect = playArea.getBoundingClientRect();
  const overPlay = (
    e.clientX >= playRect.left && e.clientX <= playRect.right &&
    e.clientY >= playRect.top && e.clientY <= playRect.bottom
  );

  // Remove dragging styles
  card.slot.classList.remove('dragging');
  card.slot.style.left = '';
  card.slot.style.top = '';
  card.slot.style.width = '';
  card.slot.style.height = '';

  playArea.classList.remove('drop-hover');
  playArea.classList.remove('field-full');

  const fieldFull = playedCards.length >= MAX_FIELD;

  if (overPlay && !fieldFull) {
    // Drop card onto play area
    placeholder.remove();
    cards.splice(cards.indexOf(card), 1);

    // Reset card slot for table display
    card.slot.style.setProperty('--i', 0);
    card.slot.style.setProperty('--n', 1);
    playArea.appendChild(card.slot);
    playedCards.push(card);

    // Re-init holo on table
    card.holoEffect = new HolographicEffect(card.inner);
    reindexHand();
  } else {
    // Return to hand — replace placeholder with card
    const nextSibling = placeholder.nextSibling;
    placeholder.remove();

    if (nextSibling) {
      hand.insertBefore(card.slot, nextSibling);
    } else {
      hand.appendChild(card.slot);
    }

    // Update cards array order to match DOM
    const slotOrder = Array.from(hand.querySelectorAll('.card-slot'));
    cards.sort((a, b) => slotOrder.indexOf(a.slot) - slotOrder.indexOf(b.slot));

    // Re-init holo
    card.holoEffect = new HolographicEffect(card.inner);
    reindexHand();
  }

  cleanupPointer(false);
}

// ---- Init ----
initHand();
