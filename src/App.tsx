import type { ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { AppLayout, RoleGuard } from "@/components/layout/AppLayout";
import DashboardPage from "@/features/dashboard/DashboardPage";
import {
  TransactionDetailPage,
  TransactionFormPage,
  TransactionsPage,
} from "@/features/transactions/TransactionsPages";
import {
  AccountDetailPage,
  AccountsPage,
} from "@/features/accounts/AccountsPages";
import CategoriesPage from "@/features/categories/CategoriesPage";
import { PartiesPage, PartyDetailPage } from "@/features/parties/PartiesPages";
import {
  BillDetailPage,
  BillFormPage,
  BillsPage,
} from "@/features/bills/BillPages";
import {
  InvoiceDetailPage,
  InvoiceFormPage,
  InvoicesPage,
} from "@/features/invoices/InvoicePages";
import LedgerPage from "@/features/ledger/LedgerPage";
import RecurringPage from "@/features/recurring/RecurringPage";
import {
  DocumentDetailPage,
  DocumentsPage,
} from "@/features/documents/DocumentsPages";
import ReportsPage from "@/features/reports/ReportsPage";
import InsightsPage from "@/features/insights/InsightsPage";
import AIAssistantPage from "@/features/insights/AIAssistantPage";
import InventoryPage from "@/features/inventory/InventoryPage";
import NotificationsPage from "@/features/notifications/NotificationsPage";
import TeamPage from "@/features/team/TeamPage";
import AuditLogsPage from "@/features/audit/AuditLogsPage";
import SubscriptionPage from "@/features/subscription/SubscriptionPage";
import {
  BusinessSettingsPage,
  CurrencyConverterPage,
  CurrencyRatesPage,
  SecurityPage,
} from "@/features/settings/SettingsPages";
import {
  AuthRouterGuard,
  ForgotPasswordPage,
  LoginPage,
  MfaChallengePage,
  RegisterPage,
  ResetPasswordPage,
  VerifyEmailPage,
} from "@/features/auth/AuthPages";
import { Button, PageHeader } from "@/components/ui";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

function RequireAuth({ children }: { children: ReactNode }) {
  const { signedIn } = useApp();
  const location = useLocation();
  if (!signedIn)
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}
function NotFoundPage() {
  return (
    <div className="page-stack">
      <PageHeader
        title="Page not found"
        description="The page you're looking for doesn't exist in this workspace."
        back={
          <Link to="/dashboard" className="back-link">
            <ArrowLeft size={15} /> Back to dashboard
          </Link>
        }
      />
      <div className="not-found-card">
        <h2>We couldn't find that page.</h2>
        <p>Use the workspace navigation to continue.</p>
        <Link to="/dashboard">
          <Button>Open dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
function AuthOnly({ children }: { children: ReactNode }) {
  return <AuthRouterGuard>{children}</AuthRouterGuard>;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <AuthOnly>
            <LoginPage />
          </AuthOnly>
        }
      />
      <Route
        path="/register"
        element={
          <AuthOnly>
            <RegisterPage />
          </AuthOnly>
        }
      />
      <Route
        path="/verify-email"
        element={
          <AuthOnly>
            <VerifyEmailPage />
          </AuthOnly>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <AuthOnly>
            <ForgotPasswordPage />
          </AuthOnly>
        }
      />
      <Route
        path="/reset-password"
        element={
          <AuthOnly>
            <ResetPasswordPage />
          </AuthOnly>
        }
      />
      <Route
        path="/mfa"
        element={
          <AuthOnly>
            <MfaChallengePage />
          </AuthOnly>
        }
      />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/transactions/new" element={<TransactionFormPage />} />
        <Route path="/transactions/:id" element={<TransactionDetailPage />} />
        <Route path="/accounts" element={<AccountsPage />} />
        <Route path="/accounts/:id" element={<AccountDetailPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/customers" element={<PartiesPage kind="Customer" />} />
        <Route path="/vendors" element={<PartiesPage kind="Vendor" />} />
        <Route path="/parties/:id" element={<PartyDetailPage />} />
        <Route path="/invoices" element={<InvoicesPage />} />
        <Route path="/invoices/new" element={<InvoiceFormPage />} />
        <Route path="/invoices/:id/edit" element={<InvoiceFormPage />} />
        <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
        <Route path="/bills" element={<BillsPage />} />
        <Route path="/bills/new" element={<BillFormPage />} />
        <Route path="/bills/:id/edit" element={<BillFormPage />} />
        <Route path="/bills/:id" element={<BillDetailPage />} />
        <Route path="/ledger" element={<LedgerPage />} />
        <Route path="/ledger/:partyId" element={<LedgerPage />} />
        <Route path="/recurring" element={<RecurringPage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/documents/:id" element={<DocumentDetailPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/insights" element={<InsightsPage />} />
        <Route path="/ai-assistant" element={<AIAssistantPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route
          path="/team"
          element={
            <RoleGuard allow={["Owner", "Admin"]}>
              <TeamPage />
            </RoleGuard>
          }
        />
        <Route
          path="/audit-logs"
          element={
            <RoleGuard allow={["Owner", "Admin"]}>
              <AuditLogsPage />
            </RoleGuard>
          }
        />
        <Route
          path="/subscription"
          element={
            <RoleGuard allow={["Owner"]}>
              <SubscriptionPage />
            </RoleGuard>
          }
        />
        <Route
          path="/settings/business"
          element={
            <RoleGuard allow={["Owner"]}>
              <BusinessSettingsPage />
            </RoleGuard>
          }
        />
        <Route
          path="/settings/currency-rates"
          element={
            <RoleGuard allow={["Owner"]}>
              <CurrencyRatesPage />
            </RoleGuard>
          }
        />
        <Route
          path="/settings/currency-converter"
          element={<CurrencyConverterPage />}
        />
        <Route path="/settings/security" element={<SecurityPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
