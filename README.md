# cache-band

A [Claude Code](https://code.claude.com) mod that keeps the prompt cache and the context window
in view: one row above the prompt, in the Desktop Code tab and in the terminal.

```
● cache 42m ■■■■■■■■■■■■■■■■■■□□ 93% hit · ☀️ Context 9% (Auto-Compact 97%)  [Compact]
```

Why: when the prompt cache lapses, the next message re-writes the whole context at the
cache-write price. The band shows how long the cache stays warm, how much of the last request
came from it, how full the context is, and puts `/compact` one click away.

## What the row shows

| Part | Meaning | Display |
|---|---|---|
| `● cache 42m` | Time left on the prompt cache, counted from the last model response of the main conversation. While a turn runs it stays at the full lifetime. A keepwarm ping (e.g. from [cache-tax](https://github.com/karanb192/claude-code-mods)) that reads from the cache restarts it too. | Green above half the lifetime, yellow above a sixth, red below (31–60 / 11–30 / 0–10 minutes of an hour). `cold` once expired, `–` before the first response. |
| Bar (20 cells) | How much of the last request sits in the cache: `(cache_read + cache_creation) ÷ input` | Colour of the countdown; grey and hollow when cold |
| `93% hit` | Hit rate of the last request: `cache_read ÷ input` | Kept when cold — it describes the last request |
| ☀️ / ⛅ / 🌧️ | Context weather | ☀️ below 40 %, ⛅ 40–69 %, 🌧️ from 70 % (time to `/compact`) |
| `Context 9%` | Fill of the context window, the status line's figure | `–` before the first response and right after a compaction |
| `(Auto-Compact 97%)` | Where auto-compaction triggers, as a share of the window | `(Auto-Compact off)` when disabled |
| `[Compact]` | Runs `/compact` as if typed; its progress and result show in the transcript | Reads `Compacting…` until done; dimmed while a turn runs, a press then says it has to wait; a failure is named in the transcript |

Every word is translated, `Compact` and `Auto-Compact` included (German: `Komprimieren`,
`Auto-Komprimierung`). Numbers follow the language's locale: `42m` and `93%` in English,
`42 Min.` and `93 %` in German, Arabic-Indic digits (`٤٢ د`, `٩٣٪`) in Arabic. Arabic and Hebrew
mirror the row in the Desktop app: it reads from the right, the bar fills from the right, the
button sits on the left, and each piece is set right-to-left, numbers and parentheses included.

Other mods may draw into the same band; their rows appear beneath this one.

## Install

Needs Claude Code 2.1.287 or later (mods are on by default).

```sh
claude plugin marketplace add CTeitzel/cache-band
claude plugin install cache-band@cache-band
```

Restart Claude Code or run `/reload-plugins`. The band appears once the session has started —
in the Desktop app, after the first message is sent.

To work on a checkout instead, load it for one session with `claude --plugin-dir <folder>`, or
for every session with `CLAUDE_CODE_PLUGIN_DIRS` in the `env` block of `~/.claude/settings.json`
(do not install it from the marketplace as well, or it loads twice).

## Options

Both are rows in `/config`, or set them in `~/.claude/settings.json`:

```json
"pluginConfigs": {
  "cache-band@cache-band": { "options": { "language": "de", "cacheTtl": "auto" } }
}
```

(For a `--plugin-dir` / `CLAUDE_CODE_PLUGIN_DIRS` checkout the key is `cache-band@inline`.)

| Option | Values | Default |
|---|---|---|
| `language` | `auto`, `en`, `de`, `fr`, `es`, `it`, `pt`, `nl`, `pl`, `sv`, `cs`, `el`, `tr`, `ru`, `uk`, `ar`, `he`, `hi`, `th`, `id`, `vi`, `ja`, `ko`, `zh` (simplified), `zh-TW` (traditional) | `auto`: Claude Code's `language` setting, then the system locale (`zh-Hant`, `zh-TW`, `zh-HK`, `zh-MO` → traditional), then English |
| `cacheTtl` | `auto`, `1h`, `5m` | `auto`: `CLAUDE_CODE_PROMPT_CACHE_TTL`, then `promptCacheTtl`, else `1h` |
| `rtlInTerminal` | `true`, `false` | `false`: in the terminal, Arabic and Hebrew show in English, because many terminals draw right-to-left script reversed. Turn it on if yours handles it; the Desktop app always mirrors. |

The cache lifetime is one hour on a Claude subscription and five minutes on an API key, Bedrock,
Vertex or Foundry unless `promptCacheTtl` says otherwise. Nothing the mod can read tells the two
apart, so `auto` assumes one hour: **on an API key without `promptCacheTtl`, set `cacheTtl` to `5m`.**

## Limits

- The countdown is an estimate from the clock, not a server check: a change at the start of
  the prompt can invalidate the cache earlier.
- Only the main conversation counts; subagents and the engine's own forks are left out.
- A change of the per-model auto-compact window through `/autocompact` may only show in the
  next session.

## Development

| File | Content |
|---|---|
| `hooks/register.tsx` | the hooks: readings, countdown restarts, the Compact button, the band |
| `hooks/model.ts` | pure maths: countdown, lifetime, bar, weather, auto-compact label |
| `hooks/i18n.ts` | the 24 languages, their number locales, right-to-left, and how `auto` picks one |
| `types/index.d.ts` | the `$.state` contract |
| `tests/band.test.tsx` | 23 tests against the engine (`claude plugin test`) |
| `.claude/CLAUDE.md` | notes for AI sessions working on the mod: invariants, where each figure comes from |
| `docs/dev-log/` | development log (German) |

```sh
claude plugin validate .
claude plugin test .
```

CI runs both on every push. A strict type-check needs the declarations Claude Code writes into
`.claude-plugin/types/` when it loads the mod; load the checkout once (`--plugin-dir` or
`CLAUDE_CODE_PLUGIN_DIRS`), then `npx -p typescript tsc -p .`.

## License

[MIT](LICENSE) © 2026 Dr. Christian Teitzel
