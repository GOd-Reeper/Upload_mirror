import { NextRequest, NextResponse } from "next/server";
import { S3Client, ListObjectsV2Command, HeadBucketCommand } from "@aws-sdk/client-s3";

// Validate and normalize S3 endpoint URL for Supabase
function normalizeSupabaseEndpoint(endpoint: string): { url: string; region: string } {
  // Remove trailing slashes
  let normalizedUrl = endpoint.replace(/\/+$/, "");
  
  // Extract project reference from various URL formats
  // Common incorrect formats:
  // - https://<project-ref>.storage.supabase.co/storage/v1/s3 (WRONG - has "storage." subdomain)
  // - https://<project-ref>.supabase.co (missing path)
  // Correct format:
  // - https://<project-ref>.supabase.co/storage/v1/s3
  
  // First, check for the incorrect "storage.supabase.co" format
  const storageSubdomainPattern = /https?:\/\/([a-zA-Z0-9-]+)\.storage\.supabase\.co/;
  const storageMatch = normalizedUrl.match(storageSubdomainPattern);
  
  if (storageMatch) {
    const projectRef = storageMatch[1];
    // Fix the incorrect format - remove "storage." subdomain
    normalizedUrl = `https://${projectRef}.supabase.co/storage/v1/s3`;
    return { url: normalizedUrl, region: "auto" };
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
    return { url: normalizedUrl, region: "auto" };
  }
  
  // For non-Supabase S3 endpoints, return as-is
  return { url: normalizedUrl, region: "auto" };
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

    // Validate endpoint URL format
    if (!s3_endpoint.startsWith("http://") && !s3_endpoint.startsWith("https://")) {
      return NextResponse.json(
        { success: false, error: "S3 endpoint must start with http:// or https://" },
        { status: 400 }
      );
    }

    // Normalize the endpoint
    const { url: normalizedEndpoint, region } = normalizeSupabaseEndpoint(s3_endpoint);
    
    console.log("S3 Test - Original endpoint:", s3_endpoint);
    console.log("S3 Test - Normalized endpoint:", normalizedEndpoint);
    console.log("S3 Test - Bucket:", bucket_name);

    // Create S3 client with proper configuration for Supabase
    const s3Client = new S3Client({
      region: region,
      endpoint: normalizedEndpoint,
      credentials: {
        accessKeyId: s3_access_key,
        secretAccessKey: s3_secret_key,
      },
      forcePathStyle: true, // Required for Supabase S3
    });

    // First, try to check if bucket exists using HeadBucket
    // This is faster and more reliable than listing objects
    try {
      const headCommand = new HeadBucketCommand({
        Bucket: bucket_name,
      });
      await s3Client.send(headCommand);
    } catch (headError: unknown) {
      // If HeadBucket fails, try listing objects as fallback
      // Some S3-compatible services don't support HeadBucket
      const listCommand = new ListObjectsV2Command({
        Bucket: bucket_name,
        MaxKeys: 1,
      });
      await s3Client.send(listCommand);
    }

    return NextResponse.json({
      success: true,
      message: "Connection successful",
      endpoint: normalizedEndpoint,
    });
  } catch (error: unknown) {
    // Log the full error details for debugging
    console.error("S3 connection test failed:", error);
    
    // Try to get the raw response if available
    if (error && typeof error === 'object' && '$response' in error) {
      const rawResponse = (error as { $response?: { body?: unknown } }).$response;
      if (rawResponse?.body) {
        console.error("Raw S3 response body:", rawResponse.body);
      }
    }
    
    // Parse error for better user feedback
    let errorMessage = "Connection failed";
    let hint = "";
    
    if (error instanceof Error) {
      const errMsg = error.message;
      
      // Try to get more details from the raw response
      let rawBody = "";
      if (error && typeof error === 'object' && '$response' in error) {
        const rawResponse = (error as { $response?: { body?: string } }).$response;
        if (rawResponse?.body && typeof rawResponse.body === 'string') {
          rawBody = rawResponse.body;
        }
      }
      
      // Check for common error patterns
      if (rawBody.toLowerCase().includes("project paused") || rawBody.toLowerCase().includes("restore it")) {
        errorMessage = "Supabase project is paused";
        hint = "Your Supabase project is paused. Please visit the Supabase Dashboard to restore it before connecting.";
      } else if (errMsg.includes("char") && errMsg.includes("is not expected")) {
        // This happens when endpoint returns HTML instead of S3 response
        errorMessage = "Invalid S3 endpoint response";
        hint = "The endpoint returned an HTML page instead of S3 response. Please verify the S3 endpoint URL format: https://<project-ref>.supabase.co/storage/v1/s3";
      } else if (errMsg.includes("getaddrinfo") || errMsg.includes("ENOTFOUND")) {
        errorMessage = "Could not reach the S3 endpoint";
        hint = "The endpoint URL may be incorrect or the server is unreachable.";
      } else if (errMsg.includes("403") || errMsg.includes("Forbidden") || errMsg.includes("AccessDenied")) {
        errorMessage = "Access denied";
        hint = "Check your S3 access key and secret key credentials.";
      } else if (errMsg.includes("404") || errMsg.includes("NoSuchBucket") || errMsg.includes("NotFound")) {
        errorMessage = "Bucket not found";
        hint = `The bucket "${error.message.includes("bucket_name") ? "specified" : "hls_media"}" does not exist. Create it first in Supabase Storage.`;
      } else if (errMsg.includes("SignatureDoesNotMatch")) {
        errorMessage = "Invalid credentials";
        hint = "The S3 secret key is incorrect.";
      } else if (errMsg.includes("InvalidAccessKeyId")) {
        errorMessage = "Invalid access key";
        hint = "The S3 access key is incorrect.";
      } else {
        errorMessage = errMsg;
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        hint: hint || undefined,
      },
      { status: 500 }
    );
  }
}

