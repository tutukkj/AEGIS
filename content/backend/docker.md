---
title: Docker
description: Plataforma de containerização para empacotar e distribuir aplicações
type: article
difficulty: intermediate
tags:
  - backend
  - devops
  - infraestrutura
status: studying
estimated_hours: 20
roadmap: backend
color: blue
icon: container
created: 2024-02-10
updated: 2024-06-18
aliases:
  - containers
  - docker-compose
related:
  - linux
  - fastapi
  - python
---

# Docker

Docker é uma plataforma de containerização que permite empacotar aplicações e suas dependências em containers isolados e reprodutíveis.

## Conceitos Fundamentais

### Imagens vs Containers

| Conceito | Descrição |
|----------|-----------|
| **Imagem** | Template read-only com instruções para criar um container |
| **Container** | Instância executável de uma imagem |
| **Dockerfile** | Script de instruções para construir uma imagem |
| **Volume** | Persistência de dados fora do container |
| **Network** | Comunicação entre containers |

### Dockerfile

```dockerfile
# Multi-stage build para aplicação Python
FROM python:3.12-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.12-slim
WORKDIR /app
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Docker Compose

```yaml
version: '3.9'
services:
  api:
    build: .
    ports:
      - "8000:8000"
    volumes:
      - ./app:/app
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/mydb
    depends_on:
      - db

  db:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_PASSWORD=pass

volumes:
  postgres_data:
```

## Comandos Essenciais

```bash
# Construir imagem
docker build -t minha-api .

# Executar container
docker run -d -p 8000:8000 --name api minha-api

# Listar containers
docker ps -a

# Logs
docker logs -f api

# Compose
docker compose up -d
docker compose down
```

## Relações no Grafo

Docker containeriza aplicações [[Python]] e [[FastAPI]].
Funciona melhor em ambientes [[Linux]].
É essencial no pipeline de DevOps e CI/CD.

## Checklist de Estudo

- [x] Conceitos básicos (imagem, container)
- [x] Dockerfile
- [ ] Docker Compose
- [ ] Volumes e persistência
- [ ] Networking entre containers
- [ ] Multi-stage builds
- [ ] Docker Swarm (básico)
- [ ] Otimização de imagens
