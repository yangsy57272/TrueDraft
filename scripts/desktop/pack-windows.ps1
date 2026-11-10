$ErrorActionPreference = 'Stop'
$root = Resolve-Path "$PSScriptRoot/../.."
$dist = Join-Path $root 'dist'
$csc = Join-Path $env:WINDIR 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
$nsis = Join-Path ${env:ProgramFiles(x86)} 'NSIS/makensis.exe'

& $csc /nologo /target:winexe /r:System.Windows.Forms.dll "/out:$dist/TrueDraft.exe" "$PSScriptRoot/Launcher.cs"
if ($LASTEXITCODE -ne 0) { throw 'Windows launcher compilation failed.' }
& $nsis "/DPAYLOAD=$dist/desktop-payload" "/DDIST=$dist" "$PSScriptRoot/installer.nsi"
if ($LASTEXITCODE -ne 0) { throw 'Windows installer compilation failed.' }
