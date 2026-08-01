/**
 * Authoritative Date & Time utilities for Intrust India HRM Workflows
 * Standardized on Asia/Kolkata (IST, UTC+05:30)
 */

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

/**
 * Returns today's date in YYYY-MM-DD format strictly in Asia/Kolkata timezone.
 */
export function getISTDateString(dateInput: Date | string = new Date()): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: DEFAULT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);
}

/**
 * Formats a timestamptz to 12-hour IST time string (e.g., "09:30 AM")
 */
export function formatTimeIST(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '—';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: DEFAULT_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(d);
}

/**
 * Formats a date or timestamp to readable IST date string (e.g., "Mon, 15 Aug 2026")
 */
export function formatDateIST(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '—';
  // Parse YYYY-MM-DD safely without UTC shift
  let d: Date;
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    const [y, m, day] = dateInput.split('-').map(Number);
    d = new Date(y, m - 1, day);
  } else {
    d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  }
  if (isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    weekday: 'short'
  }).format(d);
}

/**
 * Calculates duration between check_in and check_out in hours & minutes
 */
export function calculateDuration(checkIn?: string | null, checkOut?: string | null): string {
  if (!checkIn || !checkOut) return '—';
  const start = new Date(checkIn).getTime();
  const end = new Date(checkOut).getTime();
  if (isNaN(start) || isNaN(end) || end < start) return '—';
  const diffMs = end - start;
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${mins}m`;
}

/**
 * Calculates live elapsed time in HH:MM:SS format from a check-in timestamptz
 */
export function calculateElapsedTime(checkIn: string, now: Date = new Date()): string {
  const start = new Date(checkIn).getTime();
  const current = now.getTime();
  if (isNaN(start) || current < start) return '00:00:00';
  const diffSec = Math.floor((current - start) / 1000);
  const h = Math.floor(diffSec / 3600).toString().padStart(2, '0');
  const m = Math.floor((diffSec % 3600) / 60).toString().padStart(2, '0');
  const s = (diffSec % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}
