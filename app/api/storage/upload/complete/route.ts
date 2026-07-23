import { NextRequest, NextResponse } from "next/server";
import { 
  S3Client, 
  CompleteMultipartUploadCommand,
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
    const body = await request.json();
    const { uploadId, key, parts, credentials } = body;

    if (!uploadId || !key || !parts || !credentials) {
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

    // Sort parts by part number
    const sortedParts = parts.sort(
      (a: { PartNumber: number }, b: { PartNumber: number }) => 
        a.PartNumber - b.PartNumber
    );

    // Complete the multipart upload
    const completeCommand = new CompleteMultipartUploadCommand({
      Bucket: bucket_name,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: sortedParts,
      },
    });

    await s3Client.send(completeCommand);

    const publicUrl = getPublicUrl(s3_endpoint, bucket_name, key);

    return NextResponse.json({
      success: true,
      key,
      publicUrl,
    });

  } catch (error: unknown) {
    console.error("Complete multipart upload error:", error);
    
    let errorMessage = "Failed to complete upload";
    
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

