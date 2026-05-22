'use strict';

const STORAGE_KEY = 'jamac-procal-v332-history';
const SETTINGS_KEY = 'jamac-procal-v332-settings';
const APP_VERSION = '3.3.2-r1';
let deferredInstallPrompt = null;
let currentRecord = null;
let tesseractLoading = null;
let uploadedImage = null;
let uploadedImageBitmap = null;

const I18N = {
  ms: {
    appVersion: 'v3.3.2-r1 Stabilization', tabCalculator: 'Kalkulator', tabEnergy: 'Tenaga', tabAccuracy: 'Ketepatan', tabMD: 'MD', tabScan: 'Imbas', tabHistory: 'Sejarah', tabReference: 'Rujukan',
    mainEyebrow: 'Direct / CT / CT-PT / Pemalar Meter', mainTitle: 'Pembantu kiraan meter profesional', mainDesc: 'Pilih jenis meter dahulu. Direct meter menggunakan multiplier 1; CT/CT-PT menggunakan ratio yang dipilih.',
    calculate: 'Kira', clear: 'Kosongkan', input: 'Input', meterTypeLabel: 'Jenis Meter', meterDirect: 'Direct Meter', meterCT: 'CT Operated Meter', meterCTPT: 'CT/PT Operated Meter', connectionRuleTitle: 'Peraturan sambungan', connectionRuleText: 'Direct = multiplier 1. CT = CT ratio. CT/PT = CT ratio × VT ratio.', supplyType: 'Jenis Bekalan', ctPresetLabel: 'Preset CT', ctPrimaryLabel: 'CT Primary (A)', ctSecondaryLabel: 'CT Secondary (A)', vtPresetLabel: 'Preset VT', vtPrimaryLabel: 'VT Primary (V)', vtSecondaryLabel: 'VT Secondary (V)', activeConstLabel: 'Pemalar Aktif (imp/kWh)', reactiveConstLabel: 'Pemalar Reaktif (imp/kvarh)', multiplierLabel: 'CT/VT Multiplier',
    energyAssumption: 'Meter constant mesti guna nilai nameplate meter, biasanya imp/kWh atau imp/kvarh. MWh ditukar secara dalaman kepada/daripada kWh.', accuracyAssumption: 'Jangan gandakan CT/VT multiplier. Billing register biasanya sudah termasuk multiplier. Raw pulse/nameplate constant biasanya perlu multiplier.', mdAssumption: 'Kiraan demand interval daripada active pulse count. Ia bukan pengganti MD register rasmi kecuali disahkan SOP.',
    scanEyebrow: 'OCR / Bantuan Bacaan', scanTitle: 'Imbas nameplate atau paparan meter', imageInput: 'Imej', scanModeLabel: 'Mod Imbas', scanNameplate: 'OCR Nameplate', scanDisplay: 'OCR Paparan Bacaan', scanManual: 'Bacaan Manual Disahkan', manualReadingLabel: 'Bacaan Manual', dropImage: 'Lepas imej di sini atau klik untuk upload', ocrVerify: 'Crop kawasan display untuk OCR bacaan meter yang lebih baik. Sahkan nilai sebelum guna.', displayControls: 'Kawalan OCR Paparan', displayControlsNote: 'Gunakan crop peratus untuk asingkan kawasan LCD/register sahaja, kemudian guna threshold untuk digit lebih jelas.', previewCrop: 'Preview Crop', runOCR: 'Run OCR', useManual: 'Guna Bacaan Manual', extractedData: 'Data Diekstrak', noScan: 'Belum ada imbasan.', result: 'Keputusan', ready: 'Sedia.', cleared: 'Dikosongkan.', directNote: 'Direct meter: multiplier dikunci kepada 1.'
  },
  en: {
    appVersion: 'v3.3.2-r1 Stabilization', tabCalculator: 'Calculator', tabEnergy: 'Energy', tabAccuracy: 'Accuracy', tabMD: 'MD', tabScan: 'Scan', tabHistory: 'History', tabReference: 'Reference',
    mainEyebrow: 'Direct / CT / CT-PT / Meter Constant', mainTitle: 'Professional meter calculation helper', mainDesc: 'Select meter type first. Direct meter uses multiplier 1; CT/CT-PT uses the selected ratio.',
    calculate: 'Calculate', clear: 'Clear', input: 'Input', meterTypeLabel: 'Meter Type', meterDirect: 'Direct Meter', meterCT: 'CT Operated Meter', meterCTPT: 'CT/PT Operated Meter', connectionRuleTitle: 'Connection rule', connectionRuleText: 'Direct = multiplier 1. CT = CT ratio. CT/PT = CT ratio × VT ratio.', supplyType: 'Supply Type', ctPresetLabel: 'CT Preset', ctPrimaryLabel: 'CT Primary (A)', ctSecondaryLabel: 'CT Secondary (A)', vtPresetLabel: 'VT Preset', vtPrimaryLabel: 'VT Primary (V)', vtSecondaryLabel: 'VT Secondary (V)', activeConstLabel: 'Active Constant (imp/kWh)', reactiveConstLabel: 'Reactive Constant (imp/kvarh)', multiplierLabel: 'CT/VT Multiplier',
    energyAssumption: 'Meter constant must use the meter nameplate value, normally imp/kWh or imp/kvarh. MWh is converted internally to/from kWh.', accuracyAssumption: 'Do not double-apply CT/VT multiplier. Billing register normally already includes multiplier. Raw pulse/nameplate constant normally needs multiplier.', mdAssumption: 'Calculated interval demand from active pulse count. This is not a replacement for official meter registered MD unless verified by SOP.',
    scanEyebrow: 'OCR / Reading Assist', scanTitle: 'Scan meter nameplate or display reading', imageInput: 'Image', scanModeLabel: 'Scan Mode', scanNameplate: 'Nameplate OCR', scanDisplay: 'Display Reading OCR', scanManual: 'Manual Verified Reading', manualReadingLabel: 'Manual Reading', dropImage: 'Drop image here or click to upload', ocrVerify: 'Crop display area for better meter-reading OCR. Always verify before applying values.', displayControls: 'Display OCR Controls', displayControlsNote: 'Use percentage crop to isolate only the LCD/register window, then apply threshold for clearer digits.', previewCrop: 'Preview Crop', runOCR: 'Run OCR', useManual: 'Use Manual Reading', extractedData: 'Extracted Data', noScan: 'No scan yet.', result: 'Result', ready: 'Ready.', cleared: 'Cleared.', directNote: 'Direct meter: multiplier is locked to 1.'
  }
};
const t = (key) => I18N[AppState.lang]?.[key] || I18N.en[key] || key;
const AppState = { lang: 'ms' };

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
    AppState.lang = settings.lang || 'ms';
    if (settings.theme) document.documentElement.dataset.theme = settings.theme;
    $('#themeToggle').textContent = settings.theme === 'dark' ? '☀️' : '🌙';
    this.applyLanguage(AppState.lang);
    this.bindTabs();
    this.bindActions();
    this.bindStatus();
    this.updateMeterModes();
    History.render();
  },
  saveSetting(partial) {
    const current = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, ...partial }));
  },
  applyLanguage(lang) {
    AppState.lang = lang;
    document.documentElement.lang = lang;
    $$('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      const value = t(key);
      if (!value) return;
      const select = el.tagName === 'OPTION';
      if (select) el.textContent = value;
      else {
        const childInput = el.querySelector('input,select,textarea');
        if (childInput) {
          const nodes = Array.from(el.childNodes).filter(n => n.nodeType === Node.TEXT_NODE);
          if (nodes[0]) nodes[0].nodeValue = value + ' ';
        } else el.textContent = value;
      }
    });
    $('#langToggle').textContent = lang === 'ms' ? 'EN' : 'BM';
    this.saveSetting({ lang });
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
        'preview-ocr': () => Scanner.previewProcessedImage(),
        'run-ocr': () => Scanner.runOCR(),
        'use-manual-reading': () => Scanner.useManualReading(),
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
      this.saveSetting({ theme: current });
    });
    $('#langToggle').addEventListener('click', () => this.applyLanguage(AppState.lang === 'ms' ? 'en' : 'ms'));
    $('#accuracyMethod').addEventListener('change', () => Accuracy.toggleMethod());
    $('#historySearch').addEventListener('input', () => History.render());
    $('#historyImport').addEventListener('change', event => History.importJSON(event));
    $('#ctPreset').addEventListener('change', event => Calculator.applyPreset(event.target.value, '#ctPrimary', '#ctSecondary'));
    $('#vtPreset').addEventListener('change', event => Calculator.applyPreset(event.target.value, '#vtPrimary', '#vtSecondary'));
    $$('[data-meter-type]').forEach(select => select.addEventListener('change', () => this.updateMeterModes()));
    $('#scanMode').addEventListener('change', () => Scanner.toggleMode());
    ['#cropLeft','#cropTop','#cropWidth','#cropHeight','#ocrContrast','#ocrThreshold','#ocrScale'].forEach(id => $(id)?.addEventListener('input', () => Scanner.previewProcessedImage(false)));
    Scanner.bind();
  },
  updateMeterModes() {
    const mainType = $('#mainMeterType')?.value || 'ct';
    $$('[data-field-group="ct"]').forEach(label => {
      const disabled = mainType === 'direct';
      label.classList.toggle('is-disabled-field', disabled);
      label.querySelectorAll('input,select').forEach(el => el.disabled = disabled);
    });
    $$('[data-field-group="vt"]').forEach(label => {
      const disabled = mainType !== 'ctpt';
      label.classList.toggle('is-disabled-field', disabled);
      label.querySelectorAll('input,select').forEach(el => el.disabled = disabled);
    });
    const map = { energyMeterType: 'energyMultiplier', accuracyMeterType: 'accuracyMultiplier', mdMeterType: 'mdMultiplier' };
    Object.entries(map).forEach(([typeId, multId]) => {
      const type = $('#' + typeId)?.value;
      const input = $('#' + multId);
      if (!input) return;
      input.disabled = type === 'direct';
      input.closest('label')?.classList.toggle('is-disabled-field', type === 'direct');
      if (type === 'direct') input.value = '1';
    });
    Scanner.toggleMode?.();
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
      <h2>${t('result')}</h2>
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


const Connection = {
  label(type) {
    return type === 'direct' ? 'Direct Meter' : type === 'ct' ? 'CT Operated Meter' : 'CT/PT Operated Meter';
  },
  mainRatios(type) {
    if (type === 'direct') return { ctPrimary: 1, ctSecondary: 1, vtPrimary: 1, vtSecondary: 1, ctRatio: 1, vtRatio: 1, multiplier: 1 };
    const ctPrimary = Helpers.number('#ctPrimary');
    const ctSecondary = Helpers.number('#ctSecondary');
    Helpers.assertPositive(ctPrimary, 'CT Primary');
    Helpers.assertPositive(ctSecondary, 'CT Secondary');
    let vtPrimary = 1, vtSecondary = 1;
    if (type === 'ctpt') {
      vtPrimary = Helpers.number('#vtPrimary');
      vtSecondary = Helpers.number('#vtSecondary');
      Helpers.assertPositive(vtPrimary, 'VT Primary');
      Helpers.assertPositive(vtSecondary, 'VT Secondary');
    }
    const ctRatio = ctPrimary / ctSecondary;
    const vtRatio = type === 'ctpt' ? vtPrimary / vtSecondary : 1;
    return { ctPrimary, ctSecondary, vtPrimary, vtSecondary, ctRatio, vtRatio, multiplier: ctRatio * vtRatio };
  },
  multiplier(inputSelector, meterType) {
    if (meterType === 'direct') return 1;
    const value = Helpers.number(inputSelector);
    Helpers.assertPositive(value, 'Multiplier');
    return value;
  },
  warnings(type, multiplier) {
    const list = type === 'direct' ? [t('directNote')] : Warning.commonMultiplier(multiplier);
    return list;
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
      const meterType = $('#mainMeterType').value;
      const { ctPrimary, ctSecondary, vtPrimary, vtSecondary, ctRatio, vtRatio, multiplier } = Connection.mainRatios(meterType);
      const activeConst = Helpers.number('#activeConst');
      const reactiveConst = Helpers.number('#reactiveConst');
      [activeConst, reactiveConst].forEach((v, i) => Helpers.assertPositive(v, ['Active Constant','Reactive Constant'][i]));
      const primaryActive = activeConst / multiplier;
      const primaryReactive = reactiveConst / multiplier;
      const warnings = [
        ...Connection.warnings(meterType, multiplier),
        ...Warning.constant(activeConst),
        ...Warning.constant(reactiveConst)
      ];
      if (meterType !== 'direct' && ![1, 5].includes(ctSecondary)) warnings.push('CT secondary is not 1A or 5A. Confirm CT nameplate.');
      if ($('#supplyType').value) warnings.push('Supply type is recorded for reference only. It does not change multiplier formula.');
      const formula = meterType === 'direct'
        ? `Meter Type = Direct Meter\nMultiplier = 1\nActive Constant = ${activeConst} imp/kWh\nReactive Constant = ${reactiveConst} imp/kvarh`
        : `Meter Type = ${Connection.label(meterType)}\nCT Ratio = ${ctPrimary} ÷ ${ctSecondary} = ${Helpers.fmt(ctRatio)}\nVT Ratio = ${vtPrimary} ÷ ${vtSecondary} = ${Helpers.fmt(vtRatio)}\nMultiplier = ${Helpers.fmt(ctRatio)} × ${Helpers.fmt(vtRatio)} = ${Helpers.fmt(multiplier)}\nActive Primary Constant = ${activeConst} ÷ ${Helpers.fmt(multiplier)} = ${Helpers.fmt(primaryActive)} imp/kWh\nReactive Primary Constant = ${reactiveConst} ÷ ${Helpers.fmt(multiplier)} = ${Helpers.fmt(primaryReactive)} imp/kvarh`;
      const record = Records.create('calculator', `${Connection.label(meterType)} Meter Constant`, { meterType, ctPrimary, ctSecondary, vtPrimary, vtSecondary, activeConst, reactiveConst, supplyType: $('#supplyType').value }, {
        'Meter Type': Connection.label(meterType), 'CT Ratio': Helpers.fmt(ctRatio), 'VT Ratio': Helpers.fmt(vtRatio), 'Total Multiplier': Helpers.fmt(multiplier), 'Active Primary Constant': `${Helpers.fmt(primaryActive)} imp/kWh`, 'Reactive Primary Constant': `${Helpers.fmt(primaryReactive)} imp/kvarh`
      }, formula, warnings);
      History.add(record);
      UI.result('#mainResult', record);
    } catch (error) { UI.toast(error.message); }
  },
  clearMain() {
    ['#ctPrimary','#ctSecondary','#vtPrimary','#vtSecondary','#activeConst','#reactiveConst'].forEach(id => $(id).value = '');
    $('#mainResult').innerHTML = `<h2>${t('result')}</h2><p class="muted">${t('cleared')}</p>`;
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
      const meterType = $('#energyMeterType').value;
      const multiplier = Connection.multiplier('#energyMultiplier', meterType);
      const basis = $('#energyBasis').value;
      Helpers.assertPositive(constant, 'Meter constant');
      const effectiveMultiplier = basis === 'secondary' ? multiplier : 1;
      let resultValue, formula, metrics;
      const constantUnit = Helpers.constantUnit(unit);
      if (mode === 'pulseToEnergy') {
        Helpers.assertPositive(pulse, 'Pulse count');
        const kWhBase = (pulse / constant) * effectiveMultiplier;
        resultValue = Helpers.baseKWhToUnit(kWhBase, unit);
        formula = `Energy base = Pulse ÷ Constant × Effective Multiplier\nEnergy = ${pulse} ÷ ${constant} × ${Helpers.fmt(effectiveMultiplier)} = ${Helpers.fmt(kWhBase)} ${unit === 'MWh' ? 'kWh base' : unit}\nDisplayed = ${Helpers.fmt(resultValue)} ${unit}`;
        metrics = { 'Energy': `${Helpers.fmt(resultValue)} ${unit}`, 'Meter Type': Connection.label(meterType), 'Effective Multiplier': Helpers.fmt(effectiveMultiplier), 'Constant Basis': constantUnit };
      } else {
        Helpers.assertPositive(energyInput, 'Energy value');
        const kWhBase = Helpers.unitToBaseKWh(energyInput, unit);
        resultValue = (kWhBase * constant) / effectiveMultiplier;
        formula = `Pulse = Energy(kWh base) × Constant ÷ Effective Multiplier\nEnergy base = ${energyInput} ${unit} = ${Helpers.fmt(kWhBase)} kWh/kvarh base\nPulse = ${Helpers.fmt(kWhBase)} × ${constant} ÷ ${Helpers.fmt(effectiveMultiplier)} = ${Helpers.fmt(resultValue)}`;
        metrics = { 'Pulse Count': `${Helpers.fmt(resultValue)} pulses`, 'Meter Type': Connection.label(meterType), 'Effective Multiplier': Helpers.fmt(effectiveMultiplier), 'Constant Basis': constantUnit };
      }
      const warnings = [...Connection.warnings(meterType, multiplier), ...Warning.constant(constant)];
      if (unit === 'MWh') warnings.push('MWh selected: app converts internally using kWh base. Meter constant remains imp/kWh.');
      if (basis === 'primary') warnings.push('No multiplier applied. Use only when value is already primary/billing basis.');
      const record = Records.create('energy', 'Pulse / Energy Conversion', { meterType, mode, unit, pulse, energyInput, constant, multiplier, basis }, metrics, formula, warnings);
      History.add(record); UI.result('#energyResult', record);
    } catch (error) { UI.toast(error.message); }
  },
  clear() { ['#pulseCount','#energyValue','#energyConst','#energyMultiplier'].forEach(id => $(id).value = ''); $('#energyResult').innerHTML = `<h2>${t('result')}</h2><p class="muted">${t('cleared')}</p>`; }
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
      const meterType = $('#accuracyMeterType').value;
      const multiplier = Connection.multiplier('#accuracyMultiplier', meterType);
      const tolerance = this.tolerance();
      Helpers.assertPositive(referenceInput, 'Reference energy');
      Helpers.assertPositive(tolerance, 'Tolerance');
      const referenceBase = Helpers.unitToBaseKWh(referenceInput, unit) * (referenceBasis === 'secondary' ? multiplier : 1);
      let meterEnergyBase, basisLabel, formulaDetail, inputs = { meterType, method, unit, referenceInput, referenceBasis, multiplier, tolerance };
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
      const warnings = [...Connection.warnings(meterType, multiplier)];
      if (basisLabel === 'primary') warnings.push('No multiplier applied to meter value. Confirm value is already primary/billing basis.');
      if (referenceBasis === 'secondary') warnings.push('Multiplier applied to reference energy. Confirm reference value is raw/secondary.');
      if (unit === 'MWh') warnings.push('MWh selected: app converts internally to kWh base.');
      const record = Records.create('accuracy', 'Accuracy Test', inputs, { 'Meter Energy': `${Helpers.fmt(Helpers.baseKWhToUnit(meterEnergyBase, unit))} ${unit}`, 'Reference Energy': `${Helpers.fmt(Helpers.baseKWhToUnit(referenceBase, unit))} ${unit}`, 'Meter Type': Connection.label(meterType), 'Error': `${Helpers.fmt(errorPct)}%`, 'Tolerance': `±${Helpers.fmt(tolerance)}%` }, formula, warnings, pass ? 'PASS' : 'FAIL', pass ? 'pass' : 'fail');
      History.add(record); UI.result('#accuracyResult', record);
    } catch (error) { UI.toast(error.message); }
  },
  clear() { ['#referenceEnergy','#accuracyMultiplier','#initialReading','#finalReading','#accuracyPulse','#accuracyPulseConst'].forEach(id => $(id).value = ''); $('#accuracyResult').innerHTML = `<h2>${t('result')}</h2><p class="muted">${t('cleared')}</p>`; }
};

const MD = {
  calculate() {
    try {
      const pulse = Helpers.number('#mdPulse');
      const constant = Helpers.number('#mdConst');
      const meterType = $('#mdMeterType').value;
      const multiplier = Connection.multiplier('#mdMultiplier', meterType);
      const interval = Helpers.number('#mdInterval');
      const basis = $('#mdBasis').value;
      [pulse, constant, interval].forEach((v, i) => Helpers.assertPositive(v, ['Pulse count','Meter constant','Interval'][i]));
      const effectiveMultiplier = basis === 'secondary' ? multiplier : 1;
      const energy = (pulse / constant) * effectiveMultiplier;
      const md = energy / (interval / 60);
      const formula = `Energy = Pulse ÷ Constant × Effective Multiplier\nEnergy = ${pulse} ÷ ${constant} × ${Helpers.fmt(effectiveMultiplier)} = ${Helpers.fmt(energy)} kWh\nMD kW = Energy ÷ (Interval ÷ 60)\nMD = ${Helpers.fmt(energy)} ÷ (${interval} ÷ 60) = ${Helpers.fmt(md)} kW`;
      const warnings = [...Connection.warnings(meterType, multiplier), ...Warning.constant(constant)];
      if (basis === 'primary') warnings.push('No multiplier applied. Use only if pulse/energy is already converted to primary basis.');
      const record = Records.create('md', 'Maximum Demand', { meterType, pulse, constant, multiplier, interval, basis }, { 'Energy': `${Helpers.fmt(energy)} kWh`, 'Meter Type': Connection.label(meterType), 'Maximum Demand': `${Helpers.fmt(md)} kW`, 'Interval': `${interval} min`, 'Effective Multiplier': Helpers.fmt(effectiveMultiplier) }, formula, warnings);
      History.add(record); UI.result('#mdResult', record);
    } catch (error) { UI.toast(error.message); }
  },
  clear() { ['#mdPulse','#mdConst','#mdMultiplier'].forEach(id => $(id).value = ''); $('#mdResult').innerHTML = `<h2>${t('result')}</h2><p class="muted">${t('cleared')}</p>`; }
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
  toggleMode() {
    const mode = $('#scanMode')?.value || 'nameplate';
    $('#displayOcrControls')?.classList.toggle('hidden-soft', mode !== 'display');
  },
  async loadFile(file) {
    if (!file || !file.type.startsWith('image/')) { UI.toast('Please upload an image file.'); return; }
    uploadedImage = file;
    uploadedImageBitmap = await createImageBitmap(file);
    const url = URL.createObjectURL(file);
    $('#scanPreview').src = url;
    $('#scanPreview').classList.remove('hidden');
    $('#ocrStatus').textContent = `Image loaded: ${file.name}`;
    this.previewProcessedImage(false);
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
  cropParams() {
    const v = id => Number($(id).value);
    return { left: v('#cropLeft') / 100, top: v('#cropTop') / 100, width: v('#cropWidth') / 100, height: v('#cropHeight') / 100, contrast: v('#ocrContrast'), threshold: v('#ocrThreshold'), scale: v('#ocrScale') };
  },
  previewProcessedImage(showToast = true) {
    if (!uploadedImageBitmap || $('#scanMode')?.value !== 'display') return null;
    const { left, top, width, height, contrast, threshold, scale } = this.cropParams();
    const sx = Math.max(0, Math.floor(uploadedImageBitmap.width * left));
    const sy = Math.max(0, Math.floor(uploadedImageBitmap.height * top));
    const sw = Math.min(uploadedImageBitmap.width - sx, Math.floor(uploadedImageBitmap.width * width));
    const sh = Math.min(uploadedImageBitmap.height - sy, Math.floor(uploadedImageBitmap.height * height));
    if (sw <= 0 || sh <= 0) return null;
    const canvas = $('#ocrCanvas');
    canvas.width = Math.max(1, Math.floor(sw * scale));
    canvas.height = Math.max(1, Math.floor(sh * scale));
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(uploadedImageBitmap, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < img.data.length; i += 4) {
      const gray = 0.299 * img.data[i] + 0.587 * img.data[i+1] + 0.114 * img.data[i+2];
      const adjusted = Math.max(0, Math.min(255, (gray - 128) * contrast + 128));
      const bw = adjusted >= threshold ? 255 : 0;
      img.data[i] = img.data[i+1] = img.data[i+2] = bw;
    }
    ctx.putImageData(img, 0, 0);
    if (showToast) UI.toast('Crop preview updated.');
    return canvas;
  },
  canvasBlob(canvas) {
    return new Promise(resolve => canvas.toBlob(blob => resolve(blob), 'image/png'));
  },
  async runOCR() {
    try {
      const mode = $('#scanMode').value;
      if (!uploadedImage && mode !== 'manual') throw new Error('Upload an image first.');
      if (mode === 'manual') return this.useManualReading();
      const Tesseract = await this.ensureOCR();
      $('#ocrStatus').textContent = 'Running OCR...';
      const imageForOcr = mode === 'display' ? await this.canvasBlob(this.previewProcessedImage(false)) : uploadedImage;
      const options = mode === 'display'
        ? { tessedit_char_whitelist: '0123456789.', logger: m => { if (m.status) $('#ocrStatus').textContent = `${m.status} ${m.progress ? Math.round(m.progress * 100) + '%' : ''}`; } }
        : { logger: m => { if (m.status) $('#ocrStatus').textContent = `${m.status} ${m.progress ? Math.round(m.progress * 100) + '%' : ''}`; } };
      const result = await Tesseract.recognize(imageForOcr, 'eng', options);
      const text = result.data.text || '';
      if (mode === 'display') this.renderDisplayReading(text, result.data.confidence);
      else this.render(this.extract(text), text);
      $('#ocrStatus').textContent = 'OCR completed. Verify before applying values.';
    } catch (error) { UI.toast(error.message); $('#ocrStatus').textContent = 'OCR failed.'; }
  },
  extractReading(text) {
    const normalized = text.replace(/O/g, '0').replace(/[Il|]/g, '1').replace(/,/g, '.');
    const matches = normalized.match(/\d+(?:\.\d+)?/g) || [];
    return matches.sort((a,b) => b.length - a.length)[0] || '';
  },
  renderDisplayReading(raw, confidence) {
    const reading = this.extractReading(raw);
    $('#manualReading').value = reading;
    $('#scanResult').innerHTML = `<h2>${t('extractedData')}</h2><div class="scan-kv"><span>Detected Reading</span><strong>${Helpers.text(reading || 'Not found')}</strong></div><div class="scan-kv"><span>Confidence</span><strong>${Helpers.fmt(confidence || 0, 1)}%</strong></div><details><summary>Raw OCR text</summary><pre>${Helpers.text(raw)}</pre></details><div class="assumption-box warning-soft">Display OCR is an assistive reading only. Confirm the digits manually before using in a calculation.</div>`;
  },
  useManualReading() {
    const reading = $('#manualReading').value;
    if (!reading) { UI.toast('Enter manual reading first.'); return; }
    const record = Records.create('scan', 'Manual Verified Reading', { reading, scanMode: $('#scanMode').value }, { 'Verified Reading': reading }, `Manual verified reading = ${reading}`, ['Manual/photo-assisted reading. User verification required before official use.']);
    History.add(record);
    $('#scanResult').innerHTML = `<h2>${t('extractedData')}</h2><div class="scan-kv"><span>Verified Reading</span><strong>${Helpers.text(reading)}</strong></div><div class="assumption-box">Saved to local history.</div>`;
    UI.toast('Manual reading saved.');
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
    $('#scanResult').innerHTML = `<h2>${t('extractedData')}</h2>${rows}<details><summary>Raw OCR text</summary><pre>${Helpers.text(raw)}</pre></details><div class="assumption-box warning-soft">OCR values are not trusted until manually verified against the meter nameplate.</div>`;
  },
  clear() {
    uploadedImage = null; uploadedImageBitmap = null; $('#imageInput').value = ''; $('#manualReading').value = '';
    $('#scanPreview').classList.add('hidden'); $('#scanResult').innerHTML = `<h2>${t('extractedData')}</h2><p class="muted">${t('noScan')}</p>`; $('#ocrStatus').textContent = 'OCR idle.';
    const canvas = $('#ocrCanvas'); if (canvas) { canvas.width = canvas.height = 1; }
  }
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
