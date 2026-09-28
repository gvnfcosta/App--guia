/**
 * TERMO-KILN SCADA 4.0 - IHM CONTROLE DE FORNO CERÂMICO
 * Rampa Térmica com Patamares a cada 1/3 da Temperatura Máxima (15 min cada)
 * Simulação de Teste: 1 minuto virtual = 1 segundo real (60x padrão)
 */

// ==========================================
// SYSTEM STATE CONSTANTS
// ==========================================
const STATES = {
  STANDBY: 'STANDBY',
  RAMP_1: 'RAMP_1',           // Rampa até 1/3 Max
  PLATEAU_1: 'PLATEAU_1',     // Patamar 1 (15 min)
  RAMP_2: 'RAMP_2',           // Rampa até 2/3 Max
  PLATEAU_2: 'PLATEAU_2',     // Patamar 2 (15 min)
  RAMP_3: 'RAMP_3',           // Rampa até Max (3/3)
  PLATEAU_3: 'PLATEAU_3',     // Patamar 3 (15 min)
  COOLING: 'COOLING',         // Resfriamento < 30°C
  COMPLETED: 'COMPLETED',
  PANIC: 'PANIC'
};

const PLATEAU_DURATION_SEC = 15 * 60; // 15 minutos virtuais = 900s
const AMBIENT_TEMP = 25.0; // °C
const COOLING_TARGET_TEMP = 29.5; // < 30°C

// ==========================================
// KILN CONTROLLER OBJECT
// ==========================================
class KilnController {
  constructor() {
    this.currentState = STATES.STANDBY;
    this.isPaused = false;
    
    // User Configurations
    this.tempMax = 1050;
    this.temp1_3 = Math.round(this.tempMax / 3); // 350°C
    this.temp2_3 = Math.round((this.tempMax * 2) / 3); // 700°C
    
    // Process Variables
    this.currentTemp = AMBIENT_TEMP;
    this.targetSetpoint = AMBIENT_TEMP;
    this.powerPct = 0; // 0 a 100%
    this.rampRate = 0; // °C/min
    
    // Timers & Counters (in virtual seconds)
    this.totalElapsedSec = 0;
    this.plateauTimerSec = 0; // Contagem regressiva
    this.simulationSpeed = 60; // 1 min = 1 segundo (60x) por padrão para testes!
    
    // Ramp Speeds (em °C por segundo no tempo virtual)
    this.rampSpeed1 = 1.2;  // Rampa até 1/3
    this.rampSpeed2 = 1.0;  // Rampa até 2/3
    this.rampSpeed3 = 0.8;  // Rampa até Max (3/3)
    this.coolingSpeed = 1.4; // Taxa de resfriamento

    // Telemetry History for Chart
    this.historyLabels = [];
    this.historyActual = [];
    this.historySetpoint = [];

    // Audio State
    this.soundEnabled = true;
    this.audioCtx = null;
    
    // Chart Instance
    this.chart = null;

    // Interval Handle
    this.timerInterval = null;
  }

  init() {
    this.initChart();
    this.recalcStages();
    this.bindDOM();
    this.updateClock();
    setInterval(() => this.updateClock(), 1000);
    
    // Main simulation loop (updates every 250ms for smooth 60x simulation)
    this.timerInterval = setInterval(() => this.tick(), 250);
    
    this.log('Sistema IHM inicializado. Modo de teste ativo: 1 minuto = 1 segundo.', 'info');
    this.updateUI();
  }

  recalcStages() {
    this.temp1_3 = Math.round(this.tempMax / 3);
    this.temp2_3 = Math.round((this.tempMax * 2) / 3);

    // Update Badges and labels in DOM
    const badgeArranque = document.getElementById('badgeArranque');
    const inputArranque = document.getElementById('inputTempArranque');
    const rangeArranque = document.getElementById('rangeTempArranque');
    const labelPatamar1Info = document.getElementById('labelPatamar1Info');
    const labelPatamar2Info = document.getElementById('labelPatamar2Info');
    const labelPatamar3Info = document.getElementById('labelPatamar3Info');

    if (badgeArranque) badgeArranque.textContent = `${this.temp1_3} °C`;
    if (inputArranque) inputArranque.value = this.temp1_3;
    if (rangeArranque) rangeArranque.value = this.temp1_3;
    if (labelPatamar1Info) labelPatamar1Info.textContent = `${this.temp1_3} °C • 15 Minutos`;
    if (labelPatamar2Info) labelPatamar2Info.textContent = `${this.temp2_3} °C • 15 Minutos`;
    if (labelPatamar3Info) labelPatamar3Info.textContent = `${this.tempMax} °C • 15 Minutos`;

    document.querySelectorAll('.step-target-arranque').forEach(el => el.textContent = this.temp1_3);
    document.querySelectorAll('.step-target-twothirds').forEach(el => el.textContent = this.temp2_3);
    document.querySelectorAll('.step-target-max').forEach(el => el.textContent = this.tempMax);
  }

  // Web Audio Synthesizer for Industrial Beeps & Sirens
  playAudio(type) {
    if (!this.soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!this.audioCtx) {
        this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'phase') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.setValueAtTime(880, now + 0.12);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'panic') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(900, now);
        osc.frequency.linearRampToValueAtTime(400, now + 0.25);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'done') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.15);
        osc.frequency.setValueAtTime(783.99, now + 0.3);
        osc.frequency.setValueAtTime(1046.50, now + 0.45);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc.start(now);
        osc.stop(now + 0.8);
      }
    } catch (e) {
      console.warn('Audio Context error:', e);
    }
  }

  bindDOM() {
    const inputMax = document.getElementById('inputTempMax');
    const rangeMax = document.getElementById('rangeTempMax');
    const badgeMax = document.getElementById('badgeMax');

    const syncMax = (val) => {
      let num = Math.max(300, Math.min(1350, Number(val)));
      this.tempMax = num;
      inputMax.value = num;
      rangeMax.value = num;
      badgeMax.textContent = `${num} °C`;
      this.recalcStages();
    };

    inputMax.addEventListener('input', (e) => syncMax(e.target.value));
    rangeMax.addEventListener('input', (e) => syncMax(e.target.value));

    // Optional override for 1st threshold
    const inputArranque = document.getElementById('inputTempArranque');
    const rangeArranque = document.getElementById('rangeTempArranque');
    const syncArranque = (val) => {
      let num = Math.max(50, Math.min(this.tempMax - 50, Number(val)));
      this.temp1_3 = num;
      inputArranque.value = num;
      rangeArranque.value = num;
      document.getElementById('badgeArranque').textContent = `${num} °C`;
      document.getElementById('labelPatamar1Info').textContent = `${num} °C • 15 Minutos`;
      document.querySelectorAll('.step-target-arranque').forEach(el => el.textContent = num);
    };
    inputArranque.addEventListener('input', (e) => syncArranque(e.target.value));
    rangeArranque.addEventListener('input', (e) => syncArranque(e.target.value));

    // Presets Buttons
    document.querySelectorAll('.btn-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.currentState !== STATES.STANDBY) {
          this.log('Configurações bloqueadas durante a queima.', 'warn');
          return;
        }
        document.querySelectorAll('.btn-preset').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const max = btn.dataset.max;
        syncMax(max);
        this.playAudio('click');
        this.log(`Preset selecionado: Máx=${max}°C | 1/3=${this.temp1_3}°C | 2/3=${this.temp2_3}°C`, 'info');
      });
    });

    // Speed Controls
    document.querySelectorAll('.btn-speed').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-speed').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.simulationSpeed = Number(btn.dataset.speed);
        this.playAudio('click');
        const speedText = this.simulationSpeed === 60 ? '60x (1 minuto = 1 segundo)' : `${this.simulationSpeed}x`;
        this.log(`Velocidade de simulação ajustada para: ${speedText}`, 'info');
      });
    });

    // Sound Toggle
    const btnSound = document.getElementById('btnToggleSound');
    const soundIcon = document.getElementById('soundIcon');
    btnSound.addEventListener('click', () => {
      this.soundEnabled = !this.soundEnabled;
      if (this.soundEnabled) {
        soundIcon.className = 'fa-solid fa-volume-high';
        this.playAudio('click');
      } else {
        soundIcon.className = 'fa-solid fa-volume-xmark';
      }
    });

    // Control Buttons
    const btnStart = document.getElementById('btnStartProcess');
    const btnPause = document.getElementById('btnPauseProcess');
    const btnPanic = document.getElementById('btnPanic');
    const btnResetPanic = document.getElementById('btnResetPanic');
    const btnClearLogs = document.getElementById('btnClearLogs');

    btnStart.addEventListener('click', () => this.startProcess());
    btnPause.addEventListener('click', () => this.togglePause());
    btnPanic.addEventListener('click', () => this.triggerPanic());
    btnResetPanic.addEventListener('click', () => this.resetPanic());
    btnClearLogs.addEventListener('click', () => {
      document.getElementById('logConsole').innerHTML = '';
    });
  }

  // ==========================================
  // PROCESS LIFECYCLE & TRANSITIONS
  // ==========================================
  startProcess() {
    if (this.currentState === STATES.PANIC) {
      alert('Sistema em bloqueio de segurança (Pânico). Resete a trava primeiro.');
      return;
    }

    if (this.currentState !== STATES.STANDBY && this.currentState !== STATES.COMPLETED) {
      return;
    }

    this.recalcStages();
    this.playAudio('phase');
    this.totalElapsedSec = 0;
    this.historyLabels = [];
    this.historyActual = [];
    this.historySetpoint = [];
    if (this.chart) {
      this.chart.data.labels = [];
      this.chart.data.datasets[0].data = [];
      this.chart.data.datasets[1].data = [];
      this.chart.update('none');
    }

    this.setInputsDisabled(true);
    this.transitionTo(STATES.RAMP_1);
    this.log(`PROCESSO INICIADO. Subida até o 1º Terço (${this.temp1_3}°C). [Simulação: 1min = 1s]`, 'info');
  }

  togglePause() {
    if (this.currentState === STATES.STANDBY || this.currentState === STATES.COMPLETED || this.currentState === STATES.PANIC) {
      return;
    }

    this.isPaused = !this.isPaused;
    const btnPause = document.getElementById('btnPauseProcess');
    this.playAudio('click');

    if (this.isPaused) {
      btnPause.innerHTML = `<div class="led-light"></div><div class="btn-content"><i class="fa-solid fa-play"></i><span>RETOMAR</span></div>`;
      this.log('Processo PAUSADO pelo operador.', 'warn');
    } else {
      btnPause.innerHTML = `<div class="led-light"></div><div class="btn-content"><i class="fa-solid fa-pause"></i><span>PAUSAR</span></div>`;
      this.log('Processo RETOMADO.', 'info');
    }
  }

  triggerPanic() {
    this.currentState = STATES.PANIC;
    this.isPaused = false;
    this.powerPct = 0;
    this.targetSetpoint = AMBIENT_TEMP;
    
    this.playAudio('panic');
    this.log('!!! PARADA DE EMERGÊNCIA ACIONADA (PÂNICO) !!! Todas as resistências desligadas.', 'danger');
    
    document.getElementById('panicModal').classList.remove('hidden');
    document.getElementById('alarmOverlay').classList.remove('hidden');
    
    this.updateUI();
  }

  resetPanic() {
    document.getElementById('panicModal').classList.add('hidden');
    document.getElementById('alarmOverlay').classList.add('hidden');
    this.playAudio('click');
    this.transitionTo(STATES.COOLING);
    this.log('Trava de emergência desarmada. Resfriamento de segurança em curso.', 'warn');
  }

  transitionTo(newState) {
    this.currentState = newState;
    this.playAudio('phase');

    switch (newState) {
      case STATES.RAMP_1:
        this.targetSetpoint = this.temp1_3;
        this.plateauTimerSec = 0;
        break;

      case STATES.PLATEAU_1:
        this.targetSetpoint = this.temp1_3;
        this.plateauTimerSec = PLATEAU_DURATION_SEC;
        this.log(`1º Terço (${this.temp1_3}°C) atingido. Mantendo por 15 minutos estáveis (15 segundos de teste).`, 'info');
        break;

      case STATES.RAMP_2:
        this.targetSetpoint = this.temp2_3;
        this.plateauTimerSec = 0;
        this.log(`Patamar 1 finalizado. Subindo até o 2º Terço (${this.temp2_3}°C).`, 'info');
        break;

      case STATES.PLATEAU_2:
        this.targetSetpoint = this.temp2_3;
        this.plateauTimerSec = PLATEAU_DURATION_SEC;
        this.log(`2º Terço (${this.temp2_3}°C) atingido. Mantendo por 15 minutos estáveis (15 segundos de teste).`, 'info');
        break;

      case STATES.RAMP_3:
        this.targetSetpoint = this.tempMax;
        this.plateauTimerSec = 0;
        this.log(`Patamar 2 finalizado. Subindo lentamente até a Temp. Máxima 3/3 (${this.tempMax}°C).`, 'info');
        break;

      case STATES.PLATEAU_3:
        this.targetSetpoint = this.tempMax;
        this.plateauTimerSec = PLATEAU_DURATION_SEC;
        this.log(`Temperatura Máxima (${this.tempMax}°C) atingida. Mantendo por 15 minutos estáveis (15 segundos de teste).`, 'info');
        break;

      case STATES.COOLING:
        this.targetSetpoint = COOLING_TARGET_TEMP;
        this.plateauTimerSec = 0;
        this.log('Todos os patamares concluídos. Resfriamento gradual até < 30°C.', 'info');
        break;

      case STATES.COMPLETED:
        this.targetSetpoint = AMBIENT_TEMP;
        this.powerPct = 0;
        this.setInputsDisabled(false);
        this.playAudio('done');
        this.log('CICLO COMPLETO! Forno resfriado abaixo de 30°C. Seguro para abertura.', 'success');
        break;
    }

    this.updateUI();
  }

  // ==========================================
  // THERMAL SIMULATION TICK (Every 250ms)
  // ==========================================
  tick() {
    if (this.isPaused) return;

    // Delta time in virtual seconds
    const dtVirtual = (0.25 * this.simulationSpeed);

    if (this.currentState !== STATES.STANDBY && this.currentState !== STATES.COMPLETED) {
      this.totalElapsedSec += dtVirtual;
    }

    switch (this.currentState) {
      // 1) Rampa até 1/3
      case STATES.RAMP_1:
        this.powerPct = 100;
        const step1 = this.rampSpeed1 * dtVirtual;
        if (this.currentTemp < this.temp1_3) {
          this.currentTemp += step1;
          this.rampRate = this.rampSpeed1 * 60;
          if (this.currentTemp >= this.temp1_3) {
            this.currentTemp = this.temp1_3;
            this.transitionTo(STATES.PLATEAU_1);
          }
        }
        break;

      // 2) Patamar 1 (15 min)
      case STATES.PLATEAU_1:
        this.powerPct = 30 + (Math.sin(this.totalElapsedSec * 0.2) * 6);
        this.currentTemp = this.temp1_3 + (Math.sin(this.totalElapsedSec * 0.1) * 0.3);
        this.rampRate = 0;
        this.plateauTimerSec -= dtVirtual;
        if (this.plateauTimerSec <= 0) {
          this.plateauTimerSec = 0;
          this.transitionTo(STATES.RAMP_2);
        }
        break;

      // 3) Rampa até 2/3
      case STATES.RAMP_2:
        this.powerPct = 95;
        const step2 = this.rampSpeed2 * dtVirtual;
        if (this.currentTemp < this.temp2_3) {
          this.currentTemp += step2;
          this.rampRate = this.rampSpeed2 * 60;
          if (this.currentTemp >= this.temp2_3) {
            this.currentTemp = this.temp2_3;
            this.transitionTo(STATES.PLATEAU_2);
          }
        }
        break;

      // 4) Patamar 2 (15 min)
      case STATES.PLATEAU_2:
        this.powerPct = 48 + (Math.sin(this.totalElapsedSec * 0.25) * 6);
        this.currentTemp = this.temp2_3 + (Math.sin(this.totalElapsedSec * 0.12) * 0.35);
        this.rampRate = 0;
        this.plateauTimerSec -= dtVirtual;
        if (this.plateauTimerSec <= 0) {
          this.plateauTimerSec = 0;
          this.transitionTo(STATES.RAMP_3);
        }
        break;

      // 5) Rampa até Máximo (3/3)
      case STATES.RAMP_3:
        this.powerPct = 100;
        const step3 = this.rampSpeed3 * dtVirtual;
        if (this.currentTemp < this.tempMax) {
          this.currentTemp += step3;
          this.rampRate = this.rampSpeed3 * 60;
          if (this.currentTemp >= this.tempMax) {
            this.currentTemp = this.tempMax;
            this.transitionTo(STATES.PLATEAU_3);
          }
        }
        break;

      // 6) Patamar 3 (15 min)
      case STATES.PLATEAU_3:
        this.powerPct = 65 + (Math.sin(this.totalElapsedSec * 0.3) * 6);
        this.currentTemp = this.tempMax + (Math.sin(this.totalElapsedSec * 0.15) * 0.45);
        this.rampRate = 0;
        this.plateauTimerSec -= dtVirtual;
        if (this.plateauTimerSec <= 0) {
          this.plateauTimerSec = 0;
          this.transitionTo(STATES.COOLING);
        }
        break;

      // 7) Resfriamento até < 30°C
      case STATES.COOLING:
        this.powerPct = 0;
        const coolStep = this.coolingSpeed * dtVirtual;
        if (this.currentTemp > COOLING_TARGET_TEMP) {
          this.currentTemp -= coolStep;
          this.rampRate = -this.coolingSpeed * 60;
          if (this.currentTemp <= COOLING_TARGET_TEMP) {
            this.currentTemp = COOLING_TARGET_TEMP;
            this.transitionTo(STATES.COMPLETED);
          }
        }
        break;

      case STATES.PANIC:
        this.powerPct = 0;
        if (this.currentTemp > AMBIENT_TEMP) {
          this.currentTemp -= (this.coolingSpeed * 2.5 * dtVirtual);
          if (this.currentTemp <= AMBIENT_TEMP) this.currentTemp = AMBIENT_TEMP;
        }
        this.rampRate = -this.coolingSpeed * 2.5 * 60;
        break;

      case STATES.STANDBY:
      case STATES.COMPLETED:
        this.powerPct = 0;
        this.rampRate = 0;
        break;
    }

    this.recordTelemetry();
    this.updateUI();
  }

  recordTelemetry() {
    if (this.currentState === STATES.STANDBY) return;

    const timeLabel = this.formatTimeMinutes(this.totalElapsedSec);
    
    this.historyLabels.push(timeLabel);
    this.historyActual.push(Number(this.currentTemp.toFixed(1)));
    this.historySetpoint.push(Number(this.targetSetpoint.toFixed(1)));

    if (this.historyLabels.length > 60) {
      this.historyLabels.shift();
      this.historyActual.shift();
      this.historySetpoint.shift();
    }

    if (this.chart) {
      this.chart.data.labels = this.historyLabels;
      this.chart.data.datasets[0].data = this.historySetpoint;
      this.chart.data.datasets[1].data = this.historyActual;
      this.chart.update('none');
    }
  }

  // ==========================================
  // UI & VISUAL UPDATE
  // ==========================================
  updateUI() {
    const dispTemp = document.getElementById('dispCurrentTemp');
    const chamberTempBadge = document.getElementById('chamberTempBadge');
    const dispSetpoint = document.getElementById('dispTargetSetpoint');
    const dispRamp = document.getElementById('dispRampRate');
    const dispPower = document.getElementById('dispPowerPct');
    const progressBar = document.getElementById('tempProgressBar');

    dispTemp.textContent = this.currentTemp.toFixed(1);
    chamberTempBadge.textContent = `${Math.round(this.currentTemp)} °C`;
    dispSetpoint.textContent = `${this.targetSetpoint.toFixed(1)} °C`;
    
    const rampSign = this.rampRate > 0 ? '+' : '';
    dispRamp.textContent = `${rampSign}${this.rampRate.toFixed(1)} °C/min`;
    dispPower.textContent = `${Math.round(this.powerPct)} %`;

    const pct = Math.min(100, Math.max(0, ((this.currentTemp - 20) / (this.tempMax - 20)) * 100));
    progressBar.style.width = `${pct}%`;

    // System Status Text & Beacon
    const stateText = document.getElementById('systemStateText');
    const beacon = document.getElementById('statusBeacon');
    const phaseName = document.getElementById('dispCurrentPhaseName');
    
    beacon.className = 'status-beacon';

    switch (this.currentState) {
      case STATES.STANDBY:
        stateText.textContent = 'STANDBY / PRONTO';
        phaseName.textContent = 'STANDBY';
        break;
      case STATES.RAMP_1:
        stateText.textContent = `SUBIDA 1/3 (${this.temp1_3}°C)`;
        beacon.classList.add('running');
        phaseName.textContent = 'RAMPA 1/3';
        break;
      case STATES.PLATEAU_1:
        stateText.textContent = `PATAMAR 1/3 (${this.temp1_3}°C)`;
        beacon.classList.add('running');
        phaseName.textContent = 'PATAMAR 1 (15m)';
        break;
      case STATES.RAMP_2:
        stateText.textContent = `SUBIDA 2/3 (${this.temp2_3}°C)`;
        beacon.classList.add('running');
        phaseName.textContent = 'RAMPA 2/3';
        break;
      case STATES.PLATEAU_2:
        stateText.textContent = `PATAMAR 2/3 (${this.temp2_3}°C)`;
        beacon.classList.add('running');
        phaseName.textContent = 'PATAMAR 2 (15m)';
        break;
      case STATES.RAMP_3:
        stateText.textContent = `SUBIDA MÁXIMA (${this.tempMax}°C)`;
        beacon.classList.add('peak');
        phaseName.textContent = 'RAMPA MÁXIMA';
        break;
      case STATES.PLATEAU_3:
        stateText.textContent = `PATAMAR MÁXIMO (${this.tempMax}°C)`;
        beacon.classList.add('peak');
        phaseName.textContent = 'PATAMAR 3 (15m)';
        break;
      case STATES.COOLING:
        stateText.textContent = 'RESFRIANDO (<30°C)';
        beacon.classList.add('cooling');
        phaseName.textContent = 'RESFRIAMENTO';
        break;
      case STATES.COMPLETED:
        stateText.textContent = 'CICLO FINALIZADO';
        beacon.classList.add('done');
        phaseName.textContent = 'CONCLUÍDO';
        break;
      case STATES.PANIC:
        stateText.textContent = 'EMERGÊNCIA / PÂNICO';
        beacon.classList.add('panic');
        phaseName.textContent = 'CORTE TOTAL';
        break;
    }

    // Plateau Timer Display
    const dispPlateauTimer = document.getElementById('dispPlateauTimer');
    const dispPlateauSub = document.getElementById('dispPlateauSub');
    const tagPatamar1 = document.getElementById('tagPatamar1');
    const tagPatamar2 = document.getElementById('tagPatamar2');
    const tagPatamar3 = document.getElementById('tagPatamar3');
    const tagCooling = document.getElementById('tagCooling');

    if (tagPatamar1) tagPatamar1.className = 'plateau-status-tag';
    if (tagPatamar2) tagPatamar2.className = 'plateau-status-tag';
    if (tagPatamar3) tagPatamar3.className = 'plateau-status-tag';
    if (tagCooling) tagCooling.className = 'plateau-status-tag';

    if (this.currentState === STATES.PLATEAU_1) {
      dispPlateauTimer.textContent = this.formatSeconds(this.plateauTimerSec);
      dispPlateauSub.textContent = `Patamar 1/3 (${this.temp1_3}°C)`;
      if (tagPatamar1) { tagPatamar1.classList.add('active'); tagPatamar1.textContent = 'Em Curso'; }
    } else if (this.currentState === STATES.PLATEAU_2) {
      dispPlateauTimer.textContent = this.formatSeconds(this.plateauTimerSec);
      dispPlateauSub.textContent = `Patamar 2/3 (${this.temp2_3}°C)`;
      if (tagPatamar2) { tagPatamar2.classList.add('active'); tagPatamar2.textContent = 'Em Curso'; }
    } else if (this.currentState === STATES.PLATEAU_3) {
      dispPlateauTimer.textContent = this.formatSeconds(this.plateauTimerSec);
      dispPlateauSub.textContent = `Patamar 3/3 (${this.tempMax}°C)`;
      if (tagPatamar3) { tagPatamar3.classList.add('active'); tagPatamar3.textContent = 'Em Curso'; }
    } else if (this.currentState === STATES.COOLING) {
      dispPlateauTimer.textContent = '--:--';
      dispPlateauSub.textContent = 'Resfriando para < 30°C';
      if (tagCooling) { tagCooling.classList.add('active'); tagCooling.textContent = 'Em Curso'; }
    } else {
      dispPlateauTimer.textContent = '--:--';
      dispPlateauSub.textContent = this.currentState === STATES.STANDBY ? 'Nenhum patamar ativo' : 'Em transição de rampa';
      if (tagPatamar1) tagPatamar1.textContent = [STATES.RAMP_2, STATES.PLATEAU_2, STATES.RAMP_3, STATES.PLATEAU_3, STATES.COOLING, STATES.COMPLETED].includes(this.currentState) ? 'Concluído' : 'Aguardando';
      if (tagPatamar2) tagPatamar2.textContent = [STATES.RAMP_3, STATES.PLATEAU_3, STATES.COOLING, STATES.COMPLETED].includes(this.currentState) ? 'Concluído' : 'Aguardando';
      if (tagPatamar3) tagPatamar3.textContent = [STATES.COOLING, STATES.COMPLETED].includes(this.currentState) ? 'Concluído' : 'Aguardando';
      if (tagCooling) tagCooling.textContent = this.currentState === STATES.COMPLETED ? 'Concluído' : 'Aguardando';
    }

    // Total Elapsed Time
    document.getElementById('dispTotalElapsed').textContent = this.formatSecondsHMS(this.totalElapsedSec);

    // Estimated Remaining Time Calculation
    document.getElementById('dispTimeRemaining').textContent = this.calculateEstimatedRemaining();

    // Button States
    const btnStart = document.getElementById('btnStartProcess');
    const btnPause = document.getElementById('btnPauseProcess');
    
    if (this.currentState === STATES.STANDBY || this.currentState === STATES.COMPLETED) {
      btnStart.disabled = false;
      btnStart.classList.remove('running');
      btnPause.disabled = true;
    } else if (this.currentState === STATES.PANIC) {
      btnStart.disabled = true;
      btnStart.classList.remove('running');
      btnPause.disabled = true;
    } else {
      btnStart.disabled = true;
      btnStart.classList.add('running');
      btnPause.disabled = false;
    }

    this.updateChamberVisuals();
    this.updateTimelineSteps();
  }

  updateChamberVisuals() {
    const heatGlow = document.getElementById('heatGlow');
    const topCoils = document.getElementById('topCoils');
    const bottomCoils = document.getElementById('bottomCoils');
    const heaterLed = document.getElementById('heaterLed');
    const exhaustLed = document.getElementById('exhaustLed');
    const ceramics = document.querySelectorAll('.ceramic-vase, .ceramic-plate, .ceramic-bowl');

    const tempRatio = Math.min(1, Math.max(0, (this.currentTemp - 50) / 1250));
    
    if (this.powerPct > 5) {
      heaterLed.classList.add('active');
    } else {
      heaterLed.classList.remove('active');
    }

    if (this.currentState === STATES.COOLING) {
      exhaustLed.classList.add('active');
    } else {
      exhaustLed.classList.remove('active');
    }

    let glowColor = 'rgba(255, 60, 0, 0)';
    let coilColor = '#374151';

    if (this.currentTemp < 200) {
      glowColor = `rgba(255, 80, 0, ${tempRatio * 0.2})`;
      coilColor = '#4b5563';
    } else if (this.currentTemp < 500) {
      glowColor = `radial-gradient(circle at 50% 50%, rgba(255, 69, 0, ${0.15 + tempRatio * 0.4}) 0%, rgba(180, 40, 0, 0.1) 70%, transparent 100%)`;
      coilColor = '#b91c1c';
    } else if (this.currentTemp < 900) {
      glowColor = `radial-gradient(circle at 50% 50%, rgba(255, 140, 0, ${0.35 + tempRatio * 0.4}) 0%, rgba(255, 69, 0, 0.25) 60%, transparent 100%)`;
      coilColor = '#ff6b00';
    } else {
      glowColor = `radial-gradient(circle at 50% 50%, rgba(255, 230, 150, 0.75) 0%, rgba(255, 120, 0, 0.5) 50%, transparent 100%)`;
      coilColor = '#ffdd55';
    }

    heatGlow.style.background = glowColor;
    
    if (this.powerPct > 10) {
      topCoils.style.background = coilColor;
      bottomCoils.style.background = coilColor;
      topCoils.style.boxShadow = `0 0 15px ${coilColor}`;
      bottomCoils.style.boxShadow = `0 0 15px ${coilColor}`;
    } else {
      topCoils.style.background = '#374151';
      bottomCoils.style.background = '#374151';
      topCoils.style.boxShadow = 'none';
      bottomCoils.style.boxShadow = 'none';
    }

    const ceramicBrightness = 1 + (tempRatio * 0.6);
    const ceramicHue = tempRatio * 25;
    ceramics.forEach(c => {
      c.style.filter = `brightness(${ceramicBrightness}) hue-rotate(${ceramicHue}deg)`;
    });
  }

  updateTimelineSteps() {
    const stepMap = {
      [STATES.STANDBY]: 0,
      [STATES.RAMP_1]: 1,
      [STATES.PLATEAU_1]: 1,
      [STATES.RAMP_2]: 2,
      [STATES.PLATEAU_2]: 2,
      [STATES.RAMP_3]: 3,
      [STATES.PLATEAU_3]: 3,
      [STATES.COOLING]: 4,
      [STATES.COMPLETED]: 5,
      [STATES.PANIC]: -1
    };

    const currentStepIdx = stepMap[this.currentState] ?? 0;

    for (let i = 0; i <= 5; i++) {
      const stepNode = document.getElementById(`step${i}`);
      const connector = document.getElementById(`conn${i}`);

      if (!stepNode) continue;

      stepNode.classList.remove('active', 'completed');
      if (connector) connector.classList.remove('completed');

      if (this.currentState === STATES.PANIC) continue;

      if (i < currentStepIdx) {
        stepNode.classList.add('completed');
        if (connector) connector.classList.add('completed');
      } else if (i === currentStepIdx) {
        stepNode.classList.add('active');
      }
    }
  }

  calculateEstimatedRemaining() {
    if (this.currentState === STATES.STANDBY) return '--:--:--';
    if (this.currentState === STATES.COMPLETED) return '00:00:00';
    if (this.currentState === STATES.PANIC) return 'PARADO';

    let remSec = 0;

    switch (this.currentState) {
      case STATES.RAMP_1:
        remSec += (this.temp1_3 - this.currentTemp) / this.rampSpeed1;
        remSec += PLATEAU_DURATION_SEC;
        remSec += (this.temp2_3 - this.temp1_3) / this.rampSpeed2;
        remSec += PLATEAU_DURATION_SEC;
        remSec += (this.tempMax - this.temp2_3) / this.rampSpeed3;
        remSec += PLATEAU_DURATION_SEC;
        remSec += (this.tempMax - COOLING_TARGET_TEMP) / this.coolingSpeed;
        break;

      case STATES.PLATEAU_1:
        remSec += this.plateauTimerSec;
        remSec += (this.temp2_3 - this.temp1_3) / this.rampSpeed2;
        remSec += PLATEAU_DURATION_SEC;
        remSec += (this.tempMax - this.temp2_3) / this.rampSpeed3;
        remSec += PLATEAU_DURATION_SEC;
        remSec += (this.tempMax - COOLING_TARGET_TEMP) / this.coolingSpeed;
        break;

      case STATES.RAMP_2:
        remSec += (this.temp2_3 - this.currentTemp) / this.rampSpeed2;
        remSec += PLATEAU_DURATION_SEC;
        remSec += (this.tempMax - this.temp2_3) / this.rampSpeed3;
        remSec += PLATEAU_DURATION_SEC;
        remSec += (this.tempMax - COOLING_TARGET_TEMP) / this.coolingSpeed;
        break;

      case STATES.PLATEAU_2:
        remSec += this.plateauTimerSec;
        remSec += (this.tempMax - this.temp2_3) / this.rampSpeed3;
        remSec += PLATEAU_DURATION_SEC;
        remSec += (this.tempMax - COOLING_TARGET_TEMP) / this.coolingSpeed;
        break;

      case STATES.RAMP_3:
        remSec += (this.tempMax - this.currentTemp) / this.rampSpeed3;
        remSec += PLATEAU_DURATION_SEC;
        remSec += (this.tempMax - COOLING_TARGET_TEMP) / this.coolingSpeed;
        break;

      case STATES.PLATEAU_3:
        remSec += this.plateauTimerSec;
        remSec += (this.tempMax - COOLING_TARGET_TEMP) / this.coolingSpeed;
        break;

      case STATES.COOLING:
        remSec += (this.currentTemp - COOLING_TARGET_TEMP) / this.coolingSpeed;
        break;
    }

    return this.formatSecondsHMS(Math.max(0, remSec));
  }

  setInputsDisabled(disabled) {
    const ids = ['inputTempArranque', 'rangeTempArranque', 'inputTempMax', 'rangeTempMax'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = disabled;
    });
    document.querySelectorAll('.btn-preset').forEach(b => b.style.pointerEvents = disabled ? 'none' : 'auto');
  }

  // ==========================================
  // CHART.JS INITIALIZATION
  // ==========================================
  initChart() {
    const ctx = document.getElementById('temperatureChart').getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, 'rgba(255, 69, 0, 0.45)');
    gradient.addColorStop(0.5, 'rgba(255, 140, 0, 0.2)');
    gradient.addColorStop(1, 'rgba(255, 140, 0, 0.0)');

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['0m'],
        datasets: [
          {
            label: 'Setpoint (°C)',
            data: [AMBIENT_TEMP],
            borderColor: '#94a3b8',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0,
            tension: 0.1,
            fill: false
          },
          {
            label: 'Temperatura Real (°C)',
            data: [AMBIENT_TEMP],
            borderColor: '#ff6b2b',
            borderWidth: 3,
            pointRadius: 2,
            pointBackgroundColor: '#ffedd5',
            pointBorderColor: '#ff6b2b',
            backgroundColor: gradient,
            tension: 0.2,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleFont: { family: 'Orbitron', size: 12 },
            bodyFont: { family: 'JetBrains Mono', size: 12 },
            borderColor: 'rgba(255, 255, 255, 0.15)',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: (context) => ` ${context.dataset.label}: ${context.parsed.y.toFixed(1)} °C`
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(255, 255, 255, 0.05)'
            },
            ticks: {
              color: '#64748b',
              font: { family: 'JetBrains Mono', size: 10 },
              maxTicksLimit: 8
            }
          },
          y: {
            min: 0,
            max: 1350,
            grid: {
              color: 'rgba(255, 255, 255, 0.06)'
            },
            ticks: {
              color: '#94a3b8',
              font: { family: 'Orbitron', size: 10 },
              stepSize: 200,
              callback: (val) => `${val}°C`
            }
          }
        }
      }
    });
  }

  // ==========================================
  // HELPERS: LOGS & TIME FORMATTERS
  // ==========================================
  log(msg, level = 'info') {
    const consoleEl = document.getElementById('logConsole');
    if (!consoleEl) return;

    const timeStr = new Date().toLocaleTimeString('pt-BR');
    const entry = document.createElement('div');
    entry.className = `log-entry ${level}`;
    entry.innerHTML = `<span class="log-time">[${timeStr}]</span> <span class="log-msg">${msg}</span>`;

    consoleEl.appendChild(entry);
    consoleEl.scrollTop = consoleEl.scrollHeight;
  }

  updateClock() {
    const now = new Date();
    document.getElementById('liveClock').textContent = now.toLocaleTimeString('pt-BR');
  }

  formatSeconds(sec) {
    const s = Math.max(0, Math.floor(sec));
    const mins = Math.floor(s / 60);
    const remainder = s % 60;
    return `${String(mins).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  }

  formatSecondsHMS(sec) {
    const s = Math.max(0, Math.floor(sec));
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const remainder = s % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  }

  formatTimeMinutes(sec) {
    const m = (sec / 60).toFixed(1);
    return `${m}m`;
  }
}

// Instantiate on load
document.addEventListener('DOMContentLoaded', () => {
  window.kiln = new KilnController();
  window.kiln.init();
});
