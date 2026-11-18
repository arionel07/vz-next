'use client'

import { LocalizedLink as Link } from '@/components/site/localized-link'
import { Heart } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { AccountProduct } from '@/lib/account'
import type { CatalogProduct } from '@/lib/catalog'
import type { StoreLocale } from '@/lib/locale-routing'
import { ContentSlider } from './content-slider'
import { ProductCard } from './product-card'

type ViewState = 'loading' | 'ready' | 'unauthenticated' | 'error'

export function FavoritesPage({ locale = 'ru' }: { locale?: StoreLocale }) {
  const [products, setProducts] = useState<AccountProduct[]>([])
  const [recommendations, setRecommendations] = useState<CatalogProduct[]>([])
  const [viewState, setViewState] = useState<ViewState>('loading')
  const [removingId, setRemovingId] = useState<number | null>(null)
  const [actionError, setActionError] = useState('')
  const loginRequested = useRef(false)
  const text = locale === 'ro'
    ? { title: 'Favorite', saved: 'produse salvate', continue: 'Continuă cumpărăturile', loading: 'Se încarcă favoritele…', auth: 'Autentificarea este necesară', save: 'Salvează produsele preferate', signIn: 'Autentifică-te pentru a accesa favoritele de pe orice dispozitiv.', login: 'Autentificare', loadError: 'Favoritele nu au putut fi încărcate. Reîncarcă pagina și încearcă din nou.', retry: 'Reîncearcă', removing: 'Se elimină…', remove: 'Elimină din favorite', empty: 'Apasă pe ♡ pentru a adăuga un produs la favorite.', similar: 'Produse similare', popular: 'Produse cu reducere' }
    : { title: 'Избранное', saved: 'товаров сохранено', continue: 'Продолжить покупки', loading: 'Загружаем избранное…', auth: 'Требуется авторизация', save: 'Сохраняйте понравившиеся товары', signIn: 'Войдите в аккаунт, чтобы открыть своё избранное на любом устройстве.', login: 'Войти', loadError: 'Не удалось загрузить избранное. Обновите страницу и попробуйте ещё раз.', retry: 'Повторить', removing: 'Удаляем…', remove: 'Убрать из избранного', empty: 'Нажмите на ♡, чтобы добавить продукт в избранное.', similar: 'Похожие товары', popular: 'Товары со скидкой' }

  const openLogin = useCallback(() => {
    if (loginRequested.current) return
    loginRequested.current = true
    window.dispatchEvent(new CustomEvent('vz:open-auth'))
  }, [])

  const loadFavorites = useCallback(async (openDrawerOnUnauthorized: boolean) => {
    setViewState('loading')
    try {
      const response = await fetch(`/api/account?locale=${locale}&recommendations=1`, { cache: 'no-store' })
      if (response.status === 401) {
        setProducts([])
        setRecommendations([])
        setViewState('unauthenticated')
        if (openDrawerOnUnauthorized) openLogin()
        return
      }

      if (!response.ok) {
        setRecommendations([])
        setViewState('error')
        return
      }

      const data = await response.json() as { favorites?: AccountProduct[]; recommendations?: CatalogProduct[] }
      setProducts(data.favorites ?? [])
      setRecommendations(data.recommendations ?? [])
      setViewState('ready')
      loginRequested.current = false
    } catch {
      setRecommendations([])
      setViewState('error')
    }
  }, [locale, openLogin])

  useEffect(() => {
    void loadFavorites(true)

    const handleAuthChanged = (event: Event) => {
      const user = (event as CustomEvent<{ user?: unknown | null }>).detail?.user
      loginRequested.current = false
      void loadFavorites(!user)
    }

    window.addEventListener('vz:auth-changed', handleAuthChanged)
    return () => window.removeEventListener('vz:auth-changed', handleAuthChanged)
  }, [loadFavorites])

  async function removeFavorite(productId: number) {
    if (removingId) return
    setRemovingId(productId)
    setActionError('')
    try {
      const response = await fetch('/api/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'favorite-toggle', productId, locale }),
      })
      if (response.ok) setProducts((current) => current.filter((product) => product.id !== productId))
      else if (response.status === 401) openLogin()
      else setActionError(text.loadError)
    } catch {
      setActionError(text.loadError)
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <main className="site-shell account-page favorites-page" aria-labelledby="favorites-title">
      <section className="account-page__heading">
        <div>
          <h1 id="favorites-title">{text.title}</h1>
          {viewState === 'ready' && products.length ? <p className="account-page__intro">{products.length} {text.saved}</p> : null}
        </div>
        <Link className="account-page__back" href="/ru/katalog">{text.continue}</Link>
      </section>

      <section className="favorites-page__content">
        {actionError ? <p className="account-page__error" role="alert">{actionError}</p> : null}
        {viewState === 'loading' ? <p className="account-page__empty">{text.loading}</p> : null}

        {viewState === 'unauthenticated' ? (
          <div className="favorites-page__locked">
            <p className="eyebrow">{text.auth}</p>
            <h2>{text.save}</h2>
            <p>{text.signIn}</p>
            <button className="button button-dark" type="button" onClick={openLogin}>{text.login}</button>
          </div>
        ) : null}

        {viewState === 'error' ? (
          <div className="favorites-page__locked">
            <p className="account-page__error" role="alert">{text.loadError}</p>
            <button className="button button-dark" type="button" onClick={() => void loadFavorites(true)}>{text.retry}</button>
          </div>
        ) : null}

        {viewState === 'ready' && products.length ? (
          <div className="account-favorites">
            {products.map((product) => {
              const catalogProduct: CatalogProduct = {
                id: product.id,
                title: product.title,
                brand: product.brand,
                category: null,
                sku: product.sku ?? '',
                image: product.image,
                volume: product.volume,
                price: product.price,
                discountPrice: product.discountPrice,
                locale,
                stock: 1,
              }
              return (
                <article className="account-favorite" key={product.id}>
                  <ProductCard product={catalogProduct} />
                  <button type="button" onClick={() => void removeFavorite(product.id)} disabled={removingId === product.id}>
                    {removingId === product.id ? text.removing : text.remove}
                  </button>
                </article>
              )
            })}
          </div>
        ) : null}

        {viewState === 'ready' && !products.length ? (
          <p className="account-page__empty">{text.empty}</p>
        ) : null}

        {viewState === 'ready' && recommendations.length ? (
          <section className="mt-16 border-t border-[#ededed] pt-10 sm:mt-24 sm:pt-14" aria-label={products.length ? text.similar : text.popular}>
            <ContentSlider
              label={products.length ? text.similar : text.popular}
              heading={<h2 className="m-0 text-2xl font-medium tracking-[-.035em] sm:text-4xl">{products.length ? text.similar : text.popular}</h2>}
              slideClassName="basis-[calc(50%_-_6px)] sm:basis-[calc(33.333%_-_12px)] lg:basis-[calc(25%_-_13.5px)]"
              trackClassName="pb-8 sm:gap-[18px]"
            >
              {recommendations.slice(0, 8).map((product) => <ProductCard key={product.id} product={product} />)}
            </ContentSlider>
          </section>
        ) : null}
      </section>
    </main>
  )
}
