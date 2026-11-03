import type { ReactNode } from 'react'
import type {
  DocKind,
  DocStatus,
  PendingChange,
  Provenance,
} from '@/lib/types'

export type Tone = 'neutral' | 'accent' | 'warn' | 'muted' | 'positive'

const TONE_CLASSES: Record<Tone, string> = {
  neutral: 'bg-zinc-100 text-ink-muted border-zinc-200',
  accent: 'bg-accent-50 text-accent-700 border-accent-100',
  warn: 'bg-warn-50 text-warn-700 border-warn-100',
  muted: 'bg-transparent text-ink-faint border-line',
  positive: 'bg-positive-50 text-positive-700 border-positive-100',
}

export function Badge({
  children,
  tone = 'neutral',
  className = '',
}: {
  children: ReactNode
  tone?: Tone
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium leading-none tracking-wide ${TONE_CLASSES[tone]} ${className}`}
    >
      {children}
    </span>
  )
}

export function Card({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-lg border border-line bg-surface ${className}`}>
      {children}
    </section>
  )
}

export function SectionHeader({
  title,
  hint,
  aside,
}: {
  title: string
  hint?: ReactNode
  aside?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-4 py-3">
      <h2 className="text-sm font-semibold tracking-tight text-ink">{title}</h2>
      {aside}
      {hint ? <p className="text-xs text-ink-muted">{hint}</p> : null}
    </div>
  )
}

export const DOC_KIND_LABEL: Record<DocKind, string> = {
  contract: 'Договор',
  amendment: 'Допсоглашение',
  draft_amendment: 'Проект допсоглашения',
  letter: 'Письмо',
}

export const DOC_STATUS_LABEL: Record<DocStatus, string> = {
  signed: 'Подписан',
  unsigned: 'Не подписан',
  draft: 'Проект',
}

export const DOC_STATUS_WORD: Record<DocStatus, string> = {
  signed: 'подписан',
  unsigned: 'не подписан',
  draft: 'проект',
}

export const FIELD_LABEL: Record<'amount' | 'deliveryDeadline', string> = {
  amount: 'Сумма, ₽',
  deliveryDeadline: 'Срок поставки',
}

export const EVIDENCE_LABEL: Record<PendingChange['evidence'], string> = {
  letter: 'Письмо',
  draft: 'Проект',
  signed: 'Подписан',
  unsigned: 'Не подписан',
}

export type PluralForms = readonly [string, string, string]

export const RU_PLURAL: Record<'contract' | 'document' | 'change' | 'record', PluralForms> = {
  contract: ['договор', 'договора', 'договоров'],
  document: ['документ', 'документа', 'документов'],
  change: ['изменение', 'изменения', 'изменений'],
  record: ['запись', 'записи', 'записей'],
}

export function pluralRu(count: number, forms: PluralForms): string {
  const hundred = Math.abs(count) % 100
  const last = hundred % 10
  if (hundred > 10 && hundred < 20) return forms[2]
  if (last > 1 && last < 5) return forms[1]
  if (last === 1) return forms[0]
  return forms[2]
}

export function countRu(count: number, forms: PluralForms): string {
  return `${count} ${pluralRu(count, forms)}`
}

const AFFIRMATIVE: DocStatus[] = ['signed']

export function kindTone(kind: DocKind): Tone {
  if (kind === 'contract') return 'neutral'
  if (kind === 'amendment') return 'accent'
  if (kind === 'draft_amendment') return 'warn'
  return 'muted'
}

export function statusTone(status: DocStatus): Tone {
  return AFFIRMATIVE.includes(status) ? 'positive' : 'warn'
}

export function evidenceTone(evidence: PendingChange['evidence']): Tone {
  if (evidence === 'signed') return 'positive'
  if (evidence === 'letter') return 'accent'
  return 'warn'
}

export const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 focus-visible:ring-offset-surface'

export function formatRub(value: number): string {
  return `${new Intl.NumberFormat('ru-RU').format(value)} ₽`
}

export function formatDateISO(iso: string): string {
  const [year, month, day] = iso.split('-')
  if (!year || !month || !day) return iso
  return `${day}.${month}.${year}`
}

export function formatFieldValue(
  field: 'amount' | 'deliveryDeadline',
  value: number | string | null,
): string {
  if (value === null) return 'нет данных'
  if (field === 'amount') return formatRub(value as number)
  return formatDateISO(value as string)
}

export interface DrawerTarget {
  key: string
  label: string
  context: string
  valueCaption: string
  status: 'active' | 'no_data'
  valueLabel: string
  reason: string | null
  provenance: Provenance[]
  pending: PendingChange[]
  contractNumber: string | null
}

export function makeFieldTarget(params: {
  key: string
  label: string
  context: string
  valueCaption?: string
  status: 'active' | 'no_data'
  valueLabel: string
  reason: string | null
  provenance: Provenance[]
  pending?: PendingChange[]
  contractNumber?: string | null
}): DrawerTarget {
  return {
    key: params.key,
    label: params.label,
    context: params.context,
    valueCaption: params.valueCaption ?? 'Действующее значение',
    status: params.status,
    valueLabel: params.valueLabel,
    reason: params.reason,
    provenance: params.provenance,
    pending: params.pending ?? [],
    contractNumber: params.contractNumber ?? null,
  }
}

export function makePendingTarget(change: PendingChange): DrawerTarget {
  const label = FIELD_LABEL[change.field]
  return {
    key: `pending:${change.contractNumber}:${change.field}:${change.source.fileName}`,
    label: `${label} — предложенное изменение`,
    context: `${change.contractNumber} · ${change.source.fileName}`,
    valueCaption: 'Предложенное значение',
    status: change.proposedValue === null ? 'no_data' : 'active',
    valueLabel: formatFieldValue(change.field, change.proposedValue),
    reason: null,
    provenance: [change.source],
    pending: [],
    contractNumber: change.contractNumber,
  }
}

export type InspectHandler = (
  target: DrawerTarget,
  trigger?: HTMLElement | null,
) => void
