import { AwsClient } from 'aws4fetch';

/** Kho file dạng S3 (Cloudflare R2, MinIO, AWS S3…). Kiểm thử thay bằng bản giả. */
export interface Storage {
  /** Link tải lên trực tiếp từ trình duyệt (PUT), hết hạn sau `expiresIn` giây. */
  presignPut(key: string, contentType: string, expiresIn?: number): Promise<{ url: string; headers: Record<string, string> }>;
  /** Thông tin file đã có trên kho; null nếu chưa có. */
  head(key: string): Promise<{ size: number; contentType: string | null } | null>;
  delete(key: string): Promise<void>;
  /** Địa chỉ công khai để hiển thị file. */
  publicUrl(key: string): string;
}

export interface S3Config {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl: string;
}

/** Đọc cấu hình kho từ biến môi trường; null khi chưa đủ. */
export function s3ConfigFromEnv(env: NodeJS.ProcessEnv = process.env): S3Config | null {
  const { S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, MEDIA_PUBLIC_URL } = env;
  if (!S3_ENDPOINT || !S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY || !MEDIA_PUBLIC_URL) {
    return null;
  }
  return {
    endpoint: S3_ENDPOINT.replace(/\/+$/, ''),
    region: S3_REGION || 'auto',
    bucket: S3_BUCKET,
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
    publicUrl: MEDIA_PUBLIC_URL.replace(/\/+$/, ''),
  };
}

const encodeKey = (key: string) => key.split('/').map(encodeURIComponent).join('/');

/** Kho S3 dùng chữ ký AWS SigV4 (thư viện aws4fetch, nhẹ, không phụ thuộc AWS SDK). */
export function createS3Storage(config: S3Config): Storage {
  const client = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: 's3',
    region: config.region,
  });
  const objectUrl = (key: string) => `${config.endpoint}/${config.bucket}/${encodeKey(key)}`;

  return {
    async presignPut(key, contentType, expiresIn = 600) {
      const url = new URL(objectUrl(key));
      url.searchParams.set('X-Amz-Expires', String(expiresIn));
      const signed = await client.sign(
        new Request(url, { method: 'PUT', headers: { 'Content-Type': contentType } }),
        { aws: { signQuery: true } },
      );
      return { url: signed.url, headers: { 'Content-Type': contentType } };
    },
    async head(key) {
      const res = await client.fetch(objectUrl(key), { method: 'HEAD' });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`Kho media trả về lỗi ${res.status} khi kiểm tra file.`);
      return {
        size: Number(res.headers.get('content-length') ?? 0),
        contentType: res.headers.get('content-type'),
      };
    },
    async delete(key) {
      const res = await client.fetch(objectUrl(key), { method: 'DELETE' });
      if (!res.ok && res.status !== 404) {
        throw new Error(`Kho media trả về lỗi ${res.status} khi xóa file.`);
      }
    },
    publicUrl(key) {
      return `${config.publicUrl}/${encodeKey(key)}`;
    },
  };
}
