import { Suspense } from "react";
import PageShell from "@/components/PageShell";
import { VerifyEmail } from "@/components/VerifyEmail";

function VerificationFallback() {
  return (
    <section className="px-5 py-16 sm:px-8">
      <div className="mx-auto h-80 max-w-md animate-pulse rounded-2xl border border-black/10 bg-white shadow-[0_22px_60px_rgba(0,0,0,0.08)]" />
    </section>
  );
}

export default function VerifyEmailPage() {
  return (
    <PageShell>
      <Suspense fallback={<VerificationFallback />}>
        <VerifyEmail />
      </Suspense>
    </PageShell>
  );
}
