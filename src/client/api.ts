// API Client for UPI-Pay

export interface User {
  id: number;
  email: string;
  username: string;
  role: 'USER' | 'ADMIN';
  avatar_url?: string;
  created_at?: string;
}

export interface Wallet {
  balance: number;
  currency: string;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('upipay_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('upipay_token', token);
    } else {
      localStorage.removeItem('upipay_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(endpoint, {
      ...options,
      headers
    });

    const data = await response.json().catch(() => ({ success: false, error: 'PARSE_ERROR' }));

    if (!response.ok) {
      const err = new Error(data.message || data.error || 'Request failed');
      (err as any).status = response.status;
      (err as any).data = data;
      throw err;
    }

    return data;
  }

  // Auth
  async register(payload: { email: string; username: string; password: string }) {
    const res = await this.request('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) });
    if (res.token) this.setToken(res.token);
    return res;
  }

  async login(payload: { email: string; password: string }) {
    const res = await this.request('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) });
    if (res.token) this.setToken(res.token);
    return res;
  }

  async getMe() {
    return this.request('/api/auth/me');
  }

  async logout() {
    await this.request('/api/auth/logout', { method: 'POST' });
    this.setToken(null);
  }

  async switchDemo(target: 'alex' | 'admin') {
    const res = await this.request('/api/auth/switch-demo', { method: 'POST', body: JSON.stringify({ target }) });
    if (res.token) this.setToken(res.token);
    return res;
  }

  // Products
  async getProducts(params: Record<string, string> = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/api/products${qs ? '?' + qs : ''}`);
  }

  async getProduct(idOrSlug: string | number) {
    return this.request(`/api/products/${idOrSlug}`);
  }

  async purchaseProduct(id: number, coupon_code?: string) {
    return this.request(`/api/products/${id}/purchase`, {
      method: 'POST',
      body: JSON.stringify({ coupon_code })
    });
  }

  async toggleFavorite(id: number) {
    return this.request(`/api/products/${id}/favorite`, { method: 'POST' });
  }

  async submitReview(productId: number, rating: number, review_text: string) {
    return this.request(`/api/products/${productId}/reviews`, {
      method: 'POST',
      body: JSON.stringify({ rating, review_text })
    });
  }

  // Content Authorization & Progress
  async getAuthorizedContent(productId: number) {
    return this.request(`/api/content/${productId}/access`);
  }

  async saveProgress(payload: { product_id: number; lesson_id?: number; position_seconds: number; duration_seconds: number }) {
    return this.request('/api/content/progress', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // Library
  async getLibrary() {
    return this.request('/api/library');
  }

  // Wallet
  async getWallet() {
    return this.request('/api/wallet');
  }

  async getTransactions() {
    return this.request('/api/wallet/transactions');
  }

  async submitManualTopup(payload: any) {
    return this.request('/api/wallet/topup/manual', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async simulateAutoTopup(payload: { method: string; credits: number; outcome?: 'SUCCESS' | 'FAIL' }) {
    return this.request('/api/wallet/topup/simulate-auto', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async giftCredits(payload: { recipient: string; amount: number; note?: string }) {
    return this.request('/api/wallet/gift', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async validateCoupon(code: string, amount: number) {
    return this.request('/api/wallet/coupon/validate', {
      method: 'POST',
      body: JSON.stringify({ code, amount })
    });
  }

  // Notifications
  async getNotifications() {
    return this.request('/api/notifications');
  }

  async markNotificationRead(id: number) {
    return this.request(`/api/notifications/${id}/read`, { method: 'POST' });
  }

  async markAllNotificationsRead() {
    return this.request('/api/notifications/read-all', { method: 'POST' });
  }

  // Admin
  async getAdminStats() {
    return this.request('/api/admin/stats');
  }

  async getAdminTopups() {
    return this.request('/api/admin/topups');
  }

  async approveTopup(id: number) {
    return this.request(`/api/admin/topups/${id}/approve`, { method: 'POST' });
  }

  async rejectTopup(id: number, reason: string) {
    return this.request(`/api/admin/topups/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  }

  async getAdminProducts() {
    return this.request('/api/admin/products');
  }

  async createProduct(payload: any) {
    return this.request('/api/admin/products', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async updateProduct(id: number, payload: any) {
    return this.request(`/api/admin/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  async deleteProduct(id: number) {
    return this.request(`/api/admin/products/${id}`, { method: 'DELETE' });
  }

  async getAdminUsers() {
    return this.request('/api/admin/users');
  }

  async adjustUserBalance(userId: number, amount: number, reason: string) {
    return this.request(`/api/admin/users/${userId}/adjust-balance`, {
      method: 'POST',
      body: JSON.stringify({ amount, reason })
    });
  }

  async getAdminAuditLogs() {
    return this.request('/api/admin/audit-logs');
  }
}

export const api = new ApiClient();
