'use strict';

const APP = {
  name: 'JAMAC MeterCalc Universal',
  version: '3.3.1',
  historyKey: 'jamac_metercalc_v33_history',
  themeKey: 'jamac_metercalc_v33_theme',
  langKey: 'jamac_metercalc_v33_lang',
  calcMode: 'direct',
  accuracyMode: 'register',
  deferredInstallPrompt: null
};

const I18N = {
  ms: {
    tabCalculator: 'Kalkulator', tabEnergy: 'Tenaga', tabAccuracy: 'Accuracy', tabDemand: 'MD', tabScan: 'Scan', tabHistory: 'Sejarah', tabReference: 'Rujukan',
    calculatorTitle: 'Meter Multiplier Calculator', calculatorDesc: 'Kira multiplier CT/VT dan constant setara primary-side.', supplyType: 'Jenis Supply', meterClass: 'Class Meter', calculate: 'Kira',
    energyTitle: 'Pulse ↔ Tenaga', energyDesc: 'Gunakan meter nameplate constant. Jangan masukkan calculated primary constant jika multiplier juga digunakan.', mode: 'Mode', unit: 'Unit',
    accuracyTitle: 'Accuracy Test v3.3', accuracyDesc: 'Dibahagikan kepada Register Comparison dan Pulse Output Test supaya formula tidak bercampur.',
    demandTitle: 'Maximum Demand', demandDesc: 'v3.3 menyokong interval 15/30/60/custom minit.', scanTitle: 'OCR Meter Nameplate Scan', scanDesc: 'OCR hanya membantu extraction. Pengguna mesti review sebelum apply.',
    historyTitle: 'Sejarah & Backup', historyDesc: 'Rekod local disimpan dalam browser. Export JSON secara berkala.', referenceTitle: 'Rujukan & Nota',
    required: 'Sila masukkan nilai yang sah.', calculated: 'Calculation completed.', saved: 'Saved to history.', copied: 'Copied.', imported: 'Import completed.', cleared: 'History cleared.'
  },
  en: {
    tabCalculator: 'Calculator', tabEnergy: 'Energy', tabAccuracy: 'Accuracy', tabDemand: 'MD', tabScan: 'Scan', tabHistory: 'History', tabReference: 'Reference',
    calculatorTitle: 'Meter Multiplier Calculator', calculatorDesc: 'Calculate CT/VT multiplier and primary-side equivalent constants.', supplyType: 'Supply Type', meterClass: 'Meter Class', calculate: 'Calculate',
    energyTitle: 'Pulse ↔ Energy', energyDesc: 'Use the meter nameplate constant. Do not enter calculated primary constant if multiplier is also used.', mode: 'Mode', unit: 'Unit',
    accuracyTitle: 'Accuracy Test v3.3', accuracyDesc: 'Separated into Register Comparison and Pulse Output Test to avoid mixed formulas.',
    demandTitle: 'Maximum Demand', demandDesc: 'v3.3 supports 15/30/60/custom minute interval.', scanTitle: 'OCR Meter Nameplate Scan', scanDesc: 'OCR assists extraction only. User must review values before applying.',
    historyTitle: 'History & Backup', historyDesc: 'Local records are stored in the browser. Export JSON regularly.', referenceTitle: 'Reference & Notes',
    required: 'Please enter a valid value.', calculated: 'Calculation completed.', saved: 'Saved to history.', copied: 'Copied.', imported: 'Import completed.', cleared: 'History cleared.'
  }
};

const Helpers = {
  $(id) { return document.getElementById(id); },
  num(id) {
    const el = this.$(id);
    if (!el) return NaN;
    const value = String(el.value || '').replace(/,/g, '').trim();
    if (value === '') return NaN;
    return Number(value);
  },
  text(id) {
    const el = this.$(id);
    return el ? String(el.value || '').trim() : '';
  },
  isPositive(value) { return Number.isFinite(value) && value > 0; },
  isNonNegative(value) { return Number.isFinite(value) && value >= 0; },
  escape(value) {
    return String(value ?? '').replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
  },
  format(value, digits = 6) {
    if (!Number.isFinite(value)) return '-';
    const abs = Math.abs(value);
    if (abs !== 0 && abs < 0.000001) return value.toExponential(4);
    return new Intl.NumberFormat('en-MY', { maximumFractionDigits: digits }).format(value);
  },
  fixed(value, digits = 4) {
    if (!Number.isFinite(value)) return '-';
    return Number(value).toFixed(digits);
  },
  timestamp() { return new Date().toISOString(); },
  dateLabel(iso) {
    try { return new Date(iso).toLocaleString('en-MY', { dateStyle: 'medium', timeStyle: 'short' }); }
    catch { return iso; }
  },
  download(filename, mime, content) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
  csvCell(value) {
    const text = String(value ?? '');
    const protectedText = /^[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${protectedText.replace(/"/g, '""')}"`;
  }
};

const UI = {
  init() {
    const theme = localStorage.getItem(APP.themeKey) || 'dark';
    document.documentElement.dataset.theme = theme;
    Helpers.$('themeIcon').textContent = theme === 'dark' ? '🌙' : '☀️';

    const lang = localStorage.getItem(APP.langKey) || 'ms';
    document.documentElement.lang = lang;
    this.applyLanguage(lang);

    setTimeout(() => {
      Helpers.$('splash').hidden = true;
      Helpers.$('app').hidden = false;
    }, 350);

    this.bindInputListeners();
    this.updateOnlineStatus();
    window.addEventListener('online', () => this.updateOnlineStatus());
    window.addEventListener('offline', () => this.updateOnlineStatus());

    window.addEventListener('beforeinstallprompt', event => {
      event.preventDefault();
      APP.deferredInstallPrompt = event;
      const btn = Helpers.$('installBtn');
      btn.hidden = false;
      btn.onclick = async () => {
        btn.hidden = true;
        APP.deferredInstallPrompt.prompt();
        await APP.deferredInstallPrompt.userChoice;
        APP.deferredInstallPrompt = null;
      };
    });

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(err => console.warn('Service worker registration failed:', err));
    }

    History.render();
    Calculator.updateLiveRatios();
    Calculator.updateEnergyMode();
    Calculator.updateDemandInterval();
    Accuracy.syncTolerance();
    console.info(`✅ ${APP.name} v${APP.version} initialized`);
  },
  t(key) {
    const lang = localStorage.getItem(APP.langKey) || 'ms';
    return (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
  },
  applyLanguage(lang) {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (I18N[lang] && I18N[lang][key]) el.textContent = I18N[lang][key];
    });
    Helpers.$('langIcon').textContent = lang === 'ms' ? 'BM' : 'EN';
  },
  toggleLanguage() {
    const next = (localStorage.getItem(APP.langKey) || 'ms') === 'ms' ? 'en' : 'ms';
    localStorage.setItem(APP.langKey, next);
    document.documentElement.lang = next;
    this.applyLanguage(next);
    this.toast(next === 'ms' ? 'Bahasa Melayu aktif.' : 'English active.', 'success');
  },
  toggleTheme() {
    const current = document.documentElement.dataset.theme || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem(APP.themeKey, next);
    Helpers.$('themeIcon').textContent = next === 'dark' ? '🌙' : '☀️';
  },
  updateOnlineStatus() {
    const badge = Helpers.$('offlineBadge');
    if (!badge) return;
    badge.textContent = navigator.onLine ? 'Online' : 'Offline';
    badge.className = `status-pill ${navigator.onLine ? 'online' : 'offline'}`;
  },
  switchTab(panelId) {
    document.querySelectorAll('.panel').forEach(panel => panel.classList.remove('active'));
    Helpers.$(panelId).classList.add('active');
    document.querySelectorAll('.tab').forEach(tab => tab.classList.toggle('active', tab.dataset.tab === panelId));
    if (panelId === 'historyPanel') History.render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },
  bindInputListeners() {
    ['ctPrimary', 'ctSecondary', 'vtPrimary', 'vtSecondary', 'meterConstActive', 'meterConstReactive'].forEach(id => {
      const el = Helpers.$(id);
      if (el) el.addEventListener('input', () => Calculator.updateLiveRatios());
    });
  },
  toast(message, type = 'success') {
    const toast = Helpers.$('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.hidden = false;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { toast.hidden = true; }, 3200);
  },
  confirmReset() {
    if (!confirm('Reset current input fields?')) return;
    const activePanel = document.querySelector('.panel.active');
    if (!activePanel) return;
    activePanel.querySelectorAll('input, textarea').forEach(el => {
      if (el.type === 'file') return;
      if (el.id.includes('Const')) el.value = '1000';
      else if (el.id.includes('Multiplier')) el.value = '1';
      else if (el.id.includes('Secondary')) el.value = el.id.startsWith('ct') ? '5' : '110';
      else el.value = '';
    });
    activePanel.querySelectorAll('.result-zone').forEach(el => { el.hidden = true; el.innerHTML = ''; });
    Calculator.updateLiveRatios();
    this.toast('Current panel reset.', 'warning');
  },
  renderResult(containerId, heroLabel, heroValue, html, variant = '') {
    const el = Helpers.$(containerId);
    el.hidden = false;
    el.innerHTML = `
      <div class="result-hero ${variant}"><small>${Helpers.escape(heroLabel)}</small><strong>${Helpers.escape(heroValue)}</strong></div>
      <div class="result-content">${html}</div>
    `;
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
};

const Calculator = {
  setMode(mode) {
    APP.calcMode = mode;
    document.querySelectorAll('[data-calc-mode]').forEach(btn => btn.classList.toggle('active', btn.dataset.calcMode === mode));
    Helpers.$('ctFields').hidden = mode === 'direct';
    Helpers.$('vtFields').hidden = mode !== 'ctvt';
    this.updateLiveRatios();
  },
  updateLiveRatios() {
    const ctP = Helpers.num('ctPrimary');
    const ctS = Helpers.num('ctSecondary');
    const vtP = Helpers.num('vtPrimary');
    const vtS = Helpers.num('vtSecondary');
    Helpers.$('ctRatioLive').textContent = Helpers.isPositive(ctP) && Helpers.isPositive(ctS) ? `${Helpers.format(ctP / ctS)} : 1` : '-';
    Helpers.$('vtRatioLive').textContent = Helpers.isPositive(vtP) && Helpers.isPositive(vtS) ? `${Helpers.format(vtP / vtS)} : 1` : '-';
    this.updateWarnings();
  },
  updateWarnings() {
    const warnings = [];
    const mode = APP.calcMode;
    const ctP = Helpers.num('ctPrimary');
    const ctS = Helpers.num('ctSecondary');
    const vtP = Helpers.num('vtPrimary');
    const vtS = Helpers.num('vtSecondary');
    if (mode !== 'direct') {
      if (Helpers.isPositive(ctS) && ![1, 5].includes(ctS)) warnings.push('CT secondary is unusual. Typical values are 1A or 5A. Verify site record.');
      if (Helpers.isPositive(ctP) && Helpers.isPositive(ctS) && ctP <= ctS) warnings.push('CT primary should normally be greater than CT secondary.');
    }
    if (mode === 'ctvt') {
      const typicalVT = [57.7, 63.5, 100, 110, 115, 120];
      if (Helpers.isPositive(vtS) && !typicalVT.some(v => Math.abs(vtS - v) < 0.05)) warnings.push('VT secondary is unusual. Verify VT nameplate/SLD.');
      if (Helpers.isPositive(vtP) && Helpers.isPositive(vtS) && vtP <= vtS) warnings.push('VT primary should normally be greater than VT secondary.');
    }
    const box = Helpers.$('calculatorWarnings');
    if (!warnings.length) { box.hidden = true; box.innerHTML = ''; return; }
    box.hidden = false;
    box.innerHTML = `<strong>Input warnings:</strong><ul>${warnings.map(w => `<li>${Helpers.escape(w)}</li>`).join('')}</ul>`;
  },
  calculate() {
    const activeConst = Helpers.num('meterConstActive');
    const reactiveConst = Helpers.num('meterConstReactive');
    const supply = Helpers.text('supplyType');
    const meterClass = Helpers.text('meterClass');
    if (!Helpers.isPositive(activeConst)) return UI.toast('Meter Constant Active must be greater than zero.', 'error');
    if (!Helpers.isNonNegative(reactiveConst) && Number.isFinite(reactiveConst)) return UI.toast('Reactive constant must be zero or greater.', 'error');

    let ctRatio = 1;
    let vtRatio = 1;
    const mode = APP.calcMode;
    if (mode !== 'direct') {
      const ctP = Helpers.num('ctPrimary');
      const ctS = Helpers.num('ctSecondary');
      if (!Helpers.isPositive(ctP) || !Helpers.isPositive(ctS)) return UI.toast('Enter valid CT primary and secondary values.', 'error');
      if (ctP <= ctS) return UI.toast('CT primary must be greater than CT secondary.', 'error');
      ctRatio = ctP / ctS;
    }
    if (mode === 'ctvt') {
      const vtP = Helpers.num('vtPrimary');
      const vtS = Helpers.num('vtSecondary');
      if (!Helpers.isPositive(vtP) || !Helpers.isPositive(vtS)) return UI.toast('Enter valid VT primary and secondary values.', 'error');
      if (vtP <= vtS) return UI.toast('VT primary must be greater than VT secondary.', 'error');
      vtRatio = vtP / vtS;
    }
    const multiplier = ctRatio * vtRatio;
    if (multiplier > 10000) UI.toast('High multiplier detected. Verify CT/VT ratio.', 'warning');
    const primaryActive = activeConst / multiplier;
    const primaryReactive = reactiveConst > 0 ? reactiveConst / multiplier : 0;
    const formula = mode === 'direct' ? 'M = 1' : mode === 'ct' ? `M = CT Ratio = ${Helpers.format(ctRatio)}` : `M = CT Ratio × VT Ratio = ${Helpers.format(ctRatio)} × ${Helpers.format(vtRatio)}`;
    const record = { type: 'calculator', mode, supply, meterClass, activeConst, reactiveConst, ctRatio, vtRatio, multiplier, primaryActive, primaryReactive, timestamp: Helpers.timestamp() };
    const html = `
      <div class="kv-grid">
        <div class="kv"><small>Mode</small><strong>${mode.toUpperCase()}</strong></div>
        <div class="kv"><small>Formula</small><strong>${Helpers.escape(formula)}</strong></div>
        <div class="kv"><small>CT Ratio</small><strong>${Helpers.format(ctRatio)} : 1</strong></div>
        <div class="kv"><small>VT Ratio</small><strong>${Helpers.format(vtRatio)} : 1</strong></div>
        <div class="kv"><small>Primary-side Active Constant</small><strong>${Helpers.format(primaryActive)} imp/kWh</strong></div>
        <div class="kv"><small>Secondary Active Constant</small><strong>${Helpers.format(activeConst)} imp/kWh</strong></div>
        <div class="kv"><small>Primary-side Reactive Constant</small><strong>${Helpers.format(primaryReactive)} imp/kvarh</strong></div>
        <div class="kv"><small>Secondary Reactive Constant</small><strong>${Helpers.format(reactiveConst)} imp/kvarh</strong></div>
      </div>`;
    UI.renderResult('calculatorResult', 'Total Multiplier', Helpers.format(multiplier), html);
    History.add(record);
  },
  updateEnergyMode() {
    const mode = Helpers.text('energyMode') || 'pulseToEnergy';
    Helpers.$('energyPulseCountWrap').hidden = mode !== 'pulseToEnergy';
    Helpers.$('energyValueWrap').hidden = mode !== 'energyToPulse';
  },
  calculateEnergy() {
    const mode = Helpers.text('energyMode') || 'pulseToEnergy';
    const unit = Helpers.text('energyUnit') || 'kWh';
    const basis = Helpers.text('energyBasis') || 'primary';
    const pConst = Helpers.num('energyPulseConst');
    const inputMultiplier = Helpers.num('energyMultiplier');
    const effectiveMultiplier = basis === 'primary' ? inputMultiplier : 1;
    if (!Helpers.isPositive(pConst)) return UI.toast('Meter constant must be greater than zero.', 'error');
    if (!Helpers.isPositive(inputMultiplier)) return UI.toast('Multiplier must be greater than zero.', 'error');
    let html = '';
    let hero = '';
    let record = { type: mode === 'energyToPulse' ? 'energyToPulse' : 'energy', unit, basis, pulseConst: pConst, multiplier: inputMultiplier, effectiveMultiplier, timestamp: Helpers.timestamp() };
    if (mode === 'energyToPulse') {
      const energyValue = Helpers.num('energyValue');
      if (!Helpers.isNonNegative(energyValue)) return UI.toast('Energy value must be zero or greater.', 'error');
      const energyKWh = unit === 'MWh' ? energyValue * 1000 : energyValue;
      const pulse = (energyKWh * pConst) / effectiveMultiplier;
      hero = `${Helpers.format(pulse)} pulse`;
      record = { ...record, energyValue, result: pulse };
      html = `<div class="kv-grid"><div class="kv"><small>Formula</small><strong>Pulse = Energy × Constant / Multiplier</strong></div><div class="kv"><small>Input Energy</small><strong>${Helpers.format(energyValue)} ${unit}</strong></div><div class="kv"><small>Meter Constant</small><strong>${Helpers.format(pConst)} imp/${unit}</strong></div><div class="kv"><small>Input Multiplier</small><strong>${Helpers.format(inputMultiplier)}</strong></div><div class="kv"><small>Applied Multiplier</small><strong>${Helpers.format(effectiveMultiplier)}</strong></div><div class="kv"><small>Basis</small><strong>${basis === 'primary' ? 'Primary / Billing' : 'Secondary / Raw'}</strong></div></div>`;
    } else {
      const pulseCount = Helpers.num('energyPulseCount');
      if (!Helpers.isNonNegative(pulseCount)) return UI.toast('Pulse count must be zero or greater.', 'error');
      let energy = (pulseCount / pConst) * effectiveMultiplier;
      if (unit === 'MWh') energy /= 1000;
      hero = `${Helpers.format(energy)} ${unit}`;
      record = { ...record, pulseCount, result: energy };
      html = `<div class="kv-grid"><div class="kv"><small>Formula</small><strong>Energy = Pulse / Constant × Multiplier</strong></div><div class="kv"><small>Pulse Count</small><strong>${Helpers.format(pulseCount)}</strong></div><div class="kv"><small>Meter Constant</small><strong>${Helpers.format(pConst)} imp/${unit}</strong></div><div class="kv"><small>Input Multiplier</small><strong>${Helpers.format(inputMultiplier)}</strong></div><div class="kv"><small>Applied Multiplier</small><strong>${Helpers.format(effectiveMultiplier)}</strong></div><div class="kv"><small>Basis</small><strong>${basis === 'primary' ? 'Primary / Billing' : 'Secondary / Raw'}</strong></div></div>`;
    }
    UI.renderResult('energyResult', mode === 'energyToPulse' ? 'Required Pulse' : 'Energy', hero, html);
    History.add(record);
  },
  updateDemandInterval() {
    const value = Helpers.text('mdInterval');
    Helpers.$('mdCustomIntervalWrap').hidden = value !== 'custom';
  },
  calculateDemand() {
    const pulseCount = Helpers.num('mdPulseCount');
    const pConst = Helpers.num('mdPulseConst');
    const multiplier = Helpers.num('mdMultiplier');
    const basis = Helpers.text('mdBasis') || 'primary';
    const effectiveMultiplier = basis === 'primary' ? multiplier : 1;
    const selectInterval = Helpers.text('mdInterval');
    const interval = selectInterval === 'custom' ? Helpers.num('mdCustomInterval') : Number(selectInterval);
    if (!Helpers.isNonNegative(pulseCount)) return UI.toast('Pulse count must be zero or greater.', 'error');
    if (!Helpers.isPositive(pConst)) return UI.toast('Meter constant must be greater than zero.', 'error');
    if (!Helpers.isPositive(multiplier)) return UI.toast('Multiplier must be greater than zero.', 'error');
    if (!Helpers.isPositive(interval)) return UI.toast('Demand interval must be greater than zero.', 'error');
    const energy = (pulseCount / pConst) * effectiveMultiplier;
    const md = energy / (interval / 60);
    const html = `<div class="kv-grid"><div class="kv"><small>Energy During Interval</small><strong>${Helpers.format(energy)} kWh</strong></div><div class="kv"><small>Interval</small><strong>${Helpers.format(interval)} minutes</strong></div><div class="kv"><small>Formula</small><strong>MD = Energy / (Interval / 60)</strong></div><div class="kv"><small>Pulse Constant</small><strong>${Helpers.format(pConst)} imp/kWh</strong></div><div class="kv"><small>Basis</small><strong>${basis === 'primary' ? 'Primary / Billing' : 'Secondary / Raw'}</strong></div><div class="kv"><small>Applied Multiplier</small><strong>${Helpers.format(effectiveMultiplier)}</strong></div></div>`;
    UI.renderResult('demandResult', 'Maximum Demand', `${Helpers.format(md)} kW`, html);
    History.add({ type: 'demand', pulseCount, pulseConst: pConst, multiplier, effectiveMultiplier, basis, interval, energy, result: md, timestamp: Helpers.timestamp() });
  }
};

const Accuracy = {
  setMode(mode) {
    APP.accuracyMode = mode;
    document.querySelectorAll('[data-acc-mode]').forEach(btn => btn.classList.toggle('active', btn.dataset.accMode === mode));
    Helpers.$('registerModeFields').hidden = mode !== 'register';
    Helpers.$('pulseModeFields').hidden = mode !== 'pulse';
  },
  syncTolerance() {
    const value = Helpers.text('accClass');
    const input = Helpers.$('accTolerance');
    if (value !== 'custom') input.value = value;
  },
  calculate() {
    const mode = APP.accuracyMode;
    const referenceEnergy = Helpers.num('accReferenceEnergy');
    const tolerance = Helpers.num('accTolerance');
    const unit = Helpers.text('accUnit') || 'kWh';
    const referenceBasis = Helpers.text('accReferenceBasis') || 'primary';
    const readingBasis = Helpers.text('accReadingBasis') || 'primary';
    const basisMultiplier = Helpers.num('accBasisMultiplier');
    const remarks = Helpers.text('accRemarks');
    if (!Helpers.isPositive(referenceEnergy)) return UI.toast('Reference energy must be greater than zero.', 'error');
    if (!Helpers.isPositive(tolerance)) return UI.toast('Tolerance must be greater than zero.', 'error');
    if (!Helpers.isPositive(basisMultiplier)) return UI.toast('Basis multiplier must be greater than zero.', 'error');

    let meterEnergy = NaN;
    let detailHtml = '';
    let formula = '';
    const normalizedReferenceEnergy = referenceBasis === 'secondary' ? referenceEnergy * basisMultiplier : referenceEnergy;
    let record = { type: 'accuracy', mode, unit, referenceEnergy, normalizedReferenceEnergy, referenceBasis, readingBasis, basisMultiplier, tolerance, remarks, timestamp: Helpers.timestamp() };

    if (mode === 'register') {
      const start = Helpers.num('accStartReading');
      const end = Helpers.num('accEndReading');
      if (!Number.isFinite(start)) return UI.toast('Enter valid start reading.', 'error');
      if (!Number.isFinite(end)) return UI.toast('Enter valid end reading.', 'error');
      if (end <= start) return UI.toast('End reading must be greater than start reading.', 'error');
      const rawDifference = end - start;
      meterEnergy = readingBasis === 'secondary' ? rawDifference * basisMultiplier : rawDifference;
      formula = 'Error % = ((Normalized Meter Energy - Normalized Reference Energy) / Normalized Reference Energy) × 100';
      detailHtml = `<div class="kv"><small>Start Reading</small><strong>${Helpers.format(start)} ${unit}</strong></div><div class="kv"><small>End Reading</small><strong>${Helpers.format(end)} ${unit}</strong></div><div class="kv"><small>Raw Meter Difference</small><strong>${Helpers.format(rawDifference)} ${unit}</strong></div><div class="kv"><small>Normalized Meter Energy</small><strong>${Helpers.format(meterEnergy)} ${unit}</strong></div>`;
      record = { ...record, start, end, rawDifference, meterEnergy };
    } else {
      const pulseCount = Helpers.num('accPulseCount');
      const pulseConst = Helpers.num('accPulseConst');
      const multiplier = Helpers.num('accMultiplier');
      const effectivePulseMultiplier = readingBasis === 'secondary' ? multiplier : 1;
      if (!Helpers.isPositive(pulseCount)) return UI.toast('Pulse count must be greater than zero.', 'error');
      if (!Helpers.isPositive(pulseConst)) return UI.toast('Meter constant must be greater than zero.', 'error');
      if (!Helpers.isPositive(multiplier)) return UI.toast('Pulse multiplier must be greater than zero.', 'error');
      meterEnergy = (pulseCount / pulseConst) * effectivePulseMultiplier;
      if (unit === 'MWh') meterEnergy /= 1000;
      formula = 'Meter Energy = Pulse Count / Meter Constant × Multiplier; Error % = ((Meter Energy - Reference Energy) / Reference Energy) × 100';
      detailHtml = `<div class="kv"><small>Pulse Count</small><strong>${Helpers.format(pulseCount)}</strong></div><div class="kv"><small>Meter Constant</small><strong>${Helpers.format(pulseConst)} imp/${unit}</strong></div><div class="kv"><small>Pulse Multiplier</small><strong>${Helpers.format(multiplier)}</strong></div><div class="kv"><small>Applied Pulse Multiplier</small><strong>${Helpers.format(effectivePulseMultiplier)}</strong></div><div class="kv"><small>Meter Energy</small><strong>${Helpers.format(meterEnergy)} ${unit}</strong></div>`;
      record = { ...record, pulseCount, pulseConst, multiplier, effectivePulseMultiplier, meterEnergy };
    }

    const error = ((meterEnergy - normalizedReferenceEnergy) / normalizedReferenceEnergy) * 100;
    const passed = Math.abs(error) <= tolerance;
    const html = `<div class="kv-grid"><div class="kv"><small>Mode</small><strong>${mode === 'register' ? 'Register Comparison' : 'Pulse Output Test'}</strong></div><div class="kv"><small>Reference Energy</small><strong>${Helpers.format(referenceEnergy)} ${unit}</strong></div><div class="kv"><small>Normalized Reference</small><strong>${Helpers.format(normalizedReferenceEnergy)} ${unit}</strong></div><div class="kv"><small>Reference Basis</small><strong>${referenceBasis === 'primary' ? 'Primary / Billing' : 'Secondary / Raw'}</strong></div><div class="kv"><small>Reading Basis</small><strong>${readingBasis === 'primary' ? 'Primary / Billing' : 'Secondary / Raw'}</strong></div><div class="kv"><small>Basis Multiplier</small><strong>${Helpers.format(basisMultiplier)}</strong></div>${detailHtml}<div class="kv"><small>Error</small><strong class="${passed ? 'pass' : 'fail'}">${Helpers.fixed(error, 4)}%</strong></div><div class="kv"><small>Tolerance</small><strong>±${Helpers.format(tolerance)}%</strong></div><div class="kv"><small>Status</small><strong class="${passed ? 'pass' : 'fail'}">${passed ? 'PASS' : 'FAIL'}</strong></div><div class="kv"><small>Formula</small><strong>${Helpers.escape(formula)}</strong></div>${remarks ? `<div class="kv"><small>Remarks</small><strong>${Helpers.escape(remarks)}</strong></div>` : ''}</div>`;
    UI.renderResult('accuracyResult', 'Accuracy Status', passed ? 'PASS' : 'FAIL', html, passed ? 'pass' : 'fail');
    History.add({ ...record, error, passed });
  }
};

const Scanner = {
  file: null,
  detected: {},
  loadFile(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return UI.toast('Please select an image file.', 'error');
    this.file = file;
    const preview = Helpers.$('scanPreview');
    preview.src = URL.createObjectURL(file);
    preview.hidden = false;
    Helpers.$('scanBtn').disabled = false;
    Helpers.$('scanResult').hidden = true;
  },
  async runOCR() {
    if (!this.file) return UI.toast('Upload an image first.', 'error');
    if (!window.Tesseract) return UI.toast('OCR library is not available. Connect internet once, then retry.', 'error');
    const progress = Helpers.$('scanProgress');
    const bar = progress.querySelector('span');
    progress.hidden = false;
    bar.style.width = '5%';
    Helpers.$('scanBtn').disabled = true;
    try {
      const result = await Tesseract.recognize(this.file, 'eng', {
        logger: msg => {
          if (msg.status === 'recognizing text' && Number.isFinite(msg.progress)) bar.style.width = `${Math.max(8, Math.round(msg.progress * 100))}%`;
        }
      });
      const text = result.data.text || '';
      const confidence = Math.round(result.data.confidence || 0);
      this.detected = this.extract(text);
      this.render(text, confidence);
      UI.toast('OCR completed. Review detected values before applying.', 'success');
    } catch (error) {
      console.error(error);
      UI.toast('OCR failed. Try a clearer image.', 'error');
    } finally {
      Helpers.$('scanBtn').disabled = false;
      setTimeout(() => { progress.hidden = true; }, 800);
    }
  },
  extract(text) {
    const normalized = text.replace(/[,]/g, '.').replace(/\s+/g, ' ');
    const pick = (...patterns) => {
      for (const pattern of patterns) {
        const match = normalized.match(pattern);
        if (match) return match[1];
      }
      return '';
    };
    return {
      activeConst: pick(/(\d+(?:\.\d+)?)\s*(?:imp|pulse|p)\s*\/?\s*kwh/i, /(?:kwh)\s*[:=]?\s*(\d+(?:\.\d+)?)/i),
      reactiveConst: pick(/(\d+(?:\.\d+)?)\s*(?:imp|pulse|p)\s*\/?\s*kvarh/i, /(?:kvarh)\s*[:=]?\s*(\d+(?:\.\d+)?)/i),
      meterClass: pick(/(?:class|cl|cls)\s*[:.]?\s*(0\.2s|0\.5s|0\.5|1|2)/i),
      currentRating: pick(/(\d+(?:\.\d+)?\s*(?:\(\s*\d+(?:\.\d+)?\s*\)|[-/]\s*\d+(?:\.\d+)?)?\s*a)/i),
      voltage: pick(/(\d+(?:\.\d+)?\s*(?:v|kv))/i),
      frequency: pick(/(50\s*hz|60\s*hz)/i),
      serial: pick(/(?:serial|s\/n|sn|no)\s*[:.]?\s*([a-z0-9\-\/]{4,})/i),
      model: pick(/(?:model|type)\s*[:.]?\s*([a-z0-9\-\/]{3,})/i)
    };
  },
  render(text, confidence) {
    const entries = Object.entries(this.detected).filter(([, value]) => value);
    const confidenceLabel = confidence >= 75 ? 'High' : confidence >= 50 ? 'Review manually' : 'Low';
    const rows = entries.length ? entries.map(([key, value]) => `<label class="detect-row"><input type="checkbox" data-detect-key="${Helpers.escape(key)}" checked /><span><strong>${Helpers.escape(this.label(key))}</strong><br><small>${Helpers.escape(value)}</small></span></label>`).join('') : '<p>No structured values detected. Review raw text manually.</p>';
    const html = `<div class="kv-grid"><div class="kv"><small>OCR Confidence</small><strong>${confidence}% - ${Helpers.escape(confidenceLabel)}</strong></div><div class="kv"><small>Detected Fields</small><strong>${entries.length}</strong></div></div><h3>Review detected values</h3>${rows}${entries.length ? '<button class="secondary-btn" onclick="Scanner.applySelected()">Apply Selected Values</button>' : ''}<h3>Raw OCR Text</h3><div class="raw-text">${Helpers.escape(text)}</div>`;
    Helpers.$('scanResult').hidden = false;
    Helpers.$('scanResult').innerHTML = `<div class="result-content">${html}</div>`;
  },
  label(key) {
    return ({ activeConst: 'Active Constant', reactiveConst: 'Reactive Constant', meterClass: 'Meter Class', currentRating: 'Current Rating', voltage: 'Voltage', frequency: 'Frequency', serial: 'Serial Number', model: 'Model' })[key] || key;
  },
  applySelected() {
    const selected = [...document.querySelectorAll('[data-detect-key]:checked')].map(el => el.dataset.detectKey);
    selected.forEach(key => {
      const value = this.detected[key];
      if (!value) return;
      if (key === 'activeConst') {
        Helpers.$('meterConstActive').value = Number(value);
        Helpers.$('energyPulseConst').value = Number(value);
        Helpers.$('accPulseConst').value = Number(value);
        Helpers.$('mdPulseConst').value = Number(value);
      }
      if (key === 'reactiveConst') Helpers.$('meterConstReactive').value = Number(value);
      if (key === 'meterClass') {
        const clean = value.toUpperCase();
        const select = Helpers.$('meterClass');
        const opt = [...select.options].find(o => o.value.toUpperCase() === clean);
        if (opt) select.value = opt.value;
      }
    });
    Calculator.updateLiveRatios();
    UI.toast('Selected OCR values applied. Verify before calculating.', 'warning');
    UI.switchTab('calculatorPanel');
  }
};

const History = {
  list() {
    try {
      const data = JSON.parse(localStorage.getItem(APP.historyKey) || '[]');
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  },
  save(list) {
    localStorage.setItem(APP.historyKey, JSON.stringify(list.slice(0, 500)));
    this.render();
  },
  add(record) {
    const list = this.list();
    list.unshift({ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, appVersion: APP.version, ...record });
    this.save(list);
    UI.toast(`${UI.t('calculated')} ${UI.t('saved')}`, 'success');
  },
  render() {
    const list = this.list();
    const count = Helpers.$('historyCount');
    if (count) count.textContent = String(list.length);
    const target = Helpers.$('historyList');
    if (!target) return;
    if (!list.length) {
      target.innerHTML = '<div class="history-card"><p>No records yet.</p></div>';
      return;
    }
    target.innerHTML = list.map(item => `<article class="history-card"><header><h3>${Helpers.escape(this.title(item))}</h3><time>${Helpers.escape(Helpers.dateLabel(item.timestamp))}</time></header><p>${Helpers.escape(this.summary(item))}</p></article>`).join('');
  },
  title(item) {
    return ({ calculator: 'Multiplier Calculator', energy: 'Pulse to Energy', energyToPulse: 'Energy to Pulse', accuracy: 'Accuracy Test', demand: 'Maximum Demand' })[item.type] || item.type || 'Record';
  },
  summary(item) {
    switch (item.type) {
      case 'calculator': return `Mode ${String(item.mode).toUpperCase()}, multiplier ${Helpers.format(item.multiplier)}, active primary constant ${Helpers.format(item.primaryActive)} imp/kWh.`;
      case 'energy': return `${Helpers.format(item.pulseCount)} pulse = ${Helpers.format(item.result)} ${item.unit}, multiplier ${Helpers.format(item.multiplier)}.`;
      case 'energyToPulse': return `${Helpers.format(item.energyValue)} ${item.unit} = ${Helpers.format(item.result)} pulse, multiplier ${Helpers.format(item.multiplier)}.`;
      case 'accuracy': return `${item.mode} mode, error ${Helpers.fixed(item.error, 4)}%, status ${item.passed ? 'PASS' : 'FAIL'}.`;
      case 'demand': return `${Helpers.format(item.energy)} kWh over ${Helpers.format(item.interval)} min = ${Helpers.format(item.result)} kW.`;
      default: return JSON.stringify(item).slice(0, 140);
    }
  },
  exportJSON() {
    const payload = { app: APP.name, version: APP.version, exportedAt: Helpers.timestamp(), history: this.list() };
    Helpers.download(`metercalc-history-v${APP.version}-${new Date().toISOString().slice(0,10)}.json`, 'application/json', JSON.stringify(payload, null, 2));
  },
  importJSON(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(String(reader.result || '{}'));
        const incoming = Array.isArray(payload) ? payload : payload.history;
        if (!Array.isArray(incoming)) throw new Error('Invalid history file');
        const merged = [...incoming, ...this.list()].filter(Boolean);
        const deduped = [];
        const seen = new Set();
        merged.forEach(item => {
          const id = item.id || `${item.timestamp}-${item.type}-${JSON.stringify(item).length}`;
          if (!seen.has(id)) { seen.add(id); deduped.push({ id, ...item }); }
        });
        this.save(deduped);
        UI.toast(UI.t('imported'), 'success');
      } catch (error) {
        console.error(error);
        UI.toast('Invalid JSON backup file.', 'error');
      }
      event.target.value = '';
    };
    reader.readAsText(file);
  },
  exportCSV() {
    const list = this.list();
    const rows = [['timestamp', 'type', 'summary', 'version'], ...list.map(item => [item.timestamp, item.type, this.summary(item), item.appVersion || APP.version])];
    const csv = rows.map(row => row.map(Helpers.csvCell).join(',')).join('\n');
    Helpers.download(`metercalc-history-v${APP.version}-${new Date().toISOString().slice(0,10)}.csv`, 'text/csv;charset=utf-8', csv);
  },
  clear() {
    if (!confirm('Clear all local history? Export JSON first if this data is important.')) return;
    localStorage.removeItem(APP.historyKey);
    this.render();
    UI.toast(UI.t('cleared'), 'warning');
  }
};

window.UI = UI;
window.Calculator = Calculator;
window.Accuracy = Accuracy;
window.Scanner = Scanner;
window.History = History;

document.addEventListener('DOMContentLoaded', () => UI.init());
