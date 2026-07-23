import { NextRequest, NextResponse } from "next/server";
import {
  S3Client,
  PutObjectCommand,
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

// Get public URL for an object
function getPublicUrl(s3_endpoint: string, bucket_name: string, key: string): string {
  const storageSubdomainPattern = /https?:\/\/([a-zA-Z0-9-]+)\.storage\.supabase\.co/;
  const storageMatch = s3_endpoint.match(storageSubdomainPattern);

  if (storageMatch) {
    const projectRef = storageMatch[1];
    return `https://${projectRef}.supabase.co/storage/v1/object/public/${bucket_name}/${key}`;
  }

  const supabasePattern = /https?:\/\/([a-zA-Z0-9-]+)\.supabase\.co/;
  const match = s3_endpoint.match(supabasePattern);

  if (match) {
    const projectRef = match[1];
    return `https://${projectRef}.supabase.co/storage/v1/object/public/${bucket_name}/${key}`;
  }

  return `${s3_endpoint}/${bucket_name}/${key}`;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const destinationPath = formData.get('destinationPath') as string;
    const credentialsStr = formData.get('credentials') as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    if (!credentialsStr) {
      return NextResponse.json(
        { success: false, error: "Missing credentials" },
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

    // Build the full key path
    const cleanPath = destinationPath ? destinationPath.replace(/^\/+|\/+$/g, '') : '';
    const key = cleanPath ? `${cleanPath}/${file.name}` : file.name;

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to S3
    await s3Client.send(new PutObjectCommand({
      Bucket: bucket_name,
      Key: key,
      Body: buffer,
      ContentType: file.type || 'application/octet-stream',
    }));

    const publicUrl = getPublicUrl(s3_endpoint, bucket_name, key);

    return NextResponse.json({
      success: true,
      key,
      publicUrl,
      size: file.size,
      contentType: file.type,
    });

  } catch (error: unknown) {
    console.error("Upload error:", error);

    let errorMessage = "Upload failed";

    if (error instanceof Error) {
      const errMsg = error.message;

      if (errMsg.includes("AccessDenied") || errMsg.includes("403")) {
        errorMessage = "Access denied - check your credentials";
      } else if (errMsg.includes("NoSuchBucket")) {
        errorMessage = "Bucket not found";
      } else if (errMsg.includes("EntityTooLarge")) {
        errorMessage = "File too large for single upload";
      } else {
        errorMessage = errMsg;
      }
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
