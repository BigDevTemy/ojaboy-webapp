import Link from "next/link";
import Image from "next/image";
import PageShell from "@/components/PageShell";
import { FcGoogle } from "react-icons/fc";
import { LockKeyhole } from "lucide-react";

export default function SignupPage() {
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
              <p className="text-xs font-black uppercase text-white/72">Market Intelligence Account</p>
              <h1 className="mt-2 max-w-sm text-3xl font-black tracking-normal">Shop smarter with Ojaboy</h1>
              <p className="mt-3 max-w-sm text-sm font-medium leading-7 text-white/82">
                Compare prices, create orders, and get alerts before the market moves.
              </p>
            </div>
          </div>

          <form className="p-6 sm:p-8 lg:p-10">
            <div className="mb-7">
              <p className="mb-2 text-sm font-black uppercase text-[#f10606]">Get started</p>
              <h2 className="text-3xl font-black tracking-normal text-black">Set up your profile</h2>
              <p className="mt-2 text-sm font-medium text-black/55">Use your details so Ojaboy can personalize markets, alerts, and delivery.</p>
            </div>

            <button className="flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-black/10 bg-white text-sm font-black text-black shadow-sm transition hover:border-black/20 hover:bg-black/[0.02]" type="button">
              <FcGoogle className="text-xl" />
              Continue with Google
            </button>
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-black/10" />
              <span className="text-xs font-bold uppercase text-black/40">or</span>
              <span className="h-px flex-1 bg-black/10" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-xs font-black uppercase text-black/45">Full Name</span>
                <input className="mt-2 h-12 w-full rounded-lg border border-black/10 px-4 text-sm font-bold text-black outline-none placeholder:text-black/35 focus:border-[#f10606]/40" placeholder="Temiloluwa Ade" />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs font-black uppercase text-black/45">Email Address</span>
                <input className="mt-2 h-12 w-full rounded-lg border border-black/10 px-4 text-sm font-bold text-black outline-none placeholder:text-black/35 focus:border-[#f10606]/40" placeholder="you@example.com" type="email" />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs font-black uppercase text-black/45">Password</span>
                <input className="mt-2 h-12 w-full rounded-lg border border-black/10 px-4 text-sm font-bold text-black outline-none placeholder:text-black/35 focus:border-[#f10606]/40" placeholder="Create a secure password" type="password" />
              </label>
            </div>

            <div className="mt-4 flex items-start gap-3 rounded-xl bg-[#fbfbfb] p-4">
              <LockKeyhole className="mt-0.5 shrink-0 text-[#f10606]" size={18} />
              <p className="text-xs font-medium leading-5 text-black/55">
                By creating an account, you agree to receive market alerts and accept Ojaboy&apos;s terms and privacy policy.
              </p>
            </div>

            <button className="mt-5 h-12 w-full rounded-lg bg-[#f10606] text-sm font-black text-white shadow-[0_12px_24px_rgba(241,6,6,0.2)] transition hover:bg-[#d80505]" type="button">
              Create Account
            </button>
            <p className="text-center text-sm font-medium text-black/55">
              Already have an account? <Link className="font-black text-[#f10606]" href="/login">Log in</Link>
            </p>
          </form>
        </div>
      </section>
    </PageShell>
  );
}
