#Requires -Version 7
<#
.SYNOPSIS
    Creates a new AU-tomation GitHub repository from the current directory.
.DESCRIPTION
    Run from the root of a TwinCAT solution directory (where the .sln file is).
    Initialises git, creates the GitHub repo, commits everything, and configures
    branch protection, topics, and homepage.
.EXAMPLE
    cd "C:\TwinCAT projects\AUT_MyLib"
    C:\Users\alber\scripts\New-AuRepo.ps1
#>

param(
    [string]$Org = "AU-tomation-org"
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$templateCi = Join-Path $scriptDir "ci.yml"

# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------
function Ask([string]$prompt, [string]$default = "") {
    $suffix = if ($default) { " [$default]" } else { "" }
    $answer = Read-Host "$prompt$suffix"
    if ([string]::IsNullOrWhiteSpace($answer)) { $default } else { $answer }
}

# ---------------------------------------------------------------------------
# Gather input
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "=== New AU-tomation Repository ===" -ForegroundColor Cyan
Write-Host ""

# Try to guess the repo name from the .sln file in the current directory
$slnFile = Get-ChildItem -Path "." -MaxDepth 1 -Filter "*.sln" | Select-Object -First 1
$guessedName = if ($slnFile) { $slnFile.BaseName } else { "" }

$repoName    = Ask "Repository name" $guessedName
$description = Ask "Description"
$visibility  = Ask "Visibility [public/private]" "private"
if ($visibility -notmatch "^pub") { $visibility = "private" }

$topicsInput = Ask "Topics, space-separated (e.g. twincat beckhoff plcopen iec-61131-3)"
$topics = ($topicsInput -split "\s+") | Where-Object { $_ -ne "" }

Write-Host ""
Write-Host "  Org:         $Org" -ForegroundColor Gray
Write-Host "  Repo:        $repoName" -ForegroundColor Gray
Write-Host "  Visibility:  $visibility" -ForegroundColor Gray
Write-Host "  Topics:      $($topics -join ', ')" -ForegroundColor Gray
Write-Host ""
$confirm = Ask "Proceed? [y/n]" "y"
if ($confirm -notmatch "^y") { Write-Host "Aborted."; exit 0 }

# ---------------------------------------------------------------------------
# Git init
# ---------------------------------------------------------------------------
if (-not (Test-Path ".git")) {
    git init
    git checkout -b master
    Write-Host "Git repository initialised." -ForegroundColor Green
} else {
    Write-Host "Git already initialised." -ForegroundColor Yellow
}

# ---------------------------------------------------------------------------
# .gitignore
# ---------------------------------------------------------------------------
if (-not (Test-Path ".gitignore")) {
    @"
_Boot/
_CompileInfo/
_Libraries/
*.~*
"@ | Out-File -FilePath ".gitignore" -Encoding utf8 -NoNewline
    Write-Host ".gitignore created." -ForegroundColor Green
} else {
    Write-Host ".gitignore already exists." -ForegroundColor Yellow
}

# ---------------------------------------------------------------------------
# ci.yml from template (stored alongside this script)
# ---------------------------------------------------------------------------
$ciDest = ".github\workflows\ci.yml"
if (Test-Path $templateCi) {
    New-Item -ItemType Directory -Force -Path ".github\workflows" | Out-Null
    Copy-Item $templateCi $ciDest -Force
    Write-Host "ci.yml copied from template." -ForegroundColor Green
} else {
    Write-Warning "Template not found at $templateCi -- skipping ci.yml."
}

# ---------------------------------------------------------------------------
# Initial commit
# ---------------------------------------------------------------------------
git add .
git commit -m "Initial commit"

# ---------------------------------------------------------------------------
# Create GitHub repo and push
# ---------------------------------------------------------------------------
Write-Host "Creating GitHub repository $Org/$repoName..." -ForegroundColor Cyan
gh repo create "$Org/$repoName" "--$visibility" --description $description --push --source .

# ---------------------------------------------------------------------------
# Topics
# ---------------------------------------------------------------------------
if ($topics.Count -gt 0) {
    foreach ($topic in $topics) {
        gh repo edit "$Org/$repoName" --add-topic $topic
    }
    Write-Host "Topics set: $($topics -join ', ')" -ForegroundColor Green
}

# ---------------------------------------------------------------------------
# Homepage (auto gh-pages URL)
# ---------------------------------------------------------------------------
$homepage = "https://au-tomation-org.github.io/$repoName/$repoName/"
gh repo edit "$Org/$repoName" --homepage $homepage
Write-Host "Homepage: $homepage" -ForegroundColor Green

# ---------------------------------------------------------------------------
# Branch protection (requires CI context name "build")
# ---------------------------------------------------------------------------
Write-Host "Configuring branch protection on master..." -ForegroundColor Cyan
$json = '{"required_status_checks":{"strict":true,"contexts":["build"]},"enforce_admins":false,"required_pull_request_reviews":null,"restrictions":null}'
$json | gh api "repos/$Org/$repoName/branches/master/protection" --method PUT --input -
Write-Host "Branch protection set." -ForegroundColor Green

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "=== Done! ===" -ForegroundColor Cyan
Write-Host "Repository: https://github.com/$Org/$repoName"
Write-Host ""
Write-Host "After the first successful CI run, enable GitHub Pages:" -ForegroundColor Yellow
Write-Host "gh api repos/$Org/$repoName/pages --method POST --field source[branch]=gh-pages --field source[path]=/" -ForegroundColor Yellow
