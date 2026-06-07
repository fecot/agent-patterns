import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../config/env";

/**
 * 生成物のダウンロード URL を発行する (引き継ぎドキュメント §14.3)。
 * MinIO(S3 互換) の presigned URL を返し、API はファイル本体を中継しない。
 */
const client = new S3Client({
  endpoint: env.MINIO_ENDPOINT,
  region: "us-east-1",
  forcePathStyle: true,
  credentials: {
    accessKeyId: env.MINIO_ACCESS_KEY,
    secretAccessKey: env.MINIO_SECRET_KEY,
  },
});

export async function presignedDownloadUrl(
  key: string,
  expiresInSeconds = 300,
): Promise<string> {
  const command = new GetObjectCommand({ Bucket: env.MINIO_BUCKET, Key: key });
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}
