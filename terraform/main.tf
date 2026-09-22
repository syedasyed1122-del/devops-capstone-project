terraform {
  required_version = ">= 1.7"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# ── Data: look up the latest Ubuntu 22.04 LTS AMI ────────────
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# ── Security Group ────────────────────────────────────────────
resource "aws_security_group" "nodevault" {
  name        = "nodevault-sg"
  description = "NoteVault: allow SSH and app traffic only"

  # SSH — restrict to your IP in production
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # App port
  ingress {
    description = "NoteVault app"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # All outbound allowed (needed for apt, Docker pulls)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name    = "nodevault-sg"
    Project = "nodevault"
  }
}

# ── EC2 Instance ──────────────────────────────────────────────
resource "aws_instance" "nodevault" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = var.key_name
  vpc_security_group_ids = [aws_security_group.nodevault.id]

  # User-data script: install Docker + Compose, pull image, run app
  user_data = <<-EOF
    #!/bin/bash
    set -e

    # Update system
    apt-get update -y
    apt-get install -y ca-certificates curl gnupg lsb-release

    # Add Docker's official GPG key
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
      | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    # Set up Docker repository
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
      https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
      | tee /etc/apt/sources.list.d/docker.list > /dev/null

    # Install Docker Engine + Compose plugin
    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable docker
    systemctl start docker

    # Create app directory
    mkdir -p /opt/nodevault
    cd /opt/nodevault

    # Write docker-compose.yml using the pre-built image
    cat > docker-compose.yml <<COMPOSE
    services:
      db:
        image: postgres:16-alpine
        restart: unless-stopped
        environment:
          POSTGRES_DB: nodevault
          POSTGRES_USER: nodevault_user
          POSTGRES_PASSWORD: nodevault_pass
        volumes:
          - pgdata:/var/lib/postgresql/data
        healthcheck:
          test: ["CMD-SHELL", "pg_isready -U nodevault_user -d nodevault"]
          interval: 5s
          timeout: 5s
          retries: 10

      app:
        image: ${var.dockerhub_image}
        restart: unless-stopped
        ports:
          - "3000:3000"
        environment:
          PORT: 3000
          DATABASE_URL: postgres://nodevault_user:nodevault_pass@db:5432/nodevault
        depends_on:
          db:
            condition: service_healthy

    volumes:
      pgdata:
        driver: local
    COMPOSE

    # Pull and start the application
    docker compose pull
    docker compose up -d
  EOF

  tags = {
    Name    = "nodevault-server"
    Project = "nodevault"
  }
}
