// Aegis Client State Store

class Store {
  constructor() {
    this.state = {
      user: null,
      currentRoute: '',
      activeArticle: null, // Artigo em foco
      pomodoro: {
        status: 'idle', // idle, running, paused, break
        remaining: 25 * 60,
        total: 25 * 60,
        articleSlug: null,
        articleTitle: null,
        session_id: null,
        interruptions: 0
      },
      wsConnected: false
    };
    
    this.listeners = new Map();
  }
  
  getState() {
    return this.state;
  }
  
  setState(key, value) {
    const oldValue = this.state[key];
    this.state[key] = value;
    this.emit(key, value, oldValue);
  }
  
  subscribe(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    this.listeners.get(key).push(callback);
    
    // Retorna função para desinscrever
    return () => {
      const list = this.listeners.get(key) || [];
      this.listeners.set(key, list.filter(cb => cb !== callback));
    };
  }
  
  emit(key, newValue, oldValue) {
    const list = this.listeners.get(key) || [];
    for (const callback of list) {
      try {
        callback(newValue, oldValue);
      } catch (err) {
        console.error(`Erro ao disparar listener de '${key}':`, err);
      }
    }
  }
}

export const store = new Store();
