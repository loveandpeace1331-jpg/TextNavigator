export type DocKind = 'contract' | 'amendment' | 'draft_amendment' | 'letter'
export type DocStatus = 'signed' | 'unsigned' | 'draft'

export interface Paragraph { index: number; text: string; offset: number }

export interface SourceDoc {
  id: string
  fileName: string
  rawText: string
  kind: DocKind
  docNumber: string | null
  contractRef: string | null
  docDate: string | null          // ISO date or null
  effectiveDate: string | null    // ISO date or null
  status: DocStatus
  paragraphs: Paragraph[]
}

export interface Provenance {
  fileName: string
  quote: string          // MUST be an exact substring of the source file rawText
  paragraph: string      // the full containing paragraph text
  docKind: DocKind
  docStatus: DocStatus
  docDate: string | null
  rule: string           // human-readable explanation, e.g. "signed amendment §1 supersedes contract §2.1"
}

export interface FieldValue<T> {
  value: T | null
  status: 'active' | 'no_data'
  reason: string | null
  provenance: Provenance[]   // ordered base → applied amendments
}

export interface PendingChange {
  contractNumber: string
  field: 'amount' | 'deliveryDeadline'
  proposedValue: number | string | null   // number of rubles, or ISO date, or null
  currentValue: number | string | null    // active value it would replace
  source: Provenance
  evidence: 'letter' | 'signed' | 'draft' | 'unsigned'
}

export interface ContractSummary {
  number: string
  supplier: FieldValue<string>
  amount: FieldValue<number>
  deliveryDeadline: FieldValue<string>   // ISO date
  pendingChanges: PendingChange[]
}

export interface AnalysisResult {
  contracts: ContractSummary[]
  documents: SourceDoc[]
  pendingChanges: PendingChange[]
  warnings: string[]
  checkDate: string
}

export interface UploadFile { name: string; text: string }

export interface QuestionAnswers {
  q1: FieldValue<string>          // active delivery deadline for STN-101
  q2: FieldValue<number>          // amount STN-102
  q3: FieldValue<number>          // amount STN-103
  q4: { earlierThan: Array<{ number: string; date: string }>; unconfirmed: PendingChange[] }
}

export declare function analyzeDocuments(files: UploadFile[], checkDate: Date): AnalysisResult
export declare function answerQuestions(result: AnalysisResult, checkDate: Date): QuestionAnswers
