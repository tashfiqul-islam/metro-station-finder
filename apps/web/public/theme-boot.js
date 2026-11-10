// Theme and theme-color before first paint (ADR-0021); key as THEME_KEY.
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
  const c = document.querySelector(`meta[data-scheme=${theme}]`)?.getAttribute("content");
  if (c)
    for (const t of document.querySelectorAll("meta[name=theme-color]"))
      t.setAttribute("content", c);
})();
