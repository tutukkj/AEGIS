// Wrapper de requisições HTTP Fetch para a API do Aegis

async function request(method, url, body = null, options = {}) {
  const defaultHeaders = {
    'Content-Type': 'application/json'
  };

  const config = {
    method,
    headers: { ...defaultHeaders, ...options.headers },
    ...options
  };

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, config);
    
    // Se não autorizado (401), redireciona para a tela de login
    if (response.status === 401) {
      console.warn('Sessão expirada ou não autorizada. Redirecionando para login...');
      window.location.href = '/login';
      return null;
    }

    const contentType = response.headers.get('content-type');
    let data = null;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      throw new Error(data?.error || data || `Erro de requisição ${response.status}`);
    }

    return data;
  } catch (err) {
    console.error(`Falha na requisição [${method}] ${url}:`, err);
    throw err;
  }
}

export const api = {
  get: (url, options) => request('GET', url, null, options),
  post: (url, body, options) => request('POST', url, body, options),
  put: (url, body, options) => request('PUT', url, body, options),
  delete: (url, options) => request('DELETE', url, null, options)
};
