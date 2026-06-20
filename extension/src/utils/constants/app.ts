import { browser } from "#imports"

export const APP_NAME = "OpenTranslate"
export const GITHUB_REPO_URL = "https://github.com/mekedron/OpenTranslate"
const manifest = browser.runtime.getManifest()
export const EXTENSION_VERSION = manifest.version
