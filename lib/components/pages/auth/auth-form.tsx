'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useDispatch } from 'react-redux'

import { setAlert } from '@/lib/features/alert/alertSlice'
import { createSupabaseBrowserClient, hasSupabaseEnv } from '@/lib/supabase/client'

export function AuthForm() {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const dispatch = useDispatch()
  const canUseSupabase = hasSupabaseEnv()

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!canUseSupabase) {
      dispatch(
        setAlert({
          type: 'error',
          title: 'Thiếu cấu hình',
          message: 'Vui lòng thêm biến môi trường Supabase trước.'
        })
      )
      return
    }

    if (!email.trim()) {
      dispatch(
        setAlert({
          type: 'warning',
          title: 'Thiếu email',
          message: 'Vui lòng nhập địa chỉ email.'
        })
      )
      return
    }

    try {
      setSending(true)
      const supabase = createSupabaseBrowserClient()
      if (!supabase) {
        throw new Error('Thiếu cấu hình Supabase')
      }

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/setup`
        }
      })

      if (error) {
        throw error
      }

      dispatch(
        setAlert({
          type: 'success',
          title: 'Kiểm tra hộp thư',
          message: 'Magic link/OTP đã được gửi tới email của bạn.'
        })
      )
    } catch (error) {
      dispatch(
        setAlert({
          type: 'error',
          title: 'Đăng nhập thất bại',
          message: error instanceof Error ? error.message : 'Không thể gửi email đăng nhập.'
        })
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mx-auto my-16 w-full max-w-md overflow-hidden rounded-2xl border border-sky-100 bg-white p-6 shadow-sm dark:border-sky-900/40 dark:bg-gray-900">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Đăng nhập vào LoveHub</h1>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
        Nhập email để nhận magic link hoặc OTP từ Supabase.
      </p>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-gray-900 outline-none ring-sky-200 transition focus:ring dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          placeholder="ban@vi-du.com"
        />

        <button
          type="submit"
          disabled={sending || !canUseSupabase}
          className="w-full rounded-xl bg-sky-500 px-4 py-2.5 font-medium text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-sky-300"
        >
          {sending ? 'Đang gửi...' : 'Gửi liên kết đăng nhập'}
        </button>
      </form>

      <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        Sau khi đăng nhập thành công, bạn sẽ được chuyển tới trang thiết lập couple.
      </p>

      <div className="mt-4 text-sm">
        <Link className="text-sky-600 hover:underline dark:text-sky-300" href="/">
          Về trang chủ
        </Link>
      </div>
    </div>
  )
}
