'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useTheme } from '@/lib/theme-context'

export default function LandingPage() {
  const [isVisible, setIsVisible] = useState(false)
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const modules = [
    {
      id: 1,
      title: 'Money Counting',
      description: 'Learn to count coins and bills with fun interactive games!',
      icon: '💰',
      color: 'from-yellow-400 to-yellow-600',
    },
    {
      id: 2,
      title: 'Savings Visualization',
      description: 'Watch your piggy bank grow and see your savings tree bloom!',
      icon: '🐷',
      color: 'from-pink-400 to-pink-600',
    },
    {
      id: 3,
      title: 'Making Change',
      description: 'Practice calculating change in real shopping scenarios!',
      icon: '🛒',
      color: 'from-blue-400 to-blue-600',
    },
    {
      id: 4,
      title: 'Needs vs Wants',
      description: 'Learn the difference between what you need and what you want!',
      icon: '🎯',
      color: 'from-green-400 to-green-600',
    },
    {
      id: 5,
      title: 'Goal Setting',
      description: 'Set savings goals and track your progress with fun visuals!',
      icon: '🎯',
      color: 'from-purple-400 to-purple-600',
    },
  ]

  return (
    <div className="min-h-screen dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-4xl">💰</span>
            <h1 className="text-2xl font-bold text-primary-600 dark:text-primary-400">Money Adventure</h1>
          </div>
          <nav className="flex items-center space-x-4">
            <button
              type="button"
              onClick={toggleTheme}
              className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              aria-label={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
            </button>
            <Link href="/auth" className="btn-secondary dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600">
              Sign In
            </Link>
            <Link href="/auth" className="btn-primary">
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="flex justify-center mb-6">
            <div className="text-8xl animate-bounce-slow">🎮</div>
          </div>
          <h2 className="text-5xl md:text-6xl font-bold text-gray-800 dark:text-gray-100 mb-4">
            Welcome to <span className="text-primary-500 dark:text-primary-400">Money Adventure</span>!
          </h2>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Learn about money through fun and interactive games designed just for kids!
          </p>
          <div className="flex justify-center space-x-4">
            <Link href="/auth" className="btn-primary text-lg px-8 py-4">
              Start Learning 🚀
            </Link>
            <Link href="#modules" className="btn-secondary text-lg px-8 py-4">
              Explore Modules
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <h3 className="text-4xl font-bold text-center text-gray-800 dark:text-gray-100 mb-12">
          What You'll Learn
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="card text-center">
            <div className="text-6xl mb-4">🎨</div>
            <h4 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Interactive Learning</h4>
            <p className="text-gray-600 dark:text-gray-300">
              Learn through hands-on activities and fun games that make money concepts easy to understand!
            </p>
          </div>
          <div className="card text-center">
            <div className="text-6xl mb-4">📊</div>
            <h4 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Visual Progress</h4>
            <p className="text-gray-600 dark:text-gray-300">
              Watch your savings grow with beautiful animations and see your progress in real-time!
            </p>
          </div>
          <div className="card text-center">
            <div className="text-6xl mb-4">🏆</div>
            <h4 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Achievement System</h4>
            <p className="text-gray-600 dark:text-gray-300">
              Earn rewards and unlock achievements as you master new money skills!
            </p>
          </div>
        </div>
      </section>

      {/* Modules Section */}
      <section id="modules" className="bg-white dark:bg-gray-800/50 py-16 border-t border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4">
          <h3 className="text-4xl font-bold text-center text-gray-800 dark:text-gray-100 mb-12">
            Our Learning Modules
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {modules.map((module, index) => (
              <div
                key={module.id}
                className={`card cursor-pointer ${isVisible ? 'opacity-100' : 'opacity-0'}`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${module.color} flex items-center justify-center text-3xl mb-4 mx-auto`}>
                  {module.icon}
                </div>
                <h4 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3 text-center">
                  {module.title}
                </h4>
                <p className="text-gray-600 dark:text-gray-300 text-center">
                  {module.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-3xl p-12 text-white">
          <h3 className="text-4xl font-bold mb-4">Ready to Start Your Money Adventure?</h3>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of kids learning about money in a fun and interactive way!
          </p>
          <Link href="/auth" className="bg-white text-primary-600 font-bold py-4 px-8 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 inline-block">
            Get Started Free 🎉
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 dark:bg-gray-900 text-white py-8 border-t border-gray-700">
        <div className="container mx-auto px-4 text-center">
          <div className="flex justify-center items-center space-x-2 mb-4">
            <span className="text-2xl">💰</span>
            <h4 className="text-xl font-bold">Money Adventure</h4>
          </div>
          <p className="text-gray-400">
            Interactive Financial Learning for Kids | Computer Graphics Course Project
          </p>
          <p className="text-gray-500 text-sm mt-2">
            © 2024 CUET - Department of Computer Science and Engineering
          </p>
        </div>
      </footer>
    </div>
  )
}

