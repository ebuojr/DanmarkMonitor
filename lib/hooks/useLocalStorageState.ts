'use client'

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'

// useState + localStorage, hydration-safe: the default renders on the server
// AND the first client paint (no mismatch), the stored value loads via
// queueMicrotask after mount, and writes only start once that load ran.
// Tolerant by construction — corrupt JSON, wrong shapes and blocked storage
// (private mode, quota) all degrade to in-memory state, never a throw.

export interface StorageCodec<T> {
  /** raw = JSON.parse output of unknown shape. Return null to reject → default used. */
  parse(raw: unknown): T | null
  /** Return a JSON-serializable representation (Sets aren't). */
  serialize(value: T): unknown
}

export function useLocalStorageState<T>(
  key: string,
  defaultValue: T,
  codec: StorageCodec<T>
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState(defaultValue)
  const [hydrated, setHydrated] = useState(false)
  // Refs so callers can pass inline codecs/defaults without memoization and
  // without them churning the effects below. Synced in an effect (not during
  // render); effect order guarantees the sync runs before the load effect.
  const codecRef = useRef(codec)
  const defaultRef = useRef(defaultValue)
  useEffect(() => {
    codecRef.current = codec
  })

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const raw = localStorage.getItem(key)
        if (raw !== null) {
          const parsed = codecRef.current.parse(JSON.parse(raw))
          setValue(parsed ?? defaultRef.current)
        }
      } catch {
        // Unreadable storage or corrupt JSON — keep the default.
      }
      setHydrated(true)
    })
  }, [key])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(key, JSON.stringify(codecRef.current.serialize(value)))
    } catch {
      // Storage blocked (private mode, quota) — state stays session-only.
    }
  }, [key, value, hydrated])

  return [value, setValue]
}

/** Set<K> persisted as an array. Unknown members are dropped; an empty array
 *  is VALID (the user chose to show none) — only non-arrays reject. */
export function setCodec<K extends string>(valid: readonly K[]): StorageCodec<Set<K>> {
  const known = new Set<string>(valid)
  return {
    parse(raw) {
      if (!Array.isArray(raw)) return null
      return new Set(raw.filter((v): v is K => typeof v === 'string' && known.has(v)))
    },
    serialize(value) {
      return [...value]
    },
  }
}

/** Single string-union member persisted as-is; unknown values reject. */
export function enumCodec<K extends string>(valid: readonly K[]): StorageCodec<K> {
  const known = new Set<string>(valid)
  return {
    parse(raw) {
      return typeof raw === 'string' && known.has(raw) ? (raw as K) : null
    },
    serialize(value) {
      return value
    },
  }
}
