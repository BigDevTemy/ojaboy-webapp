import PageShell from "@/components/PageShell";

const values = ["Transparent market prices", "Human market agents", "AI-assisted shopping decisions"];

export default function AboutUsPage() {
  return (
    <PageShell>
      <section className="px-5 py-14 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_0.8fr] lg:items-center">
          <div>
            <p className="mb-3 text-sm font-black uppercase text-[#f10606]">About Ojaboy</p>
            <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-normal text-black sm:text-5xl">
              We help shoppers know market prices before they buy.
            </h1>
            <p className="mt-6 max-w-2xl text-base font-medium leading-8 text-black/62">
              Ojaboy combines real market updates, trained agents, and AI market intelligence to help Nigerian shoppers compare prices, plan purchases, and shop with more confidence.
            </p>
          </div>
          <div className="rounded-2xl bg-[#fff5f5] p-6 shadow-[0_18px_45px_rgba(0,0,0,0.05)]">
            <h2 className="text-xl font-black text-black">What guides us</h2>
            <div className="mt-5 space-y-3">
              {values.map((value) => (
                <div className="rounded-xl bg-white px-4 py-3 text-sm font-bold text-black/70 shadow-sm" key={value}>
                  {value}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
