import PageShell from "@/components/PageShell";

const faqs = [
  ["How does Ojaboy get prices?", "We combine market-agent updates, historical records, and AI-assisted checks."],
  ["Can I order through Ojaboy?", "Yes. The shopping flow is planned around price checks, ordering, agent shopping, and delivery."],
  ["Which markets are covered?", "Mile 12, Oyingbo, Daleko, Mushin, Agege, and more as coverage expands."],
  ["Will prices update from an API?", "Yes. The current UI is static and prepared for endpoint integration."],
];

export default function FAQPage() {
  return (
    <PageShell>
      <section className="px-5 py-12 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-4xl">
          <p className="mb-3 text-sm font-black uppercase text-[#f10606]">FAQ</p>
          <h1 className="text-4xl font-black tracking-normal text-black">Frequently asked questions</h1>
          <div className="mt-8 space-y-4">
            {faqs.map(([question, answer]) => (
              <details className="rounded-xl border border-black/10 bg-white p-5 shadow-[0_14px_35px_rgba(0,0,0,0.04)]" key={question}>
                <summary className="cursor-pointer text-base font-black text-black">{question}</summary>
                <p className="mt-3 text-sm font-medium leading-7 text-black/62">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
