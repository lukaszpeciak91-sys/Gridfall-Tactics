export const HAND_CARD_FLIP_REVEAL_DURATION = 220;

export function shouldSkipHandCardFlipReveal() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function findHandCardFlipRevealSlots({ backCards = [], handCards = [], cardsVisible = Infinity } = {}) {
  const visibleCardCount = Math.min(handCards.length, cardsVisible);
  return backCards
    .filter((backCard) => Number.isInteger(backCard?.slotIndex)
      && backCard.slotIndex >= 0
      && backCard.slotIndex < visibleCardCount)
    .map((backCard) => backCard.slotIndex);
}

export function startHandCardFlipReveal({
  tweens,
  backCard,
  cardView,
  duration = HAND_CARD_FLIP_REVEAL_DURATION,
  skipAnimation = shouldSkipHandCardFlipReveal(),
  onComplete = () => {},
} = {}) {
  const root = cardView?.root;
  const background = cardView?.background;
  const finishImmediately = () => {
    backCard?.destroy?.();
    if (root) root.scaleX = 1;
    background?.setInteractive?.({ useHandCursor: true });
  };

  if (!backCard || !root || !background || skipAnimation || typeof tweens?.add !== 'function') {
    finishImmediately();
    onComplete();
    return null;
  }

  const halfDuration = Math.max(1, Math.round(duration / 2));
  let shrinkTween = null;
  let expandTween = null;
  let active = true;

  const controller = {
    get active() {
      return active;
    },
    cleanup() {
      if (!active) return;
      active = false;
      shrinkTween?.stop?.();
      expandTween?.stop?.();
      finishImmediately();
    },
  };

  root.scaleX = 0;
  background.disableInteractive?.();
  backCard.scaleX = 1;
  shrinkTween = tweens.add({
    targets: backCard,
    scaleX: 0,
    duration: halfDuration,
    ease: 'Quad.easeIn',
    onComplete: () => {
      if (!active) return;
      backCard.destroy?.();
      expandTween = tweens.add({
        targets: root,
        scaleX: 1,
        duration: halfDuration,
        ease: 'Quad.easeOut',
        onComplete: () => {
          if (!active) return;
          active = false;
          root.scaleX = 1;
          background.setInteractive?.({ useHandCursor: true });
          onComplete();
        },
      });
    },
  });

  return controller;
}
