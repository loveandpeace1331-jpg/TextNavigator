'use client'

import { useCallback, useMemo, useState } from 'react'
import { analyzeDocuments, answerQuestions } from '@/lib/parse'
import type { UploadFile } from '@/lib/types'
import { ContractTable } from '@/components/ContractTable'
import { Dropzone } from '@/components/Dropzone'
import { PendingChanges } from '@/components/PendingChanges'
import { ProvenanceDrawer } from '@/components/ProvenanceDrawer'
import { QuestionsPanel } from '@/components/QuestionsPanel'
import {
  FOCUS_RING,
  formatDateISO,
  type DrawerTarget,
  type InspectHandler,
} from '@/components/ui'

const DEFAULT_CHECK_DATE = '2026-03-10'

interface DrawerState {
  target: DrawerTarget
  trigger: HTMLElement | null
}

export default function Page() {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [checkDate, setCheckDate] = useState(DEFAULT_CHECK_DATE)
  const [drawer, setDrawer] = useState<DrawerState | null>(null)

  const result = useMemo(
    () => analyzeDocuments(files, new Date(`${checkDate}T00:00:00Z`)),
    [files, checkDate],
  )

  const answers = useMemo(
    () => answerQuestions(result, new Date(`${checkDate}T00:00:00Z`)),
    [result, checkDate],
  )

  const openDrawer = useCallback<InspectHandler>((target, trigger) => {
    setDrawer({
      target,
      trigger:
        trigger ??
        (typeof document === 'undefined'
          ? null
          : (document.activeElement as HTMLElement | null)),
    })
  }, [])

  const closeDrawer = useCallback(() => setDrawer(null), [])

  const addFiles = useCallback((added: UploadFile[]) => {
    if (added.length === 0) return
    setFiles((previous) => [...previous, ...added])
  }, [])

  const removeFile = useCallback((index: number) => {
    setFiles((previous) => previous.filter((_, fileIndex) => fileIndex !== index))
  }, [])

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">
            TextNavigator
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-muted">
            Procurement register with traceable active terms. Only signed
            amendments in force on the check date change a contract; letters and
            drafts stay visible as unconfirmed proposals.
          </p>
        </div>

        <div className="flex items-center gap-4 rounded-lg border border-line bg-surface px-4 py-2.5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
              Check date
            </p>
            <p className="mt-0.5 text-base font-semibold tabular-nums text-ink">
              as of {formatDateISO(checkDate)}
            </p>
          </div>
          <label className="flex flex-col gap-1 text-[11px] font-medium uppercase tracking-wide text-ink-muted">
            <span className="sr-only">Check date</span>
            <input
              type="date"
              value={checkDate}
              onChange={(event) =>
                setCheckDate(event.target.value || DEFAULT_CHECK_DATE)
              }
              className={`rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm font-medium text-ink ${FOCUS_RING}`}
            />
          </label>
        </div>
      </header>

      <div className="mt-6 space-y-5">
        <Dropzone
          documents={result.documents}
          warnings={result.warnings}
          onAdd={addFiles}
          onRemove={removeFile}
        />

        <ContractTable
          result={result}
          checkDate={checkDate}
          onInspect={openDrawer}
        />

        <QuestionsPanel
          answers={answers}
          result={result}
          checkDate={checkDate}
          onInspect={openDrawer}
        />

        <PendingChanges result={result} onInspect={openDrawer} />
      </div>

      <p className="mt-6 text-xs text-ink-faint">
        Parsing runs locally in the browser. File names and upload order do not
        determine document priority.
      </p>

      <ProvenanceDrawer
        target={drawer?.target ?? null}
        returnFocus={drawer?.trigger ?? null}
        onClose={closeDrawer}
      />
    </main>
  )
}
