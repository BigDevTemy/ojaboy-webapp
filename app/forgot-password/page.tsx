import Image from "next/image";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";
import { LoginSessionRedirect } from "@/components/LoginSessionRedirect";
import PageShell from "@/components/PageShell";

export default function ForgotPasswordPage() {
  return (
    <PageShell>
      <LoginSessionRedirect />
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
              <p className="text-xs font-black uppercase text-white/72">Account Recovery</p>
              <h2 className="mt-2 max-w-sm text-3xl font-black tracking-normal">Get back into Ojaboy</h2>
              <p className="mt-3 max-w-sm text-sm font-medium leading-7 text-white/82">
                Request a reset link with your registered email and continue securing your account.
              </p>
            </div>
          </div>

          <ForgotPasswordForm />
        </div>
      </section>
    </PageShell>
  );
}
