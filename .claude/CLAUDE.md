# CLAUDE.md

Context for AI assistant sessions working on this mod. Read this first; `README.md` describes
what the band shows and how others install it, `docs/dev-log/` why it is built this way.
(This file lives in `.claude/` because `claude plugin validate` warns about a `CLAUDE.md` at the
plugin root, and CI fails on warnings.)

## What this is

A Claude Code mod (plugin of function hooks, Claude Code 2.1.289) that draws one row in the
`AbovePrompt` band: cache countdown, cache fill bar, hit rate, context weather and fill,
auto-compact threshold and a Compact button, in 20 languages. Public repo:
https://github.com/CTeitzel/cache-band (MIT); the repo root is both the plugin and a
one-plugin marketplace (`.claude-plugin/marketplace.json`, `source: "./"`).

The author's own machine loads this working copy (`~/.claude/mods/cache-band`) through
`CLAUDE_CODE_PLUGIN_DIRS` in the `env` block of `~/.claude/settings.json`, plugin id
`cache-band@inline`, options under `pluginConfigs["cache-band@inline"]` (`language: "de"`).
Do not also install it from the marketplace there: it would load twice.

## Layout

- `hooks/register.tsx` — all hooks. Pure logic lives in `hooks/model.ts` (countdown, lifetime,
  bar, weather, labels) and `hooks/i18n.ts` (the 20 languages, `auto` resolution); keep it
  there so the unit tests need no engine.
- `types/index.d.ts` — the `$.state` contract (`PluginState['cache-band']`). Every key the
  module reads or writes must be declared here; `claude plugin validate` checks it.
- `.claude-plugin/plugin.json` — manifest, including the two `userConfig` options. The
  `language` option list must match `LANGUAGES` in `i18n.ts`.
- `.claude-plugin/types/` — written by the engine at every load; gitignored, never edit.

## Where each figure comes from

| Figure | Source |
|---|---|
| countdown restart | `turn.step` result `usage` on the main loop (`e.agentId === undefined`); also `model.fork` results with `cache_read_input_tokens > 0` (cache-tax keepwarm pings) |
| hit rate, bar | the same `turn.step` usage (`readingFrom` in `model.ts`) |
| context % | `session.measure` (pushed after each main turn) and `$.session.usage()` at `session.start` |
| auto-compact % | `$.session.usage({ breakdown: 'summary' })` at `session.start`, `classic.PostModelSwitch`, `classic.ConfigChange`, `config.set {key: 'autoCompact'}` — not per turn (it counts the whole window locally) |
| language, cache lifetime | `state.preferences`, from the options over `$.settings.read()` (`language`, `promptCacheTtl`) and `$.env.get` (`CLAUDE_CODE_PROMPT_CACHE_TTL`, `LC_ALL`, `LANG`), at `session.start` and `classic.ConfigChange`; an option change reloads the module |
| reset to `–` | `session.compact` (not `precompute`), `/clear` (`session.end` reason `clear`), and `runCompact` itself |

Colour thresholds are shares of the lifetime (green > ½, yellow > ⅙, red below), which is
31–60 / 11–30 / 0–10 minutes for one hour — the author's original specification.

## Invariants — do not "simplify" these away

- **Share the band.** The `AbovePrompt` hook calls `next(e)` and draws `[ours, rest]` in a
  column. cache-tax adds its keepwarm row through `next(e)`; returning only our tree hides it
  (test "another mod's row stays in the band" fails).
- **`runCompact` resets the band itself.** The engine skips a plugin's own `session.compact`
  hook for that plugin's own `$.session.compact()` call (recursion skip). Removing the reset
  there fails the compaction test.
- **`Text` takes no `key`.** Only `Box` and `Button` do; tests find values through keyed Boxes
  (`countdown`, `bar`, `hit`, `weather`, `context`, `autoCompact`).
- **Op events answer `{ value }`.** `model.fork`, `session.usage`, `settings.read`, `ui.toast`
  hooks see and return `{ value } | { deny }`, not the bare value — in the module and in stubs.
- **No `disabled` on `Button`.** "Greyed out" is `dimColor`; the press still runs and
  `runCompact` explains why it failed (`isWorking` from the drawing picks the message).
- **`Compact` / `Auto-Compact` are not translated** — they name the `/compact` command.

## Checks

The CLI is not on PATH locally: `%APPDATA%\Claude\claude-code\<version>\<hash>\claude.exe`.

- `claude plugin validate .` and `claude plugin validate .claude-plugin/marketplace.json` —
  CI fails on any warning (`⚠`), not only on errors.
- `claude plugin test .` — `tests/*.test.tsx` against the engine (15 tests).
- Type-check (local only — CI has no declarations, they are Anthropic's and not committed):
  `tsc` is not installed; VS Code ships TypeScript at
  `%LOCALAPPDATA%\Programs\Microsoft VS Code\resources\app\extensions\node_modules\typescript\lib\typescript.js`.
  Build a program over `.claude-plugin/types/claude-code/index.d.ts`, `hooks/*`,
  `types/index.d.ts`, `tests/*` with `.claude-plugin/types/tsconfig.json`'s options.

CI (`.github/workflows/ci.yml`) installs `@anthropic-ai/claude-code@2.1.289` from npm and runs
validate and test on every push.

Test stubs every engine test needs beneath the plugin (`answerEngine`): `mock.clock`,
`mock.env`, `settings.read`, an `AbovePrompt` `ui.render` answer (because our hook calls
`next`), `turn.step`, `session.start/end/measure`; `answerUsage` where the context figures
matter. Options for the plugin under test: `test(name, { options: { language: 'de' } }, body)`.

## Deploying a change

Edit here, run validate + test + type-check, commit and push; check the CI run. Desktop
sessions do not watch this folder (no `CLAUDE_CODE_PLUGIN_DIR_WATCH`): the change shows in the
next new session, after its first message. Bump `version` in `plugin.json` for a release
others should receive. Add a dated entry to `docs/dev-log/`.

## Neighbours

cache-tax (`cache-tax@claude-code-mods`, third party) is installed alongside: keepwarm pings
via `$.model.fork`, its row in the same band or as status text, shown only while a keepwarm
window is armed (`/keepwarm`, `/keepwarm always`, or automatically after a cold write).
