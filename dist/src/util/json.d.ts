import Ajv from 'ajv';
import type { EvaluateResult, ResultFailureReason } from '../types/index';
export declare function resetAjv(): void;
export declare function getAjv(): Ajv;
export declare function isValidJson(str: string): boolean;
/**
 * Safely stringify a value to JSON, handling circular references and large objects.
 *
 * @param value - The value to stringify
 * @param prettyPrint - Whether to format the JSON with indentation
 * @returns JSON string representation, or undefined if serialization fails
 */
export declare function safeJsonStringify<T>(value: T, prettyPrint?: boolean): string | undefined;
export declare function convertSlashCommentsToHash(str: string): string;
export declare function extractJsonObjects(str: string): object[];
export declare function extractFirstJsonObject<T>(str: string): T;
/**
 * Reorders the keys of an object based on a specified order, preserving any unspecified keys.
 * Symbol keys are preserved and added at the end.
 *
 * @param obj - The object whose keys need to be reordered.
 * @param order - An array specifying the desired order of keys.
 * @returns A new object with keys reordered according to the specified order.
 *
 * @example
 * const obj = { c: 3, a: 1, b: 2 };
 * const orderedObj = orderKeys(obj, ['a', 'b']);
 * // Result: { a: 1, b: 2, c: 3 }
 */
export declare function orderKeys<T extends object>(obj: T, order: (keyof T)[]): T;
/**
 * Type definition for a logging-safe summary of an EvaluateResult.
 */
interface LoggableEvaluateResultSummary {
    id?: string;
    testIdx: number;
    promptIdx: number;
    success: boolean;
    score: number;
    error?: string | null;
    failureReason: ResultFailureReason;
    provider?: {
        id: string;
        label?: string;
    };
    response?: {
        output?: string;
        error?: string | null;
        cached?: boolean;
        cost?: number;
        tokenUsage?: any;
        metadata?: {
            keys: string[];
            keyCount: number;
        };
    };
    testCase?: {
        description?: string;
        vars?: string[];
    };
}
/**
 * Creates a summary of an EvaluateResult for logging purposes, avoiding RangeError
 * when stringifying large evaluation results.
 *
 * Extracts key information while truncating potentially large fields like response
 * outputs and metadata values.
 *
 * @param result - The evaluation result to summarize
 * @param maxOutputLength - Maximum length for response output before truncation. Default: 500
 * @param includeMetadataKeys - Whether to include metadata keys in the summary. Default: true
 * @returns A summarized version safe for JSON stringification
 * @throws {TypeError} If result is null or undefined
 */
export declare function summarizeEvaluateResultForLogging(result: EvaluateResult, maxOutputLength?: number, includeMetadataKeys?: boolean): LoggableEvaluateResultSummary;
export {};
//# sourceMappingURL=json.d.ts.map