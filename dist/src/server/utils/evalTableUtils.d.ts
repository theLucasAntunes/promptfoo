import type { EvaluateTableRow, Prompt } from '../../types';
/**
 * Generates CSV data from evaluation table data
 * Includes grader reason, comment, and conversation columns similar to client-side implementation
 *
 * @param table - The evaluation table data
 * @param options - Export options
 * @returns CSV formatted string
 */
export declare function evalTableToCsv(table: {
    head: {
        prompts: Prompt[];
        vars: string[];
    };
    body: EvaluateTableRow[];
}, options?: {
    isRedteam?: boolean;
}): string;
/**
 * Generate JSON data from evaluation table
 * @param table Evaluation table data
 * @returns JSON object
 */
export declare function evalTableToJson(table: {
    head: {
        prompts: Prompt[];
        vars: string[];
    };
    body: EvaluateTableRow[];
}): any;
//# sourceMappingURL=evalTableUtils.d.ts.map