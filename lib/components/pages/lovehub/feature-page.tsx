import Link from 'next/link'

interface LoveHubFeaturePageProps {
  eyebrow: string
  title: string
  description: string
  tips: string[]
}

export const LoveHubFeaturePage = ({
  eyebrow,
  title,
  description,
  tips
}: LoveHubFeaturePageProps) => {
  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-rose-100/80 via-white to-white dark:from-rose-950/30 dark:via-gray-900 dark:to-gray-900" />

      <section className="relative container mx-auto px-4 pb-16 pt-10 sm:px-6 md:pb-20">
        <Link
          href="/"
          className="inline-flex items-center rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50 dark:border-rose-900 dark:bg-gray-900 dark:text-rose-300 dark:hover:bg-gray-800"
        >
          Back To Home
        </Link>

        <div className="mt-5 rounded-3xl border border-rose-100 bg-white p-6 shadow-sm dark:border-rose-900/40 dark:bg-gray-900 md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-600 dark:text-rose-300">
            {eyebrow}
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white md:text-4xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-base text-gray-600 dark:text-gray-300">{description}</p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {tips.map((tip) => (
              <div
                key={tip}
                className="rounded-2xl border border-rose-100 bg-rose-50/60 px-4 py-3 text-sm text-gray-700 dark:border-rose-900/50 dark:bg-rose-950/10 dark:text-gray-200"
              >
                {tip}
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/letters"
              className="inline-flex items-center justify-center rounded-full bg-rose-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-rose-700"
            >
              Write A Letter
            </Link>
            <Link
              href="/tasks"
              className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-white px-6 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-900 dark:bg-gray-900 dark:text-rose-300 dark:hover:bg-gray-800"
            >
              Open Shared Tasks
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
