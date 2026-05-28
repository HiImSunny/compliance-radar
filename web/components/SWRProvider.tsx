"use client";

import { SWRConfig } from "swr";

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        // Global error handler — swallow silently, each hook handles its own state
        onError: () => {},
      }}
    >
      {children}
    </SWRConfig>
  );
}
