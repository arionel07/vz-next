export const ADMIN_SETTING_GROUPS = [
  'errors',
  'transliteration',
  'contacts',
  'form',
  'choose',
  'about',
  'dates',
] as const

export type AdminSettingGroup = (typeof ADMIN_SETTING_GROUPS)[number]

export const ADMIN_SETTING_GROUP_LABELS: Record<AdminSettingGroup, string> = {
  errors: 'Сообщения и ошибки',
  transliteration: 'Тексты сайта',
  contacts: 'Контакты',
  form: 'Формы',
  choose: 'Выбор и подсказки',
  about: 'О сайте',
  dates: 'Даты',
}

export const ADMIN_SETTINGS_PAGE_SIZE = 20
