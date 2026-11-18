import { LocalizedLink as Link } from '@/components/site/localized-link'
import { ArrowRight } from 'lucide-react'
import { connection } from 'next/server'

import type { HomeBrandSection } from '@/lib/home'
import { getHomeData } from '@/lib/home'
import type { StoreLocale } from '@/lib/locale-routing'
import { legacyAsset } from '@/lib/legacy-assets'

import { ContentSlider } from './content-slider'
import { HomeBonusAction } from './home-bonus-action'
import { HomeHero } from './home-hero'
import { HomeProductSection } from './home-product-section'
import { ProductCard } from './product-card'

const editorialContainer = 'mx-auto w-[min(calc(100%-48px),1352px)] max-[767px]:w-full'
const textLink = 'inline-flex items-center gap-2 border-b border-midnight-ink pb-1 text-[13px] font-medium tracking-[.05em] text-midnight-ink uppercase transition-colors hover:border-hover-cream hover:text-hover-cream focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-4'
const actionButton = 'flex min-h-[50px] w-full items-center justify-center rounded-lg border border-[#111111] bg-[#111111] px-5 text-[11px] font-semibold tracking-[.08em] text-white uppercase transition-colors hover:border-hover-cream hover:bg-button-hover hover:text-midnight-ink focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-4 motion-reduce:transition-none'

function EditorialMarquee({ children }: { children: string }) {
  return (
    <div className="relative z-[1] mb-[clamp(-38px,-2.6vw,-18px)] flex h-[clamp(54px,8.5vw,122px)] w-full items-center justify-center overflow-hidden text-white pointer-events-none max-[767px]:mb-[-6px] max-[767px]:h-12 max-[767px]:justify-start">
      <p className="m-0 flex h-full w-max max-w-none items-center whitespace-nowrap text-[clamp(38px,7.4vw,106px)] leading-none font-normal tracking-[-.045em] text-transparent italic [-webkit-text-stroke:1px_#171717] max-[767px]:text-[33px] max-[767px]:[-webkit-text-stroke-width:.8px]">{children}</p>
    </div>
  )
}

function HomeBrandShowcase({ section, locale }: { section: HomeBrandSection; locale: StoreLocale }) {
  const bannerClassName = 'group mx-auto mb-[22px] block aspect-[1260/503] w-full max-w-[1260px] overflow-hidden rounded-[24px] bg-mist max-[767px]:aspect-[1.25/1] max-[767px]:rounded-xl'
  const bannerContent = section.image ? (
    <picture className="block size-full">
      {section.mobileImage ? <source media="(max-width: 767px)" srcSet={legacyAsset(section.mobileImage, 'home_brand_sections') ?? undefined} /> : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="size-full object-cover object-center transition-transform duration-700 group-hover:scale-[1.02] motion-reduce:transition-none" src={legacyAsset(section.image, 'home_brand_sections') ?? ''} alt={section.title} loading="lazy" />
    </picture>
  ) : null
  const banner = bannerContent ? (
    section.url === '#'
      ? <div className={bannerClassName}>{bannerContent}</div>
      : <Link className={bannerClassName} href={section.url} aria-label={section.title}>{bannerContent}</Link>
  ) : null

  return (
    <section className="w-full overflow-hidden bg-white py-[72px] pb-24 text-midnight-ink max-[767px]:py-10 max-[767px]:pb-14" aria-labelledby={`home-brand-${section.id}`}>
      <ContentSlider
        label={locale === 'ro' ? `Produsele brandului ${section.title}` : `Товары бренда ${section.title}`}
        variant="home"
        scrollStep="page"
        middleSlideClassName="min-[768px]:mx-10"
        controlsPlacement="sides"
        containerClassName="relative mx-auto w-[min(calc(100%-64px),1260px)] max-[767px]:w-full"
        headerClassName="max-[767px]:px-4"
        heading={<h2 className="m-0 text-[clamp(34px,4vw,64px)] leading-none font-medium tracking-[-.04em]" id={`home-brand-${section.id}`}>{section.title}</h2>}
        action={section.url !== '#' ? <Link className={textLink} href={section.url}>{locale === 'ro' ? 'Vezi brandul' : 'Перейти к бренду'} <ArrowRight className="size-4" strokeWidth={1.5} aria-hidden="true" /></Link> : null}
        beforeTrack={banner}
        slideClassName="basis-[225px]"
        pageClassName="relative flex min-w-full justify-center gap-[18px]"
        trackClassName="px-4 lg:-mt-[74px] lg:px-[70px] max-[767px]:mt-0"
      >
        {section.products.map((product) => <ProductCard key={product.id} product={product} home brandSection />)}
      </ContentSlider>
    </section>
  )
}

export async function HomePage({ locale = 'ru' }: { locale?: StoreLocale }) {
  await connection()
  const home = await getHomeData(locale)
  const text = locale === 'ro'
    ? { categoriesLabel: 'Categorii populare', shopByCategory: 'Cumpără după categorie', more: 'Vezi mai multe', certificateMarquee: 'CARDURI CADOU', giftText: 'Un card cadou este o modalitate simplă de a-i bucura pe cei dragi și de a le lăsa libertatea de a alege.', chooseGift: 'Alege un card cadou', storesMarquee: 'MAGAZINE VIZAJE-NICA', storesText: '12 magazine de frumusețe aproape de tine. Descoperă universul Vizaje-Nica.', findStore: 'Găsește un magazin', storeAlt: 'Interiorul magazinului Vizaje-Nica', blogLabel: 'Ultimele articole de pe blog', bonusMarquee: 'PROGRAM DE BONUSURI', bonusTitle: 'Program de bonusuri', bonusText: 'Alătură-te programului de bonusuri Vizaje-Nica: acumulează bonusuri pentru cumpărături și folosește-le la comenzile tale.', about: 'DESPRE VIZAJE-NICA', aboutTitle: 'Din 1990 te ajutăm să descoperi lumea frumuseții.', aboutOne: 'Vizaje-Nica este o rețea de magazine cu produse originale de cosmetică și parfumerie din Moldova. De peste trei decenii, le prezentăm clienților branduri cunoscute, noutăți din industria frumuseții și produse pentru îngrijirea de zi cu zi.', aboutTwo: 'În sortiment găsești parfumerie pentru femei și bărbați, cosmetice decorative, produse pentru îngrijirea tenului, corpului și părului, precum și carduri cadou. Reunim branduri pentru diferite bugete, de la produse accesibile până la produse premium și parfumerie de nișă.', aboutThree: 'Echipa Vizaje-Nica ajută clienții să găsească produsele potrivite nevoilor și preferințelor lor. Continuăm să extindem sortimentul, să descoperim branduri noi și să facem cumpărăturile mai comode, atât în magazine, cât și online.', storesAlt: 'Magazin Vizaje-Nica', bonusAction: 'Vreau să mă alătur' }
    : { categoriesLabel: 'Популярные категории', shopByCategory: 'Покупайте по категориям', more: 'Посмотреть больше', certificateMarquee: 'ПОДАРОЧНЫЕ КАРТЫ', giftText: 'Подарочный сертификат — простой способ порадовать близких и оставить им выбор.', chooseGift: 'Выбрать сертификат', storesMarquee: 'МАГАЗИНЫ VIZAJE-NICA', storesText: '12 магазинов красоты рядом с вами. Приходите знакомиться с миром Vizaje-Nica.', findStore: 'Найти магазин', storeAlt: 'Интерьер магазина Vizaje-Nica', blogLabel: 'Последние статьи блога', bonusMarquee: 'БОНУСНАЯ ПРОГРАММА', bonusTitle: 'Бонусная программа', bonusText: 'Присоединяйтесь к бонусной программе Vizaje-Nica: копите бонусы за покупки, используйте их при оформлении заказов и получайте больше выгод.', about: 'О VIZAJE-NICA', aboutTitle: 'С 1990 года мы помогаем открывать мир красоты.', aboutOne: 'Vizaje-Nica — сеть магазинов оригинальной косметики и парфюмерии в Молдове. Более трёх десятилетий мы знакомим покупателей с известными мировыми брендами, новинками индустрии красоты и средствами, которые становятся частью повседневного ухода.', aboutTwo: 'В нашем ассортименте представлены женская и мужская парфюмерия, декоративная косметика, средства для ухода за кожей лица и тела, волосами, а также подарочные сертификаты. Мы объединяем бренды разных ценовых категорий — от доступной косметики на каждый день до премиальных средств и нишевой парфюмерии.', aboutThree: 'За каждым магазином Vizaje-Nica стоят люди, которые помогают покупателям ориентироваться в разнообразии продуктов и находить то, что соответствует их потребностям и предпочтениям. Мы продолжаем развивать ассортимент, знакомиться с новыми брендами и делать покупки удобнее — как в наших магазинах, так и онлайн.', storesAlt: 'Магазин Vizaje-Nica', bonusAction: 'Хочу в клуб' }

  return (
    <main className="min-h-[calc(100vh-136px)] bg-white text-midnight-ink max-[900px]:min-h-[calc(100vh-64px)]">
      {home.slides.length ? <HomeHero slides={home.slides} locale={locale} /> : <div className="h-[58px] min-[601px]:hidden" aria-hidden="true" />}

      {home.products.sale.length ? <HomeProductSection title={home.menu.sale.title} href={home.menu.sale.href} products={home.products.sale} locale={locale} /> : null}

      {home.categories.length ? (
        <section className="bg-white py-[clamp(38px,6vw,84px)] text-midnight-ink max-[767px]:py-8" aria-labelledby="home-categories-title">
          <div className={editorialContainer}>
            <ContentSlider
              label={text.categoriesLabel}
              variant="home"
              headerClassName="mb-6 max-[767px]:mb-[18px] max-[767px]:px-4"
              heading={<h2 className="m-0 text-[clamp(22px,2vw,28px)] leading-[1.1] font-semibold tracking-[-.025em]" id="home-categories-title">{text.shopByCategory}</h2>}
              slideClassName="basis-[68vw] max-w-[430px] sm:basis-[calc((100%-44px)/3)]"
              trackClassName="sm:justify-center sm:gap-[clamp(12px,1.5vw,22px)] max-[767px]:gap-3 max-[767px]:px-4 max-[767px]:pb-2"
            >
              {home.categories.map((category) => (
                <Link className="group relative block aspect-[4/5] w-full overflow-hidden rounded-lg bg-[#eeece8] text-midnight-ink focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-4" href={category.url} key={category.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="absolute inset-0 size-full object-cover object-center transition-transform duration-[600ms] group-hover:scale-[1.04] motion-reduce:transition-none" src={legacyAsset(category.image, 'home_categories') ?? ''} alt={category.title} loading="lazy" />
                  <span className="absolute inset-x-0 top-[35%] bottom-0 bg-[linear-gradient(180deg,transparent_25%,rgb(0_0_0_/_38%)_100%)]" aria-hidden="true" />
                  <span className="absolute right-4 bottom-4 left-4 z-[1] flex min-h-[42px] items-center justify-center rounded-xl bg-white/95 px-4 py-2 text-center text-sm leading-[1.2] font-medium max-[767px]:right-3 max-[767px]:bottom-3 max-[767px]:left-3 max-[767px]:min-h-[38px] max-[767px]:text-[13px]">{category.title}</span>
                </Link>
              ))}
            </ContentSlider>
            <Link className="mx-auto mt-6 flex min-h-11 w-max items-center justify-center gap-5 rounded-lg border border-midnight-ink px-5 text-[13px] font-medium text-midnight-ink transition-colors hover:border-hover-cream hover:bg-button-hover hover:text-midnight-ink focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-4 max-[767px]:mt-[18px]" href="/ru/katalog">
              {text.more} <ArrowRight className="size-4" strokeWidth={1.5} aria-hidden="true" />
            </Link>
          </div>
        </section>
      ) : null}

      {home.products.new.length ? <HomeProductSection title={home.menu.new.title} href={home.menu.new.href} products={home.products.new} locale={locale} /> : null}
      {home.brandSections.afterNew.map((section) => <HomeBrandShowcase key={section.id} section={section} locale={locale} />)}
      {home.brandSections.afterSale.map((section) => <HomeBrandShowcase key={section.id} section={section} locale={locale} />)}
      {home.products.hits.length ? <HomeProductSection title={home.menu.hits.title} href={home.menu.hits.href} products={home.products.hits} locale={locale} /> : null}

      <section className="bg-white pt-[clamp(26px,4vw,52px)] pb-[clamp(40px,6vw,76px)]" aria-labelledby="home-certificate-title">
        <EditorialMarquee>{text.certificateMarquee}</EditorialMarquee>
        <div className={`${editorialContainer} grid grid-cols-[minmax(0,1.05fr)_minmax(300px,.8fr)] items-center gap-[clamp(28px,6vw,88px)] max-[767px]:grid-cols-1 max-[767px]:gap-0`}>
          <div className="relative aspect-[1.72/1] w-full justify-self-center overflow-hidden bg-[#f5f5f5] max-[767px]:aspect-[1.78/1]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="absolute inset-0 size-full object-cover" src="/legacy-assets/app/b2b/img/certificate-main.png" alt="" width={1240} height={1240} loading="lazy" />
          </div>
          <div className="max-w-[440px] pt-[clamp(22px,4vw,54px)] max-[767px]:max-w-none max-[767px]:px-5 max-[767px]:pt-5">
            <h2 className="sr-only" id="home-certificate-title">{locale === 'ro' ? 'Dăruiește frumusețe' : 'Подарите красоту'}</h2>
            <p className="mb-6 max-w-[400px] text-base leading-[1.55] text-[#171717] max-[767px]:mb-5 max-[767px]:text-[15px]">{text.giftText}</p>
            <Link className={actionButton} href={locale === 'ro' ? '/ro/catalog/product/107557' : '/ru/katalog/product/107557'}>{text.chooseGift}</Link>
          </div>
        </div>
      </section>

      <section className="bg-white pt-[clamp(30px,4vw,54px)] pb-[clamp(48px,7vw,92px)]" aria-labelledby="home-stores-title">
        <EditorialMarquee>{text.storesMarquee}</EditorialMarquee>
        <div className={`${editorialContainer} grid grid-cols-[minmax(260px,.8fr)_minmax(0,1.2fr)] items-center gap-[clamp(40px,8vw,120px)] max-[767px]:flex max-[767px]:flex-col max-[767px]:items-stretch max-[767px]:gap-0`}>
          <div className="max-w-[440px] pt-[clamp(22px,4vw,54px)] max-[767px]:max-w-none max-[767px]:px-5 max-[767px]:pt-5">
            <h2 className="sr-only" id="home-stores-title">{home.menu.stores.title}</h2>
            <p className="mb-6 max-w-[400px] text-base leading-[1.55] text-[#171717] max-[767px]:mb-5 max-[767px]:text-[15px]">{text.storesText}</p>
            <Link className={actionButton} href={home.menu.stores.href}>{text.findStore}</Link>
          </div>
          <Link className="group order-2 block min-w-0 overflow-hidden bg-[#f3f3f3] focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-4 max-[767px]:order-first" href={home.menu.stores.href} aria-label={home.menu.stores.title}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="block aspect-[1.55/1] w-full object-cover transition-transform duration-500 group-hover:scale-[1.025] motion-reduce:transition-none max-[767px]:aspect-[1.38/1]" src="/legacy-assets/app/img/b2b/home-store.png" alt={text.storeAlt} loading="lazy" />
          </Link>
        </div>
      </section>

      {home.articles.length ? (
        <section className="overflow-hidden bg-white py-[clamp(76px,7vw,122px)] pb-[clamp(72px,7vw,120px)]" aria-labelledby="home-blog-title">
          <ContentSlider
            label={text.blogLabel}
            variant="home"
            scrollStep="slide"
            containerClassName="@container"
            headerClassName="relative mx-auto mb-7 min-h-10 w-[min(calc(100%-48px),1352px)] justify-center max-[767px]:mb-5 max-[767px]:w-full"
            heading={<h2 className="absolute top-1/2 left-1/2 m-0 w-max -translate-x-1/2 -translate-y-1/2 text-center text-[clamp(27px,2.2vw,38px)] leading-[1.15] font-medium tracking-[-.035em]" id="home-blog-title"><Link className="transition-opacity hover:opacity-60" href={`/${locale}/blog`}>{locale === 'ro' ? 'Blog' : 'Блог'}</Link></h2>}
            slideClassName="basis-[53cqw] max-[1024px]:basis-[72cqw] max-[767px]:basis-[calc(100cqw-32px)]"
            slideSnapClassName="snap-center"
            trackClassName="gap-[clamp(36px,4.8vw,90px)] px-[23.5cqw] max-[1024px]:gap-[clamp(28px,4vw,54px)] max-[1024px]:px-[14cqw] max-[767px]:gap-6 max-[767px]:px-4"
          >
            {home.articles.slice(0, 5).map((article) => (
              <Link className="group flex w-full flex-col text-midnight-ink" href={`/${locale}/blog/${article.uri}`} key={article.id} aria-label={article.title}>
                <span className="relative grid aspect-[2.5/1] w-full place-items-center overflow-hidden bg-[#f1f1f1]">
                  {article.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="size-full object-cover transition-transform duration-[450ms] group-hover:scale-[1.025] motion-reduce:transition-none" src={legacyAsset(article.image, 'articles') ?? ''} alt={article.title} loading="lazy" />
                  ) : <span className="text-xs tracking-[.12em] text-[#999]">VIZAJE-NICA</span>}
                </span>
                <span className="flex flex-col items-start gap-3 px-[8%] pt-[18px]">
                  <strong className="line-clamp-2 text-[clamp(24px,2vw,36px)] leading-[1.18] font-semibold transition-colors group-hover:text-hover-cream">{article.title}</strong>
                  {article.description ? <span className="line-clamp-2 max-w-[850px] text-[15px] leading-[1.65] text-[#171717]">{article.description}</span> : null}
                </span>
              </Link>
            ))}
          </ContentSlider>
        </section>
      ) : null}

      <section className="bg-white pt-7 pb-[clamp(40px,6vw,76px)]" aria-labelledby="home-bonus-title">
        <EditorialMarquee>{text.bonusMarquee}</EditorialMarquee>
        <div className={`${editorialContainer} grid grid-cols-[minmax(0,1.05fr)_minmax(300px,.8fr)] items-center gap-[clamp(28px,6vw,88px)] max-[767px]:flex max-[767px]:flex-col max-[767px]:items-stretch max-[767px]:gap-0`}>
          <div className="group relative aspect-[1.72/1] w-full justify-self-center overflow-hidden bg-[#f5f5f5] max-[767px]:aspect-[1.78/1]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.025] motion-reduce:transition-none" src="/legacy-assets/app/img/bonus-program-section.png" alt="" loading="lazy" />
          </div>
          <div className="max-w-[440px] pt-[clamp(22px,4vw,54px)] max-[767px]:max-w-none max-[767px]:px-5 max-[767px]:pt-5">
            <h2 className="sr-only" id="home-bonus-title">{text.bonusTitle}</h2>
            <p className="mb-6 max-w-[400px] text-base leading-[1.55] text-[#171717] max-[767px]:mb-5 max-[767px]:text-[15px]">{text.bonusText}</p>
            <HomeBonusAction locale={locale} label={text.bonusAction} />
          </div>
        </div>
      </section>

      <section className="bg-white py-[clamp(80px,9vw,120px)] text-midnight-ink max-[767px]:py-16" aria-labelledby="home-about-title">
        <div className={`${editorialContainer} grid grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)] items-center gap-[clamp(48px,6vw,80px)] max-[767px]:flex max-[767px]:flex-col max-[767px]:items-stretch max-[767px]:gap-0`}>
          <div className="min-w-0 overflow-hidden max-[767px]:order-first">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="block aspect-[4/3] w-full object-cover max-[767px]:aspect-[1.38/1]" src="/legacy-assets/app/img/b2b/home-store.png" alt="Магазин Vizaje-Nica" width={1448} height={1086} loading="lazy" />
          </div>
          <div className="min-w-0 max-[767px]:px-5 max-[767px]:pt-7">
            <p className="mb-[18px] text-xs leading-[1.3] font-medium tracking-[.12em] uppercase max-[767px]:mb-[14px] max-[767px]:text-[11px]">{text.about}</p>
            <h2 className="mb-7 max-w-[650px] text-[clamp(34px,3.25vw,42px)] leading-[1.12] font-normal tracking-[-.04em] max-[767px]:mb-[22px] max-[767px]:text-[clamp(28px,8vw,30px)] max-[767px]:leading-[1.16]" id="home-about-title">{text.aboutTitle}</h2>
            <div className="max-w-[700px] text-base leading-[1.6] text-midnight-ink md:text-lg md:leading-[1.65] [&>p]:mb-[18px] [&>p:last-child]:mb-0">
              <p>{text.aboutOne}</p>
              <p>{text.aboutTwo}</p>
              <p>{text.aboutThree}</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
