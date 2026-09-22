output "instance_public_ip" {
  description = "Public IP address of the NoteVault EC2 instance"
  value       = aws_instance.nodevault.public_ip
}

output "app_url" {
  description = "URL to access NoteVault"
  value       = "http://${aws_instance.nodevault.public_ip}:3000"
}

output "ssh_command" {
  description = "SSH command to connect to the instance"
  value       = "ssh -i ~/.ssh/${var.key_name}.pem ubuntu@${aws_instance.nodevault.public_ip}"
}
