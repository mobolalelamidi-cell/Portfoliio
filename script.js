/* ─── Scroll Progress Bar ─────────────────────────────────────────── */
const progressBar = document.createElement('div');
progressBar.id = 'scroll-progress';
document.body.prepend(progressBar);

function updateProgress() {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
  progressBar.style.transform = `scaleX(${pct / 100})`;
}

window.addEventListener('scroll', updateProgress, { passive: true });
updateProgress();

/* ─── Reveal on Scroll (IntersectionObserver) ─────────────────────── */
// Assign stagger index per group (sibling cards/articles)
document.querySelectorAll('.skills-grid, .projects-grid, .goals-grid, .timeline, .metrics').forEach(group => {
  Array.from(group.children).forEach((child, i) => {
    child.classList.add('reveal');
    child.dataset.revealIndex = i;
  });
});

const revealElements = Array.from(document.querySelectorAll('.reveal'));

const revealObserver = new IntersectionObserver((entries, obs) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    const idx = el.dataset.revealIndex ? Number(el.dataset.revealIndex) : 0;
    // Cap delay at 400ms for large grids
    const delay = Math.min(idx * 80, 400);
    el.style.setProperty('--reveal-delay', `${delay}ms`);
    // Small stagger: slight Y offset per card for depth
    el.style.setProperty('--reveal-distance', `${20 + idx * 4}px`);
    el.classList.add('visible');
    obs.unobserve(el);
  });
}, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

revealElements.forEach(el => revealObserver.observe(el));

/* ─── Smooth Nav Scroll + Active Link ────────────────────────────── */
const navLinks = Array.from(document.querySelectorAll('nav a'));
const navTargets = navLinks
  .map(link => document.querySelector(link.getAttribute('href')))
  .filter(Boolean);

navLinks.forEach(link => {
  link.addEventListener('click', e => {
    const href = link.getAttribute('href');
    if (!href?.startsWith('#')) return;
    e.preventDefault();
    const target = document.querySelector(href);
    if (!target) return;
    // Offset for sticky header (72px)
    const top = target.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: 'smooth' });
    history.replaceState(null, '', href);
  });
});

const navObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const id = entry.target.id;
    navLinks.forEach(link =>
      link.classList.toggle('active', link.getAttribute('href') === `#${id}`)
    );
  });
}, { rootMargin: '-25% 0px -50% 0px', threshold: 0 });

navTargets.forEach(s => navObserver.observe(s));

/* ─── Theme Toggle ────────────────────────────────────────────────── */
const themeToggle = document.getElementById('theme-toggle');
const savedTheme = localStorage.getItem('portfolio-theme');
const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;

function updateThemeToggle(isLight) {
  if (!themeToggle) return;
  const icon = themeToggle.querySelector('.theme-toggle-icon');
  themeToggle.setAttribute('aria-pressed', String(isLight));
  themeToggle.setAttribute('aria-label', isLight ? 'Activer le mode sombre' : 'Activer le mode clair');
  icon.textContent = isLight ? '☾' : '☀';
}

function setTheme(theme) {
  const isLight = theme === 'light';
  document.body.classList.toggle('light-mode', isLight);
  updateThemeToggle(isLight);
}

setTheme(savedTheme || (prefersLight ? 'light' : 'dark'));

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const next = document.body.classList.contains('light-mode') ? 'dark' : 'light';
    localStorage.setItem('portfolio-theme', next);
    setTheme(next);
  });
}

/* ─── Contact Form ────────────────────────────────────────────────── */
const form = document.getElementById('contact-form');

if (form) {
  const status = document.getElementById('contact-status');
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', event => {
    event.preventDefault();
    status.textContent = '';
    status.className = '';

    const fields = {
      name: form.elements.name.value.trim(),
      email: form.elements.email.value.trim(),
      message: form.elements.message.value.trim()
    };

    ['name', 'email', 'message'].forEach(f =>
      document.getElementById(`${f}-error`).textContent = ''
    );

    let firstInvalid = null;

    if (!fields.name) {
      document.getElementById('name-error').textContent = 'Veuillez indiquer votre nom.';
      firstInvalid = firstInvalid || form.elements.name;
    }
    if (!fields.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
      document.getElementById('email-error').textContent = 'Veuillez indiquer un email valide.';
      firstInvalid = firstInvalid || form.elements.email;
    }
    if (!fields.message) {
      document.getElementById('message-error').textContent = 'Veuillez ecrire un message.';
      firstInvalid = firstInvalid || form.elements.message;
    }

    if (firstInvalid) { firstInvalid.focus(); return; }

    if (form.elements._honey.value) {
      status.className = 'success';
      status.textContent = 'Message envoye. Merci.';
      form.reset();
      return;
    }

    submitBtn.disabled = true;
    status.textContent = 'Envoi en cours...';

    fetch('https://formsubmit.co/ajax/mobolale.lamidi@gmail.com', {
      method: 'POST',
      body: new FormData(form),
      headers: { Accept: 'application/json' }
    })
      .then(r => r.json())
      .then(data => {
        if (data.success === 'Message sent') {
          status.className = 'success';
          status.textContent = 'Message envoye. Merci pour votre prise de contact.';
          form.reset();
          return;
        }
        status.className = 'error';
        status.textContent = data.message || 'Une erreur est survenue. Envoyez-moi un email directement.';
      })
      .catch(() => {
        status.className = 'error';
        status.textContent = 'Connexion indisponible. Envoyez-moi un email directement.';
      })
      .finally(() => { submitBtn.disabled = false; });
  });
}

/* ─── Parallax Hero (performant, transform-only) ─────────────────── */
(() => {
  const hero = document.getElementById('hero');
  if (!hero) return;

  const content = hero.querySelector('.hero-content');
  const visual = hero.querySelector('.hero-visual .portrait-card');
  if (!content || !visual) return;

  // Skip on reduced-motion or small screens
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.innerWidth < 680) return;

  let rafId = null;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function updateParallax() {
    rafId = null;
    const rect = hero.getBoundingClientRect();
    const viewH = window.innerHeight;
    // progress: 0 when hero top at viewport bottom, 1 when hero top at viewport top
    const progress = clamp(1 - rect.top / viewH, -0.2, 1.2);
    const contentY = (progress - 0.5) * 22;
    const visualY  = (progress - 0.5) * -28;
    content.style.transform = `translate3d(0, ${contentY}px, 0)`;
    visual.style.transform  = `translate3d(0, ${visualY}px, 0)`;
  }

  function onScroll() {
    if (rafId == null) rafId = requestAnimationFrame(updateParallax);
  }

  let enabled = false;
  const enableObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !enabled) {
        enabled = true;
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
      } else if (!entry.isIntersecting && enabled) {
        enabled = false;
        window.removeEventListener('scroll', onScroll);
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        content.style.transform = '';
        visual.style.transform  = '';
      }
    });
  }, { threshold: 0.05 });

  enableObserver.observe(hero);
})();
