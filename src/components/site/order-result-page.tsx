import { LocalizedLink as Link } from '@/components/site/localized-link'
import { CircleCheck, CircleX } from 'lucide-react'
import type { StoreLocale } from '@/lib/locale-routing'

type OrderResultPageProps = {
  variant: 'success' | 'error'
  orderNumber?: string
  reason?: string
  locale?: StoreLocale
}

export function OrderResultPage({ variant, orderNumber, reason, locale = 'ru' }: OrderResultPageProps) {
  const isSuccess = variant === 'success'
  const text = locale === 'ro'
    ? { success: 'Comanda a fost plasată cu succes', error: 'Comanda nu a putut fi plasată', thankYou: 'Îți mulțumim pentru comandă', lead: 'Am primit solicitarea și te vom contacta în curând pentru confirmarea detaliilor.', next: 'Pasul următor', manager: 'Managerul va confirma comanda la numărul de telefon indicat.', payment: 'Dacă plata a fost deja debitată', paymentHint: 'Nu repeta plata. Contactează suportul și vom verifica starea comenzii.', retry: 'Comanda nu a fost creată. Verifică datele și încearcă din nou.', shopping: 'Continuă cumpărăturile', checkout: 'Înapoi la comandă', home: 'Pagina principală' }
    : { success: 'Заказ успешно оформлен', error: 'Не удалось оформить заказ', thankYou: 'Спасибо за заказ', lead: 'Мы получили вашу заявку и скоро свяжемся с вами для подтверждения деталей.', next: 'Следующий шаг', manager: 'Менеджер подтвердит заказ по указанному телефону.', payment: 'Если деньги уже списались', paymentHint: 'Не повторяйте оплату и обратитесь в поддержку — мы проверим статус заказа.', retry: 'Заказ не был создан. Проверьте данные и попробуйте ещё раз.', shopping: 'Продолжить покупки', checkout: 'Вернуться к оформлению', home: 'На главную' }

  return (
    <main className="site-shell order-result-shell">
      <section className={`order-result order-result--${variant}`} aria-labelledby="order-result-title">
        <div className="order-result__card">
          <div className="order-result__mark" aria-hidden="true">
            {isSuccess ? <CircleCheck size={42} strokeWidth={1.35} /> : <CircleX size={42} strokeWidth={1.35} />}
          </div>

          <p className="eyebrow">VIZAJE-NICA</p>
          <h1 id="order-result-title">
            {isSuccess ? text.success : text.error}
          </h1>

          {isSuccess ? (
            <>
              <p className="order-result__lead">
                {text.thankYou}{orderNumber ? ` №${orderNumber}` : ''}. {text.lead}
              </p>
              <div className="order-result__notice">
                <span>{text.next}</span>
                <p>{text.manager}</p>
              </div>
            </>
          ) : (
            <>
              <p className="order-result__lead">
                {reason || text.retry}
              </p>
              <div className="order-result__notice">
                <span>{text.payment}</span>
                <p>{text.paymentHint}</p>
              </div>
            </>
          )}

          <div className="order-result__actions">
            <Link className="button button-dark" href={isSuccess ? (locale === 'ro' ? '/ro/catalog' : '/ru/katalog') : `/${locale}/checkout`}>
              {isSuccess ? text.shopping : text.checkout}
            </Link>
            <Link className="order-result__home" href={`/${locale}`}>
              {text.home}
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
