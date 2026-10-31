import { useEffect, useState } from "react";
import { financeApi } from "@/lib/api/services";
import { getApiErrorMessage } from "@/lib/api/client";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Download,
  FileText,
  SlidersHorizontal,
  Wallet,
} from "lucide-react";
import { createColumnHelper } from "@tanstack/react-table";
import { useApp } from "@/context/AppContext";
import { downloadCsv, formatDate, money } from "@/lib/utils";
import type { Party } from "@/types";
import {
  Badge,
  Button,
  Card,
  DataTable,
  Field,
  Input,
  PageHeader,
  Select,
  StatCard,
  Tabs,
} from "@/components/ui";

type LedgerEntry = {
  id: string;
  date: string;
  kind: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  recordPath: string;
};
const h = createColumnHelper<LedgerEntry>();
export default function LedgerPage() {
  const { partyId } = useParams();
  const { data } = useApp();
  const navigate = useNavigate();
  const [serverEntries, setServerEntries] = useState<LedgerEntry[]>([]);
  const [serverSummary, setServerSummary] = useState<any>(null);
  const [ledgerError, setLedgerError] = useState("");
  const [ledgerBusy, setLedgerBusy] = useState(false);
  const [kind, setKind] = useState<"Customer" | "Vendor">(
    partyId && data.parties.find((p) => p.id === partyId)?.type === "Vendor"
      ? "Vendor"
      : "Customer",
  );
  const [selected, setSelected] = useState(partyId || "");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const party = data.parties.find((p) => p.id === selected);
  const isCustomer = kind === "Customer";
  const parties = data.parties.filter(
    (p) => p.type === kind || p.type === "Both",
  );
  useEffect(() => {
    if (!selected) {
      setServerEntries([]);
      setServerSummary(null);
      return;
    }
    let active = true;
    setLedgerBusy(true);
    setLedgerError("");
    financeApi
      .partyLedger(selected, {
        ...(from
          ? { from: new Date(`${from}T00:00:00.000Z`).toISOString() }
          : {}),
        ...(to ? { to: new Date(`${to}T23:59:59.000Z`).toISOString() } : {}),
        page: 1,
        limit: 100,
      })
      .then((result: any) => {
        if (!active) return;
        setServerSummary(result.summary ?? null);
        setServerEntries(
          (result.entries ?? []).map((entry: any) => {
            const type = String(entry.type ?? "");
            const isInvoice = type === "invoice";
            const isBill = type === "bill";
            const isOpening = type === "opening_balance";
            return {
              id: String(entry.id ?? entry._id ?? `${type}-${entry.date}`),
              date: entry.date
                ? new Date(entry.date).toISOString().slice(0, 10)
                : "",
              kind: isOpening
                ? "Opening balance"
                : isInvoice
                  ? "Invoice"
                  : isBill
                    ? "Bill"
                    : type === "invoice_payment"
                      ? "Payment received"
                      : type === "bill_payment"
                        ? "Payment made"
                        : type,
              reference: entry.reference ?? "",
              description: entry.description ?? "",
              debit: Number(entry.debit ?? 0),
              credit: Number(entry.credit ?? 0),
              balance: Number(entry.runningBalance ?? 0),
              recordPath:
                isInvoice && entry.invoiceId
                  ? `/invoices/${entry.invoiceId}`
                  : isBill && entry.billId
                    ? `/bills/${entry.billId}`
                    : entry.invoiceId
                      ? `/invoices/${entry.invoiceId}`
                      : entry.billId
                        ? `/bills/${entry.billId}`
                        : "#",
            };
          }),
        );
      })
      .catch((e: any) => {
        if (active) setLedgerError(getApiErrorMessage(e));
      })
      .finally(() => {
        if (active) setLedgerBusy(false);
      });
    return () => {
      active = false;
    };
  }, [selected, from, to]);
  const entries = serverEntries;
  const filtered = entries;
  const openingEntry = entries.find((e) => e.kind === "Opening balance");
  const openingBalance = openingEntry
    ? openingEntry.debit - openingEntry.credit
    : 0;
  const periodRows = filtered.filter((e) => e.kind !== "Opening balance");
  const periodDebits = periodRows.reduce((s, e) => s + e.debit, 0);
  const periodCredits = periodRows.reduce((s, e) => s + e.credit, 0);
  const closingBalance =
    entries.at(-1)?.balance ?? openingBalance + periodDebits - periodCredits;
  const columns = [
    h.accessor("date", {
      header: "Date",
      cell: (i) => formatDate(i.getValue()),
    }),
    h.accessor("kind", {
      header: "Type",
      cell: (i) => (
        <Badge
          tone={
            i.getValue().includes("Payment")
              ? "success"
              : isCustomer
                ? "info"
                : "warning"
          }
        >
          {i.getValue()}
        </Badge>
      ),
    }),
    h.accessor("reference", {
      header: "Reference",
      cell: (i) => <strong>{i.getValue()}</strong>,
    }),
    h.accessor("description", { header: "Description" }),
    h.accessor("debit", {
      header: "Debit",
      cell: (i) =>
        i.getValue() > 0 ? money(i.getValue(), data.settings.currency) : "—",
      meta: { align: "right" },
    }),
    h.accessor("credit", {
      header: "Credit",
      cell: (i) =>
        i.getValue() > 0 ? money(i.getValue(), data.settings.currency) : "—",
      meta: { align: "right" },
    }),
    h.accessor("balance", {
      header: "Running balance",
      cell: (i) => (
        <strong>{money(i.getValue(), data.settings.currency)}</strong>
      ),
      meta: { align: "right" },
    }),
    h.display({
      id: "actions",
      header: "",
      cell: (i) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(i.row.original.recordPath)}
        >
          Open <ArrowRight size={14} />
        </Button>
      ),
    }),
  ];
  const balance = isCustomer
    ? Number(
        serverSummary?.customer?.balanceDue ?? entries.at(-1)?.balance ?? 0,
      )
    : Number(serverSummary?.vendor?.balanceDue ?? entries.at(-1)?.balance ?? 0);
  return (
    <div className="page-stack">
      <PageHeader
        title="Customer & vendor ledger"
        description="Review opening balances, financial entries, and closing balances for a business contact."
        actions={
          party ? (
            <Button
              variant="secondary"
              icon={<Download size={16} />}
              onClick={() =>
                downloadCsv(
                  `ledger-${party.name.replaceAll(" ", "-").toLowerCase()}.csv`,
                  [
                    [
                      "Date",
                      "Type",
                      "Reference",
                      "Description",
                      "Debit",
                      "Credit",
                      "Running balance",
                    ],
                    ...filtered.map((e) => [
                      e.date,
                      e.kind,
                      e.reference,
                      e.description,
                      e.debit,
                      e.credit,
                      e.balance,
                    ]),
                  ],
                )
              }
            >
              Export CSV
            </Button>
          ) : undefined
        }
      />
      <div className="ledger-controls">
        <Tabs
          active={kind}
          onChange={(v) => {
            setKind(v as "Customer" | "Vendor");
            setSelected("");
            navigate("/ledger");
          }}
          items={[
            { label: "Customer ledger", value: "Customer" },
            { label: "Vendor ledger", value: "Vendor" },
          ]}
        />
        <div className="ledger-contact-select">
          <Field label={isCustomer ? "Customer" : "Vendor"}>
            <Select
              value={selected}
              onChange={(e) => {
                setSelected(e.target.value);
                navigate(
                  e.target.value ? `/ledger/${e.target.value}` : "/ledger",
                );
              }}
            >
              <option value="">Select a contact</option>
              {parties.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="ledger-date-filter">
          <Field label="From">
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </Field>
          <Field label="To">
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </Field>
          <Button
            variant="ghost"
            onClick={() => {
              setFrom("");
              setTo("");
            }}
          >
            Clear
          </Button>
        </div>
      </div>
      {ledgerError && (
        <Notice tone="danger" title="Ledger could not be loaded">
          {ledgerError}
        </Notice>
      )}
      {ledgerBusy && <p>Loading ledger from backend…</p>}
      {!party ? (
        <Card>
          <div className="ledger-start">
            <div className="empty-icon">
              <Wallet size={24} />
            </div>
            <h2>Select a contact to view the ledger</h2>
            <p>
              Choose a customer or vendor above to see financial activity and
              running balance.
            </p>
          </div>
        </Card>
      ) : (
        <>
          <div className="ledger-contact-header">
            <div className="ledger-contact-icon">
              {isCustomer ? (
                <ArrowDownLeft size={20} />
              ) : (
                <ArrowUpRight size={20} />
              )}
            </div>
            <div>
              <h2>{party.name}</h2>
              <p>
                {party.company || party.type} ·{" "}
                {party.email || "No email address"}
              </p>
            </div>
            <div className="ledger-contact-balance">
              <span>
                {isCustomer ? "Receivable balance" : "Payable balance"}
              </span>
              <strong>{money(balance, data.settings.currency)}</strong>
            </div>
          </div>
          <div className="stats-grid four">
            <StatCard
              label="Opening balance"
              value={money(openingBalance, data.settings.currency, 0)}
              detail={
                from ? `Before ${formatDate(from)}` : "No date filter applied"
              }
              icon={<Wallet size={16} />}
              tone="neutral"
            />
            <StatCard
              label="Total debits"
              value={money(periodDebits, data.settings.currency, 0)}
              detail={isCustomer ? "Invoices" : "Payments"}
              icon={<ArrowDownLeft size={16} />}
              tone="blue"
            />
            <StatCard
              label="Total credits"
              value={money(periodCredits, data.settings.currency, 0)}
              detail={isCustomer ? "Payments received" : "Bills"}
              icon={<ArrowUpRight size={16} />}
              tone="green"
            />
            <StatCard
              label="Closing balance"
              value={money(closingBalance, data.settings.currency, 0)}
              detail="Opening + debits − credits"
              icon={<FileText size={16} />}
              tone="amber"
            />
          </div>
          <Card className="list-card">
            <div className="ledger-table-head">
              <div>
                <h2>Ledger entries</h2>
                <p>
                  {formatDate(from || entries[0]?.date)} —{" "}
                  {formatDate(to || entries.at(-1)?.date)}
                </p>
              </div>
              <Badge tone="info">{filtered.length} entries</Badge>
            </div>
            <DataTable
              columns={columns}
              data={filtered}
              rowId={(r) => r.id}
              emptyTitle="No entries for this period"
              emptyDescription="Try a wider date range to see more activity."
            />
            <div className="ledger-closing-row">
              <span>Closing balance</span>
              <strong>{money(closingBalance, data.settings.currency)}</strong>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
