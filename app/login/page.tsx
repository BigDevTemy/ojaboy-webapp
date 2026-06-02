import Link from "next/link";
import PageShell from "@/components/PageShell";
import { GoogleSsoButton } from "@/components/GoogleSsoButton";
import { LoginForm } from "@/components/LoginForm";
import { LoginSessionRedirect } from "@/components/LoginSessionRedirect";

export default function LoginPage() {
  return (
    <PageShell>
      <LoginSessionRedirect />
      <section className="px-5 py-12 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-md rounded-2xl border border-black/10 bg-white p-8 shadow-[0_22px_60px_rgba(0,0,0,0.08)]">
          <p className="mb-3 text-sm font-black uppercase text-[#f10606]">Welcome back</p>
          <h1 className="text-3xl font-black tracking-normal text-black">Log in to Ojaboy</h1>
          <div className="mt-7 space-y-4">
            <GoogleSsoButton />
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-black/10" />
              <span className="text-xs font-bold uppercase text-black/40">or</span>
              <span className="h-px flex-1 bg-black/10" />
            </div>
          </div>
          <LoginForm />
          <div className="mt-5 flex items-center justify-between text-sm font-medium">
            <a className="text-black/55 hover:text-[#f10606]" href="#">Forgot password?</a>
            <Link className="font-black text-[#f10606]" href="/signup">Create account</Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
