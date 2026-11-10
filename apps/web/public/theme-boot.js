// Theme and theme-color before first paint (ADR-0021, METRO-119); key = THEME_KEY in theme.ts.
(() => {
  const root = document.documentElement;
  let theme = "";
  try {
    theme = localStorage.getItem("msf-theme") ?? "";
  } catch {
    // System
  }
  if (theme !== "light" && theme !== "dark") {
    root.removeAttribute("data-theme");
    return;
  }
  root.setAttribute("data-theme", theme);
  const c = document.querySelector(`meta[media*=${theme}]`)?.getAttribute("content") ?? "";
  for (const t of document.querySelectorAll("meta[name=theme-color]")) t.setAttribute("content", c);
})();
