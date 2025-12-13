export interface SubscriptionOperations {
  manageSubscription: (accessToken: string) => Promise<void>;
}

export type UseSubscriptionReturn = SubscriptionOperations;
