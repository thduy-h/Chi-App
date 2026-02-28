'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useDispatch } from 'react-redux'

import { setAlert } from '@/lib/features/alert/alertSlice'
import { createClient, hasSupabaseEnv } from '@/lib/supabase/browser'

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
          title: 'Missing env',
          message: 'Please add Supabase env variables first.'
        })
      )
      return
    }

    if (!email.trim()) {
      dispatch(
        setAlert({
          type: 'warning',
          title: 'Email required',
          message: 'Please enter your email address.'
        })
      )
      return
    }

    try {
      setSending(true)
      const supabase = createClient()
      if (!supabase) {
        throw new Error('Supabase env is missing')
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
          title: 'Check your inbox',
          message: 'Magic link/OTP has been sent to your email.'
        })
      )
    } catch (error) {
      dispatch(
        setAlert({
          type: 'error',
          title: 'Auth failed',
          message: error instanceof Error ? error.message : 'Unable to send auth email'
        })
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mx-auto my-16 w-full max-w-md overflow-hidden rounded-2xl border border-rose-100 bg-white p-6 shadow-sm dark:border-rose-900/40 dark:bg-gray-900">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Login to LoveHub</h1>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
        Enter your email to receive a magic link or OTP from Supabase.
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
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-gray-900 outline-none ring-rose-200 transition focus:ring dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          placeholder="you@example.com"
        />

        <button
          type="submit"
          disabled={sending || !canUseSupabase}
          className="w-full rounded-xl bg-rose-500 px-4 py-2.5 font-medium text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-rose-300"
        >
          {sending ? 'Sending...' : 'Send login link'}
        </button>
      </form>

      <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        After successful login, you will be redirected to couple setup.
      </p>

      <div className="mt-4 text-sm">
        <Link className="text-rose-600 hover:underline dark:text-rose-300" href="/">
          Back to home
        </Link>
      </div>
    </div>
  )
}
