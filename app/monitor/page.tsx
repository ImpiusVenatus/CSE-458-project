'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AppHeader } from '@/components/AppHeader'
import { createClient } from '@/lib/supabase/client'
import {
  getProgress,
  getProgressEventName,
  type MonitorModuleKey,
  type ProgressData,
  type RecentActivity,
} from '@/lib/progress'

const moduleLabels: Record<MonitorModuleKey, string> = {
  moneyCounting: 'Money Counting',
  savingsVisualization: 'Savings',
  makingChange: 'Making Change',
  needsVsWants: 'Needs vs Wants',
}

const moduleColors: Record<MonitorModuleKey, string> = {
  moneyCounting: '#f59e0b',
  savingsVisualization: '#10b981',
  makingChange: '#3b82f6',
  needsVsWants: '#f97316',
}

function formatTimestamp(value?: string) {
  if (!value) return 'No activity yet'
  return new Date(value).toLocaleString()
}

function percentage(value: number) {
  return `${Math.round(value)}%`
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-3xl border border-white/60 bg-white/80 dark:bg-gray-800/85 dark:border-gray-700 shadow-xl p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{title}</h2>
          {subtitle ? (
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  )
}

function MetricCard({
  label,
  value,
  note,
}: {
  label: string
  value: string
  note: string
}) {
  return (
    <div className="rounded-2xl bg-white/90 dark:bg-gray-800/95 border border-white/70 dark:border-gray-700 shadow-lg p-4">
      <div className="text-sm font-semibold text-gray-600 dark:text-gray-300">{label}</div>
      <div className="text-3xl font-black text-gray-900 dark:text-gray-100 mt-2">{value}</div>
      <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">{note}</div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 dark:border-gray-600 bg-slate-50/80 dark:bg-gray-900/40 p-8 text-center">
      <div className="text-4xl mb-3">📈</div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
        Guardian insights will appear here
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 max-w-2xl mx-auto">
        Ask the child to play the first four modules. This page reads browser localStorage,
        so the charts fill in automatically as they complete challenges and rounds.
      </p>
    </div>
  )
}

export default function MonitorPage() {
  const [userId, setUserId] = useState<string | null | undefined>(undefined)
  const [progress, setProgress] = useState<ProgressData>({})

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null)
    })
  }, [])

  useEffect(() => {
    if (userId === undefined) return

    const sync = () => {
      setProgress(getProgress(userId))
    }

    sync()

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key.includes('money-adventure-progress')) {
        sync()
      }
    }

    const handleProgressUpdate = () => {
      sync()
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener(getProgressEventName(), handleProgressUpdate)

    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener(getProgressEventName(), handleProgressUpdate)
    }
  }, [userId])

  const moneyCounting = progress.moneyCounting?.analytics
  const savings = progress.savingsVisualization?.analytics
  const makingChange = progress.makingChange?.analytics
  const needsVsWants = progress.needsVsWants?.analytics

  const hasMoneyCountingData = Boolean(moneyCounting?.history.length)
  const hasSavingsData = Boolean(
    savings?.roundHistory.length || (savings?.totalSaved ?? 0) || (savings?.totalSpent ?? 0)
  )
  const hasMakingChangeData = Boolean(makingChange?.customersSeen)
  const hasNeedsVsWantsData = Boolean(
    needsVsWants?.history.length ||
      (needsVsWants?.correctPlacements ?? 0) ||
      (needsVsWants?.incorrectPlacements ?? 0)
  )

  const recentActivity = useMemo(
    () =>
      [...(progress.recentActivity ?? [])].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ),
    [progress.recentActivity]
  )

  const moneyCountingScore = moneyCounting?.history.length
    ? (moneyCounting.history.reduce(
        (sum, item) => sum + (item.minimumNotes / item.notesUsed) * 100,
        0
      ) /
        moneyCounting.history.length)
    : 0

  const savingsScore =
    savings && savings.totalSaved + savings.totalSpent > 0
      ? (savings.totalSaved / (savings.totalSaved + savings.totalSpent)) * 100
      : 0

  const makingChangeScore =
    makingChange?.customersSeen ? (makingChange.servedCount / makingChange.customersSeen) * 100 : 0

  const needsVsWantsScore =
    needsVsWants && needsVsWants.correctPlacements + needsVsWants.incorrectPlacements > 0
      ? (needsVsWants.correctPlacements /
          (needsVsWants.correctPlacements + needsVsWants.incorrectPlacements)) *
        100
      : 0

  const strongestModule = useMemo(() => {
    const candidates = [
      { key: 'moneyCounting' as const, score: moneyCountingScore, active: hasMoneyCountingData },
      { key: 'savingsVisualization' as const, score: savingsScore, active: hasSavingsData },
      { key: 'makingChange' as const, score: makingChangeScore, active: hasMakingChangeData },
      { key: 'needsVsWants' as const, score: needsVsWantsScore, active: hasNeedsVsWantsData },
    ].filter((item) => item.active)

    if (!candidates.length) return 'No data yet'

    const best = candidates.reduce((winner, item) =>
      item.score > winner.score ? item : winner
    )

    return moduleLabels[best.key]
  }, [
    hasMakingChangeData,
    hasMoneyCountingData,
    hasNeedsVsWantsData,
    hasSavingsData,
    makingChangeScore,
    moneyCountingScore,
    needsVsWantsScore,
    savingsScore,
  ])

  const averagePerformance = useMemo(() => {
    const scores = [
      hasMoneyCountingData ? moneyCountingScore : null,
      hasSavingsData ? savingsScore : null,
      hasMakingChangeData ? makingChangeScore : null,
      hasNeedsVsWantsData ? needsVsWantsScore : null,
    ].filter((value): value is number => value !== null)

    if (!scores.length) return 0
    return scores.reduce((sum, value) => sum + value, 0) / scores.length
  }, [
    hasMakingChangeData,
    hasMoneyCountingData,
    hasNeedsVsWantsData,
    hasSavingsData,
    makingChangeScore,
    moneyCountingScore,
    needsVsWantsScore,
    savingsScore,
  ])

  const activityByModule = [
    {
      name: 'Money Counting',
      value: moneyCounting?.challengesCompleted ?? 0,
      color: moduleColors.moneyCounting,
    },
    {
      name: 'Savings',
      value: savings?.roundsPlayed ?? 0,
      color: moduleColors.savingsVisualization,
    },
    {
      name: 'Making Change',
      value: makingChange?.customersSeen ?? 0,
      color: moduleColors.makingChange,
    },
    {
      name: 'Needs vs Wants',
      value: needsVsWants?.roundsCompleted ?? 0,
      color: moduleColors.needsVsWants,
    },
  ]

  const timelineData = useMemo(() => {
    const grouped = recentActivity.reduce<Record<string, number>>((acc, item) => {
      const label = new Date(item.timestamp).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
      acc[label] = (acc[label] ?? 0) + 1
      return acc
    }, {})

    return Object.entries(grouped).map(([label, count]) => ({
      label,
      count,
    }))
  }, [recentActivity])

  const moneyCountingChart = (moneyCounting?.history ?? []).map((item, index) => ({
    label: `C${index + 1}`,
    goal: item.goal,
    notesUsed: item.notesUsed,
    minimum: item.minimumNotes,
    limit: item.maxAllowedNotes,
    efficiency: Math.round((item.minimumNotes / item.notesUsed) * 100),
  }))

  const savingsRoundChart = (savings?.roundHistory ?? []).map((item, index) => ({
    label: `R${index + 1}`,
    earned: item.earned,
  }))

  const savingsBalanceChart = [
    { name: 'Saved', value: savings?.totalSaved ?? 0, color: '#10b981' },
    { name: 'Spent', value: savings?.totalSpent ?? 0, color: '#f97316' },
  ]

  const makingChangeStatusChart = [
    { name: 'Served', value: makingChange?.servedCount ?? 0, color: '#10b981' },
    { name: 'Denied', value: makingChange?.deniedCount ?? 0, color: '#ef4444' },
    { name: 'Hints used', value: makingChange?.hintUses ?? 0, color: '#6366f1' },
  ]

  const makingChangeHistoryChart = (makingChange?.history ?? []).map((item, index) => ({
    label: `T${index + 1}`,
    changeDue: item.changeDue,
    status: item.status === 'served' ? 1 : 0,
  }))

  const needsVsWantsRoundChart = (needsVsWants?.history ?? []).map((item, index) => ({
    label: `R${index + 1}`,
    accuracy: Math.round((item.score / item.totalItems) * 100),
  }))

  const needsVsWantsSplitChart = [
    {
      name: 'Correct',
      value: needsVsWants?.correctPlacements ?? 0,
      color: '#10b981',
    },
    {
      name: 'Incorrect',
      value: needsVsWants?.incorrectPlacements ?? 0,
      color: '#f97316',
    },
  ]

  const hasData =
    activityByModule.some((item) => item.value > 0) || recentActivity.length > 0

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-100 via-blue-50 to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <AppHeader active="monitor" />

      <main className="flex-1 container mx-auto px-4 py-8 space-y-8">
        <section className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-600 dark:text-primary-300">
              Guardian Monitor
            </p>
            <h1 className="text-4xl font-black text-gray-900 dark:text-gray-100 mt-2">
              Child learning dashboard
            </h1>
            <p className="text-base text-gray-600 dark:text-gray-300 mt-3 max-w-3xl">
              Follow recent game activity, module performance, and saving habits from
              this browser. The charts update as the child plays Money Counting,
              Savings, Making Change, and Needs vs Wants.
            </p>
          </div>
          <div className="rounded-2xl border border-white/60 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 shadow-lg px-5 py-4">
            <div className="text-sm font-semibold text-gray-600 dark:text-gray-300">
              Last synced
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">
              {formatTimestamp(progress.updatedAt)}
            </div>
          </div>
        </section>

        {!hasData ? (
          <EmptyState />
        ) : (
          <>
            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <MetricCard
                label="Total Activity"
                value={String(activityByModule.reduce((sum, item) => sum + item.value, 0))}
                note="Completed module events tracked in localStorage"
              />
              <MetricCard
                label="Average Performance"
                value={percentage(averagePerformance)}
                note="Average of module performance scores with available data"
              />
              <MetricCard
                label="Recent Events"
                value={String(recentActivity.length)}
                note="Most recent guardian-visible actions"
              />
              <MetricCard
                label="Strongest Module"
                value={strongestModule}
                note="Highest current performance score"
              />
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-6">
              <SectionCard
                title="Cross-module activity"
                subtitle="Compare how often the child is interacting with each tracked learning module."
              >
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={activityByModule}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                      <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fill: '#475569', fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                        {activityByModule.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </SectionCard>

              <SectionCard
                title="Activity timeline"
                subtitle="Shows when browser-local progress events were recorded."
              >
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timelineData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                      <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fill: '#475569', fontSize: 12 }} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        dot={{ r: 5, fill: '#3b82f6' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </SectionCard>
            </section>

            <SectionCard
              title="Recent guardian activity"
              subtitle="Useful for spotting which concepts the child touched most recently."
            >
              <div className="grid gap-3">
                {recentActivity.slice(0, 8).map((item: RecentActivity) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 dark:border-gray-700 bg-slate-50/70 dark:bg-gray-900/40 px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
                  >
                    <div>
                      <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {moduleLabels[item.module]}: {item.action}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {item.detail}
                      </div>
                    </div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {formatTimestamp(item.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <SectionCard
                title="Money Counting"
                subtitle="Tracks completed challenges and how efficiently the child matched the target amount."
              >
                <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_0.9fr] gap-4 items-center">
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={moneyCountingChart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                        <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 12 }} />
                        <YAxis allowDecimals={false} tick={{ fill: '#475569', fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="notesUsed" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="minimum" fill="#0f766e" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3">
                    <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3">
                      <div className="text-sm font-semibold text-amber-900">Completed challenges</div>
                      <div className="text-3xl font-black text-amber-700 mt-1">
                        {moneyCounting?.challengesCompleted ?? 0}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-teal-50 border border-teal-200 px-4 py-3">
                      <div className="text-sm font-semibold text-teal-900">Average efficiency</div>
                      <div className="text-3xl font-black text-teal-700 mt-1">
                        {percentage(moneyCountingScore)}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Efficiency compares the fewest possible notes with the number of
                      notes actually used in recent completed challenges.
                    </p>
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Savings Visualization"
                subtitle="Highlights how often coins are saved versus spent after each round."
              >
                <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-4 items-center">
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={savingsRoundChart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                        <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 12 }} />
                        <YAxis allowDecimals={false} tick={{ fill: '#475569', fontSize: 12 }} />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="earned"
                          stroke="#10b981"
                          strokeWidth={3}
                          dot={{ r: 5, fill: '#10b981' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={savingsBalanceChart} dataKey="value" innerRadius={55} outerRadius={90}>
                          {savingsBalanceChart.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                  <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3">
                    <div className="text-sm font-semibold text-emerald-900">Total earned</div>
                    <div className="text-2xl font-black text-emerald-700 mt-1">
                      {savings?.totalEarned ?? 0}৳
                    </div>
                  </div>
                  <div className="rounded-2xl bg-teal-50 border border-teal-200 px-4 py-3">
                    <div className="text-sm font-semibold text-teal-900">Saved</div>
                    <div className="text-2xl font-black text-teal-700 mt-1">
                      {savings?.totalSaved ?? 0}৳
                    </div>
                  </div>
                  <div className="rounded-2xl bg-orange-50 border border-orange-200 px-4 py-3">
                    <div className="text-sm font-semibold text-orange-900">Spent</div>
                    <div className="text-2xl font-black text-orange-700 mt-1">
                      {savings?.totalSpent ?? 0}৳
                    </div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Making Change"
                subtitle="Tracks how often customers are served successfully and how often hints are needed."
              >
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4">
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={makingChangeStatusChart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                        <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 12 }} />
                        <YAxis allowDecimals={false} tick={{ fill: '#475569', fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                          {makingChangeStatusChart.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={makingChangeHistoryChart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                        <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 12 }} />
                        <YAxis allowDecimals={false} tick={{ fill: '#475569', fontSize: 12 }} />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="changeDue"
                          stroke="#2563eb"
                          strokeWidth={3}
                          dot={{ r: 5, fill: '#2563eb' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300 mt-4">
                  Success rate: {percentage(makingChangeScore)}. Average change due:{' '}
                  {makingChange?.customersSeen
                    ? `${Math.round(makingChange.totalChangeDue / makingChange.customersSeen)}৳`
                    : '0৳'}
                </div>
              </SectionCard>

              <SectionCard
                title="Needs vs Wants"
                subtitle="Shows sorting accuracy and whether the child is classifying essentials consistently."
              >
                <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-4 items-center">
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={needsVsWantsRoundChart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                        <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 12 }} />
                        <YAxis
                          domain={[0, 100]}
                          tick={{ fill: '#475569', fontSize: 12 }}
                        />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="accuracy"
                          stroke="#f97316"
                          strokeWidth={3}
                          dot={{ r: 5, fill: '#f97316' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={needsVsWantsSplitChart}
                          dataKey="value"
                          innerRadius={55}
                          outerRadius={90}
                        >
                          {needsVsWantsSplitChart.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                  <div className="rounded-2xl bg-orange-50 border border-orange-200 px-4 py-3">
                    <div className="text-sm font-semibold text-orange-900">Accuracy</div>
                    <div className="text-2xl font-black text-orange-700 mt-1">
                      {percentage(needsVsWantsScore)}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3">
                    <div className="text-sm font-semibold text-emerald-900">Correct placements</div>
                    <div className="text-2xl font-black text-emerald-700 mt-1">
                      {needsVsWants?.correctPlacements ?? 0}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-sky-50 border border-sky-200 px-4 py-3">
                    <div className="text-sm font-semibold text-sky-900">Perfect rounds</div>
                    <div className="text-2xl font-black text-sky-700 mt-1">
                      {needsVsWants?.perfectRounds ?? 0}
                    </div>
                  </div>
                </div>
              </SectionCard>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
