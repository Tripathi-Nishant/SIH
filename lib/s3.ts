import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getS3Config() {
  const region = process.env.AWS_REGION?.trim();
  const bucket = process.env.AWS_S3_BUCKET?.trim();
  if (!region || !bucket) throw new Error("AWS S3 environment variables are not configured");
  return { region, bucket };
}

export function getS3Client() {
  const { region } = getS3Config();
  return new S3Client({ region });
}

export function getS3Bucket() {
  return getS3Config().bucket;
}

export async function createUploadUrl(key: string, contentType: string) {
  return getSignedUrl(
    getS3Client(),
    new PutObjectCommand({ Bucket: getS3Bucket(), Key: key, ContentType: contentType }),
    { expiresIn: 600 }
  );
}

export async function createDownloadUrl(key: string) {
  return getSignedUrl(
    getS3Client(),
    new GetObjectCommand({ Bucket: getS3Bucket(), Key: key }),
    { expiresIn: 900 }
  );
}

export async function assertS3ObjectExists(key: string) {
  await getS3Client().send(new HeadObjectCommand({ Bucket: getS3Bucket(), Key: key }));
}

export async function deleteS3Object(key: string) {
  await getS3Client().send(new DeleteObjectCommand({ Bucket: getS3Bucket(), Key: key }));
}

export async function downloadS3Object(key: string) {
  return getS3Client().send(new GetObjectCommand({ Bucket: getS3Bucket(), Key: key }));
}
