"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.simbaCommand = simbaCommand;
const chalk_1 = __importDefault(require("chalk"));
const zod_1 = require("zod");
const accounts_1 = require("../../globalConfig/accounts");
const cloud_1 = require("../../globalConfig/cloud");
const logger_1 = __importDefault(require("../../logger"));
const index_1 = require("../../util/index");
const load_1 = require("../../util/config/load");
const index_2 = require("../../util/fetch/index");
const SimbaCommandSchema = zod_1.z.object({
    config: zod_1.z.union([zod_1.z.string(), zod_1.z.array(zod_1.z.string())]).optional(),
    goal: zod_1.z.string(),
    purpose: zod_1.z.string().optional(),
    maxRounds: zod_1.z.number().optional(),
    maxVectors: zod_1.z.number().optional(),
    email: zod_1.z.string().email().optional(),
    additionalInstructions: zod_1.z.string().optional(),
    sessionId: zod_1.z.string().optional(),
    concurrency: zod_1.z.number().min(1).max(100).optional(),
});
const TargetInfoSchema = zod_1.z.object({
    purpose: zod_1.z.string().min(1),
    goal: zod_1.z.string().min(1),
    additionalAttackInstructions: zod_1.z.string().optional(),
});
const ConfigOptionsSchema = zod_1.z.object({
    maxConversationRounds: zod_1.z.number().min(1).default(10),
    maxAttackVectors: zod_1.z.number().min(1).default(5),
});
const StartRequestSchema = zod_1.z.object({
    config: ConfigOptionsSchema,
    targetInfo: TargetInfoSchema,
    email: zod_1.z.string().email(),
});
async function callSimbaApi(endpoint, data) {
    const host = cloud_1.cloudConfig.getApiHost() ?? cloud_1.API_HOST;
    const url = `${host}/api/v1/simba${endpoint}`;
    const response = await (0, index_2.fetchWithProxy)(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Simba API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    return response.json();
}
async function runSimbaSession(options, testSuite) {
    // Use the first provider from the config
    if (!testSuite.providers || testSuite.providers.length === 0) {
        throw new Error('No providers found in configuration. Please add at least one provider.');
    }
    const email = (await (0, accounts_1.getUserEmail)()) || options.email || 'demo@promptfoo.dev';
    const concurrency = options.concurrency || 1;
    logger_1.default.info(`Using provider from config`);
    const provider = testSuite.providers[0];
    logger_1.default.info(chalk_1.default.blue(`Concurrency: ${concurrency}`));
    let sessionId = options.sessionId || '';
    // If no session ID provided, start a new session
    if (!sessionId) {
        logger_1.default.info(chalk_1.default.cyan('Starting new Simba session...'));
        const startRequest = {
            targetInfo: {
                goal: options.goal,
                purpose: options.purpose || 'Red team testing',
                additionalAttackInstructions: options.additionalInstructions,
            },
            config: {
                maxConversationRounds: options.maxRounds || 20,
                maxAttackVectors: options.maxVectors || 5,
            },
            email,
        };
        try {
            const startResponse = await callSimbaApi('/start', startRequest);
            sessionId = startResponse.sessionId;
            logger_1.default.info(chalk_1.default.green(`Session started with ID: ${sessionId}`));
        }
        catch (error) {
            logger_1.default.error(`Failed to start session: ${error}`);
            throw error;
        }
    }
    // Main conversation loop
    let round = 0;
    let totalTokens = 0;
    let responses = {};
    const completedConversations = new Set();
    let multipleZeroRoundRequests = 0;
    while (true) {
        if (multipleZeroRoundRequests > 10) {
            logger_1.default.error("We are stuck in a loop and haven't received any operations in 10 rounds. Please check your configuration.");
            break;
        }
        round++;
        logger_1.default.info(chalk_1.default.cyan(`\n--- Round ${round} ---`));
        try {
            // Request next batch of operations
            const nextRequest = {
                requestedCount: concurrency,
                responses,
                email,
            };
            const batchResponse = await callSimbaApi(`/sessions/${sessionId}/next`, nextRequest);
            if (batchResponse.completed) {
                logger_1.default.info(chalk_1.default.green('\nWe are DONE!'));
                break;
            }
            if (batchResponse.operations.length === 0) {
                multipleZeroRoundRequests++;
            }
            logger_1.default.info(`Received ${batchResponse.operations.length} operations`);
            responses = {};
            // Process all operations in parallel
            const providerCalls = batchResponse.operations.map(async (op) => {
                logger_1.default.info(chalk_1.default.yellow(`[${op.conversationId}] Simba: `) + op.nextQuestion);
                logger_1.default.info(chalk_1.default.gray(`[${op.conversationId}] ${op.logMessage}`));
                const context = {
                    prompt: { raw: op.nextQuestion, label: 'simba' },
                    vars: { sessionId: op.conversationId },
                };
                const providerOptions = {
                    includeLogProbs: false,
                };
                try {
                    const providerResponse = await provider.callApi(op.nextQuestion, context, providerOptions);
                    if (providerResponse.error) {
                        logger_1.default.error(`[${op.conversationId}] Provider error: ${providerResponse.error}`);
                        return null;
                    }
                    const responseContent = providerResponse.output || 'No response';
                    logger_1.default.info(chalk_1.default.blue(`[${op.conversationId}] Target: `) + responseContent);
                    // Store response for next round
                    responses[op.conversationId] = responseContent;
                    // Track token usage
                    if (providerResponse.tokenUsage) {
                        totalTokens += providerResponse.tokenUsage.total || 0;
                    }
                    return { conversationId: op.conversationId, response: responseContent };
                }
                catch (error) {
                    logger_1.default.error(`[${op.conversationId}] Error calling provider: ${error}`);
                    return null;
                }
            });
            await Promise.all(providerCalls);
        }
        catch (error) {
            logger_1.default.error(`Error in conversation round: ${error}`);
            logger_1.default.error(`You can try again and continue the session with the same session ID ${sessionId} using the -s flag.`);
            break;
        }
    }
    // Summary
    logger_1.default.info(chalk_1.default.bold('\n=== Session Summary ==='));
    logger_1.default.info(`Session ID: ${sessionId}`);
    logger_1.default.info(`Total rounds: ${round}`);
    logger_1.default.info(`Total tokens used: ${totalTokens.toLocaleString()}`);
    logger_1.default.info(`Concurrency: ${concurrency}`);
    logger_1.default.info(`Conversations completed: ${completedConversations.size}`);
}
function simbaCommand(program, defaultConfig) {
    program
        .command('simba', { hidden: true })
        .description('This feature is under development and not ready for use.')
        .option('-c, --config <paths...>', 'Path to configuration file (defaults to promptfooconfig.yaml)')
        .requiredOption('-g, --goal <goal>', 'The goal/objective for the red team test')
        .option('-e, --email <email>', 'Email address for analytics')
        .option('--purpose <purpose>', 'Purpose of the target system', 'Red team testing')
        .option('--max-rounds <number>', 'Maximum conversation rounds', '20')
        .option('--max-vectors <number>', 'Maximum attack vectors to try', '5')
        .option('--additional-instructions <text>', 'Additional attack instructions')
        .option('-s, --session-id <id>', 'Session ID to continue')
        .option('-j, --concurrency <number>', 'Number of concurrent conversations (1-100)', '1')
        .action(async (opts) => {
        (0, index_1.setupEnv)(opts.envPath);
        try {
            // Validate options
            const validatedOpts = SimbaCommandSchema.parse({
                ...opts,
                maxRounds: opts.maxRounds ? parseInt(String(opts.maxRounds)) : undefined,
                maxVectors: opts.maxVectors ? parseInt(String(opts.maxVectors)) : undefined,
                concurrency: opts.concurrency ? parseInt(String(opts.concurrency)) : undefined,
            });
            // Load config like eval command does
            const { testSuite } = await (0, load_1.resolveConfigs)(opts, defaultConfig);
            // Run the Simba session
            await runSimbaSession(validatedOpts, testSuite);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                logger_1.default.error('Invalid options:');
                error.errors.forEach((err) => {
                    logger_1.default.error(`  ${err.path.join('.')}: ${err.message}`);
                });
                process.exit(1);
            }
            logger_1.default.error(`Simba command failed: ${error}`);
            process.exit(1);
        }
    });
}
//# sourceMappingURL=simba.js.map