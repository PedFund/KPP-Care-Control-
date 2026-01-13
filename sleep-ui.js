// ================================
// sleep-ui.js
// Обработчики UI для блока "Сон"
// ================================

// === АВТОМАТИЧЕСКИЙ РАСЧЁТ ДЛИТЕЛЬНОСТИ СНА ===

function setupSleepInputHandlers() {
  const bedTimeInput = document.getElementById('input-bed-time');
  const wakeTimeInput = document.getElementById('input-wake-time');
  const durationDisplay = document.getElementById('sleep-duration-value');
  
  if (!bedTimeInput || !wakeTimeInput || !durationDisplay) {
    console.warn('⚠️ Элементы блока "Сон" не найдены');
    return;
  }
  
  // Функция обновления длительности
  function updateSleepDuration() {
    const bedTime = bedTimeInput.value;   // "23:30"
    const wakeTime = wakeTimeInput.value; // "07:00"
    
    if (!bedTime || !wakeTime) {
      durationDisplay.textContent = '—';
      durationDisplay.style.color = '#95a5a6';
      return;
    }
    
    // Рассчитываем длительность в минутах (функция из sleep-logic.js)
    const minutes = calculateSleepDuration(bedTime, wakeTime);
    
    if (minutes === 0) {
      durationDisplay.textContent = '—';
      durationDisplay.style.color = '#95a5a6';
      return;
    }
    
    // Форматируем (функция из sleep-logic.js)
    const formatted = formatSleepDuration(minutes);
    
    // Определяем качество сна (функция из sleep-logic.js)
    const quality = getSleepQuality(minutes);
    
    // Обновляем отображение
    durationDisplay.textContent = formatted;
    durationDisplay.style.color = quality.color;
  }
  
  // Вешаем обработчики на изменение значений
  bedTimeInput.addEventListener('input', updateSleepDuration);
  wakeTimeInput.addEventListener('input', updateSleepDuration);
  
  // Первичный расчёт (если поля уже заполнены)
  updateSleepDuration();
}

// === ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ ===

// Запускаем после загрузки DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupSleepInputHandlers);
} else {
  setupSleepInputHandlers();
}

// === ОБНОВЛЕНИЕ renderTodayBlock() ДЛЯ ОТОБРАЖЕНИЯ СНА ===
// (это будет добавлено в ui.js отдельно)

// Вспомогательная функция для вывода строки сна в блоке "Сегодня"
function renderSleepRow(bedTime, wakeTime, sleepDuration) {
  if (!bedTime || !wakeTime) {
    return `
      <div class="checklist-row">
        <span class="row-label">💤 Сон:</span>
        <span class="row-value" style="color: #95a5a6;">—</span>
      </div>
    `;
  }
  
  const formatted = formatSleepDuration(sleepDuration);
  const quality = getSleepQuality(sleepDuration);
  
  return `
    <div class="checklist-row">
      <span class="row-label">💤 Сон:</span>
      <span class="row-value">
        <strong>${bedTime}</strong> → <strong>${wakeTime}</strong>
        <span style="color: ${quality.color}; font-weight: bold;"> (${formatted})</span>
      </span>
    </div>
  `;
}

// Экспортируем функцию для использования в ui.js
if (typeof window !== 'undefined') {
  window.renderSleepRow = renderSleepRow;
}
