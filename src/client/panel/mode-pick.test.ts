// The pick rule both composers share: a pick equal to the session's no-override mode clears the
// stored override, and picking the row the session is already in never rewrites dsh's shield.
// Offline: `bun src/client/panel/mode-pick.test.ts`.
import assert from "node:assert/strict";
import type { PermissionModeState } from "../events.js";
import { clearsOverride, isCurrentMode } from "./mode-pick.js";

const snap = (o: Partial<PermissionModeState>): PermissionModeState => ({
  mode: "auto",
  override: null,
  modes: ["plan", "default", "acceptEdits", "auto", "dontAsk"],
  accessMode: "workspace-write",
  ceiling: "auto",
  defaultMode: "auto",
  liveMode: "auto",
  ...o,
});

// Under the Auto default, Accept edits and Bypass are explicit choices and must be stored, not
// cleared back to Auto. Only the mode the session would start in may be cleared.
assert.equal(clearsOverride("acceptEdits", snap({})), false);
assert.equal(clearsOverride("bypassPermissions", snap({ defaultMode: "auto" })), false);
assert.equal(clearsOverride("auto", snap({})), true);
// A Read Only shield's default is Plan, so picking Plan still clears.
assert.equal(
  clearsOverride(
    "plan",
    snap({ mode: "plan", accessMode: "read-only", ceiling: "plan", defaultMode: "plan" }),
  ),
  true,
);
// A pinned 'dsh' config keeps its old clear rule: the shield's mapping is the default.
assert.equal(
  clearsOverride(
    "acceptEdits",
    snap({
      mode: "acceptEdits",
      accessMode: "workspace-write",
      ceiling: "acceptEdits",
      defaultMode: "acceptEdits",
    }),
  ),
  true,
);
assert.equal(
  clearsOverride(
    "bypassPermissions",
    snap({
      mode: "bypassPermissions",
      accessMode: "danger-full-access",
      ceiling: "bypassPermissions",
      defaultMode: "bypassPermissions",
    }),
  ),
  true,
);

// Clicking the checked row must not send `/permission`: a default Auto session under workspace-write
// used to escalate its shield to Full access that way.
assert.equal(isCurrentMode("auto", snap({})), true);
assert.equal(isCurrentMode("acceptEdits", snap({})), false);
assert.equal(isCurrentMode("default", snap({ mode: "default", liveMode: null })), true);
// The live process's mode decides which row reads as checked, as the label does.
assert.equal(
  isCurrentMode("acceptEdits", snap({ mode: "acceptEdits", liveMode: "acceptEdits" })),
  true,
);
assert.equal(isCurrentMode("acceptEdits", snap({ mode: "plan", liveMode: "plan" })), false);
