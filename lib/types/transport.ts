export type DisruptionType = 'DELAY' | 'CANCELLATION' | 'DISRUPTION' | 'INFO'

export interface Disruption {
  id: string
  line: string
  type: DisruptionType
  message: string
  affectedLines: string[]
  startTime?: string
  endTime?: string
}

export interface TransportData {
  disruptions: Disruption[]
  updatedAt: string
}

export interface TransportResponse {
  data: TransportData | null
  error?: string
  stale?: boolean
  updatedAt: string
}
