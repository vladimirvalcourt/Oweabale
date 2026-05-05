/**
 * Convert an array of objects into a CSV string.
 * Handles basic escaping (quotes, commas, newlines).
 */
export function toCsv(rows: Record<string, unknown>[], headers?: string[]): string {
  if (rows.length === 0) return ''

  const keys = headers ?? Object.keys(rows[0])

  const escape = (value: unknown): string => {
    if (value === null || value === undefined) return ''
    const str = String(value)
    // Escape quotes and wrap in quotes if necessary
    if (/[",\n]/.test(str)) {
      return '"' + str.replace(/"/g, '""') + '"'
    }
    return str
  }

  const headerLine = keys.map(escape).join(',')
  const bodyLines = rows.map((row) =>
    keys.map((k) => escape(row[k])).join(',')
  )

  return [headerLine, ...bodyLines].join('\n')
}

/**
 * Trigger a browser download of a text file.
 */
export function downloadTextFile(content: string, filename: string, mime = 'text/csv') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
