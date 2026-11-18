import { AdminLoginForm } from '@/components/admin/admin-login-form'
import Image from 'next/image'

export const metadata = {
  title: 'Вход в админ-панель | VIZAJE-NICA',
  robots: { index: false, follow: false },
}

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-white px-5 py-10 text-[#202223]">
      <div className="w-full max-w-[420px]">
        <div className="mb-9 flex justify-center sm:mb-10">
          <Image
            alt="Vizaje-Nica"
            className="h-7 w-[160px] object-contain"
            height={42}
            priority
            src="/legacy-assets/app/img/next/header/logo_v.webp"
            unoptimized
            width={250}
          />
        </div>
        <h1 className="mb-8 text-center text-[30px] leading-tight font-medium tracking-[-0.025em] sm:mb-9 sm:text-[32px]">
          С возвращением
        </h1>
        <AdminLoginForm />
      </div>
    </main>
  )
}
