/* Inbox flow suite: lead entry, outcomes, threads, tally, copy-out. */
const { chromium } = require('playwright');
const FILE = 'file:///home/user/GameLead/index.html';
let fails = [], errs = [];
const ok = (c,m) => { if(!c) fails.push(m); return c; };

async function page(browser, opts={}){
  const ctx = await browser.newContext({ viewport:{width:390,height:844}, locale:'en-GB', ...opts });
  const p = await ctx.newPage();
  p.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push('PAGEERROR: '+e.message));
  await p.goto(FILE);
  return p;
}

const T = 260;
async function intro(p, ind='roofing', val='b3', cold='old'){
  await p.selectOption('#f-ind', ind);
  await p.selectOption('#f-val', val);
  await p.selectOption('#f-cold', cold);
  await p.click('#go'); await p.waitForTimeout(T);
}
async function add(p, name){
  await p.fill('#leadname', name);
  await p.click('#addlead'); await p.waitForTimeout(T);
}
async function set(p, i, outcome){
  await p.click(`[data-set="${i}"][data-outcome="${outcome}"]`); await p.waitForTimeout(T);
}
async function open(p, i){ await p.click(`[data-lead="${i}"]`); await p.waitForTimeout(T); }
const txt = (p,s) => p.$$eval(s, ns => ns.map(n => n.textContent.trim()));

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox'] });

  /* ---------- 1. intro gate ---------- */
  {
    const p = await page(browser);
    ok(await p.$eval('#go', b => b.disabled), '1 go enabled before the three answers');
    await p.selectOption('#f-ind','roofing'); await p.waitForTimeout(120);
    ok(await p.$eval('#go', b => b.disabled), '1 go enabled with only one answer');
    await intro(p);
    ok(!!(await p.$('#leadname')), '1 inbox did not open after the three answers');
    ok(!!(await p.$('.emptybox')), '1 empty inbox shows no empty-state copy');
    ok(!(await p.$('.tally')), '1 tally shown with no leads');
    await p.context().close();
  }

  /* ---------- 2. adding, rejecting, removing ---------- */
  {
    const p = await page(browser); await intro(p);

    await p.click('#addlead'); await p.waitForTimeout(T);           // empty
    ok(await p.$eval('#nameerr', n => n.classList.contains('on')), '2 empty name accepted');
    ok((await p.$$('.row')).length === 0, '2 empty name created a row');

    await add(p, '   ');                                            // whitespace only
    ok(await p.$eval('#nameerr', n => n.classList.contains('on')), '2 whitespace name accepted');
    ok((await p.$$('.row')).length === 0, '2 whitespace name created a row');

    await add(p, '  Dave   Wilson  ');                              // trims + collapses
    ok((await p.$$('.row')).length === 1, '2 valid name not added');
    ok((await txt(p,'.row-top b'))[0] === 'Dave Wilson', '2 name not trimmed/collapsed');

    await add(p, 'dave wilson');                                    // case-insensitive dupe
    ok((await p.$$('.row')).length === 1, '2 duplicate name added');
    ok(await p.$eval('#nameerr', n => n.classList.contains('on')), '2 duplicate not flagged');

    await add(p, '<img src=x onerror=alert(1)>Mia');                // markup is text
    ok((await p.$$('.row')).length === 2, '2 markup name not added');
    ok((await p.$$('.row img')).length === 0, '2 markup in a name rendered as HTML');

    await p.click('[data-remove="0"]'); await p.waitForTimeout(T);
    ok((await p.$$('.row')).length === 1, '2 remove did not delete the row');
    ok((await txt(p,'.row-top b'))[0].includes('Mia'), '2 remove deleted the wrong row');
    await p.context().close();
  }

  /* ---------- 3. the cap at ten ---------- */
  {
    const p = await page(browser); await intro(p);
    for (let i=1;i<=10;i++) await add(p, 'Lead '+i);
    ok((await p.$$('.row')).length === 10, '3 ten leads did not all land');
    ok(!(await p.$('#leadname')), '3 input still present at the cap');
    ok(!(await p.$('#addlead')), '3 add button still present at the cap');
    const full = await p.$$eval('.hint', ns => ns.map(n=>n.textContent).join(' '));
    ok(/ten|10/i.test(full), '3 no cap message at ten leads');
    await p.click('[data-remove="0"]'); await p.waitForTimeout(T);
    ok(!!(await p.$('#leadname')), '3 input did not come back after a removal');
    await p.context().close();
  }

  /* ---------- 4. each outcome renders its own thread ---------- */
  {
    const p = await page(browser); await intro(p);
    await add(p,'Ann'); await add(p,'Ben'); await add(p,'Cal');

    // Ann books -> first replier -> replies at m1: 2 sends, reply after send 1
    await set(p,0,'booked'); await open(p,0);
    let outs = await p.$$('.bubble.out'), ins = await p.$$('.bubble.in'), sil = await p.$$('.bubble.silent');
    ok(outs.length === 2, '4 m1-reply thread has '+outs.length+' sends, expected 2');
    ok(ins.length === 1, '4 m1-reply thread has '+ins.length+' replies, expected 1');
    ok(sil.length === 0, '4 m1-reply thread shows silence');
    ok((await p.$$('.tnote')).length === 2, '4 m1-reply thread notes do not match sends');
    let order = await p.$$eval('.thread > div', ns => ns.map(n=>n.className));
    ok(order.filter(c=>/bubble/.test(c)).join('|') === 'bubble out|bubble in|bubble out',
       '4 m1-reply beat order wrong: '+order.join(','));
    ok(/Booked/.test(await p.$eval('.thread-head .chip', n=>n.textContent)), '4 booked chip missing in thread');
    await p.click('#toinbox2'); await p.waitForTimeout(T);

    // Ben declines: 2 sends, reply after send 1, no silence
    await set(p,1,'declined'); await open(p,1);
    outs = await p.$$('.bubble.out'); ins = await p.$$('.bubble.in'); sil = await p.$$('.bubble.silent');
    ok(outs.length === 2, '4 declined thread has '+outs.length+' sends, expected 2');
    ok(ins.length === 1, '4 declined thread has '+ins.length+' replies, expected 1');
    ok(sil.length === 0, '4 declined thread shows silence');
    ok(/Said no/.test(await p.$eval('.thread-head .chip', n=>n.textContent)), '4 declined chip wrong');
    await p.click('#toinbox2'); await p.waitForTimeout(T);

    // Cal goes quiet: 4 sends, no reply, 3 silences
    await set(p,2,'noreply'); await open(p,2);
    outs = await p.$$('.bubble.out'); ins = await p.$$('.bubble.in'); sil = await p.$$('.bubble.silent');
    ok(outs.length === 4, '4 quiet thread has '+outs.length+' sends, expected 4');
    ok(ins.length === 0, '4 quiet thread has a reply');
    ok(sil.length === 3, '4 quiet thread has '+sil.length+' silences, expected 3');
    ok((await p.$$('.tnote')).length === 4, '4 quiet thread notes do not match sends');
    const days = await txt(p,'.daystamp');
    ok(days.join('|') === 'Day 0|Day 3|Day 7|Day 14', '4 quiet day stamps wrong: '+days.join('|'));
    await p.context().close();
  }

  /* ---------- 5. the reply point cycles across repliers ---------- */
  {
    const p = await page(browser); await intro(p);
    await add(p,'Ann'); await add(p,'Ben'); await add(p,'Cal'); await add(p,'Dee');
    for (const i of [0,1,2]) await set(p,i,'booked');
    const sends = [];
    for (const i of [0,1,2]){
      await open(p,i);
      sends.push((await p.$$('.bubble.out')).length);
      await p.click('#toinbox2'); await p.waitForTimeout(T);
    }
    ok(sends.join(',') === '2,3,5',
       '5 reply points did not cycle m1/m2c/m4 (send counts '+sends.join(',')+', expected 2,3,5)');

    // a fourth replier wraps back to m1
    await set(p,3,'booked'); await open(p,3);
    ok((await p.$$('.bubble.out')).length === 2, '5 fourth replier did not wrap to the m1 reply point');
    await p.click('#toinbox2'); await p.waitForTimeout(T);

    // clearing the first replier re-cycles the rest without breaking
    await p.click('[data-clear="0"]'); await p.waitForTimeout(T);
    ok((await p.$$('.row.unset')).length === 1, '5 change did not return the row to unset');
    ok((await p.$$('.pick')).length === 1, '5 unset row lost its three-way choice');
    await p.context().close();
  }

  /* ---------- 6. tally matches the set outcomes ---------- */
  {
    const p = await page(browser); await intro(p);
    for (const n of ['Ann','Ben','Cal','Dee','Eve']) await add(p,n);
    let t = await p.$eval('.tally-nums', n => n.textContent.replace(/\s+/g,' ').trim());
    ok(/^5 leads .*5 (not answered|to answer|left)/i.test(t) || /5/.test(t), '6 tally with none set: '+t);
    ok(!(await p.$('#tocopy')), '6 continue offered with no outcome set');

    await set(p,0,'booked'); await set(p,1,'declined');
    await set(p,2,'noreply'); await set(p,3,'noreply'); await set(p,4,'noreply');
    t = await p.$eval('.tally-nums', n => n.textContent.replace(/\s+/g,' ').trim());
    const nums = (t.match(/\d+/g)||[]).map(Number);
    ok(nums[0] === 5, '6 tally lead count wrong: '+t);
    ok(nums.slice(1).join(',') === '1,1,3', '6 tally split wrong: '+t+' (expected 1 booked, 1 no, 3 quiet)');
    ok(!!(await p.$('#tocopy')), '6 continue not offered once outcomes are set');
    await p.click('#tocopy'); await p.waitForTimeout(T);
    ok(/five leads/.test(await p.$eval('.offer h3', n => n.textContent)),
       '6 offer heading does not match five leads');
    await p.context().close();
  }

  /* ---------- 7. an all-silent run still works ---------- */
  {
    const p = await page(browser); await intro(p);
    await add(p,'Ann'); await add(p,'Ben');
    await set(p,0,'noreply'); await set(p,1,'noreply');
    ok(!!(await p.$('#tocopy')), '7 all-silent run cannot continue');
    await open(p,0);
    ok((await p.$$('.bubble.out')).length === 4, '7 all-silent thread short');
    const end = await p.$eval('.end', n => n.textContent);
    ok(end.length > 60, '7 all-silent ending is thin: '+end.slice(0,80));
    await p.context().close();
  }

  /* ---------- 8. open and close restores inbox scroll ---------- */
  {
    const p = await page(browser); await intro(p);
    for (let i=1;i<=8;i++) await add(p,'Lead '+i);
    for (let i=0;i<8;i++) await set(p,i,'noreply');
    await p.evaluate(() => window.scrollTo(0, 600)); await p.waitForTimeout(200);
    const before = await p.evaluate(() => window.pageYOffset);
    ok(before > 200, '8 page did not scroll, test is meaningless');
    await open(p,5);
    ok(await p.evaluate(() => window.pageYOffset) < 60, '8 thread did not open at the top');
    await p.click('#toinbox'); await p.waitForTimeout(400);
    const after = await p.evaluate(() => window.pageYOffset);
    ok(Math.abs(after - before) < 40, '8 inbox scroll not restored ('+before+' -> '+after+')');
    await p.context().close();
  }

  /* ---------- 9. copy-out and offer, with no email anywhere ---------- */
  {
    const p = await page(browser); await intro(p,'dental','b2','fresh');
    await add(p,'Ann'); await set(p,0,'booked');
    await p.click('#tocopy'); await p.waitForTimeout(T);
    const out = await p.$eval('#out', n => n.textContent);
    for (const m of ['MESSAGE 1','MESSAGE 2A','MESSAGE 2B','MESSAGE 2C','MESSAGE 3','MESSAGE 4'])
      ok(out.includes(m), '9 copy-out missing '+m);
    ok(out.includes('1 lead in your inbox'), '9 copy-out lead count wrong');
    ok(!/[{}]/.test(out), '9 a raw template token leaked into the pasted sequence');
    ok(out.includes('[name]'), '9 pasted sequence never tells them what to replace');
    ok(!/—/.test(out), '9 em dash in the copy-out');
    const head = await p.$eval('.offer h3', n => n.textContent);
    ok(/one lead/.test(head), '9 offer heading does not name their own count: '+head);
    ok(!!(await p.$('#book')), '9 booking CTA missing');
    const href = await p.$eval('#book', a => a.getAttribute('href'));
    ok(/^https:\/\//.test(href), '9 booking link is not absolute: '+href);

    const body = await p.$eval('body', b => b.innerText);
    ok(!/email/i.test(body), '9 the word email appears on the offer screen');
    ok((await p.$$('input[type="email"]')).length === 0, '9 an email input exists');
    ok(!/—/.test(body), '9 em dash on the offer screen');

    await p.click('#restart'); await p.waitForTimeout(T);
    ok(!!(await p.$('#f-ind')), '9 restart did not return to the intro');
    await intro(p);
    ok((await p.$$('.row')).length === 0, '9 restart kept the old leads');
    await p.context().close();
  }

  /* ---------- 10. whole-page checks at 360 and reduced motion ---------- */
  for (const w of [360, 390]){
    const p = await page(browser, { viewport:{width:w,height:844}, reducedMotion:'reduce' });
    await intro(p);
    await add(p,'Christopher Wetherby');
    await set(p,0,'booked');
    await open(p,0);
    await p.click('#toinbox2'); await p.waitForTimeout(T);
    await p.click('#tocopy'); await p.waitForTimeout(T);
    const bad = await p.evaluate(() => {
      const out = [];
      document.querySelectorAll('#app *').forEach(el => {
        let a = el.parentElement, scrolled = false;
        while (a){ const o = getComputedStyle(a).overflowX; if (o==='auto'||o==='scroll') scrolled = true; a = a.parentElement; }
        if (scrolled) return;
        const r = el.getBoundingClientRect();
        if (r.right > window.innerWidth + 1 || r.left < -1)
          out.push(el.tagName+'.'+el.className+' ['+Math.round(r.left)+','+Math.round(r.right)+']');
      });
      return { over: out.slice(0,5), doc: document.documentElement.scrollWidth, win: window.innerWidth };
    });
    ok(bad.over.length === 0, w+'px clipping: '+bad.over.join(' | '));
    ok(bad.doc <= bad.win + 1, w+'px horizontal page scroll ('+bad.doc+' > '+bad.win+')');
    await p.context().close();
  }

  await browser.close();
  console.log(fails.length ? 'FAILS:\n' + fails.map(f=>'  - '+f).join('\n') : 'all inbox tests passed');
  console.log(errs.length ? 'CONSOLE:\n' + [...new Set(errs)].map(e=>'  - '+e).join('\n') : 'no console errors');
  process.exit(fails.length || errs.length ? 1 : 0);
})();
