/**
 * Converte uma string em um slug URL-friendly
 * Exemplo: "Álgebra Linear!" -> "algebra-linear"
 * @param {string} text 
 * @returns {string}
 */
export function slugify(text) {
  if (!text) return '';
  
  return text
    .toString()
    .normalize('NFD') // Decompõe caracteres acentuados
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Substitui espaços por hifens
    .replace(/[^\w\-]+/g, '') // Remove caracteres especiais
    .replace(/\-\-+/g, '-'); // Remove hifens duplicados
}
