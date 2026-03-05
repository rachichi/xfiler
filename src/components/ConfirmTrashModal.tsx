interface ConfirmTrashModalProps {
  count: number;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmTrashModal({
  count,
  busy,
  onConfirm,
  onCancel,
}: ConfirmTrashModalProps) {
  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center animate-fade-in"
    >
      <div className="bg-card rounded-xl p-6 max-w-sm w-full mx-4 border border-white/10 animate-pop-in">
        <h3 className="text-lg font-semibold text-white">Move to Trash</h3>
        <p className="text-gray-400 mt-2 text-sm">
          Move{" "}
          <span className="text-white font-medium">{count}</span>{" "}
          {count === 1 ? "item" : "items"} to the recycling bin? You can restore
          them from the Trash on your Mac.
        </p>
        <div className="flex gap-3 mt-5 justify-end">
          <button
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 rounded-lg text-sm bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="px-4 py-2 rounded-lg text-sm bg-red-600 hover:bg-red-500 text-white font-medium transition-colors disabled:opacity-50"
          >
            {busy ? "Moving..." : `Trash ${count}`}
          </button>
        </div>
      </div>
    </div>
  );
}
