'use client'

import type { ReactNode } from 'react'
import type {
  AnalysisResult,
  FieldValue,
  PendingChange,
  QuestionAnswers,
} from '@/lib/types'
import {
  Badge,
  Card,
  EVIDENCE_LABEL,
  FOCUS_RING,
  InspectHandler,
  SectionHeader,
  evidenceTone,
  formatDateISO,
  formatFieldValue,
  makeFieldTarget,
  makePendingTarget,
  type DrawerTarget,
} from './ui'

function monthAfter(iso: string): string {
  const [yearRaw, monthRaw] = iso.split('-')
  const year = Number(yearRaw)
  const month = Number(monthRaw)
  const nextYear = month === 12 ? year + 1 : year
  const nextMonth = month === 12 ? 1 : month + 1
  return `01.${String(nextMonth).padStart(2, '0')}.${nextYear}`
}

function answerTarget(params: {
  result: AnalysisResult
  number: string
  field: 'amount' | 'deliveryDeadline'
  fieldValue: FieldValue<number> | FieldValue<string>
  dateLabel: string
  label: string
}): DrawerTarget {
  const contract = params.result.contracts.find(
    (item) => item.number === params.number,
  )
  const pending =
    contract?.pendingChanges.filter((change) => change.field === params.field) ??
    []
  return makeFieldTarget({
    key: `answer:${params.number}:${params.field}`,
    label: params.label,
    context: `${params.number} · as of ${params.dateLabel}`,
    valueCaption: 'Active value',
    status: params.fieldValue.status,
    valueLabel: formatFieldValue(params.field, params.fieldValue.value),
    reason: params.fieldValue.reason,
    provenance: params.fieldValue.provenance,
    pending,
  })
}

function QuestionCard({
  index,
  question,
  children,
}: {
  index: number
  question: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col rounded-md border border-line bg-surface p-3.5">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-accent-50 text-[11px] font-semibold text-accent-700">
          Q{index}
        </span>
        <p className="text-sm font-medium text-ink">{question}</p>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  )
}

function AnswerButton({
  target,
  onInspect,
  muted,
  children,
}: {
  target: DrawerTarget
  onInspect: InspectHandler
  muted?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={(event) => onInspect(target, event.currentTarget)}
      title="Show the sources for this answer"
      className={`flex w-full items-center justify-between gap-2 rounded border border-line bg-paper/70 px-3 py-2 text-left transition-colors hover:border-accent-100 hover:bg-accent-50 ${FOCUS_RING}`}
    >
      <span
        className={
          muted
            ? 'text-sm italic text-ink-faint'
            : 'text-sm font-semibold tabular-nums text-ink'
        }
      >
        {children}
      </span>
      <span className="shrink-0 text-xs text-ink-faint">sources</span>
    </button>
  )
}

export function QuestionsPanel({
  answers,
  result,
  checkDate,
  onInspect,
}: {
  answers: QuestionAnswers
  result: AnalysisResult
  checkDate: string
  onInspect: InspectHandler
}) {
  const dateLabel = formatDateISO(checkDate)
  const boundary = monthAfter(checkDate)
  const { earlierThan, unconfirmed } = answers.q4

  return (
    <Card>
      <SectionHeader
        title="Quick answers"
        hint={`Computed from the active terms as of ${dateLabel}`}
      />

      <div className="grid gap-3 p-4 md:grid-cols-2">
        <QuestionCard
          index={1}
          question={`What delivery deadline is active for contract STN-101 on ${dateLabel}?`}
        >
          <AnswerButton
            muted={answers.q1.status === 'no_data'}
            target={answerTarget({
              result,
              number: 'STN-101',
              field: 'deliveryDeadline',
              fieldValue: answers.q1,
              dateLabel,
              label: 'Delivery deadline',
            })}
            onInspect={onInspect}
          >
            {formatFieldValue('deliveryDeadline', answers.q1.value)}
          </AnswerButton>
        </QuestionCard>

        <QuestionCard index={2} question="What is the amount of contract STN-102?">
          <AnswerButton
            muted={answers.q2.status === 'no_data'}
            target={answerTarget({
              result,
              number: 'STN-102',
              field: 'amount',
              fieldValue: answers.q2,
              dateLabel,
              label: 'Total amount (RUB)',
            })}
            onInspect={onInspect}
          >
            {formatFieldValue('amount', answers.q2.value)}
          </AnswerButton>
        </QuestionCard>

        <QuestionCard index={3} question="What is the amount of contract STN-103?">
          <AnswerButton
            muted={answers.q3.status === 'no_data'}
            target={answerTarget({
              result,
              number: 'STN-103',
              field: 'amount',
              fieldValue: answers.q3,
              dateLabel,
              label: 'Total amount (RUB)',
            })}
            onInspect={onInspect}
          >
            {formatFieldValue('amount', answers.q3.value)}
          </AnswerButton>
        </QuestionCard>

        <QuestionCard
          index={4}
          question={`Which contracts have deliveries scheduled earlier than ${boundary} and are there any unconfirmed deadline changes?`}
        >
          <div className="space-y-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                Deliveries earlier than {boundary}
              </p>
              {earlierThan.length === 0 ? (
                <p className="mt-1 text-sm text-ink-muted">
                  No matching deliveries.
                </p>
              ) : (
                <ul className="mt-1 divide-y divide-line rounded border border-line">
                  {earlierThan.map((item) => (
                    <li
                      key={item.number}
                      className="flex items-center justify-between px-3 py-1.5 text-sm"
                    >
                      <span className="font-mono font-semibold">
                        {item.number}
                      </span>
                      <span className="tabular-nums text-ink">
                        {formatDateISO(item.date)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                Unconfirmed deadline changes
              </p>
              {unconfirmed.length === 0 ? (
                <p className="mt-1 text-sm text-ink-muted">None.</p>
              ) : (
                <ul className="mt-1 space-y-1.5">
                  {unconfirmed.map((change, index) => (
                    <li key={`${change.contractNumber}-${index}`}>
                      <PendingLine change={change} onInspect={onInspect} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </QuestionCard>
      </div>
    </Card>
  )
}

function PendingLine({
  change,
  onInspect,
}: {
  change: PendingChange
  onInspect: InspectHandler
}) {
  return (
    <button
      type="button"
      onClick={(event) => onInspect(makePendingTarget(change), event.currentTarget)}
      className={`flex w-full flex-wrap items-center gap-2 rounded border border-line bg-paper/70 px-3 py-1.5 text-left text-xs transition-colors hover:border-accent-100 hover:bg-accent-50 ${FOCUS_RING}`}
    >
      <span className="font-mono font-semibold text-ink">
        {change.contractNumber}
      </span>
      <span className="tabular-nums text-ink-muted">
        {formatFieldValue(change.field, change.currentValue)}
      </span>
      <span aria-hidden="true" className="text-ink-faint">
        →
      </span>
      <span className="tabular-nums font-semibold text-warn-700">
        {formatFieldValue(change.field, change.proposedValue)}
      </span>
      <Badge tone={evidenceTone(change.evidence)}>
        {EVIDENCE_LABEL[change.evidence]}
      </Badge>
      <span className="w-full truncate font-mono text-[11px] text-ink-faint">
        {change.source.fileName}
      </span>
    </button>
  )
}
