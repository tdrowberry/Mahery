// Public-folder assets (art, audio) are referenced by root-relative path
// throughout the game data files, but Vite only rewrites paths it can see
// statically (import statements, index.html, CSS url()) -- not raw strings
// built at runtime. Wrap every such path with this so it still resolves
// once the site is built for a subpath, e.g. GitHub Pages project pages
// (https://tdrowberry.github.io/Mahery/), not just the site root.
export function asset(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
}
