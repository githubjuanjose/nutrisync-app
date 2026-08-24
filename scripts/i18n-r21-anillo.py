#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""r21 (24-ago) · 0.22.7: el anillo honesto — 1 clave ×14. Idempotente."""
import json, io, os

BASE = os.path.join(os.path.dirname(__file__), '..', 'src', 'i18n')
L = ['en','es','ca','val','gl','eu','oc','fr','it','ja','de','nl','el','zh']

TXT = {
 'en': 'None of these foods are in the alignment sheet yet — your meal still counts in your day.',
 'es': 'Ninguno de estos alimentos está aún en la hoja de alineación — tu comida cuenta igual en tu día.',
 'ca': 'Cap d’aquests aliments és encara a la fulla d’alineació — el teu àpat compta igual en el teu dia.',
 'val': 'Cap d’estos aliments està encara en la fulla d’alineació — el teu menjar compta igual en el teu dia.',
 'gl': 'Ningún destes alimentos está aínda na folla de aliñamento — a túa comida conta igual no teu día.',
 'eu': 'Janari hauetako bat ere ez dago oraindik lerrokatze-orrian — zure otorduak berdin balio du zure egunean.',
 'oc': 'Cap d’aquestes aliments es pas encara dins la fuèlha d’alinhament — ton repais compta parièr dins ta jornada.',
 'fr': 'Aucun de ces aliments n’est encore dans la feuille d’alignement — ton repas compte quand même dans ta journée.',
 'it': 'Nessuno di questi cibi è ancora nel foglio di allineamento — il tuo pasto conta comunque nella tua giornata.',
 'ja': 'これらの食品はまだアラインメント表にありません — それでも食事は今日の記録に数えられます。',
 'de': 'Keines dieser Lebensmittel steht bisher im Alignment-Blatt — deine Mahlzeit zählt trotzdem für deinen Tag.',
 'nl': 'Geen van deze voedingsmiddelen staat nog in het afstemmingsblad — je maaltijd telt gewoon mee in je dag.',
 'el': 'Κανένα από αυτά τα τρόφιμα δεν είναι ακόμη στο φύλλο ευθυγράμμισης — το γεύμα σου μετρά κανονικά στη μέρα σου.',
 'zh': '这些食物尚未加入匹配表 — 你的这餐仍会计入今天。',
}

n = 0
for lang in L:
    p = os.path.join(BASE, lang + '.json')
    d = json.load(io.open(p, encoding='utf-8'))
    foto = d.setdefault('mob', {}).setdefault('foto', {})
    if foto.get('anilloSin') != TXT[lang]:
        foto['anilloSin'] = TXT[lang]; n += 1
    with io.open(p, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2); f.write('\n')
print('i18n r21 ·', n, 'valores ·', len(L), 'catálogos')
