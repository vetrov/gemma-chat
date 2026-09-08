# Agent Instructions

## Stack
- Build tool: Vite
- Framework: React (functional components + hooks only, no class components)
- Routing: React Router (v6+ data router API — `createBrowserRouter`)
- Package manager: npm
- Styling: plain CSS Modules unless a feature issue says otherwise
- Language: TypeScript, strict mode enabled

## Folder structure
```
src/
  routes/        # one folder per route, colocated component + styles
  components/    # shared, reusable components
  lib/           # non-UI helpers, API clients, utils
  types/         # shared type definitions not colocated with a component
main.tsx
```

## Conventions
- One component per file, named exports preferred over default exports (except route entry components).
- Keep components small — extract a child component rather than letting one file grow past ~150 lines.
- No inline styles; use CSS Modules (`Component.module.css`) colocated with the component.
- Add a short comment above any non-obvious logic, not above self-explanatory code.
- No `any` — use `unknown` and narrow, or define a proper type/interface. Avoid `as` casts except when narrowing a known-safe union.
- Prefer `interface` for object shapes/props, `type` for unions and utility types.
- Component props get an explicit `Props` interface, not inline typing on the function signature.

## Required on every PR
- Code must pass lint (`npm run lint`) and build (`npm run build`) before you consider the task done.
- Before creating or claiming a PR is complete, verify from a clean working tree by running `npm ci`, `npm run lint`, `npm run typecheck`, and `npm run build`.
- Never substitute `npm install`, `--force`, or `--legacy-peer-deps` for `npm ci` during verification.
- If any verification command fails, fix the issue and rerun the complete sequence.
- After pushing, wait for the GitHub Actions CI run to finish and inspect its result. Do not claim checks pass unless the remote CI run is green; include its URL and commit SHA.
- If you add a new npm dependency, explain why in the PR description.
- If the issue describes user-facing behavior, add or update a test for it (Vitest + React Testing Library once installed).
- Do not modify `.github/workflows/` files unless the issue explicitly asks for it.

## Out of bounds
- Don't install a UI framework (MUI, Chakra, etc.) unless an issue explicitly requests it.
- Don't add state management libraries (Redux, Zustand, etc.) unless an issue explicitly requests it — use React state/context by default.
- Don't rewrite or restructure files outside the scope of the current issue.
- Never delete or reinitialize the `.git` directory, and never delete `.github/`. If something needs a clean slate, remove specific files you created, not the whole directory tree.
- If a scaffolding step fails or produces a messy result, fix it incrementally or ask a clarifying question in a comment — don't `rm -rf` and start over.
- Stay inside the repository directory. Never create sibling or temp directories outside the checkout (e.g. `../repo-temp`) to redo work — edit files in place.
- Never create a second copy of the project inside the repo either (e.g. `gemma-chat-temp/`, `scaffold-v2/`). There is exactly one project tree — this one. Run `npm install` once; don't reinstall into a fresh subfolder if something looks wrong, fix the existing install.

## Clarifying questions
- If an issue is ambiguous, missing a decision (e.g. which library, what the exact UX should be), or could reasonably be implemented multiple ways, post a comment on the issue listing your specific questions instead of guessing.
- Do not open a PR until ambiguity is resolved, either by the issue description already covering it or by a reply in the comments.
- Keep questions concrete and answerable (e.g. "Should the 404 page redirect after 5s or stay static?") rather than open-ended.
- Once questions are answered in a comment, proceed with implementation using that as the source of truth alongside the original issue.

## CI expectations
- `npm run lint`, `npm run typecheck`, and `npm run build` must all pass in GitHub Actions on every PR. If the bootstrap issue is the one setting this up, the workflow file should run these three commands on `pull_request` events targeting `main`.
