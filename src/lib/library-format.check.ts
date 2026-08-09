import { duplicateMaterialIds, formatBookTitle, materialFingerprint, parseSyllabusUnits } from "./library-format";

// ponytail: tiny self-check — fails loud if title/syllabus helpers break
function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

assert(
  formatBookTitle("grade-8-science-and-technology-part-i") === "Grade 8 — Science and Technology, Part I",
  `title format: got ${formatBookTitle("grade-8-science-and-technology-part-i")}`
);
assert(materialFingerprint("a.pdf", 10) === "a.pdf|10", "fingerprint");
assert(parseSyllabusUnits("Unit 1 Cells\n- DNA\nUnit 2 Energy\n- Heat").length === 2, "syllabus units");
assert(
  duplicateMaterialIds(
    [
      {
        id: "1",
        title: "A",
        type: "pdf",
        classId: "c1",
        subject: "Science",
        tags: [],
        uploadedAt: "2026-01-02",
        sizeLabel: "1",
        versions: [{ id: "v", version: 1, uploadedAt: "2026-01-02", note: "", fileName: "a.pdf" }],
        contentPreview: "",
        fileFingerprint: "a.pdf|10",
        fileSizeBytes: 10,
      },
      {
        id: "2",
        title: "A copy",
        type: "pdf",
        classId: "c1",
        subject: "Science",
        tags: [],
        uploadedAt: "2026-01-01",
        sizeLabel: "1",
        versions: [{ id: "v", version: 1, uploadedAt: "2026-01-01", note: "", fileName: "a.pdf" }],
        contentPreview: "",
        fileFingerprint: "a.pdf|10",
        fileSizeBytes: 10,
      },
    ],
    ["c1"]
  ).includes("2"),
  "dup keep newest"
);

console.log("library-format ok");
