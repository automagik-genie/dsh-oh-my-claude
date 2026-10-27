// Whether picking a Claude mode should rewrite dsh's shield or clear the stored override. Pure, so
// the two composers that share the rule can be tested without a DOM. Tested in mode-pick.test.ts.
import type { PermissionModeState } from "../events.js";

/** Whether picking `mode` may clear the stored override without changing the mode in force: only
 *  when it is already the mode the session resolves to with no override. Under the Auto default a
 *  workspace-write session's clear mode is auto, so picking Accept edits or Bypass is kept as an
 *  explicit choice instead of being thrown away. */
export const clearsOverride = (mode: string, snap: PermissionModeState): boolean =>
  mode === snap.defaultMode;

/** Whether the row already names the mode the session is in. Picking it must not rewrite dsh's
 *  shield: a fresh Auto session under the default workspace-write shield escalated to Full access
 *  when its checked Auto row was clicked again. */
export const isCurrentMode = (mode: string, snap: PermissionModeState): boolean =>
  mode === (snap.liveMode ?? snap.mode);
