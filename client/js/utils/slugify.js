/**
 * Converte uma string em um slug URL-friendly (lado do cliente)
 * @param {string} text 
 * @returns {string}
 */
export function slugify(text) {
  if (!text) return '';
  
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}
