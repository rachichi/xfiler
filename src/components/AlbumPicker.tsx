import { useState } from "react";
import type { Album } from "../types";

interface AlbumPickerProps {
  albums: Album[];
  count: number;
  busy: boolean;
  onSelect: (album: Album) => void;
  onCancel: () => void;
}

export default function AlbumPicker({
  albums,
  count,
  busy,
  onSelect,
  onCancel,
}: AlbumPickerProps) {
  const [search, setSearch] = useState("");
  const [chosen, setChosen] = useState<Album | null>(null);

  const filtered = search
    ? albums.filter((a) =>
        a.name.toLowerCase().includes(search.toLowerCase())
      )
    : albums;

  const displayName = (name: string) => {
    const match = name.match(/^\d{8}_(.+)$/);
    return match ? match[1] : name;
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center animate-fade-in"
    >
      <div className="bg-card rounded-xl max-w-md w-full mx-4 border border-white/10 animate-pop-in flex flex-col max-h-[80vh]">
        <div className="p-5 pb-3">
          <h3 className="text-lg font-semibold text-white">Move to Album</h3>
          <p className="text-gray-400 mt-1 text-sm">
            Move{" "}
            <span className="text-white font-medium">{count}</span>{" "}
            {count === 1 ? "item" : "items"} to an existing album.
          </p>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search albums..."
            className="mt-3 w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10
              text-sm text-white placeholder-gray-500 outline-none
              focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-2 min-h-0">
          {filtered.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">
              No albums found
            </p>
          ) : (
            <div className="space-y-0.5">
              {filtered.map((album) => (
                <button
                  key={album.path}
                  onClick={() => setChosen(album)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    chosen?.path === album.path
                      ? "bg-blue-600/30 text-white border border-blue-500/40"
                      : "text-gray-300 hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <span className="font-medium">
                    {displayName(album.name)}
                  </span>
                  <span className="text-[10px] text-gray-500 ml-2">
                    {album.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 pt-3 border-t border-white/5 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 rounded-lg text-sm bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => chosen && onSelect(chosen)}
            disabled={!chosen || busy}
            className="px-4 py-2 rounded-lg text-sm bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors disabled:opacity-40"
          >
            {busy ? "Moving..." : `Move ${count} to Album`}
          </button>
        </div>
      </div>
    </div>
  );
}
