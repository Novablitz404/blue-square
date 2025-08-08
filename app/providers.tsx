"use client";

import { type ReactNode } from "react";
import { base } from "wagmi/chains";
import { MiniKitProvider } from "@coinbase/onchainkit/minikit";

export function Providers(props: { children: ReactNode }) {
  return (
    <MiniKitProvider
      projectId={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
      chain={base}
      notificationProxyUrl="/api/notification"
    >
      {props.children}
    </MiniKitProvider>
  );
}
