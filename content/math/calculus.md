---
title: Cálculo
description: Fundamentos de cálculo diferencial e integral para IA e engenharia
type: article
difficulty: advanced
tags:
  - matemática
  - fundamentos
  - ai
status: studying
estimated_hours: 40
roadmap: ai-engineering
color: red
icon: function-square
created: '2024-03-20T00:00:00.000Z'
updated: '2026-06-28'
aliases:
  - calculo-diferencial
  - calculo-integral
related:
  - linear_algebra
  - llm
---
# Cálculo

Cálculo é o ramo da matemática que estuda taxas de variação (diferencial) e acumulação de quantidades (integral). É fundamental para entender otimização em machine learning.

## Derivadas

A derivada mede a taxa de variação instantânea de uma função.

$$
f'(x) = \lim_{h \to 0} \frac{f(x+h) - f(x)}{h}
$$

### Regras de Derivação

| Regra | Fórmula |
|-------|--------|
| Potência | $(x^n)' = nx^{n-1}$ |
| Produto | $(fg)' = f'g + fg'$ |
| Quociente | $(f/g)' = (f'g - fg')/g^2$ |
| Cadeia | $(f(g(x)))' = f'(g(x)) \cdot g'(x)$ |

### Aplicação em ML: Gradient Descent

```python
def gradient_descent(f, df, x0, lr=0.01, epochs=1000):
    """Otimização por gradiente descendente."""
    x = x0
    history = [x]
    for _ in range(epochs):
        grad = df(x)
        x = x - lr * grad
        history.append(x)
    return x, history

# Minimizar f(x) = x² + 2x + 1
f = lambda x: x**2 + 2*x + 1
df = lambda x: 2*x + 2

minimo, hist = gradient_descent(f, df, x0=5.0)
print(f"Mínimo encontrado em x = {minimo:.4f}")  # x ≈ -1.0
```

## Integrais

$$
\int_a^b f(x) \, dx = F(b) - F(a)
$$

## Relações no Grafo

Cálculo é essencial para entender backpropagation em [[LLM]].
Complementa [[Álgebra Linear]] nos fundamentos de IA.

## Checklist de Estudo

- [ ] Limites
- [ ] Derivadas básicas
- [ ] Regra da cadeia
- [ ] Derivadas parciais
- [ ] Gradient descent
- [ ] Integrais
- [ ] Cálculo multivariável
