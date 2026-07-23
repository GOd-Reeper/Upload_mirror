import { NextRequest, NextResponse } from "next/server";
import { 
  S3Client, 
  CreateMultipartUploadCommand,
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
    const body = await request.json();
    const { 
      fileName, 
      fileSize, 
      contentType, 
      destinationPath, 
      credentials,
      totalChunks 
    } = body;

    if (!fileName || !credentials) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

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
    const key = cleanPath ? `${cleanPath}/${fileName}` : fileName;

    // Create multipart upload
    const createMultipartCommand = new CreateMultipartUploadCommand({
      Bucket: bucket_name,
      Key: key,
      ContentType: contentType || 'application/octet-stream',
    });

    const multipartResponse = await s3Client.send(createMultipartCommand);

    return NextResponse.json({
      success: true,
      uploadId: multipartResponse.UploadId,
      key,
      bucket: bucket_name,
      totalChunks,
      fileSize,
    });

  } catch (error: unknown) {
    console.error("Init multipart upload error:", error);
    
    let errorMessage = "Failed to initialize upload";
    
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

