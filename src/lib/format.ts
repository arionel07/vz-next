export function formatPrice(value: number | null) {
  if (value === null) return 'Цена уточняется'

  return `${new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 0,
  }).format(value)} MDL`
}
