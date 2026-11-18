import 'server-only'

import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { searchSynonymSettings } from '../../drizzle/schema'

import type { MeilisearchIndexSettings } from './admin-meilisearch-client'

/**
 * Ported from the legacy `Meilisearch` admin controller
 * (application/controllers/backend/Meilisearch.php): default synonym
 * groups, validation rules, and the "matis" brand-alias fixup that keeps
 * that one group complete even if an admin edits it by hand.
 */

const SYNONYM_TERM_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N}\s.'’&-]*$/u

export function defaultSearchSynonymGroups(): string[][] {
  return [
    ['тушь', 'тушь для ресниц', 'mascara', 'rimel'],
    ['помада', 'губная помада', 'ruj', 'lipstick'],
    ['clarins', 'кларинс', 'кларанс', 'кларенс'],
    ['matis', 'matis paris', 'матис', 'матис париж', 'мэтис'],
    ['double serum', 'двойная сыворотка', 'добле серум'],
    ['double', 'добле'],
    ['serum', 'серум'],
    ['maybelline', 'maybelline new york', 'мейбеллин', 'мейбелин', 'мэйбелин'],
    ['chanel', 'шанель', 'шанел', 'шанэль'],
    ['тональный крем', 'foundation', 'fond de ten'],
    ['пудра', 'powder', 'pudră'],
    ['консилер', 'concealer', 'corector'],
    ['тени', 'тени для век', 'eyeshadow', 'fard de pleoape'],
    ['блеск для губ', 'lip gloss', 'gloss de buze'],
    ['крем для лица', 'face cream', 'cremă de față'],
    ['уход за кожей', 'skincare', 'îngrijirea pielii'],
    ['духи', 'парфюм', 'perfume', 'parfum', 'parfumuri'],
    ['парфюмерная вода', 'eau de parfum', 'edp', 'apă de parfum'],
    ['шампунь', 'shampoo', 'șampon'],
    ['крем для рук', 'hand cream', 'cremă de mâini'],
    ['румяна', 'blush'],
    ['карандаш для глаз', 'eye pencil', 'creion de ochi'],
    ['подводка для глаз', 'eyeliner', 'tuș de ochi'],
  ]
}

function normalizeTerm(term: string) {
  return term.replace(/\s+/gu, ' ').trim().toLowerCase()
}

/** Keeps the "matis" alias group complete even after a manual edit. */
function ensureMatisSynonymGroup(groups: string[][]): string[][] {
  const aliases = ['matis', 'matis paris', 'матис', 'матис париж', 'мэтис']
  const aliasKeys = new Set(aliases.map(normalizeTerm))

  for (let index = 0; index < groups.length; index += 1) {
    const group = groups[index]
    if (!group.some((term) => aliasKeys.has(normalizeTerm(term)))) continue

    const byKey = new Map(group.map((term) => [normalizeTerm(term), term]))
    for (const alias of aliases) {
      const key = normalizeTerm(alias)
      if (!byKey.has(key)) byKey.set(key, alias)
    }
    return groups.map((existing, existingIndex) => (existingIndex === index ? [...byKey.values()] : existing))
  }

  return [...groups, aliases]
}

export async function synonymStorageReady() {
  // search_synonym_settings is created by drizzle/0006_search_synonym_settings.sql
  try {
    await db.select({ id: searchSynonymSettings.id }).from(searchSynonymSettings).limit(1)
    return true
  } catch {
    return false
  }
}

export async function getSearchSynonymGroups(): Promise<string[][]> {
  let row: { groupsJson: string } | undefined
  try {
    ;[row] = await db.select({ groupsJson: searchSynonymSettings.groupsJson })
      .from(searchSynonymSettings).where(eq(searchSynonymSettings.id, 1)).limit(1)
  } catch {
    return defaultSearchSynonymGroups()
  }

  if (!row?.groupsJson) return defaultSearchSynonymGroups()

  let parsed: unknown
  try {
    parsed = JSON.parse(row.groupsJson)
  } catch {
    return defaultSearchSynonymGroups()
  }
  if (!Array.isArray(parsed)) return defaultSearchSynonymGroups()

  const validGroups = parsed
    .filter((group): group is unknown[] => Array.isArray(group))
    .map((group) => [...new Set(group.filter((term): term is string => typeof term === 'string').map((term) => term.trim()).filter(Boolean))])
    .filter((group) => group.length >= 2)

  return validGroups.length ? ensureMatisSynonymGroup(validGroups) : defaultSearchSynonymGroups()
}

export type SaveSynonymGroupsResult =
  | { ok: true; groupsCount: number }
  | { ok: false; error: string }

/** Parses the textarea format (`term | term | term` per line) with the same limits as legacy. */
export async function saveSearchSynonymGroups(rawText: string): Promise<SaveSynonymGroupsResult> {
  if (rawText.length > 65536) return { ok: false, error: 'Список слишком большой (максимум 64 КБ).' }

  const groups: string[][] = []
  for (const rawLine of rawText.split(/\r\n|\r|\n/u)) {
    const line = rawLine.trim()
    if (!line) continue

    const terms = new Map<string, string>()
    for (const rawTerm of line.split('|')) {
      const term = rawTerm.trim()
      if (!term) continue
      if (term.length < 2 || term.length > 80 || !SYNONYM_TERM_PATTERN.test(term)) {
        return { ok: false, error: `Недопустимый вариант синонима: ${term}. Используй 2–80 букв/цифр и пробелы; допустимы . ’ & -.` }
      }
      terms.set(normalizeTerm(term), term)
    }

    if (terms.size < 2) return { ok: false, error: 'В каждой непустой строке должно быть минимум два разных варианта, разделённых символом |.' }
    if (terms.size > 12) return { ok: false, error: 'В одной группе можно указать не больше 12 вариантов.' }

    groups.push([...terms.values()])
    if (groups.length > 200) return { ok: false, error: 'Можно сохранить не больше 200 групп синонимов.' }
  }

  if (!groups.length) return { ok: false, error: 'Добавь хотя бы одну группу синонимов.' }

  await db.insert(searchSynonymSettings)
    .values({ id: 1, groupsJson: JSON.stringify(groups) })
    .onDuplicateKeyUpdate({ set: { groupsJson: JSON.stringify(groups) } })

  return { ok: true, groupsCount: groups.length }
}

function buildSynonymMap(groups: string[][]): Record<string, string[]> {
  const alternativesByTerm = new Map<string, Set<string>>()
  for (const group of groups) {
    const terms = [...new Set(group.map((term) => term.trim()).filter(Boolean))]
    for (const term of terms) {
      const set = alternativesByTerm.get(term) ?? new Set<string>()
      for (const alternative of terms) {
        if (alternative !== term) set.add(alternative)
      }
      alternativesByTerm.set(term, set)
    }
  }
  return Object.fromEntries([...alternativesByTerm.entries()].map(([term, set]) => [term, [...set]]))
}

/** Full index settings payload: searchable/filterable/sortable attributes, synonyms, typo tolerance. */
export async function buildMeilisearchIndexSettings(): Promise<MeilisearchIndexSettings> {
  const synonyms = buildSynonymMap(await getSearchSynonymGroups())

  return {
    searchableAttributes: [
      'SKU', 'barcode', 'variant_skus', 'variant_barcodes',
      'titleRU', 'titleRO', 'titleEN', 'brand',
      'categoryRU', 'categoryRO', 'category_pathRU', 'category_pathRO',
      'search_text', 'GUID',
    ],
    filterableAttributes: [
      'brand_id', 'category_id', 'sex', 'price', 'current_price',
      'discount_price', 'has_discount', 'on_stock', 'sale_percent', 'is_new', 'has_variants',
    ],
    sortableAttributes: [
      'price', 'current_price', 'discount_price', 'sale_percent', 'sale_mdl',
      'stock', 'best_selling', 'has_stock', 'on_stock', 'is_new', 'id',
    ],
    pagination: { maxTotalHits: 10_000 },
    synonyms,
    typoTolerance: {
      enabled: true,
      minWordSizeForTypos: { oneTypo: 5, twoTypos: 9 },
      disableOnAttributes: ['SKU', 'variant_skus', 'variant_barcodes', 'barcode', 'GUID'],
    },
  }
}
