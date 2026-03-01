import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { SealedEnvelopeViewer } from '@/lib/components/letters/SealedEnvelopeViewer'
import { AuthRequired } from '@/lib/components/shared/auth-required'
import type { LetterRecord } from '@/lib/letters/types'
import { getCurrentCoupleForUser } from '@/lib/supabase/couples'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'LoveHub | Đọc thư',
  description: 'Mở phong thư và đọc lời nhắn dành riêng cho couple của bạn.'
}

function toLetterRecord(input: {
  id: string
  kind: string
  title: string | null
  message: string
  mood: string | null
  anonymous: boolean
  created_at: string | null
}): LetterRecord {
  return {
    id: input.id,
    kind: input.kind === 'feedback' ? 'feedback' : 'love',
    title: input.title,
    message: input.message,
    mood: input.mood,
    anonymous: input.anonymous,
    created_at: input.created_at
  }
}

export default async function LetterDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  if (!supabase) {
    return (
      <AuthRequired
        title="Không thể tải thư"
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
        title="Cần đăng nhập để đọc thư"
        message="Đăng nhập để đọc những lá thư trong couple của bạn."
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
            Hãy vào trang thiết lập để tạo hoặc tham gia couple trước khi đọc thư.
          </p>
          <Link href="/setup" className="mt-6 inline-flex rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700">
            Đi tới /setup
          </Link>
        </section>
      </main>
    )
  }

  const { data, error } = await supabase
    .from('letters')
    .select('id, kind, title, message, mood, anonymous, created_at, created_by')
    .eq('id', params.id)
    .eq('couple_id', couple.coupleId)
    .maybeSingle()

  if (error || !data) {
    notFound()
  }

  return (
    <SealedEnvelopeViewer
      letter={toLetterRecord(data)}
      coupleId={couple.coupleId}
      canDelete={Boolean(data.created_by && data.created_by === user.id)}
    />
  )
}
