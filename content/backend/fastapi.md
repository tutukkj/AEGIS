---
title: FastAPI
description: Framework web moderno e rápido para construir APIs com Python
type: article
difficulty: intermediate
tags:
  - backend
  - api
  - web
status: studying
estimated_hours: 25
roadmap: backend
color: green
icon: zap
created: 2024-03-01
updated: 2024-06-22
aliases:
  - fast-api
related:
  - python
  - docker
  - linux
---

# FastAPI

FastAPI é um framework web moderno e de alta performance para construir APIs com [[Python]], baseado em type hints e padrões OpenAPI.

## Por que FastAPI?

- **Performance**: Uma das mais rápidas (comparável a Go e Node.js)
- **Type Safety**: Validação automática com Pydantic
- **Docs automáticas**: Swagger UI e ReDoc gerados automaticamente
- **Async nativo**: Suporte completo a async/await
- **Padrões abertos**: OpenAPI, JSON Schema

## Exemplo Completo

```python
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

app = FastAPI(
    title="Aegis API",
    description="API do Learning OS",
    version="1.0.0"
)

# Modelos
class ArtigoBase(BaseModel):
    titulo: str
    descricao: Optional[str] = None
    tags: list[str] = []

class ArtigoResponse(ArtigoBase):
    id: int
    slug: str

    class Config:
        from_attributes = True

# Rotas
@app.get("/artigos", response_model=list[ArtigoResponse])
async def listar_artigos(tag: Optional[str] = None):
    """Lista todos os artigos, com filtro opcional por tag."""
    artigos = await ArtigoService.listar(tag=tag)
    return artigos

@app.get("/artigos/{slug}")
async def obter_artigo(slug: str):
    """Obtém um artigo pelo slug."""
    artigo = await ArtigoService.obter(slug)
    if not artigo:
        raise HTTPException(404, "Artigo não encontrado")
    return artigo

@app.post("/artigos", status_code=201)
async def criar_artigo(artigo: ArtigoBase):
    """Cria um novo artigo."""
    return await ArtigoService.criar(artigo)
```

## Middleware e Dependências

```python
from fastapi import Request
import time

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start
    print(f"{request.method} {request.url.path} - {duration:.3f}s")
    return response
```

## Relações no Grafo

FastAPI é construído com [[Python]] e usa type hints extensivamente.
Aplicações FastAPI são deployadas com [[Docker]].
O servidor roda em ambientes [[Linux]].

## Checklist de Estudo

- [x] Rotas básicas (GET, POST, PUT, DELETE)
- [x] Pydantic models
- [ ] Dependências e injeção
- [ ] Middleware
- [ ] Autenticação JWT
- [ ] WebSockets
- [ ] Background tasks
- [ ] Testes com TestClient
- [ ] Deploy com Docker
```
