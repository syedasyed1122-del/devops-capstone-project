# NoteVault 📔

> A personal notes / journal web app — built as a DevOps capstone to demonstrate version control, containerization, multi-container orchestration, CI/CD, and cloud deployment.

[![CI — Build & Push Docker Image](https://github.com/syedasyed1122-del/devops-capstone-project/actions/workflows/ci.yml/badge.svg)](https://github.com/syedasyed1122-del/devops-capstone-project/actions/workflows/ci.yml)

**Live URL:** `http://YOUR_EC2_PUBLIC_IP:3000` *(update after `terraform apply`)*
**Docker Hub:** `docker pull syedasyed1122-del/nodevault:latest`
**GitHub:** [syedasyed1122-del/devops-capstone-project](https://github.com/syedasyed1122-del/devops-capstone-project)

---

## What the App Does

NoteVault is a minimal personal notes and journal application. Users can:

- **Create** notes with a title and body
- **Read** all their notes, newest first
- **Update** any note (title or body)
- **Delete** notes (with a two-step confirmation)
- **Search** notes by keyword (full-text search across title and body)

The UI is a dark-themed single-page app served by the same Express server that handles the API.

---

## Architecture

```
Browser (SPA — index.html + style.css + app.js)
       │  HTTP on port 3000
       ▼
  Express App (Node.js 20 / src/app.js)
       │  pg driver (internal Docker network)
       ▼
  PostgreSQL 16 (named volume: pgdata — data persists across restarts)
```

In Docker Compose, the two services communicate over an internal Docker network. The database port is **never exposed** to the host or internet — only port 3000 (the app) is published.

---

## Running Locally

### Option A — Docker Compose (recommended)

```bash
# 1. Clone the repo
git clone https://github.com/syedasyed1122-del/devops-capstone-project.git
cd devops-capstone-project

# 2. Start both containers (app + database)
docker compose up --build -d

# 3. Visit the app
open http://localhost:3000

# 4. Stop — data is preserved in the pgdata Docker volume
docker compose down

# 5. Start again — your notes are still there
docker compose up -d
```

### Option B — Node.js directly (requires a running Postgres)

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill in environment variables
cp .env.example .env
# Edit .env: set DATABASE_URL to your Postgres connection string

# 3. Run the dev server
npm run dev
```

---

## CI/CD Pipeline

Every push to `main` triggers [`.github/workflows/ci.yml`](.github/workflows/ci.yml):

1. **Checkout** — pulls the latest source code
2. **Docker Buildx** — sets up a multi-platform image builder
3. **Login** — authenticates to Docker Hub using `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` (stored as GitHub Secrets — never hardcoded)
4. **Build & Push** — builds the image and pushes two tags:
   - `latest` — always points to the most recent build on `main`
   - `sha-<short-commit-hash>` — immutable, traceable version tag

> ⚠ Credentials are stored as **GitHub Actions Secrets** and are never written in the workflow file.

### Setting up Secrets

In your GitHub repo: **Settings → Secrets and variables → Actions → New repository secret**

| Secret name | Value |
|-------------|-------|
| `DOCKERHUB_USERNAME` | Your Docker Hub username |
| `DOCKERHUB_TOKEN` | A Docker Hub access token (from hub.docker.com → Account Settings → Security) |

---

## Cloud Deployment (AWS EC2)

### Option A — Automated with Terraform (bonus)

```bash
# Prerequisites: AWS CLI configured (aws configure) + existing EC2 key pair

cd terraform

# Initialize Terraform providers
terraform init

# Preview what will be created
terraform plan \
  -var="key_name=your-ec2-keypair-name" \
  -var="dockerhub_image=syedasyed1122-del/nodevault:latest"

# Create the Security Group + EC2 instance (app boots automatically)
terraform apply \
  -var="key_name=your-ec2-keypair-name" \
  -var="dockerhub_image=syedasyed1122-del/nodevault:latest"

# View outputs
terraform output
# instance_public_ip = "X.X.X.X"
# app_url            = "http://X.X.X.X:3000"
# ssh_command        = "ssh -i ~/.ssh/your-key.pem ubuntu@X.X.X.X"

# When grading is complete — stop the instance to avoid charges
terraform destroy
```

Terraform provisions:
- A **Security Group** with only ports **22** (SSH) and **3000** (app) open
- An **Ubuntu 22.04 t2.micro EC2 instance** with Docker pre-installed via user-data
- The app starts automatically on boot via `docker compose up`

### Option B — Manual (AWS Console)

1. Launch **Ubuntu 22.04 LTS t2.micro** EC2 instance
2. Create a Security Group — inbound: **port 22** (SSH) + **port 3000** (app) only
3. SSH in and run:

```bash
sudo apt-get update -y
sudo apt-get install -y docker.io docker-compose-plugin
sudo systemctl start docker

# Create and start the stack
mkdir /opt/nodevault && cd /opt/nodevault
# (copy docker-compose.yml here or recreate it)
sudo docker compose up -d
```

---

## Technical Decision — Why PostgreSQL?

I chose **PostgreSQL** over SQLite or MongoDB for two reasons. First, this project is about the DevOps pipeline — using a real, production-grade relational database demonstrates the ability to manage stateful services in containers, not just stateless ones. Proving that data survives a `docker compose down && docker compose up` cycle (via a named volume) is one of the explicit rubric requirements, and PostgreSQL makes that concrete and verifiable. Second, PostgreSQL's `pg_isready` command made the Compose health check trivial to write, so the app container properly waits for the database to accept connections before starting — a real-world pattern that SQLite would have sidestepped entirely.

---

## Project Structure

```
devops-capstone-project/
├── src/
│   ├── app.js              # Express entry point
│   ├── db.js               # PostgreSQL pool + schema auto-migration
│   ├── routes/
│   │   └── notes.js        # CRUD REST API with search
│   └── public/
│       ├── index.html      # Frontend SPA (semantic HTML, ARIA)
│       ├── style.css       # Dark UI design system + animations
│       └── app.js          # Frontend fetch logic (CRUD + search)
├── terraform/
│   ├── main.tf             # EC2 instance + Security Group
│   ├── variables.tf        # Input variables (region, key, image)
│   └── outputs.tf          # Public IP, app URL, SSH command
├── .github/
│   └── workflows/
│       └── ci.yml          # GitHub Actions: build + push on main
├── Dockerfile              # node:20-alpine, non-root user
├── docker-compose.yml      # app + postgres, named volume, health check
├── docker-compose.override.yml  # Local dev overrides
├── .env.example            # Safe env template (commit this, not .env)
├── .gitignore              # Ignores node_modules, .env, TF state
├── CONTRIBUTING.md         # Dev setup + commit conventions
└── README.md
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notes` | List all notes (optional `?q=search`) |
| GET | `/api/notes/:id` | Get a single note by ID |
| POST | `/api/notes` | Create a note `{ title, body }` |
| PUT | `/api/notes/:id` | Update a note `{ title, body }` |
| DELETE | `/api/notes/:id` | Delete a note |
| GET | `/health` | Health check — returns `{ status: "ok" }` |

---

## Version Control

- **Repo:** [github.com/syedasyed1122-del/devops-capstone-project](https://github.com/syedasyed1122-del/devops-capstone-project)
- **Branches:** `main` (production) + `feature/docker-setup` (merged via PR)
- **Commits follow** [Conventional Commits](https://www.conventionalcommits.org/) format
