/**
 * A bridged Claude Code command typed in a session that runs on another model. Claude Code would
 * expand a skill or a custom command from its own files; that model never sees them, so the bridge
 * reads the same file and hands its text to the model beside the line. dsh expands a skill it has
 * itself (its `/name` gesture), so this is only for what Claude Code alone has.
 */
/** Where Claude Code looks for `/command`: the project's skills and commands, then the user's. */
export declare function claudeCommandFiles(command: string, cwd: string | undefined, claudeHome: string): string[];
/** The first of those files that reads, without its frontmatter, `$ARGUMENTS` filled in. */
export declare function claudeCommandText(command: string, rawInput: string, cwd: string | undefined, claudeHome: string): Promise<{
    path: string;
    body: string;
} | undefined>;
/** The instructions as dsh hands a skill to a model: its own `<skill_content>` shape. */
export declare function skillContent(name: string, path: string, body: string): string;
