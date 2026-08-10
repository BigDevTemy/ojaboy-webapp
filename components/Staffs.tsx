"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, LoaderCircle, Pencil, Plus, RefreshCw, Search, ShieldCheck, Trash2, Users, X } from "lucide-react";
import { ACCESS_CONTROL_ROLES_URL, API_BASE_URL, STAFF_USERS_URL, USERS_URL } from "@/Serverurls";
import { authenticatedFetch } from "@/lib/authClient";
import { getApiErrorMessage } from "@/lib/apiError";
import { useAuthSession } from "@/lib/useAuthSession";

type Staff = { id: string; fullName: string; email: string; role: string };
type Role = { id: string; name: string };

const usersEndpoint = `${API_BASE_URL}${USERS_URL}`;
const staffUsersEndpoint = `${API_BASE_URL}${STAFF_USERS_URL}`;
const rolesEndpoint = `${API_BASE_URL}${ACCESS_CONTROL_ROLES_URL}`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readText(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function readRole(value: Record<string, unknown>) {
  const nestedRole = isRecord(value.role) ? value.role : null;
  const firstRole = Array.isArray(value.roles) ? value.roles[0] : null;
  const firstRoleRecord = isRecord(firstRole) ? firstRole : null;
  return readText(value.role)
    || (nestedRole ? readText(nestedRole.name ?? nestedRole.title ?? nestedRole.slug) : "")
    || readText(firstRole)
    || (firstRoleRecord ? readText(firstRoleRecord.name ?? firstRoleRecord.title ?? firstRoleRecord.slug) : "");
}

function unwrapList(body: unknown, keys: string[]) {
  let candidate: unknown = body;
  for (let depth = 0; depth < 3 && isRecord(candidate); depth += 1) {
    const record = candidate;
    const next = keys.map((key) => record[key]).find((value) => Array.isArray(value) || isRecord(value));
    if (next === undefined) break;
    candidate = next;
  }
  return Array.isArray(candidate) ? candidate : [candidate];
}

function parseStaffs(body: unknown): Staff[] {
  return unwrapList(body, ["data", "users", "results", "items"]).flatMap((value) => {
    if (!isRecord(value)) return [];
    const id = readText(value.id ?? value.userId);
    const email = readText(value.email);
    const role = readRole(value);
    if (!id || role.toLowerCase() === "user") return [];
    return [{ id, email, role: role || "No role", fullName: readText(value.fullName ?? value.name) || email || "Unnamed staff" }];
  });
}

function parseRoles(body: unknown): Role[] {
  return unwrapList(body, ["data", "roles", "results", "items"]).flatMap((value) => {
    if (typeof value === "string" && value.trim()) return [{ id: value, name: value }];
    if (!isRecord(value)) return [];
    const id = readText(value.id ?? value.roleId ?? value.name);
    const name = readText(value.name ?? value.role ?? value.title);
    return id && name ? [{ id, name }] : [];
  });
}

export function Staffs() {
  const session = useAuthSession();
  const isSuperAdmin = (session?.user.role || "").replace(/[\s_-]/g, "").toLowerCase() === "superadmin";
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState("");
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [isEditingLoading, setIsEditingLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRoleId, setEditRoleId] = useState("");

  const loadData = useCallback(async (searchTerm = "") => {
    if (!isSuperAdmin) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const [usersResponse, rolesResponse] = await Promise.all([
        authenticatedFetch(`${staffUsersEndpoint}?${new URLSearchParams({ page: "1", limit: "50", ...(searchTerm.trim() ? { search: searchTerm.trim() } : {}) }).toString()}`, { headers: { Accept: "application/json" } }),
        authenticatedFetch(rolesEndpoint, { headers: { Accept: "application/json" } }),
      ]);
      if (!usersResponse.ok) throw new Error(await getApiErrorMessage(usersResponse, "Unable to load staff accounts."));
      if (!rolesResponse.ok) throw new Error(await getApiErrorMessage(rolesResponse, "Unable to load roles."));
      const [usersBody, rolesBody] = await Promise.all([usersResponse.json(), rolesResponse.json()]);
      const parsedRoles = parseRoles(rolesBody as unknown);
      setStaffs(parseStaffs(usersBody as unknown));
      setRoles(parsedRoles);
      setRoleId((current) => current || parsedRoles.find((role) => role.name.toLowerCase() !== "user")?.id || "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load staff accounts.");
    } finally {
      setIsLoading(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadData(search), 300);
    return () => window.clearTimeout(timeoutId);
  }, [loadData, search]);

  const staffRoles = useMemo(() => roles.filter((role) => role.name.toLowerCase() !== "user"), [roles]);
  const filteredStaffs = staffs;

  async function createStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isSuperAdmin || !email.trim() || !fullName.trim() || !password || !roleId) return;
    setIsCreating(true); setError(""); setNotice("");
    try {
      const response = await authenticatedFetch(usersEndpoint, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), fullName: fullName.trim(), password, roleId }),
      });
      if (!response.ok) throw new Error(await getApiErrorMessage(response, "Unable to create the staff account."));
      setEmail(""); setFullName(""); setPassword(""); setNotice("Staff account created successfully.");
      await loadData(search);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create the staff account.");
    } finally {
      setIsCreating(false);
    }
  }

  async function openEdit(staff: Staff) {
    if (!isSuperAdmin) return;
    setIsEditingLoading(true); setError(""); setNotice("");
    try {
      const response = await authenticatedFetch(`${usersEndpoint}/${encodeURIComponent(staff.id)}`, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(await getApiErrorMessage(response, "Unable to retrieve the staff account."));
      const parsed = parseStaffs((await response.json()) as unknown)[0] ?? staff;
      setEditingStaff(parsed);
      setEditFullName(parsed.fullName);
      setEditEmail(parsed.email);
      setEditPassword("");
      setEditRoleId(roles.find((role) => role.name.toLowerCase() === parsed.role.toLowerCase())?.id || "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to retrieve the staff account.");
    } finally {
      setIsEditingLoading(false);
    }
  }

  async function updateStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingStaff || !isSuperAdmin) return;
    const isSelf = editingStaff.id === session?.user.id;
    const payload: Record<string, string> = {};
    if (editFullName.trim() && editFullName.trim() !== editingStaff.fullName) payload.fullName = editFullName.trim();
    if (editEmail.trim() && editEmail.trim() !== editingStaff.email) payload.email = editEmail.trim();
    if (editPassword) payload.password = editPassword;
    const originalRoleId = roles.find((role) => role.name.toLowerCase() === editingStaff.role.toLowerCase())?.id;
    if (!isSelf && editRoleId && editRoleId !== originalRoleId) payload.roleId = editRoleId;
    if (!Object.keys(payload).length) {
      setError("Change at least one field before saving.");
      return;
    }
    setIsUpdating(true); setError(""); setNotice("");
    try {
      const response = await authenticatedFetch(`${usersEndpoint}/${encodeURIComponent(editingStaff.id)}`, {
        method: "PATCH",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(await getApiErrorMessage(response, "Unable to update the staff account."));
      setEditingStaff(null); setNotice("Staff account updated successfully.");
      await loadData(search);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update the staff account.");
    } finally {
      setIsUpdating(false);
    }
  }

  async function deleteStaff(staff: Staff) {
    if (!isSuperAdmin || staff.id === session?.user.id) return;
    if (!window.confirm(`Delete ${staff.fullName}? This action cannot be undone.`)) return;
    setDeletingId(staff.id); setError(""); setNotice("");
    try {
      const response = await authenticatedFetch(`${usersEndpoint}/${encodeURIComponent(staff.id)}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(await getApiErrorMessage(response, "Unable to delete the staff account."));
      setNotice("Staff account deleted successfully.");
      await loadData(search);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to delete the staff account.");
    } finally {
      setDeletingId("");
    }
  }

  if (!isSuperAdmin) {
    return (
      <section className="mx-auto max-w-xl rounded-xl border border-black/10 bg-white p-8 text-center shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
        <ShieldCheck className="mx-auto text-[#f10606]" size={32} />
        <h1 className="mt-4 text-2xl font-black text-black">Superadmin access required</h1>
        <p className="mt-2 text-sm font-medium leading-6 text-black/55">Only a superadmin can retrieve, create, update, or delete managed staff accounts.</p>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-3xl font-black text-black">Staffs</h1><p className="mt-2 text-sm font-medium text-black/55">View staff accounts and their assigned access roles.</p></div>
        <button className="flex h-10 items-center justify-center gap-2 rounded-lg border border-black/10 px-4 text-xs font-black text-black/65 disabled:opacity-50" disabled={isLoading} type="button" onClick={() => void loadData(search)}><RefreshCw className={isLoading ? "animate-spin" : ""} size={16} />Refresh</button>
      </header>

      {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700" role="alert">{error}</p> : null}
      {notice ? <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700" role="status">{notice}</p> : null}

      <div className={`grid gap-5 ${isSuperAdmin ? "xl:grid-cols-[1.15fr_0.85fr]" : ""}`}>
        <section className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
          <div className="flex flex-col gap-3 bg-[#fff5f5] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="flex items-center gap-2 text-lg font-black"><Users className="text-[#f10606]" size={20} />Staff accounts</h2><p className="mt-1 text-xs font-bold text-black/45">{staffs.length} non-customer users</p></div>
            <div className="relative sm:w-72"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black/35" size={16} /><input aria-label="Search staff" className="h-10 w-full rounded-lg border border-black/10 bg-white pl-9 pr-3 text-xs outline-none focus:border-[#f10606]" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search staff..." /></div>
          </div>
          {isLoading ? <div className="flex justify-center py-16"><LoaderCircle className="animate-spin text-[#f10606]" size={28} /></div> : filteredStaffs.length ? (
            <div className="divide-y divide-black/10">{filteredStaffs.map((staff) => (
              <article className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-center" key={staff.id}>
                <div className="min-w-0"><p className="truncate text-sm font-black text-black">{staff.fullName}</p><p className="mt-1 truncate text-xs font-medium text-black/45">{staff.email || staff.id}</p></div>
                <p className="truncate text-[10px] font-bold text-black/35">{staff.id}</p>
                <span className="w-max rounded-full bg-[#fff0f0] px-3 py-1.5 text-[10px] font-black text-[#d90505]">{staff.role}</span>
                {isSuperAdmin ? <div className="flex gap-2"><button aria-label={`Edit ${staff.fullName}`} className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-black/55 hover:text-[#f10606] disabled:opacity-45" disabled={isEditingLoading} type="button" onClick={() => void openEdit(staff)}>{isEditingLoading ? <LoaderCircle className="animate-spin" size={15} /> : <Pencil size={15} />}</button><button aria-label={`Delete ${staff.fullName}`} className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-35" disabled={staff.id === session?.user.id || Boolean(deletingId)} title={staff.id === session?.user.id ? "You cannot delete your own account" : undefined} type="button" onClick={() => void deleteStaff(staff)}>{deletingId === staff.id ? <LoaderCircle className="animate-spin" size={15} /> : <Trash2 size={15} />}</button></div> : null}
              </article>
            ))}</div>
          ) : <div className="px-5 py-16 text-center"><ShieldCheck className="mx-auto text-[#f10606]" size={27} /><p className="mt-3 text-sm font-black">{staffs.length ? "No staff match your search." : "No staff accounts found."}</p></div>}
        </section>

        {isSuperAdmin ? (
          <form className="h-max rounded-xl border border-black/10 bg-white p-5 shadow-[0_14px_35px_rgba(0,0,0,0.04)]" onSubmit={createStaff}>
            <h2 className="flex items-center gap-2 text-lg font-black"><Plus className="text-[#f10606]" size={20} />Create staff</h2>
            <p className="mt-1 text-xs font-medium text-black/45">Only super admins can create staff accounts.</p>
            <label className="mt-5 block text-xs font-black text-black/60">Full name<input className="mt-2 h-11 w-full rounded-lg border border-black/10 px-3 text-sm outline-none focus:border-[#f10606]" required value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Staff Member" /></label>
            <label className="mt-4 block text-xs font-black text-black/60">Email<input className="mt-2 h-11 w-full rounded-lg border border-black/10 px-3 text-sm outline-none focus:border-[#f10606]" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="staff@example.com" /></label>
            <label className="mt-4 block text-xs font-black text-black/60">Role<select className="mt-2 h-11 w-full rounded-lg border border-black/10 bg-white px-3 text-sm outline-none focus:border-[#f10606]" required value={roleId} onChange={(event) => setRoleId(event.target.value)}><option value="">Select a staff role</option>{staffRoles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
            <label className="mt-4 block text-xs font-black text-black/60">Temporary password<span className="relative mt-2 block"><input className="h-11 w-full rounded-lg border border-black/10 px-3 pr-11 text-sm outline-none focus:border-[#f10606]" minLength={8} required type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="SecurePassword123!" /><button aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-black/45" type="button" onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
            <button className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#f10606] text-sm font-black text-white disabled:opacity-55" disabled={isCreating || !staffRoles.length} type="submit">{isCreating ? <LoaderCircle className="animate-spin" size={17} /> : <Plus size={17} />}Create staff account</button>
          </form>
        ) : null}
      </div>

      {editingStaff ? (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/45 backdrop-blur-sm sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isUpdating) setEditingStaff(null); }}>
          <form aria-modal="true" className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl" role="dialog" onSubmit={updateStaff}>
            <header className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase text-[#f10606]">Managed user</p><h2 className="mt-1 text-lg font-black">Edit {editingStaff.fullName}</h2></div><button aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.04] text-black/55" disabled={isUpdating} type="button" onClick={() => setEditingStaff(null)}><X size={18} /></button></header>
            {editingStaff.id === session?.user.id ? <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">You can update your details or password, but you cannot change your own role.</p> : null}
            <label className="mt-5 block text-xs font-black text-black/60">Full name<input className="mt-2 h-11 w-full rounded-lg border border-black/10 px-3 text-sm outline-none focus:border-[#f10606]" required value={editFullName} onChange={(event) => setEditFullName(event.target.value)} /></label>
            <label className="mt-4 block text-xs font-black text-black/60">Email<input className="mt-2 h-11 w-full rounded-lg border border-black/10 px-3 text-sm outline-none focus:border-[#f10606]" required type="email" value={editEmail} onChange={(event) => setEditEmail(event.target.value)} /></label>
            <label className="mt-4 block text-xs font-black text-black/60">Role<select className="mt-2 h-11 w-full rounded-lg border border-black/10 bg-white px-3 text-sm outline-none focus:border-[#f10606] disabled:bg-black/[0.03]" disabled={editingStaff.id === session?.user.id} value={editRoleId} onChange={(event) => setEditRoleId(event.target.value)}><option value="">Keep current role</option>{staffRoles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
            <label className="mt-4 block text-xs font-black text-black/60">New password <span className="font-medium text-black/35">(optional)</span><input className="mt-2 h-11 w-full rounded-lg border border-black/10 px-3 text-sm outline-none focus:border-[#f10606]" minLength={8} type="password" value={editPassword} onChange={(event) => setEditPassword(event.target.value)} placeholder="Leave blank to keep the current password" /></label>
            <button className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#f10606] text-sm font-black text-white disabled:opacity-55" disabled={isUpdating} type="submit">{isUpdating ? <LoaderCircle className="animate-spin" size={17} /> : <Pencil size={17} />}Save changes</button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
