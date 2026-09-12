'use strict';

/* ==================== UTILIDADES ==================== */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/* ==================== PUNTOS (en memoria, no persisten entre partidas) ==================== */
let currentPoints = 0;

function getPoints() {
  return currentPoints;
}

function setPoints(value) {
  currentPoints = value;
  refreshPointsUI();
}

function addPoints(amount) {
  setPoints(getPoints() + amount);
}

const HOURGLASS_MAX = 100;

function refreshPointsUI() {
  const points = getPoints();

  document.querySelectorAll('.points-value').forEach((display) => {
    display.textContent = points;
  });

  document.querySelectorAll('.points-badge').forEach((badge) => {
    badge.style.animation = 'none';
    // fuerza reflow para reiniciar la animación de pulso
    void badge.offsetWidth;
    badge.style.animation = 'pulse-glow 0.8s ease';
  });

  document.querySelectorAll('.gift-card button[data-cost]').forEach((btn) => {
    const cost = parseInt(btn.dataset.cost, 10);
    btn.disabled = points < cost;
  });

  const hourglassFill = document.getElementById('hourglass-fill');
  if (hourglassFill) {
    const pct = Math.min(100, Math.round((points / HOURGLASS_MAX) * 100));
    hourglassFill.style.height = pct + '%';
  }
}

/* ==================== NAVEGACIÓN DE PANTALLAS ==================== */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
  refreshPointsUI();
}

/* ==================== SELECCIÓN DE CASA ==================== */
const questions = [
  '¿Te llamas Karen?',
  '¿Es tu cumple?',
  '¿El Karenismo es una religión válida?'
];

let currentQuestion = 0;

const questionStage = document.getElementById('question-stage');
const resultStage = document.getElementById('result-stage');
const resultText = document.getElementById('result-text');
const retryBtn = document.getElementById('retry-btn');

function renderQuestion() {
  questionStage.classList.remove('hidden');
  resultStage.classList.add('hidden');
  resultText.textContent = '';
  retryBtn.classList.add('hidden');

  const q = questions[currentQuestion];
  questionStage.innerHTML = `
    <div class="question-block">
      <p class="question-text">${q}</p>
      <div class="answer-row">
        <button class="btn btn-emerald btn-yesno" data-answer="si">Sí</button>
        <button class="btn btn-outline btn-yesno" data-answer="no">No</button>
      </div>
    </div>
  `;

  questionStage.querySelectorAll('[data-answer]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const isYes = btn.dataset.answer === 'si';

      if (!isYes) {
        showRejection();
        return;
      }

      currentQuestion++;
      if (currentQuestion < questions.length) {
        renderQuestion();
      } else {
        showAcceptance();
      }
    });
  });
}

function showAcceptance() {
  questionStage.classList.add('hidden');
  resultStage.classList.remove('hidden');
  resultText.textContent = 'Solo una slytherin podría responder que sí a todo sin remordimiento. Bienvenida y juega.';
  retryBtn.classList.add('hidden');
  setTimeout(showHub, 3400);
}

function showRejection() {
  questionStage.classList.add('hidden');
  resultStage.classList.remove('hidden');
  resultText.textContent = 'Entonces fuera de aquí, sangre sucia.';
  retryBtn.classList.remove('hidden');
}

function resetSorting() {
  currentQuestion = 0;
  renderQuestion();
}

retryBtn.addEventListener('click', resetSorting);

function showHub() {
  showScreen('hub-screen');
}

renderQuestion();

/* ==================== NAVEGACIÓN: HUB / LISTA / JUEGO / REGALOS ==================== */
document.getElementById('nav-games').addEventListener('click', () => showScreen('games-list-screen'));
document.getElementById('nav-gifts').addEventListener('click', () => showScreen('gifts-screen'));
document.getElementById('back-from-gameslist').addEventListener('click', showHub);
document.getElementById('back-from-gifts').addEventListener('click', showHub);
document.getElementById('back-from-gameplay').addEventListener('click', () => showScreen('games-list-screen'));

const gameControllers = {};

document.querySelectorAll('[data-open-game]').forEach((card) => {
  card.querySelector('button').addEventListener('click', () => {
    const key = card.dataset.openGame;
    document.querySelectorAll('.game-play-block').forEach((block) => block.classList.add('hidden'));
    document.getElementById(`play-${key}`).classList.remove('hidden');
    showScreen('game-play-screen');
    if (gameControllers[key]) gameControllers[key].reset();
  });
});

/* ==================== MINIJUEGO: CAZA LA SNITCH ==================== */
(function snitchGame() {
  const CATCHES_NEEDED = 12;
  const TIME_LIMIT_MS = 10000;

  const status = document.querySelector('[data-status="snitch"]');
  const timerDisplay = document.getElementById('snitch-timer');
  const startBtn = document.getElementById('snitch-start');
  const arena = document.getElementById('snitch-arena');
  const target = document.getElementById('snitch-target');

  let catches = 0;
  let timeLeftTimer = null;
  let countdownInterval = null;
  let playing = false;

  function updateTimerDisplay(msLeft) {
    timerDisplay.textContent = `Tiempo: ${Math.ceil(msLeft / 1000)}s`;
  }

  function moveTarget() {
    const maxX = arena.clientWidth - target.clientWidth;
    const maxY = arena.clientHeight - target.clientHeight;
    target.style.left = randInt(0, Math.max(maxX, 0)) + 'px';
    target.style.top = randInt(0, Math.max(maxY, 0)) + 'px';
  }

  function endGame(won) {
    playing = false;
    clearTimeout(timeLeftTimer);
    clearInterval(countdownInterval);
    target.hidden = true;
    startBtn.disabled = false;

    if (won) {
      status.textContent = '¡La atrapaste! +10 KarenCoinsitos';
      status.className = 'game-status win';
      addPoints(10);
    } else {
      updateTimerDisplay(0);
      status.textContent = `Se te escapó. Atrapaste ${catches}/${CATCHES_NEEDED}.`;
      status.className = 'game-status lose';
    }
  }

  function reset() {
    playing = false;
    clearTimeout(timeLeftTimer);
    clearInterval(countdownInterval);
    catches = 0;
    target.hidden = true;
    startBtn.disabled = false;
    status.textContent = '';
    status.className = 'game-status';
    updateTimerDisplay(TIME_LIMIT_MS);
  }

  target.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (!playing) return;
    catches++;
    status.textContent = `Atrapadas: ${catches}/${CATCHES_NEEDED}`;
    status.className = 'game-status';
    if (catches >= CATCHES_NEEDED) {
      endGame(true);
    } else {
      moveTarget();
    }
  });

  startBtn.addEventListener('click', () => {
    if (playing) return;
    playing = true;
    catches = 0;
    startBtn.disabled = true;
    status.textContent = `Atrapadas: 0/${CATCHES_NEEDED}`;
    status.className = 'game-status';
    target.hidden = false;
    moveTarget();

    const startTime = Date.now();
    updateTimerDisplay(TIME_LIMIT_MS);
    countdownInterval = setInterval(() => {
      const msLeft = Math.max(0, TIME_LIMIT_MS - (Date.now() - startTime));
      updateTimerDisplay(msLeft);
    }, 100);

    timeLeftTimer = setTimeout(() => endGame(false), TIME_LIMIT_MS);
  });

  gameControllers.snitch = { reset };
})();

/* ==================== MINIJUEGO 2: ADIVINA EL NÚMERO ==================== */
(function guessGame() {
  const status = document.querySelector('[data-status="guess"]');
  const buttonsWrap = document.getElementById('guess-buttons');
  const resetBtn = document.getElementById('guess-reset');
  const guessButtons = Array.from(buttonsWrap.querySelectorAll('[data-guess]'));

  let target = 0;
  let attemptsLeft = 3;

  function newRound() {
    target = randInt(1, 10);
    attemptsLeft = 3;
    status.textContent = `Tienes ${attemptsLeft} intentos.`;
    status.className = 'game-status';
    guessButtons.forEach((b) => { b.disabled = false; });
    resetBtn.classList.add('hidden');
  }

  guessButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const value = parseInt(btn.dataset.guess, 10);
      attemptsLeft--;

      if (value === target) {
        status.textContent = `¡Correcto! Era el ${target}. +10 KarenCoinsitos`;
        status.className = 'game-status win';
        addPoints(10);
        guessButtons.forEach((b) => { b.disabled = true; });
        resetBtn.classList.remove('hidden');
      } else if (attemptsLeft > 0) {
        const hint = value < target ? 'Más alto' : 'Más bajo';
        status.textContent = `${hint}. Te quedan ${attemptsLeft} intentos.`;
        status.className = 'game-status';
      } else {
        status.textContent = `Sin suerte. Era el ${target}.`;
        status.className = 'game-status lose';
        guessButtons.forEach((b) => { b.disabled = true; });
        resetBtn.classList.remove('hidden');
      }
    });
  });

  resetBtn.addEventListener('click', newRound);
  newRound();

  gameControllers.guess = { reset: newRound };
})();

/* ==================== MINIJUEGO: MEMORIA ARCANA ==================== */
(function memoryGame() {
  const status = document.querySelector('[data-status="memory"]');
  const startBtn = document.getElementById('memory-start');
  const pads = Array.from(document.querySelectorAll('.memory-pad'));

  let sequence = [];
  let playerIndex = 0;
  let accepting = false;

  function litPad(idx, duration) {
    return new Promise((resolve) => {
      const pad = pads[idx];
      pad.classList.add('lit');
      setTimeout(() => {
        pad.classList.remove('lit');
        setTimeout(resolve, 200);
      }, duration);
    });
  }

  async function playSequence() {
    accepting = false;
    pads.forEach((p) => { p.disabled = true; });
    startBtn.disabled = true;
    status.textContent = 'Observa...';
    status.className = 'game-status';

    for (const idx of sequence) {
      await litPad(idx, 550);
    }

    status.textContent = 'Ahora repite la secuencia.';
    playerIndex = 0;
    accepting = true;
    pads.forEach((p) => { p.disabled = false; });
    startBtn.disabled = false;
  }

  const SEQUENCE_LENGTH = 6;

  function startRound() {
    sequence = Array.from({ length: SEQUENCE_LENGTH }, () => randInt(0, 3));
    playSequence();
  }

  function reset() {
    sequence = [];
    playerIndex = 0;
    accepting = false;
    pads.forEach((p) => { p.disabled = false; p.classList.remove('lit'); });
    startBtn.disabled = false;
    status.textContent = '';
    status.className = 'game-status';
  }

  pads.forEach((pad) => {
    pad.addEventListener('click', () => {
      if (!accepting) return;
      const idx = parseInt(pad.dataset.idx, 10);
      pad.classList.add('lit');
      setTimeout(() => pad.classList.remove('lit'), 200);

      if (idx === sequence[playerIndex]) {
        playerIndex++;
        if (playerIndex === sequence.length) {
          accepting = false;
          status.textContent = '¡Secuencia correcta! +10 KarenCoinsitos';
          status.className = 'game-status win';
          addPoints(10);
        }
      } else {
        accepting = false;
        status.textContent = 'Secuencia incorrecta. Inténtalo de nuevo.';
        status.className = 'game-status lose';
      }
    });
  });

  startBtn.addEventListener('click', startRound);

  gameControllers.memory = { reset };
})();

/* ==================== MINIJUEGO: REFLEJOS DE SERPIENTE ==================== */
(function reflexGame() {
  const MIN_DELAY_MS = 1500;
  const MAX_DELAY_MS = 4000;
  const REACT_WINDOW_MS = 3000;

  const status = document.querySelector('[data-status="reflex"]');
  const button = document.getElementById('reflex-button');

  let state = 'idle'; // idle | waiting | ready | done
  let delayTimer = null;
  let windowTimer = null;
  let signalTime = 0;

  function reset() {
    clearTimeout(delayTimer);
    clearTimeout(windowTimer);
    state = 'idle';
    button.textContent = 'Empezar';
    button.classList.remove('ready');
    status.textContent = '';
    status.className = 'game-status';
  }

  function startRound() {
    state = 'waiting';
    button.textContent = 'Espera...';
    button.classList.remove('ready');
    status.textContent = 'Prepárate...';
    status.className = 'game-status';

    delayTimer = setTimeout(() => {
      state = 'ready';
      signalTime = Date.now();
      button.textContent = '¡YA!';
      button.classList.add('ready');

      windowTimer = setTimeout(() => {
        state = 'done';
        button.textContent = 'Jugar de nuevo';
        button.classList.remove('ready');
        status.textContent = 'Demasiado lento. Inténtalo de nuevo.';
        status.className = 'game-status lose';
      }, REACT_WINDOW_MS);
    }, randInt(MIN_DELAY_MS, MAX_DELAY_MS));
  }

  button.addEventListener('pointerdown', (e) => {
    e.preventDefault();

    if (state === 'idle' || state === 'done') {
      startRound();
      return;
    }

    if (state === 'waiting') {
      clearTimeout(delayTimer);
      state = 'done';
      button.textContent = 'Jugar de nuevo';
      status.textContent = 'Demasiado pronto. Inténtalo de nuevo.';
      status.className = 'game-status lose';
      return;
    }

    if (state === 'ready') {
      clearTimeout(windowTimer);
      const reactionMs = Date.now() - signalTime;
      state = 'done';
      button.textContent = 'Jugar de nuevo';
      button.classList.remove('ready');
      status.textContent = `¡Reflejos de ${reactionMs}ms! +10 KarenCoinsitos`;
      status.className = 'game-status win';
      addPoints(10);
    }
  });

  gameControllers.reflex = { reset };
})();

/* ==================== CONFETI DORADO ==================== */
const confettiCanvas = document.getElementById('confetti-canvas');
const ctx = confettiCanvas.getContext('2d');

function resizeConfettiCanvas() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeConfettiCanvas);
resizeConfettiCanvas();

const confettiColors = ['#ffd700', '#e6c85c', '#fff4c2', '#2fd587', '#b9c9c0'];
let confettiParticles = [];
let confettiAnimId = null;

function launchConfetti(durationMs = 2600, count = 160) {
  const w = confettiCanvas.width;
  confettiParticles = confettiParticles.concat(
    Array.from({ length: count }, () => ({
      x: randInt(0, w),
      y: -20 - Math.random() * 200,
      size: 4 + Math.random() * 6,
      color: confettiColors[randInt(0, confettiColors.length - 1)],
      speedY: 2 + Math.random() * 3,
      speedX: -1.5 + Math.random() * 3,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: -0.2 + Math.random() * 0.4,
      shape: Math.random() > 0.5 ? 'rect' : 'circle'
    }))
  );

  if (!confettiAnimId) {
    animateConfetti();
  }

  setTimeout(() => {
    confettiParticles = [];
  }, durationMs);
}

function animateConfetti() {
  ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

  confettiParticles.forEach((p) => {
    p.x += p.speedX;
    p.y += p.speedY;
    p.rotation += p.rotationSpeed;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 6;
    if (p.shape === 'rect') {
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });

  confettiParticles = confettiParticles.filter((p) => p.y < confettiCanvas.height + 40);

  if (confettiParticles.length > 0) {
    confettiAnimId = requestAnimationFrame(animateConfetti);
  } else {
    confettiAnimId = null;
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  }
}

/* ==================== CANJE DE REGALOS ==================== */
const redeemModal = document.getElementById('redeem-modal');
const redeemMessage = document.getElementById('redeem-message');
const redeemClose = document.getElementById('redeem-close');
const eventModal = document.getElementById('event-modal');
const eventClose = document.getElementById('event-close');

function openRedeemModal(message) {
  redeemMessage.textContent = message;
  redeemMessage.style.animation = 'none';
  void redeemMessage.offsetWidth;
  redeemMessage.style.animation = 'fade-in 1.2s ease';

  redeemModal.classList.remove('hidden');
  launchConfetti();
}

function openEventModal() {
  eventModal.classList.remove('hidden');
  launchConfetti();
}

document.getElementById('redeem-boardgame').addEventListener('click', (e) => {
  const cost = parseInt(e.currentTarget.dataset.cost, 10);
  if (getPoints() < cost) return;
  addPoints(-cost);
  openRedeemModal('Solicítelo a la pareja de usted.');
});

document.getElementById('redeem-event').addEventListener('click', (e) => {
  const cost = parseInt(e.currentTarget.dataset.cost, 10);
  if (getPoints() < cost) return;
  addPoints(-cost);
  openEventModal();
});

redeemClose.addEventListener('click', () => {
  redeemModal.classList.add('hidden');
});

eventClose.addEventListener('click', () => {
  eventModal.classList.add('hidden');
});

/* ==================== INICIALIZACIÓN ==================== */
refreshPointsUI();
