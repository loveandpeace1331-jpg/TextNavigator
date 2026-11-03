'use client'

import type { AnalysisResult, PendingChange } from '@/lib/types'
import {
  Badge,
  Card,
  EVIDENCE_LABEL,
  FOCUS_RING,
  InspectHandler,
  SectionHeader,
  evidenceTone,
  formatFieldValue,
  makePendingTarget,
} from './ui'

const FIELD_LABEL: Record<PendingChange['field'], string> = {
  amount: 'Total amount (RUB)',
  deliveryDeadline: 'Delivery deadline',
}

function valueLabel(change: PendingChange, value: number | string | null): string {
  return formatFieldValue(change.field, value)
}

export function PendingChanges({
  result,
  onInspect,
}: {
  result: AnalysisResult
  onInspect: InspectHandler
}) {
  const groups = new Map<string, PendingChange[]>()
  for (const change of result.pendingChanges) {
    const list = groups.get(change.contractNumber) ?? []
    list.push(change)
    groups.set(change.contractNumber, list)
  }

  return (
    <Card>
      <SectionHeader
        title="Proposed / unconfirmed changes"
        hint="Letters, drafts and unsigned amendments — not part of the active terms"
        aside={
          <span className="text-xs text-ink-muted">
            {result.pendingChanges.length} item
            {result.pendingChanges.length === 1 ? '' : 's'}
          </span>
        }
      />

      {result.pendingChanges.length === 0 ? (
        <p className="px-4 py-6 text-sm text-ink-muted">
          No proposed or unconfirmed changes detected for the loaded documents.
        </p>
      ) : (
        <div className="grid gap-3 p-4 md:grid-cols-2">
          {Array.from(groups.entries()).map(([number, changes]) => (
            <div
              key={number}
              className="rounded-md border border-line bg-paper/50"
            >
              <div className="border-b border-line px-3 py-2">
                <span className="font-mono text-sm font-semibold">{number}</span>
              </div>
              <ul className="divide-y divide-line">
                {changes.map((change, index) => (
                  <li key={`${change.field}-${change.source.fileName}-${index}`}>
                    <button
                      type="button"
                      onClick={(event) =>
                        onInspect(makePendingTarget(change), event.currentTarget)
                      }
                      className={`flex w-full flex-col gap-1.5 px-3 py-2.5 text-left transition-colors hover:bg-accent-50 ${FOCUS_RING}`}
                    >
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-ink">
                          {FIELD_LABEL[change.field]}
                        </span>
                        <Badge tone={evidenceTone(change.evidence)}>
                          {EVIDENCE_LABEL[change.evidence]}
                        </Badge>
                      </span>
                      <span className="flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
                        <span className="tabular-nums">
                          {valueLabel(change, change.currentValue)}
                        </span>
                        <span aria-hidden="true">→</span>
                        <span className="font-semibold tabular-nums text-warn-700">
                          {valueLabel(change, change.proposedValue)}
                        </span>
                      </span>
                      <span className="truncate font-mono text-xs text-ink-faint">
                        {change.source.fileName}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
