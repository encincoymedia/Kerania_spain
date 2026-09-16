(() => {
  const header = document.getElementById('header');
  const progress = document.getElementById('scroll-progress');
  const menuButton = document.getElementById('menu-toggle');
  const mobileNav = document.getElementById('mobile-nav');
  const backToTop = document.getElementById('back-to-top');

  const closeMenu = () => {
    if (!menuButton || !mobileNav) return;
    menuButton.classList.remove('active');
    mobileNav.classList.remove('active');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Abrir menú');
    mobileNav.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  if (menuButton && mobileNav) {
    menuButton.addEventListener('click', () => {
      const willOpen = !mobileNav.classList.contains('active');
      menuButton.classList.toggle('active', willOpen);
      mobileNav.classList.toggle('active', willOpen);
      menuButton.setAttribute('aria-expanded', String(willOpen));
      menuButton.setAttribute('aria-label', willOpen ? 'Cerrar menú' : 'Abrir menú');
      mobileNav.setAttribute('aria-hidden', String(!willOpen));
      document.body.style.overflow = willOpen ? 'hidden' : '';
    });
    mobileNav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMenu();
    });
  }

  const updateScrollUI = () => {
    const scrollTop = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (header) header.classList.toggle('scrolled', scrollTop > 24);
    if (progress) progress.style.width = `${maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0}%`;
    if (backToTop) backToTop.classList.toggle('is-visible', scrollTop > 700);
  };

  updateScrollUI();
  window.addEventListener('scroll', updateScrollUI, { passive: true });

  if (backToTop) {
    backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  const revealItems = document.querySelectorAll('.service-reveal');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.04, rootMargin: '0px 0px 140px' });
    revealItems.forEach((item) => revealObserver.observe(item));
  }

  const faqItems = document.querySelectorAll('.service-faq__item');
  faqItems.forEach((item) => {
    item.addEventListener('toggle', () => {
      if (!item.open) return;
      faqItems.forEach((other) => {
        if (other !== item) other.open = false;
      });
    });
  });
})();
