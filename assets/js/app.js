
function GT_applyRtlTweaks() {
  const isRtl = document.documentElement.getAttribute("dir") === "rtl";
  const navUl = document.querySelector(".navbar-nav.flex-row.align-items-center");
  if (navUl) {
    // In RTL we want the lang/profile group to move to the LEFT side
    navUl.classList.toggle("ms-auto", !isRtl);
    navUl.classList.toggle("me-auto", isRtl);
  }
}

// Main.js binds menu togglers on initial DOM load, but our topbar/sidebar are injected
// dynamically (partials). This helper re-binds the click handlers after layout boot.
function GT_bindMenuToggles() {
  const toggles = document.querySelectorAll('.layout-menu-toggle');
  toggles.forEach(el => {
    if (el.dataset.gtMenuBound === '1') return;
    el.dataset.gtMenuBound = '1';
    el.addEventListener('click', (e) => {
      e.preventDefault();
      try {
        if (window.Helpers && typeof window.Helpers.toggleCollapsed === 'function') {
          window.Helpers.toggleCollapsed();
        }
      } catch (err) {
        // no-op
      }
    });
  });
}

async function GT_bootAppLayout() {
  await GT_include("#gtSidebarHost", "partials/sidebar.html");
  await GT_include("#gtTopbarHost", "partials/topbar.html");
  await GT_include("#gtFooterHost", "partials/footer.html");

  // Re-init Sneat menu after sidebar load
  if (window.Menu) {
    const menuEl = document.querySelector("#layout-menu");
    if (menuEl) new Menu(menuEl, { orientation: "vertical", closeChildren: false });
  }

  // set active menu
  const path = window.location.pathname.split("/").pop() || "dashboard.html";
  document.querySelectorAll(".menu-link").forEach(a => {
    const href = a.getAttribute("href");
    if (href === path) a.closest(".menu-item")?.classList.add("active");
  });

  // profile
  const s = GT_auth.getSession();
  const nameEl = document.querySelector("[data-gt='userName']");
  const roleEl = document.querySelector("[data-gt='userRole']");
  if (s?.user) {
    if (nameEl) nameEl.textContent = s.user.name || s.user.email;
    if (roleEl) roleEl.textContent = s.user.role || "";
  }

  GT_applyRtlTweaks();

  // Ensure menu toggle works on mobile after partials injection
  GT_bindMenuToggles();

  // logout
  document.querySelectorAll("[data-gt-action='logout']").forEach(btn => {
    btn.addEventListener("click", () => { GT_auth.clear(); window.location.href = "login.html"; });
  });

  // language switch
  document.querySelectorAll("[data-gt-lang]").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      await GT_i18n.load(btn.getAttribute("data-gt-lang"));
      // reapply i18n on whole doc
      GT_i18n.apply(document);
      GT_applyRtlTweaks();
      window.dispatchEvent(new CustomEvent('gt:langChanged'));
    });
  });
}