#!/usr/bin/env python3
"""
NutriSync — one-command re-integration of the "here-only" layer onto a fresh
Design export. Re-applies: error-overlay hide, consent banner, admin live-KPI
wiring, mobile i18n keys, the Translations review page + hub nav pill, and the
current hub documentation. Idempotent — safe to re-run.

USAGE (from the web repo root, after dropping in a fresh Design `publish/`):
    python3 integrate.py

Assets it needs live next to it in ./_integration/ :
    _integration/translations.html   the founder Translations review page
    _integration/docs/*.html         the current hub documentation to overlay
    _integration/mob_keys.json       {"en":{...},"es":{...}} mobile i18n additions
"""
# ---------------------------------------------------------------------------
# WEB → MOBILE crossover rule (what to also do to the native app per web pack):
#   Design packs are WEB-ONLY (no mobile code). For each pack, check:
#     • Marketing footer / hero / web-app chrome  -> web-only, mobile untouched
#     • Wording in the shared i18n `app` section   -> re-sync into mobile bundle
#     • Brand tokens (phase colours, brand orange)  -> apply to mobile theme.ts
#     • A new product screen/feature in the design  -> build natively in the RN app
#   Only touch the mobile app (and ship nutrisync-app-full.zip OTA) when something
#   actually crosses over. Full rule + log: hub docs -> "Change Log — Web & App".
# ---------------------------------------------------------------------------
import os, re, json, shutil, sys

ROOT   = os.path.dirname(os.path.abspath(__file__))
PUB    = os.path.join(ROOT, "publish")
ASSETS = os.path.join(ROOT, "_integration")
if not os.path.isdir(PUB):
    sys.exit("No ./publish next to this script. Run from the web repo root.")

ERRHIDE = '<style id="ns-err-hide">#__bundler_err{display:none!important}</style>'
CONSENT = r'''<style id="ns-consent-css">
#ns-consent{position:fixed;left:16px;right:16px;bottom:16px;z-index:99998;background:#fff;border:1px solid #EADFD5;border-radius:16px;box-shadow:0 20px 50px -20px rgba(0,0,0,.35);padding:18px 20px;max-width:640px;margin:0 auto;font-family:'Inter',system-ui,sans-serif;color:#241D1A}
#ns-consent h4{margin:0 0 6px;font-size:15px;font-weight:800}#ns-consent p{margin:0 0 12px;font-size:13px;color:#736862;line-height:1.5}
#ns-consent .row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}#ns-consent button{border:none;border-radius:24px;padding:10px 18px;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit}
#ns-consent .accept{background:linear-gradient(135deg,#E8472A,#F4876F);color:#fff}#ns-consent .reject{background:#F3EBE4;color:#241D1A}#ns-consent .prefs{background:none;color:#C73A20;text-decoration:underline;padding:10px 6px}
#ns-consent .opts{margin:6px 0 12px;display:none}#ns-consent .opt{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 0;border-top:1px solid #F0E7DF;font-size:13px}#ns-consent .opt small{color:#736862;display:block;font-size:11.5px}
</style>
<script id="ns-consent-js">(function(){var KEY="nutrisync.consent.v1";
function have(){try{return JSON.parse(localStorage.getItem(KEY));}catch(e){return null;}}
function save(c){c.ts=new Date().toISOString();c.version=1;try{localStorage.setItem(KEY,JSON.stringify(c));}catch(e){}window.__nsConsent=c;var b=document.getElementById("ns-consent");if(b)b.remove();}
function build(){if(have()){window.__nsConsent=have();return;}var d=document.createElement("div");d.id="ns-consent";
d.innerHTML='<h4>Your privacy</h4><p>We use essential cookies to run NutriSync. Optional analytics &amp; personalization help us improve - they are <b>off by default</b>.</p>'
+'<div class="opts" id="ns-opts"><div class="opt"><span>Essential<small>Required for the app to work</small></span><span>Always on</span></div>'
+'<div class="opt"><span>Analytics<small>Anonymous usage to fix bugs</small></span><input type="checkbox" id="ns-an"></div>'
+'<div class="opt"><span>Personalization<small>Tailors tips to your patterns</small></span><input type="checkbox" id="ns-pe"></div></div>'
+'<div class="row"><button class="accept" id="ns-accept">Accept all</button><button class="reject" id="ns-reject">Reject non-essential</button><button class="prefs" id="ns-prefs">Preferences</button></div>';
document.body.appendChild(d);
document.getElementById("ns-accept").onclick=function(){save({essential:true,analytics:true,personalization:true});};
document.getElementById("ns-reject").onclick=function(){save({essential:true,analytics:false,personalization:false});};
document.getElementById("ns-prefs").onclick=function(){var o=document.getElementById("ns-opts");if(o.style.display==="block"){save({essential:true,analytics:document.getElementById("ns-an").checked,personalization:document.getElementById("ns-pe").checked});}else{o.style.display="block";this.textContent="Save preferences";}};}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",build);else build();})();</script>'''

for f in ("index.html", "app.html"):
    p = os.path.join(PUB, f)
    if not os.path.exists(p): continue
    s = open(p, encoding="utf-8", errors="ignore").read(); add = ""
    if "ns-err-hide" not in s: add += ERRHIDE
    if "ns-consent-css" not in s: add += CONSENT
    if add:
        open(p, "w", encoding="utf-8").write(s.replace("</head>", add + "</head>", 1)); print("- consent/error-hide:", f)

# admin live-KPI wiring
app = open(os.path.join(PUB, "app.html"), encoding="utf-8").read()
URL = re.search(r"https://[a-z0-9]+\.supabase\.co", app).group(0)
KEY = re.search(r"sb_publishable_[^'\"]+", app).group(0)

# marketing waitlist + newsletter capture -> public.waitlist (index.html only).
# Compiled-bundle handlers ({{ onEmail }}/{{ subscribeNl }}) are not rewireable
# from outside, so we delegate on document (capture phase, survives re-renders):
# on any button click, grab the sibling <input>'s email and POST it via PostgREST
# with the public anon key (RLS "anyone can join waitlist" insert policy allows it).
idx = os.path.join(PUB, "index.html")
if os.path.exists(idx):
    ih = open(idx, encoding="utf-8").read()
    if "ns-waitlist-js" not in ih:
        WL = ('<script id="ns-waitlist-js">(function(){var U="__U__",K="__K__";'
          'function v(e){return /^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(e);}'
          'function toast(m){var t=document.createElement("div");t.textContent=m;'
          't.style.cssText="position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:99999;'
          'background:#241D1A;color:#fff;font-family:\'Inter\',system-ui,sans-serif;font-size:13.5px;'
          'font-weight:600;padding:11px 18px;border-radius:24px;box-shadow:0 14px 30px -12px rgba(0,0,0,.5);'
          'opacity:0;transition:opacity .25s";document.body.appendChild(t);'
          'requestAnimationFrame(function(){t.style.opacity="1";});'
          'setTimeout(function(){t.style.opacity="0";setTimeout(function(){t.remove();},300);},2600);}'
          'document.addEventListener("click",function(e){'
          'var btn=e.target.closest&&e.target.closest("button,[role=button]");if(!btn)return;'
          'var input=null,node=btn,i;for(i=0;i<4&&node;i++){node=node.parentElement;'
          'if(node){input=node.querySelector("input");if(input)break;}}'
          'if(!input)return;var email=(input.value||"").trim().toLowerCase();if(!v(email))return;'
          'if(btn.__nsSent===email)return;btn.__nsSent=email;'
          'var src=/you@email\\.com/.test(input.placeholder||"")?"newsletter":"marketing_site";'
          'fetch(U+"/rest/v1/waitlist",{method:"POST",headers:{"apikey":K,"Authorization":"Bearer "+K,'
          '"Content-Type":"application/json","Prefer":"return=minimal"},'
          'body:JSON.stringify({email:email,source:src})}).then(function(r){'
          'if(r.status===201){toast("You\'re on the list \\u2713");}'
          'else if(r.status===409){toast("You\'re already subscribed \\u2713");}'
          'else{btn.__nsSent=null;}}).catch(function(){btn.__nsSent=null;});},true);})();</script>')
        WL = WL.replace("__U__", URL).replace("__K__", KEY)
        open(idx, "w", encoding="utf-8").write(ih.replace("</head>", WL + "</head>", 1))
        print("- marketing waitlist/newsletter capture (index.html)")

# Builders room "Founder Tools" header row (Waitlist / Translations / Change Log).
# These are TOOLS, not documents, so they belong at the room-header level, not inside
# the Documentation tab. The compiled bundle's room tabs (Overview/Documentation/
# Admin·MIS/Backlog) aren't rewireable, so we inject a card row right under the
# Builders tab bar (anchored via the unique "Admin · MIS" button) and keep it in
# place across the bundle's re-renders with a MutationObserver.
if os.path.exists(idx):
    ih = open(idx, encoding="utf-8").read()
    if "ns-founder-tools" not in ih:
        FT = ('<script id="ns-founder-tools">(function(){'
          'var C=[{h:"hub/waitlist.html",e:"\\uD83D\\uDCCB",t:"Waitlist",d:"Signups + CSV export",'
          'bg:"linear-gradient(135deg,#0FA968,#12C07A)"},'
          '{h:"hub/review.html",e:"\\u2705",t:"Review",d:"Founders\\u2019 checklist",'
          'bg:"linear-gradient(135deg,#B7791F,#D69E2E)"},'
          '{h:"hub/translations.html",e:"\\uD83C\\uDF10",t:"Translations",d:"14-language review",'
          'bg:"linear-gradient(135deg,#E8472A,#F4876F)"},'
          '{h:"hub/documentation/08-Change-Log.html",e:"\\uD83E\\uDDFE",t:"Change Log",'
          'd:"Web & app changes",bg:"#241D1A"}];'
          'function card(x){return \'<a href="\'+x.h+\'" style="flex:1;min-width:150px;'
          'display:flex;align-items:center;gap:10px;text-decoration:none;background:\'+x.bg+\';color:#fff;'
          'border-radius:14px;padding:13px 15px;box-shadow:0 12px 26px -16px rgba(0,0,0,.5)">'
          '<span style="font-size:20px">\'+x.e+\'</span><span><span style="font-weight:800;font-size:14px;'
          'display:block">\'+x.t+\'</span><span style="font-size:11.5px;opacity:.92">\'+x.d+\'</span></span></a>\';}'
          'function build(){if(document.getElementById("ns-ft-row"))return;'
          'var bs=document.querySelectorAll("button"),mis=null,i;'
          'for(i=0;i<bs.length;i++){if(/Admin\\s*[\\u00B7.]\\s*MIS/.test(bs[i].textContent||"")){mis=bs[i];break;}}'
          'if(!mis)return;var bar=mis.parentElement;if(!bar||!bar.parentElement)return;'
          'var row=document.createElement("div");row.id="ns-ft-row";row.style.cssText="margin:14px 0 6px";'
          'row.innerHTML=\'<div style="font-size:12px;letter-spacing:.14em;font-weight:700;color:#E8472A;'
          'margin:0 0 10px">FOUNDER TOOLS</div><div style="display:flex;gap:12px;flex-wrap:wrap">\''
          '+C.map(card).join("")+\'</div>\';bar.parentElement.insertBefore(row,bar.nextSibling);}'
          'var o=new MutationObserver(function(){build();});'
          'function start(){build();o.observe(document.body,{childList:true,subtree:true});}'
          'if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();'
          '})();</script>')
        open(idx, "w", encoding="utf-8").write(ih.replace("</head>", FT + "</head>", 1))
        print("- Builders 'Founder Tools' header row (index.html)")

# Web app → "Back to site" exit. The compiled app.html has no route back to the
# marketing site (index.html). We inject a small persistent link (kept in place with
# a MutationObserver) — it just navigates to the sibling index.html, no bundle rewire.
ap = os.path.join(PUB, "app.html")
if os.path.exists(ap):
    ap_s = open(ap, encoding="utf-8").read()
    # Only inject the stopgap if Design's export has no native "Back to site" control.
    # (Design added native exits in the 0607v02.53 pack, so this now no-ops.)
    if "ns-exit-site" not in ap_s and "Back to site" not in ap_s:
        EX = ('<script id="ns-exit-site">(function(){'
          'function add(){if(document.getElementById("ns-exit-btn"))return;'
          'var a=document.createElement("a");a.id="ns-exit-btn";a.href="index.html";'
          'a.title="Back to the NutriSync marketing site";a.innerHTML="\\u2190\\u00A0Back to site";'
          'a.style.cssText="position:fixed;top:12px;right:14px;z-index:2147483000;'
          'background:#EA5740;color:#fff;font-family:\'Inter\',system-ui,sans-serif;'
          'font-size:14px;font-weight:800;text-decoration:none;padding:10px 17px;border-radius:24px;'
          'box-shadow:0 8px 22px -8px rgba(0,0,0,.55);border:2px solid #fff;line-height:1;white-space:nowrap";'
          'document.body.appendChild(a);}'
          'var o=new MutationObserver(function(){add();});'
          'function start(){add();o.observe(document.body,{childList:true});}'
          'if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();'
          '})();</script>')
        open(ap, "w", encoding="utf-8").write(ap_s.replace("</head>", EX + "</head>", 1))
        print("- Web app 'Back to site' exit link (app.html)")

# The site is public — strip the "Demo access — use code 123456" hint from the
# hub gates (the 123456 code still works; it's just no longer advertised on-screen).
if os.path.exists(idx):
    ih = open(idx, encoding="utf-8").read()
    new = re.sub(r'Demo access[\s\S]{0,240}?use code 123456<\\u002Fbutton>', '', ih)
    new = re.sub(r'Demo access[\s\S]{0,240}?use code 123456</button>', '', new)
    if new != ih:
        open(idx, "w", encoding="utf-8").write(new); print("- removed public demo-code hint")

adm = os.path.join(PUB, "hub", "admin-mis-console.html")
if os.path.exists(adm):
    h = open(adm, encoding="utf-8").read()
    if "admin_kpis" not in h:
        h = h.replace('<div class="lab">Total users</div><div class="val">12,480</div>', '<div class="lab">Total users</div><div class="val" id="kTotal">12,480</div>')
        h = h.replace('<div class="lab">DAU</div><div class="val" style="font-size:22px;">3,210</div>', '<div class="lab">DAU</div><div class="val" style="font-size:22px;" id="kDau">3,210</div>')
        h = h.replace('<div class="lab">WAU</div><div class="val" style="font-size:22px;">8,940</div>', '<div class="lab">WAU</div><div class="val" style="font-size:22px;" id="kWau">8,940</div>')
        h = h.replace('<div class="lab">MAU</div><div class="val" style="font-size:22px;">11,200</div>', '<div class="lab">MAU</div><div class="val" style="font-size:22px;" id="kMau">11,200</div>')
        WIRE = ('<div id="adminLogin" style="display:none;position:fixed;inset:0;z-index:500;background:rgba(28,23,21,.55);align-items:center;justify-content:center;"><div style="background:#fff;border-radius:18px;padding:26px 24px;max-width:340px;width:92%">'
          '<div style="font-weight:800;font-size:17px;margin-bottom:4px">Admin sign-in</div><div style="color:#736862;font-size:13px;margin-bottom:14px">Live KPIs are for registered admins only.</div>'
          '<input id="admEmail" type="email" placeholder="Email" style="width:100%;padding:11px 13px;border:1px solid #EADFD5;border-radius:10px;margin-bottom:8px;font-size:14px"/>'
          '<input id="admPass" type="password" placeholder="Password" style="width:100%;padding:11px 13px;border:1px solid #EADFD5;border-radius:10px;font-size:14px"/>'
          '<button id="admGo" class="btn btn-primary" style="width:100%;justify-content:center;margin-top:12px">Sign in</button><div id="admErr" style="color:#C73A20;font-size:12.5px;min-height:16px;margin-top:8px"></div></div></div>'
          '<script type="module">\n' + "const U='%s',K='%s';\n" % (URL, KEY) +
          "import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';const sb=createClient(U,K);const $=i=>document.getElementById(i);\n"
          "function rA(a){const b=$('accessBars');if(!b||!a||!a.length)return;const m=Math.max(1,...a),t=new Date();b.innerHTML=a.map((v,i)=>{const d=new Date(t);d.setDate(t.getDate()-(a.length-1-i));return `<div class=\"barcol\"><div style=\"flex:1;display:flex;align-items:flex-end;width:60%\"><div class=\"bar\" style=\"width:100%;height:${v/m*100}%;background:linear-gradient(to top,var(--coral),var(--peach))\"></div></div><div class=\"barlabel\">${d.toLocaleDateString(undefined,{weekday:'short'})}</div></div>`;}).join('');b.dataset.built='1';}\n"
          "async function L(){const{data:{session}}=await sb.auth.getSession();if(!session){$('adminLogin').style.display='flex';return;}const{data,error}=await sb.rpc('admin_kpis');if(error)return;const n=x=>Number(x).toLocaleString('en-US');if($('kTotal'))$('kTotal').textContent=n(data.total_users);if($('kDau'))$('kDau').textContent=n(data.dau);if($('kWau'))$('kWau').textContent=n(data.wau);if($('kMau'))$('kMau').textContent=n(data.mau);rA(data.daily_active);}\n"
          "$('admGo')&&$('admGo').addEventListener('click',async()=>{$('admErr').textContent='';const{error}=await sb.auth.signInWithPassword({email:$('admEmail').value.trim(),password:$('admPass').value});if(error){$('admErr').textContent=error.message;return;}$('adminLogin').style.display='none';L();});L();</script>\n")
        h = h.replace("</body>", WIRE + "</body>", 1)
        open(adm, "w", encoding="utf-8").write(h); print("- admin live-KPI wiring")

mk = os.path.join(ASSETS, "mob_keys.json")
if os.path.exists(mk):
    MOB = json.load(open(mk, encoding="utf-8"))
    for lang in ("en", "es"):
        p = os.path.join(PUB, "i18n", lang + ".json")
        if os.path.exists(p):
            d = json.load(open(p, encoding="utf-8")); d.setdefault("app", {}).setdefault("mob", {}).update(MOB.get(lang, {}))
            json.dump(d, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print("- mobile i18n keys")

tp = os.path.join(ASSETS, "translations.html")
if os.path.exists(tp):
    shutil.copy(tp, os.path.join(PUB, "hub", "translations.html"))
    hub = os.path.join(PUB, "hub", "full-hub-gated-site.html")
    if os.path.exists(hub):
        s = open(hub, encoding="utf-8").read()
        if "translations.html" not in s:
            old = '<button class="htab" id="bt2" onclick="bldTab(2)">📚 Project documentation</button>'
            pill = '<a class="htab" href="translations.html" target="_blank" style="text-decoration:none;display:inline-flex;align-items:center">🌐 Translations (EN/ES)</a>'
            if old in s: open(hub, "w", encoding="utf-8").write(s.replace(old, old + "\n      " + pill, 1))
    print("- Translations page + hub pill")

# Founders' review checklist (static, no backend).
rv = os.path.join(ASSETS, "review.html")
if os.path.exists(rv):
    shutil.copy(rv, os.path.join(PUB, "hub", "review.html"))
    print("- Founders' review checklist page")

# Founders' waitlist dashboard (admin-gated read via admin_waitlist RPC).
wl = os.path.join(ASSETS, "waitlist.html")
if os.path.exists(wl):
    w = open(wl, encoding="utf-8").read().replace("__NS_URL__", URL).replace("__NS_KEY__", KEY)
    open(os.path.join(PUB, "hub", "waitlist.html"), "w", encoding="utf-8").write(w)
    hub = os.path.join(PUB, "hub", "full-hub-gated-site.html")
    if os.path.exists(hub):
        s = open(hub, encoding="utf-8").read()
        if "waitlist.html" not in s:
            old = '<button class="htab" id="bt2" onclick="bldTab(2)">📚 Project documentation</button>'
            pill = '<a class="htab" href="waitlist.html" target="_blank" style="text-decoration:none;display:inline-flex;align-items:center">📋 Waitlist</a>'
            if old in s: open(hub, "w", encoding="utf-8").write(s.replace(old, old + "\n      " + pill, 1))
    print("- Waitlist dashboard + hub pill")

dd = os.path.join(ASSETS, "docs")
if os.path.isdir(dd):
    dst = os.path.join(PUB, "hub", "documentation"); os.makedirs(dst, exist_ok=True); n = 0
    for f in os.listdir(dd):
        if f.endswith(".html"): shutil.copy(os.path.join(dd, f), os.path.join(dst, f)); n += 1
    print("- overlaid %d hub documents" % n)

# Cloudflare Pages cache policy: force browsers to revalidate HTML + language
# files so new deploys and newly-shipped language packs appear immediately
# (the ~660KB app.html otherwise caches hard and shows a stale UI/selector).
# Static assets (js/css/images/fonts) keep normal caching.
open(os.path.join(PUB, "_headers"), "w", encoding="utf-8").write(
    "/\n  Cache-Control: public, max-age=0, must-revalidate\n"
    "/*.html\n  Cache-Control: public, max-age=0, must-revalidate\n"
    "/hub/*\n  Cache-Control: public, max-age=0, must-revalidate\n"
    "/i18n/*\n  Cache-Control: public, max-age=0, must-revalidate\n")
print("- _headers cache policy (revalidate HTML + i18n)")

print("\nIntegration complete - review, then commit + push.")
