import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createColumnHelper } from "@tanstack/react-table";
import {
  Check,
  Download,
  Eye,
  FileImage,
  FileText,
  FileUp,
  GitBranch,
  LoaderCircle,
  MoreHorizontal,
  Plus,
  ScanText,
  Trash2,
  UploadCloud,
  WandSparkles,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { financeApi } from "@/lib/api/services";
import { getApiErrorMessage } from "@/lib/api/client";
import { getPostableAccounts } from "@/lib/finance";
import { formatDateTime, money, todayIso } from "@/lib/utils";
import type { DocumentItem, DocumentType, EntryType } from "@/types";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  Dialog,
  Field,
  Input,
  Notice,
  PageHeader,
  Select,
  StatCard,
  Tabs,
  Textarea,
} from "@/components/ui";

const helper = createColumnHelper<DocumentItem>();
function processingTone(
  status: DocumentItem["processingStatus"],
): "success" | "warning" | "danger" | "info" | "neutral" {
  return status === "Processed"
    ? "success"
    : status === "Processing"
      ? "info"
      : status === "Failed"
        ? "danger"
        : "neutral";
}
function conversionTone(
  status: DocumentItem["conversionStatus"],
): "success" | "neutral" {
  return status === "Converted" ? "success" : "neutral";
}
export function DocumentsPage() {
  const { data, role, addDocument, processDocument, removeDocument, toast } =
    useApp();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("All");
  const [status, setStatus] = useState("All");
  const [deleteDoc, setDeleteDoc] = useState<DocumentItem | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputId = "document-upload-input";
  const filtered = useMemo(
    () =>
      data.documents.filter(
        (d) =>
          (type === "All" || d.type === type || d.classification === type) &&
          (status === "All" || d.processingStatus === status) &&
          `${d.name} ${d.originalName} ${d.type} ${d.classification}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [data.documents, type, status, search],
  );
  const onFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (file.size > 15 * 1024 * 1024) {
        toast({
          title: "File exceeds 15 MB",
          description: `${file.name} was not added.`,
          tone: "error",
        });
        return;
      }
      if (
        !["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(
          file.type,
        )
      ) {
        toast({
          title: "Unsupported file type",
          description: "Choose PDF, JPG/JPEG, PNG, or WebP.",
          tone: "error",
        });
        return;
      }
      void addDocument(
        {
          name: file.name,
          originalName: file.name,
          mimeType: file.type,
          size: file.size,
          type: "Unknown",
        },
        file,
      )
        .then((item) => navigate(`/documents/${item.id}`))
        .catch(() => {});
    });
  };
  const columns = [
    helper.accessor("name", {
      header: "Document",
      cell: (i) => (
        <div className="table-primary-cell document-name-cell">
          <span className="document-file-icon">
            {i.row.original.mimeType === "application/pdf" ? (
              <FileText size={18} />
            ) : (
              <FileImage size={18} />
            )}
          </span>
          <span>
            <strong>{i.getValue()}</strong>
            <small>
              {(i.row.original.size / 1024).toFixed(0)} KB ·{" "}
              {formatDateTime(i.row.original.uploadedAt)}
            </small>
          </span>
        </div>
      ),
    }),
    helper.accessor("type", {
      header: "Document type",
      cell: (i) => <Badge tone="neutral">{i.getValue()}</Badge>,
    }),
    helper.accessor("processingStatus", {
      header: "Processing",
      cell: (i) => (
        <Badge tone={processingTone(i.getValue())}>{i.getValue()}</Badge>
      ),
    }),
    helper.accessor("classification", {
      header: "Classification",
      cell: (i) => (
        <div className="table-primary-cell">
          <strong>{i.getValue()}</strong>
          <small>
            {i.row.original.confidence
              ? `${Math.round(i.row.original.confidence * 100)}% confidence`
              : "Not classified"}
          </small>
        </div>
      ),
    }),
    helper.accessor("conversionStatus", {
      header: "Conversion",
      cell: (i) => (
        <Badge tone={conversionTone(i.getValue())}>{i.getValue()}</Badge>
      ),
    }),
    helper.display({
      id: "actions",
      header: "",
      cell: (i) => (
        <div className="row-action-group">
          <Button
            variant="ghost"
            size="sm"
            icon={<Eye size={15} />}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/documents/${i.row.original.id}`);
            }}
          >
            Open
          </Button>
          {role !== "Employee" &&
            i.row.original.conversionStatus === "Not converted" && (
              <Button
                variant="ghost"
                size="sm"
                icon={<Trash2 size={14} />}
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteDoc(i.row.original);
                }}
              >
                Delete
              </Button>
            )}
        </div>
      ),
    }),
  ];
  const uploadLabel = (
    <label
      className={`upload-dropzone ${dragging ? "is-dragging" : ""}`}
      htmlFor={fileInputId}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        onFiles(e.dataTransfer.files);
      }}
    >
      <span className="upload-icon">
        <UploadCloud size={23} />
      </span>
      <strong>Upload a financial document</strong>
      <span>
        Drop a file here or <b>browse files</b>
      </span>
      <small>PDF, JPG, PNG or WebP · Up to 15 MB</small>
    </label>
  );
  return (
    <div className="page-stack">
      <PageHeader
        title="Documents"
        description="Upload, extract, review, and convert financial documents into records."
        actions={
          <>
            <input
              id={fileInputId}
              className="visually-hidden"
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) => {
                onFiles(e.target.files);
                e.currentTarget.value = "";
              }}
            />
            <Button
              icon={<Plus size={16} />}
              onClick={() => document.getElementById(fileInputId)?.click()}
            >
              Upload document
            </Button>
          </>
        }
      />
      <div className="stats-grid four">
        <StatCard
          label="All documents"
          value={String(data.documents.length)}
          detail="Stored in your business workspace"
          icon={<FileText size={17} />}
          tone="blue"
        />
        <StatCard
          label="Ready for review"
          value={String(
            data.documents.filter(
              (d) =>
                d.processingStatus === "Processed" &&
                d.conversionStatus === "Not converted",
            ).length,
          )}
          detail="Extraction is available"
          icon={<ScanText size={17} />}
          tone="green"
        />
        <StatCard
          label="Needs attention"
          value={String(
            data.documents.filter((d) => d.processingStatus === "Failed")
              .length,
          )}
          detail="Processing failed"
          icon={<GitBranch size={17} />}
          tone="amber"
        />
        <StatCard
          label="Converted"
          value={String(
            data.documents.filter((d) => d.conversionStatus === "Converted")
              .length,
          )}
          detail="Linked to a financial record"
          icon={<Check size={17} />}
          tone="neutral"
        />
      </div>
      {uploadLabel}
      <Card className="list-card">
        <div className="list-toolbar">
          <Tabs
            active={type}
            onChange={setType}
            items={[
              {
                label: "All documents",
                value: "All",
                count: data.documents.length,
              },
              { label: "Invoices", value: "Invoice" },
              { label: "Bills", value: "Bill" },
              { label: "Receipts", value: "Receipt" },
              { label: "Unknown", value: "Unknown" },
            ]}
          />
          <div className="toolbar-actions">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents…"
            />
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option>All</option>
              <option>Uploaded</option>
              <option>Processing</option>
              <option>Processed</option>
              <option>Failed</option>
            </Select>
          </div>
        </div>
        <DataTable
          columns={columns}
          data={filtered}
          onRowClick={(doc) => navigate(`/documents/${doc.id}`)}
          rowId={(d) => d.id}
          emptyTitle="No documents found"
          emptyDescription="Upload an invoice, bill, receipt, or financial statement to begin."
        />
      </Card>
      <div className="notice notice-info">
        <UploadCloud size={17} />
        <div>
          <strong>Private document workflow</strong>
          <p>
            Documents upload to Cloudinary using a signed backend upload flow.
            OCR runs through the configured backend OCR service.
          </p>
        </div>
      </div>
      <ConfirmDialog
        open={!!deleteDoc}
        onOpenChange={(o) => !o && setDeleteDoc(null)}
        title="Delete this document?"
        description={
          <p>
            {deleteDoc?.name} will be removed from your workspace. Converted
            documents are protected because they are linked to financial
            records.
          </p>
        }
        confirmLabel="Delete document"
        destructive
        onConfirm={() => {
          if (deleteDoc) {
            removeDocument(deleteDoc.id);
            setDeleteDoc(null);
            toast({ title: "Document removed", tone: "success" });
          }
        }}
      />
    </div>
  );
}

export function DocumentDetailPage() {
  const { id } = useParams();
  const {
    data,
    role,
    processDocument,
    updateDocumentReview,
    removeDocument,
    toast,
    reload,
  } = useApp();
  const navigate = useNavigate();
  const postableAccounts = getPostableAccounts(data);
  const doc = data.documents.find((d) => d.id === id);
  const canConvert = role === "Owner" || role === "Admin";
  const [reviewOpen, setReviewOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [classify, setClassify] = useState<DocumentType>(
    doc?.classification || "Unknown",
  );
  const [extracted, setExtracted] = useState<Record<string, string>>(
    doc?.extracted || {},
  );
  const [target, setTarget] = useState<"Invoice" | "Bill" | "Transaction">(
    "Transaction",
  );
  const [partyId, setPartyId] = useState("");
  const [accountId, setAccountId] = useState(postableAccounts[0]?.id || "");
  const [destinationAccountId, setDestinationAccountId] = useState(
    postableAccounts.find((a) => a.id !== postableAccounts[0]?.id)?.id || "",
  );
  const [categoryId, setCategoryId] = useState("");
  const [entryType, setEntryType] = useState<EntryType>("Expense");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayIso());
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  if (!doc)
    return (
      <div className="page-stack">
        <PageHeader
          title="Document not found"
          description="This document is not available in your workspace."
          back={
            <Link className="back-link" to="/documents">
              ← Back to documents
            </Link>
          }
        />
      </div>
    );
  const openReview = () => {
    setExtracted({ ...doc.extracted });
    setClassify(doc.classification);
    setReviewOpen(true);
  };
  const openConversion = () => {
    setTarget(
      doc.classification === "Invoice"
        ? "Invoice"
        : doc.classification === "Bill"
          ? "Bill"
          : "Transaction",
    );
    setPartyId(
      doc.extracted.customer
        ? data.parties.find(
            (p) =>
              p.name.toLowerCase() === doc.extracted.customer.toLowerCase(),
          )?.id || ""
        : "",
    );
    const sourceId = postableAccounts[0]?.id || "";
    setAccountId(sourceId);
    setDestinationAccountId(
      postableAccounts.find((a) => a.id !== sourceId)?.id || "",
    );
    setCategoryId(data.categories.find((c) => c.type === "Expense")?.id || "");
    setAmount(doc.extracted.total || "");
    setDate(doc.extracted.date || todayIso());
    setDueDate(doc.extracted.dueDate || "");
    setDescription(
      doc.extracted.vendor
        ? `Document from ${doc.extracted.vendor}`
        : `Converted from ${doc.originalName}`,
    );
    setReference(doc.extracted.documentNumber || "");
    setError("");
    setConvertOpen(true);
  };
  const saveReview = () => {
    updateDocumentReview(doc.id, { ...extracted, classification: classify });
    setReviewOpen(false);
    toast({
      title: "Review data saved",
      description: "Reviewed extraction was sent to the backend.",
      tone: "success",
    });
  };
  const convert = async (e: FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setError("Enter a valid total amount.");
      return;
    }
    if ((target === "Invoice" || target === "Bill") && !partyId) {
      setError(`Select a ${target === "Invoice" ? "customer" : "vendor"}.`);
      return;
    }
    if ((target === "Invoice" || target === "Bill") && !dueDate) {
      setError("Select a due date.");
      return;
    }
    if (target === "Transaction" && entryType === "Transfer") {
      setError(
        "Document conversion supports income or expense transactions only.",
      );
      return;
    }
    if (target === "Transaction" && (!accountId || !categoryId)) {
      setError("Select an account and category.");
      return;
    }
    try {
      const base = {
        amount: String(Number(amount).toFixed(2)),
        description: description || `Converted from ${doc.originalName}`,
        categoryId: categoryId || undefined,
      };
      let payload: any;
      let route = "";
      if (target === "Invoice") {
        payload = {
          targetType: "invoice",
          customerId: partyId,
          issueDate: new Date(date).toISOString(),
          dueDate: new Date(dueDate).toISOString(),
          ...base,
          items: [
            {
              description: base.description,
              quantity: "1",
              unitPrice: base.amount,
              categoryId: categoryId || undefined,
            },
          ],
        };
        route = "/invoices/";
      } else if (target === "Bill") {
        payload = {
          targetType: "bill",
          vendorId: partyId,
          billDate: new Date(date).toISOString(),
          dueDate: new Date(dueDate).toISOString(),
          ...base,
          items: [
            {
              description: base.description,
              quantity: "1",
              unitPrice: base.amount,
              categoryId: categoryId || undefined,
            },
          ],
        };
        route = "/bills/";
      } else {
        payload = {
          targetType: "transaction",
          type: entryType.toLowerCase(),
          accountId,
          categoryId,
          transactionDate: new Date(date).toISOString(),
          ...base,
          reference: reference || undefined,
        };
        route = "/transactions/";
      }
      const result = await financeApi.convertDocument(doc.id, payload);
      await reload();
      const record =
        result?.record ??
        result?.transaction ??
        result?.invoice ??
        result?.bill;
      const recordId = String(
        record?._id ??
          record?.id ??
          result?.document?.conversion?.targetId ??
          "",
      );
      setConvertOpen(false);
      toast({
        title: "Document converted",
        description: `Created a backend ${target.toLowerCase()} record.`,
        tone: "success",
      });
      if (recordId) navigate(`${route}${recordId}`);
      else navigate("/documents");
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };
  const docIcon =
    doc.mimeType === "application/pdf" ? (
      <FileText size={54} />
    ) : (
      <FileImage size={54} />
    );
  return (
    <div className="page-stack">
      <PageHeader
        title={doc.originalName}
        description={`Uploaded ${formatDateTime(doc.uploadedAt)} · ${(doc.size / 1024).toFixed(0)} KB`}
        back={
          <Link className="back-link" to="/documents">
            ← Back to documents
          </Link>
        }
        actions={
          <>
            {doc.processingStatus !== "Processed" && (
              <Button
                icon={<ScanText size={16} />}
                onClick={() => {
                  processDocument(doc.id);
                  toast({
                    title: "Document processed",
                    description:
                      "OCR runs through the configured backend service.",
                    tone: "success",
                  });
                }}
              >
                Process OCR
              </Button>
            )}
            {doc.processingStatus === "Processed" && (
              <Button variant="secondary" onClick={openReview}>
                Review extraction
              </Button>
            )}
            {doc.conversionStatus === "Not converted" && canConvert && (
              <Button icon={<GitBranch size={16} />} onClick={openConversion}>
                Convert
              </Button>
            )}
            {doc.conversionStatus === "Not converted" &&
              role !== "Employee" && (
                <Button variant="ghost" onClick={() => setDeleteOpen(true)}>
                  <Trash2 size={15} /> Delete
                </Button>
              )}
          </>
        }
      />
      <div className="document-workspace">
        <Card className="document-preview-card">
          <div className="document-preview-head">
            <span>Document preview</span>
            <Badge tone={processingTone(doc.processingStatus)}>
              {doc.processingStatus}
            </Badge>
          </div>
          <div className="file-preview">
            <div className="file-preview-art">{docIcon}</div>
            <strong>{doc.originalName}</strong>
            <span>
              {doc.mimeType === "application/pdf"
                ? "PDF document"
                : doc.mimeType.replace("image/", "").toUpperCase()}{" "}
              · {(doc.size / 1024).toFixed(0)} KB
            </span>
            <small>
              Open the authenticated content endpoint to retrieve the stored
              document.
            </small>
          </div>
          <div className="file-preview-footer">
            <span>
              <ShieldCheckIcon /> Secure document workspace
            </span>
            <Button
              variant="secondary"
              size="sm"
              icon={<Download size={15} />}
              onClick={async () => {
                try {
                  const blob = await financeApi.documentContent(doc.id);
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = doc.originalName;
                  a.click();
                  URL.revokeObjectURL(url);
                } catch (e) {
                  toast({
                    title: "Document download failed",
                    description: getApiErrorMessage(e),
                    tone: "error",
                  });
                }
              }}
            >
              Download
            </Button>
          </div>
        </Card>
        <div className="document-metadata-column">
          <Card>
            <div className="card-heading">
              <div>
                <h2>Processing details</h2>
                <p>Status and extracted classification</p>
              </div>
            </div>
            <div className="detail-field-grid">
              <Detail label="Document type" value={doc.type} />
              <Detail label="Processing status" value={doc.processingStatus} />
              <Detail label="Classification" value={doc.classification} />
              <Detail
                label="Confidence"
                value={
                  doc.confidence
                    ? `${Math.round(doc.confidence * 100)}%`
                    : "Not available"
                }
              />
              <Detail label="Conversion" value={doc.conversionStatus} />
              {doc.convertedRecordId && (
                <Detail label="Created record" value={doc.convertedRecordId} />
              )}
            </div>
            {doc.processingStatus === "Failed" && (
              <Notice tone="danger" title="Processing failed">
                Try processing the document again. The original text/file
                metadata remain available.
              </Notice>
            )}
            {doc.processingStatus !== "Processed" && (
              <Button
                className="full-width"
                onClick={() => {
                  processDocument(doc.id);
                  toast({
                    title: "OCR complete",
                    description: "The extracted values are ready to review.",
                    tone: "success",
                  });
                }}
                icon={<WandSparkles size={16} />}
              >
                Run OCR extraction
              </Button>
            )}
            {doc.processingStatus === "Processed" && (
              <Button
                className="full-width"
                variant="secondary"
                onClick={openReview}
              >
                Review and edit extracted fields
              </Button>
            )}
          </Card>
          <Card>
            <div className="card-heading">
              <div>
                <h2>Extracted information</h2>
                <p>Best-effort OCR output · verify before use</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                disabled={doc.processingStatus !== "Processed"}
                onClick={openReview}
              >
                Edit
              </Button>
            </div>
            {doc.processingStatus !== "Processed" ? (
              <div className="muted-panel-text">
                Process the document to inspect extracted fields.
              </div>
            ) : (
              <div className="extracted-fields">
                {Object.entries(doc.extracted)
                  .filter(([key]) => !["rawText"].includes(key))
                  .map(([key, value]) => (
                    <div className="extracted-row" key={key}>
                      <span>
                        {key
                          .replace(/([A-Z])/g, " $1")
                          .replace(/^./, (s) => s.toUpperCase())}
                      </span>
                      <strong>{value || "—"}</strong>
                    </div>
                  ))}
              </div>
            )}
            {doc.rawText && (
              <details className="raw-text-details">
                <summary>View raw OCR text</summary>
                <pre>{doc.rawText}</pre>
              </details>
            )}
          </Card>
          <Card>
            <div className="card-heading">
              <div>
                <h2>Next step</h2>
                <p>Review before creating an official financial record</p>
              </div>
            </div>
            {doc.conversionStatus === "Converted" ? (
              <Notice tone="success" title="Document converted">
                This document is linked to a{" "}
                {doc.convertedRecordType?.toLowerCase()}. It cannot be deleted
                from the workflow.
              </Notice>
            ) : (
              <>
                <Notice tone="info">
                  OCR values may be inaccurate. Review names, dates, tax, and
                  totals before conversion.
                </Notice>
                <Button
                  className="full-width"
                  icon={<GitBranch size={16} />}
                  disabled={!canConvert || doc.processingStatus !== "Processed"}
                  onClick={openConversion}
                >
                  Convert into a financial record
                </Button>
                {!canConvert && (
                  <p className="field-hint">
                    Only Owner or Admin can convert documents.
                  </p>
                )}
              </>
            )}
          </Card>
        </div>
      </div>
      <Dialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        title="Review extracted information"
        description="Edit OCR values and select the best classification before conversion."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setReviewOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveReview}>Save review</Button>
          </>
        }
      >
        <div className="review-warning">
          <Notice tone="warning" title="Please verify each value">
            OCR is best-effort. The extracted values are not automatically
            trusted as financial records.
          </Notice>
        </div>
        <div className="form-stack">
          <Notice tone="info">
            Classification is generated by the backend after OCR. Select the
            target record type in the conversion step if you need a different
            record type.
          </Notice>
          <div className="form-grid two">
            {[
              "documentNumber",
              "date",
              "dueDate",
              "vendor",
              "customer",
              "subtotal",
              "tax",
              "total",
              "currency",
              "paid",
              "due",
            ].map((key) => (
              <Field
                key={key}
                label={key
                  .replace(/([A-Z])/g, " $1")
                  .replace(/^./, (s) => s.toUpperCase())}
              >
                <Input
                  value={extracted[key] || ""}
                  onChange={(e) =>
                    setExtracted((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  placeholder="Not detected"
                />
              </Field>
            ))}
          </div>
          <Field label="Raw OCR text">
            <Textarea rows={5} value={doc.rawText} readOnly />
          </Field>
        </div>
      </Dialog>
      <Dialog
        open={convertOpen}
        onOpenChange={setConvertOpen}
        title="Convert document"
        description="Create a draft financial record using the reviewed extracted values."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConvertOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => document.getElementById("convert-submit")?.click()}
            >
              Create financial record
            </Button>
          </>
        }
      >
        <form className="form-stack" onSubmit={convert}>
          <Notice tone="warning" title="Confirm before conversion">
            This will create an official record through the backend. Review the
            resulting record before sending or posting.
          </Notice>
          <Field label="Target record" required>
            <Select
              value={target}
              onChange={(e) => setTarget(e.target.value as typeof target)}
            >
              <option>Invoice</option>
              <option>Bill</option>
              <option>Transaction</option>
            </Select>
          </Field>
          {target === "Invoice" || target === "Bill" ? (
            <Field
              label={target === "Invoice" ? "Customer" : "Vendor"}
              required
            >
              <Select
                value={partyId}
                onChange={(e) => setPartyId(e.target.value)}
              >
                <option value="">Select contact</option>
                {data.parties
                  .filter((p) =>
                    target === "Invoice"
                      ? p.type === "Customer" || p.type === "Both"
                      : p.type === "Vendor" || p.type === "Both",
                  )
                  .map((p) => (
                    <option value={p.id} key={p.id}>
                      {p.name}
                    </option>
                  ))}
              </Select>
            </Field>
          ) : (
            <div className="form-grid two">
              <Field label="Transaction type" required>
                <Select
                  value={entryType}
                  onChange={(e) => {
                    const v = e.target.value as EntryType;
                    setEntryType(v);
                    setCategoryId(
                      data.categories.find(
                        (c) =>
                          c.type === (v === "Income" ? "Income" : "Expense"),
                      )?.id || "",
                    );
                  }}
                >
                  <option>Income</option>
                  <option>Expense</option>
                </Select>
              </Field>
              <Field
                label={entryType === "Transfer" ? "From account" : "Account"}
                required
              >
                <Select
                  value={accountId}
                  onChange={(e) => {
                    setAccountId(e.target.value);
                    if (e.target.value === destinationAccountId)
                      setDestinationAccountId(
                        postableAccounts.find((a) => a.id !== e.target.value)
                          ?.id || "",
                      );
                  }}
                >
                  {postableAccounts.map((a) => (
                    <option value={a.id} key={a.id}>
                      {a.name}
                    </option>
                  ))}
                </Select>
              </Field>
              {entryType === "Transfer" && (
                <Field label="Destination account" required>
                  <Select
                    value={destinationAccountId}
                    onChange={(e) => setDestinationAccountId(e.target.value)}
                  >
                    <option value="">Select destination</option>
                    {postableAccounts
                      .filter((a) => a.id !== accountId)
                      .map((a) => (
                        <option value={a.id} key={a.id}>
                          {a.name}
                        </option>
                      ))}
                  </Select>
                </Field>
              )}
            </div>
          )}
          {target === "Transaction" && entryType !== "Transfer" && (
            <Field label="Category" required>
              <Select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                {data.categories
                  .filter(
                    (c) =>
                      c.type ===
                      (entryType === "Income" ? "Income" : "Expense"),
                  )
                  .map((c) => (
                    <option value={c.id} key={c.id}>
                      {c.name}
                    </option>
                  ))}
              </Select>
            </Field>
          )}
          <div className="form-grid two">
            <Field label="Amount" required error={error}>
              <Input
                inputMode="decimal"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError("");
                }}
              />
            </Field>
            <Field
              label={target === "Bill" ? "Bill date" : "Record date"}
              required
            >
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
            {(target === "Invoice" || target === "Bill") && (
              <Field label="Due date" required>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </Field>
            )}
            <Field label="Description">
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
            <Field label="Reference">
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </Field>
          </div>
          {error && <div className="field-error">{error}</div>}
          <button id="convert-submit" type="submit" className="visually-hidden">
            Convert
          </button>
        </form>
      </Dialog>
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete unconverted document?"
        description={
          <p>
            The document will be removed from the local workspace. Converted
            documents are protected.
          </p>
        }
        confirmLabel="Delete document"
        destructive
        onConfirm={() => {
          removeDocument(doc.id);
          setDeleteOpen(false);
          navigate("/documents");
          toast({ title: "Document deleted", tone: "success" });
        }}
      />
    </div>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-field">
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}
function ShieldCheckIcon() {
  return <Check size={14} />;
}
