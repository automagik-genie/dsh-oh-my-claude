/**
 * Claude Code's slash commands are host-wide in dsh: the registry has no per-session visibility
 * short of mounting a plugin under each agent's own context. So every command this plugin owns
 * asks first whether the session it was typed in runs on Claude Code. A session on another
 * provider gets a plain refusal instead of a line sent to a model that cannot run it. A session
 * whose provider cannot be read (dsh's default model, an older dsh) keeps the command.
 */
export function claudeOnlyRefusal(provider, command) {
    if (provider === undefined || provider.startsWith("claude-code"))
        return undefined;
    return {
        kind: "error",
        text: `/${command} works in Claude Code sessions. This session runs on ${provider}; pick a Claude model to use it.`,
    };
}
//# sourceMappingURL=claude-only.js.map