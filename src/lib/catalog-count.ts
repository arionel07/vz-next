export type CatalogCountContext =
  | { kind: 'catalog' }
  | { kind: 'category'; uri: string }
  | { kind: 'brand'; brandId: number }
  | { kind: 'sale' }
  | { kind: 'search'; query: string }
