---
title: Linux
description: Sistema operacional open-source, base de servidores e infraestrutura
type: article
difficulty: beginner
tags:
  - backend
  - devops
  - sistema-operacional
status: review
estimated_hours: 30
roadmap: backend
color: orange
icon: terminal
created: 2024-01-10
updated: 2024-06-15
aliases:
  - gnu-linux
  - ubuntu
  - debian
related:
  - docker
  - python
---

# Linux

Linux é um kernel de sistema operacional open-source criado por Linus Torvalds em 1991. É a base de servidores, containers e infraestrutura moderna.

## Distribuições Principais

| Distribuição | Uso Principal | Gerenciador de Pacotes |
|-------------|---------------|------------------------|
| **Ubuntu** | Desktop / Servidor | apt |
| **Debian** | Servidor | apt |
| **Fedora** | Desktop / Dev | dnf |
| **Arch** | Power Users | pacman |
| **Alpine** | Containers Docker | apk |

## Comandos Essenciais

```bash
# Navegação
cd /home/user/projetos
ls -la
pwd

# Arquivos
cp arquivo.txt backup/
mv antigo.txt novo.txt
rm -rf diretorio/
find / -name "*.log" -mtime +7

# Processos
ps aux | grep python
top
htop
kill -9 PID
systemctl status nginx

# Rede
curl -X GET http://localhost:8000/api
ss -tulpn
dig google.com
nmap -sV 192.168.1.0/24

# Permissões
chmod 755 script.sh
chown user:group arquivo
```

## Shell Scripting

```bash
#!/bin/bash
# Script de backup automatizado

BACKUP_DIR="/backups/$(date +%Y%m%d)"
SOURCE_DIR="/var/www/app"

mkdir -p "$BACKUP_DIR"
tar -czf "$BACKUP_DIR/app.tar.gz" "$SOURCE_DIR"

echo "Backup criado em $BACKUP_DIR"

# Remover backups com mais de 30 dias
find /backups -type d -mtime +30 -exec rm -rf {} +
```

## Relações no Grafo

Linux é o ambiente nativo para [[Docker]] e containers.
Servidores [[FastAPI]] rodam em Linux.
Scripts de automação usam [[Python]] extensivamente.

## Checklist de Estudo

- [x] Navegação no terminal
- [x] Gerenciamento de arquivos
- [x] Permissões e usuários
- [x] Processos e serviços
- [ ] Shell scripting avançado
- [ ] Networking
- [ ] Systemd e services
- [ ] Cron jobs
- [ ] SSH e segurança
