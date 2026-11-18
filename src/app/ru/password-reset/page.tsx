import { Suspense } from 'react'

import { ResetPasswordPage } from '@/components/site/reset-password-page'

export default function PasswordResetRoute() {
  return <Suspense fallback={null}><ResetPasswordPage /></Suspense>
}
