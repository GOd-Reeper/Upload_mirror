import { NextRequest, NextResponse } from "next/server";
import {
  S3Client,
  UploadPartCommand,
} from "@aws-sdk/client-s3";

// Normalize S3 endpoint URL for Supabase
function normalizeSupabaseEndpoint(endpoint: string): string {
  let normalizedUrl = endpoint.replace(/\/+$/, "");

  const storageSubdomainPattern = /https?:\/\/([a-zA-Z0-9-]+)\.storage\.supabase\.co/;
  const storageMatch = normalizedUrl.match(storageSubdomainPattern);

  if (storageMatch) {
    const projectRef = storageMatch[1];
    return `https://${projectRef}.supabase.co/storage/v1/s3`;
  }

  const supabasePattern = /https?:\/\/([a-zA-Z0-9-]+)\.supabase\.co/;
  const match = normalizedUrl.match(supabasePattern);

  if (match) {
    const projectRef = match[1];
    if (!normalizedUrl.includes("/storage/v1/s3")) {
      normalizedUrl = `https://${projectRef}.supabase.co/storage/v1/s3`;
    }
  }

  return normalizedUrl;
}

// Create S3 client
function createS3Client(s3_endpoint: string, s3_access_key: string, s3_secret_key: string) {
  const normalizedEndpoint = normalizeSupabaseEndpoint(s3_endpoint);

  return new S3Client({
    region: "auto",
    endpoint: normalizedEndpoint,
    credentials: {
      accessKeyId: s3_access_key,
      secretAccessKey: s3_secret_key,
    },
    forcePathStyle: true,
  });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const chunk = formData.get('chunk') as File | null;
    const partNumber = parseInt(formData.get('partNumber') as string);
    const uploadId = formData.get('uploadId') as string;
    const key = formData.get('key') as string;
    const credentialsStr = formData.get('credentials') as string;

    if (!chunk || !partNumber || !uploadId || !key || !credentialsStr) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const credentials = JSON.parse(credentialsStr);
    const { s3_endpoint, bucket_name, s3_access_key, s3_secret_key } = credentials;

    if (!s3_endpoint || !bucket_name || !s3_access_key || !s3_secret_key) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 400 }
      );
    }

    const s3Client = createS3Client(s3_endpoint, s3_access_key, s3_secret_key);

    // Convert chunk to buffer
    const buffer = Buffer.from(await chunk.arrayBuffer());

    // Upload the part
    const uploadPartCommand = new UploadPartCommand({
      Bucket: bucket_name,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
      Body: buffer,
    });

    const response = await s3Client.send(uploadPartCommand);

    return NextResponse.json({
      success: true,
      ETag: response.ETag,
      PartNumber: partNumber,
    });

  } catch (error: unknown) {
    console.error("Upload chunk error:", error);

    let errorMessage = "Failed to upload chunk";

    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
