/**
 * build_agentic_ai_proposal.js
 * ---------------------------------------------------------------
 * Builds the client-facing "Agentic AI for InTrust" proposal PDF.
 *
 *  1. Concatenates docs/proposal_src/* into one self-contained HTML
 *  2. Renders docs/intrust_agentic_ai_proposal.html -> PDF (A4, print CSS)
 *  3. Exports a PNG preview of every page for visual review
 *
 * Usage:
 *   node scripts/build_agentic_ai_proposal.js
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'docs', 'proposal_src');
const OUT_HTML = path.join(ROOT, 'docs', 'intrust_agentic_ai_proposal.html');
const OUT_PDF = path.join(ROOT, 'docs', 'INTRUST_AGENTIC_AI_PROPOSAL.pdf');
const OUT_PREV = path.join(ROOT, 'docs', 'previews', 'agentic_ai');

function concat() {
  const files = fs.readdirSync(SRC).filter((f) => /\.(html|css)$/.test(f)).sort();
  const head = files.filter((f) => f.startsWith('00_'));
  const css = files.filter((f) => f.endsWith('.css'));
  const html = files.filter((f) => f.endsWith('.html') && !f.startsWith('00_'));

  const read = (f) => fs.readFileSync(path.join(SRC, f), 'utf8');

  const out = [
    head.map(read).join('\n'),
    '<style>',
    css.map(read).join('\n'),
    '</style>',
    html.map(read).join('\n'),
  ].join('\n');

  fs.writeFileSync(OUT_HTML, out, 'utf8');
  return { out, files };
}

(async () => {
  const { files } = concat();
  console.log('• sources:', files.join(', '));
  console.log('• html   :', path.relative(ROOT, OUT_HTML));

  fs.mkdirSync(OUT_PREV, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 1300 }, deviceScaleFactor: 2 });

  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('requestfailed', (r) => errors.push('REQ FAILED ' + r.url()));

  await page.goto('file://' + OUT_HTML, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);

  // --- overflow / clipping audit -------------------------------------
  const audit = await page.evaluate(() => {
    const pages = [...document.querySelectorAll('.page')];
    return pages.map((p, i) => {
      const pr = p.getBoundingClientRect();
      const bad = [];
      p.querySelectorAll('*').forEach((el) => {
        if (el.classList.contains('pglow')) return;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        const overB = r.bottom - pr.bottom;
        const overR = r.right - pr.right;
        const overL = pr.left - r.left;
        const overT = pr.top - r.top;
        if (overB > 1.5 || overR > 1.5 || overL > 1.5 || overT > 1.5) {
          bad.push({
            sel: el.className && typeof el.className === 'string' ? el.className.slice(0, 60) : el.tagName,
            overB: +overB.toFixed(1), overR: +overR.toFixed(1), overL: +overL.toFixed(1), overT: +overT.toFixed(1),
          });
        }
      });
      return {
        page: i + 1,
        h: Math.round(pr.height),
        w: Math.round(pr.width),
        scrollH: p.scrollHeight,
        issues: bad.slice(0, 12),
      };
    });
  });

  // --- PDF -----------------------------------------------------------
  await page.pdf({
    path: OUT_PDF,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });

  // --- per page previews ---------------------------------------------
  const total = audit.length;
  const els = await page.$$('.page');
  for (let i = 0; i < els.length; i++) {
    const name = String(i + 1).padStart(2, '0') + '.png';
    await els[i].screenshot({ path: path.join(OUT_PREV, name) });
  }

  await browser.close();

  // --- report --------------------------------------------------------
  const problems = audit.filter((a) => a.issues.length);
  console.log('• pages  :', total);
  if (problems.length) {
    console.log('\n⚠ overflow report:');
    for (const p of problems) {
      console.log('  page', p.page, 'h=' + p.h);
      for (const it of p.issues) console.log('     -', it.sel, JSON.stringify(it));
    }
  } else {
    console.log('• layout : clean (no overflow)');
  }
  if (errors.length) console.log('\n⚠ page errors:\n  ' + errors.join('\n  '));
  console.log('\n✓ PDF :', path.relative(ROOT, OUT_PDF));
  console.log('✓ prev:', path.relative(ROOT, OUT_PREV) + '/01..' + String(total).padStart(2, '0') + '.png');
})();
