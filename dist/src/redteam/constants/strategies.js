"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STRATEGIES_REQUIRING_REMOTE = exports.ENCODING_STRATEGIES = exports.CONFIGURABLE_STRATEGIES = exports.ALL_STRATEGIES = exports.STRATEGY_COLLECTION_MAPPINGS = exports.STRATEGY_COLLECTIONS = exports.ADDITIONAL_STRATEGIES = exports.DATASET_PLUGINS = exports.AGENTIC_STRATEGIES = exports.MULTI_MODAL_STRATEGIES = exports.isCustomStrategy = exports.MULTI_TURN_STRATEGIES = exports.DEFAULT_STRATEGIES = exports.FRAMEWORK_COMPLIANCE_IDS = void 0;
exports.isEncodingStrategy = isEncodingStrategy;
exports.getDefaultNFanout = getDefaultNFanout;
exports.isFanoutStrategy = isFanoutStrategy;
// These are exposed on the frontend under the framework compliance section
exports.FRAMEWORK_COMPLIANCE_IDS = [
    'mitre:atlas',
    'nist:ai:measure',
    'owasp:api',
    'owasp:llm',
    'eu:ai-act',
    'iso:42001',
];
exports.DEFAULT_STRATEGIES = ['basic', 'jailbreak', 'jailbreak:composite'];
exports.MULTI_TURN_STRATEGIES = ['crescendo', 'goat', 'custom', 'mischievous-user'];
// Helper function to check if a strategy is a custom variant
const isCustomStrategy = (strategyId) => {
    return strategyId === 'custom' || strategyId.startsWith('custom:');
};
exports.isCustomStrategy = isCustomStrategy;
exports.MULTI_MODAL_STRATEGIES = ['audio', 'image', 'video'];
exports.AGENTIC_STRATEGIES = [
    'crescendo',
    'goat',
    'custom',
    'jailbreak',
    'jailbreak:tree',
    'mischievous-user',
];
exports.DATASET_PLUGINS = [
    'beavertails',
    'cyberseceval',
    'donotanswer',
    'harmbench',
    'toxic-chat',
    'aegis',
    'pliny',
    'unsafebench',
    'xstest',
];
exports.ADDITIONAL_STRATEGIES = [
    'layer',
    'audio',
    'authoritative-markup-injection',
    'base64',
    'best-of-n',
    'camelcase',
    'citation',
    'crescendo',
    'custom',
    'gcg',
    'goat',
    'hex',
    'homoglyph',
    'image',
    'emoji',
    'jailbreak:likert',
    'jailbreak:tree',
    'leetspeak',
    'math-prompt',
    'mischievous-user',
    'morse',
    'multilingual',
    'piglatin',
    'prompt-injection',
    'retry',
    'rot13',
    'video',
];
exports.STRATEGY_COLLECTIONS = ['other-encodings'];
exports.STRATEGY_COLLECTION_MAPPINGS = {
    'other-encodings': ['camelcase', 'morse', 'piglatin', 'emoji'],
};
const _ALL_STRATEGIES = [
    'default',
    ...exports.DEFAULT_STRATEGIES,
    ...exports.ADDITIONAL_STRATEGIES,
    ...exports.STRATEGY_COLLECTIONS,
];
exports.ALL_STRATEGIES = Array.from(new Set(_ALL_STRATEGIES)).sort();
exports.CONFIGURABLE_STRATEGIES = [
    'layer',
    'multilingual',
    'best-of-n',
    'goat',
    'crescendo',
    'jailbreak',
    'jailbreak:tree',
    'gcg',
    'citation',
    'custom',
    'mischievous-user',
];
/**
 * Set of strategy IDs that represent encoding transformations where originalText should be shown
 */
exports.ENCODING_STRATEGIES = new Set([
    'base64',
    'hex',
    'rot13',
    'leetspeak',
    'homoglyph',
    'morse',
    'atbash',
    'piglatin',
    'camelcase',
    'emoji',
    'reverse',
    'binary',
    'octal',
    'audio',
    'image',
    'video',
]);
/**
 * Determines if a strategy represents an encoding where we should show the original text
 */
function isEncodingStrategy(strategyId) {
    return strategyId ? exports.ENCODING_STRATEGIES.has(strategyId) : false;
}
/**
 * Default 'n' fan out for strategies that can add additional test cases during generation
 */
const DEFAULT_N_FAN_OUT_BY_STRATEGY = {
    'jailbreak:composite': 5,
    gcg: 1,
};
for (const strategyId in DEFAULT_N_FAN_OUT_BY_STRATEGY) {
    if (!exports.ALL_STRATEGIES.includes(strategyId)) {
        throw new Error(`Default fan out strategy ${strategyId} is not in ALL_STRATEGIES`);
    }
}
function getDefaultNFanout(strategyId) {
    return DEFAULT_N_FAN_OUT_BY_STRATEGY[strategyId] ?? 1;
}
function isFanoutStrategy(strategyId) {
    return strategyId in DEFAULT_N_FAN_OUT_BY_STRATEGY;
}
// Strategies that require remote generation to function
// These strategies will be disabled in the UI when PROMPTFOO_DISABLE_REMOTE_GENERATION is set
exports.STRATEGIES_REQUIRING_REMOTE = [
    'audio',
    'citation',
    'gcg',
    'goat',
    'jailbreak:composite',
    'jailbreak:likert',
];
//# sourceMappingURL=strategies.js.map