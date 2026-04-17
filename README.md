# Documentation for AU-tomation Toolkit (AUT)

## Index

| Document | Description |
|---|---|
| [Naming Conventions](Naming-Conventions.md) | Naming rules for TwinCAT projects, variables, and files |
| [TcDocGen](TcDocGen.md) | How to use TwinCAT documentation generation |
| [CI/CD GitHub Actions — TwinCAT Self-Hosted Runner](CI-CD-GitHub-TwinCAT-Self-Hosted-Runner/README.md) | Complete setup guide for the organization GitHub Actions runner (`win-twincat-01`), including architecture decisions, known issues, and maintenance |

### CI/CD GitHub Actions — TwinCAT Self-Hosted Runner

| File | Description |
|---|---|
| [README.md](CI-CD-GitHub-TwinCAT-Self-Hosted-Runner/README.md) | Full setup, troubleshooting, and maintenance guide |
| [ci-annotated.yml](CI-CD-GitHub-TwinCAT-Self-Hosted-Runner/ci-annotated.yml) | Workflow file with detailed inline comments |
| [scripts/setup-runner.ps1](CI-CD-GitHub-TwinCAT-Self-Hosted-Runner/scripts/setup-runner.ps1) | PowerShell script for initial runner environment setup |
| [scripts/re-register-runner.ps1](CI-CD-GitHub-TwinCAT-Self-Hosted-Runner/scripts/re-register-runner.ps1) | PowerShell script for re-registration after credential expiry |
