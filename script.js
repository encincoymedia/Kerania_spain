/* ================================================================
   KERANIA — Interactions & Animations
   ================================================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ---------------------------------------------------------------
  // Interactive coverage map
  // ---------------------------------------------------------------
  const coverageMap = document.querySelector('.coverage-map');

  if (coverageMap) {
    const provinces = Array.from(coverageMap.querySelectorAll('.provincia'));
    let selectedProvince = null;

    const setSelectedProvince = (province) => {
      selectedProvince = province;

      provinces.forEach(item => {
        const isSelected = item === province;
        item.classList.toggle('is-active', isSelected);
        item.setAttribute('aria-pressed', String(isSelected));
      });

    };

    const toggleProvince = (province) => {
      setSelectedProvince(selectedProvince === province ? null : province);
    };

    provinces.forEach(province => {
      province.addEventListener('pointerup', event => {
        if (event.pointerType === 'touch' || event.pointerType === 'pen') {
          event.preventDefault();
          toggleProvince(province);
        }
      });

      province.addEventListener('click', event => {
        // Assistive technologies activate custom SVG buttons with a synthetic click.
        if (event.detail === 0) toggleProvince(province);
      });

      province.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggleProvince(province);
        } else if (event.key === 'Escape') {
          setSelectedProvince(null);
          province.blur();
        }
      });

      province.addEventListener('focus', () => {
        if (selectedProvince && selectedProvince !== province) {
          setSelectedProvince(null);
        }
      });
    });

    document.addEventListener('pointerdown', event => {
      if (selectedProvince && !coverageMap.contains(event.target)) {
        setSelectedProvince(null);
      }
    });
  }

  // Hover on desktop; native disclosure controls for touch and keyboard.
  const serviceHover = window.matchMedia('(min-width: 769px) and (hover: hover) and (pointer: fine)');
  document.querySelectorAll('.seo-service-disclosure').forEach(details => {
    const card = details.closest('.seo-service');
    card.addEventListener('pointerenter', event => {
      if (serviceHover.matches && event.pointerType !== 'touch') details.open = true;
    });
    card.addEventListener('pointerleave', event => {
      if (serviceHover.matches && event.pointerType !== 'touch') details.open = false;
    });
    details.querySelector('summary').addEventListener('click', event => {
      if (serviceHover.matches && event.detail > 0) {
        event.preventDefault();
        details.open = true;
      }
    });
    document.addEventListener('click', event => {
      if (!card.contains(event.target)) details.open = false;
    });
    details.addEventListener('focusout', event => {
      if (!details.contains(event.relatedTarget)) details.open = false;
    });
  });


  // ---------------------------------------------------------------
  // Sticky Header
  // ---------------------------------------------------------------
  const header = document.getElementById('header');
  let lastScroll = 0;

  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }

    lastScroll = currentScroll;
  }, { passive: true });


  // ---------------------------------------------------------------
  // Mobile Menu Toggle
  // ---------------------------------------------------------------
  const menuToggle = document.getElementById('menu-toggle');
  const mobileNav = document.getElementById('mobile-nav');

  menuToggle.addEventListener('click', () => {
    menuToggle.classList.toggle('active');
    mobileNav.classList.toggle('active');
    const open = mobileNav.classList.contains('active');
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    mobileNav.setAttribute('aria-hidden', String(!open));
    document.body.style.overflow = open ? 'hidden' : '';
  });

  window.closeMobileNav = function() {
    menuToggle.classList.remove('active');
    mobileNav.classList.remove('active');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Abrir menú');
    mobileNav.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };


  // ---------------------------------------------------------------
  // Active Nav Link
  // ---------------------------------------------------------------
  const navLinks = document.querySelectorAll('.header__nav-link');
  const sections = document.querySelectorAll('section[id]');

  function updateActiveNav() {
    const scrollPos = window.pageYOffset + 200;

    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;
      const sectionId = section.getAttribute('id');

      if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
        navLinks.forEach(link => {
          link.classList.remove('active');
          const href = link.getAttribute('href') || link.dataset.sectionLink;
          if (href === '#' + sectionId || (sectionId === 'hero' && (href === '#' || href === 'index.html'))) {
            link.classList.add('active');
          }
        });
      }
    });
  }

  window.addEventListener('scroll', updateActiveNav, { passive: true });


  // ---------------------------------------------------------------
  // Scroll Reveal
  // ---------------------------------------------------------------
  const revealElements = document.querySelectorAll('.reveal');

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -60px 0px'
  });

  revealElements.forEach(el => revealObserver.observe(el));


  // ---------------------------------------------------------------
  // Smooth Scroll for Anchor Links
  // ---------------------------------------------------------------
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;

      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        const headerHeight = header.offsetHeight;
        const targetPos = targetEl.getBoundingClientRect().top + window.pageYOffset - headerHeight;
        
        window.scrollTo({
          top: targetPos,
          behavior: 'smooth'
        });
      }
    });
  });


  // ---------------------------------------------------------------
  // Parallax-like effect on hero image (subtle)
  // ---------------------------------------------------------------
  const heroImage = document.querySelector('.hero__right img');

  if (heroImage && window.innerWidth > 768) {
    window.addEventListener('scroll', () => {
      const scrolled = window.pageYOffset;
      const heroHeight = document.querySelector('.hero').offsetHeight;

      if (scrolled <= heroHeight) {
        heroImage.style.transform = `translateY(${scrolled * 0.1}px) scale(1.05)`;
      }
    }, { passive: true });

    // Initial scale
    heroImage.style.transform = 'scale(1.05)';
    heroImage.style.transition = 'transform 0.1s linear';
  }


  // ---------------------------------------------------------------
  // Counter Animation for Stats
  // ---------------------------------------------------------------
  const statNumbers = document.querySelectorAll('.intro__stat-number, .hero__stat-number');
  let statsAnimated = false;

  function animateCounters() {
    if (statsAnimated) return;
    
    statNumbers.forEach(stat => {
      const text = stat.textContent;
      const match = text.match(/(\d+)/);
      if (!match) return;

      const target = parseInt(match[0]);
      const suffix = text.replace(match[0], '');
      let current = 0;
      const duration = 2000;
      const step = target / (duration / 16);

      const counter = setInterval(() => {
        current += step;
        if (current >= target) {
          current = target;
          clearInterval(counter);
        }
        stat.textContent = Math.floor(current) + suffix;
      }, 16);
    });

    statsAnimated = true;
  }

  const statsSection = document.querySelector('.intro__stats-card, .hero__stats');
  if (statsSection) {
    const statsObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setTimeout(animateCounters, 300);
          statsObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    statsObserver.observe(statsSection);
  }


  // ---------------------------------------------------------------
  // Service Block hover sound-like feedback (visual ripple)
  // ---------------------------------------------------------------
  const serviceBlocks = document.querySelectorAll('.service-block');

  serviceBlocks.forEach(block => {
    block.addEventListener('mouseenter', function() {
      this.style.transition = 'background-color 0.3s ease, transform 0.3s ease';
    });
  });


  // ---------------------------------------------------------------
  // Process Timeline Animation
  // ---------------------------------------------------------------
  const processTimeline = document.getElementById('process-timeline');
  const processSteps = document.querySelectorAll('.process__step');

  if (processTimeline && processSteps.length) {
    let processAnimated = false;

    const processObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !processAnimated) {
          processAnimated = true;

          // Activate the timeline container (triggers line fill)
          processTimeline.classList.add('active');

          // Stagger each step activation
          processSteps.forEach((step, index) => {
            setTimeout(() => {
              step.classList.add('active');
            }, 300 + (index * 400));
          });

          processObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.25,
      rootMargin: '0px 0px -80px 0px'
    });

    processObserver.observe(processTimeline);
  }


  // ---------------------------------------------------------------
  // Preload hero image for performance
  // ---------------------------------------------------------------
  const heroImg = new Image();
  heroImg.src = 'Imagenes/image_hero.jpg';




  // ---------------------------------------------------------------
  // Scroll Progress Bar
  // ---------------------------------------------------------------
  const scrollProgress = document.getElementById('scroll-progress');

  window.addEventListener('scroll', () => {
    if (!scrollProgress) return;
    const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = (window.pageYOffset / totalHeight) * 100;
    scrollProgress.style.width = `${progress}%`;
  }, { passive: true });


  // ---------------------------------------------------------------
  // Category Filtering for Projects
  // ---------------------------------------------------------------
  const filterBtns = document.querySelectorAll('.projects__filter-btn');
  const projectCards = document.querySelectorAll('.project-card');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      filterBtns.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
      btn.classList.add('active');

      const filter = btn.getAttribute('data-filter');

      projectCards.forEach(card => {
        const category = card.getAttribute('data-category');
        if (filter === 'all' || category === filter) {
          card.classList.remove('filtered-out');
        } else {
          card.classList.add('filtered-out');
        }
      });
    });
  });


  // ---------------------------------------------------------------
  // 3D Card Perspective Tilt & Dynamic Sheen
  // ---------------------------------------------------------------
  const tiltableCards = document.querySelectorAll('.project-card, .service-block');

  tiltableCards.forEach(card => {
    if (card.classList.contains('project-card') && !card.querySelector('.project-card__sheen')) {
      const sheen = document.createElement('div');
      sheen.className = 'project-card__sheen';
      const imgWrapper = card.querySelector('.project-card__image');
      if (imgWrapper) imgWrapper.appendChild(sheen);
    }

    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -5;
      const rotateY = ((x - centerX) / centerX) * 5;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.015, 1.015, 1)`;

      const mouseXPercent = (x / rect.width) * 100;
      const mouseYPercent = (y / rect.height) * 100;
      card.style.setProperty('--mouse-x', `${mouseXPercent}%`);
      card.style.setProperty('--mouse-y', `${mouseYPercent}%`);
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    });
  });


  // ---------------------------------------------------------------
  // Project Lightbox Modal
  // ---------------------------------------------------------------
  const modal = document.getElementById('project-modal');
  const modalBackdrop = document.getElementById('modal-backdrop');
  const modalClose = document.getElementById('modal-close');

  const modalImg = document.getElementById('modal-img');
  const modalCategory = document.getElementById('modal-category');
  const modalTitle = document.getElementById('modal-title');
  const modalLocation = document.getElementById('modal-location');
  const modalDesc = document.getElementById('modal-desc');
  const modalSpecs = document.getElementById('modal-specs');
  let modalReturnFocus = null;

  function openProjectModal(card) {
    modalReturnFocus = card;
    const title = card.getAttribute('data-title') || 'Proyecto Kerania';
    const category = card.getAttribute('data-category') || 'Proyecto';
    const location = card.getAttribute('data-location') || 'España';
    const desc = card.getAttribute('data-desc') || 'Instalación y acabado técnico realizado con los más altos estándares de calidad por Kerania.';
    const specs = card.getAttribute('data-specs') || 'Acabado de alta precisión · Garantía Kerania';
    const image = card.getAttribute('data-image') || (card.querySelector('img') ? card.querySelector('img').src : '');

    if (modalImg) {
      modalImg.src = image;
      modalImg.alt = title;
    }
    if (modalCategory) modalCategory.textContent = category;
    if (modalTitle) modalTitle.textContent = title;
    if (modalLocation) modalLocation.textContent = `📍 ${location}`;
    if (modalDesc) modalDesc.textContent = desc;
    if (modalSpecs) modalSpecs.textContent = specs;

    if (modal) {
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      modalClose?.focus();
    }
  }

  window.closeProjectModal = function() {
    if (!modal) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    modalReturnFocus?.focus({ preventScroll: true });
  };

  projectCards.forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;
      openProjectModal(card);
    });
    card.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      openProjectModal(card);
    });
  });

  if (modalBackdrop) modalBackdrop.addEventListener('click', closeProjectModal);
  if (modalClose) modalClose.addEventListener('click', closeProjectModal);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
      closeProjectModal();
    }
  });


  // ---------------------------------------------------------------
  // Floating Back-to-Top Button
  // ---------------------------------------------------------------
  const backToTopBtn = document.getElementById('back-to-top');

  if (backToTopBtn) {
    window.addEventListener('scroll', () => {
      if (window.pageYOffset > 450) {
        backToTopBtn.classList.add('visible');
      } else {
        backToTopBtn.classList.remove('visible');
      }
    }, { passive: true });

    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

});
