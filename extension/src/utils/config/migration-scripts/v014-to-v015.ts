export function migrate(oldConfig: any): any {
  return {
    ...oldConfig,
    selectionToolbar: {
      enabled: true,
    },
  }
}
