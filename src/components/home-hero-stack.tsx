"use client";

import { useEffect, useRef, useState } from "react";

type Slide = {
  id: string;
  url: string;
  thumbnailUrl?: string | null;
};

const FALLBACK = [
  "https://images.pexels.com/photos/7972034/pexels-photo-7972034.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=700",
  "https://images.pexels.com/photos/40088582/pexels-photo-40088582.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=700",
  "https://images.pexels.com/photos/3022420/pexels-photo-3022420.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=700",
  "https://images.pexels.com/photos/37747673/pexels-photo-37747673.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=700",
  "https://images.pexels.com/photos/5191631/pexels-photo-5191631.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=700",
  "https://images.pexels.com/photos/35197138/pexels-photo-35197138.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=700",
];

export function HomeHeroStack({ slides = [] }: { slides?: Slide[] }) {
  const [items, setItems] = useState<string[]>(FALLBACK);
  const stackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const imgs = slides
      .map((s) => s.url || s.thumbnailUrl)
      .filter((x): x is string => Boolean(x));
    if (imgs.length > 0) {
      const merged = [...imgs, ...FALLBACK];
      const unique = Array.from(new Set(merged));
      setItems(unique.slice(0, 6));
    } else {
      setItems(FALLBACK);
    }
  }, [slides]);

  useEffect(() => {
    const open = (src: string) => {
      const lb = document.getElementById("home-lightbox");
      const img = document.getElementById("home-lightbox-img") as HTMLImageElement | null;
      if (!lb || !img) return;
      img.src = src;
      lb.classList.add("open");
      document.body.style.overflow = "hidden";
    };
    const stack = stackRef.current;
    if (!stack) return;
    stack.querySelectorAll<HTMLDivElement>("[data-stack-card]").forEach((card) => {
      card.addEventListener("click", () => {
        const img = card.querySelector("img");
        if (img?.src) open(img.src);
      });
    });
    return () => {
      stack.querySelectorAll<HTMLDivElement>("[data-stack-card]").forEach((card) => {
        card.replaceWith(card.cloneNode(true));
      });
    };
  }, [items]);

  const count = items.length;
  return (
    <div className="image-stack perspective-1200" ref={stackRef} style={{ height: "420px" }}>
      {items.map((src, i) => {
        const rotate = (i - (count - 1) / 2) * 6;
        const tx = (i - (count - 1) / 2) * 14;
        const ty = i * -10;
        const tz = (count - 1 - i) * -40;
        return (
          <div
            key={src + i}
            data-stack-card
            className="stack-card tilt-hover gpu backface-hidden"
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              height: "72%",
              width: "70%",
              overflow: "hidden",
              border: "1px solid var(--line)",
              boxShadow: "var(--shadow-raised)",
              background: "#111",
              transform: `translate3d(calc(-50% + ${tx}px), calc(-50% + ${ty}px), ${tz}px) rotateZ(${rotate}deg)`,
              zIndex: String(count - i),
              cursor: "pointer",
            }}
          >
            <img src={src} alt="CYPHR artist showcase" loading={i === 0 ? "eager" : "lazy"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(10,10,10,0.55), transparent 50%)" }} />
          </div>
        );
      })}
    </div>
  );
}
