"use client";

import { useEffect, useState } from "react";

type Panel = {
  kicker: string;
  title: string;
  body: string;
  image: string;
};

const DEFAULT_PANELS: Panel[] = [
  {
    kicker: "BUILT FOR THE STAGE",
    title: "Pressure is the medium",
    body: "Every round, every battle, every moment captured with intent. Designed for artists who live between rehearsal and spotlight.",
    image: "https://images.pexels.com/photos/5191631/pexels-photo-5191631.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1000&w=1600",
  },
  {
    kicker: "MOTION AS IDENTITY",
    title: "Form meets force",
    body: "Lines, rhythm and control tell the story before the result does. A platform that puts the artist first.",
    image: "https://images.pexels.com/photos/35197138/pexels-photo-35197138.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1000&w=1600",
  },
  {
    kicker: "SCENE, CONNECTED",
    title: "Events · judges · opportunities",
    body: "From underground cyphers to major battles. Discover, register, compete and get discovered — all in one place.",
    image: "https://images.pexels.com/photos/14470108/pexels-photo-14470108.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1000&w=1600",
  },
];

export function HomeScrollScene({ panels = DEFAULT_PANELS }: { panels?: Panel[] }) {
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
    const scene = document.querySelector<HTMLElement>("[data-scene]");
    if (!scene) return;
    const images = scene.querySelectorAll<HTMLElement>("[data-panel-image]");
    const panelEls = scene.querySelectorAll<HTMLElement>("[data-panel]");

    if (reduced) {
      images.forEach((el, i) => el.classList.toggle("active", i === 0));
      panelEls.forEach((el, i) => el.classList.toggle("active", i === 0));
      return;
    }

    let ticking = false;
    const update = () => {
      const rect = scene.getBoundingClientRect();
      const vh = window.innerHeight;
      const denom = Math.max(rect.height - vh, 1);
      const progress = Math.min(Math.max(-rect.top / denom, 0), 0.999);
      const index = Math.min(panels.length - 1, Math.floor(progress * panels.length));
      images.forEach((el, i) => el.classList.toggle("active", i === index));
      panelEls.forEach((el, i) => el.classList.toggle("active", i === index));
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        update();
        ticking = false;
      });
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [panels.length, reduced]);

  return (
    <section id="scene" className="scroll-scene" data-scene>
      <div className="scroll-scene-sticky">
        <div>
          {panels.map((p, i) => (
            <div key={i} className={`scene-image${i === 0 ? " active" : ""}`} data-panel-image>
              <img src={p.image} alt="" loading="lazy" />
              <div className="scene-grad" />
            </div>
          ))}
        </div>
        <div className="scene-copy">
          <div className="perspective-1200" style={{ width: "100%", maxWidth: "38rem", height: "220px", position: "relative" }}>
            <div>
              {panels.map((p, i) => (
                <article key={i} className={`scene-panel preserve-3d${i === 0 ? " active" : ""}`} data-panel>
                  <p className="hero-kicker">{p.kicker}</p>
                  <h2>{p.title}</h2>
                  <p className="body">{p.body}</p>
                  <div className="accent-rule" />
                </article>
              ))}
            </div>
          </div>
        </div>
        <div className="scanlines" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
      </div>
    </section>
  );
}
