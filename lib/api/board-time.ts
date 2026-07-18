// Shared time helpers for the airport-board fetchers (cph/bll/aar). Each
// upstream reports times differently — CPH offset-aware ISO datetimes,
// BLL/AAR bare "HH:MM" Danish-local strings — so "is this flight delayed"
// needs one comparison that works for both shapes.

/**
 * Parse a board time into a comparable number, or null if unparseable.
 * ISO datetimes return epoch milliseconds; bare "HH:MM"/"HH.MM" strings
 * return minutes-since-midnight. The two scales are only ever compared
 * against values from the same source row, never across formats.
 */
export function parseBoardTime(value: string): number | null {
  if (value.includes('T')) {
    const ms = Date.parse(value)
    return Number.isNaN(ms) ? null : ms
  }
  const m = /^(\d{1,2})[.:](\d{2})$/.exec(value.trim())
  if (!m) return null
  return Number(m[1]) * 60 + Number(m[2])
}

/**
 * Delayed = expected is meaningfully LATER than scheduled (≥ 1 minute).
 * An early expected time is not "delayed", and mixed/unparseable formats
 * report false rather than guessing — avoids the red strikethrough styling
 * on rows where the upstream merely reformatted an identical time.
 */
export function isDelayed(scheduled: string, expected: string): boolean {
  const s = parseBoardTime(scheduled)
  const e = parseBoardTime(expected)
  if (s === null || e === null) return false
  // Same-format check: ISO pairs compare in ms, bare pairs in minutes.
  const isoS = scheduled.includes('T')
  const isoE = expected.includes('T')
  if (isoS !== isoE) return false
  const oneMinute = isoS ? 60_000 : 1
  let diff = e - s
  // Bare "HH:MM" pairs can wrap midnight (scheduled 23:55, expected 00:10) —
  // reinterpret a >12h-early gap as a next-day delay.
  if (!isoS && diff < -720) diff += 1440
  return diff >= oneMinute
}
