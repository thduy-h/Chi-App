type LogoColorMode = 'blue' | 'pink'

export const Logo = ({ colorMode = 'blue' }: { colorMode?: LogoColorMode }) => {
  const gradient = colorMode === 'pink' ? 'from-rose-500 to-fuchsia-500' : 'from-sky-500 to-indigo-500'

  return (
    <span
      aria-hidden="true"
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white shadow-sm ${gradient}`}
    >
      LH
    </span>
  )
}
