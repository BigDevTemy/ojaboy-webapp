"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { LoaderCircle, Plus, RefreshCw, Search, ShieldCheck, UserRoundCog, Users } from "lucide-react";
import { ACCESS_CONTROL_ROLES_URL, API_BASE_URL, ASSIGN_ROLE_URL, STAFF_USERS_URL } from "@/Serverurls";
import { authenticatedFetch } from "@/lib/authClient";
import { getApiErrorMessage } from "@/lib/apiError";

type Role = { id: string; name: string; description?: string };
type User = { id: string; fullName: string; email: string; role?: string };

const rolesEndpoint = `${API_BASE_URL}${ACCESS_CONTROL_ROLES_URL}`;
const assignRoleEndpoint = `${API_BASE_URL}${ASSIGN_ROLE_URL}`;
const staffUsersEndpoint = `${API_BASE_URL}${STAFF_USERS_URL}`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function parseRole(value: unknown): Role | null {
  if (typeof value === "string" && value.trim()) return { id: value, name: value };
  if (!isRecord(value)) return null;
  const id = text(value.id ?? value.roleId ?? value.name);
  const name = text(value.name ?? value.role ?? value.title);
  if (!id || !name) return null;
  return { id, name, description: text(value.description) || undefined };
}

function parseRoles(body: unknown): Role[] {
  const candidate = isRecord(body) ? body.data ?? body.roles ?? body.results ?? body : body;
  const values = Array.isArray(candidate) ? candidate : [candidate];
  return values.flatMap((value) => {
    const role = parseRole(value);
    return role ? [role] : [];
  });
}

function parseUser(value: unknown): User | null {
  if (!isRecord(value)) return null;
  const id = text(value.id ?? value.userId);
  const email = text(value.email);
  const nestedRole = isRecord(value.role) ? value.role : null;
  const firstRole = Array.isArray(value.roles) ? value.roles[0] : null;
  const firstRoleRecord = isRecord(firstRole) ? firstRole : null;
  const currentRole =
    text(value.role) ||
    (nestedRole ? text(nestedRole.name ?? nestedRole.title ?? nestedRole.slug) : "") ||
    text(firstRole) ||
    (firstRoleRecord ? text(firstRoleRecord.name ?? firstRoleRecord.title ?? firstRoleRecord.slug) : "");
  if (!id) return null;
  return {
    id,
    email,
    fullName: text(value.fullName ?? value.name) || email || "Unnamed user",
    role: currentRole || undefined,
  };
}

function parseUsers(body: unknown): User[] {
  const root = isRecord(body) ? body.data ?? body.users ?? body.results ?? body : body;
  const candidate = isRecord(root) ? root.users ?? root.results ?? root.items ?? root.data ?? root : root;
  const values = Array.isArray(candidate) ? candidate : [candidate];
  return values.flatMap((value) => {
    const user = parseUser(value);
    return user ? [user] : [];
  });
}

export function DashboardRoleManagement() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUsersLoading, setIsUsersLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<"create" | "assign" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [roleName, setRoleName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [roleId, setRoleId] = useState("");

  const loadRoles = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await authenticatedFetch(rolesEndpoint, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(await getApiErrorMessage(response, "Unable to load roles."));
      const parsed = parseRoles((await response.json()) as unknown);
      setRoles(parsed);
      setRoleId((current) => current || parsed[0]?.id || "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load roles.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async (searchTerm = "") => {
    setIsUsersLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ page: "1", limit: "50" });
      if (searchTerm.trim()) query.set("search", searchTerm.trim());
      const response = await authenticatedFetch(`${staffUsersEndpoint}?${query.toString()}`, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(await getApiErrorMessage(response, "Unable to load users."));
      setUsers(parseUsers((await response.json()) as unknown));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load users.");
    } finally {
      setIsUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadRoles(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadRoles]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadUsers(userSearch), 300);
    return () => window.clearTimeout(timeoutId);
  }, [loadUsers, userSearch]);

  const sortedRoles = useMemo(
    () => [...roles].sort((left, right) => left.name.localeCompare(right.name)),
    [roles],
  );
  const filteredUsers = users;
  const selectedUserIdSet = useMemo(() => new Set(selectedUserIds), [selectedUserIds]);
  const allFilteredSelected = filteredUsers.length > 0 && filteredUsers.every((user) => selectedUserIdSet.has(user.id));

  function toggleUser(userId: string) {
    setSelectedUserIds((current) => current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]);
  }

  function toggleFilteredUsers() {
    setSelectedUserIds((current) => {
      const next = new Set(current);
      if (allFilteredSelected) filteredUsers.forEach((user) => next.delete(user.id));
      else filteredUsers.forEach((user) => next.add(user.id));
      return [...next];
    });
  }

  async function createRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!roleName.trim()) return;
    setBusyAction("create"); setError(""); setNotice("");
    try {
      const response = await authenticatedFetch(rolesEndpoint, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ name: roleName.trim(), ...(description.trim() ? { description: description.trim() } : {}) }),
      });
      if (!response.ok) throw new Error(await getApiErrorMessage(response, "Unable to create the role."));
      setRoleName(""); setDescription(""); setNotice("Role created successfully.");
      await loadRoles();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create the role.");
    } finally { setBusyAction(null); }
  }

  async function assignRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedUserIds.length || !roleId) return;
    setBusyAction("assign"); setError(""); setNotice("");
    try {
      const response = await authenticatedFetch(assignRoleEndpoint, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: selectedUserIds, roleId }),
      });
      if (!response.ok) throw new Error(await getApiErrorMessage(response, "Unable to assign the role."));
      const assignedCount = selectedUserIds.length;
      setSelectedUserIds([]); setNotice(`Role assigned to ${assignedCount} ${assignedCount === 1 ? "user" : "users"} successfully.`);
      await loadUsers(userSearch);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to assign the role.");
    } finally { setBusyAction(null); }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-3xl font-black text-black">Role Management</h1><p className="mt-2 text-sm font-medium text-black/55">Create access roles and assign them to team members.</p></div>
        <button className="flex h-10 items-center justify-center gap-2 rounded-lg border border-black/10 px-4 text-xs font-black text-black/65 disabled:opacity-50" disabled={isLoading || isUsersLoading} type="button" onClick={() => { void loadRoles(); void loadUsers(userSearch); }}><RefreshCw className={isLoading || isUsersLoading ? "animate-spin" : ""} size={16} />Refresh</button>
      </header>

      {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700" role="alert">{error}</p> : null}
      {notice ? <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700" role="status">{notice}</p> : null}

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between bg-[#fff5f5] px-5 py-4"><div><h2 className="text-lg font-black">Available roles</h2><p className="mt-1 text-xs font-bold text-black/45">{roles.length} configured</p></div><ShieldCheck className="text-[#f10606]" size={24} /></div>
          {isLoading ? <div className="flex justify-center py-14"><LoaderCircle className="animate-spin text-[#f10606]" size={28} /></div> : sortedRoles.length ? (
            <div className="divide-y divide-black/10">{sortedRoles.map((role) => <article className="flex items-start gap-3 px-5 py-4" key={role.id}><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff0f0] text-[#f10606]"><ShieldCheck size={19} /></span><div className="min-w-0"><h3 className="font-black text-black">{role.name}</h3><p className="mt-1 text-xs font-medium leading-5 text-black/50">{role.description || "No description provided."}</p><p className="mt-1 truncate text-[10px] font-bold text-black/35">{role.id}</p></div></article>)}</div>
          ) : <div className="px-5 py-14 text-center text-sm font-bold text-black/45">No roles have been created yet.</div>}
        </section>

        <div className="space-y-5">
          <form className="rounded-xl border border-black/10 bg-white p-5 shadow-[0_14px_35px_rgba(0,0,0,0.04)]" onSubmit={createRole}>
            <h2 className="flex items-center gap-2 text-lg font-black"><Plus className="text-[#f10606]" size={20} />Create role</h2>
            <label className="mt-5 block text-xs font-black text-black/60">Role name<input className="mt-2 h-11 w-full rounded-lg border border-black/10 px-3 text-sm outline-none focus:border-[#f10606]" required value={roleName} onChange={(event) => setRoleName(event.target.value)} placeholder="e.g. Operations manager" /></label>
            <label className="mt-4 block text-xs font-black text-black/60">Description<textarea className="mt-2 min-h-24 w-full resize-y rounded-lg border border-black/10 p-3 text-sm outline-none focus:border-[#f10606]" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What can members with this role do?" /></label>
            <button className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#f10606] text-sm font-black text-white disabled:opacity-55" disabled={busyAction !== null} type="submit">{busyAction === "create" ? <LoaderCircle className="animate-spin" size={17} /> : <Plus size={17} />}Create role</button>
          </form>

          <form className="rounded-xl border border-black/10 bg-white p-5 shadow-[0_14px_35px_rgba(0,0,0,0.04)]" onSubmit={assignRole}>
            <h2 className="flex items-center gap-2 text-lg font-black"><UserRoundCog className="text-[#f10606]" size={20} />Assign role</h2>
            <label className="mt-5 block text-xs font-black text-black/60">Role<select className="mt-2 h-11 w-full rounded-lg border border-black/10 bg-white px-3 text-sm outline-none focus:border-[#f10606]" required value={roleId} onChange={(event) => setRoleId(event.target.value)}><option value="">Select a role</option>{sortedRoles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
            <div className="relative mt-4"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black/35" size={17} /><input aria-label="Search users" className="h-11 w-full rounded-lg border border-black/10 pl-10 pr-3 text-sm outline-none focus:border-[#f10606]" value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Search by name, email, role, or ID" /></div>
            <div className="mt-3 overflow-hidden rounded-xl border border-black/10">
              <label className="flex cursor-pointer items-center gap-3 bg-[#fff5f5] px-4 py-3 text-xs font-black text-black/60"><input className="h-4 w-4 accent-[#f10606]" checked={allFilteredSelected} disabled={!filteredUsers.length} type="checkbox" onChange={toggleFilteredUsers} /><span className="flex-1">Select filtered users</span><span>{selectedUserIds.length} selected</span></label>
              <div className="max-h-72 overflow-y-auto">
                {isUsersLoading ? <div className="flex justify-center py-10"><LoaderCircle className="animate-spin text-[#f10606]" size={24} /></div> : filteredUsers.length ? filteredUsers.map((user) => (
                  <label className="flex cursor-pointer items-center gap-3 border-t border-black/10 px-4 py-3 hover:bg-black/[0.02]" key={user.id}>
                    <input className="h-4 w-4 shrink-0 accent-[#f10606]" checked={selectedUserIdSet.has(user.id)} type="checkbox" onChange={() => toggleUser(user.id)} />
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fff0f0] text-[#f10606]"><Users size={16} /></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-black text-black">{user.fullName}</span><span className="block truncate text-xs font-medium text-black/45">{user.email || user.id}</span></span>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${user.role ? "bg-[#fff0f0] text-[#d90505]" : "bg-black/[0.04] text-black/40"}`}>Current: {user.role || "No role"}</span>
                  </label>
                )) : <div className="px-4 py-10 text-center text-xs font-bold text-black/45">{users.length ? "No users match your search." : "No users were returned."}</div>}
              </div>
            </div>
            <button className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-black text-sm font-black text-white disabled:opacity-55" disabled={busyAction !== null || !roles.length || !selectedUserIds.length} type="submit">{busyAction === "assign" ? <LoaderCircle className="animate-spin" size={17} /> : <UserRoundCog size={17} />}Assign role to {selectedUserIds.length || "selected"} {selectedUserIds.length === 1 ? "user" : "users"}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
