import { COURSES, formatPrice, type Course } from "./courses";

// Keyword-based mock replies. No real AI is involved: the seeded default
// prompts (identified by slug) pick a predefined response style, while custom
// prompt text is stored but not interpreted.

export type ReplyStyle = "advisor" | "beginner" | "planner" | "neutral";

export function styleForPromptSlug(slug: string | null | undefined): ReplyStyle {
  switch (slug) {
    case "koolituste-noustaja":
      return "advisor";
    case "algaja-abiline":
      return "beginner";
    case "opiplaani-koostaja":
      return "planner";
    default:
      return "neutral";
  }
}

type Intent =
  | { kind: "greeting" }
  | { kind: "thanks" }
  | { kind: "prices" }
  | { kind: "list" }
  | { kind: "format" }
  | { kind: "register" }
  | { kind: "beginner" }
  | { kind: "courses"; courses: Course[] }
  | { kind: "unknown" };

const has = (text: string, words: string[]) => words.some((w) => text.includes(w));

function detectIntent(raw: string): Intent {
  const text = raw.toLocaleLowerCase("et");

  const matched = COURSES.filter((c) => has(text, c.keywords));
  // "Excel" matches both Excel courses; narrow down when the level is clear.
  let courses = matched;
  if (matched.some((c) => c.id === "excel-edasijoudnutele") && has(text, ["pivot", "xlookup", "vlookup", "edasijõud", "makro", "analüüs"])) {
    courses = matched.filter((c) => c.id !== "excel-algajatele");
  } else if (has(text, ["excel"]) && has(text, ["algaja", "alusta", "esimest"])) {
    courses = matched.filter((c) => c.id !== "excel-edasijoudnutele");
  } else if (has(text, ["excel"])) {
    courses = COURSES.filter((c) => c.id.startsWith("excel")).concat(matched.filter((c) => !c.id.startsWith("excel")));
  }

  if (courses.length > 0) return { kind: "courses", courses };
  if (has(text, ["hind", "hinna", "maksab", "maksumus", "kui palju", "odav", "kallis", "€", "eur"])) return { kind: "prices" };
  if (has(text, ["registreeru", "registreeri", "ostan", "liitu", "kirja panna"])) return { kind: "register" };
  if (has(text, ["veebis", "veebi", "kohapeal", "zoom", "online", "distants"])) return { kind: "format" };
  if (has(text, ["algaja", "alusta", "ei oska", "vähe", "esimest korda", "lihtne", "vanem", "pension"])) return { kind: "beginner" };
  if (has(text, ["koolitus", "kursus", "mida pakute", "valik", "nimekiri", "kõik"])) return { kind: "list" };
  if (has(text, ["aitäh", "tänan", "tänud", "suur aitäh"])) return { kind: "thanks" };
  if (has(text, ["tere", "tervist", "hei", "tsau", "hommikust", "päevast", "õhtust"])) return { kind: "greeting" };
  return { kind: "unknown" };
}

function courseLine(c: Course) {
  return `**${c.name}** – tase: ${c.level}; kestus: ${c.duration}; formaat: ${c.format}; hind: ${formatPrice(c.price)}`;
}

function courseSimple(c: Course) {
  return `**${c.name}** (${formatPrice(c.price)}, ${c.format}). ${c.description}`;
}

const beginnerCourses = () => COURSES.filter((c) => c.level !== "edasijõudnu");

function planFor(courses: Course[]) {
  const order = [...courses].sort((a, b) => COURSES.indexOf(a) - COURSES.indexOf(b));
  return order.map((c, i) => `${i + 1}. samm: **${c.name}** (${c.duration}, ${formatPrice(c.price)}) – ${c.description}`).join("\n");
}

function suggestedPath(courses: Course[]): Course[] {
  // Build a sensible learning path around the matched courses.
  const ids = new Set(courses.map((c) => c.id));
  if (ids.has("excel-edasijoudnutele")) ids.add("excel-algajatele");
  if (ids.has("digiturundus-algajatele") || ids.has("excel-algajatele")) ids.add("kuberturvalisus");
  return COURSES.filter((c) => ids.has(c.id));
}

export function generateMockReply(userText: string, style: ReplyStyle): string {
  const intent = detectIntent(userText);

  switch (intent.kind) {
    case "greeting":
      return {
        advisor: "Tere! Olen DigiAbi, DigiStarti koolitusnõustaja. Kirjeldage palun, milliseid digioskusi soovite arendada, ja soovitan teile sobiva koolituse.",
        beginner: "Tere-tere! 😊 Mina olen DigiAbi. Siin võib küsida kõike – ka seda, mis tundub väga lihtne. Millega saan aidata?",
        planner: "Tere! Olen DigiAbi ja aitan koostada teile isikliku õpiplaani. Alustuseks: mida oskate juba praegu ja mida soovite õppida?",
        neutral: "Tere! Olen DigiAbi. Küsige julgelt DigiStarti koolituste kohta.",
      }[style];

    case "thanks":
      return {
        advisor: "Palun väga! Kui soovite, võin võrrelda koolitusi või aidata registreerumisega.",
        beginner: "Väga hea meel, et sain aidata! Küsige julgelt edasi, kui midagi jäi segaseks. 🌱",
        planner: "Palun! Kui olete valmis, võime õpiplaani koos täpsemaks teha.",
        neutral: "Palun! Kas saan veel millegagi aidata?",
      }[style];

    case "prices": {
      const list = COURSES.map((c) => `• ${c.name}: ${formatPrice(c.price)}`).join("\n");
      if (style === "beginner")
        return `Siin on hinnad lihtsalt kirjas:\n${list}\n\nKõige soodsam on „Küberturvalisus igapäevaselt“ ja algajale sobib hästi „Arvuti algkursus“.`;
      if (style === "planner")
        return `Koolituste hinnad:\n${list}\n\nNäiteks õpitee „Excel algajatele“ → „Excel edasijõudnutele“ maksab kokku ${formatPrice(129 + 189)}.`;
      return `DigiStarti koolituste hinnad:\n${list}\n\nHinnad sisaldavad õppematerjale ja tunnistust.`;
    }

    case "format":
      return `Koolitusi toimub nii veebis kui kohapeal:\n${COURSES.map((c) => `• ${c.name}: ${c.format}`).join("\n")}${
        style === "beginner" ? "\n\nKui arvutiga alles alustate, soovitame kohapealset koolitust – siis on juhendaja kohe kõrval." : ""
      }`;

    case "register":
      return "Registreerumine on selles demos kujuteldav – päris DigiStarti ei ole olemas. Päris teenuses saaks valitud koolitusele registreeruda veebilehe vormi kaudu. Kas soovite, et aitan enne sobivat koolitust valida?";

    case "beginner": {
      const courses = beginnerCourses();
      if (style === "planner") return `Algajale soovitan sellist õpiteed:\n${planFor(courses)}\n\nTempo võite valida ise – sammud ei pea järgnema kohe üksteisele.`;
      if (style === "beginner")
        return `Pole üldse muret – kõik alustavad kunagi! Kõige parem esimene samm on ${courseSimple(COURSES[0])}\n\nSeal näidatakse kõike rahulikult ja samm-sammult.`;
      return `Algajatele sobivad koolitused:\n${courses.map((c) => `• ${courseLine(c)}`).join("\n")}\n\nKui arvutikasutus on veel ebakindel, alustage „Arvuti algkursusest“.`;
    }

    case "list":
      if (style === "beginner") return `Meil on viis koolitust:\n${COURSES.map((c) => `• ${courseSimple(c)}`).join("\n")}\n\nKas kirjeldate, mida tahaksite osata? Siis aitan valida.`;
      if (style === "planner") return `Kõik koolitused soovitatud järjekorras:\n${planFor(COURSES)}`;
      return `DigiStarti koolitused:\n${COURSES.map((c) => `• ${courseLine(c)}`).join("\n")}`;

    case "courses": {
      const { courses } = intent;
      if (style === "planner") return `Teie huvidest lähtudes soovitan sellist õpiplaani:\n${planFor(suggestedPath(courses))}`;
      if (style === "beginner")
        return `${courses.map(courseSimple).join("\n\n")}\n\nÄrge muretsege, kui see tundub keeruline – juhendaja selgitab kõike rahulikult.`;
      if (style === "advisor")
        return `Teie küsimusele vastavad koolitused:\n${courses.map((c) => `• ${courseLine(c)}\n  ${c.description}`).join("\n")}\n\nSoovi korral võrdlen neid või aitan valida taseme järgi.`;
      return courses.map((c) => `${courseLine(c)}\n${c.description}`).join("\n\n");
    }

    case "unknown":
    default:
      return {
        advisor: "Vabandust, ma ei saanud päris täpselt aru. Võite küsida näiteks koolituste hindade, Exceli, digiturunduse või küberturvalisuse kohta.",
        beginner: "Ma ei saanud kahjuks päris hästi aru – aga pole hullu! Proovige näiteks küsida: „Mis koolitus sobib algajale?“",
        planner: "Et õpiplaani koostada, kirjeldage palun, mida soovite õppida (nt Excel, digiturundus, arvuti põhitõed või küberturvalisus).",
        neutral: "Ma ei leidnud sellele vastust. Küsige palun DigiStarti koolituste, hindade või formaadi kohta.",
      }[style];
  }
}
