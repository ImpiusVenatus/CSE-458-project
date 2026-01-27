/**
 * Inline script to set dark class before first paint (avoids flash).
 * Must be in <head> or at start of <body>.
 */
export function ThemeScript() {
  const script = `
    (function() {
      var k = 'money-adventure-theme';
      var s = typeof localStorage !== 'undefined' && localStorage.getItem(k);
      var d = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (s === 'dark' || (!s && d)) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    })();
  `
  return <script dangerouslySetInnerHTML={{ __html: script }} />
}
