"use client";

export function HomeLightbox() {
  const close = () => {
    const lb = document.getElementById("home-lightbox");
    if (!lb) return;
    lb.classList.remove("open");
    document.body.style.overflow = "";
  };

  return (
    <div className="lightbox" id="home-lightbox" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <button className="lightbox-close" aria-label="Close" onClick={close}>
        ×
      </button>
      <img src="" alt="Expanded view" id="home-lightbox-img" />
    </div>
  );
}
