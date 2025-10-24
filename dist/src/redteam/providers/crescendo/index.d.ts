import type { ApiProvider, CallApiContextParams, CallApiOptionsParams, GradingResult, ProviderResponse, RedteamFileConfig } from '../../../types/index';
import type { BaseRedteamMetadata } from '../../types';
import type { Message } from '../shared';
/**
 * Represents metadata for the Crescendo conversation process.
 */
interface CrescendoMetadata extends BaseRedteamMetadata {
    crescendoRoundsCompleted: number;
    crescendoBacktrackCount: number;
    crescendoResult: boolean;
    crescendoConfidence: number | null;
    stopReason: 'Grader failed' | 'Internal evaluator success' | 'Max rounds reached' | 'Max backtracks reached';
    successfulAttacks?: Array<{
        turn: number;
        prompt: string;
        response: string;
    }>;
    totalSuccessfulAttacks?: number;
    storedGraderResult?: GradingResult;
}
/**
 * Represents the complete response from a Crescendo conversation.
 */
interface CrescendoResponse extends ProviderResponse {
    metadata: CrescendoMetadata;
}
interface CrescendoConfig {
    injectVar: string;
    maxTurns?: number;
    /** @deprecated Use maxTurns instead */
    maxRounds?: number;
    maxBacktracks?: number;
    redteamProvider: RedteamFileConfig['provider'];
    excludeTargetOutputFromAgenticAttackGeneration?: boolean;
    stateful?: boolean;
    continueAfterSuccess?: boolean;
}
export declare class MemorySystem {
    private conversations;
    addMessage(conversationId: string, message: Message): void;
    getConversation(conversationId: string): Message[];
    duplicateConversationExcludingLastTurn(conversationId: string): string;
}
export declare class CrescendoProvider implements ApiProvider {
    readonly config: CrescendoConfig;
    private readonly nunjucks;
    private userGoal;
    private redTeamProvider;
    private scoringProvider;
    private memory;
    private targetConversationId;
    private redTeamingChatConversationId;
    private maxTurns;
    private maxBacktracks;
    private stateful;
    private excludeTargetOutputFromAgenticAttackGeneration;
    private successfulAttacks;
    constructor(config: CrescendoConfig);
    private getRedTeamProvider;
    private getScoringProvider;
    id(): string;
    callApi(prompt: string, context?: CallApiContextParams, options?: CallApiOptionsParams): Promise<CrescendoResponse>;
    private runAttack;
    private getAttackPrompt;
    private sendPrompt;
    private getRefusalScore;
    private getEvalScore;
    private backtrackMemory;
    private logChatHistory;
    private recordSuccessfulAttack;
}
export {};
//# sourceMappingURL=index.d.ts.map