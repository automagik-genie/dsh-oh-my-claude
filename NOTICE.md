# Omni-maintained fork

This repository, `automagik-genie/dsh-oh-my-claude`, is the fork of
[lcestou/dsh-oh-my-claude](https://github.com/lcestou/dsh-oh-my-claude) that
[Omni](https://github.com/automagik-dev/omni) ships in its desktop app and lists in its plugin market.
All credit for the plugin goes to lcestou and its contributors; it stays under the MIT License, with
both copyright lines kept in [LICENSE](LICENSE).

Omni installs it from a reviewed commit of the `omni` branch, never from a moving tag or the npm
registry, so a release reaches Omni users only after it has been read. Changes on top of upstream:

- No `prepare` script. A git install runs no build and no lifecycle script; `lib/` is committed and
  is rebuilt with `bun run build` before each commit that changes `src/`.
- Claude Code's slash commands (the bridged ones and `/btw`, `/temporary`, `/ultracode`) answer only
  in sessions that run on Claude Code. In a session on another provider they refuse in plain words
  instead of sending the line to a model that cannot run it.
- No npm update pill in Settings: it would point at the upstream package.

Upstream fixes are merged in from `upstream/main` and reviewed like any other change. Fixes that are
not Omni-specific go back upstream as pull requests.
