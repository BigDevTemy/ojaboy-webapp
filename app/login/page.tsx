import Link from "next/link";
import PageShell from "@/components/PageShell";
import { FcGoogle } from "react-icons/fc";

export default function LoginPage() {
  return (
    <PageShell>
      <section className="px-5 py-12 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-md rounded-2xl border border-black/10 bg-white p-8 shadow-[0_22px_60px_rgba(0,0,0,0.08)]">
          <p className="mb-3 text-sm font-black uppercase text-[#f10606]">Welcome back</p>
          <h1 className="text-3xl font-black tracking-normal text-black">Log in to Ojaboy</h1>
          <div className="mt-7 space-y-4">
            <button className="flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-black/10 bg-white text-sm font-black text-black shadow-sm transition hover:border-black/20 hover:bg-black/[0.02]" type="button">
              <FcGoogle className="text-xl" />
              Continue with Google
            </button>
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-black/10" />
              <span className="text-xs font-bold uppercase text-black/40">or</span>
              <span className="h-px flex-1 bg-black/10" />
            </div>
          </div>
          <form className="mt-4 space-y-4">
            <input className="h-12 w-full rounded-lg border border-black/10 px-4 text-sm outline-none" placeholder="Email or phone" />
            <input className="h-12 w-full rounded-lg border border-black/10 px-4 text-sm outline-none" placeholder="Password" type="password" />
            <button className="h-12 w-full rounded-lg bg-[#f10606] text-sm font-black text-white" type="button">Log In</button>
          </form>
          <div className="mt-5 flex items-center justify-between text-sm font-medium">
            <a className="text-black/55 hover:text-[#f10606]" href="#">Forgot password?</a>
            <Link className="font-black text-[#f10606]" href="/signup">Create account</Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
