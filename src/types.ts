export interface Photo {
  id: string;
  title: string;
  timestamp: number;
  filename: string;
  isVideo: boolean;
}

export interface AppInfo {
  year: string;
  folder: string;
  heicCount: number;
}

export interface Album {
  name: string;
  path: string;
}

export interface TrashResponse {
  trashed: string[];
  errors: string[];
}

export interface MoveResponse {
  moved: string[];
  album: string;
  errors: string[];
}

export interface ConvertStatus {
  running: boolean;
  done: number;
  total: number;
  errors: string[];
}
