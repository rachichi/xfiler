import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { Photo, Album } from "./types";
import {
  fetchInfo,
  fetchPhotos,
  fetchAlbums,
  trashPhotos,
  movePhotos,
} from "./api";
import Header from "./components/Header";
import Gallery from "./components/Gallery";
import Lightbox from "./components/Lightbox";
import ConfirmTrashModal from "./components/ConfirmTrashModal";
import AlbumPicker from "./components/AlbumPicker";
import ConvertModal from "./components/ConvertModal";

export default function App() {
  const [year, setYear] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);
  const [showTrashConfirm, setShowTrashConfirm] = useState(false);
  const [showAlbumPicker, setShowAlbumPicker] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const [busy, setBusy] = useState(false);

  const lastClickedId = useRef<string | null>(null);

  useEffect(() => {
    Promise.all([fetchInfo(), fetchPhotos(), fetchAlbums()])
      .then(([info, data, albumList]) => {
        setYear(info.year);
        setPhotos(data);
        setAlbums(albumList);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const heicIds = useMemo(
    () =>
      photos
        .filter((p) => p.filename.toLowerCase().endsWith(".heic"))
        .map((p) => p.id),
    [photos]
  );

  const handleSelect = useCallback(
    (id: string, shiftKey: boolean) => {
      setSelected((prev) => {
        const next = new Set(prev);

        if (shiftKey && lastClickedId.current) {
          const ids = photos.map((p) => p.id);
          const lastIdx = ids.indexOf(lastClickedId.current);
          const curIdx = ids.indexOf(id);
          if (lastIdx !== -1 && curIdx !== -1) {
            const start = Math.min(lastIdx, curIdx);
            const end = Math.max(lastIdx, curIdx);
            for (let i = start; i <= end; i++) {
              next.add(ids[i]);
            }
            return next;
          }
        }

        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      lastClickedId.current = id;
      setSelectMode(true);
    },
    [photos]
  );

  const selectAll = useCallback(() => {
    setSelected(new Set(photos.map((p) => p.id)));
  }, [photos]);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
    setSelectMode(false);
    lastClickedId.current = null;
  }, []);

  const removeFromList = useCallback((filenames: string[]) => {
    const removed = new Set(filenames);
    setPhotos((prev) => prev.filter((p) => !removed.has(p.filename)));
    setSelected(new Set());
    setSelectMode(false);
    lastClickedId.current = null;
  }, []);

  const handleTrash = useCallback(async () => {
    setBusy(true);
    try {
      const ids = Array.from(selected);
      const data = await trashPhotos(ids);
      if (data.trashed.length > 0) {
        removeFromList(data.trashed);
      }
      if (data.errors.length > 0) {
        console.error("Trash errors:", data.errors);
      }
    } catch (e) {
      console.error("Trash failed:", e);
    }
    setBusy(false);
    setShowTrashConfirm(false);
  }, [selected, removeFromList]);

  const handleMove = useCallback(
    async (album: Album) => {
      setBusy(true);
      try {
        const ids = Array.from(selected);
        const data = await movePhotos(ids, album.path);
        if (data.moved.length > 0) {
          removeFromList(data.moved);
        }
        if (data.errors.length > 0) {
          console.error("Move errors:", data.errors);
        }
      } catch (e) {
        console.error("Move failed:", e);
      }
      setBusy(false);
      setShowAlbumPicker(false);
    },
    [selected, removeFromList]
  );

  const handleConvertDone = useCallback(async () => {
    setShowConvert(false);
    const newPhotos = await fetchPhotos();
    setPhotos(newPhotos);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500 text-lg animate-pulse">
          Loading photos...
        </div>
      </div>
    );
  }

  return (
    <>
      <Header
        year={year}
        total={photos.length}
        heicCount={heicIds.length}
        selectMode={selectMode}
        selectedCount={selected.size}
        onEnterSelect={() => setSelectMode(true)}
        onSelectAll={selectAll}
        onClearSelection={clearSelection}
        onTrash={() => setShowTrashConfirm(true)}
        onMoveToAlbum={() => setShowAlbumPicker(true)}
        onConvertHeic={() => setShowConvert(true)}
        busy={busy}
      />

      <Gallery
        photos={photos}
        selected={selected}
        selectMode={selectMode}
        onSelect={handleSelect}
        onView={setLightboxPhoto}
      />

      {lightboxPhoto && (
        <Lightbox
          photo={lightboxPhoto}
          photos={photos}
          onClose={() => setLightboxPhoto(null)}
          onNavigate={setLightboxPhoto}
        />
      )}

      {showTrashConfirm && (
        <ConfirmTrashModal
          count={selected.size}
          busy={busy}
          onConfirm={handleTrash}
          onCancel={() => setShowTrashConfirm(false)}
        />
      )}

      {showAlbumPicker && (
        <AlbumPicker
          albums={albums}
          count={selected.size}
          busy={busy}
          onSelect={handleMove}
          onCancel={() => setShowAlbumPicker(false)}
        />
      )}

      {showConvert && (
        <ConvertModal
          heicIds={heicIds}
          onDone={handleConvertDone}
          onCancel={() => setShowConvert(false)}
        />
      )}
    </>
  );
}
