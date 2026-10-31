import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { Edit3, Mail, Plus, ShieldCheck, UserMinus, Users } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { Role, TeamMember } from "@/types";
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
  Notice,
} from "@/components/ui";
const helper = createColumnHelper<TeamMember>();
export default function TeamPage() {
  const {
    data,
    role,
    addTeamMember,
    updateTeamMember,
    toggleTeamMember,
    toast,
  } = useApp();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [deactivate, setDeactivate] = useState<TeamMember | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "Employee" as Role,
    password: "",
  });
  const [error, setError] = useState("");
  const canManage = role === "Owner" || role === "Admin";
  const rows = useMemo(
    () =>
      data.team.filter((u) =>
        `${u.name} ${u.email} ${u.role}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [data.team, search],
  );
  const startNew = () => {
    setEditing(null);
    setForm({ name: "", email: "", role: "Employee", password: "" });
    setError("");
    setOpen(true);
  };
  const startEdit = (user: TeamMember) => {
    setEditing(user);
    setForm({
      name: user.name,
      email: user.email,
      role: user.role,
      password: "",
    });
    setError("");
    setOpen(true);
  };
  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!editing && form.password.length < 8) {
      setError("Use an initial password with at least 8 characters.");
      return;
    }
    if (editing) {
      updateTeamMember(editing.id, { name: form.name.trim(), role: form.role });
      toast({ title: "Team member updated", tone: "success" });
    } else {
      addTeamMember({
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        password: form.password,
      });
      toast({
        title: "Team member created",
        description:
          "Share the initial password with the user through your approved secure channel.",
        tone: "success",
      });
    }
    setOpen(false);
  };
  const columns = [
    helper.accessor("name", {
      header: "Team member",
      cell: (i) => (
        <div className="team-person">
          <span className="avatar">
            {i
              .getValue()
              .split(" ")
              .map((v) => v[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </span>
          <div>
            <strong>{i.getValue()}</strong>
            <small>{i.row.original.email}</small>
          </div>
        </div>
      ),
    }),
    helper.accessor("role", {
      header: "Role",
      cell: (i) => (
        <Badge
          tone={
            i.getValue() === "Owner"
              ? "primary"
              : i.getValue() === "Admin"
                ? "info"
                : "neutral"
          }
        >
          {i.getValue()}
        </Badge>
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
    helper.accessor("lastLoginAt", {
      header: "Last login",
      cell: (i) => formatDateTime(i.getValue()),
    }),
    helper.accessor("createdAt", {
      header: "Added",
      cell: (i) => formatDate(i.getValue()),
    }),
    helper.display({
      id: "actions",
      header: "",
      cell: (i) =>
        i.row.original.role === "Owner" ? (
          <span className="muted-cell">Workspace owner</span>
        ) : !canManage ? (
          <span className="muted-cell">View only</span>
        ) : (
          <div className="table-actions">
            <Button
              size="sm"
              variant="ghost"
              icon={<Edit3 size={14} />}
              onClick={() => startEdit(i.row.original)}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon={<UserMinus size={14} />}
              onClick={() => setDeactivate(i.row.original)}
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
        title="Team"
        description="Manage user access to your Munshee workspace."
        actions={
          canManage ? (
            <Button icon={<Plus size={16} />} onClick={startNew}>
              Add team member
            </Button>
          ) : undefined
        }
      />
      <div className="stats-grid three">
        <StatCard
          label="Team members"
          value={String(data.team.length)}
          detail={`Limit ${data.subscription.usersLimit} on ${data.subscription.plan}`}
          icon={<Users size={17} />}
          tone="blue"
        />
        <StatCard
          label="Active members"
          value={String(data.team.filter((u) => u.status === "Active").length)}
          detail="Can access the workspace"
          icon={<ShieldCheck size={17} />}
          tone="green"
        />
        <StatCard
          label="Seats remaining"
          value={String(
            Math.max(
              0,
              data.subscription.usersLimit -
                data.team.filter((u) => u.status === "Active").length,
            ),
          )}
          detail="Based on current plan limit"
          icon={<Mail size={17} />}
          tone="neutral"
        />
      </div>
      <Card className="list-card">
        <div className="list-toolbar">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search team members…"
          />
        </div>
        <DataTable
          columns={columns}
          data={rows}
          rowId={(u) => u.id}
          emptyTitle="No team members found"
          emptyDescription="Add a team member to provide workspace access."
        />
      </Card>
      {!canManage && (
        <Notice tone="warning">
          Your current role can view the team but cannot add, edit, or
          deactivate members.
        </Notice>
      )}
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit team member" : "Add team member"}
        description="Assign the appropriate role for the user's responsibilities."
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => document.getElementById("team-submit")?.click()}
            >
              {editing ? "Save changes" : "Add member"}
            </Button>
          </>
        }
      >
        <form className="form-stack" onSubmit={save}>
          <Field label="Full name" required error={error}>
            <Input
              autoFocus
              value={form.name}
              onChange={(e) => {
                setForm({ ...form, name: e.target.value });
                setError("");
              }}
              placeholder="e.g. Sara Ali"
            />
          </Field>
          <Field label="Email address" required>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="sara@company.com"
              disabled={!!editing}
            />
          </Field>
          {!editing && (
            <Field label="Initial password" required>
              <Input
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="At least 8 characters"
              />
            </Field>
          )}
          <Field label="Role" required>
            <Select
              value={form.role}
              onChange={(e) =>
                setForm({ ...form, role: e.target.value as Role })
              }
            >
              <option>Employee</option>
              <option>Admin</option>
            </Select>
            <span className="field-hint">
              The owner role cannot be assigned or changed from this screen.
            </span>
          </Field>
          <Notice tone="warning">
            The backend creates the account but does not email an invitation or
            initial password. Share the initial password securely outside the
            app.
          </Notice>
          <button id="team-submit" className="visually-hidden" type="submit">
            Save user
          </button>
        </form>
      </Dialog>
      <ConfirmDialog
        open={!!deactivate}
        onOpenChange={(o) => !o && setDeactivate(null)}
        title={`${deactivate?.status === "Active" ? "Deactivate" : "Reactivate"} ${deactivate?.name || "team member"}?`}
        description={
          <p>
            {deactivate?.status === "Active"
              ? "This user will be marked inactive in your workspace."
              : "This user will be marked active again in your workspace."}
          </p>
        }
        confirmLabel={
          deactivate?.status === "Active" ? "Deactivate" : "Reactivate"
        }
        destructive={deactivate?.status === "Active"}
        onConfirm={() => {
          if (deactivate) {
            toggleTeamMember(deactivate.id);
            setDeactivate(null);
            toast({ title: "Team member status updated", tone: "success" });
          }
        }}
      />
    </div>
  );
}
