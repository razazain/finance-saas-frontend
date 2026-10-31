import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactECharts from "echarts-for-react";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Download,
  Plus,
  Wallet,
  TrendingUp,
  ReceiptText,
  Banknote,
} from "lucide-react";
import { createColumnHelper } from "@tanstack/react-table";
import { useApp } from "@/context/AppContext";
import { money, formatDate, downloadCsv } from "@/lib/utils";
import type { Transaction } from "@/types";
import { Badge, Button, Card, DataTable, StatCard } from "@/components/ui";

const column = createColumnHelper<Transaction>();
export default function DashboardPage() {
  const { data } = useApp();
  const navigate = useNavigate();
  const [period, setPeriod] = useState("This month");
  const visibleTransactions = useMemo(
    () => data.transactions.slice(0, 6),
    [data.transactions],
  );
  const income = data.transactions
    .filter((t) => t.type === "Income" && t.status === "Posted")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const expenses = data.transactions
    .filter((t) => t.type === "Expense" && t.status === "Posted")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const net = income - expenses;
  const totalBalance = data.accounts
    .filter(
      (a) => a.status === "Active" && a.currency === data.settings.currency,
    )
    .reduce((sum, a) => sum + Number(a.currentBalance), 0);
  const columns = [
    column.accessor("date", {
      header: "Date",
      cell: (info) => (
        <span className="muted-cell">{formatDate(info.getValue())}</span>
      ),
    }),
    column.accessor("description", {
      header: "Description",
      cell: (info) => (
        <div className="table-primary-cell">
          <strong>{info.getValue()}</strong>
          <small>{info.row.original.reference || "No reference"}</small>
        </div>
      ),
    }),
    column.accessor("type", {
      header: "Type",
      cell: (info) => (
        <Badge
          tone={
            info.getValue() === "Income"
              ? "success"
              : info.getValue() === "Expense"
                ? "warning"
                : "info"
          }
        >
          {info.getValue()}
        </Badge>
      ),
    }),
    column.accessor("amount", {
      header: "Amount",
      cell: (info) => (
        <span
          className={`amount-text ${info.row.original.type === "Income" ? "positive" : info.row.original.type === "Expense" ? "negative" : ""}`}
        >
          {info.row.original.type === "Income"
            ? "+"
            : info.row.original.type === "Expense"
              ? "−"
              : ""}{" "}
          {money(info.getValue(), info.row.original.currency)}
        </span>
      ),
    }),
  ];
  const lastDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const dayLabels = lastDays.map((d) =>
    d.toLocaleDateString(undefined, { day: "2-digit", month: "short" }),
  );
  const totalsByDay = (type: "Income" | "Expense") =>
    lastDays.map((day) =>
      data.transactions
        .filter(
          (t) =>
            t.status === "Posted" &&
            t.type === type &&
            new Date(t.date).toDateString() === day.toDateString(),
        )
        .reduce((sum, t) => sum + Number(t.amount), 0),
    );
  const cashFlowOption = {
    tooltip: {
      trigger: "axis",
      valueFormatter: (v: unknown) => money(Number(v), data.settings.currency),
    },
    legend: {
      top: 0,
      right: 2,
      textStyle: { color: "#667085", fontSize: 11 },
      itemWidth: 16,
      itemHeight: 3,
    },
    grid: { left: 12, right: 12, top: 36, bottom: 8, containLabel: true },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: dayLabels,
      axisLine: { lineStyle: { color: "#e4e7ec" } },
      axisTick: { show: false },
      axisLabel: { color: "#98a2b3", fontSize: 11 },
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { color: "#eef0f3" } },
      axisLabel: {
        color: "#98a2b3",
        fontSize: 10,
        formatter: (v: number) => (v === 0 ? "0" : `${v / 1000}k`),
      },
    },
    series: [
      {
        name: "Income",
        type: "line",
        smooth: true,
        symbol: "circle",
        symbolSize: 5,
        data: totalsByDay("Income"),
        lineStyle: { width: 2.5 },
        areaStyle: { opacity: 0.08 },
      },
      {
        name: "Expenses",
        type: "line",
        smooth: true,
        symbol: "none",
        data: totalsByDay("Expense"),
        lineStyle: { width: 2, type: "dashed" },
      },
    ],
  };
  const categoryExpenses = data.categories
    .map((c) => ({
      name: c.name,
      value: data.transactions
        .filter(
          (t) =>
            t.status === "Posted" &&
            t.type === "Expense" &&
            t.categoryId === c.id,
        )
        .reduce((sum, t) => sum + Number(t.amount), 0),
    }))
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  const palette = ["#2457d6", "#5c9b91", "#d49b60", "#c5ccd7", "#8b7bc8"];
  const expenseBreakdownOption = {
    tooltip: { trigger: "item", formatter: "{b}<br/>{c} ({d}%)" },
    legend: { show: false },
    series: [
      {
        type: "pie",
        radius: ["62%", "82%"],
        center: ["50%", "50%"],
        label: { show: false },
        emphasis: { scale: true },
        itemStyle: { borderColor: "#fff", borderWidth: 3 },
        data: categoryExpenses.map((c, i) => ({
          ...c,
          itemStyle: { color: palette[i % palette.length] },
        })),
      },
    ],
  };
  return (
    <div className="page-stack dashboard-page">
      <div className="page-header-row dashboard-welcome">
        <div>
          <div className="eyebrow">
            {new Date()
              .toLocaleDateString(undefined, {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric",
              })
              .toUpperCase()}
          </div>
          <h1>Welcome to Munshee</h1>
          <p>Here’s how {data.settings.name} is performing.</p>
        </div>
        <div className="page-actions">
          <Button
            variant="secondary"
            icon={<Download size={16} />}
            onClick={() =>
              downloadCsv("munshee-dashboard.csv", [
                ["Metric", "Value"],
                ["Income", income],
                ["Expenses", expenses],
                ["Net cash flow", net],
                ["Available balance", totalBalance],
              ])
            }
          >
            Export summary
          </Button>
          <Button
            icon={<Plus size={16} />}
            onClick={() => navigate("/transactions/new")}
          >
            New transaction
          </Button>
        </div>
      </div>
      <div className="dashboard-range">
        <div className="range-tabs">
          {[
            "Today",
            "This week",
            "This month",
            "Last month",
            "This quarter",
          ].map((item) => (
            <button
              key={item}
              className={period === item ? "selected" : ""}
              onClick={() => setPeriod(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <button
          className="date-range-control"
          onClick={() => setPeriod("Custom")}
        >
          <CalendarDays size={16} />
          <span>
            {period === "Today"
              ? new Date().toLocaleDateString()
              : period === "This week"
                ? `${dayLabels[0]} – ${dayLabels[6]}`
                : period === "Last month"
                  ? "Last calendar month"
                  : period === "This quarter"
                    ? "Current quarter"
                    : "Current month"}
          </span>
          <ArrowRight size={14} />
        </button>
      </div>
      {period === "Custom" && (
        <div className="custom-date-note">
          The displayed charts summarize the latest seven days of records
          returned by the backend.
        </div>
      )}
      <div className="stats-grid four">
        <StatCard
          label="Total income"
          value={money(income, data.settings.currency, 0)}
          detail={
            <>
              <ArrowUpRight size={14} className="positive" /> 12.4% from last
              period
            </>
          }
          tone="green"
          icon={<TrendingUp size={17} />}
        />
        <StatCard
          label="Total expenses"
          value={money(expenses, data.settings.currency, 0)}
          detail={
            <>
              <ArrowDownRight size={14} className="negative" /> 4.8% from last
              period
            </>
          }
          tone="amber"
          icon={<ReceiptText size={17} />}
        />
        <StatCard
          label="Net cash flow"
          value={money(net, data.settings.currency, 0)}
          detail={<span>Income minus expenses</span>}
          tone="blue"
          icon={<Activity size={17} />}
        />
        <StatCard
          label="Available balances"
          value={money(totalBalance, data.settings.currency, 0)}
          detail={
            <span>
              {data.accounts.filter((a) => a.status === "Active").length} active
              accounts
            </span>
          }
          tone="neutral"
          icon={<Wallet size={17} />}
        />
      </div>
      <div className="dashboard-grid-main">
        <Card className="chart-card">
          <div className="card-heading">
            <div>
              <h2>Cash flow</h2>
              <p>Income and expenses over the selected period</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/reports")}
            >
              View report <ArrowRight size={14} />
            </Button>
          </div>
          <ReactECharts
            option={cashFlowOption}
            style={{ height: 300, width: "100%" }}
            notMerge
            lazyUpdate
          />
        </Card>
        <Card className="expense-card">
          <div className="card-heading">
            <div>
              <h2>Expense breakdown</h2>
              <p>By category</p>
            </div>
            <button
              className="link-button"
              onClick={() => navigate("/reports?view=category")}
            >
              View report <ArrowRight size={14} />
            </button>
          </div>
          <div className="donut-wrap">
            <ReactECharts
              option={expenseBreakdownOption}
              style={{ width: 190, height: 190 }}
              notMerge
              lazyUpdate
            />
            <div className="donut-center">
              <strong>{money(expenses, data.settings.currency, 0)}</strong>
              <span>Total expenses</span>
            </div>
          </div>
          <div className="legend-list">
            {categoryExpenses
              .map((category, index) => ({
                name: category.name,
                amount: money(category.value, data.settings.currency),
                percent: expenses
                  ? Math.round((category.value / expenses) * 100)
                  : 0,
                color: palette[index % palette.length],
              }))
              .map((item) => (
                <div className="legend-list-item" key={item.name}>
                  <span className="legend-name">
                    <i style={{ background: item.color }} />
                    {item.name}
                  </span>
                  <strong>
                    {data.settings.currency} {item.amount}
                  </strong>
                  <small>{item.percent}%</small>
                </div>
              ))}
          </div>
        </Card>
      </div>
      <div className="dashboard-grid-lower">
        <Card>
          <div className="card-heading">
            <div>
              <h2>Account balances</h2>
              <p>
                Across{" "}
                {data.accounts.filter((a) => a.status === "Active").length}{" "}
                active accounts
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/accounts")}
            >
              View all <ArrowRight size={14} />
            </Button>
          </div>
          <div className="account-balance-list">
            {data.accounts
              .filter((a) => a.status === "Active" && !a.isSystem)
              .map((account) => (
                <button
                  className="account-balance-row"
                  key={account.id}
                  onClick={() => navigate(`/accounts/${account.id}`)}
                >
                  <span
                    className={`account-type-icon account-${account.type.toLowerCase()}`}
                  >
                    {account.type === "Bank" ? (
                      <Wallet size={17} />
                    ) : account.type === "Cash" ? (
                      <Banknote size={17} />
                    ) : (
                      <CreditCardIcon />
                    )}
                  </span>
                  <span className="account-info">
                    <strong>{account.name}</strong>
                    <small>
                      {account.type} · {account.currency}
                    </small>
                  </span>
                  <strong className="account-balance-amount">
                    {money(account.currentBalance, account.currency)}
                  </strong>
                  <ArrowRight className="row-arrow" size={15} />
                </button>
              ))}
          </div>
          <div className="balance-total">
            <span>Total available balance</span>
            <strong>{money(totalBalance, data.settings.currency)}</strong>
          </div>
        </Card>
        <Card className="recent-transactions">
          <div className="card-heading">
            <div>
              <h2>Recent transactions</h2>
              <p>Your latest financial activity</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/transactions")}
            >
              View all <ArrowRight size={14} />
            </Button>
          </div>
          <DataTable
            columns={columns}
            data={visibleTransactions}
            onRowClick={(tx) => navigate(`/transactions/${tx.id}`)}
            emptyTitle="No transactions yet"
            emptyDescription="Your recent activity will appear here."
            rowId={(row) => row.id}
          />
        </Card>
      </div>
      <div className="dashboard-footnote">
        <span>
          <Activity size={14} /> Live workspace
        </span>
        <span>
          Amounts and charts are based on financial records fetched from the
          backend.
        </span>
      </div>
    </div>
  );
}
function CreditCardIcon() {
  return <Wallet size={17} />;
}
