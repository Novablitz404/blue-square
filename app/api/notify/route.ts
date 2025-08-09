import { sendFrameNotification, sendBroadcastNotification } from "@/lib/notification-client";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("📤 Notification API called:", body);

    const { type, fid, notification, userFids } = body;

    if (!type || !notification) {
      return NextResponse.json(
        { error: "Missing required fields: type, notification" },
        { status: 400 },
      );
    }

    if (!notification.title || !notification.body) {
      return NextResponse.json(
        { error: "Notification must have title and body" },
        { status: 400 },
      );
    }

    let result;

    switch (type) {
      case "single":
        if (!fid) {
          return NextResponse.json(
            { error: "FID is required for single notifications" },
            { status: 400 },
          );
        }

        result = await sendFrameNotification({
          fid,
          title: notification.title,
          body: notification.body,
          notificationDetails: notification.notificationDetails,
        });

        if (result.state === "error") {
          return NextResponse.json(
            { error: result.error },
            { status: 500 },
          );
        }

        return NextResponse.json({ 
          success: true, 
          state: result.state 
        }, { status: 200 });

      case "broadcast":
        const broadcastResult = await sendBroadcastNotification({
          title: notification.title,
          body: notification.body,
          userFids,
        });

        return NextResponse.json({ 
          success: true, 
          results: broadcastResult 
        }, { status: 200 });

      default:
        return NextResponse.json(
          { error: `Unknown notification type: ${type}` },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("❌ Notification API error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
