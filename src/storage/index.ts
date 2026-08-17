import type { IntegrationClient } from '../client';
import type {
  UploadParams,
  UploadResult,
  DownloadParams,
  DeleteParams,
  ListParams,
  ListResult,
  SignedUrlParams,
  SignedUrlResult,
  IntegrationResponse,
  StorageDownloadResult,
} from '../types';

const decodeEnvelopeBuffer = (value: unknown): Buffer | undefined => {
  if (Buffer.isBuffer(value)) {
    return value;
  }
  if (value instanceof Uint8Array) {
    return Buffer.from(value);
  }
  if (Array.isArray(value)) {
    return Buffer.from(value as number[]);
  }
  if (
    value &&
    typeof value === 'object' &&
    Array.isArray((value as { data?: unknown }).data)
  ) {
    return Buffer.from((value as { data: number[] }).data);
  }
  if (typeof value === 'string' && value.length > 0) {
    return Buffer.from(value, 'base64');
  }
  return undefined;
};

export class StorageModule {
  private client: IntegrationClient;

  constructor(client: IntegrationClient) {
    this.client = client;
  }

  async upload(params: UploadParams): Promise<IntegrationResponse<UploadResult>> {
    if (!params.path) {
      return { success: false, error: 'Path is required' };
    }

    if (!params.file) {
      return { success: false, error: 'File is required' };
    }

    if (!params.contentType) {
      return { success: false, error: 'Content type is required' };
    }

    if (Buffer.isBuffer(params.file)) {
      const response = await this.client.requestBinaryUpload('/v1/storage/upload-binary', {
        path: params.path,
        file: params.file,
        contentType: params.contentType,
      });

      if (response.status !== 404 && response.status !== 405) {
        const result = (await response.json()) as Record<string, unknown>;

        if (!response.ok) {
          return {
            success: false,
            error: (result.message as string) || (result.error as string) || 'Request failed',
          };
        }

        return result as unknown as IntegrationResponse<UploadResult>;
      }

      await response.body?.cancel();
    }

    return this.client.requestMultipart<UploadResult>('/v1/storage/upload', params);
  }

  async download(
    params: DownloadParams,
  ): Promise<IntegrationResponse<StorageDownloadResult>> {
    if (!params.path) {
      return { success: false, error: 'Path is required' };
    }

    const response = await this.client.requestBinary(
      '/v1/storage/download',
      params,
    );
    const contentType = response.headers.get('content-type') ?? '';

    if (response.ok && !contentType.includes('application/json')) {
      const arrayBuffer = await response.arrayBuffer();
      return {
        success: true,
        data: {
          buffer: Buffer.from(arrayBuffer),
          contentType: contentType || 'application/octet-stream',
        },
      };
    }

    const result = (await response.json()) as {
      success?: boolean;
      error?: string;
      message?: string;
      data?: { buffer?: unknown; contentType?: string };
    };

    if (!response.ok) {
      return {
        success: false,
        error: result.message || result.error || 'Request failed',
      };
    }

    if (!result.success || !result.data) {
      return { success: false, error: result.error || 'Download failed' };
    }

    const buffer = decodeEnvelopeBuffer(result.data.buffer);
    if (!buffer) {
      return { success: false, error: 'Download returned no file content' };
    }

    return {
      success: true,
      data: { buffer, contentType: result.data.contentType },
    };
  }

  async delete(params: DeleteParams): Promise<IntegrationResponse<void>> {
    if (!params.path) {
      return { success: false, error: 'Path is required' };
    }

    return this.client.requestDelete<void>('/v1/storage/delete', params);
  }

  async list(params: ListParams): Promise<IntegrationResponse<ListResult>> {
    const query = new URLSearchParams();

    if (params.prefix !== undefined) {
      query.set('prefix', params.prefix);
    }

    if (params.limit !== undefined) {
      query.set('limit', String(params.limit));
    }

    if (params.cursor !== undefined) {
      query.set('cursor', params.cursor);
    }

    const queryString = query.toString();
    const endpoint = queryString ? `/v1/storage/list?${queryString}` : '/v1/storage/list';

    return this.client.requestGet<ListResult>(endpoint);
  }

  async getSignedUrl(params: SignedUrlParams): Promise<IntegrationResponse<SignedUrlResult>> {
    if (!params.path) {
      return { success: false, error: 'Path is required' };
    }

    return this.client.request<SignedUrlResult>('/v1/storage/signed-url', params);
  }
}
