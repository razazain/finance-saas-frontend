import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type TableMeta,
} from "@tanstack/react-table";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  LoaderCircle,
  Search,
  X,
} from "lucide-react";
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

export function Button({
  children,
  variant = "primary",
  size = "md",
  type = "button",
  icon,
  className,
  loading,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "link";
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
  loading?: boolean;
}) {
  return (
    <button
      type={type}
      className={cn("btn", `btn-${variant}`, `btn-${size}`, className)}
      {...props}
      disabled={props.disabled || loading}
    >
      {loading ? <LoaderCircle className="spin" size={16} /> : icon}
      {children}
    </button>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "success" | "warning" | "danger" | "info" | "neutral" | "primary";
  className?: string;
}) {
  return (
    <span className={cn("badge", `badge-${tone}`, className)}>
      <span className="badge-dot" />
      {children}
    </span>
  );
}

export function Card({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <section className={cn("card", className)} {...props}>
      {children}
    </section>
  );
}

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  back,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  back?: ReactNode;
}) {
  return (
    <div className="page-header">
      {back && <div className="page-back">{back}</div>}
      <div className="page-header-row">
        <div>
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
        {actions && <div className="page-actions">{actions}</div>}
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  detail,
  icon,
  tone = "blue",
}: {
  label: string;
  value: string;
  detail?: ReactNode;
  icon?: ReactNode;
  tone?: "blue" | "green" | "amber" | "red" | "neutral";
}) {
  return (
    <div className={`stat-card stat-${tone}`}>
      <div className="stat-top">
        <span>{label}</span>
        {icon && <span className="stat-icon">{icon}</span>}
      </div>
      <strong>{value}</strong>
      {detail && <div className="stat-detail">{detail}</div>}
    </div>
  );
}

export function DataTable<
  TData extends import("@tanstack/react-table").RowData,
>({
  columns,
  data,
  onRowClick,
  emptyTitle = "No records found",
  emptyDescription = "Try changing your filters or create a new record.",
  rowId,
  meta,
}: {
  columns: ColumnDef<TData, any>[];
  data: TData[];
  onRowClick?: (row: TData) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  rowId?: (row: TData, index: number) => string;
  meta?: TableMeta<TData>;
}) {
  const table = useReactTable<TData>({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    meta,
  });
  if (!data.length)
    return (
      <div className="table-empty">
        <EmptyState title={emptyTitle} description={emptyDescription} />
      </div>
    );
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => (
                <th
                  key={header.id}
                  className={
                    header.column.columnDef.meta?.align === "right"
                      ? "text-right"
                      : ""
                  }
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row, index) => (
            <tr
              key={rowId?.(row.original, index) ?? row.id}
              onClick={() => onRowClick?.(row.original)}
              className={onRowClick ? "clickable-row" : ""}
            >
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className={
                    cell.column.columnDef.meta?.align === "right"
                      ? "text-right"
                      : ""
                  }
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  size = "md",
  footer,
  closeOnOutside = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  footer?: ReactNode;
  closeOnOutside?: boolean;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="dialog-overlay" />
        <DialogPrimitive.Content
          className={`dialog-content dialog-${size}`}
          onInteractOutside={(e) => {
            if (!closeOnOutside) e.preventDefault();
          }}
        >
          <div className="dialog-head">
            <div>
              <DialogPrimitive.Title className="dialog-title">
                {title}
              </DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="dialog-description">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close
              className="icon-button"
              aria-label="Close dialog"
            >
              <X size={18} />
            </DialogPrimitive.Close>
          </div>
          <div className="dialog-body">{children}</div>
          {footer && <div className="dialog-footer">{footer}</div>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("field", className)}>
      <label className="field-label">
        {label}
        {required && <span className="required"> *</span>}
      </label>
      {children}
      {error ? (
        <span className="field-error">
          <AlertCircle size={13} />
          {error}
        </span>
      ) : hint ? (
        <span className="field-hint">{hint}</span>
      ) : null}
    </div>
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("input", className)} {...props} />;
}
export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn("input select-input", className)} {...props}>
      {children}
    </select>
  );
}
export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("input textarea", className)} {...props} />;
}

export function SearchBox({
  value,
  onChange,
  placeholder = "Search…",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="search-box">
      <Search size={16} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </label>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon ?? <Info size={23} />}</div>
      <strong>{title}</strong>
      {description && <p>{description}</p>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}

export function Notice({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "success" | "warning" | "danger";
  title?: string;
  children: ReactNode;
}) {
  const Icon =
    tone === "success" ? CheckCircle2 : tone === "danger" ? AlertCircle : Info;
  return (
    <div className={`notice notice-${tone}`}>
      <Icon size={18} />
      <div>
        {title && <strong>{title}</strong>}
        <div>{children}</div>
      </div>
    </div>
  );
}

export function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  destructive,
  onConfirm,
  busy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  busy?: boolean;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description="Please review before continuing."
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant={destructive ? "danger" : "primary"}
            onClick={onConfirm}
            loading={busy}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="confirm-copy">{description}</div>
    </Dialog>
  );
}

export function Tabs({
  items,
  active,
  onChange,
}: {
  items: { label: string; value: string; count?: number }[];
  active: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="tabs" role="tablist">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={active === item.value}
          className={active === item.value ? "tab active" : "tab"}
          onClick={() => onChange(item.value)}
        >
          {item.label}
          {item.count !== undefined && <span>{item.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function InlineNotice({ children }: { children: ReactNode }) {
  return (
    <div className="inline-notice">
      <Info size={15} />
      <span>{children}</span>
    </div>
  );
}

export function PermissionNotice({
  role,
  action,
}: {
  role: string;
  action: string;
}) {
  return (
    <Notice tone="warning" title="Permission required">
      Your current {role.toLowerCase()} role cannot {action}. Switch to Owner or
      Admin in the profile menu to preview the full interface.
    </Notice>
  );
}

export function CurrencyAmount({
  value,
  currency = "PKR",
  positive,
  negative,
}: {
  value: string | number;
  currency?: string;
  positive?: boolean;
  negative?: boolean;
}) {
  const n = Number(value);
  const formatted = `${currency} ${Math.abs(n).toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return (
    <span
      className={`currency-amount ${positive || n > 0 ? "positive" : ""} ${negative || n < 0 ? "negative" : ""}`}
    >
      {n < 0 ? "− " : ""}
      {formatted}
    </span>
  );
}
