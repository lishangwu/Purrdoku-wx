param(
  [string]$OutputPath = (Join-Path (Split-Path -Parent $PSScriptRoot) 'assets/cat-atlas.png')
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$sourceDir = Join-Path (Split-Path -Parent $PSScriptRoot) 'assets/cats8'
$sources = @(Get-ChildItem -LiteralPath $sourceDir -Filter '*.png' -File | Sort-Object Name)
if ($sources.Count -ne 12) { throw "Expected 12 cat sheets, found $($sources.Count)." }

$frameSize = 128
$atlas = [System.Drawing.Bitmap]::new($frameSize * 8, $frameSize * 12, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$atlasRect = [System.Drawing.Rectangle]::new(0, 0, $atlas.Width, $atlas.Height)
$atlasData = $atlas.LockBits($atlasRect, [System.Drawing.Imaging.ImageLockMode]::WriteOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

try {
  for ($variant = 0; $variant -lt $sources.Count; $variant++) {
    $source = [System.Drawing.Bitmap]::new($sources[$variant].FullName)
    try {
      if ($source.Width -ne 512 -or $source.Height -ne 256) {
        throw "$($sources[$variant].Name) must be a 512x256 sheet of 4x2 128px frames."
      }
      $sourceRect = [System.Drawing.Rectangle]::new(0, 0, $source.Width, $source.Height)
      $sourceData = $source.LockBits($sourceRect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
      try {
        $rowBytes = [byte[]]::new($frameSize * 4)
        for ($frame = 0; $frame -lt 8; $frame++) {
          $sourceCol = $frame % 4
          $sourceRow = [math]::Floor($frame / 4)
          for ($y = 0; $y -lt $frameSize; $y++) {
            $sourceOffset = ($sourceRow * $frameSize + $y) * $sourceData.Stride + $sourceCol * $frameSize * 4
            $targetOffset = ($variant * $frameSize + $y) * $atlasData.Stride + $frame * $frameSize * 4
            [System.Runtime.InteropServices.Marshal]::Copy([IntPtr]::Add($sourceData.Scan0, $sourceOffset), $rowBytes, 0, $rowBytes.Length)
            [System.Runtime.InteropServices.Marshal]::Copy($rowBytes, 0, [IntPtr]::Add($atlasData.Scan0, $targetOffset), $rowBytes.Length)
          }
        }
      } finally {
        $source.UnlockBits($sourceData)
      }
    } finally {
      $source.Dispose()
    }
  }
} finally {
  $atlas.UnlockBits($atlasData)
}

try {
  $atlas.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Output "Saved 8x12 atlas to $OutputPath ($($atlas.Width)x$($atlas.Height))."
} finally {
  $atlas.Dispose()
}
