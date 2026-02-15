// wheel-integration.js
(function () {

  function tryAddButton() {
    const formContainer = document.getElementById('measurements-form');
    if (!formContainer) return;

    // если уже добавлена — не дублируем
    if (document.getElementById('openWheelBtn')) return;

    const btn = document.createElement('button');
    btn.id = 'openWheelBtn';
    btn.className = 'btn-secondary';
    btn.style.marginBottom = '15px';
    btn.textContent = '🎯 Колесо баланса';

    btn.addEventListener('click', () => {
      window.location.href = '/wheel.html';
    });

    formContainer.prepend(btn);
  }

  // 🔁 Проверяем каждые 500 мс, пока форма не появится
  const interval = setInterval(() => {
    const formContainer = document.getElementById('measurements-form');
    if (formContainer) {
      tryAddButton();
      clearInterval(interval);
    }
  }, 500);

})();
