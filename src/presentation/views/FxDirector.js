import Phaser from 'phaser';
import { ARENA } from '../../domain/arena/arena.js';
import { FighterState, TIMINGS } from '../../domain/entities/FighterState.js';
import { FX_PARTICLES, fxAnimKey, fxFrameKey } from '../../infrastructure/graphics/FxTextureFactory.js';

const FX_DEPTH = 500;
const DUST_INTERVAL_MS = 190;
const SPARK_COLORS = [0xfff3b0, 0xffc23a, 0xff7a2b, 0xffffff];

/**
 * Traduce los eventos de dominio (golpe, KO, teletransporte, curación...) a
 * efectos visuales: explosiones, chispas, polvo, ondas, partículas y texto flotante.
 */
export class FxDirector {
  /** @param {Phaser.Scene} scene */
  constructor(scene) {
    this.scene = scene;
    this.dustTimers = new Map();
  }

  /**
   * @param {object[]} events eventos de dominio del frame
   * @returns {{ hitStopMs: number }} pausa breve para dar peso a los golpes
   */
  handle(events) {
    let hitStopMs = 0;
    for (const event of events) {
      switch (event.type) {
        case 'attack':
          this.#slash(event);
          break;
        case 'hit':
          this.#hit(event);
          hitStopMs = Math.max(hitStopMs, event.ko ? 140 : 70);
          break;
        case 'ko':
          this.#ko(event);
          break;
        case 'teleport-out':
          this.#teleportOut(event);
          break;
        case 'teleport-in':
          this.#teleportIn(event);
          break;
        case 'heal':
          this.#heal(event);
          break;
        case 'pickup-spawn':
          this.#play('healRing', event.x, ARENA.groundY - 20);
          break;
        case 'pickup-expired':
          this.#play('spark', event.x, ARENA.groundY - 20, { scale: 0.6 });
          break;
        default:
          break;
      }
    }
    return { hitStopMs };
  }

  /** Polvo al caminar. @param {import('../../domain/entities/Fighter.js').Fighter[]} fighters */
  update(fighters, deltaMs) {
    for (const fighter of fighters) {
      if (fighter.state !== FighterState.WALK) {
        this.dustTimers.set(fighter.id, DUST_INTERVAL_MS);
        continue;
      }
      const elapsed = (this.dustTimers.get(fighter.id) ?? 0) + deltaMs;
      if (elapsed >= DUST_INTERVAL_MS) {
        this.#play('dust', fighter.position.x - fighter.facing * 12, ARENA.groundY - 6, {
          flipX: fighter.facing === 1,
          depth: FX_DEPTH - 10,
        });
        this.dustTimers.set(fighter.id, 0);
      } else {
        this.dustTimers.set(fighter.id, elapsed);
      }
    }
  }

  // ── Efectos por evento ───────────────────────────────────────────────────

  #slash(event) {
    this.scene.time.delayedCall(TIMINGS.attack.windupMs, () => {
      this.#play('slash', event.x + event.facing * 18, event.y - 4, {
        flipX: event.facing === -1,
        originX: 0,
        depth: FX_DEPTH + 5,
      });
    });
  }

  #hit(event) {
    this.#play('explosion', event.x, event.y, { scale: 0.75 });
    this.#play('spark', event.x, event.y, { scale: 1.3, depth: FX_DEPTH + 1 });
    this.#debris(event.x, event.y, 9, event.facing, SPARK_COLORS);
    this.#floatText(event.x, event.y - 18, `-${event.damage}`, '#ffe066');
    this.scene.cameras.main.shake(90, 0.004);
  }

  #ko(event) {
    const { x, y } = event;
    this.#play('explosion', x, y, { scale: 1.7 });
    this.#play('shockwave', x, y + 18, { scale: 1.6 });
    [[-18, -10, 90], [16, 8, 170], [-6, 20, 250]].forEach(([dx, dy, delay]) => {
      this.scene.time.delayedCall(delay, () => this.#play('explosion', x + dx, y + dy, { scale: 1 }));
    });
    this.#debris(x, y, 22, event.facing, SPARK_COLORS);
    this.scene.cameras.main.flash(140, 255, 255, 255);
    this.scene.cameras.main.shake(320, 0.009);
  }

  #teleportOut(event) {
    this.#play('teleOut', event.x, event.y);
    this.#play('dust', event.x, ARENA.groundY - 6, { scale: 1.3, depth: FX_DEPTH - 10 });
  }

  #teleportIn(event) {
    this.#play('teleIn', event.x, event.y);
    this.#play('shockwave', event.x, ARENA.groundY - 6, { scale: 0.7 });
    this.#play('dust', event.x, ARENA.groundY - 6, { scale: 1.3, depth: FX_DEPTH - 10 });
  }

  #heal(event) {
    this.#play('healRing', event.x, event.y + 8, { scale: 1.7 });
    for (let i = 0; i < 9; i++) {
      const sparkle = this.scene.add
        .image(
          event.x + Phaser.Math.Between(-16, 16),
          event.y + Phaser.Math.Between(0, 26),
          i % 3 === 0 ? FX_PARTICLES.diamond : FX_PARTICLES.plus,
        )
        .setDepth(FX_DEPTH + 2)
        .setAlpha(0);
      this.scene.tweens.add({
        targets: sparkle,
        y: sparkle.y - Phaser.Math.Between(26, 54),
        alpha: { from: 1, to: 0 },
        delay: i * 55,
        duration: Phaser.Math.Between(650, 950),
        ease: 'Sine.easeOut',
        onComplete: () => sparkle.destroy(),
      });
    }
    this.#floatText(event.x, event.y - 26, `+${event.amount}`, '#7dff9a');
  }

  // ── Utilidades ───────────────────────────────────────────────────────────

  /** Reproduce una animación de efecto y se destruye al terminar. */
  #play(name, x, y, { scale = 1, flipX = false, originX = 0.5, depth = FX_DEPTH } = {}) {
    const sprite = this.scene.add
      .sprite(Math.round(x), Math.round(y), fxFrameKey(name, 0))
      .setOrigin(originX, 0.5)
      .setScale(scale)
      .setFlipX(flipX)
      .setDepth(depth);
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => sprite.destroy());
    sprite.play(fxAnimKey(name));
    return sprite;
  }

  #floatText(x, y, value, color) {
    const label = this.scene.add
      .text(Math.round(x), Math.round(y), value, {
        fontFamily: 'monospace',
        fontSize: '12px',
        fontStyle: 'bold',
        color,
        stroke: '#0d0b16',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(900);
    this.scene.tweens.add({
      targets: label,
      y: label.y - 26,
      alpha: 0,
      duration: 750,
      ease: 'Quad.easeOut',
      onComplete: () => label.destroy(),
    });
  }

  /** Partículas de píxel que salen disparadas y caen. */
  #debris(x, y, count, facing, colors) {
    for (let i = 0; i < count; i++) {
      const piece = this.scene.add
        .image(x, y, FX_PARTICLES.pixel)
        .setTint(Phaser.Utils.Array.GetRandom(colors))
        .setDepth(FX_DEPTH + 3);
      const dx = facing * Phaser.Math.Between(8, 34) + Phaser.Math.Between(-10, 10);
      const rise = Phaser.Math.Between(10, 30);
      this.scene.tweens.add({ targets: piece, x: x + dx, duration: 480, ease: 'Sine.easeOut' });
      this.scene.tweens.add({
        targets: piece,
        y: y - rise,
        duration: 170,
        ease: 'Quad.easeOut',
        onComplete: () =>
          this.scene.tweens.add({
            targets: piece,
            y: y + Phaser.Math.Between(10, 30),
            alpha: 0,
            duration: 310,
            ease: 'Quad.easeIn',
            onComplete: () => piece.destroy(),
          }),
      });
    }
  }
}
