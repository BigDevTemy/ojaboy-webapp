import PageShell from "@/components/PageShell";

const posts = [
  { title: "How to compare market prices before bulk buying", tag: "Shopping Tips" },
  { title: "Why tomato prices rise during some market weeks", tag: "Market Trends" },
  { title: "A simple guide to buying rice by bag size", tag: "Guides" },
];

export default function BlogPage() {
  return (
    <PageShell>
      <section className="px-5 py-12 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <p className="mb-3 text-sm font-black uppercase text-[#f10606]">Blog</p>
          <h1 className="text-4xl font-black tracking-normal text-black">Market insights and shopping guides</h1>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {posts.map((post) => (
              <article className="rounded-xl border border-black/10 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.05)]" key={post.title}>
                <p className="mb-4 text-xs font-black uppercase text-[#f10606]">{post.tag}</p>
                <h2 className="text-xl font-black leading-snug text-black">{post.title}</h2>
                <p className="mt-4 text-sm font-medium leading-7 text-black/60">Read practical advice for planning better market purchases with data.</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
