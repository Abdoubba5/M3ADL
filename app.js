<script>
// ===== db.js - IndexedDB Module =====
const DB = {
  dbName: 'UniScoreDZ', dbVersion: 2, db: null,
  async init() {
    return new Promise((res, rej) => {
      const req = indexedDB.open(this.dbName, this.dbVersion);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('students')) {
          const s = db.createObjectStore('students', { keyPath: 'id', autoIncrement: true });
          s.createIndex('registration', 'registration', { unique: true });
        }
        if (!db.objectStoreNames.contains('modules')) {
          const s = db.createObjectStore('modules', { keyPath: 'id', autoIncrement: true });
          s.createIndex('studentId', 'studentId', { unique: false });
          s.createIndex('semester', 'semester', { unique: false });
        }
        if (!db.objectStoreNames.contains('profile')) db.createObjectStore('profile', { keyPath: 'key' });
      };
      req.onsuccess = e => { this.db = e.target.result; res(this.db); };
      req.onerror = e => rej(e.target.error);
    });
  },
  async getAll(s) { return new Promise((res, rej) => { const tx = this.db.transaction(s, 'readonly'); const req = tx.objectStore(s).getAll(); req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); }); },
  async get(s, id) { return new Promise((res, rej) => { const tx = this.db.transaction(s, 'readonly'); const req = tx.objectStore(s).get(id); req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); }); },
  async put(s, data) { return new Promise((res, rej) => { const tx = this.db.transaction(s, 'readwrite'); const req = tx.objectStore(s).put(data); req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); }); },
  async del(s, id) { return new Promise((res, rej) => { const tx = this.db.transaction(s, 'readwrite'); const req = tx.objectStore(s).delete(id); req.onsuccess = () => res(); req.onerror = () => rej(req.error); }); },
  async getByIndex(s, idx, val) { return new Promise((res, rej) => { const tx = this.db.transaction(s, 'readonly'); const req = tx.objectStore(s).index(idx).getAll(val); req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); }); },
  async getProfile(key) { const all = await this.getAll('profile'); return all.find(p => p.key === key) || null; },
  async setProfile(key, value) { return this.put('profile', { key, value }); }
};

// ===== ui.js - UI Utilities Module =====
const UI = {
  toast(msg, type = 'success', duration = 3000) {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle' };
    t.innerHTML = '<i class="fas ' + (icons[type] || icons.success) + '"></i><span class="toast-msg">' + msg + '</span>';
    c.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(-20px)'; t.style.transition = 'all 0.3s'; setTimeout(() => t.remove(), 300); }, duration);
  },
  openModal(title, bodyHTML, footerHTML) {
    document.getElementById('modalOverlay').classList.add('active');
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = bodyHTML || '';
    document.getElementById('modalFooter').innerHTML = footerHTML || '';
  },
  closeModal() { document.getElementById('modalOverlay').classList.remove('active'); },
  confirmDialog(msg, callback) {
    this.openModal('تاكيد', '<p style="font-size:14px;color:var(--text-secondary)">' + msg + '</p>',
      '<button class="btn btn-secondary" onclick="UI.closeModal()">إلغاء</button><button class="btn btn-danger" onclick=UI.closeModal();(' + callback + ')()>تأكيد</button>');
  },
  sanitize(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }
};

// ===== router.js - Hash Router Module =====
const Router = {
  routes: ['dashboard', 'students', 'profile', 'modules', 'analytics', 'assistant', 'settings', 'reports'],
  current: 'dashboard',
  init() { window.addEventListener('hashchange', () => this.handle()); this.handle(); },
  handle() { const hash = location.hash.replace('#/', '') || 'dashboard'; this.navigate(this.routes.includes(hash) ? hash : 'dashboard'); },
  navigate(route) {
    if (!this.routes.includes(route)) return;
    this.current = route;
    document.querySelectorAll('.page-wrapper').forEach(p => p.classList.remove('active'));
    const el = document.getElementById('page-' + route);
    if (el) el.classList.add('active');
    document.getElementById('pageTitle').textContent = this.getTitle(route);
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('[data-route="' + route + '"]').forEach(n => n.classList.add('active'));
    document.getElementById('sidebar').classList.remove('open');
    if (App.onRouteChange) App.onRouteChange(route);
  },
  getTitle(r) { return { dashboard: 'لوحة القيادة', students: 'الطلاب', profile: 'الملف الشخصي', modules: 'المواد', analytics: 'التحليلات', assistant: 'المساعد الذكي', settings: 'الإعدادات', reports: 'التقارير' }[r] || 'لوحة القيادة'; }
};

// ===== themes.js - Theme Engine Module =====
const Theme = {
  current: 'dark', accent: '#0096ff',
  themes: { dark: { label: 'داكن' }, light: { label: 'فاتح' }, neon: { label: 'نيون' }, amoled: { label: 'AMOLED' } },
  init() {
    const saved = localStorage.getItem('uniscore_theme');
    const accent = localStorage.getItem('uniscore_accent');
    if (saved) this.apply(saved);
    if (accent) this.setAccent(accent);
  },
  apply(name) {
    this.current = name;
    document.documentElement.setAttribute('data-theme', name === 'dark' ? '' : name);
    if (name === 'dark') document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('uniscore_theme', name);
    const icon = document.getElementById('themeToggleBtn');
    if (icon) icon.innerHTML = name === 'light' ? '<i class="fas fa-sun"></i>' : name === 'neon' ? '<i class="fas fa-bolt"></i>' : '<i class="fas fa-moon"></i>';
  },
  next() {
    const names = Object.keys(this.themes);
    const idx = names.indexOf(this.current);
    this.apply(names[(idx + 1) % names.length]);
    UI.toast('السمة: ' + this.themes[this.current].label, 'success');
  },
  setAccent(color) {
    this.accent = color;
    document.documentElement.style.setProperty('--accent', color);
    document.documentElement.style.setProperty('--accent-glow', color + '4d');
    document.documentElement.style.setProperty('--accent-light', color + '99');
    localStorage.setItem('uniscore_accent', color);
  }
};

// ===== students.js - Students Management Module =====
const Students = {
  list: [], current: null,
  async init() { this.list = await DB.getAll('students') || []; },
  async load() { this.list = await DB.getAll('students') || []; },
  async add(data) {
    data.createdAt = new Date().toISOString();
    data.updatedAt = data.createdAt;
    const id = await DB.put('students', data);
    data.id = id;
    this.list.push(data);
    if (!this.current) await this.setCurrent(data.id);
    return data;
  },
  async update(id, data) {
    const existing = await DB.get('students', id);
    if (!existing) return null;
    const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
    await DB.put('students', updated);
    const idx = this.list.findIndex(s => s.id === id);
    if (idx >= 0) this.list[idx] = updated;
    if (this.current && this.current.id === id) this.current = updated;
    return updated;
  },
  async remove(id) {
    await DB.del('students', id);
    this.list = this.list.filter(s => s.id !== id);
    if (this.current && this.current.id === id) {
      this.current = this.list.length > 0 ? this.list[0] : null;
      if (this.current) await this.setCurrent(this.current.id);
    }
  },
  async setCurrent(id) {
    const s = await DB.get('students', id);
    if (s) {
      this.current = s;
      await DB.setProfile('currentStudentId', id);
      await Modules.load(s.id);
      App.renderAll();
    }
  },
  async getCurrent() {
    if (this.current) return this.current;
    const id = await DB.getProfile('currentStudentId');
    if (id && id.value) { const s = await DB.get('students', id.value); if (s) { this.current = s; return s; } }
    if (this.list.length > 0) { this.current = this.list[0]; await DB.setProfile('currentStudentId', this.current.id); return this.current; }
    return null;
  },
  generateId() { return 'UNI-' + Math.floor(10000000 + Math.random() * 90000000); },
  search(query) {
    if (!query) return this.list;
    const q = query.toLowerCase();
    return this.list.filter(s => (s.firstName || '').toLowerCase().includes(q) || (s.lastName || '').toLowerCase().includes(q) || (s.registration || '').toLowerCase().includes(q));
  }
};

// ===== modules.js - Modules & LMD System Module =====
const Modules = {
  list: [], currentStudentId: null,
  ueTypes: ['اساسية', 'منهجية', 'افقية', 'استكشاف'],
  semesters: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
  faculties: ['كلية العلوم والتكنولوجيا', 'كلية العلوم الطبيعية وعلوم الحياة والارض والكون', 'كلية الرياضيات والاعلام الالي', 'كلية الاداب واللغات', 'كلية العلوم الاجتماعية والانسانية', 'كلية الحقوق والعلوم السياسية', 'كلية العلوم الاقتصادية والتجارية وعلوم التسيير'],
  specialties: ['اعلام الي', 'رياضيات', 'علوم وتكنولوجيا', 'هندسة مدنية', 'هندسة كهرباىية', 'علوم الطبيعة والحياة', 'حقوق', 'لغة عربية', 'لغة انجليزية', 'علوم اقتصادية', 'تسيير', 'تجارة'],
  async load(studentId) {
    this.currentStudentId = studentId;
    if (!studentId) { this.list = []; return; }
    this.list = await DB.getByIndex('modules', 'studentId', studentId) || [];
  },
  async add(data) {
    data.studentId = this.currentStudentId;
    data.id = Date.now() + Math.random() * 1000;
    data.createdAt = new Date().toISOString();
    await DB.put('modules', data);
    this.list.push(data);
    return data;
  },
  async update(id, data) {
    const existing = await DB.get('modules', id);
    if (!existing) return null;
    const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
    await DB.put('modules', updated);
    const idx = this.list.findIndex(m => m.id === id);
    if (idx >= 0) this.list[idx] = updated;
    return updated;
  },
  async remove(id) { await DB.del('modules', id); this.list = this.list.filter(m => m.id !== id); },
  calculateModuleAverage(m) {
    const exam = m.exam || 0;
    const td = m.td || 0;
    const tp = m.tp || 0;
    const formula = m.formula || '60-40';
    let avg = 0;
    switch (formula) {
      case '60-40': avg = exam * 0.6 + (td || tp) * 0.4; break;
      case '50-50': avg = exam * 0.5 + (td || tp) * 0.5; break;
      case '70-30': avg = exam * 0.7 + td * 0.3; break;
      case 'exam-only': avg = exam; break;
      case 'tp-only': avg = tp; break;
      default: avg = exam * 0.6 + (td || tp) * 0.4;
    }
    return Math.round(avg * 100) / 100;
  },
  getModuleStatus(avg) { return avg >= 10 ? 'ناجح' : 'راسب'; },
  getGradeLabel(avg) {
    if (avg >= 16) return { label: 'امتياز', color: 'var(--success)' };
    if (avg >= 14) return { label: 'جيد جدا', color: 'var(--accent)' };
    if (avg >= 12) return { label: 'جيد', color: 'var(--accent-light)' };
    if (avg >= 10) return { label: 'ناجح', color: 'var(--info)' };
    return { label: 'راسب', color: 'var(--danger)' };
  },
  calculateUEAverage(modulesInUE) {
    if (!modulesInUE || modulesInUE.length === 0) return 0;
    let totalWeight = 0, totalCoeff = 0;
    for (const m of modulesInUE) {
      const avg = this.calculateModuleAverage(m);
      totalWeight += avg * (m.coefficient || 1);
      totalCoeff += (m.coefficient || 1);
    }
    return totalCoeff ? Math.round(totalWeight / totalCoeff * 100) / 100 : 0;
  },
  calculateSemesterAverage(semester) {
    const mods = this.list.filter(m => m.semester === semester);
    if (mods.length === 0) return { average: 0, credits: 0, totalCredits: 0, validated: false, progress: 0 };
    let totalWeight = 0, totalCoeff = 0, credits = 0;
    const ues = {};
    for (const m of mods) { const ue = m.ue || 'اساسية'; if (!ues[ue]) ues[ue] = []; ues[ue].push(m); }
    for (const [ueName, ueMods] of Object.entries(ues)) {
      const ueAvg = this.calculateUEAverage(ueMods);
      const validated = ueAvg >= 10;
      for (const m of ueMods) {
        const avg = this.calculateModuleAverage(m);
        totalWeight += avg * (m.coefficient || 1);
        totalCoeff += (m.coefficient || 1);
        if (validated) credits += (m.credit || 0);
      }
    }
    const avg = totalCoeff ? Math.round(totalWeight / totalCoeff * 100) / 100 : 0;
    const totalCredits = mods.reduce((s, m) => s + (m.credit || 0), 0);
    return { average: avg, credits, totalCredits, validated: avg >= 10, progress: totalCredits ? Math.round(credits / totalCredits * 100) : 0 };
  },
  getAnnualAverage() {
    let total = 0, count = 0;
    for (const s of this.semesters) { const r = this.calculateSemesterAverage(s); if (r.average > 0) { total += r.average; count++; } }
    return count ? Math.round(total / count * 100) / 100 : 0;
  },
  getAllUes() {
    const ues = {};
    for (const m of this.list) { const ue = m.ue || 'اساسية'; if (!ues[ue]) ues[ue] = { name: ue, type: m.ueType || 'اساسية', modules: [] }; ues[ue].modules.push(m); }
    return Object.values(ues);
  },
  getStats() {
    if (this.list.length === 0) return { total: 0, validated: 0, failed: 0, avg: 0, credits: 0, coefficients: 0, totalCredits: 0, best: null, worst: null, successRate: 0 };
    let totalAvg = 0, credits = 0, coeffs = 0, validated = 0;
    let best = { avg: 0, name: '' }, worst = { avg: 20, name: '' };
    for (const m of this.list) {
      const avg = this.calculateModuleAverage(m);
      totalAvg += avg;
      if (avg >= 10) { validated++; credits += (m.credit || 0); }
      if (avg > best.avg) best = { avg, name: m.name };
      if (avg < worst.avg) worst = { avg, name: m.name };
      coeffs += (m.coefficient || 1);
    }
    return {
      total: this.list.length, validated, failed: this.list.length - validated,
      avg: this.list.length ? Math.round(totalAvg / this.list.length * 100) / 100 : 0,
      credits, coefficients: coeffs, totalCredits: this.list.reduce((s, m) => s + (m.credit || 0), 0),
      best: best.name ? best : null, worst: worst.name ? worst : null,
      successRate: this.list.length ? Math.round(validated / this.list.length * 100) : 0
    };
  }
};

// ===== charts.js - Charts Module =====
const Charts = {
  instances: {},
  destroy(name) { if (this.instances[name]) { this.instances[name].destroy(); delete this.instances[name]; } },
  createGPAEvolution(canvasId) {
    this.destroy('gpaEvolution');
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const semData = {};
    for (const m of Modules.list) { if (!semData[m.semester]) semData[m.semester] = []; semData[m.semester].push(Modules.calculateModuleAverage(m)); }
    const labels = Object.keys(semData).sort();
    const data = labels.map(s => { const avgs = semData[s]; return avgs.length ? Math.round(avgs.reduce((a, b) => a + b, 0) / avgs.length * 100) / 100 : 0; });
    this.instances.gpaEvolution = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets: [{ label: 'المعدل', data, borderColor: Theme.accent, backgroundColor: Theme.accent + '20', fill: true, tension: 0.4, pointBackgroundColor: Theme.accent, pointRadius: 3 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: 'rgba(240,244,255,0.5)', font: { family: 'Cairo' } }, grid: { color: 'rgba(255,255,255,0.05)' } }, y: { ticks: { color: 'rgba(240,244,255,0.5)', font: { family: 'Cairo' } }, grid: { color: 'rgba(255,255,255,0.05)' } } } }
    });
  },
  createCreditsProgression(canvasId) {
    this.destroy('credits');
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const semData = {};
    for (const m of Modules.list) {
      if (!semData[m.semester]) semData[m.semester] = { earned: 0, total: 0 };
      semData[m.semester].total += m.credit || 0;
      if (Modules.calculateModuleAverage(m) >= 10) semData[m.semester].earned += m.credit || 0;
    }
    const labels = Object.keys(semData).sort();
    this.instances.credits = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'المكتسبة', data: labels.map(s => semData[s].earned), backgroundColor: Theme.accent, borderRadius: 4 }, { label: 'الإجمالية', data: labels.map(s => semData[s].total), backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#f0f4ff', font: { family: 'Cairo' } } } }, scales: { x: { ticks: { color: 'rgba(240,244,255,0.5)', font: { family: 'Cairo' } }, grid: { color: 'rgba(255,255,255,0.05)' } }, y: { ticks: { color: 'rgba(240,244,255,0.5)', font: { family: 'Cairo' } }, grid: { color: 'rgba(255,255,255,0.05)' } } } }
    });
  },
  createRadar(canvasId) {
    this.destroy('radar');
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const ues = Modules.getAllUes();
    this.instances.radar = new Chart(ctx, {
      type: 'radar',
      data: { labels: ues.map(u => u.name), datasets: [{ label: 'الأداء', data: ues.map(u => Modules.calculateUEAverage(u.modules)), backgroundColor: Theme.accent + '30', borderColor: Theme.accent, pointBackgroundColor: Theme.accent, pointRadius: 3 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { r: { ticks: { color: 'rgba(240,244,255,0.5)', backdropColor: 'transparent', font: { family: 'Cairo' } }, grid: { color: 'rgba(255,255,255,0.05)' }, angleLines: { color: 'rgba(255,255,255,0.05)' } } } }
    });
  },
  createAll() { setTimeout(() => { this.createGPAEvolution('chartGPA'); this.createCreditsProgression('chartCredits'); this.createRadar('chartRadar'); }, 150); }
};

// ===== ai.js - AI Academic Assistant =====
const AI = {
  messages: [],
  getAdvice() {
    const mods = Modules.list;
    const s = Students.current;
    if (mods.length === 0) return ['مرحبا! أضف موادك الدراسية لتحصل على نصائح مخصصة'];
    const advice = [];
    const stats = Modules.getStats();
    const weakMods = mods.filter(m => Modules.calculateModuleAverage(m) < 10);
    const strongMods = mods.filter(m => Modules.calculateModuleAverage(m) >= 12);
    if (weakMods.length > 0) {
      advice.push('هناك <strong>' + weakMods.length + '</strong> مواد تحت عتبة النجاح. تحتاج إلى التركيز على تحسين: ' + weakMods.slice(0, 3).map(m => m.name).join('، ') + (weakMods.length > 3 ? ' وغيرها' : ''));
    }
    if (strongMods.length > 0) advice.push('اداؤك قوي في ' + strongMods.length + ' مواد، استمر بنفس المستوى');
    if (stats.avg >= 10 && stats.avg < 12) advice.push('معدلك العام ' + stats.avg + ' — أنت على الطريق الصحيح، حاول الوصول إلى 12');
    if (stats.avg >= 12 && stats.avg < 14) advice.push('معدلك ' + stats.avg + ' — أداء جيد، حافظ على المجهود');
    if (stats.avg >= 14) advice.push('ممتاز! معدلك ' + stats.avg + ' — استمر في التميز');
    if (stats.successRate < 50 && stats.total > 0) advice.push('نسبة نجاحك ' + stats.successRate + '%، أوصي بمراجعة جدول المذاكرة والتركيز على المواد الاساسية');
    if (stats.successRate >= 80 && stats.total > 0) advice.push('نسبة نجاحك ' + stats.successRate + '% — أداء أكاديمي متميز!');
    if (s) advice.push('طالب في ' + (s.specialty || 'التخصص المحدد') + ' — تابع متطلبات تخرجك');
    return advice;
  },
  getRiskScore() {
    const mods = Modules.list;
    if (mods.length === 0) return { score: 0, label: 'لا يوجد بيانات', color: '' };
    const weak = mods.filter(m => Modules.calculateModuleAverage(m) < 10).length;
    const ratio = weak / mods.length;
    if (ratio === 0) return { score: 0, label: 'منخفض جدا', color: 'var(--success)' };
    if (ratio < 0.2) return { score: 20, label: 'منخفض', color: 'var(--success)' };
    if (ratio < 0.4) return { score: 40, label: 'متوسط', color: 'var(--warning)' };
    if (ratio < 0.6) return { score: 60, label: 'مرتفع', color: '#ff6d00' };
    return { score: 80, label: 'خطير', color: 'var(--danger)' };
  },
  getPrediction() {
    const mods = Modules.list;
    if (mods.length < 3) return null;
    const avgs = mods.map(m => Modules.calculateModuleAverage(m));
    const currentAvg = avgs.reduce((a, b) => a + b, 0) / avgs.length;
    const trend = avgs.slice(-3);
    const recentAvg = trend.reduce((a, b) => a + b, 0) / trend.length;
    const predicted = Math.round((currentAvg * 0.4 + recentAvg * 0.6) * 100) / 100;
    return { current: Math.round(currentAvg * 100) / 100, recent: Math.round(recentAvg * 100) / 100, predicted: Math.min(20, Math.max(0, predicted)), confidence: mods.length > 5 ? 'مرتفع' : 'متوسط' };
  },
  ask(query) {
    const advice = this.getAdvice();
    const stats = Modules.getStats();
    const q = query.toLowerCase();
    if (q.includes('معدل') || q.includes('المعدل')) {
      return 'معدلك العام: ' + stats.avg + ' / 20\nعدد المواد: ' + stats.total + '\nالمواد الناجحة: ' + stats.validated + '\nالمواد الراسبة: ' + stats.failed;
    } else if (q.includes('نصيحة') || q.includes('تحسين')) {
      return 'نصائح لتحسين أدائك الأكاديمي:\n' + advice.slice(0, 3).map(a => '- ' + a.replace(/<[^>]*>/g, '')).join('\n');
    } else if (q.includes('مخاطر') || q.includes('خطورة')) {
      const risk = this.getRiskScore();
      return 'مستوى المخاطر الأكاديمية: ' + risk.label + '\n' + (risk.score >= 40 ? 'يجب اتخاذ إجراءات لتحسين الأداء' : 'أنت في وضع جيد');
    } else if (q.includes('توقع') || q.includes('مستقبل')) {
      const pred = this.getPrediction();
      if (pred) return 'توقع أدائك المستقبلي:\nالمعدل الحالي: ' + pred.current + '\nالمعدل المتوقع: ' + pred.predicted + '\nمستوى الثقة: ' + pred.confidence;
      else return 'تحتاج إلى 3 مواد على الأقل لتقديم توقعات دقيقة';
    } else if (q.includes('مرحبا') || q.includes('السلام') || q.includes('اهلا')) {
      return 'وعليكم السلام! أنا مساعدك الأكاديمي الذكي.\nكيف يمكنني مساعدتك اليوم؟\nيمكنني: تحليل أدائك، تقديم نصائح، حساب التوقعات، شرح نظام التعويضات.';
    } else {
      return 'مساعد UniScore DZ الذكي:\n' + advice.slice(0, 2).join('\n') + '\n\nيمكنك سؤالي عن: المعدل العام، نصائح للتحسين، توقعات الأداء، المخاطر الأكاديمية.';
    }
  }
};

// ===== pdf.js - PDF Generation Module =====
const PDF = {
  async generateReport() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const s = Students.current;
    if (!s) { UI.toast('الرجاء اختيار طالب', 'error'); return; }
    const stats = Modules.getStats();
    doc.setFont('helvetica');
    doc.setRTL(true);
    doc.setFontSize(22);
    doc.setTextColor(0, 150, 255);
    doc.text('UniScore DZ', 105, 20, { align: 'center' });
    doc.setFontSize(13);
    doc.setTextColor(80);
    doc.text('التقرير الأكاديمي', 105, 30, { align: 'center' });
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text('جامعة محمد البشير الإبراهيمي - برج بوعريريج', 105, 37, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(60);
    let y = 48;
    doc.text('الطالب: ' + (s.firstName || '') + ' ' + (s.lastName || ''), 20, y);
    y += 7;
    doc.text('رقم التسجيل: ' + (s.registration || ''), 20, y);
    y += 7;
    doc.text('الكلية: ' + (s.faculty || ''), 20, y);
    y += 7;
    doc.text('التخصص: ' + (s.specialty || ''), 20, y);
    y += 7;
    doc.text('السنة: ' + (s.academicYear || '') + ' | الفوج: ' + (s.group || '') + ' | القسم: ' + (s.section || ''), 20, y);
    y += 14;
    doc.setFontSize(12);
    doc.setTextColor(0, 150, 255);
    doc.text('الإحصائيات', 105, y, { align: 'center' });
    y += 8;
    doc.setFontSize(10);
    doc.setTextColor(60);
    doc.text('المعدل العام: ' + stats.avg, 20, y);
    doc.text('الوحدات المكتسبة: ' + stats.credits + ' / ' + stats.totalCredits, 110, y);
    y += 7;
    doc.text('المواد الناجحة: ' + stats.validated + ' / ' + stats.total, 20, y);
    doc.text('نسبة النجاح: ' + stats.successRate + '%', 110, y);
    y += 7;
    doc.text('أفضل مادة: ' + (stats.best ? stats.best.name + ' (' + stats.best.avg + ')' : 'لا يوجد'), 20, y);
    y += 7;
    doc.text('أضعف مادة: ' + (stats.worst ? stats.worst.name + ' (' + stats.worst.avg + ')' : 'لا يوجد'), 20, y);
    y += 14;
    if (Modules.list.length > 0) {
      doc.setFontSize(12);
      doc.setTextColor(0, 150, 255);
      doc.text('المواد الدراسية', 105, y, { align: 'center' });
      y += 8;
      doc.autoTable({
        startY: y,
        head: [['المادة', 'المعدل', 'المعامل', 'الرصيد', 'الحالة']],
        body: Modules.list.map(m => [m.name, Modules.calculateModuleAverage(m), m.coefficient || 1, m.credit || 0, Modules.calculateModuleAverage(m) >= 10 ? 'ناجح' : 'راسب']),
        styles: { font: 'helvetica', fontSize: 8, halign: 'right', cellPadding: 2 },
        headStyles: { fillColor: [0, 150, 255], textColor: 255, fontSize: 8 },
        margin: { left: 10, right: 10 }
      });
    }
    const pages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(180);
      doc.text('تم الإنشاء بواسطة UniScore DZ — الصفحة ' + i + '/' + pages, 105, 290, { align: 'center' });
    }
    doc.save('UniScore_' + (s.firstName || '') + '_' + (s.lastName || '') + '_' + new Date().toISOString().slice(0, 10) + '.pdf');
    UI.toast('تم تحميل التقرير بنجاح');
  }
};

// ===== importExport.js - Import/Export Module =====
const ImportExport = {
  exportJSON() {
    const s = Students.current;
    if (!s) { UI.toast('الرجاء اختيار طالب', 'error'); return; }
    const data = { student: s, modules: Modules.list, exportedAt: new Date().toISOString(), version: '1.0' };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'UniScore_' + (s.firstName || '') + '_' + (s.lastName || '') + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
    UI.toast('تم تصدير البيانات بنجاح');
  },
  exportExcel() {
    const s = Students.current;
    if (!s) { UI.toast('الرجاء اختيار طالب', 'error'); return; }
    const wb = XLSX.utils.book_new();
    const data = Modules.list.map(m => ({
      'المادة': m.name, 'الامتحان': m.exam || 0, 'TD': m.td || 0, 'TP': m.tp || 0,
      'المعامل': m.coefficient || 1, 'الرصيد': m.credit || 0, 'الوحدة': m.ue || 'اساسية', 'الفصل': m.semester || 'S1'
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'المواد');
    XLSX.writeFile(wb, 'UniScore_' + (s.firstName || '') + '_' + (s.lastName || '') + '.xlsx');
    UI.toast('تم تصدير الإكسل بنجاح');
  },
  exportCSV() {
    const s = Students.current;
    if (!s) { UI.toast('الرجاء اختيار طالب', 'error'); return; }
    let csv = 'المادة;الامتحان;TD;TP;المعامل;الرصيد;الوحدة;الفصل\n';
    for (const m of Modules.list) {
      csv += m.name + ';' + (m.exam || 0) + ';' + (m.td || 0) + ';' + (m.tp || 0) + ';' + (m.coefficient || 1) + ';' + (m.credit || 0) + ';' + (m.ue || 'اساسية') + ';' + (m.semester || 'S1') + '\n';
    }
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'UniScore_' + (s.firstName || '') + '_' + (s.lastName || '') + '.csv';
    a.click();
    URL.revokeObjectURL(a.href);
    UI.toast('تم تصدير CSV بنجاح');
  },
  importJSON(file) {
    const reader = new FileReader();
    reader.onload = async e => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.modules || !Array.isArray(data.modules)) { UI.toast('ملف غير صالح', 'error'); return; }
        const s = Students.current;
        if (!s) { UI.toast('الرجاء اختيار طالب', 'error'); return; }
        let count = 0;
        for (const m of data.modules) { m.studentId = s.id; m.id = Date.now() + Math.random() * 1000; await Modules.add(m); count++; }
        await Modules.load(s.id);
        App.renderAll();
        UI.toast('تم استيراد ' + count + ' مادة بنجاح');
      } catch (e) { UI.toast('خطأ في قراءة الملف', 'error'); }
    };
    reader.readAsText(file);
  },
  importExcel(file) {
    const reader = new FileReader();
    reader.onload = async e => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        if (rows.length === 0) { UI.toast('الملف فارغ', 'error'); return; }
        const s = Students.current;
        if (!s) { UI.toast('الرجاء اختيار طالب', 'error'); return; }
        let count = 0;
        for (const row of rows) {
          await Modules.add({
            name: row['module'] || row['المادة'] || 'مادة',
            exam: parseFloat(row['exam'] || row['الامتحان']) || 0,
            td: parseFloat(row['td'] || row['TD']) || 0,
            tp: parseFloat(row['tp'] || row['TP']) || 0,
            coefficient: parseFloat(row['coefficient'] || row['المعامل']) || 1,
            credit: parseFloat(row['credit'] || row['الرصيد']) || 0,
            ue: row['ue'] || row['الوحدة'] || 'اساسية',
            semester: row['semester'] || row['الفصل'] || 'S1',
            studentId: s.id, id: Date.now() + Math.random() * 1000
          });
          count++;
        }
        await Modules.load(s.id);
        App.renderAll();
        UI.toast('تم استيراد ' + count + ' مادة من إكسل');
      } catch (e) { UI.toast('خطأ في قراءة الإكسل', 'error'); }
    };
    reader.readAsArrayBuffer(file);
  },
  importCSV(file) {
    const reader = new FileReader();
    reader.onload = async e => {
      try {
        const lines = e.target.result.split('\n').filter(l => l.trim());
        if (lines.length < 2) { UI.toast('الملف فارغ', 'error'); return; }
        const s = Students.current;
        if (!s) { UI.toast('الرجاء اختيار طالب', 'error'); return; }
        let count = 0;
        for (let i = 1; i < lines.length; i++) {
          const vals = lines[i].split(';');
          if (vals.length < 3) continue;
          await Modules.add({
            name: vals[0] || 'مادة', exam: parseFloat(vals[1]) || 0, td: parseFloat(vals[2]) || 0,
            tp: parseFloat(vals[3]) || 0, coefficient: parseFloat(vals[4]) || 1, credit: parseFloat(vals[5]) || 0,
            ue: vals[6] || 'اساسية', semester: vals[7] || 'S1', studentId: s.id, id: Date.now() + Math.random() * 1000
          });
          count++;
        }
        await Modules.load(s.id);
        App.renderAll();
        UI.toast('تم استيراد ' + count + ' مادة من CSV');
      } catch (e) { UI.toast('خطأ في قراءة CSV', 'error'); }
    };
    reader.readAsText(file);
  }
};

// ===== gestures.js - Touch Gestures Module =====
const Gestures = {
  init() {
    let startX = 0;
    document.addEventListener('touchstart', e => { startX = e.changedTouches[0].clientX; }, { passive: true });
    document.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 80 && window.innerWidth <= 1024) {
        if (dx > 0) document.getElementById('sidebar').classList.add('open');
        else document.getElementById('sidebar').classList.remove('open');
      }
    }, { passive: true });
  }
};

// ===== App - Main Application Controller =====
const App = {
  async init() {
    await DB.init();
    await Students.init();
    const s = await Students.getCurrent();
    if (s) await Modules.load(s.id);
    Theme.init();
    this.setupLandingContent();
    this.setupNavigation();
    this.setupCommandPalette();
    this.setupKeyboard();
    Gestures.init();
    Router.init();
    this.renderAll();
    if (Students.list.length > 0) {
      document.getElementById('landingPage').style.display = 'none';
      document.getElementById('appShell').classList.add('active');
    }
  },
  startApp() {
    document.getElementById('landingPage').style.display = 'none';
    document.getElementById('appShell').classList.add('active');
    if (!Students.current || Students.list.length === 0) this.navigate('profile');
    else this.renderAll();
  },
  setupLandingContent() {
    const features = [
      { icon: 'fa-calculator', title: 'حساب المعدلات', desc: 'حساب دقيق لمعدلات المواد والوحدات والفصول وفق نظام LMD' },
      { icon: 'fa-chart-pie', title: 'تحليلات متقدمة', desc: 'رسوم بيانية ومخططات لتحليل الأداء الأكاديمي' },
      { icon: 'fa-robot', title: 'مساعد ذكي', desc: 'نصائح وتوصيات مخصصة لتحسين أدائك الجامعي' },
      { icon: 'fa-id-card', title: 'بطاقة طالب رقمية', desc: 'بطاقة طالب إلكترونية مع QR Code' },
      { icon: 'fa-file-export', title: 'تصدير واستيراد', desc: 'دعم كامل لـ Excel و CSV و JSON' },
      { icon: 'fa-file-pdf', title: 'تقارير PDF', desc: 'تقارير أكاديمية احترافية قابلة للطباعة' },
      { icon: 'fa-users', title: 'إدارة الطلاب', desc: 'إدارة متعددة للطلاب مع ملفات شخصية كاملة' },
      { icon: 'fa-graduation-cap', title: 'نظام LMD كامل', desc: 'تطبيق كامل لنظام LMD الجزائري مع التعويضات' },
    ];
    document.getElementById('featuresGrid').innerHTML = features.map(f =>
      '<div class="glass-card card-padding" style="text-align:center"><div style="width:48px;height:48px;border-radius:var(--radius-sm);background:rgba(0,150,255,0.1);display:flex;align-items:center;justify-content:center;font-size:20px;color:var(--accent);margin:0 auto 12px"><i class="fas ' + f.icon + '"></i></div><h3 style="font-size:16px;font-weight:700;margin-bottom:6px">' + f.title + '</h3><p style="font-size:13px;color:var(--text-secondary);line-height:1.6">' + f.desc + '</p></div>'
    ).join('');
    const stats = [
      { num: '10+', desc: 'ميزات متكاملة' }, { num: '100%', desc: 'مجاني للطلاب' },
      { num: 'LMD', desc: 'النظام الجزائري' }, { num: 'Offline', desc: 'بدون إنترنت' }
    ];
    document.getElementById('statsGrid').innerHTML = stats.map(s =>
      '<div class="glass-card" style="padding:24px;text-align:center"><div style="font-size:36px;font-weight:900;background:var(--gradient-1);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">' + s.num + '</div><div style="font-size:13px;color:var(--text-secondary);margin-top:4px">' + s.desc + '</div></div>'
    ).join('');
    const testimonials = [
      { name: 'طالب إعلام آلي', text: 'منصة رائعة! ساعدتني كثيرا في متابعة معدلاتي وتحديد المواد التي تحتاج تحسين' },
      { name: 'طالب رياضيات', text: 'أفضل منصة أكاديمية جزائرية. نظام التعويضات دقيق جدا' },
      { name: 'طالب علوم اقتصادية', text: 'واجهة جميلة وسهلة الاستخدام. أحببت خاصية التحليلات' },
    ];
    document.getElementById('testimonialsGrid').innerHTML = testimonials.map(t =>
      '<div class="glass-card card-padding"><p style="font-size:13px;color:var(--text-secondary);line-height:1.7;margin-bottom:12px">"' + t.text + '"</p><div style="display:flex;align-items:center;gap:10px"><div style="width:36px;height:36px;border-radius:50%;background:var(--gradient-2);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;color:#fff">' + t.name[0] + '</div><span style="font-size:13px;font-weight:600">' + t.name + '</span></div></div>'
    ).join('');
    const faqs = [
      { q: 'ما هو UniScore DZ؟', a: 'UniScore DZ هو نظام تشغيل أكاديمي متكامل للجامعات الجزائرية. يساعد الطلاب على حساب المعدلات، تحليل الأداء، وتخطيط المسار الأكاديمي وفق نظام LMD.' },
      { q: 'هل المنصة مجانية؟', a: 'نعم، المنصة مجانية بالكامل للطلاب الجزائريين. جميع الميزات متاحة بدون أي تكلفة.' },
      { q: 'هل تعمل بدون إنترنت؟', a: 'نعم، المنصة تعمل بشكل كامل بدون إنترنت. جميع البيانات تخزن محليا على جهازك.' },
      { q: 'كيف أحسب معدلاتي؟', a: 'بعد إضافة المواد والعلامات، يقوم النظام بحساب المعدلات تلقائيا وفق نظام LMD الجزائري.' },
      { q: 'هل يمكنني تصدير بياناتي؟', a: 'نعم، يمكنك تصدير بياناتك بصيغ Excel, CSV, JSON وكذلك تقارير PDF.' },
    ];
    document.getElementById('faqList').innerHTML = faqs.map(f =>
      '<div class="faq-item" style="border:1px solid var(--border-color);border-radius:var(--radius-lg);margin-bottom:8px;overflow:hidden"><button class="faq-question" style="width:100%;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;background:var(--bg-glass);border:none;color:var(--text-primary);font-family:var(--font-primary);font-size:14px;font-weight:600;cursor:pointer;text-align:right" onclick="this.parentElement.classList.toggle(\'active\');this.nextElementSibling.style.maxHeight=this.parentElement.classList.contains(\'active\')?this.nextElementSibling.scrollHeight+\'px\':\'0\'">' + f.q + '<i class="fas fa-chevron-down" style="transition:transform 0.3s;font-size:12px"></i></button><div class="faq-answer" style="max-height:0;overflow:hidden;transition:max-height 0.3s;padding:0 18px"><p style="padding:14px 0;font-size:13px;color:var(--text-secondary);line-height:1.7">' + f.a + '</p></div></div>'
    ).join('');
    document.querySelectorAll('[data-scroll]').forEach(a => {
      a.addEventListener('click', e => { e.preventDefault(); const t = document.getElementById('lp' + a.dataset.scroll.charAt(0).toUpperCase() + a.dataset.scroll.slice(1)); if (t) t.scrollIntoView({ behavior: 'smooth' }); });
    });
  },
  setupNavigation() {
    const navItems = [
      { route: 'dashboard', icon: 'fa-chart-pie', label: 'لوحة القيادة', section: 'الرئيسية' },
      { route: 'students', icon: 'fa-users', label: 'الطلاب', section: 'الرئيسية' },
      { route: 'profile', icon: 'fa-user', label: 'الملف الشخصي', section: 'الرئيسية' },
      { route: 'modules', icon: 'fa-book', label: 'المواد', section: 'الأكاديمي' },
      { route: 'analytics', icon: 'fa-chart-bar', label: 'التحليلات', section: 'الأكاديمي' },
      { route: 'reports', icon: 'fa-file-alt', label: 'التقارير', section: 'الأكاديمي' },
      { route: 'assistant', icon: 'fa-robot', label: 'المساعد الذكي', section: 'الأدوات' },
      { route: 'settings', icon: 'fa-cog', label: 'الإعدادات', section: 'الأدوات' },
    ];
    const sidebar = document.getElementById('sidebarNav');
    const sections = {};
    navItems.forEach(n => { if (!sections[n.section]) sections[n.section] = []; sections[n.section].push(n); });
    sidebar.innerHTML = Object.entries(sections).map(([section, items]) =>
      '<div class="nav-section"><div class="nav-section-title">' + section + '</div>' + items.map(n => '<button class="nav-item" data-route="' + n.route + '" onclick="Router.navigate(\'' + n.route + '\')"><i class="fas ' + n.icon + '"></i>' + n.label + '</button>').join('') + '</div>'
    ).join('');
    document.getElementById('bottomNav').innerHTML = navItems.slice(0, 5).map(n =>
      '<button class="nav-item" data-route="' + n.route + '" onclick="Router.navigate(\'' + n.route + '\')"><i class="fas ' + n.icon + '"></i><span>' + n.label + '</span></button>'
    ).join('');
    document.getElementById('menuToggle').addEventListener('click', () => { document.getElementById('sidebar').classList.toggle('open'); });
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(n => { n.addEventListener('click', () => { if (window.innerWidth <= 1024) document.getElementById('sidebar').classList.remove('open'); }); });
  },
  setupCommandPalette() {
    const palette = document.getElementById('commandPalette');
    const search = document.getElementById('cmdSearch');
    const results = document.getElementById('cmdResults');
    const commands = [
      { route: 'dashboard', icon: 'fa-chart-pie', label: 'لوحة القيادة' },
      { route: 'students', icon: 'fa-users', label: 'الطلاب' },
      { route: 'profile', icon: 'fa-user', label: 'الملف الشخصي' },
      { route: 'modules', icon: 'fa-book', label: 'إدارة المواد' },
      { route: 'analytics', icon: 'fa-chart-bar', label: 'التحليلات' },
      { route: 'assistant', icon: 'fa-robot', label: 'المساعد الذكي' },
      { route: 'settings', icon: 'fa-cog', label: 'الإعدادات' },
      { route: 'reports', icon: 'fa-file-alt', label: 'التقارير' },
    ];
    function render(q) {
      const filtered = commands.filter(c => c.label.includes(q || ''));
      results.innerHTML = filtered.map(c => '<div class="cmd-item" data-route="' + c.route + '" onclick="Router.navigate(\'' + c.route + '\');document.getElementById(\'commandPalette\').classList.remove(\'active\')"><i class="fas ' + c.icon + '"></i><span class="cmd-label">' + c.label + '</span></div>').join('');
    }
    render('');
    search.addEventListener('input', e => render(e.target.value));
    search.addEventListener('keydown', e => { if (e.key === 'Enter') { const f = results.querySelector('.cmd-item'); if (f) f.click(); } });
    palette.addEventListener('click', e => { if (e.target === palette) palette.classList.remove('active'); });
  },
  openCmdPalette() {
    document.getElementById('commandPalette').classList.add('active');
    setTimeout(() => document.getElementById('cmdSearch').focus(), 100);
  },
  setupKeyboard() {
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); this.openCmdPalette(); }
      if (e.key === 'Escape') { document.getElementById('commandPalette').classList.remove('active'); UI.closeModal(); }
    });
  },
  navigate(route) { Router.navigate(route); location.hash = '#/' + route; },
  onRouteChange(route) {
    switch (route) {
      case 'dashboard': this.renderDashboard(); break;
      case 'students': this.renderStudents(); break;
      case 'profile': this.renderProfile(); break;
      case 'modules': this.renderModules(); break;
      case 'analytics': this.renderAnalytics(); break;
      case 'assistant': this.renderAssistant(); break;
      case 'settings': this.renderSettings(); break;
      case 'reports': this.renderReports(); break;
    }
    this.updateSidebarFooter();
  },
  updateSidebarFooter() {
    const s = Students.current;
    const avatar = document.getElementById('sidebarAvatar');
    const name = document.getElementById('sidebarName');
    if (s) { avatar.textContent = (s.firstName || 'ط')[0]; name.textContent = (s.firstName || '') + ' ' + (s.lastName || ''); }
    else { avatar.textContent = 'ط'; name.textContent = 'طالب'; }
  },
  fabAction() { this.navigate('modules'); },
  renderAll() { this.updateSidebarFooter(); this.renderDashboard(); this.renderStudents(); this.renderModules(); this.renderSettings(); },

  // ===== DASHBOARD =====
  renderDashboard() {
    const stats = Modules.getStats();
    const s = Students.current;
    const risk = AI.getRiskScore();
    const pred = AI.getPrediction();
    const advice = AI.getAdvice();
    const grade = Modules.getGradeLabel(stats.avg);
    if (!s) {
      document.getElementById('page-dashboard').innerHTML =
        '<div style="text-align:center;padding:80px 24px"><div style="width:72px;height:72px;border-radius:50%;background:rgba(0,150,255,0.1);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:32px;color:var(--accent)"><i class="fas fa-user-plus"></i></div><h2 style="font-size:22px;margin-bottom:10px">مرحبا بك في UniScore DZ</h2><p style="color:var(--text-secondary);margin-bottom:24px;max-width:380px;margin-left:auto;margin-right:auto">ابدأ بإنشاء ملفك الأكاديمي وأضف موادك الدراسية لمتابعة أدائك</p><button class="btn btn-primary btn-lg" onclick="App.navigate(\'profile\')"><i class="fas fa-user-plus"></i> إنشاء الملف الشخصي</button></div>';
      return;
    }
    document.getElementById('page-dashboard').innerHTML =
      '<div class="page-header"><div><h1>لوحة القيادة</h1><p>' + UI.sanitize(s.firstName || '') + ' ' + UI.sanitize(s.lastName || '') + ' — ' + UI.sanitize(s.specialty || '') + '</p></div><div class="page-actions"><button class="btn btn-primary btn-sm" onclick="App.navigate(\'modules\')"><i class="fas fa-plus"></i> إضافة مواد</button><button class="btn btn-secondary btn-sm" onclick="ImportExport.exportJSON()"><i class="fas fa-download"></i> تصدير</button></div></div>' +
      '<div class="stat-grid">' +
      '<div class="stat-card"><div class="stat-icon" style="background:rgba(0,150,255,0.15);color:var(--accent)"><i class="fas fa-star"></i></div><div class="stat-value" style="color:' + grade.color + '">' + stats.avg + '</div><div class="stat-label">المعدل العام — ' + grade.label + '</div></div>' +
      '<div class="stat-card"><div class="stat-icon" style="background:rgba(0,230,118,0.15);color:var(--success)"><i class="fas fa-check-double"></i></div><div class="stat-value">' + stats.credits + ' <span style="font-size:13px;color:var(--text-muted)">/ ' + stats.totalCredits + '</span></div><div class="stat-label">الوحدات المكتسبة</div></div>' +
      '<div class="stat-card"><div class="stat-icon" style="background:rgba(124,58,237,0.15);color:#7c3aed"><i class="fas fa-percentage"></i></div><div class="stat-value">' + stats.successRate + '%</div><div class="stat-label">نسبة النجاح</div></div>' +
      '<div class="stat-card"><div class="stat-icon" style="background:rgba(255,171,0,0.15);color:var(--warning)"><i class="fas fa-chart-line"></i></div><div class="stat-value">' + (pred ? pred.predicted : '—') + '</div><div class="stat-label">المعدل المتوقع</div></div>' +
      '</div>' +
      '<div class="grid-2">' +
      '<div class="glass-card card-padding"><h3 style="margin-bottom:12px;font-size:15px">أدائك في لمحة</h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
      '<div style="padding:14px;background:var(--bg-glass);border-radius:var(--radius-md)"><div style="font-size:10px;color:var(--text-muted)">المواد</div><div style="font-size:18px;font-weight:700">' + stats.total + '</div></div>' +
      '<div style="padding:14px;background:var(--bg-glass);border-radius:var(--radius-md)"><div style="font-size:10px;color:var(--text-muted)">المعاملات</div><div style="font-size:18px;font-weight:700">' + stats.coefficients + '</div></div>' +
      '<div style="padding:14px;background:var(--bg-glass);border-radius:var(--radius-md)"><div style="font-size:10px;color:var(--text-muted)">ناجح</div><div style="font-size:18px;font-weight:700;color:var(--success)">' + stats.validated + '</div></div>' +
      '<div style="padding:14px;background:var(--bg-glass);border-radius:var(--radius-md)"><div style="font-size:10px;color:var(--text-muted)">راسب</div><div style="font-size:18px;font-weight:700;color:var(--danger)">' + stats.failed + '</div></div>' +
      '</div></div>' +
      '<div class="glass-card card-padding"><h3 style="margin-bottom:12px;font-size:15px">نظام التعويضات LMD</h3>' +
      '<div style="margin-bottom:10px"><div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px">تقدم الفصل</div><div style="height:6px;background:var(--bg-glass);border-radius:var(--radius-full);overflow:hidden"><div style="height:100%;width:' + stats.successRate + '%;background:var(--gradient-1);border-radius:var(--radius-full);transition:width 1s"></div></div></div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
      '<span class="badge ' + (stats.avg >= 10 ? 'badge-success' : 'badge-danger') + '"><i class="fas ' + (stats.avg >= 10 ? 'fa-check' : 'fa-times') + '"></i> ' + (stats.avg >= 10 ? 'متحقق' : 'غير متحقق') + '</span>' +
      '<span class="badge ' + (risk.score < 40 ? 'badge-success' : 'badge-warning') + '"><i class="fas fa-shield-alt"></i> المخاطر: ' + risk.label + '</span>' +
      '</div>' +
      (stats.best ? '<div style="margin-top:10px;padding:10px 14px;background:var(--bg-glass);border-radius:var(--radius-md)"><div style="font-size:11px;color:var(--text-muted)">أفضل مادة</div><div style="font-size:13px;font-weight:600">' + UI.sanitize(stats.best.name) + ' (' + stats.best.avg + ')</div></div>' : '') +
      (stats.worst ? '<div style="margin-top:6px;padding:10px 14px;background:var(--bg-glass);border-radius:var(--radius-md)"><div style="font-size:11px;color:var(--text-muted)">أضعف مادة</div><div style="font-size:13px;font-weight:600">' + UI.sanitize(stats.worst.name) + ' (' + stats.worst.avg + ')</div></div>' : '') +
      '</div></div>' +
      (advice.length > 0 ? '<div class="glass-card card-padding" style="margin-top:16px"><h3 style="margin-bottom:10px;font-size:15px"><i class="fas fa-robot" style="color:var(--accent)"></i> توصيات المساعد الذكي</h3><div style="display:flex;flex-direction:column;gap:6px">' + advice.slice(0, 3).map(a => '<div style="padding:8px 14px;background:var(--bg-glass);border-radius:var(--radius-md);font-size:12px;line-height:1.6">' + a + '</div>').join('') + '</div></div>' : '') +
      '<div class="glass-card card-padding" style="margin-top:16px"><h3 style="margin-bottom:12px;font-size:15px">المواد الدراسية</h3>' + this.modulesTable() + '</div>';
  },
  modulesTable() {
    if (Modules.list.length === 0) return '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px">لا توجد مواد مضافة بعد</div>';
    return '<div class="table-container"><table><thead><tr><th>المادة</th><th>الامتحان</th><th>TD</th><th>TP</th><th>المعدل</th><th>المعامل</th><th>الرصيد</th><th>الوحدة</th><th>الفصل</th><th>الحالة</th></tr></thead><tbody>' +
      Modules.list.map(m => { const avg = Modules.calculateModuleAverage(m); const st = Modules.getModuleStatus(avg); return '<tr><td>' + UI.sanitize(m.name) + '</td><td>' + (m.exam || 0) + '</td><td>' + (m.td || 0) + '</td><td>' + (m.tp || 0) + '</td><td><strong>' + avg + '</strong></td><td>' + (m.coefficient || 1) + '</td><td>' + (m.credit || 0) + '</td><td>' + (m.ue || 'اساسية') + '</td><td>' + (m.semester || 'S1') + '</td><td><span class="badge ' + (avg >= 10 ? 'badge-success' : 'badge-danger') + '">' + st + '</span></td></tr>'; }).join('') +
      '</tbody></table></div>';
  },

  // ===== STUDENTS =====
  renderStudents() {
    const list = Students.list;
    const current = Students.current;
    document.getElementById('page-students').innerHTML =
      '<div class="page-header"><div><h1>الطلاب</h1><p>إدارة الطلاب والملفات الأكاديمية</p></div><div class="page-actions"><button class="btn btn-primary btn-sm" onclick="App.openStudentModal()"><i class="fas fa-plus"></i> إضافة طالب</button></div></div>' +
      '<div class="search-bar" style="margin-bottom:16px"><i class="fas fa-search"></i><input type="text" placeholder="بحث عن طالب..." id="studentSearchInput" oninput="App.filterStudents(this.value)"></div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px" id="studentsGrid">' +
      (list.length === 0 ?
        '<div style="text-align:center;padding:60px 24px;grid-column:1/-1"><div style="width:56px;height:56px;border-radius:50%;background:rgba(0,150,255,0.1);display:flex;align-items:center;justify-content:center;margin:0 auto 14px;font-size:24px;color:var(--accent)"><i class="fas fa-users"></i></div><h3 style="margin-bottom:6px;font-size:16px">لا يوجد طلاب</h3><p style="color:var(--text-muted);margin-bottom:14px;font-size:13px">أضف أول طالب للبدء</p><button class="btn btn-primary btn-sm" onclick="App.openStudentModal()"><i class="fas fa-plus"></i> إضافة طالب</button></div>' :
        list.map(s =>
          '<div class="student-card' + (current && current.id === s.id ? '" style="border-color:var(--accent)"' : '"') + ' onclick="App.switchStudent(' + s.id + ')">' +
          '<div class="student-avatar">' + ((s.firstName || 'ط')[0]) + '</div>' +
          '<div class="student-name">' + UI.sanitize(s.firstName || '') + ' ' + UI.sanitize(s.lastName || '') + '</div>' +
          '<div class="student-id">' + (s.registration || '—') + '</div>' +
          '<div class="student-meta"><span>' + (s.faculty || '—') + '</span><span>' + (s.semester || 'S1') + '</span></div>' +
          '<div class="card-actions"><button onclick="event.stopPropagation();App.editStudent(' + s.id + ')" title="تعديل"><i class="fas fa-edit"></i></button><button onclick="event.stopPropagation();App.deleteStudent(' + s.id + ')" title="حذف"><i class="fas fa-trash"></i></button></div>' +
          '</div>'
        ).join('')
      ) + '</div>';
  },
  filterStudents(q) {
    const results = Students.search(q);
    const grid = document.getElementById('studentsGrid');
    if (!grid) return;
    grid.innerHTML = results.length === 0 ? '<div style="text-align:center;padding:40px;grid-column:1/-1;color:var(--text-muted)">لا توجد نتائج</div>' :
      results.map(s => '<div class="student-card" onclick="App.switchStudent(' + s.id + ')"><div class="student-avatar">' + ((s.firstName || 'ط')[0]) + '</div><div class="student-name">' + UI.sanitize(s.firstName || '') + ' ' + UI.sanitize(s.lastName || '') + '</div><div class="student-id">' + (s.registration || '—') + '</div><div class="student-meta"><span>' + (s.faculty || '—') + '</span><span>' + (s.semester || 'S1') + '</span></div></div>').join('');
  },
  switchStudent(id) { Students.setCurrent(id); this.renderStudents(); this.renderDashboard(); },
  async openStudentModal(data) {
    const isEdit = !!data;
    const faculties = Modules.faculties;
    const specialties = Modules.specialties;
    const semesters = Modules.semesters;
    const body =
      '<div style="display:flex;flex-direction:column;gap:12px">' +
      '<div class="grid-2"><div class="input-group"><label>الاسم</label><input class="input" id="sfn" value="' + (data ? UI.sanitize(data.firstName || '') : '') + '"></div><div class="input-group"><label>اللقب</label><input class="input" id="sln" value="' + (data ? UI.sanitize(data.lastName || '') : '') + '"></div></div>' +
      '<div class="input-group"><label>رقم التسجيل</label><input class="input" id="sreg" value="' + (data ? UI.sanitize(data.registration || '') : Students.generateId()) + '"></div>' +
      '<div class="grid-2"><div class="input-group"><label>الكلية</label><select class="select" id="sfac">' + faculties.map(f => '<option value="' + f + '"' + (data && data.faculty === f ? ' selected' : '') + '>' + f + '</option>').join('') + '</select></div>' +
      '<div class="input-group"><label>التخصص</label><select class="select" id="sspec">' + specialties.map(sp => '<option value="' + sp + '"' + (data && data.specialty === sp ? ' selected' : '') + '>' + sp + '</option>').join('') + '</select></div></div>' +
      '<div class="grid-2"><div class="input-group"><label>السنة الجامعية</label><input class="input" id="syear" placeholder="مثال: 2025/2026" value="' + (data ? UI.sanitize(data.academicYear || '') : '2025/2026') + '"></div>' +
      '<div class="input-group"><label>الفصل</label><select class="select" id="ssem">' + semesters.map(s => '<option value="' + s + '"' + (data && data.semester === s ? ' selected' : '') + '>' + s + '</option>').join('') + '</select></div></div>' +
      '<div class="grid-2"><div class="input-group"><label>القسم</label><input class="input" id="ssec" value="' + (data ? UI.sanitize(data.section || '') : '') + '"></div>' +
      '<div class="input-group"><label>الفوج</label><input class="input" id="sgrp" value="' + (data ? UI.sanitize(data.group || '') : '') + '"></div></div>' +
      '</div>';
    const footer =
      '<button class="btn btn-secondary" onclick="UI.closeModal()">إلغاء</button>' +
      '<button class="btn btn-primary" onclick="App.saveStudent(' + (isEdit ? data.id : 'null') + ')">' + (isEdit ? 'تحديث' : 'إضافة') + '</button>';
    UI.openModal(isEdit ? 'تعديل طالب' : 'إضافة طالب جديد', body, footer);
  },
  async saveStudent(editId) {
    const data = {
      firstName: document.getElementById('sfn').value.trim(),
      lastName: document.getElementById('sln').value.trim(),
      registration: document.getElementById('sreg').value.trim(),
      faculty: document.getElementById('sfac').value,
      specialty: document.getElementById('sspec').value,
      academicYear: document.getElementById('syear').value.trim(),
      semester: document.getElementById('ssem').value,
      section: document.getElementById('ssec').value.trim(),
      group: document.getElementById('sgrp').value.trim()
    };
    if (!data.firstName || !data.lastName) { UI.toast('الرجاء إدخال الاسم واللقب', 'error'); return; }
    if (editId) {
      await Students.update(editId, data);
      UI.toast('تم تحديث بيانات الطالب');
    } else {
      await Students.add(data);
      UI.toast('تم إضافة الطالب بنجاح');
    }
    UI.closeModal();
    this.renderAll();
  },
  async deleteStudent(id) {
    UI.confirmDialog('هل أنت متأكد من حذف هذا الطالب؟', 'function(){App.doDeleteStudent(' + id + ')}');
  },
  async doDeleteStudent(id) {
    await Modules.removeByStudentId ? await Modules.removeByStudentId(id) : null;
    await Students.remove(id);
    this.renderAll();
    UI.toast('تم حذف الطالب');
  },
  editStudent(id) {
    const s = Students.list.find(st => st.id === id);
    if (s) this.openStudentModal(s);
  },

  // ===== PROFILE =====
  renderProfile() {
    const s = Students.current;
    if (!s) {
      document.getElementById('page-profile').innerHTML =
        '<div style="text-align:center;padding:60px 24px"><div style="width:64px;height:64px;border-radius:50%;background:rgba(0,150,255,0.1);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:28px;color:var(--accent)"><i class="fas fa-user"></i></div><h2 style="font-size:20px;margin-bottom:8px">لا يوجد ملف شخصي</h2><p style="color:var(--text-muted);margin-bottom:20px">أنشئ ملفك الأكاديمي للبدء</p><button class="btn btn-primary" onclick="App.navigate(\'students\')"><i class="fas fa-plus"></i> إضافة طالب</button></div>';
      return;
    }
    const stats = Modules.getStats();
    document.getElementById('page-profile').innerHTML =
      '<div class="page-header"><div><h1>الملف الشخصي</h1><p>بطاقة الطالب الرقمية والمعلومات الأكاديمية</p></div><div class="page-actions"><button class="btn btn-secondary btn-sm" onclick="App.editStudent(' + s.id + ')"><i class="fas fa-edit"></i> تعديل</button></div></div>' +
      '<div class="grid-2">' +
      '<div class="digital-card" id="digitalCard">' +
      '<div class="uni-name">Universite Mohamed El Bachir El Ibrahimi</div>' +
      '<div class="card-title">بطاقة طالب رقمية</div>' +
      '<div style="display:flex;gap:16px;align-items:center;margin-bottom:16px">' +
      '<div id="qrCodeContainer" style="width:90px;height:90px;background:#fff;border-radius:var(--radius-sm);padding:6px;flex-shrink:0"></div>' +
      '<div style="flex:1"><div><span class="label" style="font-size:10px;color:var(--text-muted)">الاسم</span><div style="font-size:14px;font-weight:600">' + UI.sanitize(s.firstName || '') + ' ' + UI.sanitize(s.lastName || '') + '</div></div>' +
      '<div style="margin-top:6px"><span class="label" style="font-size:10px;color:var(--text-muted)">رقم التسجيل</span><div style="font-size:13px;font-weight:600">' + (s.registration || '—') + '</div></div></div></div>' +
      '<div style="margin-bottom:12px"><div style="font-size:10px;color:var(--text-muted)">الكلية</div><div style="font-size:13px;font-weight:600">' + (s.faculty || '—') + '</div></div>' +
      '<div style="margin-bottom:12px"><div style="font-size:10px;color:var(--text-muted)">التخصص</div><div style="font-size:13px;font-weight:600">' + (s.specialty || '—') + '</div></div>' +
      '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px"><div><div style="font-size:10px;color:var(--text-muted)">الفصل</div><div style="font-size:13px;font-weight:600">' + (s.semester || 'S1') + '</div></div><div><div style="font-size:10px;color:var(--text-muted)">السنة</div><div style="font-size:13px;font-weight:600">' + (s.academicYear || '—') + '</div></div><div><div style="font-size:10px;color:var(--text-muted)">القسم</div><div style="font-size:13px;font-weight:600">' + (s.section || '—') + '</div></div><div><div style="font-size:10px;color:var(--text-muted)">الفوج</div><div style="font-size:13px;font-weight:600">' + (s.group || '—') + '</div></div></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button class="btn btn-primary btn-sm" onclick="App.downloadCard()"><i class="fas fa-download"></i> تحميل PNG</button>' +
      '<button class="btn btn-secondary btn-sm" onclick="PDF.generateReport()"><i class="fas fa-file-pdf"></i> تحميل PDF</button>' +
      '</div></div>' +
      '<div class="glass-card card-padding"><h3 style="margin-bottom:16px;font-size:15px">ملخص أكاديمي</h3>' +
      '<div style="display:grid;gap:12px">' +
      '<div style="display:flex;justify-content:space-between;padding:10px 14px;background:var(--bg-glass);border-radius:var(--radius-md)"><span style="font-size:13px">المعدل العام</span><span style="font-size:13px;font-weight:700;color:var(--accent)">' + stats.avg + '</span></div>' +
      '<div style="display:flex;justify-content:space-between;padding:10px 14px;background:var(--bg-glass);border-radius:var(--radius-md)"><span style="font-size:13px">الوحدات المكتسبة</span><span style="font-size:13px;font-weight:700;color:var(--success)">' + stats.credits + ' / ' + stats.totalCredits + '</span></div>' +
      '<div style="display:flex;justify-content:space-between;padding:10px 14px;background:var(--bg-glass);border-radius:var(--radius-md)"><span style="font-size:13px">المواد الناجحة</span><span style="font-size:13px;font-weight:700;color:var(--success)">' + stats.validated + ' / ' + stats.total + '</span></div>' +
      '<div style="display:flex;justify-content:space-between;padding:10px 14px;background:var(--bg-glass);border-radius:var(--radius-md)"><span style="font-size:13px">نسبة النجاح</span><span style="font-size:13px;font-weight:700">' + stats.successRate + '%</span></div>' +
      '</div></div></div>';
    this.generateQR(s);
  },
  generateQR(s) {
    const container = document.getElementById('qrCodeContainer');
    if (!container) return;
    container.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#000;font-size:20px;font-weight:900">U</div>';
    const qrData = JSON.stringify({ id: s.registration || s.id, name: s.firstName + ' ' + s.lastName, uni: 'BBA' });
    if (typeof QRCode !== 'undefined') {
      try { new QRCode(container, { text: qrData, width: 90, height: 90, colorDark: '#000000', colorLight: '#ffffff' }); } catch (e) { }
    }
  },
  downloadCard() {
    const card = document.getElementById('digitalCard');
    if (!card) return;
    if (typeof html2canvas !== 'undefined') {
      html2canvas(card, { scale: 2, backgroundColor: null }).then(canvas => {
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = 'UniScore_Card.png';
        a.click();
      });
    } else {
      UI.toast('جاري تحميل المكتبة...', 'info');
    }
  },

  // ===== MODULES =====
  renderModules() {
    const s = Students.current;
    if (!s) {
      document.getElementById('page-modules').innerHTML = '<div style="text-align:center;padding:60px 24px"><h2 style="font-size:20px;margin-bottom:8px">الرجاء اختيار طالب</h2><p style="color:var(--text-muted)">اختر طالبا من صفحة الطلاب أو أنشئ ملفا شخصيا</p></div>';
      return;
    }
    const stats = Modules.getStats();
    document.getElementById('page-modules').innerHTML =
      '<div class="page-header"><div><h1>المواد الدراسية</h1><p>' + UI.sanitize(s.firstName || '') + ' ' + UI.sanitize(s.lastName || '') + ' — ' + (s.semester || 'S1') + '</p></div><div class="page-actions"><button class="btn btn-primary btn-sm" onclick="App.openModuleModal()"><i class="fas fa-plus"></i> إضافة مادة</button></div></div>' +
      '<div class="stat-grid" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">' +
      '<div class="stat-card" style="padding:14px"><div class="stat-value" style="font-size:18px">' + stats.total + '</div><div class="stat-label">المواد</div></div>' +
      '<div class="stat-card" style="padding:14px"><div class="stat-value" style="font-size:18px;color:var(--success)">' + stats.validated + '</div><div class="stat-label">ناجح</div></div>' +
      '<div class="stat-card" style="padding:14px"><div class="stat-value" style="font-size:18px;color:var(--danger)">' + stats.failed + '</div><div class="stat-label">راسب</div></div>' +
      '<div class="stat-card" style="padding:14px"><div class="stat-value" style="font-size:18px;color:var(--accent)">' + stats.avg + '</div><div class="stat-label">المعدل</div></div>' +
      '</div>' +
      '<div class="search-bar" style="margin-bottom:12px"><i class="fas fa-search"></i><input type="text" placeholder="بحث عن مادة..." id="moduleSearchInput" oninput="App.filterModules(this.value)"></div>' +
      '<div id="modulesList">' + this.modulesTable() + '</div>';
  },
  filterModules(q) {
    const el = document.getElementById('modulesList');
    if (!el) return;
    if (!q) { el.innerHTML = this.modulesTable(); return; }
    const filtered = Modules.list.filter(m => m.name && m.name.toLowerCase().includes(q.toLowerCase()));
    if (filtered.length === 0) { el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">لا توجد نتائج</div>'; return; }
    el.innerHTML = '<div class="table-container"><table><thead><tr><th>المادة</th><th>الامتحان</th><th>TD</th><th>TP</th><th>المعدل</th><th>المعامل</th><th>الرصيد</th><th>الوحدة</th><th>الفصل</th><th>الحالة</th><th></th></tr></thead><tbody>' +
      filtered.map(m => { const avg = Modules.calculateModuleAverage(m); return '<tr><td>' + UI.sanitize(m.name) + '</td><td>' + (m.exam || 0) + '</td><td>' + (m.td || 0) + '</td><td>' + (m.tp || 0) + '</td><td><strong>' + avg + '</strong></td><td>' + (m.coefficient || 1) + '</td><td>' + (m.credit || 0) + '</td><td>' + (m.ue || 'اساسية') + '</td><td>' + (m.semester || 'S1') + '</td><td><span class="badge ' + (avg >= 10 ? 'badge-success' : 'badge-danger') + '">' + Modules.getModuleStatus(avg) + '</span></td><td><button class="btn btn-ghost btn-sm" onclick="App.editModule(' + m.id + ')" style="padding:4px 8px;font-size:11px"><i class="fas fa-edit"></i></button><button class="btn btn-ghost btn-sm" onclick="App.deleteModule(' + m.id + ')" style="padding:4px 8px;font-size:11px"><i class="fas fa-trash"></i></button></td></tr>'; }).join('') +
      '</tbody></table></div>';
  },
  openModuleModal(data) {
    const ueTypes = Modules.ueTypes;
    const semesters = Modules.semesters;
    const isEdit = !!data;
    const body =
      '<div style="display:flex;flex-direction:column;gap:10px">' +
      '<div class="input-group"><label>اسم المادة</label><input class="input" id="mname" value="' + (data ? UI.sanitize(data.name || '') : '') + '"></div>' +
      '<div class="grid-3"><div class="input-group"><label>الامتحان</label><input class="input" type="number" step="0.5" min="0" max="20" id="mexam" value="' + (data ? (data.exam || 0) : 10) + '"></div>' +
      '<div class="input-group"><label>TD</label><input class="input" type="number" step="0.5" min="0" max="20" id="mtd" value="' + (data ? (data.td || 0) : 0) + '"></div>' +
      '<div class="input-group"><label>TP</label><input class="input" type="number" step="0.5" min="0" max="20" id="mtp" value="' + (data ? (data.tp || 0) : 0) + '"></div></div>' +
      '<div class="grid-3"><div class="input-group"><label>المعامل</label><input class="input" type="number" step="0.5" min="1" max="5" id="mcoeff" value="' + (data ? (data.coefficient || 1) : 2) + '"></div>' +
      '<div class="input-group"><label>الرصيد</label><input class="input" type="number" min="1" max="10" id="mcred" value="' + (data ? (data.credit || 0) : 5) + '"></div>' +
      '<div class="input-group"><label>الفصل</label><select class="select" id="msem">' + semesters.map(s => '<option value="' + s + '"' + (data && data.semester === s ? ' selected' : '') + '>' + s + '</option>').join('') + '</select></div></div>' +
      '<div class="grid-2"><div class="input-group"><label>الوحدة (UE)</label><input class="input" id="mue" value="' + (data ? UI.sanitize(data.ue || '') : 'اساسية') + '"></div>' +
      '<div class="input-group"><label>نوع الوحدة</label><select class="select" id="muetype">' + ueTypes.map(t => '<option value="' + t + '"' + (data && data.ueType === t ? ' selected' : '') + '>' + t + '</option>').join('') + '</select></div></div>' +
      '<div class="input-group"><label>الأستاذ</label><input class="input" id="mprof" value="' + (data ? UI.sanitize(data.professor || '') : '') + '"></div>' +
      '</div>';
    const footer =
      '<button class="btn btn-secondary" onclick="UI.closeModal()">إلغاء</button>' +
      '<button class="btn btn-primary" onclick="App.saveModule(' + (isEdit ? data.id : 'null') + ')">' + (isEdit ? 'تحديث' : 'إضافة') + '</button>';
    UI.openModal(isEdit ? 'تعديل مادة' : 'إضافة مادة جديدة', body, footer);
  },
  async saveModule(editId) {
    const m = {
      name: document.getElementById('mname').value.trim(),
      exam: parseFloat(document.getElementById('mexam').value) || 0,
      td: parseFloat(document.getElementById('mtd').value) || 0,
      tp: parseFloat(document.getElementById('mtp').value) || 0,
      coefficient: parseFloat(document.getElementById('mcoeff').value) || 1,
      credit: parseFloat(document.getElementById('mcred').value) || 0,
      semester: document.getElementById('msem').value,
      ue: document.getElementById('mue').value.trim() || 'اساسية',
      ueType: document.getElementById('muetype').value,
      professor: document.getElementById('mprof').value.trim()
    };
    if (!m.name) { UI.toast('الرجاء إدخال اسم المادة', 'error'); return; }
    if (editId) { await Modules.update(editId, m); UI.toast('تم تحديث المادة'); }
    else { await Modules.add(m); UI.toast('تم إضافة المادة'); }
    UI.closeModal();
    this.renderAll();
  },
  async deleteModule(id) {
    await Modules.remove(id);
    this.renderAll();
    UI.toast('تم حذف المادة');
  },
  editModule(id) {
    const m = Modules.list.find(mod => mod.id === id);
    if (m) this.openModuleModal(m);
  },

  // ===== ANALYTICS =====
  renderAnalytics() {
    const stats = Modules.getStats();
    const risk = AI.getRiskScore();
    const pred = AI.getPrediction();
    document.getElementById('page-analytics').innerHTML =
      '<div class="page-header"><div><h1>التحليلات</h1><p>تحليل متقدم للأداء الأكاديمي</p></div></div>' +
      '<div class="stat-grid">' +
      '<div class="stat-card"><div class="stat-icon" style="background:rgba(0,150,255,0.15);color:var(--accent)"><i class="fas fa-chart-line"></i></div><div class="stat-value">' + stats.avg + '</div><div class="stat-label">المعدل العام</div></div>' +
      '<div class="stat-card"><div class="stat-icon" style="background:rgba(0,230,118,0.15);color:var(--success)"><i class="fas fa-check-circle"></i></div><div class="stat-value">' + stats.successRate + '%</div><div class="stat-label">نسبة النجاح</div></div>' +
      '<div class="stat-card"><div class="stat-icon" style="background:rgba(255,171,0,0.15);color:var(--warning)"><i class="fas fa-exclamation-triangle"></i></div><div class="stat-value" style="color:' + risk.color + '">' + risk.label + '</div><div class="stat-label">مستوى المخاطر</div></div>' +
      '<div class="stat-card"><div class="stat-icon" style="background:rgba(124,58,237,0.15);color:#7c3aed"><i class="fas fa-robot"></i></div><div class="stat-value">' + (pred ? pred.predicted : '—') + '</div><div class="stat-label">المعدل المتوقع</div></div>' +
      '</div>' +
      '<div class="grid-2" style="margin-bottom:16px">' +
      '<div class="glass-card card-padding"><h3 style="margin-bottom:12px;font-size:14px">تطور المعدل</h3><canvas id="chartGPA" height="180"></canvas></div>' +
      '<div class="glass-card card-padding"><h3 style="margin-bottom:12px;font-size:14px">الوحدات المكتسبة</h3><canvas id="chartCredits" height="180"></canvas></div>' +
      '</div>' +
      '<div class="glass-card card-padding"><h3 style="margin-bottom:12px;font-size:14px">الرادار الأكاديمي</h3><canvas id="chartRadar" height="200"></canvas></div>';
    setTimeout(() => Charts.createAll(), 100);
  },

  // ===== REPORTS =====
  renderReports() {
    const s = Students.current;
    document.getElementById('page-reports').innerHTML =
      '<div class="page-header"><div><h1>التقارير</h1><p>تصدير وتحميل التقارير الأكاديمية</p></div></div>' +
      (!s ? '<div style="text-align:center;padding:40px;color:var(--text-muted)">الرجاء اختيار طالب أولا</div>' :
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px">' +
        '<div class="glass-card card-padding" style="text-align:center;cursor:pointer" onclick="PDF.generateReport()"><div style="width:48px;height:48px;border-radius:var(--radius-md);background:rgba(255,82,82,0.15);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:20px;color:var(--danger)"><i class="fas fa-file-pdf"></i></div><h3 style="font-size:15px;font-weight:700;margin-bottom:4px">تقرير PDF</h3><p style="font-size:12px;color:var(--text-muted)">تقرير أكاديمي احترافي كامل</p></div>' +
        '<div class="glass-card card-padding" style="text-align:center;cursor:pointer" onclick="ImportExport.exportExcel()"><div style="width:48px;height:48px;border-radius:var(--radius-md);background:rgba(0,230,118,0.15);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:20px;color:var(--success)"><i class="fas fa-file-excel"></i></div><h3 style="font-size:15px;font-weight:700;margin-bottom:4px">تصدير Excel</h3><p style="font-size:12px;color:var(--text-muted)">تصدير البيانات إلى جدول إكسل</p></div>' +
        '<div class="glass-card card-padding" style="text-align:center;cursor:pointer" onclick="ImportExport.exportJSON()"><div style="width:48px;height:48px;border-radius:var(--radius-md);background:rgba(0,150,255,0.15);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:20px;color:var(--accent)"><i class="fas fa-file-code"></i></div><h3 style="font-size:15px;font-weight:700;margin-bottom:4px">تصدير JSON</h3><p style="font-size:12px;color:var(--text-muted)">تصدير البيانات بتنسيق JSON</p></div>' +
        '<div class="glass-card card-padding" style="text-align:center;cursor:pointer" onclick="ImportExport.exportCSV()"><div style="width:48px;height:48px;border-radius:var(--radius-md);background:rgba(124,58,237,0.15);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:20px;color:#7c3aed"><i class="fas fa-file-csv"></i></div><h3 style="font-size:15px;font-weight:700;margin-bottom:4px">تصدير CSV</h3><p style="font-size:12px;color:var(--text-muted)">تصدير البيانات بتنسيق CSV</p></div>' +
        '</div>' +
        '<div style="margin-top:24px" class="glass-card card-padding"><h3 style="margin-bottom:12px;font-size:15px">استيراد بيانات</h3><p style="font-size:12px;color:var(--text-muted);margin-bottom:12px">استيراد المواد من ملف Excel أو CSV أو JSON</p>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
        '<label class="btn btn-secondary btn-sm"><i class="fas fa-upload"></i> استيراد Excel<input type="file" accept=".xlsx,.xls" style="display:none" onchange="ImportExport.importExcel(this.files[0]);this.value=\'\'"></label>' +
        '<label class="btn btn-secondary btn-sm"><i class="fas fa-upload"></i> استيراد CSV<input type="file" accept=".csv" style="display:none" onchange="ImportExport.importCSV(this.files[0]);this.value=\'\'"></label>' +
        '<label class="btn btn-secondary btn-sm"><i class="fas fa-upload"></i> استيراد JSON<input type="file" accept=".json" style="display:none" onchange="ImportExport.importJSON(this.files[0]);this.value=\'\'"></label>' +
        '</div></div>'
      );
  },

  // ===== ASSISTANT =====
  renderAssistant() {
    document.getElementById('page-assistant').innerHTML =
      '<div class="page-header"><div><h1>المساعد الذكي</h1><p>مساعد أكاديمي ذكي لتحليل أدائك وتقديم النصائح</p></div></div>' +
      '<div class="assistant-container glass-card">' +
      '<div class="assistant-messages" id="assistantMessages">' +
      '<div class="assistant-msg bot">مرحبا! أنا مساعد UniScore DZ الذكي.<br>يمكنني مساعدتك في:<br>• تحليل أدائك الأكاديمي<br>• تقديم نصائح للتحسين<br>• حساب التوقعات<br>• شرح نظام التعويضات</div>' +
      '</div>' +
      '<div class="assistant-input"><input type="text" id="assistantInput" placeholder="اسأل المساعد الذكي..." onkeydown="if(event.key===\'Enter\')App.askAssistant()"><button class="btn btn-primary btn-sm" onclick="App.askAssistant()"><i class="fas fa-paper-plane"></i></button></div>' +
      '</div>';
    // Auto-send initial analysis
    setTimeout(() => {
      if (Modules.list.length > 0) {
        const advice = AI.getAdvice();
        if (advice.length > 0) {
          const container = document.getElementById('assistantMessages');
          const div = document.createElement('div');
          div.className = 'assistant-msg bot';
          div.innerHTML = advice.slice(0, 2).join('<br>');
          container.appendChild(div);
          container.scrollTop = container.scrollHeight;
        }
      }
    }, 500);
  },
  askAssistant() {
    const input = document.getElementById('assistantInput');
    const q = input.value.trim();
    if (!q) return;
    const container = document.getElementById('assistantMessages');
    const userDiv = document.createElement('div');
    userDiv.className = 'assistant-msg user';
    userDiv.textContent = q;
    container.appendChild(userDiv);
    input.value = '';
    const botDiv = document.createElement('div');
    botDiv.className = 'assistant-msg bot';
    botDiv.textContent = AI.ask(q);
    container.appendChild(botDiv);
    container.scrollTop = container.scrollHeight;
  },

  // ===== SETTINGS =====
  renderSettings() {
    const currentTheme = Theme.current;
    const colors = ['#0096ff', '#7c3aed', '#ff5252', '#ffab00', '#00e676', '#ff00ff', '#ff6d00'];
    document.getElementById('page-settings').innerHTML =
      '<div class="page-header"><div><h1>الإعدادات</h1><p>تخصيص تجربتك في المنصة</p></div></div>' +
      '<div class="settings-group"><h3>السمة</h3>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      Object.entries(Theme.themes).map(([key, val]) =>
        '<button class="btn ' + (currentTheme === key ? 'btn-primary' : 'btn-secondary') + ' btn-sm" onclick="Theme.apply(\'' + key + '\');App.renderSettings()">' + val.label + '</button>'
      ).join('') +
      '</div></div>' +
      '<div class="settings-group"><h3>اللون المميز</h3><div class="color-options">' +
      colors.map(c => '<div class="color-opt" style="background:' + c + (Theme.accent === c ? ';border-color:#fff;transform:scale(1.15)"' : '"') + ' onclick="Theme.setAccent(\'' + c + '\')"></div>').join('') +
      '</div></div>' +
      '<div class="settings-group"><h3>البيانات</h3>' +
      '<div class="setting-row"><div class="setting-info"><div class="setting-label">تصدير البيانات</div><div class="setting-desc">تصدير جميع البيانات كنسخة احتياطية</div></div><button class="btn btn-secondary btn-sm" onclick="ImportExport.exportJSON()"><i class="fas fa-download"></i> تصدير</button></div>' +
      '<div class="setting-row"><div class="setting-info"><div class="setting-label">حذف جميع البيانات</div><div class="setting-desc">مسح جميع البيانات وإعادة تعيين التطبيق</div></div><button class="btn btn-danger btn-sm" onclick="App.clearAllData()"><i class="fas fa-trash"></i> حذف الكل</button></div>' +
      '</div>' +
      '<div class="settings-group"><h3>حول</h3>' +
      '<div class="glass-card card-padding" style="text-align:center"><p style="font-size:14px;font-weight:700">UniScore DZ v1.0</p><p style="font-size:12px;color:var(--text-muted)">النظام الأكاديمي الذكي للجامعات الجزائرية</p><p style="font-size:11px;color:var(--text-muted);margin-top:8px">Crafted for Algerian University Students<br>Developed & Designed by Student Abdelilah Sidiali</p></div></div>';
  },
  clearAllData() {
    UI.confirmDialog('هل أنت متأكد؟ سيتم حذف جميع البيانات بشكل نهائي.', 'function(){App.doClearAll()}');
  },
  async doClearAll() {
    if (DB.db) {
      const stores = ['students', 'modules', 'profile'];
      for (const s of stores) {
        const all = await DB.getAll(s);
        for (const item of all) await DB.del(s, item.key || item.id);
      }
    }
    Students.list = []; Students.current = null; Modules.list = [];
    this.renderAll();
    UI.toast('تم حذف جميع البيانات');
  }
};

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
</script>
