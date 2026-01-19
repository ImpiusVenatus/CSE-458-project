'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import MoneyCounting from '@/components/modules/MoneyCounting'
import SavingsVisualization from '@/components/modules/SavingsVisualization'
import MakingChange from '@/components/modules/MakingChange'
import NeedsVsWants from '@/components/modules/NeedsVsWants'
import GoalSetting from '@/components/modules/GoalSetting'

export default function DashboardPage() {
  const [selectedModule, setSelectedModule] = useState<number | null>(null)
  const router = useRouter()

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
  ]

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
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-4xl">💰</span>
            <h1 className="text-2xl font-bold text-primary-600">Money Adventure</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/auth')}
              className="text-gray-600 hover:text-primary-600 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Sidebar - Module Navigation */}
        <aside className="w-64 bg-white shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Learning Modules</h2>
          <nav className="space-y-2">
            {modules.map((module) => (
              <button
                key={module.id}
                onClick={() => setSelectedModule(module.id)}
                className={`w-full text-left p-3 rounded-lg transition-all ${
                  selectedModule === module.id
                    ? 'bg-primary-100 text-primary-700 font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
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

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col">
          {!selectedModule ? (
            <div className="flex-1 relative bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
              <div className="text-center bg-white/90 rounded-2xl p-8 shadow-lg">
                <h3 className="text-3xl font-bold text-gray-800 mb-4">
                  Welcome to Money Adventure! 🎉
                </h3>
                <p className="text-lg text-gray-600 mb-6">
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
            <div className="flex-1 bg-gradient-to-br from-blue-50 to-purple-50">
              {renderModule()}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

