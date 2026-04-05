'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ProgressProvider } from '@/lib/progress-context'
import { AppHeader } from '@/components/AppHeader'
import MoneyCounting from '@/components/modules/MoneyCounting'
import SavingsVisualization from '@/components/modules/SavingsVisualization'
import MakingChange from '@/components/modules/MakingChange'
import NeedsVsWants from '@/components/modules/NeedsVsWants'
import GoalSetting from '@/components/modules/GoalSetting'
import BudgetGame from '@/components/modules/BudgetGame'
import MoneyTown from '@/components/modules/MoneyTown'

const modules = [
  {
    id: 1,
    title: 'Money Counting',
    description: 'Learn to count coins and bills',
    icon: '💰',
    color: '#fbbf24',
  },
  {
    id: 2,
    title: 'Savings Visualization',
    description: 'Watch your piggy bank grow',
    icon: '🐷',
    color: '#ec4899',
  },
  {
    id: 3,
    title: 'Making Change',
    description: 'Practice calculating change',
    icon: '🛒',
    color: '#3b82f6',
  },
  {
    id: 4,
    title: 'Needs vs Wants',
    description: 'Learn financial decision-making',
    icon: '🎯',
    color: '#10b981',
  },
  {
    id: 5,
    title: 'Goal Setting',
    description: 'Track your savings goals',
    icon: '🎯',
    color: '#8b5cf6',
  },
  {
    id: 6,
    title: 'Budget Game',
    description: 'Month-by-month budgeting simulation',
    icon: '📊',
    color: '#0ea5e9',
  },
  {
    id: 7,
    title: 'MoneyTown',
    description: 'Kid-friendly board game: roll, move, earn & spend',
    icon: '🏠',
    color: '#8b5cf6',
  },
]

export default function DashboardPage() {
  const [selectedModule, setSelectedModule] = useState<number | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null)
    })
  }, [])

  const renderModule = () => {
    switch (selectedModule) {
      case 1:
        return <MoneyCounting />
      case 2:
        return <SavingsVisualization />
      case 3:
        return <MakingChange />
      case 4:
        return <NeedsVsWants />
      case 5:
        return <GoalSetting />
      case 6:
        return <BudgetGame />
      case 7:
        return <MoneyTown />
      default:
        return null
    }
  }

  return (
    <ProgressProvider userId={userId}>
      <div className="min-h-screen flex flex-col dark:bg-gray-900">
        <AppHeader active="modules" />

        <div className="flex-1 flex">
          <aside className="w-64 bg-white dark:bg-gray-800 shadow-lg p-6 border-r border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">
              Learning Modules
            </h2>
            <nav className="space-y-2">
              {modules.map((module) => (
                <button
                  key={module.id}
                  onClick={() => setSelectedModule(module.id)}
                  className={`w-full text-left p-3 rounded-lg transition-all ${
                    selectedModule === module.id
                      ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 font-semibold'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{module.icon}</span>
                    <span>{module.title}</span>
                  </div>
                </button>
              ))}
            </nav>
          </aside>

          <main className="flex-1 flex flex-col dark:bg-gray-900">
            {!selectedModule ? (
              <div className="flex-1 relative bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
                <div className="text-center bg-white/90 dark:bg-gray-800/90 rounded-2xl p-8 shadow-lg dark:border dark:border-gray-700">
                  <h3 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-4">
                    Welcome to Money Adventure! 🎉
                  </h3>
                  <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                    Select a module from the sidebar to start learning
                  </p>
                  <div className="flex justify-center space-x-2">
                    <span className="text-4xl animate-bounce">💰</span>
                    <span className="text-4xl animate-bounce" style={{ animationDelay: '0.1s' }}>
                      🐷
                    </span>
                    <span className="text-4xl animate-bounce" style={{ animationDelay: '0.2s' }}>
                      🛒
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
                {renderModule()}
              </div>
            )}
          </main>
        </div>
      </div>
    </ProgressProvider>
  )
}
