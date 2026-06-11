import { Color, Fog, Scene, Vector2, Vector3 } from "three/webgpu";
import { createRenderer } from "./renderer";
import { CameraRig } from "./camera";
import { buildArena } from "./arena";
import { Input } from "./input";
import { Effects, HitStop } from "./effects";
import { Player, type PlayerContext } from "./player";
import { Enemy, EnemyManager, type EnemyContext } from "./enemy";
import { Overlay } from "./overlay";
import { DEFAULT_TUNABLES } from "./tunables";
import { COMBAT } from "./tunables";

type Mode = "wasd" | "click";

async function boot() {
  const canvas = document.getElementById("scene") as HTMLCanvasElement;
  const uiRoot = document.getElementById("ui") as HTMLElement;

  // ?webgl in der URL erzwingt den WebGL2-Fallback (zum Testen/Vergleichen).
  const forceWebGL = new URLSearchParams(location.search).has("webgl");
  const { renderer, isWebGPU, label } = await createRenderer(canvas, forceWebGL);

  const scene = new Scene();
  scene.background = new Color(0x0a0c12);
  scene.fog = new Fog(0x0a0c12, 40, 75);

  const cam = new CameraRig(window.innerWidth / window.innerHeight);
  const arena = buildArena(scene);
  const effects = new Effects(scene, cam.camera, uiRoot);
  const hitStop = new HitStop();
  const input = new Input(canvas);
  const tun = { ...DEFAULT_TUNABLES };

  const player = new Player(scene);
  player.pos.set(0, 0, 6);
  cam.snapTo(player.pos);

  const enemies = new EnemyManager(scene, arena);
  enemies.spawnWave();

  const overlay = new Overlay(uiRoot, tun, input);
  overlay.setRenderer(label, isWebGPU);

  let mode: Mode = "wasd";
  const clickTarget = new Vector2();
  let hasClickTarget = false;

  // Wiederverwendbare Puffer
  const groundPt = new Vector3();
  const aimDir = new Vector2();
  const moveAxis = new Vector2();

  addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    cam.resize(window.innerWidth / window.innerHeight);
  });

  let gameClock = 0; // ms, friert mit Hit-Stop ein
  let last = performance.now();
  let fps = 0;

  function nearestEnemy(): Enemy | null {
    let best: Enemy | null = null;
    let bestD = Infinity;
    for (const e of enemies.enemies) {
      if (!e.alive) continue;
      const d = (e.pos.x - player.pos.x) ** 2 + (e.pos.z - player.pos.z) ** 2;
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  function frame(nowReal: number) {
    const realDtMs = Math.min(50, nowReal - last);
    last = nowReal;
    fps = fps * 0.9 + (1000 / Math.max(1, realDtMs)) * 0.1;

    // Hit-Stop friert die Spielzeit ein, der Renderer laeuft weiter.
    const frozen = hitStop.tick(realDtMs);
    const gameDt = frozen ? 0 : realDtMs / 1000;
    gameClock += frozen ? 0 : realDtMs;

    // ---- globale Umschalter ----
    if (input.trigToggleDebug) overlay.toggleDebug();
    if (input.trigToggleHelp) overlay.toggleHelp();
    if (input.trigToggleTouch) overlay.toggleTouch();
    if (input.trigToggleMode) {
      mode = mode === "wasd" ? "click" : "wasd";
      hasClickTarget = false;
    }
    if (input.trigSpawn) enemies.spawnWave();

    const touchOn = overlay.touchOn && input.touchActive;

    // ---- Zielen + Bewegung je nach Modus ----
    aimDir.set(0, 0);
    moveAxis.set(0, 0);

    if (touchOn) {
      // Touch: Joystick bewegt, Auto-Aim auf naechsten Gegner.
      moveAxis.copy(input.touchMove);
      const ne = nearestEnemy();
      if (ne) aimDir.set(ne.pos.x - player.pos.x, ne.pos.z - player.pos.z);
      else aimDir.set(moveAxis.x, -moveAxis.y);
    } else if (mode === "click") {
      // Klick-zu-Bewegen: Linksklick setzt Ziel, Figur laeuft hin.
      if (input.trigGroundClick && cam.raycastGround(input.clickNDC, groundPt)) {
        clickTarget.set(groundPt.x, groundPt.z);
        hasClickTarget = true;
      }
      if (hasClickTarget) {
        const dx = clickTarget.x - player.pos.x;
        const dz = clickTarget.y - player.pos.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.2) {
          moveAxis.set(dx, -dz);
          aimDir.set(dx, dz);
        } else {
          hasClickTarget = false;
        }
      }
    } else {
      // WASD + Maus zielen.
      input.movementAxis(moveAxis);
      if (cam.raycastGround(input.mouseNDC, groundPt)) {
        aimDir.set(groundPt.x - player.pos.x, groundPt.z - player.pos.z);
      }
    }
    if (aimDir.lengthSq() > 1e-6) aimDir.normalize();

    // Leichter Angriff per Linksklick nur im WASD-Modus (im Klickmodus
    // bedeutet Linksklick "hingehen").
    const wantLight = input.trigLight && (mode === "wasd" || touchOn);

    const playerCtx: PlayerContext = {
      gameClock,
      dt: gameDt,
      aimDir,
      moveAxis,
      blockHeld: input.rightHeld,
      trigLight: wantLight,
      trigHeavy: input.trigHeavy,
      trigRoll: input.trigRoll,
      enemies: enemies.enemies,
      effects,
      hitStop,
      tun,
      arena,
    };
    player.update(playerCtx);

    const enemyCtx: EnemyContext = {
      gameClock,
      dt: gameDt,
      player,
      playerCtx,
      arena,
      effects,
      hitStop,
      tun,
    };
    enemies.update(enemyCtx);

    cam.update(player.pos, gameDt);
    effects.update(gameDt, realDtMs / 1000);

    const phase = player.phaseInfo();
    overlay.update({
      fps,
      action: player.action,
      phase: phase.phase,
      phaseRemainingMs: phase.remainingMs,
      comboStep: player.comboStep,
      rollCooldownMs: player.rollCooldownRemaining,
      iFrameMs: player.iFrameRemaining,
      parryOpen: player.parryWindowOpen(tun),
      blocking: player.blocking,
      parryBuff: player.parryBuff,
      hp: player.hp,
      maxHp: COMBAT.playerMaxHp,
      mode: mode === "wasd" ? "WASD + Maus" : "Klick-zu-Bewegen",
      enemies: enemies.aliveCount,
      wave: enemies.wave,
    });

    input.endFrame();
    renderer.render(scene, cam.camera);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

boot().catch((err) => {
  console.error(err);
  const ui = document.getElementById("ui");
  if (ui) {
    ui.innerHTML = `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#ef6f6f;font-family:sans-serif;padding:20px;text-align:center">Start fehlgeschlagen: ${String(
      err,
    )}</div>`;
  }
});
