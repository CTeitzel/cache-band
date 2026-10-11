/** The band's words. `Compact` and `Auto-Compact` stay as they are: they name the `/compact` command. */
export type Strings = {
  cache: string
  cold: string
  hit: string
  context: string
  on: string
  off: string
  compacting: string
  skipped: (reason: string) => string
  busy: string
  failed: (reason: string) => string
}

export const LANGUAGES = [
  'en', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'pl', 'sv', 'cs',
  'ru', 'uk', 'tr', 'ar', 'hi', 'id', 'vi', 'ja', 'ko', 'zh',
] as const

export type Language = (typeof LANGUAGES)[number]

export const STRINGS: Record<Language, Strings> = {
  en: {
    cache: 'cache', cold: 'cold', hit: 'hit', context: 'Context', on: 'on', off: 'off',
    compacting: 'Compacting…',
    skipped: r => `Compact skipped: ${r}`,
    busy: 'Compact is possible once the running turn has finished.',
    failed: r => `Compact failed: ${r}`,
  },
  de: {
    cache: 'cache', cold: 'kalt', hit: 'hit', context: 'Kontext', on: 'an', off: 'aus',
    compacting: 'Kompaktiere…',
    skipped: r => `Compact übersprungen: ${r}`,
    busy: 'Compact geht erst, wenn der laufende Turn fertig ist.',
    failed: r => `Compact fehlgeschlagen: ${r}`,
  },
  fr: {
    cache: 'cache', cold: 'froid', hit: 'succès', context: 'Contexte', on: 'activé', off: 'désactivé',
    compacting: 'Compactage…',
    skipped: r => `Compact ignoré : ${r}`,
    busy: 'Compact est possible une fois le tour en cours terminé.',
    failed: r => `Échec de Compact : ${r}`,
  },
  es: {
    cache: 'caché', cold: 'frío', hit: 'acierto', context: 'Contexto', on: 'activado', off: 'desactivado',
    compacting: 'Compactando…',
    skipped: r => `Compact omitido: ${r}`,
    busy: 'Compact solo es posible cuando termine el turno en curso.',
    failed: r => `Compact falló: ${r}`,
  },
  it: {
    cache: 'cache', cold: 'freddo', hit: 'hit', context: 'Contesto', on: 'attivo', off: 'disattivo',
    compacting: 'Compattazione…',
    skipped: r => `Compact saltato: ${r}`,
    busy: 'Compact è possibile solo al termine del turno in corso.',
    failed: r => `Compact non riuscito: ${r}`,
  },
  pt: {
    cache: 'cache', cold: 'frio', hit: 'acerto', context: 'Contexto', on: 'ativado', off: 'desativado',
    compacting: 'Compactando…',
    skipped: r => `Compact ignorado: ${r}`,
    busy: 'Compact só é possível quando o turno atual terminar.',
    failed: r => `Compact falhou: ${r}`,
  },
  nl: {
    cache: 'cache', cold: 'koud', hit: 'hit', context: 'Context', on: 'aan', off: 'uit',
    compacting: 'Compacteren…',
    skipped: r => `Compact overgeslagen: ${r}`,
    busy: 'Compact kan pas als de lopende beurt klaar is.',
    failed: r => `Compact mislukt: ${r}`,
  },
  pl: {
    cache: 'cache', cold: 'zimny', hit: 'trafień', context: 'Kontekst', on: 'włączony', off: 'wyłączony',
    compacting: 'Kompaktowanie…',
    skipped: r => `Compact pominięty: ${r}`,
    busy: 'Compact będzie możliwy po zakończeniu bieżącej tury.',
    failed: r => `Compact nie powiódł się: ${r}`,
  },
  sv: {
    cache: 'cache', cold: 'kall', hit: 'träff', context: 'Kontext', on: 'på', off: 'av',
    compacting: 'Komprimerar…',
    skipped: r => `Compact hoppades över: ${r}`,
    busy: 'Compact går först när den pågående turen är klar.',
    failed: r => `Compact misslyckades: ${r}`,
  },
  cs: {
    cache: 'cache', cold: 'studená', hit: 'zásah', context: 'Kontext', on: 'zapnuto', off: 'vypnuto',
    compacting: 'Kompaktuji…',
    skipped: r => `Compact přeskočen: ${r}`,
    busy: 'Compact je možný až po dokončení probíhajícího kola.',
    failed: r => `Compact selhal: ${r}`,
  },
  ru: {
    cache: 'кэш', cold: 'остыл', hit: 'попаданий', context: 'Контекст', on: 'вкл.', off: 'выкл.',
    compacting: 'Сжатие…',
    skipped: r => `Compact пропущен: ${r}`,
    busy: 'Compact возможен только после завершения текущего хода.',
    failed: r => `Compact не удался: ${r}`,
  },
  uk: {
    cache: 'кеш', cold: 'охолов', hit: 'влучань', context: 'Контекст', on: 'увімк.', off: 'вимк.',
    compacting: 'Стиснення…',
    skipped: r => `Compact пропущено: ${r}`,
    busy: 'Compact можливий лише після завершення поточного ходу.',
    failed: r => `Compact не вдався: ${r}`,
  },
  tr: {
    cache: 'önbellek', cold: 'soğuk', hit: 'isabet', context: 'Bağlam', on: 'açık', off: 'kapalı',
    compacting: 'Sıkıştırılıyor…',
    skipped: r => `Compact atlandı: ${r}`,
    busy: 'Compact, devam eden tur bittikten sonra yapılabilir.',
    failed: r => `Compact başarısız: ${r}`,
  },
  ar: {
    cache: 'الكاش', cold: 'بارد', hit: 'إصابة', context: 'السياق', on: 'مفعّل', off: 'معطّل',
    compacting: 'جارٍ الضغط…',
    skipped: r => `تم تخطي Compact: ${r}`,
    busy: 'يمكن تنفيذ Compact بعد انتهاء الدور الجاري.',
    failed: r => `فشل Compact: ${r}`,
  },
  hi: {
    cache: 'कैश', cold: 'ठंडा', hit: 'हिट', context: 'संदर्भ', on: 'चालू', off: 'बंद',
    compacting: 'कॉम्पैक्ट हो रहा है…',
    skipped: r => `Compact छोड़ा गया: ${r}`,
    busy: 'Compact चल रहे टर्न के पूरा होने के बाद ही संभव है।',
    failed: r => `Compact विफल: ${r}`,
  },
  id: {
    cache: 'cache', cold: 'dingin', hit: 'hit', context: 'Konteks', on: 'aktif', off: 'nonaktif',
    compacting: 'Memadatkan…',
    skipped: r => `Compact dilewati: ${r}`,
    busy: 'Compact baru bisa setelah giliran yang berjalan selesai.',
    failed: r => `Compact gagal: ${r}`,
  },
  vi: {
    cache: 'cache', cold: 'nguội', hit: 'trúng', context: 'Ngữ cảnh', on: 'bật', off: 'tắt',
    compacting: 'Đang nén…',
    skipped: r => `Đã bỏ qua Compact: ${r}`,
    busy: 'Chỉ có thể Compact sau khi lượt hiện tại kết thúc.',
    failed: r => `Compact thất bại: ${r}`,
  },
  ja: {
    cache: 'キャッシュ', cold: '期限切れ', hit: 'ヒット', context: 'コンテキスト', on: 'オン', off: 'オフ',
    compacting: '圧縮中…',
    skipped: r => `Compact をスキップ: ${r}`,
    busy: 'Compact は実行中のターンが終わってから実行できます。',
    failed: r => `Compact に失敗しました: ${r}`,
  },
  ko: {
    cache: '캐시', cold: '만료', hit: '적중', context: '컨텍스트', on: '켜짐', off: '꺼짐',
    compacting: '압축 중…',
    skipped: r => `Compact 건너뜀: ${r}`,
    busy: 'Compact는 진행 중인 턴이 끝난 후에 가능합니다.',
    failed: r => `Compact 실패: ${r}`,
  },
  zh: {
    cache: '缓存', cold: '已过期', hit: '命中', context: '上下文', on: '开', off: '关',
    compacting: '正在压缩…',
    skipped: r => `已跳过 Compact：${r}`,
    busy: '当前轮次结束后才能 Compact。',
    failed: r => `Compact 失败：${r}`,
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
  ru: ['russian', 'русский'],
  uk: ['ukrainian', 'українська'],
  tr: ['turkish', 'türkçe', 'turkce'],
  ar: ['arabic', 'العربية'],
  hi: ['hindi', 'हिन्दी', 'हिंदी'],
  id: ['indonesian', 'bahasa indonesia'],
  vi: ['vietnamese', 'tiếng việt', 'tieng viet'],
  ja: ['japanese', '日本語'],
  ko: ['korean', '한국어'],
  zh: ['chinese', '中文', '简体中文', '繁體中文'],
}

function isLanguage(value: string): value is Language {
  return (LANGUAGES as readonly string[]).includes(value)
}

/** A setting's or a locale's spelling (`German`, `de-DE`, `de_DE.UTF-8`) to a language, if it names one. */
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

  const code = spelled.split(/[-_.@]/)[0] ?? ''

  return isLanguage(code) ? code : null
}

export function wordsFor(language: string): Strings {
  return isLanguage(language) ? STRINGS[language] : STRINGS.en
}

/** The option wins; `auto` follows Claude Code's `language` setting, then the locale, then English. */
export function resolveLanguage(option: string, setting: string | undefined, locale: string | undefined): Language {
  if (isLanguage(option)) {
    return option
  }

  return languageOf(setting) ?? languageOf(locale) ?? 'en'
}
