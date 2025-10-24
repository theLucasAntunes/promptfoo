"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.XAIImageProvider = void 0;
exports.createXAIImageProvider = createXAIImageProvider;
const envars_1 = require("../../envars");
const logger_1 = __importDefault(require("../../logger"));
const invariant_1 = __importDefault(require("../../util/invariant"));
const image_1 = require("../openai/image");
const shared_1 = require("../shared");
class XAIImageProvider extends image_1.OpenAiImageProvider {
    constructor(modelName, options = {}) {
        super(modelName, {
            ...options,
            config: {
                ...options.config,
                apiKeyEnvar: 'XAI_API_KEY',
                apiBaseUrl: 'https://api.x.ai/v1',
            },
        });
        this.config = options.config || {};
    }
    getApiKey() {
        if (this.config?.apiKey) {
            return this.config.apiKey;
        }
        return (0, envars_1.getEnvString)('XAI_API_KEY');
    }
    getApiUrlDefault() {
        return 'https://api.x.ai/v1';
    }
    id() {
        return `xai:image:${this.modelName}`;
    }
    toString() {
        return `[xAI Image Provider ${this.modelName}]`;
    }
    getApiModelName() {
        const modelMap = {
            'grok-2-image': 'grok-2-image',
            'grok-image': 'grok-2-image',
        };
        return modelMap[this.modelName] || 'grok-2-image';
    }
    calculateImageCost(n = 1) {
        // xAI pricing: $0.07 per generated image for grok-2-image
        return 0.07 * n;
    }
    async callApi(prompt, context, _callApiOptions) {
        if (this.requiresApiKey() && !this.getApiKey()) {
            throw new Error('xAI API key is not set. Set the XAI_API_KEY environment variable or add `apiKey` to the provider config.');
        }
        const config = {
            ...this.config,
            ...context?.prompt?.config,
        };
        const model = this.getApiModelName();
        const responseFormat = config.response_format || 'url';
        const endpoint = '/images/generations';
        const body = {
            model,
            prompt,
            n: config.n || 1,
            response_format: responseFormat,
        };
        if (config.user) {
            body.user = config.user;
        }
        const headers = {
            'Content-Type': 'application/json',
            ...(this.getApiKey() ? { Authorization: `Bearer ${this.getApiKey()}` } : {}),
            ...config.headers,
        };
        let data, status, statusText;
        let cached = false;
        try {
            ({ data, cached, status, statusText } = await (0, image_1.callOpenAiImageApi)(`${this.getApiUrl()}${endpoint}`, body, headers, shared_1.REQUEST_TIMEOUT_MS));
            if (status < 200 || status >= 300) {
                return {
                    error: `API error: ${status} ${statusText}\n${typeof data === 'string' ? data : JSON.stringify(data)}`,
                };
            }
        }
        catch (err) {
            logger_1.default.error(`API call error: ${String(err)}`);
            await data?.deleteFromCache?.();
            return {
                error: `API call error: ${String(err)}`,
            };
        }
        if (data.error) {
            await data?.deleteFromCache?.();
            return {
                error: typeof data.error === 'string' ? data.error : JSON.stringify(data.error),
            };
        }
        try {
            const formattedOutput = (0, image_1.formatOutput)(data, prompt, responseFormat);
            if (typeof formattedOutput === 'object') {
                return formattedOutput;
            }
            const cost = cached ? 0 : this.calculateImageCost(config.n || 1);
            return {
                output: formattedOutput,
                cached,
                cost,
                ...(responseFormat === 'b64_json' ? { isBase64: true, format: 'json' } : {}),
            };
        }
        catch (err) {
            await data?.deleteFromCache?.();
            return {
                error: `API error: ${String(err)}: ${JSON.stringify(data)}`,
            };
        }
    }
}
exports.XAIImageProvider = XAIImageProvider;
function createXAIImageProvider(providerPath, options = {}) {
    const splits = providerPath.split(':');
    const modelName = splits.slice(2).join(':');
    (0, invariant_1.default)(modelName, 'Model name is required');
    return new XAIImageProvider(modelName, options);
}
//# sourceMappingURL=image.js.map