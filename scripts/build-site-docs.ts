import * as path from "node:path";
import { marked, Renderer } from "marked";

const rootDir = path.resolve(import.meta.dir, "..");
const sourcePath = path.join(rootDir, "docs/scidekick-user-guide.md");
const outputPath = path.join(rootDir, "site/docs/index.html");

function slugify(value: string): string {
	return value
		.toLowerCase()
		.replace(/<[^>]+>/g, "")
		.replace(/&[^;]+;/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

const renderer = new Renderer();
renderer.heading = ({ tokens, depth }) => {
	const html = renderer.parser.parseInline(tokens);
	const id = slugify(html);
	return `<h${depth} id="${id}">${html}</h${depth}>\n`;
};

const markdown = await Bun.file(sourcePath).text();
const body = marked.parse(markdown, {
	async: false,
	gfm: true,
	renderer,
});

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="color-scheme" content="light">
<meta name="theme-color" content="#ffffff">
<title>Scidekick User Guide</title>
<meta name="description" content="User documentation for Scidekick: install, models, coding tools, research wiki, journal, skills, and a simple Iris ML research tutorial.">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%230b0a14'/%3E%3Ctext x='32' y='44' text-anchor='middle' font-size='36' fill='%237b8f45'%3E%E2%97%89%3C/text%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
*, *::before, *::after { box-sizing: border-box; }
:root {
	--bg: #ffffff;
	--paper: #ffffff;
	--ink: #111111;
	--muted: #626262;
	--line: #d4d4cc;
	--soft: #f5f5f3;
	--accent: #7b8f45;
	--accent-dim: #5c6e30;
	--font-sans: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
	--font-mono: 'IBM Plex Mono', Menlo, Consolas, monospace;
}
html { background: var(--bg); color: var(--ink); font-family: var(--font-sans); line-height: 1.6; -webkit-font-smoothing: antialiased; scroll-behavior: smooth; }
body { margin: 0; min-height: 100vh; }
a { color: var(--accent); text-decoration: none; }
a:hover { color: var(--ink); }
nav { position: sticky; top: 0; z-index: 10; background: rgba(255,255,255,0.92); backdrop-filter: blur(12px) saturate(180%); border-bottom: 1px solid var(--line); }
.nav-inner { max-width: 1160px; margin: 0 auto; padding: 14px 24px; display: flex; align-items: center; justify-content: space-between; gap: 24px; }
.nav-brand { display: inline-flex; align-items: center; gap: 8px; font-weight: 700; color: var(--ink); }
.glyph { color: var(--accent); }
.nav-links { display: flex; gap: 20px; align-items: center; font-family: var(--font-mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.16em; }
.nav-links a { color: var(--muted); }
.nav-links a:hover { color: var(--ink); }
.hero { border-bottom: 1px solid var(--line); background-image: linear-gradient(rgba(212,212,204,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(212,212,204,0.5) 1px, transparent 1px); background-size: 48px 48px; }
.hero-inner { max-width: 1160px; margin: 0 auto; padding: 72px 24px 56px; background: radial-gradient(ellipse 80% 70% at 50% 0%, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.82) 58%, transparent 100%); }
.eyebrow { display: inline-flex; align-items: center; gap: 8px; border: 1px solid var(--line); border-radius: 999px; padding: 6px 12px; font-family: var(--font-mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.16em; color: var(--muted); margin-bottom: 22px; background: #fff; }
h1 { margin: 0 0 18px; font-size: clamp(2.5rem, 1.4rem + 4vw, 5.5rem); line-height: 0.96; letter-spacing: -0.045em; text-transform: uppercase; max-width: 10ch; }
.hero p { max-width: 56ch; color: var(--muted); font-size: 1.08rem; margin: 0; }
.layout { max-width: 1160px; margin: 0 auto; padding: 42px 24px 80px; display: grid; grid-template-columns: minmax(0, 1fr); gap: 36px; }
@media (min-width: 980px) { .layout { grid-template-columns: 260px minmax(0, 1fr); align-items: start; } }
.toc { position: sticky; top: 74px; border: 1px solid var(--line); background: var(--soft); padding: 18px; font-family: var(--font-mono); font-size: 12px; }
.toc-title { text-transform: uppercase; letter-spacing: 0.18em; color: var(--muted); font-size: 10px; margin-bottom: 10px; }
.toc a { display: block; color: var(--muted); padding: 5px 0; }
.toc a:hover { color: var(--ink); }
article { min-width: 0; }
article > *:first-child { margin-top: 0; }
article h1 { display: none; }
article h2 { margin: 44px 0 14px; padding-top: 10px; border-top: 1px solid var(--line); font-size: clamp(1.6rem, 1.1rem + 1.5vw, 2.6rem); line-height: 1.05; letter-spacing: -0.03em; }
article h3 { margin: 30px 0 10px; font-size: 1.15rem; letter-spacing: -0.01em; }
article p, article li { color: var(--muted); }
article strong { color: var(--ink); }
article blockquote { margin: 24px 0; padding: 16px 18px; border-left: 4px solid var(--accent); background: var(--soft); }
article ul, article ol { padding-left: 1.4rem; }
article li + li { margin-top: 4px; }
article code { font-family: var(--font-mono); font-size: 0.9em; background: var(--soft); border: 1px solid var(--line); border-radius: 4px; padding: 0.08em 0.28em; color: var(--ink); }
article pre { overflow-x: auto; background: #111111; color: #f5f5f3; border-radius: 10px; padding: 18px; border: 1px solid #222; line-height: 1.55; }
article pre code { background: transparent; border: 0; color: inherit; padding: 0; }
article table { width: 100%; border-collapse: collapse; margin: 22px 0; font-size: 0.95rem; }
article th, article td { border: 1px solid var(--line); padding: 9px 11px; vertical-align: top; }
article th { background: var(--soft); color: var(--ink); text-align: left; }
footer { border-top: 1px solid var(--line); padding: 28px 24px; color: var(--muted); font-family: var(--font-mono); font-size: 12px; }
.footer-inner { max-width: 1160px; margin: 0 auto; display: flex; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
</style>
</head>
<body>
<nav>
	<div class="nav-inner">
		<a href="../" class="nav-brand"><span class="glyph">◉</span> Scidekick</a>
		<div class="nav-links">
			<a href="../#wiki">Wiki</a>
			<a href="../#skills">Skills</a>
			<a href="../#platform">Platform</a>
			<a href="https://github.com/felippe-alves/scidekick">GitHub ↗</a>
		</div>
	</div>
</nav>
<header class="hero">
	<div class="hero-inner">
		<div class="eyebrow"><span class="glyph">◉</span> User documentation</div>
		<h1>Use Scidekick</h1>
		<p>Install it, configure models, use the inherited Pi and Oh My Pi coding-agent features, and run a small Iris dataset research workflow with the Scidekick wiki and journal.</p>
	</div>
</header>
<main class="layout">
	<aside class="toc">
		<div class="toc-title">Guide</div>
		<a href="#1-mental-model">Mental model</a>
		<a href="#2-install-and-start">Install</a>
		<a href="#4-everyday-coding-features">Coding features</a>
		<a href="#5-research-features-available-today">Research features</a>
		<a href="#7-tutorial-simple-ml-research-on-the-iris-dataset">Iris tutorial</a>
		<a href="#10-where-to-go-next">Next steps</a>
	</aside>
	<article>
${body}
	</article>
</main>
<footer>
	<div class="footer-inner">
		<span>◉ Scidekick</span>
		<span><a href="https://github.com/felippe-alves/scidekick/blob/main/docs/scidekick-user-guide.md">Edit this page on GitHub</a></span>
	</div>
</footer>
</body>
</html>
`;

await Bun.write(outputPath, page);
console.log(`Built ${path.relative(rootDir, outputPath)} from ${path.relative(rootDir, sourcePath)}`);
