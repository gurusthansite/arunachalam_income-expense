import { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  amount: string
  subtext?: string
  icon: LucideIcon
  variant?: 'default' | 'income' | 'expense' | 'balance'
  isWarning?: boolean
}

export function StatCard({
  title,
  amount,
  subtext,
  icon: Icon,
  variant = 'default',
  isWarning = false,
}: StatCardProps) {
  return (
    <Card className={cn(
      'relative overflow-hidden transition-all shadow-xs',
      isWarning && 'border-amber-500/50 bg-amber-500/5'
    )}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div
            className={cn(
              'flex size-9 items-center justify-center rounded-lg',
              variant === 'income' && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
              variant === 'expense' && 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
              variant === 'balance' && (isWarning ? 'bg-amber-500/15 text-amber-600' : 'bg-primary/10 text-primary'),
              variant === 'default' && 'bg-muted text-muted-foreground'
            )}
          >
            <Icon className="size-4 shrink-0" />
          </div>
        </div>
        <div className="mt-3">
          <h2
            className={cn(
              'text-2xl font-bold tracking-tight',
              variant === 'income' && 'text-emerald-700 dark:text-emerald-400',
              variant === 'expense' && 'text-rose-700 dark:text-rose-400',
              variant === 'balance' && (isWarning ? 'text-amber-700 dark:text-amber-400' : 'text-foreground')
            )}
          >
            {amount}
          </h2>
          {subtext && (
            <p className="mt-1 text-xs text-muted-foreground">{subtext}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
