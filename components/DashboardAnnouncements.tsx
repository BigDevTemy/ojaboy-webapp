"use client";

import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Eraser,
  Eye,
  Heading1,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  LoaderCircle,
  Megaphone,
  Minus,
  Plus,
  Quote,
  RefreshCw,
  Search,
  Send,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
  Redo2,
  Unlink,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapImage from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import { Placeholder } from "@tiptap/extensions";
import { API_BASE_URL, ANNOUNCEMENTS_URL } from "@/Serverurls";
import { authenticatedFetch } from "@/lib/authClient";
import { useAuthSession } from "@/lib/useAuthSession";

type AnnouncementType = "closure" | "coupon" | "promotion" | "custom";
type AudienceType = "all" | "role" | "specific_users";

type TemplateVariables = {
  headerImageUrl?: string;
  badgeValue?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  supportEmail?: string;
};

type Announcement = {
  id: string;
  type: AnnouncementType;
  title: string;
  body: string;
  emailTemplate?: string;
  templateVariables: TemplateVariables;
  audienceType: AudienceType;
  audienceRole?: string;
  audienceUserIds: string[];
  status: string;
  scheduledAt?: string;
  publishedAt?: string;
  completedAt?: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  createdAt?: string;
  updatedAt?: string;
};

type Pagination = { page: number; limit: number; total: number; totalPages: number };

type AnnouncementForm = {
  type: AnnouncementType;
  title: string;
  audienceType: AudienceType;
  audienceRole: string;
  audienceUserIds: string;
  headerImageUrl: string;
  badgeValue: string;
  ctaLabel: string;
  ctaUrl: string;
  supportEmail: string;
  scheduleEnabled: boolean;
  scheduledAt: string;
};

const endpoint = `${API_BASE_URL}${ANNOUNCEMENTS_URL}`;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const announcementTypes: { value: AnnouncementType; label: string }[] = [
  { value: "closure", label: "Store closure" },
  { value: "coupon", label: "Coupon" },
  { value: "promotion", label: "Promotion" },
  { value: "custom", label: "Custom" },
];

function localDateTime(offsetMinutes = 60) {
  const date = new Date();
  date.setMinutes(date.getMinutes() + offsetMinutes - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function emptyForm(): AnnouncementForm {
  return {
    type: "custom",
    title: "",
    audienceType: "all",
    audienceRole: "",
    audienceUserIds: "",
    headerImageUrl: "",
    badgeValue: "",
    ctaLabel: "",
    ctaUrl: "",
    supportEmail: "",
    scheduleEnabled: false,
    scheduledAt: localDateTime(),
  };
}

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

function readNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = Number(record[key]);
    if (Number.isFinite(value)) return value;
  }
  return undefined;
}

function unwrap(body: unknown, keys: string[]): unknown {
  if (!isRecord(body)) return body;
  for (const key of keys) {
    if (body[key] !== undefined) return unwrap(body[key], keys);
  }
  if (body.data !== undefined) return unwrap(body.data, keys);
  return body;
}

function responseMessage(body: unknown, fallback: string) {
  if (!isRecord(body)) return fallback;
  const message = body.message;
  if (Array.isArray(message)) {
    return message.filter((item): item is string => typeof item === "string").join(" ");
  }
  return typeof message === "string" && message.trim() ? message : fallback;
}

function parseTemplateVariables(value: unknown): TemplateVariables {
  if (!isRecord(value)) return {};
  return {
    headerImageUrl: readText(value, ["headerImageUrl"]) || undefined,
    badgeValue: readText(value, ["badgeValue"]) || undefined,
    ctaLabel: readText(value, ["ctaLabel"]) || undefined,
    ctaUrl: readText(value, ["ctaUrl"]) || undefined,
    supportEmail: readText(value, ["supportEmail"]) || undefined,
  };
}

function parseAnnouncement(value: unknown): Announcement | null {
  if (!isRecord(value)) return null;
  const id = readText(value, ["id"]);
  const title = readText(value, ["title"]);
  if (!id || !title) return null;
  const type = readText(value, ["type"]);
  const audienceType = readText(value, ["audienceType"]);
  return {
    id,
    title,
    type: (["closure", "coupon", "promotion", "custom"] as const).includes(type as AnnouncementType)
      ? (type as AnnouncementType)
      : "custom",
    body: typeof value.body === "string" ? value.body : "",
    emailTemplate: readText(value, ["emailTemplate"]) || undefined,
    templateVariables: parseTemplateVariables(value.templateVariables),
    audienceType: (["all", "role", "specific_users"] as const).includes(audienceType as AudienceType)
      ? (audienceType as AudienceType)
      : "all",
    audienceRole: readText(value, ["audienceRole"]) || undefined,
    audienceUserIds: Array.isArray(value.audienceUserIds)
      ? value.audienceUserIds.filter((item): item is string => typeof item === "string")
      : [],
    status: readText(value, ["status"]) || "unknown",
    scheduledAt: readText(value, ["scheduledAt"]) || undefined,
    publishedAt: readText(value, ["publishedAt"]) || undefined,
    completedAt: readText(value, ["completedAt"]) || undefined,
    totalRecipients: readNumber(value, ["totalRecipients"]) ?? 0,
    sentCount: readNumber(value, ["sentCount"]) ?? 0,
    failedCount: readNumber(value, ["failedCount"]) ?? 0,
    createdAt: readText(value, ["createdAt"]) || undefined,
    updatedAt: readText(value, ["updatedAt"]) || undefined,
  };
}

function parseAnnouncements(body: unknown): Announcement[] {
  const value = unwrap(body, ["announcements", "results"]);
  const list = Array.isArray(value) ? value : [value];
  return list.flatMap((item) => {
    const parsed = parseAnnouncement(item);
    return parsed ? [parsed] : [];
  });
}

function parsePagination(body: unknown): Pagination {
  const pagination = isRecord(body) && isRecord(body.pagination) ? body.pagination : {};
  return {
    page: readNumber(pagination, ["page"]) ?? 1,
    limit: readNumber(pagination, ["limit"]) ?? 20,
    total: readNumber(pagination, ["total"]) ?? 0,
    totalPages: readNumber(pagination, ["totalPages"]) ?? 0,
  };
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function parseUserIds(raw: string) {
  return Array.from(
    new Set(
      raw
        .split(/[\n,]/)
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  );
}

function statusMeta(status: string) {
  switch (status) {
    case "scheduled":
      return { label: "Scheduled", className: "bg-amber-50 text-amber-700" };
    case "sending":
      return { label: "Sending", className: "bg-blue-50 text-blue-700" };
    case "completed":
      return { label: "Completed", className: "bg-emerald-50 text-emerald-700" };
    case "failed":
      return { label: "Failed", className: "bg-red-50 text-red-700" };
    case "cancelled":
      return { label: "Cancelled", className: "bg-black/[0.05] text-black/50" };
    default:
      return { label: status || "Unknown", className: "bg-black/[0.05] text-black/50" };
  }
}

function audienceSummary(announcement: Announcement) {
  if (announcement.audienceType === "role") return `Role: ${announcement.audienceRole || "-"}`;
  if (announcement.audienceType === "specific_users") return `${announcement.audienceUserIds.length} specific user(s)`;
  return "Everyone";
}

const editorContentClass =
  "min-h-[220px] px-4 py-3 text-sm leading-6 text-black/80 focus:outline-none " +
  "[&_h1]:mt-3 [&_h1]:mb-2 [&_h1]:text-2xl [&_h1]:font-black [&_h1]:text-black " +
  "[&_h2]:mt-3 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-black [&_h2]:text-black " +
  "[&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:text-lg [&_h3]:font-black [&_h3]:text-black " +
  "[&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 " +
  "[&_blockquote]:my-2 [&_blockquote]:border-l-4 [&_blockquote]:border-black/10 [&_blockquote]:pl-4 [&_blockquote]:text-black/60 [&_blockquote]:italic " +
  "[&_a]:text-[#f10606] [&_a]:underline [&_img]:my-2 [&_img]:max-w-full [&_img]:rounded-lg " +
  "[&_hr]:my-4 [&_hr]:border-black/10 [&_strong]:font-black [&_em]:italic [&_u]:underline [&_s]:line-through";

export function DashboardAnnouncements() {
  const session = useAuthSession();
  const isCustomer = session?.user.role?.trim().toLowerCase() === "user";
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<AnnouncementForm>(emptyForm);
  const [bodyHtml, setBodyHtml] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selected, setSelected] = useState<Announcement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadAnnouncements = useCallback(async (page = 1) => {
    if (isCustomer) return;
    setIsLoading(true);
    setError("");
    try {
      const response = await authenticatedFetch(`${endpoint}?page=${page}&limit=20`, {
        headers: { Accept: "application/json" },
      });
      const body = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        throw new Error(responseMessage(body, `Unable to load announcements (${response.status}).`));
      }
      setAnnouncements(parseAnnouncements(body));
      setPagination(parsePagination(body));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load announcements.");
    } finally {
      setIsLoading(false);
    }
  }, [isCustomer]);

  useEffect(() => {
    const timer = setTimeout(() => void loadAnnouncements(1), 0);
    return () => clearTimeout(timer);
  }, [loadAnnouncements]);

  const filteredAnnouncements = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return announcements;
    return announcements.filter((announcement) =>
      `${announcement.title} ${announcement.type} ${announcement.status} ${audienceSummary(announcement)}`
        .toLowerCase()
        .includes(query),
    );
  }, [announcements, search]);

  function openCreate() {
    setForm(emptyForm());
    setBodyHtml("");
    setError("");
    setNotice("");
    setIsFormOpen(true);
  }

  async function submitAnnouncement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = form.title.trim();
    if (!title) {
      setError("Enter an announcement title.");
      return;
    }
    if (!bodyHtml.trim() || bodyHtml.trim() === "<p></p>") {
      setError("Write the announcement body.");
      return;
    }
    if (form.audienceType === "role" && !form.audienceRole.trim()) {
      setError("Enter the role this announcement targets.");
      return;
    }
    let audienceUserIds: string[] = [];
    if (form.audienceType === "specific_users") {
      audienceUserIds = parseUserIds(form.audienceUserIds);
      if (!audienceUserIds.length) {
        setError("Add at least one user ID for a specific-users announcement.");
        return;
      }
      if (audienceUserIds.length > 50000) {
        setError("Specific users list cannot exceed 50,000 entries.");
        return;
      }
      if (audienceUserIds.some((id) => !uuidPattern.test(id))) {
        setError("Specific users must be valid UUIDs, one per line or comma-separated.");
        return;
      }
    }
    if (form.scheduleEnabled && !form.scheduledAt) {
      setError("Choose a date and time to schedule this announcement.");
      return;
    }

    const templateVariables: TemplateVariables = {};
    if (form.headerImageUrl.trim()) templateVariables.headerImageUrl = form.headerImageUrl.trim();
    if (form.badgeValue.trim()) templateVariables.badgeValue = form.badgeValue.trim();
    if (form.ctaLabel.trim()) templateVariables.ctaLabel = form.ctaLabel.trim();
    if (form.ctaUrl.trim()) templateVariables.ctaUrl = form.ctaUrl.trim();
    if (form.supportEmail.trim()) templateVariables.supportEmail = form.supportEmail.trim();

    setIsSubmitting(true);
    setError("");
    setNotice("");
    try {
      const response = await authenticatedFetch(endpoint, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          type: form.type,
          title,
          body: bodyHtml,
          audience: {
            type: form.audienceType,
            ...(form.audienceType === "role" ? { role: form.audienceRole.trim() } : {}),
            ...(form.audienceType === "specific_users" ? { userIds: audienceUserIds } : {}),
          },
          ...(Object.keys(templateVariables).length ? { templateVariables } : {}),
          ...(form.scheduleEnabled ? { scheduledAt: new Date(form.scheduledAt).toISOString() } : {}),
        }),
      });
      const body = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        throw new Error(responseMessage(body, `Unable to create announcement (${response.status}).`));
      }
      setIsFormOpen(false);
      setNotice(responseMessage(body, "Announcement saved successfully."));
      await loadAnnouncements(1);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create announcement.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isCustomer) {
    return (
      <section className="mx-auto max-w-lg rounded-2xl border border-black/10 bg-white p-6 text-center">
        <Megaphone className="mx-auto text-[#f10606]" size={28} />
        <h1 className="mt-3 text-lg font-black text-black">Announcements are restricted</h1>
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
          <h1 className="text-3xl font-black text-black">Announcements</h1>
          <p className="mt-2 text-sm font-medium text-black/58">
            Compose and send email announcements to all customers, a role, or specific users.
          </p>
        </div>
        <button className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#f10606] px-5 text-sm font-black text-white" type="button" onClick={openCreate}>
          <Plus size={17} />
          New announcement
        </button>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Total announcements" value={pagination.total} />
        <Metric label="On this page" value={announcements.length} />
        <Metric label="Scheduled" value={announcements.filter((item) => item.status === "scheduled").length} />
      </div>

      <section className="rounded-xl border border-black/10 bg-white p-4 shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/35" size={18} />
            <input className="h-12 w-full rounded-xl border border-black/10 pl-11 pr-4 text-sm outline-none focus:border-[#f10606]/40" placeholder="Search this page..." value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <button className="flex h-12 items-center justify-center gap-2 rounded-xl border border-black/10 px-4 text-sm font-black text-black/65" type="button" onClick={() => void loadAnnouncements(pagination.page)}>
            <RefreshCw className={isLoading ? "animate-spin" : ""} size={17} />
            Refresh
          </button>
        </div>
      </section>

      {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-xs font-bold text-red-700">{error}</p> : null}
      {notice ? <p className="rounded-xl bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700">{notice}</p> : null}

      <section className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
        <div className="grid grid-cols-[1.3fr_0.7fr_0.9fr_0.7fr_0.9fr_0.45fr] gap-4 bg-[#fff5f5] px-5 py-4 text-xs font-black uppercase text-black/50">
          <span>Title</span><span>Type</span><span>Audience</span><span>Status</span><span>Recipients</span><span className="text-right">Actions</span>
        </div>
        {isLoading ? (
          <div className="space-y-3 p-5">{[0, 1, 2].map((item) => <div className="h-14 animate-pulse rounded-lg bg-black/[0.04]" key={item} />)}</div>
        ) : filteredAnnouncements.length ? (
          filteredAnnouncements.map((announcement) => {
            const status = statusMeta(announcement.status);
            return (
              <article className="grid grid-cols-[1.3fr_0.7fr_0.9fr_0.7fr_0.9fr_0.45fr] items-center gap-4 border-t border-black/10 px-5 py-4" key={announcement.id}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-black">{announcement.title}</p>
                  <p className="mt-1 truncate text-[10px] font-bold text-black/40">{formatDate(announcement.scheduledAt || announcement.publishedAt || announcement.createdAt)}</p>
                </div>
                <span className="w-max rounded-full bg-black/[0.05] px-3 py-1 text-[10px] font-black capitalize text-black/60">{announcement.type}</span>
                <p className="truncate text-xs font-bold text-black/55">{audienceSummary(announcement)}</p>
                <span className={`w-max rounded-full px-3 py-1 text-[10px] font-black ${status.className}`}>{status.label}</span>
                <p className="text-xs font-bold text-black/55">{announcement.sentCount}/{announcement.totalRecipients}{announcement.failedCount ? ` · ${announcement.failedCount} failed` : ""}</p>
                <div className="flex justify-end">
                  <ActionButton label={`View ${announcement.title}`} onClick={() => setSelected(announcement)}><Eye size={15} /></ActionButton>
                </div>
              </article>
            );
          })
        ) : (
          <div className="p-9 text-center"><Megaphone className="mx-auto text-[#f10606]" size={27} /><p className="mt-3 text-sm font-black text-black">No announcements found</p></div>
        )}
      </section>

      {pagination.totalPages > 1 ? (
        <div className="flex items-center justify-between rounded-xl border border-black/10 bg-white px-4 py-3">
          <p className="text-xs font-bold text-black/50">Page {pagination.page} of {pagination.totalPages} · {pagination.total} total</p>
          <div className="flex gap-2">
            <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-black/60 disabled:opacity-40" disabled={pagination.page <= 1 || isLoading} type="button" onClick={() => void loadAnnouncements(pagination.page - 1)}><ChevronLeft size={16} /></button>
            <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-black/60 disabled:opacity-40" disabled={pagination.page >= pagination.totalPages || isLoading} type="button" onClick={() => void loadAnnouncements(pagination.page + 1)}><ChevronRight size={16} /></button>
          </div>
        </div>
      ) : null}

      {isFormOpen ? (
        <Modal title="New announcement" onClose={() => !isSubmitting && setIsFormOpen(false)}>
          <form className="space-y-4" onSubmit={submitAnnouncement}>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-black text-black">Type *</span>
                <select className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm font-bold outline-none focus:border-[#f10606]/45" value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as AnnouncementType }))}>
                  {announcementTypes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <Input label="Title" value={form.title} onChange={(value) => setForm((current) => ({ ...current, title: value }))} placeholder="We're closed this weekend" />
            </div>

            <label className="block">
              <span className="text-xs font-black text-black">Body *</span>
              <div className="mt-2">
                <AnnouncementEditor value={bodyHtml} onChange={setBodyHtml} />
              </div>
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="text-xs font-black text-black">Audience *</span>
                <select className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm font-bold outline-none focus:border-[#f10606]/45" value={form.audienceType} onChange={(event) => setForm((current) => ({ ...current, audienceType: event.target.value as AudienceType }))}>
                  <option value="all">Everyone</option>
                  <option value="role">Specific role</option>
                  <option value="specific_users">Specific users</option>
                </select>
              </label>
              {form.audienceType === "role" ? (
                <div className="sm:col-span-2">
                  <Input label="Role" value={form.audienceRole} onChange={(value) => setForm((current) => ({ ...current, audienceRole: value }))} placeholder="vendor" />
                </div>
              ) : null}
            </div>
            {form.audienceType === "specific_users" ? (
              <label className="block">
                <span className="text-xs font-black text-black">User IDs *</span>
                <textarea className="mt-2 min-h-20 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 py-3 text-sm outline-none focus:border-[#f10606]/45" value={form.audienceUserIds} onChange={(event) => setForm((current) => ({ ...current, audienceUserIds: event.target.value }))} placeholder="One user UUID per line, or comma-separated" />
                <span className="mt-1 block text-[10px] font-bold text-black/40">Max 50,000 users.</span>
              </label>
            ) : null}

            <div className="rounded-xl border border-black/10 bg-[#fafafa] p-4">
              <p className="text-xs font-black text-black">Template variables (optional)</p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <TextField label="Header image URL" value={form.headerImageUrl} onChange={(value) => setForm((current) => ({ ...current, headerImageUrl: value }))} placeholder="https://cdn.ojaboy.com/closure.png" />
                <TextField label="Badge value" value={form.badgeValue} onChange={(value) => setForm((current) => ({ ...current, badgeValue: value }))} placeholder="WELCOME10" />
                <TextField label="CTA label" value={form.ctaLabel} onChange={(value) => setForm((current) => ({ ...current, ctaLabel: value }))} placeholder="Shop now" />
                <TextField label="CTA URL" value={form.ctaUrl} onChange={(value) => setForm((current) => ({ ...current, ctaUrl: value }))} placeholder="https://ojaboy.com/shop" />
                <TextField label="Support email" value={form.supportEmail} onChange={(value) => setForm((current) => ({ ...current, supportEmail: value }))} placeholder="support@ojaboy.com" />
              </div>
            </div>

            <div className="rounded-xl border border-black/10 bg-[#fafafa] p-4">
              <label className="flex items-center gap-3 text-xs font-black text-black">
                <input checked={form.scheduleEnabled} className="h-4 w-4 accent-[#f10606]" type="checkbox" onChange={(event) => setForm((current) => ({ ...current, scheduleEnabled: event.target.checked }))} />
                Schedule for later
              </label>
              {form.scheduleEnabled ? (
                <input className="mt-3 h-12 w-full rounded-xl border border-black/10 bg-white px-4 text-sm outline-none focus:border-[#f10606]/45" type="datetime-local" value={form.scheduledAt} onChange={(event) => setForm((current) => ({ ...current, scheduledAt: event.target.value }))} />
              ) : (
                <p className="mt-2 text-[10px] font-bold text-black/40">Leave unchecked to send immediately.</p>
              )}
            </div>

            <button className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#f10606] text-sm font-black text-white disabled:opacity-60" disabled={isSubmitting} type="submit">
              {isSubmitting ? <LoaderCircle className="animate-spin" size={17} /> : form.scheduleEnabled ? <CalendarClock size={17} /> : <Send size={17} />}
              {isSubmitting ? "Saving..." : form.scheduleEnabled ? "Schedule announcement" : "Send now"}
            </button>
          </form>
        </Modal>
      ) : null}

      {selected ? (
        <Modal title={selected.title} onClose={() => setSelected(null)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Detail label="Type" value={announcementTypes.find((option) => option.value === selected.type)?.label || selected.type} />
              <Detail label="Status" value={statusMeta(selected.status).label} />
            </div>
            <Detail label="Audience" value={audienceSummary(selected)} />
            <div className="grid grid-cols-3 gap-3">
              <Detail label="Recipients" value={String(selected.totalRecipients)} />
              <Detail label="Sent" value={String(selected.sentCount)} />
              <Detail label="Failed" value={String(selected.failedCount)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Detail label="Scheduled" value={formatDate(selected.scheduledAt)} />
              <Detail label="Published" value={formatDate(selected.publishedAt)} />
            </div>
            <label className="block">
              <span className="text-[10px] font-black uppercase text-black/40">Body preview</span>
              <div className="mt-1">
                <BodyPreview html={selected.body} />
              </div>
            </label>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function AnnouncementEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        link: {
          openOnClick: false,
          HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
        },
      }),
      TiptapImage.configure({ HTMLAttributes: { class: "rounded-lg" } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: "Write the announcement body..." }),
    ],
    content: value,
    onUpdate: ({ editor: instance }) => onChange(instance.getHTML()),
    editorProps: {
      attributes: { class: editorContentClass },
    },
  });

  if (!editor) return null;

  return (
    <div className="announcement-editor overflow-hidden rounded-xl border border-black/10 bg-white">
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

function EditorToolbar({ editor }: { editor: Editor }) {
  function setLink() {
    const previousUrl = editor.getAttributes("link").url as string | undefined;
    const url = window.prompt("Link URL", previousUrl || "https://");
    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  function addImage() {
    const url = window.prompt("Image URL", "https://");
    if (!url || !url.trim()) return;
    editor.chain().focus().setImage({ src: url.trim() }).run();
  }

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-black/10 bg-[#fafafa] px-2 py-2">
      <ToolbarButton disabled={!editor.can().undo()} label="Undo" onClick={() => editor.chain().focus().undo().run()}><Undo2 size={15} /></ToolbarButton>
      <ToolbarButton disabled={!editor.can().redo()} label="Redo" onClick={() => editor.chain().focus().redo().run()}><Redo2 size={15} /></ToolbarButton>
      <Divider />
      <ToolbarButton active={editor.isActive("heading", { level: 1 })} label="Heading 1" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 size={15} /></ToolbarButton>
      <ToolbarButton active={editor.isActive("heading", { level: 2 })} label="Heading 2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={15} /></ToolbarButton>
      <ToolbarButton active={editor.isActive("heading", { level: 3 })} label="Heading 3" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 size={15} /></ToolbarButton>
      <Divider />
      <ToolbarButton active={editor.isActive("bold")} label="Bold" onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={15} /></ToolbarButton>
      <ToolbarButton active={editor.isActive("italic")} label="Italic" onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={15} /></ToolbarButton>
      <ToolbarButton active={editor.isActive("underline")} label="Underline" onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon size={15} /></ToolbarButton>
      <ToolbarButton active={editor.isActive("strike")} label="Strikethrough" onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={15} /></ToolbarButton>
      <Divider />
      <ToolbarButton active={editor.isActive("bulletList")} label="Bullet list" onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={15} /></ToolbarButton>
      <ToolbarButton active={editor.isActive("orderedList")} label="Numbered list" onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={15} /></ToolbarButton>
      <ToolbarButton active={editor.isActive("blockquote")} label="Quote" onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={15} /></ToolbarButton>
      <Divider />
      <ToolbarButton active={editor.isActive({ textAlign: "left" })} label="Align left" onClick={() => editor.chain().focus().setTextAlign("left").run()}><AlignLeft size={15} /></ToolbarButton>
      <ToolbarButton active={editor.isActive({ textAlign: "center" })} label="Align center" onClick={() => editor.chain().focus().setTextAlign("center").run()}><AlignCenter size={15} /></ToolbarButton>
      <ToolbarButton active={editor.isActive({ textAlign: "right" })} label="Align right" onClick={() => editor.chain().focus().setTextAlign("right").run()}><AlignRight size={15} /></ToolbarButton>
      <ToolbarButton active={editor.isActive({ textAlign: "justify" })} label="Justify" onClick={() => editor.chain().focus().setTextAlign("justify").run()}><AlignJustify size={15} /></ToolbarButton>
      <Divider />
      <ToolbarButton active={editor.isActive("link")} label="Add link" onClick={setLink}><Link2 size={15} /></ToolbarButton>
      <ToolbarButton disabled={!editor.isActive("link")} label="Remove link" onClick={() => editor.chain().focus().unsetLink().run()}><Unlink size={15} /></ToolbarButton>
      <ToolbarButton label="Insert image" onClick={addImage}><ImagePlus size={15} /></ToolbarButton>
      <ToolbarButton label="Horizontal rule" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus size={15} /></ToolbarButton>
      <Divider />
      <ToolbarButton label="Clear formatting" onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}><Eraser size={15} /></ToolbarButton>
    </div>
  );
}

function Divider() {
  return <span className="mx-1 h-6 w-px bg-black/10" />;
}

function ToolbarButton({
  active,
  disabled,
  label,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={active}
      className={`flex h-8 w-8 items-center justify-center rounded-md text-black/60 transition hover:bg-black/[0.06] hover:text-[#f10606] disabled:cursor-not-allowed disabled:opacity-35 ${active ? "bg-[#fff0f0] text-[#f10606]" : ""}`}
      disabled={disabled}
      title={label}
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function BodyPreview({ html }: { html: string }) {
  const doc = `<!doctype html><html><head><meta charset="utf-8" /><style>body{font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif;font-size:14px;color:#111;padding:16px;margin:0;line-height:1.6;}img{max-width:100%;height:auto;}a{color:#f10606;}h1,h2,h3{font-weight:800;}blockquote{border-left:4px solid rgba(0,0,0,0.1);margin:0;padding-left:12px;color:rgba(0,0,0,0.6);}</style></head><body>${html}</body></html>`;
  return (
    <div className="overflow-hidden rounded-xl border border-black/10">
      <iframe className="h-64 w-full bg-white" sandbox="" srcDoc={doc} title="Announcement body preview" />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <section className="rounded-xl border border-black/10 bg-white p-5 shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
      <p className="text-xs font-black uppercase text-black/45">{label}</p>
      <p className="mt-2 text-2xl font-black text-black">{value}</p>
    </section>
  );
}

function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-black text-black">{label} *</span>
      <input className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm outline-none focus:border-[#f10606]/45" type="text" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase text-black/45">{label}</span>
      <input className="mt-1 h-11 w-full rounded-lg border border-black/10 bg-white px-3 text-xs font-bold outline-none focus:border-[#f10606]/45" type="text" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

function ActionButton({ label, busy, onClick, children }: { label: string; busy?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button aria-label={label} className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-black/55 hover:text-[#f10606] disabled:opacity-50" disabled={busy} type="button" onClick={onClick}>
      {busy ? <LoaderCircle className="animate-spin" size={15} /> : children}
    </button>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/45 backdrop-blur-sm sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section aria-modal="true" className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl" role="dialog">
        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase text-[#f10606]">Announcements</p>
            <h2 className="mt-1 text-lg font-black text-black">{title}</h2>
          </div>
          <button aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.04] text-black/55" type="button" onClick={onClose}><X size={18} /></button>
        </header>
        {children}
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#fafafa] p-4">
      <p className="text-[10px] font-black uppercase text-black/40">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-black/70">{value}</p>
    </div>
  );
}
