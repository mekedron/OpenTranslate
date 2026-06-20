/**
 * Migration script from v075 to v076
 *
 * No-op placeholder. This step previously backfilled config for a feature that
 * has since been removed, so there is nothing left to migrate. Kept to preserve
 * the gapless v2..vN migration chain required by the runner and all-migrations tests.
 */
export function migrate(oldConfig: any): any {
  return oldConfig
}
