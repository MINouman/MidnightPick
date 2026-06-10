'use strict'

// Convert a date-only string (YYYY-MM-DD) to end-of-day in Dhaka time (UTC+6).
// Full datetime strings are passed through unchanged.
function toEndOfDayDhaka(dateStr) {
  if (!dateStr) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return `${dateStr}T23:59:59+06:00`
  return dateStr
}

module.exports = { toEndOfDayDhaka }
