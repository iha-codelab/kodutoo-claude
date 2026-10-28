export type Course = {
  id: string;
  name: string;
  level: string;
  duration: string;
  format: string;
  price: number;
  description: string;
  keywords: string[];
};

// Fictional DigiStart course catalogue used by the mock replies.
export const COURSES: Course[] = [
  {
    id: "arvuti-algkursus",
    name: "Arvuti algkursus",
    level: "algaja",
    duration: "4 nädalat (8 × 2 tundi)",
    format: "kohapeal Tallinnas",
    price: 149,
    description:
      "Arvuti sisse- ja väljalülitamine, failid ja kaustad, internetis sirvimine, e-kiri ja ID-kaardi kasutamine.",
    keywords: ["arvuti", "algkursus", "hiir", "klaviatuur", "fail", "kaust", "e-kiri", "email", "internet", "id-kaart"],
  },
  {
    id: "excel-algajatele",
    name: "Excel algajatele",
    level: "algaja",
    duration: "3 nädalat (6 × 2 tundi)",
    format: "veebis",
    price: 129,
    description: "Tabelite loomine, vormindamine, lihtsad valemid (SUM, AVERAGE), sortimine ja filtreerimine.",
    keywords: ["excel", "tabel", "arvutustabel", "valem", "sum"],
  },
  {
    id: "excel-edasijoudnutele",
    name: "Excel edasijõudnutele",
    level: "edasijõudnu",
    duration: "4 nädalat (8 × 2 tundi)",
    format: "veebis",
    price: 189,
    description: "Pivot-tabelid, XLOOKUP, tingimusvormindus, diagrammid ja andmete analüüs.",
    keywords: ["pivot", "xlookup", "vlookup", "diagramm", "analüüs", "makro", "edasijõud"],
  },
  {
    id: "digiturundus-algajatele",
    name: "Digiturundus algajatele",
    level: "algaja",
    duration: "5 nädalat (10 × 2 tundi)",
    format: "veebis",
    price: 219,
    description: "Sotsiaalmeedia turundus, Facebooki ja Instagrami postitused, lihtne reklaam ja tulemuste jälgimine.",
    keywords: ["turundus", "digiturundus", "sotsiaalmeedia", "facebook", "instagram", "reklaam", "müük"],
  },
  {
    id: "kuberturvalisus",
    name: "Küberturvalisus igapäevaselt",
    level: "kõik tasemed",
    duration: "2 nädalat (4 × 2 tundi)",
    format: "kohapeal Tallinnas või veebis",
    price: 99,
    description: "Turvalised paroolid, petukirjade äratundmine, kaheastmeline autentimine ja andmete varundamine.",
    keywords: ["turva", "küber", "parool", "pettus", "petukiri", "viirus", "häkker", "andmekaitse", "varundus"],
  },
];

export function formatPrice(price: number) {
  return `${price} €`;
}
