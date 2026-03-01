import Link from 'next/link'

interface AuthRequiredProps {
  title?: string
  message?: string
}

export function AuthRequired({ title = 'Cần đăng nhập', message }: AuthRequiredProps) {
  return (
    <main className="container mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <section className="rounded-2xl border border-sky-100 bg-white p-6 shadow-sm dark:border-sky-900/40 dark:bg-gray-900">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{title}</h1>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
          {message ?? 'Bạn cần đăng nhập để tiếp tục sử dụng tính năng này.'}
        </p>
        <Link
          href="/auth"
          className="mt-6 inline-flex rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-600"
        >
          Đăng nhập
        </Link>
      </section>
    </main>
  )
}
