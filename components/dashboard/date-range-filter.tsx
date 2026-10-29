'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Calendar, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface DateRangeFilterProps {
  currentPreset: string
  currentFrom: string | null
  currentTo: string | null
}

export function DateRangeFilter({
  currentPreset,
  currentFrom,
  currentTo,
}: DateRangeFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [fromInput, setFromInput] = useState(currentFrom ?? '')
  const [toInput, setToInput] = useState(currentTo ?? '')
  const [popoverOpen, setPopoverOpen] = useState(false)

  function updatePreset(preset: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (preset === 'custom') {
      params.set('range', 'custom')
      if (fromInput) params.set('from', fromInput)
      if (toInput) params.set('to', toInput)
    } else {
      params.set('range', preset)
      params.delete('from')
      params.delete('to')
    }
    router.push(`?${params.toString()}`)
  }

  function applyCustom() {
    const params = new URLSearchParams(searchParams.toString())
    params.set('range', 'custom')
    if (fromInput) params.set('from', fromInput)
    else params.delete('from')
    if (toInput) params.set('to', toInput)
    else params.delete('to')
    setPopoverOpen(false)
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Tabs
        value={currentPreset}
        onValueChange={(val) => {
          if (val === 'custom') {
            setPopoverOpen(true)
          } else {
            updatePreset(val)
          }
        }}
        className="w-auto"
      >
        <TabsList className="h-9">
          <TabsTrigger value="month" className="text-xs">
            This Month
          </TabsTrigger>
          <TabsTrigger value="last-month" className="text-xs">
            Last Month
          </TabsTrigger>
          <TabsTrigger value="fy" className="text-xs">
            FY
          </TabsTrigger>
          <TabsTrigger value="all" className="text-xs">
            All Time
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="relative inline-block">
        <Button
          variant={currentPreset === 'custom' ? 'default' : 'outline'}
          size="sm"
          className="h-9 gap-1.5 text-xs"
          onClick={() => setPopoverOpen(!popoverOpen)}
        >
          <Calendar className="size-3.5" />
          <span>{currentPreset === 'custom' ? 'Custom Range' : 'Custom'}</span>
        </Button>

        {popoverOpen && (
          <div className="absolute right-0 top-11 z-50 w-72 rounded-lg border bg-popover p-4 shadow-lg ring-1 ring-foreground/5">
            <h4 className="font-semibold text-xs tracking-tight mb-3">Custom Date Range</h4>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">From Date</label>
                <Input
                  type="date"
                  value={fromInput}
                  onChange={(e) => setFromInput(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">To Date</label>
                <Input
                  type="date"
                  value={toInput}
                  onChange={(e) => setToInput(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 mt-2 pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setPopoverOpen(false)}
                >
                  Cancel
                </Button>
                <Button size="sm" className="h-7 text-xs" onClick={applyCustom}>
                  Apply
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
