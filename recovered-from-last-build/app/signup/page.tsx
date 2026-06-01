import Link from "next/link";
import PageShell from "@/components/PageShell";

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
