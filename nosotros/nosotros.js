(() => {
  const header = document.getElementById('header');
  const progress = document.getElementById('scroll-progress');
  const menuButton = document.getElementById('menu-toggle');
  const mobileNav = document.getElementById('mobile-nav');
  const backToTop = document.getElementById('back-to-top');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
      const open = !mobileNav.classList.contains('active');
      menuButton.classList.toggle('active', open);
      mobileNav.classList.toggle('active', open);
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      mobileNav.setAttribute('aria-hidden', String(!open));
      document.body.style.overflow = open ? 'hidden' : '';
    });
    mobileNav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
  }

  const updateScrollUI = () => {
    const scrollTop = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    header?.classList.toggle('scrolled', scrollTop > 24);
    if (progress) progress.style.width = `${maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0}%`;
    backToTop?.classList.toggle('is-visible', scrollTop > 700);
  };

  updateScrollUI();
  window.addEventListener('scroll', updateScrollUI, { passive: true });
  backToTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));

  const reveals = document.querySelectorAll('.about-reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach((item) => item.classList.add('is-visible'));
  } else {
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        currentObserver.unobserve(entry.target);
      });
    }, { threshold: .04, rootMargin: '0px 0px 140px' });
    reveals.forEach((item) => observer.observe(item));
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });
})();
