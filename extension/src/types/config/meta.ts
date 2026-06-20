import type { Config } from "./config"

/**
 * Metadata stored with config via WXT storage.setMeta
 */
export interface ConfigMetaFields {
  schemaVersion: number
  lastModifiedAt: number
}

export interface ConfigMeta extends ConfigMetaFields, Record<string, unknown> {}

export interface ConfigValueAndMeta {
  value: Config
  meta: ConfigMeta
}
