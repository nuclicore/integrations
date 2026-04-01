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
} from '../types';

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

    return this.client.requestMultipart<UploadResult>('/v1/storage/upload', params);
  }

  async download(params: DownloadParams): Promise<IntegrationResponse<Buffer>> {
    if (!params.path) {
      return { success: false, error: 'Path is required' };
    }

    return this.client.request<Buffer>('/v1/storage/download', params);
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
