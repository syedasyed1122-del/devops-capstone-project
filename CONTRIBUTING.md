# Contributing to NoteVault

Thank you for considering contributing to this project!

## Development Setup

1. **Clone** the repo and install dependencies:
   ```bash
   git clone https://github.com/YOUR_USERNAME/devops-capstone-project.git
   cd devops-capstone-project
   npm install
   ```

2. **Start** the dev environment:
   ```bash
   cp .env.example .env
   docker compose up -d db   # start only the database
   npm run dev                 # run Express with nodemon
   ```

3. **Or** use the full Docker stack:
   ```bash
   docker compose up --build
   ```

## Commit Style

Use [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | When to use |
|--------|-------------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation changes |
| `chore:` | Maintenance (deps, config) |
| `ci:` | CI/CD changes |

**Example:** `feat(api): add pagination to GET /api/notes`

## Pull Requests

- Branch off `main`: `git checkout -b feature/your-feature`
- Keep PRs focused (one concern per PR)
- Describe *why*, not just *what*, in the PR body
- Ensure the app still works locally before opening a PR
