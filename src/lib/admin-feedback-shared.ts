export const ADMIN_FEEDBACK_STATUSES = ['new', 'in_progress', 'done', 'rejected'] as const
export type AdminFeedbackStatus = (typeof ADMIN_FEEDBACK_STATUSES)[number]

export const ADMIN_FEEDBACK_STATUS_LABELS: Record<AdminFeedbackStatus, string> = {
  new: 'Новое',
  in_progress: 'В работе',
  done: 'Завершено',
  rejected: 'Отклонено',
}

export const ADMIN_FEEDBACK_TYPE_LABELS = {
  idea: 'Идея',
  bug: 'Ошибка',
  question: 'Вопрос',
} as const

export type AdminFeedbackType = keyof typeof ADMIN_FEEDBACK_TYPE_LABELS
