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
async function open(p, i){ await p.click(`[data-lead="${i}"]`); await p.waitForTimeout(T); }
async function step(p, answer){ await p.click(`[data-step="${answer}"]`); await p.waitForTimeout(T); }
// run a lead's whole conversation from the inbox and come back to it
async function run(p, i, ...answers){
  await open(p, i);
  for (const a of answers) await step(p, a);
  await p.click('#toinbox2'); await p.waitForTimeout(T);
}
const SILENT4 = ['silent','silent','silent','silent'];
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

  /* ---------- 4. a thread reveals one message at a time ---------- */
  {
    const p = await page(browser); await intro(p);
    await add(p,'Ann');
    ok((await p.$$('.row .chip')).length === 1, '4 row has no status chip');
    ok(/Not started/.test((await txt(p,'.row .chip'))[0]), '4 a fresh lead is not marked Not started');

    await open(p,0);
    // the owner must see message 1 before being asked anything
    ok((await p.$$('.bubble.out')).length === 1, '4 thread does not open on message 1 alone');
    ok((await p.$$('.bubble.in')).length === 0, '4 a reply is on screen before the owner answered');
    ok((await p.$$('.bubble.silent')).length === 0, '4 silence is on screen before the owner answered');
    ok(!!(await p.$('#decide')), '4 no question at the live end of the thread');
    ok((await p.$$('[data-step]')).length === 3, '4 the question does not offer three answers');
    ok(/Ann/.test(await p.$eval('#decide .ask', n => n.textContent)), '4 the question does not name the lead');
    ok(!(await p.$('#book-thread')), '4 the booking CTA shows before the conversation resolves');
    ok(!(await p.$('#undo')), '4 undo offered before any answer was given');
    ok(/Day 0/.test(await p.$eval('.thread-head .chip', n => n.textContent)),
       '4 the header does not say where the conversation is');

    // one answer, one more message, and the question comes back
    await step(p,'silent');
    ok((await p.$$('.bubble.out')).length === 2, '4 answering did not produce exactly one more send');
    ok((await p.$$('.bubble.silent')).length === 1, '4 the silence gap is missing');
    ok(!!(await p.$('#decide')), '4 the question did not come back after message 2c');
    ok(/Day 3/.test(await p.$eval('.thread-head .chip', n => n.textContent)), '4 header day did not advance');
    ok(!!(await p.$('#undo')), '4 undo not offered after an answer');
    const days = await txt(p,'.daystamp');
    ok(days.join('|') === 'Day 0|Day 3', '4 day stamps wrong: '+days.join('|'));

    // undo takes the last message back off
    await p.click('#undo'); await p.waitForTimeout(T);
    ok((await p.$$('.bubble.out')).length === 1, '4 undo did not remove the last send');
    ok(!(await p.$('#undo')), '4 undo still offered with an empty path');
    await p.context().close();
  }

  /* ---------- 5. every path ends where it should ---------- */
  {
    const p = await page(browser); await intro(p);
    const cases = [
      // answers,                      sends, replies, silences, ending fragment, chip
      [['yes'],                            2, 1, 0, 'whole point',      'Booked'],
      [['no'],                             2, 1, 0, 'A no is a result', 'Said no'],
      [['silent','yes'],                   3, 1, 1, 'whole point',      'Booked'],
      [['silent','no'],                    3, 1, 1, 'A no is a result', 'Said no'],
      [['silent','silent','yes'],          4, 1, 2, 'never send',       'Booked'],
      [['silent','silent','silent','yes'], 5, 1, 3, 'never send',       'Booked'],
      [SILENT4,                            4, 0, 3, 'still gained',     'No reply']
    ];
    for (let c = 0; c < cases.length; c++){
      const [answers, sends, replies, silences, ending, chip] = cases[c];
      const tag = '5 ['+answers.join(',')+']';
      await add(p, 'Lead '+c);
      await open(p, c);
      for (const a of answers) await step(p, a);

      ok((await p.$$('.bubble.out')).length === sends,
         tag+' sends '+(await p.$$('.bubble.out')).length+', expected '+sends);
      ok((await p.$$('.bubble.in')).length === replies, tag+' reply count wrong');
      ok((await p.$$('.bubble.silent')).length === silences, tag+' silence count wrong');
      ok((await p.$$('.tnote')).length === sends, tag+' a send is missing its teaching note');
      ok(!(await p.$('[data-step]')), tag+' still asking after the conversation ended');
      const end = await p.$eval('.thread-end', n => n.textContent);
      ok(end.includes(ending), tag+' wrong ending: '+end.slice(0,70));
      // the ask sits at the bottom of the conversation it just earned
      ok(!!(await p.$('#book-thread')), tag+' no booking CTA at the end of the thread');
      const href = await p.$eval('#book-thread', a => a.getAttribute('href'));
      ok(/^https:\/\//.test(href), tag+' thread CTA link is not absolute: '+href);
      ok(new RegExp(chip).test(await p.$eval('.thread-head .chip', n => n.textContent)),
         tag+' header chip is not '+chip);

      await p.click('#toinbox2'); await p.waitForTimeout(T);
      ok(new RegExp(chip).test((await txt(p,'.row .chip'))[c]), tag+' inbox chip is not '+chip);
    }
    await p.context().close();
  }

  /* ---------- 6. tally counts what the owner actually ran ---------- */
  {
    const p = await page(browser); await intro(p);
    for (const n of ['Ann','Ben','Cal','Dee','Eve']) await add(p,n);
    let t = await p.$eval('.tally-nums', n => n.textContent.replace(/\s+/g,' ').trim());
    ok(/5 leads/.test(t) && /5 not started/.test(t), '6 tally with nothing run: '+t);
    ok(!(await p.$('#tocopy')), '6 continue offered before any conversation ran');

    // a half-run lead counts as mid sequence, not as an outcome
    await open(p,0); await step(p,'silent');
    await p.click('#toinbox'); await p.waitForTimeout(T);
    t = await p.$eval('.tally-nums', n => n.textContent.replace(/\s+/g,' ').trim());
    ok(/1 mid sequence/.test(t), '6 a half-run lead is not counted as mid sequence: '+t);
    ok(!(await p.$('#tocopy')), '6 continue offered on a half-run conversation');

    await run(p,0,'silent','yes');          // Ann finishes: booked
    await run(p,1,'no');                    // Ben: said no
    await run(p,2,...SILENT4);              // Cal, Dee, Eve: no reply
    await run(p,3,...SILENT4);
    await run(p,4,...SILENT4);
    t = await p.$eval('.tally-nums', n => n.textContent.replace(/\s+/g,' ').trim());
    const nums = (t.match(/\d+/g)||[]).map(Number);
    ok(nums[0] === 5, '6 tally lead count wrong: '+t);
    ok(nums.slice(1).join(',') === '1,1,3', '6 tally split wrong: '+t+' (expected 1 booked, 1 no, 3 quiet)');
    ok(!!(await p.$('#tocopy')), '6 continue not offered once a conversation finished');
    await p.context().close();
  }

  /* ---------- 7. an all-silent run still works ---------- */
  {
    const p = await page(browser); await intro(p);
    await add(p,'Ann'); await add(p,'Ben');
    await run(p,0,...SILENT4); await run(p,1,...SILENT4);
    ok(!!(await p.$('#tocopy')), '7 all-silent run cannot continue');
    await open(p,0);
    ok((await p.$$('.bubble.out')).length === 4, '7 all-silent thread short');
    const end = await p.$eval('.thread-end', n => n.textContent);
    ok(end.length > 60, '7 all-silent ending is thin: '+end.slice(0,80));
    // and it can be run again from scratch
    await p.click('#reset'); await p.waitForTimeout(T);
    ok((await p.$$('.bubble.out')).length === 1, '7 restart did not take the thread back to message 1');
    ok(!!(await p.$('[data-step]')), '7 restart left no question to answer');
    await p.context().close();
  }

  /* ---------- 8. open and close restores inbox scroll ---------- */
  {
    const p = await page(browser); await intro(p);
    for (let i=1;i<=8;i++) await add(p,'Lead '+i);
    for (let i=0;i<8;i++) await run(p,i,...SILENT4);
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
    await add(p,'Ann'); await run(p,0,'yes');
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
    await open(p,0);
    await step(p,'silent'); await step(p,'silent'); await step(p,'silent'); await step(p,'yes');
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
