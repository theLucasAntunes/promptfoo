import type { TestCaseWithPlugin } from '../types/index';
import type { RedteamStrategyObject, SynthesizeOptions } from './types';
/**
 * Resolves top-level file paths in the plugin configuration.
 * @param config - The plugin configuration to resolve.
 * @returns The resolved plugin configuration.
 */
export declare function resolvePluginConfig(config: Record<string, any> | undefined): Record<string, any>;
/**
 * Determines whether a strategy should be applied to a test case based on plugin targeting rules.
 *
 * This function evaluates multiple criteria to decide if a strategy matches a test case:
 * - Excludes strategy-exempt plugins (defined in STRATEGY_EXEMPT_PLUGINS)
 * - Excludes sequence providers (which are verbatim and don't support strategies)
 * - Respects plugin-level strategy exclusions via excludeStrategies config
 * - Matches against target plugins through direct ID match or category prefixes
 *
 * @param testCase - The test case containing plugin metadata to evaluate
 * @param strategyId - The ID of the strategy being considered for application
 * @param targetPlugins - Optional array of plugin IDs or categories that the strategy targets.
 *                       If undefined or empty, strategy applies to all non-exempt plugins.
 *                       Supports both exact matches and category prefixes (e.g., 'harmful' matches 'harmful:hate')
 * @returns True if the strategy should be applied to this test case, false otherwise
 */
/**
 * Helper function to calculate the number of expected test cases for the multilingual strategy.
 */
export declare function getMultilingualRequestedCount(testCases: TestCaseWithPlugin[], strategy: RedteamStrategyObject): number;
/**
 * Helper function to get the test count based on strategy configuration.
 * @param strategy - The strategy object to evaluate.
 * @param totalPluginTests - The total number of plugin tests.
 * @param strategies - The array of strategies.
 * @returns The calculated test count.
 */
export declare function getTestCount(strategy: RedteamStrategyObject, totalPluginTests: number, _strategies: RedteamStrategyObject[]): number;
/**
 * Calculates the total number of tests to be generated based on plugins and strategies.
 * @param plugins - The array of plugins to generate tests for
 * @param strategies - The array of strategies to apply
 * @returns Object containing total tests and intermediate calculations
 */
export declare function calculateTotalTests(plugins: SynthesizeOptions['plugins'], strategies: RedteamStrategyObject[]): {
    effectiveStrategyCount: number;
    includeBasicTests: boolean;
    multilingualStrategy: RedteamStrategyObject | undefined;
    totalPluginTests: number;
    totalTests: number;
};
/**
 * Synthesizes test cases based on provided options.
 * @param options - The options for test case synthesis.
 * @returns A promise that resolves to an object containing the purpose, entities, and test cases.
 */
export declare function synthesize({ abortSignal, delay, entities: entitiesOverride, injectVar, language, maxConcurrency, plugins, prompts, provider, purpose: purposeOverride, strategies, targetLabels, showProgressBar: showProgressBarOverride, excludeTargetOutputFromAgenticAttackGeneration, testGenerationInstructions, }: SynthesizeOptions): Promise<{
    purpose: string;
    entities: string[];
    testCases: TestCaseWithPlugin[];
    injectVar: string;
}>;
//# sourceMappingURL=index.d.ts.map