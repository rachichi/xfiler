import { useMemo } from "react";
import type { Photo } from "../types";
import Thumb from "./Thumb";

interface GalleryProps {
  photos: Photo[];
  selected: Set<string>;
  selectMode: boolean;
  onSelect: (id: string, shiftKey: boolean) => void;
  onView: (photo: Photo) => void;
}

interface MonthGroup {
  key: string;
  label: string;
  items: Photo[];
}

function groupByMonth(photos: Photo[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  let current: MonthGroup | null = null;

  for (const p of photos) {
    const d = p.timestamp ? new Date(p.timestamp * 1000) : null;
    const key = d ? `${d.getFullYear()}-${d.getMonth()}` : "unknown";
    const label = d
      ? d.toLocaleDateString("en-US", { month: "long", year: "numeric" })
      : "Unknown Date";

    if (!current || current.key !== key) {
      current = { key, label, items: [] };
      groups.push(current);
    }
    current.items.push(p);
  }
  return groups;
}

export default function Gallery({
  photos,
  selected,
  selectMode,
  onSelect,
  onView,
}: GalleryProps) {
  const groups = useMemo(() => groupByMonth(photos), [photos]);

  if (photos.length === 0) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-gray-500 text-sm">
          All photos are filed in albums — nothing to show!
        </p>
      </div>
    );
  }

  return (
    <main className="max-w-[1800px] mx-auto px-3 pb-8">
      {groups.map((group) => (
        <section key={group.key} className="mt-5">
          <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 px-0.5 animate-slide-up">
            {group.label}
          </h2>
          <div
            className="grid gap-1"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
            }}
          >
            {group.items.map((photo) => (
              <Thumb
                key={photo.id}
                photo={photo}
                selected={selected.has(photo.id)}
                selectMode={selectMode}
                onSelect={onSelect}
                onView={onView}
              />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
