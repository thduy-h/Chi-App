import { Metadata } from 'next'
import Link from 'next/link'

import { resolveHomeMode } from '@/lib/home-mode'
import { LettersComposePage } from '@/lib/components/pages/letters/letters-compose-page'
import { AuthRequired } from '@/lib/components/shared/auth-required'
import { getCurrentCoupleForUser } from '@/lib/supabase/couples'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'LoveHub | Viết thư',
  description: 'Soạn thư tình hoặc góp ý rồi gửi vào hộp thư couple.'
}

export default async function NewLetterPage() {
  const supabase = createClient()
  if (!supabase) {
    return (
      <AuthRequired
        title="Không thể mở trình soạn thư"
        message="Supabase chưa được cấu hình. Vui lòng thử lại sau."
      />
    )
  }

  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <AuthRequired
        title="Cần đăng nhập để viết thư"
        message="Đăng nhập để gửi thư cho người ấy trong LoveHub."
      />
    )
  }

  const couple = await getCurrentCoupleForUser(supabase, user.id)
  if (!couple.coupleId) {
    return (
      <main className="container mx-auto max-w-2xl px-4 py-14 sm:px-6">
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm dark:border-amber-800/60 dark:bg-amber-950/20">
          <h1 className="text-2xl font-semibold text-amber-900 dark:text-amber-200">Bạn chưa có couple</h1>
          <p className="mt-3 text-sm text-amber-900/90 dark:text-amber-200/90">
            Hãy vào trang thiết lập để tạo hoặc tham gia couple trước khi gửi thư.
          </p>
          <Link
            href="/setup"
            className="mt-6 inline-flex rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700"
          >
            Đi tới /setup
          </Link>
        </section>
      </main>
    )
  }

  const mode = await resolveHomeMode(supabase)
  return <LettersComposePage mode={mode} />
}
