# Security Policy

## Supported Versions

Proxync releases follow semantic versioning. Security updates and bug fixes are applied to the latest release branch and active release lines.

| Version | Supported          |
| ------- | ------------------ |
| 0.2.x   | :white_check_mark: |
| < 0.2.0 | :x:                |

---

## Reporting a Vulnerability

The Proxync team takes the security of our application, tunnels, and user traffic seriously. If you believe you have found a security vulnerability in Proxync, please report it responsibly so we can resolve the issue before public disclosure.

### Preferred Method: GitHub Private Vulnerability Reporting

1. Navigate to the **Security** tab of the [Inilax/Proxync](https://github.com/Inilax/Proxync) repository.
2. Select **Advisories** on the left-hand menu.
3. Click **Report a vulnerability** to open a confidential advisory draft directly with the maintainers.

### Alternative Method: Direct Contact

If you are unable to use GitHub Private Vulnerability Reporting, you can email security reports to:
- **Email**: `security@inilax.com` (or contact maintainers via [Inilax Security](https://github.com/Inilax))

Please include as much of the following details as possible:
- Type of vulnerability (e.g., local privilege escalation, tunnel interception, SSRF, memory safety, remote code execution)
- Step-by-step instructions to reproduce the issue (proof-of-concept scripts, network traffic traces, or reproduction commands)
- Affected components (e.g., Tauri core, tunnel protocol proxy, desktop web UI, release binaries)
- Potential impact and threat scenario
- Any suggested remediation or patches, if available

---

## Response & Disclosure Process

1. **Acknowledgement**: We aim to acknowledge receipt of your security vulnerability report within **48 hours**.
2. **Triage & Assessment**: Maintainers will verify the vulnerability, evaluate severity using CVSS, and determine impacted versions within **5 business days**.
3. **Patch Development & Testing**: We will develop and test a fix in private repositories or draft security advisories.
4. **Coordinated Release**: We will publish a patched release along with a CVE and GitHub Security Advisory acknowledging your contribution (unless you request anonymity).

Please do not open public GitHub issues or discuss undisclosed vulnerabilities in public forums (such as Discord or discussion threads) prior to coordinated release.
