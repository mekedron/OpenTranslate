/**
 * TypeScript interfaces for test series structure
 * Enables multiple test scenarios per version while maintaining backward compatibility
 */

/**
 * Configuration for a single test series
 */
export interface TestSeriesConfig {
  /** Description of what this test series validates */
  description: string
  /** Configuration object - using 'any' to match migration function signatures */
  config: any
}

/**
 * Object containing multiple test series for a version
 * Uses Record<string, TestSeriesConfig> for clean object-based structure
 */
export type TestSeriesObject = Record<string, TestSeriesConfig>

/**
 * Complete test data structure for a version file
 * All test cases are contained within testSeries object
 */
export interface VersionTestData {
  /** Object-based structure with multiple test series - all tests go here */
  testSeries: TestSeriesObject
}
