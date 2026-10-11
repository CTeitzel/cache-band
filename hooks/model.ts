import type { ModelUsage } from 'claude-code'

import type { AutoCompact, CacheReading } from '../types'
import type { LanguagePack } from './i18n'

export const HOUR_MS = 60 * 60 * 1000
export const FIVE_MINUTES_MS = 5 * 60 * 1000
export const BAR_CELLS = 20

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

/** How many of the bar's cells are filled. */
export function filledCells(stored: number, isEmpty: boolean): number {
  if (isEmpty) {
    return 0
  }

  return Math.round(Math.min(1, Math.max(0, stored)) * BAR_CELLS)
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

  if (!autoCompact.isEnabled) {
    return `(Auto-Compact ${pack.words.off})`
  }

  return autoCompact.percent === null
    ? `(Auto-Compact ${pack.words.on})`
    : `(Auto-Compact ${pack.percent(autoCompact.percent / 100)})`
}
