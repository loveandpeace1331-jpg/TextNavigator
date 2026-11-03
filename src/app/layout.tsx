import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = {
  title: 'TextNavigator — реестр действующих условий договоров поставки',
  description:
    'Реестр договоров поставки: активные условия, предлагаемые изменения и проверяемые источники каждого значения.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen">{children}</body>
    </html>
  )
}
