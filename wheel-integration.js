// wheel-integration.js
(function () {

  function addWheelButton() {

    // Ищем заголовок "Измерения за сегодня"
    const headers = Array.from(document.querySelectorAll('h2, h3'));
    const measurementsHeader = headers.find(h =>
      h.textContent.includes('Измерения за сегодня')
    );

    if (!measurementsHeader) return;
    if (document.getElementById('openWheelBtn')) return;

    const btn = document.createElement('button');
    btn.id = 'openWheelBtn';
    btn.className = 'btn-secondary';
    btn.style.marginBottom = '15px';
    btn.textContent = '🎯 Колесо баланса';

    btn.addEventListener('click', () => {
      window.location.href = '/wheel.html';
    });

    // Вставляем прямо перед заголовком
    measurementsHeader.parentNode.insertBefore(btn, measurementsHeader);
  }

  const observer = new MutationObserver(addWheelButton);

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

})();
