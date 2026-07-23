# Generate Test Files for Upload Testing
# This script creates test files and folders for testing the bulk upload feature

param(
    [int]$FileCount = 100,
    [int]$FolderCount = 5,
    [string]$OutputDir = "test-upload-files",
    [string]$TotalSizeMB = 50
)

Write-Host "🚀 Generating test files for upload testing..." -ForegroundColor Cyan
Write-Host "   Files: $FileCount" -ForegroundColor Gray
Write-Host "   Folders: $FolderCount" -ForegroundColor Gray
Write-Host "   Total Size: ~${TotalSizeMB}MB" -ForegroundColor Gray
Write-Host ""

# Create output directory
$basePath = Join-Path (Get-Location) $OutputDir
if (Test-Path $basePath) {
    Remove-Item -Recurse -Force $basePath
}
New-Item -ItemType Directory -Path $basePath | Out-Null

# Calculate file size
$avgFileSizeKB = [math]::Floor(($TotalSizeMB * 1024) / $FileCount)

# File extensions to use
$extensions = @(".txt", ".json", ".ts", ".mp4", ".mp3", ".jpg", ".png", ".pdf")

# Create folder structure
$folders = @($basePath)
for ($i = 1; $i -le $FolderCount; $i++) {
    $folderName = "folder-$i"
    $folderPath = Join-Path $basePath $folderName
    New-Item -ItemType Directory -Path $folderPath | Out-Null
    $folders += $folderPath
    
    # Create subfolders
    $subfolderPath = Join-Path $folderPath "subfolder-1"
    New-Item -ItemType Directory -Path $subfolderPath | Out-Null
    $folders += $subfolderPath
}

Write-Host "📁 Created folder structure" -ForegroundColor Green

# Generate files
$createdFiles = 0
$createdSize = 0

for ($i = 1; $i -le $FileCount; $i++) {
    # Random folder
    $folder = $folders | Get-Random
    
    # Random extension
    $ext = $extensions | Get-Random
    
    # Random file size (vary between 50% and 150% of average)
    $fileSizeKB = [math]::Floor($avgFileSizeKB * (0.5 + (Get-Random -Minimum 0 -Maximum 100) / 100))
    if ($fileSizeKB -lt 1) { $fileSizeKB = 1 }
    
    # Generate file name
    $fileName = "file-$i$ext"
    $filePath = Join-Path $folder $fileName
    
    # Generate random content
    $content = "Test file $i`n" + ("X" * ($fileSizeKB * 1024 - 20))
    
    # Write file
    [System.IO.File]::WriteAllText($filePath, $content)
    
    $createdFiles++
    $createdSize += $fileSizeKB
    
    # Progress
    if ($i % 100 -eq 0 -or $i -eq $FileCount) {
        $percent = [math]::Floor(($i / $FileCount) * 100)
        Write-Host "`r📄 Created $i / $FileCount files ($percent%)" -NoNewline -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host ""
Write-Host "✅ Test files generated successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "   Location: $basePath" -ForegroundColor Gray
Write-Host "   Files: $createdFiles" -ForegroundColor Gray
Write-Host "   Folders: $($folders.Count)" -ForegroundColor Gray
Write-Host "   Total Size: $([math]::Round($createdSize / 1024, 2)) MB" -ForegroundColor Gray
Write-Host ""
Write-Host "🧪 To test:" -ForegroundColor Cyan
Write-Host "   1. Open the Storage page in your browser" -ForegroundColor Gray
Write-Host "   2. Select an account" -ForegroundColor Gray
Write-Host "   3. Click Upload" -ForegroundColor Gray
Write-Host "   4. Drag and drop the '$OutputDir' folder" -ForegroundColor Gray
Write-Host "   5. Watch the parallel upload progress!" -ForegroundColor Gray

