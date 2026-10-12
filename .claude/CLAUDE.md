# CLAUDE.md

Context for AI assistant sessions working on this mod. Read this first; `README.md` describes
what the band shows and how others install it, `docs/dev-log/` why it is built this way.
(This file lives in `.claude/` because `claude plugin validate` warns about a `CLAUDE.md` at the
plugin root, and CI fails on warnings.)

## What this is

A Claude Code mod (plugin of function hooks, Claude Code 2.1.289) that draws one row in the
`AbovePrompt` band: cache countdown, cache fill bar, hit rate, context weather and fill,
auto-compact threshold and a Compact button, in 24 languages. Public repo:
https://github.com/CTeitzel/claude-code-cache-band (MIT); the repo root is both the plugin and a
one-plugin marketplace (`.claude-plugin/marketplace.json`, `source: "./"`).

Two names on purpose: the **repo** is `claude-code-cache-band` so people find it on GitHub
(renamed from `cache-band` on 2026-10-12; GitHub redirects the old URL, git included). The
**plugin** stays `cache-band`, and so do its marketplace, the state atoms, the
`pluginConfigs` id, `/cache-band-language` and `CACHE_BAND_DEBUG`: installs and settings depend
on them, and inside Claude Code "claude" would say nothing. The repo's description matches the
one in `plugin.json`; its topics (`claude-code`, `claude-code-plugin`, `claude-code-mod`,
`prompt-caching`, …) are what GitHub search ranks on, so keep them.

The author's own machine loads this working copy (`~/.claude/mods/cache-band`) through
`CLAUDE_CODE_PLUGIN_DIRS` in the `env` block of `~/.claude/settings.json`, plugin id
`cache-band@inline`, options under `pluginConfigs["cache-band@inline"]` (`language: "de"`).
Do not also install it from the marketplace there: it would load twice.

## Layout

- `hooks/register.tsx` — all hooks. Pure logic lives in `hooks/model.ts` (countdown, lifetime,
  bar, weather, labels) and `hooks/i18n.ts` (the 24 languages, `auto` resolution); keep it
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
| language, cache lifetime, `rtlInTerminal` | `state.preferences`, from the options over `$.settings.read()` (`language`, `promptCacheTtl`) and `$.env.get` (`CLAUDE_CODE_PROMPT_CACHE_TTL`, `LC_ALL`, `LANG`), at `session.start` and `classic.ConfigChange`; an option change reloads the module |
| reset to `–` | `session.compact` (not `precompute`), `/clear` (`session.end` reason `clear`), and `runCompact`, which re-reads `$.session.usage()` after the command: no `percent` means compacted |

Colour thresholds are shares of the lifetime (green > ½, yellow > ⅙, red below), which is
31–60 / 11–30 / 0–10 minutes for one hour — the author's original specification.

## Invariants — do not "simplify" these away

- **Functions that take `$` are top-level declarations.** The engine reads the module's source and
  refuses to load it when `$` is passed to a nested function (a closure inside `register`).
- **The bar fits the row to `bodyColumns`** (`barCells` in `model.ts`): the other pieces' widths,
  the weather emoji, the button's frame and the gaps are subtracted, the bar gets what is left,
  6 to 20 squares. Terminal widths are exact (`textCells`: wide East Asian characters 2, marks and
  format characters 0). Desktop widths (`DESKTOP_WIDTHS`) are estimates — a proportional font in a
  monospace cell metric — calibrated from screenshots; recalibrate with `CACHE_BAND_DEBUG=1`, which
  logs `language`, `surface`, `bodyColumns` and the bar it chose, and registers
  `/cache-band-language <code>` to switch the band's language for the session (debug only, not in
  normal sessions). When adding a piece to the row, add it to the `texts` list and the gap count
  beside `barCells`.
- **Only non-spacing marks are zero-width** (`ZERO_WIDTH`: Mn, Me, Cf). Spacing marks (Mc, e.g.
  Devanagari vowel signs) take a cell; counting them as zero made Hindi rows too long.
- **Escapes, not raw characters.** Editing tools here have turned `\uXXXX` escapes in TypeScript
  into the raw characters (invisible bidi isolates, CJK ranges), and shell heredocs swallow
  backslashes. After an edit near such escapes, check the file (a Python `chr()` pass fixes it).

- **Share the band.** The `AbovePrompt` hook calls `next(e)` and draws `[ours, rest]` in a
  column. cache-tax adds its keepwarm row through `next(e)`; returning only our tree hides it
  (test "another mod's row stays in the band" fails).
- **The button runs `/compact` through `$.command.run`, not `$.session.compact()`.** Pressed in
  the Desktop app, `$.session.compact()` left no compaction behind (2026-10-11; the cause was not
  pinned down, the test kit cannot tell — it compacts there). `$.command.run` is the typed-command
  path: queued for the engine, its lines in the transcript.
- **`runCompact` decides the reset from the usage, not from hooks.** The engine skips a plugin's
  own hooks for calls it caused (recursion skip: our `session.compact` hook did not run for our own
  `$.session.compact()`), so after the command it re-reads `$.session.usage()`: a compaction leaves
  no `percent` until the next response, a vetoed one keeps it.
- **`Text` takes no `key`.** Only `Box` and `Button` do; tests find values through keyed Boxes
  (`countdown`, `bar`, `hit`, `weather`, `context`, `autoCompact`).
- **Op events answer `{ value }`.** `model.fork`, `session.usage`, `settings.read`, `ui.toast`, `ui.log`
  hooks see and return `{ value } | { deny }`, not the bare value — in the module and in stubs.
- **No `disabled` on `Button`.** "Greyed out" is `dimColor`; the press still runs: during a turn
  (`isWorking` from the drawing) `runCompact` only toasts that it has to wait; a failure is a toast
  and a `$.ui.log` line in the transcript. While it runs the label reads `Compacting…` (not
  covered by a test: the kit does not redraw mid-press).
- **Every word is translated, `Compact` and `Auto-Compact` too** (`words.compact`,
  `words.autoCompact`) — the author's decision on 2026-10-11, overturning an earlier rule that kept
  them English as the command's name.
- **Minute units: the locale's narrow form, except `MINUTE_DISPLAY`** (`ja` short `54 分`, `el` long
  `54 λεπτά`): their narrow forms (`54m`, `54 λ`) read oddly, checked on screenshots 2026-10-11.
- **Numbers go through the language pack** (`packFor` / `packForSurface` in `i18n.ts`): minutes
  as the locale's narrow unit (`42m`, `42 Min.`, `٤٢ د`), percentages with the locale's sign and
  digits. Locales as in the dashboard (`ar-EG` → Arabic-Indic digits). Never format `${n}m` or
  `${n}%` by hand.
- **Right-to-left is `flexDirection: 'row-reverse'`** on the row (`key="row"`), on each group and
  on the bar — the API has no `dir`. Spacing is `columnGap`, never a trailing or leading space in
  a `Text`: a space inside the text lands on the wrong side once a group is reversed.
- **Arabic and Hebrew fall back to English in the terminal** unless `rtlInTerminal` is on
  (`packForSurface`); toasts and log lines after a press follow the surface the press came from.
- **Right-to-left pieces are isolated on web surfaces** (`bidiFor`: RLI U+2067 … PDI U+2069).
  The surface lays each `Text` out left-to-right; without the isolate `(ضغط تلقائي ٩٧٪)` reads
  from the closing parenthesis and `60 דק׳` puts the number last (seen in the Desktop app,
  2026-10-11). Never in the terminal (it may draw them). In source write the escapes
  `\u2067` / `\u2069`, never the raw invisible characters.
- **The language list follows the author's Grok Depot dashboard** (its 22 languages, incl. `zh-TW`
  and its Chinese rule Hant/TW/HK/MO → `zh-TW`) plus `sv` and `cs`: 24. A new language goes into
  `LANGUAGES`, `STRINGS`, `NAMES` and the `language` option list in `plugin.json`.

## Checks

The CLI is not on PATH locally: `%APPDATA%\Claude\claude-code\<version>\<hash>\claude.exe`.

- `claude plugin validate .` and `claude plugin validate .claude-plugin/marketplace.json` —
  CI fails on any warning (`⚠`), not only on errors.
- `claude plugin test .` — `tests/*.test.tsx` against the engine (27 tests).
- Type-check (local only — CI has no declarations, they are Anthropic's and not committed):
  `tsc` is not installed; VS Code ships TypeScript at
  `%LOCALAPPDATA%\Programs\Microsoft VS Code\resources\app\extensions\node_modules\typescript\lib\typescript.js`.
  Build a program over `.claude-plugin/types/claude-code/index.d.ts`, `hooks/*`,
  `types/index.d.ts`, `tests/*` with `.claude-plugin/types/tsconfig.json`'s options.

CI (`.github/workflows/ci.yml`) installs `@anthropic-ai/claude-code@2.1.289` from npm and runs
validate and test on every push, with `actions/checkout@v7` and `actions/setup-node@v7`
(Node 24; v4 warned about the deprecated Node 20). The runner stays `ubuntu-latest` — the
author's decision (2026-10-11): do not pin it; GitHub moves the alias to Ubuntu 26.04 between
2026-10-19 and 2026-11-19, and the job barely depends on the OS.

Test stubs every engine test needs beneath the plugin (`answerEngine`): `mock.clock`,
`mock.env`, `settings.read`, an `AbovePrompt` `ui.render` answer (because our hook calls
`next`), `turn.step`, `session.start/end/measure`; `answerUsage` where the context figures
matter (its `percent` getter returning `undefined` stands for "just compacted"); a
`command.run` hook on `{ command: 'compact' }` stands for the engine's `/compact`. Options for the plugin under test: `test(name, { options: { language: 'de' } }, body)`. The
kit checks the tree (`flexDirection`, texts), not the paint: right-to-left needs a look in the
Desktop app.

## Deploying a change

Edit here, run validate + test + type-check, commit and push; check the CI run. Desktop
sessions do not watch this folder (no `CLAUDE_CODE_PLUGIN_DIR_WATCH`): the change shows in the
next new session, after its first message. Bump `version` in `plugin.json` for a release
others should receive. Add a dated entry to `docs/dev-log/`.

## Releasing

Releases are GitHub releases with a `vX.Y.Z` tag: `v0.3.0` first, `v0.6.2` latest (both 2026-10-11).

Everything the release needs is committed **before** the tag, so the tag lands on the newest
commit and `main` does not run ahead of it with documentation (as it did after `v0.6.2`, whose
dev-log entry came after the tag). A published tag is never moved.

1. Bump `version` in `.claude-plugin/plugin.json` (semver: new options or languages → minor,
   fixes → patch). Marketplace installs follow `main`, and the version string is what makes
   `claude plugin update` hand them the new code — without a bump they keep the old one.
2. Update README, this file and `docs/dev-log/` for what changed — **including the release
   itself**: a dev-log section for `vX.Y.Z` with its URL
   (`https://github.com/CTeitzel/claude-code-cache-band/releases/tag/vX.Y.Z`, known before it
   exists), what the notes say, and "latest release" in this file. Write the release notes now
   too. If the plugin's description changed, set the repo's to match
   (`gh repo edit --description`): it said "20 languages" long after there were 24.
3. Run the final check before tagging (all committed and pushed, CI green without warnings, md
   files current) and record it in the same dev-log section.
4. Commit, push, and wait for a green CI run on that commit (no warnings). This is the release
   commit; nothing is committed between it and the tag.
5. Create the release on exactly that commit, English notes (what the band shows, what is new,
   install, checks), marked latest:
   `gh release create vX.Y.Z --target <sha> --title "cache-band X.Y.Z" --notes-file <notes.md> --latest`
6. Check it without committing: `gh release view vX.Y.Z` (not a draft, not a prerelease),
   `gh api repos/CTeitzel/claude-code-cache-band/releases/latest`, and
   `git rev-list --count vX.Y.Z..main` is `0`. If something has to be fixed afterwards, it goes
   into the next release — the tag stays. Only the notes may be corrected later
   (`gh release edit vX.Y.Z --notes-file <notes.md>`), as v0.6.2's were after the repo rename.

## Neighbours

cache-tax (`cache-tax@claude-code-mods`, third party) is installed alongside: keepwarm pings
via `$.model.fork`, its row in the same band or as status text, shown only while a keepwarm
window is armed (`/keepwarm`, `/keepwarm always`, or automatically after a cold write).
