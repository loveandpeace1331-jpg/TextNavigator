'use client'

import { useCallback, useRef, useState, type DragEvent } from 'react'
import type { SourceDoc, UploadFile } from '@/lib/types'
import {
  Badge,
  Card,
  DOC_KIND_LABEL,
  DOC_STATUS_LABEL,
  FOCUS_RING,
  RU_PLURAL,
  countRu,
  kindTone,
  statusTone,
} from './ui'

export function Dropzone({
  documents,
  warnings,
  onAdd,
  onRemove,
}: {
  documents: SourceDoc[]
  warnings: string[]
  onAdd: (files: UploadFile[]) => void
  onRemove: (index: number) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)

  const ingest = useCallback(
    async (list: FileList | null) => {
      if (!list || list.length === 0) return
      const files = await Promise.all(
        Array.from(list).map(async (file) => ({
          name: file.name,
          text: await file.text(),
        })),
      )
      onAdd(files)
    },
    [onAdd],
  )

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      setDragActive(false)
      void ingest(event.dataTransfer.files)
    },
    [ingest],
  )

  const empty = documents.length === 0

  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold tracking-tight">Документы</h2>
        <p className="text-xs text-ink-muted">
          {documents.length === 0
            ? 'Файлы не загружены'
            : `Загружено: ${countRu(documents.length, RU_PLURAL.document)}`}
        </p>
      </div>

      <div className="p-4">
        <div
          onDragOver={(event) => {
            event.preventDefault()
            setDragActive(true)
          }}
          onDragLeave={(event) => {
            event.preventDefault()
            setDragActive(false)
          }}
          onDrop={onDrop}
          className={`rounded-md border-2 border-dashed px-4 py-6 text-center transition-colors ${
            dragActive
              ? 'border-accent-600 bg-accent-50'
              : 'border-line-strong bg-paper/60'
          }`}
        >
          <p className="text-sm font-medium text-ink">
            Перетащите файлы договоров сюда
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            Несколько файлов .txt. Тип и статус документа определяются по
            тексту, а не по имени файла.
          </p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={`mt-3 inline-flex items-center rounded-md border border-line-strong bg-surface px-3 py-1.5 text-sm font-medium text-ink shadow-sm transition-colors hover:bg-paper ${FOCUS_RING}`}
          >
            Выбрать файлы
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".txt,text/plain"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => {
              void ingest(event.target.files)
              event.target.value = ''
            }}
          />
        </div>

        {empty ? (
          <div className="mt-4 rounded-md border border-line bg-paper/60 px-4 py-5 text-sm text-ink-muted">
            <p className="font-medium text-ink">Документы ещё не загружены</p>
            <p className="mt-1">
              Загрузите шесть исходных файлов, чтобы построить реестр.
              Действующие условия, предложения и обоснования появятся здесь
              автоматически.
            </p>
          </div>
        ) : (
          <ul className="mt-4 flex flex-wrap gap-2" aria-label="Загруженные документы">
            {documents.map((doc, index) => (
              <li
                key={doc.id}
                className="flex items-center gap-2 rounded-md border border-line bg-paper/70 py-1 pl-2.5 pr-1"
              >
                <span className="max-w-[220px] truncate font-mono text-xs text-ink">
                  {doc.fileName}
                </span>
                <span className="text-ink-faint" aria-hidden="true">
                  ·
                </span>
                <Badge tone={kindTone(doc.kind)}>
                  {DOC_KIND_LABEL[doc.kind]}
                </Badge>
                <Badge tone={statusTone(doc.status)}>
                  {DOC_STATUS_LABEL[doc.status]}
                </Badge>
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  aria-label={`Удалить ${doc.fileName}`}
                  className={`ml-0.5 inline-flex h-6 w-6 items-center justify-center rounded text-ink-faint transition-colors hover:bg-zinc-200 hover:text-ink ${FOCUS_RING}`}
                >
                  <span aria-hidden="true" className="text-base leading-none">
                    ×
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {warnings.length > 0 ? (
          <div
            role="status"
            className="mt-4 rounded-md border border-warn-100 bg-warn-50 px-3 py-2.5"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-warn-700">
              Требуется проверка
            </p>
            <ul className="mt-1 space-y-1 text-sm text-warn-700">
              {warnings.map((warning, index) => (
                <li key={`${warning}-${index}`} className="flex gap-2">
                  <span aria-hidden="true">–</span>
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Card>
  )
}
