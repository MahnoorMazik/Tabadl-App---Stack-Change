import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, requireAuth } from '@/lib/rbac-middleware'
import { UserRole } from '@prisma/client'
import { 
  createErrorResponse, 
  createSuccessResponse, 
  getRequestId, 
  logError, 
  ErrorCodes,
  getErrorSuggestion 
} from '@/lib/error-handler'
import { addCorsHeaders } from '@/lib/cors'

// GET /api/support-conversations - Get all support conversations grouped by visitor (STAFF ONLY)
export async function GET(request: NextRequest) {
  const requestId = getRequestId(request)
  
  // Require authentication - only staff can view all conversations
  const authResult = await requireAuth(request)
  if ('error' in authResult) {
    return addCorsHeaders(createErrorResponse(
      ErrorCodes.AUTHENTICATION_ERROR,
      authResult.error || 'Authentication failed',
      authResult.status || 401,
      { requestId, suggestion: getErrorSuggestion(ErrorCodes.AUTHENTICATION_ERROR) }
    ))
  }

  const { user } = authResult

  // Only staff can view all support conversations
  if (user.role !== UserRole.STAFF) {
    return addCorsHeaders(createErrorResponse(
      ErrorCodes.FORBIDDEN,
      'Forbidden - Staff only',
      403,
      { requestId, suggestion: getErrorSuggestion(ErrorCodes.FORBIDDEN) }
    ))
  }

  // Pagination parameters
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100) // Max 100
  const skip = (page - 1) * limit

  try {
    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Get all support messages grouped by visitorId
    // Optimization: Only get necessary fields and limit to recent messages
    const messages = await db.supportMessage.findMany({
      select: {
        id: true,
        visitorId: true,
        visitorName: true,
        visitorEmail: true,
        content: true,
        isFromVisitor: true,
        status: true,
        createdAt: true,
        staffId: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      // Limit to messages from last 30 days for performance
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    })

    // Group messages by visitorId and get conversation summaries
    const conversationsMap = new Map<string, any>()

    for (const message of messages) {
      // Skip messages without visitorId
      if (!message.visitorId) {
        console.warn('Skipping message with missing visitorId:', message.id)
        continue
      }

      const visitorId = String(message.visitorId)
      
      // Ensure createdAt is a valid Date
      let messageDate: Date
      if (message.createdAt instanceof Date) {
        messageDate = message.createdAt
      } else if (message.createdAt) {
        messageDate = new Date(message.createdAt)
      } else {
        messageDate = new Date()
      }

      if (!conversationsMap.has(visitorId)) {
        // First message for this visitor - set up conversation
        conversationsMap.set(visitorId, {
          visitorId: visitorId,
          visitorName: message.visitorName?.trim() || 'Guest',
          visitorEmail: message.visitorEmail || null,
          lastMessage: message.content || '',
          lastMessageTime: messageDate.toISOString(),
          messageCount: 1,
          hasUnread: Boolean(message.isFromVisitor && message.status && message.status !== 'READ'),
        })
      } else {
        // Existing conversation - update it
        const conv = conversationsMap.get(visitorId)!
        conv.messageCount++
        
        // Update hasUnread if any message from visitor is unread
        if (message.isFromVisitor && message.status && message.status !== 'READ') {
          conv.hasUnread = true
        }

        // Backfill visitor details if we only had the default value
        if ((!conv.visitorName || conv.visitorName === 'Guest') && message.visitorName?.trim()) {
          conv.visitorName = message.visitorName.trim()
        }
        if (!conv.visitorEmail && message.visitorEmail) {
          conv.visitorEmail = message.visitorEmail
        }
        
        // Update last message if this message is newer
        const convTime = new Date(conv.lastMessageTime).getTime()
        if (messageDate.getTime() > convTime) {
          conv.lastMessage = message.content || ''
          conv.lastMessageTime = messageDate.toISOString()
        }
      }
    }

    const allConversations = Array.from(conversationsMap.values())
    
    // Sort by last message time (newest first)
    allConversations.sort((a, b) => {
      try {
        const timeA = new Date(a.lastMessageTime).getTime()
        const timeB = new Date(b.lastMessageTime).getTime()
        return timeB - timeA
      } catch (err) {
        console.error('Error sorting conversations:', err)
        return 0
      }
    })

    // Apply pagination
    const paginatedConversations = allConversations.slice(skip, skip + limit)
    const totalPages = Math.ceil(allConversations.length / limit)

    return addCorsHeaders(createSuccessResponse({
      conversations: paginatedConversations,
      pagination: {
        page,
        limit,
        total: allConversations.length,
        totalPages,
        hasMore: page < totalPages,
      },
    }, 200, { requestId }))
  } catch (error: any) {
    console.error('❌ Error in support-conversations:', error)
    console.error('❌ Error message:', error?.message)
    console.error('❌ Error stack:', error?.stack)
    logError(error instanceof Error ? error : new Error(String(error)), {
      code: ErrorCodes.INTERNAL_ERROR,
      requestId,
      endpoint: '/api/support-conversations',
      method: 'GET',
    })
    return addCorsHeaders(createErrorResponse(
      ErrorCodes.INTERNAL_ERROR,
      `Failed to fetch support conversations: ${error?.message || 'Unknown error'}`,
      500,
      { requestId, suggestion: getErrorSuggestion(ErrorCodes.INTERNAL_ERROR) }
    ))
  }
}

