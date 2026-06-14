(function () {
  const FOOTER_ITEMS = [
    { key: "home", label: "Home", icon: "home", href: "index.html" },
    { key: "garden", label: "Garden", icon: "local_florist", href: "garden.html" },
    { key: "library", label: "Library", icon: "menu_book", href: "library.html" },
    { key: "profile", label: "Profile", icon: "person", href: "profile.html" }
  ];

  function renderFooter(options = {}) {
    const { mountId = "app-footer", active = "home" } = options;
    const mountNode = document.getElementById(mountId);

    if (!mountNode) {
      return;
    }

    mountNode.className = "pg-footer";
    mountNode.setAttribute("aria-label", "Primary");

    mountNode.innerHTML = FOOTER_ITEMS.map((item) => {
      const isActive = item.key === active;
      return `
        <a class="pg-footer-item${isActive ? " active" : ""}" href="${item.href}" ${isActive ? 'aria-current="page"' : ""}>
          <span class="material-symbols-outlined">${item.icon}</span>
          <span class="pg-footer-label">${item.label}</span>
        </a>
      `;
    }).join("");
  }

  window.renderFooter = renderFooter;
})();
