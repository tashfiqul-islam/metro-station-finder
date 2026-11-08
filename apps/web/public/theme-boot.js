// Applies the saved theme before first paint (ADR-0021); key = THEME_KEY in src/theme/theme.ts.
(() => {
  const root = document.documentElement;
  try {
    const saved = localStorage.getItem("msf-theme");
    if (saved === "light" || saved === "dark") root.setAttribute("data-theme", saved);
    else root.removeAttribute("data-theme");
  } catch {
    root.removeAttribute("data-theme");
  }
})();
