/** Saludo según la hora local (España por defecto en toLocale). */
export function greetingForNow(date = new Date()): string {
  const h = date.getHours()
  if (h >= 5 && h < 12) return 'Buenos días'
  if (h >= 12 && h < 20) return 'Buenas tardes'
  return 'Buenas noches'
}
