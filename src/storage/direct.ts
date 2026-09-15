export const toBytes = async (file: Buffer | Blob | ArrayBuffer): Promise<Uint8Array> => {
  if (Buffer.isBuffer(file)) {
    return new Uint8Array(file.buffer, file.byteOffset, file.byteLength);
  }
  if (file instanceof ArrayBuffer) {
    return new Uint8Array(file);
  }
  return new Uint8Array(await file.arrayBuffer());
};

export const putBlob = async (
  url: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<{ ok: boolean; status: number }> => {
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'x-ms-blob-type': 'BlockBlob',
      'x-ms-blob-content-type': contentType,
      'Content-Type': contentType,
      'Content-Length': String(bytes.byteLength),
    },
    body: bytes,
  });
  await response.body?.cancel().catch(() => undefined);
  return { ok: response.ok, status: response.status };
};

export const getBlob = async (
  url: string,
): Promise<{ ok: boolean; status: number; buffer?: Buffer; contentType?: string }> => {
  const response = await fetch(url, { method: 'GET' });
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    return { ok: false, status: response.status };
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    ok: true,
    status: response.status,
    buffer,
    contentType: response.headers.get('content-type') ?? 'application/octet-stream',
  };
};

export const isMissingRoute = (status: number): boolean => status === 404 || status === 405;
