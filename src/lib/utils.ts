import Decimal from 'decimal.js';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
export function uid(prefix = 'id') { return `${prefix}_${Math.random().toString(36).slice(2, 8)}_${Date.now().toString(36)}`; }
export function money(value: string | number, currency = 'PKR', digits = 2) {
  const n = new Decimal(String(value || 0));
  try {
    return `${currency} ${n.toDecimalPlaces(digits, Decimal.ROUND_HALF_UP).toNumber().toLocaleString('en-PK', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
  } catch { return `${currency} ${n.toFixed(digits)}`; }
}
export function amount(value: string | number) { return new Decimal(String(value || 0)); }
export function formatDate(date?: string) {
  if (!date) return '—';
  const parsed = new Date(date.includes('T') ? date : `${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
export function formatDateTime(date?: string) {
  if (!date) return '—';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
export function todayIso() { return new Date().toISOString().slice(0, 10); }
export function currentDateTime() { return new Date().toISOString(); }
export function calcLineAmount(quantity: string | number, price: string | number) {
  return new Decimal(String(quantity || 0)).mul(String(price || 0)).toDecimalPlaces(2).toFixed(2);
}
export function calcDocumentTotals(items: { quantity: string; unitPrice: string }[], discountRate: string, taxRate: string) {
  const subtotal = items.reduce((sum, item) => sum.plus(new Decimal(item.quantity || 0).mul(item.unitPrice || 0)), new Decimal(0));
  const discountAmount = subtotal.mul(new Decimal(discountRate || 0).div(100));
  const taxable = Decimal.max(subtotal.minus(discountAmount), 0);
  const taxAmount = taxable.mul(new Decimal(taxRate || 0).div(100));
  const total = taxable.plus(taxAmount);
  return { subtotal: subtotal.toDecimalPlaces(2).toFixed(2), discountAmount: discountAmount.toDecimalPlaces(2).toFixed(2), taxAmount: taxAmount.toDecimalPlaces(2).toFixed(2), total: total.toDecimalPlaces(2).toFixed(2) };
}
export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map(row => row.map(cell => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}
export function printPage() { window.print(); }
