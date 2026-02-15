// wheel-integration.js
(function () {

  function addWheelButton() {
    const formContainer = document.getElementById('measurements-form');
    if (!formContainer) return;

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

  // Наблюдаем за изменениями DOM
  const observer = new MutationObserver(() => {
    const formContainer = document.getElementById('measurements-form');
    if (formContainer) {
      addWheelButton();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

})();

