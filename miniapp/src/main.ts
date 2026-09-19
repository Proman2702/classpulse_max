import './style.css';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <section class="card" aria-labelledby="page-title">
    <div class="logo" aria-hidden="true">CP</div>
    <p class="eyebrow">MAX Mini App</p>
    <h1 id="page-title">ClassPulse</h1>
    <p class="intro">
      Тестовый запуск работает
    </p>

    <div class="status" role="status" aria-live="polite">
      <span class="status__dot"></span>
      <span id="status-text">Система готова</span>
    </div>

    <button id="check-button" type="button">Проверить подключение</button>
  </section>
`;

const button = document.querySelector<HTMLButtonElement>('#check-button')!;
const statusText = document.querySelector<HTMLSpanElement>('#status-text')!;

button.addEventListener('click', () => {
  statusText.textContent = 'Подключение проверено';
  button.textContent = 'Готово ✓';
  button.disabled = true;
});

