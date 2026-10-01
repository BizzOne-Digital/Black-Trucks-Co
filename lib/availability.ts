/**
 * Converts "HH:MM" time string + date string into a Date object (UTC-safe minutes-since-midnight).
 */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Returns true if two time windows overlap.
 * Each window is [startMinutes, startMinutes + durationMinutes).
 * We add a 30-min buffer between bookings (turnaround/cleaning time).
 */
export function timesOverlap(
  existingStart: number,
  existingDuration: number,
  requestedStart: number,
  requestedDuration: number,
  bufferMinutes = 30,
): boolean {
  const existingEnd = existingStart + existingDuration + bufferMinutes;
  const requestedEnd = requestedStart + requestedDuration + bufferMinutes;
  // Overlap if one starts before the other ends
  return requestedStart < existingEnd && existingStart < requestedEnd;
}

export const BLOCKING_STATUSES = ['pending', 'confirmed', 'assigned', 'in_progress'];
