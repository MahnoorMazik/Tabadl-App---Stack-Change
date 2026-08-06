'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { CalendarIcon, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'
import { CanvasField, isDisplayOnlyFieldType } from './types'
import { FieldHelpTooltip } from '@/components/forms/FieldHelpTooltip'
import { useLocale } from '@/contexts/LocaleContext'

// ─── Country data ───────────────────────────────────────────────────────────

interface Country {
  code: string
  name: string
  dial: string
  flag: string
}

const COUNTRIES: Country[] = [
  { code: 'SA', name: 'Saudi Arabia', dial: '+966', flag: '🇸🇦' },
  { code: 'PK', name: 'Pakistan', dial: '+92', flag: '🇵🇰' },
  { code: 'AE', name: 'United Arab Emirates', dial: '+971', flag: '🇦🇪' },
  { code: 'US', name: 'United States', dial: '+1', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧' },
  { code: 'IN', name: 'India', dial: '+91', flag: '🇮🇳' },
  { code: 'EG', name: 'Egypt', dial: '+20', flag: '🇪🇬' },
  { code: 'JO', name: 'Jordan', dial: '+962', flag: '🇯🇴' },
  { code: 'KW', name: 'Kuwait', dial: '+965', flag: '🇰🇼' },
  { code: 'QA', name: 'Qatar', dial: '+974', flag: '🇶🇦' },
  { code: 'BH', name: 'Bahrain', dial: '+973', flag: '🇧🇭' },
  { code: 'OM', name: 'Oman', dial: '+968', flag: '🇴🇲' },
  { code: 'TR', name: 'Turkey', dial: '+90', flag: '🇹🇷' },
  { code: 'DE', name: 'Germany', dial: '+49', flag: '🇩🇪' },
  { code: 'FR', name: 'France', dial: '+33', flag: '🇫🇷' },
  { code: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', dial: '+61', flag: '🇦🇺' },
  { code: 'NG', name: 'Nigeria', dial: '+234', flag: '🇳🇬' },
  { code: 'PH', name: 'Philippines', dial: '+63', flag: '🇵🇭' },
  { code: 'BD', name: 'Bangladesh', dial: '+880', flag: '🇧🇩' },
]

// ─── Per-country phone rules (min digits, max digits) ─────────────────────────

const PHONE_RULES: Record<string, { min: number; max: number; hint: string }> = {
  SA: { min: 9,  max: 9,  hint: '5XX XXX XXX' },
  AE: { min: 9,  max: 9,  hint: '5X XXX XXXX' },
  PK: { min: 10, max: 10, hint: '3XX XXXXXXX' },
  US: { min: 10, max: 10, hint: 'XXX XXX XXXX' },
  GB: { min: 10, max: 11, hint: 'XXXX XXXXXX' },
  IN: { min: 10, max: 10, hint: 'XXXXX XXXXX' },
  EG: { min: 10, max: 10, hint: '1XX XXX XXXX' },
  JO: { min: 9,  max: 9,  hint: '7X XXX XXXX' },
  KW: { min: 8,  max: 8,  hint: 'XXXX XXXX' },
  QA: { min: 8,  max: 8,  hint: 'XXXX XXXX' },
  BH: { min: 8,  max: 8,  hint: 'XXXX XXXX' },
  OM: { min: 8,  max: 8,  hint: 'XXXX XXXX' },
  TR: { min: 10, max: 10, hint: 'XXX XXX XXXX' },
  DE: { min: 10, max: 12, hint: 'XXXX XXXXXXXX' },
  FR: { min: 9,  max: 9,  hint: 'X XX XX XX XX' },
  CA: { min: 10, max: 10, hint: 'XXX XXX XXXX' },
  AU: { min: 9,  max: 9,  hint: 'XXX XXX XXX' },
  NG: { min: 10, max: 10, hint: 'XXX XXX XXXX' },
  PH: { min: 10, max: 10, hint: 'XXX XXX XXXX' },
  BD: { min: 10, max: 10, hint: 'XXXX XXXXXX' },
}

const DEFAULT_RULE = { min: 7, max: 15, hint: 'Phone number' }

// ─── Phone Input ─────────────────────────────────────────────────────────────

function PhoneInput({ id }: { id: string }) {
  const [selected, setSelected] = useState<Country>(COUNTRIES[0])
  const [number, setNumber] = useState('')
  const [touched, setTouched] = useState(false)
  const [open, setOpen] = useState(false)

  const rule = PHONE_RULES[selected.code] ?? DEFAULT_RULE
  const digits = number.replace(/\D/g, '')

  // Compute live error message
  const getError = (val: string, digitCount: number): string => {
    if (!val) return ''                                          // empty — no error until blur
    if (digitCount < rule.min)
      return `Too short — needs ${rule.min} digit${rule.min === 1 ? '' : 's'} (entered ${digitCount})`
    if (digitCount > rule.max)
      return `Too long — max ${rule.max} digit${rule.max === 1 ? '' : 's'} for ${selected.name}`
    return ''
  }

  const blurError = touched && !number ? 'Phone number is required' : ''
  const liveError = number ? getError(number, digits.length) : ''
  const error = blurError || liveError

  return (
    <div className="space-y-1">
      <div className="flex">
        {/* Country selector */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className={cn(
                'flex items-center gap-1.5 rounded-r-none border-r-0 px-3 h-10 min-w-[100px] shrink-0 font-normal',
                error && 'border-destructive'
              )}
            >
              <span className="text-lg leading-none">{selected.flag}</span>
              <span className="text-sm tabular-nums">{selected.dial}</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground ml-auto" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[270px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search country…" />
              <CommandList className="max-h-60">
                <CommandEmpty>No country found.</CommandEmpty>
                <CommandGroup>
                  {COUNTRIES.map((c) => (
                    <CommandItem
                      key={c.code}
                      value={`${c.name} ${c.dial}`}
                      onSelect={() => {
                        setSelected(c)
                        setOpen(false)
                      }}
                    >
                      <span className="text-lg mr-2">{c.flag}</span>
                      <span className="flex-1 text-sm">{c.name}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{c.dial}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Number input */}
        <Input
          id={id}
          type="tel"
          inputMode="numeric"
          placeholder={rule.hint}
          value={number}
          maxLength={rule.max + 4} // allow spaces/dashes
          onChange={(e) => {
            // Only digits, spaces, dashes
            const cleaned = e.target.value.replace(/[^\d\s\-]/g, '')
            // Hard-cap at max digits
            if (cleaned.replace(/\D/g, '').length > rule.max) return
            setNumber(cleaned)
          }}
          onBlur={() => setTouched(true)}
          className={cn(
            'rounded-l-none flex-1',
            error && 'border-destructive focus-visible:ring-destructive'
          )}
        />
      </div>

      {/* Error or digit-count hint */}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : number ? (
        <p className={cn(
          'text-xs tabular-nums',
          digits.length === rule.max ? 'text-emerald-600' : 'text-muted-foreground'
        )}>
          {digits.length} / {rule.max} digits
          {digits.length === rule.max && ' ✓'}
        </p>
      ) : null}
    </div>
  )
}

// ─── Date Picker ─────────────────────────────────────────────────────────────

function DatePickerInput({ id }: { id: string }) {
  const [date, setDate] = useState<Date | undefined>()
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal h-10',
            !date && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {date ? format(date, 'PPP') : 'Pick a date'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            setDate(d)
            setOpen(false)
          }}
          disabled={{ after: new Date() }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

// ─── Number Input ─────────────────────────────────────────────────────────────

function NumberInput({ id }: { id: string }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  return (
    <div className="space-y-1">
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        placeholder="0"
        value={value}
        onChange={(e) => {
          const raw = e.target.value
          // Only allow digits, optional leading minus, optional decimal point
          if (!/^-?\d*\.?\d*$/.test(raw) && raw !== '') return
          setValue(raw)
          setError(raw && isNaN(Number(raw)) ? 'Please enter a valid number' : '')
        }}
        className={cn(error && 'border-destructive focus-visible:ring-destructive')}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

// ─── Email Input ─────────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function EmailInput({ id }: { id: string }) {
  const [value, setValue] = useState('')
  const [touched, setTouched] = useState(false)
  const invalid = touched && value.length > 0 && !EMAIL_REGEX.test(value)

  return (
    <div className="space-y-1">
      <Input
        id={id}
        type="email"
        placeholder="name@example.com"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => setTouched(true)}
        className={cn(invalid && 'border-destructive focus-visible:ring-destructive')}
      />
      {invalid && <p className="text-xs text-destructive">Please enter a valid email address</p>}
    </div>
  )
}

// ─── Radio Group ──────────────────────────────────────────────────────────────

function RadioGroup({ id, options }: { id: string; options: string[] }) {
  const [selected, setSelected] = useState<string | null>(null)
  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <div key={opt} className="flex items-center gap-2">
          <input
            type="radio"
            name={id}
            id={`${id}-${opt}`}
            checked={selected === opt}
            onChange={() => setSelected(opt)}
            className="accent-emerald-700 cursor-pointer"
          />
          <Label htmlFor={`${id}-${opt}`} className="font-normal cursor-pointer">
            {opt}
          </Label>
        </div>
      ))}
    </div>
  )
}

// ─── Preview Control ──────────────────────────────────────────────────────────

function PreviewControl({ field }: { field: CanvasField }) {
  const id = `preview-${field.id}`
  const options = field.options?.length ? field.options : ['Option 1', 'Option 2']

  switch (field.type) {
    case 'TEXTAREA':
      return <Textarea id={id} placeholder="Enter text…" className="resize-none" rows={3} />

    case 'NUMBER':
      return <NumberInput id={id} />

    case 'EMAIL':
      return <EmailInput id={id} />

    case 'PHONE':
      return <PhoneInput id={id} />

    case 'DATE':
      return <DatePickerInput id={id} />

    case 'SELECT':
      return (
        <Select>
          <SelectTrigger id={id}>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )

    case 'RADIO':
      return <RadioGroup id={id} options={options} />

    case 'CHECKBOX':
      return (
        <div className="flex items-center gap-2">
          <Checkbox id={id} />
          <Label htmlFor={id} className="font-normal cursor-pointer inline-flex items-center gap-1.5">
            {field.label || 'Checkbox option'}
            <FieldHelpTooltip text={field.helpText} />
          </Label>
        </div>
      )

    case 'FILE':
      return <Input id={id} type="file" />

    case 'INSTRUCTION':
      return (
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-3.5 py-3 text-sm text-sky-950">
          {field.helpText?.trim() ? (
            <p className="whitespace-pre-wrap leading-relaxed">{field.helpText}</p>
          ) : (
            <p className="text-sky-700/80 italic">Instruction text will appear here.</p>
          )}
        </div>
      )

    case 'TEXT':
    default:
      return <Input id={id} type="text" placeholder="Enter text…" />
  }
}

import { getLocalizedText } from '@/lib/multilingual-text'

// ─── Main Component ───────────────────────────────────────────────────────────

interface FormPreviewProps {
  formName: string
  fields: CanvasField[]
}

export function FormPreview({ formName, fields }: FormPreviewProps) {
  const { t, locale } = useLocale()

  return (
    <div className="space-y-4">
      {fields.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          {t('admin.wizards.modal.addFieldsPreview')}
        </div>
      ) : (
        <div className="space-y-4">
          {fields.map((field) => {
            const displayLabel = getLocalizedText(field.label, locale) || 'Untitled field'
            const displayHelpText = getLocalizedText(field.helpText, locale)
            const localizedField = { ...field, label: displayLabel, helpText: displayHelpText }

            return (
              <div key={field.id} className="space-y-1.5">
                {isDisplayOnlyFieldType(field.type) ? (
                  <>
                    {displayLabel.trim() && (
                      <p className="text-sm font-semibold text-sky-950">{displayLabel}</p>
                    )}
                    <PreviewControl field={localizedField} />
                  </>
                ) : (
                  <>
                    {field.type !== 'CHECKBOX' && (
                      <Label
                        htmlFor={`preview-${field.id}`}
                        className="text-sm inline-flex items-center gap-1.5"
                      >
                        {displayLabel}
                        {field.required && <span className="text-destructive ml-0.5">*</span>}
                        <FieldHelpTooltip text={displayHelpText} />
                      </Label>
                    )}
                    <PreviewControl field={localizedField} />
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
