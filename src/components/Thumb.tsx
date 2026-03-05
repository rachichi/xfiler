import { useState } from "react";
import type { Photo } from "../types";
import { mediaUrl } from "../api";

interface ThumbProps {
  photo: Photo;
  selected: boolean;
  selectMode: boolean;
  onSelect: (id: string, shiftKey: boolean) => void;
  onView: (photo: Photo) => void;
}

function formatDate(ts: number): string {
  if (!ts) return "";
  const d = new Date(ts * 1000);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function Thumb({
  photo,
  selected,
  selectMode,
  onSelect,
  onView,
}: ThumbProps) {
  const [loaded, setLoaded] = useState(false);
  const src = mediaUrl(photo.filename);

  const handleClick = (e: React.MouseEvent) => {
    if (selectMode || e.shiftKey || e.metaKey) {
      onSelect(photo.id, e.shiftKey);
    } else {
      onView(photo);
    }
  };

  const handleCheckClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(photo.id, e.shiftKey);
  };

  return (
    <div
      onClick={handleClick}
      className={`
        relative group cursor-pointer rounded-lg overflow-hidden bg-card
        border-2 transition-all duration-200
        ${selected ? "border-blue-500 ring-2 ring-blue-500/30 scale-[0.97]" : "border-transparent hover:border-white/10"}
      `}
    >
      {photo.isVideo ? (
        <video
          src={src}
          muted
          preload="metadata"
          className="w-full h-24 object-cover bg-black"
          onLoadedData={() => setLoaded(true)}
        />
      ) : (
        <img
          src={src}
          loading="lazy"
          alt={photo.title}
          className={`w-full h-24 object-cover bg-black transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setLoaded(true)}
        />
      )}

      {!loaded && (
        <div className="absolute inset-0 bg-card animate-pulse" />
      )}

      {photo.isVideo && (
        <div className="absolute top-1 left-1 bg-black/70 backdrop-blur-sm text-[9px] px-1.5 py-0.5 rounded-full text-white font-medium">
          ▶ Video
        </div>
      )}

      <div
        onClick={handleCheckClick}
        className={`
          absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center
          text-[10px] font-bold transition-all duration-150
          ${
            selected
              ? "bg-blue-500 text-white scale-110"
              : "bg-black/40 backdrop-blur-sm text-white/50 opacity-0 group-hover:opacity-100"
          }
        `}
      >
        {selected && "✓"}
      </div>

      <div className="absolute bottom-0 inset-x-0 px-1.5 py-1 bg-gradient-to-t from-black/70 to-transparent">
        <div className="text-[9px] text-gray-400 truncate">
          {formatDate(photo.timestamp)}
        </div>
      </div>
    </div>
  );
}
