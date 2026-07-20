import * as React from "react";
import { useLocalSearchParams, usePathname } from "expo-router";
import { buildBackHref } from "./buildBackHref";

/**
 * Hook variant of buildBackHref — reads pathname + searchParams from
 * expo-router and memoizes the result. Suitable for handing off as a
 * `?from=` param on a router.push into a nested screen. The nested
 * screen's Back button (BackButton, "Go back" button, or
 * useOriginAwareBack) can then router.replace(from) to return the
 * user to exactly where they came from.
 *
 * The underlying pure function lives in ./buildBackHref so unit tests
 * can exercise it without pulling in expo-router.
 */
export function useBuildBackHref(): string {
  const pathname = usePathname();
  const searchParams = useLocalSearchParams();
  return React.useMemo(
    () => buildBackHref(pathname, searchParams),
    [pathname, searchParams],
  );
}
