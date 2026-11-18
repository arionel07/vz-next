import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { AUTH_SESSION_COOKIE, getUserBySessionToken } from '@/lib/auth'
import { calculatePromoCode, promoMessage } from '@/lib/promocodes'

const promoRequestSchema = z.object({
  code: z.string().trim().min(1).max(64),
  items: z.array(
    z.object({
      id: z.number().int().positive(),
      variantId: z.number().int().positive().nullable().optional(),
      quantity: z.number().int().min(1).max(99),
    }),
  ).min(1).max(100),
})

export async function POST(request: Request) {
  try {
    const body = promoRequestSchema.parse(await request.json())
    const cookieStore = await cookies()
    const user = await getUserBySessionToken(cookieStore.get(AUTH_SESSION_COOKIE)?.value)

    const calculation = await calculatePromoCode({
      code: body.code,
      items: body.items,
      clientId: user?.id ?? null,
      isB2B: user?.isB2B ?? false,
    })

    if (!calculation.applied || !calculation.promo) {
      return NextResponse.json(
        {
          promo: null,
          reason: calculation.reason,
          message: calculation.message ?? promoMessage(calculation.reason),
        },
        { status: calculation.reason === 'PROMO_NOT_AUTHENTICATED' ? 401 : 422 },
      )
    }

    const { lineDiscounts: _lineDiscounts, ...promo } = calculation.promo
    return NextResponse.json({ promo })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { promo: null, reason: 'PROMO_INVALID', message: promoMessage('PROMO_INVALID') },
        { status: 400 },
      )
    }

    console.error('Promocode validation failed', error)
    return NextResponse.json(
      { promo: null, reason: 'PROMO_UNAVAILABLE', message: 'Не удалось проверить промокод. Попробуйте ещё раз.' },
      { status: 500 },
    )
  }
}
