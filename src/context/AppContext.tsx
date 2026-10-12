import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Decimal from "decimal.js";
import { cloneSeed } from "@/data/mock";
import { currentDateTime, todayIso, uid } from "@/lib/utils";
import type {
  Account,
  AppData,
  Bill,
  Category,
  CurrencyRate,
  DocumentItem,
  EntryType,
  Invoice,
  InventoryItem,
  InventoryMovement,
  NotificationItem,
  Party,
  Payment,
  RecurringRule,
  Role,
  TeamMember,
  Transaction,
} from "@/types";

type Toast = {
  id: string;
  title: string;
  description?: string;
  tone: "success" | "error" | "info";
};
type ToastInput = Omit<Toast, "id">;
type CreateTransactionInput = Omit<
  Transaction,
  "id" | "status" | "createdBy" | "source"
> & { source?: Transaction["source"] };
type InvoiceInput = Omit<
  Invoice,
  "id" | "number" | "status" | "paid" | "balance" | "payments"
> & { status?: Invoice["status"]; sourceDocumentId?: string };
type BillInput = Omit<
  Bill,
  "id" | "number" | "status" | "paid" | "balance" | "payments"
> & { status?: Bill["status"]; sourceDocumentId?: string };

type AppContextValue = {
  data: AppData;
  role: Role;
  setRole: (role: Role) => void;
  signedIn: boolean;
  signIn: (role?: Role) => void;
  signOut: () => void;
  toast: (input: ToastInput) => void;
  dismissToast: (id: string) => void;
  toasts: Toast[];
  resetDemo: () => void;
  addTransaction: (input: CreateTransactionInput) => Transaction;
  voidTransaction: (id: string, reason: string) => void;
  addAccount: (
    input: Omit<Account, "id" | "currentBalance" | "status"> & {
      status?: Account["status"];
    },
  ) => void;
  updateAccount: (id: string, patch: Partial<Account>) => void;
  toggleAccount: (id: string) => void;
  addCategory: (input: Omit<Category, "id" | "status" | "isSystem">) => void;
  updateCategory: (id: string, patch: Partial<Category>) => void;
  toggleCategory: (id: string) => void;
  addParty: (input: Omit<Party, "id" | "status">) => void;
  updateParty: (id: string, patch: Partial<Party>) => void;
  toggleParty: (id: string) => void;
  addInvoice: (input: InvoiceInput) => Invoice;
  updateInvoice: (id: string, patch: Partial<Invoice>) => void;
  sendInvoice: (id: string) => void;
  cancelInvoice: (id: string) => void;
  addInvoicePayment: (
    id: string,
    input: Omit<Payment, "id" | "status" | "transactionId">,
  ) => void;
  reverseInvoicePayment: (invoiceId: string, paymentId: string) => void;
  addBill: (input: BillInput) => Bill;
  updateBill: (id: string, patch: Partial<Bill>) => void;
  receiveBill: (id: string) => void;
  cancelBill: (id: string) => void;
  addBillPayment: (
    id: string,
    input: Omit<Payment, "id" | "status" | "transactionId">,
  ) => void;
  reverseBillPayment: (billId: string, paymentId: string) => void;
  addRecurring: (
    input: Omit<RecurringRule, "id" | "executionCount" | "isActive"> & {
      isActive?: boolean;
    },
  ) => void;
  updateRecurring: (id: string, patch: Partial<RecurringRule>) => void;
  executeRecurring: (id: string) => void;
  addDocument: (
    input: Pick<
      DocumentItem,
      "name" | "originalName" | "mimeType" | "size" | "type"
    >,
  ) => DocumentItem;
  processDocument: (id: string) => void;
  updateDocumentReview: (
    id: string,
    extracted: Record<string, string>,
    classification?: DocumentItem["classification"],
  ) => void;
  markDocumentConverted: (
    id: string,
    type: DocumentItem["convertedRecordType"],
    recordId: string,
  ) => void;
  removeDocument: (id: string) => void;
  addInventoryItem: (
    input: Omit<InventoryItem, "id" | "movements" | "status">,
  ) => void;
  updateInventoryItem: (id: string, patch: Partial<InventoryItem>) => void;
  adjustInventory: (
    id: string,
    input: Omit<InventoryMovement, "id" | "previousQuantity" | "newQuantity">,
  ) => void;
  markNotificationRead: (id: string) => void;
  addTeamMember: (
    input: Omit<TeamMember, "id" | "createdAt" | "status"> & {
      status?: TeamMember["status"];
    },
  ) => void;
  updateTeamMember: (id: string, patch: Partial<TeamMember>) => void;
  toggleTeamMember: (id: string) => void;
  updateSettings: (patch: Partial<AppData["settings"]>) => void;
  addCurrencyRate: (input: Omit<CurrencyRate, "id">) => void;
  setMfaEnabled: (enabled: boolean) => void;
  setEmailVerified: (enabled: boolean) => void;
  changePlan: (plan: AppData["subscription"]["plan"]) => void;
};
const AppContext = createContext<AppContextValue | null>(null);
const STORAGE_KEY = "northstar-finance-demo-data-v1";
const ROLE_KEY = "northstar-finance-demo-role";
const SESSION_KEY = "northstar-finance-demo-session";

function loadSeed(): AppData {
  if (typeof window === "undefined") return cloneSeed();
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) as AppData;
  } catch {
    /* reset invalid local demo state */
  }
  return cloneSeed();
}
function loadRole(): Role {
  if (typeof window === "undefined") return "Owner";
  const role = window.localStorage.getItem(ROLE_KEY);
  return role === "Admin" || role === "Employee" ? role : "Owner";
}
function accountById(data: AppData, id: string) {
  return data.accounts.find((a) => a.id === id);
}
function adjustAccount(data: AppData, id: string, delta: Decimal) {
  const account = accountById(data, id);
  if (account)
    account.currentBalance = new Decimal(account.currentBalance)
      .plus(delta)
      .toDecimalPlaces(2)
      .toFixed(2);
}
function createAudit(
  data: AppData,
  action: string,
  method: string,
  path: string,
  resourceType?: string,
  resourceId?: string,
  metadata?: string,
) {
  data.auditLogs.unshift({
    id: uid("audit"),
    createdAt: currentDateTime(),
    user: "Ayesha Rahman",
    action,
    method,
    path,
    statusCode: 200,
    resourceType,
    resourceId,
    ip: "192.0.2.10",
    metadata,
  });
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(loadSeed);
  const [role, setRoleState] = useState<Role>(loadRole);
  const [signedIn, setSignedIn] = useState(() =>
    typeof window === "undefined"
      ? true
      : window.localStorage.getItem(SESSION_KEY) !== "false",
  );
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* storage is optional for the demo */
    }
  }, [data]);
  const toast = useCallback((input: ToastInput) => {
    const id = uid("toast");
    setToasts((prev) => [...prev, { ...input, id }]);
    window.setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      4200,
    );
  }, []);
  const dismissToast = useCallback(
    (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id)),
    [],
  );
  const setRole = useCallback((next: Role) => {
    setRoleState(next);
    try {
      localStorage.setItem(ROLE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);
  const signIn = useCallback(
    (nextRole: Role = "Owner") => {
      setRole(nextRole);
      setSignedIn(true);
      try {
        localStorage.setItem(SESSION_KEY, "true");
      } catch {
        /* ignore */
      }
    },
    [setRole],
  );
  const signOut = useCallback(() => {
    setSignedIn(false);
    try {
      localStorage.setItem(SESSION_KEY, "false");
    } catch {
      /* ignore */
    }
  }, []);
  const resetDemo = useCallback(() => {
    setData(cloneSeed());
    setRole("Owner");
    toast({
      title: "Demo data reset",
      description: "The workspace has been restored to its sample data.",
      tone: "success",
    });
  }, [setRole, toast]);

  const addTransaction = useCallback(
    (input: CreateTransactionInput) => {
      const created: Transaction = {
        ...input,
        id: uid("txn"),
        status: "Posted",
        createdBy:
          role === "Owner"
            ? "Ayesha Rahman"
            : role === "Admin"
              ? "Hamza Siddiqui"
              : "Mariam Khan",
        source: input.source ?? "manual",
      };
      setData((prev) => {
        const next = structuredClone(prev) as AppData;
        const amount = new Decimal(created.amount);
        if (created.type === "Income")
          adjustAccount(next, created.accountId, amount);
        else if (created.type === "Expense")
          adjustAccount(next, created.accountId, amount.negated());
        else {
          adjustAccount(next, created.accountId, amount.negated());
          if (created.destinationAccountId)
            adjustAccount(next, created.destinationAccountId, amount);
        }
        next.transactions.unshift(created);
        createAudit(
          next,
          "transaction.created",
          "POST",
          "/api/v1/transactions",
          "Transaction",
          created.id,
          `${created.type} ${created.amount} ${created.currency}`,
        );
        return next;
      });
      toast({
        title: "Transaction created",
        description: `${created.type} transaction saved in this demo workspace.`,
        tone: "success",
      });
      return created;
    },
    [role, toast],
  );

  const voidTransaction = useCallback(
    (id: string, reason: string) => {
      setData((prev) => {
        const next = structuredClone(prev) as AppData;
        const tx = next.transactions.find((t) => t.id === id);
        if (!tx || tx.status === "Voided") return prev;
        const value = new Decimal(tx.amount);
        if (tx.type === "Income")
          adjustAccount(next, tx.accountId, value.negated());
        else if (tx.type === "Expense")
          adjustAccount(next, tx.accountId, value);
        else {
          adjustAccount(next, tx.accountId, value);
          if (tx.destinationAccountId)
            adjustAccount(next, tx.destinationAccountId, value.negated());
        }
        tx.status = "Voided";
        tx.voidReason = reason;
        createAudit(
          next,
          "transaction.voided",
          "POST",
          `/api/v1/transactions/${id}/void`,
          "Transaction",
          id,
          reason,
        );
        return next;
      });
      toast({
        title: "Transaction voided",
        description: "The transaction remains in the history with its reason.",
        tone: "success",
      });
    },
    [toast],
  );

  const addAccount = useCallback(
    (
      input: Omit<Account, "id" | "currentBalance" | "status"> & {
        status?: Account["status"];
      },
    ) =>
      setData((prev) => {
        const next = structuredClone(prev) as AppData;
        const item: Account = {
          ...input,
          id: uid("acc"),
          currentBalance: input.openingBalance,
          status: input.status ?? "Active",
        };
        next.accounts.unshift(item);
        createAudit(
          next,
          "account.created",
          "POST",
          "/api/v1/accounts",
          "Account",
          item.id,
          item.name,
        );
        return next;
      }),
    [],
  );
  const updateAccount = useCallback(
    (id: string, patch: Partial<Account>) =>
      setData((prev) => {
        const next = structuredClone(prev) as AppData;
        const item = next.accounts.find((x) => x.id === id);
        if (item)
          Object.assign(item, patch, {
            id: item.id,
            currentBalance: item.currentBalance,
            openingBalance: item.openingBalance,
            isSystem: item.isSystem,
          });
        return next;
      }),
    [],
  );
  const toggleAccount = useCallback(
    (id: string) =>
      setData((prev) => {
        const next = structuredClone(prev) as AppData;
        const item = next.accounts.find((x) => x.id === id);
        if (item && !item.isSystem) {
          const wouldDeactivate = item.status === "Active";
          if (wouldDeactivate && Number(item.currentBalance) !== 0) return prev;
          item.status = wouldDeactivate ? "Inactive" : "Active";
        }
        return next;
      }),
    [],
  );
  const addCategory = useCallback(
    (input: Omit<Category, "id" | "status" | "isSystem">) =>
      setData((prev) => {
        const next = structuredClone(prev) as AppData;
        next.categories.unshift({ ...input, id: uid("cat"), status: "Active" });
        return next;
      }),
    [],
  );
  const updateCategory = useCallback(
    (id: string, patch: Partial<Category>) =>
      setData((prev) => {
        const next = structuredClone(prev) as AppData;
        const item = next.categories.find((x) => x.id === id && !x.isSystem);
        if (item) Object.assign(item, patch, { id: item.id, isSystem: false });
        return next;
      }),
    [],
  );
  const toggleCategory = useCallback(
    (id: string) =>
      setData((prev) => {
        const next = structuredClone(prev) as AppData;
        const item = next.categories.find((x) => x.id === id && !x.isSystem);
        if (item)
          item.status = item.status === "Active" ? "Inactive" : "Active";
        return next;
      }),
    [],
  );
  const addParty = useCallback(
    (input: Omit<Party, "id" | "status">) =>
      setData((prev) => {
        const next = structuredClone(prev) as AppData;
        next.parties.unshift({ ...input, id: uid("party"), status: "Active" });
        return next;
      }),
    [],
  );
  const updateParty = useCallback(
    (id: string, patch: Partial<Party>) =>
      setData((prev) => {
        const next = structuredClone(prev) as AppData;
        const item = next.parties.find((x) => x.id === id);
        if (item) Object.assign(item, patch, { id: item.id });
        return next;
      }),
    [],
  );
  const toggleParty = useCallback(
    (id: string) =>
      setData((prev) => {
        const next = structuredClone(prev) as AppData;
        const item = next.parties.find((x) => x.id === id);
        if (item)
          item.status = item.status === "Active" ? "Inactive" : "Active";
        return next;
      }),
    [],
  );

  const addInvoice = useCallback(
    (input: InvoiceInput) => {
      const id = uid("inv");
      const number = `INV-${String(Date.now()).slice(-6)}`;
      const invoice: Invoice = {
        ...input,
        id,
        number,
        status: input.status ?? "Draft",
        paid: "0.00",
        balance: input.total,
        payments: [],
      };
      setData((prev) => {
        const next = structuredClone(prev) as AppData;
        next.invoices.unshift(invoice);
        createAudit(
          next,
          "invoice.created",
          "POST",
          "/api/v1/invoices",
          "Invoice",
          id,
          number,
        );
        return next;
      });
      toast({
        title: "Invoice saved",
        description: `${number} is ready for review.`,
        tone: "success",
      });
      return invoice;
    },
    [toast],
  );
  const updateInvoice = useCallback(
    (id: string, patch: Partial<Invoice>) =>
      setData((prev) => {
        const next = structuredClone(prev) as AppData;
        const item = next.invoices.find((x) => x.id === id);
        if (item && item.status === "Draft") {
          Object.assign(item, patch, {
            id: item.id,
            number: item.number,
            payments: item.payments,
            paid: item.paid,
            balance: item.balance,
            status: item.status,
          });
          item.balance = new Decimal(item.total).minus(item.paid).toFixed(2);
        }
        return next;
      }),
    [],
  );
  const sendInvoice = useCallback(
    (id: string) =>
      setData((prev) => {
        const next = structuredClone(prev) as AppData;
        const item = next.invoices.find((x) => x.id === id);
        if (item && item.status === "Draft") item.status = "Sent";
        return next;
      }),
    [],
  );
  const cancelInvoice = useCallback(
    (id: string) =>
      setData((prev) => {
        const next = structuredClone(prev) as AppData;
        const item = next.invoices.find((x) => x.id === id);
        if (item && item.paid === "0.00" && item.status !== "Paid")
          item.status = "Cancelled";
        return next;
      }),
    [],
  );
  const addInvoicePayment = useCallback(
    (id: string, input: Omit<Payment, "id" | "status" | "transactionId">) => {
      const currentInvoice = data.invoices.find((invoice) => invoice.id === id);
      const currentAccount = data.accounts.find(
        (account) => account.id === input.accountId,
      );
      const paymentAmount = new Decimal(input.amount);
      if (!currentInvoice) {
        toast({
          title: "Invoice not found",
          description: "Refresh the demo workspace and try again.",
          tone: "error",
        });
        return;
      }
      if (
        !currentAccount ||
        currentAccount.status !== "Active" ||
        currentAccount.isSystem
      ) {
        toast({
          title: "Choose an active account",
          description:
            "Select an active business account to record this payment.",
          tone: "error",
        });
        return;
      }
      if (
        paymentAmount.lte(0) ||
        paymentAmount.gt(new Decimal(currentInvoice.balance))
      ) {
        toast({
          title: "Payment not saved",
          description:
            "Payment must be positive and cannot exceed the invoice balance.",
          tone: "error",
        });
        return;
      }
      setData((prev) => {
        const next = structuredClone(prev) as AppData;
        const invoice = next.invoices.find((item) => item.id === id);
        if (
          !invoice ||
          paymentAmount.lte(0) ||
          paymentAmount.gt(new Decimal(invoice.balance))
        )
          return prev;
        adjustAccount(next, input.accountId, paymentAmount);
        const tx: Transaction = {
          id: uid("txn"),
          date: input.date,
          type: "Income",
          description: `Invoice ${invoice.number} payment`,
          accountId: input.accountId,
          categoryId: input.categoryId,
          amount: paymentAmount.toFixed(2),
          currency: currentAccount.currency,
          status: "Posted",
          reference: input.reference,
          source: "invoice-payment",
          createdBy:
            role === "Employee"
              ? "Mariam Khan"
              : role === "Admin"
                ? "Hamza Siddiqui"
                : "Ayesha Rahman",
        };
        next.transactions.unshift(tx);
        const payment: Payment = {
          ...input,
          id: uid("pay"),
          amount: paymentAmount.toFixed(2),
          status: "Recorded",
          transactionId: tx.id,
        };
        invoice.payments.unshift(payment);
        invoice.paid = new Decimal(invoice.paid).plus(paymentAmount).toFixed(2);
        invoice.balance = new Decimal(invoice.total)
          .minus(invoice.paid)
          .toFixed(2);
        invoice.status = new Decimal(invoice.balance).eq(0)
          ? "Paid"
          : "Partially Paid";
        createAudit(
          next,
          "invoice.payment.recorded",
          "POST",
          `/api/v1/invoices/${id}/payments`,
          "InvoicePayment",
          payment.id,
          `${payment.amount} for ${invoice.number}`,
        );
        return next;
      });
      toast({
        title: "Payment recorded",
        description:
          "The demo account balance, transaction history and invoice balance were updated.",
        tone: "success",
      });
    },
    [data.invoices, data.accounts, role, toast],
  );
  const reverseInvoicePayment = useCallback(
    (invoiceId: string, paymentId: string) => {
      setData((prev) => {
        const next = structuredClone(prev) as AppData;
        const invoice = next.invoices.find((item) => item.id === invoiceId);
        const payment = invoice?.payments.find((item) => item.id === paymentId);
        if (!invoice || !payment || payment.status === "Reversed") return prev;
        adjustAccount(
          next,
          payment.accountId,
          new Decimal(payment.amount).negated(),
        );
        const reversal: Transaction = {
          id: uid("txn"),
          date: todayIso(),
          type: "Expense",
          description: `Reversal of invoice payment ${payment.id}`,
          accountId: payment.accountId,
          categoryId: undefined,
          amount: payment.amount,
          currency:
            next.accounts.find((account) => account.id === payment.accountId)
              ?.currency || next.settings.currency,
          status: "Posted",
          reference: `REV-${payment.id}`,
          source: "manual",
          createdBy:
            role === "Employee"
              ? "Mariam Khan"
              : role === "Admin"
                ? "Hamza Siddiqui"
                : "Ayesha Rahman",
        };
        next.transactions.unshift(reversal);
        payment.status = "Reversed";
        payment.reversalTransactionId = reversal.id;
        payment.reversedAt = currentDateTime();
        invoice.paid = Decimal.max(
          new Decimal(invoice.paid).minus(payment.amount),
          0,
        ).toFixed(2);
        invoice.balance = new Decimal(invoice.total)
          .minus(invoice.paid)
          .toFixed(2);
        invoice.status = new Decimal(invoice.paid).eq(0)
          ? "Sent"
          : "Partially Paid";
        createAudit(
          next,
          "invoice.payment.reversed",
          "POST",
          `/api/v1/invoices/${invoiceId}/payments/${paymentId}/reverse`,
          "InvoicePayment",
          paymentId,
          "Payment reversed; a correcting transaction was created",
        );
        return next;
      });
      toast({
        title: "Payment reversed",
        description:
          "A correcting transaction was added; the original payment remains in history.",
        tone: "success",
      });
    },
    [role, toast],
  );

  const addBill = useCallback(
    (input: BillInput) => {
      const id = uid("bill");
      const number = `BILL-${String(Date.now()).slice(-6)}`;
      const bill: Bill = {
        ...input,
        id,
        number,
        status: input.status ?? "Draft",
        paid: "0.00",
        balance: input.total,
        payments: [],
      };
      setData((prev) => {
        const next = structuredClone(prev) as AppData;
        next.bills.unshift(bill);
        createAudit(
          next,
          "bill.created",
          "POST",
          "/api/v1/bills",
          "Bill",
          id,
          number,
        );
        return next;
      });
      toast({
        title: "Bill saved",
        description: `${number} is ready for review.`,
        tone: "success",
      });
      return bill;
    },
    [toast],
  );
  const updateBill = useCallback(
    (id: string, patch: Partial<Bill>) =>
      setData((prev) => {
        const next = structuredClone(prev) as AppData;
        const item = next.bills.find((x) => x.id === id);
        if (item && item.status === "Draft") {
          Object.assign(item, patch, {
            id: item.id,
            number: item.number,
            payments: item.payments,
            paid: item.paid,
            balance: item.balance,
            status: item.status,
          });
          item.balance = new Decimal(item.total).minus(item.paid).toFixed(2);
        }
        return next;
      }),
    [],
  );
  const receiveBill = useCallback(
    (id: string) =>
      setData((prev) => {
        const next = structuredClone(prev) as AppData;
        const item = next.bills.find((x) => x.id === id);
        if (item && item.status === "Draft") item.status = "Received";
        return next;
      }),
    [],
  );
  const cancelBill = useCallback(
    (id: string) =>
      setData((prev) => {
        const next = structuredClone(prev) as AppData;
        const item = next.bills.find((x) => x.id === id);
        if (item && item.paid === "0.00" && item.status !== "Paid")
          item.status = "Cancelled";
        return next;
      }),
    [],
  );
  const addBillPayment = useCallback(
    (id: string, input: Omit<Payment, "id" | "status" | "transactionId">) => {
      const currentBill = data.bills.find((bill) => bill.id === id);
      const currentAccount = data.accounts.find(
        (account) => account.id === input.accountId,
      );
      const paymentAmount = new Decimal(input.amount);
      if (!currentBill) {
        toast({
          title: "Bill not found",
          description: "Refresh the demo workspace and try again.",
          tone: "error",
        });
        return;
      }
      if (
        !currentAccount ||
        currentAccount.status !== "Active" ||
        currentAccount.isSystem
      ) {
        toast({
          title: "Choose an active account",
          description:
            "Select an active business account to record this payment.",
          tone: "error",
        });
        return;
      }
      if (
        paymentAmount.lte(0) ||
        paymentAmount.gt(new Decimal(currentBill.balance))
      ) {
        toast({
          title: "Payment not saved",
          description:
            "Payment must be positive and cannot exceed the bill balance.",
          tone: "error",
        });
        return;
      }
      setData((prev) => {
        const next = structuredClone(prev) as AppData;
        const bill = next.bills.find((item) => item.id === id);
        if (
          !bill ||
          paymentAmount.lte(0) ||
          paymentAmount.gt(new Decimal(bill.balance))
        )
          return prev;
        adjustAccount(next, input.accountId, paymentAmount.negated());
        const tx: Transaction = {
          id: uid("txn"),
          date: input.date,
          type: "Expense",
          description: `Bill ${bill.number} payment`,
          accountId: input.accountId,
          categoryId: input.categoryId,
          amount: paymentAmount.toFixed(2),
          currency: currentAccount.currency,
          status: "Posted",
          reference: input.reference,
          source: "bill-payment",
          createdBy:
            role === "Employee"
              ? "Mariam Khan"
              : role === "Admin"
                ? "Hamza Siddiqui"
                : "Ayesha Rahman",
        };
        next.transactions.unshift(tx);
        const payment: Payment = {
          ...input,
          id: uid("pay"),
          amount: paymentAmount.toFixed(2),
          status: "Recorded",
          transactionId: tx.id,
        };
        bill.payments.unshift(payment);
        bill.paid = new Decimal(bill.paid).plus(paymentAmount).toFixed(2);
        bill.balance = new Decimal(bill.total).minus(bill.paid).toFixed(2);
        bill.status = new Decimal(bill.balance).eq(0)
          ? "Paid"
          : "Partially Paid";
        createAudit(
          next,
          "bill.payment.recorded",
          "POST",
          `/api/v1/bills/${id}/payments`,
          "BillPayment",
          payment.id,
          `${payment.amount} for ${bill.number}`,
        );
        return next;
      });
      toast({
        title: "Payment recorded",
        description:
          "The demo account balance, transaction history and bill balance were updated.",
        tone: "success",
      });
    },
    [data.bills, data.accounts, role, toast],
  );
  const reverseBillPayment = useCallback(
    (billId: string, paymentId: string) => {
      setData((prev) => {
        const next = structuredClone(prev) as AppData;
        const bill = next.bills.find((item) => item.id === billId);
        const payment = bill?.payments.find((item) => item.id === paymentId);
        if (!bill || !payment || payment.status === "Reversed") return prev;
        adjustAccount(next, payment.accountId, new Decimal(payment.amount));
        const reversal: Transaction = {
          id: uid("txn"),
          date: todayIso(),
          type: "Income",
          description: `Reversal of bill payment ${payment.id}`,
          accountId: payment.accountId,
          categoryId: undefined,
          amount: payment.amount,
          currency:
            next.accounts.find((account) => account.id === payment.accountId)
              ?.currency || next.settings.currency,
          status: "Posted",
          reference: `REV-${payment.id}`,
          source: "manual",
          createdBy:
            role === "Employee"
              ? "Mariam Khan"
              : role === "Admin"
                ? "Hamza Siddiqui"
                : "Ayesha Rahman",
        };
        next.transactions.unshift(reversal);
        payment.status = "Reversed";
        payment.reversalTransactionId = reversal.id;
        payment.reversedAt = currentDateTime();
        bill.paid = Decimal.max(
          new Decimal(bill.paid).minus(payment.amount),
          0,
        ).toFixed(2);
        bill.balance = new Decimal(bill.total).minus(bill.paid).toFixed(2);
        bill.status = new Decimal(bill.paid).eq(0)
          ? "Received"
          : "Partially Paid";
        createAudit(
          next,
          "bill.payment.reversed",
          "POST",
          `/api/v1/bills/${billId}/payments/${paymentId}/reverse`,
          "BillPayment",
          paymentId,
          "Payment reversed; a correcting transaction was created",
        );
        return next;
      });
      toast({
        title: "Payment reversed",
        description:
          "A correcting transaction was added; the original payment remains in history.",
        tone: "success",
      });
    },
    [role, toast],
  );

  const addRecurring = useCallback(
    (
      input: Omit<RecurringRule, "id" | "executionCount" | "isActive"> & {
        isActive?: boolean;
      },
    ) =>
      setData((prev) => {
        const next = structuredClone(prev) as AppData;
        next.recurring.unshift({
          ...input,
          id: uid("rec"),
          executionCount: 0,
          isActive: input.isActive ?? true,
        });
        return next;
      }),
    [],
  );
  const updateRecurring = useCallback(
    (id: string, patch: Partial<RecurringRule>) =>
      setData((prev) => {
        const next = structuredClone(prev) as AppData;
        const item = next.recurring.find((x) => x.id === id);
        if (item)
          Object.assign(item, patch, {
            id: item.id,
            executionCount: item.executionCount,
          });
        return next;
      }),
    [],
  );
  const executeRecurring = useCallback(
    (id: string) => {
      let label = "";
      setData((prev) => {
        const next = structuredClone(prev) as AppData;
        const rule = next.recurring.find((x) => x.id === id);
        if (!rule) return prev;
        if (!rule.isActive) return prev;
        const tx: Transaction = {
          id: uid("txn"),
          date: todayIso(),
          type: rule.type,
          description: rule.description,
          accountId: rule.accountId,
          destinationAccountId: rule.destinationAccountId,
          categoryId: rule.categoryId,
          amount: rule.amount,
          currency: next.settings.currency,
          status: "Posted",
          source: "recurring",
          createdBy: "Ayesha Rahman",
        };
        const value = new Decimal(rule.amount);
        if (rule.type === "Income") adjustAccount(next, rule.accountId, value);
        else if (rule.type === "Expense")
          adjustAccount(next, rule.accountId, value.negated());
        else {
          adjustAccount(next, rule.accountId, value.negated());
          if (rule.destinationAccountId)
            adjustAccount(next, rule.destinationAccountId, value);
        }
        next.transactions.unshift(tx);
        rule.executionCount += 1;
        rule.lastExecutedAt = currentDateTime();
        const base = new Date(rule.nextRunDate || todayIso());
        if (rule.frequency === "Daily") base.setDate(base.getDate() + 1);
        else if (rule.frequency === "Weekly") base.setDate(base.getDate() + 7);
        else if (rule.frequency === "Monthly")
          base.setMonth(base.getMonth() + 1);
        else if (rule.frequency === "Yearly")
          base.setFullYear(base.getFullYear() + 1);
        else base.setDate(base.getDate() + (rule.intervalDays || 1));
        rule.nextRunDate = base.toISOString().slice(0, 10);
        if (rule.endDate && rule.nextRunDate > rule.endDate)
          rule.isActive = false;
        label = rule.description;
        createAudit(
          next,
          "recurring.executed",
          "POST",
          `/api/v1/recurring/${id}/execute`,
          "RecurringTransaction",
          id,
          label,
        );
        return next;
      });
      toast({
        title: "Recurring rule executed",
        description: label || "The transaction was created in the demo.",
        tone: "success",
      });
    },
    [toast],
  );

  const addDocument = useCallback(
    (
      input: Pick<
        DocumentItem,
        "name" | "originalName" | "mimeType" | "size" | "type"
      >,
    ) => {
      const item: DocumentItem = {
        ...input,
        id: uid("doc"),
        uploadedAt: currentDateTime(),
        processingStatus: "Uploaded",
        classification: "Unknown",
        confidence: 0,
        conversionStatus: "Not converted",
        extracted: {},
        rawText: "",
      };
      setData((prev) => {
        const next = structuredClone(prev) as AppData;
        next.documents.unshift(item);
        createAudit(
          next,
          "document.upload.initialized",
          "POST",
          "/api/v1/documents",
          "Document",
          item.id,
          item.originalName,
        );
        return next;
      });
      toast({
        title: "Document added",
        description: "This file is in the local demo workspace only.",
        tone: "success",
      });
      return item;
    },
    [toast],
  );
  const processDocument = useCallback(
    (id: string) =>
      setData((prev) => {
        const next = structuredClone(prev) as AppData;
        const doc = next.documents.find((x) => x.id === id);
        if (!doc) return prev;
        doc.processingStatus = "Processed";
        doc.classification = doc.type === "Other" ? "Unknown" : doc.type;
        doc.confidence = doc.type === "Unknown" ? 0.42 : 0.91;
        doc.extracted = {
          ...doc.extracted,
          documentNumber:
            doc.extracted.documentNumber ||
            (doc.type === "Bill"
              ? "BILL-000310"
              : doc.type === "Invoice"
                ? "INV-000188"
                : ""),
          date: doc.extracted.date || todayIso(),
          dueDate: doc.extracted.dueDate || "",
          vendor: doc.extracted.vendor || "",
          customer: doc.extracted.customer || "",
          subtotal: doc.extracted.subtotal || "0.00",
          tax: doc.extracted.tax || "0.00",
          total: doc.extracted.total || "0.00",
          currency: doc.extracted.currency || prev.settings.currency,
          paid: doc.extracted.paid || "0.00",
          due: doc.extracted.due || doc.extracted.total || "0.00",
        };
        doc.rawText =
          doc.rawText ||
          `${doc.originalName}\nText extraction simulated for UI preview.\nReview the extracted fields before creating a financial record.`;
        createAudit(
          next,
          "document.ocr.processed",
          "POST",
          `/api/v1/documents/${id}/process`,
          "Document",
          id,
          "Local demo OCR result",
        );
        return next;
      }),
    [],
  );
  const updateDocumentReview = useCallback(
    (
      id: string,
      extracted: Record<string, string>,
      classification?: DocumentItem["classification"],
    ) =>
      setData((prev) => {
        const next = structuredClone(prev) as AppData;
        const doc = next.documents.find((x) => x.id === id);
        if (doc) {
          doc.extracted = extracted;
          if (classification) doc.classification = classification;
          doc.processingStatus = "Processed";
        }
        return next;
      }),
    [],
  );
  const markDocumentConverted = useCallback(
    (id: string, type: DocumentItem["convertedRecordType"], recordId: string) =>
      setData((prev) => {
        const next = structuredClone(prev) as AppData;
        const doc = next.documents.find((x) => x.id === id);
        if (doc) {
          doc.conversionStatus = "Converted";
          doc.convertedRecordType = type;
          doc.convertedRecordId = recordId;
        }
        createAudit(
          next,
          "document.converted",
          "POST",
          `/api/v1/documents/${id}/convert`,
          "Document",
          id,
          `${type} ${recordId}`,
        );
        return next;
      }),
    [],
  );
  const removeDocument = useCallback(
    (id: string) =>
      setData((prev) => {
        const next = structuredClone(prev) as AppData;
        next.documents = next.documents.filter(
          (x) => x.id !== id || x.conversionStatus === "Converted",
        );
        return next;
      }),
    [],
  );

  const addInventoryItem = useCallback(
    (input: Omit<InventoryItem, "id" | "movements" | "status">) =>
      setData((prev) => {
        const next = structuredClone(prev) as AppData;
        next.inventory.unshift({
          ...input,
          id: uid("item"),
          movements: [],
          status: "Active",
        });
        return next;
      }),
    [],
  );
  const updateInventoryItem = useCallback(
    (id: string, patch: Partial<InventoryItem>) =>
      setData((prev) => {
        const next = structuredClone(prev) as AppData;
        const item = next.inventory.find((x) => x.id === id);
        if (item)
          Object.assign(item, patch, {
            id: item.id,
            movements: item.movements,
          });
        return next;
      }),
    [],
  );
  const adjustInventory = useCallback(
    (
      id: string,
      input: Omit<InventoryMovement, "id" | "previousQuantity" | "newQuantity">,
    ) =>
      setData((prev) => {
        const next = structuredClone(prev) as AppData;
        const item = next.inventory.find((x) => x.id === id);
        if (!item) return prev;
        const previousQuantity = item.quantity;
        const newQuantity = previousQuantity + input.quantityDelta;
        if (newQuantity < 0) return prev;
        item.quantity = newQuantity;
        item.movements.unshift({
          ...input,
          id: uid("mov"),
          previousQuantity,
          newQuantity,
        });
        createAudit(
          next,
          "inventory.adjusted",
          "POST",
          `/api/v1/inventory/items/${id}/adjust`,
          "InventoryItem",
          id,
          `${input.quantityDelta} ${item.unit}`,
        );
        return next;
      }),
    [],
  );
  const markNotificationRead = useCallback(
    (id: string) =>
      setData((prev) => {
        const next = structuredClone(prev) as AppData;
        const item = next.notifications.find((x) => x.id === id);
        if (item && !item.readAt) item.readAt = currentDateTime();
        return next;
      }),
    [],
  );
  const addTeamMember = useCallback(
    (
      input: Omit<TeamMember, "id" | "createdAt" | "status"> & {
        status?: TeamMember["status"];
      },
    ) =>
      setData((prev) => {
        const next = structuredClone(prev) as AppData;
        next.team.unshift({
          ...input,
          id: uid("user"),
          status: input.status ?? "Active",
          createdAt: todayIso(),
        });
        return next;
      }),
    [],
  );
  const updateTeamMember = useCallback(
    (id: string, patch: Partial<TeamMember>) =>
      setData((prev) => {
        const next = structuredClone(prev) as AppData;
        const item = next.team.find((x) => x.id === id);
        if (item && item.role !== "Owner")
          Object.assign(item, patch, {
            id: item.id,
            createdAt: item.createdAt,
          });
        return next;
      }),
    [],
  );
  const toggleTeamMember = useCallback(
    (id: string) =>
      setData((prev) => {
        const next = structuredClone(prev) as AppData;
        const item = next.team.find((x) => x.id === id && x.role !== "Owner");
        if (item)
          item.status = item.status === "Active" ? "Inactive" : "Active";
        return next;
      }),
    [],
  );
  const updateSettings = useCallback(
    (patch: Partial<AppData["settings"]>) =>
      setData((prev) => ({
        ...prev,
        settings: { ...prev.settings, ...patch },
      })),
    [],
  );
  const addCurrencyRate = useCallback(
    (input: Omit<CurrencyRate, "id">) =>
      setData((prev) => {
        const next = structuredClone(prev) as AppData;
        next.currencyRates.unshift({ ...input, id: uid("rate") });
        return next;
      }),
    [],
  );
  const setMfaEnabled = useCallback(
    (enabled: boolean) => setData((prev) => ({ ...prev, mfaEnabled: enabled })),
    [],
  );
  const setEmailVerified = useCallback(
    (enabled: boolean) =>
      setData((prev) => ({ ...prev, emailVerified: enabled })),
    [],
  );
  const changePlan = useCallback(
    (plan: AppData["subscription"]["plan"]) =>
      setData((prev) => {
        const limits = {
          Free: [1, 25],
          Starter: [5, 250],
          Pro: [15, 1000],
          Business: [50, 5000],
        } as const;
        const [usersLimit, documentsLimit] = limits[plan];
        return {
          ...prev,
          subscription: {
            ...prev.subscription,
            plan,
            usersLimit,
            documentsLimit,
            status: "Active",
          },
        };
      }),
    [],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      data,
      role,
      setRole,
      signedIn,
      signIn,
      signOut,
      toast,
      dismissToast,
      toasts,
      resetDemo,
      addTransaction,
      voidTransaction,
      addAccount,
      updateAccount,
      toggleAccount,
      addCategory,
      updateCategory,
      toggleCategory,
      addParty,
      updateParty,
      toggleParty,
      addInvoice,
      updateInvoice,
      sendInvoice,
      cancelInvoice,
      addInvoicePayment,
      reverseInvoicePayment,
      addBill,
      updateBill,
      receiveBill,
      cancelBill,
      addBillPayment,
      reverseBillPayment,
      addRecurring,
      updateRecurring,
      executeRecurring,
      addDocument,
      processDocument,
      updateDocumentReview,
      markDocumentConverted,
      removeDocument,
      addInventoryItem,
      updateInventoryItem,
      adjustInventory,
      markNotificationRead,
      addTeamMember,
      updateTeamMember,
      toggleTeamMember,
      updateSettings,
      addCurrencyRate,
      setMfaEnabled,
      setEmailVerified,
      changePlan,
    }),
    [
      data,
      role,
      setRole,
      signedIn,
      signIn,
      signOut,
      toast,
      dismissToast,
      toasts,
      resetDemo,
      addTransaction,
      voidTransaction,
      addAccount,
      updateAccount,
      toggleAccount,
      addCategory,
      updateCategory,
      toggleCategory,
      addParty,
      updateParty,
      toggleParty,
      addInvoice,
      updateInvoice,
      sendInvoice,
      cancelInvoice,
      addInvoicePayment,
      reverseInvoicePayment,
      addBill,
      updateBill,
      receiveBill,
      cancelBill,
      addBillPayment,
      reverseBillPayment,
      addRecurring,
      updateRecurring,
      executeRecurring,
      addDocument,
      processDocument,
      updateDocumentReview,
      markDocumentConverted,
      removeDocument,
      addInventoryItem,
      updateInventoryItem,
      adjustInventory,
      markNotificationRead,
      addTeamMember,
      updateTeamMember,
      toggleTeamMember,
      updateSettings,
      addCurrencyRate,
      setMfaEnabled,
      setEmailVerified,
      changePlan,
    ],
  );

  return (
    <AppContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </AppContext.Provider>
  );
}
export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context; 
}
function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="toast-viewport" aria-live="polite">
      {toasts.map((item) => (
        <div className={`toast toast-${item.tone}`} key={item.id}>
          <span className="toast-icon">
            {item.tone === "success" ? "✓" : item.tone === "error" ? "!" : "i"}
          </span>
          <div>
            <strong>{item.title}</strong>
            {item.description && <p>{item.description}</p>}
          </div>
          <button
            aria-label="Dismiss notification"
            onClick={() => onDismiss(item.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
