/**
 * =============================================================================
 * TOMO CRM - Local Storage Utilities
 * =============================================================================
 * 
 * CURRENT STATE: Uses browser localStorage for persistence
 * 
 * PRODUCTION NOTES:
 * - Keep these utilities for client-side caching and preferences
 * - Primary data storage moves to Supabase
 * - Use these for:
 *   - UI state (selected items, panel sizes, collapsed sections)
 *   - Draft messages before sending
 *   - Offline queue (if implementing offline support)
 * 
 * DO NOT USE FOR:
 * - Session/auth tokens (use Firebase Auth)
 * - Sensitive user data (use Supabase with RLS)
 * - Integration credentials (store server-side encrypted)
 * =============================================================================
 */

import { useState } from "react";

/**
 * Read a value from localStorage with JSON parsing
 * 
 * @param key - Storage key
 * @param fallback - Default value if key doesn't exist or parsing fails
 * @returns Parsed value or fallback
 * 
 * USAGE:
 * - UI preferences: readFromStorage('tomo-panel-width', 42)
 * - Draft content: readFromStorage('tomo-draft-message', '')
 * - Feature flags: readFromStorage('tomo-beta-features', false)
 */
export function readFromStorage<T>(key: string, fallback: T): T {
  // Return fallback during SSR (no window)
  if (typeof window === "undefined") return fallback;
  
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn("Failed to read storage", error);
    return fallback;
  }
}

/**
 * Write a value to localStorage with JSON serialization
 * 
 * @param key - Storage key
 * @param value - Value to store (will be JSON stringified)
 * 
 * PRODUCTION: Consider adding:
 * - Key prefixing for multi-user devices: `tomo-${userId}-${key}`
 * - Expiration for cached data
 * - Size limits to prevent quota exceeded errors
 */
export function writeToStorage<T>(key: string, value: T) {
  // Skip during SSR
  if (typeof window === "undefined") return;
  
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn("Failed to write storage", error);
    // PRODUCTION: Could log to error tracking service
    // or implement LRU eviction for quota exceeded
  }
}

/**
 * React hook for persisted state (survives page refresh)
 * 
 * @param key - Storage key
 * @param initial - Initial value if nothing stored
 * @returns [value, setValue, ready] tuple
 * 
 * USAGE:
 * ```
 * const [panelWidth, setPanelWidth, ready] = usePersistentState('panel-width', 42);
 * 
 * // Update value (auto-persists to localStorage)
 * setPanelWidth(50);
 * 
 * // Check if we're in browser (ready) before rendering
 * if (!ready) return null;
 * ```
 * 
 * PRODUCTION USE CASES:
 * - Resizable panel widths/heights
 * - Selected tab or view preferences
 * - Collapsed/expanded sections
 * - Sort orders and filters
 * - Theme preference (if not in user profile)
 * 
 * NOTE: For data that should sync across devices, store in Supabase
 * user_preferences table instead.
 */
export function usePersistentState<T>(key: string, initial: T): [T, (val: T | ((prev: T) => T)) => void, boolean] {
  // Initialize from storage if available
  const initialValue = typeof window !== "undefined" ? readFromStorage<T>(key, initial) : initial;
  const [state, setState] = useState<T>(initialValue);
  const ready = typeof window !== "undefined";

  // Wrapper that persists to localStorage on change
  const update = (val: T | ((prev: T) => T)) => {
    setState((prev) => {
      const next = typeof val === "function" ? (val as (prev: T) => T)(prev) : val;
      writeToStorage(key, next);
      return next;
    });
  };

  return [state, update, ready];
}

/**
 * =============================================================================
 * PRODUCTION: Additional Storage Utilities to Consider
 * =============================================================================
 * 
 * 1. Async Storage with IndexedDB (for larger data):
 * ```
 * import { openDB } from 'idb';
 * 
 * const db = openDB('tomo-cache', 1, {
 *   upgrade(db) {
 *     db.createObjectStore('contacts');
 *     db.createObjectStore('briefs');
 *   },
 * });
 * 
 * export async function cacheContacts(contacts: Contact[]) {
 *   const store = (await db).transaction('contacts', 'readwrite').objectStore('contacts');
 *   for (const contact of contacts) {
 *     await store.put(contact, contact.id);
 *   }
 * }
 * ```
 * 
 * 2. Clear user data on logout:
 * ```
 * export function clearUserStorage(userId: string) {
 *   const keys = Object.keys(localStorage);
 *   keys.filter(k => k.startsWith(`tomo-${userId}`)).forEach(k => {
 *     localStorage.removeItem(k);
 *   });
 * }
 * ```
 * 
 * 3. Storage migration for schema changes:
 * ```
 * export function migrateStorage() {
 *   const version = readFromStorage('tomo-storage-version', 0);
 *   if (version < 1) {
 *     // Migration logic
 *     writeToStorage('tomo-storage-version', 1);
 *   }
 * }
 * ```
 */
