export type Role = "Owner" | "Admin" | "Employee";
export type AccountType = "Cash" | "Bank" | "Wallet" | "Other";
export type EntryType = "Income" | "Expense" | "Transfer";
export type RecordStatus = "Active" | "Inactive";
export type PartyType = "Customer" | "Vendor" | "Both";
export type InvoiceStatus =
  "Draft" | "Sent" | "Partially Paid" | "Paid" | "Cancelled";
export type BillStatus =
  "Draft" | "Received" | "Partially Paid" | "Paid" | "Cancelled";
export type PaymentStatus = "Recorded" | "Reversed";
export type DocumentType =
  | "Invoice"
  | "Bill"
  | "Receipt"
  | "Expense"
  | "Income"
  | "Statement"
  | "Unknown"
  | "Other";
export type ProcessingStatus =
  "Uploaded" | "Processing" | "Processed" | "Failed";
export type ConversionStatus = "Not converted" | "Converted";

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  openingBalance: string;
  currentBalance: string;
  description?: string;
  status: RecordStatus;
  isSystem?: boolean;
}
export interface Category {
  id: string;
  name: string;
  type: "Income" | "Expense";
  description?: string;
  status: RecordStatus;
  isSystem?: boolean;
}
export interface Party {
  id: string;
  name: string;
  company?: string;
  type: PartyType;
  email?: string;
  phone?: string;
  address?: string;
  taxNumber?: string;
  notes?: string;
  status: RecordStatus;
}
export interface Transaction {
  id: string;
  date: string;
  type: EntryType;
  description: string;
  accountId: string;
  destinationAccountId?: string;
  categoryId?: string;
  amount: string;
  currency: string;
  status: "Posted" | "Voided";
  reference?: string;
  source:
    "manual" | "invoice-payment" | "bill-payment" | "recurring" | "document";
  createdBy: string;
  voidReason?: string;
  sourceDocumentId?: string;
}
export interface Payment {
  id: string;
  date: string;
  amount: string;
  accountId: string;
  categoryId?: string;
  reference?: string;
  notes?: string;
  status: PaymentStatus;
  transactionId?: string;
  reversedAt?: string;
  reversalTransactionId?: string;
}
export interface LineItem {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  categoryId?: string;
}
export interface Invoice {
  id: string;
  number: string;
  partyId: string;
  issueDate: string;
  dueDate: string;
  items: LineItem[];
  subtotal: string;
  discountRate: string;
  taxRate: string;
  discountAmount: string;
  taxAmount: string;
  total: string;
  paid: string;
  balance: string;
  status: InvoiceStatus;
  notes?: string;
  terms?: string;
  payments: Payment[];
  sourceDocumentId?: string;
}
export interface Bill {
  id: string;
  number: string;
  partyId: string;
  billDate: string;
  dueDate: string;
  items: LineItem[];
  subtotal: string;
  discountRate: string;
  taxRate: string;
  discountAmount: string;
  taxAmount: string;
  total: string;
  paid: string;
  balance: string;
  status: BillStatus;
  notes?: string;
  terms?: string;
  payments: Payment[];
  sourceDocumentId?: string;
}
export interface RecurringRule {
  id: string;
  type: EntryType;
  amount: string;
  description: string;
  accountId: string;
  destinationAccountId?: string;
  categoryId?: string;
  frequency: "Daily" | "Weekly" | "Monthly" | "Yearly" | "Custom";
  intervalDays?: number;
  startDate: string;
  endDate?: string;
  nextRunDate: string;
  isActive: boolean;
  executionCount: number;
  lastExecutedAt?: string;
  lastExecutionError?: string;
}
export interface DocumentItem {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  type: DocumentType;
  processingStatus: ProcessingStatus;
  classification: DocumentType;
  confidence: number;
  conversionStatus: ConversionStatus;
  convertedRecordType?: "Invoice" | "Bill" | "Transaction";
  convertedRecordId?: string;
  extracted: Record<string, string>;
  rawText: string;
}
export interface InventoryMovement {
  id: string;
  date: string;
  type: "Purchase" | "Sale" | "Adjustment" | "Return";
  quantityDelta: number;
  previousQuantity: number;
  newQuantity: number;
  unitCost: string;
  reference?: string;
  notes?: string;
}
export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  description?: string;
  unit: string;
  quantity: number;
  reorderLevel: number;
  unitCost: string;
  currency: string;
  status: RecordStatus;
  movements: InventoryMovement[];
}
export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: "Information" | "Success" | "Warning" | "Action required";
  createdAt: string;
  readAt?: string;
  href?: string;
}
export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: RecordStatus;
  lastLoginAt?: string;
  createdAt: string;
}
export interface AuditLog {
  id: string;
  createdAt: string;
  user: string;
  action: string;
  method: string;
  path: string;
  statusCode: number;
  resourceType?: string;
  resourceId?: string;
  ip?: string;
  metadata?: string;
}
export interface CurrencyRate {
  id: string;
  baseCurrency: string;
  quoteCurrency: string;
  rate: string;
  effectiveAt: string;
  source: string;
}
export interface BusinessSettings {
  name: string;
  country: string;
  currency: string;
  timezone: string;
}
export interface SubscriptionInfo {
  plan: "Free" | "Starter" | "Pro" | "Business";
  status: "Active" | "Trial" | "Past due" | "Cancelled";
  periodStart: string;
  periodEnd: string;
  usersLimit: number;
  documentsLimit: number;
  usersUsed: number;
  documentsUsed: number;
}

export interface AppData {
  accounts: Account[];
  categories: Category[];
  parties: Party[];
  transactions: Transaction[];
  invoices: Invoice[];
  bills: Bill[];
  recurring: RecurringRule[];
  documents: DocumentItem[];
  inventory: InventoryItem[];
  notifications: NotificationItem[];
  team: TeamMember[];
  auditLogs: AuditLog[];
  currencyRates: CurrencyRate[];
  settings: BusinessSettings;
  subscription: SubscriptionInfo;
  emailVerified: boolean;
  mfaEnabled: boolean;
}
