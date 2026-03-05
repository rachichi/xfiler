import type { Photo, AppInfo, Album, TrashResponse, MoveResponse, ConvertStatus } from "./types";

export async function fetchInfo(): Promise<AppInfo> {
  const res = await fetch("/api/info");
  if (!res.ok) throw new Error(`Failed to fetch info: ${res.status}`);
  return res.json();
}

export async function fetchPhotos(): Promise<Photo[]> {
  const res = await fetch("/api/photos");
  if (!res.ok) throw new Error(`Failed to fetch photos: ${res.status}`);
  return res.json();
}

export async function fetchAlbums(): Promise<Album[]> {
  const res = await fetch("/api/albums");
  if (!res.ok) throw new Error(`Failed to fetch albums: ${res.status}`);
  return res.json();
}

export async function trashPhotos(ids: string[]): Promise<TrashResponse> {
  const res = await fetch("/api/trash", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error(`Failed to trash: ${res.status}`);
  return res.json();
}

export async function movePhotos(ids: string[], album: string): Promise<MoveResponse> {
  const res = await fetch("/api/move", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids, album }),
  });
  if (!res.ok) throw new Error(`Failed to move: ${res.status}`);
  return res.json();
}

export async function startConvertHeic(ids: string[]): Promise<{ started: boolean; count: number }> {
  const res = await fetch("/api/convert-heic", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error(`Failed to start conversion: ${res.status}`);
  return res.json();
}

export async function fetchConvertStatus(): Promise<ConvertStatus> {
  const res = await fetch("/api/convert-status");
  if (!res.ok) throw new Error(`Failed to fetch convert status: ${res.status}`);
  return res.json();
}

export function mediaUrl(filename: string): string {
  return `/media/${encodeURIComponent(filename)}`;
}
