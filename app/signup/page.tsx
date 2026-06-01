import Link from "next/link";
import Image from "next/image";
import PageShell from "@/components/PageShell";
import { FcGoogle } from "react-icons/fc";
import {
  Bell,
  CheckCircle2,
  LockKeyhole,
  MapPin,
  TrendingDown,
} from "lucide-react";

const benefits = [
  "Track daily market prices before you buy",
  "Get alerts when saved items drop",
  "Build smart baskets from real market data",
];

export default function SignupPage() {
  return (
    <PageShell>
      <section className="px-5 py-10 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-6xl overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_22px_60px_rgba(0,0,0,0.08)] lg:grid-cols-[0.92fr_1.08fr]">
          <div className="relative overflow-hidden bg-[#f10606] p-8 text-white sm:p-10">
            <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-white/12" />
            <div className="absolute -bottom-28 left-10 h-72 w-72 rounded-full bg-black/10" />

            <div className="relative">
              <Link className="mb-10 block h-12 w-[170px]" href="/" aria-label="Ojaboy home">
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

              <p className="mb-3 text-xs font-black uppercase tracking-normal text-white/72">Market Intelligence Account</p>
              <h1 className="max-w-md text-4xl font-black tracking-normal">Create your Ojaboy account</h1>
              <p className="mt-4 max-w-md text-sm font-medium leading-7 text-white/82">
                Save market lists, compare prices, create smart orders, and know when to buy before prices move.
              </p>

              <div className="mt-8 space-y-4">
                {benefits.map((benefit) => (
                  <div className="flex items-center gap-3 text-sm font-bold text-white/90" key={benefit}>
                    <CheckCircle2 size={18} />
                    {benefit}
                  </div>
                ))}
              </div>

              <div className="mt-10 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-white/12 p-4">
                  <TrendingDown size={20} />
                  <p className="mt-3 text-lg font-black">12</p>
                  <p className="text-xs font-medium text-white/72">Price drops today</p>
                </div>
                <div className="rounded-xl bg-white/12 p-4">
                  <MapPin size={20} />
                  <p className="mt-3 text-lg font-black">24</p>
                  <p className="text-xs font-medium text-white/72">Markets tracked</p>
                </div>
                <div className="rounded-xl bg-white/12 p-4">
                  <Bell size={20} />
                  <p className="mt-3 text-lg font-black">Real-time</p>
                  <p className="text-xs font-medium text-white/72">Price alerts</p>
                </div>
              </div>
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
              <label className="block">
                <span className="text-xs font-black uppercase text-black/45">Full Name</span>
                <input className="mt-2 h-12 w-full rounded-lg border border-black/10 px-4 text-sm font-bold text-black outline-none placeholder:text-black/35 focus:border-[#f10606]/40" placeholder="Temiloluwa Ade" />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase text-black/45">Phone Number</span>
                <input className="mt-2 h-12 w-full rounded-lg border border-black/10 px-4 text-sm font-bold text-black outline-none placeholder:text-black/35 focus:border-[#f10606]/40" placeholder="+234 801 234 5678" />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs font-black uppercase text-black/45">Email Address</span>
                <input className="mt-2 h-12 w-full rounded-lg border border-black/10 px-4 text-sm font-bold text-black outline-none placeholder:text-black/35 focus:border-[#f10606]/40" placeholder="you@example.com" type="email" />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase text-black/45">Primary Location</span>
                <select className="mt-2 h-12 w-full rounded-lg border border-black/10 bg-white px-4 text-sm font-bold text-black outline-none focus:border-[#f10606]/40" defaultValue="">
                  <option value="" disabled>Choose location</option>
                  <option>Lagos Island</option>
                  <option>Lekki</option>
                  <option>Ikeja</option>
                  <option>Yaba</option>
                  <option>Surulere</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase text-black/45">Primary Use</span>
                <select className="mt-2 h-12 w-full rounded-lg border border-black/10 bg-white px-4 text-sm font-bold text-black outline-none focus:border-[#f10606]/40" defaultValue="">
                  <option value="" disabled>Choose use case</option>
                  <option>Home shopping</option>
                  <option>Restaurant buying</option>
                  <option>Retail/resale</option>
                  <option>Market research</option>
                </select>
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
