variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t2.micro"
}

variable "key_name" {
  description = "Name of the existing EC2 key pair for SSH access"
  type        = string
  # No default — must be provided
}

variable "dockerhub_image" {
  description = "Full Docker Hub image reference, e.g. yourname/nodevault:1.0.0"
  type        = string
  default     = "yourname/nodevault:latest"
}
