import type { ApiProvider, CallApiContextParams, CallApiOptionsParams, ProviderOptions, ProviderResponse, TokenUsage } from '../types/index';
export type Message = {
    role: 'user' | 'assistant' | 'system';
    content: string;
};
type AgentProviderOptions = ProviderOptions & {
    config?: {
        userProvider?: ProviderOptions;
        instructions?: string;
        maxTurns?: number;
        stateful?: boolean;
    };
};
/**
 * TODO(Will): Ideally this class is an Abstract Base Class that's implemented by the
 * Redteam and Non-Redteam SimulatedUser Providers. Address this in a follow-up PR.
 */
export declare class SimulatedUser implements ApiProvider {
    private readonly identifier;
    private readonly maxTurns;
    private readonly rawInstructions;
    private readonly stateful;
    /**
     * Because the SimulatedUser is inherited by the RedteamMischievousUserProvider, and different
     * Cloud tasks are used for each, the taskId needs to be explicitly defined/scoped.
     */
    readonly taskId: string;
    constructor({ id, label, config }: AgentProviderOptions);
    id(): string;
    private sendMessageToUser;
    private sendMessageToAgent;
    callApi(_prompt: string, context?: CallApiContextParams, _callApiOptions?: CallApiOptionsParams): Promise<ProviderResponse>;
    toString(): string;
    serializeOutput(messages: Message[], tokenUsage: TokenUsage, finalTargetResponse: ProviderResponse): {
        output: string;
        tokenUsage: {
            prompt?: number | undefined;
            completion?: number | undefined;
            cached?: number | undefined;
            total?: number | undefined;
            numRequests?: number | undefined;
            completionDetails?: {
                reasoning?: number | undefined;
                acceptedPrediction?: number | undefined;
                rejectedPrediction?: number | undefined;
            } | undefined;
            assertions?: {
                prompt?: number | undefined;
                completion?: number | undefined;
                cached?: number | undefined;
                total?: number | undefined;
                numRequests?: number | undefined;
                completionDetails?: {
                    reasoning?: number | undefined;
                    acceptedPrediction?: number | undefined;
                    rejectedPrediction?: number | undefined;
                } | undefined;
            } | undefined;
        };
        metadata: {
            messages: Message[];
        };
        guardrails: import("../types/providers").GuardrailResponse | undefined;
    };
}
export {};
//# sourceMappingURL=simulatedUser.d.ts.map