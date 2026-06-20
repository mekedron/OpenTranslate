export const CONTENT_WRAPPER_CLASS = "opentranslate-translated-content-wrapper"
export const INLINE_CONTENT_CLASS = "opentranslate-translated-inline-content"
export const BLOCK_CONTENT_CLASS = "opentranslate-translated-block-content"
export const FLOAT_WRAP_ATTRIBUTE = "data-opentranslate-float-wrap"

export const WALKED_ATTRIBUTE = "data-opentranslate-walked"
// paragraph means you need to trigger translation on this element (i.e. we have inline children in it)
export const PARAGRAPH_ATTRIBUTE = "data-opentranslate-paragraph"
export const BLOCK_ATTRIBUTE = "data-opentranslate-block-node"
export const INLINE_ATTRIBUTE = "data-opentranslate-inline-node"

export const TRANSLATION_MODE_ATTRIBUTE = "data-opentranslate-translation-mode"

export const MARK_ATTRIBUTES = new Set([WALKED_ATTRIBUTE, PARAGRAPH_ATTRIBUTE, BLOCK_ATTRIBUTE, INLINE_ATTRIBUTE])

export const NOTRANSLATE_CLASS = "notranslate"

export const REACT_SHADOW_HOST_CLASS = "opentranslate-react-shadow-host"

export const TRANSLATION_ERROR_CONTAINER_CLASS = "opentranslate-translation-error-container"
