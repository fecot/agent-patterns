import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/**
 * 生成物の保存先抽象 (引き継ぎドキュメント §14.2)。
 * 上位（Worker）は S3/MinIO の差を意識しない。
 */
export interface FileStore {
  put(key: string, contentType: string, body: Buffer): Promise<void>;
}

/** MinIO(S3 互換) への保存。env から接続情報を読む。 */
export class MinioFileStore implements FileStore {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    this.bucket = process.env.MINIO_BUCKET ?? "generated-files";
    this.client = new S3Client({
      endpoint: process.env.MINIO_ENDPOINT ?? "http://minio:9000",
      region: "us-east-1",
      forcePathStyle: true, // MinIO は path-style を使う。
      credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY ?? "minioadmin",
        secretAccessKey: process.env.MINIO_SECRET_KEY ?? "minioadmin",
      },
    });
  }

  async put(key: string, contentType: string, body: Buffer): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }
}
