#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
r19-c (18-ago) · NutriLog piel v3: 26 claves nuevas × 14 catálogos.
Traducción REAL por idioma (el contrato de catálogos exige paridad, cero
vacíos y no-copia-del-inglés en los bloques cerrados — mob.foto lo es).
Idempotente: re-ejecutar deja el mismo resultado.
"""
import json, io, sys, os

BASE = os.path.join(os.path.dirname(__file__), '..', 'src', 'i18n')
LANGS = ['en','es','ca','val','gl','eu','oc','fr','it','ja','de','nl','el','zh']

# clave → {lang: texto}
FOTO = {
 'titulo': {
  'en':'Log Your Meal','es':'Registra tu comida','ca':'Registra el teu àpat',
  'val':'Registra el teu menjar','gl':'Rexistra a túa comida','eu':'Erregistratu zure otordua',
  'oc':'Enregistra ton repais','fr':'Enregistre ton repas','it':'Registra il tuo pasto',
  'ja':'食事を記録','de':'Mahlzeit erfassen','nl':'Registreer je maaltijd',
  'el':'Κατάγραψε το γεύμα σου','zh':'记录你的餐食'},
 'metodoTit': {
  'en':'How would you like to log your meal?','es':'¿Cómo quieres registrar tu comida?',
  'ca':'Com vols registrar el teu àpat?','val':'Com vols registrar el teu menjar?',
  'gl':'Como queres rexistrar a túa comida?','eu':'Nola erregistratu nahi duzu otordua?',
  'oc':'Cossí vòles enregistrar ton repais?','fr':'Comment veux-tu enregistrer ton repas ?',
  'it':'Come vuoi registrare il tuo pasto?','ja':'どの方法で記録しますか？',
  'de':'Wie möchtest du deine Mahlzeit erfassen?','nl':'Hoe wil je je maaltijd registreren?',
  'el':'Πώς θέλεις να καταγράψεις το γεύμα σου;','zh':'你想如何记录这餐？'},
 'metodoSub': {
  'en':'Select a method below to add ingredients and calculate your cycle sync score.',
  'es':'Elige un método para añadir alimentos y calcular tu sincronía con el ciclo.',
  'ca':'Tria un mètode per afegir aliments i calcular la teva sincronia amb el cicle.',
  'val':'Tria un mètode per a afegir aliments i calcular la teua sincronia amb el cicle.',
  'gl':'Escolle un método para engadir alimentos e calcular a túa sincronía co ciclo.',
  'eu':'Aukeratu metodo bat elikagaiak gehitzeko eta zikloarekiko sintonia kalkulatzeko.',
  'oc':'Causís un metòde per apondre aliments e calcular ta sincronia amb lo cicle.',
  'fr':'Choisis une méthode pour ajouter des aliments et calculer ta synchronisation avec ton cycle.',
  'it':'Scegli un metodo per aggiungere alimenti e calcolare la tua sintonia col ciclo.',
  'ja':'方法を選んで食材を追加し、サイクル同期スコアを計算します。',
  'de':'Wähle eine Methode, um Lebensmittel hinzuzufügen und deinen Zyklus-Sync zu berechnen.',
  'nl':'Kies een methode om ingrediënten toe te voegen en je cyclus-score te berekenen.',
  'el':'Διάλεξε μια μέθοδο για να προσθέσεις τρόφιμα και να υπολογίσεις τον συγχρονισμό με τον κύκλο σου.',
  'zh':'选择一种方式添加食材，并计算你的周期同步分数。'},
 'metodoScan': {
  'en':'Scan My Food','es':'Escanear mi comida','ca':'Escaneja el meu menjar',
  'val':'Escaneja el meu menjar','gl':'Escanear a miña comida','eu':'Eskaneatu nire janaria',
  'oc':'Escanejar mon manjar','fr':'Scanner mon repas','it':'Scansiona il mio cibo',
  'ja':'料理をスキャン','de':'Essen scannen','nl':'Scan mijn eten',
  'el':'Σάρωση φαγητού','zh':'扫描我的食物'},
 'metodoScanSub': {
  'en':"Take a photo and we'll identify ingredients instantly",
  'es':'Haz una foto y reconocemos los alimentos al instante',
  'ca':"Fes una foto i reconeixem els aliments a l'instant",
  'val':"Fes una foto i reconeixem els aliments a l'instant",
  'gl':'Fai unha foto e recoñecemos os alimentos ao instante',
  'eu':'Atera argazki bat eta berehala ezagutuko ditugu elikagaiak',
  'oc':'Fai una fòto e reconeissèm los aliments sulpic',
  'fr':'Prends une photo et on identifie les aliments instantanément',
  'it':'Scatta una foto e riconosciamo subito gli alimenti',
  'ja':'写真を撮ると食材をすぐに認識します',
  'de':'Mach ein Foto — wir erkennen die Zutaten sofort',
  'nl':'Maak een foto en we herkennen de ingrediënten direct',
  'el':'Βγάλε μια φωτογραφία και αναγνωρίζουμε αμέσως τα τρόφιμα',
  'zh':'拍张照片，我们立刻识别食材'},
 'metodoManual': {
  'en':'Add Manually','es':'Añadir a mano','ca':'Afegeix a mà','val':'Afig a mà',
  'gl':'Engadir á man','eu':'Eskuz gehitu','oc':'Apondre a la man','fr':'Ajouter à la main',
  'it':'Aggiungi a mano','ja':'手動で追加','de':'Manuell hinzufügen','nl':'Handmatig toevoegen',
  'el':'Χειροκίνητη προσθήκη','zh':'手动添加'},
 'metodoManualSub': {
  'en':'Search and add ingredients yourself from our database',
  'es':'Busca y añade tú misma los alimentos de nuestra base',
  'ca':'Cerca i afegeix tu mateixa els aliments de la nostra base',
  'val':'Busca i afig tu mateixa els aliments de la nostra base',
  'gl':'Busca e engade ti mesma os alimentos da nosa base',
  'eu':'Bilatu eta gehitu zuk zeuk elikagaiak gure basetik',
  'oc':'Cèrca e apond tu meteissa los aliments de nòstra basa',
  'fr':'Cherche et ajoute toi-même les aliments de notre base',
  'it':'Cerca e aggiungi tu stessa gli alimenti dal nostro archivio',
  'ja':'データベースから自分で検索して追加できます',
  'de':'Suche und füge Lebensmittel selbst aus unserer Datenbank hinzu',
  'nl':'Zoek en voeg zelf ingrediënten toe uit onze database',
  'el':'Αναζήτησε και πρόσθεσε μόνη σου τρόφιμα από τη βάση μας',
  'zh':'自己从数据库中搜索并添加食材'},
 'bannerFase': {
  'en':'Logging meals keeps your cycle sync score high during your current phase',
  'es':'Registrar tus comidas mantiene alta tu sincronía en tu fase actual',
  'ca':'Registrar els àpats manté alta la teva sincronia en la fase actual',
  'val':'Registrar els menjars manté alta la teua sincronia en la fase actual',
  'gl':'Rexistrar as comidas mantén alta a túa sincronía na fase actual',
  'eu':'Otorduak erregistratzeak zure sintonia altu mantentzen du oraingo fasean',
  'oc':'Enregistrar los repaisses manten nauta ta sincronia dins la fasa actuala',
  'fr':'Enregistrer tes repas maintient ta synchronisation élevée pendant ta phase actuelle',
  'it':'Registrare i pasti mantiene alta la tua sintonia nella fase attuale',
  'ja':'食事を記録すると今のフェーズでの同期スコアが保たれます',
  'de':'Mahlzeiten zu erfassen hält deinen Zyklus-Sync in deiner aktuellen Phase hoch',
  'nl':'Maaltijden registreren houdt je cyclus-score hoog in je huidige fase',
  'el':'Η καταγραφή γευμάτων κρατά ψηλά τον συγχρονισμό στην τρέχουσα φάση σου',
  'zh':'记录餐食能在当前阶段保持高同步分数'},
 'analizandoTit': {
  'en':'Analyzing your meal…','es':'Analizando tu comida…','ca':'Analitzant el teu àpat…',
  'val':'Analitzant el teu menjar…','gl':'Analizando a túa comida…','eu':'Zure otordua aztertzen…',
  'oc':'Analisant ton repais…','fr':'Analyse de ton repas…','it':'Analisi del tuo pasto…',
  'ja':'食事を分析中…','de':'Deine Mahlzeit wird analysiert…','nl':'Je maaltijd wordt geanalyseerd…',
  'el':'Ανάλυση του γεύματός σου…','zh':'正在分析你的餐食…'},
 'analizandoSub': {
  'en':'Identifying ingredients and calculating nutritional load',
  'es':'Identificando alimentos y calculando su carga nutricional',
  'ca':'Identificant aliments i calculant la càrrega nutricional',
  'val':'Identificant aliments i calculant la càrrega nutricional',
  'gl':'Identificando alimentos e calculando a carga nutricional',
  'eu':'Elikagaiak identifikatzen eta karga nutrizionala kalkulatzen',
  'oc':'Identificant aliments e calculant la carga nutricionala',
  'fr':'Identification des aliments et calcul de la charge nutritionnelle',
  'it':'Identificazione degli alimenti e calcolo del carico nutrizionale',
  'ja':'食材を特定し、栄養バランスを計算しています',
  'de':'Zutaten werden erkannt und die Nährstofflast berechnet',
  'nl':'Ingrediënten herkennen en voedingswaarde berekenen',
  'el':'Αναγνώριση τροφίμων και υπολογισμός διατροφικού φορτίου',
  'zh':'正在识别食材并计算营养负荷'},
 'resultTit': {
  'en':'Scan Results','es':'Resultado del escaneo','ca':"Resultat de l'escaneig",
  'val':"Resultat de l'escaneig",'gl':'Resultado do escaneo','eu':'Eskaneoaren emaitza',
  'oc':"Resultat de l'escanatge",'fr':'Résultat du scan','it':'Risultato della scansione',
  'ja':'スキャン結果','de':'Scan-Ergebnis','nl':'Scanresultaat',
  'el':'Αποτέλεσμα σάρωσης','zh':'扫描结果'},
 'alinSeccion': {
  'en':'Ingredient Alignment Score','es':'Alineación de tus alimentos',
  'ca':'Alineació dels teus aliments','val':'Alineació dels teus aliments',
  'gl':'Aliñamento dos teus alimentos','eu':'Zure elikagaien lerrokatzea',
  'oc':'Alinhament de tos aliments','fr':'Alignement de tes aliments',
  'it':'Allineamento dei tuoi alimenti','ja':'食材アラインメント',
  'de':'Ausrichtung deiner Lebensmittel','nl':'Afstemming van je ingrediënten',
  'el':'Ευθυγράμμιση των τροφίμων σου','zh':'食材匹配评分'},
 'addMas': {
  'en':'Add more ingredients','es':'Añadir más alimentos','ca':'Afegeix més aliments',
  'val':'Afig més aliments','gl':'Engadir máis alimentos','eu':'Gehitu elikagai gehiago',
  'oc':"Apondre mai d'aliments",'fr':"Ajouter plus d'aliments",'it':'Aggiungi altri alimenti',
  'ja':'食材を追加','de':'Weitere Lebensmittel hinzufügen','nl':'Meer ingrediënten toevoegen',
  'el':'Πρόσθεσε κι άλλα τρόφιμα','zh':'添加更多食材'},
 'anadidos': {
  'en':'ingredients added','es':'alimentos añadidos','ca':'aliments afegits',
  'val':'aliments afegits','gl':'alimentos engadidos','eu':'elikagai gehituta',
  'oc':'aliments aponduts','fr':'aliments ajoutés','it':'alimenti aggiunti',
  'ja':'件の食材を追加','de':'Lebensmittel erfasst','nl':'ingrediënten toegevoegd',
  'el':'τρόφιμα προστέθηκαν','zh':'种食材已添加'},
 'sync': {
  'en':'Cycle Sync Score','es':'Sincronía con tu ciclo','ca':'Sincronia amb el teu cicle',
  'val':'Sincronia amb el teu cicle','gl':'Sincronía co teu ciclo','eu':'Zikloarekiko sintonia',
  'oc':'Sincronia amb ton cicle','fr':'Synchronisation avec ton cycle','it':'Sintonia col tuo ciclo',
  'ja':'サイクル同期スコア','de':'Zyklus-Sync-Score','nl':'Cyclus-syncscore',
  'el':'Συγχρονισμός με τον κύκλο σου','zh':'周期同步分数'},
 'addTit': {
  'en':'Add Ingredients','es':'Añadir alimentos','ca':'Afegir aliments','val':'Afegir aliments',
  'gl':'Engadir alimentos','eu':'Elikagaiak gehitu','oc':'Apondre aliments',
  'fr':'Ajouter des aliments','it':'Aggiungi alimenti','ja':'食材を追加',
  'de':'Lebensmittel hinzufügen','nl':'Ingrediënten toevoegen',
  'el':'Προσθήκη τροφίμων','zh':'添加食材'},
 'buscar': {
  'en':'Search ingredients…','es':'Busca alimentos…','ca':'Cerca aliments…','val':'Busca aliments…',
  'gl':'Busca alimentos…','eu':'Bilatu elikagaiak…','oc':'Cèrca aliments…','fr':'Cherche des aliments…',
  'it':'Cerca alimenti…','ja':'食材を検索…','de':'Lebensmittel suchen…','nl':'Zoek ingrediënten…',
  'el':'Αναζήτηση τροφίμων…','zh':'搜索食材…'},
 'quickAdd': {
  'en':'Quick add','es':'Añadir rápido','ca':'Afegit ràpid','val':'Afegit ràpid',
  'gl':'Engadido rápido','eu':'Gehitze azkarra','oc':'Apondre lèu','fr':'Ajout rapide',
  'it':'Aggiunta rapida','ja':'クイック追加','de':'Schnell hinzufügen','nl':'Snel toevoegen',
  'el':'Γρήγορη προσθήκη','zh':'快速添加'},
 'seleccionados': {
  'en':'selected','es':'seleccionados','ca':'seleccionats','val':'seleccionats',
  'gl':'seleccionados','eu':'hautatuta','oc':'seleccionats','fr':'sélectionnés',
  'it':'selezionati','ja':'選択中','de':'ausgewählt','nl':'geselecteerd',
  'el':'επιλεγμένα','zh':'已选择'},
 'limpiar': {
  'en':'Clear all','es':'Quitar todos','ca':"Esborra'ls tots",'val':"Lleva'ls tots",
  'gl':'Quitalos todos','eu':'Garbitu denak','oc':'Escafar totes','fr':'Tout effacer',
  'it':'Rimuovi tutti','ja':'すべて解除','de':'Alle entfernen','nl':'Alles wissen',
  'el':'Καθαρισμός όλων','zh':'清除全部'},
 'confirmarIng': {
  'en':'Confirm ingredients','es':'Confirmar alimentos','ca':'Confirma els aliments',
  'val':'Confirma els aliments','gl':'Confirmar os alimentos','eu':'Berretsi elikagaiak',
  'oc':'Confirmar los aliments','fr':'Confirmer les aliments','it':'Conferma gli alimenti',
  'ja':'食材を確定','de':'Zutaten bestätigen','nl':'Ingrediënten bevestigen',
  'el':'Επιβεβαίωση τροφίμων','zh':'确认食材'},
 'errCargaIng': {
  'en':"We couldn't load the ingredients. Check your connection and try again.",
  'es':'No hemos podido cargar los alimentos. Revisa tu conexión y vuelve a intentarlo.',
  'ca':'No hem pogut carregar els aliments. Revisa la connexió i torna-ho a provar.',
  'val':'No hem pogut carregar els aliments. Revisa la connexió i torna-ho a provar.',
  'gl':'Non puidemos cargar os alimentos. Revisa a conexión e téntao de novo.',
  'eu':'Ezin izan ditugu elikagaiak kargatu. Egiaztatu konexioa eta saiatu berriro.',
  'oc':'Avèm pas pogut cargar los aliments. Verifica ta connexion e tòrna ensajar.',
  'fr':'Impossible de charger les aliments. Vérifie ta connexion et réessaie.',
  'it':'Non siamo riusciti a caricare gli alimenti. Controlla la connessione e riprova.',
  'ja':'食材を読み込めませんでした。接続を確認してもう一度お試しください。',
  'de':'Die Lebensmittel konnten nicht geladen werden. Prüfe deine Verbindung und versuche es erneut.',
  'nl':'We konden de ingrediënten niet laden. Controleer je verbinding en probeer opnieuw.',
  'el':'Δεν μπορέσαμε να φορτώσουμε τα τρόφιμα. Έλεγξε τη σύνδεση και δοκίμασε ξανά.',
  'zh':'无法加载食材。请检查网络后重试。'},
 'sinResultados': {
  'en':'Nothing matches that search.','es':'Nada coincide con esa búsqueda.',
  'ca':'Res no coincideix amb la cerca.','val':'Res no coincidix amb la busca.',
  'gl':'Nada coincide con esa busca.','eu':'Ezerk ez du bat egiten bilaketarekin.',
  'oc':'Res correspond pas a la cèrca.','fr':'Rien ne correspond à cette recherche.',
  'it':'Niente corrisponde alla ricerca.','ja':'一致する食材がありません。',
  'de':'Nichts passt zu dieser Suche.','nl':'Niets komt overeen met je zoekopdracht.',
  'el':'Τίποτα δεν ταιριάζει με την αναζήτηση.','zh':'没有匹配的结果。'},
 'tipsTit': {
  'en':'Tips for a better scan:','es':'Trucos para un mejor escaneo:',
  'ca':'Consells per a un millor escaneig:','val':'Consells per a un millor escaneig:',
  'gl':'Consellos para un mellor escaneo:','eu':'Aholkuak eskaneo hobea lortzeko:',
  'oc':'Conselhs per un melhor escanatge:','fr':'Astuces pour un meilleur scan :',
  'it':'Consigli per una scansione migliore:','ja':'うまくスキャンするコツ：',
  'de':'Tipps für einen besseren Scan:','nl':'Tips voor een betere scan:',
  'el':'Συμβουλές για καλύτερη σάρωση:','zh':'获得更好扫描效果的小贴士：'},
 'tips1': {
  'en':'Avoid harsh shadows or dim environments','es':'Evita sombras duras y sitios con poca luz',
  'ca':'Evita ombres dures i llocs amb poca llum','val':'Evita ombres dures i llocs amb poca llum',
  'gl':'Evita sombras duras e sitios con pouca luz','eu':'Saihestu itzal gogorrak eta argi gutxiko lekuak',
  'oc':'Evita ombras duras e luòcs escurs','fr':'Évite les ombres dures et les endroits sombres',
  'it':'Evita ombre dure e ambienti poco illuminati','ja':'強い影や暗い場所を避けましょう',
  'de':'Vermeide harte Schatten und dunkle Umgebungen','nl':'Vermijd harde schaduwen en donkere plekken',
  'el':'Απόφυγε έντονες σκιές και σκοτεινά μέρη','zh':'避免强烈阴影或光线昏暗'},
 'tips2': {
  'en':'Keep each ingredient clearly visible','es':'Que cada alimento se vea con claridad',
  'ca':'Que cada aliment es vegi amb claredat','val':'Que cada aliment es veja amb claredat',
  'gl':'Que cada alimento se vexa con claridade','eu':'Elikagai bakoitza argi ikus dadila',
  'oc':'Que cada aliment se veja clarament','fr':'Garde chaque aliment bien visible',
  'it':'Tieni ogni alimento ben visibile','ja':'食材一つひとつがよく見えるように',
  'de':'Halte jede Zutat gut sichtbar','nl':'Houd elk ingrediënt goed zichtbaar',
  'el':'Κράτα κάθε τρόφιμο καθαρά ορατό','zh':'让每种食材清晰可见'},
 'addManualPorcion': {
  'en':'added by you','es':'añadido por ti','ca':'afegit per tu','val':'afegit per tu',
  'gl':'engadido por ti','eu':'zuk gehitua','oc':'apondut per tu','fr':'ajouté par toi',
  'it':'aggiunto da te','ja':'あなたが追加','de':'von dir hinzugefügt','nl':'door jou toegevoegd',
  'el':'προστέθηκε από σένα','zh':'由你添加'},
}

SET = {
 'otaEmbedded': {
  'en':'factory bundle — no OTA applied yet','es':'bundle de fábrica — sin OTA aplicada',
  'ca':'paquet de fàbrica — cap OTA aplicada','val':'paquet de fàbrica — cap OTA aplicada',
  'gl':'paquete de fábrica — sen OTA aplicada','eu':'fabrikako paketea — OTA-rik gabe',
  'oc':"paquet d'origina — cap d'OTA aplicada",'fr':"bundle d'usine — aucune OTA appliquée",
  'it':'bundle di fabbrica — nessun OTA applicato','ja':'初期バンドル — OTA未適用',
  'de':'Werks-Bundle — noch kein OTA-Update','nl':'fabrieksbundel — nog geen OTA',
  'el':'εργοστασιακό πακέτο — χωρίς OTA','zh':'出厂包 — 尚未应用OTA'},
}

cambios = 0
for lang in LANGS:
    ruta = os.path.join(BASE, lang + '.json')
    with io.open(ruta, encoding='utf-8') as f:
        d = json.load(f)
    mob = d.setdefault('mob', {})
    foto = mob.setdefault('foto', {})
    seti = mob.setdefault('set', {})
    for k, tr in FOTO.items():
        if foto.get(k) != tr[lang]:
            foto[k] = tr[lang]; cambios += 1
    for k, tr in SET.items():
        if seti.get(k) != tr[lang]:
            seti[k] = tr[lang]; cambios += 1
    with io.open(ruta, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write('\n')

print('OK ·', cambios, 'valores escritos en', len(LANGS), 'catálogos ·',
      len(FOTO), 'claves foto +', len(SET), 'clave set')
