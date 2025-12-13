import { useAuth } from "@/hooks/useAuth";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LoadingSkeleton } from "./LoadingSkeleton";

const PUBLIC_ROUTES = ["/"];
const DEFAULT_AUTHENTICATED_ROUTE = "/dashboard";
const DEFAULT_PUBLIC_ROUTE = "/";

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

    if (isLoggedIn && pathname === DEFAULT_PUBLIC_ROUTE) {
      router.replace(DEFAULT_AUTHENTICATED_ROUTE);
    } else if (!isLoggedIn && !isPublicRoute) {
      router.replace(DEFAULT_PUBLIC_ROUTE);
    } else {
      setIsReady(true);
    }
  }, [isLoggedIn, isLoading, pathname, router]);

  if (!isReady) return <LoadingSkeleton />;

  return <>{children}</>;
}
