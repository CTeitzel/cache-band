import { atom, read, update } from 'claude-code'
import type { EngineInterface, PluginOptions, Register, SessionContextUsage } from 'claude-code'

import type { AutoCompact, Preferences } from '../types'
import { packForSurface, resolveLanguage } from './i18n'
import {
  BAR_CELLS,
  HOUR_MS,
  autoCompactLabel,
  cacheLabel,
  cacheView,
  filledCells,
  readingFrom,
  resolveTtl,
  weather,
} from './model'

const preferences = atom({ plugin: 'cache-band', key: 'preferences' } as const, {
  language: 'en',
  ttlMs: HOUR_MS,
  rtlInTerminal: false,
})
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
    rtlInTerminal: options.rtlInTerminal === true,
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

/**
 * Runs `/compact` the way the person typing it does (`$.command.run`): queued for the engine, its
 * progress and result in the transcript. `$.session.compact()` from the press left no compaction
 * behind in the Desktop app (2026-10-11).
 */
async function runCompact($: EngineInterface, isWorking: boolean, surface: string): Promise<void> {
  const { language, rtlInTerminal } = await read($, preferences)
  const { words } = packForSurface(language, surface, rtlInTerminal)

  if (isWorking) {
    $.ui.toast(words.busy)

    return
  }

  if (await read($, isCompacting)) {
    return
  }

  await update($, isCompacting, () => true)

  try {
    await $.command.run({ command: 'compact' })
    // A compaction leaves the window without a reading until the next response; a vetoed one keeps
    // its fill. Whose session.compact hook ran is the engine's business: read the result instead.
    const { context: live } = await $.session.usage()
    await storeFill($, live)

    if (live.percent === undefined) {
      await update($, cache, () => null)
    }
  } catch (error) {
    const message = words.failed(error instanceof Error ? error.message : String(error))
    $.ui.toast(message)
    $.ui.log(`cache-band: ${message}`)
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
    const { language, ttlMs, rtlInTerminal } = await read($, preferences)
    const pack = packForSurface(language, e.surface, rtlInTerminal)
    const { words } = pack
    // Right-to-left mirrors the row, each group in it and the bar, which then fills from the right.
    const direction = pack.isRtl ? 'row-reverse' : 'row'
    const reading = await read($, cache)
    const fill = await read($, context)
    const autoCompactText = autoCompactLabel(await read($, autoCompact), pack)
    const compacting = await read($, isCompacting)
    const isBusy = e.props.isWorking || compacting
    const now = await $.clock.now()

    const view = cacheView(reading, now, e.props.isWorking, ttlMs)
    const filled = filledCells(reading?.stored ?? 0, view.state !== 'warm')
    // Other mods share the band (cache-tax adds its keepwarm row there): ours on top, theirs beneath.
    const rest = await next(e)

    const band = (
      <Box key="row" flexDirection={direction} flexWrap="wrap" alignItems="center" columnGap={1}>
        <Box flexDirection={direction} columnGap={1}>
          <Text color={view.tone}>●</Text>
          <Text dimColor>{words.cache}</Text>
          <Box key="countdown">
            <Text color={view.tone} bold>
              {cacheLabel(view, pack)}
            </Text>
          </Box>
        </Box>
        <Box key="bar" flexDirection={direction}>
          {filled > 0 && <Text color={view.tone}>{'■'.repeat(filled)}</Text>}
          {filled < BAR_CELLS && <Text color="gray">{'□'.repeat(BAR_CELLS - filled)}</Text>}
        </Box>
        <Box flexDirection={direction} columnGap={1}>
          <Box key="hit">
            <Text bold>{reading === null ? '–' : pack.percent(reading.hit)}</Text>
          </Box>
          <Text dimColor>{words.hit}</Text>
          <Text dimColor>·</Text>
        </Box>
        <Box flexDirection={direction} columnGap={1}>
          <Box key="weather">
            <Text>{weather(fill)}</Text>
          </Box>
          <Text dimColor>{words.context}</Text>
          <Box key="context">
            <Text bold>{fill === null ? '–' : pack.percent(fill / 100)}</Text>
          </Box>
          {autoCompactText !== null && (
            <Box key="autoCompact">
              <Text dimColor>{autoCompactText}</Text>
            </Box>
          )}
        </Box>
        <Button
          key="compact"
          label={compacting ? words.compacting : 'Compact'}
          dimColor={isBusy}
          onPress={press => void runCompact($, e.props.isWorking, press.surface)}
        />
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
