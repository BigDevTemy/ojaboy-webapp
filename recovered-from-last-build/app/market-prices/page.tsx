import PageShell from "@/components/PageShell";

const rows = [
  { item: "Rice", unit: "50kg", market: "Mile 12 Market", price: "N85,000", change: "- 2%" },
  { item: "Tomatoes", unit: "Basket", market: "Oyingbo Market", price: "N24,000", change: "+ 8%" },
  { item: "Pepper", unit: "Basket", market: "Daleko Market", price: "N18,000", change: "+ 15%" },
  { item: "Beans", unit: "Oloyin", market: "Mushin Market", price: "N76,000", change: "+ 3%" },
  { item: "Palm Oil", unit: "25L", market: "Agege Market", price: "N58,000", change: "- 1%" },
];

export default function MarketPricesPage() {
  return (
    <PageShell>
      <section className="px-5 py-12 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-3 text-sm font-black uppercase text-[#f10606]">Market Prices</p>
              <h1 className="text-4xl font-black tracking-normal text-black">Live commodity prices</h1>
              <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-black/62">
                This table is ready to be connected to the market-prices endpoint when the backend is available.
              </p>
            </div>
            <input className="h-12 rounded-lg border border-black/10 px-4 text-sm outline-none placeholder:text-black/35 lg:w-80" placeholder="Search item or market..." />
          </div>

          <div className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_18px_45px_rgba(0,0,0,0.05)]">
            <div className="grid grid-cols-[1.1fr_0.8fr_1fr_0.8fr_0.6fr] bg-[#fff5f5] px-5 py-4 text-xs font-black uppercase text-black/55">
              <span>Item</span>
              <span>Unit</span>
              <span>Market</span>
              <span>Price</span>
              <span>Change</span>
            </div>
            {rows.map((row) => (
              <div className="grid grid-cols-[1.1fr_0.8fr_1fr_0.8fr_0.6fr] border-t border-black/10 px-5 py-4 text-sm font-bold text-black/70" key={`${row.item}-${row.market}`}>
                <span className="text-black">{row.item}</span>
                <span>{row.unit}</span>
                <span>{row.market}</span>
                <span className="text-black">{row.price}</span>
                <span className={row.change.startsWith("-") ? "text-[#08a847]" : "text-[#f10606]"}>{row.change}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
