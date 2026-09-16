(() => {
  const projects = {
    'pavimento-porcelanico-gran-formato': {
      category: 'Suelos',
      title: 'Pavimento porcelánico gran formato',
      location: 'Comunidad Valenciana',
      description: 'Proyecto de pavimento porcelánico pensado para conseguir continuidad visual, resistencia y un acabado preciso en toda la superficie.',
      work: 'Pendiente de documentación verificada.',
      materials: 'Porcelánico de gran formato · Distribución de juntas · Remates de precisión',
      service: 'Instalaciones y revestimientos',
      serviceHref: '../servicios/instalaciones-revestimientos/',
      gallery: [{ src: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1600&q=88', alt: 'Proyecto de suelos de gran formato' }]
    },
    'reforma-integral-bano-principal': {
      category: 'Baños',
      title: 'Reforma integral baño principal',
      location: 'Comunidad Valenciana',
      description: 'Reforma de baño centrada en mejorar la distribución, renovar los revestimientos y crear un espacio cómodo para el uso diario.',
      work: 'Pendiente de documentación verificada.',
      materials: 'Reforma de baño · Revestimiento cerámico · Acabados personalizados',
      service: 'Reformas y construcción',
      serviceHref: '../servicios/reformas-construccion/',
      gallery: [{ src: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=1600&q=88', alt: 'Proyecto de baño' }]
    },
    'revestimiento-fachada-exterior': {
      category: 'Fachadas',
      title: 'Revestimiento fachada exterior',
      location: 'Comunidad Valenciana',
      description: 'Revestimiento exterior diseñado para proteger la fachada y reforzar la imagen arquitectónica del edificio.',
      work: 'Pendiente de documentación verificada.',
      materials: 'Fachada exterior · Revestimiento técnico · Resistencia a la intemperie',
      service: 'Reformas y construcción',
      serviceHref: '../servicios/reformas-construccion/',
      gallery: [{ src: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1600&q=88', alt: 'Proyecto de fachada contemporánea' }]
    },
    'terraza-porcelanica-exterior': {
      category: 'Terrazas',
      title: 'Terraza porcelánica exterior',
      location: 'Comunidad Valenciana',
      description: 'Renovación de una terraza con pavimento porcelánico exterior, cuidando pendientes, encuentros y zonas de paso.',
      work: 'Pendiente de documentación verificada.',
      materials: 'Pavimento exterior · Acabado antideslizante · Encuentros y remates',
      service: 'Instalaciones y revestimientos',
      serviceHref: '../servicios/instalaciones-revestimientos/',
      gallery: [{ src: 'https://images.unsplash.com/photo-1512915922686-57c11dde9b6b?auto=format&fit=crop&w=1600&q=88', alt: 'Proyecto de terraza exterior' }]
    },
    'revestimiento-piedra-natural': {
      category: 'Piedra natural',
      title: 'Revestimiento en piedra natural',
      location: 'Comunidad Valenciana',
      description: 'Proyecto de revestimiento con piedra natural para aportar textura, carácter y continuidad a los paramentos del espacio.',
      work: 'Pendiente de documentación verificada.',
      materials: 'Piedra natural · Selección de piezas · Colocación especializada',
      service: 'Acabados y detalles especiales',
      serviceHref: '../servicios/acabados-detalles-especiales/',
      gallery: [{ src: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1600&q=88', alt: 'Proyecto de piedra natural' }]
    },
    'acabado-microcemento-residencial': {
      category: 'Suelos',
      title: 'Acabado microcemento residencial',
      location: 'Comunidad Valenciana',
      description: 'Aplicación de microcemento para crear una superficie continua, contemporánea y adaptada al conjunto de la vivienda.',
      work: 'Pendiente de documentación verificada.',
      materials: 'Microcemento · Superficie continua · Acabado residencial',
      service: 'Acabados y detalles especiales',
      serviceHref: '../servicios/acabados-detalles-especiales/',
      gallery: [{ src: 'https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=1600&q=88', alt: 'Detalle de acabados especiales' }]
    }
  };

  const header = document.getElementById('header');
  const progress = document.getElementById('scroll-progress');
  const menuButton = document.getElementById('menu-toggle');
  const mobileNav = document.getElementById('mobile-nav');
  const backToTop = document.getElementById('back-to-top');
  const filters = [...document.querySelectorAll('.portfolio-filter')];
  const cards = [...document.querySelectorAll('.portfolio-card')];
  const viewer = document.getElementById('project-viewer');
  const viewerShell = viewer?.querySelector('.project-viewer__shell');
  const viewerClose = document.getElementById('viewer-close');
  const viewerPrev = document.getElementById('viewer-prev');
  const viewerNext = document.getElementById('viewer-next');
  const viewerImage = document.getElementById('viewer-image');
  const viewerCounter = document.getElementById('viewer-counter');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pageBaseUrl = new URL('./', window.location.href);
  const backgroundRegions = [header, document.getElementById('contenido'), document.querySelector('footer')].filter(Boolean);

  let activeProject = null;
  let activeIndex = 0;
  let returnFocus = null;
  let savedScroll = 0;
  let touchStartX = 0;

  // pushState changes the document URL and therefore the way browsers resolve
  // relative links. Freeze links against the original page URL before opening
  // the viewer so navigation remains correct in HTTP and local previews.
  if (viewer) {
    document.querySelectorAll('a[href]').forEach((link) => {
      const href = link.getAttribute('href');
      if (!href || /^(?:https?:|mailto:|tel:)/i.test(href)) return;
      link.href = new URL(href, pageBaseUrl).href;
    });
  }

  const closeMenu = () => {
    if (!menuButton || !mobileNav) return;
    menuButton.classList.remove('active');
    mobileNav.classList.remove('active');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Abrir menú');
    mobileNav.setAttribute('aria-hidden', 'true');
    if (!viewer?.classList.contains('is-open')) document.body.style.overflow = '';
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

  const reveals = document.querySelectorAll('.portfolio-reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach((item) => item.classList.add('is-visible'));
  } else {
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        currentObserver.unobserve(entry.target);
      });
    }, { threshold: .04, rootMargin: '0px 0px 120px' });
    reveals.forEach((item) => observer.observe(item));
  }

  filters.forEach((filterButton) => {
    filterButton.addEventListener('click', () => {
      const filter = filterButton.dataset.filter;
      filters.forEach((button) => {
        const selected = button === filterButton;
        button.classList.toggle('is-active', selected);
        button.setAttribute('aria-pressed', String(selected));
      });
      cards.forEach((card) => {
        const show = filter === 'all' || card.dataset.category === filter;
        if (show) {
          card.hidden = false;
          requestAnimationFrame(() => card.classList.remove('is-leaving'));
        } else {
          card.classList.add('is-leaving');
          window.setTimeout(() => { if (card.classList.contains('is-leaving')) card.hidden = true; }, reduceMotion ? 0 : 220);
        }
      });
    });
  });

  const setViewerImage = (index) => {
    if (!activeProject || !viewerImage || !viewerCounter) return;
    const gallery = activeProject.gallery;
    activeIndex = (index + gallery.length) % gallery.length;
    const item = gallery[activeIndex];
    viewerImage.classList.add('is-changing');
    const update = () => {
      viewerImage.src = item.src;
      viewerImage.alt = item.alt;
      viewerImage.classList.remove('is-changing');
      viewerCounter.textContent = `${String(activeIndex + 1).padStart(2, '0')} / ${String(gallery.length).padStart(2, '0')}`;
      const single = gallery.length < 2;
      viewerPrev.disabled = single;
      viewerNext.disabled = single;
    };
    if (reduceMotion) update(); else window.setTimeout(update, 140);
  };

  const renderProject = (project, slug) => {
    document.getElementById('viewer-category').textContent = project.category;
    document.getElementById('viewer-title').textContent = project.title;
    document.getElementById('viewer-location').textContent = project.location;
    document.getElementById('viewer-description').textContent = project.description;
    document.getElementById('viewer-work').textContent = project.work;
    document.getElementById('viewer-materials').textContent = project.materials;
    const service = document.getElementById('viewer-service');
    service.firstChild.textContent = `${project.service} `;
    service.href = new URL(project.serviceHref, pageBaseUrl).href;
    document.getElementById('viewer-permalink').href = new URL(`${slug}/`, pageBaseUrl).href;
    setViewerImage(0);
  };

  const projectUrl = (slug) => new URL(`${slug}/`, pageBaseUrl);

  const openViewer = (trigger, updateHistory = true) => {
    const slug = trigger.dataset.project;
    const project = projects[slug];
    if (!project || !viewer) return;
    activeProject = project;
    returnFocus = trigger;
    savedScroll = window.scrollY;
    renderProject(project, slug);
    viewer.classList.add('is-open');
    viewer.setAttribute('aria-hidden', 'false');
    backgroundRegions.forEach((region) => {
      region.inert = true;
      region.setAttribute('aria-hidden', 'true');
    });
    document.body.classList.add('viewer-open');
    document.body.style.position = 'fixed';
    document.body.style.top = `-${savedScroll}px`;
    document.body.style.width = '100%';
    viewerClose.focus();
    if (updateHistory) {
      try { history.pushState({ project: slug }, '', projectUrl(slug)); } catch (_) { /* Local file previews can restrict URL history. */ }
    }
  };

  const finishClose = () => {
    if (!viewer?.classList.contains('is-open')) return;
    viewer.classList.remove('is-open');
    viewer.setAttribute('aria-hidden', 'true');
    backgroundRegions.forEach((region) => {
      region.inert = false;
      region.removeAttribute('aria-hidden');
    });
    document.body.classList.remove('viewer-open');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    window.scrollTo(0, savedScroll);
    returnFocus?.focus({ preventScroll: true });
    activeProject = null;
  };

  const closeViewer = (updateHistory = true) => {
    if (!viewer?.classList.contains('is-open')) return;
    if (updateHistory && history.state?.project) history.back();
    else finishClose();
  };

  document.querySelectorAll('.portfolio-card__trigger').forEach((trigger) => trigger.addEventListener('click', (event) => {
    event.preventDefault();
    openViewer(trigger);
  }));
  viewerClose?.addEventListener('click', () => closeViewer());
  viewerPrev?.addEventListener('click', () => setViewerImage(activeIndex - 1));
  viewerNext?.addEventListener('click', () => setViewerImage(activeIndex + 1));
  viewer?.addEventListener('click', (event) => { if (event.target === viewer) closeViewer(); });

  window.addEventListener('popstate', () => { if (viewer?.classList.contains('is-open')) finishClose(); });

  viewerShell?.addEventListener('touchstart', (event) => { touchStartX = event.changedTouches[0].clientX; }, { passive: true });
  viewerShell?.addEventListener('touchend', (event) => {
    if (!activeProject || activeProject.gallery.length < 2) return;
    const distance = event.changedTouches[0].clientX - touchStartX;
    if (Math.abs(distance) < 45) return;
    setViewerImage(activeIndex + (distance < 0 ? 1 : -1));
  }, { passive: true });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMenu();
      if (viewer?.classList.contains('is-open')) closeViewer();
      return;
    }
    if (!viewer?.classList.contains('is-open')) return;
    if (event.key === 'ArrowLeft') setViewerImage(activeIndex - 1);
    if (event.key === 'ArrowRight') setViewerImage(activeIndex + 1);
    if (event.key === 'Tab') {
      const focusable = [...viewer.querySelectorAll('button:not(:disabled), a[href]')].filter((item) => item.offsetParent !== null);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
})();
