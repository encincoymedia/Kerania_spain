(() => {
  const menus = Array.from(document.querySelectorAll('.header__services-menu, .mobile-services-menu'));

  menus.forEach((menu) => {
    menu.addEventListener('toggle', () => {
      if (!menu.open) return;
      menus.forEach((otherMenu) => {
        if (otherMenu !== menu) otherMenu.open = false;
      });
    });

    menu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        menu.open = false;
      });
    });
  });

  document.addEventListener('click', (event) => {
    menus.forEach((menu) => {
      if (!menu.contains(event.target)) menu.open = false;
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    menus.forEach((menu) => {
      if (!menu.open) return;
      menu.open = false;
      menu.querySelector('summary')?.focus();
    });
  });
})();
