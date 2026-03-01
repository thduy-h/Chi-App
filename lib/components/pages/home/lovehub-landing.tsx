import Link from 'next/link'

type HomeMode = 'a' | 'b' | 'c'

interface LoveHubLandingProps {
  mode?: HomeMode
}

interface FeatureLink {
  href: string
  title: string
  subtitle: string
  description: string
  color: string
}

interface StatItem {
  value: string
  label: string
}

interface StepItem {
  title: string
  description: string
}

const featureLinksA: FeatureLink[] = [
  {
    href: '/food',
    title: 'Bếp Nhà Cáo Thỏ',
    subtitle: 'Hôm nay ăn gì?',
    description: 'Chọn món nhanh, lọc theo nhóm món, bấm random và gửi order cho bữa ăn chung.',
    color: 'from-rose-400 to-pink-500'
  },
  {
    href: '/cycle',
    title: 'Lịch Chu Kỳ',
    subtitle: 'Nhớ nhau đúng lúc',
    description: 'Theo dõi ngày dự đoán, đếm ngược và lịch tháng để Cáo luôn chủ động chăm sóc Thỏ.',
    color: 'from-fuchsia-400 to-rose-500'
  },
  {
    href: '/tasks',
    title: 'Việc Chung',
    subtitle: 'Phân công rõ ràng',
    description: 'Kanban cho việc nhà và plan du lịch, để cả hai thấy tiến độ rõ ràng trong một màn hình.',
    color: 'from-pink-400 to-rose-500'
  },
  {
    href: '/finance',
    title: 'Tài Chính',
    subtitle: 'Chi tiêu có kế hoạch',
    description: 'Ghi thu chi, xem tổng kết tháng và giữ ngân sách quà tặng, hẹn hò thật gọn gàng.',
    color: 'from-amber-400 to-orange-500'
  },
  {
    href: '/letters',
    title: 'Thư Cho Nhau',
    subtitle: 'Lưu lời thương',
    description: 'Gửi thư tình hoặc góp ý nhẹ nhàng, giữ lại những điều đôi khi khó nói trực tiếp.',
    color: 'from-rose-500 to-fuchsia-500'
  }
]

const featureLinksB: FeatureLink[] = [
  {
    href: '/food',
    title: 'Gợi Ý Món Ăn',
    subtitle: 'Chọn món nhanh',
    description: 'Lọc theo danh mục, tìm món theo tên và bấm random để chốt bữa ăn trong vài giây.',
    color: 'from-teal-400 to-cyan-500'
  },
  {
    href: '/cycle',
    title: 'Theo Dõi Chu Kỳ',
    subtitle: 'Quan tâm đúng lúc',
    description: 'Theo dõi dự đoán chu kỳ và đếm ngược để chủ động chăm sóc nhau mỗi tháng.',
    color: 'from-violet-400 to-indigo-500'
  },
  {
    href: '/tasks',
    title: 'Bảng Việc Chung',
    subtitle: 'Kanban trực quan',
    description: 'Tổ chức việc nhà và kế hoạch đi chơi theo cột rõ ràng, kéo thả nhanh trên cùng một màn hình.',
    color: 'from-sky-400 to-blue-500'
  },
  {
    href: '/finance',
    title: 'Bảng Tài Chính',
    subtitle: 'Theo dõi chi tiêu',
    description: 'Quản lý thu chi, xem tổng kết tháng và nắm ngân sách chung một cách nhẹ nhàng.',
    color: 'from-emerald-400 to-cyan-500'
  },
  {
    href: '/letters',
    title: 'Hộp Thư Cặp Đôi',
    subtitle: 'Lưu điều muốn nói',
    description: 'Gửi thư tình hoặc góp ý tinh tế để giữ cuộc trò chuyện luôn mềm mại và chân thành.',
    color: 'from-indigo-400 to-fuchsia-500'
  }
]

const featureColorsBPink = [
  'from-rose-400 to-pink-500',
  'from-fuchsia-400 to-rose-500',
  'from-pink-400 to-rose-500',
  'from-rose-500 to-fuchsia-500',
  'from-pink-500 to-fuchsia-500'
]

const featureColorsBBlue = [
  'from-teal-400 to-cyan-500',
  'from-violet-400 to-indigo-500',
  'from-sky-400 to-blue-500',
  'from-emerald-400 to-cyan-500',
  'from-indigo-400 to-fuchsia-500'
]

const statsA: StatItem[] = [
  { value: '5', label: 'Góc Chức Năng' },
  { value: '2', label: 'Người Chung Nhà' },
  { value: '1', label: 'Nhà Cáo Thỏ' },
  { value: '24/7', label: 'Đồng Hành Dịu Dàng' }
]

const statsB: StatItem[] = [
  { value: '5', label: 'Khu Chức Năng' },
  { value: '2', label: 'Thành Viên Couple' },
  { value: '1', label: 'Nền Tảng Chung' },
  { value: '24/7', label: 'Sẵn Sàng Đồng Hành' }
]

const stepsA: StepItem[] = [
  {
    title: 'Chọn một góc nhỏ',
    description: 'Bắt đầu từ Món ăn, Việc chung, Tài chính, Chu kỳ hoặc Lá thư theo nhu cầu của hai bạn.'
  },
  {
    title: 'Làm cùng nhau',
    description: 'Cập nhật nhanh, quyết định nhanh, giảm bớt mệt mỏi trong việc lên kế hoạch.'
  },
  {
    title: 'Biến thành kỷ niệm',
    description: 'Từ bữa ăn, công việc đến lá thư, mọi điều nhỏ đều thành dấu mốc đáng nhớ.'
  }
]

const stepsB: StepItem[] = [
  {
    title: 'Chọn module cần dùng',
    description: 'Bắt đầu từ Món ăn, Việc chung, Tài chính, Chu kỳ hoặc Hộp thư theo ưu tiên hiện tại.'
  },
  {
    title: 'Cập nhật mỗi ngày',
    description: 'Mỗi người thêm thông tin của mình để cả hai nhìn cùng một trạng thái mới nhất.'
  },
  {
    title: 'Giữ nhịp sống ổn định',
    description: 'Việc nhỏ được xử lý đều đặn giúp sinh hoạt chung nhẹ hơn và bớt căng thẳng.'
  }
]

export const LoveHubLanding = ({ mode = 'c' }: LoveHubLandingProps) => {
  const isModeA = mode === 'a'
  const isModeBPink = mode === 'b'
  const featureLinks = (isModeA ? featureLinksA : featureLinksB).map((item, index) => {
    if (isModeA) {
      return item
    }

    return {
      ...item,
      color: (isModeBPink ? featureColorsBPink : featureColorsBBlue)[index] ?? item.color
    }
  })
  const stats = isModeA ? statsA : statsB
  const steps = isModeA ? stepsA : stepsB

  const palette = isModeA
    ? {
        glowPrimary: 'bg-rose-300/30 dark:bg-rose-900/20',
        glowSecondary: 'bg-fuchsia-200/50 dark:bg-fuchsia-900/20',
        badge:
          'border border-rose-200 bg-white text-rose-700 dark:border-rose-900 dark:bg-gray-900 dark:text-rose-300',
        heroAccent: 'from-rose-600 to-fuchsia-500',
        primaryButton: 'bg-rose-600 hover:bg-rose-700',
        secondaryButton:
          'border border-rose-200 bg-white text-rose-700 hover:border-rose-300 hover:bg-rose-50 dark:border-rose-900 dark:bg-gray-900 dark:text-rose-200 dark:hover:bg-gray-800',
        panelGlow: 'bg-rose-200/60 dark:bg-rose-900/30',
        panelCard: 'border border-rose-100 bg-white/90 dark:border-rose-900/50 dark:bg-gray-900/90',
        panelTag: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
        check: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
        planNote: 'from-rose-100 to-fuchsia-100 dark:from-rose-900/30 dark:to-fuchsia-900/20',
        planNoteText: 'text-rose-700 dark:text-rose-300',
        statCard: 'border border-rose-100 bg-white/80 dark:border-rose-900/40 dark:bg-gray-900/70',
        featureCard:
          'border border-rose-100 bg-white hover:border-rose-300 dark:border-rose-900/40 dark:bg-gray-900',
        featureLink:
          'text-rose-700 group-hover:text-rose-800 dark:text-rose-300 dark:group-hover:text-rose-200',
        flowBg: 'from-rose-50/70 to-white dark:from-rose-950/10 dark:to-gray-900',
        stepCard: 'border border-rose-100 bg-white dark:border-rose-900/40 dark:bg-gray-900',
        stepIndex: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
        reasonCard: 'border border-rose-100 bg-white dark:border-rose-900/40 dark:bg-gray-900',
        reasonLabel: 'text-rose-600 dark:text-rose-300',
        reasonBullet: 'bg-rose-500',
        ctaCard: 'border border-rose-100 bg-gradient-to-br from-rose-600 to-fuchsia-500',
        ctaTag: 'text-rose-100',
        ctaDescription: 'text-rose-50',
        ctaPrimaryButton: 'text-rose-700 hover:bg-rose-50',
        ctaSecondaryButton: 'border-rose-200/50'
      }
    : isModeBPink
      ? {
          glowPrimary: 'bg-rose-300/30 dark:bg-rose-900/20',
          glowSecondary: 'bg-fuchsia-200/50 dark:bg-fuchsia-900/20',
          badge:
            'border border-rose-200 bg-white text-rose-700 dark:border-rose-900 dark:bg-gray-900 dark:text-rose-300',
          heroAccent: 'from-rose-600 to-fuchsia-500',
          primaryButton: 'bg-rose-600 hover:bg-rose-700',
          secondaryButton:
            'border border-rose-200 bg-white text-rose-700 hover:border-rose-300 hover:bg-rose-50 dark:border-rose-900 dark:bg-gray-900 dark:text-rose-200 dark:hover:bg-gray-800',
          panelGlow: 'bg-rose-200/60 dark:bg-rose-900/30',
          panelCard: 'border border-rose-100 bg-white/90 dark:border-rose-900/50 dark:bg-gray-900/90',
          panelTag: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
          check: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
          planNote: 'from-rose-100 to-fuchsia-100 dark:from-rose-900/30 dark:to-fuchsia-900/20',
          planNoteText: 'text-rose-700 dark:text-rose-300',
          statCard: 'border border-rose-100 bg-white/80 dark:border-rose-900/40 dark:bg-gray-900/70',
          featureCard:
            'border border-rose-100 bg-white hover:border-rose-300 dark:border-rose-900/40 dark:bg-gray-900',
          featureLink:
            'text-rose-700 group-hover:text-rose-800 dark:text-rose-300 dark:group-hover:text-rose-200',
          flowBg: 'from-rose-50/70 to-white dark:from-rose-950/10 dark:to-gray-900',
          stepCard: 'border border-rose-100 bg-white dark:border-rose-900/40 dark:bg-gray-900',
          stepIndex: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
          reasonCard: 'border border-rose-100 bg-white dark:border-rose-900/40 dark:bg-gray-900',
          reasonLabel: 'text-rose-600 dark:text-rose-300',
          reasonBullet: 'bg-rose-500',
          ctaCard: 'border border-rose-100 bg-gradient-to-br from-rose-600 to-fuchsia-500',
          ctaTag: 'text-rose-100',
          ctaDescription: 'text-rose-50',
          ctaPrimaryButton: 'text-rose-700 hover:bg-rose-50',
          ctaSecondaryButton: 'border-rose-200/50'
        }
      : {
          glowPrimary: 'bg-sky-300/30 dark:bg-sky-900/20',
          glowSecondary: 'bg-cyan-200/50 dark:bg-cyan-900/20',
          badge:
            'border border-sky-200 bg-white text-sky-700 dark:border-sky-900 dark:bg-gray-900 dark:text-sky-300',
          heroAccent: 'from-sky-600 to-indigo-500',
          primaryButton: 'bg-sky-600 hover:bg-sky-700',
          secondaryButton:
            'border border-sky-200 bg-white text-sky-700 hover:border-sky-300 hover:bg-sky-50 dark:border-sky-900 dark:bg-gray-900 dark:text-sky-200 dark:hover:bg-gray-800',
          panelGlow: 'bg-sky-200/60 dark:bg-sky-900/30',
          panelCard: 'border border-sky-100 bg-white/90 dark:border-sky-900/50 dark:bg-gray-900/90',
          panelTag: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
          check: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
          planNote: 'from-sky-100 to-indigo-100 dark:from-sky-900/30 dark:to-indigo-900/20',
          planNoteText: 'text-sky-700 dark:text-sky-300',
          statCard: 'border border-sky-100 bg-white/80 dark:border-sky-900/40 dark:bg-gray-900/70',
          featureCard:
            'border border-sky-100 bg-white hover:border-sky-300 dark:border-sky-900/40 dark:bg-gray-900',
          featureLink: 'text-sky-700 group-hover:text-sky-800 dark:text-sky-300 dark:group-hover:text-sky-200',
          flowBg: 'from-sky-50/70 to-white dark:from-sky-950/10 dark:to-gray-900',
          stepCard: 'border border-sky-100 bg-white dark:border-sky-900/40 dark:bg-gray-900',
          stepIndex: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
          reasonCard: 'border border-sky-100 bg-white dark:border-sky-900/40 dark:bg-gray-900',
          reasonLabel: 'text-sky-600 dark:text-sky-300',
          reasonBullet: 'bg-sky-500',
          ctaCard: 'border border-sky-100 bg-gradient-to-br from-sky-600 to-indigo-500',
          ctaTag: 'text-sky-100',
          ctaDescription: 'text-sky-50',
          ctaPrimaryButton: 'text-sky-700 hover:bg-sky-50',
          ctaSecondaryButton: 'border-sky-200/50'
        }

  const copy = isModeA
    ? {
        badge: 'Nhà Cáo Thỏ',
        heroPrefix: 'Nhà của Cáo',
        heroAccent: 'làm tặng Thỏ',
        heroSuffix: ', để yêu nhau nhẹ nhàng hơn mỗi ngày.',
        heroDescription:
          'Một không gian nhỏ, gọn, hiện đại để Cáo và Thỏ cùng lên lịch ăn uống, việc nhà, tài chính và gửi lời thương cho nhau.',
        heroPrimaryCta: 'Vào Bếp Ngay',
        heroSecondaryCta: 'Mở Hộp Thư',
        planTitle: 'Kế hoạch tối nay',
        planTag: 'Đồng bộ',
        planItems: [
          'Random món đang hiển thị ở trang Món ăn',
          'Kiểm tra ngân sách cuối tuần ở Tài chính',
          'Viết một lá thư nhỏ gửi cho nhau'
        ],
        planNote: 'Một nhà chung, bớt tranh cãi vụn vặt.',
        featureHeading: 'Mọi thứ cần cho cuộc sống chung',
        featureDescription: 'Giao diện hiện đại nhưng ưu tiên sự đơn giản, để dùng thật hàng ngày.',
        flowHeading: 'Nhà Cáo Thỏ vận hành thế nào',
        reasonLabel: 'Vì sao nên dùng Nhà Cáo Thỏ',
        reasonHeading: 'Giao diện gọn, kết quả rõ',
        reasonPoints: [
          'Bớt hiểu nhầm khi lên kế hoạch',
          'Thấy rõ việc và ngân sách chung',
          'Ra quyết định nhanh hơn',
          'Có thêm thời gian dành cho nhau'
        ],
        ctaTag: 'Bắt đầu ngay',
        ctaHeading: 'Dùng 5 phút để mở Nhà Cáo Thỏ',
        ctaDescription: 'Cáo làm tặng Thỏ một không gian nhỏ để yêu nhau nhẹ nhàng hơn, từ việc nhỏ nhất.',
        ctaPrimary: 'Mở Việc Chung',
        ctaSecondary: 'Mở Tài Chính'
      }
    : {
        badge: 'LoveHub Public',
        heroPrefix: 'Không gian chung',
        heroAccent: 'cho mọi cặp đôi',
        heroSuffix: ', để sống cùng nhau gọn gàng hơn mỗi ngày.',
        heroDescription:
          'Một nền tảng nhẹ và hiện đại để cùng quản lý bữa ăn, kế hoạch, tài chính và những điều muốn nói với nhau.',
        heroPrimaryCta: 'Khám phá Món ăn',
        heroSecondaryCta: 'Mở Hộp Thư',
        planTitle: 'Kế hoạch hôm nay',
        planTag: 'Cùng cập nhật',
        planItems: [
          'Chốt bữa tối nhanh ở trang Món ăn',
          'Rà việc tồn ở bảng Việc chung',
          'Gửi một lời nhắn ngắn trong Hộp thư'
        ],
        planNote: 'Rõ việc hơn, nhẹ đầu hơn.',
        featureHeading: 'Bộ công cụ cho cuộc sống đôi',
        featureDescription: 'Thiết kế tối giản để bất kỳ cặp đôi nào cũng dùng được ngay từ ngày đầu.',
        flowHeading: 'LoveHub vận hành thế nào',
        reasonLabel: 'Vì sao nên dùng LoveHub',
        reasonHeading: 'Gọn, rõ, dùng được ngay',
        reasonPoints: [
          'Giảm quên việc lặt vặt',
          'Nhìn rõ kế hoạch và ngân sách chung',
          'Chốt việc nhanh, đỡ tranh luận dài',
          'Dành nhiều năng lượng hơn cho nhau'
        ],
        ctaTag: 'Bắt đầu ngay',
        ctaHeading: 'Thiết lập LoveHub trong 5 phút',
        ctaDescription: 'Tạo couple, chọn các mục cần dùng và bắt đầu đồng hành đều đặn mỗi ngày.',
        ctaPrimary: 'Mở Việc Chung',
        ctaSecondary: 'Mở Tài Chính'
      }

  const isPremiumMode = mode === 'a' || mode === 'b'
  const badgeLabel = isModeA ? 'Nhà Cáo Thỏ' : isModeBPink ? 'LoveHub' : 'LoveHub Public'

  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div
          className={`absolute left-1/2 top-[-18rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full blur-3xl ${palette.glowPrimary}`}
        />
        <div
          className={`absolute bottom-[-16rem] right-[-10rem] h-[28rem] w-[28rem] rounded-full blur-3xl ${palette.glowSecondary}`}
        />
      </div>

      <section className="relative container mx-auto px-4 pb-12 pt-14 sm:px-6 lg:px-8 lg:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <div className="inline-flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] shadow-sm ${palette.badge}`}
              >
                {badgeLabel}
              </span>
              {isPremiumMode ? (
                <span className="inline-flex rounded-full border border-amber-300 bg-amber-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-900 shadow-sm">
                  Premium
                </span>
              ) : null}
            </div>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-5xl lg:text-6xl">
              {copy.heroPrefix}
              <span className={`bg-gradient-to-r bg-clip-text text-transparent ${palette.heroAccent}`}>
                {' '}
                {copy.heroAccent}
              </span>
              {copy.heroSuffix}
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-gray-600 dark:text-gray-300 sm:text-lg">
              {copy.heroDescription}
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/food"
                className={`inline-flex items-center justify-center rounded-full px-7 py-3 text-sm font-semibold text-white transition ${palette.primaryButton}`}
              >
                {copy.heroPrimaryCta}
              </Link>
              <Link
                href="/letters"
                className={`inline-flex items-center justify-center rounded-full px-7 py-3 text-sm font-semibold transition ${palette.secondaryButton}`}
              >
                {copy.heroSecondaryCta}
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className={`absolute -left-4 -top-4 h-24 w-24 rounded-2xl blur-xl ${palette.panelGlow}`} />
            <div
              className={`relative overflow-hidden rounded-3xl p-6 shadow-xl backdrop-blur sm:p-8 ${palette.panelCard}`}
            >
              <div className="mb-6 flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{copy.planTitle}</p>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${palette.panelTag}`}>
                  {copy.planTag}
                </span>
              </div>

              <div className="space-y-4">
                {copy.planItems.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-xl border border-gray-100 px-4 py-3 dark:border-gray-800"
                  >
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${palette.check}`}
                    >
                      ✓
                    </span>
                    <span className="text-sm text-gray-700 dark:text-gray-200">{item}</span>
                  </div>
                ))}
              </div>

              <div className={`mt-6 rounded-2xl bg-gradient-to-r px-4 py-3 ${palette.planNote}`}>
                <p className={`text-sm font-medium ${palette.planNoteText}`}>{copy.planNote}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative container mx-auto px-4 pb-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className={`rounded-2xl px-4 py-5 text-center shadow-sm ${palette.statCard}`}>
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
            {copy.featureHeading}
          </h2>
          <p className="mt-3 text-gray-600 dark:text-gray-300">{copy.featureDescription}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featureLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`group rounded-2xl p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md ${palette.featureCard}`}
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
              <span className={`mt-6 inline-flex items-center text-sm font-semibold transition ${palette.featureLink}`}>
                Mở {item.title}
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

      <section className={`relative bg-gradient-to-b py-16 lg:py-20 ${palette.flowBg}`}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              {copy.flowHeading}
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.title} className={`rounded-2xl p-6 shadow-sm ${palette.stepCard}`}>
                <div
                  className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${palette.stepIndex}`}
                >
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
          <div className={`rounded-3xl p-7 shadow-sm ${palette.reasonCard}`}>
            <p className={`text-sm font-semibold uppercase tracking-[0.18em] ${palette.reasonLabel}`}>
              {copy.reasonLabel}
            </p>
            <h3 className="mt-3 text-2xl font-semibold text-gray-900 dark:text-white">{copy.reasonHeading}</h3>
            <ul className="mt-5 space-y-3">
              {copy.reasonPoints.map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                  <span className={`mt-1 inline-block h-2 w-2 rounded-full ${palette.reasonBullet}`} />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={`rounded-3xl p-7 text-white shadow-sm ${palette.ctaCard}`}>
            <p className={`text-sm font-semibold uppercase tracking-[0.18em] ${palette.ctaTag}`}>{copy.ctaTag}</p>
            <h3 className="mt-3 text-2xl font-semibold">{copy.ctaHeading}</h3>
            <p className={`mt-4 text-sm leading-relaxed ${palette.ctaDescription}`}>{copy.ctaDescription}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/tasks"
                className={`inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold transition ${palette.ctaPrimaryButton}`}
              >
                {copy.ctaPrimary}
              </Link>
              <Link
                href="/finance"
                className={`inline-flex items-center justify-center rounded-full border px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 ${palette.ctaSecondaryButton}`}
              >
                {copy.ctaSecondary}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
