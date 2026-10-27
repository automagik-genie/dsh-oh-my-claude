// The unconfigured Claude session default is Auto. A saved choice and an existing session keep what
// they have, and dsh's access-profile mapping still stands for a pinned 'dsh' config. Offline:
// `bun src/permission-default.test.ts`; without DSH_OMC_STATE_DIR it keeps its state in a temp dir.
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { PluginContext } from "./dsh.js";

process.env.DSH_OMC_STATE_DIR ??= mkdtempSync(join(tmpdir(), "omc-permission-default-"));
const { buildArgs, ClaudeCodeAdapter, Config, permissionModeFor } = await import("./adapter.js");
const { clampedPermissionMode, defaultPermissionMode, permissionCeiling } =
  await import("./adapter/cli.js");
const { PERMISSION_MODES_FILE, STATE_DIR, savePermissionMode } = await import("./state.js");

const fakeCtx = (o: object): PluginContext => o as unknown as PluginContext;
const newAdapter = (config = Config({})) => new ClaudeCodeAdapter(fakeCtx({ on() {} }), config);
const waitFor = async (done: () => boolean): Promise<void> => {
  for (let i = 0; i < 200; i++) {
    if (done()) return;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error("timed out waiting for the saved permission modes to load");
};

// 1. A new or unconfigured session runs Auto, whichever shield it starts under. Auto comes from the
//    mode default, not from the access flag: a Full access session is Auto, never Bypass.
{
  assert.equal(Config({}).permissionMode, "auto");
  for (const access of ["workspace-write", "danger-full-access", undefined]) {
    const mode = defaultPermissionMode(Config({}), access);
    assert.equal(mode, "auto", `${access ?? "no shield"}: the default is Auto`);
    assert.notEqual(mode, "acceptEdits");
    assert.notEqual(mode, "bypassPermissions");
    assert.notEqual(mode, "dontAsk");
  }
  // The default workspace shield admits Auto, so the mode the session starts in is genuinely active.
  assert.equal(permissionCeiling(Config({}), "workspace-write"), "auto");
  const args = buildArgs({ model: "m", config: Config({}), accessMode: "workspace-write" } as any);
  assert.ok(args.join(" ").includes("--permission-mode auto"), "the spawn passes Auto to the CLI");
}

// The Read Only shield is an explicit choice and still caps the session at Plan.
{
  assert.equal(defaultPermissionMode(Config({}), "read-only"), "plan");
  assert.equal(permissionCeiling(Config({}), "read-only"), "plan");
}

// 2. The adapter resolves a fresh session with no stored override to Auto, and reports Auto as a
//    mode the client may pick — not a mode that gets clamped away.
{
  const a = newAdapter();
  a.accessModes.set("fresh-session", "workspace-write");
  const info = a.permissionModeInfo("fresh-session");
  assert.equal(info.override, null);
  assert.equal(info.mode, "auto");
  assert.equal(info.ceiling, "auto");
  assert.equal(info.defaultMode, "auto");
  assert.ok(info.allowed.includes("auto"), "Auto is selectable");
  // Auto and Don't ask share a rank; only Auto is the default, so Don't ask stays a Full access mode.
  assert.equal(
    info.allowed.includes("dontAsk"),
    false,
    "the Auto ceiling does not admit Don't ask",
  );
}

// 3. A saved explicit choice keeps winning: everything up to a Full access shield, and a clamped
//    choice falls back to the shield's own mapping, never to the new default.
{
  const a = newAdapter();
  a.accessModes.set("saved-full", "danger-full-access");
  a.permissionModes.set("saved-full", "bypassPermissions");
  assert.equal(a.getPermissionMode("saved-full", "danger-full-access"), "bypassPermissions");
  assert.equal(a.permissionModeInfo("saved-full").mode, "bypassPermissions");

  a.accessModes.set("saved-work", "workspace-write");
  a.permissionModes.set("saved-work", "acceptEdits");
  assert.equal(a.getPermissionMode("saved-work", "workspace-write"), "acceptEdits");

  a.permissionModes.set("saved-tight", "bypassPermissions");
  assert.equal(a.getPermissionMode("saved-tight", "workspace-write"), "acceptEdits");
  a.permissionModes.set("saved-ask", "dontAsk");
  assert.equal(
    a.getPermissionMode("saved-ask", "workspace-write"),
    "acceptEdits",
    "Don't ask does not survive a workspace-write shield",
  );
  assert.equal(clampedPermissionMode(Config({}), "workspace-write"), "acceptEdits");
}

// A pinned non-default config keeps its own fallback: the Auto path must not tighten it.
{
  for (const permissionMode of ["plan", "acceptEdits", "bypassPermissions", "dontAsk"] as const) {
    const pinned = Config({ permissionMode });
    assert.equal(
      clampedPermissionMode(pinned, "read-only"),
      permissionMode,
      `pinned ${permissionMode}: the fallback is the pin, not the shield mapping`,
    );
  }
}

// 4. An existing session keeps its saved mode and the store is never migrated or rewritten by a read,
//    while a session with no entry stays absent instead of being written a default.
{
  const file = PERMISSION_MODES_FILE(STATE_DIR);
  await savePermissionMode(STATE_DIR, "existing-session", "acceptEdits");
  const before = readFileSync(file, "utf8");
  const a = newAdapter();
  await waitFor(() => a.permissionModes.has("existing-session"));
  assert.equal(a.getPermissionMode("existing-session", "workspace-write"), "acceptEdits");
  a.permissionModeInfo("brand-new-session");
  a.getPermissionMode("brand-new-session", "workspace-write");
  assert.equal(existsSync(file), true);
  assert.equal(readFileSync(file, "utf8"), before, "reads never rewrite the saved store");
  assert.equal(a.permissionModes.has("brand-new-session"), false, "no default is persisted");
}

// 5. The access-profile mapping is pinned for an explicit 'dsh' config: Read Only → Plan, Workspace
//    Write → Accept edits, Full access → Bypass. This is what a session keeps on either side.
{
  const dsh = Config({ permissionMode: "dsh" });
  assert.equal(permissionModeFor(dsh, "read-only"), "plan");
  assert.equal(permissionModeFor(dsh, "workspace-write"), "acceptEdits");
  assert.equal(permissionModeFor(dsh, "danger-full-access"), "bypassPermissions");
  assert.equal(permissionModeFor(dsh, undefined), "acceptEdits");
  assert.equal(permissionCeiling(dsh, "danger-full-access"), "bypassPermissions");

  const a = newAdapter(dsh);
  a.accessModes.set("dsh-full", "danger-full-access");
  assert.equal(a.permissionModeInfo("dsh-full").mode, "bypassPermissions");
  assert.equal(a.permissionModeInfo("dsh-full").defaultMode, "bypassPermissions");
  a.accessModes.set("dsh-work", "workspace-write");
  assert.equal(a.permissionModeInfo("dsh-work").mode, "acceptEdits");
  assert.equal(a.permissionModeInfo("dsh-work").defaultMode, "acceptEdits");
}
