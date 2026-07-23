import { NextRequest, NextResponse } from "next/server";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

interface StorageFile {
  name: string;
  size: number;
  type: "folder" | "video" | "audio" | "playlist" | "other";
  lastModified?: string;
}

// Validate and normalize S3 endpoint URL for Supabase
function normalizeSupabaseEndpoint(endpoint: string): string {
  // Remove trailing slashes
  let normalizedUrl = endpoint.replace(/\/+$/, "");
  
  // First, check for the incorrect "storage.supabase.co" format
  const storageSubdomainPattern = /https?:\/\/([a-zA-Z0-9-]+)\.storage\.supabase\.co/;
  const storageMatch = normalizedUrl.match(storageSubdomainPattern);
  
  if (storageMatch) {
    const projectRef = storageMatch[1];
    // Fix the incorrect format - remove "storage." subdomain
    return `https://${projectRef}.supabase.co/storage/v1/s3`;
  }
  
  // Check for standard supabase.co format
  const supabasePattern = /https?:\/\/([a-zA-Z0-9-]+)\.supabase\.co/;
  const match = normalizedUrl.match(supabasePattern);
  
  if (match) {
    const projectRef = match[1];
    // Ensure the endpoint ends with /storage/v1/s3
    if (!normalizedUrl.includes("/storage/v1/s3")) {
      normalizedUrl = `https://${projectRef}.supabase.co/storage/v1/s3`;
    }
  }
  
  return normalizedUrl;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { s3_endpoint, bucket_name, s3_access_key, s3_secret_key, prefix = "" } = body;

    // Validate required fields
    if (!s3_endpoint || !bucket_name || !s3_access_key || !s3_secret_key) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Normalize the endpoint
    const normalizedEndpoint = normalizeSupabaseEndpoint(s3_endpoint);

    // Create S3 client with proper configuration for Supabase
    const s3Client = new S3Client({
      region: "auto",
      endpoint: normalizedEndpoint,
      credentials: {
        accessKeyId: s3_access_key,
        secretAccessKey: s3_secret_key,
      },
      forcePathStyle: true, // Required for Supabase S3
    });

    // List objects
    const command = new ListObjectsV2Command({
      Bucket: bucket_name,
      Prefix: prefix,
      Delimiter: "/",
      MaxKeys: 1000,
    });

    const response = await s3Client.send(command);

    const files: StorageFile[] = [];

    // Add folders (common prefixes)
    if (response.CommonPrefixes) {
      for (const commonPrefix of response.CommonPrefixes) {
        if (commonPrefix.Prefix) {
          const folderName = commonPrefix.Prefix.replace(prefix, "").replace("/", "");
          if (folderName) {
            files.push({
              name: folderName,
              size: 0,
              type: "folder",
            });
          }
        }
      }
    }

    // Add files
    if (response.Contents) {
      for (const object of response.Contents) {
        if (object.Key && object.Key !== prefix) {
          const fileName = object.Key.replace(prefix, "");
          
          // Skip if it's a folder marker
          if (fileName.endsWith("/") || !fileName) continue;

          // Determine file type
          let type: StorageFile["type"] = "other";
          if (fileName.endsWith(".ts")) type = "video";
          else if (fileName.endsWith(".aac") || fileName.endsWith(".mp3")) type = "audio";
          else if (fileName.endsWith(".m3u8")) type = "playlist";
          else if (fileName.endsWith(".vtt") || fileName.endsWith(".srt")) type = "other";

          files.push({
            name: fileName,
            size: object.Size || 0,
            type,
            lastModified: object.LastModified?.toISOString(),
          });
        }
      }
    }

    // Sort: folders first, then by name
    files.sort((a, b) => {
      if (a.type === "folder" && b.type !== "folder") return -1;
      if (a.type !== "folder" && b.type === "folder") return 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({
      success: true,
      files,
      count: files.length,
    });
  } catch (error: unknown) {
    console.error("S3 list error:", error);
    
    // Parse error for better user feedback
    let errorMessage = "Failed to list files";
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
      
      // Check for paused project first (from raw response)
      if (rawBody.toLowerCase().includes("project paused") || rawBody.toLowerCase().includes("restore it")) {
        errorMessage = "Supabase project is paused";
        hint = "Your Supabase project is paused. Please visit the Supabase Dashboard to restore it.";
        errorCode = "PROJECT_PAUSED";
      }
      // Check for common error patterns
      else if (errMsg.includes("char") && errMsg.includes("is not expected")) {
        // This happens when endpoint returns HTML instead of S3 response
        // Could also be a paused project
        errorMessage = "Supabase project may be paused";
        hint = "The endpoint returned an unexpected response. Please check if your Supabase project is paused in the Dashboard.";
        errorCode = "PROJECT_PAUSED";
      } else if (errMsg.includes("getaddrinfo") || errMsg.includes("ENOTFOUND")) {
        errorMessage = "Could not reach the S3 endpoint";
        hint = "The endpoint URL may be incorrect or the server is unreachable.";
        errorCode = "ENDPOINT_UNREACHABLE";
      } else if (errMsg.includes("403") || errMsg.includes("Forbidden") || errMsg.includes("AccessDenied")) {
        errorMessage = "Access denied";
        hint = "Check your S3 access key and secret key credentials.";
        errorCode = "ACCESS_DENIED";
      } else if (errMsg.includes("404") || errMsg.includes("NoSuchBucket") || errMsg.includes("NotFound")) {
        errorMessage = "Bucket not found";
        hint = "The specified bucket does not exist. Create it first in Supabase Storage.";
        errorCode = "BUCKET_NOT_FOUND";
      } else if (errMsg.includes("SignatureDoesNotMatch")) {
        errorMessage = "Invalid credentials";
        hint = "The S3 secret key is incorrect.";
        errorCode = "INVALID_CREDENTIALS";
      } else if (errMsg.includes("InvalidAccessKeyId")) {
        errorMessage = "Invalid access key";
        hint = "The S3 access key is incorrect.";
        errorCode = "INVALID_ACCESS_KEY";
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

