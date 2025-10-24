"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setJavaScriptMimeType = setJavaScriptMimeType;
exports.handleServerError = handleServerError;
exports.createApp = createApp;
exports.startServer = startServer;
const compression_1 = __importDefault(require("compression"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ quiet: true });
const node_http_1 = __importDefault(require("node:http"));
const node_path_1 = __importDefault(require("node:path"));
const express_1 = __importDefault(require("express"));
const socket_io_1 = require("socket.io");
const zod_validation_error_1 = require("zod-validation-error");
const constants_1 = require("../constants");
const signal_1 = require("../database/signal");
const esm_1 = require("../esm");
const cloud_1 = require("../globalConfig/cloud");
const logger_1 = __importDefault(require("../logger"));
const migrate_1 = require("../migrate");
const eval_1 = __importStar(require("../models/eval"));
const remoteGeneration_1 = require("../redteam/remoteGeneration");
const share_1 = require("../share");
const telemetry_1 = __importStar(require("../telemetry"));
const synthesis_1 = require("../testCase/synthesis");
const apiHealth_1 = require("../util/apiHealth");
const database_1 = require("../util/database");
const invariant_1 = __importDefault(require("../util/invariant"));
const server_1 = require("../util/server");
const configs_1 = require("./routes/configs");
const eval_2 = require("./routes/eval");
const modelAudit_1 = require("./routes/modelAudit");
const providers_1 = require("./routes/providers");
const redteam_1 = require("./routes/redteam");
const traces_1 = require("./routes/traces");
const user_1 = require("./routes/user");
const version_1 = __importDefault(require("./routes/version"));
// Prompts cache
let allPrompts = null;
// JavaScript file extensions that need proper MIME type
const JS_EXTENSIONS = new Set(['.js', '.mjs', '.cjs']);
// Express middleware limits
const REQUEST_SIZE_LIMIT = '100mb';
/**
 * Middleware to set proper MIME types for JavaScript files.
 * This is necessary because some browsers (especially Arc) enforce strict MIME type checking
 * and will refuse to execute scripts with incorrect MIME types for security reasons.
 */
function setJavaScriptMimeType(req, res, next) {
    const ext = node_path_1.default.extname(req.path);
    if (JS_EXTENSIONS.has(ext)) {
        res.setHeader('Content-Type', 'application/javascript');
    }
    next();
}
/**
 * Handles server startup errors with proper logging and graceful shutdown.
 */
function handleServerError(error, port) {
    if (error.code === 'EADDRINUSE') {
        logger_1.default.error(`Port ${port} is already in use. Do you have another Promptfoo instance running?`);
    }
    else {
        logger_1.default.error(`Failed to start server: ${error instanceof Error ? error.message : error}`);
    }
    process.exit(1);
}
function createApp() {
    const app = (0, express_1.default)();
    const staticDir = node_path_1.default.join((0, esm_1.getDirectory)(), 'app');
    app.use((0, cors_1.default)());
    app.use((0, compression_1.default)());
    app.use(express_1.default.json({ limit: REQUEST_SIZE_LIMIT }));
    app.use(express_1.default.urlencoded({ limit: REQUEST_SIZE_LIMIT, extended: true }));
    app.get('/health', (_req, res) => {
        res.status(200).json({ status: 'OK', version: constants_1.VERSION });
    });
    app.get('/api/remote-health', async (_req, res) => {
        const apiUrl = (0, remoteGeneration_1.getRemoteHealthUrl)();
        if (apiUrl === null) {
            res.json({
                status: 'DISABLED',
                message: 'remote generation and grading are disabled',
            });
            return;
        }
        const result = await (0, apiHealth_1.checkRemoteHealth)(apiUrl);
        res.json(result);
    });
    /**
     * Fetches summaries of all evals, optionally for a given dataset.
     */
    app.get('/api/results', async (req, res) => {
        const previousResults = await (0, eval_1.getEvalSummaries)(req.query.datasetId, req.query.type, req.query.includeProviders);
        res.json({ data: previousResults });
    });
    app.get('/api/results/:id', async (req, res) => {
        const { id } = req.params;
        const file = await (0, database_1.readResult)(id);
        if (!file) {
            res.status(404).send('Result not found');
            return;
        }
        res.json({ data: file.result });
    });
    app.get('/api/prompts', async (_req, res) => {
        if (allPrompts == null) {
            allPrompts = await (0, database_1.getPrompts)();
        }
        res.json({ data: allPrompts });
    });
    app.get('/api/history', async (req, res) => {
        const tagName = req.query.tagName;
        const tagValue = req.query.tagValue;
        const description = req.query.description;
        const tag = tagName && tagValue ? { key: tagName, value: tagValue } : undefined;
        const results = await (0, database_1.getStandaloneEvals)({
            tag,
            description,
        });
        res.json({
            data: results,
        });
    });
    app.get('/api/prompts/:sha256hash', async (req, res) => {
        const sha256hash = req.params.sha256hash;
        const prompts = await (0, database_1.getPromptsForTestCasesHash)(sha256hash);
        res.json({ data: prompts });
    });
    app.get('/api/datasets', async (_req, res) => {
        res.json({ data: await (0, database_1.getTestCases)() });
    });
    app.get('/api/results/share/check-domain', async (req, res) => {
        const id = req.query.id;
        if (!id || id === 'undefined') {
            logger_1.default.warn(`Missing or invalid id parameter in ${req.method} ${req.path}`);
            res.status(400).json({ error: 'Missing id parameter' });
            return;
        }
        const eval_ = await eval_1.default.findById(id);
        if (!eval_) {
            logger_1.default.warn(`Eval not found for id: ${id}`);
            res.status(404).json({ error: 'Eval not found' });
            return;
        }
        const { domain } = (0, share_1.determineShareDomain)(eval_);
        const isCloudEnabled = cloud_1.cloudConfig.isEnabled();
        res.json({ domain, isCloudEnabled });
    });
    app.post('/api/results/share', async (req, res) => {
        const { id } = req.body;
        logger_1.default.debug(`[${req.method} ${req.path}] Share request for eval ID: ${id || 'undefined'}`);
        const result = await (0, database_1.readResult)(id);
        if (!result) {
            logger_1.default.warn(`Result not found for id: ${id}`);
            res.status(404).json({ error: 'Eval not found' });
            return;
        }
        const eval_ = await eval_1.default.findById(id);
        (0, invariant_1.default)(eval_, 'Eval not found');
        try {
            const url = await (0, share_1.createShareableUrl)(eval_, true);
            logger_1.default.debug(`Generated share URL for eval ${id}: ${(0, share_1.stripAuthFromUrl)(url || '')}`);
            res.json({ url });
        }
        catch (error) {
            logger_1.default.error(`Failed to generate share URL for eval ${id}: ${error instanceof Error ? error.message : error}`);
            res.status(500).json({ error: 'Failed to generate share URL' });
        }
    });
    app.post('/api/dataset/generate', async (req, res) => {
        const testSuite = {
            prompts: req.body.prompts,
            tests: req.body.tests,
            providers: [],
        };
        const results = await (0, synthesis_1.synthesizeFromTestSuite)(testSuite, {});
        res.json({ results });
    });
    app.use('/api/eval', eval_2.evalRouter);
    app.use('/api/providers', providers_1.providersRouter);
    app.use('/api/redteam', redteam_1.redteamRouter);
    app.use('/api/user', user_1.userRouter);
    app.use('/api/configs', configs_1.configsRouter);
    app.use('/api/model-audit', modelAudit_1.modelAuditRouter);
    app.use('/api/traces', traces_1.tracesRouter);
    app.use('/api/version', version_1.default);
    app.post('/api/telemetry', async (req, res) => {
        try {
            const result = telemetry_1.TelemetryEventSchema.safeParse(req.body);
            if (!result.success) {
                res
                    .status(400)
                    .json({ error: 'Invalid request body', details: (0, zod_validation_error_1.fromError)(result.error).toString() });
                return;
            }
            const { event, properties } = result.data;
            await telemetry_1.default.record(event, properties);
            res.status(200).json({ success: true });
        }
        catch (error) {
            logger_1.default.error(`Error processing telemetry request: ${error instanceof Error ? error.message : error}`);
            res.status(500).json({ error: 'Failed to process telemetry request' });
        }
    });
    // Must come after the above routes (particularly /api/config) so it doesn't
    // overwrite dynamic routes.
    // Configure proper MIME types for JavaScript files
    app.use(setJavaScriptMimeType);
    app.use(express_1.default.static(staticDir, { dotfiles: 'allow' }));
    // Handle client routing, return all requests to the app
    app.get('/*splat', (_req, res) => {
        res.sendFile('index.html', { root: staticDir, dotfiles: 'allow' });
    });
    return app;
}
async function startServer(port = (0, constants_1.getDefaultPort)(), browserBehavior = server_1.BrowserBehavior.ASK) {
    const app = createApp();
    const httpServer = node_http_1.default.createServer(app);
    const io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: '*',
        },
    });
    await (0, migrate_1.runDbMigrations)();
    (0, signal_1.setupSignalWatcher)(async () => {
        const latestEval = await eval_1.default.latest();
        const results = await latestEval?.getResultsCount();
        if (results && results > 0) {
            logger_1.default.info(`Emitting update for eval: ${latestEval?.config?.description || latestEval?.id || 'unknown'}`);
            io.emit('update', latestEval);
            allPrompts = null;
        }
    });
    io.on('connection', async (socket) => {
        socket.emit('init', await eval_1.default.latest());
    });
    httpServer
        .listen(port, () => {
        const url = `http://localhost:${port}`;
        logger_1.default.info(`Server running at ${url} and monitoring for new evals.`);
        (0, server_1.openBrowser)(browserBehavior, port).catch((error) => {
            logger_1.default.error(`Failed to handle browser behavior (${server_1.BrowserBehavior[browserBehavior]}): ${error instanceof Error ? error.message : error}`);
        });
    })
        .on('error', (error) => {
        handleServerError(error, port);
    });
}
//# sourceMappingURL=server.js.map