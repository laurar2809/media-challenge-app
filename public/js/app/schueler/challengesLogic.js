
document.addEventListener('DOMContentLoaded', function () {
  const searchInput = document.getElementById('challengesSearchStudent');
  const cardWrappers = document.querySelectorAll('.challenge-card-wrapper');

  if (!searchInput || !cardWrappers.length) return;

  searchInput.addEventListener('input', function () {
    const term = this.value.toLowerCase().trim();

    cardWrappers.forEach(wrapper => {
      const card = wrapper.querySelector('.challenge-card');
      if (!card) return;

      const title = (card.dataset.title || '').toLowerCase();
      const team = (card.dataset.team || '').toLowerCase();
      const category = (card.dataset.category || '').toLowerCase();

      const match =
        !term ||
        title.includes(term) ||
        team.includes(term) ||
        category.includes(term);

      wrapper.style.display = match ? '' : 'none';
    });
  });
});

