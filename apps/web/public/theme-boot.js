// Applies the saved theme before first paint (classic same-origin script in <head>; ADR-0021).
// Key = THEME_KEY in src/theme/theme.ts. light/dark set data-theme; anything else removes it.
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
