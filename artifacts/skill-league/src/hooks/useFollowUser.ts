// TODO: Implement follow/unfollow mutation
export function useFollowUser(_userId: string) {
  return {
    isPending: false,
    mutate: (_action: "follow" | "unfollow") => {},
  };
}
