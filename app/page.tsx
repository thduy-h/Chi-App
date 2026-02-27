import { Metadata } from 'next'
import Link from 'next/link'

const featureCards = [
  {
    href: '/food',
    title: 'Food',
    description: 'Curate date-night menus, snack boxes, and surprise meal ideas.'
  },
  {
    href: '/cycle',
    title: 'Cycle',
    description: 'Track milestones, moods, and moments that matter to both of you.'
  },
  {
    href: '/tasks',
    title: 'Tasks',
    description: 'Split shared chores and mini goals in a calm, balanced way.'
  },
  {
    href: '/finance',
    title: 'Finance',
    description: 'Plan gift budgets and shared spending with simple clarity.'
  },
  {
    href: '/letters',
    title: 'Letters',
    description: 'Write notes and keepsakes that turn ordinary days into memories.'
  }
]

export const metadata: Metadata = {
  title: 'LoveHub | Gifts And Shared Moments',
  description: 'A modern gift and relationship hub with thoughtful tools for everyday love.'
}

export default function Home() {
  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[26rem] bg-gradient-to-b from-rose-100/80 via-white to-white dark:from-rose-950/30 dark:via-gray-900 dark:to-gray-900" />

      <section className="relative container mx-auto px-4 pb-10 pt-14 sm:px-6 md:pb-14 md:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex rounded-full border border-rose-200 bg-white px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-600 shadow-sm dark:border-rose-800 dark:bg-gray-900 dark:text-rose-300">
            LoveHub
          </p>

          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-5xl md:text-6xl">
            Thoughtful gifts for modern relationships.
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base text-gray-600 dark:text-gray-300 sm:text-lg">
            Build shared habits, send warm notes, and plan meaningful surprises in one minimal space made for two.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/letters"
              className="inline-flex w-full items-center justify-center rounded-full bg-rose-600 px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 sm:w-auto"
            >
              Start With Letters
            </Link>
            <Link
              href="/tasks"
              className="inline-flex w-full items-center justify-center rounded-full border border-rose-200 bg-white px-7 py-3 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 dark:border-rose-900 dark:bg-gray-900 dark:text-rose-200 dark:hover:bg-gray-800 sm:w-auto"
            >
              Explore Shared Tasks
            </Link>
          </div>
        </div>
      </section>

      <section className="relative container mx-auto px-4 pb-16 sm:px-6 md:pb-24">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {featureCards.map((item, index) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-2xl border border-rose-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-rose-300 hover:shadow-md dark:border-rose-900/40 dark:bg-gray-900"
            >
              <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-sm font-semibold text-rose-700 dark:bg-rose-900/50 dark:text-rose-200">
                {`0${index + 1}`}
              </div>

              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{item.description}</p>

              <span className="mt-6 inline-flex items-center text-sm font-semibold text-rose-700 transition group-hover:text-rose-800 dark:text-rose-300 dark:group-hover:text-rose-200">
                Open
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
    </main>
  )
}
