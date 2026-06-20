/**
 * Migration script from v079 to v080
 * - Removes the TTS, video-subtitles, and selection-toolbar "speak" config that
 *   shipped with the upstream extension. These features were stripped from this
 *   build, so the keys are deleted to keep migrated configs deterministic and
 *   schema-valid.
 *
 * IMPORTANT: All values are hardcoded inline. Migration scripts are frozen
 * snapshots — never import constants or helpers that may change.
 */

export function migrate(oldConfig: any): any {
  if (!oldConfig || typeof oldConfig !== "object") {
    return oldConfig
  }

  const next: Record<string, any> = { ...oldConfig }

  delete next.tts
  delete next.videoSubtitles

  const selectionToolbar = next.selectionToolbar
  if (selectionToolbar && typeof selectionToolbar === "object") {
    const features = selectionToolbar.features
    if (features && typeof features === "object" && "speak" in features) {
      const nextFeatures = { ...features }
      delete nextFeatures.speak
      next.selectionToolbar = {
        ...selectionToolbar,
        features: nextFeatures,
      }
    }
  }

  return next
}
