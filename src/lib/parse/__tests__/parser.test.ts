import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { analyzeDocuments, answerQuestions } from '../index'
import type { AnalysisResult, ContractSummary, Provenance, UploadFile } from '../../types'

const DOC_NAMES = [
  '01_contract.txt',
  '02_amendment_signed.txt',
  '03_contract.txt',
  '04_contract.txt',
  '05_supplier_email.txt',
  '06_amendment_draft.txt',
]

const CHECK_DATE = new Date('2026-03-10T00:00:00Z')

function corpusDir(): string {
  const local = path.join(process.cwd(), 'sample-docs')
  if (fs.existsSync(path.join(local, DOC_NAMES[0]))) return local
  const sibling = path.join(process.cwd(), '..', 'testDocs')
  if (fs.existsSync(path.join(sibling, DOC_NAMES[0]))) return sibling
  throw new Error(`sample corpus not found in ${local} or ${sibling}`)
}

function loadCorpus(): UploadFile[] {
  const dir = corpusDir()
  return DOC_NAMES.map((name) => ({
    name,
    text: fs.readFileSync(path.join(dir, name), 'utf8'),
  }))
}

function contractOf(result: AnalysisResult, number: string): ContractSummary {
  const found = result.contracts.find((c) => c.number === number)
  if (!found) throw new Error(`contract ${number} not found`)
  return found
}

function stripFileNames(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value, (key, val) => (key === 'fileName' ? '' : val)))
}

describe('parser core', () => {
  const uploads = loadCorpus()
  const result = analyzeDocuments(uploads, CHECK_DATE)

  it('classifies documents by content and ignores file names', () => {
    const kinds = Object.fromEntries(result.documents.map((d) => [d.fileName, d.kind]))
    expect(kinds['01_contract.txt']).toBe('contract')
    expect(kinds['02_amendment_signed.txt']).toBe('amendment')
    expect(kinds['03_contract.txt']).toBe('contract')
    expect(kinds['04_contract.txt']).toBe('contract')
    expect(kinds['05_supplier_email.txt']).toBe('letter')
    expect(kinds['06_amendment_draft.txt']).toBe('draft_amendment')
  })

  it('produces the expected STN-101 summary', () => {
    const contract = contractOf(result, 'STN-101')
    expect(contract.supplier.value).toBe('ООО «Вектор Прибор»')
    expect(contract.amount.value).toBe(1380000)
    expect(contract.amount.status).toBe('active')
    expect(contract.deliveryDeadline.value).toBe('2026-04-30')
    expect(contract.pendingChanges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'amount',
          proposedValue: 1450000,
          currentValue: 1380000,
          evidence: 'draft',
        }),
        expect.objectContaining({
          field: 'deliveryDeadline',
          proposedValue: '2026-05-10',
          currentValue: '2026-04-30',
          evidence: 'draft',
        }),
      ]),
    )
  })

  it('produces the expected STN-102 summary', () => {
    const contract = contractOf(result, 'STN-102')
    expect(contract.supplier.value).toBe('ООО «Контур Электро»')
    expect(contract.amount.value).toBe(840000)
    expect(contract.deliveryDeadline.value).toBe('2026-03-20')
    expect(contract.pendingChanges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'deliveryDeadline',
          proposedValue: '2026-03-27',
          currentValue: '2026-03-20',
          evidence: 'letter',
        }),
      ]),
    )
  })

  it('produces the expected STN-103 summary', () => {
    const contract = contractOf(result, 'STN-103')
    expect(contract.supplier.value).toBe('ООО «ПромСнаб Сервис»')
    expect(contract.amount.value).toBeNull()
    expect(contract.amount.status).toBe('no_data')
    expect(contract.amount.reason).toMatch(/не указано|не входит|определяется спецификацией/)
    expect(contract.deliveryDeadline.value).toBe('2026-04-30')
  })

  it('answers the four questions exactly', () => {
    const answers = answerQuestions(result, CHECK_DATE)
    expect(answers.q1.value).toBe('2026-04-30')
    expect(answers.q2.value).toBe(840000)
    expect(answers.q3.value).toBeNull()
    expect(answers.q3.status).toBe('no_data')
    expect(answers.q4.earlierThan).toEqual([{ number: 'STN-102', date: '2026-03-20' }])
    const unconfirmed = answers.q4.unconfirmed.map((p) => `${p.contractNumber}:${String(p.proposedValue)}`)
    expect(unconfirmed).toContain('STN-101:2026-05-10')
    expect(unconfirmed).toContain('STN-102:2026-03-27')
    expect(answers.q4.unconfirmed.every((p) => p.field === 'deliveryDeadline')).toBe(true)
  })

  it('is independent of file names', () => {
    const renamed = uploads.map((u, i) => ({ name: `${String.fromCharCode(97 + i)}.txt`, text: u.text }))
    const renamedResult = analyzeDocuments(renamed, CHECK_DATE)
    expect(stripFileNames(renamedResult)).toEqual(stripFileNames(result))
  })

  it('keeps every provenance quote inside its source rawText and points at a real paragraph', () => {
    const byName = new Map(result.documents.map((d) => [d.fileName, d]))
    const provenances: Provenance[] = []
    for (const contract of result.contracts) {
      provenances.push(...contract.supplier.provenance)
      provenances.push(...contract.amount.provenance)
      provenances.push(...contract.deliveryDeadline.provenance)
    }
    for (const pending of result.pendingChanges) provenances.push(pending.source)

    expect(provenances.length).toBeGreaterThan(0)
    for (const p of provenances) {
      const doc = byName.get(p.fileName)
      expect(doc).toBeDefined()
      expect(doc?.rawText.includes(p.quote)).toBe(true)
      expect(doc?.paragraphs.some((par) => par.text === p.paragraph)).toBe(true)
    }
  })

  it('does not leak guarded amounts or deadlines', () => {
    const stn103 = contractOf(result, 'STN-103')
    expect(stn103.amount.value).not.toBe(600000)
    expect(stn103.amount.value).toBeNull()
    expect(result.pendingChanges.some((p) => p.contractNumber === 'STN-103')).toBe(false)

    const stn102 = contractOf(result, 'STN-102')
    expect(stn102.amount.value).not.toBe(252000)
    expect(stn102.amount.value).toBe(840000)
    expect(stn102.deliveryDeadline.value).not.toBe('2026-04-10')
    expect(stn102.deliveryDeadline.value).toBe('2026-03-20')
    expect(stn102.pendingChanges.some((p) => p.proposedValue === '2026-04-10')).toBe(false)

    expect(JSON.stringify(result)).not.toContain('600000')
  })

  it('quotes only the decisive clause, not the whole paragraph', () => {
    const stn101 = contractOf(result, 'STN-101')
    const baseAmount = stn101.amount.provenance[0]
    expect(baseAmount.quote).toContain('1 200 000')
    expect(baseAmount.quote).not.toContain('Оплата')
    expect(baseAmount.quote).not.toContain('20 календарных дней')
    expect(stn101.amount.provenance[0].paragraph.length).toBeGreaterThan(baseAmount.quote.length)

    const amendmentAmount = stn101.amount.provenance[1]
    expect(amendmentAmount.quote).toContain('1 380 000')
    expect(amendmentAmount.quote).not.toContain('1 200 000')
    expect(amendmentAmount.paragraph.includes(amendmentAmount.quote)).toBe(true)

    const stn102 = contractOf(result, 'STN-102')
    expect(stn102.amount.provenance[0].quote).not.toContain('252 000')
    expect(stn102.amount.provenance[0].quote).not.toContain('Авансов')
    expect(stn102.deliveryDeadline.provenance[0].quote).not.toContain('10.04.2026')

    const stn103 = contractOf(result, 'STN-103')
    expect(stn103.amount.provenance[0].quote).not.toContain('600 000')
    expect(stn103.amount.provenance[0].paragraph).toContain(stn103.amount.provenance[0].quote)
  })

  it('reverts STN-101 when the signed amendment loses its signature', () => {
    const mutated = uploads.map((u) =>
      u.name === '02_amendment_signed.txt'
        ? { name: u.name, text: u.text.replace('подписано обеими сторонами', 'не подписано') }
        : u,
    )
    const mutatedResult = analyzeDocuments(mutated, CHECK_DATE)

    const amendment = mutatedResult.documents.find((d) => d.kind === 'amendment' && d.contractRef === 'STN-101')
    expect(amendment?.status).toBe('unsigned')

    const contract = contractOf(mutatedResult, 'STN-101')
    expect(contract.amount.value).toBe(1200000)
    expect(contract.deliveryDeadline.value).toBe('2026-04-15')
    expect(contract.pendingChanges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'amount', proposedValue: 1380000, evidence: 'unsigned' }),
        expect.objectContaining({ field: 'deliveryDeadline', proposedValue: '2026-04-30', evidence: 'unsigned' }),
      ]),
    )
  })
})
