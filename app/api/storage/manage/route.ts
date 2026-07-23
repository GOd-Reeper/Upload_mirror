import { NextRequest, NextResponse } from "next/server";
import { 
  S3Client, 
  DeleteObjectCommand, 
  CopyObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  PutObjectCommand
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

// Get public URL for an object - generates proper Supabase Storage public URL
function getPublicUrl(s3_endpoint: string, bucket_name: string, key: string): string {
  // First try to match the storage subdomain pattern (e.g., xxx.storage.supabase.co)
  const storageSubdomainPattern = /https?:\/\/([a-zA-Z0-9-]+)\.storage\.supabase\.co/;
  const storageMatch = s3_endpoint.match(storageSubdomainPattern);
  
  if (storageMatch) {
    const projectRef = storageMatch[1];
    return `https://${projectRef}.supabase.co/storage/v1/object/public/${bucket_name}/${key}`;
  }
  
  // Try to match the standard Supabase URL pattern (e.g., xxx.supabase.co)
  const supabasePattern = /https?:\/\/([a-zA-Z0-9-]+)\.supabase\.co/;
  const match = s3_endpoint.match(supabasePattern);
  
  if (match) {
    const projectRef = match[1];
    return `https://${projectRef}.supabase.co/storage/v1/object/public/${bucket_name}/${key}`;
  }
  
  // Fallback for non-Supabase endpoints
  return `${s3_endpoint}/${bucket_name}/${key}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      action, 
      s3_endpoint, 
      bucket_name, 
      s3_access_key, 
      s3_secret_key,
      key,
      newKey,
      destinationPath
    } = body;

    // Validate required fields
    if (!action || !s3_endpoint || !bucket_name || !s3_access_key || !s3_secret_key) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const s3Client = createS3Client(s3_endpoint, s3_access_key, s3_secret_key);

    switch (action) {
      case "getInfo": {
        // Get file/object info
        if (!key) {
          return NextResponse.json({ success: false, error: "Key is required" }, { status: 400 });
        }

        const command = new HeadObjectCommand({
          Bucket: bucket_name,
          Key: key,
        });

        const response = await s3Client.send(command);
        const publicUrl = getPublicUrl(s3_endpoint, bucket_name, key);

        return NextResponse.json({
          success: true,
          info: {
            key,
            size: response.ContentLength || 0,
            contentType: response.ContentType || "application/octet-stream",
            lastModified: response.LastModified?.toISOString(),
            etag: response.ETag,
            publicUrl,
          },
        });
      }

      case "getUrl": {
        // Get public URL for an object
        if (!key) {
          return NextResponse.json({ success: false, error: "Key is required" }, { status: 400 });
        }

        const publicUrl = getPublicUrl(s3_endpoint, bucket_name, key);

        return NextResponse.json({
          success: true,
          url: publicUrl,
        });
      }

      case "rename": {
        // Rename file or folder
        if (!key || !newKey) {
          return NextResponse.json({ success: false, error: "Key and newKey are required" }, { status: 400 });
        }

        // Check if it's a folder (ends with /)
        const isFolder = key.endsWith("/");

        if (isFolder) {
          // For folders, we need to copy all objects with the prefix and delete originals
          const listCommand = new ListObjectsV2Command({
            Bucket: bucket_name,
            Prefix: key,
          });

          const listResponse = await s3Client.send(listCommand);
          const objects = listResponse.Contents || [];

          // Copy each object to new location
          for (const obj of objects) {
            if (obj.Key) {
              const newObjKey = obj.Key.replace(key, newKey);
              
              await s3Client.send(new CopyObjectCommand({
                Bucket: bucket_name,
                CopySource: `${bucket_name}/${obj.Key}`,
                Key: newObjKey,
              }));
            }
          }

          // Delete original objects
          if (objects.length > 0) {
            await s3Client.send(new DeleteObjectsCommand({
              Bucket: bucket_name,
              Delete: {
                Objects: objects.map(obj => ({ Key: obj.Key! })),
              },
            }));
          }
        } else {
          // For files, copy to new key and delete original
          await s3Client.send(new CopyObjectCommand({
            Bucket: bucket_name,
            CopySource: `${bucket_name}/${key}`,
            Key: newKey,
          }));

          await s3Client.send(new DeleteObjectCommand({
            Bucket: bucket_name,
            Key: key,
          }));
        }

        return NextResponse.json({
          success: true,
          message: `Renamed ${isFolder ? 'folder' : 'file'} successfully`,
        });
      }

      case "move": {
        // Move file to a different location
        if (!key || destinationPath === undefined) {
          return NextResponse.json({ success: false, error: "Key and destinationPath are required" }, { status: 400 });
        }

        const fileName = key.split("/").pop();
        const newKey = destinationPath ? `${destinationPath}${fileName}` : fileName;

        // Copy to new location
        await s3Client.send(new CopyObjectCommand({
          Bucket: bucket_name,
          CopySource: `${bucket_name}/${key}`,
          Key: newKey,
        }));

        // Delete original
        await s3Client.send(new DeleteObjectCommand({
          Bucket: bucket_name,
          Key: key,
        }));

        return NextResponse.json({
          success: true,
          message: "File moved successfully",
          newKey,
        });
      }

      case "delete": {
        // Delete file or folder
        if (!key) {
          return NextResponse.json({ success: false, error: "Key is required" }, { status: 400 });
        }

        const isFolder = key.endsWith("/");

        if (isFolder) {
          // For folders, delete all objects with the prefix
          const listCommand = new ListObjectsV2Command({
            Bucket: bucket_name,
            Prefix: key,
          });

          const listResponse = await s3Client.send(listCommand);
          const objects = listResponse.Contents || [];

          if (objects.length > 0) {
            await s3Client.send(new DeleteObjectsCommand({
              Bucket: bucket_name,
              Delete: {
                Objects: objects.map(obj => ({ Key: obj.Key! })),
              },
            }));
          }
        } else {
          // Delete single file
          await s3Client.send(new DeleteObjectCommand({
            Bucket: bucket_name,
            Key: key,
          }));
        }

        return NextResponse.json({
          success: true,
          message: `${isFolder ? 'Folder' : 'File'} deleted successfully`,
        });
      }

      case "createFolder": {
        // Create a new folder (empty object with trailing /)
        if (!key) {
          return NextResponse.json({ success: false, error: "Folder path is required" }, { status: 400 });
        }

        const folderKey = key.endsWith("/") ? key : `${key}/`;

        await s3Client.send(new PutObjectCommand({
          Bucket: bucket_name,
          Key: folderKey,
          Body: "",
        }));

        return NextResponse.json({
          success: true,
          message: "Folder created successfully",
        });
      }

      case "copyPath": {
        // Just return the full path (client-side copy to clipboard)
        if (!key) {
          return NextResponse.json({ success: false, error: "Key is required" }, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          path: `${bucket_name}/${key}`,
          fullPath: `/${bucket_name}/${key}`,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: unknown) {
    console.error("Storage manage error:", error);
    
    let errorMessage = "Operation failed";
    
    if (error instanceof Error) {
      const errMsg = error.message;
      
      if (errMsg.includes("AccessDenied") || errMsg.includes("403")) {
        errorMessage = "Access denied - check your credentials";
      } else if (errMsg.includes("NoSuchKey") || errMsg.includes("404")) {
        errorMessage = "File or folder not found";
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

