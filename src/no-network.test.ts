// Offline self-check: bun src/no-network.test.ts. The Omni fork's no-telemetry rule ("don't send
// anything to anyone"): nothing the plugin itself reads off the machine runs unless the person
// turned it on, and the privacy switches set for dsh reach every Claude child, near or far.
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { holdStartScript } from "./hold.js";
import { childEnv, forwardedEnv, seamSpawner, sshInvocation } from "./process.js";
import { claudeUpdatesOff, pluginStars } from "./sessions.js";

// The Claude Code update check (downloads.claude.ai every 30 minutes) is off until turned on; the
// upstream `claudeUpdateOff` flag no longer decides it.
assert.equal(claudeUpdatesOff({}), true, "off by default");
assert.equal(claudeUpdatesOff({ claudeUpdateOff: true }), true);
assert.equal(claudeUpdatesOff({ claudeUpdateOn: true }), false, "on once the person turns it on");

// The star count is a GitHub read nobody asked for: an empty hints store asks nothing.
{
  const dir = await mkdtemp(join(tmpdir(), "omc-no-network-"));
  const hints = join(dir, "hints.json");
  let asked = 0;
  const read = async () => (asked++, 42);
  assert.equal(await pluginStars(hints, read), undefined);
  await writeFile(hints, JSON.stringify({ starOff: true }));
  assert.equal(await pluginStars(hints, read), undefined);
  assert.equal(asked, 0, "no GitHub read without starOn");
  await writeFile(hints, JSON.stringify({ starOn: true }));
  assert.equal(await pluginStars(hints, read), 42);
}

// The privacy switches the Automagik app sets for everything dsh spawns.
const PRIVATE = {
  DISABLE_TELEMETRY: "1",
  DISABLE_ERROR_REPORTING: "1",
  CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
  DO_NOT_TRACK: "",
  HOME: "/home/u",
};
assert.deepEqual(forwardedEnv(PRIVATE), [
  ["DISABLE_TELEMETRY", "1"],
  ["DISABLE_ERROR_REPORTING", "1"],
  ["CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC", "1"],
]);

// A local child inherits them unchanged.
{
  const env = childEnv(PRIVATE);
  for (const key of [
    "DISABLE_TELEMETRY",
    "DISABLE_ERROR_REPORTING",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC",
  ])
    assert.equal(env[key], "1", `${key} reaches a local claude`);
}

// A child on another machine starts from that machine's shell, so each path carries them.
{
  const script =
    sshInvocation("nova", "claude", ["-p"], "/w", undefined, PRIVATE).args.at(-1) ?? "";
  assert.match(
    script,
    /exec env DISABLE_TELEMETRY='1' DISABLE_ERROR_REPORTING='1' CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC='1' MCP_TOOL_TIMEOUT=/,
    "an ssh box's claude gets them",
  );
  assert.doesNotMatch(script, /DO_NOT_TRACK|HOME=/, "only what is set, and only the switches");

  const held = holdStartScript("abc-1", "/w", "claude", ["-p"], undefined, PRIVATE);
  assert.match(
    held,
    /env DISABLE_TELEMETRY='\\''1'\\'' DISABLE_ERROR_REPORTING=/,
    "a held process gets them",
  );

  let env: Record<string, string> | undefined;
  // SAFETY: the fake carries the one method the spawner calls
  const spawn = seamSpawner(
    { spawn: (spec: any) => ((env = spec.env), {} as any) } as any,
    PRIVATE,
  );
  spawn("claude", ["-p"], "/w");
  assert.equal(
    env?.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC,
    "1",
    "a remote workspace's claude gets them",
  );
  assert.equal(env?.HOME, undefined, "still no dsh env leak");
}
console.log("no-network ok");
