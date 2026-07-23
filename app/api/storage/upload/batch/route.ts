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

interface UploadResult {
  success: boolean;
  fileName: string;
  fileKey: string;
  publicUrl?: string;
  size: number;
  error?: string;
  relativePath?: string;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const paths = formData.getAll('paths') as string[];
    const destinationPath = formData.get('destinationPath') as string || '';
    const credentialsStr = formData.get('credentials') as string;

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: "No files provided" },
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
    const results: UploadResult[] = [];

    // Build the base path
    const basePath = destinationPath ? destinationPath.replace(/^\/+|\/+$/g, '') : '';

    // Upload all files in parallel for maximum speed
    const uploadPromises = files.map(async (file, index) => {
      const relativePath = paths[index] || file.name;

      try {
        // Build the full key path preserving folder structure
        const key = basePath
          ? `${basePath}/${relativePath}`
          : relativePath;

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

        return {
          success: true,
          fileName: file.name,
          fileKey: key,
          publicUrl,
          size: file.size,
          relativePath,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        return {
          success: false,
          fileName: file.name,
          fileKey: '',
          size: file.size,
          error: errorMessage,
          relativePath,
        };
      }
    });

    // Wait for all uploads to complete
    const uploadResults = await Promise.all(uploadPromises);
    results.push(...uploadResults);

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: failCount === 0,
      results,
      summary: {
        total: files.length,
        success: successCount,
        failed: failCount,
      }
    });

  } catch (error: unknown) {
    console.error("Batch upload error:", error);

    let errorMessage = "Batch upload failed";

    if (error instanceof Error) {
      const errMsg = error.message;

      if (errMsg.includes("AccessDenied") || errMsg.includes("403")) {
        errorMessage = "Access denied - check your credentials";
      } else if (errMsg.includes("NoSuchBucket")) {
        errorMessage = "Bucket not found";
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
