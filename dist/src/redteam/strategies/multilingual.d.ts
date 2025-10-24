import type { TestCase } from '../../types/index';
export declare const DEFAULT_LANGUAGES: string[];
/**
 * Helper function to get the concurrency limit from config or use default
 */
export declare function getConcurrencyLimit(config?: Record<string, any>): number;
/**
 * Translates text with adaptive batch size - falls back to smaller batches on failure
 */
export declare function translateBatch(text: string, languages: string[], initialBatchSize?: number): Promise<Record<string, string>>;
export declare function addMultilingual(testCases: TestCase[], injectVar: string, config: Record<string, any>): Promise<TestCase[]>;
//# sourceMappingURL=multilingual.d.ts.map