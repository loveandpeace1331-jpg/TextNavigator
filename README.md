# TextNavigator

A client-side procurement register. Upload a set of `.txt` contract documents and
TextNavigator reconstructs the **active** contract terms as of a check date, showing
which document each value came from.

Everything runs locally in the browser. No server, no API keys, no network calls:
uploaded text never leaves the page.

## Requirements

- Node.js 20+ (developed on Node 22)
- npm

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

Other scripts:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm test` | Parser test suite (Vitest) |
| `npm run lint` | ESLint |

## How to use

1. Drag the `.txt` files onto the drop area, or use **Select files**.
2. The register fills in: one row per contract, plus quick answers and a separate
   list of unconfirmed proposals.
3. Click any **amount**, any **deadline**, or any **quick answer** to open the
   provenance drawer: file name, document kind and status, the exact quoted
   snippet, the surrounding paragraph, and the rule that produced the value.
4. Change the **check date** to re-resolve the register without re-uploading.

Sample documents live in `../testDocs`. Loading all six (check date 10.03.2026)
produces:

| Contract | Supplier | Total (RUB) | Delivery | Unconfirmed |
| --- | --- | --- | --- | --- |
| STN-101 | ООО «Вектор Прибор» | 1 380 000 ₽ | 30.04.2026 | 2 |
| STN-102 | ООО «Контур Электро» | 840 000 ₽ | 20.03.2026 | 1 |
| STN-103 | ООО «ПромСнаб Сервис» | no data | 30.04.2026 | 0 |

## How priority is decided

Only an amendment that is **signed** and whose **effective date is on or before the
check date** changes a contract. A later signed amendment supersedes an earlier one.

- `letter` → proposal only, never applied.
- `draft_amendment` / unsigned → proposal only, never applied.
- `amendment` + signed + effective date ≤ check date → applied.

Proposals are never silently dropped: they appear in the **Proposed / unconfirmed
changes** section and in the status column.

Nothing is inferred from file names or upload order. Documents are classified from
their header text, contract numbers from their content, and values from their
clauses. Renaming the files or uploading them in a different order does not change
any result.

When a value is genuinely absent from the provided text, the app shows **no data**
and explains why, rather than guessing. For example STN-103 prices the contract by a
specification appendix that is not part of the upload, so its amount is `no data`;
the `600 000 ₽` figure in that document is an internal budget limit, explicitly not
an agreed contract value, and is never used.

### Guarded cases

The parser deliberately rejects near-miss numbers:

- advance payments ("входит в общую стоимость") are not the contract total;
- budget or purchase limits ("не является согласованной стоимостью") are not the total;
- payment deadlines ("срок оплаты, а не поставки") and acceptance dates are not the
  delivery deadline;
- penalty rates are not totals.

## Architecture

```
src/lib/types.ts          Shared contract: all domain types + entry point signatures
src/lib/parse/
  classify.ts             Document kind, status, contract reference, number
  extract.ts              Amount, deadline, supplier, dates, paragraph splitting
  resolve.ts              applyDocuments(): base + signed amendments in force → active terms
  questions.ts            answerQuestions(): Q1–Q4 derived from the resolved result
  index.ts                Public API
src/app/                  Next.js App Router shell (page, layout, styles)
src/components/           Dropzone, ContractTable, QuestionsPanel, PendingChanges, ProvenanceDrawer
```

The UI contains no parsing logic. It calls `analyzeDocuments(files, checkDate)` and
`answerQuestions(result, checkDate)` and renders the result, so the rules above can
be tested without a browser.

## Tests

```bash
npm test
```

The suite loads `../testDocs`, asserts the expected table and answers, and checks:

- file-name and upload-order independence;
- every provenance quote is a real substring of its source file and points at a real
  paragraph;
- quotes are the decisive clause only — they never contain the advance-payment,
  budget-limit or payment-deadline numbers;
- `600000`, `252000` and `10.04.2026` never leak into the active terms;
- removing the signature from the STN-101 amendment reverts the contract to
  `1 200 000 ₽` / `15.04.2026` and turns the amendment into a pending proposal.

## Assumptions

- Documents are Russian-language `.txt` files using the conventional structure of the
  supplied corpus (заголовок, `Дата:`, `Статус:`, numbered clauses).
- The check date defaults to **10.03.2026** and is editable in the header.
- The Q4 horizon is the first day of the month following the check date, so the
  default check date yields "earlier than 01.04.2026".
- `no data` is rendered verbatim in English because the specification asks for that
  exact wording; surrounding UI copy is English.
- One contract per file.

## Limitations

- `.txt` only. PDF/DOCX/scan input is out of scope, and there is no OCR.
- Plain-text parsing cannot cover every possible phrasing. The keyword and clause
  patterns live in `src/lib/parse/extract.ts`; unusual wordings will need new
  patterns.
- Totals are taken from the stated contract value. Totals assembled arithmetically
  (unit price × quantity, price lists) are not computed.
- Delivery dates are recognised from deadline phrasings ("не позднее DD.MM.YYYY",
  "срок поставки"). Relative deadlines ("within 30 days of signing") are not resolved.
- Only RUB amounts are parsed.
- If two signed amendments in force touch the same field, the one with the later
  effective date wins; no other precedence signal is considered.
- State is in memory only: reloading the page clears the upload. Nothing is persisted.
