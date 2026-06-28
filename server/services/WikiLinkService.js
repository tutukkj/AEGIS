export class WikiLinkService {
  /**
   * Extrai todos os wikilinks de um texto markdown
   * Exemplo: [[Docker]] ou [[FastAPI|Meu link para FastAPI]]
   * @param {string} content 
   * @returns {Array<{target: string, label: string, raw: string}>}
   */
  static parseLinks(content) {
    if (!content) return [];
    
    const wikilinkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
    const links = [];
    let match;

    while ((match = wikilinkRegex.exec(content)) !== null) {
      const target = match[1].trim();
      const label = match[2] ? match[2].trim() : target;
      
      links.push({
        target,
        label,
        raw: match[0]
      });
    }

    return links;
  }
}
