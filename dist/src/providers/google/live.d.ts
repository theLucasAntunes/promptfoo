import type { ApiProvider, CallApiContextParams, ProviderOptions, ProviderResponse } from '../../types/index';
import type { CompletionOptions } from './types';
export declare class GoogleLiveProvider implements ApiProvider {
    config: CompletionOptions;
    modelName: string;
    private loadedFunctionCallbacks;
    constructor(modelName: string, options: ProviderOptions);
    id(): string;
    toString(): string;
    private convertPcmToWav;
    private createWavHeader;
    getApiKey(): string | undefined;
    callApi(prompt: string, context?: CallApiContextParams): Promise<ProviderResponse>;
    /**
     * Loads a function from an external file
     * @param fileRef The file reference in the format 'file://path/to/file:functionName'
     * @returns The loaded function
     */
    private loadExternalFunction;
    /**
     * Executes a function callback with proper error handling
     */
    private executeFunctionCallback;
}
//# sourceMappingURL=live.d.ts.map