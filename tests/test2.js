/* Structural suite: every combo renders, the page is self-contained,
   the share card is scrapeable, targets are thumb-sized, motion respects
   the user's setting. */
const { chromium } = require('playwright');
const FILE = 'file:///home/user/GameLead/index.html';
let fails = [], errs = [];
const ok = (c,m) => { if(!c) fails.push(m); return c; };

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox'] });

  /* ---------- 1. no network beyond the file itself ---------- */
  {
    const ctx = await browser.newContext({ viewport:{width:390,height:844} });
    const p = await ctx.newPage();
    const outside = [];
    p.on('request', r => { if (!r.url().startsWith('file://') && !r.url().startsWith('data:')) outside.push(r.url()); });
    p.on('pageerror', e => errs.push('PAGEERROR: '+e.message));
    p.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
    await p.goto(FILE); await p.waitForTimeout(600);
    ok(outside.length === 0, '1 the page fetched something: '+outside.join(', '));
    const ext = await p.evaluate(() => ({
      scripts: [...document.querySelectorAll('script[src]')].map(s=>s.src),
      links:   [...document.querySelectorAll('link[rel="stylesheet"]')].map(l=>l.href),
      imgs:    [...document.querySelectorAll('img')].map(i=>i.src).filter(s=>!s.startsWith('data:'))
    }));
    ok(ext.scripts.length === 0, '1 external script: '+ext.scripts.join(', '));
    ok(ext.links.length === 0,   '1 external stylesheet: '+ext.links.join(', '));
    ok(ext.imgs.length === 0,    '1 remote image: '+ext.imgs.join(', '));
    await ctx.close();
  }

  /* ---------- 2. the share card a link post depends on ---------- */
  {
    const ctx = await browser.newContext(); const p = await ctx.newPage();
    await p.goto(FILE);
    const meta = await p.evaluate(() => {
      const g = n => (document.querySelector(`meta[property="${n}"],meta[name="${n}"]`)||{}).content || '';
      return { title:g('og:title'), desc:g('og:description'), img:g('og:image'), url:g('og:url'),
               card:g('twitter:card'), pageTitle:document.title,
               pageDesc:(document.querySelector('meta[name="description"]')||{}).content||'' };
    });
    for (const k of ['title','desc','img','url','pageTitle','pageDesc'])
      ok(meta[k].length > 0, '2 missing '+k);
    ok(/^https:\/\//.test(meta.img), '2 og:image is not absolute: '+meta.img);
    ok(/^https:\/\//.test(meta.url), '2 og:url is not absolute: '+meta.url);
    ok(meta.card === 'summary_large_image', '2 twitter:card is '+meta.card);
    await ctx.close();
  }

  /* ---------- 3. every combo builds a whole sequence ---------- */
  {
    const ctx = await browser.newContext({ viewport:{width:390,height:844} }); const p = await ctx.newPage();
    p.on('pageerror', e => errs.push('PAGEERROR: '+e.message));
    await p.goto(FILE);
    const bad = await p.evaluate(() => {
      const out = [];
      const inds = Object.keys(COPY.industries), vals = Object.keys(COPY.tones), colds = Object.keys(COPY.openers);
      for (const i of inds) for (const v of vals) for (const c of colds){
        const s = buildSequence(i, v, c), tag = [i,v,c].join('/');
        for (const k of ['m1','m2a','m2b','m2c','m3','m4']){
          const t = s[k];
          if (!t || t.length < 30)          out.push(tag+' '+k+' too short');
          if (/\{[a-z]\}/.test(t.replace(/\{n\}/g,''))) out.push(tag+' '+k+' unfilled slot: '+t);
          if (/—/.test(t))                  out.push(tag+' '+k+' em dash');
          if (/\s{2,}| ,|,,|\.\./.test(t))  out.push(tag+' '+k+' spacing: '+t);
        }
        if (!/\{n\}/.test(s.m1)) out.push(tag+' m1 never says the name');
        if (!/\{n\}/.test(s.m4)) out.push(tag+' m4 never says the name');
      }
      return out;
    });
    ok(bad.length === 0, '3 combo problems ('+bad.length+'): '+bad.slice(0,6).join(' | '));

    /* and each of them renders a thread without throwing */
    const rendered = await p.evaluate(() => {
      const inds = Object.keys(COPY.industries), vals = Object.keys(COPY.tones), colds = Object.keys(COPY.openers);
      let n = 0, bad = [];
      for (const i of inds) for (const v of vals) for (const c of colds){
        S.industry=i; S.value=v; S.cold=c; S.seq=buildSequence(i,v,c);
        S.leads=[{name:'Dave',outcome:null,replyAt:null}];
        for (const o of ['booked','declined','noreply']){
          setOutcome(0,o); S.openLead=0; S.screen='thread';
          try { render(); } catch(e){ bad.push([i,v,c,o].join('/')+': '+e.message); continue; }
          const outs = document.querySelectorAll('.bubble.out').length;
          const want = o==='noreply' ? 4 : 2;
          if (outs !== want) bad.push([i,v,c,o].join('/')+' sends '+outs+' want '+want);
          if (document.body.innerText.includes('{n}')) bad.push([i,v,c,o].join('/')+' left {n} on screen');
          if (!document.body.innerText.includes('Dave')) bad.push([i,v,c,o].join('/')+' never says Dave');
          n++;
        }
      }
      return { n, bad };
    });
    ok(rendered.bad.length === 0, '3 thread render problems: '+rendered.bad.slice(0,6).join(' | '));
    ok(rendered.n === 288, '3 rendered '+rendered.n+' threads, expected 288');
    await ctx.close();
  }

  /* ---------- 4. thumb-sized targets ---------- */
  {
    const ctx = await browser.newContext({ viewport:{width:360,height:780} }); const p = await ctx.newPage();
    await p.goto(FILE);
    await p.selectOption('#f-ind','hvac'); await p.selectOption('#f-val','b2'); await p.selectOption('#f-cold','mid');
    await p.click('#go'); await p.waitForTimeout(250);
    await p.fill('#leadname','Dave'); await p.click('#addlead'); await p.waitForTimeout(250);
    const small = await p.evaluate(() => {
      const out = [];
      document.querySelectorAll('button, a.btn, select, input[type="text"]').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.width && r.height < 34) out.push((el.id||el.className||el.tagName)+' h='+Math.round(r.height));
      });
      return out;
    });
    ok(small.length === 0, '4 targets under 34px tall: '+small.join(', '));
    await ctx.close();
  }

  /* ---------- 5. reduced motion removes the animation, not the tool ---------- */
  {
    const ctx = await browser.newContext({ viewport:{width:390,height:844}, reducedMotion:'reduce' });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push('PAGEERROR: '+e.message));
    await p.goto(FILE);
    await p.selectOption('#f-ind','fitness'); await p.selectOption('#f-val','b1'); await p.selectOption('#f-cold','fresh');
    await p.click('#go'); await p.waitForTimeout(200);
    await p.fill('#leadname','Ann'); await p.click('#addlead'); await p.waitForTimeout(200);
    await p.click('[data-set="0"][data-outcome="noreply"]'); await p.waitForTimeout(200);
    await p.click('[data-lead="0"]'); await p.waitForTimeout(200);
    ok((await p.$$('.bubble.out')).length === 4, '5 reduced motion thread did not render');
    const moving = await p.evaluate(() => {
      const out = [];
      document.querySelectorAll('#app *').forEach(el => {
        const s = getComputedStyle(el);
        const d = parseFloat(s.animationDuration) + parseFloat(s.transitionDuration);
        if (d > 0.05) out.push((el.className||el.tagName)+' '+s.transitionDuration+'/'+s.animationDuration);
      });
      return out;
    });
    ok(moving.length === 0, '5 motion still running under reduce: '+moving.slice(0,4).join(', '));
    await ctx.close();
  }

  await browser.close();
  console.log(fails.length ? 'FAILS:\n' + fails.map(f=>'  - '+f).join('\n') : 'all structural tests passed');
  console.log(errs.length ? 'CONSOLE:\n' + [...new Set(errs)].map(e=>'  - '+e).join('\n') : 'no console errors');
  process.exit(fails.length || errs.length ? 1 : 0);
})();
