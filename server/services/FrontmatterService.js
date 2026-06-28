import matter from 'gray-matter';

export class FrontmatterService {
  /**
   * Parseia uma string markdown contendo YAML frontmatter
   * @param {string} fileContent 
   * @returns {{ data: object, content: string }}
   */
  static parse(fileContent) {
    const parsed = matter(fileContent);
    return {
      data: parsed.data || {},
      content: parsed.content || ''
    };
  }

  /**
   * Serializa metadados e conteúdo em uma string formatada em Markdown com YAML frontmatter
   * @param {string} content 
   * @param {object} data 
   * @returns {string}
   */
  static stringify(content, data) {
    return matter.stringify(content, data);
  }

  /**
   * Retorna os metadados padrão para um novo artigo
   * @param {string} title 
   * @returns {object}
   */
  static getDefaults(title) {
    return {
      title: title || 'Sem título',
      description: '',
      type: 'article', // article, project, snippet, note
      difficulty: 'intermediate', // beginner, intermediate, advanced
      tags: [],
      status: 'not_started', // not_started, studying, review, completed
      estimated_hours: 0,
      roadmap: '',
      color: 'blue',
      icon: 'file-text',
      created: new Date().toISOString().split('T')[0],
      updated: new Date().toISOString().split('T')[0],
      aliases: [],
      related: []
    };
  }
}
