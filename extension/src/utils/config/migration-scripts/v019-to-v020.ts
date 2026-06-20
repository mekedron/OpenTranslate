export function migrate(oldConfig: any): any {
  return {
    ...oldConfig,
    floatingButton: {
      ...oldConfig.floatingButton,
      disabledFloatingButtonPatterns: [],
    },
  }
}
