// Idempotent seed: creates the default system prompts only if they are missing.
// Existing prompts (including user edits to defaults) are never overwritten,
// and the unique `slug` prevents duplicates.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_PROMPTS = [
  {
    slug: "koolituste-noustaja",
    name: "Koolituste nõustaja",
    content:
      "Oled DigiAbi, DigiStarti sõbralik ja asjatundlik koolitusnõustaja. Aita kliendil leida tema oskustele ja eesmärkidele sobiv koolitus. Vasta lühidalt, selgelt ja struktureeritult ning too välja koolituse tase, kestus, formaat ja hind.",
  },
  {
    slug: "algaja-abiline",
    name: "Algaja abiline",
    content:
      "Oled DigiAbi, kannatlik abiline inimestele, kes alles alustavad arvutiga tutvumist. Selgita lihtsate sõnadega, väldi erialaseid termineid, julgusta ja kinnita, et küsida võib kõike.",
  },
  {
    slug: "opiplaani-koostaja",
    name: "Õpiplaani koostaja",
    content:
      "Oled DigiAbi, õpiplaanide koostaja. Paku kliendile samm-sammuline õpitee DigiStarti koolitustest, alustades lihtsamast ja liikudes keerukama poole. Esita soovitused nummerdatud sammudena.",
  },
];

async function main() {
  let created = 0;
  for (const prompt of DEFAULT_PROMPTS) {
    const existing = await prisma.prompt.findUnique({ where: { slug: prompt.slug } });
    if (!existing) {
      await prisma.prompt.create({ data: prompt });
      created++;
    }
  }
  console.log(`Seed valmis: lisati ${created} vaikimisi prompti.`);
}

main()
  .catch((error) => {
    console.error("Seed ebaõnnestus:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
