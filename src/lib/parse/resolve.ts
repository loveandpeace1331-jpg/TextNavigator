import type {
  AnalysisResult,
  ContractSummary,
  FieldValue,
  PendingChange,
  Provenance,
  SourceDoc,
  UploadFile,
} from '../types'
import { classifyDocument, detectStatus, extractContractRef, extractDocNumber } from './classify'
import {
  extractAmount,
  extractDeadline,
  extractDocDate,
  extractEffectiveDate,
  extractSupplier,
  splitParagraphs,
  type AmountResult,
  type DeadlineResult,
} from './extract'

interface DocAnalysis {
  doc: SourceDoc
  amount: AmountResult
  deadline: DeadlineResult
}

function hashString(value: string): string {
  let hash = 5381
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) + hash + value.charCodeAt(i)) | 0
  }
  return (hash >>> 0).toString(36)
}

function isoOf(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function buildDocument(file: UploadFile): SourceDoc {
  const rawText = file.text
  const kind = classifyDocument(rawText)
  const paragraphs = splitParagraphs(rawText)
  return {
    id: `doc-${hashString(rawText)}`,
    fileName: file.name,
    rawText,
    kind,
    docNumber: extractDocNumber(kind, rawText),
    contractRef: extractContractRef(kind, rawText),
    docDate: extractDocDate(rawText),
    effectiveDate: extractEffectiveDate(paragraphs),
    status: detectStatus(kind, rawText),
    paragraphs,
  }
}

function makeProvenance(doc: SourceDoc, quote: string | null, paragraph: string, rule: string): Provenance {
  const exact = quote !== null && quote !== '' && paragraph.includes(quote) ? quote : paragraph
  return {
    fileName: doc.fileName,
    quote: exact,
    paragraph,
    docKind: doc.kind,
    docStatus: doc.status,
    docDate: doc.docDate,
    rule,
  }
}

function ruling(doc: SourceDoc, field: 'amount' | 'deliveryDeadline', applied: boolean): string {
  const label = field === 'amount' ? 'total amount' : 'delivery deadline'
  if (applied) {
    if (doc.kind === 'amendment' || doc.kind === 'draft_amendment') {
      const section = field === 'amount' ? '§2.1' : '§3.1'
      return `signed amendment №${doc.docNumber ?? '?'} supersedes contract ${section} (${label})`
    }
    return `signed contract sets ${label}`
  }
  if (doc.kind === 'letter') return `supplier letter proposes a new ${label} (not applied)`
  if (doc.kind === 'draft_amendment') return `draft amendment №${doc.docNumber ?? '?'} proposes a new ${label} (not applied)`
  if (doc.status === 'signed') {
    return `signed amendment №${doc.docNumber ?? '?'} takes effect ${doc.effectiveDate ?? 'later'} (after check date)`
  }
  return `unsigned amendment №${doc.docNumber ?? '?'} proposes a new ${label} (not applied)`
}

function fieldFromAmount(base: DocAnalysis, current: DocAnalysis[]): FieldValue<number> {
  const first = base.amount
  let value: number | null = first.value
  const provenance: Provenance[] =
    first.paragraph !== null
      ? [makeProvenance(base.doc, first.quote, first.paragraph, `signed contract ${base.doc.contractRef ?? ''} sets total amount`)]
      : []

  for (const item of current) {
    if (item.amount.value === null || item.amount.paragraph === null) continue
    value = item.amount.value
    provenance.push(makeProvenance(item.doc, item.amount.quote, item.amount.paragraph, ruling(item.doc, 'amount', true)))
  }

  if (value === null) {
    return {
      value: null,
      status: 'no_data',
      reason: first.reason ?? 'Общая стоимость договора в тексте не указана.',
      provenance,
    }
  }
  return { value, status: 'active', reason: null, provenance }
}

function fieldFromDeadline(base: DocAnalysis, current: DocAnalysis[]): FieldValue<string> {
  const first = base.deadline
  let value: string | null = first.value
  const provenance: Provenance[] =
    first.paragraph !== null
      ? [makeProvenance(base.doc, first.quote, first.paragraph, `signed contract ${base.doc.contractRef ?? ''} sets delivery deadline`)]
      : []

  for (const item of current) {
    if (item.deadline.value === null || item.deadline.paragraph === null) continue
    value = item.deadline.value
    provenance.push(makeProvenance(item.doc, item.deadline.quote, item.deadline.paragraph, ruling(item.doc, 'deliveryDeadline', true)))
  }

  if (value === null) {
    return {
      value: null,
      status: 'no_data',
      reason: first.reason ?? 'Срок поставки в тексте не указан.',
      provenance,
    }
  }
  return { value, status: 'active', reason: null, provenance }
}

function fieldFromSupplier(base: DocAnalysis): FieldValue<string> {
  const name = extractSupplier(base.doc.rawText)
  if (name === null) {
    return { value: null, status: 'no_data', reason: 'Поставщик в тексте не указан.', provenance: [] }
  }
  const paragraph = base.doc.paragraphs.find((p) => /[Пп]оставщик\s*:/.test(p.text))
  const provenance = paragraph
    ? [makeProvenance(base.doc, paragraph.text, paragraph.text, `signed contract ${base.doc.contractRef ?? ''} names the supplier`)]
    : []
  return { value: name, status: 'active', reason: null, provenance }
}

function compareDates(a: string, b: string): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

export function analyzeDocuments(files: UploadFile[], checkDate: Date): AnalysisResult {
  const checkISO = isoOf(checkDate)
  const documents = files.map(buildDocument)
  const analyses: DocAnalysis[] = documents.map((doc) => ({
    doc,
    amount: extractAmount(doc.paragraphs),
    deadline: extractDeadline(doc.paragraphs),
  }))

  const contractDocs = analyses.filter((a) => a.doc.kind === 'contract' && a.doc.contractRef !== null)
  const warnings: string[] = []
  const contracts: ContractSummary[] = []

  for (const base of contractDocs) {
    const number = base.doc.contractRef as string
    const related = analyses.filter((a) => a.doc.contractRef === number && a.doc.kind !== 'contract')
    const amendments = related.filter(
      (a) => a.doc.kind === 'amendment' || a.doc.kind === 'draft_amendment',
    )
    const letters = related.filter((a) => a.doc.kind === 'letter')

    const applicable = amendments
      .filter((a) => a.doc.status === 'signed' && a.doc.effectiveDate !== null && a.doc.effectiveDate <= checkISO)
      .sort((a, b) => compareDates(a.doc.effectiveDate as string, b.doc.effectiveDate as string))

    const amount = fieldFromAmount(base, applicable)
    const deliveryDeadline = fieldFromDeadline(base, applicable)
    const supplier = fieldFromSupplier(base)

    if (amount.status === 'no_data') {
      warnings.push(`${number}: общая стоимость не указана в тексте договора.`)
    }
    if (deliveryDeadline.status === 'no_data') {
      warnings.push(`${number}: срок поставки не указан в тексте договора.`)
    }

    const pendingChanges: PendingChange[] = []
    const pendingSources: Array<{ item: DocAnalysis; evidence: PendingChange['evidence'] }> = []
    for (const item of amendments) {
      if (item.doc.status === 'signed' && item.doc.effectiveDate !== null && item.doc.effectiveDate <= checkISO) continue
      let evidence: PendingChange['evidence'] = 'unsigned'
      if (item.doc.kind === 'draft_amendment' && item.doc.status !== 'signed') evidence = 'draft'
      else if (item.doc.status === 'signed') evidence = 'signed'
      pendingSources.push({ item, evidence })
    }
    for (const item of letters) pendingSources.push({ item, evidence: 'letter' })
    pendingSources.sort((a, b) => compareDates(a.item.doc.docDate ?? '', b.item.doc.docDate ?? ''))

    for (const { item, evidence } of pendingSources) {
      if (item.amount.value !== null && item.amount.paragraph !== null) {
        pendingChanges.push({
          contractNumber: number,
          field: 'amount',
          proposedValue: item.amount.value,
          currentValue: amount.value,
          source: makeProvenance(item.doc, item.amount.quote, item.amount.paragraph, ruling(item.doc, 'amount', false)),
          evidence,
        })
      }
      if (item.deadline.value !== null && item.deadline.paragraph !== null) {
        pendingChanges.push({
          contractNumber: number,
          field: 'deliveryDeadline',
          proposedValue: item.deadline.value,
          currentValue: deliveryDeadline.value,
          source: makeProvenance(item.doc, item.deadline.quote, item.deadline.paragraph, ruling(item.doc, 'deliveryDeadline', false)),
          evidence,
        })
      }
    }

    contracts.push({ number, supplier, amount, deliveryDeadline, pendingChanges })
  }

  contracts.sort((a, b) => compareDates(a.number, b.number))

  const known = new Set(contracts.map((c) => c.number))
  for (const doc of documents) {
    if (doc.kind === 'contract' && doc.contractRef === null) {
      warnings.push(`${doc.fileName}: не удалось определить номер договора.`)
    }
    if (doc.kind !== 'contract' && doc.contractRef !== null && !known.has(doc.contractRef)) {
      warnings.push(`${doc.fileName}: ссылка на неизвестный договор ${doc.contractRef}.`)
    }
  }

  const pendingChanges = contracts.flatMap((c) => c.pendingChanges)

  return {
    contracts,
    documents,
    pendingChanges,
    warnings,
    checkDate: checkISO,
  }
}
