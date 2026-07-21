/**
 * Contenido dummy por parada para seed-dev — tips y docs coherentes con
 * Itinerary (actividades / transporte / costumbres). No son bookings reales.
 */
import type { DocumentKind } from "../src/generated/prisma/client";

export type DummyNote = { title: string; body: string; pinned?: boolean };
export type DummyDoc = { label: string; kind: DocumentKind; note: string };

export type StopDummy = { notes: DummyNote[]; docs: DummyDoc[] };

export const STOP_DUMMY: Record<string, StopDummy> = {
  londres: {
    notes: [
      {
        title: "Oyster / contactless",
        body: "Misma tarjeta todo el día: tope Z1–2 ~£8.90. Piccadilly desde Heathrow ~£5.60; Citymapper > Google Maps.",
      },
      {
        title: "Museos gratis",
        body: "British Museum, Tate Modern, National Gallery: llegar 10am entre semana; no apilar 2 museos grandes el mismo día.",
      },
      {
        title: "Reservas agosto",
        body: "Tower, Churchill War Rooms y HP Studio: online con meses. Sky Garden gratis pero cupo ~1–2 semanas antes.",
      },
      {
        title: "Colas y pubs",
        body: "No colarse en filas. Sunday roast: reservar. Cena 18–20h; service charge 12,5% a veces opcional.",
      },
    ],
    docs: [
      { label: "Hostel Londres", kind: "checkin", note: "Check-in zona King's Cross · 8 noches (dummy)" },
      { label: "LNER → York", kind: "train", note: "Advance ~£28+ · confirmación (dummy)" },
      { label: "Tower of London", kind: "ticket", note: "Entrada online ~£37 · slot (dummy)" },
      { label: "Harry Potter Studio", kind: "ticket", note: "Leavesden · reserva obligatoria (dummy)" },
    ],
  },
  york: {
    notes: [
      {
        title: "Todo a pie",
        body: "Centro amurallado en 15–20 min; estación → Shambles ~5–10 min caminando. No hace falta bus.",
      },
      {
        title: "Shambles temprano",
        body: "Antes de las 9am para foto limpia; a las 11am es un caño. Inspiración Diagon Alley.",
      },
      {
        title: "AVG free tour",
        body: "Guías voluntarios 10:30 y 13:15 en Exhibition Square; reservar online, propina no esperada.",
      },
      {
        title: "Pubs Micklegate",
        body: "Pintas ~£4–5 vs £7–8 junto al Minster. Jueves noche estudiantil fuerte.",
      },
    ],
    docs: [
      { label: "York Minster", kind: "ticket", note: "~£26 online · válido 1 año · Central Tower (dummy)" },
      { label: "JORVIK Viking Centre", kind: "ticket", note: "Slot online ~£17.50 · se llena en agosto (dummy)" },
      { label: "LNER York → Edimburgo", kind: "train", note: "Advance · opcional parada Durham (dummy)" },
      { label: "Ghost Walk", kind: "voucher", note: "~£10+ · reservar en temporada (dummy)" },
    ],
  },
  edimburgo: {
    notes: [
      {
        title: "Fringe pleno",
        body: "Ciudad llena en agosto; madrugar Royal Mile. Shows gratis en la calle; comedias 1–2 semanas antes.",
      },
      {
        title: "Castillo y pases",
        body: "Edinburgh Castle: reservar semanas antes. Explorer Pass HES rinde si sumás Highlands.",
      },
      {
        title: "Arthur's Seat",
        body: "Amanecer = sin gente; 2–3h desde Holyrood. Abrigo: frío arriba aunque sea agosto.",
      },
      {
        title: "Transporte local",
        body: "Caminá casi todo. Contactless Lothian tope ~£5.70/día; bus tap al subir, tranvía on/off.",
      },
    ],
    docs: [
      { label: "Edinburgh Castle", kind: "ticket", note: "Online ~£21.50 · slot 9:30 (dummy)" },
      { label: "Auto Highlands", kind: "voucher", note: "Retiro/devolución EDI · Hertz (dummy)" },
      { label: "Real Mary King's Close", kind: "ticket", note: "~£35 · pre-booking obligatorio (dummy)" },
      { label: "Military Tattoo", kind: "ticket", note: "21h · plan B Calton Hill si agotado (dummy)" },
    ],
  },
  "fort-william": {
    notes: [
      {
        title: "A82 y Glencoe",
        body: "Edimburgo → FW ~3h por Loch Lomond/Glencoe; Three Sisters y Glen Etive valen paradas foto.",
      },
      {
        title: "Steall Falls",
        body: "Plan chill en Glen Nevis 1.5–2h si no subís Ben Nevis. Comprar Smidge antes por midges.",
      },
      {
        title: "Glenfinnan tren",
        body: "Parking 45–60 min antes del Jacobite. Morning sale FW ~10:15; efectivo en taquilla FW.",
      },
      {
        title: "Nafta y single-track",
        body: "Tanque >½ siempre. Ceder paso en passing places; no estacionar en apartaderos para fotos.",
      },
    ],
    docs: [
      { label: "Auto circuito Highlands", kind: "other", note: "Seguro + millaje · maps offline (dummy)" },
      { label: "Jacobite Steam Train", kind: "train", note: "Opcional return · reservar o cupos día (dummy)" },
      { label: "Nevis Range gondola", kind: "ticket", note: "~£20 ida/vuelta · clima en webcam (dummy)" },
      { label: "Alojamiento Fort William", kind: "checkin", note: "2 noches · cocina pubs cierra ~21h (dummy)" },
    ],
  },
  portree: {
    notes: [
      {
        title: "Salir 8am Skye",
        body: "Storr, Fairy Pools y Quiraing: parking lleno antes de 9am. Norte y oeste en días separados.",
      },
      {
        title: "Cena reservada",
        body: "Agosto: reservar restaurante al volver del día; oferta limitada en Portree.",
      },
      {
        title: "Eilean Donan",
        body: "Camino A87: abre 9am, £13 solo en caja el día; llegar temprano.",
      },
      {
        title: "Fairy Pools",
        body: "Parking £5; piscinas más lejos del parking están más vacías. Agua fría pero aguantable.",
      },
    ],
    docs: [
      { label: "Parking Old Man of Storr", kind: "other", note: "£5–7 pay-and-display · efectivo backup (dummy)" },
      { label: "Talisker Distillery", kind: "ticket", note: "Tour ~£15–20 · online (dummy)" },
      { label: "Alojamiento Portree", kind: "checkin", note: "Noches Skye · reservar mesa cena (dummy)" },
      { label: "Loch Coruisk boat", kind: "voucher", note: "Desde Elgol ~£20–25 · anticipado (dummy)" },
    ],
  },
  inverness: {
    notes: [
      {
        title: "Urquhart + Games",
        body: "Si hay Highland Games en Drumnadrochit, combinar con Urquhart temprano (~9:30).",
      },
      {
        title: "Culloden y Clava",
        body: "Culloden ~£14 NTS; Clava Cairns gratis a 8 km — silencioso, vibes Outlander.",
      },
      {
        title: "Leakey's",
        body: "Librería en iglesia del s. XVIII en Church Street; chimenea enorme, libros hasta el techo.",
      },
      {
        title: "Hootananny",
        body: "Folk en vivo casi todas las noches ~21:30; mejor apuesta ceilidh del tramo rural.",
      },
    ],
    docs: [
      { label: "Urquhart Castle", kind: "ticket", note: "Explorer Pass o ~£12–14 online (dummy)" },
      { label: "Culloden Battlefield", kind: "ticket", note: "NTS ~£14 · medio día (dummy)" },
      { label: "Alojamiento Inverness", kind: "checkin", note: "Cargar nafta antes A9 sur (dummy)" },
      { label: "Highland Games", kind: "other", note: "Drumnadrochit · horario del día (dummy)" },
    ],
  },
  "edimburgo-2": {
    notes: [
      {
        title: "Tránsito sur A9",
        body: "Inverness → Rosyth ~3–3,5h por A9; hotel cerca del aeropuerto EDI para el vuelo a AMS.",
      },
      {
        title: "Devolver auto",
        body: "Devolver coche en EDI con margen antes del check-in del vuelo a Ámsterdam.",
      },
      {
        title: "Paradas A9",
        body: "Opcional: Pitlochry, Dunkeld, Stirling Castle (Explorer Pass) o The Kelpies en Falkirk.",
      },
      {
        title: "Equipaje vuelo",
        body: "Coordinar hora devolución Hertz con vuelo EDI→AMS ya comprado.",
      },
    ],
    docs: [
      { label: "Hotel tránsito Rosyth", kind: "checkin", note: "Noche pre-vuelo · cerca EDI (dummy)" },
      { label: "Devolución auto EDI", kind: "other", note: "Mañana salida · Rentalcars/Hertz (dummy)" },
      { label: "Vuelo EDI → Amsterdam", kind: "flight", note: "Confirmación comprada (dummy)" },
      { label: "Lockers equipaje", kind: "other", note: "Solo si hay hueco antes del vuelo (dummy)" },
    ],
  },
  amsterdam: {
    notes: [
      {
        title: "Anne Frank",
        body: "Tickets martes 10:00 CET, 6 semanas antes solo en annefrank.org. No reventa.",
      },
      {
        title: "Bici reglas",
        body: "Carril rojo ≠ acera; candado siempre. OVpay tope ~€10.50/día. Ferry IJ a Noord gratis.",
      },
      {
        title: "Museos top",
        body: "Van Gogh y Rijks reservar semanas antes. No caminar en carril bici — no frenan.",
      },
      {
        title: "RLD seguridad",
        body: "No fotografiar trabajadoras; pickpockets Centraal. Solo shops licenciados, no calle.",
      },
    ],
    docs: [
      { label: "Anne Frank House", kind: "ticket", note: "€16.50 online · slot (dummy)" },
      { label: "Van Gogh Museum", kind: "ticket", note: "€25–27 · obligatorio online (dummy)" },
      { label: "Hostel Ámsterdam", kind: "checkin", note: "4 noches · zona centro (dummy)" },
      { label: "Eurostar → París", kind: "train", note: "Centraal → Gare du Nord (dummy)" },
    ],
  },
  paris: {
    notes: [
      {
        title: "Bonjour primero",
        body: "Entrar diciendo bonjour cambia el trato. Carafe d'eau gratis; evitar menús con fotos junto a monumentos.",
      },
      {
        title: "Louvre y Sainte-Chapelle",
        body: "Louvre 2–3h con foco, no todo. Sainte-Chapelle mejor 10:30–14:30 con sol en vitrales.",
      },
      {
        title: "Navigo semana",
        body: "Singles finde; lun–jue Navigo Semaine + foto — incluye Versalles y aeropuerto.",
      },
      {
        title: "Estafas metro",
        body: "Pulseras Sacré-Cœur, anillo falso, clipboard: ignorar. Mochila adelante L1 y Châtelet.",
      },
    ],
    docs: [
      { label: "Louvre / Sainte-Chapelle", kind: "ticket", note: "Slots online (dummy)" },
      { label: "Torre Eiffel", kind: "ticket", note: "Cima online semanas antes (dummy)" },
      { label: "Catacumbas", kind: "ticket", note: "Reserva obligatoria · slot temprano (dummy)" },
      { label: "Vuelo París → Lisboa", kind: "flight", note: "Navigo cubre traslado aeropuerto (dummy)" },
    ],
  },
  lisboa: {
    notes: [
      {
        title: "Lunes Belém",
        body: "Jerónimos y Torre de Belém cierran lunes — mover Belém a sáb/dom o mar. Feira da Ladra mar/sáb.",
      },
      {
        title: "Tranvía 28",
        body: "Pickpockets #1: mochila adelante. Subir desde Campo Ourique para asiento vs Martim Moniz.",
      },
      {
        title: "Sintra entre semana",
        body: "Mar/mié mejor que finde; tickets Pena online días antes. Bolt > taxi sin taxímetro.",
      },
      {
        title: "Alfama madrugada",
        body: "Antes de 8am o después de 18h = barrio real. Miradouro Senhora do Monte vista top.",
      },
    ],
    docs: [
      { label: "Pastéis de Belém", kind: "other", note: "Fila rápida · canela en el local (dummy)" },
      { label: "Lisboa Card", kind: "voucher", note: "48–72h si Jerónimos + castillo + transporte (dummy)" },
      { label: "Hostel Lisboa (Bruno)", kind: "checkin", note: "Viva Viagem si no card (dummy)" },
      { label: "Tren Lisboa → Porto", kind: "train", note: "Alfa/CP advance (dummy)" },
    ],
  },
  porto: {
    notes: [
      {
        title: "Livraria Lello",
        body: "9:30 o post 17h; €10 ticket desconta en libro €10+. Cola 11–15h enorme.",
      },
      {
        title: "Bodegas Gaia",
        body: "Máximo 2 bodegas/día; reservar Sandeman/Graham's. Cena lejos de Ribeira.",
      },
      {
        title: "Francesinha",
        body: "Probar una vez (Café Santiago vs Brasão). Matosinhos > Ribeira para mariscos.",
      },
      {
        title: "Andante metro",
        body: "Tarjeta €0.60; línea E aeropuerto. Ciudad empinada: calzado con agarre.",
      },
    ],
    docs: [
      { label: "Livraria Lello", kind: "ticket", note: "Silver ~€10 · slot online (dummy)" },
      { label: "Crucero 6 puentes", kind: "voucher", note: "~€15 · atardecer Ribeira (dummy)" },
      { label: "Bodega Gaia", kind: "ticket", note: "Sandeman o Graham's (dummy)" },
      { label: "Alojamiento Porto", kind: "checkin", note: "Bolhão sáb mañana antes salida (dummy)" },
    ],
  },
  pititas: {
    notes: [
      {
        title: "Tramo Katia",
        body: "Mientras Bruno está en Lisboa/Porto; notas y gastos solo tuyos en Pititas.",
        pinned: true,
      },
      {
        title: "Plan flexible",
        body: "Sin guía fija: anotá trenes, cenas y entradas que compren entre ustedes.",
      },
      {
        title: "Gastos Spitwise",
        body: "Gastos en Pititas van solo Katia por default; Bruno carga si pagó algo del tramo.",
      },
      {
        title: "Cierre del tramo",
        body: "Alinear fin con la salida de Porto de Bruno; guardar vouchers propios.",
      },
    ],
    docs: [
      { label: "Alojamiento amigas", kind: "checkin", note: "Confirmación grupo (dummy)" },
      { label: "Tren / bus del tramo", kind: "train", note: "Transporte Pititas (dummy)" },
      { label: "Entrada museo / evento", kind: "ticket", note: "Lo que reserven juntas (dummy)" },
      { label: "Salida del tramo", kind: "flight", note: "Tren o vuelo de cierre (dummy)" },
    ],
  },
  estrasburgo: {
    notes: [
      {
        title: "Petite France",
        body: "Antes de 9am o atardecer; restaurantes del canal caros — cenar en Krutenau.",
      },
      {
        title: "Reloj astronómico",
        body: "Show ~12:30: llegar 11:30 para ticket €3. No hay show domingos.",
      },
      {
        title: "Winstubs",
        body: "Reservar Chez Yvonne o Fink Stuebel; flammekueche mediodía ~€10–14.",
      },
      {
        title: "Barrage Vauban",
        body: "Terraza gratis: mejor vista Ponts Couverts + catedral; mejor al atardecer.",
      },
    ],
    docs: [
      { label: "Catedral Notre-Dame", kind: "ticket", note: "Plataforma e interior (dummy)" },
      { label: "Batorama Ill", kind: "voucher", note: "Crucero canales ~1h (dummy)" },
      { label: "Winstub cena", kind: "other", note: "Reserva nombre + hora (dummy)" },
      { label: "Tren → Colmar", kind: "train", note: "~15 min TER frecuente (dummy)" },
    ],
  },
  colmar: {
    notes: [
      {
        title: "Petite Venise AM",
        body: "Foto matutina sin tours; casco histórico 30 min a pie.",
      },
      {
        title: "Unterlinden martes",
        body: "Retablo de Isenheim: museo cierra martes. Audioguía €3 recomendada.",
      },
      {
        title: "Kut'zig Bus",
        body: "Route des Vins sin auto: reservar online (mar–dom, no lunes).",
      },
      {
        title: "Vendimia",
        body: "Septiembre plena vendimia; bici 6 km llana a Eguisheim ~€10–15/día.",
      },
    ],
    docs: [
      { label: "Musée Unterlinden", kind: "ticket", note: "Retablo Isenheim · evitar martes (dummy)" },
      { label: "Kut'zig Bus", kind: "ticket", note: "Eguisheim / Kaysersberg (dummy)" },
      { label: "Winstub Colmar", kind: "other", note: "Cena día 1 Petite Venise (dummy)" },
      { label: "Alojamiento Colmar", kind: "checkin", note: "2 noches Alsacia (dummy)" },
    ],
  },
  friburgo: {
    notes: [
      {
        title: "Bächle y Münster",
        body: "No pisar acequias; subir plataforma Münster y Schlossberg atardecer. Bici ~€10–15/día.",
      },
      {
        title: "Wutachschlucht",
        body: "Wanderbus solo fines de semana mid-week hay que planear vuelta. Impermeable en Selva Negra.",
      },
      {
        title: "Titisee bici",
        body: "Tren con bici a Titisee, bajar ~31 km downhill por Dreisamtal — Frelo ~€12/día.",
      },
      {
        title: "Vauban",
        body: "Barrio sostenible sin coches; contraste con Altstadt medieval — medio día suave.",
      },
    ],
    docs: [
      { label: "Augustinermuseum", kind: "ticket", note: "Plan día gris (dummy)" },
      { label: "Wanderbus Wutach", kind: "train", note: "Solo finde · PDF horarios (dummy)" },
      { label: "Alquiler bici Frelo", kind: "voucher", note: "Titisee → Friburgo downhill (dummy)" },
      { label: "Alojamiento Friburgo", kind: "checkin", note: "Münstermarkt sáb (dummy)" },
    ],
  },
  interlaken: {
    notes: [
      {
        title: "Ost vs West",
        body: "Ost: Lauterbrunnen/Grindelwald y Brienz; West: Thun/Berna. Elegí base según salidas.",
      },
      {
        title: "Bettag domingo",
        body: "Feriado suizo: todo más quieto; comprar provisiones el sábado. Coop estación abre domingo más caro.",
      },
      {
        title: "Parapente AM",
        body: "Reservar online; mañana aire más calmo. Pagar CHF, rechazar conversión automática EUR.",
      },
      {
        title: "Guest Card",
        body: "Pedir Interlaken Guest Card en hostel: buses locales + descuentos atracciones.",
      },
    ],
    docs: [
      { label: "Parapente / canyoning", kind: "voucher", note: "CHF 115–208 · cancelación por viento (dummy)" },
      { label: "Harder Kulm", kind: "ticket", note: "Funicular · sunset (dummy)" },
      { label: "Alojamiento Interlaken", kind: "checkin", note: "Ost o West según treks (dummy)" },
      { label: "SBB / Jungfrau", kind: "train", note: "First/Schynige según clima · Eurail (dummy)" },
    ],
  },
  grindelwald: {
    notes: [
      {
        title: "First vs Jungfrau",
        body: "First mejor precio/experiencia: Bachalpsee + Cliff Walk. Jungfraujoch solo cielo azul — webcam Sphinx.",
      },
      {
        title: "Terminal vs pueblo",
        body: "Eiger Express y Männlichen salen de Grindelwald Terminal, no siempre de la estación del pueblo.",
      },
      {
        title: "Capas mismo día",
        body: "15 °C pueblo / bajo cero Jungfraujoch; tickets montaña comprar día previo online.",
      },
      {
        title: "Komoot trails",
        body: "Eiger trails y First→Faulhorn→Schynige: app offline para senderos.",
      },
    ],
    docs: [
      { label: "Grindelwald First", kind: "ticket", note: "Return · −25% Eurail (dummy)" },
      { label: "Jungfraujoch", kind: "ticket", note: "Solo buen tiempo · webcam (dummy)" },
      { label: "Pfingstegg", kind: "ticket", note: "Teleférico barato · mirador glaciar (dummy)" },
      { label: "Hostel Grindelwald", kind: "checkin", note: "Provisiones Coop (dummy)" },
    ],
  },
  lauterbrunnen: {
    notes: [
      {
        title: "Provisiones",
        body: "Comprar en Interlaken antes de subir: Coop Lauterbrunnen pequeño y más caro.",
      },
      {
        title: "Schilthorn clima",
        body: "Desde Mürren return; −25% Eurail. Mismo día 15 °C valle / 3 °C cumbre.",
      },
      {
        title: "Trümmelbach",
        body: "Plan lluvia: cascadas dentro de la montaña; bus desde valle aparte.",
      },
      {
        title: "Mürren sin autos",
        body: "Pueblo sin coches; tren/cable con Eurail desde Lauterbrunnen — no pagar suelto si tenés pase.",
      },
    ],
    docs: [
      { label: "Schilthorn Piz Gloria", kind: "ticket", note: "Desde Mürren · vistas Eiger (dummy)" },
      { label: "Trümmelbachfälle", kind: "ticket", note: "Interior montaña · plan lluvia (dummy)" },
      { label: "Alojamiento valle", kind: "checkin", note: "Lauterbrunnen / Mürren / Wengen (dummy)" },
      { label: "Wengen–Männlichen", kind: "train", note: "Panoramaweg · jungfrau.ch (dummy)" },
    ],
  },
  innsbruck: {
    notes: [
      {
        title: "Innsbruck Card",
        body: "48h rinde con Nordkette + Ambras + Alpenzoo + IVB si hacés 2+ atracciones.",
      },
      {
        title: "Nordkette webcam",
        body: "Ver visibilidad antes de subir; con niebla no vale. Capas: valle vs cumbre.",
      },
      {
        title: "Euro al llegar",
        body: "Después de Suiza CHF, Austria en € — más simple para pagos.",
      },
      {
        title: "Altstadt a pie",
        body: "Casco + Bergisel caminables; lockers Hauptbahnhof si es tránsito.",
      },
    ],
    docs: [
      { label: "Innsbruck Card 48h", kind: "voucher", note: "Nordkette + museos (dummy)" },
      { label: "Nordkette cable", kind: "ticket", note: "Card o suelto · webcam primero (dummy)" },
      { label: "Schloss Ambras", kind: "ticket", note: "Card o entrada individual (dummy)" },
      { label: "Hostel Innsbruck", kind: "checkin", note: "Tránsito o 1–2 noches (dummy)" },
    ],
  },
  viena: {
    notes: [
      {
        title: "Hostel Viena",
        body: "Wombats City · check-in 15:00. Prioridad: Schönbrunn jardines (gratis) + Belvedere con slot. Naschmarkt sáb.",
        pinned: true,
      },
      {
        title: "Café vienés",
        body: "UNESCO: sentarse horas OK. Café Central turístico pero vale. Melange + Apfelstrudel.",
      },
      {
        title: "Tranvía Ring",
        body: "Líneas 1 y 2 recorren Ringstrasse: tour arquitectónico barato con ticket normal.",
      },
      {
        title: "Grüß Gott",
        body: "Saludo austríaco. Propina 5–10%; tarjetas casi everywhere. City Card si usás transporte diario.",
      },
    ],
    docs: [
      { label: "Check-in Wombats Vienna", kind: "checkin", note: "15:00 · locker · WiFi (dummy)" },
      { label: "Voucher Wombats", kind: "voucher", note: "Booking · dorm · cancelación (dummy)" },
      { label: "Entrada Belvedere", kind: "ticket", note: "Upper Belvedere · El Beso (dummy)" },
      { label: "Vienna City Card", kind: "voucher", note: "72h si transporte diario (dummy)" },
    ],
  },
  praga: {
    notes: [
      {
        title: "Comida Praga",
        body: "Salir 10–15 min del tourist highway. Svíčková ~180–250 CZK. Cerveza tanque 50–70 CZK. Koláče de barrio sí.",
        pinned: true,
      },
      {
        title: "Propina Chequia",
        body: "Redondear / ~10%. Pedir cuenta: 'Účet, prosím'. No es el dziękuję polaco.",
      },
      {
        title: "Puente Carlos amanecer",
        body: "5:30–7h de los mejores momentos. Josefov cerrado sábados (Shabat).",
      },
      {
        title: "Castillo patios",
        body: "Patios y jardines del castillo gratis; interiores aparte. Vinohrady/Letná menos masificado.",
      },
    ],
    docs: [
      { label: "Hostel Prague", kind: "voucher", note: "Check-in 14:00 · cerca Náměstí Míru (dummy)" },
      { label: "Castillo de Praga", kind: "ticket", note: "Interiores + Golden Lane (dummy)" },
      { label: "Concierto / jazz", kind: "ticket", note: "Iglesia barroca o club (dummy)" },
      { label: "Tren Praga → Cracovia", kind: "train", note: "RegioJet / PKP advance (dummy)" },
    ],
  },
  cracovia: {
    notes: [
      {
        title: "Auschwitz — crítico",
        body: "Reserva visit.auschwitz.org 1–2 meses. Día completo; silencio; no selfies. Bus MDA ~1h30.",
        pinned: true,
      },
      {
        title: "Wieliczka",
        body: "Online 3–5 días antes; 700 escalones, 14 °C — abrigo. Capilla Santa Kinga imperdible.",
      },
      {
        title: "PLN y propina",
        body: "Efectivo milk bars. Propina ~10% cash. dziękuję al pagar = no querés vuelto.",
      },
      {
        title: "Schindler lunes",
        body: "Fábrica cerrada lunes; sinagogas Kazimierz cerradas sábados. Mochila Auschwitz max chica.",
      },
    ],
    docs: [
      { label: "Auschwitz — visit.auschwitz.org", kind: "ticket", note: "Slot · tour educator EN (dummy)" },
      { label: "Check-in Cracovia", kind: "checkin", note: "Código puerta · check-in 15hs (dummy)" },
      { label: "Minas Wieliczka", kind: "ticket", note: "Ruta turística · slot online (dummy)" },
      { label: "Wawel", kind: "ticket", note: "Salas Reales · reservar online (dummy)" },
    ],
  },
  budapest: {
    notes: [
      {
        title: "Baños térmicos",
        body: "Széchenyi o Gellért: comprar online. Evitar vendedores de calle. Forint en cajero OTP.",
        pinned: true,
      },
      {
        title: "Forint no euro",
        body: "1 EUR ≈ 390–410 HUF; efectivo para termas y puestos. Bolt/Uber > taxi calle.",
      },
      {
        title: "Tranvía 2",
        body: "Recorre el Danubio — trayecto más bonito en tranvía. Metro 1 Földalatti bajo Andrássy.",
      },
      {
        title: "Distrito VII",
        body: "Pest caminable; ruin bars de noche. Traje de baño + chanclas para termas.",
      },
    ],
    docs: [
      { label: "Széchenyi baths", kind: "ticket", note: "Online · evitar reventa calle (dummy)" },
      { label: "Parlamento tour", kind: "ticket", note: "Slot idioma · online (dummy)" },
      { label: "BKK travel pass", kind: "voucher", note: "Según días · bkk.hu (dummy)" },
      { label: "Hostel Budapest", kind: "checkin", note: "Tramo Hungría (dummy)" },
    ],
  },
  liubliana: {
    notes: [
      {
        title: "Centro peatonal",
        body: "Casco histórico enorme para el tamaño; casi todo a pie. Prosim / hvala se agradece.",
      },
      {
        title: "Bicikelj",
        body: "1h gratis con tarjeta turística; útil para Tivoli o Metelkova.",
      },
      {
        title: "Day trip cuevas",
        body: "Postojna / Predjama o Bled según energía; tren+bus o tour.",
      },
      {
        title: "Euro desde 2007",
        body: "País en €; Urbana bus ~€1.30 single o bono 10 viajes.",
      },
    ],
    docs: [
      { label: "Castillo funicular", kind: "ticket", note: "Ljubljana Castle · vista (dummy)" },
      { label: "Postojna / Predjama", kind: "ticket", note: "Day trip cuevas (dummy)" },
      { label: "Ljubljana Card", kind: "voucher", note: "Transporte + museos si rinde (dummy)" },
      { label: "Alojamiento Liubliana", kind: "checkin", note: "Noches Eslovenia (dummy)" },
    ],
  },
  florencia: {
    notes: [
      {
        title: "Brunelleschi Pass",
        body: "€30 cubre Duomo complejo 3 días; Cúpola reservar semanas antes en temporada.",
      },
      {
        title: "Uffizi + Accademia",
        body: "David online obligatorio; Uffizi cerrado lunes. Café al banco €1.20 vs mesa €3–5.",
      },
      {
        title: "Coperto",
        body: "€1.50–3 legal en mesa, no es propina extra. Pietra serena resbala con lluvia — buen calzado.",
      },
      {
        title: "Octubre lluvia",
        body: "Capa para museos con calefacción. No apilar Uffizi + Accademia + Cúpola el mismo día.",
      },
    ],
    docs: [
      { label: "Brunelleschi Pass", kind: "ticket", note: "€30 · Cúpola slot (dummy)" },
      { label: "Galería Accademia", kind: "ticket", note: "David · reserva online (dummy)" },
      { label: "Uffizi", kind: "ticket", note: "Slot · evitar lunes (dummy)" },
      { label: "Tren Firenze → Roma", kind: "train", note: "Italo advance (dummy)" },
    ],
  },
  roma: {
    notes: [
      {
        title: "Nasoni",
        body: "Fuentes públicas: tapar agujero inferior, beber del chorro superior. Botella rellenable everywhere.",
      },
      {
        title: "Vaticano",
        body: "Museos online; Capilla Sixtina reserva obligatoria. Mochila adelante metro línea A.",
      },
      {
        title: "Coliseo",
        body: "Online 24h; arena/hipogeo extra. Multa por sentarse en Trevi/Spagna.",
      },
      {
        title: "City tax",
        body: "Algunos hostels piden city tax en cash al check-in. Pickpockets Termini.",
      },
    ],
    docs: [
      { label: "Coliseo + Foro", kind: "ticket", note: "Full Experience opcional (dummy)" },
      { label: "Museos Vaticanos", kind: "ticket", note: "Online · horario (dummy)" },
      { label: "Hostel Roma", kind: "checkin", note: "City tax cash posible (dummy)" },
      { label: "Tren Roma → Napoli", kind: "train", note: "Italo advance (dummy)" },
    ],
  },
  napoles: {
    notes: [
      {
        title: "Pompeya temprano",
        body: "Circumvesuviana; bajar en Pompei Scavi. Carteristas en tren: mochila adelante.",
      },
      {
        title: "Campania Express",
        body: "Verificar si opera en octubre; si no, Circumvesuviana con A/C.",
      },
      {
        title: "Auto solo al salir",
        body: "Retirar coche en aeropuerto al ir al Sur; no manejar centro Napoli.",
      },
      {
        title: "Pizza napolitana",
        body: "Da Michele o 50 Kalò; un plato por persona, cola normal.",
      },
    ],
    docs: [
      { label: "Entrada Pompeya", kind: "ticket", note: "Parque arqueológico (dummy)" },
      { label: "Circumvesuviana", kind: "train", note: "Day trip · EAV (dummy)" },
      { label: "Ferry / Sur", kind: "other", note: "Opcional nocturno a Sicilia (dummy)" },
      { label: "Hostel Napoles", kind: "checkin", note: "Antes salida Sur (dummy)" },
    ],
  },
  bari: {
    notes: [
      {
        title: "Bari Vecchia",
        body: "Orecchiette en Via dell'Arco Basso; focaccia barese €2–3 en Panificio Fiore.",
      },
      {
        title: "Hub trenes",
        body: "Polignano 30 min, Matera bus ~75 min, Alberobello ~1h. Evitar finde Polignano masificado.",
      },
      {
        title: "Ciudad real",
        body: "Menos postal que Lecce pero auténtica. Octubre: sin playa; focaccia + Matera de noche.",
      },
      {
        title: "Castillo Svevo",
        body: "Entrada ~€10. Base buena para Puglia sin auto obligatorio.",
      },
    ],
    docs: [
      { label: "Tren/bus Matera", kind: "train", note: "Bus suele ser más rápido (dummy)" },
      { label: "Castello Svevo", kind: "ticket", note: "AditusCulture online (dummy)" },
      { label: "Hostel Bari", kind: "checkin", note: "Hub Puglia 2–3 noches (dummy)" },
      { label: "Tren Bari → Lecce", kind: "train", note: "Frecuente · barato (dummy)" },
    ],
  },
  catania: {
    notes: [
      {
        title: "Etna octubre",
        body: "Teleférico + 4x4 opcional; Silvestri gratis. Capas: 0–5 °C arriba vs 20 °C abajo.",
      },
      {
        title: "Arancino catanés",
        body: "En Catania es arancino (masc.); pasta alla Norma local. Pescheria caótica auténtica.",
      },
      {
        title: "Base este",
        body: "Aeropuerto barato a BCN; tren a Siracusa/Taormina. Monastero Benedettini vale.",
      },
      {
        title: "Viento Etna",
        body: "Verificar funiviaetna.com antes; día gris → mercados / ciudad.",
      },
    ],
    docs: [
      { label: "Funivia Etna", kind: "ticket", note: "funiviaetna.com · capas (dummy)" },
      { label: "Monastero Benedettini", kind: "ticket", note: "Tour horario (dummy)" },
      { label: "Hostel Catania", kind: "checkin", note: "Base este Sicilia (dummy)" },
      { label: "Vuelo Catania salida", kind: "flight", note: "Opcional BCN · equipaje (dummy)" },
    ],
  },
  palermo: {
    notes: [
      {
        title: "Ballarò street food",
        body: "Mercado: arancina, panelle, cannolo rellenado al momento €2–3.",
      },
      {
        title: "Cappella Palatina",
        body: "Mosaicos bizantinos — no saltear. Monreale bus 389 ~20 min UNESCO.",
      },
      {
        title: "Caos = experiencia",
        body: "Ruidosa como Nápoles; mochila adelante. Vucciria/Ballarò de noche bares.",
      },
      {
        title: "Teatro Massimo",
        body: "Tour guiado; escena El Padrino III. Catacumbas Capuchinos macabras pero baratas.",
      },
    ],
    docs: [
      { label: "Palazzo dei Normanni", kind: "ticket", note: "Cappella Palatina horario (dummy)" },
      { label: "Teatro Massimo tour", kind: "ticket", note: "Guided · reserva (dummy)" },
      { label: "Hostel Palermo", kind: "checkin", note: "Zona Politeama (dummy)" },
      { label: "Tren / ferry sur", kind: "train", note: "Agrigento o Catania según ruta (dummy)" },
    ],
  },
  barcelona: {
    notes: [
      {
        title: "Sagrada Família",
        body: "Horario obligatorio online semanas antes; mejor luz matinal fachada Este.",
      },
      {
        title: "T-Casual",
        body: "10 viajes zona 1; metro L4/L5 cubren casco y Sagrada. Bon dia / Gràcies suman puntos.",
      },
      {
        title: "Bunkers Carmel",
        body: "Atardecer noviembre: subir antes. Chaqueta; playa para pasear no baño.",
      },
      {
        title: "Park Güell",
        body: "Franja horaria zona monumental; no ir sin ticket en temporada.",
      },
    ],
    docs: [
      { label: "Sagrada Família", kind: "ticket", note: "Slot · torre opcional (dummy)" },
      { label: "Park Güell", kind: "ticket", note: "Franja zona monumental (dummy)" },
      { label: "Hostel Barcelona", kind: "checkin", note: "Eixample o Born (dummy)" },
      { label: "Vuelo / tren salida", kind: "flight", note: "Fin tramo o hacia Madrid (dummy)" },
    ],
  },
  madrid: {
    notes: [
      {
        title: "Horario cena",
        body: "Cena 21–22h mínimo; a las 20h barrio vacío. Siesta 14–17h cierran comercios.",
      },
      {
        title: "Abono turístico",
        body: "CRTM zona A cubre centro; ver precios actuales en crtm.es.",
      },
      {
        title: "Museos gratis",
        body: "Prado / Reina Sofía franjas gratis según día — verificar calendario.",
      },
      {
        title: "Noviembre frío",
        body: "Abrigo y calzado cómodo. Carteristas Metro Sol/Gran Vía.",
      },
    ],
    docs: [
      { label: "Abono Turístico CRTM", kind: "voucher", note: "Zona A · días del tramo (dummy)" },
      { label: "Prado / Reina Sofía", kind: "ticket", note: "Slot gratis o paid (dummy)" },
      { label: "Hostel Madrid", kind: "checkin", note: "Lavapiés / Malasaña (dummy)" },
      { label: "Vuelo Madrid → BUE", kind: "flight", note: "Fin viaje · equipaje (dummy)" },
    ],
  },
};
