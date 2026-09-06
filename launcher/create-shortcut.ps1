# Creates Desktop + Start Menu shortcuts that open the translator
# inside a standalone Microsoft Edge app-window (neural Arabic voice).
$ErrorActionPreference = 'Stop'

$edgeCmd = Get-Command msedge.exe -ErrorAction SilentlyContinue
$edgePath = $null
if ($edgeCmd) { $edgePath = $edgeCmd.Source }
if (-not $edgePath) {
    $candidates = @(
        "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
        "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
        "$env:LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe"
    )
    $edgePath = $candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
}
if (-not $edgePath) {
    Write-Host 'Microsoft Edge not found.' -ForegroundColor Red
    exit 1
}

$url = 'https://aitomaraziz.github.io/voice-translator/'
$wsh = New-Object -ComObject WScript.Shell

$shortcuts = @(
    @{
        Path = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Voice Translator - المترجم الصوتي.lnk'
        Name = 'Voice Translator (Desktop)'
    },
    @{
        Path = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Voice Translator.lnk'
        Name = 'Voice Translator (Start Menu)'
    }
)

foreach ($item in $shortcuts) {
    $s = $wsh.CreateShortcut($item.Path)
    $s.TargetPath = $edgePath
    $s.Arguments = "--app=$url --window-size=460,800"
    $s.IconLocation = "$edgePath,0"
    $s.Description = 'Voice Translator - المترجم الصوتي الفوري (عربي / 中文 / English)'
    $s.Save()
    Write-Host "Created: $($item.Name)" -ForegroundColor Green
}

Write-Host 'Done. Double-click the shortcut to open the translator inside Edge.'