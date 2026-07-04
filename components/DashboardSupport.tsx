"use client";

import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Clock3,
  Download,
  FileText,
  Headphones,
  Inbox,
  LoaderCircle,
  MessageSquareText,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  UploadCloud,
  UserRoundCog,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from "react";
import { API_BASE_URL, TICKETS_URL } from "@/Serverurls";
import { authenticatedFetch } from "@/lib/authClient";
import { useAuthSession } from "@/lib/useAuthSession";

type SupportMode = "user" | "admin" | "staff";
type TicketStatus = "Open" | "In review" | "Waiting on user" | "Resolved" | "Closed" | string;

type Attachment = {
  id: string;
  name: string;
  size?: number;
  mimeType?: string;
};

type TicketMessage = {
  id: string;
  body: string;
  createdAt?: string;
  senderId?: string;
  senderType?: string;
  senderName: string;
  senderRole?: string;
  attachments: Attachment[];
};

type Ticket = {
  id: string;
  reference: string;
  subject: string;
  category: string;
  status: TicketStatus;
  priority: string;
  description: string;
  orderId?: string;
  createdAt?: string;
  updatedAt?: string;
  creatorName?: string;
  assigneeId?: string;
  assigneeName?: string;
  attachments: Attachment[];
  messages: TicketMessage[];
};

type StaffMember = {
  id: string;
  name: string;
  role?: string;
  workload?: number;
};

type Pagination = {
  page: number;
  limit: number;
  total?: number;
  totalPages?: number;
};

type Summary = {
  activeCases: number;
  needsYourReply: number;
  open: number;
  inReview: number;
  waiting: number;
  resolved: number;
  total: number;
};

const ticketsEndpoint = `${API_BASE_URL}${TICKETS_URL}`;
const pageSize = 20;
const statusFilters = ["All", "Open", "In review", "Waiting on user", "Resolved", "Closed"];
const categories = [
  { label: "Refund & payment", value: "refund_and_payment" },
  { label: "Order issue", value: "order_issue" },
  { label: "Delivery", value: "delivery" },
  { label: "Account", value: "account" },
  { label: "General", value: "general" },
];

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

function getResponseMessage(body: unknown, fallback: string) {
  if (!isRecord(body)) return fallback;
  const message = body.message;
  if (Array.isArray(message)) {
    const joined = message
      .filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
      .map((item) => `• ${item.trim()}`)
      .join("\n");
    return joined || fallback;
  }
  return typeof message === "string" && message.trim()
    ? message
    : readText(body, ["error"]) || fallback;
}

function unwrap(value: unknown, keys: string[]) {
  if (!isRecord(value)) return value;
  const data = value.data;
  if (isRecord(data)) {
    for (const key of keys) {
      if (data[key] !== undefined) return data[key];
    }
  }
  for (const key of keys) {
    if (value[key] !== undefined) return value[key];
  }
  return data ?? value;
}

function formatLabel(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeStatus(value: string): TicketStatus {
  const token = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (token === "IN_REVIEW" || token === "ASSIGNED") return "In review";
  if (
    token === "WAITING_ON_USER" ||
    token === "WAITING_FOR_USER" ||
    token === "WAITING_ON_CUSTOMER"
  ) return "Waiting on user";
  if (token === "RESOLVED") return "Resolved";
  if (token === "CLOSED") return "Closed";
  if (token === "OPEN" || token === "NEW") return "Open";
  return formatLabel(value || "Open");
}

function statusQueryValue(value: string) {
  if (value === "Waiting on user") {
    return "waiting_on_customer";
  }

  return value.toLowerCase().replace(/\s+/g, "_");
}

function parseAttachment(value: unknown): Attachment | null {
  if (!isRecord(value)) return null;
  const id = readText(value, ["id", "attachmentId"]);
  const name = readText(value, ["fileName", "filename", "name", "originalName"]);
  if (!id || !name) return null;
  return {
    id,
    name,
    size: readNumber(value, ["size", "fileSize"]),
    mimeType: readText(value, ["mimeType", "contentType"]) || undefined,
  };
}

function parseAttachments(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const attachment = parseAttachment(item);
    return attachment ? [attachment] : [];
  });
}

function parseMessage(value: unknown): TicketMessage | null {
  if (!isRecord(value)) return null;
  const sender = isRecord(value.sender)
    ? value.sender
    : isRecord(value.author)
      ? value.author
      : isRecord(value.user)
        ? value.user
        : null;
  const body = readText(value, ["message", "body", "content", "text"]);
  const id = readText(value, ["id", "messageId"]);
  if (!id || !body) return null;
  return {
    id,
    body,
    createdAt: readText(value, ["createdAt", "sentAt"]) || undefined,
    senderId: readText(value, ["senderId", "authorId", "userId"]) || undefined,
    senderType: readText(value, ["senderType", "authorType"]) || undefined,
    senderName: sender
      ? readText(sender, ["fullName", "name", "email"]) || "Support"
      : readText(value, ["senderName", "authorName"]) || "Support",
    senderRole: sender
      ? readText(sender, ["role"]) || undefined
      : readText(value, ["senderRole", "role"]) || undefined,
    attachments: parseAttachments(value.attachments ?? value.files),
  };
}

function parseTicket(value: unknown): Ticket | null {
  if (!isRecord(value)) return null;
  const id = readText(value, ["id", "ticketId"]);
  if (!id) return null;
  const creator = isRecord(value.creator)
    ? value.creator
    : isRecord(value.createdBy)
      ? value.createdBy
      : isRecord(value.customer)
        ? value.customer
      : isRecord(value.user)
        ? value.user
        : null;
  const assignee = isRecord(value.assignee)
    ? value.assignee
    : isRecord(value.assignedTo)
      ? value.assignedTo
      : null;
  const messageValues = value.messages ?? value.conversation;
  const messages = Array.isArray(messageValues)
    ? messageValues.flatMap((item) => {
        const message = parseMessage(item);
        return message ? [message] : [];
      })
    : [];
  const initialMessage =
    messages.find((message) => message.senderType?.toLowerCase() === "customer") ??
    messages[0];
  return {
    id,
    reference: readText(value, ["ticketNumber", "reference", "referenceNumber", "code"]) || id,
    subject: readText(value, ["subject", "title"]) || "Support ticket",
    category: formatLabel(readText(value, ["category", "type"]) || "General"),
    status: normalizeStatus(readText(value, ["status"]) || "Open"),
    priority: formatLabel(readText(value, ["priority"]) || "Normal"),
    description:
      readText(value, ["description", "message", "body"]) ||
      initialMessage?.body ||
      "No initial message provided.",
    orderId: readText(value, ["orderId", "orderNumber"]) || undefined,
    createdAt: readText(value, ["createdAt"]) || undefined,
    updatedAt:
      readText(value, ["lastMessageAt", "updatedAt", "lastActivityAt", "createdAt"]) ||
      undefined,
    creatorName: creator
      ? readText(creator, ["fullName", "name", "email"]) || undefined
      : readText(value, ["creatorName", "customerName"]) || undefined,
    assigneeId: assignee
      ? readText(assignee, ["id"])
      : readText(value, ["assignedToId", "assigneeId"]) || undefined,
    assigneeName: assignee
      ? readText(assignee, ["fullName", "name", "email"]) || undefined
      : readText(value, ["assigneeName"]) || undefined,
    attachments: parseAttachments(value.attachments ?? value.files),
    messages,
  };
}

function parseTickets(body: unknown) {
  const value = unwrap(body, ["tickets", "results", "items"]);
  const list = Array.isArray(value) ? value : [value];
  return list.flatMap((item) => {
    const ticket = parseTicket(item);
    return ticket ? [ticket] : [];
  });
}

function parsePagination(body: unknown, fallback: Pagination): Pagination {
  if (!isRecord(body)) return fallback;
  const data = isRecord(body.data) ? body.data : null;
  const value = isRecord(body.pagination)
    ? body.pagination
    : data && isRecord(data.pagination)
      ? data.pagination
      : {};
  return {
    page: readNumber(value, ["page", "currentPage"]) ?? fallback.page,
    limit: readNumber(value, ["limit", "pageSize"]) ?? fallback.limit,
    total: readNumber(value, ["total", "totalItems"]),
    totalPages: readNumber(value, ["totalPages", "pages"]),
  };
}

function parseSummary(body: unknown): Summary {
  const value = unwrap(body, ["summary", "counts"]);
  const record = isRecord(value) ? value : {};
  const byStatus = isRecord(record.byStatus) ? record.byStatus : {};
  const open =
    readNumber(byStatus, ["open"]) ??
    readNumber(record, ["open", "openTickets"]) ??
    0;
  const inReview =
    readNumber(byStatus, ["in_review", "inReview"]) ??
    readNumber(record, ["inReview", "in_review", "assigned"]) ??
    0;
  const waiting =
    readNumber(byStatus, ["waiting_on_customer", "waiting_on_user"]) ??
    readNumber(record, ["needsYourReply", "waitingOnUser", "waiting_on_user", "waiting", "pendingUser"]) ??
    0;
  const resolved =
    readNumber(record, ["resolved", "resolvedTickets"]) ??
    readNumber(byStatus, ["resolved"]) ??
    0;
  const activeCases =
    readNumber(record, ["activeCases"]) ??
    open + inReview + waiting;
  const needsYourReply =
    readNumber(record, ["needsYourReply"]) ??
    waiting;
  const total = readNumber(record, ["total", "totalTickets"]) ?? open + inReview + waiting + resolved;
  return { activeCases, needsYourReply, open, inReview, waiting, resolved, total };
}

function parseStaff(body: unknown) {
  const value = unwrap(body, ["staff", "users", "results", "items"]);
  const list = Array.isArray(value) ? value : [value];
  return list.flatMap((item): StaffMember[] => {
    if (!isRecord(item)) return [];
    const id = readText(item, ["id", "userId"]);
    if (!id) return [];
    return [{
      id,
      name: readText(item, ["fullName", "name", "email"]) || "Staff member",
      role: readText(item, ["role"]) || undefined,
      workload: readNumber(item, ["workload", "assignedCount", "ticketCount"]),
    }];
  });
}

function formatDate(value?: string, includeTime = false) {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    ...(includeTime ? { timeStyle: "short" as const } : {}),
  }).format(date);
}

function statusStyle(status: TicketStatus) {
  if (status === "Resolved" || status === "Closed") return "bg-emerald-50 text-emerald-700";
  if (status === "Waiting on user") return "bg-amber-50 text-amber-700";
  if (status === "In review") return "bg-blue-50 text-blue-700";
  return "bg-[#fff0f0] text-[#f10606]";
}

function fileSize(bytes?: number) {
  if (bytes === undefined) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileNameFromResponse(response: Response, fallback: string) {
  const disposition = response.headers.get("content-disposition") ?? "";
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  const plainMatch = disposition.match(/filename="?([^";]+)"?/i);
  return decodeURIComponent(utf8Match?.[1] ?? plainMatch?.[1] ?? fallback);
}

export function DashboardSupport() {
  const session = useAuthSession();
  const role = session?.user.role?.trim().toLowerCase() ?? "";
  const mode: SupportMode = role === "user" ? "user" : role === "admin" ? "admin" : "staff";
  const isUser = mode === "user";
  const isAdmin = mode === "admin";

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [summary, setSummary] = useState<Summary>({ activeCases: 0, needsYourReply: 0, open: 0, inReview: 0, waiting: 0, resolved: 0, total: 0 });
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: pageSize });
  const [page, setPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createFiles, setCreateFiles] = useState<File[]>([]);
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [replyText, setReplyText] = useState("");
  const [replyStatus, setReplyStatus] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const createModalRef = useRef<HTMLElement>(null);
  const createFileInputRef = useRef<HTMLInputElement>(null);
  const replyFileInputRef = useRef<HTMLInputElement>(null);

  const listEndpoint = useMemo(() => {
    if (mode === "admin") return `${ticketsEndpoint}/admin`;
    if (mode === "staff") return `${ticketsEndpoint}/assigned`;
    return `${ticketsEndpoint}/created`;
  }, [mode]);

  const loadTickets = useCallback(async () => {
    setIsLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
    if (activeFilter !== "All") params.set("status", statusQueryValue(activeFilter));
    if (searchQuery.trim()) params.set("search", searchQuery.trim());

    try {
      const response = await authenticatedFetch(`${listEndpoint}?${params}`, {
        headers: { Accept: "application/json" },
      });
      const body = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        throw new Error(getResponseMessage(body, `Unable to load tickets (${response.status}).`));
      }
      const parsed = parseTickets(body);
      setTickets(parsed);
      setPagination(parsePagination(body, { page, limit: pageSize }));
      if (!isUser) {
        setSummary({
          activeCases: parsed.filter((ticket) => ticket.status !== "Resolved" && ticket.status !== "Closed").length,
          needsYourReply: parsed.filter((ticket) => ticket.status === "Waiting on user").length,
          open: parsed.filter((ticket) => ticket.status === "Open").length,
          inReview: parsed.filter((ticket) => ticket.status === "In review").length,
          waiting: parsed.filter((ticket) => ticket.status === "Waiting on user").length,
          resolved: parsed.filter((ticket) => ticket.status === "Resolved" || ticket.status === "Closed").length,
          total: parsed.length,
        });
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load tickets.");
      setTickets([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeFilter, isUser, listEndpoint, page, searchQuery]);

  const loadSummary = useCallback(async () => {
    if (!isUser) return;
    try {
      const response = await authenticatedFetch(`${ticketsEndpoint}/summary`, {
        headers: { Accept: "application/json" },
      });
      const body = (await response.json().catch(() => null)) as unknown;
      if (response.ok) setSummary(parseSummary(body));
    } catch {
      // The ticket list remains usable when summary loading fails.
    }
  }, [isUser]);

  const loadStaff = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const response = await authenticatedFetch(`${ticketsEndpoint}/admin/staff`, {
        headers: { Accept: "application/json" },
      });
      const body = (await response.json().catch(() => null)) as unknown;
      if (response.ok) setStaff(parseStaff(body));
    } catch {
      // Assignment controls can remain unavailable if staff loading fails.
    }
  }, [isAdmin]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void Promise.all([loadTickets(), loadSummary(), loadStaff()]);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [loadStaff, loadSummary, loadTickets]);

  async function openTicket(id: string) {
    setIsDetailLoading(true);
    setError("");
    setReplyText("");
    setReplyFiles([]);
    setReplyStatus("");
    try {
      const response = await authenticatedFetch(`${ticketsEndpoint}/${encodeURIComponent(id)}`, {
        headers: { Accept: "application/json" },
      });
      const body = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        throw new Error(getResponseMessage(body, `Unable to load ticket (${response.status}).`));
      }
      const ticket = parseTicket(unwrap(body, ["ticket"]));
      if (!ticket) throw new Error("The ticket response was not in the expected format.");
      setSelectedTicket(ticket);
      setTickets((current) => current.map((item) => item.id === ticket.id ? { ...item, ...ticket } : item));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load ticket.");
    } finally {
      setIsDetailLoading(false);
    }
  }

  function addFiles(current: File[], incoming: File[], setter: (value: File[]) => void) {
    const accepted = incoming.filter((file) => file.size <= 10 * 1024 * 1024);
    const names = new Set(current.map((file) => file.name));
    setter([...current, ...accepted.filter((file) => !names.has(file.name))].slice(0, 5));
  }

  async function createTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyAction("create");
    setError("");
    setNotice("");
    const form = event.currentTarget;
    const formData = new FormData(form);
    const orderId = String(formData.get("orderId") ?? "").trim();
    if (!orderId) {
      formData.delete("orderId");
    } else {
      formData.set("orderId", orderId);
    }
    // Keep priority available in the UI while the create-ticket DTO does not accept it.
    formData.delete("priority");
    createFiles.forEach((file) => formData.append("attachments", file));

    try {
      const response = await authenticatedFetch(ticketsEndpoint, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: formData,
      });
      const body = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        throw new Error(getResponseMessage(body, `Unable to create ticket (${response.status}).`));
      }
      const ticket = parseTicket(unwrap(body, ["ticket"]));
      setNotice(`${ticket?.reference ?? "Your ticket"} was created successfully.`);
      setIsCreateOpen(false);
      setCreateFiles([]);
      form.reset();
      setPage(1);
      await Promise.all([loadTickets(), loadSummary()]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create ticket.");
      window.requestAnimationFrame(() => {
        createModalRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      });
    } finally {
      setBusyAction("");
    }
  }

  async function sendReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTicket || (!replyText.trim() && !replyFiles.length)) return;
    setBusyAction("reply");
    setError("");
    const formData = new FormData();
    formData.append("message", replyText.trim());
    if (!isUser && replyStatus) {
      formData.append("status", replyStatus);
    }
    replyFiles.forEach((file) => formData.append("attachments", file));

    try {
      const response = await authenticatedFetch(
        `${ticketsEndpoint}/${encodeURIComponent(selectedTicket.id)}/messages`,
        { method: "POST", headers: { Accept: "application/json" }, body: formData },
      );
      const body = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        throw new Error(getResponseMessage(body, `Unable to send reply (${response.status}).`));
      }
      const responseRecord = isRecord(body) ? body : {};
      const parsedReply = parseMessage(responseRecord.reply);
      const nextStatus = readText(responseRecord, ["status"]);
      const updatedStatus = nextStatus
        ? normalizeStatus(nextStatus)
        : selectedTicket.status;
      const reply = parsedReply
        ? {
            ...parsedReply,
            senderName:
              parsedReply.senderName === "Support"
                ? session?.user.fullName || session?.user.email || "Support"
                : parsedReply.senderName,
            senderRole: parsedReply.senderRole || session?.user.role,
          }
        : null;

      setSelectedTicket((current) =>
        current
          ? {
              ...current,
              status: updatedStatus,
              updatedAt: reply?.createdAt || current.updatedAt,
              messages: reply ? [...current.messages, reply] : current.messages,
            }
          : current,
      );
      setTickets((current) =>
        current.map((ticket) =>
          ticket.id === selectedTicket.id
            ? {
                ...ticket,
                status: updatedStatus,
                updatedAt: reply?.createdAt || ticket.updatedAt,
              }
            : ticket,
        ),
      );
      setReplyText("");
      setReplyFiles([]);
      setReplyStatus("");
      setNotice(getResponseMessage(body, "Reply sent successfully."));
      await openTicket(selectedTicket.id);
      await loadTickets();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to send reply.");
    } finally {
      setBusyAction("");
    }
  }

  async function assignTicket(assigneeId: string) {
    if (!selectedTicket) return;
    setBusyAction("assign");
    setError("");
    try {
      const response = await authenticatedFetch(
        `${ticketsEndpoint}/${encodeURIComponent(selectedTicket.id)}/assignee`,
        {
          method: "PATCH",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({ assigneeId: assigneeId || null }),
        },
      );
      const body = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        throw new Error(getResponseMessage(body, `Unable to assign ticket (${response.status}).`));
      }
      setNotice(assigneeId ? "Ticket assignment updated." : "Ticket returned to the unassigned queue.");
      await openTicket(selectedTicket.id);
      await loadTickets();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to assign ticket.");
    } finally {
      setBusyAction("");
    }
  }

  async function downloadAttachment(attachment: Attachment) {
    setBusyAction(`download-${attachment.id}`);
    setError("");
    try {
      const response = await authenticatedFetch(
        `${ticketsEndpoint}/attachments/${encodeURIComponent(attachment.id)}/download`,
        { headers: { Accept: "*/*" } },
      );
      if (!response.ok) throw new Error(`Unable to download attachment (${response.status}).`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileNameFromResponse(response, attachment.name);
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to download attachment.");
    } finally {
      setBusyAction("");
    }
  }

  const pageTitle = isUser ? "How can we help?" : isAdmin ? "Support administration" : "Assigned support cases";
  const pageDescription = isUser
    ? "Create a support ticket, share documents, and track every case from one place."
    : isAdmin
      ? "Review the full support queue, assign staff, and follow ticket conversations."
      : "Review and respond to the support tickets assigned to you.";
  const statCards = isUser
    ? [
        ["Active cases", summary.activeCases, "Open or under review", CircleDot],
        ["Needs your reply", summary.needsYourReply, "Support requested information", MessageSquareText],
        ["Resolved", summary.resolved, "Successfully completed", CheckCircle2],
      ] as const
    : [
        ["Loaded cases", summary.total, isAdmin ? "System-wide queue" : "Assigned to you", Inbox],
        ["In review", summary.inReview, "Currently being handled", Clock3],
        ["Waiting on user", summary.waiting, "Customer response needed", MessageSquareText],
      ] as const;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#f10606]">
            <Headphones size={15} />
            {isUser ? "Help centre" : isAdmin ? "Admin queue" : "Staff queue"}
          </div>
          <h1 className="text-3xl font-black tracking-tight text-black">{pageTitle}</h1>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-black/55">{pageDescription}</p>
        </div>
        <div className="flex items-center gap-2 text-sm font-bold text-black/55">
          <CalendarDays size={17} />
          {formatDate(new Date().toISOString())}
        </div>
      </header>

      {error ? (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          <span className="whitespace-pre-line">{error}</span>
          <button aria-label="Dismiss error" type="button" onClick={() => setError("")}><X size={17} /></button>
        </div>
      ) : null}
      {notice ? (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
          <span className="flex items-center gap-2"><CheckCircle2 size={18} />{notice}</span>
          <button aria-label="Dismiss message" type="button" onClick={() => setNotice("")}><X size={17} /></button>
        </div>
      ) : null}

      {isUser ? (
        <section className="relative overflow-hidden rounded-2xl bg-[#171717] p-6 text-white shadow-[0_20px_50px_rgba(0,0,0,0.12)] sm:p-8">
          <div className="absolute -right-14 -top-20 h-64 w-64 rounded-full bg-[#f10606]/20 blur-3xl" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="max-w-xl text-2xl font-black leading-tight sm:text-3xl">Tell us what happened. We’ll take it from there.</h2>
              <p className="mt-3 max-w-xl text-sm font-medium leading-6 text-white/60">Include an order ID and photos or receipts when they help explain the issue.</p>
            </div>
            <button className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#f10606] px-5 text-sm font-black text-white" type="button" onClick={() => setIsCreateOpen(true)}>
              <Plus size={18} />Create ticket
            </button>
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        {statCards.map(([label, value, detail, Icon]) => (
          <section className="rounded-xl border border-black/10 bg-white p-5 shadow-[0_14px_35px_rgba(0,0,0,0.04)]" key={label}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-black/40">{label}</p>
                <p className="mt-2 text-3xl font-black text-black">{value}</p>
                <p className="mt-1 text-xs font-medium text-black/45">{detail}</p>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff0f0] text-[#f10606]"><Icon size={21} /></span>
            </div>
          </section>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
        <div className="border-b border-black/10 p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-black text-black">{isUser ? "Your support cases" : isAdmin ? "All support cases" : "Your assigned cases"}</h2>
              <p className="mt-1 text-sm font-medium text-black/50">Open a case to view its conversation and attachments.</p>
            </div>
            <div className="flex gap-2">
              <div className="relative w-full lg:w-72">
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/35" size={17} />
                <input className="h-11 w-full rounded-xl border border-black/10 bg-[#fafafa] pl-11 pr-4 text-sm font-bold outline-none" placeholder="Search tickets..." value={searchQuery} onChange={(event) => { setSearchQuery(event.target.value); setPage(1); }} />
              </div>
              <button aria-label="Refresh tickets" className="flex h-11 w-11 items-center justify-center rounded-xl border border-black/10 text-black/55" disabled={isLoading} type="button" onClick={() => void loadTickets()}>
                <RefreshCw className={isLoading ? "animate-spin" : ""} size={17} />
              </button>
            </div>
          </div>
          <div className="scrollbar-hide mt-5 flex gap-2 overflow-x-auto">
            {statusFilters.map((filter) => (
              <button className={`shrink-0 rounded-full px-4 py-2 text-xs font-black ${activeFilter === filter ? "bg-black text-white" : "border border-black/10 text-black/55"}`} key={filter} type="button" onClick={() => { setActiveFilter(filter); setPage(1); }}>
                {filter}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-5">{[0, 1, 2, 3].map((item) => <div className="h-20 animate-pulse rounded-xl bg-black/[0.04]" key={item} />)}</div>
        ) : tickets.length ? (
          <div className="divide-y divide-black/10">
            {tickets.map((ticket) => (
              <button className="grid w-full gap-4 px-5 py-5 text-left transition hover:bg-[#fffafa] sm:px-6 lg:grid-cols-[minmax(0,1.5fr)_0.6fr_0.7fr_auto] lg:items-center" key={ticket.id} type="button" onClick={() => void openTicket(ticket.id)}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black text-[#f10606]">{ticket.reference}</span>
                    {ticket.priority.toLowerCase() === "high" ? <span className="rounded-full bg-[#fff0f0] px-2 py-0.5 text-[9px] font-black uppercase text-[#f10606]">High</span> : null}
                  </div>
                  <p className="mt-1 truncate text-sm font-black text-black sm:text-base">{ticket.subject}</p>
                  <p className="mt-1 text-xs font-medium text-black/45">
                    {!isUser && ticket.creatorName ? `${ticket.creatorName} · ` : ""}
                    {ticket.orderId ? `${ticket.orderId} · ` : ""}{ticket.category}
                  </p>
                </div>
                <span className={`w-max rounded-full px-3 py-1.5 text-[10px] font-black ${statusStyle(ticket.status)}`}>{ticket.status}</span>
                <div className="text-xs font-bold text-black/40">{isAdmin ? ticket.assigneeName ?? "Unassigned" : formatDate(ticket.updatedAt)}</div>
                <ChevronRight className="text-black/25" size={20} />
              </button>
            ))}
          </div>
        ) : (
          <div className="px-6 py-14 text-center">
            <Inbox className="mx-auto text-black/20" size={30} />
            <p className="mt-3 text-sm font-black text-black">No tickets found</p>
            <p className="mt-1 text-xs font-medium text-black/45">There are no cases matching the current filters.</p>
          </div>
        )}

        <footer className="flex flex-col gap-3 border-t border-black/10 bg-[#fafafa] px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span className="flex items-center gap-2 text-xs font-bold text-black/45"><ShieldCheck size={15} />Ticket access follows your authenticated role.</span>
          <div className="flex items-center gap-3">
            <button className="flex h-9 items-center gap-1 rounded-lg border border-black/10 px-3 text-xs font-black disabled:opacity-40" disabled={page <= 1 || isLoading} type="button" onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft size={14} />Previous</button>
            <span className="text-xs font-black text-black/45">Page {pagination.page}{pagination.totalPages ? ` of ${pagination.totalPages}` : ""}</span>
            <button className="flex h-9 items-center gap-1 rounded-lg border border-black/10 px-3 text-xs font-black disabled:opacity-40" disabled={isLoading || (pagination.totalPages !== undefined ? page >= pagination.totalPages : tickets.length < pageSize)} type="button" onClick={() => setPage((current) => current + 1)}>Next<ChevronRight size={14} /></button>
          </div>
        </footer>
      </section>

      {isCreateOpen && isUser ? (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && busyAction !== "create") setIsCreateOpen(false); }}>
          <section aria-labelledby="create-ticket-title" aria-modal="true" className="max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-t-[1.5rem] bg-white shadow-2xl sm:rounded-2xl" ref={createModalRef} role="dialog">
            <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-black/10 bg-white/95 px-5 py-5 backdrop-blur sm:px-6">
              <div><p className="text-xs font-black uppercase tracking-[0.14em] text-[#f10606]">New support case</p><h2 className="mt-1 text-xl font-black" id="create-ticket-title">Create a ticket</h2></div>
              <button aria-label="Close create ticket" className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.05]" disabled={busyAction === "create"} type="button" onClick={() => setIsCreateOpen(false)}><X size={18} /></button>
            </header>
            {error ? (
              <div className="mx-5 mt-5 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 sm:mx-6">
                <span className="whitespace-pre-line">{error}</span>
                <button aria-label="Dismiss ticket error" className="shrink-0" type="button" onClick={() => setError("")}>
                  <X size={17} />
                </button>
              </div>
            ) : null}
            <form className="space-y-5 p-5 sm:p-6" onSubmit={createTicket}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block"><span className="text-xs font-black text-black/65">Issue category</span><select className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-white px-4 text-sm font-bold outline-none" defaultValue="" name="category" required><option disabled value="">Select category</option>{categories.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}</select></label>
                <label className="block"><span className="text-xs font-black text-black/65">Order ID <span className="font-medium text-black/35">(optional)</span></span><input className="mt-2 h-12 w-full rounded-xl border border-black/10 px-4 text-sm font-bold outline-none" name="orderId" placeholder="Optional order UUID" /></label>
              </div>
              <label className="block"><span className="text-xs font-black text-black/65">Subject</span><input className="mt-2 h-12 w-full rounded-xl border border-black/10 px-4 text-sm font-bold outline-none" name="subject" placeholder="Refund confirmation for ORD-24561" required /></label>
              <label className="block"><span className="text-xs font-black text-black/65">Message</span><textarea className="mt-2 min-h-32 w-full rounded-xl border border-black/10 p-4 text-sm outline-none" maxLength={5000} minLength={1} name="message" placeholder="I requested a refund but have not received confirmation yet." required /></label>
              <fieldset><legend className="text-xs font-black text-black/65">Priority</legend><div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">{["low", "normal", "high", "urgent"].map((priority) => <label className="cursor-pointer" key={priority}><input className="peer sr-only" defaultChecked={priority === "normal"} name="priority" type="radio" value={priority} /><span className="block rounded-xl border border-black/10 p-4 text-center text-sm font-black capitalize peer-checked:border-[#f10606] peer-checked:bg-[#fff8f8]">{priority}</span></label>)}</div><p className="mt-2 text-[10px] font-medium text-black/40">Priority is shown for context but is not submitted until the backend create-ticket DTO supports it.</p></fieldset>
              <div>
                <span className="text-xs font-black text-black/65">Attachments <span className="font-medium text-black/35">(optional)</span></span>
                <div className={`mt-2 rounded-xl border-2 border-dashed p-5 text-center ${isDragging ? "border-[#f10606] bg-[#fff8f8]" : "border-black/10 bg-[#fafafa]"}`} onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDragOver={(event) => event.preventDefault()} onDrop={(event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setIsDragging(false); addFiles(createFiles, Array.from(event.dataTransfer.files), setCreateFiles); }}>
                  <UploadCloud className="mx-auto text-[#f10606]" size={26} /><p className="mt-2 text-sm font-black">Drop files here or browse</p><p className="mt-1 text-xs text-black/40">Up to 10 MB each, 5 files maximum</p>
                  <button className="mt-3 rounded-lg border border-black/10 bg-white px-4 py-2 text-xs font-black" type="button" onClick={() => createFileInputRef.current?.click()}>Choose files</button>
                  <input className="hidden" multiple ref={createFileInputRef} type="file" onChange={(event: ChangeEvent<HTMLInputElement>) => { addFiles(createFiles, Array.from(event.target.files ?? []), setCreateFiles); event.target.value = ""; }} />
                </div>
                <FileList files={createFiles} onRemove={(name) => setCreateFiles((current) => current.filter((file) => file.name !== name))} />
              </div>
              <button className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#f10606] text-sm font-black text-white disabled:opacity-60" disabled={busyAction === "create"} type="submit">{busyAction === "create" ? <LoaderCircle className="animate-spin" size={17} /> : <Send size={17} />}{busyAction === "create" ? "Creating..." : "Submit ticket"}</button>
            </form>
          </section>
        </div>
      ) : null}

      {isDetailLoading && !selectedTicket ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45"><LoaderCircle className="animate-spin text-white" size={30} /></div>
      ) : null}

      {selectedTicket ? (
        <div className="fixed inset-0 z-[120] flex justify-end bg-black/45 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedTicket(null); }}>
          <section aria-labelledby="ticket-detail-title" aria-modal="true" className="h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl" role="dialog">
            <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-black/10 bg-white/95 px-5 py-5 backdrop-blur sm:px-7">
              <div><div className="flex items-center gap-2"><p className="text-xs font-black text-[#f10606]">{selectedTicket.reference}</p><span className={`rounded-full px-2.5 py-1 text-[9px] font-black ${statusStyle(selectedTicket.status)}`}>{selectedTicket.status}</span></div><h2 className="mt-2 text-xl font-black" id="ticket-detail-title">{selectedTicket.subject}</h2><p className="mt-1 text-xs font-bold text-black/40">Updated {formatDate(selectedTicket.updatedAt, true)}</p></div>
              <button aria-label="Close ticket detail" className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.05]" type="button" onClick={() => setSelectedTicket(null)}><X size={18} /></button>
            </header>
            <div className="space-y-6 p-5 sm:p-7">
              {error ? (
                <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                  <span className="whitespace-pre-line">{error}</span>
                  <button aria-label="Dismiss ticket error" className="shrink-0" type="button" onClick={() => setError("")}>
                    <X size={17} />
                  </button>
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[["Category", selectedTicket.category], ["Priority", selectedTicket.priority], ["Order ID", selectedTicket.orderId ?? "None"], ["Assigned to", selectedTicket.assigneeName ?? "Unassigned"]].map(([label, value]) => <div className="rounded-xl bg-[#fafafa] p-3" key={label}><p className="text-[10px] font-black uppercase text-black/35">{label}</p><p className="mt-1 truncate text-xs font-black">{value}</p></div>)}
              </div>

              {isAdmin ? (
                <section className="rounded-xl border border-black/10 p-4">
                  <div className="flex items-center gap-2"><UserRoundCog className="text-[#f10606]" size={18} /><h3 className="text-sm font-black">Ticket assignment</h3></div>
                  <div className="mt-3 flex gap-2">
                    <select className="h-11 min-w-0 flex-1 rounded-xl border border-black/10 px-3 text-sm font-bold" defaultValue={selectedTicket.assigneeId ?? ""} disabled={busyAction === "assign"} onChange={(event) => void assignTicket(event.target.value)}>
                      <option value="">Unassigned</option>
                      {staff.map((member) => <option key={member.id} value={member.id}>{member.name}{member.role ? ` · ${formatLabel(member.role)}` : ""}{member.workload !== undefined ? ` (${member.workload})` : ""}</option>)}
                    </select>
                    {busyAction === "assign" ? <LoaderCircle className="mt-3 animate-spin text-[#f10606]" size={18} /> : null}
                  </div>
                </section>
              ) : null}

              <section><h3 className="text-sm font-black">Case details</h3><p className="mt-2 rounded-xl border border-black/10 p-4 text-sm font-medium leading-6 text-black/60">{selectedTicket.description}</p><AttachmentList attachments={selectedTicket.attachments} busyAction={busyAction} onDownload={downloadAttachment} /></section>

              <section>
                <div className="flex items-center justify-between"><h3 className="text-sm font-black">Conversation</h3><span className="text-xs font-bold text-black/35">{selectedTicket.messages.length} messages</span></div>
                <div className="mt-4 space-y-3">
                  {selectedTicket.messages.length ? selectedTicket.messages.map((message) => {
                    const fromCurrentUser =
                      message.senderId === session?.user.id ||
                      (!message.senderId && message.senderName === session?.user.fullName);
                    return <article className={`max-w-[88%] rounded-2xl p-4 ${fromCurrentUser ? "ml-auto bg-[#f10606] text-white" : "bg-[#fafafa] text-black"}`} key={message.id}><div className="flex items-center justify-between gap-3"><p className="text-xs font-black">{message.senderName}</p><p className={`text-[10px] font-bold ${fromCurrentUser ? "text-white/60" : "text-black/35"}`}>{formatDate(message.createdAt, true)}</p></div><p className={`mt-2 whitespace-pre-wrap text-sm font-medium leading-6 ${fromCurrentUser ? "text-white/90" : "text-black/60"}`}>{message.body}</p><AttachmentList attachments={message.attachments} busyAction={busyAction} compact onDownload={downloadAttachment} /></article>;
                  }) : <p className="rounded-xl bg-[#fafafa] p-4 text-sm font-medium text-black/45">No replies yet. The original ticket details are shown above.</p>}
                </div>
              </section>

              {selectedTicket.status !== "Resolved" && selectedTicket.status !== "Closed" ? (
                <form className="rounded-2xl border border-black/10 p-4" onSubmit={sendReply}>
                  <label className="text-xs font-black text-black/60" htmlFor="ticket-reply">Reply to this case</label>
                  <textarea className="mt-2 min-h-24 w-full rounded-xl bg-[#fafafa] p-3 text-sm outline-none" id="ticket-reply" placeholder="Add a message..." value={replyText} onChange={(event) => setReplyText(event.target.value)} />
                  <FileList files={replyFiles} onRemove={(name) => setReplyFiles((current) => current.filter((file) => file.name !== name))} />
                  {!isUser ? (
                    <label className="mt-3 block rounded-xl border border-black/10 bg-[#fafafa] p-3">
                      <span className="block text-xs font-black text-black">Update ticket status</span>
                      <span className="mt-1 block text-[10px] font-medium leading-4 text-black/45">
                        Choose the status that best describes this reply.
                      </span>
                      <select
                        className="mt-3 h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm font-bold text-black outline-none focus:border-[#f10606]/50"
                        required
                        value={replyStatus}
                        onChange={(event) => setReplyStatus(event.target.value)}
                      >
                        <option disabled value="">Select status</option>
                        <option value="in_review">In review</option>
                        <option value="waiting_on_customer">Waiting for customer</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </label>
                  ) : null}
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <button className="flex items-center gap-2 text-xs font-black text-black/45" type="button" onClick={() => replyFileInputRef.current?.click()}><Paperclip size={15} />Attach</button>
                    <input className="hidden" multiple ref={replyFileInputRef} type="file" onChange={(event) => { addFiles(replyFiles, Array.from(event.target.files ?? []), setReplyFiles); event.target.value = ""; }} />
                    <button className="flex h-10 items-center gap-2 rounded-xl bg-[#f10606] px-4 text-xs font-black text-white disabled:opacity-60" disabled={busyAction === "reply" || (!replyText.trim() && !replyFiles.length)} type="submit">{busyAction === "reply" ? <LoaderCircle className="animate-spin" size={15} /> : <Send size={15} />}Send reply</button>
                  </div>
                </form>
              ) : <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800"><CheckCircle2 size={20} />This case is complete.</div>}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function FileList({ files, onRemove }: { files: File[]; onRemove: (name: string) => void }) {
  if (!files.length) return null;
  return <div className="mt-3 space-y-2">{files.map((file) => <div className="flex items-center gap-3 rounded-xl border border-black/10 px-3 py-2.5" key={file.name}><FileText className="text-[#f10606]" size={17} /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-black">{file.name}</span><span className="text-[10px] font-bold text-black/35">{fileSize(file.size)}</span></span><button aria-label={`Remove ${file.name}`} className="text-black/35" type="button" onClick={() => onRemove(file.name)}><X size={17} /></button></div>)}</div>;
}

function AttachmentList({ attachments, busyAction, compact = false, onDownload }: { attachments: Attachment[]; busyAction: string; compact?: boolean; onDownload: (attachment: Attachment) => void }) {
  if (!attachments.length) return null;
  return <div className={`${compact ? "mt-3" : "mt-3"} flex flex-wrap gap-2`}>{attachments.map((attachment) => <button className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-black ${compact ? "bg-white/15" : "bg-[#fafafa] text-black/55"}`} disabled={busyAction === `download-${attachment.id}`} key={attachment.id} type="button" onClick={() => void onDownload(attachment)}>{busyAction === `download-${attachment.id}` ? <LoaderCircle className="animate-spin" size={14} /> : <Download size={14} className={compact ? "" : "text-[#f10606]"} />}<span className="max-w-48 truncate">{attachment.name}</span>{attachment.size ? <span className="opacity-50">{fileSize(attachment.size)}</span> : null}</button>)}</div>;
}
