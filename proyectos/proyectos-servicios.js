document.querySelectorAll('[data-projects-section]').forEach((section) => {
  const filters = section.querySelectorAll('[data-filter]');
  const cards = section.querySelectorAll('[data-category]');
  filters.forEach((button) => {
    button.addEventListener('click', () => {
      const category = button.dataset.filter;
      filters.forEach((filter) => {
        const active = filter === button;
        filter.classList.toggle('is-active', active);
        filter.setAttribute('aria-pressed', String(active));
      });
      cards.forEach((card) => {
        card.hidden = category !== 'all' && card.dataset.category !== category;
      });
    });
  });
});
