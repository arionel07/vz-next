export type CatalogView = 'standard' | 'featured'

export function catalogView(value: string | string[] | undefined): CatalogView {
  const selected = Array.isArray(value) ? value[0] : value
  if (selected === 'featured') return selected
  return 'standard'
}
