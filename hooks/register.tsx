import { atom, read, update } from 'claude-code'
import type { EngineInterface, PluginOptions, Register, SessionContextUsage } from 'claude-code'

import type { AutoCompact, Preferences } from '../types'
import { resolveLanguage, wordsFor } from './i18n'
import {
  BAR_CELLS,
  HOUR_MS,
  autoCompactLabel,
  cacheLabel,
  cacheView,
  filledCells,
  percent,
  readingFrom,
  resolveTtl,
  weather,
} from './model'

const preferences = atom({ plugin: 'cache-band', key: 'preferences' } as const, { language: 'en', ttlMs: HOUR_MS })
const cache = atom({ plugin: 'cache-band', key: 'cache' } as const, null)
const context = atom({ plugin: 'cache-band', key: 'context' } as const, null)
const autoCompact = atom({ plugin: 'cache-band', key: 'autoCompact' } as const, null)
const isCompacting = atom({ plugin: 'cache-band', key: 'isCompacting' } as const, false)

const REDRAW_MS = 30_000

function text(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

/** The options (`/config`) over Claude Code's settings and environment: at start and when the settings change. */
async function readPreferences($: EngineInterface, options: PluginOptions): Promise<void> {
  const settings: Record<string, unknown> = await $.settings.read().catch(() => ({}))
  const locale = (await $.env.get('LC_ALL')) ?? (await $.env.get('LANG'))
  const value: Preferences = {
    language: resolveLanguage(text(options.language) ?? 'auto', text(settings.language), locale),
    ttlMs: resolveTtl(
      text(options.cacheTtl) ?? 'auto',
      await $.env.get('CLAUDE_CODE_PROMPT_CACHE_TTL'),
      text(settings.promptCacheTtl),
    ),
  }
  await update($, preferences, () => value)
}

async function storeFill($: EngineInterface, live: SessionContextUsage): Promise<void> {
  const fill = live.percent ?? null
  await update($, context, () => fill)
}

/** Counts the window locally to read the threshold: at start, and when the model or the settings change. */
async function measureAutoCompact($: EngineInterface): Promise<void> {
  try {
    const { context: counted } = await $.session.usage({ breakdown: 'summary' })
    const breakdown = counted.breakdown

    if (breakdown === undefined) {
      return
    }

    const threshold = breakdown.autoCompactThreshold
    const value: AutoCompact = {
      isEnabled: breakdown.isAutoCompactEnabled,
      percent: threshold === undefined ? null : Math.round((threshold / counted.window) * 100),
    }
    await update($, autoCompact, () => value)
  } catch {
    // No breakdown without a bound session; the band leaves the figure out.
  }
}

/** After a compaction nothing is cached and the fill is unknown until the next response. */
async function forgetWindow($: EngineInterface): Promise<void> {
  await update($, cache, () => null)
  await update($, context, () => null)
}

async function runCompact($: EngineInterface, isWorking: boolean): Promise<void> {
  if (await read($, isCompacting)) {
    return
  }

  await update($, isCompacting, () => true)
  const words = wordsFor((await read($, preferences)).language)
  $.ui.toast(words.compacting)

  try {
    const result = await $.session.compact()

    if (result.skip !== undefined) {
      $.ui.toast(words.skipped(result.skip))
    } else {
      // The engine skips this plugin's own session.compact hook for its own call: reset here.
      await forgetWindow($)
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    $.ui.toast(isWorking ? words.busy : words.failed(reason))
  } finally {
    await update($, isCompacting, () => false)
  }
}

export const register: Register = (on, options) => {
  on('session.start', async ($, e, next) => {
    $.clock.every(REDRAW_MS, () => $.ui.invalidate('ui.render'))
    const result = await next(e)
    await readPreferences($, options)

    try {
      await storeFill($, (await $.session.usage()).context)
    } catch {
      // Measured after the first turn instead.
    }
    await measureAutoCompact($)

    return result
  })

  on('classic.PostModelSwitch', async ($, e, next) => {
    const result = await next(e)
    await measureAutoCompact($)

    return result
  })

  on('classic.ConfigChange', async ($, e, next) => {
    const result = await next(e)
    await readPreferences($, options)
    await measureAutoCompact($)

    return result
  })

  on('config.set', { key: 'autoCompact' }, async ($, e, next) => {
    const result = await next(e)
    await measureAutoCompact($)

    return result
  })

  on('session.end', async ($, e, next) => {
    if (e.reason === 'clear') {
      await forgetWindow($)
    }

    return next(e)
  })

  // Pushed after each main-thread turn.
  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('context')) {
      await storeFill($, e.context)
    }

    return next(e)
  })

  // Every model request of the main thread refreshes the cache: restart the countdown there.
  on('turn.step', async function* ($, e, next) {
    const result = yield* next(e)

    if (e.agentId === undefined && result.usage !== null) {
      const reading = readingFrom(result.usage, await $.clock.now())

      if (reading !== null) {
        await update($, cache, () => reading)
      }
    }

    return result
  })

  // A fork reads the main thread's cached prefix (cache-tax's keepwarm pings): a read refreshes it.
  // Bar and hit rate stay those of the last real message.
  on('model.fork', async ($, e, next) => {
    const result = await next(e)

    const reply = 'value' in result ? result.value : undefined

    if (reply !== undefined && 'usage' in reply && reply.usage.cache_read_input_tokens > 0) {
      const at = await $.clock.now()
      await update($, cache, reading => (reading === null ? null : { ...reading, at }))
    }

    return result
  })

  on('session.compact', async ($, e, next) => {
    const result = await next(e)

    if (e.agentId === undefined && e.trigger !== 'precompute' && result.skip === undefined) {
      await forgetWindow($)
    }

    return result
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) {
      return next(e)
    }

    const { Box, Text, Button } = $.ui.resolve(e)
    const { language, ttlMs } = await read($, preferences)
    const words = wordsFor(language)
    const reading = await read($, cache)
    const fill = await read($, context)
    const autoCompactText = autoCompactLabel(await read($, autoCompact), words)
    const isBusy = e.props.isWorking || (await read($, isCompacting))
    const now = await $.clock.now()

    const view = cacheView(reading, now, e.props.isWorking, ttlMs)
    const filled = filledCells(reading?.stored ?? 0, view.state !== 'warm')
    // Other mods share the band (cache-tax adds its keepwarm row there): ours on top, theirs beneath.
    const rest = await next(e)

    const band = (
      <Box flexDirection="row" flexWrap="wrap" alignItems="center" columnGap={1}>
        <Box flexDirection="row">
          <Text color={view.tone}>● </Text>
          <Text dimColor>{words.cache} </Text>
          <Box key="countdown">
            <Text color={view.tone} bold>
              {cacheLabel(view, words)}
            </Text>
          </Box>
        </Box>
        <Box key="bar" flexDirection="row">
          {filled > 0 && <Text color={view.tone}>{'■'.repeat(filled)}</Text>}
          {filled < BAR_CELLS && <Text color="gray">{'□'.repeat(BAR_CELLS - filled)}</Text>}
        </Box>
        <Box flexDirection="row">
          <Box key="hit">
            <Text bold>{reading === null ? '–' : percent(reading.hit)}</Text>
          </Box>
          <Text dimColor> {words.hit} ·</Text>
        </Box>
        <Box flexDirection="row">
          <Box key="weather">
            <Text>{weather(fill)} </Text>
          </Box>
          <Text dimColor>{words.context} </Text>
          <Box key="context">
            <Text bold>{fill === null ? '–' : `${fill}%`}</Text>
          </Box>
          {autoCompactText !== null && (
            <Box key="autoCompact">
              <Text dimColor>{` ${autoCompactText}`}</Text>
            </Box>
          )}
        </Box>
        <Button key="compact" label="Compact" dimColor={isBusy} onPress={() => void runCompact($, e.props.isWorking)} />
      </Box>
    )

    return (
      <Box flexDirection="column">
        {band}
        {rest}
      </Box>
    )
  })
}
