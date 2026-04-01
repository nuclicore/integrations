import type { IntegrationClient } from '../client';
import type {
  ChatParams,
  ChatResult,
  StreamParams,
  EmbedParams,
  EmbedResult,
  IntegrationResponse,
} from '../types';

export class AiModule {
  private client: IntegrationClient;

  constructor(client: IntegrationClient) {
    this.client = client;
  }

  async chat(params: ChatParams): Promise<IntegrationResponse<ChatResult>> {
    if (!params.messages || params.messages.length === 0) {
      return { success: false, error: 'At least one message is required' };
    }

    return this.client.request<ChatResult>('/v1/ai/chat', params);
  }

  async stream(params: StreamParams): Promise<IntegrationResponse<ChatResult>> {
    if (!params.messages || params.messages.length === 0) {
      return { success: false, error: 'At least one message is required' };
    }

    const { onChunk, ...rest } = params;
    const response = await this.client.requestStream('/v1/ai/chat', { ...rest, stream: true });

    if (!response.ok) {
      const result = (await response.json()) as Record<string, unknown>;
      const errorMessage =
        (result.message as string) ||
        (result.error as string) ||
        'Stream request failed';
      return { success: false, error: errorMessage };
    }

    if (!response.body) {
      return { success: false, error: 'No response body for streaming' };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let aggregatedContent = '';
    let finalResult: ChatResult | undefined;

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (!line.startsWith('data: ')) {
          continue;
        }

        const raw = line.slice(6).trim();

        if (raw === '[DONE]') {
          continue;
        }

        try {
          const parsed = JSON.parse(raw) as Record<string, unknown>;

          if (typeof parsed.content === 'string') {
            onChunk(parsed.content);
            aggregatedContent += parsed.content;
          }

          if (parsed.model && parsed.usage) {
            finalResult = {
              content: aggregatedContent,
              model: parsed.model as string,
              usage: parsed.usage as ChatResult['usage'],
            };
          }
        } catch {
          // non-JSON SSE lines are silently skipped
        }
      }
    }

    if (!finalResult) {
      finalResult = {
        content: aggregatedContent,
        model: '',
        usage: { inputTokens: 0, outputTokens: 0 },
      };
    }

    return { success: true, data: finalResult };
  }

  async embed(params: EmbedParams): Promise<IntegrationResponse<EmbedResult>> {
    const inputIsEmpty =
      !params.input ||
      (Array.isArray(params.input) && params.input.length === 0) ||
      (typeof params.input === 'string' && params.input.trim().length === 0);

    if (inputIsEmpty) {
      return { success: false, error: 'Input is required' };
    }

    return this.client.request<EmbedResult>('/v1/ai/embed', params);
  }
}
