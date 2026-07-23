import { NextRequest, NextResponse } from "next/server";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

// Validate and normalize S3 endpoint URL for Supabase
function normalizeSupabaseEndpoint(endpoint: string): string {
  let normalizedUrl = endpoint.replace(/\/+$/, "");
  
  // Check for incorrect "storage.supabase.co" format
  const storageSubdomainPattern = /https?:\/\/([a-zA-Z0-9-]+)\.storage\.supabase\.co/;
  const storageMatch = normalizedUrl.match(storageSubdomainPattern);
  
  if (storageMatch) {
    const projectRef = storageMatch[1];
    return `https://${projectRef}.supabase.co/storage/v1/s3`;
  }
  
  // Check for standard supabase.co format
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { s3_endpoint, bucket_name, s3_access_key, s3_secret_key } = body;

    // Validate required fields
    if (!s3_endpoint || !bucket_name || !s3_access_key || !s3_secret_key) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Normalize the endpoint
    const normalizedEndpoint = normalizeSupabaseEndpoint(s3_endpoint);

    // Create S3 client
    const s3Client = new S3Client({
      region: "auto",
      endpoint: normalizedEndpoint,
      credentials: {
        accessKeyId: s3_access_key,
        secretAccessKey: s3_secret_key,
      },
      forcePathStyle: true,
    });

    // Calculate total storage by listing all objects
    let totalSizeBytes = 0;
    let totalObjects = 0;
    let continuationToken: string | undefined;

    do {
      const command = new ListObjectsV2Command({
        Bucket: bucket_name,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      });

      const response = await s3Client.send(command);

      if (response.Contents) {
        for (const object of response.Contents) {
          totalSizeBytes += object.Size || 0;
          totalObjects++;
        }
      }

      continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
    } while (continuationToken);

    // Convert bytes to MB
    const totalSizeMB = Math.round((totalSizeBytes / (1024 * 1024)) * 100) / 100;

    return NextResponse.json({
      success: true,
      used_storage_mb: totalSizeMB,
      total_objects: totalObjects,
      total_size_bytes: totalSizeBytes,
    });
  } catch (error: unknown) {
    console.error("Storage sync error:", error);
    
    let errorMessage = "Failed to sync storage";
    let hint = "";
    let errorCode = "";
    
    // Try to get the raw response body for paused project detection
    let rawBody = "";
    if (error && typeof error === 'object' && '$response' in error) {
      const rawResponse = (error as { $response?: { body?: string } }).$response;
      if (rawResponse?.body && typeof rawResponse.body === 'string') {
        rawBody = rawResponse.body;
      }
    }
    
    if (error instanceof Error) {
      const errMsg = error.message;
      
      // Check for paused project
      if (rawBody.toLowerCase().includes("project paused") || rawBody.toLowerCase().includes("restore it")) {
        errorMessage = "Supabase project is paused";
        hint = "Your Supabase project is paused. Please visit the Supabase Dashboard to restore it.";
        errorCode = "PROJECT_PAUSED";
      } else if (errMsg.includes("char") && errMsg.includes("is not expected")) {
        errorMessage = "Supabase project may be paused";
        hint = "Please check if your Supabase project is paused in the Dashboard.";
        errorCode = "PROJECT_PAUSED";
      } else if (errMsg.includes("getaddrinfo") || errMsg.includes("ENOTFOUND")) {
        errorMessage = "Could not reach the S3 endpoint";
        hint = "The endpoint URL may be incorrect or the server is unreachable.";
        errorCode = "ENDPOINT_UNREACHABLE";
      } else if (errMsg.includes("403") || errMsg.includes("AccessDenied")) {
        errorMessage = "Access denied";
        hint = "Check your S3 credentials.";
        errorCode = "ACCESS_DENIED";
      } else if (errMsg.includes("NoSuchBucket")) {
        errorMessage = "Bucket not found";
        hint = "The bucket does not exist.";
        errorCode = "BUCKET_NOT_FOUND";
      } else {
        errorMessage = errMsg;
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        hint: hint || undefined,
        errorCode: errorCode || undefined,
      },
      { status: 500 }
    );
  }
}

