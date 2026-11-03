import type { AnalysisResult, FieldValue, QuestionAnswers } from '../types'

function missing<T>(reason: string): FieldValue<T> {
  return { value: null, status: 'no_data', reason, provenance: [] }
}

export function answerQuestions(result: AnalysisResult, checkDate: Date): QuestionAnswers {
  const byNumber = new Map(result.contracts.map((c) => [c.number, c]))

  const q1 = byNumber.get('STN-101')?.deliveryDeadline ?? missing<string>('Договор STN-101 не найден.')
  const q2 = byNumber.get('STN-102')?.amount ?? missing<number>('Договор STN-102 не найден.')
  const q3 = byNumber.get('STN-103')?.amount ?? missing<number>('Договор STN-103 не найден.')

  const boundary = new Date(Date.UTC(checkDate.getUTCFullYear(), checkDate.getUTCMonth() + 1, 1))
  const boundaryISO = boundary.toISOString().slice(0, 10)

  const earlierThan = result.contracts
    .filter((c) => c.deliveryDeadline.value !== null && c.deliveryDeadline.value < boundaryISO)
    .sort((a, b) => {
      const left = a.deliveryDeadline.value as string
      const right = b.deliveryDeadline.value as string
      if (left < right) return -1
      if (left > right) return 1
      return 0
    })
    .map((c) => ({ number: c.number, date: c.deliveryDeadline.value as string }))

  const unconfirmed = result.pendingChanges.filter((p) => p.field === 'deliveryDeadline')

  return { q1, q2, q3, q4: { earlierThan, unconfirmed } }
}
