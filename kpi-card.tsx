import { cn } from '@/lib/utils/cn'
import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react'

interface KpiCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  subtitle?: string
  trend?: 'up' | 'down'
  color?: 'blue' | 'amber' | 'orange' | 'red' | 'green' | 'emerald' | 'indigo'
  alert?: boolean
}

const colorMap = {
  blue:    'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400',
  amber:   'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400',
  orange:  'bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400',
  red:     'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400',
  green:   'bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400',
  indigo:  'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400',
}

export function KpiCard({ title, value, icon: Icon, subtitle, trend, color = 'blue', alert }: KpiCardProps) {
  return (
    <div className={cn(
      'bg-white dark:bg-navy-900 rounded-2xl border p-5 transition-shadow hover:shadow-md',
      alert && 'border-red-300 dark:border-red-800'
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">{title}</p>
          <p className="text-2xl font-bold text-navy-900 dark:text-white mt-1">{value}</p>
          {subtitle && (
            <div className="flex items-center gap-1 mt-1">
              {trend === 'up' && <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />}
              {trend === 'down' && <TrendingDown className="h-3.5 w-3.5 text-red-500" />}
              <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
            </div>
          )}
        </div>
        <div className={cn('flex-shrink-0 p-2.5 rounded-xl ml-3', colorMap[color])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}
