// Permission Delegation and Impersonation System

export interface PermissionDelegation {
  id: string
  delegatorId: string
  delegateId: string
  permissions: string[]
  resourceType?: string
  resourceIds?: string[]
  reason: string
  validFrom: Date
  validUntil: Date
  constraints?: DelegationConstraint[]
  requiresApproval: boolean
  approvedBy?: string
  approvedAt?: Date
  revokedBy?: string
  revokedAt?: Date
  status: 'pending' | 'active' | 'expired' | 'revoked'
}

export interface DelegationConstraint {
  type: 'time' | 'action_limit' | 'resource_limit' | 'approval_required'
  value: any
  metadata?: Record<string, any>
}

export interface ImpersonationSession {
  id: string
  impersonatorId: string
  impersonatedUserId: string
  reason: string
  startedAt: Date
  expiresAt: Date
  permissions?: string[] // Limited permissions during impersonation
  auditLog: AuditEntry[]
  active: boolean
}

export interface AuditEntry {
  timestamp: Date
  action: string
  resource: string
  details: Record<string, any>
  result: 'success' | 'failure'
}

export class DelegationManager {
  constructor(
    private storage: {
      getDelegations: (userId: string) => Promise<PermissionDelegation[]>
      saveDelegation: (delegation: PermissionDelegation) => Promise<void>
      getImpersonationSession: (sessionId: string) => Promise<ImpersonationSession | null>
      saveImpersonationSession: (session: ImpersonationSession) => Promise<void>
      logAudit: (sessionId: string, entry: AuditEntry) => Promise<void>
    }
  ) {}

  async createDelegation(params: {
    delegatorId: string
    delegateId: string
    permissions: string[]
    validFor: number // hours
    reason: string
    constraints?: DelegationConstraint[]
    requiresApproval?: boolean
  }): Promise<PermissionDelegation> {
    const delegation: PermissionDelegation = {
      id: this.generateId(),
      delegatorId: params.delegatorId,
      delegateId: params.delegateId,
      permissions: params.permissions,
      reason: params.reason,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + params.validFor * 60 * 60 * 1000),
      constraints: params.constraints,
      requiresApproval: params.requiresApproval || false,
      status: params.requiresApproval ? 'pending' : 'active'
    }

    await this.storage.saveDelegation(delegation)
    return delegation
  }

  async getDelegatedPermissions(userId: string): Promise<string[]> {
    const delegations = await this.storage.getDelegations(userId)
    const now = new Date()
    const activePermissions = new Set<string>()

    for (const delegation of delegations) {
      if (delegation.status !== 'active') continue
      if (delegation.validFrom > now || delegation.validUntil < now) continue
      
      // Check constraints
      if (delegation.constraints && !this.validateConstraints(delegation.constraints)) {
        continue
      }

      delegation.permissions.forEach(p => activePermissions.add(p))
    }

    return Array.from(activePermissions)
  }

  async startImpersonation(params: {
    impersonatorId: string
    targetUserId: string
    reason: string
    durationMinutes: number
    limitedPermissions?: string[]
  }): Promise<ImpersonationSession> {
    const session: ImpersonationSession = {
      id: this.generateId(),
      impersonatorId: params.impersonatorId,
      impersonatedUserId: params.targetUserId,
      reason: params.reason,
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + params.durationMinutes * 60 * 1000),
      permissions: params.limitedPermissions,
      auditLog: [],
      active: true
    }

    await this.storage.saveImpersonationSession(session)
    
    // Log impersonation start
    await this.storage.logAudit(session.id, {
      timestamp: new Date(),
      action: 'impersonation_started',
      resource: 'user',
      details: { targetUserId: params.targetUserId, reason: params.reason },
      result: 'success'
    })

    return session
  }

  async endImpersonation(sessionId: string): Promise<void> {
    const session = await this.storage.getImpersonationSession(sessionId)
    if (!session) throw new Error('Impersonation session not found')

    session.active = false
    await this.storage.saveImpersonationSession(session)

    // Log impersonation end
    await this.storage.logAudit(sessionId, {
      timestamp: new Date(),
      action: 'impersonation_ended',
      resource: 'user',
      details: { duration: Date.now() - session.startedAt.getTime() },
      result: 'success'
    })
  }

  async logImpersonationAction(
    sessionId: string, 
    action: string, 
    resource: string, 
    details: Record<string, any>,
    result: 'success' | 'failure'
  ): Promise<void> {
    const session = await this.storage.getImpersonationSession(sessionId)
    if (!session || !session.active) {
      throw new Error('Invalid or inactive impersonation session')
    }

    await this.storage.logAudit(sessionId, {
      timestamp: new Date(),
      action,
      resource,
      details,
      result
    })
  }

  private validateConstraints(constraints: DelegationConstraint[]): boolean {
    for (const constraint of constraints) {
      switch (constraint.type) {
        case 'time':
          const now = new Date()
          const hour = now.getHours()
          if (constraint.value.startHour && hour < constraint.value.startHour) return false
          if (constraint.value.endHour && hour >= constraint.value.endHour) return false
          break

        case 'action_limit':
          // Would need to check action count from storage
          break

        case 'approval_required':
          // Check if specific actions require additional approval
          break
      }
    }
    return true
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }
}

// Permission combiner that merges base, delegated, and impersonation permissions
export class EffectivePermissionCalculator {
  constructor(
    private basePermissions: string[],
    private delegatedPermissions: string[],
    private impersonationSession?: ImpersonationSession
  ) {}

  getEffectivePermissions(): string[] {
    const effective = new Set<string>()

    // Add base permissions
    this.basePermissions.forEach(p => effective.add(p))

    // Add delegated permissions
    this.delegatedPermissions.forEach(p => effective.add(p))

    // If impersonating, use only impersonation permissions if specified
    if (this.impersonationSession?.active && this.impersonationSession.permissions) {
      return this.impersonationSession.permissions
    }

    return Array.from(effective)
  }

  canPerform(permission: string): boolean {
    const effective = this.getEffectivePermissions()
    return effective.includes(permission) || 
           effective.some(p => this.matchesWildcard(permission, p))
  }

  private matchesWildcard(permission: string, pattern: string): boolean {
    if (!pattern.includes('*')) return false
    
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
    return regex.test(permission)
  }
}

// Example usage
export const delegationExamples = {
  // Vacation coverage
  vacationCoverage: {
    permissions: ['applications.approve', 'applications.assign', 'messages.send'],
    validFor: 168, // 1 week in hours
    reason: 'Vacation coverage for Case Manager',
    constraints: [
      {
        type: 'time',
        value: { startHour: 9, endHour: 17 },
        metadata: { timezone: 'Asia/Riyadh' }
      }
    ]
  },

  // Emergency access
  emergencyAccess: {
    permissions: ['clients.*', 'applications.*'],
    validFor: 24, // 24 hours
    reason: 'Emergency system maintenance',
    requiresApproval: true,
    constraints: [
      {
        type: 'action_limit',
        value: 100,
        metadata: { resetInterval: 'hourly' }
      }
    ]
  },

  // Training supervision
  trainingSupervision: {
    permissions: ['applications.view', 'documents.view'],
    validFor: 40, // Training period in hours
    reason: 'New employee training supervision',
    constraints: [
      {
        type: 'approval_required',
        value: ['applications.approve', 'documents.delete'],
        metadata: { approver: 'supervisor' }
      }
    ]
  }
}