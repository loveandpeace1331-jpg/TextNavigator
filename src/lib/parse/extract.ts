import type { Paragraph } from '../types'

export interface AmountResult {
  value: number | null
  status: 'active' | 'no_data'
  reason: string | null
  quote: string | null
  paragraph: string | null
}

export interface DeadlineResult {
  value: string | null
  status: 'active' | 'no_data'
  reason: string | null
  quote: string | null
  paragraph: string | null
}

export function splitParagraphs(rawText: string): Paragraph[] {
  const paragraphs: Paragraph[] = []
  let offset = 0
  let start = -1
  let end = -1

  const commit = () => {
    if (start >= 0) {
      paragraphs.push({ index: paragraphs.length, text: rawText.slice(start, end), offset: start })
      start = -1
    }
  }

  for (const line of rawText.split('\n')) {
    const lineStart = offset
    const lineEnd = offset + line.length
    offset = lineEnd + 1
    if (line.trim() === '') {
      commit()
    } else {
      if (start < 0) start = lineStart
      end = lineEnd
    }
  }
  commit()
  return paragraphs
}

function clausesOf(paragraph: string): string[] {
  const result: string[] = []
  for (const line of paragraph.split('\n')) {
    for (const piece of line.split(/(?<=\.)\s+/)) {
      const trimmed = piece.trim()
      if (trimmed !== '') result.push(trimmed)
    }
  }
  return result
}

export function toISO(ddmmyyyy: string): string {
  const parts = ddmmyyyy.split('.')
  return `${parts[2]}-${parts[1]}-${parts[0]}`
}

export function extractDocDate(rawText: string): string | null {
  const m = rawText.match(/Дата(?:\s+проекта)?\s*:\s*(\d{2}\.\d{2}\.\d{4})/i)
  return m ? toISO(m[1]) : null
}

export function extractEffectiveDate(paragraphs: Paragraph[]): string | null {
  for (const p of paragraphs) {
    if (!/вступ/i.test(p.text)) continue
    const explicit = p.text.match(/дата\s+вступления\s+в\s+силу[^0-9]{0,40}(\d{2}\.\d{2}\.\d{4})/i)
    if (explicit) return toISO(explicit[1])
    const inForce = p.text.match(/в\s+силу[^0-9]{0,40}(\d{2}\.\d{2}\.\d{4})/i)
    if (inForce) return toISO(inForce[1])
  }
  return null
}

export function extractSupplier(rawText: string): string | null {
  const m = rawText.match(/[Пп]оставщик\s*:\s*([^.\n]+)/)
  if (!m) return null
  const name = m[1].trim().replace(/\.+$/, '').trim()
  return name === '' ? null : name
}

export function parseRubAmount(text: string): number | null {
  const tokens = text.match(/\d+(?:[\s\u00A0\u2009]\d{3})*/g)
  if (!tokens) return null
  let max: number | null = null
  for (const token of tokens) {
    const n = Number.parseInt(token.replace(/[\s\u00A0\u2009]/g, ''), 10)
    if (!Number.isNaN(n) && (max === null || n > max)) max = n
  }
  return max
}

function matchesAny(patterns: RegExp[], text: string): boolean {
  return patterns.some((re) => re.test(text))
}

const AMOUNT_CANDIDATE = [
  /общ\S*\s+стоимост/i,
  /стоимост\S*\s+поставки/i,
  /итогов\S*\s+стоимост/i,
]

const AMOUNT_REJECT = [
  /авансов/i,
  /входит\s+в\s+общую\s+стоимость/i,
  /лимит\s+закупки/i,
  /внутреннему\s+бюджету/i,
  /не\s+является\s+согласованной\s+стоимостью/i,
  /неустойк/i,
]

const AMOUNT_NO_DATA = [
  /Числовое значение стоимости[^.]*не указано/i,
  /определяется спецификацией/i,
  /Приложение[^.]*не входит/i,
]

function excludingAmountSentence(text: string): string {
  const patterns = [
    /[^.]*Числовое значение стоимости[^.]*\./i,
    /[^.]*не входит[^.]*\./i,
    /[^.]*определяется спецификацией[^.]*\./i,
  ]
  for (const re of patterns) {
    const m = text.match(re)
    if (m) return m[0].trim()
  }
  return text.trim()
}

export function extractAmount(paragraphs: Paragraph[]): AmountResult {
  let noData: { reason: string; quote: string; paragraph: string } | null = null

  for (const p of paragraphs) {
    for (const clause of clausesOf(p.text)) {
      if (!matchesAny(AMOUNT_CANDIDATE, clause)) continue
      if (matchesAny(AMOUNT_REJECT, clause)) continue

      if (matchesAny(AMOUNT_NO_DATA, clause)) {
        noData = { reason: excludingAmountSentence(p.text), quote: excludingAmountSentence(p.text), paragraph: p.text }
        continue
      }

      const value = parseRubAmount(clause)
      if (value !== null) {
        return { value, status: 'active', reason: null, quote: clause, paragraph: p.text }
      }
    }
  }

  if (noData) {
    return { value: null, status: 'no_data', reason: noData.reason, quote: noData.quote, paragraph: noData.paragraph }
  }

  return {
    value: null,
    status: 'no_data',
    reason: 'Общая стоимость договора в тексте не указана.',
    quote: null,
    paragraph: null,
  }
}

const DEADLINE_REJECT = [
  /срок\s+оплаты/i,
  /сроком\s+оплаты/i,
  /а\s+не\s+поставки/i,
  /Оплата/i,
  /Дата приемки/i,
  /не\s+изменяет\s+срок/i,
  /неустойк/i,
]

function isDeadlineCandidate(text: string): boolean {
  if (/не позднее\s+\d{2}\.\d{2}\.\d{4}/i.test(text)) return true
  if (/срок\S*\s+поставки/i.test(text)) return true
  if (/поставк/i.test(text) && /(?:измен|перенос|предлага)/i.test(text) && /\d{2}\.\d{2}\.\d{4}/.test(text)) return true
  return false
}

export function parseDeadlineValue(text: string): string | null {
  let m = text.match(/не позднее\s+(\d{2}\.\d{2}\.\d{4})/i)
  if (m) return toISO(m[1])

  m = text.match(/(?:изменить|изменения?|перенести)[\s\S]*?срок\S*\s+поставки[\s\S]*?на\s+(\d{2}\.\d{2}\.\d{4})/i)
  if (m) return toISO(m[1])

  m = text.match(/срок\S*\s+поставки[\s\S]*?на\s+(\d{2}\.\d{2}\.\d{4})/i)
  if (m) return toISO(m[1])

  return null
}

export function extractDeadline(paragraphs: Paragraph[]): DeadlineResult {
  for (const p of paragraphs) {
    for (const clause of clausesOf(p.text)) {
      if (!isDeadlineCandidate(clause)) continue
      if (matchesAny(DEADLINE_REJECT, clause)) continue
      const value = parseDeadlineValue(clause)
      if (value !== null) {
        return { value, status: 'active', reason: null, quote: clause, paragraph: p.text }
      }
    }
  }

  return {
    value: null,
    status: 'no_data',
    reason: 'Срок поставки в тексте не указан.',
    quote: null,
    paragraph: null,
  }
}
