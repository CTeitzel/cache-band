import type { ModelUsage } from 'claude-code'

import type { AutoCompact, CacheReading } from '../types'
import type { LanguagePack } from './i18n'

export const HOUR_MS = 60 * 60 * 1000
export const FIVE_MINUTES_MS = 5 * 60 * 1000
export const BAR_CELLS = 20
export const MIN_BAR_CELLS = 6

export type Tone = 'green' | 'yellow' | 'red' | 'gray'

export type CacheView = {
  tone: Tone
  /** `none`: never cached; `cold`: expired; `warm`: `minutes` left. */
  state: 'none' | 'cold' | 'warm'
  minutes: number
}

export function readingFrom(usage: ModelUsage, at: number): CacheReading | null {
  const cached = usage.cache_read_input_tokens + usage.cache_creation_input_tokens
  const total = usage.input_tokens + cached

  if (total <= 0) {
    return null
  }

  return { at, hit: usage.cache_read_input_tokens / total, stored: cached / total }
}

/**
 * The option wins; `auto` follows `CLAUDE_CODE_PROMPT_CACHE_TTL`, then `promptCacheTtl`, then one
 * hour (a Claude subscription's default; an API key's is five minutes, which only a setting says).
 */
export function resolveTtl(option: string, env: string | undefined, setting: string | undefined): number {
  for (const value of [option, env, setting]) {
    if (value === '5m') {
      return FIVE_MINUTES_MS
    }

    if (value === '1h') {
      return HOUR_MS
    }
  }

  return HOUR_MS
}

/** Green above half the lifetime, yellow above a sixth, red below: 31–60 / 11–30 / 0–10 of an hour. */
export function cacheView(reading: CacheReading | null, now: number, isWorking: boolean, ttlMs: number): CacheView {
  if (reading === null) {
    return { tone: 'gray', state: 'none', minutes: 0 }
  }

  const remaining = isWorking ? ttlMs : ttlMs - (now - reading.at)

  if (remaining <= 0) {
    return { tone: 'red', state: 'cold', minutes: 0 }
  }

  const minutes = Math.min(ttlMs / 60_000, Math.ceil(remaining / 60_000))
  const tone = remaining > ttlMs / 2 ? 'green' : remaining > ttlMs / 6 ? 'yellow' : 'red'

  return { tone, state: 'warm', minutes }
}

export function cacheLabel(view: CacheView, pack: LanguagePack): string {
  if (view.state === 'none') {
    return '–'
  }

  return view.state === 'cold' ? pack.words.cold : pack.minutes(view.minutes)
}

/** How many of the bar's `cells` are filled. */
export function filledCells(stored: number, isEmpty: boolean, cells: number = BAR_CELLS): number {
  if (isEmpty) {
    return 0
  }

  return Math.round(Math.min(1, Math.max(0, stored)) * cells)
}

/**
 * What one piece of the row takes, in the band's cells. The terminal is exact; the Desktop app sets
 * a proportional font in a monospace cell metric, so its figures are estimates, on the generous
 * side: a short bar beats a row that wraps. Checked 2026-10-11 at bodyColumns 94 (German row):
 * everything but the bar estimated at 80.3 cells, measured about 80; a square measured 1.44 cells.
 */
export type Widths = { char: number; square: number; emoji: number; buttonChrome: number; gap: number }

export const TERMINAL_WIDTHS: Widths = { char: 1, square: 1, emoji: 2, buttonChrome: 4, gap: 1 }
export const DESKTOP_WIDTHS: Widths = { char: 0.9, square: 1.4, emoji: 2, buttonChrome: 1.5, gap: 1 }

const ZERO_WIDTH = /[\p{M}\p{Cf}]/u
const WIDE =
  /[ᄀ-ᅟ⺀-〾ぁ-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦\u{20000}-\u{3FFFD}]/u

/** Cells a text takes in a terminal: East Asian wide characters two, marks and format characters none. */
export function textCells(text: string): number {
  let cells = 0

  for (const char of text) {
    cells += ZERO_WIDTH.test(char) ? 0 : WIDE.test(char) ? 2 : 1
  }

  return cells
}

/**
 * How many squares the bar gets so the row fits `available` cells: what the other pieces, the
 * weather emoji, the button's frame and the `gaps` leave, between MIN_BAR_CELLS and BAR_CELLS.
 */
export function barCells(available: number, texts: readonly string[], gaps: number, widths: Widths): number {
  const textWidth = texts.reduce((sum, text) => sum + textCells(text) * widths.char, 0)
  const fixed = textWidth + widths.emoji + widths.buttonChrome + gaps * widths.gap + 1
  const room = Math.floor((available - fixed) / widths.square)

  return Math.max(MIN_BAR_CELLS, Math.min(BAR_CELLS, room))
}

/** null (no reading yet) counts as an empty window. */
export function weather(contextPercent: number | null): string {
  const filled = contextPercent ?? 0

  if (filled >= 70) {
    return '🌧️'
  }

  return filled >= 40 ? '⛅' : '☀️'
}

export function autoCompactLabel(autoCompact: AutoCompact | null, pack: LanguagePack): string | null {
  if (autoCompact === null) {
    return null
  }

  const name = pack.words.autoCompact

  if (!autoCompact.isEnabled) {
    return `(${name} ${pack.words.off})`
  }

  return autoCompact.percent === null ? `(${name} ${pack.words.on})` : `(${name} ${pack.percent(autoCompact.percent / 100)})`
}
