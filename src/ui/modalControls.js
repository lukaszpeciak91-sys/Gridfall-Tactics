export function createModalBackButton(scene, {
  x,
  y,
  onPointerUp,
  depth = 3,
  width = 132,
  height = 44,
  label = 'BACK',
} = {}) {
  const backing = scene.add.rectangle(x, y, width, height, 0x93c5fd, 1)
    .setStrokeStyle(2, 0xe0f2fe, 0.9)
    .setDepth(depth)
    .setInteractive({ useHandCursor: true });

  const text = scene.add.text(x, y, label, {
    fontFamily: 'Arial, sans-serif',
    fontSize: '18px',
    color: '#0f172a',
    fontStyle: 'bold',
  })
    .setOrigin(0.5)
    .setDepth(depth + 1)
    .setInteractive({ useHandCursor: true });

  if (typeof onPointerUp === 'function') {
    backing.on('pointerup', onPointerUp);
    text.on('pointerup', onPointerUp);
  }

  return { backing, text };
}
