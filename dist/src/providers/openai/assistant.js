"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAiAssistantProvider = void 0;
const path_1 = __importDefault(require("path"));
const openai_1 = __importDefault(require("openai"));
const cliState_1 = __importDefault(require("../../cliState"));
const esm_1 = require("../../esm");
const logger_1 = __importDefault(require("../../logger"));
const index_1 = require("../../util/index");
const fileExtensions_1 = require("../../util/fileExtensions");
const time_1 = require("../../util/time");
const shared_1 = require("../shared");
const _1 = require(".");
const util_1 = require("./util");
class OpenAiAssistantProvider extends _1.OpenAiGenericProvider {
    constructor(assistantId, options = {}) {
        super(assistantId, options);
        this.loadedFunctionCallbacks = {};
        this.assistantConfig = options.config || {};
        this.assistantId = assistantId;
        // Preload function callbacks if available
        if (this.assistantConfig.functionToolCallbacks) {
            this.preloadFunctionCallbacks();
        }
    }
    /**
     * Preloads all function callbacks to ensure they're ready when needed
     */
    async preloadFunctionCallbacks() {
        if (!this.assistantConfig.functionToolCallbacks) {
            return;
        }
        const callbacks = this.assistantConfig.functionToolCallbacks;
        for (const [name, callback] of Object.entries(callbacks)) {
            try {
                if (typeof callback === 'string') {
                    // Check if it's a file reference
                    const callbackStr = callback;
                    if (callbackStr.startsWith('file://')) {
                        const fn = await this.loadExternalFunction(callbackStr);
                        this.loadedFunctionCallbacks[name] = fn;
                        logger_1.default.debug(`Successfully preloaded function callback '${name}' from file`);
                    }
                    else {
                        // It's an inline function string
                        this.loadedFunctionCallbacks[name] = new Function('return ' + callbackStr)();
                        logger_1.default.debug(`Successfully preloaded inline function callback '${name}'`);
                    }
                }
                else if (typeof callback === 'function') {
                    this.loadedFunctionCallbacks[name] = callback;
                    logger_1.default.debug(`Successfully stored function callback '${name}'`);
                }
            }
            catch (error) {
                logger_1.default.error(`Failed to preload function callback '${name}': ${error}`);
            }
        }
    }
    /**
     * Loads a function from an external file
     * @param fileRef The file reference in the format 'file://path/to/file:functionName'
     * @returns The loaded function
     */
    async loadExternalFunction(fileRef) {
        let filePath = fileRef.slice('file://'.length);
        let functionName;
        if (filePath.includes(':')) {
            const splits = filePath.split(':');
            if (splits[0] && (0, fileExtensions_1.isJavascriptFile)(splits[0])) {
                [filePath, functionName] = splits;
            }
        }
        try {
            const resolvedPath = path_1.default.resolve(cliState_1.default.basePath || '', filePath);
            logger_1.default.debug(`Loading function from ${resolvedPath}${functionName ? `:${functionName}` : ''}`);
            const requiredModule = await (0, esm_1.importModule)(resolvedPath, functionName);
            if (typeof requiredModule === 'function') {
                return requiredModule;
            }
            else if (requiredModule &&
                typeof requiredModule === 'object' &&
                functionName &&
                functionName in requiredModule) {
                const fn = requiredModule[functionName];
                if (typeof fn === 'function') {
                    return fn;
                }
            }
            throw new Error(`Function callback malformed: ${filePath} must export ${functionName
                ? `a named function '${functionName}'`
                : 'a function or have a default export as a function'}`);
        }
        catch (error) {
            throw new Error(`Error loading function from ${filePath}: ${error.message || String(error)}`);
        }
    }
    /**
     * Executes a function callback with proper error handling
     */
    async executeFunctionCallback(functionName, args, context) {
        try {
            // Check if we've already loaded this function
            let callback = this.loadedFunctionCallbacks[functionName];
            // If not loaded yet, try to load it now
            if (!callback) {
                const callbackRef = this.assistantConfig.functionToolCallbacks?.[functionName];
                if (callbackRef && typeof callbackRef === 'string') {
                    const callbackStr = callbackRef;
                    if (callbackStr.startsWith('file://')) {
                        callback = await this.loadExternalFunction(callbackStr);
                    }
                    else {
                        callback = new Function('return ' + callbackStr)();
                    }
                    // Cache for future use
                    this.loadedFunctionCallbacks[functionName] = callback;
                }
                else if (typeof callbackRef === 'function') {
                    callback = callbackRef;
                    this.loadedFunctionCallbacks[functionName] = callback;
                }
            }
            if (!callback) {
                throw new Error(`No callback found for function '${functionName}'`);
            }
            // Execute the callback with explicit context
            // Note: OpenAI assistant provider maintains backward compatibility by parsing args
            logger_1.default.debug(`Executing function '${functionName}' with args: ${args}${context ? ` and context: ${JSON.stringify(context)}` : ''}`);
            let parsedArgs;
            try {
                parsedArgs = JSON.parse(args);
            }
            catch (error) {
                logger_1.default.warn(`Error parsing function arguments for '${functionName}': ${error}`);
                parsedArgs = {};
            }
            const result = await callback(parsedArgs, context);
            // Format the result
            if (result === undefined || result === null) {
                return '';
            }
            else if (typeof result === 'object') {
                try {
                    return JSON.stringify(result);
                }
                catch (error) {
                    logger_1.default.warn(`Error stringifying result from function '${functionName}': ${error}`);
                    return String(result);
                }
            }
            else {
                return String(result);
            }
        }
        catch (error) {
            logger_1.default.error(`Error executing function '${functionName}': ${error.message || String(error)}`);
            return JSON.stringify({
                error: `Error in ${functionName}: ${error.message || String(error)}`,
            });
        }
    }
    async callApi(prompt, context, _callApiOptions) {
        if (!this.getApiKey()) {
            throw new Error('OpenAI API key is not set. Set the OPENAI_API_KEY environment variable or add `apiKey` to the provider config.');
        }
        const openai = new openai_1.default({
            apiKey: this.getApiKey(),
            organization: this.getOrganization(),
            baseURL: this.getApiUrl(),
            maxRetries: 3,
            timeout: shared_1.REQUEST_TIMEOUT_MS,
            defaultHeaders: this.assistantConfig.headers,
        });
        const messages = (0, shared_1.parseChatPrompt)(prompt, [
            {
                role: 'user',
                content: prompt,
                ...(this.assistantConfig.attachments
                    ? { attachments: this.assistantConfig.attachments }
                    : {}),
            },
        ]);
        const body = {
            assistant_id: this.assistantId,
            model: this.assistantConfig.modelName || undefined,
            instructions: this.assistantConfig.instructions || undefined,
            tools: (0, index_1.maybeLoadToolsFromExternalFile)(this.assistantConfig.tools, context?.vars) || undefined,
            metadata: this.assistantConfig.metadata || undefined,
            temperature: this.assistantConfig.temperature || undefined,
            tool_choice: this.assistantConfig.toolChoice || undefined,
            tool_resources: this.assistantConfig.tool_resources || undefined,
            thread: {
                messages,
            },
        };
        let run;
        try {
            run = await openai.beta.threads.createAndRun(body);
        }
        catch (err) {
            return (0, util_1.failApiCall)(err);
        }
        while (true) {
            const currentRun = await openai.beta.threads.runs.retrieve(run.id, {
                thread_id: run.thread_id,
            });
            if (currentRun.status === 'completed') {
                run = currentRun;
                break;
            }
            if (currentRun.status === 'requires_action') {
                const requiredAction = currentRun.required_action;
                if (requiredAction === null || requiredAction.type !== 'submit_tool_outputs') {
                    run = currentRun;
                    break;
                }
                const functionCallsWithCallbacks = requiredAction.submit_tool_outputs.tool_calls.filter((toolCall) => {
                    return (toolCall.type === 'function' &&
                        toolCall.function.name in (this.assistantConfig.functionToolCallbacks ?? {}));
                });
                if (functionCallsWithCallbacks.length === 0) {
                    run = currentRun;
                    break;
                }
                // Build context for function callbacks
                const callbackContext = {
                    threadId: currentRun.thread_id,
                    runId: currentRun.id,
                    assistantId: this.assistantId,
                    provider: 'openai',
                };
                logger_1.default.debug(`Calling functionToolCallbacks for functions: ${functionCallsWithCallbacks.map(({ function: { name } }) => name)}`);
                const toolOutputs = await Promise.all(functionCallsWithCallbacks.map(async (toolCall) => {
                    logger_1.default.debug(`Calling functionToolCallbacks[${toolCall.function.name}]('${toolCall.function.arguments}')`);
                    const functionResult = await this.executeFunctionCallback(toolCall.function.name, toolCall.function.arguments, callbackContext);
                    return {
                        tool_call_id: toolCall.id,
                        output: functionResult,
                    };
                }));
                logger_1.default.debug(`Calling OpenAI API, submitting tool outputs for ${currentRun.thread_id}: ${JSON.stringify(toolOutputs)}`);
                try {
                    run = await openai.beta.threads.runs.submitToolOutputs(currentRun.id, {
                        thread_id: currentRun.thread_id,
                        tool_outputs: toolOutputs,
                    });
                }
                catch (err) {
                    return (0, util_1.failApiCall)(err);
                }
                continue;
            }
            if (currentRun.status === 'failed' ||
                currentRun.status === 'cancelled' ||
                currentRun.status === 'expired') {
                run = currentRun;
                break;
            }
            await (0, time_1.sleep)(1000);
        }
        if (run.status !== 'completed' && run.status !== 'requires_action') {
            if (run.last_error) {
                return {
                    error: `Thread run failed: ${run.last_error.message}`,
                };
            }
            return {
                error: `Thread run failed: ${run.status}`,
            };
        }
        // Get run steps
        logger_1.default.debug(`Calling OpenAI API, getting thread run steps for ${run.thread_id}`);
        let steps;
        try {
            steps = await openai.beta.threads.runs.steps.list(run.id, {
                thread_id: run.thread_id,
                order: 'asc',
            });
        }
        catch (err) {
            return (0, util_1.failApiCall)(err);
        }
        logger_1.default.debug(`\tOpenAI thread run steps API response: ${JSON.stringify(steps)}`);
        const outputBlocks = [];
        for (const step of steps.data) {
            if (step.step_details.type === 'message_creation') {
                logger_1.default.debug(`Calling OpenAI API, getting message ${step.id}`);
                let message;
                try {
                    message = await openai.beta.threads.messages.retrieve(step.step_details.message_creation.message_id, {
                        thread_id: run.thread_id,
                    });
                }
                catch (err) {
                    return (0, util_1.failApiCall)(err);
                }
                logger_1.default.debug(`\tOpenAI thread run step message API response: ${JSON.stringify(message)}`);
                const content = message.content
                    .map((content) => content.type === 'text' ? content.text.value : `<${content.type} output>`)
                    .join('\n');
                outputBlocks.push(`[${(0, shared_1.toTitleCase)(message.role)}] ${content}`);
            }
            else if (step.step_details.type === 'tool_calls') {
                for (const toolCall of step.step_details.tool_calls) {
                    if (toolCall.type === 'function') {
                        outputBlocks.push(`[Call function ${toolCall.function.name} with arguments ${toolCall.function.arguments}]`);
                        outputBlocks.push(`[Function output: ${toolCall.function.output}]`);
                    }
                    else if (toolCall.type === 'file_search') {
                        outputBlocks.push(`[Ran file search]`);
                    }
                    else if (toolCall.type === 'code_interpreter') {
                        const output = toolCall.code_interpreter.outputs
                            .map((output) => (output.type === 'logs' ? output.logs : `<${output.type} output>`))
                            .join('\n');
                        outputBlocks.push(`[Code interpreter input]`);
                        outputBlocks.push(toolCall.code_interpreter.input);
                        outputBlocks.push(`[Code interpreter output]`);
                        outputBlocks.push(output);
                    }
                    else {
                        outputBlocks.push(`[Unknown tool call type: ${toolCall.type}]`);
                    }
                }
            }
            else {
                outputBlocks.push(`[Unknown step type: ${step.step_details.type}]`);
            }
        }
        return {
            output: outputBlocks.join('\n\n').trim(),
            tokenUsage: (0, util_1.getTokenUsage)(run, false),
        };
    }
}
exports.OpenAiAssistantProvider = OpenAiAssistantProvider;
//# sourceMappingURL=assistant.js.map