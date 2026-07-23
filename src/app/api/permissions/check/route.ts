import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac-middleware'
import { z } from 'zod'
import { HierarchicalPermissionChecker } from '@/lib/rbac-improvements'
import { ResourceAccessControl } from '@/lib/rebac'
import { ConditionalPermissionEvaluator, ConditionalPermission } from '@/lib/conditional-permissions'
import { EffectivePermissionCalculator } from '@/lib/permission-delegation'

const checkPermissionSchema = z.object({
  permissions: z.array(z.string()),
  resource: z.object({
    type: z.string(),
    id: z.string(),
    attributes: z.record(z.string(), z.any()).optional()
  }).optional(),
  context: z.object({
    time: z.string().optional(),
    location: z.object({
      ip: z.string(),
      country: z.string().optional(),
      city: z.string().optional()
    }).optional(),
    device: z.object({
      type: z.string(),
      id: z.string(),
      trusted: z.boolean()
    }).optional()
  }).optional()
})

export const POST = withAuth(async (req) => {
  try {
    const body = await req.json()
    const { permissions, resource, context } = checkPermissionSchema.parse(body)
    
    if (!req.user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      )
    }

    // Get base permissions
    const basePermissions = req.user.permissions || []
    
    // TODO: Get delegated permissions from database
    const delegatedPermissions: string[] = []
    
    // TODO: Check for active impersonation session
    const impersonationSession = undefined

    // Calculate effective permissions
    const effectiveCalculator = new EffectivePermissionCalculator(
      basePermissions,
      delegatedPermissions,
      impersonationSession
    )

    const effectivePermissions = effectiveCalculator.getEffectivePermissions()

    // Check each requested permission
    const results: Record<string, {
      allowed: boolean
      reason?: string
      method?: string
    }> = {}

    for (const permission of permissions) {
      let allowed = false
      let reason = ''
      let method = ''

      // 1. Check hierarchical permissions
      const hierarchicalChecker = new HierarchicalPermissionChecker(
        effectivePermissions,
        { userId: req.user.userId, teamId: undefined }
      )
      
      if (hierarchicalChecker.hasPermission(permission, resource)) {
        allowed = true
        method = 'hierarchical'
      }

      // 2. Check resource-based permissions if resource provided
      if (!allowed && resource) {
        // TODO: Load access rules from database
        const accessRules = []
        
        const rebac = new ResourceAccessControl(
          {
            id: req.user.userId,
            roleId: req.user.role,
            teamId: undefined,
            permissions: effectivePermissions
          },
          accessRules
        )

        // Convert resource to proper format
        const resourceObj = {
          id: resource.id,
          type: resource.type,
          ownerId: resource.attributes?.ownerId || '',
          teamId: resource.attributes?.teamId,
          attributes: resource.attributes || {}
        }

        if (rebac.canAccess(resourceObj, permission.split('.').pop()!)) {
          allowed = true
          method = 'resource-based'
        }
      }

      // 3. Check conditional permissions if context provided
      if (allowed && context) {
        const contextData = {
          time: context.time ? new Date(context.time) : new Date(),
          location: context.location,
          device: context.device,
          attributes: req.user
        }

        // TODO: Load conditional permissions from database
        const conditionalPermissions: ConditionalPermission[] = []
        
        const conditionalEvaluator = new ConditionalPermissionEvaluator(contextData)
        
        // Check if any conditional restrictions apply
        const hasConditionalRestrictions = conditionalPermissions.some(cp => 
          cp.basePermission === permission
        )

        if (hasConditionalRestrictions) {
          const passesConditions = conditionalPermissions
            .filter(cp => cp.basePermission === permission)
            .some(cp => conditionalEvaluator.evaluate(cp))

          if (!passesConditions) {
            allowed = false
            reason = 'Failed conditional checks'
            method = 'conditional'
          }
        }
      }

      results[permission] = {
        allowed,
        reason: allowed ? 'Permission granted' : reason || 'Permission denied',
        method
      }
    }

    // Log permission checks for audit
    // TODO: Implement audit logging

    return NextResponse.json({
      results,
      summary: {
        requested: permissions.length,
        allowed: Object.values(results).filter(r => r.allowed).length,
        denied: Object.values(results).filter(r => !r.allowed).length
      },
      effectivePermissions: effectivePermissions.length,
      user: {
        id: req.user.userId,
        role: req.user.role,
        hasImpersonation: !!impersonationSession,
        hasDelegations: delegatedPermissions.length > 0
      }
    })

  } catch (error: any) {
    console.error('Permission check error:', error)
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request format', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})