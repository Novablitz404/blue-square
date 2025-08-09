# Server-Side Notifications Implementation

This document explains the server-side notification system implemented in the Blue Square mini app.

## 🔧 **Architecture Overview**

The notification system consists of several components:

1. **Notification Service** (`lib/notification-service.ts`) - Firebase-based storage for notification tokens
2. **Notification Client** (`lib/notification-client.ts`) - Sends push notifications via Farcaster API
3. **Webhook Handler** (`app/api/webhook/route.ts`) - Processes frame lifecycle events
4. **Notification API** (`app/api/notify/route.ts`) - Public API for sending notifications
5. **AddFrame Integration** (`app/page.tsx`) - UI for users to add the frame

## 📱 **How It Works**

### 1. User Adds Frame
- User clicks "Add Frame" button in the app
- This triggers the Farcaster frame addition process
- When successful, Farcaster sends a webhook to `/api/webhook`

### 2. Webhook Processing
- Webhook receives `frame_added` event with notification details
- Verifies FID ownership using Optimism Key Registry
- Stores notification token in Firebase
- Sends welcome notification to user

### 3. Quest/Reward Notifications
- When admins create new quests or rewards
- System automatically broadcasts notifications to all subscribed users
- Uses batch processing to avoid rate limits

## 🔔 **Notification Types**

### Welcome Notifications
- Sent when users add the frame
- Sent when users enable notifications

### Content Notifications
- **New Quest**: "🆕 New Quest Available! - {title}"
- **New Reward**: "🎁 New Reward Available! - {name} ({points} pts)"

## 🛠 **API Endpoints**

### Webhook Endpoint
```
POST /api/webhook
```
Handles frame lifecycle events from Farcaster.

### Notification API
```
POST /api/notify
```

**Single Notification:**
```json
{
  "type": "single",
  "fid": 12345,
  "notification": {
    "title": "Hello!",
    "body": "This is a test notification"
  }
}
```

**Broadcast Notification:**
```json
{
  "type": "broadcast",
  "notification": {
    "title": "Announcement",
    "body": "This goes to all users"
  },
  "userFids": [12345, 67890] // Optional: specific users
}
```

## 🔐 **Security**

- **FID Verification**: All webhooks verify FID ownership using Optimism Key Registry
- **Rate Limiting**: Batch processing prevents API rate limits
- **Error Handling**: Graceful handling of failed notifications

## 🗄️ **Data Storage**

Uses Firebase Firestore with the following structure:

```
user_notifications/
  ├── user_12345
  │   ├── url: "https://notifications.farcaster.xyz/..."
  │   └── token: "notification_token_here"
  └── user_67890
      ├── url: "https://notifications.farcaster.xyz/..."
      └── token: "notification_token_here"
```

## ⚙️ **Environment Variables**

Required environment variables (see `env.example`):

```env
# OnchainKit
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_api_key
NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME=Blue Square

# App URL
NEXT_PUBLIC_URL=https://your-domain.com

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
# ... other Firebase config
```

## 🚀 **Usage Examples**

### Test Notification System

1. **Add Frame**: Click "Add Frame" button in the app
2. **Check Logs**: Verify webhook processing in console
3. **Create Quest**: Use quest admin to create a new quest
4. **Verify Broadcast**: All users should receive notification

### Manual Notification

```bash
curl -X POST https://your-domain.com/api/notify \
  -H "Content-Type: application/json" \
  -d '{
    "type": "broadcast",
    "notification": {
      "title": "Test Announcement",
      "body": "This is a test notification!"
    }
  }'
```

## 🔍 **Debugging**

### Check Notification Storage
```typescript
import { getUserNotificationDetails } from '@/lib/notification-service';

const details = await getUserNotificationDetails(12345);
console.log('User notification details:', details);
```

### View Broadcast Results
```typescript
import { sendBroadcastNotification } from '@/lib/notification-client';

const result = await sendBroadcastNotification({
  title: "Test",
  body: "Testing notifications"
});

console.log('Broadcast results:', {
  successful: result.successful,
  failed: result.failed,
  rateLimited: result.rateLimited,
  noToken: result.noToken
});
```

## 📊 **Monitoring**

The system provides detailed logging for:
- Webhook events
- Notification delivery status
- Error conditions
- Rate limiting

Check your application logs for notification-related events marked with:
- `🔗` Webhook events
- `📤` Notification sending
- `✅` Successful operations
- `❌` Errors

## 🔄 **Integration with Quest Admin**

The notification system is automatically integrated with quest and reward creation:

- **Quest Creation**: Triggers broadcast notification for new active quests
- **Reward Creation**: Triggers broadcast notification for new active rewards
- **Error Handling**: Quest/reward creation continues even if notifications fail

This ensures users are always informed about new content while maintaining system reliability.
