import type { On } from 'claude-code'
import { describe, expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { LANGUAGES, STRINGS, bidiFor, languageOf, packFor, packForSurface, resolveLanguage, wordsFor } from '../hooks/i18n'
import { FIVE_MINUTES_MS, HOUR_MS, cacheLabel, cacheView, filledCells, resolveTtl, weather } from '../hooks/model'

const START = 1_000_000
const SECOND = 1_000
const MINUTE = 60_000
const MODEL = 'claude-opus-5-5'
const SURFACES = ['terminal', 'desktop'] as const

const BAND = {
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 120,
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
} as const

const USAGE = {
  input_tokens: 10,
  cache_read_input_tokens: 930,
  cache_creation_input_tokens: 60,
  output_tokens: 5,
  model: MODEL,
}

/**
 * What the engine beneath answers: every model request with USAGE, a session that starts and
 * ends, an empty band beneath ours, and the given Claude Code settings and environment.
 */
function answerEngine(on: On, settings: Record<string, unknown> = {}, env: Record<string, string> = {}): void {
  mock.env(on, env)
  on('settings.read', () => ({ value: settings }) as never)
  on('turn.step', async function* (_, e) {
    return {
      turnId: e.turnId,
      index: e.index,
      answer: 'ok',
      toolUses: [],
      stopReason: 'end_turn' as const,
      usage: USAGE,
    }
  })
  on('ui.render', { component: 'AbovePrompt' }, () => ({ type: 'Box' as const, children: [] }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.end', (_, e) => ({ sessionId: e.sessionId }))
  on('session.measure', (_, e) => ({ changed: e.changed }))
}

/**
 * `$.session.usage()` over a 1M window: the fill `percent()` reads (9 % unless given; undefined, as
 * right after a compaction), the breakdown `autoCompact()` reads, each time it is asked.
 */
function answerUsage(
  on: On,
  autoCompact: () => { isAutoCompactEnabled: boolean; autoCompactThreshold?: number },
  percent: () => number | undefined = () => 9,
): void {
  on('session.usage', (_, args) => {
    const breakdown = args.breakdown === undefined ? undefined : autoCompact()
    const fill = percent()
    const context = fill === undefined ? { window: 1_000_000, breakdown } : { tokens: fill * 10_000, window: 1_000_000, percent: fill, breakdown }

    return { value: { startedAt: 0, rateLimits: [], context } } as never
  })
}

async function start($: Engine): Promise<void> {
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
}

/** One main-thread model request, read to its end. */
async function respond($: Engine): Promise<void> {
  const step = $.turn.step({ turnId: 't1', index: 0, model: MODEL, messageCount: 1 })
  for await (const _ of step) {
    // drain
  }
  await step.result
}

async function measured($: Engine): Promise<void> {
  await $.session.measure({
    context: { tokens: 90_000, window: 1_000_000, percent: 9 },
    rateLimits: [],
    changed: ['context'],
  })
}

describe('countdown', () => {
  const reading = { at: START, hit: 0.93, stored: 0.99 }
  const label = (now: number, isWorking: boolean, ttlMs: number) =>
    cacheLabel(cacheView(reading, now, isWorking, ttlMs), packFor('en'))

  test('one hour: green 31–60, yellow 11–30, red 0–10 minutes', () => {
    expect(cacheView(reading, START, false, HOUR_MS)).toEqual({ tone: 'green', state: 'warm', minutes: 60 })
    expect(label(START + 29 * MINUTE, false, HOUR_MS)).toBe('31m')
    expect(cacheView(reading, START + 29 * MINUTE, false, HOUR_MS).tone).toBe('green')
    expect(cacheView(reading, START + 30 * MINUTE, false, HOUR_MS).tone).toBe('yellow')
    expect(cacheView(reading, START + 49 * MINUTE, false, HOUR_MS).tone).toBe('yellow')
    expect(cacheView(reading, START + 50 * MINUTE, false, HOUR_MS)).toEqual({ tone: 'red', state: 'warm', minutes: 10 })
    expect(cacheView(reading, START + 60 * MINUTE, false, HOUR_MS)).toEqual({ tone: 'red', state: 'cold', minutes: 0 })
    expect(label(START + 60 * MINUTE, false, HOUR_MS)).toBe('cold')
    expect(label(START + 90 * MINUTE, true, HOUR_MS)).toBe('60m')
    expect(cacheLabel(cacheView(null, START, false, HOUR_MS), packFor('en'))).toBe('–')
  })

  test('five minutes: the same shares of the lifetime', () => {
    expect(label(START, false, FIVE_MINUTES_MS)).toBe('5m')
    expect(cacheView(reading, START + 2 * MINUTE, false, FIVE_MINUTES_MS).tone).toBe('green')
    expect(cacheView(reading, START + 3 * MINUTE, false, FIVE_MINUTES_MS).tone).toBe('yellow')
    expect(cacheView(reading, START + 4 * MINUTE + 30 * SECOND, false, FIVE_MINUTES_MS)).toEqual({
      tone: 'red',
      state: 'warm',
      minutes: 1,
    })
    expect(label(START + 5 * MINUTE, false, FIVE_MINUTES_MS)).toBe('cold')
    expect(label(START + 9 * MINUTE, true, FIVE_MINUTES_MS)).toBe('5m')
  })

  test('the lifetime: option, then environment, then setting, then one hour', () => {
    expect(resolveTtl('auto', undefined, undefined)).toBe(HOUR_MS)
    expect(resolveTtl('auto', '5m', undefined)).toBe(FIVE_MINUTES_MS)
    expect(resolveTtl('auto', undefined, '5m')).toBe(FIVE_MINUTES_MS)
    expect(resolveTtl('auto', '1h', '5m')).toBe(HOUR_MS)
    expect(resolveTtl('1h', '5m', '5m')).toBe(HOUR_MS)
    expect(resolveTtl('5m', undefined, '1h')).toBe(FIVE_MINUTES_MS)
  })

  test('bar and weather', () => {
    expect(filledCells(0.99, false)).toBe(20)
    expect(filledCells(0.5, false)).toBe(10)
    expect(filledCells(0.99, true)).toBe(0)
    expect(weather(null)).toBe('☀️')
    expect(weather(39)).toBe('☀️')
    expect(weather(40)).toBe('⛅')
    expect(weather(70)).toBe('🌧️')
  })
})

describe('languages', () => {
  test('twenty-four languages, every word in each', () => {
    expect(LANGUAGES.length).toBe(24)

    for (const language of LANGUAGES) {
      const words = STRINGS[language]

      for (const word of [words.cache, words.cold, words.hit, words.context, words.on, words.off, words.compact, words.autoCompact, words.compacting, words.busy]) {
        expect(word.trim().length).toBeGreaterThan(0)
      }
      expect(words.failed('REASON')).toContain('REASON')
    }
  })

  test('the option, then the language setting, then the locale, then English', () => {
    expect(resolveLanguage('de', 'english', 'fr_FR.UTF-8')).toBe('de')
    expect(resolveLanguage('auto', 'German', undefined)).toBe('de')
    expect(resolveLanguage('auto', '日本語', undefined)).toBe('ja')
    expect(resolveLanguage('auto', undefined, 'pt_BR.UTF-8')).toBe('pt')
    expect(resolveLanguage('auto', 'klingon', 'C')).toBe('en')
    expect(languageOf('he_IL.UTF-8')).toBe('he')
    expect(languageOf('iw')).toBe('he')
    expect(languageOf('Greek')).toBe('el')
    expect(languageOf('thai')).toBe('th')
    expect(wordsFor('xx')).toBe(STRINGS.en)
  })

  test('Chinese as the Grok Depot dashboard reads it: Hant, TW, HK, MO are traditional', () => {
    expect(languageOf('zh-TW')).toBe('zh-TW')
    expect(languageOf('zh-Hant-HK')).toBe('zh-TW')
    expect(languageOf('zh_HK.UTF-8')).toBe('zh-TW')
    expect(languageOf('zh-MO')).toBe('zh-TW')
    expect(languageOf('zh-CN')).toBe('zh')
    expect(languageOf('zh-Hans-SG')).toBe('zh')
    expect(languageOf('zh')).toBe('zh')
    expect(resolveLanguage('auto', 'Traditional Chinese', undefined)).toBe('zh-TW')
    expect(resolveLanguage('auto', '中文', undefined)).toBe('zh')
    expect(resolveLanguage('zh-TW', undefined, 'zh_CN.UTF-8')).toBe('zh-TW')
    expect(STRINGS['zh-TW'].cache).toBe('快取')
  })

  test("numbers in each language's locale: minutes, percent, Arabic-Indic digits", () => {
    expect(packFor('en').minutes(60)).toBe('60m')
    expect(packFor('de').minutes(60)).toBe('60 Min.')
    expect(packFor('ar').minutes(60)).toBe('٦٠ د')
    expect(packFor('he').minutes(42)).toBe('42 דק׳')
    expect(packFor('en').percent(0.93)).toBe('93%')
    expect(packFor('de').percent(0.93)).toMatch(/^93\s%$/)
    expect(packFor('ar').percent(0.93)).toMatch(/^٩٣٪/)
    expect(packFor('xx').language).toBe('en')
  })

  test('right-to-left: Arabic and Hebrew; in the terminal only when asked', () => {
    expect(LANGUAGES.filter(language => packFor(language).isRtl)).toEqual(['ar', 'he'])
    expect(packForSurface('ar', 'desktop', false).language).toBe('ar')
    expect(packForSurface('he', 'terminal', false).language).toBe('en')
    expect(packForSurface('ar', 'terminal', true).language).toBe('ar')
    expect(packForSurface('de', 'terminal', false).language).toBe('de')
  })

  test('right-to-left pieces are isolated (RLI … PDI) on web surfaces, never in the terminal', () => {
    expect(bidiFor(packFor('ar'), 'desktop')('x')).toBe('\u2067x\u2069')
    expect(bidiFor(packFor('he'), 'terminal')('x')).toBe('x')
    expect(bidiFor(packFor('en'), 'desktop')('x')).toBe('x')
  })
})

// Stands in for cache-tax: another plugin whose `$.model.fork` is the keepwarm ping.
const PINGER = {
  name: 'pinger',
  register: (on: On) => {
    on('session.end', async ($, e, next) => {
      await $.model.fork({ prompt: 'ping' })

      return next(e)
    })
  },
}

async function ping($: Engine): Promise<void> {
  await $.session.end({ reason: 'other', sessionId: 's', resume: {} as never })
}

test('a keepwarm ping that reads the cache restarts the countdown', { plugins: [PINGER] }, async ($, on) => {
  const clock = mock.clock(on, { now: START })
  let pingRead = 900

  answerEngine(on)
  on('model.fork', () => ({
    value: {
      isAnswered: true as const,
      text: 'warm',
      usage: { input_tokens: 5, cache_read_input_tokens: pingRead, cache_creation_input_tokens: 0, output_tokens: 1 },
    },
  }))

  await respond($)

  await clock.advance(50 * MINUTE)
  await ping($)
  const warm = await $.ui.mount({ plugin: 'cache-band', surface: 'desktop', ...BAND })
  expect((await warm.find({ key: 'countdown' }))?.text).toBe('60m')
  expect((await warm.find({ key: 'hit' }))?.text).toBe('93%')
  await warm.unmount()

  await clock.advance(50 * MINUTE)
  pingRead = 0
  await ping($)
  const missed = await $.ui.mount({ plugin: 'cache-band', surface: 'terminal', ...BAND })
  expect((await missed.find({ key: 'countdown' }))?.text).toBe('10m')
  await missed.unmount()
})

test('band follows a response, its expiry and a compaction', async ($, on) => {
  const clock = mock.clock(on, { now: START })
  let compactions = 0
  let fill: number | undefined = 9

  answerEngine(on)
  answerUsage(on, () => ({ isAutoCompactEnabled: true, autoCompactThreshold: 967_000 }), () => fill)
  // `/compact` as typed: the engine compacts, and the window has no reading until the next response.
  on('command.run', { command: 'compact' }, async () => {
    compactions += 1
    fill = undefined

    return { text: 'Compacted' }
  })
  on('ui.toast', () => ({ value: undefined }))

  for (const surface of SURFACES) {
    const before = await $.ui.mount({ plugin: 'cache-band', surface, ...BAND })
    expect((await before.find({ key: 'countdown' }))?.text).toBe('–')
    await before.unmount()
  }

  await start($)
  await respond($)
  await measured($)

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ plugin: 'cache-band', surface, ...BAND })
    expect((await ui.find({ key: 'countdown' }))?.text).toBe('60m')
    expect((await ui.find({ key: 'hit' }))?.text).toBe('93%')
    expect((await ui.find({ key: 'bar' }))?.text).toBe('■'.repeat(20))
    expect((await ui.find({ key: 'weather' }))?.text).toContain('☀️')
    expect((await ui.find({ key: 'context' }))?.text).toBe('9%')
    expect((await ui.find({ key: 'autoCompact' }))?.text).toBe('(Auto-Compact 97%)')
    expect(await ui.find({ type: 'Text', text: 'Context' })).toBeDefined()
    expect((await ui.find({ key: 'compact' }))?.props.label).toBe('Compact')
    await ui.unmount()
  }

  await clock.advance(35 * MINUTE)
  const later = await $.ui.mount({ plugin: 'cache-band', surface: 'desktop', ...BAND })
  expect((await later.find({ key: 'countdown' }))?.text).toBe('25m')
  expect((await later.find({ type: 'Text', text: '25m' }))?.props.color).toBe('yellow')
  await later.unmount()

  await clock.advance(25 * MINUTE)
  const cold = await $.ui.mount({ plugin: 'cache-band', surface: 'terminal', ...BAND })
  expect((await cold.find({ key: 'countdown' }))?.text).toBe('cold')
  expect((await cold.find({ key: 'bar' }))?.text).toBe('□'.repeat(20))
  expect((await cold.find({ key: 'hit' }))?.text).toBe('93%')

  await cold.press({ key: 'compact' })
  expect(compactions).toBe(1)
  expect((await cold.find({ key: 'compact' }))?.props.label).toBe('Compact')
  expect((await cold.find({ key: 'countdown' }))?.text).toBe('–')
  expect((await cold.find({ key: 'context' }))?.text).toBe('–')
  await cold.unmount()
})

test('Compact during a turn waits: a hint, no command', async ($, on) => {
  mock.clock(on, { now: START })
  const toasts: string[] = []
  let compactions = 0

  answerEngine(on)
  on('ui.toast', (_, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
  on('command.run', { command: 'compact' }, () => {
    compactions += 1

    return { text: 'Compacted' }
  })

  const ui = await $.ui.mount({ plugin: 'cache-band', surface: 'desktop', ...BAND, props: { ...BAND.props, isWorking: true } })
  await ui.press({ key: 'compact' })
  await ui.unmount()

  expect(compactions).toBe(0)
  expect(toasts).toEqual([STRINGS.en.busy])
})

test('the language option draws the band in German', { options: { language: 'de' } }, async ($, on) => {
  const clock = mock.clock(on, { now: START })
  answerEngine(on, { language: 'japanese' })
  answerUsage(on, () => ({ isAutoCompactEnabled: false }))

  await start($)
  await respond($)

  const fresh = await $.ui.mount({ plugin: 'cache-band', surface: 'desktop', ...BAND })
  expect((await fresh.find({ key: 'countdown' }))?.text).toBe('60 Min.')
  expect((await fresh.find({ key: 'compact' }))?.props.label).toBe('Komprimieren')
  expect((await fresh.find({ key: 'row' }))?.props.flexDirection).toBe('row')
  await fresh.unmount()

  await clock.advance(60 * MINUTE)

  const ui = await $.ui.mount({ plugin: 'cache-band', surface: 'desktop', ...BAND })
  expect((await ui.find({ key: 'countdown' }))?.text).toBe('kalt')
  expect(await ui.find({ type: 'Text', text: 'Kontext' })).toBeDefined()
  expect((await ui.find({ key: 'autoCompact' }))?.text).toBe('(Auto-Komprimierung aus)')
  await ui.unmount()
})

test("auto follows Claude Code's language setting", async ($, on) => {
  mock.clock(on, { now: START })
  answerEngine(on, { language: 'japanese' })

  await start($)

  const ui = await $.ui.mount({ plugin: 'cache-band', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: /コンテキスト/ })).toBeDefined()
  await ui.unmount()
})

test('a five-minute cache from the settings counts down from 5m', async ($, on) => {
  const clock = mock.clock(on, { now: START })
  answerEngine(on, { promptCacheTtl: '5m' })

  await start($)
  await respond($)

  const fresh = await $.ui.mount({ plugin: 'cache-band', surface: 'desktop', ...BAND })
  expect((await fresh.find({ key: 'countdown' }))?.text).toBe('5m')
  await fresh.unmount()

  await clock.advance(3 * MINUTE)
  const later = await $.ui.mount({ plugin: 'cache-band', surface: 'desktop', ...BAND })
  expect((await later.find({ key: 'countdown' }))?.text).toBe('2m')
  expect((await later.find({ type: 'Text', text: '2m' }))?.props.color).toBe('yellow')
  await later.unmount()
})

test('Arabic mirrors the band on the desktop, with Arabic-Indic digits', { options: { language: 'ar' } }, async ($, on) => {
  mock.clock(on, { now: START })
  answerEngine(on)
  answerUsage(on, () => ({ isAutoCompactEnabled: true, autoCompactThreshold: 967_000 }))

  await start($)
  await respond($)

  const ui = await $.ui.mount({ plugin: 'cache-band', surface: 'desktop', ...BAND })
  expect((await ui.find({ key: 'row' }))?.props.flexDirection).toBe('row-reverse')
  expect((await ui.find({ key: 'bar' }))?.props.flexDirection).toBe('row-reverse')
  expect((await ui.find({ key: 'countdown' }))?.text).toBe('\u2067٦٠ د\u2069')
  expect((await ui.find({ key: 'hit' }))?.text).toMatch(/^\u2067٩٣٪/)
  expect((await ui.find({ key: 'autoCompact' }))?.text).toMatch(/^\u2067\(ضغط تلقائي ٩٧٪/)
  expect((await ui.find({ key: 'compact' }))?.props.label).toBe('\u2067ضغط\u2069')
  expect(await ui.find({ type: 'Text', text: 'السياق' })).toBeDefined()
  await ui.unmount()
})

test('Hebrew in the terminal falls back to English', { options: { language: 'he' } }, async ($, on) => {
  mock.clock(on, { now: START })
  answerEngine(on)

  await start($)
  await respond($)

  const terminal = await $.ui.mount({ plugin: 'cache-band', surface: 'terminal', ...BAND })
  expect((await terminal.find({ key: 'row' }))?.props.flexDirection).toBe('row')
  expect((await terminal.find({ key: 'countdown' }))?.text).toBe('60m')
  expect(await terminal.find({ type: 'Text', text: 'Context' })).toBeDefined()
  await terminal.unmount()

  const desktop = await $.ui.mount({ plugin: 'cache-band', surface: 'desktop', ...BAND })
  expect((await desktop.find({ key: 'row' }))?.props.flexDirection).toBe('row-reverse')
  expect((await desktop.find({ key: 'countdown' }))?.text).toBe('\u206760 דק׳\u2069')
  await desktop.unmount()
})

test('rtlInTerminal draws Hebrew right-to-left in the terminal too', { options: { language: 'he', rtlInTerminal: true } }, async ($, on) => {
  mock.clock(on, { now: START })
  answerEngine(on)

  await start($)

  const ui = await $.ui.mount({ plugin: 'cache-band', surface: 'terminal', ...BAND })
  expect((await ui.find({ key: 'row' }))?.props.flexDirection).toBe('row-reverse')
  expect((await ui.find({ type: 'Text', text: 'הקשר' }))?.text).toBe('הקשר')
  await ui.unmount()
})

// Stands in for cache-tax's band row: a plugin beneath this one that draws into the same band.
const KEEPWARM_ROW = {
  name: 'keepwarm-row',
  tier: 'append' as const,
  register: (on: On) => {
    on('ui.render', { component: 'AbovePrompt' }, async ($, e) => {
      const { Box, Text } = $.ui.resolve(e)

      return (
        <Box key="keepwarm">
          <Text>cache-tax · warm · keepwarm 3h00m left</Text>
        </Box>
      )
    })
  },
}

test("another mod's row stays in the band, beneath ours", { plugins: [KEEPWARM_ROW] }, async ($, on) => {
  mock.clock(on, { now: START })
  answerEngine(on)

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ plugin: 'cache-band', surface, ...BAND })
    expect((await ui.find({ key: 'countdown' }))?.text).toBe('–')
    expect(await ui.find({ type: 'Text', text: /keepwarm 3h00m left/ })).toBeDefined()
    await ui.unmount()
  }
})

test('/clear empties the band', async ($, on) => {
  mock.clock(on, { now: START })
  answerEngine(on)

  await respond($)
  await measured($)
  await $.session.end({ reason: 'clear', sessionId: 's', resume: {} as never })

  const ui = await $.ui.mount({ plugin: 'cache-band', surface: 'desktop', ...BAND })
  expect((await ui.find({ key: 'countdown' }))?.text).toBe('–')
  expect((await ui.find({ key: 'context' }))?.text).toBe('–')
  await ui.unmount()
})

test('a failed compaction names its reason, in a toast and in the transcript', async ($, on) => {
  mock.clock(on, { now: START })
  const toasts: string[] = []
  const lines: string[] = []

  answerEngine(on)
  on('ui.toast', (_, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
  on('ui.log', (_, e) => {
    lines.push(e.text)

    return { value: undefined }
  })
  on('command.run', { command: 'compact' }, () => {
    throw new Error('overloaded')
  })

  const ui = await $.ui.mount({ plugin: 'cache-band', surface: 'desktop', ...BAND })
  await ui.press({ key: 'compact' })
  expect((await ui.find({ key: 'compact' }))?.props.label).toBe('Compact')
  await ui.unmount()

  expect(toasts.some(text => text.startsWith('Compact failed:'))).toBe(true)
  expect(lines.some(text => text.startsWith('cache-band: Compact failed:'))).toBe(true)
})

test('turning auto-compact off in /config shows at once', async ($, on) => {
  mock.clock(on, { now: START })
  let isEnabled = true

  answerEngine(on)
  answerUsage(on, () => ({ isAutoCompactEnabled: isEnabled, autoCompactThreshold: isEnabled ? 967_000 : undefined }))
  on('config.set', (_, e) => ({ value: e.value }))

  await start($)
  isEnabled = false
  await $.config.set({
    key: 'autoCompact',
    value: false,
    previous: true,
    provider: { plugin: 'engine', tier: 'core' },
    origin: { kind: 'composer' },
  })

  const ui = await $.ui.mount({ plugin: 'cache-band', surface: 'terminal', ...BAND })
  expect((await ui.find({ key: 'autoCompact' }))?.text).toBe('(Auto-Compact off)')
  await ui.unmount()
})
