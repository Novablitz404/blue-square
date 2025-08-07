# Notification System - Blue Square Mini-App

This document explains the complete notification system implemented for the Blue Square mini-app, including new quest notifications, new reward notifications, and global notifications.

## 🎯 Overview

The notification system supports three types of notifications:
1. **New Quest Notifications** - Automatically sent when new quests are created
2. **New Reward Notifications** - Automatically sent when new rewards are created
3. **Global Notifications** - Manually sent to all users or specific users

## 🔧 System Architecture

### Core Components

1. **Notification Service** (`lib/notification-service.ts`)
   - Handles all notification logic
   - Manages user FIDs (Farcaster IDs)
   - Sends notifications to users
   - Stores notification history

2. **API Endpoints**
   - `/api/notifications/global` - Send global notifications
   - `/api/notifications/send` - Send notifications by ID
   - `/api/quests/create` - Create quests with automatic notifications
   - `/api/rewards/create` - Create rewards with automatic notifications

3. **UI Components**
   - `GlobalNotificationPanel` - Admin interface for sending global notifications
   - Integrated into main app for easy access

## 🚀 How to Use

### 1. New Quest Notifications

#### **Automatic Notifications**
When you create a new quest using the API, notifications are automatically sent to all users:

```bash
# Create a new quest with automatic notification
curl -X POST http://localhost:3000/api/quests/create \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Daily Login Challenge",
    "description": "Log in for 7 consecutive days",
    "type": "streak_based",
    "requirements": {
      "streakDays": 7
    },
    "rewards": {
      "points": 50
    },
    "isActive": true,
    "sendNotification": true
  }'
```

#### **Manual Quest Creation**
```typescript
// In your code
const response = await fetch('/api/quests/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'New Quest Title',
    description: 'Quest description',
    type: 'activity_based',
    requirements: { activityCount: 10 },
    rewards: { points: 25 },
    isActive: true,
    sendNotification: true // This will trigger automatic notification
  })
});
```

### 2. New Reward Notifications

#### **Automatic Notifications**
When you create a new reward using the API, notifications are automatically sent to all users:

```bash
# Create a new reward with automatic notification
curl -X POST http://localhost:3000/api/rewards/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Exclusive NFT Badge",
    "description": "Limited edition NFT badge for top users",
    "type": "nft",
    "pointsReward": 100,
    "requirements": {
      "questIds": ["quest-123"],
      "requiredLevel": 200
    },
    "isActive": true,
    "maxRedemptions": 50,
    "sendNotification": true
  }'
```

#### **Manual Reward Creation**
```typescript
// In your code
const response = await fetch('/api/rewards/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'New Reward Name',
    description: 'Reward description',
    type: 'points',
    pointsReward: 50,
    requirements: { questIds: [], requiredLevel: 0 },
    isActive: true,
    sendNotification: true // This will trigger automatic notification
  })
});
```

### 3. Global Notifications

#### **Using the Admin Interface**
1. Open the Blue Square app
2. Connect your wallet
3. Click the "📢 Send Global Notification" button
4. Fill in the title and body
5. Optionally specify target users (comma-separated wallet addresses)
6. Click "Send Notification"

#### **Using the API**
```bash
# Send global notification to all users
curl -X POST http://localhost:3000/api/notifications/global \
  -H "Content-Type: application/json" \
  -d '{
    "title": "🎉 Special Event!",
    "body": "Join us for a special event this weekend!",
    "sendImmediately": true
  }'

# Send global notification to specific users
curl -X POST http://localhost:3000/api/notifications/global \
  -H "Content-Type: application/json" \
  -d '{
    "title": "🎁 Personal Reward!",
    "body": "You have a special reward waiting for you!",
    "targetUsers": ["0x123...", "0x456..."],
    "sendImmediately": true
  }'
```

#### **Programmatic Global Notifications**
```typescript
// Send to all users
const response = await fetch('/api/notifications/global', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: '🎉 Special Event!',
    body: 'Join us for a special event this weekend!',
    sendImmediately: true
  })
});

// Send to specific users
const response = await fetch('/api/notifications/global', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: '🎁 Personal Reward!',
    body: 'You have a special reward waiting for you!',
    targetUsers: ['0x123...', '0x456...'],
    sendImmediately: true
  })
});
```

## 📊 Notification Management

### **Notification History**
All notifications are stored in Firebase for tracking and analytics:

```typescript
// Get notification history for a user
const history = await getNotificationHistory(userId);
console.log('Notification history:', history);
```

### **Global Notifications List**
```typescript
// Get all global notifications
const notifications = await getGlobalNotifications();
console.log('Global notifications:', notifications);
```

## 🔄 Integration Examples

### **1. Quest Creation with Notification**
```typescript
// Create a quest and automatically notify users
const createQuestWithNotification = async (questData) => {
  const response = await fetch('/api/quests/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...questData,
      sendNotification: true // This triggers automatic notification
    })
  });
  
  const result = await response.json();
  if (result.success) {
    console.log('Quest created and notification sent!');
  }
};
```

### **2. Reward Creation with Notification**
```typescript
// Create a reward and automatically notify users
const createRewardWithNotification = async (rewardData) => {
  const response = await fetch('/api/rewards/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...rewardData,
      sendNotification: true // This triggers automatic notification
    })
  });
  
  const result = await response.json();
  if (result.success) {
    console.log('Reward created and notification sent!');
  }
};
```

### **3. Scheduled Notifications**
```typescript
// Send scheduled notifications (you can implement this with cron jobs)
const sendScheduledNotification = async () => {
  const response = await fetch('/api/notifications/global', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: '📊 Daily Summary',
      body: 'Check your daily activity summary!',
      sendImmediately: true
    })
  });
};
```

## ⚠️ Important Considerations

### **1. Rate Limiting**
- Farcaster has rate limits on notifications
- The system sends notifications in batches of 10 users
- There's a 1-second delay between batches to avoid rate limiting

### **2. User Consent**
- Only send notifications to users who have enabled them
- Users can opt out of notifications through the Farcaster app
- Respect user preferences and don't spam

### **3. Content Guidelines**
- Keep titles under 50 characters
- Keep body text under 200 characters
- Use emojis to make notifications engaging
- Include actionable information when possible

### **4. Error Handling**
```typescript
// Example error handling
try {
  const result = await sendGlobalNotification(title, body, targetUsers);
  if (result.success > 0) {
    console.log(`Notification sent to ${result.success} users`);
  }
  if (result.failed > 0) {
    console.warn(`Failed to send to ${result.failed} users`);
  }
} catch (error) {
  console.error('Notification error:', error);
}
```

## 🧪 Testing

### **1. Test Notifications**
```bash
# Test global notification
curl -X POST http://localhost:3000/api/notifications/global \
  -H "Content-Type: application/json" \
  -d '{
    "title": "🧪 Test Notification",
    "body": "This is a test notification",
    "sendImmediately": true
  }'
```

### **2. Test Quest Creation**
```bash
# Test quest creation with notification
curl -X POST http://localhost:3000/api/quests/create \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Quest",
    "description": "This is a test quest",
    "type": "activity_based",
    "requirements": { "activityCount": 1 },
    "rewards": { "points": 10 },
    "sendNotification": true
  }'
```

### **3. Test Reward Creation**
```bash
# Test reward creation with notification
curl -X POST http://localhost:3000/api/rewards/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Reward",
    "description": "This is a test reward",
    "type": "points",
    "pointsReward": 10,
    "requirements": { "questIds": [], "requiredLevel": 0 },
    "sendNotification": true
  }'
```

## 📈 Monitoring and Analytics

### **1. Notification Success Rates**
```typescript
// Monitor notification success rates
const result = await sendGlobalNotification(title, body);
console.log(`Success rate: ${(result.success / result.total * 100).toFixed(1)}%`);
```

### **2. User Engagement**
```typescript
// Track user engagement with notifications
const history = await getNotificationHistory(userId);
const engagementRate = history.filter(n => n.status === 'sent').length / history.length;
console.log(`User engagement rate: ${(engagementRate * 100).toFixed(1)}%`);
```

## 🚀 Next Steps

1. **Implement User Preferences**: Allow users to choose which notifications they want to receive
2. **Add Notification Templates**: Create reusable notification templates
3. **Scheduled Notifications**: Implement cron jobs for scheduled notifications
4. **Analytics Dashboard**: Create a dashboard to monitor notification performance
5. **A/B Testing**: Test different notification content and timing

## 🆘 Troubleshooting

### **Common Issues**

1. **Notifications not sending**
   - Check if users have enabled notifications in Farcaster
   - Verify user FIDs are stored correctly
   - Check rate limiting

2. **High failure rates**
   - Check network connectivity
   - Verify Farcaster API status
   - Review error logs

3. **Rate limiting**
   - Reduce notification frequency
   - Implement better batching
   - Add delays between notifications

### **Debug Mode**
```typescript
// Enable debug logging
const DEBUG = true;

if (DEBUG) {
  console.log('Sending notification:', { title, body, targetUsers });
}
```

---

**Need Help?** Check the Farcaster documentation or reach out to the development team for assistance with notifications. 