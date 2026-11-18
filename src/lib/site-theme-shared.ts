export const SITE_THEME_PRESETS = [
  {
    key: 'default',
    name: 'Обычная тема',
    description: 'Светлый небесно-голубой градиент с мягким свечением.',
    preview: 'Небесно-голубой + лазурный',
    swatch: 'bg-[linear-gradient(120deg,#d9f2ff_0%,#b9e8f5_48%,#73cce8_100%)]',
  },
  {
    key: 'new_year',
    name: 'Новый год',
    description: 'Зимний сине-фиолетовый градиент и праздничный акцент.',
    preview: 'Ледяной синий + ночной индиго',
    swatch: 'bg-[linear-gradient(120deg,#e2efff_0%,#9db9e8_48%,#353c68_100%)]',
  },
  {
    key: 'halloween',
    name: 'Хэллоуин',
    description: 'Тёплый оранжевый акцент и небольшие тематические детали.',
    preview: 'Оранжевый + графитовый',
    swatch: 'bg-[linear-gradient(120deg,#f97316_0%,#e4a16a_48%,#21130d_100%)]',
  },
] as const

export type SiteThemeKey = (typeof SITE_THEME_PRESETS)[number]['key']

export function isSiteThemeKey(value: unknown): value is SiteThemeKey {
  return typeof value === 'string' && SITE_THEME_PRESETS.some((theme) => theme.key === value)
}
