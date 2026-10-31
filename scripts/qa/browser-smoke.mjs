import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const smokeUrl = process.env.MTE_SMOKE_URL ?? "http://127.0.0.1:80/";
const chromiumPath = process.env.MTE_CHROMIUM_PATH ?? process.env.CHROMIUM_PATH ?? "chromium";
const profileDirectory = await mkdtemp(path.join(os.tmpdir(), "mte-browser-smoke-"));
const activePortFile = path.join(profileDirectory, "DevToolsActivePort");
const pageErrors = [];

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
    "--enable-unsafe-swiftshader",
    "--use-gl=angle",
    "--use-angle=swiftshader",
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
  const cdp = createCdpClient(socket, pageErrors);
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
  console.log("Renderer: SwiftShader WebGL2 (software compatibility check, not GPU certification)");
  console.log(`Desktop: ${formatResult(desktop)}`);
  console.log(`Mobile: ${formatResult(mobile)}`);
  console.log("Page exceptions/console errors: 0");
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
  await Promise.race([
    new Promise((resolve) => browser.once("exit", resolve)),
    delay(2_000).then(() => browser.kill("SIGKILL")),
  ]);
  await rm(profileDirectory, { recursive: true, force: true });
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
  let fireControlPresent = false;
  if (viewport.touch) {
    const mobileControls = await evaluate(cdp, `(() => ({
      overlayVisible: (() => {
        const overlay = document.querySelector(".touch-hud-overlay");
        return Boolean(overlay && getComputedStyle(overlay).display !== "none");
      })(),
      movementZone: Boolean(document.querySelector(".zone-left-movement")),
      aimZone: Boolean(document.querySelector(".zone-right-combat")),
      fireButton: Boolean(document.querySelector(".touch-fire")),
    }))()`);

    assert(beforeStart.coarsePointer, "mobile emulation did not activate the coarse-pointer media query");
    assert(mobileControls.overlayVisible, "mobile touch overlay is hidden after deployment");
    assert(mobileControls.movementZone && mobileControls.aimZone, "mobile movement or aim zone is missing");
    assert(mobileControls.fireButton, "mobile fire control is missing");
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
    frameTimes.frames > 20,
    `${viewport.name}: frame sampler did not receive enough frames (received ${frameTimes.frames})`,
  );
  return {
    viewport: `${viewport.width}×${viewport.height}`,
    canvasCount: beforeStart.canvasCount,
    webgl2: beforeStart.webgl2,
    coarsePointer: beforeStart.coarsePointer,
    movementControlResponded,
    fireControlPresent,
    frameTimes,
  };
}

function createCdpClient(webSocket, errors) {
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
      message.method === "Log.entryAdded" &&
      message.params.entry.level === "error"
    ) {
      errors.push(message.params.entry.text);
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
  return `${result.viewport}, WebGL2=${result.webgl2}, canvases=${result.canvasCount}, ` +
    `frames=${frame.frames}, p50=${frame.p50Ms.toFixed(2)} ms, p95=${frame.p95Ms.toFixed(2)} ms, ` +
    `movement-touch=${result.movementControlResponded}, fire-control=${result.fireControlPresent || "desktop input"}`;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
