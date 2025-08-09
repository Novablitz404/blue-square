import {
  notificationDetailsSchema,
  sendNotificationRequestSchema,
  sendNotificationResponseSchema,
} from "@farcaster/frame-sdk";
import { getUserNotificationDetails } from "./notification-service";
import type { z } from "zod";

type FrameNotificationDetails = z.infer<typeof notificationDetailsSchema>;
type SendNotificationRequest = z.infer<typeof sendNotificationRequestSchema>;

const appUrl = process.env.NEXT_PUBLIC_URL || process.env.VERCEL_URL || "https://blue-square.vercel.app";

type SendFrameNotificationResult =
  | {
      state: "error";
      error: unknown;
    }
  | { state: "no_token" }
  | { state: "rate_limit" }
  | { state: "success" };

export async function sendFrameNotification({
  fid,
  title,
  body,
  notificationDetails,
}: {
  fid: number;
  title: string;
  body: string;
  notificationDetails?: FrameNotificationDetails | null;
}): Promise<SendFrameNotificationResult> {
  try {
    if (!notificationDetails) {
      notificationDetails = await getUserNotificationDetails(fid);
    }
    
    if (!notificationDetails) {
      console.log(`⚠️  No notification token for FID ${fid}`);
      return { state: "no_token" };
    }

    console.log(`📤 Sending notification to FID ${fid}: ${title}`);

    const response = await fetch(notificationDetails.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        notificationId: crypto.randomUUID(),
        title,
        body,
        targetUrl: appUrl,
        tokens: [notificationDetails.token],
      } satisfies SendNotificationRequest),
    });

    const responseJson = await response.json();

    if (response.status === 200) {
      const responseBody = sendNotificationResponseSchema.safeParse(responseJson);
      if (responseBody.success === false) {
        console.error("❌ Invalid notification response:", responseBody.error.errors);
        return { state: "error", error: responseBody.error.errors };
      }

      if (responseBody.data.result.rateLimitedTokens.length) {
        console.log(`⏱️  Rate limited for FID ${fid}`);
        return { state: "rate_limit" };
      }

      console.log(`✅ Notification sent successfully to FID ${fid}`);
      return { state: "success" };
    }

    console.error(`❌ Notification failed for FID ${fid}:`, responseJson);
    return { state: "error", error: responseJson };
  } catch (error) {
    console.error(`❌ Error sending notification to FID ${fid}:`, error);
    return { state: "error", error };
  }
}

// Send notifications to multiple users
export async function sendBroadcastNotification({
  title,
  body,
  userFids,
}: {
  title: string;
  body: string;
  userFids?: number[];
}): Promise<{
  successful: number;
  failed: number;
  rateLimited: number;
  noToken: number;
}> {
  const results = {
    successful: 0,
    failed: 0,
    rateLimited: 0,
    noToken: 0,
  };

  let targetUsers: number[] = [];
  
  if (userFids) {
    targetUsers = userFids;
  } else {
    // Get all users with notification tokens
    const { getAllNotificationUsers } = await import("./notification-service");
    const allUsers = await getAllNotificationUsers();
    targetUsers = allUsers.map(user => user.fid);
  }

  console.log(`📢 Broadcasting notification to ${targetUsers.length} users: ${title}`);

  // Send notifications in batches to avoid overwhelming the API
  const batchSize = 10;
  for (let i = 0; i < targetUsers.length; i += batchSize) {
    const batch = targetUsers.slice(i, i + batchSize);
    
    const promises = batch.map(async (fid) => {
      const result = await sendFrameNotification({ fid, title, body });
      
      switch (result.state) {
        case "success":
          results.successful++;
          break;
        case "rate_limit":
          results.rateLimited++;
          break;
        case "no_token":
          results.noToken++;
          break;
        case "error":
          results.failed++;
          break;
      }
    });

    await Promise.all(promises);
    
    // Add small delay between batches
    if (i + batchSize < targetUsers.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(`📊 Broadcast results:`, results);
  return results;
}
