'use client'

import { Check, LoaderCircle, Save } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

type CustomerEditorValues = {
  id: number
  name: string
  surname: string
  email: string
  phone: string
  address: string
  city: string
  house: string
  apartament: string
  porch: string
  active: number
  isb2B: number
  isCreator: number
}

const inputClass = 'h-10 w-full rounded-xl border border-[#dfe2e4] bg-white px-3 text-[12px] text-[#202223] outline-none transition-colors placeholder:text-[#969a9d] focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15'

function Field({ label, name, defaultValue, type = 'text' }: { label: string; name: string; defaultValue: string; type?: string }) {
  const maxLength = name === 'name' ? 255 : name === 'email' ? 255 : name === 'address' ? 254 : ['city', 'house', 'apartament', 'porch'].includes(name) ? 64 : 256
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-[10px] font-medium text-[#6e7376]">{label}</span>
      <input autoComplete="off" className={inputClass} defaultValue={defaultValue} maxLength={maxLength} name={name} type={type} />
    </label>
  )
}

function Toggle({ label, name, defaultChecked, description }: { label: string; name: string; defaultChecked: boolean; description: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-[#e5e7e9] bg-white px-3.5 py-3">
      <span>
        <span className="block text-[11px] font-medium text-[#303438]">{label}</span>
        <span className="mt-0.5 block text-[10px] leading-4 text-[#777b7e]">{description}</span>
      </span>
      <input className="mt-0.5 size-4 shrink-0 accent-[#007AFF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007AFF]" defaultChecked={defaultChecked} name={name} type="checkbox" />
    </label>
  )
}

export function AdminCustomerEditor({ customer }: { customer: CustomerEditorValues }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError('')
    setSaved(false)

    const form = new FormData(event.currentTarget)
    const body = {
      name: String(form.get('name') ?? ''),
      surname: String(form.get('surname') ?? ''),
      email: String(form.get('email') ?? ''),
      phone: String(form.get('phone') ?? ''),
      address: String(form.get('address') ?? ''),
      city: String(form.get('city') ?? ''),
      house: String(form.get('house') ?? ''),
      apartament: String(form.get('apartament') ?? ''),
      porch: String(form.get('porch') ?? ''),
      active: form.has('active') ? 1 : 0,
      isb2B: form.has('isb2B') ? 1 : 0,
      isCreator: form.has('isCreator') ? 1 : 0,
    }

    try {
      const response = await fetch(`/api/admin/customers/${customer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const result = await response.json().catch(() => null) as { message?: string } | null
      if (!response.ok) throw new Error(result?.message ?? 'Не удалось сохранить клиента.')
      setSaved(true)
      router.refresh()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Не удалось сохранить клиента.')
    } finally {
      setPending(false)
    }
  }

  return (
    <form className="space-y-5" onSubmit={save}>
      <section className="rounded-2xl border border-[#e2e4e6] bg-white p-4 sm:p-5">
        <div className="mb-4">
          <h2 className="text-[14px] font-semibold text-[#202223]">Контактные данные</h2>
          <p className="mt-1 text-[10px] leading-4 text-[#777b7e]">Эти данные используются для связи с покупателем и оформления заказов.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field defaultValue={customer.name} label="Имя" name="name" />
          <Field defaultValue={customer.surname} label="Фамилия" name="surname" />
          <Field defaultValue={customer.phone} label="Телефон" name="phone" type="tel" />
          <Field defaultValue={customer.email} label="Email" name="email" type="email" />
        </div>
      </section>

      <section className="rounded-2xl border border-[#e2e4e6] bg-white p-4 sm:p-5">
        <div className="mb-4">
          <h2 className="text-[14px] font-semibold text-[#202223]">Адрес</h2>
          <p className="mt-1 text-[10px] leading-4 text-[#777b7e]">Сохранённый адрес доставки из профиля клиента.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field defaultValue={customer.city} label="Город" name="city" />
          <Field defaultValue={customer.address} label="Улица / адрес" name="address" />
          <Field defaultValue={customer.house} label="Дом" name="house" />
          <Field defaultValue={customer.porch} label="Подъезд" name="porch" />
          <Field defaultValue={customer.apartament} label="Квартира" name="apartament" />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Toggle defaultChecked={customer.active === 1} description="Разрешает клиенту пользоваться аккаунтом." label="Аккаунт активен" name="active" />
        <Toggle defaultChecked={customer.isb2B === 1} description="Для клиента применяются условия B2B." label="B2B-клиент" name="isb2B" />
        <Toggle defaultChecked={customer.isCreator === 1} description="Доступ к функциям криэйтора/партнёра." label="Криэйтор" name="isCreator" />
      </section>

      {error ? <p aria-live="assertive" className="rounded-xl border border-[#8e1f2d]/20 bg-[#8e1f2d]/5 px-3.5 py-2.5 text-[11px] text-[#8e1f2d]" role="alert">{error}</p> : null}
      {saved ? <p aria-live="polite" className="flex items-center gap-2 rounded-xl border border-[#d9e9dc] bg-[#f2f8f3] px-3.5 py-2.5 text-[11px] text-[#28623a]" role="status"><Check aria-hidden="true" size={14} />Изменения сохранены.</p> : null}

      <div className="flex justify-end">
        <button className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#202223] px-4 text-[11px] font-medium text-white transition-colors hover:bg-[#383b3e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007AFF] disabled:cursor-wait disabled:opacity-60" disabled={pending} type="submit">
          {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" size={15} /> : <Save aria-hidden="true" size={15} />}
          {pending ? 'Сохраняем…' : 'Сохранить изменения'}
        </button>
      </div>
    </form>
  )
}
