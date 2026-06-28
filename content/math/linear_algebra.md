---
title: Álgebra Linear
description: Vetores, matrizes e transformações lineares para IA
type: article
difficulty: intermediate
tags:
  - matemática
  - fundamentos
  - ai
status: not_started
estimated_hours: 35
roadmap: ai-engineering
color: indigo
icon: grid
created: 2024-03-25
updated: 2024-06-12
aliases:
  - algebra-linear
  - linear-algebra
related:
  - calculus
  - llm
  - python
---

# Álgebra Linear

Álgebra Linear é o estudo de vetores, matrizes e transformações lineares. É a linguagem matemática fundamental de machine learning e deep learning.

## Vetores e Matrizes

```python
import numpy as np

# Vetores
v = np.array([1, 2, 3])
w = np.array([4, 5, 6])

# Operações
produto_escalar = np.dot(v, w)      # 32
norma = np.linalg.norm(v)           # 3.741
cosseno = np.dot(v, w) / (np.linalg.norm(v) * np.linalg.norm(w))  # 0.974

# Matrizes
A = np.array([[1, 2], [3, 4]])
B = np.array([[5, 6], [7, 8]])

produto = A @ B  # Multiplicação de matrizes
inversa = np.linalg.inv(A)
autovalores, autovetores = np.linalg.eig(A)
```

## Conceitos Essenciais para IA

| Conceito | Aplicação em IA |
|----------|-----------------|
| **Produto escalar** | Similaridade entre embeddings |
| **Multiplicação de matrizes** | Forward pass em redes neurais |
| **Autovalores/autovetores** | PCA, redução de dimensionalidade |
| **SVD** | Compressão, recomendação |
| **Normas** | Regularização (L1, L2) |

## Embeddings e Similaridade

```python
def cosine_similarity(a, b):
    """Similaridade cosseno entre dois vetores."""
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

# Em LLMs, palavras são vetores de alta dimensão
rei = np.random.randn(768)     # embedding de "rei"
rainha = np.random.randn(768)  # embedding de "rainha"

similaridade = cosine_similarity(rei, rainha)
```

## Relações no Grafo

Álgebra Linear é fundamental para entender [[LLM]] (atenção é multiplicação de matrizes).
Complementa [[Cálculo]] nos fundamentos matemáticos.
Implementações práticas usam [[Python]] (NumPy).

## Checklist de Estudo

- [ ] Vetores e operações
- [ ] Matrizes e multiplicação
- [ ] Sistemas lineares
- [ ] Determinantes
- [ ] Autovalores e autovetores
- [ ] SVD
- [ ] PCA
- [ ] Aplicações em ML
