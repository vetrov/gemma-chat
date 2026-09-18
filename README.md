# gemma-chat

A browser-based chat application powered by Gemma.

## Development

Prerequisites:

- Node.js 22
- npm 10 or newer

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Run the project checks:

```bash
npm run lint
npm run typecheck
npm run build
```

The application uses Vite, React, strict TypeScript, React Router's data router API, and CSS Modules. Route components are colocated under `src/routes`; shared UI, helpers, and types belong in their corresponding `src` directories.

## OpenCode automation

Trusted repository collaborators can invoke OpenCode from an issue or pull request review comment:

```text
/oc summarize this issue
```

```text
/opencode implement the requested change
```

The workflow only accepts requests from owners, organization members, and collaborators. OpenCode performs an additional write-permission check before acting. Runs are limited to 45 minutes, concurrent requests for the same issue or pull request are serialized, and session sharing is disabled.

### Repository setup

The automation requires:

1. The [OpenCode GitHub App](https://github.com/apps/opencode-agent) installed for this repository.
2. An Actions secret named `OPENROUTER_API_KEY`.
3. Actions permission to request an OIDC token.

The model and OpenCode configuration live in `.github/opencode/opencode.json`. The workflow pins all GitHub Actions to immutable commits and verifies the OpenCode release archive against its published SHA-256 digest before execution.

## Automation checks

`.github/workflows/validate-automation.yml` runs when automation files change. It validates the OpenCode JSON safety settings, checks workflow syntax with `actionlint`, and audits workflow security with `zizmor`. Both tools are version-pinned and checksum-verified before execution.

Dependabot checks GitHub Actions dependencies weekly. Updates to OpenCode must update both `OPENCODE_VERSION` and `OPENCODE_SHA256` in `.github/workflows/opencode.yml`.
