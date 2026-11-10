$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$dist = Join-Path $root 'dist'
$csc = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
$nsis = Join-Path ${env:ProgramFiles(x86)} 'NSIS\makensis.exe'
$launcherSource = Join-Path $PSScriptRoot 'Launcher.cs'
$launcher = Join-Path $dist 'TrueDraft.exe'
$payload = Join-Path $dist 'desktop-payload'
$installer = Join-Path $PSScriptRoot 'installer.nsi'

& $csc /nologo /target:winexe /r:System.Windows.Forms.dll "/out:$launcher" $launcherSource
if ($LASTEXITCODE -ne 0) { throw 'Windows launcher compilation failed.' }
& $nsis "/DPAYLOAD=$payload" "/DDIST=$dist" $installer
if ($LASTEXITCODE -ne 0) { throw 'Windows installer compilation failed.' }
