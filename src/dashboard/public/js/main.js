// ─── Settings Panel Tab Navigation ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Sidebar tab switching
  const sidebarItems = document.querySelectorAll('.sidebar-item[data-panel]');
  const panels = document.querySelectorAll('.settings-panel');

  sidebarItems.forEach(item => {
    item.addEventListener('click', () => {
      const target = item.dataset.panel;

      sidebarItems.forEach(i => i.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      item.classList.add('active');
      const panel = document.getElementById(target);
      if (panel) panel.classList.add('active');
    });
  });

  // ─── Save alert auto-dismiss ─────────────────────────────────────────────
  const saveAlert = document.getElementById('save-alert');
  if (saveAlert) {
    setTimeout(() => {
      saveAlert.style.opacity = '0';
      saveAlert.style.transform = 'translateX(20px)';
      saveAlert.style.transition = 'all 0.4s ease';
      setTimeout(() => saveAlert.remove(), 400);
    }, 3500);
  }

  // ─── Animated Stats Counter ───────────────────────────────────────────────
  const statValues = document.querySelectorAll('.stat-value[data-count]');
  statValues.forEach(el => {
    const target = parseInt(el.dataset.count, 10);
    let current = 0;
    const step = Math.ceil(target / 50);
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = current.toLocaleString();
      if (current >= target) clearInterval(timer);
    }, 25);
  });

  // ─── Confirm dangerous actions ────────────────────────────────────────────
  document.querySelectorAll('[data-confirm]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (!confirm(btn.dataset.confirm)) e.preventDefault();
    });
  });

  // ─── Settings form: unsaved changes warning ────────────────────────────────
  const settingsForm = document.getElementById('settings-form');
  if (settingsForm) {
    let formChanged = false;
    settingsForm.addEventListener('change', () => { formChanged = true; });
    window.addEventListener('beforeunload', (e) => {
      if (formChanged) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
    settingsForm.addEventListener('submit', () => { formChanged = false; });
  }
});
