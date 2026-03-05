import { useState, useEffect, useRef } from "react";
import type { ConvertStatus } from "../types";
import { startConvertHeic, fetchConvertStatus } from "../api";

interface ConvertModalProps {
  heicIds: string[];
  onDone: () => void;
  onCancel: () => void;
}

type Stage = "confirm" | "running" | "done";

export default function ConvertModal({
  heicIds,
  onDone,
  onCancel,
}: ConvertModalProps) {
  const [stage, setStage] = useState<Stage>("confirm");
  const [status, setStatus] = useState<ConvertStatus>({
    running: false,
    done: 0,
    total: 0,
    errors: [],
  });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => () => stopPolling(), []);

  const handleStart = async () => {
    setStage("running");
    try {
      await startConvertHeic(heicIds);
      pollRef.current = setInterval(async () => {
        try {
          const s = await fetchConvertStatus();
          setStatus(s);
          if (!s.running) {
            stopPolling();
            setStage("done");
          }
        } catch {
          /* keep polling */
        }
      }, 500);
    } catch (e) {
      console.error("Convert start failed:", e);
      setStage("confirm");
    }
  };

  const pct =
    status.total > 0 ? Math.round((status.done / status.total) * 100) : 0;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && stage !== "running") onCancel();
      }}
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center animate-fade-in"
    >
      <div className="bg-card rounded-xl p-6 max-w-md w-full mx-4 border border-white/10 animate-pop-in">
        {stage === "confirm" && (
          <>
            <h3 className="text-lg font-semibold text-white">
              Convert HEIC → JPG
            </h3>
            <p className="text-gray-400 mt-2 text-sm">
              Convert{" "}
              <span className="text-white font-medium">{heicIds.length}</span>{" "}
              HEIC {heicIds.length === 1 ? "file" : "files"} to JPG using macOS{" "}
              <code className="text-xs bg-white/5 px-1 py-0.5 rounded">
                sips
              </code>
              . The original HEIC files will be removed and JSON metadata will
              be updated.
            </p>
            <div className="flex gap-3 mt-5 justify-end">
              <button
                onClick={onCancel}
                className="px-4 py-2 rounded-lg text-sm bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStart}
                className="px-4 py-2 rounded-lg text-sm bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
              >
                Convert {heicIds.length}
              </button>
            </div>
          </>
        )}

        {stage === "running" && (
          <>
            <h3 className="text-lg font-semibold text-white">
              Converting...
            </h3>
            <p className="text-gray-400 mt-2 text-sm">
              {status.done} / {status.total} files converted
            </p>
            <div className="mt-3 h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2 text-right tabular-nums">
              {pct}%
            </p>
          </>
        )}

        {stage === "done" && (
          <>
            <h3 className="text-lg font-semibold text-white">
              Conversion Complete
            </h3>
            <p className="text-gray-400 mt-2 text-sm">
              Successfully converted{" "}
              <span className="text-white font-medium">
                {status.done - status.errors.length}
              </span>{" "}
              of {status.total} files.
            </p>
            {status.errors.length > 0 && (
              <div className="mt-3 max-h-32 overflow-y-auto">
                <p className="text-xs text-red-400 font-medium mb-1">
                  {status.errors.length} errors:
                </p>
                {status.errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-400/70 truncate">
                    {err}
                  </p>
                ))}
              </div>
            )}
            <div className="flex gap-3 mt-5 justify-end">
              <button
                onClick={onDone}
                className="px-4 py-2 rounded-lg text-sm bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
