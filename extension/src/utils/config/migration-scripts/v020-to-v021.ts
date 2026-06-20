export function migrate(oldConfig: any): any {
  return {
    ...oldConfig,
    translate: {
      ...oldConfig.translate,
      page: {
        ...oldConfig.translate.page,
        autoTranslateLanguages: [],
      },
    },
  }
}
