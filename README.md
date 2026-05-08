# Documentation for AU-tomation Toolkit (AUT)

## Index

| Document | Description |
|---|---|
| [Naming Conventions](Naming-Conventions.md) | Naming rules for TwinCAT projects, variables, and files |
| [Pragmas: Monitoring and Visibility](Pragmas-Monitoring-Visibility.md) | `monitoring`, `displaymode`, `hide`, `hide_all_locals` |
| [Documentation Style Guide](Documentation-Style-Guide.md) | How to write and structure documents in this repo |
| [TcDocGen](TcDocGen.md) | TcDocGen setup, output structure, and known tool limitations |
| [TcDocGen Commenting Guide](TcDocGen-Commenting-Guide/README.md) | Complete guide to writing documentation comments in TwinCAT 3 ST: all markup syntax, rules by element type, and AU-tomation conventions |
| [TcDocGen Viewer](tcdocgen-viewer/README.md) | Enhanced HTML viewer for Beckhoff TcDocGen output: interactive sidebar, breadcrumb navigation, and inject.js page enhancer |
| [CI/CD GitHub Actions - TwinCAT Self-Hosted Runner](CI-CD-GitHub-TwinCAT-Self-Hosted-Runner/README.md) | Complete setup guide for the organization GitHub Actions runner (`win-twincat-01`), including architecture decisions, known issues, and maintenance |
| [TwinCAT UmRT - Autostart and License Check](TwinCAT-UmRT-Setup/README.md) | Scheduled tasks to auto-start UmRT at logon and notify when the trial license is near expiry |
| [TcUnit Testing](TcUnit-Testing/README.md) | How to set up and write unit tests for TwinCAT 3 libraries using TcUnit: project structure, conventions, and test templates |
| [New GitHub Repository](New-GitHub-Repository/README.md) | Interactive PowerShell script to create a new AU-tomation GitHub repo: git init, ci.yml, branch protection, topics, and homepage in one command |

### TcDocGen

| File | Description |
|---|---|
| [TcDocGen.md](TcDocGen.md) | Setup, output structure, section descriptions, and known tool limitations |
| [TcDocGen-Commenting-Guide/README.md](TcDocGen-Commenting-Guide/README.md) | Full markup reference and AU-tomation commenting rules |
| [tcdocgen-viewer/README.md](tcdocgen-viewer/README.md) | Interactive viewer shell, inject.js enhancer, manifest generator |

### CI/CD GitHub Actions - TwinCAT Self-Hosted Runner

| File | Description |
|---|---|
| [README.md](CI-CD-GitHub-TwinCAT-Self-Hosted-Runner/README.md) | Full setup, troubleshooting, and maintenance guide |
| [ci.yml](CI-CD-GitHub-TwinCAT-Self-Hosted-Runner/ci.yml) | Workflow template — `SOLUTION_NAME` and SARIF file are auto-detected; customise only the C# env vars if applicable |
| [scripts/setup-runner.ps1](CI-CD-GitHub-TwinCAT-Self-Hosted-Runner/scripts/setup-runner.ps1) | PowerShell script for initial runner environment setup |
| [scripts/re-register-runner.ps1](CI-CD-GitHub-TwinCAT-Self-Hosted-Runner/scripts/re-register-runner.ps1) | PowerShell script for re-registration after credential expiry |

### TwinCAT UmRT - Autostart and License Check

| File | Description |
|---|---|
| [README.md](TwinCAT-UmRT-Setup/README.md) | Background, task descriptions, and first-time setup instructions |
| [scripts/Register-TcTasks.ps1](TwinCAT-UmRT-Setup/scripts/Register-TcTasks.ps1) | One-time script to register both scheduled tasks |
| [scripts/Check-TcUmRtLicense.ps1](TwinCAT-UmRT-Setup/scripts/Check-TcUmRtLicense.ps1) | Hourly license expiry check with Windows toast notification |

### New GitHub Repository

| File | Description |
|---|---|
| [README.md](New-GitHub-Repository/README.md) | Usage guide and description of what the script does |
| [New-AuRepo.ps1](New-GitHub-Repository/New-AuRepo.ps1) | Interactive script: git init, ci.yml, `gh repo create`, topics, branch protection, homepage |
| [ci.yml](New-GitHub-Repository/ci.yml) | CI/CD template bundled with the script (mirrors CI-CD guide) |

### TcUnit Testing

| File | Description |
|---|---|
| [README.md](TcUnit-Testing/README.md) | Setup guide, conventions, VAR_INST rationale, single-cycle and multi-cycle test templates |
