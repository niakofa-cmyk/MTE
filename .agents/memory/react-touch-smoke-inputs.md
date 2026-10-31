---
name: React touch-smoke inputs
description: React-controlled range inputs in browser smoke tests need native value-setter events.
---

When browser automation changes a React-controlled `<input type="range">`, set the value through the native `HTMLInputElement.prototype` setter and dispatch a bubbling `input` event. A plain `element.value = ...` followed by a change event may alter the displayed DOM value without updating React state.

**Why:** the browser's automation can bypass React's value tracker, which makes persistence tests falsely report that a calibration value did not save.

**How to apply:** use the native setter in the smoke harness, then verify both the saved value and the rendered control state.
