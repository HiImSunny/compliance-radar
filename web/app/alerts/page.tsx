import { Suspense } from "react";
import { AlertsClient } from "./AlertsClient";
import { Skeleton } from "@/components/ui/skeleton";

export default function AlertsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <AlertsClient />
    </Suspense>
  );
}
