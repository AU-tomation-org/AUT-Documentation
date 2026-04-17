# Documentation for AU-tomation Toolkit (AUT)

## Index

| Document | Description |
|---|---|
| [Naming Conventions](Naming-Conventions.md) | Naming rules for TwinCAT projects, variables, and files |
| [TcDocGen](TcDocGen.md) | How to use TwinCAT documentation generation |
| [CI/CD GitHub Actions — TwinCAT Self-Hosted Runner](CI-CD-GitHub-TwinCAT-Self-Hosted-Runner/README.md) | Complete setup guide for the organization GitHub Actions runner (`win-twincat-01`), including architecture decisions, known issues, and maintenance |
| [TwinCAT UmRT — Autostart and License Check](TwinCAT-UmRT-Setup/README.md) | Scheduled tasks to auto-start UmRT at logon and notify when the trial license is near expiry |

### CI/CD GitHub Actions — TwinCAT Self-Hosted Runner

| File | Description |
|---|---|
| [README.md](CI-CD-GitHub-TwinCAT-Self-Hosted-Runner/README.md) | Full setup, troubleshooting, and maintenance guide |
| [ci.yml](CI-CD-GitHub-TwinCAT-Self-Hosted-Runner/ci.yml) | Workflow file with detailed inline comments |
| [scripts/setup-runner.ps1](CI-CD-GitHub-TwinCAT-Self-Hosted-Runner/scripts/setup-runner.ps1) | PowerShell script for initial runner environment setup |
| [scripts/re-register-runner.ps1](CI-CD-GitHub-TwinCAT-Self-Hosted-Runner/scripts/re-register-runner.ps1) | PowerShell script for re-registration after credential expiry |

### TwinCAT UmRT — Autostart and License Check

| File | Description |
|---|---|
| [README.md](TwinCAT-UmRT-Setup/README.md) | Background, task descriptions, and first-time setup instructions |
| [scripts/Register-TcTasks.ps1](TwinCAT-UmRT-Setup/scripts/Register-TcTasks.ps1) | One-time script to register both scheduled tasks |
| [scripts/Check-TcUmRtLicense.ps1](TwinCAT-UmRT-Setup/scripts/Check-TcUmRtLicense.ps1) | Hourly license expiry check with Windows toast notification |
