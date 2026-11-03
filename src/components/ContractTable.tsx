'use client'

import type { AnalysisResult, ContractSummary, PendingChange } from '@/lib/types'
import {
  Badge,
  Card,
  FOCUS_RING,
  InspectHandler,
  SectionHeader,
  formatDateISO,
  formatRub,
  makeFieldTarget,
} from './ui'

function pendingFor(
  contract: ContractSummary,
  field: PendingChange['field'],
): PendingChange[] {
  return contract.pendingChanges.filter((change) => change.field === field)
}

function contractStatus(
  result: AnalysisResult,
  contract: ContractSummary,
): { label: string; tone: 'positive' | 'muted' } {
  const base = result.documents.find(
    (doc) => doc.kind === 'contract' && doc.contractRef === contract.number,
  )
  const active =
    contract.amount.status === 'active' ||
    contract.deliveryDeadline.status === 'active'
  if (!active) return { label: 'No data', tone: 'muted' }
  return { label: `Active · ${base ? base.status : 'signed'}`, tone: 'positive' }
}

const CELL_BUTTON =
  `block w-full rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent-50 ${FOCUS_RING}`

export function ContractTable({
  result,
  checkDate,
  onInspect,
}: {
  result: AnalysisResult
  checkDate: string
  onInspect: InspectHandler
}) {
  const dateLabel = formatDateISO(checkDate)
  const { contracts } = result

  return (
    <Card>
      <SectionHeader
        title="Contracts"
        hint={`Active terms as of ${dateLabel}`}
        aside={
          <span className="text-xs text-ink-muted">
            {contracts.length} contract{contracts.length === 1 ? '' : 's'}
          </span>
        }
      />

      {contracts.length === 0 ? (
        <p className="px-4 py-6 text-sm text-ink-muted">
          No contracts detected yet. Load .txt files to build the register.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-ink-muted">
                <th scope="col" className="px-3 py-2.5 font-medium">
                  Contract number
                </th>
                <th scope="col" className="px-3 py-2.5 font-medium">
                  Supplier
                </th>
                <th scope="col" className="px-3 py-2.5 font-medium">
                  Total amount (RUB) as of {dateLabel}
                </th>
                <th scope="col" className="px-3 py-2.5 font-medium">
                  Delivery deadline as of {dateLabel}
                </th>
                <th scope="col" className="px-3 py-2.5 font-medium">
                  Status / Unconfirmed changes
                </th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((contract) => {
                const amount = contract.amount
                const deadline = contract.deliveryDeadline
                const supplier = contract.supplier
                const [firstPending] = contract.pendingChanges
                const status = contractStatus(result, contract)

                return (
                  <tr
                    key={contract.number}
                    className="border-b border-line/70 align-top last:border-0"
                  >
                    <th
                      scope="row"
                      className="whitespace-nowrap px-3 py-3 text-left font-mono text-sm font-semibold"
                    >
                      {contract.number}
                    </th>

                    <td className="px-3 py-3 text-ink">
                      {supplier.status === 'no_data' ? (
                        <span className="italic text-ink-faint">no data</span>
                      ) : (
                        supplier.value
                      )}
                    </td>

                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={(event) =>
                          onInspect(
                            makeFieldTarget({
                              key: `${contract.number}:amount`,
                              label: 'Total amount (RUB)',
                              context: `${contract.number} · as of ${dateLabel}`,
                              status: amount.status,
                              valueLabel:
                                amount.status === 'no_data'
                                  ? 'no data'
                                  : formatRub(amount.value as number),
                              reason: amount.reason,
                              provenance: amount.provenance,
                              pending: pendingFor(contract, 'amount'),
                            }),
                            event.currentTarget,
                          )
                        }
                        title={
                          amount.status === 'no_data'
                            ? (amount.reason ?? 'no data')
                            : 'Show sources'
                        }
                        aria-label={
                          amount.status === 'no_data'
                            ? `Total amount for ${contract.number}: no data. ${amount.reason ?? ''}`
                            : `Total amount for ${contract.number}: ${formatRub(amount.value as number)}. Show sources.`
                        }
                        className={CELL_BUTTON}
                      >
                        {amount.status === 'no_data' ? (
                          <span className="italic text-ink-faint">no data</span>
                        ) : (
                          <span className="font-semibold tabular-nums">
                            {formatRub(amount.value as number)}
                          </span>
                        )}
                      </button>
                    </td>

                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={(event) =>
                          onInspect(
                            makeFieldTarget({
                              key: `${contract.number}:deliveryDeadline`,
                              label: 'Delivery deadline',
                              context: `${contract.number} · as of ${dateLabel}`,
                              status: deadline.status,
                              valueLabel:
                                deadline.status === 'no_data'
                                  ? 'no data'
                                  : formatDateISO(deadline.value as string),
                              reason: deadline.reason,
                              provenance: deadline.provenance,
                              pending: pendingFor(contract, 'deliveryDeadline'),
                            }),
                            event.currentTarget,
                          )
                        }
                        title={
                          deadline.status === 'no_data'
                            ? (deadline.reason ?? 'no data')
                            : 'Show sources'
                        }
                        aria-label={
                          deadline.status === 'no_data'
                            ? `Delivery deadline for ${contract.number}: no data. ${deadline.reason ?? ''}`
                            : `Delivery deadline for ${contract.number}: ${formatDateISO(deadline.value as string)}. Show sources.`
                        }
                        className={CELL_BUTTON}
                      >
                        {deadline.status === 'no_data' ? (
                          <span className="italic text-ink-faint">no data</span>
                        ) : (
                          <span className="font-semibold tabular-nums">
                            {formatDateISO(deadline.value as string)}
                          </span>
                        )}
                      </button>
                    </td>

                    <td className="px-3 py-3">
                      <div className="flex flex-col items-start gap-1.5">
                        <Badge tone={status.tone}>{status.label}</Badge>
                        {contract.pendingChanges.length > 0 ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              if (!firstPending) return
                              onInspect(
                                makeFieldTarget({
                                  key: `${contract.number}:pending`,
                                  label: `${
                                    firstPending.field === 'amount'
                                      ? 'Total amount (RUB)'
                                      : 'Delivery deadline'
                                  } — proposed change`,
                                  context: `${contract.number} · unconfirmed proposals`,
                                  valueCaption: 'Proposed value',
                                  status: 'active',
                                  valueLabel: formatPendingValue(firstPending),
                                  reason: null,
                                  provenance: [firstPending.source],
                                  pending: contract.pendingChanges,
                                }),
                                event.currentTarget,
                              )
                            }}
                            title="Open the first unconfirmed change and list all proposals"
                            className={`inline-flex items-center gap-1 rounded text-left ${FOCUS_RING}`}
                          >
                            <Badge tone="warn">
                              {contract.pendingChanges.length} unconfirmed change
                              {contract.pendingChanges.length === 1 ? '' : 's'}
                            </Badge>
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function formatPendingValue(change: PendingChange): string {
  if (change.proposedValue === null) return 'no data'
  if (change.field === 'amount') return formatRub(change.proposedValue as number)
  return formatDateISO(change.proposedValue as string)
}
