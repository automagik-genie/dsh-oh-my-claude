/** Whether a session runs on Claude Code, a box's instance included; a provider that cannot be read
 *  (dsh's default model, an older dsh) counts as Claude Code, so the command is kept there. */
export const runsOnClaude = (provider: string | undefined): boolean =>
  provider === undefined || provider.startsWith("claude-code");

/**
 * Claude Code's slash commands are host-wide in dsh: the registry has no per-session visibility
 * short of mounting a plugin under each agent's own context. So the commands only Claude Code can
 * carry out (/btw, /temporary, /ultracode) ask first whether the session they were typed in runs on
 * Claude Code; a session on another provider gets this plain refusal, naming that provider. A
 * bridged skill or custom command is never refused: it goes to that session's own model
 * (handToSessionModel in class.ts).
 */
export function claudeOnlyRefusal(
  provider: string | undefined,
  command: string,
): { kind: "error"; text: string } | undefined {
  if (runsOnClaude(provider)) return undefined;
  return {
    kind: "error",
    text: `/${command} works in Claude Code sessions. This session runs on ${provider}; pick a Claude model to use it.`,
  };
}
