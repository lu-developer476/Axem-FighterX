/**
 * Presents an animated GIF in the Phaser DOM layer. Browser GIF decoding keeps
 * the source animated, unlike a static Phaser image texture.
 */
export class GifOverlay {
  constructor(scene, {
    width = 150,
    height = 100,
    depth = 100,
    originX = 0.5,
    originY = 1,
  } = {}) {
    const image = document.createElement('img');
    image.alt = '';
    image.draggable = false;
    image.decoding = 'async';
    Object.assign(image.style, {
      width: width + 'px',
      height: height + 'px',
      objectFit: 'contain',
      imageRendering: 'pixelated',
      pointerEvents: 'none',
      userSelect: 'none',
      display: 'block',
      maxWidth: 'none',
    });

    this.image = image;
    this.source = null;
    this.dom = scene.add.dom(0, 0, image)
      .setOrigin(originX, originY)
      .setDepth(depth)
      .setVisible(false);
  }

  setSource(source) {
    const nextSource = source ?? null;
    if (this.source === nextSource) {
      if (!nextSource) this.dom.setVisible(false);
      return;
    }
    this.source = nextSource;
    if (this.source) {
      this.image.src = this.source;
    } else {
      this.image.removeAttribute('src');
      this.dom.setVisible(false);
    }
  }

  sync({
    x,
    y,
    scale = 1,
    alpha = 1,
    flipX = false,
    depth,
    visible = true,
  }) {
    this.dom.setPosition(x, y);
    this.dom.setScale(scale);
    this.dom.setAlpha(alpha);
    if (depth !== undefined) this.dom.setDepth(depth);
    this.image.style.transform = flipX ? 'scaleX(-1)' : 'none';
    this.dom.setVisible(Boolean(visible && this.source));
  }

  destroy() {
    this.dom.destroy();
  }
}
