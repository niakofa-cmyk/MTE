import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const smokeUrl = process.env.MTE_SMOKE_URL ?? "http://127.0.0.1:80/";
const chromiumPath = process.env.MTE_CHROMIUM_PATH ?? process.env.CHROMIUM_PATH ?? "chromium";
const rendererMode = process.env.MTE_RENDERER_MODE ?? "swiftshader";
if (!["swiftshader", "hardware"].includes(rendererMode)) {
  throw new Error("MTE_RENDERER_MODE must be 'swiftshader' or 'hardware'.");
}
const profileDirectory = await mkdtemp(path.join(os.tmpdir(), "mte-browser-smoke-"));
const activePortFile = path.join(profileDirectory, "DevToolsActivePort");
const pageErrors = [];
const pageWarnings = [];

const browser = spawn(
  chromiumPath,
  [
    "--headless=new",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu-sandbox",
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    "--disable-backgrounding-occluded-windows",
    "--enable-webgl",
    ...(rendererMode === "swiftshader"
      ? ["--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader"]
      : ["--ignore-gpu-blocklist"]),
    "--remote-debugging-address=127.0.0.1",
    "--remote-debugging-port=0",
    "--remote-allow-origins=*",
    `--user-data-dir=${profileDirectory}`,
    "about:blank",
  ],
  { stdio: ["ignore", "ignore", "pipe"] },
);

let browserStderr = "";
browser.stderr.setEncoding("utf8");
browser.stderr.on("data", (chunk) => {
  browserStderr += chunk;
});

let socket;

try {
  await waitForDevToolsPort();
  const devToolsPort = Number((await readFile(activePortFile, "utf8")).split(/\s+/)[0]);
  const targets = await fetchJson(`http://127.0.0.1:${devToolsPort}/json/list`);
  const page = targets.find((target) => target.type === "page");
  if (!page?.webSocketDebuggerUrl) throw new Error("Chromium did not expose a page target.");

  socket = new WebSocket(page.webSocketDebuggerUrl);
  await waitForSocket(socket);
  const cdp = createCdpClient(socket, pageErrors, pageWarnings);
  await cdp.call("Page.enable");
  await cdp.call("Runtime.enable");
  await cdp.call("Log.enable");
  await cdp.call("Page.setLifecycleEventsEnabled", { enabled: true });

  const desktop = await runViewport(cdp, {
    name: "desktop",
    width: 1280,
    height: 900,
    mobile: false,
    touch: false,
  });
  const mobile = await runViewport(cdp, {
    name: "mobile",
    width: 390,
    height: 844,
    mobile: true,
    touch: true,
  });

  if (pageErrors.length > 0) {
    throw new Error(`Browser page errors:\n${pageErrors.map((error) => `- ${error}`).join("\n")}`);
  }

  console.log(`Browser smoke passed at ${smokeUrl}`);
  console.log(`Renderer mode: ${rendererMode}${rendererMode === "swiftshader" ? " (software compatibility check)" : ""}`);
  console.log(`Desktop: ${formatResult(desktop)}`);
  console.log(`Mobile: ${formatResult(mobile)}`);
  if (pageWarnings.length > 0) {
    console.warn(`Page console warnings (${pageWarnings.length}):\n${pageWarnings.map((warning) => `- ${warning}`).join("\n")}`);
  }
  console.log(`Page exceptions/console errors: ${pageErrors.length}; console warnings: ${pageWarnings.length}`);
} catch (error) {
  if (browser.exitCode !== null) {
    console.error(`Chromium exited with code ${browser.exitCode}.`);
    const relevantStderr = browserStderr.split("\n").filter((line) => /error|failed/i.test(line));
    for (const line of relevantStderr.slice(-8)) console.error(line);
  }
  throw error;
} finally {
  socket?.close();
  browser.kill("SIGTERM");
  const waitForExit = () =>
    new Promise((resolve) => {
      if (browser.exitCode !== null || browser.signalCode !== null) resolve();
      else browser.once("exit", resolve);
    });
  const exitedGracefully = await Promise.race([
    waitForExit().then(() => true),
    delay(2_000).then(() => false),
  ]);
  if (!exitedGracefully) {
    browser.kill("SIGKILL");
    await waitForExit();
  }
  await rm(profileDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

async function runViewport(cdp, viewport) {
  await cdp.call("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.mobile,
  });
  await cdp.call("Emulation.setTouchEmulationEnabled", {
    enabled: viewport.touch,
    maxTouchPoints: viewport.touch ? 5 : 1,
  });
  await cdp.call("Page.navigate", { url: smokeUrl });
  await waitForPageReady(cdp);

  const beforeStart = await evaluate(cdp, `(() => {
    const canvases = [...document.querySelectorAll("canvas")];
    const deploy = document.querySelector('[data-testid="button-deploy-solo"]');
    return {
      title: document.title,
      bodyText: document.body.innerText.slice(0, 300),
      missionTitleVisible: document.body.innerText.replace(/\\s+/g, " ").includes("MISSION TO EARTH"),
      webgl2: canvases.some((canvas) => Boolean(canvas.getContext("webgl2"))),
      rendererName: (() => {
        const context = canvases.map((canvas) => canvas.getContext("webgl2")).find(Boolean);
        if (!context) return "unavailable";
        const debug = context.getExtension("WEBGL_debug_renderer_info");
        return context.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : context.RENDERER);
      })(),
      canvasCount: canvases.length,
      fallbackVisible: document.body.innerText.includes("This preview browser cannot render 3D"),
      deployEnabled: Boolean(deploy && !deploy.disabled),
      coarsePointer: matchMedia("(pointer: coarse)").matches,
      touchOverlayVisible: (() => {
        const overlay = document.querySelector(".touch-hud-overlay");
        return Boolean(overlay && getComputedStyle(overlay).display !== "none");
      })(),
    };
  })()`);

  assert(
    beforeStart.missionTitleVisible,
    `${viewport.name}: mission menu did not render (title=${beforeStart.title}; body=${JSON.stringify(beforeStart.bodyText)})`,
  );
  assert(beforeStart.deployEnabled, `${viewport.name}: solo deployment is unavailable`);
  assert(beforeStart.webgl2 && !beforeStart.fallbackVisible, `${viewport.name}: SwiftShader WebGL2 did not initialize`);

  await evaluate(cdp, `document.querySelector('[data-testid="button-deploy-solo"]').click(); true`);
  await delay(350);

  let movementControlResponded = false;
  let lookInputDispatched = false;
  let fireControlPresent = false;
  let landscapeHudReady = false;
  if (viewport.touch) {
    const mobileControls = await evaluate(cdp, `(() => ({
      overlayVisible: (() => {
        const overlay = document.querySelector(".touch-hud-overlay");
        return Boolean(overlay && getComputedStyle(overlay).display !== "none");
      })(),
      movementZone: Boolean(document.querySelector(".zone-left-movement")),
      aimZone: Boolean(document.querySelector(".zone-right-combat")),
      fireButton: Boolean(document.querySelector(".touch-fire")),
      hudToggle: Boolean(document.querySelector('[data-testid="touch-hud-toggle"]')),
      panelClosed: document.querySelector(".touch-hud-overlay")?.dataset.mobilePanel === "closed",
      fieldInfoHidden: (() => {
        const panel = document.querySelector("#mte-touch-field-panel");
        return Boolean(panel && getComputedStyle(panel).display === "none");
      })(),
      landscapePromptVisible: (() => {
        const prompt = document.querySelector(".mte-landscape-prompt");
        return Boolean(prompt && getComputedStyle(prompt).display !== "none");
      })(),
    }))()`);

    assert(beforeStart.coarsePointer, "mobile emulation did not activate the coarse-pointer media query");
    assert(mobileControls.overlayVisible, "mobile touch overlay is hidden after deployment");
    assert(mobileControls.movementZone && mobileControls.aimZone, "mobile movement or aim zone is missing");
    assert(mobileControls.fireButton, "mobile fire control is missing");
    assert(mobileControls.hudToggle, "mobile HUD and calibration toggle is missing");
    assert(mobileControls.panelClosed, "mobile calibration panel should start closed");
    assert(mobileControls.fieldInfoHidden, "secondary field telemetry should start hidden");
    assert(mobileControls.landscapePromptVisible, "portrait gameplay did not show the landscape recommendation");
    fireControlPresent = mobileControls.fireButton;

    const movement = await evaluate(cdp, `(() => {
      const zone = document.querySelector(".zone-left-movement");
      const box = zone.getBoundingClientRect();
      const x = Math.round(box.left + box.width * 0.35);
      const y = Math.round(box.top + box.height * 0.68);
      return { x, y };
    })()`);
    await cdp.call("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ id: 7, x: movement.x, y: movement.y, radiusX: 5, radiusY: 5, force: 1 }],
    });
    await cdp.call("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ id: 7, x: movement.x + 30, y: movement.y - 24, radiusX: 5, radiusY: 5, force: 1 }],
    });
    await delay(120);
    movementControlResponded = await evaluate(
      cdp,
      `Boolean(document.querySelector(".dynamic-virtual-stick"))`,
    );
    await cdp.call("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    assert(movementControlResponded, "mobile movement zone did not respond to a touch drag");

    const aim = await evaluate(cdp, `(() => {
      const box = document.querySelector(".zone-right-combat").getBoundingClientRect();
      return { x: Math.round(box.left + box.width * 0.45), y: Math.round(box.top + box.height * 0.42) };
    })()`);
    await cdp.call("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ id: 9, x: aim.x, y: aim.y, radiusX: 5, radiusY: 5, force: 1 }],
    });
    await cdp.call("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ id: 9, x: aim.x + 36, y: aim.y - 22, radiusX: 5, radiusY: 5, force: 1 }],
    });
    await delay(120);
    await cdp.call("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    lookInputDispatched = true;

    const fireButton = await evaluate(cdp, `document.querySelector(".touch-fire")?.getBoundingClientRect().toJSON() ?? null`);
    if (fireButton) {
      const x = Math.round(fireButton.x + fireButton.width / 2);
      const y = Math.round(fireButton.y + fireButton.height / 2);
      await cdp.call("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ id: 8, x, y, radiusX: 5, radiusY: 5, force: 1 }],
      });
      await cdp.call("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    }

    await evaluate(cdp, `document.querySelector('[data-testid="touch-hud-toggle"]').click(); true`);
    await delay(80);
    const fieldPanelVisible = await evaluate(
      cdp,
      `getComputedStyle(document.querySelector("#mte-touch-field-panel")).display !== "none"`,
    );
    assert(fieldPanelVisible, "Field tab did not reveal map and status information");
    await evaluate(cdp, `document.querySelector('[data-testid="touch-tab-controls"]').click(); true`);
    await delay(80);
    const controlsPanel = await evaluate(cdp, `(() => ({
      presetCount: document.querySelector('[aria-label="Touch control preset"]')?.options.length ?? 0,
      handSelector: Boolean(document.querySelector('[aria-label="Aiming hand"]')),
      tabs: document.querySelectorAll(".touch-calibration-tabs [role='tab']").length === 3,
      statusHidden: getComputedStyle(document.querySelector("#mte-touch-field-panel")).display === "none",
    }))()`);
    assert(controlsPanel.presetCount === 3, "mobile control presets are missing from the Controls tab");
    assert(controlsPanel.handSelector, "mobile handedness selector is missing from the Controls tab");
    assert(controlsPanel.tabs, "mobile calibration categories are missing");
    assert(controlsPanel.statusHidden, "field telemetry remained visible behind the Controls tab");
    await evaluate(cdp, `document.querySelector('[data-testid="touch-calibration-tab-aim"]').click(); true`);
    await delay(60);
    const aimCalibration = await evaluate(cdp, `(() => ({
      look: Boolean(document.querySelector('.touch-calibration input[aria-label="Look"]')),
      movementHidden: !document.querySelector('.touch-calibration input[aria-label="Flick"]'),
    }))()`);
    assert(aimCalibration.look && aimCalibration.movementHidden, "Aim tab did not isolate aim calibration");
    await evaluate(cdp, `(() => {
      const preset = document.querySelector('[aria-label="Touch control preset"]');
      preset.value = "advanced";
      preset.dispatchEvent(new Event("change", { bubbles: true }));
      const look = document.querySelector('.touch-calibration input[aria-label="Look"]');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(look, "2.6");
      look.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    })()`);
    await delay(100);
    const calibrationState = await evaluate(cdp, `(() => ({
      saved: JSON.parse(localStorage.getItem("mte-touch-tune-v1") || "{}"),
      layout: JSON.parse(localStorage.getItem("mte-touch-layout-v1") || "{}"),
      inputValue: document.querySelector('.touch-calibration input[aria-label="Look"]')?.value ?? null,
    }))()`);
    assert(
      calibrationState.saved.look === 2.6 && calibrationState.layout.profile === "advanced",
      "adjusted touch calibration did not persist: " + JSON.stringify(calibrationState),
    );
    await evaluate(cdp, `document.querySelector('[data-testid="touch-calibration-reset"]').click(); true`);
    await delay(80);
    const resetCalibration = await evaluate(cdp, `(() => {
      const saved = JSON.parse(localStorage.getItem("mte-touch-tune-v1") || "{}");
      const layout = JSON.parse(localStorage.getItem("mte-touch-layout-v1") || "{}");
      return saved.look === 1.7 && layout.profile === "tactical" && layout.handedness === "right";
    })()`);
    assert(resetCalibration, "reset calibration did not restore saved defaults");
    await evaluate(cdp, `(() => {
      const selector = document.querySelector('[aria-label="Aiming hand"]');
      selector.value = "left";
      selector.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    })()`);
    await delay(100);
    const handednessApplied = await evaluate(cdp, `document.querySelector(".touch-hud-overlay")?.classList.contains("is-left-handed") === true`);
    assert(handednessApplied, "left-handed touch layout did not activate");
    const rightHandMove = await evaluate(cdp, `(() => {
      const box = document.querySelector(".zone-right-combat").getBoundingClientRect();
      return { x: Math.round(box.left + box.width * 0.32), y: Math.round(box.top + box.height * 0.36) };
    })()`);
    await cdp.call("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ id: 10, x: rightHandMove.x, y: rightHandMove.y, radiusX: 5, radiusY: 5, force: 1 }],
    });
    await cdp.call("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ id: 10, x: rightHandMove.x - 28, y: rightHandMove.y - 20, radiusX: 5, radiusY: 5, force: 1 }],
    });
    await delay(100);
    const leftHandedMovementResponded = await evaluate(cdp, `Boolean(document.querySelector(".dynamic-virtual-stick"))`);
    await cdp.call("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    assert(leftHandedMovementResponded, "right-side movement did not respond in left-handed mode");
    await evaluate(cdp, `document.querySelector('[data-testid="touch-hud-toggle"]').click(); true`);
    await delay(80);
    const panelsClosed = await evaluate(cdp, `document.querySelector(".touch-hud-overlay")?.dataset.mobilePanel === "closed"`);
    assert(panelsClosed, "HUD panel did not close before returning to combat");

    await cdp.call("Emulation.setDeviceMetricsOverride", {
      width: 844,
      height: 390,
      deviceScaleFactor: 1,
      mobile: true,
      screenOrientation: { type: "landscapePrimary", angle: 90 },
    });
    await delay(180);
    const landscape = await evaluate(cdp, `(() => {
      const overlay = document.querySelector(".touch-hud-overlay");
      const prompt = document.querySelector(".mte-landscape-prompt");
      const fire = document.querySelector(".touch-fire")?.getBoundingClientRect();
      return {
        media: matchMedia("(orientation: landscape)").matches,
        overlay: Boolean(overlay && getComputedStyle(overlay).display !== "none"),
        promptHidden: !prompt || getComputedStyle(prompt).display === "none",
        fireFits: Boolean(fire && fire.left >= 0 && fire.top >= 0 && fire.right <= innerWidth && fire.bottom <= innerHeight),
      };
    })()`);
    assert(landscape.media, "mobile landscape emulation did not change the orientation media query");
    assert(landscape.overlay, "touch overlay disappeared in landscape");
    assert(landscape.promptHidden, "landscape advisory remained visible after rotating to landscape");
    assert(landscape.fireFits, "landscape fire control is outside the viewport");
    landscapeHudReady = true;
  } else {
    await cdp.call("Input.dispatchKeyEvent", {
      type: "keyDown",
      key: "w",
      code: "KeyW",
      windowsVirtualKeyCode: 87,
      nativeVirtualKeyCode: 87,
    });
    await delay(250);
    await cdp.call("Input.dispatchKeyEvent", {
      type: "keyUp",
      key: "w",
      code: "KeyW",
      windowsVirtualKeyCode: 87,
      nativeVirtualKeyCode: 87,
    });
  }

  const frameTimes = await evaluate(
    cdp,
    `new Promise((resolve) => {
      const samples = [];
      let previous = 0;
      const started = performance.now();
      function sample(now) {
        if (previous > 0) samples.push(now - previous);
        previous = now;
        if (now - started >= 2500) {
          samples.sort((a, b) => a - b);
          const sum = samples.reduce((total, value) => total + value, 0);
          resolve({
            frames: samples.length,
            meanMs: sum / Math.max(1, samples.length),
            p50Ms: samples[Math.floor(samples.length * 0.5)] ?? 0,
            p95Ms: samples[Math.min(samples.length - 1, Math.ceil(samples.length * 0.95) - 1)] ?? 0,
          });
          return;
        }
        requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
    })`,
  );

  assert(
    frameTimes.frames > 0,
    `${viewport.name}: frame sampler did not receive enough frames (received ${frameTimes.frames})`,
  );
  return {
    viewport: `${viewport.width}×${viewport.height}`,
    canvasCount: beforeStart.canvasCount,
    webgl2: beforeStart.webgl2,
    rendererName: beforeStart.rendererName,
    coarsePointer: beforeStart.coarsePointer,
    movementControlResponded,
    lookInputDispatched,
    fireControlPresent,
    landscapeHudReady,
    frameTimes,
  };
}

function createCdpClient(webSocket, errors, warnings) {
  let nextId = 1;
  const pending = new Map();
  webSocket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (message.id) {
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id);
      if (message.error) request.reject(new Error(message.error.message));
      else request.resolve(message.result ?? {});
      return;
    }

    if (message.method === "Runtime.exceptionThrown") {
      errors.push(message.params.exceptionDetails?.text ?? "uncaught page exception");
    } else if (
      message.method === "Runtime.consoleAPICalled" &&
      message.params.type === "error"
    ) {
      errors.push(message.params.args.map((arg) => arg.value ?? arg.description ?? "").join(" "));
    } else if (
      message.method === "Runtime.consoleAPICalled" &&
      message.params.type === "warning"
    ) {
      warnings.push(message.params.args.map((arg) => arg.value ?? arg.description ?? "").join(" "));
    } else if (
      message.method === "Log.entryAdded" &&
      message.params.entry.level === "error"
    ) {
      errors.push(message.params.entry.text);
    } else if (
      message.method === "Log.entryAdded" &&
      message.params.entry.level === "warning"
    ) {
      warnings.push(message.params.entry.text);
    }
  });

  return {
    call(method, params = {}) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`Timed out waiting for Chromium DevTools method ${method}`));
        }, 10_000);
        pending.set(id, {
          resolve: (value) => {
            clearTimeout(timeout);
            resolve(value);
          },
          reject: (error) => {
            clearTimeout(timeout);
            reject(error);
          },
        });
        webSocket.send(JSON.stringify({ id, method, params }));
      });
    },
  };
}

async function evaluate(cdp, expression) {
  const response = await cdp.call("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true,
  });
  if (response.exceptionDetails) {
    throw new Error(response.exceptionDetails.text ?? "Browser evaluation failed.");
  }
  return response.result?.value;
}

async function waitForPageReady(cdp) {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    const ready = await evaluate(
      cdp,
      `Boolean(document.querySelector('[data-testid="button-deploy-solo"]')) && document.readyState === "complete"`,
    );
    if (ready) return;
    await delay(150);
  }
  throw new Error(`Timed out loading Mission To Earth at ${smokeUrl}.`);
}

async function waitForDevToolsPort() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (browser.exitCode !== null) throw new Error(`Chromium exited early with code ${browser.exitCode}.`);
    try {
      await readFile(activePortFile, "utf8");
      return;
    } catch {
      await delay(100);
    }
  }
  throw new Error("Chromium did not publish its remote debugging port.");
}

async function waitForSocket(webSocket) {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timed out connecting to Chromium.")), 10_000);
    webSocket.addEventListener("open", () => {
      clearTimeout(timeout);
      resolve();
    }, { once: true });
    webSocket.addEventListener("error", () => {
      clearTimeout(timeout);
      reject(new Error("Could not connect to Chromium DevTools."));
    }, { once: true });
  });
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Chromium DevTools returned HTTP ${response.status} for ${url}.`);
  return response.json();
}

function formatResult(result) {
  const frame = result.frameTimes;
  return `${result.viewport}, WebGL2=${result.webgl2}, renderer=${result.rendererName}, canvases=${result.canvasCount}, ` +
    `frames=${frame.frames}, p50=${frame.p50Ms.toFixed(2)} ms, p95=${frame.p95Ms.toFixed(2)} ms, ` +
    `movement-touch=${result.movementControlResponded}, look-touch=${result.lookInputDispatched}, ` +
    `fire-control=${result.fireControlPresent || "desktop input"}, landscape-HUD=${result.landscapeHudReady}`;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
