# Loan module adjustments (CoopManager)

Objective: apply the "Guía Completa de Ajustes y Mejoras: Módulo de Préstamos" to the loan module.
Branch: `feat/loan-module-adjustments` · Delivery: ask-on-risk · Test runner: none in repo (functional checks via scratch esbuild script + `pnpm build` + `git diff --check`).

## Specs

- S1 Retention (creation): "la opción de cobrar la retención por suministros **no debe ser obligatoria**"; "El prestamista tendrá la opción de seleccionarla o activarla si desea cobrarla"; "Por defecto, esta opción debe estar **siempre desmarcada** ("No pagar" / inactiva)". Assumption: retention amount uses `config.retentionRate`; when not charged the loan is active immediately with retention 0. Legacy `pending_retention` loans can be charged or waived.
- S2 Capital column: "la columna de **Capital** debe sumar exactamente el valor total del préstamo (ej. si se prestan $100,00, la suma de toda la columna de capital debe dar exactamente $100,00)"; "El monto prestado debe distribuirse de forma uniforme entre el número de meses del plazo".
- S3 Transfer cost: "Quien administra el sistema debe poder modificar libremente la cantidad del costo de transferencia"; "El valor de la transferencia (ingresado en centavos, ej. $0,41) **no se cobra en un solo pago**, sino que se divide proporcionalmente entre la cantidad de meses del plazo." Example: "Préstamo de **$100,00** a **3 meses** con un costo de transferencia de **$0,41**" → "**$103,41** en total" → "La cuota mensual fija resultante debe ser de **$34,47** ($103,41 / 3 meses)".
- S4 Summary views: cuota mensual "(ej. $34,47)"; "El **saldo pendiente inicial** debe reflejar el total real a cobrar (ej. $103,41)"; "bajando de $103,41 a $68,94 tras el primer pago"; "El indicador visual de retención debe adaptarse correctamente según la decisión inicial del prestamista de cobrarla o no."
- S5 Detail & payments: operative "botón operativo en la vista detallada del préstamo para registrar los abonos"; paid installment goes "de *Pendiente* a **Pagado** y cambiar automáticamente a **color verde**"; a payment can be edited or "**eliminarlo**", and on delete the value is restored to saldo pendiente and general records so "**no existan desfases en la caja**".
- S6 Metrics: "**Tarjeta de Activos:** Debe mostrar únicamente la cantidad exacta de préstamos que se encuentran vigentes"; "**Tarjeta de Por Cobrar:** Debe reflejar el saldo acumulado real que falta por cobrar de todos los préstamos activos ... (ej. tomando en cuenta los $103,41 totales ...)"; deleting a payment adds the value back.
- S7 "Solucionar el error por el cual el saldo pendiente mostraba `0,00` de forma estática".
- S8 Gear menu "al lado del estado de cada préstamo": "**Editar:** Permite corregir rápidamente errores de digitación"; "**Eliminar (Tacho de basura):** Permite borrar el préstamo **únicamente si no tiene ningún pago registrado**, solicitando obligatoriamente una confirmación previa"; "Cualquier operación (crear, modificar, eliminar o registrar/quitar pagos) debe mantener la caja cuadrada de forma estricta". Assumption: once a loan has payments only notes are editable (financial fields would desync paid rows).

## Tasks

- T1 [S2,S3] Schedule math: flat interest, capital/interest/transfer split evenly with remainder on last row, retention removed from total, transfer fee is a per-loan total — route inline — high risk item 1 (stored loan semantics) — status: done (RED base: total 104.41, cuota 34.81, capital 33.81/34.15/34.49; GREEN: 103.41 / 34.47 / 33.33+33.34+33.33)
- T2 [S1,S5,S6,S8] Store actions: optional retention, cash-neutral delete/edit, per-installment pay/edit/delete with transaction links, vigente helpers — route inline — status: done (scratch store harness: all cash/saldo assertions pass)
- T3 [S1,S3,S4,S5,S6,S7,S8] Loans UI: form (transfer cost, retention off by default), gear menu, detail table with per-row payment actions, metrics; dashboard/excel use vigente helper; seed script aligned — route inline — status: done (browser smoke via Playwright on dev server)

## Log

- L1 (2026-11-02) User request: "Me pasaron esto:" followed by the full guide "📋 Guía Completa de Ajustes y Mejoras: Módulo de Préstamos (CoopManager)" sections 1–8 (quoted in Specs).
- L2 Findings: `calculateFrenchAmortization` adds 1% retention into total and charges transfer per installment; metrics/summary filter only `status === 'active'` so default `pending_retention` loans show 0; `deleteLoanPayment` deletes the payment transaction and also adds a negative adjustment (double subtraction); `deleteLoan` removes the disbursement transaction and also adds a positive adjustment (double restore).
- L3 Route: all tasks inline (no writer trigger: units are interdependent). No test runner exists; RED/GREEN replaced by scratch functional script outside the worktree.
- L4 Verification: scratch harness (outside repo) bundled with vite SSR exercised math for 6 term/fee combos and store flows (create without retention, pay, edit penalty, delete payment, pay all, reopen, edit with retention, delete loan, legacy pending_retention waive, legacy unlinked payment delete) — ALL CHECKS PASSED. Browser smoke: example loan shows cuota $34,47 / total $103,41; Activos 1 / Por Cobrar $103,41; saldo 103,41→68,94; paid row green; gear menu Editar/Eliminar (Eliminar disabled with payments); cash -100 → -60,53 (payment+multa) → -100 (payment deleted) → 0 (loan deleted). `pnpm build` OK, `git diff --check` OK.
- L5 Decisions: payments are per installment (free-amount prepayment removed); with payments only notes are editable; legacy `pending_retention` loans can be charged or waived; payment/retention/disbursement transactions carry `referenceId` so deletes remove them instead of adding compensating entries.
