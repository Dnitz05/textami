# Guia Tècnica Exhaustiva dels Mòduls Premium de Docxtemplater

## Introducció: Potenciant la Generació de Documents amb Mòduls Premium

### Context de l'Ecosistema docxtemplater

docxtemplater s'ha consolidat com una llibreria de generació de documents robusta i flexible, operant sobre un principi fonamental: la separació de la lògica de dades de la capa de presentació. El seu nucli de codi obert, sota llicència MIT, proporciona les eines essencials per a la creació de documents .docx i .pptx mitjançant la substitució de marcadors de posició ({placeholders}), la implementació de bucles ({#users}...{/users}) i l'ús de condicionals. Aquesta base permet als desenvolupadors automatitzar la creació de documents mentre que els usuaris no tècnics, com ara analistes de negoci o personal administratiu, poden dissenyar i mantenir les plantilles directament a Microsoft Office.

No obstant això, les aplicacions empresarials modernes sovint requereixen capacitats que transcendeixen aquestes funcionalitats bàsiques. La necessitat d'inserir contingut ric formatat, gestionar actius visuals dinàmics, aplicar estils condicionals complexos o treballar amb dades estructurades en fulls de càlcul representa un conjunt de reptes significatius. És en aquest punt on l'ecosistema de mòduls premium de docxtemplater demostra el seu valor estratègic, transformant la llibreria d'una eina de templating a una plataforma completa de generació de documents.

### El Valor Estratègic dels Mòduls

Els mòduls premium no són simples complements; són extensions especialitzades dissenyades per resoldre problemes específics i complexos. Aquest informe se centra en quatre d'aquests mòduls, cadascun adreçat a un domini funcional clau:

- **Mòdul HTML**: Permet la inserció de contingut HTML, ideal per a dades provinents d'editors de text enriquit (WYSIWYG), traduint-lo a format OpenXML natiu.
- **Mòdul Image**: Ofereix un control granular sobre la inserció i manipulació d'imatges dinàmiques, des de la seva obtenció fins al seu dimensionament i estilització.
- **Mòdul Styling**: Proporciona un mecanisme per aplicar estils de manera condicional a pràcticament qualsevol element d'un document, permetent la creació de documents visualment dinàmics.
- **Mòdul XLSX**: Estén les capacitats de docxtemplater al domini dels fulls de càlcul de Microsoft Excel, permetent la manipulació de cel·les, files, columnes i tipus de dades específics.

### Objectiu i Estructura de l'Informe

L'objectiu d'aquest document és proporcionar una guia tècnica definitiva i exhaustiva per a les versions HTML v3.61.0, Image v3.32.0, Styling v3.10.0 i XLSX v3.30.3. L'informe està estructurat en seccions dedicades a cada mòdul, dissenyades per a una consulta ràpida i una comprensió profunda. S'analitzarà cada funcionalitat, des de la sintaxi bàsica fins a les opcions de configuració més avançades, proporcionant exemples de codi i destacant les millors pràctiques. Finalment, s'exploraran les sinergies entre els mòduls i es presentaran recomanacions estratègiques per a la seva implementació en un entorn de software professional.

Un patró de disseny consistent emergeix a través de l'anàlisi d'aquests mòduls: la seva funcionalitat s'activa i es personalitza mitjançant objectes de configuració (options) que es passen al constructor del mòdul, com en `new ImageModule(opts)` o `new XlsxModule(xlsxOpts)`. Aquesta arquitectura ofereix un alt grau de control al desenvolupador. A més, és fonamental entendre que els mòduls no operen en aïllament. Sovint col·laboren per aconseguir resultats complexos. Per exemple, la inserció d'imatges en un document Excel requereix la presència i la configuració conjunta tant del mòdul Image com del mòdul XLSX. Aquesta interdependència implica que una estratègia d'implementació eficaç ha de considerar l'ecosistema de mòduls de manera holística. El software que integri docxtemplater hauria de dissenyar una capa d'abstracció o un servei de generació de documents que gestioni la inicialització condicional i la configuració conjunta dels mòduls, basant-se en les necessitats específiques de cada plantilla. No es tracta només d'instal·lar paquets, sinó de construir una arquitectura que orquestri les seves interaccions de manera intel·ligent.

## Secció 1: Guia Exhaustiva del Mòdul HTML (v3.61.0)

### 1.1. Fonaments: Inserció de Contingut HTML a Documents Word (.docx)

El propòsit principal del mòdul HTML és actuar com un pont entre el llenguatge de marcat web i el format OpenXML de Microsoft Word. Permet als desenvolupadors inserir un fragment de codi HTML com a valor d'un marcador de posició, i el mòdul s'encarrega de traduir un subconjunt d'etiquetes HTML i estils CSS a les estructures XML equivalents dins del document .docx. Aquesta capacitat és particularment valuosa en escenaris on el contingut dinàmic prové de sistemes de gestió de continguts (CMS) o d'editors de text enriquit (WYSIWYG) com CKEditor, on els usuaris finals poden formatar text sense coneixements tècnics.

És crucial entendre que aquest mòdul està dissenyat i optimitzat exclusivament per a documents de Word (.docx). Per a la inserció de contingut HTML en presentacions de PowerPoint (.pptx) o fulls de càlcul d'Excel (.xlsx), docxtemplater ofereix mòduls separats i específics: html-pptx i html-xlsx, respectivament.

### 1.2. Sintaxi i Tipus d'Etiquetes: La Distinció Crítica entre Inline i Block

El mòdul diferencia dos tipus fonamentals de marcadors, la correcta elecció dels quals és essencial per a una renderització adequada:

#### Etiquetes Inline ({~...})

Aquestes etiquetes, identificades per una única titlla (~), estan dissenyades per inserir HTML dins d'un flux de text existent. Per exemple, en una plantilla amb el text "El pagament s'ha rebut a les {~hora_transaccio}", on hora_transaccio pot contenir HTML com `<b>14:32</b>`, el resultat serà una frase contínua amb el text en negreta.

La limitació fonamental de les etiquetes inline és que no poden generar elements que trenquin el flux del paràgraf actual. Això significa que no poden utilitzar-se per inserir estructures de bloc com ara paràgrafs múltiples (`<p>...</p><p>...</p>`), taules (`<table>`), o llistes (`<ul>`, `<ol>`).

#### Etiquetes de Bloc ({~~...})

Identificades per una doble titlla (~~), aquestes etiquetes estan dissenyades per a contingut HTML més complex. Una etiqueta de bloc com `{~~detalls_factura}` reemplaça el paràgraf sencer que la conté i pot generar estructures multinivell, incloent taules completes, llistes niuades i múltiples paràgrafs. Són l'eina adequada per inserir seccions senceres de contingut formatat.

### 1.3. Regles de Posicionament i Bones Pràctiques: La Clau per a una Renderització Exitosa

L'ús correcte de les etiquetes de bloc està subjecte a una regla estricta que és una font comuna d'errors per als nous usuaris:

#### La Regla del Paràgraf Aïllat

Una etiqueta de bloc `{~~...}` ha d'estar absolutament sola en el seu propi paràgraf dins de la plantilla de Word. No pot haver-hi cap altre text, espai en blanc o caràcter abans o després de l'etiqueta dins del mateix paràgraf XML (`<w:p>`).

- **Incorrecte**: Detalls: {~~factura}
- **Incorrecte**: { ~~factura } (espais dins de les claus)
- **Correcte**: El paràgraf conté única i exclusivament {~~factura}.

#### Diferència entre Salt de Línia (Shift+Enter) i Salt de Paràgraf (Enter)

És vital entendre la distinció que fa Microsoft Word entre un salt de línia i un salt de paràgraf. Un salt de línia, inserit amb Shift+Enter, crea un element XML `<w:br/>` dins del paràgraf existent, però no en crea un de nou. Per tant, intentar aïllar una etiqueta de bloc utilitzant salts de línia no funcionarà, ja que tècnicament romandrà dins del mateix paràgraf. Per garantir el compliment de la regla del paràgraf aïllat, s'ha d'utilitzar sempre un salt de paràgraf (tecla Enter) abans i després de l'etiqueta de bloc. Una pràctica recomanada durant el disseny de plantilles és activar la visualització de caràcters de format a Word (el símbol ¶) per verificar visualment que les etiquetes de bloc estan correctament aïllades en els seus propis paràgrafs.

### 1.4. Catàleg d'Etiquetes HTML i Propietats CSS Suportades

El mòdul no funciona com un motor de renderització de navegador complet. En canvi, actua com un traductor que mapeja un subconjunt específic d'etiquetes HTML i propietats CSS a les construccions OpenXML equivalents. Aquesta naturalesa de "traductor" explica per què només un conjunt limitat d'elements és compatible i per què l'aparença final pot dependre dels estils predefinits a la pròpia plantilla de Word. Per exemple, una etiqueta `<h1>` es tradueix a l'estil de Word anomenat "Title", i un `<h2>` a "Header1". Per tant, l'aspecte d'un `<h1>` variarà entre dues plantilles si l'estil "Title" està definit de manera diferent en cadascuna.

Aquesta dependència dels estils del document implica una important consideració arquitectònica. Per a un control d'estil robust i mantenible, l'estratègia més efectiva no és sobrecarregar l'HTML amb estils en línia. En canvi, és preferible definir classes a l'HTML i utilitzar les opcions avançades del mòdul (styleSheet, ElementCustomizer) per mapejar aquestes classes als estils predefinits i ben dissenyats a la plantilla de Word. Aquest enfocament separa les dades (HTML) de la presentació (estils de Word), alineant-se amb les millors pràctiques de desenvolupament de software.

La següent taula resumeix els elements compatibles:

| Etiqueta HTML | Propietats CSS Suportades i Notes |
|---------------|-----------------------------------|
| `<p>` | color, font-size, font-family, background-color, text-decoration, padding-left, padding-top, padding-bottom, text-align |
| `<h1>` - `<h6>` | Propietats de text (color, font-family, etc.). Mapejat als estils de Word: `<h1>` -> "Title", `<h2>` -> "Header1", `<h3>` -> "Header2", etc. |
| `<b>`, `<strong>` | Aplica negreta al text |
| `<i>`, `<em>` | Aplica cursiva al text |
| `<u>` | Aplica subratllat al text |
| `<s>`, `<del>` | Aplica tatxat al text |
| `<ins>` | Equivalent a `<u>` |
| `<span>` | color, font-size, font-family, background-color, text-decoration |
| `<small>` | Redueix la mida de la font |
| `<ul>`, `<ol>`, `<li>` | Per a la creació de llistes ordenades i no ordenades. Suporta llistes niuades |
| `<table>`, `<tr>`, `<td>`, `<th>` | Per a la creació de taules. Les cel·les (`<td>`, `<th>`) suporten width i height (en percentatge o píxels), a més de les propietats de text i fons |
| `<br>` | Insereix un salt de línia |

Les propietats CSS suportades inclouen: color, font-size, font-family, background-color, text-decoration, padding-left, padding-top, padding-bottom, text-align (justify, center, right, left), width i height (només en cel·les de taula).

### 1.5. Opcions de Configuració Avançades: Personalització del Procés de Traducció

El constructor del mòdul HTML accepta un objecte d'opcions que permet un control granular sobre el procés de conversió:

- **styleSheet**: Una cadena de text que conté regles CSS. Aquestes regles s'aplicaran a tot el contingut HTML processat pel mòdul, permetent centralitzar els estils en lloc d'inserir-los en línia a cada fragment HTML.

- **styleTransformer**: Una funció de JavaScript que rep un objecte d'estils i el nom de l'etiqueta, i retorna un nou objecte d'estils. Permet reescriure dinàmicament els estils abans de la seva aplicació, ideal per a lògica condicional o per crear àlies d'estils.

- **ElementCustomizer**: Una funció que permet personalitzar les propietats del paràgraf de Word (w:pPr) basant-se en les classes CSS presents a l'element HTML. Això obre la porta a personalitzacions que van més enllà del que el CSS estàndard suportat pot fer.

- **ignoreUnknownTags**: Controla el comportament del mòdul quan es troba una etiqueta HTML no suportada. Els valors possibles són:
  - "block" (per defecte): Elimina la resta del paràgraf i renderitza el contingut de l'etiqueta desconeguda
  - "inline": Converteix l'etiqueta en una etiqueta inline, la qual cosa pot impedir la renderització correcta d'elements de bloc interns
  - "error": Llança una excepció, aturant el procés de generació del document

- **ignoreCssErrors**: Un booleà que, si es defineix com a true, fa que el mòdul ignori els errors durant l'anàlisi del CSS.

### 1.6. Casos Especials i Limitacions

#### SVG
És possible incloure imatges SVG dins del codi HTML. No obstant això, la seva correcta visualització està limitada a versions recents de Microsoft Office (a partir de la versió 2016 per a Windows, Mac, Android i Windows Mobile). En versions anteriors, l'SVG no es mostrarà. Aquesta és una consideració crítica de compatibilitat a tenir en compte si els documents generats es distribueixen a un públic ampli.

#### Corrupció de Documents
Com qualsevol eina que manipula la complexa estructura XML dels documents d'Office, poden sorgir problemes. Per exemple, s'han documentat i corregit problemes específics relacionats amb taules dins de capçaleres que utilitzen amplades de columna en percentatge. Això subratlla la importància de mantenir tant el nucli de docxtemplater com els seus mòduls actualitzats a les darreres versions estables per beneficiar-se de les correccions d'errors.

## Secció 2: Domini del Mòdul d'Imatges (Image) (v3.32.0)

### 2.1. Principis Bàsics: Inserció Dinàmica d'Imatges

El mòdul d'Imatges és la solució integral per afegir o reemplaçar imatges de manera dinàmica en documents .docx, .pptx i, en combinació amb el mòdul XLSX, en fulls de càlcul .xlsx. La seva principal fortalesa rau en la flexibilitat per obtenir les dades de la imatge de múltiples fonts. El mòdul pot gestionar dades de manera síncrona, com ara llegir un fitxer del sistema de fitxers en un entorn Node.js, processar una cadena de text en format Base64, o utilitzar un buffer de memòria. A més, està preparat per a operacions asíncrones, permetent obtenir imatges des d'una URL remota, un servei d'emmagatzematge com Amazon S3, o qualsevol funció JavaScript que retorni una Promise.

### 2.2. Sintaxi i Context d'Ús: En Línia ({%...}) vs. Bloc ({%%...})

De manera similar al mòdul HTML, el mòdul d'Imatges utilitza diferents sintaxis de marcadors per a diferents contextos de disseny:

- **Imatges en Línia ({%...})**: Aquesta sintaxi, amb un únic símbol de percentatge, s'utilitza per a imatges que han de fluir dins d'un paràgraf, juntament amb el text. Un exemple seria `{%logo_empresa}`.

- **Imatges de Bloc ({%%...})**: La sintaxi amb doble percentatge, com `{%%grafic_vendes}`, està dissenyada per a imatges que han d'ocupar el seu propi paràgraf. Aquestes imatges solen estar centrades per defecte i requereixen que el marcador estigui en una línia separada, sense cap altre text o espai al mateix paràgraf.

Les regles de col·locació d'aquests marcadors són estrictes i varien segons el tipus de document. En documents .docx, tant els marcadors en línia com els de bloc han d'estar dins d'un paràgraf. Per als marcadors de bloc, aquest paràgraf ha de ser exclusiu per al marcador. En presentacions .pptx, els marcadors han de col·locar-se en un quadre de text dedicat, de nou, sense cap altre contingut.

### 2.3. El Nucli de la Configuració: L'Objecte imageOptions

Toda la lògica i personalització del mòdul es canalitza a través d'un objecte de configuració, anomenat imageOptions, que es passa al constructor `new ImageModule(imageOptions)`. Aquest objecte es basa principalment en tres funcions que el desenvolupador ha d'implementar:

- **getImage(tagValue, tagName, meta)**: Aquesta és la funció responsable d'obtenir les dades binàries de la imatge. Rep el valor del camp corresponent al JSON (tagValue, p. ex., 'imatges/logo.png'), el nom del marcador a la plantilla (tagName, p. ex., 'logo_empresa'), i un objecte de metadades (meta). Ha de retornar les dades de la imatge en un format adequat (Buffer, Blob, Promise, etc.).

- **getSize(img, tagValue, tagName, context)**: Aquesta funció determina les dimensions finals de la imatge al document. Rep les dades de la imatge retornades per getImage, el tagValue, el tagName i un objecte de context que conté informació útil com l'amplada del contenidor (context.part.containerWidth). Ha de retornar un array amb l'amplada i l'alçada, p. ex., [ample, alt], en píxels.

- **getProps(img, tagValue, tagName)**: Permet definir propietats addicionals per a la imatge, com ara peus de foto, rotació, enllaços, text alternatiu, entre d'altres. Aquesta funció s'explorarà en detall més endavant.

Aquesta arquitectura converteix el mòdul d'imatges en un potent pipeline de processament d'actius. Permet al desenvolupador interceptar i manipular la imatge en cada etapa clau del seu cicle de vida dins del procés de generació: adquisició (getImage), dimensionament (getSize) i enriquiment/estilització (getProps). En lloc de pre-processar les imatges abans de cridar docxtemplater, es pot delegar aquesta lògica a les funcions del mòdul. Això resulta en un codi més net i cohesionat, on les decisions de manipulació d'imatges es prenen amb el context complet del document, com ara l'amplada del contenidor disponible a getSize, que no seria coneguda fora del procés de renderització.

### 2.4. Gestió Avançada de la Mida i l'Escalat

El control precís sobre la mida de la imatge és una de les funcionalitats més importants. El mòdul ofereix diverses vies per aconseguir-ho:

#### Unitats i DPI
Tot i que getSize retorna valors en píxels per defecte, el mòdul permet especificar altres unitats com "cm", "in", "pt", etc. A més, es pot configurar l'opció dpi a l'objecte imageOptions per controlar la conversió de píxels a polzades, la qual cosa és crucial per a una renderització precisa a Microsoft Word, que utilitza internament les seves pròpies mètriques.

#### Manteniment de la Relació d'Aspecte
Una implementació comuna i recomanada dins de la funció getSize és utilitzar la propietat context.part.containerWidth per escalar la imatge de manera proporcional. Això assegura que la imatge s'ajusti a l'amplada disponible (p. ex., una cel·la de taula o l'amplada de la pàgina) sense distorsionar-se.

#### Dimensionament a la Plantilla (Filtres)
Per a un control més declaratiu, el mòdul s'integra amb el parser d'expressions d'Angular de docxtemplater. Això permet als dissenyadors de plantilles especificar transformacions de mida directament al marcador, utilitzant una sintaxi de filtres. Exemples inclouen:

- `{%imatge | scale:2}`: Escala la imatge al doble de la seva mida intrínseca
- `{%imatge | maxWidth:100}`: Assegura que la imatge no superi els 100 píxels d'amplada, escalant-la cap avall si és necessari, però sense escalar-la cap amunt si és més petita
- `{%imatge | maxWidth:"1in"}`: Permet utilitzar unitats directament a la plantilla

### 2.5. Propietats Dinàmiques d'Imatge amb getProps

La funció getProps desbloqueja un ampli ventall de funcionalitats avançades per enriquir les imatges inserides:

- **Peus de foto (Captions)**: Permet afegir un text descriptiu sota la imatge, amb opcions per personalitzar l'estil del paràgraf, l'alineació i un prefix (p. ex., "Figura 1")
- **Rotació i Volteig (Rotation/Flipping)**: Possibilita girar la imatge un nombre determinat de graus o voltejar-la horitzontalment o verticalment
- **Alineació (Alignment)**: Permet canviar l'alineació de les imatges de bloc (p. ex., a la dreta o a l'esquerra)
- **Vores (Borders)**: Permet afegir vores a les imatges, amb color, gruix i tipus personalitzables
- **Enllaços (Links)**: Converteix la imatge en un hipervincle clicable
- **Text Alternatiu (Name/Alt Text)**: Permet definir programàticament el text alternatiu de la imatge, una pràctica important per a l'accessibilitat

### 2.6. Tècniques Especials i Casos d'Ús

#### Reemplaçament d'Imatges Existents
Aquesta és una de les funcionalitats més potents del mòdul premium. En lloc d'inserir una nova imatge, es pot reemplaçar una imatge existent a la plantilla. Per fer-ho, s'ha de col·locar un marcador, com `{%imatge_perfil}`, dins del camp de text alternatiu (alt-text) de la imatge estàtica a la plantilla de Word. Quan es renderitza el document, el mòdul buscarà aquesta imatge i la substituirà per la imatge dinàmica corresponent. És possible mantenir la mida de la imatge original o especificar-ne una de nova a través de la funció getSize.

#### Imatge de Fons de Pàgina (.docx)
El mòdul permet establir una imatge com a fons de pàgina complet. Aquesta tècnica requereix una combinació d'un filtre a la plantilla (p. ex., `{%imatge_fons | coverPage}`) i una implementació específica de les funcions getProps i getSize per configurar correctament les propietats de posicionament i embolcall de la imatge a l'XML del document.

#### Gestió de Formats
El mòdul gestiona de manera nativa imatges en format Base64 incrustades a les dades JSON. També suporta imatges SVG, tot i que amb la limitació de compatibilitat ja esmentada (només visibles en versions recents d'Office). Per a formats no suportats per Microsoft Word, com WebP, el desenvolupador és responsable de convertir la imatge a un format compatible (com PNG o JPEG) dins de la lògica de la funció getImage abans de retornar les dades binàries.

## Secció 3: Guia Completa del Mòdul d'Estils (Styling) (v3.10.0)

### 3.1. Introducció a l'Estilització Dinàmica de Documents

El mòdul d'Estils (Styling) introdueix una capa de dinamisme visual a la generació de documents. La seva funció principal és permetre l'aplicació d'estils de manera condicional a diversos elements d'un document .docx o .pptx, basant-se en les dades proporcionades en el moment de la renderització. Això permet, per exemple, canviar el color de fons d'una cel·la de taula si un valor supera un llindar, ressaltar un paràgraf sencer basant-se en una condició de negoci, o fins i tot canviar l'esquema de colors de tot un document.

### 3.2. Catàleg d'Etiquetes d'Estil: L'Eina per a Cada Element

El mòdul proporciona un conjunt d'etiquetes específiques, cadascuna dissenyada per aplicar estils a un tipus d'element concret del document:

- `{:stylepar style}`: Aplica l'estil definit a la variable style a tot el paràgraf que conté l'etiqueta
- `{:stylecell style}`: S'utilitza dins d'una cel·la de taula per aplicar estils a aquesta cel·la específica
- `{:stylerow style}`: Col·locada en qualsevol cel·la d'una fila de taula, aplica l'estil a totes les cel·les d'aquesta fila
- `{:styleshape style}`: Permet modificar les propietats visuals de formes, com ara rectangles o cercles (p. ex., canviar el color de fons)
- `{:stylebullets style}`: S'utilitza en llistes amb vinyetes per modificar propietats específiques de les vinyetes, com el seu color
- `{:stylerun style}`: Aplica estils a un fragment de text específic (`<w:r>` o "run" en terminologia OpenXML) dins d'un paràgraf, permetent tenir múltiples estils (p. ex., diferents colors o negreta/cursiva) dins de la mateixa línia

### 3.3. Propietats d'Estil Aplicables: El Diccionari de Possibilitats

Les dades d'estil es proporcionen com un objecte JavaScript. Les propietats d'aquest objecte es tradueixen a les corresponents propietats XML del document. Les propietats més comunes inclouen:

- **Colors**: cellBackground, textColor, fillColor (per a formes), strokeColor (per a la vora de les formes), bulletColor
- **Tipografia**: fontFamily, fontSize (en punts), bold (booleà), italic (booleà), underline (booleà)
- **Alineació de Paràgraf**: textAlign (amb valors right, center, left, justify)
- **Vores**: borders, que accepta un objecte per definir les vores top, bottom, left, i right. Cada vora es pot configurar amb propietats com val (tipus de línia, p. ex., single), sz (gruix) i color
- **Estils Predefinits de Word**: pStyle, que permet aplicar un estil de paràgraf ja definit a la plantilla de Word (p. ex., "Heading 1", "Quote")

La següent matriu de compatibilitat il·lustra quines propietats són generalment aplicables a cada tipus d'etiqueta:

| Propietat d'Estil | :stylepar | :stylecell | :stylerow | :stylerun | :styleshape |
|-------------------|-----------|------------|-----------|-----------|-------------|
| cellBackground | ✓ | ✓ | ✓ | | |
| textColor | ✓ | ✓ | ✓ | ✓ | |
| fontFamily, fontSize | ✓ | ✓ | ✓ | ✓ | |
| bold, italic, underline | ✓ | ✓ | ✓ | ✓ | |
| textAlign | ✓ | ✓ | ✓ | | |
| borders | ✓ | ✓ | ✓ | | |
| pStyle | ✓ | ✓ | ✓ | | |
| fillColor, strokeColor | | | | | ✓ |
| bulletColor | ✓ | | | | |

### 3.4. Estilització de Seccions Delimitades: Precisió Quirúrgica

Introduïda a la versió 3.9.0 del mòdul, la sintaxi `{:stylestart style}...{:/style}` ofereix un control extremadament precís. Permet aplicar un estil només al contingut que es troba entre les etiquetes d'inici i de final. Aquesta funcionalitat és ideal per ressaltar valors dinàmics dins d'una frase més llarga. Per exemple, a la plantilla "El valor actual és {:stylestart estil_valor}{valor}{:/style}, superant les expectatives", només el contingut de la variable {valor} rebrà l'estil definit a estil_valor.

### 3.5. Modificació d'Estils Globals: El Poder de ::stylepar

Aquesta és una de les funcionalitats més avançades i transformadores del mòdul, introduïda a la versió 3.10.0. La sintaxi especial amb doble dos punts, `{::stylepar...}`, permet modificar la definició d'un estil de Word a nivell global per a tot el document.

El mecanisme funciona de la següent manera: si es col·loca una etiqueta com `{::stylepar estil_capcalera}` en un paràgraf que ja té aplicat l'estil "Heading 1" a la plantilla, les propietats definides a l'objecte de dades estil_capcalera (p. ex., `{ textColor: "#FF0000" }`) no només s'aplicaran a aquest paràgraf, sinó que modificaran la definició de l'estil "Heading 1" a tot el document. Com a resultat, tots els paràgrafs que utilitzin l'estil "Heading 1" es tornaran vermells.

Aquesta capacitat permet la creació de documents amb temes dinàmics. Una única plantilla podria generar informes amb diferents esquemes de colors corporatius simplement canviant un objecte de dades. Per mantenir el document final net, es pot utilitzar l'opció `dropGenericStyleParagraph: true` al constructor del mòdul, la qual cosa eliminarà automàticament el paràgraf que conté l'etiqueta `{::stylepar...}` després que hagi complert la seva funció declarativa.

### 3.6. API Avançada: setThemeColors

Anant un pas més enllà de la modificació d'estils individuals, el mòdul exposa una funció `styleModule.setThemeColors({...})` que permet canviar els colors del tema del document a un nivell més fonamental. Aquesta funció modifica directament el fitxer theme/theme1.xml dins del paquet del document, alterant els colors base com "Accent 1", "Dark 1", "Light 1", etc., que s'utilitzen a tota la interfície d'estils de Word. Per utilitzar-la, s'ha de cridar a la instància del mòdul després d'haver creat la instància de docxtemplater, però abans de cridar el mètode render().

## Secció 4: Anàlisi a Fons del Mòdul XLSX (v3.30.3)

### 4.1. Fonaments de la Generació de Fulls de Càlcul

El mòdul XLSX estén el motor de docxtemplater per permetre la generació i manipulació de fitxers de Microsoft Excel (.xlsx). Aquesta extensió va molt més enllà de la simple substitució de text en cel·les; proporciona un conjunt d'eines per treballar amb la naturalesa estructurada dels fulls de càlcul, incloent la inserció dinàmica de files i columnes, i la gestió de tipus de dades específics d'Excel.

### 4.2. Gestió Sofisticada de Tipus de Dades

Una de les característiques més potents del mòdul és la seva capacitat per crear cel·les amb tipus de dades natius d'Excel, la qual cosa assegura que els nombres siguin tractats com a nombres, les dates com a dates, etc., permetent càlculs i formatació posteriors dins d'Excel.

- **Tipus Bàsics**: Per a nombres (enters o de coma flotant) i cadenes de text, simplement es proporcionen els valors directament al JSON.
- **Tipus Complexos**: Per a tipus de dades més específics, es requereix un objecte amb una clau type i una clau value. A més, es pot incloure una clau opcional fmt per especificar un codi de format d'Excel personalitzat.

La següent taula detalla l'estructura necessària per a cada tipus de dada complexa:

| Tipus de Dada | Clau de type | Estructura de l'Objecte de Dades | Descripció / Notes |
|---------------|--------------|----------------------------------|-------------------|
| Moneda | currency | `{ type: 'currency', value: 123.45 }` | El valor és un número. El format de moneda per defecte s'aplicarà, però es pot personalitzar amb fmt |
| Percentatge | percent | `{ type: 'percent', value: 0.25 }` | El valor és un número on 1.0 correspon a 100%. 0.25 es renderitzarà com "25%" |
| Data | date | `{ type: 'date', value: new Date(), fmt: 'DD/MM/YYYY' }` | value ha de ser un objecte Date de JavaScript. fmt permet un control total sobre la visualització de la data |
| Fórmula | formula | `{ type: 'formula', value: 'A1+B1', result: 42 }` | value és la cadena de la fórmula d'Excel. El camp opcional result conté el resultat pre-calculat, útil per a visors que no executen fórmules |
| Tipus Múltiples | ['formula', 'currency'] | `{ type: ['formula', 'currency'], value: 'SUM(A1:A5)' }` | Permet combinar un tipus (com fórmula) amb un format (com moneda) |

### 4.3. Bucles i Renderització Condicional: El Cor de la Dinamicitat

El mòdul aprofita la sintaxi de bucles de docxtemplater i l'adapta al context d'una graella:

- **Bucles de Fila (Verticals)**: Utilitzant la sintaxi estàndard `{#items}...{/items}`, si les etiquetes d'obertura i tancament es troben a la mateixa fila però en cel·les diferents, el mòdul crearà una nova fila per a cada element de l'array items, replicant el contingut i el format de la fila de la plantilla.

- **Bucles Interns (InnerLoops)**: Si les etiquetes `{#items}` i `{/items}` es col·loquen dins de la mateixa cel·la, el contingut del bucle es repetirà dins d'aquesta única cel·la. Per defecte, cada iteració s'afegeix en una nova línia, però aquest comportament es pot desactivar amb l'opció `innerLoopNewLine: false` al constructor del mòdul.

- **Bucles de Columna (Horitzontals)**: Aquesta és una funcionalitat extremadament potent per a la creació de taules dinàmiques. La sintaxi `{>users}{name}` indica una expansió horitzontal. Per a cada element de l'array users, el mòdul crearà una nova columna a la dreta, inserint el valor de name. Les cel·les existents a la dreta en la mateixa fila seran desplaçades, no sobreescrites.

- **Condicionals**: La mateixa sintaxi de bucle (`{#condicio}...{/condicio}`) s'utilitza per a la renderització condicional de files. Si el valor de condicio és false, null, undefined o un array buit, la fila sencera que conté el marcador serà eliminada del full de càlcul final.

### 4.4. Creació de Taules Dinàmiques Complexes

La veritable potència del mòdul es manifesta en combinar bucles verticals i horitzontals. Això permet generar una taula o graella completa a partir d'una estructura de dades bidimensional, com un array d'arrays. La sintaxi típica per a això seria:

```
{#files}{>.}{.}{/}
```

Aquí, `{#files}` itera sobre les files (l'array exterior) i `{>.}` itera sobre les columnes de cada fila (l'array interior), inserint cada valor (.) en una nova cel·la horitzontalment.

### 4.5. Opcions de Configuració i Optimització

El constructor `new XlsxModule(options)` accepta diverses opcions per personalitzar el seu comportament:

- **fmts**: Un objecte que permet definir els codis de format per defecte per a tipus com currency, date, i percent a nivell global, evitant haver d'especificar-los a cada objecte de dades.

- **preferTemplateFormat**: Si es defineix com a true, el mòdul intentarà utilitzar el format de cel·la que ja existeix a la plantilla si el tipus de dada que s'insereix coincideix (p. ex., si s'insereix un número en una cel·la ja formatada com a moneda, es mantindrà el format de moneda).

- **keepWrapping**: Per defecte, el text llarg en una cel·la amb un marcador s'ajustarà automàticament. Aquesta opció (true) permet mantenir la configuració d'ajust de text de la cel·la original de la plantilla.

- **autoMergeLoops**: Quan es defineix com a true, fusiona automàticament les cel·les verticals en bucles niats si el valor de la cel·la pare és el mateix, creant una presentació més neta per a dades jeràrquiques.

- **getRowHeight**: Permet proporcionar una funció personalitzada per calcular l'alçada de les files generades, oferint un control fi sobre l'aparença del document.

- **keepRowHeight: "always"**: Aquesta és una opció de rendiment crucial. Per a la inserció massiva de dades (milers de files), el càlcul de l'alçada de cada fila pot ser costós. Aquesta opció desactiva aquest càlcul, millorant significativament el rendiment.

### 4.6. Integracions i Limitacions

#### Imatges
La inserció d'imatges en un full de càlcul, utilitzant la sintaxi `{%...}`, requereix que el mòdul d'Imatges també estigui instal·lat i configurat.

#### Limitació de Fórmules
Aquesta és una limitació important a tenir en compte. Les fórmules d'Excel que fan referència a altres cel·les (p. ex., `=SUM(A1:A10)`) no s'actualitzen automàticament quan els bucles de docxtemplater insereixen o eliminen files. Si una fórmula a la fila 11 suma el rang A1:A10, i s'insereixen 5 noves files, la fórmula no s'ajustarà a `=SUM(A1:A15)`. El workaround recomanat per a fórmules que necessiten adaptar-se a la seva posició de fila és utilitzar funcions d'Excel com INDIRECT i ROW(). Per exemple, en lloc de `=A8+B8`, s'utilitzaria `=INDIRECT("A"&ROW()) + INDIRECT("B"&ROW())`.

#### API d'Inspecció
El mòdul exposa un mètode `xlsxModule.getSheets()` que, un cop carregada una plantilla, retorna un array que representa totes les fulles de càlcul i una estructura d'arbre dels marcadors trobats a cadascuna. Aquesta eina és extremadament útil per a la validació automàtica de plantilles o per a la generació dinàmica d'interfícies d'usuari que permetin als usuaris proporcionar dades per a una plantilla específica.

## Conclusió: Síntesi i Recomanacions Estratègiques

### Resum de les Capacitats Clau

L'anàlisi dels quatre mòduls premium de docxtemplater revela un ecosistema potent i cohesiu per a la generació de documents complexos. Cada mòdul aborda un conjunt de reptes específics amb un alt grau de control i flexibilitat:

- El **Mòdul HTML** serveix com un traductor eficaç de contingut web a format Word, ideal per a la integració amb editors de text enriquit.
- El **Mòdul Image** proporciona un pipeline complet per a la gestió d'actius visuals, des de l'adquisició asíncrona fins al dimensionament contextual i l'enriquiment amb metadades.
- El **Mòdul Styling** ofereix un control granular i condicional sobre l'aparença de cada element del document, arribant fins i tot a la modificació d'estils i temes globals.
- El **Mòdul XLSX** estén el poder del templating als fulls de càlcul, amb una gestió sofisticada de tipus de dades natius, bucles multidimensionals i optimitzacions de rendiment.

### Sinergies entre Mòduls

La veritable potència de l'ecosistema no rau només en les capacitats individuals de cada mòdul, sinó en les seves sinergies. La combinació estratègica d'aquests mòduls permet la creació de documents que serien extremadament complexos o impossibles de generar d'una altra manera:

- **XLSX + Image**: Permet generar informes financers o de vendes en Excel que inclouen no només dades tabulades dinàmiques, sinó també logotips d'empresa, fotos de productes o gràfics exportats com a imatges.

- **HTML + Styling**: Un cas d'ús potent seria inserir una descripció de producte formatada des d'un CMS utilitzant el mòdul HTML, i després aplicar un tema de color dinàmic a tot el document (incloent el contingut HTML inserit) utilitzant la funcionalitat `{::stylepar}` del mòdul Styling, per adaptar l'informe a diferents marques.

- **Tots junts**: És possible concebre un informe anual complex en format .docx que inclogui: una secció de resum executiu inserida com a HTML (`{~~resum}`); taules de dades financeres generades amb bucles i estils condicionals (`{:stylecell style}`); imatges dinàmiques com gràfics o fotos de directius (`{%foto_ceo}`); i un tema de color global que s'ajusti a la identitat corporativa de l'any en curs (`styleModule.setThemeColors`).

### La Plantilla com a Lògica de Presentació

Amb l'ús d'aquests mòduls, la plantilla de Word, PowerPoint o Excel deixa de ser un simple document estàtic amb marcadors. Es converteix en una capa de lògica de presentació sofisticada. Conté no només l'estructura visual, sinó també les regles per a la renderització condicional, l'expansió de dades i l'estilització dinàmica. Aquesta evolució implica que les plantilles han de ser tractades com un actiu de software més: han de ser versionades, provades i documentades. L'existència de mòduls com error-location, que insereix comentaris de Word als llocs on es produeixen errors de plantilla, subratlla aquesta complexitat i la necessitat d'un enfocament rigorós en el seu manteniment.

### Recomanacions Finals

Per a aprofitar al màxim el potencial d'aquests mòduls en el desenvolupament del seu software, es recomanen les següents estratègies:

1. **Dissenyar primer les dades**: Abans de crear la plantilla, cal dissenyar l'estructura del JSON que proporcionarà les dades. Una estructura de dades ben pensada, que s'alineï amb la lògica de bucles, condicionals i tipus de dades dels mòduls, simplificarà enormement el disseny de la plantilla i la implementació del codi.

2. **Crear una capa d'abstracció**: En lloc de cridar directament a docxtemplater i configurar els mòduls a diferents llocs de l'aplicació, és aconsellable crear un servei o una classe centralitzada (p. ex., DocumentGenerationService). Aquesta capa encapsularia la inicialització de docxtemplater, la càrrega de plantilles, la configuració condicional dels mòduls necessaris per a cada plantilla, i la lògica de renderització. Això millora la mantenibilitat, la reutilització del codi i facilita la gestió de les dependències entre mòduls.

3. **Manteniment i actualització proactius**: L'ecosistema de docxtemplater està en constant evolució. La compatibilitat entre la versió del nucli i les versions dels mòduls és crucial per a l'estabilitat i per evitar errors inesperats. Cal establir un procés per revisar periòdicament els registres de canvis (CHANGELOG) dels mòduls i del nucli, i planificar actualitzacions per beneficiar-se de noves funcionalitats, millores de rendiment i correccions d'errors crítics.