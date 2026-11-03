import type { DocKind, DocStatus } from '../types'

function firstMeaningfulLine(rawText: string): string {
  for (const line of rawText.split('\n')) {
    if (line.trim() !== '') return line
  }
  return ''
}

export function classifyDocument(rawText: string): DocKind {
  const header = firstMeaningfulLine(rawText)
  if (/ПРОЕКТ/i.test(header) && /ДОПОЛНИТЕЛЬН\S*\s+СОГЛАШЕНИ/i.test(header)) return 'draft_amendment'
  if (/ДОПОЛНИТЕЛЬН\S*\s+СОГЛАШЕНИ/i.test(header)) return 'amendment'
  if (/ПИСЬМО/i.test(header)) return 'letter'
  if (/ДОГОВОР\s+ПОСТАВКИ/i.test(header)) return 'contract'

  if (/ДОГОВОР\s+ПОСТАВКИ/i.test(rawText)) return 'contract'
  if (/ДОПОЛНИТЕЛЬН\S*\s+СОГЛАШЕНИ/i.test(rawText)) {
    return /ПРОЕКТ/i.test(rawText) ? 'draft_amendment' : 'amendment'
  }
  if (/ПИСЬМО/i.test(rawText)) return 'letter'
  return 'letter'
}

const AFFIRMATIVE_SIGNATURE = /подписан\S*\s+(?:обеими\s+)?сторонами/i
const NEGATED_SIGNATURE = /не\s+подписан|подписание\s+не\s+состоялось|не\s+подписан\s+ни\s+одной\s+стороной/i

export function detectStatus(kind: DocKind, rawText: string): DocStatus {
  if (kind === 'letter') return 'unsigned'
  const signed = AFFIRMATIVE_SIGNATURE.test(rawText) && !NEGATED_SIGNATURE.test(rawText)
  if (kind === 'draft_amendment') return signed ? 'signed' : 'draft'
  return signed ? 'signed' : 'unsigned'
}

export function extractDocNumber(kind: DocKind, rawText: string): string | null {
  if (kind === 'contract') {
    const m = rawText.match(/ДОГОВОР\s+ПОСТАВКИ\s*№\s*([A-Za-zА-Яа-я0-9-]+)/i)
    return m ? m[1] : null
  }
  if (kind === 'amendment' || kind === 'draft_amendment') {
    const m = rawText.match(/ДОПОЛНИТЕЛЬН\S*\s+СОГЛАШЕНИ\S*\s*№\s*([A-Za-zА-Яа-я0-9-]+)/i)
    return m ? m[1] : null
  }
  return null
}

export function extractContractRef(kind: DocKind, rawText: string): string | null {
  if (kind === 'contract') return extractDocNumber('contract', rawText)
  if (kind === 'amendment' || kind === 'draft_amendment') {
    const m = rawText.match(/К\s+ДОГОВОРУ\s*(?:№\s*)?([A-Za-zА-Яа-я0-9-]+)/i)
    if (m) return m[1]
  }
  const m = rawText.match(/договор\S*\s*(?:№\s*)?([A-ZА-Я]{2,}-?\d+)/i)
  return m ? m[1] : null
}
