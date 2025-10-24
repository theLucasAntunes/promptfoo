"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerListEvaluationsTool = registerListEvaluationsTool;
const zod_1 = require("zod");
const eval_1 = require("../../../models/eval");
const performance_1 = require("../lib/performance");
const utils_1 = require("../lib/utils");
/**
 * Tool to list and browse evaluation runs
 * Provides filtered views and pagination support
 */
function registerListEvaluationsTool(server) {
    server.tool('list_evaluations', {
        datasetId: zod_1.z
            .string()
            .optional()
            .describe('Filter evaluations by dataset ID. Example: "dataset_123" or leave empty to see all evaluations'),
        page: zod_1.z
            .number()
            .int()
            .positive()
            .optional()
            .default(1)
            .describe('Page number for pagination (default: 1)'),
        pageSize: zod_1.z
            .number()
            .int()
            .min(1)
            .max(100)
            .optional()
            .default(20)
            .describe('Number of items per page (1-100, default: 20)'),
    }, async (args) => {
        const { datasetId, page = 1, pageSize = 20 } = args;
        try {
            // Check cache first
            const cacheKey = `evals:${datasetId || 'all'}`;
            let evals = performance_1.evaluationCache.get(cacheKey);
            if (!evals) {
                // Fetch from database
                evals = await (0, eval_1.getEvalSummaries)(datasetId);
                // Cache the results
                performance_1.evaluationCache.set(cacheKey, evals);
            }
            // Apply pagination
            const paginatedResult = (0, performance_1.paginate)(evals, { page, pageSize });
            // Add helpful summary information
            const summary = {
                totalCount: paginatedResult.pagination.totalItems,
                recentCount: evals.filter((e) => {
                    const createdAt = new Date(e.createdAt);
                    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                    return createdAt > dayAgo;
                }).length,
                datasetId: datasetId || 'all',
                cacheStats: performance_1.evaluationCache.getStats(),
            };
            return (0, utils_1.createToolResponse)('list_evaluations', true, {
                evaluations: paginatedResult.data,
                pagination: paginatedResult.pagination,
                summary,
            });
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('database')) {
                return (0, utils_1.createToolResponse)('list_evaluations', false, { originalError: error.message }, 'Failed to access evaluation database. Ensure promptfoo is properly initialized.');
            }
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            return (0, utils_1.createToolResponse)('list_evaluations', false, undefined, `Failed to list evaluations: ${errorMessage}`);
        }
    });
}
//# sourceMappingURL=listEvaluations.js.map