'use client'

import { CheckCircle2, Circle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { ApplicationStatus, STATUS_PIPELINE, STATUS_LABELS } from '@/types'

interface StatusStepperProps {
  currentStatus: ApplicationStatus
}

export function StatusStepper({ currentStatus }: StatusStepperProps) {
  const currentIndex = STATUS_PIPELINE.indexOf(currentStatus)
  // Handle statuses not in the pipeline (correction_required, rejected, closed etc.)
  const effectiveIndex = currentIndex === -1
    ? (currentStatus === 'correction_required' ? 4 : STATUS_PIPELINE.length - 1)
    : currentIndex

  return (
    <div className="relative">
      {/* Desktop: horizontal */}
      <div className="hidden md:flex items-start justify-between">
        {STATUS_PIPELINE.map((status, index) => {
          const isDone = index < effectiveIndex
          const isCurrent = index === effectiveIndex
          const isPending = index > effectiveIndex

          return (
            <div key={status} className="flex flex-col items-center flex-1 relative">
              {/* Connector line */}
              {index < STATUS_PIPELINE.length - 1 && (
                <div className={cn(
                  'absolute top-4 left-1/2 w-full h-0.5',
                  isDone ? 'bg-emerald-500' : 'bg-border'
                )} />
              )}

              {/* Circle */}
              <div className={cn(
                'relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all',
                isDone ? 'bg-emerald-500 border-emerald-500 text-white' :
                isCurrent ? 'bg-navy-900 border-navy-900 text-white' :
                'bg-background border-border text-muted-foreground'
              )}>
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : isCurrent ? (
                  <Clock className="h-3.5 w-3.5" />
                ) : (
                  <Circle className="h-3.5 w-3.5" />
                )}
              </div>

              {/* Label */}
              <span className={cn(
                'mt-2 text-xs text-center max-w-[70px] leading-tight',
                isCurrent ? 'text-navy-900 dark:text-white font-semibold' :
                isDone ? 'text-emerald-700 dark:text-emerald-400' :
                'text-muted-foreground'
              )}>
                {STATUS_LABELS[status]}
              </span>
            </div>
          )
        })}
      </div>

      {/* Mobile: vertical compact */}
      <div className="md:hidden space-y-3">
        {STATUS_PIPELINE.map((status, index) => {
          const isDone = index < effectiveIndex
          const isCurrent = index === effectiveIndex
          const isPending = index > effectiveIndex
          if (isPending && index > effectiveIndex + 2) return null // Show only next 2

          return (
            <div key={status} className="flex items-center gap-3">
              <div className={cn(
                'flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center',
                isDone ? 'bg-emerald-500 border-emerald-500 text-white' :
                isCurrent ? 'bg-navy-900 border-navy-900 text-white' :
                'bg-background border-border text-muted-foreground'
              )}>
                {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> :
                 isCurrent ? <Clock className="h-3 w-3" /> :
                 <Circle className="h-3 w-3" />}
              </div>
              <span className={cn(
                'text-sm',
                isCurrent ? 'font-semibold text-navy-900 dark:text-white' :
                isDone ? 'text-emerald-700 dark:text-emerald-400' :
                'text-muted-foreground'
              )}>
                {STATUS_LABELS[status]}
                {isCurrent && <span className="ml-2 text-xs text-muted-foreground">(current)</span>}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
