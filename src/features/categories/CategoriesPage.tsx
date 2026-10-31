import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { Edit3, Plus, Tags } from "lucide-react";
import { useApp } from "@/context/AppContext";
import {
  Badge,
  Button,
  Card,
  DataTable,
  Dialog,
  Field,
  Input,
  PageHeader,
  Select,
  Tabs,
  Textarea,
  PermissionNotice,
} from "@/components/ui";
import type { Category } from "@/types";

const helper = createColumnHelper<Category>();
export default function CategoriesPage() {
  const { data, role, addCategory, updateCategory, toggleCategory, toast } =
    useApp();
  const [kind, setKind] = useState("Income");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<Category["type"]>("Income");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const canManage = role === "Owner" || role === "Admin";
  const rows = useMemo(
    () =>
      data.categories.filter(
        (c) =>
          c.type === kind &&
          (c.name.toLowerCase().includes(search.toLowerCase()) ||
            (c.description || "").toLowerCase().includes(search.toLowerCase())),
      ),
    [data.categories, kind, search],
  );
  const openNew = () => {
    setEditing(null);
    setName("");
    setType(kind as Category["type"]);
    setDescription("");
    setError("");
    setOpen(true);
  };
  const openEdit = (c: Category) => {
    setEditing(c);
    setName(c.name);
    setType(c.type);
    setDescription(c.description || "");
    setError("");
    setOpen(true);
  };
  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Category name is required.");
      return;
    }
    if (editing) {
      updateCategory(editing.id, { name: name.trim(), type, description });
      toast({ title: "Category updated", tone: "success" });
    } else {
      addCategory({ name: name.trim(), type, description });
      toast({ title: "Category created", tone: "success" });
    }
    setOpen(false);
  };
  const columns = [
    helper.accessor("name", {
      header: "Category",
      cell: (i) => (
        <div className="table-primary-cell">
          <strong>{i.getValue()}</strong>
          <small>{i.row.original.description || "No description"}</small>
        </div>
      ),
    }),
    helper.accessor("type", {
      header: "Type",
      cell: (i) => (
        <Badge tone={i.getValue() === "Income" ? "success" : "warning"}>
          {i.getValue()}
        </Badge>
      ),
    }),
    helper.accessor("isSystem", {
      header: "Category kind",
      cell: (i) =>
        i.getValue() ? (
          <Badge tone="neutral">System</Badge>
        ) : (
          <Badge tone="info">Custom</Badge>
        ),
    }),
    helper.accessor("status", {
      header: "Status",
      cell: (i) => (
        <Badge tone={i.getValue() === "Active" ? "success" : "neutral"}>
          {i.getValue()}
        </Badge>
      ),
    }),
    helper.display({
      id: "actions",
      header: "",
      cell: (i) =>
        i.row.original.isSystem || !canManage ? (
          <span className="muted-cell">
            {i.row.original.isSystem ? "Protected" : "View only"}
          </span>
        ) : (
          <div className="table-actions">
            <Button
              size="sm"
              variant="ghost"
              icon={<Edit3 size={14} />}
              onClick={() => openEdit(i.row.original)}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                toggleCategory(i.row.original.id);
                toast({
                  title:
                    i.row.original.status === "Active"
                      ? "Category deactivated"
                      : "Category activated",
                  tone: "success",
                });
              }}
            >
              {i.row.original.status === "Active" ? "Deactivate" : "Activate"}
            </Button>
          </div>
        ),
    }),
  ];
  return (
    <div className="page-stack">
      <PageHeader
        title="Categories"
        description="Organize income and expenses for consistent reporting."
        actions={
          canManage ? (
            <Button icon={<Plus size={16} />} onClick={openNew}>
              New category
            </Button>
          ) : undefined
        }
      />
      <div className="tabs-and-search">
        <Tabs
          active={kind}
          onChange={(v) => setKind(v)}
          items={[
            {
              label: "Income",
              value: "Income",
              count: data.categories.filter((c) => c.type === "Income").length,
            },
            {
              label: "Expense",
              value: "Expense",
              count: data.categories.filter((c) => c.type === "Expense").length,
            },
          ]}
        />
        <div className="toolbar-search">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories…"
          />
        </div>
      </div>
      <Card className="list-card">
        <div className="category-intro">
          <span
            className={`category-intro-icon ${kind === "Income" ? "income" : "expense"}`}
          >
            <Tags size={18} />
          </span>
          <div>
            <strong>{kind} categories</strong>
            <p>
              {kind === "Income"
                ? "Use categories to understand where money comes from."
                : "Use categories to understand where your business spends money."}
            </p>
          </div>
        </div>
        <DataTable
          columns={columns}
          data={rows}
          rowId={(c) => c.id}
          emptyTitle={`No ${kind.toLowerCase()} categories found`}
          emptyDescription="Create a category to keep financial reporting organized."
        />
      </Card>
      {!canManage && (
        <PermissionNotice
          role={role}
          action="create, edit or deactivate categories"
        />
      )}
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit category" : "Create category"}
        description="Categories help group financial activity in reports."
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                document.getElementById("category-form-submit")?.click()
              }
            >
              {editing ? "Save changes" : "Create category"}
            </Button>
          </>
        }
      >
        <form className="form-stack" onSubmit={save}>
          <Field label="Category name" required error={error}>
            <Input
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              placeholder="e.g. Software subscriptions"
            />
          </Field>
          <Field label="Type" required>
            <Select
              value={type}
              onChange={(e) => setType(e.target.value as Category["type"])}
            >
              <option>Income</option>
              <option>Expense</option>
            </Select>
          </Field>
          <Field label="Description">
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What should this category be used for?"
            />
          </Field>
          <button
            id="category-form-submit"
            type="submit"
            className="visually-hidden"
          >
            Save
          </button>
        </form>
      </Dialog>
    </div>
  );
}
