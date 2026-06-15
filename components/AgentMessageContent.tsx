import type { ReactNode } from "react";

const inlineHighlightPattern =
  /(\*\*[^*]+\*\*|\bOrder\s+[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=:)|\b(?:Order ID|Total|Bank|Account name|Account number|Payment reference|Account expires at|Status|Payment)(?=:)|\b(?:pending|paid|confirmed|cancelled|canceled|failed|completed|successful|success)\b|NGN\s?[\d,]+(?:\.\d{2})?)/gi;

const statusStyles: Record<string, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  paid: "border-emerald-200 bg-emerald-50 text-emerald-700",
  confirmed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  successful: "border-emerald-200 bg-emerald-50 text-emerald-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  failed: "border-red-200 bg-red-50 text-red-700",
  cancelled: "border-red-200 bg-red-50 text-red-700",
  canceled: "border-red-200 bg-red-50 text-red-700",
};

function normalizeAnswer(answer: string) {
  return answer
    .replace(/\r\n?/g, "\n")
    .replace(/\s+-\s+(?=Order\s+[0-9a-f]{8}-)/gi, "\n- ")
    .trim();
}

function renderInline(text: string) {
  const parts: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(inlineHighlightPattern)) {
    const index = match.index;

    if (index > lastIndex) {
      parts.push(text.slice(lastIndex, index));
    }

    const matchedText = match[0];
    const displayText =
      matchedText.startsWith("**") && matchedText.endsWith("**")
        ? matchedText.slice(2, -2)
        : matchedText;
    const statusStyle = statusStyles[displayText.toLowerCase()];

    if (statusStyle) {
      parts.push(
        <span
          className={`mx-0.5 inline-flex rounded-full border px-2 py-0.5 align-middle text-[0.72rem] font-black uppercase leading-none tracking-wide ${statusStyle}`}
          key={`${index}-${matchedText}`}
        >
          {displayText}
        </span>,
      );
    } else {
      parts.push(
        <strong className="font-black text-black/90" key={`${index}-${matchedText}`}>
          {displayText}
        </strong>,
      );
    }
    lastIndex = index + matchedText.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length ? parts : text;
}

export function AgentMessageContent({ answer }: { answer: string }) {
  const lines = normalizeAnswer(answer).split("\n");

  return (
    <div className="space-y-2">
      {lines.map((rawLine, index) => {
        const line = rawLine.trim();

        if (!line) {
          return <div className="h-1" key={`space-${index}`} aria-hidden="true" />;
        }

        if (line.startsWith("- ")) {
          return (
            <div className="flex items-start gap-2" key={`item-${index}`}>
              <span className="mt-[0.65em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#f10606]" />
              <p className="min-w-0 break-words">{renderInline(line.slice(2))}</p>
            </div>
          );
        }

        const isHeading = line.endsWith(":") && !line.slice(0, -1).includes(":");

        return (
          <p
            className={
              isHeading
                ? "pt-1 font-black text-black/90"
                : "break-words"
            }
            key={`line-${index}`}
          >
            {renderInline(line)}
          </p>
        );
      })}
    </div>
  );
}
