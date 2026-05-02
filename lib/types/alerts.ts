export type AlertSeverity = 'info' | 'warning' | 'severe' | 'critical'

export interface Alert {
  id: string
  severity: AlertSeverity
  title: string
  description: string
  area: string
  issuedAt: string
  expiresAt?: string
}

export interface AlertsData {
  alerts: Alert[]
  updatedAt: string
}

export interface AlertsResponse {
  data: AlertsData | null
  error?: string
  stale?: boolean
  updatedAt: string
}
