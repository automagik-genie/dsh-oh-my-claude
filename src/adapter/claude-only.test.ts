import { strict as assert } from "node:assert";
import { claudeOnlyRefusal } from "./claude-only.js";

// A Claude Code session keeps the command, a box's instance included.
assert.equal(claudeOnlyRefusal("claude-code", "btw"), undefined);
assert.equal(claudeOnlyRefusal("claude-code-devbox", "review"), undefined);

// A session whose provider cannot be read keeps it too: dsh's default model, or an older dsh.
assert.equal(claudeOnlyRefusal(undefined, "ultracode"), undefined);

// A session on another provider is refused, and the reply names that provider.
const refusal = claudeOnlyRefusal("deepseek-official", "temporary");
assert.equal(refusal?.kind, "error");
assert.match(refusal?.text ?? "", /\/temporary works in Claude Code sessions/);
assert.match(refusal?.text ?? "", /deepseek-official/);
