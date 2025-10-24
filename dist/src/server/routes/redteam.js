"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redteamRouter = void 0;
const express_1 = require("express");
const uuid_1 = require("uuid");
const cliState_1 = __importDefault(require("../../cliState"));
const logger_1 = __importDefault(require("../../logger"));
const constants_1 = require("../../redteam/constants");
const index_1 = require("../../redteam/plugins/index");
const shared_1 = require("../../redteam/providers/shared");
const remoteGeneration_1 = require("../../redteam/remoteGeneration");
const shared_2 = require("../../redteam/shared");
const index_2 = require("../../util/fetch/index");
const eval_1 = require("./eval");
exports.redteamRouter = (0, express_1.Router)();
// Generate a single test case for a specific plugin
exports.redteamRouter.post('/generate-test', async (req, res) => {
    try {
        const { pluginId, config } = req.body;
        if (!pluginId) {
            res.status(400).json({ error: 'Plugin ID is required' });
            return;
        }
        // Find the plugin
        const plugin = index_1.Plugins.find((p) => p.key === pluginId);
        if (!plugin) {
            res.status(400).json({ error: `Plugin ${pluginId} not found` });
            return;
        }
        // Get default values from config
        const purpose = config?.applicationDefinition?.purpose || 'general AI assistant';
        const injectVar = config?.injectVar || 'query';
        // Extract plugin-specific configuration
        const pluginConfig = {
            language: config?.language || 'en',
            // Pass through plugin-specific config fields
            ...(config?.indirectInjectionVar && { indirectInjectionVar: config.indirectInjectionVar }),
            ...(config?.systemPrompt && { systemPrompt: config.systemPrompt }),
            ...(config?.targetIdentifiers && { targetIdentifiers: config.targetIdentifiers }),
            ...(config?.targetSystems && { targetSystems: config.targetSystems }),
            ...(config?.targetUrls && { targetUrls: config.targetUrls }),
            // Pass through any other config fields that might be present
            ...Object.fromEntries(Object.entries(config || {}).filter(([key]) => !['applicationDefinition', 'injectVar', 'language', 'provider'].includes(key))),
        };
        // Validate required configuration for specific plugins
        if (pluginId === 'indirect-prompt-injection' && !pluginConfig.indirectInjectionVar) {
            res.status(400).json({
                error: 'Indirect Prompt Injection plugin requires indirectInjectionVar configuration',
            });
            return;
        }
        if (pluginId === 'prompt-extraction' && !pluginConfig.systemPrompt) {
            res.status(400).json({
                error: 'Prompt Extraction plugin requires systemPrompt configuration',
            });
            return;
        }
        // Optional config plugins - only validate if config is provided but invalid
        if (pluginId === 'bfla' &&
            pluginConfig.targetIdentifiers &&
            (!Array.isArray(pluginConfig.targetIdentifiers) ||
                pluginConfig.targetIdentifiers.length === 0)) {
            res.status(400).json({
                error: 'BFLA plugin targetIdentifiers must be a non-empty array when provided',
            });
            return;
        }
        if (pluginId === 'bola' &&
            pluginConfig.targetSystems &&
            (!Array.isArray(pluginConfig.targetSystems) || pluginConfig.targetSystems.length === 0)) {
            res.status(400).json({
                error: 'BOLA plugin targetSystems must be a non-empty array when provided',
            });
            return;
        }
        if (pluginId === 'ssrf' &&
            pluginConfig.targetUrls &&
            (!Array.isArray(pluginConfig.targetUrls) || pluginConfig.targetUrls.length === 0)) {
            res.status(400).json({
                error: 'SSRF plugin targetUrls must be a non-empty array when provided',
            });
            return;
        }
        // Get the red team provider
        const redteamProvider = await shared_1.redteamProviderManager.getProvider({
            provider: config?.provider || constants_1.REDTEAM_MODEL,
        });
        const testCases = await plugin.action({
            provider: redteamProvider,
            purpose,
            injectVar,
            n: 1, // Generate only one test case
            delayMs: 0,
            config: {
                // Random number to avoid caching
                __random: Math.random(),
                ...pluginConfig,
            },
        });
        if (testCases.length === 0) {
            res.status(500).json({ error: 'Failed to generate test case' });
            return;
        }
        const testCase = testCases[0];
        const generatedPrompt = testCase.vars?.[injectVar] || 'Unable to extract test prompt';
        const context = `This test case targets the ${pluginId} plugin and was generated based on your application context. If the test case is not relevant to your application, you can modify the application definition to improve relevance.`;
        res.json({
            prompt: generatedPrompt,
            context,
            metadata: testCase.metadata,
        });
    }
    catch (error) {
        logger_1.default.error(`Error generating test case: ${error}`);
        res.status(500).json({
            error: 'Failed to generate test case',
            details: error instanceof Error ? error.message : String(error),
        });
    }
});
// Track the current running job
let currentJobId = null;
let currentAbortController = null;
exports.redteamRouter.post('/run', async (req, res) => {
    // If there's a current job running, abort it
    if (currentJobId) {
        if (currentAbortController) {
            currentAbortController.abort();
        }
        const existingJob = eval_1.evalJobs.get(currentJobId);
        if (existingJob) {
            existingJob.status = 'error';
            existingJob.logs.push('Job cancelled - new job started');
        }
    }
    const { config, force, verbose, delay, maxConcurrency } = req.body;
    const id = (0, uuid_1.v4)();
    currentJobId = id;
    currentAbortController = new AbortController();
    // Initialize job status with empty logs array
    eval_1.evalJobs.set(id, {
        evalId: null,
        status: 'in-progress',
        progress: 0,
        total: 0,
        result: null,
        logs: [],
    });
    // Set web UI mode
    cliState_1.default.webUI = true;
    // Validate and normalize maxConcurrency
    const normalizedMaxConcurrency = Math.max(1, Number(maxConcurrency || '1'));
    // Run redteam in background
    (0, shared_2.doRedteamRun)({
        liveRedteamConfig: config,
        force,
        verbose,
        delay: Number(delay || '0'),
        maxConcurrency: normalizedMaxConcurrency,
        logCallback: (message) => {
            if (currentJobId === id) {
                const job = eval_1.evalJobs.get(id);
                if (job) {
                    job.logs.push(message);
                }
            }
        },
        abortSignal: currentAbortController.signal,
    })
        .then(async (evalResult) => {
        const summary = evalResult ? await evalResult.toEvaluateSummary() : null;
        const job = eval_1.evalJobs.get(id);
        if (job && currentJobId === id) {
            job.status = 'complete';
            job.result = summary;
            job.evalId = evalResult?.id ?? null;
        }
        if (currentJobId === id) {
            cliState_1.default.webUI = false;
            currentJobId = null;
            currentAbortController = null;
        }
    })
        .catch((error) => {
        logger_1.default.error(`Error running red team: ${error}\n${error.stack || ''}`);
        const job = eval_1.evalJobs.get(id);
        if (job && currentJobId === id) {
            job.status = 'error';
            job.logs.push(`Error: ${error.message}`);
            if (error.stack) {
                job.logs.push(`Stack trace: ${error.stack}`);
            }
        }
        if (currentJobId === id) {
            cliState_1.default.webUI = false;
            currentJobId = null;
            currentAbortController = null;
        }
    });
    res.json({ id });
});
exports.redteamRouter.post('/cancel', async (_req, res) => {
    if (!currentJobId) {
        res.status(400).json({ error: 'No job currently running' });
        return;
    }
    const jobId = currentJobId;
    if (currentAbortController) {
        currentAbortController.abort();
    }
    const job = eval_1.evalJobs.get(jobId);
    if (job) {
        job.status = 'error';
        job.logs.push('Job cancelled by user');
    }
    // Clear state
    cliState_1.default.webUI = false;
    currentJobId = null;
    currentAbortController = null;
    // Wait a moment to ensure cleanup
    await new Promise((resolve) => setTimeout(resolve, 100));
    res.json({ message: 'Job cancelled' });
});
// NOTE: This comes last, so the other routes take precedence
exports.redteamRouter.post('/:task', async (req, res) => {
    const { task } = req.params;
    const cloudFunctionUrl = (0, remoteGeneration_1.getRemoteGenerationUrl)();
    logger_1.default.debug(`Received ${task} task request: ${JSON.stringify({
        method: req.method,
        url: req.url,
        body: req.body,
    })}`);
    try {
        logger_1.default.debug(`Sending request to cloud function: ${cloudFunctionUrl}`);
        const response = await (0, index_2.fetchWithProxy)(cloudFunctionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                task,
                ...req.body,
            }),
        });
        if (!response.ok) {
            logger_1.default.error(`Cloud function responded with status ${response.status}`);
            throw new Error(`Cloud function responded with status ${response.status}`);
        }
        const data = await response.json();
        logger_1.default.debug(`Received response from cloud function: ${JSON.stringify(data)}`);
        res.json(data);
    }
    catch (error) {
        logger_1.default.error(`Error in ${task} task: ${error}`);
        res.status(500).json({ error: `Failed to process ${task} task` });
    }
});
exports.redteamRouter.get('/status', async (_req, res) => {
    res.json({
        hasRunningJob: currentJobId !== null,
        jobId: currentJobId,
    });
});
//# sourceMappingURL=redteam.js.map