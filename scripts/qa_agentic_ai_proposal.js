/**
 * qa_agentic_ai_proposal.js
 * ---------------------------------------------------------------
 * Layout + asset QA for the built proposal HTML.
 *
 *  - every <use href="#id"> resolves to a defined <symbol>
 *  - no element escapes its page bounds
 *  - reports vertical fill of each page (detects large empty gaps)
 *  - flags likely text overflow inside small containers
 *
 * Usage: node scripts/qa_agentic_ai_proposal.js
 */
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const HTML = path.join(ROOT, 'docs', 'intrust_agentic_ai_proposal.html');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 1300 } });
  const failed = [];
  page.on('requestfailed', (r) => failed.push(r.url()));
  await page.goto('file://' + HTML, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);

  const report = await page.evaluate(() => {
    const defined = new Set([...document.querySelectorAll('symbol')].map((s) => s.id));
    const used = new Set([...document.querySelectorAll('use')].map((u) => (u.getAttribute('href') || '').replace('#', '')));
    const missing = [...used].filter((id) => !defined.has(id));
    const unused = [...defined].filter((id) => !used.has(id));

    const pages = [...document.querySelectorAll('.page')];
    const metrics = pages.map((p, i) => {
      const pr = p.getBoundingClientRect();
      const foot = p.querySelector('.pfoot');
      const innerKids = [...p.querySelectorAll('.p-in > *')].filter((el) => !el.classList.contains('pfoot'));
      let contentBottom = 0;
      let escaped = [];
      innerKids.forEach((el) => {
        const r = el.getBoundingClientRect();
        contentBottom = Math.max(contentBottom, r.bottom - pr.top);
        if (r.bottom - pr.bottom > 1.5) escaped.push(el.className || el.tagName);
      });
      const footTop = foot ? foot.getBoundingClientRect().top - pr.top : pr.height;
      return {
        page: i + 1,
        gapBeforeFooter: Math.round(footTop - contentBottom),
        escaped,
      };
    });

    // text that overflows its own box (clipped or spilled)
    const textOverflow = [];
    document.querySelectorAll('.pchip, .tile, .fstep, .rrow .body, .mcard, .acard, .qstat').forEach((el) => {
      if (el.scrollHeight > el.clientHeight + 3 && el.clientHeight > 0) {
        textOverflow.push((el.className || el.tagName) + ' :: ' + (el.textContent || '').trim().slice(0, 40));
      }
    });

    return { missing, unused, metrics, textOverflow: textOverflow.slice(0, 20) };
  });

  await browser.close();

  console.log('pages          :', report.metrics.length);
  console.log('missing icons  :', report.missing.length ? report.missing : 'none');
  console.log('unused symbols :', report.unused.length ? report.unused.join(', ') : 'none');
  const esc = report.metrics.filter((m) => m.escaped.length);
  console.log('escaped content:', esc.length ? esc : 'none');
  console.log('\nvertical fill (px gap between last block and footer):');
  for (const m of report.metrics) {
    const flag = m.gapBeforeFooter > 90 ? '  <-- large gap' : '';
    console.log('  page ' + String(m.page).padStart(2, '0') + ': ' + String(m.gapBeforeFooter).padStart(4) + flag);
  }
  console.log('\ntext overflow  :', report.textOverflow.length ? report.textOverflow : 'none');
  if (failed.length) console.log('\nfailed requests:', failed);
})();
