"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedteamConfigSchema = exports.RedteamGenerateOptionsSchema = exports.RedteamStrategySchema = exports.strategyIdSchema = exports.RedteamPluginSchema = exports.RedteamPluginObjectSchema = exports.pluginOptions = void 0;
const dedent_1 = __importDefault(require("dedent"));
const zod_1 = require("zod");
const constants_1 = require("../redteam/constants");
const strategies_1 = require("../redteam/constants/strategies");
const fileExtensions_1 = require("../util/fileExtensions");
const providers_1 = require("../validators/providers");
exports.pluginOptions = [
    ...new Set([...constants_1.COLLECTIONS, ...constants_1.ALL_PLUGINS, ...constants_1.ALIASED_PLUGINS]),
].sort();
/**
 * Schema for individual redteam plugins
 */
exports.RedteamPluginObjectSchema = zod_1.z.object({
    id: zod_1.z
        .union([
        zod_1.z.enum(exports.pluginOptions).superRefine((val, ctx) => {
            if (!exports.pluginOptions.includes(val)) {
                ctx.addIssue({
                    code: zod_1.z.ZodIssueCode.invalid_enum_value,
                    options: exports.pluginOptions,
                    received: val,
                    message: `Invalid plugin name. Must be one of: ${exports.pluginOptions.join(', ')} (or a path starting with file://)`,
                });
            }
        }),
        zod_1.z.string().superRefine((val, ctx) => {
            if (!val.startsWith('file://')) {
                ctx.addIssue({
                    code: zod_1.z.ZodIssueCode.custom,
                    message: `Invalid plugin id "${val}". Custom plugins must start with file:// or use a built-in plugin. See https://www.promptfoo.dev/docs/red-team/plugins for available plugins.`,
                });
            }
        }),
    ])
        .describe('Name of the plugin'),
    numTests: zod_1.z
        .number()
        .int()
        .positive()
        .default(constants_1.DEFAULT_NUM_TESTS_PER_PLUGIN)
        .describe('Number of tests to generate for this plugin'),
    config: zod_1.z.record(zod_1.z.unknown()).optional().describe('Plugin-specific configuration'),
    severity: zod_1.z.nativeEnum(constants_1.Severity).optional().describe('Severity level for this plugin'),
});
/**
 * Schema for individual redteam plugins or their shorthand.
 */
exports.RedteamPluginSchema = zod_1.z.union([
    zod_1.z
        .union([
        zod_1.z.enum(exports.pluginOptions).superRefine((val, ctx) => {
            if (!exports.pluginOptions.includes(val)) {
                ctx.addIssue({
                    code: zod_1.z.ZodIssueCode.invalid_enum_value,
                    options: exports.pluginOptions,
                    received: val,
                    message: `Invalid plugin name. Must be one of: ${exports.pluginOptions.join(', ')} (or a path starting with file://)`,
                });
            }
        }),
        zod_1.z.string().superRefine((val, ctx) => {
            if (!val.startsWith('file://')) {
                ctx.addIssue({
                    code: zod_1.z.ZodIssueCode.custom,
                    message: `Invalid plugin id "${val}". Custom plugins must start with file:// or use a built-in plugin. See https://www.promptfoo.dev/docs/red-team/plugins for available plugins.`,
                });
            }
        }),
    ])
        .describe('Name of the plugin or path to custom plugin'),
    exports.RedteamPluginObjectSchema,
]);
exports.strategyIdSchema = zod_1.z.union([
    zod_1.z.enum(constants_1.ALL_STRATEGIES).superRefine((val, ctx) => {
        if (!constants_1.ALL_STRATEGIES.includes(val)) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.invalid_enum_value,
                options: [...constants_1.ALL_STRATEGIES],
                received: val,
                message: `Invalid strategy name. Must be one of: ${[...constants_1.ALL_STRATEGIES].join(', ')} (or a path starting with file://)`,
            });
        }
    }),
    zod_1.z.string().refine((value) => {
        return value.startsWith('file://') && (0, fileExtensions_1.isJavascriptFile)(value);
    }, {
        message: `Custom strategies must start with file:// and end with .js or .ts, or use one of the built-in strategies: ${[...constants_1.ALL_STRATEGIES].join(', ')}`,
    }),
    zod_1.z.string().refine((value) => {
        return (0, strategies_1.isCustomStrategy)(value);
    }, {
        message: `Strategy must be one of the built-in strategies: ${[...constants_1.ALL_STRATEGIES].join(', ')} (or a path starting with file://)`,
    }),
]);
/**
 * Schema for individual redteam strategies
 */
exports.RedteamStrategySchema = zod_1.z.union([
    exports.strategyIdSchema,
    zod_1.z.object({
        id: exports.strategyIdSchema,
        config: zod_1.z.record(zod_1.z.unknown()).optional().describe('Strategy-specific configuration'),
    }),
]);
/**
 * Schema for `promptfoo redteam generate` command options
 */
// NOTE: Remember to edit types/redteam.ts:RedteamCliGenerateOptions if you edit this schema
exports.RedteamGenerateOptionsSchema = zod_1.z.object({
    addPlugins: zod_1.z
        .array(zod_1.z.enum(constants_1.ADDITIONAL_PLUGINS))
        .optional()
        .describe('Additional plugins to include'),
    addStrategies: zod_1.z
        .array(zod_1.z.enum(constants_1.ADDITIONAL_STRATEGIES))
        .optional()
        .describe('Additional strategies to include'),
    cache: zod_1.z.boolean().describe('Whether to use caching'),
    config: zod_1.z.string().optional().describe('Path to the configuration file'),
    target: zod_1.z.string().optional().describe('Cloud provider target ID to run the scan on'),
    defaultConfig: zod_1.z.record(zod_1.z.unknown()).describe('Default configuration object'),
    defaultConfigPath: zod_1.z.string().optional().describe('Path to the default configuration file'),
    delay: zod_1.z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe('Delay in milliseconds between plugin API calls'),
    envFile: zod_1.z.string().optional().describe('Path to the environment file'),
    force: zod_1.z.boolean().describe('Whether to force generation').default(false),
    injectVar: zod_1.z.string().optional().describe('Variable to inject'),
    language: zod_1.z.string().optional().describe('Language of tests to generate'),
    maxConcurrency: zod_1.z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Maximum number of concurrent API calls'),
    numTests: zod_1.z.number().int().positive().optional().describe('Number of tests to generate'),
    output: zod_1.z.string().optional().describe('Output file path'),
    plugins: zod_1.z.array(exports.RedteamPluginObjectSchema).optional().describe('Plugins to use'),
    provider: zod_1.z.string().optional().describe('Provider to use'),
    purpose: zod_1.z.string().optional().describe('Purpose of the redteam generation'),
    strategies: zod_1.z.array(exports.RedteamStrategySchema).optional().describe('Strategies to use'),
    write: zod_1.z.boolean().describe('Whether to write the output'),
    burpEscapeJson: zod_1.z.boolean().describe('Whether to escape quotes in Burp payloads').optional(),
    progressBar: zod_1.z.boolean().describe('Whether to show a progress bar').optional(),
    configFromCloud: zod_1.z.any().optional().describe('A configuration object loaded from cloud'),
});
/**
 * Schema for `redteam` section of promptfooconfig.yaml
 */
exports.RedteamConfigSchema = zod_1.z
    .object({
    injectVar: zod_1.z
        .string()
        .optional()
        .describe("Variable to inject. Can be a string or array of strings. If string, it's transformed to an array. Inferred from the prompts by default."),
    purpose: zod_1.z
        .string()
        .optional()
        .describe('Purpose override string - describes the prompt templates'),
    testGenerationInstructions: zod_1.z
        .string()
        .optional()
        .describe('Additional instructions for test generation applied to each plugin'),
    provider: providers_1.ProviderSchema.optional().describe('Provider used for generating adversarial inputs'),
    numTests: zod_1.z.number().int().positive().optional().describe('Number of tests to generate'),
    language: zod_1.z.string().optional().describe('Language of tests ot generate for this plugin'),
    entities: zod_1.z
        .array(zod_1.z.string())
        .optional()
        .describe('Names of people, brands, or organizations related to your LLM application'),
    plugins: zod_1.z
        .array(exports.RedteamPluginSchema)
        .describe('Plugins to use for redteam generation')
        .default(['default']),
    strategies: zod_1.z
        .array(exports.RedteamStrategySchema)
        .describe((0, dedent_1.default) `Strategies to use for redteam generation.

        Defaults to ${constants_1.DEFAULT_STRATEGIES.join(', ')}
        Supports ${constants_1.ALL_STRATEGIES.join(', ')}
        `)
        .optional()
        .default(['default']),
    maxConcurrency: zod_1.z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Maximum number of concurrent API calls'),
    delay: zod_1.z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe('Delay in milliseconds between plugin API calls'),
    excludeTargetOutputFromAgenticAttackGeneration: zod_1.z
        .boolean()
        .optional()
        .describe('Whether to exclude target output from the agentific attack generation process'),
})
    .transform((data) => {
    const pluginMap = new Map();
    const strategySet = new Set();
    const addPlugin = (id, config, numTests, severity) => {
        const key = `${id}:${JSON.stringify(config)}:${severity || ''}`;
        const pluginObject = { id };
        if (numTests !== undefined || data.numTests !== undefined) {
            pluginObject.numTests = numTests ?? data.numTests;
        }
        if (config !== undefined) {
            pluginObject.config = config;
        }
        if (severity !== undefined) {
            pluginObject.severity = severity;
        }
        pluginMap.set(key, pluginObject);
    };
    const expandCollection = (collection, config, numTests, severity) => {
        (Array.isArray(collection) ? collection : Array.from(collection)).forEach((item) => {
            // Only add the plugin if it doesn't already exist or if the existing one has undefined numTests
            const existingPlugin = pluginMap.get(`${item}:${JSON.stringify(config)}:${severity || ''}`);
            if (!existingPlugin || existingPlugin.numTests === undefined) {
                addPlugin(item, config, numTests, severity);
            }
        });
    };
    const handleCollectionExpansion = (id, config, numTests, severity) => {
        if (id === 'foundation') {
            expandCollection([...constants_1.FOUNDATION_PLUGINS], config, numTests, severity);
        }
        else if (id === 'harmful') {
            expandCollection(Object.keys(constants_1.HARM_PLUGINS), config, numTests, severity);
        }
        else if (id === 'pii') {
            expandCollection([...constants_1.PII_PLUGINS], config, numTests, severity);
        }
        else if (id === 'medical') {
            expandCollection([...constants_1.MEDICAL_PLUGINS], config, numTests, severity);
        }
        else if (id === 'default') {
            expandCollection([...constants_1.DEFAULT_PLUGINS], config, numTests, severity);
        }
        else if (id === 'guardrails-eval') {
            expandCollection([...constants_1.GUARDRAILS_EVALUATION_PLUGINS], config, numTests, severity);
        }
    };
    const handlePlugin = (plugin) => {
        const pluginObj = typeof plugin === 'string'
            ? { id: plugin, numTests: data.numTests, config: undefined, severity: undefined }
            : { ...plugin, numTests: plugin.numTests ?? data.numTests };
        if (constants_1.ALIASED_PLUGIN_MAPPINGS[pluginObj.id]) {
            Object.values(constants_1.ALIASED_PLUGIN_MAPPINGS[pluginObj.id]).forEach(({ plugins, strategies }) => {
                plugins.forEach((id) => {
                    if (constants_1.COLLECTIONS.includes(id)) {
                        handleCollectionExpansion(id, pluginObj.config, pluginObj.numTests, pluginObj.severity);
                    }
                    else {
                        addPlugin(id, pluginObj.config, pluginObj.numTests, pluginObj.severity);
                    }
                });
                strategies.forEach((strategy) => strategySet.add(strategy));
            });
        }
        else if (constants_1.COLLECTIONS.includes(pluginObj.id)) {
            handleCollectionExpansion(pluginObj.id, pluginObj.config, pluginObj.numTests, pluginObj.severity);
        }
        else {
            const mapping = Object.entries(constants_1.ALIASED_PLUGIN_MAPPINGS).find(([, value]) => Object.keys(value).includes(pluginObj.id));
            if (mapping) {
                const [, aliasedMapping] = mapping;
                aliasedMapping[pluginObj.id].plugins.forEach((id) => {
                    if (constants_1.COLLECTIONS.includes(id)) {
                        handleCollectionExpansion(id, pluginObj.config, pluginObj.numTests, pluginObj.severity);
                    }
                    else {
                        addPlugin(id, pluginObj.config, pluginObj.numTests, pluginObj.severity);
                    }
                });
                aliasedMapping[pluginObj.id].strategies.forEach((strategy) => strategySet.add(strategy));
            }
            else {
                addPlugin(pluginObj.id, pluginObj.config, pluginObj.numTests, pluginObj.severity);
            }
        }
    };
    data.plugins.forEach(handlePlugin);
    const uniquePlugins = Array.from(pluginMap.values())
        .filter((plugin) => !constants_1.COLLECTIONS.includes(plugin.id))
        .sort((a, b) => {
        if (a.id !== b.id) {
            return a.id.localeCompare(b.id);
        }
        return JSON.stringify(a.config || {}).localeCompare(JSON.stringify(b.config || {}));
    });
    const strategies = Array.from(new Map([...(data.strategies || []), ...Array.from(strategySet)].flatMap((strategy) => {
        if (typeof strategy === 'string') {
            if (strategy === 'basic') {
                return [];
            }
            return strategy === 'default'
                ? constants_1.DEFAULT_STRATEGIES.map((id) => [id, { id }])
                : [[strategy, { id: strategy }]];
        }
        // Return tuple of [id, strategy] for Map to deduplicate by id
        return [[strategy.id, strategy]];
    })).values()).sort((a, b) => {
        const aId = typeof a === 'string' ? a : a.id;
        const bId = typeof b === 'string' ? b : b.id;
        return aId.localeCompare(bId);
    });
    return {
        numTests: data.numTests,
        plugins: uniquePlugins,
        strategies,
        ...(data.delay ? { delay: data.delay } : {}),
        ...(data.entities ? { entities: data.entities } : {}),
        ...(data.injectVar ? { injectVar: data.injectVar } : {}),
        ...(data.language ? { language: data.language } : {}),
        ...(data.provider ? { provider: data.provider } : {}),
        ...(data.purpose ? { purpose: data.purpose } : {}),
        ...(data.excludeTargetOutputFromAgenticAttackGeneration
            ? {
                excludeTargetOutputFromAgenticAttackGeneration: data.excludeTargetOutputFromAgenticAttackGeneration,
            }
            : {}),
    };
});
// Ensure that schemas match their corresponding types
function assert() { }
assert();
// TODO: Why is this never?
// assert<TypeEqualityGuard<RedteamPluginObject, z.infer<typeof RedteamPluginObjectSchema>>>();
//# sourceMappingURL=redteam.js.map