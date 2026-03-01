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
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-sky-100/80 via-white to-white dark:from-sky-950/30 dark:via-gray-900 dark:to-gray-900" />

      <section className="relative container mx-auto px-4 pb-16 pt-10 sm:px-6 md:pb-20">
        <Link
          href="/"
          className="inline-flex items-center rounded-full border border-sky-200 bg-white px-4 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-50 dark:border-sky-900 dark:bg-gray-900 dark:text-sky-300 dark:hover:bg-gray-800"
        >
          Back To Home
        </Link>

        <div className="mt-5 rounded-3xl border border-sky-100 bg-white p-6 shadow-sm dark:border-sky-900/40 dark:bg-gray-900 md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600 dark:text-sky-300">
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
                className="rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-sm text-gray-700 dark:border-sky-900/50 dark:bg-sky-950/10 dark:text-gray-200"
              >
                {tip}
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/letters"
              className="inline-flex items-center justify-center rounded-full bg-sky-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              Write A Letter
            </Link>
            <Link
              href="/tasks"
              className="inline-flex items-center justify-center rounded-full border border-sky-200 bg-white px-6 py-3 text-sm font-semibold text-sky-700 transition hover:bg-sky-50 dark:border-sky-900 dark:bg-gray-900 dark:text-sky-300 dark:hover:bg-gray-800"
            >
              Open Shared Tasks
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
