export interface Camera {
  id: string
  name: string
  lat: number
  lon: number
  snapshotUrl?: string
  road?: string
  location?: string
}

export interface CamerasData {
  cameras: Camera[]
  updatedAt: string
}

export interface CamerasResponse {
  data: CamerasData | null
  error?: string
  stale?: boolean
  updatedAt: string
}
