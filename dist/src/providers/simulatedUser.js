"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulatedUser = void 0;
const logger_1 = __importDefault(require("../logger"));
const invariant_1 = __importDefault(require("../util/invariant"));
const templates_1 = require("../util/templates");
const time_1 = require("../util/time");
const tokenUsageUtils_1 = require("../util/tokenUsageUtils");
const promptfoo_1 = require("./promptfoo");
/**
 * TODO(Will): Ideally this class is an Abstract Base Class that's implemented by the
 * Redteam and Non-Redteam SimulatedUser Providers. Address this in a follow-up PR.
 */
class SimulatedUser {
    constructor({ id, label, config }) {
        /**
         * Because the SimulatedUser is inherited by the RedteamMischievousUserProvider, and different
         * Cloud tasks are used for each, the taskId needs to be explicitly defined/scoped.
         */
        this.taskId = 'tau';
        this.identifier = id ?? label ?? 'agent-provider';
        this.maxTurns = config.maxTurns ?? 10;
        this.rawInstructions = config.instructions || '{{instructions}}';
        this.stateful = config.stateful ?? false;
    }
    id() {
        return this.identifier;
    }
    async sendMessageToUser(messages, userProvider) {
        logger_1.default.debug('[SimulatedUser] Sending message to simulated user provider');
        const flippedMessages = messages.map((message) => {
            return {
                role: message.role === 'user' ? 'assistant' : 'user',
                content: message.content,
            };
        });
        const response = await userProvider.callApi(JSON.stringify(flippedMessages));
        // Propagate error from remote generation disable check
        if (response.error) {
            return {
                messages,
                error: response.error,
            };
        }
        logger_1.default.debug(`User: ${response.output}`);
        return {
            messages: [...messages, { role: 'user', content: String(response.output || '') }],
            tokenUsage: response.tokenUsage,
        };
    }
    async sendMessageToAgent(messages, targetProvider, context) {
        const targetPrompt = this.stateful
            ? messages[messages.length - 1].content
            : JSON.stringify(messages);
        logger_1.default.debug(`[SimulatedUser] Sending message to target provider: ${targetPrompt}`);
        const response = await targetProvider.callApi(targetPrompt, context);
        if (response.sessionId) {
            context = context ?? { vars: {}, prompt: { raw: '', label: 'target' } };
            context.vars.sessionId = response.sessionId;
        }
        if (targetProvider.delay) {
            logger_1.default.debug(`[SimulatedUser] Sleeping for ${targetProvider.delay}ms`);
            await (0, time_1.sleep)(targetProvider.delay);
        }
        logger_1.default.debug(`[SimulatedUser] Agent: ${response.output}`);
        return response;
    }
    async callApi(
    // NOTE: `prompt` is not used in this provider; `vars.instructions` is used instead.
    _prompt, context, _callApiOptions) {
        (0, invariant_1.default)(context?.originalProvider, 'Expected originalProvider to be set');
        const instructions = (0, templates_1.getNunjucksEngine)().renderString(this.rawInstructions, context?.vars);
        const userProvider = new promptfoo_1.PromptfooSimulatedUserProvider({ instructions }, this.taskId);
        logger_1.default.debug(`[SimulatedUser] Formatted user instructions: ${instructions}`);
        const messages = [];
        const maxTurns = this.maxTurns;
        const tokenUsage = (0, tokenUsageUtils_1.createEmptyTokenUsage)();
        let agentResponse;
        for (let i = 0; i < maxTurns; i++) {
            logger_1.default.debug(`[SimulatedUser] Turn ${i + 1} of ${maxTurns}`);
            // NOTE: Simulated-user provider acts as a judge to determine whether the instruction goal is satisfied.
            const userResult = await this.sendMessageToUser(messages, userProvider);
            // Check for errors from remote generation disable
            if (userResult.error) {
                return {
                    error: userResult.error,
                    tokenUsage,
                };
            }
            const { messages: messagesToUser } = userResult;
            const lastMessage = messagesToUser[messagesToUser.length - 1];
            // Check whether the judge has determined that the instruction goal is satisfied.
            if (lastMessage.content &&
                typeof lastMessage.content === 'string' &&
                lastMessage.content.includes('###STOP###')) {
                break;
            }
            messages.push(lastMessage);
            agentResponse = await this.sendMessageToAgent(messagesToUser, context.originalProvider, context);
            messages.push({ role: 'assistant', content: String(agentResponse.output ?? '') });
            (0, tokenUsageUtils_1.accumulateResponseTokenUsage)(tokenUsage, agentResponse);
        }
        return this.serializeOutput(messages, tokenUsage, agentResponse);
    }
    toString() {
        return 'AgentProvider';
    }
    serializeOutput(messages, tokenUsage, finalTargetResponse) {
        return {
            output: messages
                .map((message) => `${message.role === 'assistant' ? 'Assistant' : 'User'}: ${message.content}`)
                .join('\n---\n'),
            tokenUsage,
            metadata: {
                messages,
            },
            guardrails: finalTargetResponse.guardrails,
        };
    }
}
exports.SimulatedUser = SimulatedUser;
//# sourceMappingURL=simulatedUser.js.map