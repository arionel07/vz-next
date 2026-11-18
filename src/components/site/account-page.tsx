'use client'

import { LocalizedLink as Link } from '@/components/site/localized-link'
import { FormEvent, useState } from 'react'

import { formatPrice } from '@/lib/format'
import { legacyAsset } from '@/lib/legacy-assets'
import type { AccountData } from '@/lib/account'
import { localizedPath, type StoreLocale } from '@/lib/locale-routing'
import { RouletteExperience } from './roulette-experience'
import { CustomSelect } from './custom-select'

type Section = 'profile' | 'orders' | 'favorites' | 'bonus'

const sections: Array<{ id: Section; label: string }> = [
  { id: 'profile', label: 'Персональные данные' },
  { id: 'orders', label: 'Мои заказы' },
  { id: 'favorites', label: 'Избранное' },
  { id: 'bonus', label: 'Бонусная программа' },
]

function normalizeSection(value: string | undefined): Section {
  return sections.some((section) => section.id === value) ? value as Section : 'profile'
}

function orderStatus(status: string, locale: StoreLocale) {
  if (locale === 'ro') return ({ new: 'Nouă', progress: 'În procesare', finished: 'Finalizată', canceled: 'Anulată' }[status] ?? status)
  return {
    new: 'Новый',
    progress: 'В обработке',
    finished: 'Завершён',
    canceled: 'Отменён',
  }[status] ?? status
}

function orderDelivery(value: number | null, locale: StoreLocale) {
  if (locale === 'ro') return value === 1 ? 'Ridicare' : value === 3 ? 'Livrare în aceeași zi' : 'Livrare'
  return value === 1 ? 'Самовывоз' : value === 3 ? 'Доставка в день заказа' : 'Доставка'
}

function localizedError(error: string | undefined, fallback: string, locale: StoreLocale) {
  if (!error || (locale === 'ro' && /[\u0400-\u04FF]/.test(error))) return fallback
  return error
}

function formatDate(value: string | null, locale: StoreLocale) {
  if (!value) return '—'
  return new Intl.DateTimeFormat(locale === 'ro' ? 'ro-MD' : 'ru-MD', { dateStyle: 'medium' }).format(new Date(value))
}

export function AccountPage({ initialData, initialSection, locale = 'ru' }: { initialData: AccountData; initialSection?: string; locale?: StoreLocale }) {
  const text = locale === 'ro'
    ? { sections: { profile: 'Date personale', orders: 'Comenzile mele', favorites: 'Favorite', bonus: 'Program de bonusuri' }, title: 'Contul meu', myProfile: 'Profilul meu', continue: 'Continuă cumpărăturile', nav: 'Secțiunile contului', logout: 'Ieșire', logoutError: 'Nu s-a putut ieși din cont.', saveError: 'Datele nu au putut fi salvate.', saved: 'Datele au fost salvate.', passwordError: 'Parola nu a putut fi modificată.', passwordSaved: 'Parola a fost modificată.', surname: 'Nume', name: 'Prenume', phone: 'Telefon', email: 'Email', birthday: 'Data nașterii', birthdayPlaceholder: 'ZZ.LL.AAAA', gender: 'Gen', unspecified: 'Nespecificat', female: 'Femeie', male: 'Bărbat', sms: 'Primește SMS-uri de la Vizaje-Nica', mail: 'Primește noutăți și oferte', saving: 'Se salvează…', save: 'Salvează datele', password: 'Parolă', currentPassword: 'Parola actuală', newPassword: 'Parolă nouă', changePassword: 'Schimbă parola', order: 'Comanda nr.', pieces: 'buc.', details: 'Detalii comandă', noOrders: 'Nu există comenzi încă.', noFavorites: 'Nu ai produse favorite.', catalog: 'Vezi catalogul', removeFavorite: 'Elimină din favorite', balance: 'Sold bonusuri', discount: 'Reducere personală', bonusNote: 'Soldul și reducerea sunt preluate din profil. Sincronizarea WorkApp/1C va fi realizată într-o etapă separată.' }
    : { sections: { profile: 'Персональные данные', orders: 'Мои заказы', favorites: 'Избранное', bonus: 'Бонусная программа' }, title: 'Личный кабинет', myProfile: 'Мой профиль', continue: 'Продолжить покупки', nav: 'Разделы личного кабинета', logout: 'Выйти', logoutError: 'Не удалось выйти из аккаунта.', saveError: 'Не удалось сохранить данные.', saved: 'Данные сохранены.', passwordError: 'Не удалось изменить пароль.', passwordSaved: 'Пароль изменён.', surname: 'Фамилия', name: 'Имя', phone: 'Телефон', email: 'Email', birthday: 'Дата рождения', birthdayPlaceholder: 'ДД.ММ.ГГГГ', gender: 'Пол', unspecified: 'Не указан', female: 'Женский', male: 'Мужской', sms: 'Получать SMS от Vizaje-Nica', mail: 'Получать новости и предложения', saving: 'Сохраняем…', save: 'Сохранить данные', password: 'Пароль', currentPassword: 'Текущий пароль', newPassword: 'Новый пароль', changePassword: 'Изменить пароль', order: 'Заказ №', pieces: 'шт.', details: 'Подробнее о заказе', noOrders: 'Заказов пока нет.', noFavorites: 'В избранном пока ничего нет.', catalog: 'Перейти в каталог', removeFavorite: 'Убрать из избранного', balance: 'Бонусный баланс', discount: 'Персональная скидка', bonusNote: 'Баланс и скидка загружаются из профиля клиента. Синхронизация с WorkApp/1С будет добавлена отдельным этапом.' }
  const privacyText = locale === 'ro'
    ? { title: 'Datele mele personale', intro: 'Poți solicita o copie, corectarea, ștergerea sau limitarea prelucrării datelor. Vom răspunde, de regulă, în termen de o lună.', type: 'Tipul solicitării', choose: 'Alegeți', access: 'Copia datelor', correction: 'Corectarea datelor', erasure: 'Ștergerea datelor', restriction: 'Limitarea prelucrării', objection: 'Opoziție față de marketing', details: 'Detalii', placeholder: 'Descrieți solicitarea', send: 'Trimiteți solicitarea', sending: 'Se trimite…', sent: 'Solicitarea a fost trimisă. Vă vom răspunde în termenul prevăzut.', error: 'Solicitarea nu a putut fi trimisă.' }
    : { title: 'Мои персональные данные', intro: 'Вы можете запросить копию, исправление, удаление или ограничение обработки данных. Мы, как правило, ответим в течение одного месяца.', type: 'Тип запроса', choose: 'Выберите', access: 'Получить копию данных', correction: 'Исправить данные', erasure: 'Удалить данные', restriction: 'Ограничить обработку', objection: 'Возразить против маркетинга', details: 'Комментарий к запросу', placeholder: 'Опишите ваш запрос', send: 'Отправить запрос', sending: 'Отправляем…', sent: 'Запрос отправлен. Мы ответим в установленный срок.', error: 'Не удалось отправить запрос.' }
  const [data, setData] = useState(initialData)
  const [section, setSection] = useState<Section>(normalizeSection(initialSection))
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setSaving] = useState(false)
  const [privacyRequestType, setPrivacyRequestType] = useState('')

  function selectSection(next: Section) {
    setSection(next)
    setMessage('')
    setError('')
    window.history.replaceState(null, '', localizedPath('/ru/account', locale) + `?section=${next}`)
  }

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')
    const form = new FormData(event.currentTarget)
    try {
      const response = await fetch('/api/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'profile', locale,
          name: form.get('name'),
          surname: form.get('surname'),
          email: form.get('email'),
          birthday: form.get('birthday'),
          sex: form.get('sex'),
          smsSubscribe: form.get('smsSubscribe') === 'on',
          mailSubscribe: form.get('mailSubscribe') === 'on',
        }),
      })
      const result = await response.json() as { error?: string; account?: AccountData }
      if (!response.ok || !result.account) setError(localizedError(result.error, text.saveError, locale))
      else {
        setData(result.account)
        setMessage(text.saved)
        window.dispatchEvent(new CustomEvent('vz:auth-profile-updated'))
      }
    } catch {
      setError(text.saveError)
    } finally {
      setSaving(false)
    }
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')
    const form = new FormData(event.currentTarget)
    try {
      const response = await fetch('/api/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'password', locale, currentPassword: form.get('currentPassword'), nextPassword: form.get('nextPassword') }),
      })
      const result = await response.json() as { error?: string }
      if (!response.ok) setError(localizedError(result.error, text.passwordError, locale))
      else {
        event.currentTarget.reset()
        setMessage(text.passwordSaved)
      }
    } catch {
      setError(text.passwordError)
    } finally {
      setSaving(false)
    }
  }

  async function submitPrivacyRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')
    const form = new FormData(event.currentTarget)
    try {
      const response = await fetch('/api/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'personal-data-request',
          locale,
          requestType: form.get('requestType'),
          details: form.get('details'),
        }),
      })
      const result = await response.json() as { error?: string }
      if (!response.ok) setError(localizedError(result.error, privacyText.error, locale))
      else {
        event.currentTarget.reset()
        setPrivacyRequestType('')
        setMessage(privacyText.sent)
      }
    } catch {
      setError(privacyText.error)
    } finally {
      setSaving(false)
    }
  }

  async function toggleFavorite(productId: number) {
    try {
      const response = await fetch('/api/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'favorite-toggle', productId, locale }),
      })
      if (!response.ok) {
        const result = await response.json() as { error?: string }
        setError(localizedError(result.error, text.saveError, locale))
        return
      }
      setData((current) => ({
        ...current,
        favorites: current.favorites.filter((product) => product.id !== productId),
        favoriteIds: current.favoriteIds.filter((id) => id !== productId),
      }))
    } catch {
      setError(text.saveError)
    }
  }

  async function logout() {
    setSaving(true)
    setError('')
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      })
      if (!response.ok) throw new Error('logout')
      window.dispatchEvent(new CustomEvent('vz:auth-changed', { detail: { user: null } }))
      window.location.href = `/${locale}`
    } catch {
      setError(text.logoutError)
      setSaving(false)
    }
  }

  const displayName = [data.profile.name, data.profile.surname].filter(Boolean).join(' ') || data.profile.email

  return (
    <main className="site-shell min-h-[calc(100vh-136px)] overflow-x-hidden pb-20" aria-labelledby="account-title">
      <div className="mx-auto min-w-0 max-w-[1500px]">
        <section className="grid gap-6 border-b border-neutral-200 py-8 sm:py-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-12 lg:py-12">
          <div className="flex min-w-0 items-center gap-4 sm:gap-6">
            <div aria-hidden="true" className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-black text-xl font-medium text-white sm:h-20 sm:w-20 sm:text-2xl">
              {(displayName[0] || 'V').toLocaleUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="eyebrow">{text.title}</p>
              <h1 id="account-title" className="mb-2 !max-w-none !text-3xl !font-medium !leading-tight !tracking-[-0.04em] sm:!text-4xl">{displayName}</h1>
              <p className="m-0 truncate text-sm text-neutral-500">{[data.profile.email, data.profile.phone].filter(Boolean).join(' · ')}</p>
            </div>
          </div>

          <div className="lg:min-w-[360px]">
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="border border-neutral-200 bg-white px-4 py-3 sm:px-5 sm:py-4">
                <p className="mb-2 text-xs text-neutral-500">{text.balance}</p>
                <strong className="text-xl font-medium sm:text-2xl">{formatPrice(data.profile.bonus)}</strong>
              </div>
              <div className="border border-neutral-200 bg-white px-4 py-3 sm:px-5 sm:py-4">
                <p className="mb-2 text-xs text-neutral-500">{text.discount}</p>
                <strong className="text-xl font-medium sm:text-2xl">{data.profile.discount}%</strong>
              </div>
            </div>
            <Link className="mt-4 inline-flex text-sm text-neutral-600 underline decoration-neutral-300 underline-offset-4 transition-colors hover:text-[var(--cream)]" href="/ru/katalog">{text.continue}</Link>
          </div>
        </section>

        <div className="grid min-w-0 gap-8 pt-6 sm:pt-8 lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.6fr)] lg:gap-12 xl:grid-cols-[420px_minmax(0,1fr)]">
          <aside className="min-w-0 lg:sticky lg:top-28 lg:flex lg:h-fit lg:flex-col lg:items-end lg:pt-8">
            <nav className="flex min-w-0 max-w-full snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain border-b border-neutral-200 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:w-full lg:flex-col lg:items-end lg:gap-0 lg:overflow-visible lg:border-0 lg:pb-0" aria-label={text.nav}>
              {sections.map((item) => (
                <button
                  aria-current={section === item.id ? 'page' : undefined}
                  className={`relative flex min-h-10 shrink-0 snap-start items-center justify-center whitespace-nowrap rounded-full border border-neutral-200 px-4 py-2.5 text-left text-sm transition-colors hover:border-[var(--cream)] hover:text-[var(--cream)] lg:min-h-0 lg:w-fit lg:justify-end lg:gap-3 lg:rounded-none lg:border-0 lg:bg-transparent lg:px-0 lg:py-3.5 lg:text-right lg:text-[23px] lg:font-semibold lg:leading-tight lg:tracking-[-0.035em] lg:after:block lg:after:h-px lg:after:w-0 lg:after:bg-black lg:after:content-[''] lg:after:transition-[width] lg:after:duration-200 ${section === item.id ? 'border-black bg-black text-white hover:border-black hover:text-white lg:bg-transparent lg:text-black lg:after:w-10 lg:hover:text-[var(--cream)]' : 'bg-white text-neutral-600 lg:text-black'}`}
                  key={item.id}
                  type="button"
                  onClick={() => selectSection(item.id)}
                >
                  {text.sections[item.id]}
                </button>
              ))}
              <button className="shrink-0 snap-start whitespace-nowrap rounded-full border border-neutral-200 px-4 py-2.5 text-left text-sm text-[#8e1f2d] transition-colors hover:bg-[#8e1f2d] hover:text-white lg:mt-7 lg:rounded-none lg:border-0 lg:bg-transparent lg:px-0 lg:py-2 lg:text-[15px] lg:font-normal lg:hover:bg-transparent lg:hover:text-[#8e1f2d]" type="button" onClick={logout}>
                {text.logout}
              </button>
            </nav>
            <a className="group mt-7 flex w-full items-center justify-between gap-3 text-left transition-colors hover:text-[var(--cream)] lg:mt-12 lg:justify-end lg:text-right" href="https://t.me/vizaje_nica_support_bot" target="_blank" rel="noopener noreferrer">
              <span className="flex flex-col gap-1">
                <span className="text-xs text-neutral-500">{locale === 'ro' ? 'Ai nevoie de ajutor?' : 'Нужна помощь?'}</span>
                <span className="text-base">{locale === 'ro' ? 'Suport clienți' : 'Служба поддержки'}</span>
              </span>
              <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-neutral-300 text-lg transition-colors group-hover:border-[var(--cream)] group-hover:bg-[var(--cream)] group-hover:text-black">
                <svg viewBox="0 0 23 23" className="h-5 w-5"><path fill="none" stroke="#1D1D1D" strokeWidth="1.25" d="M.625 11.5C.625 5.494 5.494.625 11.5.625S22.375 5.494 22.375 11.5v10.875H11.5C5.494 22.375.625 17.506.625 11.5Z" /><path fill="#1D1D1D" stroke="none" d="M9 12a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" /><path fill="#1D1D1D" stroke="none" d="M12.898 12a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" /><path fill="#1D1D1D" stroke="none" d="M15.797 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" /></svg>
              </span>
            </a>
          </aside>

          <div className="min-w-0">
          {message ? <p className="account-page__notice" role="status">{message}</p> : null}
          {error ? <p className="account-page__error" role="alert">{error}</p> : null}

          {section === 'profile' ? (
            <section className="account-panel" aria-labelledby="profile-title">
              <h2 id="profile-title">{text.sections.profile}</h2>
              <form className="account-form" onSubmit={submitProfile}>
                <label>{text.surname}<input name="surname" defaultValue={data.profile.surname} /></label>
                <label>{text.name}<input name="name" required defaultValue={data.profile.name} /></label>
                <label>{text.phone}<input name="phone" disabled value={data.profile.phone} readOnly /></label>
                <label>{text.email}<input name="email" type="email" required defaultValue={data.profile.email} /></label>
                <label>{text.birthday}<input name="birthday" defaultValue={data.profile.birthday} placeholder={text.birthdayPlaceholder} /></label>
                <label>{text.gender}<select name="sex" defaultValue={String(data.profile.sex)}><option value="0">{text.unspecified}</option><option value="1">{text.female}</option><option value="2">{text.male}</option></select></label>
                <label className="account-form__check"><input name="smsSubscribe" type="checkbox" defaultChecked={data.profile.smsSubscribe} /> {text.sms}</label>
                <label className="account-form__check"><input name="mailSubscribe" type="checkbox" defaultChecked={data.profile.mailSubscribe} /> {text.mail}</label>
                <button className="button button-dark" type="submit" disabled={isSaving}>{isSaving ? text.saving : text.save}</button>
              </form>

              <div className="account-panel__divider" />
              <h2>{text.password}</h2>
              <form className="account-form account-form--password" onSubmit={submitPassword}>
                <label>{text.currentPassword}<input name="currentPassword" type="password" maxLength={256} required /></label>
                <label>{text.newPassword}<input name="nextPassword" type="password" minLength={8} maxLength={128} required /></label>
                <button className="button" type="submit" disabled={isSaving}>{text.changePassword}</button>
              </form>

              <div className="account-panel__divider" />
              <h2>{privacyText.title}</h2>
              <p className="account-page__muted mt-[-14px] mb-7">{privacyText.intro}</p>
              <form className="account-form account-form--privacy" onSubmit={submitPrivacyRequest}>
                <label>{privacyText.type}
                  <input type="hidden" name="requestType" value={privacyRequestType} />
                  <CustomSelect
                    value={privacyRequestType}
                    label={privacyText.choose}
                    title={privacyText.type}
                    closeLabel={locale === 'ro' ? 'Închide' : 'Закрыть'}
                    triggerClassName="w-full max-w-none justify-between rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 text-[14px] font-normal text-[var(--ink)] hover:text-[var(--ink)] max-[560px]:max-w-none"
                    options={[
                      { value: 'access', label: privacyText.access },
                      { value: 'correction', label: privacyText.correction },
                      { value: 'erasure', label: privacyText.erasure },
                      { value: 'restriction', label: privacyText.restriction },
                      { value: 'objection', label: privacyText.objection },
                    ]}
                    onChange={setPrivacyRequestType}
                  />
                </label>
                <label className="account-form__privacy-details">{privacyText.details}
                  <textarea name="details" maxLength={4000} rows={5} placeholder={privacyText.placeholder} required />
                </label>
                <button className="button button-dark" type="submit" disabled={isSaving}>{isSaving ? privacyText.sending : privacyText.send}</button>
              </form>
            </section>
          ) : null}

          {section === 'orders' ? (
            <section className="account-panel" aria-labelledby="orders-title">
              <h2 id="orders-title">{text.sections.orders}</h2>
              {data.orders.length ? <div className="account-orders">{data.orders.map((order) => (
                <article className="account-order" key={order.id}>
                  <div className="account-order__heading"><strong>{text.order}{order.orderId ?? order.id}</strong><span>{formatDate(order.added, locale)}</span></div>
                  <div className="account-order__meta"><span>{orderStatus(order.status, locale)}</span><span>{orderDelivery(order.delivery, locale)}</span><strong>{formatPrice(order.total + order.deliveryPrice - order.bonusMinus)}</strong></div>
                  <div className="account-order__products">{order.products.map((product) => (
                    <Link href={`/ru/katalog/product/${product.id}`} key={`${order.id}-${product.id}`} title={product.title}>
                      <span>{product.image ? <img src={legacyAsset(product.image) ?? undefined} alt="" /> : null}</span>
                      <small>{product.quantity} {text.pieces}</small>
                    </Link>
                  ))}</div>
                  <Link className="account-order__more" href={`/ru/zakazyi/${order.orderId ?? order.id}`}>{text.details}</Link>
                </article>
              ))}</div> : <p className="account-page__empty">{text.noOrders}</p>}
            </section>
          ) : null}

          {section === 'favorites' ? (
            <section className="account-panel" aria-labelledby="favorites-title">
              <h2 id="favorites-title">{text.sections.favorites}</h2>
              {data.favorites.length ? <div className="account-favorites">{data.favorites.map((product) => (
                <article key={product.id} className="account-favorite">
                  <Link href={`/ru/katalog/product/${product.id}`} className="account-favorite__image">{product.image ? <img src={legacyAsset(product.image) ?? undefined} alt={product.title} /> : null}</Link>
                  <p>{product.brand}</p>
                  <Link href={`/ru/katalog/product/${product.id}`}><h3>{product.title}</h3></Link>
                  <strong>{formatPrice(product.discountPrice && product.discountPrice > 0 ? product.discountPrice : product.price)}</strong>
                  <button type="button" onClick={() => toggleFavorite(product.id)}>{text.removeFavorite}</button>
                </article>
              ))}</div> : <p className="account-page__empty">{text.noFavorites} <Link href="/ru/katalog">{text.catalog}</Link></p>}
            </section>
          ) : null}

          {section === 'bonus' ? (
            <section className="account-panel" aria-labelledby="bonus-title">
              <h2 id="bonus-title">{text.sections.bonus}</h2>
              <div className="mb-8"><RouletteExperience locale={locale} /></div>
              <div className="account-bonus">
                <div><span>{text.balance}</span><strong>{formatPrice(data.profile.bonus)}</strong></div>
                <div><span>{text.discount}</span><strong>{data.profile.discount}%</strong></div>
              </div>
              <p className="account-page__muted">{text.bonusNote}</p>
            </section>
          ) : null}
          </div>
        </div>
      </div>
    </main>
  )
}
