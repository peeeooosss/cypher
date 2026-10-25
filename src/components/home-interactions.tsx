"use client";

import { useEffect, useState } from "react";

type SectionId = "hero" | "social" | "built" | "demo" | "artists" | "events" | "gallery" | "testimonials" | "ctas";

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "hero", label: "Hero" },
  { id: "social", label: "Stats" },
  { id: "built", label: "Built for" },
  { id: "demo", label: "Demo" },
  { id: "artists", label: "Artists" },
  { id: "events", label: "Events" },
  { id: "gallery", label: "Gallery" },
  { id: "testimonials", label: "Testimonials" },
  { id: "ctas", label: "CTAs" },
];

export function HomeInteractions() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const progress = document.getElementById("home-scroll-progress");
    const dotsWrap = document.getElementById("home-section-dots");
    const heroLayer = document.getElementById("hero-layer");

    // Build dots
    if (dotsWrap && dotsWrap.childElementCount === 0) {
      SECTIONS.forEach((s) => {
        const btn = document.createElement("button");
        btn.setAttribute("aria-label", s.label);
        btn.addEventListener("click", () => {
          const el = document.getElementById(s.id);
          if (!el) return;
          el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
        });
        dotsWrap.appendChild(btn);
      });
    }

    const dotBtns = dotsWrap ? Array.from(dotsWrap.querySelectorAll("button")) : [];

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const delay = parseInt((entry.target as HTMLElement).dataset.delay || "0", 10);
          if (reduced) {
            entry.target.classList.add("in-view");
          } else {
            setTimeout(() => entry.target.classList.add("in-view"), delay);
          }
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" },
    );

    document.querySelectorAll(".reveal, .reveal-stagger").forEach((el) => {
      if (reduced) {
        el.classList.add("in-view");
      } else {
        io.observe(el);
      }
    });

    let ticking = false;
    const onScroll = () => {
      const y = window.scrollY;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      if (progress) {
        progress.style.width = max > 0 ? (y / max) * 100 + "%" : "0%";
      }

      if (!reduced && heroLayer) {
        heroLayer.style.setProperty("--py", `${y * 0.12}px`);
        heroLayer.style.setProperty("--hero-rotate", `${Math.min(y * 0.01, 6)}deg`);
      }

      let current = 0;
      SECTIONS.forEach((s, idx) => {
        const el = document.getElementById(s.id);
        if (!el) return;
        const rect = el.getBoundingClientRect();
        if (rect.top <= window.innerHeight * 0.38) current = idx;
      });
      dotBtns.forEach((b, idx) => {
        b.classList.toggle("active", idx === current);
      });
    };

    const onScrollRAF = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        onScroll();
        ticking = false;
      });
    };

    onScroll();
    window.addEventListener("scroll", onScrollRAF, { passive: true });
    window.addEventListener("resize", onScrollRAF, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScrollRAF);
      window.removeEventListener("resize", onScrollRAF);
      io.disconnect();
    };
  }, [reduced]);

  return (
    <>
      <div className="scroll-progress" id="home-scroll-progress" />
      <div className="section-dots" id="home-section-dots" />
    </>
  );
}
