#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const args = process.argv.slice(2);
const dbArgumentIndex = args.indexOf('--db');
const explicitDbPath = dbArgumentIndex >= 0 ? args[dbArgumentIndex + 1] : null;

if (dbArgumentIndex >= 0 && !explicitDbPath) {
  throw new Error('Indica una ruta después de --db.');
}

const dbFilePath = path.resolve(
  explicitDbPath || path.join(__dirname, '..', '.data', 'coopmanager-demo.db'),
);
const canOverwrite = args.includes('--force') || !explicitDbPath;

if (fs.existsSync(dbFilePath) && explicitDbPath && !canOverwrite) {
  throw new Error(`La base ${dbFilePath} ya existe. Usa --force para reemplazarla.`);
}

function dateFromOffset(monthOffset, day = 10) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthOffset, day))
    .toISOString()
    .slice(0, 10);
}

function monthFromOffset(monthOffset) {
  return dateFromOffset(monthOffset, 1).slice(0, 7);
}

function timestamp(date) {
  return `${date}T12:00:00.000Z`;
}

function addMonths(date, months) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1 + months, day)).toISOString().slice(0, 10);
}

function calculateSchedule(amount, monthlyInterestRate, termMonths, startDate, transferFee) {
  const retention = amount * 0.01;
  const totalInterest = amount * (monthlyInterestRate / 100) * termMonths;
  const totalAmount = Math.round((amount + retention + totalInterest + transferFee) * 100) / 100;
  const monthlyPayment = Math.ceil((totalAmount / termMonths) * 100) / 100;
  const monthlyRate = monthlyInterestRate / 100;
  let remainingBalance = amount;

  const schedule = Array.from({ length: termMonths }, (_, index) => {
    const installmentNumber = index + 1;
    const interest = Math.round(remainingBalance * monthlyRate * 100) / 100;
    const principal = Math.round((monthlyPayment - interest) * 100) / 100;
    remainingBalance = Math.round((remainingBalance - principal) * 100) / 100;

    if (installmentNumber === termMonths) remainingBalance = 0;

    return {
      installmentNumber,
      dueDate: addMonths(startDate, installmentNumber),
      principal,
      interest,
      transferFee,
      payment: monthlyPayment,
      balance: Math.max(0, remainingBalance),
      status: 'pending',
    };
  });

  return { retention, totalInterest: Math.round(totalInterest * 100) / 100, totalAmount, monthlyPayment, schedule };
}

const config = {
  monthlyShareAmount: 25,
  monthlyExpenseAmount: 5,
  penaltyAmount: 5,
  penaltyDayThreshold: 3,
  monthlyInterestRate: 1,
  currencySymbol: '$',
  currencyCode: 'USD',
  transferFee: 0.41,
  retentionRate: 1,
  openingBalance: 1500,
  loanPaymentDueDay: 18,
};

const createdAt = timestamp(dateFromOffset(-6, 1));
const members = [
  { id: 'demo-member-ana', name: 'Ana Martínez', phone: '809-555-0101', joinDate: dateFromOffset(-18, 5), status: 'active', notes: 'Tesorera de la cooperativa.' },
  { id: 'demo-member-carlos', name: 'Carlos Rodríguez', phone: '809-555-0102', joinDate: dateFromOffset(-14, 12), status: 'active', notes: 'Pago por transferencia.' },
  { id: 'demo-member-daniela', name: 'Daniela Pérez', phone: '809-555-0103', joinDate: dateFromOffset(-11, 8), status: 'active', notes: 'Tiene un aporte vencido.' },
  { id: 'demo-member-diego', name: 'Diego Santos', phone: '809-555-0104', joinDate: dateFromOffset(-9, 20), status: 'active', notes: 'Préstamo activo.' },
  { id: 'demo-member-elena', name: 'Elena Gómez', phone: '809-555-0105', joinDate: dateFromOffset(-7, 15), status: 'active', notes: 'Préstamo liquidado.' },
  { id: 'demo-member-federico', name: 'Federico Núñez', phone: '809-555-0106', joinDate: dateFromOffset(-20, 2), status: 'inactive', notes: 'Retirado; devolución registrada.' },
];

function contribution(memberId, monthOffset, status = 'paid', penaltyAmount = 0) {
  const month = monthFromOffset(monthOffset);
  const shareAmount = 25;
  const expenseAmount = 5;
  const totalAmount = shareAmount + expenseAmount + penaltyAmount;
  const paid = status === 'paid';

  return {
    id: `demo-contribution-${memberId}-${month}`,
    memberId,
    month,
    shareAmount,
    expenseAmount,
    penaltyAmount,
    totalAmount,
    status,
    dueDate: `${month}-05`,
    ...(paid ? { paidDate: `${month}-04` } : {}),
    createdAt: timestamp(`${month}-01`),
  };
}

const contributions = [
  ...[-3, -2, -1, 0].map(offset => contribution('demo-member-ana', offset)),
  ...[-3, -2, -1].map(offset => contribution('demo-member-carlos', offset)),
  contribution('demo-member-carlos', 0, 'pending'),
  contribution('demo-member-daniela', -3),
  contribution('demo-member-daniela', -2),
  contribution('demo-member-daniela', -1, 'late', 5),
  contribution('demo-member-daniela', 0, 'pending'),
  contribution('demo-member-diego', -3),
  contribution('demo-member-diego', -2),
  contribution('demo-member-diego', -1, 'pending'),
  contribution('demo-member-diego', 0, 'pending'),
  ...[-3, -2, -1, 0].map(offset => contribution('demo-member-elena', offset)),
  contribution('demo-member-federico', -14),
  contribution('demo-member-federico', -13),
];

const contributionsByMember = new Map();
for (const item of contributions.filter(item => item.status === 'paid')) {
  contributionsByMember.set(item.memberId, (contributionsByMember.get(item.memberId) || 0) + item.totalAmount);
}

const finalizedMembers = members.map(member => ({
  ...member,
  totalContributions: contributionsByMember.get(member.id) || 0,
  currentBalance: contributionsByMember.get(member.id) || 0,
  createdAt,
  updatedAt: timestamp(dateFromOffset(-1, 15)),
}));

function loan({ id, memberId, amount, rate, termMonths, startDate, paidInstallments, retentionPaid, notes, status }) {
  const calculation = calculateSchedule(amount, rate, termMonths, startDate, config.transferFee);
  const schedule = calculation.schedule.map((entry, index) => ({
    ...entry,
    status: index < paidInstallments ? 'paid' : 'pending',
    ...(index < paidInstallments ? { paidDate: entry.dueDate } : {}),
  }));
  const remainingPrincipal = schedule
    .filter(entry => entry.status === 'pending')
    .reduce((sum, entry) => sum + entry.payment, 0);
  const fullyPaid = paidInstallments === termMonths;
  const member = finalizedMembers.find(item => item.id === memberId);

  return {
    id,
    memberId,
    memberName: member.name,
    amount,
    monthlyInterestRate: rate,
    termMonths,
    monthlyPayment: calculation.monthlyPayment,
    transferFee: config.transferFee,
    totalInterest: calculation.totalInterest,
    totalAmount: calculation.totalAmount,
    retentionAmount: Math.round(calculation.retention * 100) / 100,
    retentionPaid,
    paidPrincipal: fullyPaid ? calculation.totalAmount : Math.round((calculation.totalAmount - remainingPrincipal) * 100) / 100,
    remainingPrincipal: fullyPaid ? 0 : Math.round(remainingPrincipal * 100) / 100,
    paidInstallments,
    totalInstallments: termMonths,
    startDate,
    endDate: schedule[schedule.length - 1].dueDate,
    status,
    notes,
    schedule,
    createdAt: timestamp(startDate),
  };
}

const loans = [
  loan({
    id: 'demo-loan-diego-active',
    memberId: 'demo-member-diego',
    amount: 1200,
    rate: 1,
    termMonths: 12,
    startDate: dateFromOffset(-5, 15),
    paidInstallments: 3,
    retentionPaid: true,
    status: 'active',
    notes: 'Compra de herramientas de trabajo.',
  }),
  loan({
    id: 'demo-loan-elena-paid',
    memberId: 'demo-member-elena',
    amount: 600,
    rate: 1,
    termMonths: 6,
    startDate: dateFromOffset(-9, 15),
    paidInstallments: 6,
    retentionPaid: true,
    status: 'paid',
    notes: 'Préstamo finalizado correctamente.',
  }),
  loan({
    id: 'demo-loan-carlos-retention',
    memberId: 'demo-member-carlos',
    amount: 800,
    rate: 1,
    termMonths: 8,
    startDate: dateFromOffset(-1, 15),
    paidInstallments: 0,
    retentionPaid: false,
    status: 'pending_retention',
    notes: 'Pendiente del pago de retención.',
  }),
];

let transactionNumber = 0;
function transaction(type, amount, description, date, referenceId) {
  transactionNumber += 1;
  return {
    id: `demo-transaction-${String(transactionNumber).padStart(3, '0')}`,
    type,
    amount: Math.round(amount * 100) / 100,
    description,
    ...(referenceId ? { referenceId } : {}),
    date,
    createdAt: timestamp(date),
  };
}

const transactions = [
  ...contributions
    .filter(item => item.status === 'paid')
    .map(item => transaction('contribution', item.totalAmount, `Aporte mensual ${item.month}`, item.paidDate)),
  transaction('manual_adjustment', 1500, 'Saldo inicial de demostración', dateFromOffset(-6, 1)),
  ...loans.flatMap(item => {
    const result = [
      transaction('loan_approval', -item.amount, `Desembolso de préstamo a ${item.memberName}`, item.startDate, item.id),
    ];
    if (item.retentionPaid) {
      result.push(transaction('retention', item.retentionAmount, `Retención por suministros - ${item.memberName}`, item.startDate, item.id));
    }
    for (const entry of item.schedule.filter(entry => entry.status === 'paid')) {
      result.push(transaction('loan_payment', item.monthlyPayment + item.transferFee, `Pago cuota ${entry.installmentNumber} - ${item.memberName}`, entry.paidDate, item.id));
    }
    return result;
  }),
];

const expenses = [
  { id: 'demo-expense-001', description: 'Papelería y suministros', amount: 42.5, category: 'supplies', date: dateFromOffset(-2, 12), notes: 'Compra de material para reuniones.', createdAt: timestamp(dateFromOffset(-2, 12)) },
  { id: 'demo-expense-002', description: 'Servicio de mensajería', amount: 18, category: 'services', date: dateFromOffset(-1, 8), notes: 'Envío de documentación.', createdAt: timestamp(dateFromOffset(-1, 8)) },
  { id: 'demo-expense-003', description: 'Mantenimiento de impresora', amount: 65, category: 'maintenance', date: dateFromOffset(0, 3), notes: 'Revisión preventiva.', createdAt: timestamp(dateFromOffset(0, 3)) },
];

transactions.push(
  ...expenses.map(item => transaction('expense', -item.amount, item.description, item.date, item.id)),
);

const refunds = [
  {
    id: 'demo-refund-federico',
    memberId: 'demo-member-federico',
    memberName: 'Federico Núñez',
    reason: 'Retiro voluntario de la cooperativa.',
    amount: 60,
    depositDate: dateFromOffset(-5, 20),
    createdAt: timestamp(dateFromOffset(-5, 20)),
    updatedAt: timestamp(dateFromOffset(-5, 20)),
  },
];

transactions.push(transaction('refund', -60, 'Devolución por retiro - Federico Núñez', refunds[0].depositDate, refunds[0].id));

const activities = [
  { id: 'demo-activity-001', type: 'member_add', description: 'Datos de demostración cargados', details: JSON.stringify({ source: 'seed:demo' }), timestamp: timestamp(dateFromOffset(-6, 1)) },
  { id: 'demo-activity-002', type: 'loan_add', description: 'Préstamo aprobado: Diego Santos - $1200', referenceId: 'demo-loan-diego-active', timestamp: timestamp(loans[0].startDate) },
  { id: 'demo-activity-003', type: 'loan_pay', description: 'Cuota pagada: Diego Santos - Cuota 3/12', referenceId: 'demo-loan-diego-active', timestamp: timestamp(loans[0].schedule[2].paidDate) },
  { id: 'demo-activity-004', type: 'expense_add', description: 'Gasto registrado: Mantenimiento de impresora - $65', referenceId: 'demo-expense-003', timestamp: timestamp(expenses[2].date) },
  { id: 'demo-activity-005', type: 'refund_add', description: 'Devolución registrada: Federico Núñez - $60', referenceId: 'demo-refund-federico', timestamp: timestamp(refunds[0].depositDate) },
];

const data = {
  coopmanager_config: config,
  coopmanager_fontSize: { base: 1, step: 0.1, min: 0.8, max: 1.4 },
  coopmanager_theme: { mode: 'light' },
  coopmanager_members: finalizedMembers,
  coopmanager_loans: loans,
  coopmanager_contributions: contributions,
  coopmanager_expenses: expenses,
  coopmanager_transactions: transactions,
  coopmanager_refunds: refunds,
  coopmanager_activities: activities,
  coopmanager_cashbox: 0,
};

fs.mkdirSync(path.dirname(dbFilePath), { recursive: true });
for (const suffix of ['', '-wal', '-shm']) {
  const candidate = `${dbFilePath}${suffix}`;
  if (fs.existsSync(candidate)) fs.rmSync(candidate);
}

const db = new Database(dbFilePath);
db.exec('CREATE TABLE kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);');
const insert = db.prepare('INSERT INTO kv(key, value) VALUES(?, ?)');
const writeSeed = db.transaction(() => {
  for (const [key, value] of Object.entries(data)) {
    insert.run(key, JSON.stringify(value));
  }
});
writeSeed();
db.close();

console.log(`Datos de demostración creados en: ${dbFilePath}`);
console.log(`Socios: ${finalizedMembers.length} | Préstamos: ${loans.length} | Aportes: ${contributions.length}`);
