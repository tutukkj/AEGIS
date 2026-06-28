// Helpers utilitários para manipulação do DOM

export function el(selector, parent = document) {
  return parent.querySelector(selector);
}

export function elAll(selector, parent = document) {
  return Array.from(parent.querySelectorAll(selector));
}

export function on(element, event, callback) {
  if (element) {
    element.addEventListener(event, callback);
  }
}

export function html(templateString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(templateString.trim(), 'text/html');
  return doc.body.firstChild;
}

export function mount(parent, child) {
  if (!parent) return;
  parent.innerHTML = '';
  if (child) {
    if (typeof child === 'string') {
      parent.innerHTML = child;
    } else {
      parent.appendChild(child);
    }
  }
}

export function safeHTML(text) {
  const div = document.createElement('div');
  div.innerText = text;
  return div.innerHTML;
}
