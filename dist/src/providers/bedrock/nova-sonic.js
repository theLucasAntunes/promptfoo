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
exports.NovaSonicProvider = void 0;
const node_buffer_1 = require("node:buffer");
const node_crypto_1 = require("node:crypto");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const logger_1 = __importDefault(require("../../logger"));
const tokenUsageUtils_1 = require("../../util/tokenUsageUtils");
const _1 = require(".");
const DEFAULT_CONFIG = {
    inference: {
        maxTokens: 1024,
        topP: 0.9,
        temperature: 0.7,
    },
    audio: {
        input: {
            audioType: 'SPEECH',
            encoding: 'base64',
            mediaType: 'audio/lpcm',
            sampleRateHertz: 8000,
            sampleSizeBits: 16,
            channelCount: 1,
        },
        output: {
            audioType: 'SPEECH',
            encoding: 'base64',
            mediaType: 'audio/lpcm',
            sampleRateHertz: 16000,
            sampleSizeBits: 16,
            channelCount: 1,
            voiceId: 'tiffany',
        },
    },
    text: {
        mediaType: 'text/plain',
    },
};
class NovaSonicProvider extends _1.AwsBedrockGenericProvider {
    constructor(modelName = 'amazon.nova-sonic-v1:0', options = {}) {
        super(modelName, options);
        this.sessions = new Map();
        this.config = options.config;
    }
    async getBedrockClient() {
        if (this.bedrockClient) {
            return this.bedrockClient;
        }
        try {
            const { BedrockRuntimeClient } = await Promise.resolve().then(() => __importStar(require('@aws-sdk/client-bedrock-runtime')));
            const { NodeHttp2Handler } = await Promise.resolve().then(() => __importStar(require('@smithy/node-http-handler')));
            this.bedrockClient = new BedrockRuntimeClient({
                region: this.getRegion(),
                requestHandler: new NodeHttp2Handler({
                    requestTimeout: 300000,
                    sessionTimeout: 300000,
                    disableConcurrentStreams: false,
                    maxConcurrentStreams: 20,
                }),
            });
            return this.bedrockClient;
        }
        catch (err) {
            logger_1.default.error(`Error loading AWS SDK packages: ${err}`);
            throw new Error('The @aws-sdk/client-bedrock-runtime and @smithy/node-http-handler packages are required for Nova Sonic provider. Please install them: npm install @aws-sdk/client-bedrock-runtime @smithy/node-http-handler');
        }
    }
    createSession(sessionId = (0, node_crypto_1.randomUUID)()) {
        if (this.sessions.has(sessionId)) {
            throw new Error(`Session ${sessionId} already exists`);
        }
        const session = {
            queue: [],
            queueSignal: new rxjs_1.Subject(),
            closeSignal: new rxjs_1.Subject(),
            responseHandlers: new Map(),
            isActive: true,
            audioContentId: (0, node_crypto_1.randomUUID)(),
            promptName: (0, node_crypto_1.randomUUID)(),
        };
        this.sessions.set(sessionId, session);
        return session;
    }
    async sendEvent(sessionId, event) {
        if (Object.keys(event.event)[0] !== 'audioInput') {
            logger_1.default.debug('sendEvent: ' + Object.keys(event.event)[0]);
        }
        const session = this.sessions.get(sessionId);
        if (!session?.isActive) {
            logger_1.default.error(`Session ${sessionId} is not active`);
            return;
        }
        session.queue.push(event);
        session.queueSignal.next();
    }
    async endSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        else if (!session.isActive) {
            logger_1.default.debug(`Session ${sessionId} is not active`);
            return;
        }
        // Wait a moment for any final events
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await this.sendEvent(sessionId, {
            event: {
                promptEnd: {
                    promptName: session.promptName,
                },
            },
        });
        // Wait for any final events after prompt end
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await this.sendEvent(sessionId, {
            event: {
                sessionEnd: {},
            },
        });
        session.isActive = false;
        logger_1.default.debug('Session closed');
    }
    async sendTextMessage(sessionId, role, prompt) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        const textPromptID = (0, node_crypto_1.randomUUID)();
        logger_1.default.debug('sendTextMessage: ' + prompt);
        this.sendEvent(sessionId, {
            event: {
                contentStart: {
                    promptName: session.promptName,
                    contentName: textPromptID,
                    type: 'TEXT',
                    interactive: false,
                    role,
                    textInputConfiguration: this.config?.textInputConfiguration || DEFAULT_CONFIG.text,
                },
            },
        });
        // Text input content for system prompt
        this.sendEvent(sessionId, {
            event: {
                textInput: {
                    promptName: session.promptName,
                    contentName: textPromptID,
                    content: prompt,
                },
            },
        });
        // Text content end
        this.sendEvent(sessionId, {
            event: {
                contentEnd: {
                    promptName: session.promptName,
                    contentName: textPromptID,
                },
            },
        });
    }
    async sendSystemPrompt(sessionId, prompt) {
        return this.sendTextMessage(sessionId, 'SYSTEM', prompt);
    }
    async sendChatTextHistory(sessionId, role, prompt) {
        return this.sendTextMessage(sessionId, role, prompt);
    }
    async callApi(prompt, context) {
        const sessionId = (0, node_crypto_1.randomUUID)();
        const session = this.createSession(sessionId);
        let assistantTranscript = '';
        let userTranscript = '';
        let audioContent = '';
        let hasAudioContent = false;
        let functionCallOccurred = false;
        logger_1.default.debug('prompt: ' + prompt.slice(0, 1000));
        // Set up event handlers
        session.responseHandlers.set('textOutput', (data) => {
            logger_1.default.debug('textOutput: ' + JSON.stringify(data));
            if (data.role === 'USER') {
                userTranscript += data.content + '\n';
            }
            else if (data.role === 'ASSISTANT') {
                assistantTranscript += data.content + '\n';
            }
        });
        session.responseHandlers.set('contentEnd', async (data) => {
            logger_1.default.debug('contentEnd');
            if (data.stopReason === 'END_TURN') {
                await this.endSession(sessionId);
            }
        });
        session.responseHandlers.set('audioOutput', (data) => {
            hasAudioContent = true;
            logger_1.default.debug('audioOutput');
            audioContent += data.content;
        });
        session.responseHandlers.set('toolUse', async (data) => {
            logger_1.default.debug('toolUse');
            functionCallOccurred = true;
            // const result = await this.handleToolUse(data.toolName, data);
            const result = 'Tool result';
            const toolResultId = (0, node_crypto_1.randomUUID)();
            await this.sendEvent(sessionId, {
                event: {
                    contentStart: {
                        promptName: session.promptName,
                        contentName: toolResultId,
                        interactive: false,
                        type: 'TOOL',
                        role: 'TOOL',
                        toolResultInputConfiguration: {
                            toolUseId: data.toolUseId,
                            type: 'TEXT',
                            textInputConfiguration: {
                                mediaType: 'text/plain',
                            },
                        },
                    },
                },
            });
            await this.sendEvent(sessionId, {
                event: {
                    toolResult: {
                        promptName: session.promptName,
                        contentName: toolResultId,
                        content: JSON.stringify(result),
                    },
                },
            });
            await this.sendEvent(sessionId, {
                event: {
                    contentEnd: {
                        promptName: session.promptName,
                        contentName: toolResultId,
                    },
                },
            });
        });
        try {
            // Get the Bedrock client and command class
            const bedrockClient = await this.getBedrockClient();
            const { InvokeModelWithBidirectionalStreamCommand } = await Promise.resolve().then(() => __importStar(require('@aws-sdk/client-bedrock-runtime')));
            // Process response stream
            const request = bedrockClient.send(new InvokeModelWithBidirectionalStreamCommand({
                modelId: this.modelName,
                body: this.createAsyncIterable(sessionId),
            }));
            logger_1.default.debug('Sending sessionStart');
            // Initialize session
            await this.sendEvent(sessionId, {
                event: {
                    sessionStart: {
                        inferenceConfiguration: this.config?.interfaceConfig || DEFAULT_CONFIG.inference,
                    },
                },
            });
            logger_1.default.debug('Sending promptStart');
            // Start prompt
            await this.sendEvent(sessionId, {
                event: {
                    promptStart: {
                        promptName: session.promptName,
                        textOutputConfiguration: this.config?.textOutputConfiguration || DEFAULT_CONFIG.text,
                        audioOutputConfiguration: this.config?.audioOutputConfiguration || DEFAULT_CONFIG.audio.output,
                        ...(this.config?.toolConfig && { toolConfiguration: this.config?.toolConfig }),
                    },
                },
            });
            logger_1.default.debug('Sending system prompt');
            await this.sendSystemPrompt(sessionId, context?.test?.metadata?.systemPrompt || '');
            logger_1.default.debug('Processing conversation history');
            let promptText = prompt;
            try {
                // Check if the prompt is a JSON string
                const parsedPrompt = JSON.parse(prompt);
                if (Array.isArray(parsedPrompt)) {
                    // Handle array of messages format
                    for (const [index, message] of parsedPrompt.entries()) {
                        if (message.role !== 'system' && index !== parsedPrompt.length - 1) {
                            await this.sendTextMessage(sessionId, message.role.toUpperCase(), message.content[0].text);
                        }
                    }
                    promptText = parsedPrompt[parsedPrompt.length - 1].content[0].text;
                }
            }
            catch (err) {
                logger_1.default.error(`Error processing conversation history: ${err}`);
            }
            logger_1.default.debug('Sending audioInput start');
            // Send prompt content
            await this.sendEvent(sessionId, {
                event: {
                    contentStart: {
                        promptName: session.promptName,
                        contentName: session.audioContentId,
                        type: 'AUDIO',
                        interactive: true,
                        role: 'USER',
                        audioInputConfiguration: this.config?.audioInputConfiguration || DEFAULT_CONFIG.audio.input,
                    },
                },
            });
            logger_1.default.debug('Sending audioInput chunks');
            // Send the actual prompt
            const chunks = promptText?.match(/.{1,1024}/g)?.map((chunk) => node_buffer_1.Buffer.from(chunk)) || [];
            logger_1.default.debug('audioInput in chunks: ' + chunks.length);
            for (const chunk of chunks) {
                await this.sendEvent(sessionId, {
                    event: {
                        audioInput: {
                            promptName: session.promptName,
                            contentName: session.audioContentId,
                            content: chunk.toString(),
                        },
                    },
                });
                await new Promise((resolve) => setTimeout(resolve, 30));
            }
            logger_1.default.debug('Sending audioInput end');
            // End content and prompt
            await this.sendEvent(sessionId, {
                event: {
                    contentEnd: {
                        promptName: session.promptName,
                        contentName: session.audioContentId,
                    },
                },
            });
            const response = await request;
            if (response.body) {
                for await (const event of response.body) {
                    if (!session.isActive) {
                        break;
                    }
                    if (event.chunk?.bytes) {
                        const data = JSON.parse(new TextDecoder().decode(event.chunk.bytes));
                        const eventType = Object.keys(data.event || {})[0];
                        logger_1.default.debug('processing eventType: ' + eventType);
                        const handler = session.responseHandlers.get(eventType);
                        if (handler) {
                            await handler(data.event[eventType]);
                        }
                    }
                }
            }
            const audioConfig = this.config?.audioOutputConfiguration || DEFAULT_CONFIG.audio.output;
            const audioOutput = hasAudioContent && audioContent
                ? {
                    audio: {
                        data: this.convertRawToWav(node_buffer_1.Buffer.from(audioContent, 'base64'), audioConfig.sampleRateHertz, audioConfig.sampleSizeBits, audioConfig.channelCount).toString('base64'),
                        format: 'wav',
                        transcript: assistantTranscript,
                    },
                    userTranscript,
                }
                : {};
            return {
                output: assistantTranscript || '[No response received from API]',
                ...audioOutput,
                // TODO: Add proper token usage tracking
                tokenUsage: (0, tokenUsageUtils_1.createEmptyTokenUsage)(),
                cached: false,
                metadata: {
                    ...audioOutput,
                    functionCallOccurred,
                },
            };
        }
        catch (error) {
            logger_1.default.error('Error in nova-sonic provider: ' + JSON.stringify(error));
            return {
                error: error instanceof Error ? error.message : String(error),
                metadata: {},
            };
        }
        finally {
            await this.endSession(sessionId);
            this.sessions.delete(sessionId);
        }
    }
    createAsyncIterable(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        return {
            [Symbol.asyncIterator]: () => ({
                async next() {
                    if (!session.isActive) {
                        return { done: true, value: undefined };
                    }
                    if (session.queue.length === 0) {
                        try {
                            await Promise.race([
                                (0, rxjs_1.firstValueFrom)(session.queueSignal.pipe((0, operators_1.take)(1))),
                                (0, rxjs_1.firstValueFrom)(session.closeSignal.pipe((0, operators_1.take)(1))),
                            ]);
                        }
                        catch {
                            return { done: true, value: undefined };
                        }
                    }
                    const nextEvent = session.queue.shift();
                    if (nextEvent) {
                        return {
                            value: {
                                chunk: {
                                    bytes: new TextEncoder().encode(JSON.stringify(nextEvent)),
                                },
                            },
                            done: false,
                        };
                    }
                    else {
                        return { done: true, value: undefined };
                    }
                },
            }),
        };
    }
    convertRawToWav(audioData, sampleRate = 8000, bitsPerSample = 16, channels = 1) {
        const dataLength = audioData.length;
        const fileLength = 44 + dataLength;
        const header = node_buffer_1.Buffer.alloc(44);
        // RIFF header
        header.write('RIFF', 0);
        header.writeUInt32LE(fileLength - 8, 4);
        header.write('WAVE', 8);
        // fmt chunk
        header.write('fmt ', 12);
        header.writeUInt32LE(16, 16); // fmt chunk size
        header.writeUInt16LE(1, 20); // PCM format
        header.writeUInt16LE(channels, 22); // number of channels
        header.writeUInt32LE(sampleRate, 24); // sample rate
        header.writeUInt32LE((sampleRate * channels * bitsPerSample) / 8, 28); // byte rate
        header.writeUInt16LE((channels * bitsPerSample) / 8, 32); // block align
        header.writeUInt16LE(bitsPerSample, 34); // bits per sample
        // data chunk
        header.write('data', 36);
        header.writeUInt32LE(dataLength, 40);
        return node_buffer_1.Buffer.concat([header, audioData]);
    }
}
exports.NovaSonicProvider = NovaSonicProvider;
//# sourceMappingURL=nova-sonic.js.map