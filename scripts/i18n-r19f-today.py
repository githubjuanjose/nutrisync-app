#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""r19-f (19-ago) · Today P2: claves del navegador temporal, agregados y
sugerencias ×14 catálogos. Idempotente."""
import json, io, os

BASE = os.path.join(os.path.dirname(__file__), '..', 'src', 'i18n')
L = ['en','es','ca','val','gl','eu','oc','fr','it','ja','de','nl','el','zh']

MES = {
 'en':['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
 'es':['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'],
 'ca':['gen','febr','març','abr','maig','juny','jul','ag','set','oct','nov','des'],
 'val':['gen','febr','març','abr','maig','juny','jul','ag','set','oct','nov','des'],
 'gl':['xan','feb','mar','abr','mai','xuñ','xul','ago','set','out','nov','dec'],
 'eu':['urt','ots','mar','api','mai','eka','uzt','abu','ira','urr','aza','abe'],
 'oc':['gen','feb','mar','abr','mai','junh','julh','ago','set','oct','nov','dec'],
 'fr':['janv','févr','mars','avr','mai','juin','juil','août','sept','oct','nov','déc'],
 'it':['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'],
 'ja':['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'],
 'de':['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'],
 'nl':['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'],
 'el':['Ιαν','Φεβ','Μάρ','Απρ','Μάι','Ιούν','Ιούλ','Αύγ','Σεπ','Οκτ','Νοέ','Δεκ'],
 'zh':['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'],
}
AYER = {'en':'Yesterday','es':'Ayer','ca':'Ahir','val':'Ahir','gl':'Onte','eu':'Atzo','oc':'Ièr','fr':'Hier','it':'Ieri','ja':'昨日','de':'Gestern','nl':'Gisteren','el':'Χθες','zh':'昨天'}
TRI = {'en':'Q','es':'T','ca':'T','val':'T','gl':'T','eu':'H','oc':'T','fr':'T','it':'T','ja':'Q','de':'Q','nl':'K','el':'Τ','zh':'Q'}
BODY = {'en':'Body Insights','es':'Señales de tu cuerpo','ca':'Senyals del teu cos','val':'Senyals del teu cos','gl':'Sinais do teu corpo','eu':'Zure gorputzaren seinaleak','oc':'Senhals de ton còs','fr':'Signaux de ton corps','it':'Segnali del tuo corpo','ja':'からだのサイン','de':'Signale deines Körpers','nl':'Signalen van je lichaam','el':'Σήματα του σώματός σου','zh':'身体信号'}
HOY = {
 'comidas':{'en':"Today's Meals",'es':'Comidas de hoy','ca':'Àpats d’avui','val':'Menjars de hui','gl':'Comidas de hoxe','eu':'Gaurko otorduak','oc':'Repaisses de uèi','fr':"Repas d'aujourd'hui",'it':'Pasti di oggi','ja':'今日の食事','de':'Mahlzeiten heute','nl':'Maaltijden vandaag','el':'Γεύματα σήμερα','zh':'今日餐食'},
 'comidasDe':{'en':'Meals that day','es':'Comidas de ese día','ca':'Àpats d’aquell dia','val':'Menjars d’eixe dia','gl':'Comidas dese día','eu':'Egun horretako otorduak','oc':'Repaisses d’aquel jorn','fr':'Repas de ce jour-là','it':'Pasti di quel giorno','ja':'その日の食事','de':'Mahlzeiten an dem Tag','nl':'Maaltijden die dag','el':'Γεύματα εκείνης της ημέρας','zh':'当日餐食'},
 'sinComidas':{'en':'Nothing logged this day','es':'Nada registrado este día','ca':'Res registrat aquest dia','val':'Res registrat este dia','gl':'Nada rexistrado este día','eu':'Egun honetan ez da ezer erregistratu','oc':'Res enregistrat aqueste jorn','fr':'Rien d’enregistré ce jour','it':'Niente registrato questo giorno','ja':'この日は記録がありません','de':'Nichts an diesem Tag erfasst','nl':'Niets gelogd deze dag','el':'Τίποτα καταγεγραμμένο αυτή τη μέρα','zh':'这天没有记录'},
 'sugerencias':{'en':'Phase picks','es':'Sugerencias de tu fase','ca':'Suggeriments de la teva fase','val':'Suggeriments de la teua fase','gl':'Suxestións da túa fase','eu':'Zure faseko gomendioak','oc':'Suggestions de ta fasa','fr':'Suggestions de ta phase','it':'Consigli della tua fase','ja':'フェーズのおすすめ','de':'Tipps für deine Phase','nl':'Tips voor je fase','el':'Προτάσεις της φάσης σου','zh':'阶段推荐'},
 'enAyer':{'en':'Logging for yesterday','es':'Registrando en AYER','ca':'Registrant a AHIR','val':'Registrant en AHIR','gl':'Rexistrando en ONTE','eu':'ATZOrako erregistratzen','oc':'Enregistrant per IÈR','fr':'Enregistrement pour HIER','it':'Registrazione per IERI','ja':'昨日の分を記録中','de':'Eintrag für GESTERN','nl':'Loggen voor GISTEREN','el':'Καταχώριση για ΧΘΕΣ','zh':'正在记录昨天'},
 'soloLectura':{'en':'Read-only day','es':'Día solo de consulta','ca':'Dia només de consulta','val':'Dia només de consulta','gl':'Día só de consulta','eu':'Irakurtzeko soilik','oc':'Jorn de consulta solament','fr':'Jour en lecture seule','it':'Giorno di sola lettura','ja':'閲覧のみの日','de':'Nur-Lese-Tag','nl':'Alleen-lezen dag','el':'Ημέρα μόνο για προβολή','zh':'仅查看'},
}
AGG = {
 'cas':{'en':'AVG CAS','es':'CAS MEDIO','ca':'CAS MITJÀ','val':'CAS MITJÀ','gl':'CAS MEDIO','eu':'BATEZ BESTEKO CAS','oc':'CAS MEJAN','fr':'CAS MOYEN','it':'CAS MEDIO','ja':'平均CAS','de':'Ø CAS','nl':'GEM. CAS','el':'ΜΕΣΟ CAS','zh':'平均CAS'},
 'comidas':{'en':'MEALS LOGGED','es':'COMIDAS','ca':'ÀPATS','val':'MENJARS','gl':'COMIDAS','eu':'OTORDUAK','oc':'REPAISSES','fr':'REPAS','it':'PASTI','ja':'食事数','de':'MAHLZEITEN','nl':'MAALTIJDEN','el':'ΓΕΥΜΑΤΑ','zh':'餐食数'},
 'mood':{'en':'AVG MOOD','es':'ÁNIMO MEDIO','ca':'ÀNIM MITJÀ','val':'ÀNIM MITJÀ','gl':'ÁNIMO MEDIO','eu':'BATEZ BESTEKO ALDARTEA','oc':'UMOR MEJANA','fr':'HUMEUR MOY.','it':'UMORE MEDIO','ja':'平均ムード','de':'Ø STIMMUNG','nl':'GEM. STEMMING','el':'ΜΕΣΗ ΔΙΑΘΕΣΗ','zh':'平均心情'},
 'energia':{'en':'AVG ENERGY','es':'ENERGÍA MEDIA','ca':'ENERGIA MITJANA','val':'ENERGIA MITJANA','gl':'ENERXÍA MEDIA','eu':'BATEZ BESTEKO ENERGIA','oc':'ENERGIA MEJANA','fr':'ÉNERGIE MOY.','it':'ENERGIA MEDIA','ja':'平均エネルギー','de':'Ø ENERGIE','nl':'GEM. ENERGIE','el':'ΜΕΣΗ ΕΝΕΡΓΕΙΑ','zh':'平均能量'},
 'mezcla':{'en':'Alignment mix','es':'Mezcla de alineación','ca':'Mescla d’alineació','val':'Mescla d’alineació','gl':'Mestura de aliñamento','eu':'Lerrokatze nahasketa','oc':'Mescla d’alinhament','fr':'Répartition d’alignement','it':'Mix di allineamento','ja':'アラインメント内訳','de':'Alignment-Mix','nl':'Afstemmingsmix','el':'Μείγμα ευθυγράμμισης','zh':'匹配分布'},
 'dias':{'en':'days with data','es':'días con datos','ca':'dies amb dades','val':'dies amb dades','gl':'días con datos','eu':'datudun egunak','oc':'jorns amb donadas','fr':'jours avec données','it':'giorni con dati','ja':'日分のデータ','de':'Tage mit Daten','nl':'dagen met data','el':'ημέρες με δεδομένα','zh':'天有数据'},
 'vacio':{'en':'No data for this period yet','es':'Aún no hay datos de este periodo','ca':'Encara no hi ha dades d’aquest període','val':'Encara no hi ha dades d’este període','gl':'Aínda non hai datos deste período','eu':'Oraindik ez dago aldi honetako daturik','oc':'Pas encara de donadas d’aqueste periòde','fr':'Pas encore de données pour cette période','it':'Ancora nessun dato per questo periodo','ja':'この期間のデータはまだありません','de':'Noch keine Daten für diesen Zeitraum','nl':'Nog geen data voor deze periode','el':'Δεν υπάρχουν ακόμη δεδομένα για την περίοδο','zh':'该时段暂无数据'},
}

n = 0
for lang in L:
    p = os.path.join(BASE, lang + '.json')
    d = json.load(io.open(p, encoding='utf-8'))
    mob = d.setdefault('mob', {})
    tiempo = mob.setdefault('tiempo', {})
    if tiempo.get('ayer') != AYER[lang]: tiempo['ayer'] = AYER[lang]; n += 1
    if tiempo.get('tri') != TRI[lang]: tiempo['tri'] = TRI[lang]; n += 1
    mes = tiempo.setdefault('mes', {})
    for i, v in enumerate(MES[lang], 1):
        if mes.get(str(i)) != v: mes[str(i)] = v; n += 1
    if mob.get('bodyInsights') != BODY[lang]: mob['bodyInsights'] = BODY[lang]; n += 1
    hoy = mob.setdefault('hoy', {})
    for k, tr in HOY.items():
        if hoy.get(k) != tr[lang]: hoy[k] = tr[lang]; n += 1
    agg = hoy.setdefault('agregado', {})
    for k, tr in AGG.items():
        if agg.get(k) != tr[lang]: agg[k] = tr[lang]; n += 1
    with io.open(p, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2); f.write('\n')

print('i18n r19f ·', n, 'valores ·', len(L), 'catálogos')
