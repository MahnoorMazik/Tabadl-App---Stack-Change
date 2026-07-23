'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { validateEmail, isValidEmail } from '@/lib/email-validation'
import { AlertCircle, CheckCircle } from 'lucide-react'

interface EmailInputProps extends Omit<React.ComponentProps<typeof Input>, 'onChange'> {
  label?: string
  error?: string
  showValidation?: boolean
  onValidationChange?: (isValid: boolean, error?: string) => void
  onChange?: (value: string, isValid: boolean) => void
}

export const EmailInput = React.forwardRef<HTMLInputElement, EmailInputProps>(
  ({ 
    className, 
    label, 
    error: externalError,
    showValidation = true,
    onValidationChange,
    onChange,
    value,
    ...props 
  }, ref) => {
    const [internalError, setInternalError] = React.useState<string>('')
    const [isValid, setIsValid] = React.useState<boolean>(false)
    const [hasBeenTouched, setHasBeenTouched] = React.useState<boolean>(false)

    const error = externalError || internalError

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const emailValue = e.target.value
      
      // Only validate if the field has been touched or if there's already an error
      if (hasBeenTouched || internalError || externalError) {
        const validation = validateEmail(emailValue)
        setInternalError(validation.isValid ? '' : validation.error!)
        setIsValid(validation.isValid)
        onValidationChange?.(validation.isValid, validation.isValid ? undefined : validation.error)
      } else if (emailValue.length > 0) {
        // Basic check for empty field
        const validation = validateEmail(emailValue)
        setInternalError(validation.isValid ? '' : validation.error!)
        setIsValid(validation.isValid)
        onValidationChange?.(validation.isValid, validation.isValid ? undefined : validation.error)
      } else {
        // Field is empty and hasn't been touched
        setInternalError('')
        setIsValid(false)
        onValidationChange?.(false, 'Email is required')
      }
      
      onChange?.(emailValue, isValid)
    }

    const handleBlur = () => {
      setHasBeenTouched(true)
      if (value) {
        const validation = validateEmail(value as string)
        setInternalError(validation.isValid ? '' : validation.error!)
        setIsValid(validation.isValid)
        onValidationChange?.(validation.isValid, validation.isValid ? undefined : validation.error)
      } else {
        setInternalError('Email is required')
        setIsValid(false)
        onValidationChange?.(false, 'Email is required')
      }
    }

    const hasError = Boolean(error)
    const showSuccess = showValidation && isValid && hasBeenTouched && !hasError

    return (
      <div className="space-y-2">
        {label && (
          <Label htmlFor={props.id} className="flex items-center gap-2">
            {label}
          </Label>
        )}
        <div className="relative">
          <Input
            ref={ref}
            type="email"
            className={cn(
              "pr-10",
              hasError && "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20",
              showSuccess && "border-green-500 focus-visible:border-green-500 focus-visible:ring-green-500/20",
              className
            )}
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            {...props}
          />
          {showValidation && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {hasError ? (
                <AlertCircle className="h-4 w-4 text-red-500" />
              ) : showSuccess ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : null}
            </div>
          )}
        </div>
        {hasError && (
          <Alert variant="destructive" className="py-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}
      </div>
    )
  }
)

EmailInput.displayName = 'EmailInput'
