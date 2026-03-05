import { useEffect, useCallback } from "react";
import type { Photo } from "../types";
import { mediaUrl } from "../api";

interface LightboxProps {
  photo: Photo;
  photos: Photo[];
  onClose: () => void;
  onNavigate: (photo: Photo) => void;
}

function formatDate(ts: number): string {
  if (!ts) return "";
  const d = new Date(ts * 1000);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function Lightbox({
  photo,
  photos,
  onClose,
  onNavigate,
}: LightboxProps) {
  const idx = photos.findIndex((p) => p.id === photo.id);
  const src = mediaUrl(photo.filename);
  const hasPrev = idx > 0;
  const hasNext = idx < photos.length - 1;

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) onNavigate(photos[idx - 1]);
      if (e.key === "ArrowRight" && hasNext) onNavigate(photos[idx + 1]);
    },
    [idx, photos, hasPrev, hasNext, onClose, onNavigate]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [handleKey]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center animate-fade-in"
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full
          bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white
          flex items-center justify-center text-xl transition-colors"
      >
        ×
      </button>

      {/* Prev */}
      {hasPrev && (
        <button
          onClick={() => onNavigate(photos[idx - 1])}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-10
            w-10 h-10 rounded-full bg-white/5 hover:bg-white/15
            text-gray-400 hover:text-white text-2xl
            flex items-center justify-center transition-colors"
        >
          ‹
        </button>
      )}

      {/* Next */}
      {hasNext && (
        <button
          onClick={() => onNavigate(photos[idx + 1])}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-10
            w-10 h-10 rounded-full bg-white/5 hover:bg-white/15
            text-gray-400 hover:text-white text-2xl
            flex items-center justify-center transition-colors"
        >
          ›
        </button>
      )}

      {/* Content */}
      <div className="flex flex-col items-center max-w-[90vw] max-h-[90vh] animate-pop-in">
        {photo.isVideo ? (
          <video
            key={photo.id}
            src={src}
            controls
            autoPlay
            className="max-w-full max-h-[82vh] rounded-lg"
          />
        ) : (
          <img
            key={photo.id}
            src={src}
            alt={photo.title}
            className="max-w-full max-h-[82vh] rounded-lg object-contain"
          />
        )}
        <div className="mt-3 text-center">
          <p className="text-sm text-gray-300">{photo.title}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {formatDate(photo.timestamp)}
          </p>
          <p className="text-xs text-gray-600 mt-0.5 tabular-nums">
            {idx + 1} / {photos.length}
          </p>
        </div>
      </div>
    </div>
  );
}
