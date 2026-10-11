/** The last main-thread response's cache figures. */
export type CacheReading = {
  /** When the response came back, ms since the epoch. */
  at: number
  /** cache_read ÷ total input, 0 to 1. */
  hit: number
  /** (cache_read + cache_creation) ÷ total input, 0 to 1. */
  stored: number
}

/** Auto-compaction as the context breakdown reports it. */
export type AutoCompact = {
  isEnabled: boolean
  /** The threshold as a whole percentage of the model's window; null when unknown. */
  percent: number | null
}

/** What the options and settings resolve to: read at start and when the settings change. */
export type Preferences = {
  /** One of the band's languages (`en`, `de`, …). */
  language: string
  /** The prompt cache's lifetime: one hour or five minutes. */
  ttlMs: number
  /** Draw Arabic and Hebrew right-to-left in the terminal too, instead of English there. */
  rtlInTerminal: boolean
}

declare module 'claude-code' {
  interface PluginState {
    'cache-band': {
      preferences: Preferences
      cache: CacheReading | null
      /** The context window's fill in whole percent; null until a response reported one. */
      context: number | null
      autoCompact: AutoCompact | null
      isCompacting: boolean
    }
  }
}
