'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export type SelectOption = { value: string; label: string }

export function SimpleSelect({
  id,
  value,
  onValueChange,
  options,
  placeholder = 'Select…',
  invalid,
  disabled,
  className,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
}: {
  id?: string
  value: string
  onValueChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  invalid?: boolean
  disabled?: boolean
  className?: string
  'aria-label'?: string
  'aria-describedby'?: string
}) {
  return (
    <Select
      items={options}
      value={value === '' ? null : value}
      onValueChange={(v) => onValueChange((v as string | null) ?? '')}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        className={cn('h-10 w-full', className)}
        aria-invalid={invalid || undefined}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
