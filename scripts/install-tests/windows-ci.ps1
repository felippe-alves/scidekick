$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$RootDir = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $RootDir

$WorkDir = Join-Path ([System.IO.Path]::GetTempPath()) ("scidekick-win-install-" + [System.Guid]::NewGuid().ToString("N"))
$InstallDir = Join-Path $WorkDir "bin"
$HomeDir = Join-Path $WorkDir "home"
$BinaryPath = Join-Path $RootDir "packages\coding-agent\binaries\sk-windows-x64.exe"
$InstallerPath = Join-Path $RootDir "scripts\install.ps1"
$PreviousUserPath = [Environment]::GetEnvironmentVariable("Path", "User")
$PreviousSkInstallDir = $env:SK_INSTALL_DIR
$PreviousUserProfile = $env:USERPROFILE
$PreviousApiBase = $env:SCIDEKICK_INSTALL_API_BASE
$PreviousDownloadBase = $env:SCIDEKICK_INSTALL_DOWNLOAD_BASE
$ServerProcess = $null

function Write-Section {
    param([string]$Name)
    Write-Host ""
    Write-Host "=== $Name ==="
}

function Assert-FileExists {
    param([string]$Path)
    if (-not (Test-Path $Path)) {
        throw "Expected file to exist: $Path"
    }
}

function Get-Sha256 {
    param([string]$Path)
    return (Get-FileHash -Algorithm SHA256 -Path $Path).Hash.ToLowerInvariant()
}

function Invoke-Sk {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)
    $sk = Join-Path $InstallDir "sk.exe"
    $output = & $sk @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "sk.exe $($Arguments -join ' ') failed with exit code $LASTEXITCODE"
    }
    return $output
}

function Test-InstalledSk {
    Invoke-Sk --version
    Invoke-Sk --smoke-test
}

function Start-FakeReleaseServer {
    param(
        [string]$GoodBinaryPath,
        [string]$GoodSha256
    )

    $port = Get-Random -Minimum 41000 -Maximum 60000
    $prefix = "http://127.0.0.1:$port/"
    $serverPath = Join-Path $WorkDir "fake-release-server.mjs"
    $serverSource = @'
const [, , portArg, binaryPath, sha256] = process.argv;
const binary = Bun.file(binaryPath);

function json(body) {
	return new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });
}

function text(body, status = 200) {
	return new Response(body, { status, headers: { "content-type": "text/plain" } });
}

const server = Bun.serve({
	hostname: "127.0.0.1",
	port: Number(portArg),
	async fetch(req) {
		const path = new URL(req.url).pathname;
		switch (path) {
			case "/releases/latest":
			case "/releases/tags/v0.0.0-test":
				return json({ tag_name: "v0.0.0-test" });
			case "/releases/tags/v0.0.0-corrupt":
				return json({ tag_name: "v0.0.0-corrupt" });
			case "/releases/tags/v0.0.0-missing-sha":
				return json({ tag_name: "v0.0.0-missing-sha" });
			case "/releases/download/v0.0.0-test/sk-windows-x64.exe":
				return new Response(binary, { headers: { "content-type": "application/octet-stream" } });
			case "/releases/download/v0.0.0-test/sk-windows-x64.exe.sha256":
				return text(`${sha256}  sk-windows-x64.exe\n`);
			case "/releases/download/v0.0.0-corrupt/sk-windows-x64.exe":
				return new Response("not a valid binary", { headers: { "content-type": "application/octet-stream" } });
			case "/releases/download/v0.0.0-corrupt/sk-windows-x64.exe.sha256":
				return text(`${sha256}  sk-windows-x64.exe\n`);
			case "/releases/download/v0.0.0-missing-sha/sk-windows-x64.exe":
				return new Response(binary, { headers: { "content-type": "application/octet-stream" } });
			case "/releases/download/v0.0.0-missing-sha/sk-windows-x64.exe.sha256":
				return text("missing", 404);
			default:
				return text(`unexpected path: ${path}`, 404);
		}
	},
});

console.log(`fake release server listening on ${server.url}`);
await new Promise(() => {});
'@
    Set-Content -Path $serverPath -Value $serverSource -Encoding UTF8
    $process = Start-Process -FilePath "bun" -ArgumentList @($serverPath, $port, $GoodBinaryPath, $GoodSha256) -PassThru -WindowStyle Hidden

    for ($attempt = 0; $attempt -lt 50; $attempt++) {
        try {
            Invoke-RestMethod -Uri "$($prefix)releases/latest" | Out-Null
            return @{ Process = $process; Prefix = $prefix.TrimEnd("/") }
        } catch {
            Start-Sleep -Milliseconds 100
        }
    }

    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    throw "fake release server did not start"
}

function Invoke-Installer {
    param([string]$Ref)
    & $InstallerPath -Binary -Ref $Ref
}

try {
    New-Item -ItemType Directory -Force -Path $InstallDir, $HomeDir | Out-Null
    $env:SK_INSTALL_DIR = $InstallDir
    $env:USERPROFILE = $HomeDir

    Write-Section "Build Windows binary if needed"
    if (-not (Test-Path $BinaryPath)) {
        bun scripts/ci-release-build-binaries.ts --targets=win32-x64
        if ($LASTEXITCODE -ne 0) { throw "Windows binary build failed" }
    }
    Assert-FileExists $BinaryPath

    $sha256 = Get-Sha256 $BinaryPath
    $server = Start-FakeReleaseServer -GoodBinaryPath $BinaryPath -GoodSha256 $sha256
    $ServerProcess = $server.Process
    $env:SCIDEKICK_INSTALL_API_BASE = "$($server.Prefix)/releases"
    $env:SCIDEKICK_INSTALL_DOWNLOAD_BASE = "$($server.Prefix)/releases/download"

    Write-Section "Install with valid checksum"
    Invoke-Installer "v0.0.0-test"
    Test-InstalledSk

    Write-Section "Reinstall over broken local binary"
    Set-Content -Path (Join-Path $InstallDir "sk.exe") -Value "@echo off`r`nexit /b 99`r`n" -Encoding ASCII
    Invoke-Installer "v0.0.0-test"
    Test-InstalledSk

    Write-Section "Corrupt download preserves existing install"
    $before = Invoke-Sk --version | Out-String
    $failed = $false
    try {
        Invoke-Installer "v0.0.0-corrupt"
    } catch {
        $failed = $true
    }
    if (-not $failed) {
        throw "corrupt binary install unexpectedly succeeded"
    }
    $after = Invoke-Sk --version | Out-String
    if ($after -ne $before) {
        throw "failed corrupt update changed installed version"
    }
    Test-InstalledSk

    Write-Section "Missing checksum preserves existing install"
    $failed = $false
    try {
        Invoke-Installer "v0.0.0-missing-sha"
    } catch {
        $failed = $true
    }
    if (-not $failed) {
        throw "missing checksum install unexpectedly succeeded"
    }
    Test-InstalledSk

    Write-Host ""
    Write-Host "Windows install smoke tests passed"
} finally {
    if ($null -ne $ServerProcess) {
        Stop-Process -Id $ServerProcess.Id -Force -ErrorAction SilentlyContinue
    }
    if ($null -eq $PreviousSkInstallDir) {
        Remove-Item Env:SK_INSTALL_DIR -ErrorAction SilentlyContinue
    } else {
        $env:SK_INSTALL_DIR = $PreviousSkInstallDir
    }
    if ($null -eq $PreviousApiBase) {
        Remove-Item Env:SCIDEKICK_INSTALL_API_BASE -ErrorAction SilentlyContinue
    } else {
        $env:SCIDEKICK_INSTALL_API_BASE = $PreviousApiBase
    }
    if ($null -eq $PreviousDownloadBase) {
        Remove-Item Env:SCIDEKICK_INSTALL_DOWNLOAD_BASE -ErrorAction SilentlyContinue
    } else {
        $env:SCIDEKICK_INSTALL_DOWNLOAD_BASE = $PreviousDownloadBase
    }
    if ($null -ne $PreviousUserPath) {
        [Environment]::SetEnvironmentVariable("Path", $PreviousUserPath, "User")
    }
    $env:USERPROFILE = $PreviousUserProfile
    Remove-Item -Recurse -Force $WorkDir -ErrorAction SilentlyContinue
}
