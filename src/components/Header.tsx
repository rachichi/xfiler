interface HeaderProps {
  year: string;
  total: number;
  heicCount: number;
  selectMode: boolean;
  selectedCount: number;
  onEnterSelect: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onTrash: () => void;
  onMoveToAlbum: () => void;
  onConvertHeic: () => void;
  busy: boolean;
}

export default function Header({
  year,
  total,
  heicCount,
  selectMode,
  selectedCount,
  onEnterSelect,
  onSelectAll,
  onClearSelection,
  onTrash,
  onMoveToAlbum,
  onConvertHeic,
  busy,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-[1800px] mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="shrink-0">
          <h1 className="text-base font-semibold text-white tracking-tight">
            Unfiled Photos{year ? ` from ${year}` : ""}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {total} items not in any album
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {heicCount > 0 && (
            <button
              onClick={onConvertHeic}
              disabled={busy}
              className="px-3 py-1.5 rounded-lg text-xs bg-emerald-600/80 hover:bg-emerald-500 text-white font-medium transition-colors disabled:opacity-50"
            >
              Convert HEIC → JPG ({heicCount})
            </button>
          )}

          {!selectMode ? (
            <button
              onClick={onEnterSelect}
              className="px-3 py-1.5 rounded-lg text-xs bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
            >
              Select
            </button>
          ) : (
            <>
              <span className="text-xs text-blue-400 tabular-nums whitespace-nowrap">
                {selectedCount} selected
              </span>

              <button
                onClick={onSelectAll}
                className="px-3 py-1.5 rounded-lg text-xs bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
              >
                All
              </button>

              <button
                onClick={onClearSelection}
                className="px-3 py-1.5 rounded-lg text-xs bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
              >
                None
              </button>

              {selectedCount > 0 && (
                <>
                  <button
                    onClick={onMoveToAlbum}
                    disabled={busy}
                    className="px-3 py-1.5 rounded-lg text-xs bg-blue-600/80 hover:bg-blue-500 text-white font-medium transition-colors disabled:opacity-50"
                  >
                    Move to Album
                  </button>

                  <button
                    onClick={onTrash}
                    disabled={busy}
                    className="px-3 py-1.5 rounded-lg text-xs bg-red-600/80 hover:bg-red-500 text-white font-medium transition-colors disabled:opacity-50"
                  >
                    Trash ({selectedCount})
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {selectMode && (
        <div className="max-w-[1800px] mx-auto px-4 pb-2">
          <p className="text-[10px] text-gray-600">
            Click to select · Shift+click to select a range · Cmd+click to add
          </p>
        </div>
      )}
    </header>
  );
}
