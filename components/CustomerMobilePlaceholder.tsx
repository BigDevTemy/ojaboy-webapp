import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";

export function CustomerMobilePlaceholder({
  description,
  icon: Icon,
  linkHref,
  linkLabel,
  title,
}: {
  description: string;
  icon: LucideIcon;
  linkHref?: string;
  linkLabel?: string;
  title: string;
}) {
  return (
    <div className="flex min-h-[62dvh] items-center justify-center px-3 py-8">
      <section className="w-full rounded-[1.5rem] border border-black/10 bg-white p-6 text-center shadow-[0_18px_40px_rgba(0,0,0,0.06)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff0f0] text-[#f10606]">
          <Icon size={25} />
        </div>
        <h2 className="mt-4 text-xl font-black text-black">{title}</h2>
        <p className="mx-auto mt-2 max-w-xs text-sm font-medium leading-6 text-black/52">
          {description}
        </p>
        {linkHref && linkLabel ? (
          <Link
            className="mx-auto mt-6 flex h-11 w-max items-center gap-2 rounded-full bg-[#f10606] px-5 text-sm font-black text-white"
            href={linkHref}
          >
            {linkLabel}
            <ChevronRight size={16} />
          </Link>
        ) : null}
      </section>
    </div>
  );
}
