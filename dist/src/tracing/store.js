"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TraceStore = void 0;
exports.getTraceStore = getTraceStore;
const crypto_1 = require("crypto");
const drizzle_orm_1 = require("drizzle-orm");
const index_1 = require("../database/index");
const tables_1 = require("../database/tables");
const logger_1 = __importDefault(require("../logger"));
class TraceStore {
    constructor() {
        this.db = null;
    }
    getDatabase() {
        if (!this.db) {
            logger_1.default.debug('[TraceStore] Initializing database connection');
            this.db = (0, index_1.getDb)();
        }
        return this.db;
    }
    async createTrace(trace) {
        try {
            logger_1.default.debug(`[TraceStore] Creating trace ${trace.traceId} for evaluation ${trace.evaluationId}`);
            const db = this.getDatabase();
            await db.insert(tables_1.tracesTable).values({
                id: (0, crypto_1.randomUUID)(),
                traceId: trace.traceId,
                evaluationId: trace.evaluationId,
                testCaseId: trace.testCaseId,
                metadata: trace.metadata,
            });
            logger_1.default.debug(`[TraceStore] Successfully created trace ${trace.traceId}`);
        }
        catch (error) {
            logger_1.default.error(`[TraceStore] Failed to create trace: ${error}`);
            throw error;
        }
    }
    async addSpans(traceId, spans, options) {
        try {
            logger_1.default.debug(`[TraceStore] Adding ${spans.length} spans to trace ${traceId}`);
            const db = this.getDatabase();
            // Only verify trace exists if not skipping the check (for OTLP scenarios)
            if (options?.skipTraceCheck) {
                logger_1.default.debug(`[TraceStore] Skipping trace existence check for OTLP scenario`);
            }
            else {
                logger_1.default.debug(`[TraceStore] Verifying trace ${traceId} exists`);
                const trace = await db
                    .select()
                    .from(tables_1.tracesTable)
                    .where((0, drizzle_orm_1.eq)(tables_1.tracesTable.traceId, traceId))
                    .limit(1);
                if (trace.length === 0) {
                    logger_1.default.warn(`[TraceStore] Trace ${traceId} not found, skipping spans`);
                    return;
                }
                logger_1.default.debug(`[TraceStore] Trace ${traceId} found, proceeding with span insertion`);
            }
            // Insert spans
            const spanRecords = spans.map((span) => {
                logger_1.default.debug(`[TraceStore] Preparing span ${span.spanId} (${span.name}) for insertion`);
                return {
                    id: (0, crypto_1.randomUUID)(),
                    traceId,
                    spanId: span.spanId,
                    parentSpanId: span.parentSpanId,
                    name: span.name,
                    startTime: span.startTime,
                    endTime: span.endTime,
                    attributes: span.attributes,
                    statusCode: span.statusCode,
                    statusMessage: span.statusMessage,
                };
            });
            await db.insert(tables_1.spansTable).values(spanRecords);
            logger_1.default.debug(`[TraceStore] Successfully added ${spans.length} spans to trace ${traceId}`);
        }
        catch (error) {
            logger_1.default.error(`[TraceStore] Failed to add spans: ${error}`);
            throw error;
        }
    }
    async getTracesByEvaluation(evaluationId) {
        try {
            logger_1.default.debug(`[TraceStore] Fetching traces for evaluation ${evaluationId}`);
            const db = this.getDatabase();
            // Get all traces for the evaluation
            const traces = await db
                .select()
                .from(tables_1.tracesTable)
                .where((0, drizzle_orm_1.eq)(tables_1.tracesTable.evaluationId, evaluationId));
            logger_1.default.debug(`[TraceStore] Found ${traces.length} traces for evaluation ${evaluationId}`);
            // Get spans for each trace
            const tracesWithSpans = await Promise.all(traces.map(async (trace) => {
                logger_1.default.debug(`[TraceStore] Fetching spans for trace ${trace.traceId}`);
                const spans = await db
                    .select()
                    .from(tables_1.spansTable)
                    .where((0, drizzle_orm_1.eq)(tables_1.spansTable.traceId, trace.traceId));
                logger_1.default.debug(`[TraceStore] Found ${spans.length} spans for trace ${trace.traceId}`);
                return {
                    ...trace,
                    spans,
                };
            }));
            logger_1.default.debug(`[TraceStore] Returning ${tracesWithSpans.length} traces with spans`);
            return tracesWithSpans;
        }
        catch (error) {
            logger_1.default.error(`[TraceStore] Failed to get traces for evaluation: ${error}`);
            throw error;
        }
    }
    async getTrace(traceId) {
        try {
            logger_1.default.debug(`[TraceStore] Fetching trace ${traceId}`);
            const db = this.getDatabase();
            const traces = await db
                .select()
                .from(tables_1.tracesTable)
                .where((0, drizzle_orm_1.eq)(tables_1.tracesTable.traceId, traceId))
                .limit(1);
            if (traces.length === 0) {
                logger_1.default.debug(`[TraceStore] Trace ${traceId} not found`);
                return null;
            }
            const trace = traces[0];
            logger_1.default.debug(`[TraceStore] Found trace ${traceId}, fetching spans`);
            const spans = await db.select().from(tables_1.spansTable).where((0, drizzle_orm_1.eq)(tables_1.spansTable.traceId, traceId));
            logger_1.default.debug(`[TraceStore] Found ${spans.length} spans for trace ${traceId}`);
            return {
                ...trace,
                spans,
            };
        }
        catch (error) {
            logger_1.default.error(`[TraceStore] Failed to get trace: ${error}`);
            throw error;
        }
    }
    async deleteOldTraces(retentionDays) {
        try {
            logger_1.default.debug(`[TraceStore] Deleting traces older than ${retentionDays} days`);
            const db = this.getDatabase();
            const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
            // Delete old traces (spans will be cascade deleted due to foreign key)
            await db.delete(tables_1.tracesTable).where((0, drizzle_orm_1.lt)(tables_1.tracesTable.createdAt, cutoffTime));
            logger_1.default.debug(`[TraceStore] Successfully deleted traces older than ${retentionDays} days`);
        }
        catch (error) {
            logger_1.default.error(`[TraceStore] Failed to delete old traces: ${error}`);
            throw error;
        }
    }
}
exports.TraceStore = TraceStore;
// Singleton instance
let traceStore = null;
function getTraceStore() {
    if (!traceStore) {
        logger_1.default.debug('[TraceStore] Creating new TraceStore instance');
        traceStore = new TraceStore();
    }
    return traceStore;
}
//# sourceMappingURL=store.js.map