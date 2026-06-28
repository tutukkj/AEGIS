import { slugify } from '../utils/slugify.js';

/**
 * Converte Markdown em HTML processando WikiLinks e Callouts Obsidian.
 * @param {string} markdown 
 * @param {Array<string>} existingSlugs 
 * @returns {string} - HTML resultante
 */
export function renderMarkdown(markdown, existingSlugs = []) {
  if (!markdown) return '';

  if (typeof window.marked === 'undefined') {
    console.error('marked.js não está carregado.');
    return `<pre>${markdown}</pre>`;
  }

  // 1. Configurar renderizador customizado do marked para interceptar blocos 'mermaid'
  const renderer = new window.marked.Renderer();
  renderer.code = (code, language) => {
    // No marked moderno, o parâmetro code às vezes é um objeto, então garantimos que seja string
    const codeText = typeof code === 'object' ? code.text : code;
    const lang = language || '';
    
    if (lang === 'mermaid') {
      return `<div class="mermaid-diagram select-none my-4 flex justify-center bg-surface/30 p-4 rounded-2xl border border-border/40" data-code="${encodeURIComponent(codeText)}">
        <div class="flex items-center gap-2 text-xs text-textSecondary">
          <div class="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
          <span>Renderizando diagrama...</span>
        </div>
      </div>`;
    }
    return `<pre><code class="language-${lang}">${codeText}</code></pre>`;
  };

  // Renderizar markdown básico usando o marked.js com renderizador customizado
  let html = window.marked.parse(markdown, { renderer });

  // 2. Processar WikiLinks: [[Nome do Artigo]] ou [[Nome do Artigo|Apelido]]
  const wikilinkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  html = html.replace(wikilinkRegex, (match, target, alias) => {
    const cleanTarget = target.trim();
    const cleanAlias = alias ? alias.trim() : cleanTarget;
    const targetSlug = slugify(cleanTarget);
    
    // Verificar se o link está quebrado (se o slug não existe nos artigos atuais)
    const isBroken = existingSlugs.length > 0 && !existingSlugs.includes(targetSlug);
    const brokenClass = isBroken ? 'wikilink-broken' : '';
    const titleAttr = isBroken ? 'Criar nota inexistente' : cleanTarget;

    return `<a href="#editor/${targetSlug}" class="wikilink ${brokenClass}" title="${titleAttr}">${cleanAlias}</a>`;
  });

  // 3. Processar Obsidian-style Callouts dentro de blockquotes
  const calloutRegex = /<blockquote>\s*<p>\s*\[!([A-Z]+)\]\s*(?:\n|<br>)?([\s\S]*?)<\/p>\s*<\/blockquote>/gi;
  html = html.replace(calloutRegex, (match, type, content) => {
    const lowerType = type.toLowerCase();
    
    const calloutConfigs = {
      note: { icon: 'info', title: 'Nota' },
      nota: { icon: 'info', title: 'Nota' },
      tip: { icon: 'lightbulb', title: 'Dica' },
      dica: { icon: 'lightbulb', title: 'Dica' },
      idea: { icon: 'lightbulb', title: 'Ideia' },
      warning: { icon: 'alert-triangle', title: 'Aviso' },
      aviso: { icon: 'alert-triangle', title: 'Aviso' },
      danger: { icon: 'alert-circle', title: 'Perigo' },
      perigo: { icon: 'alert-circle', title: 'Perigo' },
      todo: { icon: 'check-square', title: 'A Fazer' }
    };

    const config = calloutConfigs[lowerType] || { icon: 'help-circle', title: type };
    const calloutClass = ['note', 'nota'].includes(lowerType) ? 'note' 
      : ['tip', 'dica', 'idea'].includes(lowerType) ? 'tip'
      : ['warning', 'aviso'].includes(lowerType) ? 'warning'
      : ['danger', 'perigo'].includes(lowerType) ? 'danger'
      : 'note';

    return `
      <div class="callout callout-${calloutClass} my-4 animate-fade-in">
        <div class="callout-title flex items-center gap-2">
          <i data-lucide="${config.icon}" class="w-4 h-4 flex-shrink-0"></i>
          <span>${config.title}</span>
        </div>
        <div class="callout-content text-sm mt-1 text-textSecondary">${content}</div>
      </div>
    `;
  });

  return html;
}

/**
 * Pós-processa o contêiner HTML para renderizar equações matemáticas (KaTeX) e diagramas (Mermaid)
 * @param {HTMLElement} containerEl 
 */
export async function postProcessMarkdown(containerEl) {
  if (!containerEl) return;

  // 1. Renderizar equações matemáticas KaTeX (auto-render)
  if (typeof window.renderMathInElement !== 'undefined') {
    try {
      window.renderMathInElement(containerEl, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false }
        ],
        throwOnError: false
      });
    } catch (err) {
      console.error('Erro ao renderizar KaTeX:', err);
    }
  }

  // 2. Renderizar diagramas Mermaid de forma assíncrona
  if (typeof window.mermaid !== 'undefined') {
    const diagrams = containerEl.querySelectorAll('.mermaid-diagram');
    for (let index = 0; index < diagrams.length; index++) {
      const el = diagrams[index];
      const code = decodeURIComponent(el.getAttribute('data-code'));
      const uniqueId = `mermaid-svg-${index}-${Date.now()}`;
      
      try {
        const { svg } = await window.mermaid.render(uniqueId, code);
        el.innerHTML = svg;
      } catch (err) {
        console.error('Erro ao renderizar diagrama Mermaid:', err);
        el.innerHTML = `<span class="text-error text-xs font-mono p-2">Erro ao renderizar diagrama Mermaid. Verifique a sintaxe.</span>`;
        
        // Limpar o cache interno do parser do Mermaid caso quebre a renderização de diagramas subsequentes
        const badSvg = document.getElementById(uniqueId);
        if (badSvg) badSvg.remove();
      }
    }
  }
}
