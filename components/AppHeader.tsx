'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { clearProgress } from '@/lib/progress'
import { useTheme } from '@/lib/theme-context'

type AppHeaderProps = {
  active: 'modules' | 'monitor'
}

function navClass(active: boolean) {
  return active
    ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300'
    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
}

export function AppHeader({ active }: AppHeaderProps) {
  const router = useRouter()
  const supabase = createClient()
  const { theme, toggleTheme } = useTheme()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    clearProgress()
    router.push('/auth')
    router.refresh()
  }

  return (
    <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-4xl">💰</span>
            <h1 className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              Money Adventure
            </h1>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${navClass(active === 'modules')}`}
            >
              Modules
            </Link>
            <Link
              href="/monitor"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${navClass(active === 'monitor')}`}
            >
              Dashboard
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={toggleTheme}
            className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  )
}
