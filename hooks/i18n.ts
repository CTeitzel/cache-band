/** The band's words. `Compact` and `Auto-Compact` stay as they are: they name the `/compact` command. */
export type Strings = {
  cache: string
  cold: string
  hit: string
  context: string
  on: string
  off: string
  compacting: string
  busy: string
  failed: (reason: string) => string
}

export const LANGUAGES = [
  'en', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'pl', 'sv', 'cs', 'el', 'tr',
  'ru', 'uk', 'ar', 'he', 'hi', 'th', 'id', 'vi', 'ja', 'ko', 'zh', 'zh-TW',
] as const

export type Language = (typeof LANGUAGES)[number]

export const STRINGS: Record<Language, Strings> = {
  en: {
    cache: 'cache', cold: 'cold', hit: 'hit', context: 'Context', on: 'on', off: 'off',
    compacting: 'Compacting…',
    busy: 'Compact is possible once the running turn has finished.',
    failed: r => `Compact failed: ${r}`,
  },
  de: {
    cache: 'cache', cold: 'kalt', hit: 'hit', context: 'Kontext', on: 'an', off: 'aus',
    compacting: 'Kompaktiere…',
    busy: 'Compact geht erst, wenn der laufende Turn fertig ist.',
    failed: r => `Compact fehlgeschlagen: ${r}`,
  },
  fr: {
    cache: 'cache', cold: 'froid', hit: 'succès', context: 'Contexte', on: 'activé', off: 'désactivé',
    compacting: 'Compactage…',
    busy: 'Compact est possible une fois le tour en cours terminé.',
    failed: r => `Échec de Compact : ${r}`,
  },
  es: {
    cache: 'caché', cold: 'frío', hit: 'acierto', context: 'Contexto', on: 'activado', off: 'desactivado',
    compacting: 'Compactando…',
    busy: 'Compact solo es posible cuando termine el turno en curso.',
    failed: r => `Compact falló: ${r}`,
  },
  it: {
    cache: 'cache', cold: 'freddo', hit: 'hit', context: 'Contesto', on: 'attivo', off: 'disattivo',
    compacting: 'Compattazione…',
    busy: 'Compact è possibile solo al termine del turno in corso.',
    failed: r => `Compact non riuscito: ${r}`,
  },
  pt: {
    cache: 'cache', cold: 'frio', hit: 'acerto', context: 'Contexto', on: 'ativado', off: 'desativado',
    compacting: 'Compactando…',
    busy: 'Compact só é possível quando o turno atual terminar.',
    failed: r => `Compact falhou: ${r}`,
  },
  nl: {
    cache: 'cache', cold: 'koud', hit: 'hit', context: 'Context', on: 'aan', off: 'uit',
    compacting: 'Compacteren…',
    busy: 'Compact kan pas als de lopende beurt klaar is.',
    failed: r => `Compact mislukt: ${r}`,
  },
  pl: {
    cache: 'cache', cold: 'zimny', hit: 'trafień', context: 'Kontekst', on: 'włączony', off: 'wyłączony',
    compacting: 'Kompaktowanie…',
    busy: 'Compact będzie możliwy po zakończeniu bieżącej tury.',
    failed: r => `Compact nie powiódł się: ${r}`,
  },
  sv: {
    cache: 'cache', cold: 'kall', hit: 'träff', context: 'Kontext', on: 'på', off: 'av',
    compacting: 'Komprimerar…',
    busy: 'Compact går först när den pågående turen är klar.',
    failed: r => `Compact misslyckades: ${r}`,
  },
  cs: {
    cache: 'cache', cold: 'studená', hit: 'zásah', context: 'Kontext', on: 'zapnuto', off: 'vypnuto',
    compacting: 'Kompaktuji…',
    busy: 'Compact je možný až po dokončení probíhajícího kola.',
    failed: r => `Compact selhal: ${r}`,
  },
  ru: {
    cache: 'кэш', cold: 'остыл', hit: 'попаданий', context: 'Контекст', on: 'вкл.', off: 'выкл.',
    compacting: 'Сжатие…',
    busy: 'Compact возможен только после завершения текущего хода.',
    failed: r => `Compact не удался: ${r}`,
  },
  uk: {
    cache: 'кеш', cold: 'охолов', hit: 'влучань', context: 'Контекст', on: 'увімк.', off: 'вимк.',
    compacting: 'Стиснення…',
    busy: 'Compact можливий лише після завершення поточного ходу.',
    failed: r => `Compact не вдався: ${r}`,
  },
  el: {
    cache: 'cache', cold: 'κρύα', hit: 'ευστοχία', context: 'Πλαίσιο', on: 'ενεργό', off: 'ανενεργό',
    compacting: 'Συμπύκνωση…',
    busy: 'Το Compact είναι δυνατό μόλις ολοκληρωθεί ο τρέχων γύρος.',
    failed: r => `Το Compact απέτυχε: ${r}`,
  },
  tr: {
    cache: 'önbellek', cold: 'soğuk', hit: 'isabet', context: 'Bağlam', on: 'açık', off: 'kapalı',
    compacting: 'Sıkıştırılıyor…',
    busy: 'Compact, devam eden tur bittikten sonra yapılabilir.',
    failed: r => `Compact başarısız: ${r}`,
  },
  ar: {
    cache: 'الكاش', cold: 'بارد', hit: 'إصابة', context: 'السياق', on: 'مفعّل', off: 'معطّل',
    compacting: 'جارٍ الضغط…',
    busy: 'يمكن تنفيذ Compact بعد انتهاء الدور الجاري.',
    failed: r => `فشل Compact: ${r}`,
  },
  he: {
    cache: 'מטמון', cold: 'קר', hit: 'פגיעות', context: 'הקשר', on: 'פעיל', off: 'כבוי',
    compacting: 'מבצע דחיסה…',
    busy: 'Compact אפשרי רק לאחר שהתור הנוכחי מסתיים.',
    failed: r => `Compact נכשל: ${r}`,
  },
  hi: {
    cache: 'कैश', cold: 'ठंडा', hit: 'हिट', context: 'संदर्भ', on: 'चालू', off: 'बंद',
    compacting: 'कॉम्पैक्ट हो रहा है…',
    busy: 'Compact चल रहे टर्न के पूरा होने के बाद ही संभव है।',
    failed: r => `Compact विफल: ${r}`,
  },
  th: {
    cache: 'แคช', cold: 'หมดอายุ', hit: 'ฮิต', context: 'บริบท', on: 'เปิด', off: 'ปิด',
    compacting: 'กำลังบีบอัด…',
    busy: 'Compact ได้เมื่อเทิร์นที่กำลังทำงานเสร็จแล้ว',
    failed: r => `Compact ล้มเหลว: ${r}`,
  },
  id: {
    cache: 'cache', cold: 'dingin', hit: 'hit', context: 'Konteks', on: 'aktif', off: 'nonaktif',
    compacting: 'Memadatkan…',
    busy: 'Compact baru bisa setelah giliran yang berjalan selesai.',
    failed: r => `Compact gagal: ${r}`,
  },
  vi: {
    cache: 'cache', cold: 'nguội', hit: 'trúng', context: 'Ngữ cảnh', on: 'bật', off: 'tắt',
    compacting: 'Đang nén…',
    busy: 'Chỉ có thể Compact sau khi lượt hiện tại kết thúc.',
    failed: r => `Compact thất bại: ${r}`,
  },
  ja: {
    cache: 'キャッシュ', cold: '期限切れ', hit: 'ヒット', context: 'コンテキスト', on: 'オン', off: 'オフ',
    compacting: '圧縮中…',
    busy: 'Compact は実行中のターンが終わってから実行できます。',
    failed: r => `Compact に失敗しました: ${r}`,
  },
  ko: {
    cache: '캐시', cold: '만료', hit: '적중', context: '컨텍스트', on: '켜짐', off: '꺼짐',
    compacting: '압축 중…',
    busy: 'Compact는 진행 중인 턴이 끝난 후에 가능합니다.',
    failed: r => `Compact 실패: ${r}`,
  },
  zh: {
    cache: '缓存', cold: '已过期', hit: '命中', context: '上下文', on: '开', off: '关',
    compacting: '正在压缩…',
    busy: '当前轮次结束后才能 Compact。',
    failed: r => `Compact 失败：${r}`,
  },
  'zh-TW': {
    cache: '快取', cold: '已過期', hit: '命中', context: '上下文', on: '開', off: '關',
    compacting: '正在壓縮…',
    busy: '目前輪次結束後才能 Compact。',
    failed: r => `Compact 失敗：${r}`,
  },
}

/** Claude Code's `language` setting is free text ("german", "日本語"): the names each language goes by. */
const NAMES: Record<Language, readonly string[]> = {
  en: ['english'],
  de: ['german', 'deutsch'],
  fr: ['french', 'français', 'francais'],
  es: ['spanish', 'español', 'espanol', 'castellano'],
  it: ['italian', 'italiano'],
  pt: ['portuguese', 'português', 'portugues'],
  nl: ['dutch', 'nederlands'],
  pl: ['polish', 'polski'],
  sv: ['swedish', 'svenska'],
  cs: ['czech', 'čeština', 'cestina'],
  el: ['greek', 'ελληνικά'],
  tr: ['turkish', 'türkçe', 'turkce'],
  ru: ['russian', 'русский'],
  uk: ['ukrainian', 'українська'],
  ar: ['arabic', 'العربية'],
  he: ['hebrew', 'עברית'],
  hi: ['hindi', 'हिन्दी', 'हिंदी'],
  th: ['thai', 'ไทย'],
  id: ['indonesian', 'bahasa indonesia'],
  vi: ['vietnamese', 'tiếng việt', 'tieng viet'],
  ja: ['japanese', '日本語'],
  ko: ['korean', '한국어'],
  zh: ['chinese', 'simplified chinese', '中文', '简体中文'],
  'zh-TW': ['traditional chinese', '繁體中文', '繁体中文', '正體中文'],
}

function isLanguage(value: string): value is Language {
  return (LANGUAGES as readonly string[]).includes(value)
}

/** A locale's leading code to a language; `iw` is Hebrew's old code. */
function codeOf(locale: string): Language | null {
  const parts = locale.split(/[-_.@]/)
  const primary = parts[0] ?? ''

  // Chinese as the Grok Depot dashboard reads it: Hant, TW, HK and MO are traditional.
  if (primary === 'zh') {
    return parts.some(part => ['hant', 'tw', 'hk', 'mo'].includes(part)) ? 'zh-TW' : 'zh'
  }

  if (primary === 'iw') {
    return 'he'
  }

  return isLanguage(primary) ? primary : null
}

/** A setting's or a locale's spelling (`German`, `de-DE`, `de_DE.UTF-8`, `zh-Hant-HK`) to a language. */
export function languageOf(text: string | undefined): Language | null {
  const spelled = text?.trim().toLowerCase()

  if (!spelled) {
    return null
  }

  for (const language of LANGUAGES) {
    if (NAMES[language].includes(spelled)) {
      return language
    }
  }

  return codeOf(spelled)
}

export function wordsFor(language: string): Strings {
  return isLanguage(language) ? STRINGS[language] : STRINGS.en
}

/** Each language's number locale, as the Grok Depot dashboard has them (`ar-EG`: Arabic-Indic digits). */
const LOCALES: Record<Language, string> = {
  en: 'en-US', de: 'de-DE', fr: 'fr-FR', es: 'es-ES', it: 'it-IT', pt: 'pt-PT', nl: 'nl-NL',
  pl: 'pl-PL', sv: 'sv-SE', cs: 'cs-CZ', el: 'el-GR', tr: 'tr-TR', ru: 'ru-RU', uk: 'uk-UA',
  ar: 'ar-EG', he: 'he-IL', hi: 'hi-IN', th: 'th-TH', id: 'id-ID', vi: 'vi-VN', ja: 'ja-JP',
  ko: 'ko-KR', zh: 'zh-CN', 'zh-TW': 'zh-TW',
}

const RIGHT_TO_LEFT: readonly Language[] = ['ar', 'he']

/** One language's words, reading direction and number formats. */
export type LanguagePack = {
  language: Language
  words: Strings
  isRtl: boolean
  /** `42m`, `42 Min.`, `٤٢ د`: the locale's narrow minute unit. */
  minutes: (count: number) => string
  /** `93%`, `93 %`, `٩٣٪`: a share from 0 to 1, whole percent. */
  percent: (fraction: number) => string
}

const packs = new Map<Language, LanguagePack>()

export function packFor(language: string): LanguagePack {
  const known: Language = isLanguage(language) ? language : 'en'
  const cached = packs.get(known)

  if (cached !== undefined) {
    return cached
  }

  const locale = LOCALES[known]
  const minutes = new Intl.NumberFormat(locale, { style: 'unit', unit: 'minute', unitDisplay: 'narrow' })
  const percent = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 })
  const pack: LanguagePack = {
    language: known,
    words: STRINGS[known],
    isRtl: RIGHT_TO_LEFT.includes(known),
    minutes: count => minutes.format(count),
    percent: fraction => percent.format(fraction),
  }
  packs.set(known, pack)

  return pack
}

/**
 * Many terminals draw right-to-left script reversed: there Arabic and Hebrew fall back to English,
 * unless the person says their terminal can (`rtlInTerminal`). Web surfaces lay it out themselves.
 */
export function packForSurface(language: string, surface: string | undefined, rtlInTerminal: boolean): LanguagePack {
  const pack = packFor(language)

  return pack.isRtl && surface === 'terminal' && !rtlInTerminal ? packFor('en') : pack
}

/** The option wins; `auto` follows Claude Code's `language` setting, then the locale, then English. */
export function resolveLanguage(option: string, setting: string | undefined, locale: string | undefined): Language {
  if (isLanguage(option)) {
    return option
  }

  return languageOf(setting) ?? languageOf(locale) ?? 'en'
}
