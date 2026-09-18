"use client";

import { useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";

type Platform = "youtube" | "vimeo" | "instagram" | "other";

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  title: string;
}

function getEmbedUrl(url: string, platform: Platform): string {
  if (platform === "youtube") {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
  }
  if (platform === "vimeo") {
    const match = url.match(/vimeo\.com\/(\d+)/);
    if (match) return `https://player.vimeo.com/video/${match[1]}`;
  }
  if (platform === "instagram") {
    return url.replace(/\/?\?.*$/, "/embed/");
  }
  return url;
}

function detectPlatform(url: string): Platform {
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  if (url.includes("vimeo.com")) return "vimeo";
  if (url.includes("instagram.com")) return "instagram";
  return "other";
}

export function VideoModal({ isOpen, onClose, videoUrl, title }: VideoModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const detectedPlatform = useMemo(() => detectPlatform(videoUrl), [videoUrl]);
  const embedUrl = useMemo(() => getEmbedUrl(videoUrl, detectedPlatform), [videoUrl, detectedPlatform]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="video-modal-title"
    >
      <div
        ref={contentRef}
        className="relative w-full max-w-4xl mx-md aspect-video bg-paper rounded-xl overflow-hidden shadow-card-hover animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-2 bg-paper/80 backdrop-blur rounded-full text-ink hover:bg-paper transition-colors"
          aria-label="Close video"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {detectedPlatform === "other" ? (
          <video src={videoUrl} controls className="w-full h-full" autoPlay playsInline />
        ) : (
          <iframe
            src={embedUrl}
            title={title}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )}

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <h3 id="video-modal-title" className="font-display text-title-md uppercase text-ink">
            {title}
          </h3>
          <p className="mt-xs font-mono text-[0.65rem] uppercase tracking-[0.1em] text-ink-muted">
            {detectedPlatform.charAt(0).toUpperCase() + detectedPlatform.slice(1)}
          </p>
        </div>
      </div>
    </div>
  );

  if (typeof window === "undefined") return null;
  return createPortal(modalContent, document.body);
}