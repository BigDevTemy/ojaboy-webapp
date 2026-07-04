"use client";

import {
  Eye,
  FolderTree,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { API_BASE_URL, PRODUCT_CATEGORIES_URL } from "@/Serverurls";
import { authenticatedFetch } from "@/lib/authClient";
import { useAuthSession } from "@/lib/useAuthSession";

type ProductCategory = {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type CategoryForm = {
  name: string;
  description: string;
  isActive: boolean;
};

const endpoint = `${API_BASE_URL}${PRODUCT_CATEGORIES_URL}`;
const inactiveCategoriesEndpoint = `${endpoint}`;
const emptyForm: CategoryForm = { name: "", description: "", isActive: true };

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function readText(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if ((typeof value === "string" || typeof value === "number") && String(value).trim()) {
      return String(value).trim();
    }
  }
  return "";
}

function unwrap(body: unknown): unknown {
  if (!isRecord(body)) return body;
  const value =
    body.productCategory ??
    body.category ??
    body.productCategories ??
    body.categories ??
    body.results ??
    body.data;

  return value === undefined ? body : unwrap(value);
}

function parseCategory(value: unknown): ProductCategory | null {
  if (!isRecord(value)) return null;
  const id = readText(value, ["id"]);
  const name = readText(value, ["name", "categoryName", "title"]);
  if (!id || !name) return null;
  return {
    id,
    name,
    description: readText(value, ["description"]) || undefined,
    isActive: typeof value.isActive === "boolean" ? value.isActive : true,
    createdAt: readText(value, ["createdAt"]) || undefined,
    updatedAt: readText(value, ["updatedAt"]) || undefined,
  };
}

function parseCategories(body: unknown) {
  const value = unwrap(body);
  const list = Array.isArray(value) ? value : [value];
  return list.flatMap((item) => {
    const category = parseCategory(item);
    return category ? [category] : [];
  });
}

function responseMessage(body: unknown, fallback: string) {
  if (!isRecord(body)) return fallback;
  const message = body.message;
  if (Array.isArray(message)) {
    return message.filter((item): item is string => typeof item === "string").join(" ");
  }
  return typeof message === "string" && message.trim() ? message : fallback;
}

function formatDate(value?: string) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(date);
}

export function DashboardProductCategories() {
  const session = useAuthSession();
  const isCustomer = session?.user.role?.trim().toLowerCase() === "user";
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadCategories = useCallback(async () => {
    if (isCustomer) return;
    setIsLoading(true);
    setError("");
    try {
      const response = await authenticatedFetch(inactiveCategoriesEndpoint, {
        headers: { Accept: "application/json" },
      });
      const body = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        throw new Error(responseMessage(body, `Unable to load product categories (${response.status}).`));
      }
      setCategories(parseCategories(body));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load product categories.");
    } finally {
      setIsLoading(false);
    }
  }, [isCustomer]);

  useEffect(() => {
    const timer = setTimeout(() => void loadCategories(), 0);
    return () => clearTimeout(timer);
  }, [loadCategories]);

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return categories;
    return categories.filter((category) =>
      `${category.name} ${category.description ?? ""} ${category.isActive ? "active" : "inactive"}`.toLowerCase().includes(query),
    );
  }, [categories, search]);

  function openCreate() {
    setEditingId("");
    setForm(emptyForm);
    setError("");
    setNotice("");
    setIsFormOpen(true);
  }

  function openEdit(category: ProductCategory) {
    setEditingId(category.id);
    setForm({
      name: category.name,
      description: category.description ?? "",
      isActive: category.isActive,
    });
    setError("");
    setNotice("");
    setIsFormOpen(true);
  }

  async function submitCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setError("Enter a category name.");
      return;
    }
    if (
      categories.some(
        (category) =>
          category.id !== editingId && category.name.trim().toLowerCase() === name.toLowerCase(),
      )
    ) {
      setError("A product category with this name already exists.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setNotice("");
    try {
      const response = await authenticatedFetch(editingId ? `${endpoint}/${editingId}` : endpoint, {
        method: editingId ? "PATCH" : "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          ...(form.description.trim() ? { description: form.description.trim() } : {}),
          ...(editingId ? { isActive: form.isActive } : {}),
        }),
      });
      const body = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        throw new Error(
          responseMessage(
            body,
            `Unable to ${editingId ? "update" : "create"} product category (${response.status}).`,
          ),
        );
      }
      setIsFormOpen(false);
      setNotice(`Product category ${editingId ? "updated" : "created"} successfully.`);
      await loadCategories();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save product category.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function loadDetails(id: string) {
    setBusyAction(`view-${id}`);
    setError("");
    try {
      const response = await authenticatedFetch(`${endpoint}/${id}`, {
        headers: { Accept: "application/json" },
      });
      const body = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        throw new Error(responseMessage(body, `Unable to load product category (${response.status}).`));
      }
      const detailValue = unwrap(body);
      const category = parseCategory(
        Array.isArray(detailValue) ? detailValue[0] : detailValue,
      );
      if (!category) throw new Error("The product category response was not in the expected format.");
      setSelectedCategory(category);
      setCategories((current) =>
        current.map((item) => (item.id === category.id ? category : item)),
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load product category.");
    } finally {
      setBusyAction("");
    }
  }

  async function deleteCategory(category: ProductCategory) {
    if (!window.confirm(`Delete "${category.name}"? This cannot be undone.`)) return;
    setBusyAction(`delete-${category.id}`);
    setError("");
    setNotice("");
    try {
      const response = await authenticatedFetch(`${endpoint}/${category.id}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      const body = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        throw new Error(responseMessage(body, `Unable to delete product category (${response.status}).`));
      }
      setCategories((current) => current.filter((item) => item.id !== category.id));
      setNotice("Product category deleted.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete product category.");
    } finally {
      setBusyAction("");
    }
  }

  if (isCustomer) {
    return (
      <section className="mx-auto max-w-lg rounded-2xl border border-black/10 bg-white p-6 text-center">
        <FolderTree className="mx-auto text-[#f10606]" size={28} />
        <h1 className="mt-3 text-lg font-black text-black">Product categories are restricted</h1>
        <p className="mt-2 text-sm font-medium text-black/50">
          This page is available only in the non-customer dashboard.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-black">Product Categories</h1>
          <p className="mt-2 text-sm font-medium text-black/58">
            Create and manage the categories used to organise catalogue products.
          </p>
        </div>
        <button className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#f10606] px-5 text-sm font-black text-white" type="button" onClick={openCreate}>
          <Plus size={17} />
          Add category
        </button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-xl border border-black/10 bg-white p-5 shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
          <p className="text-xs font-black uppercase text-black/45">Total categories</p>
          <p className="mt-2 text-2xl font-black text-black">{categories.length}</p>
        </section>
        <section className="rounded-xl border border-black/10 bg-white p-5 shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
          <p className="text-xs font-black uppercase text-black/45">Matching search</p>
          <p className="mt-2 text-2xl font-black text-black">{filteredCategories.length}</p>
        </section>
      </div>

      <section className="rounded-xl border border-black/10 bg-white p-4 shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/35" size={18} />
            <input className="h-12 w-full rounded-xl border border-black/10 pl-11 pr-4 text-sm outline-none focus:border-[#f10606]/40" placeholder="Search categories..." value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <button className="flex h-12 items-center justify-center gap-2 rounded-xl border border-black/10 px-4 text-sm font-black text-black/65" type="button" onClick={() => void loadCategories()}>
            <RefreshCw className={isLoading ? "animate-spin" : ""} size={17} />
            Refresh
          </button>
        </div>
      </section>

      {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-xs font-bold text-red-700">{error}</p> : null}
      {notice ? <p className="rounded-xl bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700">{notice}</p> : null}

      <section className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
        <div className="grid grid-cols-[1fr_1.25fr_0.55fr_0.65fr_0.55fr] gap-4 bg-[#fff5f5] px-5 py-4 text-xs font-black uppercase text-black/50">
          <span>Category</span><span>Description</span><span>Status</span><span>Updated</span><span className="text-right">Actions</span>
        </div>
        {isLoading ? (
          <div className="space-y-3 p-5">{[0, 1, 2].map((item) => <div className="h-14 animate-pulse rounded-lg bg-black/[0.04]" key={item} />)}</div>
        ) : filteredCategories.length ? (
          filteredCategories.map((category) => (
            <article className="grid grid-cols-[1fr_1.25fr_0.55fr_0.65fr_0.55fr] items-center gap-4 border-t border-black/10 px-5 py-4" key={category.id}>
              <div className="min-w-0"><p className="truncate text-sm font-black text-black">{category.name}</p><p className="mt-1 truncate text-[10px] font-bold text-black/40">{category.id}</p></div>
              <p className="truncate text-xs font-medium text-black/58">{category.description || "No description"}</p>
              <span className={`w-max rounded-full px-3 py-1 text-[10px] font-black ${category.isActive ? "bg-emerald-50 text-emerald-700" : "bg-black/[0.05] text-black/50"}`}>
                {category.isActive ? "Active" : "Inactive"}
              </span>
              <p className="text-xs font-bold text-black/45">{formatDate(category.updatedAt || category.createdAt)}</p>
              <div className="flex justify-end gap-2">
                <ActionButton label={`View ${category.name}`} busy={busyAction === `view-${category.id}`} onClick={() => void loadDetails(category.id)}><Eye size={15} /></ActionButton>
                <ActionButton label={`Edit ${category.name}`} onClick={() => openEdit(category)}><Pencil size={15} /></ActionButton>
                <ActionButton label={`Delete ${category.name}`} busy={busyAction === `delete-${category.id}`} onClick={() => void deleteCategory(category)}><Trash2 size={15} /></ActionButton>
              </div>
            </article>
          ))
        ) : (
          <div className="p-9 text-center"><FolderTree className="mx-auto text-[#f10606]" size={27} /><p className="mt-3 text-sm font-black text-black">No product categories found</p></div>
        )}
      </section>

      {isFormOpen ? (
        <Modal title={editingId ? "Edit product category" : "Add product category"} onClose={() => !isSubmitting && setIsFormOpen(false)}>
          <form className="space-y-4" onSubmit={submitCategory}>
            <label className="block"><span className="text-xs font-black text-black">Name *</span><input className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm outline-none focus:border-[#f10606]/45" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Grains" /></label>
            <label className="block"><span className="text-xs font-black text-black">Description</span><textarea className="mt-2 min-h-28 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 py-3 text-sm outline-none focus:border-[#f10606]/45" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Rice, pasta, beans, and related products." /></label>
            {editingId ? (
              <label className="block">
                <span className="text-xs font-black text-black">Status *</span>
                <select className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm font-bold outline-none focus:border-[#f10606]/45" value={form.isActive ? "active" : "inactive"} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.value === "active" }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            ) : null}
            <button className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#f10606] text-sm font-black text-white disabled:opacity-60" disabled={isSubmitting} type="submit">{isSubmitting ? <LoaderCircle className="animate-spin" size={17} /> : <Plus size={17} />}{isSubmitting ? "Saving..." : editingId ? "Update category" : "Create category"}</button>
          </form>
        </Modal>
      ) : null}

      {selectedCategory ? (
        <Modal title={selectedCategory.name} onClose={() => setSelectedCategory(null)}>
          <div className="space-y-3">
            <Detail label="Category ID" value={selectedCategory.id} />
            <Detail label="Status" value={selectedCategory.isActive ? "Active" : "Inactive"} />
            <Detail label="Description" value={selectedCategory.description || "No description provided."} />
            <div className="grid grid-cols-2 gap-3"><Detail label="Created" value={formatDate(selectedCategory.createdAt)} /><Detail label="Updated" value={formatDate(selectedCategory.updatedAt)} /></div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function ActionButton({ label, busy, onClick, children }: { label: string; busy?: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button aria-label={label} className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-black/55 hover:text-[#f10606] disabled:opacity-50" disabled={busy} type="button" onClick={onClick}>{busy ? <LoaderCircle className="animate-spin" size={15} /> : children}</button>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/45 backdrop-blur-sm sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section aria-modal="true" className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl" role="dialog">
        <header className="mb-5 flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase text-[#f10606]">Product catalogue</p><h2 className="mt-1 text-lg font-black text-black">{title}</h2></div><button aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.04] text-black/55" type="button" onClick={onClose}><X size={18} /></button></header>
        {children}
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-[#fafafa] p-4"><p className="text-[10px] font-black uppercase text-black/40">{label}</p><p className="mt-1 break-words text-sm font-bold text-black/70">{value}</p></div>;
}
