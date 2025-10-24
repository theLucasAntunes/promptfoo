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
exports.resolvePluginConfig = resolvePluginConfig;
exports.getMultilingualRequestedCount = getMultilingualRequestedCount;
exports.getTestCount = getTestCount;
exports.calculateTotalTests = calculateTotalTests;
exports.synthesize = synthesize;
const async_1 = __importDefault(require("async"));
const chalk_1 = __importDefault(require("chalk"));
const cli_progress_1 = __importDefault(require("cli-progress"));
const cli_table3_1 = __importDefault(require("cli-table3"));
const fs = __importStar(require("fs"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const cliState_1 = __importDefault(require("../cliState"));
const envars_1 = require("../envars");
const logger_1 = __importStar(require("../logger"));
const apiHealth_1 = require("../util/apiHealth");
const invariant_1 = __importDefault(require("../util/invariant"));
const templates_1 = require("../util/templates");
const constants_1 = require("./constants");
const entities_1 = require("./extraction/entities");
const purpose_1 = require("./extraction/purpose");
const custom_1 = require("./plugins/custom");
const index_1 = require("./plugins/index");
const shared_1 = require("./providers/shared");
const remoteGeneration_1 = require("./remoteGeneration");
const index_2 = require("./strategies/index");
const multilingual_1 = require("./strategies/multilingual");
const util_1 = require("./strategies/util");
const util_2 = require("./util");
const MAX_MAX_CONCURRENCY = 20;
/**
 * Gets the severity level for a plugin based on its ID and configuration.
 * @param pluginId - The ID of the plugin.
 * @param pluginConfig - Optional configuration for the plugin.
 * @returns The severity level.
 */
function getPluginSeverity(pluginId, pluginConfig) {
    if (pluginConfig?.severity) {
        return pluginConfig.severity;
    }
    const shortId = (0, util_2.getShortPluginId)(pluginId);
    return shortId in constants_1.riskCategorySeverityMap
        ? constants_1.riskCategorySeverityMap[shortId]
        : constants_1.Severity.Low;
}
/**
 * Determines the status of test generation based on requested and generated counts.
 * @param requested - The number of requested tests.
 * @param generated - The number of generated tests.
 * @returns A colored string indicating the status.
 */
function getStatus(requested, generated) {
    if (requested === 0 && generated === 0) {
        return chalk_1.default.gray('Skipped');
    }
    if (generated === 0) {
        return chalk_1.default.red('Failed');
    }
    if (generated < requested) {
        return chalk_1.default.yellow('Partial');
    }
    return chalk_1.default.green('Success');
}
/**
 * Generates a report of plugin and strategy results.
 * @param pluginResults - Results from plugin executions.
 * @param strategyResults - Results from strategy executions.
 * @returns A formatted string containing the report.
 */
function generateReport(pluginResults, strategyResults) {
    const table = new cli_table3_1.default({
        head: ['#', 'Type', 'ID', 'Requested', 'Generated', 'Status'].map((h) => chalk_1.default.dim(chalk_1.default.white(h))),
        colWidths: [5, 10, 40, 12, 12, 14],
    });
    let rowIndex = 1;
    Object.entries(pluginResults)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([id, { requested, generated }]) => {
        table.push([rowIndex++, 'Plugin', id, requested, generated, getStatus(requested, generated)]);
    });
    Object.entries(strategyResults)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([id, { requested, generated }]) => {
        table.push([
            rowIndex++,
            'Strategy',
            id,
            requested,
            generated,
            getStatus(requested, generated),
        ]);
    });
    return `\nTest Generation Report:\n${table.toString()}`;
}
/**
 * Resolves top-level file paths in the plugin configuration.
 * @param config - The plugin configuration to resolve.
 * @returns The resolved plugin configuration.
 */
function resolvePluginConfig(config) {
    if (!config) {
        return {};
    }
    for (const key in config) {
        const value = config[key];
        if (typeof value === 'string' && value.startsWith('file://')) {
            const filePath = value.slice('file://'.length);
            if (!fs.existsSync(filePath)) {
                throw new Error(`File not found: ${filePath}`);
            }
            if (filePath.endsWith('.yaml')) {
                config[key] = js_yaml_1.default.load(fs.readFileSync(filePath, 'utf8'));
            }
            else if (filePath.endsWith('.json')) {
                config[key] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            }
            else {
                config[key] = fs.readFileSync(filePath, 'utf8');
            }
        }
    }
    return config;
}
const categories = {
    foundation: constants_1.FOUNDATION_PLUGINS,
    harmful: Object.keys(constants_1.HARM_PLUGINS),
    bias: constants_1.BIAS_PLUGINS,
    pii: constants_1.PII_PLUGINS,
};
/**
 * Formats the test count for display.
 * @param numTests - The number of tests.
 * @param strategy - Whether the test count is for a strategy.
 * @returns A formatted string representing the test count.
 */
const formatTestCount = (numTests, strategy) => numTests === 1
    ? `1 ${strategy ? 'additional ' : ''}test`
    : `${numTests} ${strategy ? 'additional ' : ''}tests`;
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
function getMultilingualRequestedCount(testCases, strategy) {
    // If languages is an empty array, return 0
    if (Array.isArray(strategy.config?.languages) && strategy.config.languages.length === 0) {
        return 0;
    }
    const numLanguages = Array.isArray(strategy.config?.languages)
        ? strategy.config.languages.length
        : multilingual_1.DEFAULT_LANGUAGES.length;
    return testCases.length * numLanguages;
}
/**
 * Applies strategies to the test cases.
 * @param testCases - The initial test cases generated by plugins.
 * @param strategies - The strategies to apply.
 * @param injectVar - The variable to inject.
 * @returns An array of new test cases generated by strategies.
 */
async function applyStrategies(testCases, strategies, injectVar, excludeTargetOutputFromAgenticAttackGeneration) {
    const newTestCases = [];
    const strategyResults = {};
    for (const strategy of strategies) {
        logger_1.default.debug(`Generating ${strategy.id} tests`);
        let strategyAction;
        if (strategy.id.startsWith('file://')) {
            const loadedStrategy = await (0, index_2.loadStrategy)(strategy.id);
            strategyAction = loadedStrategy.action;
        }
        else {
            // First try to find the exact strategy ID (e.g., jailbreak:composite)
            let builtinStrategy = index_2.Strategies.find((s) => s.id === strategy.id);
            // If not found, handle custom strategy variants (e.g., custom:aggressive)
            if (!builtinStrategy && strategy.id.includes(':')) {
                const baseStrategyId = strategy.id.split(':')[0];
                builtinStrategy = index_2.Strategies.find((s) => s.id === baseStrategyId);
            }
            if (!builtinStrategy) {
                logger_1.default.warn(`Strategy ${strategy.id} not registered, skipping`);
                continue;
            }
            strategyAction = builtinStrategy.action;
        }
        const targetPlugins = strategy.config?.plugins;
        const applicableTestCases = testCases.filter((t) => (0, util_1.pluginMatchesStrategyTargets)(t, strategy.id, targetPlugins));
        const strategyTestCases = await strategyAction(applicableTestCases, injectVar, {
            ...(strategy.config || {}),
            excludeTargetOutputFromAgenticAttackGeneration,
        }, strategy.id);
        newTestCases.push(...strategyTestCases
            .filter((t) => t !== null && t !== undefined)
            .map((t) => ({
            ...t,
            metadata: {
                ...(t?.metadata || {}),
                strategyId: t?.metadata?.strategyId || strategy.id,
                ...(t?.metadata?.pluginId && { pluginId: t.metadata.pluginId }),
                ...(t?.metadata?.pluginConfig && {
                    pluginConfig: t.metadata.pluginConfig,
                }),
                ...(strategy.config && {
                    strategyConfig: {
                        ...strategy.config,
                        ...(t?.metadata?.strategyConfig || {}),
                    },
                }),
            },
        })));
        // Compute a display id for reporting (helpful for layered strategies)
        const displayId = strategy.id === 'layer' && Array.isArray(strategy.config?.steps)
            ? `layer(${strategy.config.steps
                .map((st) => (typeof st === 'string' ? st : st.id))
                .join('→')})`
            : strategy.id;
        // Special case for multilingual strategy to account for languages multiplier
        if (strategy.id === 'multilingual') {
            const requestedCount = getMultilingualRequestedCount(applicableTestCases, strategy);
            strategyResults[displayId] = {
                requested: requestedCount,
                generated: strategyTestCases.length,
            };
        }
        else if (strategy.id === 'layer') {
            // Estimate requested count for layer: multiply by language factors of any multilingual steps
            let multiplier = 1;
            const steps = Array.isArray(strategy.config?.steps)
                ? strategy.config.steps
                : [];
            for (const st of steps) {
                const stepId = typeof st === 'string' ? st : st.id;
                if (stepId === 'multilingual') {
                    const stepCfg = (typeof st === 'string' ? {} : st.config) || {};
                    const numLangs = Array.isArray(stepCfg.languages) && stepCfg.languages.length > 0
                        ? stepCfg.languages.length
                        : multilingual_1.DEFAULT_LANGUAGES.length;
                    multiplier *= numLangs;
                }
            }
            const requestedCount = applicableTestCases.length * multiplier;
            strategyResults[displayId] = {
                requested: requestedCount,
                generated: strategyTestCases.length,
            };
        }
        else {
            // get an accurate 'Requested' count for strategies that add additional tests during generation
            let n = 1;
            if (typeof strategy.config?.n === 'number') {
                n = strategy.config.n;
            }
            else if ((0, constants_1.isFanoutStrategy)(strategy.id)) {
                n = (0, constants_1.getDefaultNFanout)(strategy.id);
            }
            strategyResults[displayId] = {
                requested: applicableTestCases.length * n,
                generated: strategyTestCases.length,
            };
        }
    }
    return { testCases: newTestCases, strategyResults };
}
/**
 * Helper function to get the test count based on strategy configuration.
 * @param strategy - The strategy object to evaluate.
 * @param totalPluginTests - The total number of plugin tests.
 * @param strategies - The array of strategies.
 * @returns The calculated test count.
 */
function getTestCount(strategy, totalPluginTests, _strategies) {
    // Basic strategy either keeps original count or removes all tests
    if (strategy.id === 'basic') {
        return strategy.config?.enabled === false ? 0 : totalPluginTests;
    }
    // Multilingual strategy doubles the total count
    if (strategy.id === 'multilingual') {
        // If languages is an empty array, return 0
        if (Array.isArray(strategy.config?.languages) && strategy.config.languages.length === 0) {
            return 0;
        }
        const numLanguages = Object.keys(strategy.config?.languages ?? {}).length || multilingual_1.DEFAULT_LANGUAGES.length;
        return totalPluginTests * numLanguages;
    }
    // Sequence strategy: approximate by multiplying plugin tests by language multipliers of any multilingual steps
    if (strategy.id === 'layer') {
        const steps = Array.isArray(strategy.config?.steps)
            ? strategy.config.steps
            : [];
        let multiplier = 1;
        for (const st of steps) {
            const stepId = typeof st === 'string' ? st : st.id;
            if (stepId === 'multilingual') {
                const stepCfg = (typeof st === 'string' ? {} : st.config) || {};
                if (Array.isArray(stepCfg.languages) && stepCfg.languages.length === 0) {
                    continue; // no additional tests
                }
                const numLangs = Array.isArray(stepCfg.languages) && stepCfg.languages.length > 0
                    ? stepCfg.languages.length
                    : multilingual_1.DEFAULT_LANGUAGES.length;
                multiplier *= numLangs;
            }
        }
        return totalPluginTests * multiplier;
    }
    // Retry strategy doubles the plugin tests
    if (strategy.id === 'retry') {
        const configuredNumTests = strategy.config?.numTests;
        const additionalTests = configuredNumTests ?? totalPluginTests;
        return totalPluginTests + additionalTests;
    }
    // Apply fan-out multiplier if this is a fan-out strategy
    let n = 1;
    if (typeof strategy.config?.n === 'number') {
        n = strategy.config.n;
    }
    else if ((0, constants_1.isFanoutStrategy)(strategy.id)) {
        n = (0, constants_1.getDefaultNFanout)(strategy.id);
    }
    return totalPluginTests * n;
}
/**
 * Calculates the total number of tests to be generated based on plugins and strategies.
 * @param plugins - The array of plugins to generate tests for
 * @param strategies - The array of strategies to apply
 * @returns Object containing total tests and intermediate calculations
 */
function calculateTotalTests(plugins, strategies) {
    const multilingualStrategy = strategies.find((s) => s.id === 'multilingual');
    const retryStrategy = strategies.find((s) => s.id === 'retry');
    const basicStrategy = strategies.find((s) => s.id === 'basic');
    const basicStrategyExists = basicStrategy !== undefined;
    const includeBasicTests = basicStrategy?.config?.enabled ?? true;
    const effectiveStrategyCount = basicStrategyExists && !includeBasicTests ? strategies.length - 1 : strategies.length;
    const totalPluginTests = plugins.reduce((sum, p) => sum + (p.numTests || 0), 0);
    // When there are no strategies, or only a disabled basic strategy
    if (strategies.length === 0 ||
        (strategies.length === 1 && basicStrategyExists && !includeBasicTests)) {
        return {
            effectiveStrategyCount: 0,
            includeBasicTests: strategies.length === 0 ? true : includeBasicTests,
            multilingualStrategy: undefined,
            totalPluginTests,
            totalTests: includeBasicTests ? totalPluginTests : 0,
        };
    }
    // Start with base test count from basic strategy
    let totalTests = includeBasicTests ? totalPluginTests : 0;
    // Apply retry strategy first if present
    if (retryStrategy) {
        totalTests = getTestCount(retryStrategy, totalTests, strategies);
    }
    // Apply other non-basic, non-multilingual, non-retry strategies
    for (const strategy of strategies) {
        if (['basic', 'multilingual', 'retry'].includes(strategy.id)) {
            continue;
        }
        // Add the tests from this strategy to the total, not replace the total
        totalTests += getTestCount(strategy, totalPluginTests, strategies);
    }
    // Apply multilingual strategy last if present
    if (multilingualStrategy) {
        totalTests = getTestCount(multilingualStrategy, totalTests, strategies);
    }
    return {
        effectiveStrategyCount,
        includeBasicTests,
        multilingualStrategy,
        totalPluginTests,
        totalTests,
    };
}
/**
 * Type guard to check if a strategy ID is a strategy collection
 */
function isStrategyCollection(id) {
    return constants_1.STRATEGY_COLLECTIONS.includes(id);
}
/**
 * Synthesizes test cases based on provided options.
 * @param options - The options for test case synthesis.
 * @returns A promise that resolves to an object containing the purpose, entities, and test cases.
 */
async function synthesize({ abortSignal, delay, entities: entitiesOverride, injectVar, language, maxConcurrency = 1, plugins, prompts, provider, purpose: purposeOverride, strategies, targetLabels, showProgressBar: showProgressBarOverride, excludeTargetOutputFromAgenticAttackGeneration, testGenerationInstructions, }) {
    // Add abort check helper
    const checkAbort = () => {
        if (abortSignal?.aborted) {
            throw new Error('Operation cancelled');
        }
    };
    // Add abort checks at key points
    checkAbort();
    if (prompts.length === 0) {
        throw new Error('Prompts array cannot be empty');
    }
    if (delay && maxConcurrency > 1) {
        maxConcurrency = 1;
        logger_1.default.warn('Delay is enabled, setting max concurrency to 1.');
    }
    if (maxConcurrency > MAX_MAX_CONCURRENCY) {
        maxConcurrency = MAX_MAX_CONCURRENCY;
        logger_1.default.info(`Max concurrency for test generation is capped at ${MAX_MAX_CONCURRENCY}.`);
    }
    const expandedStrategies = [];
    strategies.forEach((strategy) => {
        if (isStrategyCollection(strategy.id)) {
            const aliasedStrategies = constants_1.STRATEGY_COLLECTION_MAPPINGS[strategy.id];
            if (aliasedStrategies) {
                aliasedStrategies.forEach((strategyId) => {
                    expandedStrategies.push({
                        ...strategy,
                        id: strategyId,
                    });
                });
            }
            else {
                logger_1.default.warn(`Strategy collection ${strategy.id} has no mappings, skipping`);
            }
        }
        else {
            expandedStrategies.push(strategy);
        }
    });
    // Deduplicate strategies by a key. For most strategies, the key is the id.
    // For 'layer', include the ordered step ids in the key so different layers are preserved.
    const seen = new Set();
    const keyForStrategy = (s) => {
        if (s.id === 'layer' && s.config && Array.isArray(s.config.steps)) {
            const steps = s.config.steps.map((st) => typeof st === 'string' ? st : st?.id);
            return `layer:${steps.join('->')}`;
        }
        return s.id;
    };
    strategies = expandedStrategies.filter((strategy) => {
        const key = keyForStrategy(strategy);
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
    (0, index_2.validateStrategies)(strategies);
    const redteamProvider = await shared_1.redteamProviderManager.getProvider({
        provider,
    });
    const { effectiveStrategyCount, includeBasicTests, multilingualStrategy, totalPluginTests, totalTests, } = calculateTotalTests(plugins, strategies);
    logger_1.default.info(`Synthesizing test cases for ${prompts.length} ${prompts.length === 1 ? 'prompt' : 'prompts'}...\nUsing plugins:\n\n${chalk_1.default.yellow(plugins
        .map((p) => `${p.id} (${formatTestCount(p.numTests, false)})${p.config ? ` (${JSON.stringify(p.config)})` : ''}`)
        .sort()
        .join('\n'))}\n`);
    if (strategies.length > 0) {
        logger_1.default.info(`Using strategies:\n\n${chalk_1.default.yellow(strategies
            .filter((s) => !['basic', 'retry'].includes(s.id))
            .map((s) => {
            // For non-basic, non-multilingual strategies, we want to show the additional tests they generate
            let testCount = totalPluginTests;
            if (s.id === 'multilingual') {
                testCount = getTestCount(s, totalPluginTests, strategies);
            }
            else {
                // Apply fan-out multiplier if this is a fan-out strategy
                let n = 1;
                if (typeof s.config?.n === 'number') {
                    n = s.config.n;
                }
                else if ((0, constants_1.isFanoutStrategy)(s.id)) {
                    n = (0, constants_1.getDefaultNFanout)(s.id);
                }
                testCount = totalPluginTests * n;
            }
            return `${s.id} (${formatTestCount(testCount, true)})`;
        })
            .sort()
            .join('\n'))}\n`);
    }
    logger_1.default.info(chalk_1.default.bold(`Test Generation Summary:`) +
        `\n• Total tests: ${chalk_1.default.cyan(totalTests)}` +
        `\n• Plugin tests: ${chalk_1.default.cyan(totalPluginTests)}` +
        `\n• Plugins: ${chalk_1.default.cyan(plugins.length)}` +
        `\n• Strategies: ${chalk_1.default.cyan(effectiveStrategyCount)}` +
        `\n• Max concurrency: ${chalk_1.default.cyan(maxConcurrency)}\n` +
        (delay ? `• Delay: ${chalk_1.default.cyan(delay)}\n` : ''));
    if (typeof injectVar !== 'string') {
        const parsedVars = (0, templates_1.extractVariablesFromTemplates)(prompts);
        if (parsedVars.length > 1) {
            logger_1.default.warn(`\nMultiple variables found in prompts: ${parsedVars.join(', ')}. Using the last one "${parsedVars[parsedVars.length - 1]}". Override this selection with --injectVar`);
        }
        else if (parsedVars.length === 0) {
            logger_1.default.warn('No variables found in prompts. Using "query" as the inject variable.');
        }
        // Odds are that the last variable is the user input since the user input usually goes at the end of the prompt
        injectVar = parsedVars[parsedVars.length - 1] || 'query';
        (0, invariant_1.default)(typeof injectVar === 'string', `Inject var must be a string, got ${injectVar}`);
    }
    // Expand plugins first
    for (const [category, categoryPlugins] of Object.entries(categories)) {
        const plugin = plugins.find((p) => p.id === category);
        if (plugin) {
            plugins.push(...categoryPlugins.map((p) => ({ id: p, numTests: plugin.numTests })));
        }
    }
    const expandedPlugins = [];
    const expandPlugin = (plugin, mapping) => {
        mapping.plugins.forEach((p) => expandedPlugins.push({ id: p, numTests: plugin.numTests }));
        strategies.push(...mapping.strategies.map((s) => ({ id: s })));
    };
    plugins.forEach((plugin) => {
        // First check if this is a direct plugin that should not be expanded
        // This is for plugins like bias:gender that have a prefix matching an alias
        const isDirectPlugin = index_1.Plugins.some((p) => p.key === plugin.id);
        if (isDirectPlugin) {
            expandedPlugins.push(plugin);
            return;
        }
        const mappingKey = Object.keys(constants_1.ALIASED_PLUGIN_MAPPINGS).find((key) => plugin.id === key || plugin.id.startsWith(`${key}:`));
        if (mappingKey) {
            const mapping = constants_1.ALIASED_PLUGIN_MAPPINGS[mappingKey][plugin.id] ||
                Object.values(constants_1.ALIASED_PLUGIN_MAPPINGS[mappingKey]).find((_m) => plugin.id.startsWith(`${mappingKey}:`));
            if (mapping) {
                expandPlugin(plugin, mapping);
            }
        }
        else {
            expandedPlugins.push(plugin);
        }
    });
    const validatePlugin = (plugin) => {
        if (Object.keys(categories).includes(plugin.id)) {
            return false;
        }
        const registeredPlugin = index_1.Plugins.find((p) => p.key === plugin.id);
        if (!registeredPlugin) {
            if (!plugin.id.startsWith('file://')) {
                logger_1.default.debug(`Plugin ${plugin.id} not registered, skipping validation`);
            }
        }
        else if (registeredPlugin.validate) {
            try {
                registeredPlugin.validate({
                    language,
                    modifiers: {
                        ...(testGenerationInstructions ? { testGenerationInstructions } : {}),
                        ...(plugin.config?.modifiers || {}),
                    },
                    ...resolvePluginConfig(plugin.config),
                });
            }
            catch (error) {
                logger_1.default.warn(`Validation failed for plugin ${plugin.id}: ${error}, skipping plugin.`);
                return false;
            }
        }
        return true;
    };
    // Validate all plugins upfront
    logger_1.default.debug('Validating plugins...');
    plugins = [...new Set(expandedPlugins)].filter(validatePlugin).sort();
    // Check API health before proceeding
    if ((0, remoteGeneration_1.shouldGenerateRemote)()) {
        const healthUrl = (0, remoteGeneration_1.getRemoteHealthUrl)();
        if (healthUrl) {
            logger_1.default.debug(`Checking Promptfoo API health at ${healthUrl}...`);
            const healthResult = await (0, apiHealth_1.checkRemoteHealth)(healthUrl);
            if (healthResult.status !== 'OK') {
                throw new Error(`Unable to proceed with test generation: ${healthResult.message}\n` +
                    'Please check your API configuration or try again later.');
            }
            logger_1.default.debug('API health check passed');
        }
    }
    // Start the progress bar
    let progressBar = null;
    const isWebUI = Boolean(cliState_1.default.webUI);
    const showProgressBar = !isWebUI &&
        (0, envars_1.getEnvString)('LOG_LEVEL') !== 'debug' &&
        (0, logger_1.getLogLevel)() !== 'debug' &&
        showProgressBarOverride !== false;
    if (showProgressBar) {
        progressBar = new cli_progress_1.default.SingleBar({
            format: 'Generating | {bar} | {percentage}% | {value}/{total} | {task}',
            gracefulExit: true,
        }, cli_progress_1.default.Presets.shades_classic);
        progressBar.start(totalPluginTests + 2, 0, { task: 'Initializing' });
    }
    // Replace progress bar updates with logger calls when in web UI
    if (showProgressBar) {
        progressBar?.increment(1, { task: 'Extracting system purpose' });
    }
    else {
        logger_1.default.info('Extracting system purpose...');
    }
    const purpose = purposeOverride || (await (0, purpose_1.extractSystemPurpose)(redteamProvider, prompts));
    if (showProgressBar) {
        progressBar?.increment(1, { task: 'Extracting entities' });
    }
    else {
        logger_1.default.info('Extracting entities...');
    }
    const entities = Array.isArray(entitiesOverride)
        ? entitiesOverride
        : await (0, entities_1.extractEntities)(redteamProvider, prompts);
    logger_1.default.debug(`System purpose: ${purpose}`);
    const pluginResults = {};
    const testCases = [];
    await async_1.default.forEachLimit(plugins, maxConcurrency, async (plugin) => {
        // Check for abort signal before generating tests
        checkAbort();
        if (showProgressBar) {
            progressBar?.update({ task: plugin.id });
        }
        else {
            logger_1.default.info(`Generating tests for ${plugin.id}...`);
        }
        const { action } = index_1.Plugins.find((p) => p.key === plugin.id) || {};
        if (action) {
            logger_1.default.debug(`Generating tests for ${plugin.id}...`);
            let pluginTests = await action({
                provider: redteamProvider,
                purpose,
                injectVar,
                n: plugin.numTests,
                delayMs: delay || 0,
                config: {
                    language,
                    modifiers: {
                        ...(testGenerationInstructions ? { testGenerationInstructions } : {}),
                        ...(plugin.config?.modifiers || {}),
                    },
                    ...resolvePluginConfig(plugin.config),
                },
            });
            if (!Array.isArray(pluginTests) || pluginTests.length === 0) {
                logger_1.default.warn(`Failed to generate tests for ${plugin.id}`);
                pluginTests = [];
            }
            else {
                // Add metadata to each test case
                const testCasesWithMetadata = pluginTests.map((t) => ({
                    ...t,
                    metadata: {
                        pluginId: plugin.id,
                        pluginConfig: resolvePluginConfig(plugin.config),
                        severity: plugin.severity ?? getPluginSeverity(plugin.id, resolvePluginConfig(plugin.config)),
                        modifiers: {
                            ...(testGenerationInstructions ? { testGenerationInstructions } : {}),
                            ...(plugin.config?.modifiers || {}),
                        },
                        ...(t?.metadata || {}),
                    },
                }));
                // Extract goal for this plugin's tests
                logger_1.default.debug(`Extracting goal for ${testCasesWithMetadata.length} tests from ${plugin.id}...`);
                for (const testCase of testCasesWithMetadata) {
                    // Get the prompt from the specific inject variable
                    const promptVar = testCase.vars?.[injectVar];
                    const prompt = Array.isArray(promptVar) ? promptVar[0] : String(promptVar);
                    const extractedGoal = await (0, util_2.extractGoalFromPrompt)(prompt, purpose, plugin.id);
                    testCase.metadata.goal = extractedGoal;
                }
                // Add the results to main test cases array
                testCases.push(...testCasesWithMetadata);
            }
            pluginTests = Array.isArray(pluginTests) ? pluginTests : [];
            if (showProgressBar) {
                progressBar?.increment(plugin.numTests);
            }
            else {
                logger_1.default.info(`Generated ${pluginTests.length} tests for ${plugin.id}`);
            }
            logger_1.default.debug(`Added ${pluginTests.length} ${plugin.id} test cases`);
            pluginResults[plugin.id] = {
                requested: plugin.id === 'intent' ? pluginTests.length : plugin.numTests,
                generated: pluginTests.length,
            };
        }
        else if (plugin.id.startsWith('file://')) {
            try {
                const customPlugin = new custom_1.CustomPlugin(redteamProvider, purpose, injectVar, plugin.id);
                const customTests = await customPlugin.generateTests(plugin.numTests, delay);
                // Add metadata to each test case
                const testCasesWithMetadata = customTests.map((t) => ({
                    ...t,
                    metadata: {
                        pluginId: plugin.id,
                        pluginConfig: resolvePluginConfig(plugin.config),
                        severity: plugin.severity || getPluginSeverity(plugin.id, resolvePluginConfig(plugin.config)),
                        modifiers: {
                            ...(testGenerationInstructions ? { testGenerationInstructions } : {}),
                            ...(plugin.config?.modifiers || {}),
                        },
                        ...(t.metadata || {}),
                    },
                }));
                // Extract goal for this plugin's tests
                logger_1.default.debug(`Extracting goal for ${testCasesWithMetadata.length} custom tests from ${plugin.id}...`);
                for (const testCase of testCasesWithMetadata) {
                    // Get the prompt from the specific inject variable
                    const promptVar = testCase.vars?.[injectVar];
                    const prompt = Array.isArray(promptVar) ? promptVar[0] : String(promptVar);
                    const extractedGoal = await (0, util_2.extractGoalFromPrompt)(prompt, purpose, plugin.id);
                    testCase.metadata.goal = extractedGoal;
                }
                // Add the results to main test cases array
                testCases.push(...testCasesWithMetadata);
                logger_1.default.debug(`Added ${customTests.length} custom test cases from ${plugin.id}`);
                pluginResults[plugin.id] = {
                    requested: plugin.numTests,
                    generated: customTests.length,
                };
            }
            catch (e) {
                logger_1.default.error(`Error generating tests for custom plugin ${plugin.id}: ${e}`);
                pluginResults[plugin.id] = { requested: plugin.numTests, generated: 0 };
            }
        }
        else {
            logger_1.default.warn(`Plugin ${plugin.id} not registered, skipping`);
            pluginResults[plugin.id] = { requested: plugin.numTests, generated: 0 };
            progressBar?.increment(plugin.numTests);
        }
    });
    // After generating plugin test cases but before applying strategies:
    const pluginTestCases = testCases;
    // Initialize strategy results
    const strategyResults = {};
    // Apply retry strategy first if it exists
    const retryStrategy = strategies.find((s) => s.id === 'retry');
    if (retryStrategy) {
        logger_1.default.debug('Applying retry strategy first');
        retryStrategy.config = {
            targetLabels,
            ...retryStrategy.config,
        };
        const { testCases: retryTestCases, strategyResults: retryResults } = await applyStrategies(pluginTestCases, [retryStrategy], injectVar);
        pluginTestCases.push(...retryTestCases);
        Object.assign(strategyResults, retryResults);
    }
    // Check for abort signal or apply non-basic, non-multilingual strategies
    checkAbort();
    const { testCases: strategyTestCases, strategyResults: otherStrategyResults } = await applyStrategies(pluginTestCases, strategies.filter((s) => !['basic', 'multilingual', 'retry'].includes(s.id)), injectVar, excludeTargetOutputFromAgenticAttackGeneration);
    Object.assign(strategyResults, otherStrategyResults);
    // Combine test cases based on basic strategy setting
    const finalTestCases = [...(includeBasicTests ? pluginTestCases : []), ...strategyTestCases];
    // Check for abort signal or apply multilingual strategy to all test cases
    checkAbort();
    if (multilingualStrategy) {
        const { testCases: multiLingualTestCases, strategyResults: multiLingualResults } = await applyStrategies(finalTestCases, [multilingualStrategy], injectVar);
        finalTestCases.push(...multiLingualTestCases);
        Object.assign(strategyResults, multiLingualResults);
    }
    progressBar?.update({ task: 'Done.' });
    progressBar?.stop();
    if (progressBar) {
        // Newline after progress bar to avoid overlap
        logger_1.default.info('');
    }
    logger_1.default.info(generateReport(pluginResults, strategyResults));
    return { purpose, entities, testCases: finalTestCases, injectVar };
}
//# sourceMappingURL=index.js.map