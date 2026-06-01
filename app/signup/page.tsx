import Link from "next/link";
import PageShell from "@/components/PageShell";
import { FcGoogle } from "react-icons/fc";

export default function SignupPage() {
  return (
    <PageShell>
      <section className="px-5 py-12 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-5xl overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_22px_60px_rgba(0,0,0,0.08)] lg:grid-cols-[0.9fr_1.1fr]">
          <div className="bg-[#f10606] p-8 text-white">
            <h1 className="text-3xl font-black tracking-normal">Create your Ojaboy account</h1>
            <p className="mt-4 text-sm font-medium leading-7 text-white/82">Track prices, save markets, and get notified when the app launches.</p>
          </div>
          <form className="space-y-4 p-8">
            <button className="flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-black/10 bg-white text-sm font-black text-black shadow-sm transition hover:border-black/20 hover:bg-black/[0.02]" type="button">
              <FcGoogle className="text-xl" />
              Continue with Google
            </button>
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-black/10" />
              <span className="text-xs font-bold uppercase text-black/40">or</span>
              <span className="h-px flex-1 bg-black/10" />
            </div>
            <input className="h-12 w-full rounded-lg border border-black/10 px-4 text-sm outline-none" placeholder="Full name" />
            <input className="h-12 w-full rounded-lg border border-black/10 px-4 text-sm outline-none" placeholder="Email or phone" />
            <input className="h-12 w-full rounded-lg border border-black/10 px-4 text-sm outline-none" placeholder="Password" type="password" />
            <button className="h-12 w-full rounded-lg bg-[#f10606] text-sm font-black text-white" type="button">Sign Up</button>
            <p className="text-center text-sm font-medium text-black/55">
              Already have an account? <Link className="font-black text-[#f10606]" href="/login">Log in</Link>
            </p>
          </form>
        </div>
      </section>
    </PageShell>
  );
}
