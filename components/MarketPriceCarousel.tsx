"use client";

import Image from "next/image";
import { useRef, useState } from "react";

export type ProductPrice = {
  name: string;
  unit: string;
  price: string;
  change: string;
  direction: string;
  initials: string;
  tone: string;
  accent: string;
  imageSrc: string;
};

function ProductMark({ item }: { item: ProductPrice }) {
  const [hasImageError, setHasImageError] = useState(false);

  return (
    <div className="relative mx-auto mb-3 flex h-28 w-28 items-center justify-center rounded-full bg-white shadow-[0_14px_35px_rgba(0,0,0,0.08)]">
      <span className="absolute inset-2 rounded-full opacity-15" style={{ backgroundColor: item.accent }} />
      {hasImageError ? (
        <span
          className="relative flex h-[72px] w-[72px] items-center justify-center rounded-full text-lg font-black text-white shadow-lg"
          style={{ backgroundColor: item.accent }}
        >
          {item.initials}
        </span>
      ) : (
        <Image
          src={item.imageSrc}
          alt={`${item.name} product`}
          width={128}
          height={128}
          className="relative h-24 w-24 object-contain"
          onError={() => setHasImageError(true)}
        />
      )}
    </div>
  );
}

function TrendBadge({ direction, change }: { direction: string; change: string }) {
  const isDown = direction === "down";

  return (
    <span className={`inline-flex items-center gap-1 text-sm font-black ${isDown ? "text-[#08a847]" : "text-[#f10606]"}`}>
      {isDown ? "-" : "+"} {change}
    </span>
  );
}

function MarketPriceCard({ item }: { item: ProductPrice }) {
  return (
    <article className={`w-[178px] shrink-0 rounded-xl border border-black/10 bg-gradient-to-b ${item.tone} px-4 py-4 text-center shadow-[0_14px_34px_rgba(0,0,0,0.04)] transition hover:-translate-y-1 hover:shadow-[0_18px_44px_rgba(0,0,0,0.08)] sm:w-[196px]`}>
      <ProductMark item={item} />
      <p className="text-xs font-semibold text-black/78">
        {item.name} ({item.unit})
      </p>
      <p className="mt-1.5 text-2xl font-black tracking-normal text-black">{item.price}</p>
      <div className="mt-1">
        <TrendBadge direction={item.direction} change={item.change} />
      </div>
      <p className="mt-0.5 text-[11px] font-semibold text-black/45">Avg. Price</p>
    </article>
  );
}

export default function MarketPriceCarousel({ items }: { items: ProductPrice[] }) {
  const trackRef = useRef<HTMLDivElement>(null);

  function scrollByCard(direction: "left" | "right") {
    trackRef.current?.scrollBy({
      left: direction === "left" ? -460 : 460,
      behavior: "smooth",
    });
  }

  return (
    <div className="relative">
      <div className="mb-4 flex justify-end gap-2">
        <button
          className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-xl font-black text-black shadow-sm transition hover:border-[#f10606] hover:text-[#f10606]"
          type="button"
          aria-label="Scroll market prices left"
          onClick={() => scrollByCard("left")}
        >
          {"<"}
        </button>
        <button
          className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-xl font-black text-black shadow-sm transition hover:border-[#f10606] hover:text-[#f10606]"
          type="button"
          aria-label="Scroll market prices right"
          onClick={() => scrollByCard("right")}
        >
          {">"}
        </button>
      </div>
      <div ref={trackRef} className="scrollbar-hide flex gap-4 overflow-x-auto scroll-smooth pb-2">
        {items.map((item) => (
          <MarketPriceCard item={item} key={item.name} />
        ))}
      </div>
    </div>
  );
}
