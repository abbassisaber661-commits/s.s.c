import { useEffect, useRef, useCallback } from "react";

interface UseInfiniteScrollOptions {
  onLoadMore: () => void;
  hasNextPage: boolean;
  isFetching: boolean;
  threshold?: number;
  rootMargin?: string;
}

/**
 * Reusable infinite scroll hook using IntersectionObserver.
 * Attach `sentinelRef` to the last element (or a sentinel div) in your list.
 */
export function useInfiniteScroll({
  onLoadMore,
  hasNextPage,
  isFetching,
  threshold = 0.1,
  rootMargin = "200px",
}: UseInfiniteScrollOptions) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const stableOnLoadMore = useCallback(onLoadMore, []);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetching) {
          stableOnLoadMore();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetching, threshold, rootMargin, stableOnLoadMore]);

  return { sentinelRef };
}

export default useInfiniteScroll;
