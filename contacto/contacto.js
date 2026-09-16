(() => {
  const header = document.getElementById('header');
  const progress = document.getElementById('scroll-progress');
  const menuButton = document.getElementById('menu-toggle');
  const mobileNav = document.getElementById('mobile-nav');
  const backToTop = document.getElementById('back-to-top');
  const form = document.getElementById('contact-form');
  const status = document.getElementById('form-status');
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

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (event) => {
      const targetId = anchor.getAttribute('href');
      if (!targetId || targetId === '#') return;
      const target = document.querySelector(targetId);
      if (!target) return;
      event.preventDefault();
      closeMenu();
      const offset = header?.offsetHeight || 0;
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  });

  const reveals = document.querySelectorAll('.contact-reveal');
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

  const messages = {
    name: 'Escribe tu nombre.',
    email: 'Escribe un email válido.',
    projectType: 'Selecciona el tipo de proyecto.',
    location: 'Indica la ubicación del proyecto.',
    message: 'Describe brevemente qué necesitas.',
    privacy: 'Debes aceptar la política de privacidad.'
  };

  const setFieldState = (field) => {
    const error = document.getElementById(`${field.id}-error`);
    if (!error) return field.checkValidity();
    let message = '';
    if (!field.validity.valid) {
      message = field.validity.typeMismatch ? 'Escribe un email válido.' : messages[field.name] || 'Revisa este campo.';
    }
    field.setAttribute('aria-invalid', String(Boolean(message)));
    error.textContent = message;
    return !message;
  };

  if (form) {
    const checkedFields = Array.from(form.querySelectorAll('input[required], select[required], textarea[required]'));
    checkedFields.forEach((field) => {
      field.addEventListener('blur', () => setFieldState(field));
      field.addEventListener('change', () => {
        if (field.getAttribute('aria-invalid') === 'true') setFieldState(field);
      });
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const valid = checkedFields.map(setFieldState).every(Boolean);
      if (!valid) {
        const firstInvalid = form.querySelector('[aria-invalid="true"]');
        firstInvalid?.focus();
        if (status) status.textContent = 'Revisa los campos indicados antes de continuar.';
        return;
      }

      const data = new FormData(form);
      const body = [
        `Nombre: ${data.get('name')}`,
        `Email: ${data.get('email')}`,
        `Teléfono: ${data.get('phone') || 'No indicado'}`,
        `Tipo de proyecto: ${data.get('projectType')}`,
        `Ubicación: ${data.get('location')}`,
        '',
        'Descripción:',
        data.get('message')
      ].join('\n');
      const subject = `Solicitud de presupuesto — ${data.get('projectType')}`;

      if (status) status.textContent = 'Solicitud preparada. Se abrirá tu aplicación de correo para enviarla.';
      window.location.href = `mailto:info@kerania.es?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });
})();
