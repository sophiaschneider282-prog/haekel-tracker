/**
 * Parses a user-entered date string in "TT.MM.JJJJ" format.
 * Returns an ISO 8601 date string ("YYYY-MM-DD") on success,
 * null for empty/blank input, or throws an Error for invalid input.
 *
 * @param {string} text - Date string in "TT.MM.JJJJ" format
 * @returns {string|null} ISO 8601 date string or null
 */
export function parseDeadlineInput(text) {
  if (text == null || text.trim() === '') {
    return null;
  }

  const parts = text.trim().split('.');
  if (parts.length !== 3) {
    throw new Error('Ungültiges Datumsformat. Bitte TT.MM.JJJJ verwenden.');
  }

  const [dayStr, monthStr, yearStr] = parts;

  if (dayStr.length === 0 || monthStr.length === 0 || yearStr.length === 0) {
    throw new Error('Ungültiges Datumsformat. Bitte TT.MM.JJJJ verwenden.');
  }

  const day = Number(dayStr);
  const month = Number(monthStr);
  const year = Number(yearStr);

  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) {
    throw new Error('Ungültiges Datumsformat. Bitte TT.MM.JJJJ verwenden.');
  }

  if (isNaN(day) || isNaN(month) || isNaN(year)) {
    throw new Error('Ungültiges Datumsformat. Bitte TT.MM.JJJJ verwenden.');
  }

  if (month < 1 || month > 12) {
    throw new Error('Ungültiger Monat. Bitte einen Wert zwischen 01 und 12 eingeben.');
  }

  if (day < 1 || day > 31) {
    throw new Error('Ungültiger Tag. Bitte einen Wert zwischen 01 und 31 eingeben.');
  }

  if (year < 1000 || year > 9999) {
    throw new Error('Ungültiges Jahr. Bitte ein vierstelliges Jahr eingeben.');
  }

  // Construct date and verify it didn't roll over (e.g. Feb 31 → March)
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new Error(`Ungültiges Datum: ${text} existiert nicht.`);
  }

  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

/**
 * Computes the number of calendar days from referenceDate (midnight local)
 * to the deadline date (inclusive of deadline day).
 * Returns null when deadline is null/undefined.
 * Returns 0 when deadline === referenceDate (same day).
 * Returns negative values when deadline is in the past.
 *
 * @param {string|null} deadline  - ISO 8601 date string "YYYY-MM-DD" or null
 * @param {Date} referenceDate    - reference point (defaults to new Date())
 * @returns {number|null}
 */
export function calculateDaysRemaining(deadline, referenceDate = new Date()) {
  if (deadline == null) {
    return null;
  }

  const [year, month, day] = deadline.split('-').map(Number);
  const deadlineMidnight = new Date(year, month - 1, day);

  if (isNaN(deadlineMidnight.getTime())) {
    return null;
  }

  const refMidnight = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );

  return Math.round((deadlineMidnight - refMidnight) / 86400000);
}

/**
 * Formats a Days_Remaining integer as a human-readable badge label (German).
 * null input → null (no badge)
 * 0          → "Heute"
 * positive   → "X Tage"
 * negative   → "X Tage überfällig"  (X = Math.abs(days))
 *
 * @param {number|null} days
 * @returns {string|null}
 */
export function formatDeadlineBadge(days) {
  if (days == null) {
    return null;
  }

  if (days === 0) {
    return 'Heute';
  }

  if (days > 0) {
    return `${days} Tage`;
  }

  return `${Math.abs(days)} Tage überfällig`;
}

/**
 * Returns the appropriate color token for a deadline badge.
 * days < 0        → colors.danger
 * 0 ≤ days ≤ 3   → colors.warning
 * days > 3        → colors.textLight
 * null            → null
 *
 * @param {number|null} days
 * @param {object} colors - color palette with danger, warning, textLight tokens
 * @returns {string|null}
 */
export function getDeadlineBadgeColor(days, colors) {
  if (days == null) {
    return null;
  }

  if (days < 0) {
    return colors.danger;
  }

  if (days <= 3) {
    return colors.warning;
  }

  return colors.textLight;
}

/**
 * Converts an ISO 8601 date string "YYYY-MM-DD" to display format "TT.MM.JJJJ".
 * Returns "" for null/undefined input.
 *
 * @param {string|null|undefined} iso - ISO 8601 date string
 * @returns {string}
 */
export function formatISOToDisplay(iso) {
  if (iso == null) {
    return '';
  }

  const [year, month, day] = iso.split('-');
  return `${day}.${month}.${year}`;
}
