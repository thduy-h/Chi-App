import Link from 'next/link'

const featureLinks = [
  {
    href: '/food',
    title: 'Bep Nha Cao Tho',
    subtitle: 'Hom nay an gi?',
    description:
      'Chon mon nhanh, loc theo nhom mon, bam random va gui order cho bua an chung.',
    color: 'from-orange-400 to-rose-500'
  },
  {
    href: '/cycle',
    title: 'Lich Chu Ky',
    subtitle: 'Nho nhau dung luc',
    description:
      'Theo doi ngay du doan, dem nguoc va lich thang de Cao luon chu dong cham soc Tho.',
    color: 'from-fuchsia-400 to-rose-500'
  },
  {
    href: '/tasks',
    title: 'Viec Chung',
    subtitle: 'Phan cong ro rang',
    description:
      'Kanban cho viec nha va plan du lich, de hai dua thay tien do trong mot man hinh.',
    color: 'from-blue-400 to-indigo-500'
  },
  {
    href: '/finance',
    title: 'Tai Chinh',
    subtitle: 'Chi tieu co ke hoach',
    description:
      'Ghi thu chi, xem tong ket thang va giu ngan sach qua tang, hen ho that gon gang.',
    color: 'from-emerald-400 to-teal-500'
  },
  {
    href: '/letters',
    title: 'Thu Cho Nhau',
    subtitle: 'Luu loi thuong',
    description:
      'Gui thu tinh hoac gop y nhe nhang, giu lai nhung dieu kho noi thanh loi.',
    color: 'from-rose-400 to-pink-500'
  }
]

const stats = [
  { value: '5', label: 'Goc Chuc Nang' },
  { value: '2', label: 'Nguoi Chung Nha' },
  { value: '1', label: 'Nha Cao Tho' },
  { value: '24/7', label: 'Dong Hanh Nhe Nhang' }
]

const steps = [
  {
    title: 'Chon 1 goc nho',
    description: 'Bat dau tu Food, Tasks, Finance, Cycle, hoac Letters tuy nhu cau cua hai dua.'
  },
  {
    title: 'Lam cung nhau',
    description: 'Cap nhat nhanh, quyet dinh nhanh, giam bot met moi trong viec len ke hoach.'
  },
  {
    title: 'Bien thanh ky niem',
    description: 'Tu bua an, cong viec den la thu, moi thu nho deu thanh dau moc de nho.'
  }
]

export const LoveHubLanding = () => {
  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-18rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-rose-300/30 blur-3xl dark:bg-rose-900/20" />
        <div className="absolute bottom-[-16rem] right-[-10rem] h-[28rem] w-[28rem] rounded-full bg-pink-200/50 blur-3xl dark:bg-pink-900/20" />
      </div>

      <section className="relative container mx-auto px-4 pb-12 pt-14 sm:px-6 lg:px-8 lg:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="inline-flex rounded-full border border-rose-200 bg-white px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-600 shadow-sm dark:border-rose-900 dark:bg-gray-900 dark:text-rose-300">
              Nha Cao Tho
            </span>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-5xl lg:text-6xl">
              Nha cua Cao
              <span className="bg-gradient-to-r from-rose-600 to-pink-500 bg-clip-text text-transparent">
                {' '}lam tang Tho
              </span>
              , de yeu nhau de hon moi ngay.
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-gray-600 dark:text-gray-300 sm:text-lg">
              Mot khong gian nho, gon, dep de Cao va Tho cung len lich an uong, viec nha, tai
              chinh va gui loi thuong cho nhau.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/food"
                className="inline-flex items-center justify-center rounded-full bg-rose-600 px-7 py-3 text-sm font-semibold text-white transition hover:bg-rose-700"
              >
                Vao Bep Ngay
              </Link>
              <Link
                href="/letters"
                className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-white px-7 py-3 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 dark:border-rose-900 dark:bg-gray-900 dark:text-rose-200 dark:hover:bg-gray-800"
              >
                Mo Hop Thu
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-4 -top-4 h-24 w-24 rounded-2xl bg-rose-200/60 blur-xl dark:bg-rose-900/30" />
            <div className="relative overflow-hidden rounded-3xl border border-rose-100 bg-white/90 p-6 shadow-xl backdrop-blur dark:border-rose-900/50 dark:bg-gray-900/90 sm:p-8">
              <div className="mb-6 flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Ke hoach toi nay</p>
                <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                  Dong bo
                </span>
              </div>

              <div className="space-y-4">
                {[
                  'Random mon dang hien thi o trang Food',
                  'Check ngan sach cuoi tuan o Finance',
                  'Viet 1 la thu nho gui cho nhau'
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-xl border border-gray-100 px-4 py-3 dark:border-gray-800"
                  >
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-xs font-semibold text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                      v
                    </span>
                    <span className="text-sm text-gray-700 dark:text-gray-200">{item}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-2xl bg-gradient-to-r from-rose-100 to-pink-100 px-4 py-3 dark:from-rose-900/30 dark:to-pink-900/20">
                <p className="text-sm font-medium text-rose-700 dark:text-rose-300">
                  Mot nha chung, bot tranh cai vuon vat.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative container mx-auto px-4 pb-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-rose-100 bg-white/80 px-4 py-5 text-center shadow-sm dark:border-rose-900/40 dark:bg-gray-900/70"
            >
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stat.value}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative container mx-auto px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
        <div className="mb-8 max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            Moi thu can cho cuoc song chung
          </h2>
          <p className="mt-3 text-gray-600 dark:text-gray-300">
            Giao dien hien dai, nhung uu tien su don gian de hai dua dung that hang ngay.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featureLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-2xl border border-rose-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-rose-300 hover:shadow-md dark:border-rose-900/40 dark:bg-gray-900"
            >
              <div
                className={`mb-5 inline-flex rounded-full bg-gradient-to-r ${item.color} px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white`}
              >
                {item.subtitle}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                {item.description}
              </p>
              <span className="mt-6 inline-flex items-center text-sm font-semibold text-rose-700 transition group-hover:text-rose-800 dark:text-rose-300 dark:group-hover:text-rose-200">
                Mo {item.title}
                <svg
                  className="ml-1 h-4 w-4 transition group-hover:translate-x-1"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 10a1 1 0 011-1h9.586L10.293 5.707a1 1 0 111.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L13.586 11H4a1 1 0 01-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="relative bg-gradient-to-b from-rose-50/70 to-white py-16 dark:from-rose-950/10 dark:to-gray-900 lg:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Nha Cao Tho van hanh the nao
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className="rounded-2xl border border-rose-100 bg-white p-6 shadow-sm dark:border-rose-900/40 dark:bg-gray-900"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-sm font-semibold text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                  {index + 1}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative container mx-auto px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-rose-100 bg-white p-7 shadow-sm dark:border-rose-900/40 dark:bg-gray-900">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-600 dark:text-rose-300">
              Vi sao nen dung Nha Cao Tho
            </p>
            <h3 className="mt-3 text-2xl font-semibold text-gray-900 dark:text-white">
              Giao dien gon, ket qua ro
            </h3>
            <ul className="mt-5 space-y-3">
              {[
                'Bot hieu nham khi len ke hoach',
                'Thay ro viec va ngan sach chung',
                'Ra quyet dinh nhanh hon',
                'Co them thoi gian cho nhau'
              ].map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                  <span className="mt-1 inline-block h-2 w-2 rounded-full bg-rose-500" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-rose-100 bg-gradient-to-br from-rose-600 to-pink-500 p-7 text-white shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-100">
              Bat dau ngay
            </p>
            <h3 className="mt-3 text-2xl font-semibold">Dung 5 phut de mo Nha Cao Tho</h3>
            <p className="mt-4 text-sm leading-relaxed text-rose-50">
              Cao lam tang Tho mot khong gian nho de yeu nhau nhe nhang hon, tu viec nho nhat.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/tasks"
                className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
              >
                Mo Viec Chung
              </Link>
              <Link
                href="/finance"
                className="inline-flex items-center justify-center rounded-full border border-rose-200/50 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Mo Tai Chinh
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
