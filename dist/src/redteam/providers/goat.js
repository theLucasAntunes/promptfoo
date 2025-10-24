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
const chalk_1 = __importDefault(require("chalk"));
const dedent_1 = __importDefault(require("dedent"));
const constants_1 = require("../../constants");
const evaluatorHelpers_1 = require("../../evaluatorHelpers");
const accounts_1 = require("../../globalConfig/accounts");
const logger_1 = __importDefault(require("../../logger"));
const index_1 = require("../../util/fetch/index");
const invariant_1 = __importDefault(require("../../util/invariant"));
const json_1 = require("../../util/json");
const templates_1 = require("../../util/templates");
const time_1 = require("../../util/time");
const tokenUsageUtils_1 = require("../../util/tokenUsageUtils");
const remoteGeneration_1 = require("../remoteGeneration");
const prompts_1 = require("./prompts");
const shared_1 = require("./shared");
class GoatProvider {
    id() {
        return 'promptfoo:redteam:goat';
    }
    constructor(options = {}) {
        this.successfulAttacks = [];
        if ((0, remoteGeneration_1.neverGenerateRemote)()) {
            throw new Error(`GOAT strategy requires remote grading to be enabled`);
        }
        (0, invariant_1.default)(typeof options.injectVar === 'string', 'Expected injectVar to be set');
        this.config = {
            maxTurns: options.maxTurns || 5,
            injectVar: options.injectVar,
            stateful: options.stateful ?? false,
            excludeTargetOutputFromAgenticAttackGeneration: options.excludeTargetOutputFromAgenticAttackGeneration ?? false,
            continueAfterSuccess: options.continueAfterSuccess ?? false,
        };
        this.nunjucks = (0, templates_1.getNunjucksEngine)();
        logger_1.default.debug('[GOAT] Constructor options', {
            injectVar: options.injectVar,
            maxTurns: options.maxTurns,
            stateful: options.stateful,
            continueAfterSuccess: options.continueAfterSuccess,
        });
    }
    async callApi(_prompt, context, options) {
        // Reset successful attacks array for each new call
        this.successfulAttacks = [];
        let response = undefined;
        logger_1.default.debug('[GOAT] callApi context', { context });
        (0, invariant_1.default)(context?.originalProvider, 'Expected originalProvider to be set');
        (0, invariant_1.default)(context?.vars, 'Expected vars to be set');
        const targetProvider = context?.originalProvider;
        (0, invariant_1.default)(targetProvider, 'Expected originalProvider to be set');
        const messages = [];
        const totalTokenUsage = (0, tokenUsageUtils_1.createEmptyTokenUsage)();
        let lastTargetResponse = undefined;
        let assertToUse;
        let graderPassed;
        let storedGraderResult;
        const { getGraderById } = await Promise.resolve().then(() => __importStar(require('../graders')));
        let test;
        if (context?.test) {
            test = context?.test;
            assertToUse = test?.assert?.find((a) => a.type && a.type.includes(test?.metadata?.pluginId));
            // Fallback: if no assertion matches the pluginId, use the first assertion with a type
            if (!assertToUse) {
                assertToUse = test?.assert?.find((a) => a.type);
            }
        }
        let previousAttackerMessage = '';
        let previousTargetOutput = '';
        // Generate goal-specific evaluation rubric
        const userGoal = context?.test?.metadata?.goal || context?.vars[this.config.injectVar];
        const additionalRubric = (0, prompts_1.getGoalRubric)(userGoal);
        for (let turn = 0; turn < this.config.maxTurns; turn++) {
            try {
                // Handle unblocking logic BEFORE attack (skip on first turn)
                if (turn > 0 && previousTargetOutput) {
                    const unblockingResult = await (0, shared_1.tryUnblocking)({
                        messages,
                        lastResponse: previousTargetOutput,
                        goal: context?.test?.metadata?.goal || context?.vars[this.config.injectVar],
                        purpose: context?.test?.metadata?.purpose,
                    });
                    if (unblockingResult.success && unblockingResult.unblockingPrompt) {
                        logger_1.default.debug(`[GOAT] Sending unblocking response: ${unblockingResult.unblockingPrompt}`);
                        messages.push({ role: 'user', content: unblockingResult.unblockingPrompt });
                        const unblockingTargetPrompt = this.config.stateful
                            ? unblockingResult.unblockingPrompt
                            : JSON.stringify(messages);
                        const unblockingResponse = await targetProvider.callApi(unblockingTargetPrompt, context, options);
                        if (!unblockingResponse.cached && targetProvider.delay && targetProvider.delay > 0) {
                            logger_1.default.debug(`Sleeping for ${targetProvider.delay}ms`);
                            await (0, time_1.sleep)(targetProvider.delay);
                        }
                        (0, tokenUsageUtils_1.accumulateResponseTokenUsage)(totalTokenUsage, unblockingResponse);
                        const unblockingOutput = typeof unblockingResponse.output === 'string'
                            ? unblockingResponse.output
                            : (0, json_1.safeJsonStringify)(unblockingResponse.output);
                        if (unblockingOutput) {
                            messages.push({ role: 'assistant', content: unblockingOutput });
                        }
                        if (unblockingResponse.error) {
                            logger_1.default.error(`[GOAT] Target returned an error: ${unblockingResponse.error}`);
                        }
                    }
                }
                // Generate and send attack
                let body;
                let failureReason;
                if (this.config.excludeTargetOutputFromAgenticAttackGeneration && turn > 0) {
                    body = JSON.stringify({
                        goal: context?.test?.metadata?.goal || context?.vars[this.config.injectVar],
                        targetOutput: previousTargetOutput,
                        attackAttempt: previousAttackerMessage,
                        task: 'extract-goat-failure',
                        modifiers: context?.test?.metadata?.modifiers,
                    });
                    logger_1.default.debug(`[GOAT] Sending request to ${(0, remoteGeneration_1.getRemoteGenerationUrl)()}: ${body}`);
                    response = await (0, index_1.fetchWithProxy)((0, remoteGeneration_1.getRemoteGenerationUrl)(), {
                        body,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        method: 'POST',
                    });
                    const data = (await response.json());
                    if (!data.message) {
                        logger_1.default.info('[GOAT] Invalid message from GOAT, skipping turn', { data });
                        continue;
                    }
                    failureReason = data.message;
                    logger_1.default.debug(`[GOAT] Previous attack attempt failure reason: ${failureReason}`);
                }
                body = JSON.stringify({
                    goal: context?.test?.metadata?.goal || context?.vars[this.config.injectVar],
                    i: turn,
                    messages: this.config.excludeTargetOutputFromAgenticAttackGeneration
                        ? messages.filter((m) => m.role !== 'assistant')
                        : messages,
                    prompt: context?.prompt?.raw,
                    task: 'goat',
                    version: constants_1.VERSION,
                    email: (0, accounts_1.getUserEmail)(),
                    excludeTargetOutputFromAgenticAttackGeneration: this.config.excludeTargetOutputFromAgenticAttackGeneration,
                    failureReason,
                    purpose: context?.test?.metadata?.purpose,
                    modifiers: context?.test?.metadata?.modifiers,
                });
                logger_1.default.debug(`[GOAT] Sending request to ${(0, remoteGeneration_1.getRemoteGenerationUrl)()}: ${body}`);
                response = await (0, index_1.fetchWithProxy)((0, remoteGeneration_1.getRemoteGenerationUrl)(), {
                    body,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    method: 'POST',
                });
                const data = await response.json();
                if (typeof data?.message !== 'object' || !data.message?.content || !data.message?.role) {
                    logger_1.default.info('[GOAT] Invalid message from GOAT, skipping turn', { data });
                    continue;
                }
                const attackerMessage = data.message;
                previousAttackerMessage = attackerMessage?.content;
                const targetVars = {
                    ...context.vars,
                    [this.config.injectVar]: attackerMessage.content,
                };
                const renderedAttackerPrompt = await (0, evaluatorHelpers_1.renderPrompt)(context.prompt, targetVars, context.filters, targetProvider);
                messages.push({
                    role: attackerMessage.role,
                    content: renderedAttackerPrompt,
                });
                logger_1.default.debug((0, dedent_1.default) `
          ${chalk_1.default.bold.green(`GOAT turn ${turn} history:`)}
          ${chalk_1.default.cyan(JSON.stringify(messages, null, 2))}
        `);
                const targetPrompt = this.config.stateful
                    ? messages[messages.length - 1].content
                    : JSON.stringify(messages);
                logger_1.default.debug(`GOAT turn ${turn} target prompt: ${renderedAttackerPrompt}`);
                const targetResponse = await targetProvider.callApi(targetPrompt, context, options);
                if (!targetResponse.cached && targetProvider.delay && targetProvider.delay > 0) {
                    logger_1.default.debug(`Sleeping for ${targetProvider.delay}ms`);
                    await (0, time_1.sleep)(targetProvider.delay);
                }
                (0, tokenUsageUtils_1.accumulateResponseTokenUsage)(totalTokenUsage, targetResponse);
                logger_1.default.debug(`GOAT turn ${turn} target response`, { response: targetResponse });
                if (targetResponse.sessionId) {
                    context = context ?? { vars: {}, prompt: { raw: '', label: 'target' } };
                    context.vars.sessionId = targetResponse.sessionId;
                }
                if (targetResponse.error) {
                    throw new Error(`[GOAT] Target returned an error: ${targetResponse.error}`);
                }
                (0, invariant_1.default)(targetResponse.output, `[GOAT] Expected target response output to be set, but got: ${(0, json_1.safeJsonStringify)(targetResponse)}`);
                const stringifiedOutput = typeof targetResponse.output === 'string'
                    ? targetResponse.output
                    : (0, json_1.safeJsonStringify)(targetResponse.output);
                const finalOutput = stringifiedOutput;
                const finalResponse = targetResponse;
                if (!stringifiedOutput) {
                    logger_1.default.debug('[GOAT] Target response output is not a string or JSON', {
                        response: targetResponse,
                    });
                    continue;
                }
                messages.push({
                    role: 'assistant',
                    content: stringifiedOutput,
                });
                // Store the attack response for potential unblocking in next turn
                previousTargetOutput = stringifiedOutput;
                lastTargetResponse = finalResponse;
                const grader = assertToUse ? getGraderById(assertToUse.type) : undefined;
                if (test && grader && finalOutput) {
                    const { grade } = await grader.getResult(attackerMessage.content, finalOutput, test, targetProvider, assertToUse && 'value' in assertToUse ? assertToUse.value : undefined, additionalRubric);
                    graderPassed = grade.pass;
                    storedGraderResult = grade;
                }
                if (graderPassed === false) {
                    // Record successful attack
                    this.successfulAttacks.push({
                        turn,
                        prompt: attackerMessage.content,
                        response: stringifiedOutput,
                    });
                    // Only break early if continueAfterSuccess is false
                    if (this.config.continueAfterSuccess) {
                        // Continue to next turn
                    }
                    else {
                        break;
                    }
                }
            }
            catch (err) {
                logger_1.default.error(`Error in GOAT turn ${turn}: ${err}`);
            }
        }
        return {
            output: (0, shared_1.getLastMessageContent)(messages, 'assistant') || '',
            metadata: {
                redteamFinalPrompt: (0, shared_1.getLastMessageContent)(messages, 'user') || '',
                messages: messages,
                stopReason: this.successfulAttacks.length > 0 && !this.config.continueAfterSuccess
                    ? 'Grader failed'
                    : 'Max turns reached',
                redteamHistory: (0, shared_1.messagesToRedteamHistory)(messages),
                successfulAttacks: this.successfulAttacks,
                totalSuccessfulAttacks: this.successfulAttacks.length,
                storedGraderResult,
            },
            tokenUsage: totalTokenUsage,
            guardrails: lastTargetResponse?.guardrails,
        };
    }
}
exports.default = GoatProvider;
//# sourceMappingURL=goat.js.map