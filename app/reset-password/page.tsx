import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";
import PageShell from "@/components/PageShell";

export default function ResetPasswordPage() {
  return (
    <PageShell>
      <section className="px-5 py-10 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-6xl overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_22px_60px_rgba(0,0,0,0.08)] lg:grid-cols-[0.92fr_1.08fr]">
          <div className="relative hidden min-h-[420px] overflow-hidden bg-black text-white lg:block lg:min-h-full">
            <Image
              src="/auth/signup-market-shopper.png"
              alt="Ojaboy market shopper using the app"
              fill
              priority
              className="object-cover object-center"
              sizes="(min-width: 1024px) 520px, 100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/20" />
            <Link className="absolute left-6 top-6 block h-12 w-[170px] sm:left-8 sm:top-8" href="/" aria-label="Ojaboy home">
              <Image
                src="/logo/ojaboy-logo.svg"
                alt="Ojaboy"
                width={170}
                height={46}
                priority
                unoptimized
                className="h-full w-full brightness-0 invert"
              />
            </Link>
            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
              <p className="text-xs font-black uppercase text-white/72">Secure Password Setup</p>
              <h2 className="mt-2 max-w-sm text-3xl font-black tracking-normal">Choose a new password</h2>
              <p className="mt-3 max-w-sm text-sm font-medium leading-7 text-white/82">
                Complete your reset from the secure email link and return to your dashboard.
              </p>
            </div>
          </div>

          <Suspense
            fallback={
              <div className="p-6 sm:p-8 lg:p-10">
                <div className="h-11 w-24 rounded-lg bg-black/5" />
                <div className="mt-7 h-4 w-32 rounded bg-black/5" />
                <div className="mt-3 h-9 w-72 max-w-full rounded bg-black/5" />
                <div className="mt-6 h-12 rounded-lg bg-black/5" />
                <div className="mt-4 h-12 rounded-lg bg-black/5" />
              </div>
            }
          >
            <ResetPasswordForm />
          </Suspense>
        </div>
      </section>
    </PageShell>
  );
}
