export type ToastTone = 'success' | 'info' | 'error'
export type ToastKind = 'default' | 'cart' | 'favorite'

export type ToastProduct = {
  title: string
  brand?: string | null
  variantLabel?: string | null
  price?: number | null
  image?: string | null
}

export type ToastDetail = {
  id?: string
  message: string
  tone?: ToastTone
  kind?: ToastKind
  product?: ToastProduct
}

export function showToast(message: string, tone: ToastTone = 'success') {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<ToastDetail>('vz:toast', {
    detail: { message, tone },
  }))
}

export function showCartToast(product: ToastProduct) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<ToastDetail>('vz:toast', {
    detail: { kind: 'cart', message: product.title, product },
  }))
}

export function showFavoriteToast(product: Pick<ToastProduct, 'title' | 'image'>) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<ToastDetail>('vz:toast', {
    detail: { kind: 'favorite', message: product.title, product },
  }))
}
