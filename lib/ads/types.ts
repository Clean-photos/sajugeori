export interface AdRewardProvider {
  verify(adToken: string, userKey: string): Promise<boolean>;
}
