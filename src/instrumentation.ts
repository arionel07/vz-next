import type { Instrumentation } from 'next'

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const errorName = error instanceof Error ? error.name : 'UnknownError'
  const digest = error && typeof error === 'object' && 'digest' in error
    ? String(error.digest).slice(0, 120)
    : undefined

  console.error('[request-error]', {
    errorName,
    digest,
    method: request.method,
    routePath: context.routePath,
    routeType: context.routeType,
    routerKind: context.routerKind,
  })
}
