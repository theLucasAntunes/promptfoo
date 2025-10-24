import type { ApiProvider, CallApiContextParams, ProviderResponse } from '../types/index';
import type { EnvOverrides } from '../types/env';
type FalProviderOptions = {
    apiKey?: string;
};
interface FalResult<T = unknown> {
    data: T;
    requestId: string;
}
declare class FalProvider<Input = Record<string, unknown>> implements ApiProvider {
    modelName: string;
    modelType: 'image';
    apiKey?: string;
    config: FalProviderOptions;
    input: Input;
    private fal;
    constructor(modelType: 'image', modelName: string, options?: {
        config?: FalProviderOptions;
        id?: string;
        env?: EnvOverrides;
    });
    id(): string;
    toString(): string;
    callApi(prompt: string, context?: CallApiContextParams): Promise<ProviderResponse>;
    runInference<Result = FalResult<unknown>>(input: Input): Promise<Result>;
}
type FalImageGenerationOptions = FalProviderOptions & {
    seed?: number;
    num_inference_steps?: number;
    guidance_scale?: number;
    image_size?: {
        width: number;
        height: number;
    };
};
type FalImageGenerationInput = FalImageGenerationOptions & {
    prompt: string;
};
interface FalImageOutput {
    images?: Array<{
        url: string;
    }>;
    image?: {
        url: string;
    };
}
export declare class FalImageGenerationProvider extends FalProvider<FalImageGenerationInput> {
    constructor(modelName: string, options?: {
        config?: FalImageGenerationOptions;
        id?: string;
        env?: EnvOverrides;
    });
    toString(): string;
    runInference<Result = string>(input: FalImageGenerationInput): Promise<Result>;
    protected resolveImageUrl(output: FalImageOutput): string;
}
export {};
//# sourceMappingURL=fal.d.ts.map