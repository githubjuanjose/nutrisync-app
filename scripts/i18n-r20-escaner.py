#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""r20 (21-ago) · 0.22.6 Escáner de verdad: pill sin-score, editor de items,
cambiar tipo, aviso de alineación en aprendizaje ×14 catálogos. Idempotente."""
import json, io, os

BASE = os.path.join(os.path.dirname(__file__), '..', 'src', 'i18n')
L = ['en','es','ca','val','gl','eu','oc','fr','it','ja','de','nl','el','zh']

K = {
 ('foto','sinScore'): {
  'en':'No score yet','es':'Sin score aún','ca':'Encara sense score','val':'Encara sense score',
  'gl':'Aínda sen score','eu':'Oraindik punturik ez','oc':'Encara sens score','fr':'Pas encore de score',
  'it':'Ancora nessun punteggio','ja':'スコアはまだ','de':'Noch kein Score','nl':'Nog geen score',
  'el':'Χωρίς σκορ ακόμη','zh':'暂无评分'},
 ('foto','cambiarTipo'): {
  'en':'Wrong meal? Move it:','es':'¿Comida equivocada? Muévela:','ca':'Àpat equivocat? Mou-lo:',
  'val':'Menjar equivocat? Mou-lo:','gl':'Comida equivocada? Móvea:','eu':'Otordu okerra? Mugitu:',
  'oc':'Repais marrit? Desplaça-lo:','fr':'Mauvais repas ? Déplace-le :','it':'Pasto sbagliato? Spostalo:',
  'ja':'食事の種類が違う？移動：','de':'Falsche Mahlzeit? Verschieben:','nl':'Verkeerde maaltijd? Verplaats:',
  'el':'Λάθος γεύμα; Μετακίνησέ το:','zh':'选错餐了？移动到：'},
 ('editor','titulo'): {
  'en':'Edit scanned meal','es':'Editar comida escaneada','ca':'Edita l’àpat escanejat',
  'val':'Edita el menjar escanejat','gl':'Editar comida escaneada','eu':'Editatu eskaneatutako otordua',
  'oc':'Editar lo repais escanejat','fr':'Modifier le repas scanné','it':'Modifica pasto scansionato',
  'ja':'スキャンした食事を編集','de':'Gescannte Mahlzeit bearbeiten','nl':'Gescande maaltijd bewerken',
  'el':'Επεξεργασία σαρωμένου γεύματος','zh':'编辑扫描的餐食'},
 ('editor','pista'): {
  'en':'Tap a name to fix it, ✕ to remove it. Your history and score update with you.',
  'es':'Toca un nombre para corregirlo, ✕ para quitarlo. Tu historial y tu score se actualizan contigo.',
  'ca':'Toca un nom per corregir-lo, ✕ per treure’l. El teu historial i el teu score s’actualitzen amb tu.',
  'val':'Toca un nom per a corregir-lo, ✕ per a llevar-lo. El teu historial i el teu score s’actualitzen amb tu.',
  'gl':'Toca un nome para corrixilo, ✕ para quitalo. O teu historial e o teu score actualízanse contigo.',
  'eu':'Ukitu izen bat zuzentzeko, ✕ kentzeko. Zure historia eta puntuazioa zurekin eguneratzen dira.',
  'oc':'Tòca un nom per lo corregir, ✕ per lo levar. Ton istoric e ton score s’actualizan amb tu.',
  'fr':'Touche un nom pour le corriger, ✕ pour le retirer. Ton historique et ton score se mettent à jour avec toi.',
  'it':'Tocca un nome per correggerlo, ✕ per rimuoverlo. Storico e punteggio si aggiornano con te.',
  'ja':'名前をタップで修正、✕で削除。履歴とスコアも一緒に更新されます。',
  'de':'Namen antippen zum Korrigieren, ✕ zum Entfernen. Verlauf und Score ziehen mit.',
  'nl':'Tik op een naam om te corrigeren, ✕ om te verwijderen. Je geschiedenis en score bewegen mee.',
  'el':'Πάτησε ένα όνομα για διόρθωση, ✕ για αφαίρεση. Ιστορικό και σκορ ενημερώνονται μαζί σου.',
  'zh':'点按名称可修改，✕ 可删除。历史和评分会随之更新。'},
 ('editor','vacio'): {
  'en':'Nothing left — add an ingredient below.','es':'No queda nada — añade un ingrediente abajo.',
  'ca':'No queda res — afegeix un ingredient a sota.','val':'No queda res — afig un ingredient davall.',
  'gl':'Non queda nada — engade un ingrediente abaixo.','eu':'Ez da ezer geratzen — gehitu osagai bat behean.',
  'oc':'Res demòra pas — apond un ingredient çai-jos.','fr':'Plus rien — ajoute un ingrédient ci-dessous.',
  'it':'Non resta niente — aggiungi un ingrediente qui sotto.','ja':'何も残っていません — 下から追加してください。',
  'de':'Nichts übrig — füge unten eine Zutat hinzu.','nl':'Niets over — voeg hieronder een ingrediënt toe.',
  'el':'Δεν έμεινε τίποτα — πρόσθεσε ένα συστατικό παρακάτω.','zh':'空空如也 — 在下方添加食材。'},
 ('editor','listo'): {
  'en':'Done','es':'Listo','ca':'Fet','val':'Fet','gl':'Feito','eu':'Eginda','oc':'Fach','fr':'Terminé',
  'it':'Fatto','ja':'完了','de':'Fertig','nl':'Klaar','el':'Έτοιμο','zh':'完成'},
 ('hoy','sinAlineacion'): {
  'en':'Meals saved — alignment is still learning these foods, so today scores neutral.',
  'es':'Comidas guardadas — la alineación aún está aprendiendo estos alimentos, así que hoy puntúa neutro.',
  'ca':'Àpats desats — l’alineació encara està aprenent aquests aliments, així que avui puntua neutre.',
  'val':'Menjars guardats — l’alineació encara està aprenent estos aliments, així que hui puntua neutre.',
  'gl':'Comidas gardadas — o aliñamento aínda está aprendendo estes alimentos, así que hoxe puntúa neutro.',
  'eu':'Otorduak gordeta — lerrokatzea oraindik janari hauek ikasten ari da; gaur neutro puntuatzen du.',
  'oc':'Repaisses salvats — l’alinhament apren encara aquestes aliments, doncas uèi puntua neutre.',
  'fr':'Repas enregistrés — l’alignement apprend encore ces aliments, donc aujourd’hui compte neutre.',
  'it':'Pasti salvati — l’allineamento sta ancora imparando questi cibi, quindi oggi conta neutro.',
  'ja':'食事は保存済み — これらの食品はまだ学習中のため、今日は中立スコアです。',
  'de':'Mahlzeiten gespeichert — das Alignment lernt diese Lebensmittel noch, heute zählt neutral.',
  'nl':'Maaltijden opgeslagen — de afstemming leert deze voeding nog, dus vandaag telt neutraal.',
  'el':'Γεύματα αποθηκεύτηκαν — η ευθυγράμμιση μαθαίνει ακόμη αυτά τα τρόφιμα, οπότε σήμερα μετρά ουδέτερα.',
  'zh':'餐食已保存 — 匹配引擎仍在学习这些食物，今天按中性计分。'},
}

n = 0
for lang in L:
    p = os.path.join(BASE, lang + '.json')
    d = json.load(io.open(p, encoding='utf-8'))
    mob = d.setdefault('mob', {})
    for (ns, k), tr in K.items():
        bloque = mob.setdefault(ns, {})
        if bloque.get(k) != tr[lang]:
            bloque[k] = tr[lang]; n += 1
    with io.open(p, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2); f.write('\n')

print('i18n r20 ·', n, 'valores ·', len(L), 'catálogos')
