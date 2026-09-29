/**
 * api-service.js — Data Access Layer
 * Satu-satunya berkas yang boleh memanggil fetch().
 * app.js TIDAK PERNAH memanggil fetch() secara langsung — semua permintaan
 * data lewat sini, supaya kalau sumber data berubah (misal ganti ke API
 * sungguhan), app.js tidak perlu diubah sama sekali.
 */
const ApiService = {
  async _getJSON(path) {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }
    return response.json();
  },

  getProjects() {
    return this._getJSON('./data/projects.json');
  },

  getServices() {
    return this._getJSON('./data/services.json');
  },

  getProfile() {
    return this._getJSON('./data/profile.json');
  },

  /**
   * Mengirim data form konsultasi.
   * Menggunakan endpoint mock publik (jsonplaceholder.typicode.com) karena
   * GitHub Pages adalah static hosting tanpa backend sungguhan — endpoint ini
   * menerima POST sungguhan dan membalas dengan data palsu, cukup untuk
   * didemonstrasikan dan dianalisis di tab Network DevTools.
   */
  async submitServiceOrder(payload) {
    const response = await fetch('https://jsonplaceholder.typicode.com/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }
    return response.json();
  },
};