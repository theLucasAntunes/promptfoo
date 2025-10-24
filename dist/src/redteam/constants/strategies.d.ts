export declare const FRAMEWORK_COMPLIANCE_IDS: readonly ["mitre:atlas", "nist:ai:measure", "owasp:api", "owasp:llm", "eu:ai-act", "iso:42001"];
export type FrameworkComplianceId = (typeof FRAMEWORK_COMPLIANCE_IDS)[number];
export declare const DEFAULT_STRATEGIES: readonly ["basic", "jailbreak", "jailbreak:composite"];
export type DefaultStrategy = (typeof DEFAULT_STRATEGIES)[number];
export declare const MULTI_TURN_STRATEGIES: readonly ["crescendo", "goat", "custom", "mischievous-user"];
export declare const isCustomStrategy: (strategyId: string) => boolean;
export type MultiTurnStrategy = (typeof MULTI_TURN_STRATEGIES)[number];
export declare const MULTI_MODAL_STRATEGIES: readonly ["audio", "image", "video"];
export type MultiModalStrategy = (typeof MULTI_MODAL_STRATEGIES)[number];
export declare const AGENTIC_STRATEGIES: readonly ["crescendo", "goat", "custom", "jailbreak", "jailbreak:tree", "mischievous-user"];
export type AgenticStrategy = (typeof AGENTIC_STRATEGIES)[number];
export declare const DATASET_PLUGINS: readonly ["beavertails", "cyberseceval", "donotanswer", "harmbench", "toxic-chat", "aegis", "pliny", "unsafebench", "xstest"];
export type DatasetPlugin = (typeof DATASET_PLUGINS)[number];
export declare const ADDITIONAL_STRATEGIES: readonly ["layer", "audio", "authoritative-markup-injection", "base64", "best-of-n", "camelcase", "citation", "crescendo", "custom", "gcg", "goat", "hex", "homoglyph", "image", "emoji", "jailbreak:likert", "jailbreak:tree", "leetspeak", "math-prompt", "mischievous-user", "morse", "multilingual", "piglatin", "prompt-injection", "retry", "rot13", "video"];
export type AdditionalStrategy = (typeof ADDITIONAL_STRATEGIES)[number];
export declare const STRATEGY_COLLECTIONS: readonly ["other-encodings"];
export type StrategyCollection = (typeof STRATEGY_COLLECTIONS)[number];
export declare const STRATEGY_COLLECTION_MAPPINGS: Record<StrategyCollection, string[]>;
export declare const ALL_STRATEGIES: ("default" | "custom" | "basic" | "jailbreak" | "jailbreak:composite" | "crescendo" | "goat" | "mischievous-user" | "audio" | "image" | "video" | "jailbreak:tree" | "layer" | "authoritative-markup-injection" | "base64" | "best-of-n" | "camelcase" | "citation" | "gcg" | "hex" | "homoglyph" | "emoji" | "jailbreak:likert" | "leetspeak" | "math-prompt" | "morse" | "multilingual" | "piglatin" | "prompt-injection" | "retry" | "rot13" | "other-encodings")[];
export type Strategy = (typeof ALL_STRATEGIES)[number];
export declare const CONFIGURABLE_STRATEGIES: readonly ["layer", "multilingual", "best-of-n", "goat", "crescendo", "jailbreak", "jailbreak:tree", "gcg", "citation", "custom", "mischievous-user"];
export type ConfigurableStrategy = (typeof CONFIGURABLE_STRATEGIES)[number];
/**
 * Set of strategy IDs that represent encoding transformations where originalText should be shown
 */
export declare const ENCODING_STRATEGIES: Set<string>;
/**
 * Determines if a strategy represents an encoding where we should show the original text
 */
export declare function isEncodingStrategy(strategyId: string | undefined): boolean;
/**
 * Default 'n' fan out for strategies that can add additional test cases during generation
 */
declare const DEFAULT_N_FAN_OUT_BY_STRATEGY: {
    readonly 'jailbreak:composite': 5;
    readonly gcg: 1;
};
type FanOutStrategy = keyof typeof DEFAULT_N_FAN_OUT_BY_STRATEGY;
export declare function getDefaultNFanout(strategyId: FanOutStrategy): number;
export declare function isFanoutStrategy(strategyId: string): strategyId is FanOutStrategy;
export declare const STRATEGIES_REQUIRING_REMOTE: readonly ["audio", "citation", "gcg", "goat", "jailbreak:composite", "jailbreak:likert"];
export {};
//# sourceMappingURL=strategies.d.ts.map