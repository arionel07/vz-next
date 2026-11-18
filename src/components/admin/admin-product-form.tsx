'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent, type ReactNode } from 'react'
import { ArrowLeft, ImagePlus, Plus, Trash2, TriangleAlert } from 'lucide-react'
import { legacyAsset } from '@/lib/legacy-assets'

type ProductImage = { id: number; img: string; sorder: number; isShown: number }
type VariantImage = { id: number; img: string; sorder: number; isShown: number }
type ProductVariant = {
  id: number | null
  sku: string
  titleRu: string
  titleRo: string
  titleEn: string
  colorRu: string
  colorRo: string
  colorEn: string
  colorHex: string
  volume: string
  price: string
  discountPrice: string
  qty: string
  sorder: string
  isShown: boolean
  image: VariantImage | null
  imageFile?: File | null
}
type ProductCategory = { id: number; titleRu: string | null; titleRo: string | null }
type ProductBrand = { id: number; title: string | null }
type ProductRecord = {
  id: number
  sku: string
  titleRu: string | null
  titleRo: string
  titleEn: string
  descRu: string
  descRo: string
  descEn: string
  uriRu: string | null
  uriRo: string | null
  uriEn: string
  textRu: string | null
  textRo: string | null
  textEn: string
  searchTeg: string
  price: number | null
  discountPrice: number | null
  volume: string
  isShown: number | null
  isNew: number | null
  bestSelling: number
  isGift: number
  brandId: number | null
  seoTitleRu: string | null
  seoTitleRo: string | null
  seoTitleEn: string | null
  seoKeywordsRu: string | null
  seoKeywordsRo: string | null
  seoKeywordsEn: string | null
  seoDescRu: string | null
  seoDescRo: string | null
  seoDescEn: string | null
}

const inputClass = 'h-10 w-full rounded-lg border border-[#d9dcde] bg-white px-3 text-[12px] text-[#202223] outline-none transition focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 placeholder:text-[#969a9d]'
const labelClass = 'mb-1.5 block text-[11px] font-medium text-[#555a5e]'
const textareaClass = 'min-h-28 w-full resize-y rounded-lg border border-[#d9dcde] bg-white px-3 py-2.5 text-[12px] leading-5 text-[#202223] outline-none transition focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 placeholder:text-[#969a9d]'

function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return <label className={`block min-w-0 ${className}`}><span className={labelClass}>{label}</span>{children}</label>
}

function initialVariantOrder(variants: ProductVariant[]) {
  return variants.length ? Math.max(...variants.map((variant) => Number(variant.sorder) || 0)) + 1 : 1
}

export function AdminProductForm({
  product,
  categoryIds,
  categories,
  brands,
  images: initialImages,
  variants: initialVariants,
}: {
  product: ProductRecord | null
  categoryIds: number[]
  categories: ProductCategory[]
  brands: ProductBrand[]
  images: ProductImage[]
  variants: ProductVariant[]
}) {
  const router = useRouter()
  const [images, setImages] = useState(initialImages)
  const [variants, setVariants] = useState(initialVariants)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState(categoryIds)
  const [selectedBrandId, setSelectedBrandId] = useState(product?.brandId ?? 0)
  const [activePanel, setActivePanel] = useState<'product' | 'variants'>('product')
  const [variantView, setVariantView] = useState<'pages' | 'list'>('pages')
  const [variantPage, setVariantPage] = useState(0)
  const [activeVariantIndex, setActiveVariantIndex] = useState(0)
  const [pending, setPending] = useState(false)
  const [deletePending, setDeletePending] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const isEditing = Boolean(product)

  function updateImage(id: number, patch: Partial<ProductImage>) {
    setImages((current) => current.map((image) => image.id === id ? { ...image, ...patch } : image))
  }

  function updateVariant<K extends keyof ProductVariant>(index: number, field: K, value: ProductVariant[K]) {
    setVariants((current) => current.map((variant, currentIndex) => currentIndex === index ? { ...variant, [field]: value } : variant))
  }

  function addVariant() {
    const index = variants.length
    setVariants((current) => [...current, {
      id: null,
      sku: '', titleRu: '', titleRo: '', titleEn: '',
      colorRu: '', colorRo: '', colorEn: '', colorHex: '',
      volume: '', price: '', discountPrice: '', qty: '0',
      sorder: String(initialVariantOrder(current)), isShown: true, image: null, imageFile: null,
    }])
    setVariantPage(Math.floor(index / 10))
    setActiveVariantIndex(index)
    setActivePanel('variants')
  }

  function removeVariant(index: number) {
    const variant = variants[index]
    setVariants((current) => {
      if (variant?.id) return current.map((item, currentIndex) => currentIndex === index ? { ...item, isShown: false } : item)
      return current.filter((_, currentIndex) => currentIndex !== index)
    })
    if (!variant?.id) {
      const nextIndex = Math.min(activeVariantIndex, Math.max(0, variants.length - 2))
      setActiveVariantIndex(nextIndex)
      setVariantPage(Math.floor(nextIndex / 10))
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError('')
    setNotice('')
    const form = event.currentTarget
    const body = new FormData(form)
    for (const key of ['isShown', 'isNew', 'bestSelling', 'isGift']) {
      if (!body.has(key)) body.set(key, '0')
    }
    body.set('gallery', JSON.stringify(images.map(({ id, sorder, isShown }) => ({ id, sorder, isShown }))))
    body.set('variants', JSON.stringify(variants.map(({ image, imageFile, ...variant }) => variant)))
    variants.forEach((variant, index) => {
      if (variant.imageFile) body.set(`variantImage_${index}`, variant.imageFile)
    })

    try {
      const response = await fetch(isEditing ? `/api/admin/products?id=${product!.id}` : '/api/admin/products', {
        method: isEditing ? 'PATCH' : 'POST',
        body,
      })
      const result = await response.json().catch(() => null) as { id?: number; message?: string } | null
      if (!response.ok) throw new Error(result?.message ?? 'Не удалось сохранить товар.')
      setNotice('Товар сохранён.')
      if (!isEditing && result?.id) router.replace(`/admin/products/${result.id}`)
      router.refresh()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Не удалось сохранить товар.')
    } finally {
      setPending(false)
    }
  }

  async function deleteProduct() {
    if (!product) return
    setDeletePending(true)
    setError('')
    try {
      const response = await fetch('/api/admin/products', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [product.id] }),
      })
      const result = await response.json().catch(() => null) as { message?: string } | null
      if (!response.ok) throw new Error(result?.message ?? 'Не удалось удалить товар.')
      router.replace('/admin/products')
      router.refresh()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Не удалось удалить товар.')
    } finally {
      setDeletePending(false)
    }
  }

  const hasSelectedCategory = selectedCategoryIds.some((id) => categories.some((category) => category.id === id))
  const hasSelectedBrand = selectedBrandId > 0 && brands.some((brand) => brand.id === selectedBrandId)
  const missingFields = [
    hasSelectedCategory ? '' : 'категория',
    hasSelectedBrand ? '' : 'бренд',
  ].filter(Boolean)
  const variantPageCount = Math.max(1, Math.ceil(variants.length / 10))
  const visibleVariantStart = variantPage * 10
  const visibleVariants = variants.slice(visibleVariantStart, visibleVariantStart + 10)
  const variantIndexesToRender = variantView === 'list'
    ? variants.map((_, index) => index)
    : variants[activeVariantIndex] ? [activeVariantIndex] : []

  return (
    <form className="space-y-5 pb-20" onSubmit={submit}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link aria-label="Вернуться к товарам" className="grid size-9 place-items-center rounded-lg border border-[#d9dcde] bg-white text-[#4d5357] transition hover:border-[#007AFF] hover:text-[#0062CC]" href="/admin/products"><ArrowLeft aria-hidden="true" size={16} /></Link>
          <div>
            <p className="mb-1 text-[10px] font-semibold tracking-[0.1em] text-[#777b7e] uppercase">Магазин · Товары</p>
            <h1 className="text-[23px] leading-tight font-semibold tracking-[-0.03em] text-[#202223] sm:text-[28px]">{isEditing ? product?.titleRu || `Товар #${product?.id}` : 'Новый товар'}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? <button className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#ead7a0] bg-[#fff8db] px-3 text-[11px] font-medium text-[#765b13] transition hover:bg-[#fff1b8] disabled:opacity-60" disabled={pending || deletePending} onClick={() => { setError(''); setConfirmDelete(true) }} type="button"><Trash2 aria-hidden="true" size={14} /> Удалить товар</button> : null}
          <button className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#202223] px-4 text-[12px] font-medium text-white transition hover:bg-[#383b3e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007AFF] disabled:cursor-wait disabled:opacity-60" disabled={pending || deletePending} type="submit">{pending ? 'Сохраняем…' : 'Сохранить товар'}</button>
        </div>
      </header>

      {error ? <p aria-live="assertive" className="rounded-lg bg-[#fff0f0] px-3 py-2.5 text-[12px] text-[#a1262e]" role="alert">{error}</p> : null}
      {notice ? <p aria-live="polite" className="rounded-lg bg-[#eef8f1] px-3 py-2.5 text-[12px] text-[#24713b]">{notice}</p> : null}
      {missingFields.length ? <div className="flex items-start gap-2.5 rounded-xl border border-[#eedb98] bg-[#fff8db] px-3.5 py-3 text-[11px] text-[#725913]" role="status"><TriangleAlert aria-hidden="true" className="mt-0.5 shrink-0" size={15} /><span><strong className="font-semibold">Не хватает данных:</strong> {missingFields.join(', ')}. Заполните их, чтобы карточка товара была полной.</span></div> : null}

      <nav aria-label="Разделы товара" className="flex w-fit max-w-full gap-1 rounded-xl border border-[#e2e4e6] bg-[#f7f8f9] p-1">
        <button aria-current={activePanel === 'product' ? 'page' : undefined} className={`h-9 rounded-lg px-3 text-[11px] font-medium transition ${activePanel === 'product' ? 'bg-white text-[#202223] shadow-sm' : 'text-[#666b6f] hover:text-[#202223]'}`} onClick={() => setActivePanel('product')} type="button">Основной товар</button>
        <button aria-current={activePanel === 'variants' ? 'page' : undefined} className={`h-9 rounded-lg px-3 text-[11px] font-medium transition ${activePanel === 'variants' ? 'bg-white text-[#202223] shadow-sm' : 'text-[#666b6f] hover:text-[#202223]'}`} onClick={() => setActivePanel('variants')} type="button">Варианты <span className="ml-1 text-[10px] text-[#83888b]">{variants.length}</span></button>
      </nav>

      <div className={activePanel === 'product' ? 'grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]' : 'block'}>
        <div className={`space-y-5 ${activePanel === 'product' ? '' : 'hidden'}`}>
          <section className="space-y-4 rounded-2xl border border-[#e4e6e8] bg-white p-4 sm:p-5">
            <div><h2 className="text-[15px] font-medium text-[#202223]">Основная информация</h2><p className="mt-1 text-[11px] text-[#777b7e]">Названия для карточки и страницы товара на русском и румынском.</p></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Артикул / SKU *"><input className={inputClass} defaultValue={product?.sku ?? ''} maxLength={128} name="sku" required /></Field>
              <Field label="Бренд"><select className={inputClass} name="brandId" onChange={(event) => setSelectedBrandId(Number(event.target.value))} value={selectedBrandId}><option value={0}>Без бренда</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.title || `Бренд #${brand.id}`}</option>)}</select></Field>
              <Field className="sm:col-span-2" label="Название RU *"><input className={inputClass} defaultValue={product?.titleRu ?? ''} maxLength={256} name="titleRu" required /></Field>
              <Field label="Название RO"><input className={inputClass} defaultValue={product?.titleRo ?? ''} maxLength={255} name="titleRo" /></Field>
              <Field label="Название EN"><input className={inputClass} defaultValue={product?.titleEn ?? ''} maxLength={255} name="titleEn" /></Field>
              <Field label="Адрес RU"><input className={inputClass} defaultValue={product?.uriRu ?? ''} maxLength={256} name="uriRu" placeholder="Создастся из названия" /></Field>
              <Field label="Адрес RO"><input className={inputClass} defaultValue={product?.uriRo ?? ''} maxLength={256} name="uriRo" placeholder="Создастся из названия" /></Field>
              <Field label="Адрес EN"><input className={inputClass} defaultValue={product?.uriEn ?? ''} maxLength={255} name="uriEn" placeholder="Создастся из названия" /></Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Короткое описание RU"><input className={inputClass} defaultValue={product?.descRu ?? ''} maxLength={255} name="descRu" /></Field>
              <Field label="Короткое описание RO"><input className={inputClass} defaultValue={product?.descRo ?? ''} maxLength={255} name="descRo" /></Field>
              <Field label="Короткое описание EN"><input className={inputClass} defaultValue={product?.descEn ?? ''} maxLength={255} name="descEn" /></Field>
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-[#e4e6e8] bg-white p-4 sm:p-5">
            <div><h2 className="text-[15px] font-medium text-[#202223]">Описание товара</h2><p className="mt-1 text-[11px] text-[#777b7e]">Сохраняется в формате, который уже использует витрина.</p></div>
            <div className="grid gap-3 lg:grid-cols-2">
              <Field label="Текст RU"><textarea className={textareaClass} defaultValue={product?.textRu ?? ''} name="textRu" /></Field>
              <Field label="Текст RO"><textarea className={textareaClass} defaultValue={product?.textRo ?? ''} name="textRo" /></Field>
              <Field className="lg:col-span-2" label="Текст EN"><textarea className={textareaClass} defaultValue={product?.textEn ?? ''} name="textEn" /></Field>
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-[#e4e6e8] bg-white p-4 sm:p-5">
            <div><h2 className="text-[15px] font-medium text-[#202223]">SEO</h2><p className="mt-1 text-[11px] text-[#777b7e]">SEO-заголовки и описания для русской и румынской версий.</p></div>
            <div className="grid gap-4 xl:grid-cols-2">
              {(['Ru', 'Ro'] as const).map((language) => <div className="space-y-3" key={language}>
                <p className="text-[10px] font-semibold tracking-[0.08em] text-[#777b7e]">{language.toUpperCase()}</p>
                <Field label="SEO-заголовок"><input className={inputClass} defaultValue={product?.[`seoTitle${language}`] ?? ''} maxLength={250} name={`seoTitle${language}`} /></Field>
                <Field label="SEO-описание"><textarea className={textareaClass} defaultValue={product?.[`seoDesc${language}`] ?? ''} name={`seoDesc${language}`} /></Field>
              </div>)}
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-[#e4e6e8] bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h2 className="text-[15px] font-medium text-[#202223]">Фотографии</h2><p className="mt-1 text-[11px] text-[#777b7e]">Галерея товара. JPG, PNG, WebP или AVIF, до 2 МБ на файл.</p></div>
              <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-[#d9dcde] bg-white px-3 text-[11px] font-medium text-[#45494c] transition hover:border-[#007AFF] hover:text-[#0062CC]">
                <ImagePlus aria-hidden="true" size={15} /> Добавить фото
                <input accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" multiple name="images" type="file" />
              </label>
            </div>
            {images.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{images.map((image) => <article className={`rounded-xl border p-2 ${image.isShown === 1 ? 'border-[#e3e5e7]' : 'border-dashed border-[#c8cccf] opacity-65'}`} key={image.id}>
              <div className="relative aspect-square overflow-hidden rounded-lg bg-[#f2f2f2]">{image.img ? <Image alt="" className="object-contain mix-blend-multiply" fill sizes="(max-width: 640px) 45vw, 180px" src={legacyAsset(image.img, 'products')!} unoptimized /> : null}</div>
              <p className="mt-2 truncate text-[9px] text-[#777b7e]">{image.img}</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <label className="flex items-center gap-1.5 text-[10px] text-[#555a5e]"><input checked={image.isShown === 1} onChange={(event) => updateImage(image.id, { isShown: event.target.checked ? 1 : 0 })} type="checkbox" /> Показывать</label>
                <input aria-label="Порядок фотографии" className="h-7 w-14 rounded-md border border-[#d9dcde] px-1 text-center text-[10px] outline-none focus:border-[#007AFF]" min={0} onChange={(event) => updateImage(image.id, { sorder: Number(event.target.value) || 0 })} type="number" value={image.sorder} />
              </div>
            </article>)}</div> : <div className="grid min-h-32 place-items-center rounded-xl border border-dashed border-[#ead68e] bg-[#fff8db] px-4 text-center"><div><ImagePlus aria-hidden="true" className="mx-auto text-[#94721b]" size={21} /><p className="mt-2 text-[11px] font-medium text-[#765b13]">У товара нет фото</p><p className="mt-1 text-[10px] text-[#806d3a]">Добавьте изображения в галерею товара.</p></div></div>}
          </section>
        </div>

        <div className={`space-y-5 ${activePanel === 'variants' ? '' : 'hidden'}`}>
          <section className="space-y-4 rounded-2xl border border-[#e4e6e8] bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-[15px] font-medium text-[#202223]">Варианты</h2><p className="mt-1 text-[11px] text-[#777b7e]">Объёмы, оттенки, цены, фото и видимость. Складские значения здесь не редактируются.</p></div><button className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#d9dcde] px-3 text-[10px] font-medium text-[#45494c] hover:border-[#007AFF] hover:text-[#0062CC]" onClick={addVariant} type="button"><Plus size={14} /> Добавить вариант</button></div>
            {variants.length ? <>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#f7f8f9] px-3 py-2">
                <p className="text-[10px] text-[#666b6f]">{variantView === 'list' ? `Все варианты · ${variants.length}` : `Показаны варианты ${visibleVariantStart + 1}–${Math.min(visibleVariantStart + 10, variants.length)} из ${variants.length}`}</p>
                <div aria-label="Режим отображения вариантов" className="inline-flex rounded-lg border border-[#d9dcde] bg-white p-0.5">
                  <button aria-pressed={variantView === 'pages'} className={`h-7 rounded-md px-2.5 text-[10px] transition ${variantView === 'pages' ? 'bg-[#202223] text-white' : 'text-[#555a5e] hover:text-[#202223]'}`} onClick={() => setVariantView('pages')} type="button">Страницы</button>
                  <button aria-pressed={variantView === 'list'} className={`h-7 rounded-md px-2.5 text-[10px] transition ${variantView === 'list' ? 'bg-[#202223] text-white' : 'text-[#555a5e] hover:text-[#202223]'}`} onClick={() => setVariantView('list')} type="button">Список</button>
                </div>
              </div>
              {variantView === 'pages' ? <>
                <nav aria-label="Страницы вариантов" className="flex flex-wrap gap-1.5">
                  {Array.from({ length: variantPageCount }, (_, page) => <button aria-current={variantPage === page ? 'page' : undefined} aria-label={`Страница вариантов ${page + 1}`} className={`grid size-8 place-items-center rounded-lg border text-[10px] transition ${variantPage === page ? 'border-[#202223] bg-[#202223] text-white' : 'border-[#d9dcde] bg-white text-[#45494c] hover:border-[#007AFF]'}`} key={page} onClick={() => { setVariantPage(page); setActiveVariantIndex(Math.min(page * 10, variants.length - 1)) }} type="button">{page + 1}</button>)}
                </nav>
                <div aria-label="Выберите вариант" className="flex gap-1.5 overflow-x-auto pb-1">
                  {visibleVariants.map((variant, offset) => {
                    const index = visibleVariantStart + offset
                    const title = variant.volume || variant.colorRu || variant.sku || `Вариант ${index + 1}`
                    return <button aria-current={activeVariantIndex === index ? 'true' : undefined} className={`min-w-9 max-w-36 truncate rounded-lg border px-2.5 py-2 text-[10px] transition ${activeVariantIndex === index ? 'border-[#202223] bg-[#202223] text-white' : 'border-[#dfe2e4] bg-white text-[#45494c] hover:border-[#007AFF]'}`} key={variant.id ?? `new-${index}`} onClick={() => setActiveVariantIndex(index)} title={title} type="button">{index + 1}. {title}</button>
                  })}
                </div>
              </> : null}
              <div className={variantView === 'list' ? 'space-y-3' : ''}>
                {variantIndexesToRender.map((index) => {
                  const variant = variants[index]
                  if (!variant) return null
                  return <article className={`rounded-xl border p-3 ${variant.isShown ? 'border-[#e3e5e7]' : 'border-dashed border-[#d9dcde] bg-[#fafafa]'}`} key={variant.id ?? `new-${index}`}>
                    <header className="mb-3 flex items-center justify-between"><p className="text-[11px] font-medium text-[#303438]">Вариант {index + 1}{variant.id ? <span className="ml-1 font-normal text-[#8a8f92]">· #{variant.id}</span> : <span className="ml-1 font-normal text-[#0062CC]">· новый</span>}</p><button aria-label={variant.id ? 'Скрыть вариант' : 'Удалить новый вариант'} className="grid size-7 place-items-center rounded-lg text-[#72777a] hover:bg-[#fff0f0] hover:text-[#a1262e]" onClick={() => removeVariant(index)} type="button"><Trash2 size={14} /></button></header>
                    <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                      <Field label="SKU варианта"><input className={inputClass} maxLength={32} onChange={(event) => updateVariant(index, 'sku', event.target.value)} value={variant.sku} /></Field>
                      <Field label="Объём / название варианта"><input className={inputClass} maxLength={254} onChange={(event) => updateVariant(index, 'volume', event.target.value)} value={variant.volume} /></Field>
                      <Field label="Название / оттенок RU"><input className={inputClass} maxLength={254} onChange={(event) => updateVariant(index, 'colorRu', event.target.value)} value={variant.colorRu} /></Field>
                      <Field label="Название / оттенок RO"><input className={inputClass} maxLength={254} onChange={(event) => updateVariant(index, 'colorRo', event.target.value)} value={variant.colorRo} /></Field>
                      <Field label="HEX-цвет"><input className={inputClass} maxLength={7} onChange={(event) => updateVariant(index, 'colorHex', event.target.value)} placeholder="#D9A273" value={variant.colorHex} /></Field>
                      <Field label="Цена"><input className={inputClass} min={0} onChange={(event) => updateVariant(index, 'price', event.target.value)} step="0.01" type="number" value={variant.price} /></Field>
                      <Field label="Цена со скидкой"><input className={inputClass} min={0} onChange={(event) => updateVariant(index, 'discountPrice', event.target.value)} step="0.01" type="number" value={variant.discountPrice} /></Field>
                      <Field label="Порядок"><input className={inputClass} min={0} onChange={(event) => updateVariant(index, 'sorder', event.target.value)} type="number" value={variant.sorder} /></Field>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-[120px_minmax(0,1fr)] sm:items-end">
                      <div className="relative grid aspect-square w-full max-w-[120px] place-items-center overflow-hidden rounded-lg bg-[#f2f2f2]">{variant.image?.img ? <Image alt="" className="object-contain mix-blend-multiply" fill sizes="120px" src={legacyAsset(variant.image.img, 'products')!} unoptimized /> : variant.imageFile ? <ImagePlus aria-hidden="true" className="text-[#007AFF]" size={22} /> : <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-[#fff5c2] text-center text-[9px] text-[#765b13]"><ImagePlus aria-hidden="true" size={18} /><span>Нет фото</span></div>}</div>
                      <Field label="Отдельное фото варианта"><input accept="image/jpeg,image/png,image/webp,image/avif" className="block h-10 w-full rounded-lg border border-[#d9dcde] bg-white px-2 py-2 text-[10px] text-[#555a5e] file:mr-2 file:rounded-md file:border-0 file:bg-[#f2f3f4] file:px-2 file:py-1 file:text-[10px]" onChange={(event) => updateVariant(index, 'imageFile', event.currentTarget.files?.[0] ?? null)} type="file" />{variant.imageFile ? <span className="mt-1 block truncate text-[9px] text-[#666b6f]">Выбрано: {variant.imageFile.name}</span> : variant.image?.img ? <span className="mt-1 block truncate text-[9px] text-[#777b7e]">Текущее фото: {variant.image.img}</span> : null}</Field>
                    </div>
                    <label className="mt-3 inline-flex items-center gap-2 text-[10px] text-[#555a5e]"><input checked={variant.isShown} onChange={(event) => updateVariant(index, 'isShown', event.target.checked)} type="checkbox" /> Показывать вариант на сайте</label>
                  </article>
                })}
              </div>
            </> : <p className="rounded-xl bg-[#f7f7f7] px-3 py-8 text-center text-[11px] text-[#777b7e]">У товара пока нет вариантов.</p>}
          </section>
        </div>

        <aside className={`space-y-5 xl:sticky xl:top-20 ${activePanel === 'product' ? '' : 'hidden'}`}>
          <section className="space-y-4 rounded-2xl border border-[#e4e6e8] bg-white p-4 sm:p-5">
            <div><h2 className="text-[15px] font-medium text-[#202223]">Публикация</h2><p className="mt-1 text-[11px] text-[#777b7e]">Состояние и подборки витрины.</p></div>
            {[['isShown', 'Показывать на сайте', !product || product.isShown === 1], ['isNew', 'Новинка', product?.isNew === 1], ['bestSelling', 'Хит продаж', product?.bestSelling === 1], ['isGift', 'Подарок для акции', product?.isGift === 1]].map(([name, label, checked]) => <label className="flex items-center justify-between gap-3 border-t border-[#eef0f1] pt-3 text-[11px] text-[#34383b]" key={String(name)}><span>{String(label)}</span><input className="size-4 accent-[#007AFF]" defaultChecked={Boolean(checked)} name={String(name)} type="checkbox" value="1" /></label>)}
            <p className="rounded-lg bg-[#f7f8f9] p-2.5 text-[10px] leading-4 text-[#73787b]">Подарочные товары автоматически скрываются из обычного каталога.</p>
          </section>

          <section className="space-y-4 rounded-2xl border border-[#e4e6e8] bg-white p-4 sm:p-5">
            <div><h2 className="text-[15px] font-medium text-[#202223]">Цена и объём</h2><p className="mt-1 text-[11px] text-[#777b7e]">Основная цена используется, если у товара нет выбранного варианта.</p></div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <Field label="Цена"><input className={inputClass} defaultValue={product?.price ?? ''} min={0} name="price" step="0.01" type="number" /></Field>
              <Field label="Цена со скидкой"><input className={inputClass} defaultValue={product?.discountPrice ?? ''} min={0} name="discountPrice" step="0.01" type="number" /></Field>
              <Field label="Объём"><input className={inputClass} defaultValue={product?.volume ?? ''} maxLength={32} name="volume" placeholder="Например, 30 мл" /></Field>
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border border-[#e4e6e8] bg-white p-4 sm:p-5">
            <div><h2 className="text-[15px] font-medium text-[#202223]">Категории</h2><p className="mt-1 text-[11px] text-[#777b7e]">Можно выбрать несколько. Первая будет основной.</p></div>
            <div className="max-h-72 space-y-1 overflow-y-auto pr-1">{categories.map((category) => <label className="flex min-h-8 items-center gap-2 rounded-lg px-2 text-[11px] text-[#45494c] hover:bg-[#f7f8f9]" key={category.id}><input checked={selectedCategoryIds.includes(category.id)} className="size-3.5 accent-[#007AFF]" name="categoryIds" onChange={(event) => setSelectedCategoryIds((current) => event.target.checked ? [...new Set([...current, category.id])] : current.filter((id) => id !== category.id))} type="checkbox" value={category.id} /><span className="min-w-0 truncate">{category.titleRu || category.titleRo || `Категория #${category.id}`}</span></label>)}</div>
          </section>

          <section className="space-y-3 rounded-2xl border border-[#e4e6e8] bg-white p-4 sm:p-5">
            <div><h2 className="text-[15px] font-medium text-[#202223]">Поиск</h2><p className="mt-1 text-[11px] text-[#777b7e]">Дополнительные слова для поиска товара.</p></div>
            <Field label="Теги поиска"><input className={inputClass} defaultValue={product?.searchTeg ?? ''} name="searchTeg" placeholder="Название, бренд, синонимы" /></Field>
          </section>
        </aside>
      </div>
      <div className="fixed right-0 bottom-0 left-0 z-20 border-t border-[#dfe2e4] bg-white/95 px-4 py-3 backdrop-blur sm:px-6 lg:left-[256px]">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3"><span className="hidden text-[10px] text-[#777b7e] sm:block">Изменения вступят в силу после сохранения.</span><div className="ml-auto flex gap-2"><Link className="inline-flex h-9 items-center rounded-lg border border-[#d9dcde] px-3 text-[11px] font-medium text-[#45494c] hover:bg-[#f7f7f7]" href="/admin/products">Отмена</Link><button className="inline-flex h-9 items-center rounded-lg bg-[#202223] px-4 text-[11px] font-medium text-white hover:bg-[#383b3e] focus-visible:outline-2 focus-visible:outline-[#007AFF] disabled:opacity-60" disabled={pending || deletePending} type="submit">{pending ? 'Сохраняем…' : 'Сохранить товар'}</button></div></div>
      </div>

      {confirmDelete ? <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !deletePending) setConfirmDelete(false) }}>
        <section aria-labelledby="delete-product-title" aria-modal="true" className="w-full max-w-md rounded-2xl border border-[#e2e4e6] bg-white p-5 shadow-2xl" role="alertdialog">
          <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#fff5c2] text-[#765b13]"><TriangleAlert aria-hidden="true" size={17} /></span><div><h2 className="text-[15px] font-semibold text-[#202223]" id="delete-product-title">Удалить товар?</h2><p className="mt-1 text-[11px] leading-5 text-[#62676b]">«{product?.titleRu || `Товар #${product?.id}`}» будет удалён из каталога и активных корзин. Если товар уже есть в заказах или используется как подарок, система сохранит его и покажет причину.</p></div></div>
          {error ? <p aria-live="assertive" className="mt-4 rounded-lg bg-[#fff0f0] px-3 py-2.5 text-[11px] text-[#a1262e]" role="alert">{error}</p> : null}
          <div className="mt-5 flex justify-end gap-2"><button className="h-9 rounded-lg border border-[#d9dcde] px-3 text-[11px] font-medium text-[#45494c] hover:bg-[#f7f8f9] disabled:opacity-50" disabled={deletePending} onClick={() => setConfirmDelete(false)} type="button">Отмена</button><button className="h-9 rounded-lg bg-[#a1262e] px-4 text-[11px] font-medium text-white hover:bg-[#891f26] disabled:cursor-wait disabled:opacity-60" disabled={deletePending} onClick={deleteProduct} type="button">{deletePending ? 'Удаляем…' : 'Удалить товар'}</button></div>
        </section>
      </div> : null}
    </form>
  )
}
