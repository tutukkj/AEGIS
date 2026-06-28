---
title: LLM
description: Large Language Models — modelos de linguagem de grande escala
type: article
difficulty: advanced
tags:
  - ai
  - deep-learning
  - nlp
status: studying
estimated_hours: 50
roadmap: ai-engineering
color: purple
icon: brain
created: 2024-04-01
updated: 2024-06-25
aliases:
  - large-language-models
  - modelos-de-linguagem
related:
  - rag
  - agents
  - python
---

# Large Language Models (LLM)

LLMs são modelos de deep learning treinados em vastas quantidades de texto para entender e gerar linguagem natural.

## Arquitetura Transformer

A base dos LLMs modernos é a arquitetura **Transformer** (Vaswani et al., 2017).

```
Input → Tokenização → Embeddings → [Transformer Blocks × N] → Output
```

### Componentes Principais

1. **Self-Attention**: Permite que cada token "preste atenção" em todos os outros
2. **Multi-Head Attention**: Múltiplas heads de atenção em paralelo
3. **Feed-Forward Network**: Processamento não-linear
4. **Layer Normalization**: Estabilização do treinamento
5. **Positional Encoding**: Informação de posição dos tokens

### Fórmula da Atenção

$$
\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V
$$

Onde:
- $Q$ = Query matrix
- $K$ = Key matrix
- $V$ = Value matrix
- $d_k$ = dimensão das keys

## Modelos Importantes

| Modelo | Empresa | Parâmetros | Destaque |
|--------|---------|------------|----------|
| **GPT-4** | OpenAI | ~1.8T | Multimodal, raciocínio |
| **Claude** | Anthropic | N/D | Segurança, contexto longo |
| **Llama 3** | Meta | 8B-405B | Open-source |
| **Gemini** | Google | N/D | Multimodal nativo |
| **Mixtral** | Mistral | 8x7B | Mixture of Experts |

## Técnicas de Fine-Tuning

```python
# Exemplo com LoRA (Low-Rank Adaptation)
from peft import LoraConfig, get_peft_model
from transformers import AutoModelForCausalLM

model = AutoModelForCausalLM.from_pretrained("meta-llama/Llama-3-8B")

lora_config = LoraConfig(
    r=16,
    lora_alpha=32,
    target_modules=["q_proj", "v_proj"],
    lora_dropout=0.05,
)

model = get_peft_model(model, lora_config)
print(f"Parâmetros treináveis: {model.print_trainable_parameters()}")
```

## Relações no Grafo

LLMs são a base para sistemas de [[RAG]] e [[Agentes de IA]].
São implementados e fine-tuned com [[Python]].
O entendimento matemático requer [[Álgebra Linear]] e [[Cálculo]].

## Checklist de Estudo

- [x] Conceitos básicos de NLP
- [x] Arquitetura Transformer
- [ ] Mecanismo de atenção em profundidade
- [ ] Tokenização (BPE, SentencePiece)
- [ ] Fine-tuning com LoRA/QLoRA
- [ ] RLHF (Reinforcement Learning from Human Feedback)
- [ ] Quantização de modelos
- [ ] Serving e inferência otimizada
- [ ] Avaliação de modelos (benchmarks)
