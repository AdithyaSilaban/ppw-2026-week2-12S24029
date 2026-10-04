/**
 * app.js — Presentation Layer
 * Mengatur tampilan (DOM), event, dan alur UI states.
 * Semua pengambilan/pengiriman data didelegasikan ke ApiService (api-service.js).
 */
const App = {
  state: {
    projects: [],
    filteredCategory: 'all',
  },
  els: {},

  async init() {
    this.cacheEls();
    this.bindStaticEvents();
    await this.loadProfile();
    await this.loadServices();
    await this.loadProjects();
    this.updateOrderBadge(this.getOrders().length);
  },

  cacheEls() {
    this.els.projectsContainer = document.getElementById('projectsContainer');
    this.els.projectsLoading = document.getElementById('projectsLoading');
    this.els.projectsEmpty = document.getElementById('projectsEmpty');
    this.els.projectsError = document.getElementById('projectsError');
    this.els.categoryFilter = document.getElementById('categoryFilter');
    this.els.topikSelect = document.getElementById('topik');
    this.els.consultForm = document.getElementById('consultForm');
    this.els.orderCountBadge = document.getElementById('orderCountBadge');
  },

  bindStaticEvents() {
    // Filter kategori — event delegation di elemen pembungkus tombol
    this.els.categoryFilter?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-category]');
      if (!btn) return;
      this.els.categoryFilter.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      this.state.filteredCategory = btn.dataset.category;
      this.renderProjects();
    });

    // Tombol "Lihat detail" dibuat ulang tiap render, jadi listener
    // dipasang sekali di container-nya (event delegation), bukan per tombol.
    this.els.projectsContainer?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-project-id]');
      if (btn) this.openProjectModal(btn.dataset.projectId);
    });

    this.els.consultForm?.addEventListener('submit', (e) => this.handleFormSubmit(e));
  },

  // ---------- PROFILE ----------
  async loadProfile() {
    try {
      const profile = await ApiService.getProfile();
      this.setText('vitalProgram', profile.program);
      this.setText('vitalCohort', profile.cohort);
      this.setText('vitalGpa', profile.gpa);
      this.setText('vitalLocation', profile.location);
      this.setText('vitalStatus', profile.status);
    } catch (err) {
      console.error('[App] Gagal memuat profil:', err);
    }
  },

  // ---------- SERVICES (untuk dropdown Topik) ----------
  async loadServices() {
    if (!this.els.topikSelect) return;
    try {
      const services = await ApiService.getServices();
      this.els.topikSelect.innerHTML = services
        .map((s) => `<option value="${this.escapeHTML(s.id)}">${this.escapeHTML(s.name)}</option>`)
        .join('');
    } catch (err) {
      console.error('[App] Gagal memuat layanan:', err);
    }
  },

  // ---------- PROJECTS + 4 UI STATES ----------
  async loadProjects() {
    this.setProjectsState('loading');
    try {
      this.state.projects = await ApiService.getProjects();
      this.renderProjects();
    } catch (err) {
      console.error('[App] Gagal memuat proyek:', err);
      this.setProjectsState('error', 'Gagal memuat data proyek. Periksa koneksi internet atau coba muat ulang halaman.');
    }
  },

  setProjectsState(mode, message = '') {
    this.els.projectsLoading.classList.toggle('d-none', mode !== 'loading');
    this.els.projectsEmpty.classList.toggle('d-none', mode !== 'empty');
    this.els.projectsError.classList.toggle('d-none', mode !== 'error');
    this.els.projectsContainer.classList.toggle('d-none', mode !== 'success');
    if (mode === 'error') this.els.projectsError.textContent = message;
  },

  renderProjects() {
    const list =
      this.state.filteredCategory === 'all'
        ? this.state.projects
        : this.state.projects.filter((p) => p.category === this.state.filteredCategory);

    if (list.length === 0) {
      this.setProjectsState('empty');
      return;
    }
    this.setProjectsState('success');

    // escapeHTML() dipakai di SETIAP nilai dari data sebelum disuntikkan ke
    // innerHTML — ini mencegah DOM-based XSS kalau seandainya data JSON
    // pernah mengandung karakter/tag berbahaya.
    this.els.projectsContainer.innerHTML = list
      .map(
        (p) => `
      <div class="col">
        <article class="card project-card h-100">
          ${this.renderBanner(p)}
          <div class="card-body">
            <h3 class="card-title h5">${this.escapeHTML(p.title)}</h3>
            <p class="card-text">${this.escapeHTML(p.description)}</p>
            ${p.metrics ? `<p class="card-text small mb-2"><i class="bi bi-graph-up-arrow me-1"></i><strong>Metrik:</strong> ${this.escapeHTML(p.metrics)}</p>` : ''}
            <div class="badge-row">
              ${p.tags.map((t) => `<span class="badge tech-badge">${this.escapeHTML(t)}</span>`).join('')}
            </div>
          </div>
          <div class="card-footer">
            <button type="button" class="btn btn-detail" data-project-id="${this.escapeHTML(p.id)}">
              Lihat detail <i class="bi bi-arrow-up-right"></i>
            </button>
          </div>
        </article>
      </div>`
      )
      .join('');
  },

  /**
   * Menentukan tampilan bagian atas kartu:
   * - Kalau proyek punya field "thumbnail" di JSON → tampilkan foto sungguhan,
   *   dibungkus .project-thumb supaya rasio gambar apa pun (lebar/landscape
   *   atau sempit/portrait seperti screenshot HP) tetap utuh, tidak gepeng
   *   dan tidak terpotong — lihat aturan object-fit: contain di CSS.
   * - Kalau tidak ada "thumbnail" (misalnya proyek analisis tanpa dokumentasi
   *   visual) → tetap pakai ikon seperti sebelumnya, TANPA bingkai foto.
   */
  renderBanner(p) {
    if (p.thumbnail) {
      return `
        <div class="project-thumb">
          <img src="${this.escapeHTML(p.thumbnail)}" alt="Tangkapan layar proyek ${this.escapeHTML(p.title)}" loading="lazy">
        </div>`;
    }
    return `<div class="project-banner"><i class="bi ${this.escapeHTML(p.icon)}"></i></div>`;
  },

  // ---------- UNIVERSAL MODAL ----------
  openProjectModal(projectId) {
    const proj = this.state.projects.find((p) => p.id === projectId);
    if (!proj) return;

    document.getElementById('projectModalTitle').textContent = proj.title;
    document.getElementById('projectModalBody').innerHTML = `
          ${proj.thumbnail ? `
        <div class="mb-3 text-center border p-2" style="background: var(--bg-alt);">
          <img src="${this.escapeHTML(proj.thumbnail)}" class="img-fluid" style="max-height: 280px; object-fit: contain;" alt="${this.escapeHTML(proj.title)}">
        </div>` : ''}
      <div class="d-flex align-items-center gap-2 mb-3">
        <span class="badge tech-badge">${this.escapeHTML(proj.category)}</span>
      </div>
      <p><strong>Mata kuliah:</strong> ${this.escapeHTML(proj.course)}</p>
      <p><strong>Peran:</strong> ${this.escapeHTML(proj.role)}</p>
       ${proj.metrics ? `<p><strong>Metrik / Capaian:</strong> ${this.escapeHTML(proj.metrics)}</p>` : ''}
      <p><strong>Deskripsi:</strong> ${this.escapeHTML(proj.description)}</p>
      ${proj.link ? `
        <div class="mt-3 pt-3 border-top">
          <a href="${this.escapeHTML(proj.link)}" target="_blank" rel="noopener noreferrer" class="btn btn-detail">
            ${proj.link.includes('figma.com') ? '<i class="bi bi-figma me-1"></i> Buka Prototipe Figma' : '<i class="bi bi-github me-1"></i> Buka Repositori GitHub'}
            <i class="bi bi-box-arrow-up-right ms-1"></i>
          </a>
        </div>` : ''}
    `;

    const modalEl = document.getElementById('universalProjectModal');
    bootstrap.Modal.getOrCreateInstance(modalEl).show();
  },

  // ---------- FORM ASINKRON ----------
  async handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;

    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      return;
    }

    const payload = Object.fromEntries(new FormData(form).entries());
    const submitBtn = form.querySelector('.btn-submit');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Mengirim...';

    try {
      const result = await ApiService.submitServiceOrder(payload);
      this.saveOrder({ ...payload, orderId: result.id ?? Date.now() });
      this.showToast('Sukses!', 'Permintaan konsultasi berhasil dikirim.');
      form.reset();
      form.classList.remove('was-validated');
    } catch (err) {
      console.error('[App] Gagal mengirim form:', err);
      this.showToast('Gagal', 'Terjadi kesalahan saat mengirim. Silakan coba lagi.', true);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  },

  // ---------- LOCAL STORAGE (state lokal sisi klien) ----------
  getOrders() {
    return JSON.parse(localStorage.getItem('serviceOrders') || '[]');
  },

  saveOrder(order) {
    const orders = this.getOrders();
    orders.push(order);
    localStorage.setItem('serviceOrders', JSON.stringify(orders));
    this.updateOrderBadge(orders.length);
  },

  updateOrderBadge(count) {
    if (this.els.orderCountBadge) this.els.orderCountBadge.textContent = count;
  },

  // ---------- TOAST ----------
  showToast(title, message, isError = false) {
    const toastEl = document.getElementById('appToast');
    if (!toastEl) return;
    document.getElementById('toastTitle').textContent = title;
    document.getElementById('toastBody').textContent = message;
    toastEl.classList.toggle('text-bg-danger', isError);
    bootstrap.Toast.getOrCreateInstance(toastEl).show();
  },

  // ---------- HELPERS ----------
  setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  },

  /** Mencegah DOM-based XSS: ubah string jadi teks aman sebelum masuk innerHTML */
  escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = String(str ?? '');
    return div.innerHTML;
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());