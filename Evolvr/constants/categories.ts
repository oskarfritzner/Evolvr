export const categories = [
  { id: "physical", name: "Physical" },
  { id: "mental", name: "Mental" },
  { id: "intellectual", name: "Intellectual" },
  { id: "spiritual", name: "Spiritual" },
  { id: "financial", name: "Financial" },
  { id: "career", name: "Career" },
  { id: "relationships", name: "Relationships" },
];

export type CategoryId = (typeof categories)[number]["id"];
