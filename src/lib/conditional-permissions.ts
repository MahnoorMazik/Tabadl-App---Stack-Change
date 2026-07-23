// Conditional and Time-Based Permissions

export interface ConditionalPermission {
  id: string
  basePermission: string
  conditions: PermissionCondition[]
  validFrom?: Date
  validUntil?: Date
  timezone?: string
  schedule?: PermissionSchedule
}

export interface PermissionCondition {
  type: 'time' | 'location' | 'device' | 'context' | 'attribute'
  operator: string
  value: any
  metadata?: Record<string, any>
}

export interface PermissionSchedule {
  daysOfWeek?: number[] // 0-6, where 0 is Sunday
  timeRanges?: TimeRange[]
  excludeDates?: Date[]
  includeDates?: Date[]
}

export interface TimeRange {
  start: string // HH:MM format
  end: string   // HH:MM format
}

export class ConditionalPermissionEvaluator {
  constructor(
    private currentContext: {
      time: Date
      location?: { ip: string; country?: string; city?: string }
      device?: { type: string; id: string; trusted: boolean }
      attributes?: Record<string, any>
    }
  ) {}

  evaluate(permission: ConditionalPermission): boolean {
    // Check validity period
    if (!this.isWithinValidityPeriod(permission)) {
      return false
    }

    // Check schedule
    if (permission.schedule && !this.matchesSchedule(permission.schedule)) {
      return false
    }

    // Check all conditions
    return permission.conditions.every(condition => 
      this.evaluateCondition(condition)
    )
  }

  private isWithinValidityPeriod(permission: ConditionalPermission): boolean {
    const now = this.currentContext.time

    if (permission.validFrom && now < permission.validFrom) {
      return false
    }

    if (permission.validUntil && now > permission.validUntil) {
      return false
    }

    return true
  }

  private matchesSchedule(schedule: PermissionSchedule): boolean {
    const now = this.currentContext.time
    const dayOfWeek = now.getDay()
    
    // Check excluded dates
    if (schedule.excludeDates?.some(date => 
      this.isSameDate(date, now)
    )) {
      return false
    }

    // Check included dates (override other rules)
    if (schedule.includeDates?.some(date => 
      this.isSameDate(date, now)
    )) {
      return true
    }

    // Check day of week
    if (schedule.daysOfWeek && !schedule.daysOfWeek.includes(dayOfWeek)) {
      return false
    }

    // Check time ranges
    if (schedule.timeRanges) {
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      
      return schedule.timeRanges.some(range => 
        this.isTimeInRange(currentTime, range)
      )
    }

    return true
  }

  private evaluateCondition(condition: PermissionCondition): boolean {
    switch (condition.type) {
      case 'time':
        return this.evaluateTimeCondition(condition)
      case 'location':
        return this.evaluateLocationCondition(condition)
      case 'device':
        return this.evaluateDeviceCondition(condition)
      case 'context':
        return this.evaluateContextCondition(condition)
      case 'attribute':
        return this.evaluateAttributeCondition(condition)
      default:
        return false
    }
  }

  private evaluateTimeCondition(condition: PermissionCondition): boolean {
    const now = this.currentContext.time
    
    switch (condition.operator) {
      case 'business_hours':
        const hour = now.getHours()
        const day = now.getDay()
        return day >= 1 && day <= 5 && hour >= 9 && hour < 17
      
      case 'after_hours':
        const h = now.getHours()
        const d = now.getDay()
        return d === 0 || d === 6 || h < 9 || h >= 17
      
      case 'weekend':
        return now.getDay() === 0 || now.getDay() === 6
      
      default:
        return false
    }
  }

  private evaluateLocationCondition(condition: PermissionCondition): boolean {
    if (!this.currentContext.location) return false
    
    switch (condition.operator) {
      case 'country_equals':
        return this.currentContext.location.country === condition.value
      
      case 'country_in':
        return Array.isArray(condition.value) && 
          condition.value.includes(this.currentContext.location.country)
      
      case 'ip_range':
        return this.isIpInRange(
          this.currentContext.location.ip, 
          condition.value
        )
      
      default:
        return false
    }
  }

  private evaluateDeviceCondition(condition: PermissionCondition): boolean {
    if (!this.currentContext.device) return false
    
    switch (condition.operator) {
      case 'trusted':
        return this.currentContext.device.trusted === condition.value
      
      case 'type_equals':
        return this.currentContext.device.type === condition.value
      
      case 'device_id_in':
        return Array.isArray(condition.value) && 
          condition.value.includes(this.currentContext.device.id)
      
      default:
        return false
    }
  }

  private evaluateContextCondition(condition: PermissionCondition): boolean {
    // Custom context conditions
    return true
  }

  private evaluateAttributeCondition(condition: PermissionCondition): boolean {
    if (!this.currentContext.attributes) return false
    
    const attributeValue = this.currentContext.attributes[condition.metadata?.attributeName || '']
    
    switch (condition.operator) {
      case 'equals':
        return attributeValue === condition.value
      case 'greater_than':
        return attributeValue > condition.value
      case 'less_than':
        return attributeValue < condition.value
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(attributeValue)
      default:
        return false
    }
  }

  private isSameDate(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate()
  }

  private isTimeInRange(time: string, range: TimeRange): boolean {
    return time >= range.start && time <= range.end
  }

  private isIpInRange(ip: string, range: string): boolean {
    // Simplified IP range check - implement proper CIDR checking
    return true
  }
}

// Example conditional permissions
export const conditionalPermissionExamples: ConditionalPermission[] = [
  {
    id: 'business-hours-finance',
    basePermission: 'financial.approve',
    conditions: [
      {
        type: 'time',
        operator: 'business_hours',
        value: true
      }
    ]
  },
  {
    id: 'trusted-device-admin',
    basePermission: 'admin.system',
    conditions: [
      {
        type: 'device',
        operator: 'trusted',
        value: true
      }
    ]
  },
  {
    id: 'location-restricted-export',
    basePermission: 'reports.export',
    conditions: [
      {
        type: 'location',
        operator: 'country_in',
        value: ['SA', 'AE', 'KW'] // Saudi Arabia, UAE, Kuwait
      }
    ]
  },
  {
    id: 'temporary-elevated-access',
    basePermission: 'clients.delete',
    validFrom: new Date('2024-01-01'),
    validUntil: new Date('2024-01-31'),
    conditions: [],
    schedule: {
      daysOfWeek: [1, 2, 3, 4, 5], // Monday to Friday
      timeRanges: [
        { start: '09:00', end: '17:00' }
      ]
    }
  }
]