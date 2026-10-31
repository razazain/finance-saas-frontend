import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { createColumnHelper } from "@tanstack/react-table";
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  CheckCircle2,
  Download,
  Mail,
  Plus,
  Printer,
  ReceiptText,
  RotateCcw,
  Send,
  Wallet,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { financeApi } from "@/lib/api/services";
import { getApiErrorMessage } from "@/lib/api/client";
import { getPostableAccounts } from "@/lib/finance";
import {
  calcDocumentTotals,
  formatDate,
  money,
  todayIso,
  uid,
} from "@/lib/utils";
import type { Invoice, LineItem, Payment } from "@/types";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  Dialog,
  Field,
  Input,
  PageHeader,
  SearchBox,
  Select,
  StatCard,
  Tabs,
  Textarea,
  Notice,
} from "@/components/ui";
import Decimal from "decimal.js";

const helper = createColumnHelper<Invoice>();
function invoiceTone(
  status: Invoice["status"],
): "success" | "warning" | "danger" | "info" | "neutral" {
  return status === "Paid"
    ? "success"
    : status === "Partially Paid"
      ? "warning"
      : status === "Cancelled"
        ? "danger"
        : status === "Sent"
          ? "info"
          : "neutral";
}
export function InvoicesPage() {
  const { data } = useApp();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [period, setPeriod] = useState("All dates");
  const filtered = useMemo(
    () =>
      data.invoices.filter(
        (i) =>
          (status === "All" || i.status === status) &&
          `${i.number} ${data.parties.find((p) => p.id === i.partyId)?.name || ""}`
            .toLowerCase()
            .includes(search.toLowerCase()) &&
          (period === "All dates" ||
            (period === "This month" &&
              i.issueDate.startsWith(todayIso().slice(0, 7))) ||
            (period === "Last month" && i.issueDate.startsWith("2026-09"))),
      ),
    [data.invoices, data.parties, status, search, period],
  );
  const columns = [
    helper.accessor("number", {
      header: "Invoice",
      cell: (i) => (
        <div className="table-primary-cell">
          <strong>{i.getValue()}</strong>
          <small>Issued {formatDate(i.row.original.issueDate)}</small>
        </div>
      ),
    }),
    helper.accessor("partyId", {
      header: "Customer",
      cell: (i) => (
        <span>
          {data.parties.find((p) => p.id === i.getValue())?.name ||
            "Unknown customer"}
        </span>
      ),
    }),
    helper.accessor("dueDate", {
      header: "Due date",
      cell: (i) => (
        <div className="table-primary-cell">
          <span>{formatDate(i.getValue())}</span>
          {i.row.original.balance !== "0.00" &&
            i.getValue() < todayIso() &&
            i.row.original.status !== "Cancelled" && (
              <small className="text-danger">Overdue</small>
            )}
        </div>
      ),
    }),
    helper.accessor("total", {
      header: "Total",
      cell: (i) => (
        <strong>{money(i.getValue(), data.settings.currency)}</strong>
      ),
    }),
    helper.accessor("paid", {
      header: "Paid",
      cell: (i) => money(i.getValue(), data.settings.currency),
    }),
    helper.accessor("balance", {
      header: "Balance due",
      cell: (i) => (
        <strong className={Number(i.getValue()) > 0 ? "amount-text" : ""}>
          {money(i.getValue(), data.settings.currency)}
        </strong>
      ),
    }),
    helper.accessor("status", {
      header: "Status",
      cell: (i) => (
        <Badge tone={invoiceTone(i.getValue())}>{i.getValue()}</Badge>
      ),
    }),
    helper.display({
      id: "action",
      header: "",
      cell: (i) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/invoices/${i.row.original.id}`)}
        >
          Open <ArrowRight size={14} />
        </Button>
      ),
    }),
  ];
  const openInvoices = data.invoices.filter(
    (i) => !["Paid", "Cancelled"].includes(i.status),
  );
  const due = openInvoices.reduce((s, i) => s + Number(i.balance), 0);
  const overdue = openInvoices
    .filter((i) => i.dueDate < todayIso())
    .reduce((s, i) => s + Number(i.balance), 0);
  return (
    <div className="page-stack">
      <PageHeader
        title="Invoices"
        description="Create invoices and track customer payments from issue to settlement."
        actions={
          <>
            <Button
              variant="secondary"
              icon={<Download size={16} />}
              onClick={() => window.print()}
            >
              Export / print
            </Button>
            <Button
              icon={<Plus size={16} />}
              onClick={() => navigate("/invoices/new")}
            >
              Create invoice
            </Button>
          </>
        }
      />
      <div className="stats-grid four">
        <StatCard
          label="Outstanding"
          value={money(due, data.settings.currency, 0)}
          detail="Across open invoices"
          icon={<Wallet size={17} />}
          tone="blue"
        />
        <StatCard
          label="Overdue"
          value={money(overdue, data.settings.currency, 0)}
          detail="Past due date"
          icon={<ReceiptText size={17} />}
          tone="red"
        />
        <StatCard
          label="Partially paid"
          value={String(
            data.invoices.filter((i) => i.status === "Partially Paid").length,
          )}
          detail="Payment in progress"
          icon={<RotateCcw size={17} />}
          tone="amber"
        />
        <StatCard
          label="Paid invoices"
          value={String(
            data.invoices.filter((i) => i.status === "Paid").length,
          )}
          detail="Fully settled"
          icon={<CheckCircle2 size={17} />}
          tone="green"
        />
      </div>
      <Card className="list-card">
        <div className="list-toolbar">
          <Tabs
            active={status}
            onChange={setStatus}
            items={[
              {
                label: "All invoices",
                value: "All",
                count: data.invoices.length,
              },
              { label: "Draft", value: "Draft" },
              { label: "Sent", value: "Sent" },
              { label: "Partially paid", value: "Partially Paid" },
              { label: "Paid", value: "Paid" },
              { label: "Cancelled", value: "Cancelled" },
            ]}
          />
          <div className="toolbar-actions">
            <SearchBox
              value={search}
              onChange={setSearch}
              placeholder="Search invoice or customer"
            />
            <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option>All dates</option>
              <option>This month</option>
              <option>Last month</option>
            </Select>
          </div>
        </div>
        <DataTable
          columns={columns}
          data={filtered}
          onRowClick={(row) => navigate(`/invoices/${row.id}`)}
          rowId={(row) => row.id}
          emptyTitle="No invoices found"
          emptyDescription="Create your first invoice to start tracking customer receivables."
        />
        <div className="table-footer">
          <span>{filtered.length} invoices in this view</span>
          <span className="pagination-demo">
            Page 1 of 1{" "}
            <Button size="sm" variant="secondary" disabled>
              Previous
            </Button>
            <Button size="sm" variant="secondary" disabled>
              Next
            </Button>
          </span>
        </div>
      </Card>
      <p className="phase-note">
        Invoice totals and payment status are loaded from the backend.
      </p>
    </div>
  );
}

const emptyLine = (): LineItem => ({
  id: uid("line"),
  description: "",
  quantity: "1",
  unitPrice: "0.00",
});
export function InvoiceFormPage() {
  const { data, addInvoice, updateInvoice, toast } = useApp();
  const navigate = useNavigate();
  const { id } = useParams();
  const [query] = useSearchParams();
  const existing = data.invoices.find((i) => i.id === id);
  const [partyId, setPartyId] = useState(
    existing?.partyId || query.get("partyId") || "",
  );
  const [issueDate, setIssueDate] = useState(existing?.issueDate || todayIso());
  const [dueDate, setDueDate] = useState(existing?.dueDate || "");
  const [items, setItems] = useState<LineItem[]>(
    existing?.items || [emptyLine()],
  );
  const [discountRate, setDiscountRate] = useState(
    existing?.discountRate || "0",
  );
  const [taxRate, setTaxRate] = useState(existing?.taxRate || "0");
  const [notes, setNotes] = useState(existing?.notes || "");
  const [terms, setTerms] = useState(
    existing?.terms || "Payment due within 14 days.",
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const totals = calcDocumentTotals(items, discountRate, taxRate);
  const canEdit = !existing || existing.status === "Draft";
  function updateLine(index: number, patch: Partial<LineItem>) {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, ...patch } : it)),
    );
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!partyId) {
      setError("Select a customer.");
      return;
    }
    if (!issueDate) {
      setError("Choose the issue date.");
      return;
    }
    if (!dueDate) {
      setError("Choose the due date.");
      return;
    }
    if (dueDate < issueDate) {
      setError("Due date must be on or after the issue date.");
      return;
    }
    if (
      !items.length ||
      items.some(
        (it) =>
          !it.description.trim() ||
          Number(it.quantity) <= 0 ||
          Number(it.unitPrice) <= 0,
      )
    ) {
      setError(
        "Each line needs a description, positive quantity, and positive unit price.",
      );
      return;
    }
    if (Number(totals.total) <= 0) {
      setError("Invoice total must be greater than zero.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const input = {
        partyId,
        issueDate,
        dueDate,
        items: items.map((it) => ({
          ...it,
          description: it.description.trim(),
          unitPrice: new Decimal(it.unitPrice).toDecimalPlaces(2).toFixed(2),
        })),
        subtotal: totals.subtotal,
        discountRate,
        taxRate,
        discountAmount: totals.discountAmount,
        taxAmount: totals.taxAmount,
        total: totals.total,
        notes,
        terms,
      };
      let invoice: Invoice;
      if (existing) {
        updateInvoice(existing.id, input);
        invoice = {
          ...existing,
          ...input,
          balance: new Decimal(totals.total).minus(existing.paid).toFixed(2),
        };
        toast({ title: "Invoice draft update requested", tone: "success" });
        navigate(`/invoices/${existing.id}`);
      } else {
        invoice = await addInvoice(input);
        navigate(`/invoices/${invoice.id}`);
      }
    } catch {
      /* request error is shown by the API context */
    } finally {
      setSaving(false);
    }
  }
  if (existing && !canEdit)
    return (
      <div className="page-stack">
        <PageHeader
          title="Invoice cannot be edited"
          description="Only draft invoices can be changed in this workflow."
          back={
            <Link className="back-link" to={`/invoices/${existing.id}`}>
              ← Back to invoice
            </Link>
          }
        />
        <Notice
          tone="warning"
          title={`Invoice is ${existing.status.toLowerCase()}`}
        >
          Once an invoice is sent or has payments, its values are locked to
          preserve financial history.
        </Notice>
        <Button onClick={() => navigate(`/invoices/${existing.id}`)}>
          View invoice
        </Button>
      </div>
    );
  return (
    <div className="page-stack">
      <PageHeader
        title={existing ? "Edit invoice draft" : "Create invoice"}
        description="Build an invoice and review the totals before saving."
        back={
          <Link
            className="back-link"
            to={existing ? `/invoices/${existing.id}` : "/invoices"}
          >
            <ArrowLeft size={15} />{" "}
            {existing ? "Back to invoice" : "Back to invoices"}
          </Link>
        }
        actions={<Badge tone="neutral">Draft</Badge>}
      />
      <form onSubmit={submit} className="invoice-builder">
        <div className="builder-main">
          <Card className="form-card">
            <div className="form-section-top">
              <div>
                <h2>Invoice details</h2>
                <p>Choose the customer and dates for this invoice.</p>
              </div>
              <span className="document-number-preview">
                {existing?.number || "Assigned on save"}
              </span>
            </div>
            <div className="form-grid three">
              <Field label="Customer" required>
                <Select
                  value={partyId}
                  onChange={(e) => setPartyId(e.target.value)}
                >
                  <option value="">Select customer</option>
                  {data.parties
                    .filter(
                      (p) =>
                        (p.type === "Customer" || p.type === "Both") &&
                        p.status === "Active",
                    )
                    .map((p) => (
                      <option value={p.id} key={p.id}>
                        {p.name}
                      </option>
                    ))}
                </Select>
              </Field>
              <Field label="Issue date" required>
                <Input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                />
              </Field>
              <Field label="Due date" required>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </Field>
            </div>
          </Card>
          <Card className="form-card">
            <div className="form-section-top">
              <div>
                <h2>Line items</h2>
                <p>Describe the goods or services being invoiced.</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                icon={<Plus size={15} />}
                onClick={() => setItems((prev) => [...prev, emptyLine()])}
              >
                Add line
              </Button>
            </div>
            <div className="line-item-table">
              <div className="line-item-head">
                <span>Description</span>
                <span>Quantity</span>
                <span>Unit price</span>
                <span>Amount</span>
                <span />
              </div>
              {items.map((item, index) => (
                <div className="line-item-row" key={item.id}>
                  <Input
                    value={item.description}
                    onChange={(e) =>
                      updateLine(index, { description: e.target.value })
                    }
                    placeholder="Product or service"
                  />
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) =>
                      updateLine(index, { quantity: e.target.value })
                    }
                  />
                  <Input
                    inputMode="decimal"
                    value={item.unitPrice}
                    onChange={(e) =>
                      updateLine(index, { unitPrice: e.target.value })
                    }
                    placeholder="0.00"
                  />
                  <strong>
                    {money(
                      new Decimal(item.quantity || 0)
                        .mul(item.unitPrice || 0)
                        .toFixed(2),
                      data.settings.currency,
                    )}
                  </strong>
                  <button
                    type="button"
                    className="remove-line"
                    disabled={items.length === 1}
                    onClick={() =>
                      setItems((prev) => prev.filter((_, i) => i !== index))
                    }
                    aria-label="Remove line item"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            {error && (
              <div className="field-error form-global-error">{error}</div>
            )}
          </Card>
          <Card className="form-card">
            <h2>Notes and terms</h2>
            <div className="form-grid two">
              <Field label="Notes">
                <Textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional note for the customer"
                />
              </Field>
              <Field label="Payment terms">
                <Textarea
                  rows={3}
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  placeholder="Payment terms"
                />
              </Field>
            </div>
          </Card>
        </div>
        <aside className="builder-sidebar">
          <Card className="totals-card">
            <h2>Invoice summary</h2>
            <p>Amounts are calculated in {data.settings.currency}.</p>
            <div className="summary-line">
              <span>Subtotal</span>
              <strong>{money(totals.subtotal, data.settings.currency)}</strong>
            </div>
            <Field label="Discount (%)">
              <Input
                type="number"
                min="0"
                max="100"
                value={discountRate}
                onChange={(e) => setDiscountRate(e.target.value)}
              />
            </Field>
            <div className="summary-line">
              <span>Discount amount</span>
              <strong>
                − {money(totals.discountAmount, data.settings.currency)}
              </strong>
            </div>
            <Field label="Tax (%)">
              <Input
                type="number"
                min="0"
                max="100"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
              />
            </Field>
            <div className="summary-line">
              <span>Tax amount</span>
              <strong>{money(totals.taxAmount, data.settings.currency)}</strong>
            </div>
            <div className="summary-total">
              <span>Total</span>
              <strong>{money(totals.total, data.settings.currency)}</strong>
            </div>
            <div className="summary-line">
              <span>Paid</span>
              <strong>
                {money(existing?.paid || "0", data.settings.currency)}
              </strong>
            </div>
            <div className="summary-line">
              <span>Balance after save</span>
              <strong>
                {money(
                  new Decimal(totals.total)
                    .minus(existing?.paid || 0)
                    .toFixed(2),
                  data.settings.currency,
                )}
              </strong>
            </div>
            <Button type="submit" className="full-width" loading={saving}>
              {existing ? "Save draft changes" : "Save invoice draft"}
            </Button>
            <Button
              variant="secondary"
              className="full-width"
              onClick={() =>
                navigate(existing ? `/invoices/${existing.id}` : "/invoices")
              }
            >
              Cancel
            </Button>
            <Notice tone="info">
              The backend validates and calculates authoritative totals when the
              bill is saved.
            </Notice>
          </Card>
        </aside>
      </form>
    </div>
  );
}

export function InvoiceDetailPage() {
  const { id } = useParams();
  const {
    data,
    role,
    sendInvoice,
    cancelInvoice,
    addInvoicePayment,
    reverseInvoicePayment,
    toast,
  } = useApp();
  const navigate = useNavigate();
  const postableAccounts = getPostableAccounts(data);
  const invoice = data.invoices.find((i) => i.id === id);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [reverse, setReverse] = useState<Payment | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [accountId, setAccountId] = useState(postableAccounts[0]?.id || "");
  const [categoryId, setCategoryId] = useState(
    data.categories.find((c) => c.type === "Income")?.id || "",
  );
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayIso());
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const canManage = role === "Owner" || role === "Admin";
  if (!invoice)
    return (
      <div className="page-stack">
        <PageHeader
          title="Invoice not found"
          description="This invoice is not available in your workspace."
          back={
            <Link className="back-link" to="/invoices">
              ← Back to invoices
            </Link>
          }
        />
      </div>
    );
  const customer = data.parties.find((p) => p.id === invoice.partyId);
  const openPayment = () => {
    setAmount(invoice.balance);
    setDate(todayIso());
    setAccountId(postableAccounts[0]?.id || "");
    setCategoryId(data.categories.find((c) => c.type === "Income")?.id || "");
    setReference("");
    setNotes("");
    setError("");
    setPaymentOpen(true);
  };
  const submitPayment = (e: FormEvent) => {
    e.preventDefault();
    if (!accountId) {
      setError("Select an account.");
      return;
    }
    if (!categoryId) {
      setError("Select an income category.");
      return;
    }
    if (
      !amount ||
      Number(amount) <= 0 ||
      Number(amount) > Number(invoice.balance)
    ) {
      setError(
        "Enter an amount greater than zero and no more than the balance due.",
      );
      return;
    }
    addInvoicePayment(invoice.id, {
      date,
      amount: new Decimal(amount).toFixed(2),
      accountId,
      categoryId,
      reference,
      notes,
    });
    setPaymentOpen(false);
  };
  const due = Math.max(0, Number(invoice.balance));
  return (
    <div className="page-stack">
      <PageHeader
        title={invoice.number}
        description={`Invoice for ${customer?.name || "Unknown customer"} · Issued ${formatDate(invoice.issueDate)}`}
        back={
          <Link className="back-link" to="/invoices">
            <ArrowLeft size={15} /> Back to invoices
          </Link>
        }
        actions={
          <>
            {invoice.status === "Draft" && (
              <Button
                variant="secondary"
                onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
              >
                Edit draft
              </Button>
            )}
            {invoice.status === "Draft" && canManage && (
              <Button
                icon={<Send size={16} />}
                onClick={() => {
                  sendInvoice(invoice.id);
                  toast({ title: "Invoice marked as sent", tone: "success" });
                }}
              >
                Mark as sent
              </Button>
            )}
            {invoice.status !== "Cancelled" &&
              invoice.status !== "Paid" &&
              invoice.status !== "Draft" && (
                <Button icon={<Wallet size={16} />} onClick={openPayment}>
                  Record payment
                </Button>
              )}
            <Button
              variant="secondary"
              icon={<Printer size={16} />}
              onClick={async () => {
                try {
                  const blob = await financeApi.invoicePdf(invoice.id);
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${invoice.number || "invoice"}.pdf`;
                  a.click();
                  URL.revokeObjectURL(url);
                } catch (e) {
                  toast({
                    title: "PDF download failed",
                    description: getApiErrorMessage(e),
                    tone: "error",
                  });
                }
              }}
            >
              Download PDF
            </Button>
            <Button
              variant="secondary"
              icon={<Mail size={16} />}
              onClick={() => setEmailOpen(true)}
            >
              Email invoice
            </Button>
          </>
        }
      />
      <Card className="invoice-hero">
        <div className="invoice-hero-left">
          <div className="invoice-brand-mini">
            <div className="brand-mark small-mark">M</div>
            <div>
              <strong>{data.settings.name}</strong>
              <small>
                Workspace owner:{" "}
                {data.team.find((member) => member.role === "Owner")?.email ||
                  "No owner email"}
              </small>
            </div>
          </div>
          <Badge
            tone={
              invoice.status === "Paid"
                ? "success"
                : invoice.status === "Partially Paid"
                  ? "warning"
                  : invoice.status === "Cancelled"
                    ? "danger"
                    : invoice.status === "Sent"
                      ? "info"
                      : "neutral"
            }
          >
            {invoice.status}
          </Badge>
          <h2>{invoice.number}</h2>
          <span className="muted-cell">Bill to</span>
          <strong>{customer?.name || "Unknown customer"}</strong>
          <span className="muted-cell">
            {customer?.email || "No customer email"}
          </span>
        </div>
        <div className="invoice-hero-total">
          <span>Invoice total</span>
          <strong>{money(invoice.total, data.settings.currency)}</strong>
          <div className="invoice-dates">
            <div>
              <small>Issue date</small>
              <strong>{formatDate(invoice.issueDate)}</strong>
            </div>
            <div>
              <small>Due date</small>
              <strong>{formatDate(invoice.dueDate)}</strong>
            </div>
          </div>
        </div>
      </Card>
      <div className="stats-grid three">
        <StatCard
          label="Total"
          value={money(invoice.total, data.settings.currency, 0)}
          detail="Invoice amount"
          icon={<ReceiptText size={17} />}
          tone="blue"
        />
        <StatCard
          label="Paid"
          value={money(invoice.paid, data.settings.currency, 0)}
          detail={`${invoice.payments.filter((p) => p.status === "Recorded").length} recorded payments`}
          icon={<CheckCircle2 size={17} />}
          tone="green"
        />
        <StatCard
          label="Balance due"
          value={money(invoice.balance, data.settings.currency, 0)}
          detail={
            invoice.balance === "0.00"
              ? "Fully paid"
              : invoice.dueDate < todayIso()
                ? "Past due date"
                : "Remaining amount"
          }
          icon={<Wallet size={17} />}
          tone={due > 0 ? "amber" : "neutral"}
        />
      </div>
      <div className="detail-grid invoice-detail-grid">
        <Card className="invoice-lines-card">
          <div className="card-heading">
            <div>
              <h2>Items and totals</h2>
              <p>Line items recorded on this invoice</p>
            </div>
          </div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th className="text-right">Qty</th>
                  <th className="text-right">Unit price</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((it) => (
                  <tr key={it.id}>
                    <td>
                      <strong>{it.description}</strong>
                    </td>
                    <td className="text-right">{it.quantity}</td>
                    <td className="text-right">
                      {money(it.unitPrice, data.settings.currency)}
                    </td>
                    <td className="text-right">
                      {money(
                        new Decimal(it.quantity).mul(it.unitPrice).toFixed(2),
                        data.settings.currency,
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="invoice-totals">
            <div>
              <span>Subtotal</span>
              <strong>{money(invoice.subtotal, data.settings.currency)}</strong>
            </div>
            {Number(invoice.discountAmount) > 0 && (
              <div>
                <span>Discount ({invoice.discountRate}%)</span>
                <strong>
                  − {money(invoice.discountAmount, data.settings.currency)}
                </strong>
              </div>
            )}
            {Number(invoice.taxAmount) > 0 && (
              <div>
                <span>Tax ({invoice.taxRate}%)</span>
                <strong>
                  {money(invoice.taxAmount, data.settings.currency)}
                </strong>
              </div>
            )}
            <div className="invoice-total-final">
              <span>Total</span>
              <strong>{money(invoice.total, data.settings.currency)}</strong>
            </div>
          </div>
          {invoice.notes && (
            <div className="invoice-notes">
              <strong>Notes</strong>
              <p>{invoice.notes}</p>
            </div>
          )}
          {invoice.terms && (
            <div className="invoice-notes">
              <strong>Terms</strong>
              <p>{invoice.terms}</p>
            </div>
          )}
        </Card>
        <Card className="payments-card">
          <div className="card-heading">
            <div>
              <h2>Payment history</h2>
              <p>Recorded receipts against this invoice</p>
            </div>
            {invoice.status !== "Paid" &&
              invoice.status !== "Cancelled" &&
              invoice.status !== "Draft" && (
                <Button
                  size="sm"
                  icon={<Plus size={14} />}
                  onClick={openPayment}
                >
                  Record payment
                </Button>
              )}
          </div>
          {invoice.payments.length ? (
            invoice.payments.map((p) => (
              <div className="payment-row" key={p.id}>
                <div className="payment-row-icon">
                  <Wallet size={17} />
                </div>
                <div className="payment-row-main">
                  <strong>{money(p.amount, data.settings.currency)}</strong>
                  <small>
                    {formatDate(p.date)} ·{" "}
                    {data.accounts.find((a) => a.id === p.accountId)?.name ||
                      "Account"}
                    {p.reference ? ` · ${p.reference}` : ""}
                  </small>
                  <Badge tone={p.status === "Recorded" ? "success" : "danger"}>
                    {p.status}
                  </Badge>
                </div>
                {p.status === "Recorded" && canManage && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setReverse(p)}
                  >
                    Reverse
                  </Button>
                )}
              </div>
            ))
          ) : (
            <div className="muted-panel-text">No payments recorded yet.</div>
          )}
          {invoice.status === "Draft" && canManage && (
            <div className="record-action-box">
              <strong>Ready to send?</strong>
              <p>
                Mark this draft invoice as sent when you have shared it with the
                customer.
              </p>
              <Button
                variant="secondary"
                icon={<Send size={15} />}
                onClick={() => {
                  sendInvoice(invoice.id);
                  toast({ title: "Invoice marked as sent", tone: "success" });
                }}
              >
                Mark as sent
              </Button>
            </div>
          )}
          {invoice.status !== "Paid" &&
            invoice.status !== "Cancelled" &&
            canManage && (
              <div className="record-action-box danger-action">
                <strong>Cancel invoice</strong>
                <p>
                  Cancellation is only available before any payment is recorded.
                </p>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={Number(invoice.paid) > 0}
                  icon={<Ban size={14} />}
                  onClick={() => {
                    cancelInvoice(invoice.id);
                    toast({ title: "Invoice cancelled", tone: "info" });
                  }}
                >
                  Cancel invoice
                </Button>
              </div>
            )}
        </Card>
      </div>
      <Dialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        title="Record invoice payment"
        description={`Balance due: ${money(invoice.balance, data.settings.currency)}. Payments cannot exceed the remaining balance.`}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPaymentOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                document.getElementById("invoice-payment-submit")?.click()
              }
            >
              Record payment
            </Button>
          </>
        }
      >
        <form className="form-stack" onSubmit={submitPayment}>
          <Notice tone="info" title="Payment will update related records">
            The backend records the payment and updates the invoice and account
            balances.
          </Notice>
          <div className="form-grid two">
            <Field label="Payment amount" required error={error}>
              <Input
                inputMode="decimal"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError("");
                }}
              />
            </Field>
            <Field label="Payment date" required>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
            <Field label="Deposit account" required>
              <Select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
              >
                {postableAccounts.map((a) => (
                  <option value={a.id} key={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Income category" required>
              <Select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                {data.categories
                  .filter((c) => c.type === "Income" && c.status === "Active")
                  .map((c) => (
                    <option value={c.id} key={c.id}>
                      {c.name}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label="Reference">
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Receipt or bank reference"
              />
            </Field>
          </div>
          <Field label="Notes">
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional payment notes"
            />
          </Field>
          <div className="summary-total">
            <span>Remaining after payment</span>
            <strong>
              {money(
                Decimal.max(
                  new Decimal(invoice.balance).minus(amount || 0),
                  0,
                ).toFixed(2),
                data.settings.currency,
              )}
            </strong>
          </div>
          <button
            id="invoice-payment-submit"
            className="visually-hidden"
            type="submit"
          >
            Submit payment
          </button>
        </form>
      </Dialog>
      <ConfirmDialog
        open={!!reverse}
        onOpenChange={(o) => !o && setReverse(null)}
        title="Reverse this payment?"
        description={
          <div>
            <p>
              This creates a correcting state in the demo. The original payment
              stays visible in the payment history.
            </p>
            {reverse && (
              <div className="summary-total">
                <span>Payment to reverse</span>
                <strong>{money(reverse.amount, data.settings.currency)}</strong>
              </div>
            )}
          </div>
        }
        confirmLabel="Reverse payment"
        destructive
        onConfirm={() => {
          if (reverse) {
            reverseInvoicePayment(invoice.id, reverse.id);
            setReverse(null);
          }
        }}
      />
      <Dialog
        open={emailOpen}
        onOpenChange={setEmailOpen}
        title="Email invoice"
        description="Send the invoice PDF to the customer email on file."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEmailOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!customer?.email}
              onClick={async () => {
                try {
                  const result = await financeApi.emailInvoice(invoice.id);
                  setEmailOpen(false);
                  toast({
                    title:
                      result?.delivery?.sent === false
                        ? "Email could not be sent"
                        : "Invoice email requested",
                    description:
                      result?.delivery?.message ||
                      "The backend handled the invoice email request.",
                    tone:
                      result?.delivery?.sent === false ? "error" : "success",
                  });
                } catch (e) {
                  toast({
                    title: "Invoice email failed",
                    description: getApiErrorMessage(e),
                    tone: "error",
                  });
                }
              }}
            >
              Send invoice
            </Button>
          </>
        }
      >
        <div className="email-preview">
          <div className="email-preview-icon">
            <Mail size={20} />
          </div>
          <div>
            <strong>{customer?.email || "No email address available"}</strong>
            <p>
              {customer?.email
                ? "The PDF for " + invoice.number + " will be attached."
                : "Add an email address to this customer before sending an invoice."}
            </p>
          </div>
        </div>
        {!customer?.email && (
          <Notice tone="warning">
            This customer does not have an email address.
          </Notice>
        )}
      </Dialog>
      <p className="phase-note">
        PDF download and invoice email are handled by the backend using the
        configured production services.
      </p>
    </div>
  );
}
