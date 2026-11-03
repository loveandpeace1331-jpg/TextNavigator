'use client'

import type { AnalysisResult, ContractSummary, PendingChange } from '@/lib/types'
import {
  Badge,
  Card,
  DOC_STATUS_WORD,
  FIELD_LABEL,
  FOCUS_RING,
  InspectHandler,
  RU_PLURAL,
  SectionHeader,
  countRu,
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
  if (!active) return { label: 'Нет данных', tone: 'muted' }
  const statusWord = base ? DOC_STATUS_WORD[base.status] : 'подписан'
  return { label: `Действует · ${statusWord}`, tone: 'positive' }
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
        title="Договоры"
        hint={`Действующие условия на ${dateLabel}`}
        aside={
          <span className="text-xs text-ink-muted">
            {countRu(contracts.length, RU_PLURAL.contract)}
          </span>
        }
      />

      {contracts.length === 0 ? (
        <p className="px-4 py-6 text-sm text-ink-muted">
          Договоры не обнаружены. Загрузите файлы .txt, чтобы построить реестр.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-ink-muted">
                <th scope="col" className="px-3 py-2.5 font-medium">
                  Номер договора
                </th>
                <th scope="col" className="px-3 py-2.5 font-medium">
                  Поставщик
                </th>
                <th scope="col" className="px-3 py-2.5 font-medium">
                  Сумма, ₽ на {dateLabel}
                </th>
                <th scope="col" className="px-3 py-2.5 font-medium">
                  Срок поставки на {dateLabel}
                </th>
                <th scope="col" className="px-3 py-2.5 font-medium">
                  Статус / несогласованные изменения
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
                const needsVerification =
                  amount.status === 'no_data' || deadline.status === 'no_data'

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
                        <span className="italic text-ink-faint">нет данных</span>
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
                              label: FIELD_LABEL.amount,
                              context: `${contract.number} · на ${dateLabel}`,
                              contractNumber: contract.number,
                              status: amount.status,
                              valueLabel:
                                amount.status === 'no_data'
                                  ? 'нет данных'
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
                            ? (amount.reason ?? 'нет данных')
                            : 'Показать источники'
                        }
                        aria-label={
                          amount.status === 'no_data'
                            ? `Сумма, ₽ по договору ${contract.number}: нет данных. ${amount.reason ?? ''}`
                            : `Сумма, ₽ по договору ${contract.number}: ${formatRub(amount.value as number)}. Показать источники.`
                        }
                        className={CELL_BUTTON}
                      >
                        {amount.status === 'no_data' ? (
                          <span className="italic text-ink-faint">нет данных</span>
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
                              label: FIELD_LABEL.deliveryDeadline,
                              context: `${contract.number} · на ${dateLabel}`,
                              contractNumber: contract.number,
                              status: deadline.status,
                              valueLabel:
                                deadline.status === 'no_data'
                                  ? 'нет данных'
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
                            ? (deadline.reason ?? 'нет данных')
                            : 'Показать источники'
                        }
                        aria-label={
                          deadline.status === 'no_data'
                            ? `Срок поставки по договору ${contract.number}: нет данных. ${deadline.reason ?? ''}`
                            : `Срок поставки по договору ${contract.number}: ${formatDateISO(deadline.value as string)}. Показать источники.`
                        }
                        className={CELL_BUTTON}
                      >
                        {deadline.status === 'no_data' ? (
                          <span className="italic text-ink-faint">нет данных</span>
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
                        {needsVerification ? (
                          <Badge tone="warn">Требуется проверка</Badge>
                        ) : null}
                        {contract.pendingChanges.length > 0 ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              if (!firstPending) return
                              onInspect(
                                makeFieldTarget({
                                  key: `${contract.number}:pending`,
                                  label: `${FIELD_LABEL[firstPending.field]} — предложенное изменение`,
                                  context: `${contract.number} · несогласованные предложения`,
                                  contractNumber: contract.number,
                                  valueCaption: 'Предложенное значение',
                                  status: 'active',
                                  valueLabel: formatPendingValue(firstPending),
                                  reason: null,
                                  provenance: [firstPending.source],
                                  pending: contract.pendingChanges,
                                }),
                                event.currentTarget,
                              )
                            }}
                            title="Открыть первое несогласованное изменение и показать все предложения"
                            className={`inline-flex items-center gap-1 rounded text-left ${FOCUS_RING}`}
                          >
                            <Badge tone="warn">
                              {countRu(contract.pendingChanges.length, RU_PLURAL.change)} · не согласовано
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
  if (change.proposedValue === null) return 'нет данных'
  if (change.field === 'amount') return formatRub(change.proposedValue as number)
  return formatDateISO(change.proposedValue as string)
}
