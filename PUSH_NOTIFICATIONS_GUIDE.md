# Push Notifications Guide

## Overview

This system ensures push notifications are delivered to the **correct device** by matching device subscriptions to user accounts using **User ID** as the primary identifier.

## How It Works

### 1. **Device Registration (Subscription)**

When a user enables push notifications on their device:

1. **Browser/Device** requests permission and generates a unique subscription
2. **Subscription** is sent to `/api/push/subscribe` with the user's session
3. **Server** stores the subscription in the `PushSubscription` table linked to the user's `userId`
4. **Multiple devices** can be registered per user (each device has a unique `endpoint`)

**Key Point**: Subscriptions are tied to `userId`, not email or other identifiers.

### 2. **Sending Notifications**

When an event occurs (e.g., lead created, follow-up scheduled):

1. **System determines** who should receive the notification:
   - For **lead creation**: Assigned person OR creator (priority: assignedTo > createdBy)
   - For **follow-up creation**: Assigned person OR creator (priority: assignedTo > createdBy > current user)

2. **System calls** `sendPushNotificationToUser(userId, payload)`

3. **Function queries** database for all active subscriptions for that `userId`

4. **Notification sent** to all registered devices for that user

5. **Invalid subscriptions** (expired/removed) are automatically marked as inactive

### 3. **Device Matching**

**The matching happens by `userId`:**

```typescript
// When subscribing
await db.pushSubscription.create({
  data: {
    userId: session.user.id,  // ← Links subscription to user
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth
  }
})

// When sending notification
const subscriptions = await db.pushSubscription.findMany({
  where: {
    userId: targetUserId,  // ← Only get subscriptions for this user
    isActive: true
  }
})
```

## Database Schema

### PushSubscription Model

```prisma
model PushSubscription {
  id           String   @id @default(cuid())
  userId       String   // ← Links to User.id
  endpoint     String   @unique  // Unique per device/browser
  p256dh       String   // Encryption key
  auth         String   // Authentication key
  userAgent    String?  // Browser/device info
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  user         User     @relation(fields: [userId], references: [id])
}
```

### Lead Model (Updated)

```prisma
model Lead {
  // ... other fields
  createdById  String?  // ← Tracks who created the lead
  assignedToId String?  // ← Tracks who is assigned
  createdBy     User?    @relation("LeadCreator", ...)
  assignedTo   User?    @relation(...)
}
```

## Example Scenarios

### Scenario 1: Admin Creates Lead and Assigns to Fellow Admin

1. **Admin A** (userId: `user-123`) creates a lead and assigns it to **Admin B** (userId: `user-456`)
2. System checks: `assignedToId = user-456`
3. System calls: `sendPushNotificationToUser('user-456', ...)`
4. Database query: `SELECT * FROM push_subscriptions WHERE userId = 'user-456' AND isActive = true`
5. Notification sent **only** to devices registered to Admin B's account

**Result**: ✅ Notification appears only on Admin B's devices

### Scenario 2: Admin Creates Lead Without Assignment

1. **Admin A** (userId: `user-123`) creates a lead (no assignment)
2. System checks: `assignedToId = null`, `createdById = user-123`
3. System checks: `notificationUserId = user-123` (creator)
4. System checks: `notificationUserId !== currentUser.id` → **false** (same user)
5. **No notification sent** (don't notify yourself)

**Result**: ✅ No notification (user created it themselves)

### Scenario 3: Admin Creates Follow-up for Assigned Lead

1. **Admin A** creates a follow-up for a lead assigned to **Admin B**
2. System checks lead: `assignedToId = user-456` (Admin B)
3. System calls: `sendPushNotificationToUser('user-456', ...)`
4. Notification sent to all of Admin B's registered devices

**Result**: ✅ Notification appears only on Admin B's devices

## Security & Privacy

### ✅ What's Protected

1. **User Isolation**: Each user can only see/manage their own subscriptions
2. **Device Privacy**: Subscription endpoints are unique and cannot be used to identify users across accounts
3. **Automatic Cleanup**: Invalid subscriptions are automatically marked inactive

### ✅ Matching Guarantees

- **User ID** is the **only** identifier used for matching
- **Email** is NOT used for matching (only for logging/debugging)
- **Session** ensures subscriptions are linked to authenticated users only

## API Endpoints

### Subscribe to Push Notifications

```typescript
POST /api/push/subscribe
{
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/...",
    "keys": {
      "p256dh": "...",
      "auth": "..."
    }
  }
}
```

**Response**: Subscription stored with `userId` from session

### Unsubscribe from Push Notifications

```typescript
DELETE /api/push/subscribe
{
  "endpoint": "https://fcm.googleapis.com/..."
}
```

**Response**: Subscription marked as inactive

## Code Examples

### Sending Notification to Specific User

```typescript
import { sendPushNotificationToUser } from '@/lib/push-notifications'

// Send to user by ID
await sendPushNotificationToUser(userId, {
  title: 'New Lead Assigned',
  body: `You have been assigned to lead: ${leadName}`,
  url: `/admin/leads/${leadId}`,
  tag: `lead-${leadId}`,
  data: {
    leadId,
    type: 'lead_assigned'
  }
})
```

### Sending to Multiple Users

```typescript
import { sendPushNotificationToUsers } from '@/lib/push-notifications'

await sendPushNotificationToUsers([userId1, userId2], {
  title: 'Team Update',
  body: 'New team announcement',
  url: '/admin/team'
})
```

## Troubleshooting

### Notification Not Received?

1. **Check subscription**: User must have subscribed on that device
2. **Check user ID**: Ensure the correct `userId` is being used
3. **Check active status**: Subscription must be `isActive = true`
4. **Check browser permissions**: User must have granted notification permission
5. **Check VAPID keys**: Must be configured in environment variables

### Multiple Devices?

- Each device gets its own subscription (unique `endpoint`)
- All active subscriptions for a user receive notifications
- User can have multiple devices registered simultaneously

### Testing

1. **Subscribe** on device A with user account 1
2. **Subscribe** on device B with user account 2
3. **Create lead** assigned to user account 2
4. **Verify**: Only device B receives notification

## Migration Steps

After updating the schema:

```bash
# Generate migration
npx prisma migrate dev --name add_push_subscriptions_and_lead_creator

# Or if using db push
npx prisma db push
```

## Summary

**Key Points:**
- ✅ Notifications matched by **User ID** (not email)
- ✅ Each user can have **multiple devices** registered
- ✅ Notifications sent to **all active devices** for that user
- ✅ **Automatic cleanup** of invalid subscriptions
- ✅ **Secure**: Users can only manage their own subscriptions

**The system ensures notifications only appear on devices registered to the correct user account.**
