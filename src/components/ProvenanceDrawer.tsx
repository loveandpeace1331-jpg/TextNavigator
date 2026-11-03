'use client'

import { useEffect, useId, useRef } from 'react'
import type { PendingChange, Provenance } from '@/lib/types'
import {
  Badge,
  DOC_KIND_LABEL,
  DOC_STATUS_LABEL,
  EVIDENCE_LABEL,
  FOCUS_RING,
  evidenceTone,
  formatDateISO,
  formatFieldValue,
  kindTone,
  statusTone,
  type DrawerTarget,
} from './ui'

function HighlightedParagraph({
  paragraph,
  quote,
}: {
  paragraph: string
  quote: string
}) {
  if (!quote || !paragraph.includes(quote) || quote === paragraph) {
    return (
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
        {paragraph}
      </p>
    )
  }
  const index = paragraph.indexOf(quote)
  const before = paragraph.slice(0, index)
  const after = paragraph.slice(index + quote.length)
  return (
    <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
      {before}
      <mark className="rounded bg-accent-100 px-0.5 font-medium text-ink">
        {quote}
      </mark>
      {after}
    </p>
  )
}

function ProvenanceEntry({
  entry,
  index,
}: {
  entry: Provenance
  index: number
}) {
  return (
    <li className="relative rounded-md border border-line bg-paper/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-ink text-[11px] font-semibold text-white">
          {index + 1}
        </span>
        <span className="truncate font-mono text-xs font-semibold text-ink">
          {entry.fileName}
        </span>
        <Badge tone={kindTone(entry.docKind)}>
          {DOC_KIND_LABEL[entry.docKind]}
        </Badge>
        <Badge tone={statusTone(entry.docStatus)}>
          {DOC_STATUS_LABEL[entry.docStatus]}
        </Badge>
        <span className="ml-auto text-xs tabular-nums text-ink-muted">
          {entry.docDate ? formatDateISO(entry.docDate) : 'no date'}
        </span>
      </div>

      <p className="mt-2 text-xs font-medium text-accent-700">{entry.rule}</p>

      <div className="mt-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
          Exact quote
        </p>
        <blockquote className="mt-1 border-l-2 border-accent-600 pl-2.5">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
            <mark className="rounded bg-accent-100 px-0.5 font-medium text-ink">
              {entry.quote}
            </mark>
          </p>
        </blockquote>
      </div>

      <div className="mt-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
          Context paragraph
        </p>
        {entry.quote === entry.paragraph ? (
          <p className="mt-1 text-xs italic text-ink-faint">
            The exact quote is the full source paragraph.
          </p>
        ) : (
          <div className="mt-1">
            <HighlightedParagraph
              paragraph={entry.paragraph}
              quote={entry.quote}
            />
          </div>
        )}
      </div>
    </li>
  )
}

function PendingList({ changes }: { changes: PendingChange[] }) {
  if (changes.length === 0) return null
  return (
    <div className="mt-5">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
        Unconfirmed changes for this field
      </h3>
      <ul className="mt-2 space-y-2">
        {changes.map((change, index) => (
          <li
            key={`${change.contractNumber}-${change.field}-${change.source.fileName}-${index}`}
            className="rounded-md border border-warn-100 bg-warn-50 p-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="warn">unconfirmed</Badge>
              <Badge tone={evidenceTone(change.evidence)}>
                {EVIDENCE_LABEL[change.evidence]}
              </Badge>
              <span className="truncate font-mono text-xs text-ink-muted">
                {change.source.fileName}
              </span>
            </div>
            <p className="mt-1.5 text-sm text-ink">
              <span className="tabular-nums text-ink-muted">
                {formatFieldValue(change.field, change.currentValue)}
              </span>
              <span aria-hidden="true" className="px-1.5 text-ink-faint">
                →
              </span>
              <span className="font-semibold tabular-nums text-warn-700">
                {formatFieldValue(change.field, change.proposedValue)}
              </span>
            </p>
            <p className="mt-1 text-xs text-warn-700">{change.source.rule}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ProvenanceDrawer({
  target,
  returnFocus,
  onClose,
}: {
  target: DrawerTarget | null
  returnFocus: HTMLElement | null
  onClose: () => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const open = target !== null

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const nodes = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (!nodes || nodes.length === 0) return
      const list = Array.from(nodes)
      const first = list[0]
      const last = list[list.length - 1]
      const active = document.activeElement
      if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      returnFocus?.focus?.()
    }
  }, [open, onClose, returnFocus])

  if (!target) return null

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-ink/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-xl border border-line bg-surface shadow-2xl sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[min(580px,94vw)] sm:rounded-none sm:border-y-0 sm:border-r-0"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <h2 id={titleId} className="text-sm font-semibold text-ink">
              {target.label}
            </h2>
            <p className="mt-0.5 truncate text-xs text-ink-muted">
              {target.context}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border border-line text-ink-muted transition-colors hover:bg-paper hover:text-ink ${FOCUS_RING}`}
          >
            <span aria-hidden="true" className="text-lg leading-none">
              ×
            </span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div
            className={`rounded-md border px-3 py-2.5 ${
              target.status === 'no_data'
                ? 'border-line bg-paper/60'
                : 'border-accent-100 bg-accent-50'
            }`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
              {target.valueCaption}
            </p>
            <p
              className={
                target.status === 'no_data'
                  ? 'mt-1 text-lg font-semibold italic text-ink-faint'
                  : 'mt-1 text-lg font-semibold tabular-nums text-ink'
              }
            >
              {target.valueLabel}
            </p>
            {target.status === 'no_data' && target.reason ? (
              <p className="mt-1.5 text-sm text-ink-muted">{target.reason}</p>
            ) : null}
          </div>

          <h3 className="mt-5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
            Provenance chain — base → applied amendments
          </h3>
          {target.provenance.length === 0 ? (
            <p className="mt-2 rounded-md border border-line bg-paper/60 px-3 py-2 text-sm text-ink-muted">
              No source evidence was found in the loaded documents.
            </p>
          ) : (
            <ol className="mt-2 space-y-2">
              {target.provenance.map((entry, index) => (
                <ProvenanceEntry
                  key={`${entry.fileName}-${index}`}
                  entry={entry}
                  index={index}
                />
              ))}
            </ol>
          )}

          <PendingList changes={target.pending} />
        </div>
      </div>
    </div>
  )
}
