import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * A bridged Claude Code command typed in a session that runs on another model. Claude Code would
 * expand a skill or a custom command from its own files; that model never sees them, so the bridge
 * reads the same file and hands its text to the model beside the line. dsh expands a skill it has
 * itself (its `/name` gesture), so this is only for what Claude Code alone has.
 */

/** Where Claude Code looks for `/command`: the project's skills and commands, then the user's. */
export function claudeCommandFiles(
  command: string,
  cwd: string | undefined,
  claudeHome: string,
): string[] {
  // A plugin's `plugin:skill` has no file of its own here.
  if (!/^[a-z0-9][a-z0-9_-]*$/i.test(command)) return [];
  const roots = [...(cwd ? [join(cwd, ".claude")] : []), claudeHome];
  return roots.flatMap((root) => [
    join(root, "skills", command, "SKILL.md"),
    join(root, "commands", `${command}.md`),
  ]);
}

/** The first of those files that reads, without its frontmatter, `$ARGUMENTS` filled in. */
export async function claudeCommandText(
  command: string,
  rawInput: string,
  cwd: string | undefined,
  claudeHome: string,
): Promise<{ path: string; body: string } | undefined> {
  for (const path of claudeCommandFiles(command, cwd, claudeHome)) {
    let text: string;
    try {
      text = await readFile(path, "utf8");
    } catch {
      continue;
    }
    const body = text
      .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "")
      .replaceAll("$ARGUMENTS", rawInput.trim())
      .trim();
    if (body !== "") return { path, body };
  }
  return undefined;
}

/** The instructions as dsh hands a skill to a model: its own `<skill_content>` shape. */
export function skillContent(name: string, path: string, body: string): string {
  const base = path.endsWith("SKILL.md") ? path.slice(0, -"/SKILL.md".length) : undefined;
  return [
    `<skill_content name="${name.replace(/[&"<>]/g, "")}">`,
    "<skill_resources>",
    base === undefined
      ? "This is a Claude Code custom command; it has no resources of its own."
      : `Base directory for this skill: ${base}\nResolve relative paths mentioned by this skill against the base directory before using them. Load referenced resources only as needed.`,
    "</skill_resources>",
    "",
    "<skill_instructions>",
    body,
    "</skill_instructions>",
    "</skill_content>",
  ].join("\n");
}
