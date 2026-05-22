'use strict';

const STORAGE_KEY = 'jamac-procal-v332-history';
const SETTINGS_KEY = 'jamac-procal-v332-settings';
const APP_VERSION = '3.3.2';
let deferredInstallPrompt = null;
let currentRecord = null;
let tesseractLoading = null;
let uploadedImage = null;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const Helpers = {
  number(id) {
    const value = Number($(id).value);
    if (!Number.isFinite(value)) throw new Error(`Invalid number: ${id}`);
    return value;
  },
  text(value) {
    return String(value ?? '').replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
  },
  fmt(value, digits = 6) {
    if (!Number.isFinite(value)) return '-';
    return Number(value.toFixed(digits)).toLocaleString(undefined, { maximumFractionDigits: digits });
  },
  iso() { return new Date().toISOString(); },
  displayDate(iso) { return new Date(iso).toLocaleString(); },
  csv(value) {
    const safe = String(value ?? '').replace(/"/g, '""');
    return /^[=+\-@]/.test(safe) ? `"'${safe}"` : `"${safe}"`;
  },
  assertPositive(value, label) {
    if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} must be more than zero.`);
  },
  unitToBaseKWh(value, unit) {
    if (unit === 'MWh') return value * 1000;
    return value;
  },
  baseKWhToUnit(value, unit) {
    if (unit === 'MWh') return value / 1000;
    return value;
  },
  constantUnit(unit) { return unit === 'kvarh' ? 'imp/kvarh' : 'imp/kWh'; },
  download(filename, content, type = 'text/plain') {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
};

const UI = {
  init() {
    const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    if (settings.theme) document.documentElement.dataset.theme = settings.theme;
    $('#themeToggle').textContent = settings.theme === 'dark' ? '☀️' : '🌙';
    this.bindTabs();
    this.bindActions();
    this.bindStatus();
    History.render();
  },
  bindTabs() {
    $$('.tab').forEach(tab => tab.addEventListener('click', () => this.activateTab(tab.dataset.tab)));
  },
  activateTab(name) {
    $$('.tab').forEach(tab => {
      const active = tab.dataset.tab === name;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    $$('.panel').forEach(panel => {
      const active = panel.id === `panel-${name}`;
      panel.classList.toggle('active', active);
      panel.hidden = !active;
    });
    if (name === 'history') History.render();
  },
  bindActions() {
    document.addEventListener('click', event => {
      const target = event.target.closest('[data-action]');
      if (!target) return;
      const action = target.dataset.action;
      const map = {
        'go-home': () => this.activateTab('calculator'),
        'calculate-main': () => Calculator.calculateMain(),
        'clear-main': () => Calculator.clearMain(),
        'calculate-energy': () => Energy.calculate(),
        'clear-energy': () => Energy.clear(),
        'calculate-accuracy': () => Accuracy.calculate(),
        'clear-accuracy': () => Accuracy.clear(),
        'calculate-md': () => MD.calculate(),
        'clear-md': () => MD.clear(),
        'run-ocr': () => Scanner.runOCR(),
        'clear-scan': () => Scanner.clear(),
        'export-json': () => History.exportJSON(),
        'export-csv': () => History.exportCSV(),
        'clear-history': () => History.clear(),
        'print-record': () => Reports.printCurrent()
      };
      map[action]?.();
    });

    $('#themeToggle').addEventListener('click', () => {
      const current = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = current;
      $('#themeToggle').textContent = current === 'dark' ? '☀️' : '🌙';
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ theme: current }));
    });
    $('#langToggle').addEventListener('click', () => this.toast('BM/EN full translation dictionary planned for v3.4. v3.3.2 keeps technical labels stable.'));
    $('#accuracyMethod').addEventListener('change', () => Accuracy.toggleMethod());
    $('#historySearch').addEventListener('input', () => History.render());
    $('#historyImport').addEventListener('change', event => History.importJSON(event));
    $('#ctPreset').addEventListener('change', event => Calculator.applyPreset(event.target.value, '#ctPrimary', '#ctSecondary'));
    $('#vtPreset').addEventListener('change', event => Calculator.applyPreset(event.target.value, '#vtPrimary', '#vtSecondary'));
    Scanner.bind();
  },
  bindStatus() {
    const update = () => $('#offlineBadge').classList.toggle('hidden', navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);

    window.addEventListener('beforeinstallprompt', event => {
      event.preventDefault();
      deferredInstallPrompt = event;
      $('#installBtn').hidden = false;
    });
    $('#installBtn').addEventListener('click', async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      $('#installBtn').hidden = true;
    });

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').then(reg => {
        reg.addEventListener('updatefound', () => {
          const worker = reg.installing;
          worker?.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              this.toast('New version available. Refresh the page to update.');
            }
          });
        });
      }).catch(() => this.toast('Service worker registration failed.'));
    }
  },
  toast(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.hidden = true; }, 3800);
  },
  result(target, record) {
    const warnings = record.warnings?.length ? `<ul class="warning-list">${record.warnings.map(w => `<li>${Helpers.text(w)}</li>`).join('')}</ul>` : '';
    const metrics = Object.entries(record.metrics || {}).map(([k, v]) => `<div class="metric"><span>${Helpers.text(k)}</span><strong>${Helpers.text(v)}</strong></div>`).join('');
    const status = record.status ? `<p><strong class="${record.statusClass || ''}">${Helpers.text(record.status)}</strong></p>` : '';
    $(target).innerHTML = `
      <h2>Result</h2>
      ${status}
      <div class="metric-grid">${metrics}</div>
      <div class="formula-box"><pre>${Helpers.text(record.formula)}</pre></div>
      ${warnings}
      <div class="button-row"><button class="btn secondary" type="button" data-record-id="${record.id}" data-history-action="view">View Details</button><button class="btn secondary" type="button" data-record-id="${record.id}" data-history-action="print">Print Report</button></div>
    `;
  }
};

const Warning = {
  commonMultiplier(multiplier) {
    const list = [];
    if (multiplier > 10000) list.push('Multiplier is very high. Confirm CT and VT ratios.');
    if (multiplier < 1) list.push('Multiplier is below 1. Confirm ratio entries.');
    return list;
  },
  constant(value) {
    const list = [];
    if (value < 10) list.push('Meter constant seems unusually low. Confirm unit and OCR/value entry.');
    if (value > 1000000) list.push('Meter constant seems unusually high. Confirm unit and OCR/value entry.');
    return list;
  }
};

const Records = {
  create(type, title, inputs, metrics, formula, warnings = [], status = '', statusClass = '') {
    return { id: crypto.randomUUID(), version: APP_VERSION, type, title, createdAt: Helpers.iso(), inputs, metrics, formula, warnings, status, statusClass };
  }
};

const Calculator = {
  applyPreset(value, primarySelector, secondarySelector) {
    if (value === 'custom') return;
    const [p, s] = value.split('/').map(Number);
    $(primarySelector).value = p;
    $(secondarySelector).value = s;
  },
  calculateMain() {
    try {
      const ctPrimary = Helpers.number('#ctPrimary');
      const ctSecondary = Helpers.number('#ctSecondary');
      const vtPrimary = Helpers.number('#vtPrimary');
      const vtSecondary = Helpers.number('#vtSecondary');
      const activeConst = Helpers.number('#activeConst');
      const reactiveConst = Helpers.number('#reactiveConst');
      [ctPrimary, ctSecondary, vtPrimary, vtSecondary, activeConst, reactiveConst].forEach((v, i) => Helpers.assertPositive(v, ['CT Primary','CT Secondary','VT Primary','VT Secondary','Active Constant','Reactive Constant'][i]));
      const ctRatio = ctPrimary / ctSecondary;
      const vtRatio = vtPrimary / vtSecondary;
      const multiplier = ctRatio * vtRatio;
      const primaryActive = activeConst / multiplier;
      const primaryReactive = reactiveConst / multiplier;
      const warnings = [
        ...Warning.commonMultiplier(multiplier),
        ...Warning.constant(activeConst),
        ...Warning.constant(reactiveConst)
      ];
      if (![1, 5].includes(ctSecondary)) warnings.push('CT secondary is not 1A or 5A. Confirm CT nameplate.');
      if ($('#supplyType').value) warnings.push('Supply type is recorded for reference only. It does not change multiplier formula.');
      const formula = `CT Ratio = ${ctPrimary} ÷ ${ctSecondary} = ${Helpers.fmt(ctRatio)}\nVT Ratio = ${vtPrimary} ÷ ${vtSecondary} = ${Helpers.fmt(vtRatio)}\nMultiplier = ${Helpers.fmt(ctRatio)} × ${Helpers.fmt(vtRatio)} = ${Helpers.fmt(multiplier)}\nActive Primary Constant = ${activeConst} ÷ ${Helpers.fmt(multiplier)} = ${Helpers.fmt(primaryActive)} imp/kWh\nReactive Primary Constant = ${reactiveConst} ÷ ${Helpers.fmt(multiplier)} = ${Helpers.fmt(primaryReactive)} imp/kvarh`;
      const record = Records.create('calculator', 'CT/VT Meter Constant', { ctPrimary, ctSecondary, vtPrimary, vtSecondary, activeConst, reactiveConst, supplyType: $('#supplyType').value }, {
        'CT Ratio': Helpers.fmt(ctRatio), 'VT Ratio': Helpers.fmt(vtRatio), 'Total Multiplier': Helpers.fmt(multiplier), 'Active Primary Constant': `${Helpers.fmt(primaryActive)} imp/kWh`, 'Reactive Primary Constant': `${Helpers.fmt(primaryReactive)} imp/kvarh`
      }, formula, warnings);
      History.add(record);
      UI.result('#mainResult', record);
    } catch (error) { UI.toast(error.message); }
  },
  clearMain() {
    ['#ctPrimary','#ctSecondary','#vtPrimary','#vtSecondary','#activeConst','#reactiveConst'].forEach(id => $(id).value = '');
    $('#mainResult').innerHTML = '<h2>Result</h2><p class="muted">Cleared.</p>';
  }
};

const Energy = {
  calculate() {
    try {
      const mode = $('#energyMode').value;
      const unit = $('#energyUnit').value;
      const pulse = Helpers.number('#pulseCount');
      const energyInput = Helpers.number('#energyValue');
      const constant = Helpers.number('#energyConst');
      const multiplier = Helpers.number('#energyMultiplier');
      const basis = $('#energyBasis').value;
      Helpers.assertPositive(constant, 'Meter constant');
      Helpers.assertPositive(multiplier, 'Multiplier');
      const effectiveMultiplier = basis === 'secondary' ? multiplier : 1;
      let resultValue, formula, metrics;
      const constantUnit = Helpers.constantUnit(unit);
      if (mode === 'pulseToEnergy') {
        Helpers.assertPositive(pulse, 'Pulse count');
        const kWhBase = (pulse / constant) * effectiveMultiplier;
        resultValue = Helpers.baseKWhToUnit(kWhBase, unit);
        formula = `Energy base = Pulse ÷ Constant × Effective Multiplier\nEnergy = ${pulse} ÷ ${constant} × ${Helpers.fmt(effectiveMultiplier)} = ${Helpers.fmt(kWhBase)} ${unit === 'MWh' ? 'kWh base' : unit}\nDisplayed = ${Helpers.fmt(resultValue)} ${unit}`;
        metrics = { 'Energy': `${Helpers.fmt(resultValue)} ${unit}`, 'Effective Multiplier': Helpers.fmt(effectiveMultiplier), 'Constant Basis': constantUnit };
      } else {
        Helpers.assertPositive(energyInput, 'Energy value');
        const kWhBase = Helpers.unitToBaseKWh(energyInput, unit);
        resultValue = (kWhBase * constant) / effectiveMultiplier;
        formula = `Pulse = Energy(kWh base) × Constant ÷ Effective Multiplier\nEnergy base = ${energyInput} ${unit} = ${Helpers.fmt(kWhBase)} kWh/kvarh base\nPulse = ${Helpers.fmt(kWhBase)} × ${constant} ÷ ${Helpers.fmt(effectiveMultiplier)} = ${Helpers.fmt(resultValue)}`;
        metrics = { 'Pulse Count': `${Helpers.fmt(resultValue)} pulses`, 'Effective Multiplier': Helpers.fmt(effectiveMultiplier), 'Constant Basis': constantUnit };
      }
      const warnings = [...Warning.commonMultiplier(multiplier), ...Warning.constant(constant)];
      if (unit === 'MWh') warnings.push('MWh selected: app converts internally using kWh base. Meter constant remains imp/kWh.');
      if (basis === 'primary') warnings.push('No multiplier applied. Use only when value is already primary/billing basis.');
      const record = Records.create('energy', 'Pulse / Energy Conversion', { mode, unit, pulse, energyInput, constant, multiplier, basis }, metrics, formula, warnings);
      History.add(record); UI.result('#energyResult', record);
    } catch (error) { UI.toast(error.message); }
  },
  clear() { ['#pulseCount','#energyValue','#energyConst','#energyMultiplier'].forEach(id => $(id).value = ''); $('#energyResult').innerHTML = '<h2>Result</h2><p class="muted">Cleared.</p>'; }
};

const Accuracy = {
  toggleMethod() {
    const pulse = $('#accuracyMethod').value === 'pulse';
    $('#pulseFields').hidden = !pulse;
    $('#registerFields').hidden = pulse;
  },
  tolerance() {
    return $('#accuracyTolerance').value === 'custom' ? Helpers.number('#customTolerance') : Number($('#accuracyTolerance').value);
  },
  calculate() {
    try {
      const method = $('#accuracyMethod').value;
      const unit = $('#accuracyUnit').value;
      const referenceInput = Helpers.number('#referenceEnergy');
      const referenceBasis = $('#referenceBasis').value;
      const multiplier = Helpers.number('#accuracyMultiplier');
      const tolerance = this.tolerance();
      Helpers.assertPositive(referenceInput, 'Reference energy');
      Helpers.assertPositive(multiplier, 'Multiplier');
      Helpers.assertPositive(tolerance, 'Tolerance');
      const referenceBase = Helpers.unitToBaseKWh(referenceInput, unit) * (referenceBasis === 'secondary' ? multiplier : 1);
      let meterEnergyBase, basisLabel, formulaDetail, inputs = { method, unit, referenceInput, referenceBasis, multiplier, tolerance };
      if (method === 'register') {
        const initial = Helpers.number('#initialReading');
        const final = Helpers.number('#finalReading');
        const registerBasis = $('#registerBasis').value;
        if (final < initial) throw new Error('Final reading must be equal or higher than initial reading.');
        const rawDiff = Helpers.unitToBaseKWh(final - initial, unit);
        meterEnergyBase = rawDiff * (registerBasis === 'secondary' ? multiplier : 1);
        basisLabel = registerBasis;
        formulaDetail = `Register Difference = ${final} - ${initial} = ${Helpers.fmt(final - initial)} ${unit}\nMeter Energy Base = ${Helpers.fmt(rawDiff)} × ${registerBasis === 'secondary' ? Helpers.fmt(multiplier) : '1'} = ${Helpers.fmt(meterEnergyBase)} kWh/kvarh base`;
        Object.assign(inputs, { initial, final, registerBasis });
      } else {
        const pulse = Helpers.number('#accuracyPulse');
        const constant = Helpers.number('#accuracyPulseConst');
        const pulseBasis = $('#pulseBasis').value;
        Helpers.assertPositive(pulse, 'Pulse count');
        Helpers.assertPositive(constant, 'Meter constant');
        meterEnergyBase = (pulse / constant) * (pulseBasis === 'secondary' ? multiplier : 1);
        basisLabel = pulseBasis;
        formulaDetail = `Meter Energy Base = Pulse ÷ Constant × Effective Multiplier\nMeter Energy Base = ${pulse} ÷ ${constant} × ${pulseBasis === 'secondary' ? Helpers.fmt(multiplier) : '1'} = ${Helpers.fmt(meterEnergyBase)} kWh/kvarh base`;
        Object.assign(inputs, { pulse, constant, pulseBasis });
      }
      const errorPct = ((meterEnergyBase - referenceBase) / referenceBase) * 100;
      const pass = Math.abs(errorPct) <= tolerance;
      const formula = `Reference Energy Base = ${referenceInput} ${unit} × ${referenceBasis === 'secondary' ? Helpers.fmt(multiplier) : '1'} = ${Helpers.fmt(referenceBase)} kWh/kvarh base\n${formulaDetail}\nError % = (${Helpers.fmt(meterEnergyBase)} - ${Helpers.fmt(referenceBase)}) ÷ ${Helpers.fmt(referenceBase)} × 100 = ${Helpers.fmt(errorPct)}%\nTolerance = ±${Helpers.fmt(tolerance)}%`;
      const warnings = [...Warning.commonMultiplier(multiplier)];
      if (basisLabel === 'primary') warnings.push('No multiplier applied to meter value. Confirm value is already primary/billing basis.');
      if (referenceBasis === 'secondary') warnings.push('Multiplier applied to reference energy. Confirm reference value is raw/secondary.');
      if (unit === 'MWh') warnings.push('MWh selected: app converts internally to kWh base.');
      const record = Records.create('accuracy', 'Accuracy Test', inputs, { 'Meter Energy': `${Helpers.fmt(Helpers.baseKWhToUnit(meterEnergyBase, unit))} ${unit}`, 'Reference Energy': `${Helpers.fmt(Helpers.baseKWhToUnit(referenceBase, unit))} ${unit}`, 'Error': `${Helpers.fmt(errorPct)}%`, 'Tolerance': `±${Helpers.fmt(tolerance)}%` }, formula, warnings, pass ? 'PASS' : 'FAIL', pass ? 'pass' : 'fail');
      History.add(record); UI.result('#accuracyResult', record);
    } catch (error) { UI.toast(error.message); }
  },
  clear() { ['#referenceEnergy','#accuracyMultiplier','#initialReading','#finalReading','#accuracyPulse','#accuracyPulseConst'].forEach(id => $(id).value = ''); $('#accuracyResult').innerHTML = '<h2>Result</h2><p class="muted">Cleared.</p>'; }
};

const MD = {
  calculate() {
    try {
      const pulse = Helpers.number('#mdPulse');
      const constant = Helpers.number('#mdConst');
      const multiplier = Helpers.number('#mdMultiplier');
      const interval = Helpers.number('#mdInterval');
      const basis = $('#mdBasis').value;
      [pulse, constant, multiplier, interval].forEach((v, i) => Helpers.assertPositive(v, ['Pulse count','Meter constant','Multiplier','Interval'][i]));
      const effectiveMultiplier = basis === 'secondary' ? multiplier : 1;
      const energy = (pulse / constant) * effectiveMultiplier;
      const md = energy / (interval / 60);
      const formula = `Energy = Pulse ÷ Constant × Effective Multiplier\nEnergy = ${pulse} ÷ ${constant} × ${Helpers.fmt(effectiveMultiplier)} = ${Helpers.fmt(energy)} kWh\nMD kW = Energy ÷ (Interval ÷ 60)\nMD = ${Helpers.fmt(energy)} ÷ (${interval} ÷ 60) = ${Helpers.fmt(md)} kW`;
      const warnings = [...Warning.commonMultiplier(multiplier), ...Warning.constant(constant)];
      if (basis === 'primary') warnings.push('No multiplier applied. Use only if pulse/energy is already converted to primary basis.');
      const record = Records.create('md', 'Maximum Demand', { pulse, constant, multiplier, interval, basis }, { 'Energy': `${Helpers.fmt(energy)} kWh`, 'Maximum Demand': `${Helpers.fmt(md)} kW`, 'Interval': `${interval} min`, 'Effective Multiplier': Helpers.fmt(effectiveMultiplier) }, formula, warnings);
      History.add(record); UI.result('#mdResult', record);
    } catch (error) { UI.toast(error.message); }
  },
  clear() { ['#mdPulse','#mdConst','#mdMultiplier'].forEach(id => $(id).value = ''); $('#mdResult').innerHTML = '<h2>Result</h2><p class="muted">Cleared.</p>'; }
};

const Scanner = {
  bind() {
    const drop = $('#fileDrop');
    const input = $('#imageInput');
    drop.addEventListener('click', () => input.click());
    drop.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); input.click(); } });
    input.addEventListener('change', event => this.loadFile(event.target.files?.[0]));
    ['dragenter','dragover'].forEach(type => drop.addEventListener(type, event => { event.preventDefault(); drop.classList.add('dragover'); }));
    ['dragleave','drop'].forEach(type => drop.addEventListener(type, event => { event.preventDefault(); drop.classList.remove('dragover'); }));
    drop.addEventListener('drop', event => this.loadFile(event.dataTransfer.files?.[0]));
  },
  loadFile(file) {
    if (!file || !file.type.startsWith('image/')) { UI.toast('Please upload an image file.'); return; }
    uploadedImage = file;
    const url = URL.createObjectURL(file);
    $('#scanPreview').src = url;
    $('#scanPreview').classList.remove('hidden');
    $('#ocrStatus').textContent = `Image loaded: ${file.name}`;
  },
  async ensureOCR() {
    if (window.Tesseract) return window.Tesseract;
    if (tesseractLoading) return tesseractLoading;
    $('#ocrStatus').textContent = 'Loading OCR engine...';
    tesseractLoading = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      script.async = true;
      script.onload = () => resolve(window.Tesseract);
      script.onerror = () => reject(new Error('OCR engine failed to load. Check internet connection or vendor Tesseract locally.'));
      document.head.appendChild(script);
    });
    return tesseractLoading;
  },
  async runOCR() {
    try {
      if (!uploadedImage) throw new Error('Upload an image first.');
      const Tesseract = await this.ensureOCR();
      $('#ocrStatus').textContent = 'Running OCR...';
      const result = await Tesseract.recognize(uploadedImage, 'eng', { logger: m => { if (m.status) $('#ocrStatus').textContent = `${m.status} ${m.progress ? Math.round(m.progress * 100) + '%' : ''}`; } });
      const text = result.data.text || '';
      const data = this.extract(text);
      this.render(data, text);
      $('#ocrStatus').textContent = 'OCR completed. Verify before applying values.';
    } catch (error) { UI.toast(error.message); $('#ocrStatus').textContent = 'OCR failed.'; }
  },
  extract(text) {
    const compact = text.replace(/\s+/g, ' ');
    const pick = (regex) => compact.match(regex)?.[1] || '';
    return {
      activeConstant: pick(/(\d+(?:[.,]\d+)?)\s*(?:imp|pulse|pulses|rev)\s*\/\s*kW?h/i),
      reactiveConstant: pick(/(\d+(?:[.,]\d+)?)\s*(?:imp|pulse|pulses|rev)\s*\/\s*kvarh/i),
      class: pick(/class\s*([0-9.]+s?)/i),
      voltage: pick(/(\d+(?:[.,]\d+)?)\s*v\b/i),
      current: pick(/(\d+(?:[.,]\d+)?\s*(?:\(|\/)?\s*\d*(?:[.,]\d+)?\)?\s*a)\b/i),
      frequency: pick(/(50|60)\s*hz/i),
      serial: pick(/(?:serial|s\/n|sn|no)\s*[:#-]?\s*([A-Z0-9\-]{5,})/i),
      rawText: text
    };
  },
  render(data, raw) {
    const rows = Object.entries(data).filter(([k]) => k !== 'rawText').map(([k, v]) => `<div class="scan-kv"><span>${Helpers.text(k)}</span><strong>${Helpers.text(v || 'Not found')}</strong></div>`).join('');
    $('#scanResult').innerHTML = `<h2>Extracted Data</h2>${rows}<details><summary>Raw OCR text</summary><pre>${Helpers.text(raw)}</pre></details><div class="assumption-box warning-soft">OCR values are not trusted until manually verified against the meter nameplate.</div>`;
  },
  clear() { uploadedImage = null; $('#imageInput').value = ''; $('#scanPreview').classList.add('hidden'); $('#scanResult').innerHTML = '<h2>Extracted Data</h2><p class="muted">No scan yet.</p>'; $('#ocrStatus').textContent = 'OCR idle.'; }
};

const History = {
  all() { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); },
  save(list) { localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 200))); },
  add(record) { const list = [record, ...this.all()]; this.save(list); },
  render() {
    const q = ($('#historySearch')?.value || '').toLowerCase();
    const list = this.all().filter(r => JSON.stringify(r).toLowerCase().includes(q));
    $('#historyList').innerHTML = list.length ? list.map(r => `
      <article class="history-item">
        <div><h3>${Helpers.text(r.title)}</h3><p>${Helpers.displayDate(r.createdAt)} · ${Helpers.text(r.type)} ${r.status ? '· ' + Helpers.text(r.status) : ''}</p><p>${Helpers.text(Object.entries(r.metrics || {})[0]?.join(': ') || '')}</p></div>
        <div class="history-actions"><button class="btn secondary" data-history-action="view" data-record-id="${r.id}">View</button><button class="btn secondary" data-history-action="print" data-record-id="${r.id}">Print</button><button class="btn danger" data-history-action="delete" data-record-id="${r.id}">Delete</button></div>
      </article>`).join('') : '<p class="muted">No history records.</p>';
  },
  find(id) { return this.all().find(r => r.id === id); },
  delete(id) { this.save(this.all().filter(r => r.id !== id)); this.render(); },
  clear() { if (confirm('Clear all history records?')) { this.save([]); this.render(); UI.toast('History cleared.'); } },
  exportJSON() { Helpers.download(`jamac-procal-history-${Date.now()}.json`, JSON.stringify(this.all(), null, 2), 'application/json'); },
  exportCSV() {
    const rows = [['date','type','title','status','metrics','formula']].concat(this.all().map(r => [r.createdAt, r.type, r.title, r.status || '', JSON.stringify(r.metrics), r.formula]));
    Helpers.download(`jamac-procal-history-${Date.now()}.csv`, rows.map(row => row.map(Helpers.csv).join(',')).join('\n'), 'text/csv');
  },
  importJSON(event) {
    const file = event.target.files?.[0]; if (!file) return;
    if (file.size > 2_000_000) { UI.toast('Import file too large.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data)) throw new Error('JSON must be an array.');
        const valid = data.filter(r => r && r.id && r.type && r.createdAt && r.metrics && r.formula).slice(0, 200);
        this.save([...valid, ...this.all()].slice(0, 200)); this.render(); UI.toast(`${valid.length} records imported.`);
      } catch (error) { UI.toast(`Import failed: ${error.message}`); }
    };
    reader.readAsText(file);
  }
};

document.addEventListener('click', event => {
  const btn = event.target.closest('[data-history-action]');
  if (!btn) return;
  const record = History.find(btn.dataset.recordId);
  if (!record) return;
  if (btn.dataset.historyAction === 'delete') return History.delete(record.id);
  if (btn.dataset.historyAction === 'print') { Reports.show(record); setTimeout(() => Reports.printCurrent(), 50); return; }
  Reports.show(record);
});

const Reports = {
  show(record) {
    currentRecord = record;
    $('#recordTitle').textContent = record.title;
    $('#recordBody').innerHTML = this.html(record);
    $('#recordDialog').showModal();
  },
  html(record) {
    const metrics = Object.entries(record.metrics || {}).map(([k,v]) => `<div class="record-kv"><span>${Helpers.text(k)}</span><strong>${Helpers.text(v)}</strong></div>`).join('');
    const inputs = Object.entries(record.inputs || {}).map(([k,v]) => `<div class="record-kv"><span>${Helpers.text(k)}</span><strong>${Helpers.text(v)}</strong></div>`).join('');
    const warnings = record.warnings?.length ? `<h3>Warnings</h3><ul class="warning-list">${record.warnings.map(w => `<li>${Helpers.text(w)}</li>`).join('')}</ul>` : '';
    return `<p><strong>Version:</strong> ${Helpers.text(record.version)} · <strong>Date:</strong> ${Helpers.displayDate(record.createdAt)} ${record.status ? `· <strong>Status:</strong> <span class="${record.statusClass}">${Helpers.text(record.status)}</span>` : ''}</p><h3>Result</h3>${metrics}<h3>Input</h3>${inputs}<h3>Formula</h3><div class="formula-box"><pre>${Helpers.text(record.formula)}</pre></div>${warnings}<p class="muted">Report generated locally by JAMAC ProCal. Validate against official SOP before regulatory use.</p>`;
  },
  printCurrent() { if (!currentRecord) return; window.print(); }
};

window.addEventListener('DOMContentLoaded', () => UI.init());
