"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HyperbolicProvider = exports.HYPERBOLIC_REASONING_MODELS = exports.HYPERBOLIC_CHAT_MODELS = void 0;
exports.calculateHyperbolicCost = calculateHyperbolicCost;
exports.createHyperbolicProvider = createHyperbolicProvider;
const logger_1 = __importDefault(require("../../logger"));
const invariant_1 = __importDefault(require("../../util/invariant"));
const chat_1 = require("../openai/chat");
exports.HYPERBOLIC_CHAT_MODELS = [
    // DeepSeek Models
    {
        id: 'deepseek-ai/DeepSeek-R1',
        cost: {
            input: 0.5 / 1e6,
            output: 2.18 / 1e6,
        },
        aliases: ['DeepSeek-R1'],
    },
    {
        id: 'deepseek-ai/DeepSeek-R1-Zero',
        cost: {
            input: 0.5 / 1e6,
            output: 2.18 / 1e6,
        },
        aliases: ['DeepSeek-R1-Zero'],
    },
    {
        id: 'deepseek-ai/DeepSeek-V3',
        cost: {
            input: 0.27 / 1e6,
            output: 1.1 / 1e6,
        },
        aliases: ['DeepSeek-V3'],
    },
    {
        id: 'deepseek-ai/DeepSeek-V3-0324',
        cost: {
            input: 0.27 / 1e6,
            output: 1.1 / 1e6,
        },
        aliases: ['DeepSeek-V3-0324'],
    },
    {
        id: 'deepseek/DeepSeek-V2.5',
        cost: {
            input: 0.14 / 1e6,
            output: 0.28 / 1e6,
        },
        aliases: ['DeepSeek-V2.5'],
    },
    // Qwen Models
    {
        id: 'qwen/Qwen3-235B-A22B',
        cost: {
            input: 2.0 / 1e6,
            output: 8.0 / 1e6,
        },
        aliases: ['Qwen3-235B-A22B'],
    },
    {
        id: 'qwen/QwQ-32B',
        cost: {
            input: 0.15 / 1e6,
            output: 0.6 / 1e6,
        },
        aliases: ['QwQ-32B'],
    },
    {
        id: 'qwen/QwQ-32B-Preview',
        cost: {
            input: 0.15 / 1e6,
            output: 0.6 / 1e6,
        },
        aliases: ['QwQ-32B-Preview', 'Qwen/QwQ-32B-Preview'],
    },
    {
        id: 'qwen/Qwen2.5-72B-Instruct',
        cost: {
            input: 0.35 / 1e6,
            output: 0.4 / 1e6,
        },
        aliases: ['Qwen2.5-72B-Instruct', 'Qwen2.5-72B'],
    },
    {
        id: 'qwen/Qwen2.5-Coder-32B',
        cost: {
            input: 0.18 / 1e6,
            output: 0.18 / 1e6,
        },
        aliases: ['Qwen2.5-Coder-32B'],
    },
    // Llama Models
    {
        id: 'meta-llama/Llama-3.3-70B-Instruct',
        cost: {
            input: 0.35 / 1e6,
            output: 0.4 / 1e6,
        },
        aliases: ['Llama-3.3-70B-Instruct', 'Llama-3.3-70B'],
    },
    {
        id: 'meta-llama/Llama-3.2-3B',
        cost: {
            input: 0.02 / 1e6,
            output: 0.02 / 1e6,
        },
        aliases: ['Llama-3.2-3B'],
    },
    {
        id: 'meta-llama/Llama-3.1-405B',
        cost: {
            input: 3.0 / 1e6,
            output: 3.0 / 1e6,
        },
        aliases: ['Llama-3.1-405B'],
    },
    {
        id: 'meta-llama/Llama-3.1-405B-BASE',
        cost: {
            input: 3.0 / 1e6,
            output: 3.0 / 1e6,
        },
        aliases: ['Llama-3.1-405B-BASE'],
    },
    {
        id: 'meta-llama/Llama-3.1-70B',
        cost: {
            input: 0.35 / 1e6,
            output: 0.4 / 1e6,
        },
        aliases: ['Llama-3.1-70B', 'Meta-Llama-3.1-70B-Instruct'],
    },
    {
        id: 'meta-llama/Llama-3.1-8B',
        cost: {
            input: 0.04 / 1e6,
            output: 0.04 / 1e6,
        },
        aliases: ['Llama-3.1-8B'],
    },
    {
        id: 'meta-llama/Llama-3-70B',
        cost: {
            input: 0.35 / 1e6,
            output: 0.4 / 1e6,
        },
        aliases: ['Llama-3-70B'],
    },
    // Hermes Models
    {
        id: 'hermes/Hermes-3-70B',
        cost: {
            input: 0.35 / 1e6,
            output: 0.4 / 1e6,
        },
        aliases: ['Hermes-3-70B'],
    },
    // Vision-Language Models
    {
        id: 'qwen/Qwen2.5-VL-7B-Instruct',
        cost: {
            input: 0.2 / 1e6,
            output: 0.2 / 1e6,
        },
        aliases: ['Qwen2.5-VL-7B-Instruct', 'Qwen/Qwen2.5-VL-7B-Instruct'],
    },
    {
        id: 'qwen/Qwen2.5-VL-72B-Instruct',
        cost: {
            input: 0.6 / 1e6,
            output: 0.6 / 1e6,
        },
        aliases: ['Qwen2.5-VL-72B-Instruct', 'qwen/Qwen2.5-VL-72B-Instruct'],
    },
    {
        id: 'mistralai/Pixtral-12B',
        cost: {
            input: 0.15 / 1e6,
            output: 0.15 / 1e6,
        },
        aliases: ['Pixtral-12B'],
    },
];
exports.HYPERBOLIC_REASONING_MODELS = [
    'deepseek-ai/DeepSeek-R1',
    'deepseek-ai/DeepSeek-R1-Zero',
    'qwen/QwQ-32B',
    'qwen/QwQ-32B-Preview',
];
/**
 * Calculate Hyperbolic cost based on model name and token usage
 */
function calculateHyperbolicCost(modelName, config, promptTokens, completionTokens, reasoningTokens) {
    if (!promptTokens || !completionTokens) {
        return undefined;
    }
    const model = exports.HYPERBOLIC_CHAT_MODELS.find((m) => m.id === modelName || (m.aliases && m.aliases.includes(modelName)));
    if (!model || !model.cost) {
        return undefined;
    }
    const inputCost = config.cost ?? model.cost.input;
    const outputCost = config.cost ?? model.cost.output;
    const inputCostTotal = inputCost * promptTokens;
    const outputCostTotal = outputCost * completionTokens;
    logger_1.default.debug(`Hyperbolic cost calculation for ${modelName}: ` +
        `promptTokens=${promptTokens}, completionTokens=${completionTokens}, ` +
        `reasoningTokens=${reasoningTokens || 'N/A'}, ` +
        `inputCost=${inputCostTotal}, outputCost=${outputCostTotal}`);
    return inputCostTotal + outputCostTotal;
}
class HyperbolicProvider extends chat_1.OpenAiChatCompletionProvider {
    get apiKey() {
        return this.config?.apiKey;
    }
    isReasoningModel() {
        return exports.HYPERBOLIC_REASONING_MODELS.includes(this.modelName);
    }
    supportsTemperature() {
        // Reasoning models may have limited temperature support
        return true;
    }
    constructor(modelName, providerOptions) {
        super(modelName, {
            ...providerOptions,
            config: {
                ...providerOptions.config,
                apiKeyEnvar: 'HYPERBOLIC_API_KEY',
                apiBaseUrl: 'https://api.hyperbolic.xyz/v1',
            },
        });
        // Store the original config for later use
        this.originalConfig = providerOptions.config?.config;
    }
    id() {
        return `hyperbolic:${this.modelName}`;
    }
    toString() {
        return `[Hyperbolic Provider ${this.modelName}]`;
    }
    toJSON() {
        return {
            provider: 'hyperbolic',
            model: this.modelName,
            config: {
                ...this.config,
                ...(this.apiKey && { apiKey: undefined }),
            },
        };
    }
    async callApi(prompt, context, callApiOptions) {
        const response = await super.callApi(prompt, context, callApiOptions);
        if (!response || response.error) {
            return response;
        }
        try {
            if (typeof response.raw === 'string') {
                try {
                    const rawData = JSON.parse(response.raw);
                    if (this.isReasoningModel() &&
                        rawData?.usage?.completion_tokens_details?.reasoning_tokens) {
                        const reasoningTokens = rawData.usage.completion_tokens_details.reasoning_tokens;
                        const acceptedPredictions = rawData.usage.completion_tokens_details.accepted_prediction_tokens || 0;
                        const rejectedPredictions = rawData.usage.completion_tokens_details.rejected_prediction_tokens || 0;
                        if (response.tokenUsage) {
                            response.tokenUsage.completionDetails = {
                                reasoning: reasoningTokens,
                                acceptedPrediction: acceptedPredictions,
                                rejectedPrediction: rejectedPredictions,
                            };
                            logger_1.default.debug(`Hyperbolic reasoning token details for ${this.modelName}: ` +
                                `reasoning=${reasoningTokens}, accepted=${acceptedPredictions}, rejected=${rejectedPredictions}`);
                        }
                    }
                }
                catch (err) {
                    logger_1.default.error(`Failed to parse raw response JSON: ${err}`);
                }
            }
            else if (typeof response.raw === 'object' && response.raw !== null) {
                const rawData = response.raw;
                if (this.isReasoningModel() &&
                    rawData?.usage?.completion_tokens_details?.reasoning_tokens) {
                    const reasoningTokens = rawData.usage.completion_tokens_details.reasoning_tokens;
                    const acceptedPredictions = rawData.usage.completion_tokens_details.accepted_prediction_tokens || 0;
                    const rejectedPredictions = rawData.usage.completion_tokens_details.rejected_prediction_tokens || 0;
                    if (response.tokenUsage) {
                        response.tokenUsage.completionDetails = {
                            reasoning: reasoningTokens,
                            acceptedPrediction: acceptedPredictions,
                            rejectedPrediction: rejectedPredictions,
                        };
                        logger_1.default.debug(`Hyperbolic reasoning token details for ${this.modelName}: ` +
                            `reasoning=${reasoningTokens}, accepted=${acceptedPredictions}, rejected=${rejectedPredictions}`);
                    }
                }
            }
            if (response.tokenUsage && !response.cached) {
                const reasoningTokens = response.tokenUsage.completionDetails?.reasoning || 0;
                response.cost = calculateHyperbolicCost(this.modelName, this.config || {}, response.tokenUsage.prompt, response.tokenUsage.completion, reasoningTokens);
            }
        }
        catch (err) {
            logger_1.default.error(`Error processing Hyperbolic response: ${err}`);
        }
        return response;
    }
}
exports.HyperbolicProvider = HyperbolicProvider;
function createHyperbolicProvider(providerPath, options = {}) {
    const splits = providerPath.split(':');
    const modelName = splits.slice(1).join(':');
    (0, invariant_1.default)(modelName, 'Model name is required');
    return new HyperbolicProvider(modelName, options);
}
//# sourceMappingURL=chat.js.map