import { jsPDF } from "jspdf";
import PptxGenJS from "pptxgenjs";
import { SLIDE_THEMES } from "./presentations";
import type { AttendanceRecord, Presentation, SchoolClass, Student } from "./types";
import { downloadBlob } from "./utils";

export function exportAttendancePdf(opts: {
  schoolName: string;
  className: string;
  date: string;
  period: number;
  rows: { roll: string; name: string; status: string }[];
}) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(opts.schoolName, 14, 18);
  doc.setFontSize(12);
  doc.text(`Attendance register — ${opts.className}`, 14, 28);
  doc.text(`Date: ${opts.date} · Period ${opts.period}`, 14, 36);
  let y = 48;
  doc.setFontSize(10);
  doc.text("Roll", 14, y);
  doc.text("Name", 40, y);
  doc.text("Status", 140, y);
  y += 6;
  doc.line(14, y, 196, y);
  y += 8;
  for (const r of opts.rows) {
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
    doc.text(r.roll, 14, y);
    doc.text(r.name.slice(0, 40), 40, y);
    doc.text(r.status, 140, y);
    y += 7;
  }
  doc.save(`attendance-${opts.date}.pdf`);
}

export function exportMarksheetPdf(opts: {
  schoolName: string;
  title: string;
  className: string;
  maxMarks: number;
  rows: { rank: number; roll: string; name: string; marks: string; pct: string; grade: string }[];
  average: string;
}) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(opts.schoolName, 14, 18);
  doc.setFontSize(12);
  doc.text(opts.title, 14, 28);
  doc.text(opts.className, 14, 36);
  doc.text(`Max: ${opts.maxMarks} · Class avg: ${opts.average}`, 14, 44);
  let y = 56;
  doc.setFontSize(9);
  ["#", "Roll", "Name", "Marks", "%", "Grade"].forEach((h, i) => {
    doc.text(h, [14, 28, 50, 120, 145, 165][i], y);
  });
  y += 6;
  doc.line(14, y, 196, y);
  y += 7;
  for (const r of opts.rows) {
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
    const vals = [String(r.rank), r.roll, r.name.slice(0, 28), r.marks, r.pct, r.grade];
    vals.forEach((v, i) => doc.text(v, [14, 28, 50, 120, 145, 165][i], y));
    y += 7;
  }
  doc.save(`${opts.title.replace(/\s+/g, "-")}-marks.pdf`);
}

export function exportReportCardPdf(opts: {
  schoolName: string;
  studentName: string;
  roll: string;
  className: string;
  attendancePct: number;
  lines: { title: string; marks: string; grade: string }[];
  comment: string;
}) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(opts.schoolName, 14, 18);
  doc.setFontSize(14);
  doc.text("Student Report Card", 14, 28);
  doc.setFontSize(11);
  doc.text(`${opts.studentName} (${opts.roll})`, 14, 40);
  doc.text(opts.className, 14, 48);
  doc.text(`Attendance: ${opts.attendancePct}%`, 14, 56);
  let y = 70;
  for (const l of opts.lines) {
    doc.text(`${l.title}: ${l.marks} · ${l.grade}`, 14, y);
    y += 8;
  }
  y += 6;
  doc.text("Teacher comment:", 14, y);
  y += 8;
  const split = doc.splitTextToSize(opts.comment, 180);
  doc.text(split, 14, y);
  doc.save(`report-${opts.roll}.pdf`);
}

export async function exportPresentationPptx(deck: Presentation) {
  const pptx = new PptxGenJS();
  const theme = SLIDE_THEMES[deck.theme];
  pptx.author = "TeachDesk";
  pptx.title = deck.title;
  for (const slide of deck.slides) {
    const s = pptx.addSlide();
    s.background = { color: theme.bg.replace("#", "") };
    s.addText(slide.title, {
      x: 0.5,
      y: 0.4,
      w: 9,
      h: 1,
      fontSize: 28,
      bold: true,
      color: theme.fg.replace("#", ""),
      fontFace: deck.theme === "chalkboard" ? "Comic Sans MS" : "Calibri",
    });
    s.addText(slide.bullets.map((b) => ({ text: b, options: { bullet: true } })), {
      x: 0.7,
      y: 1.6,
      w: 8.5,
      h: 4,
      fontSize: 18,
      color: theme.fg.replace("#", ""),
      paraSpaceAfter: 10,
    });
    if (slide.notes) s.addNotes(slide.notes);
    if (slide.imageHint) {
      s.addShape(pptx.ShapeType.roundRect, {
        x: 6.8,
        y: 4.6,
        w: 2.5,
        h: 1.4,
        fill: { color: theme.accent.replace("#", "") },
      });
      s.addText(slide.imageHint.slice(0, 40), {
        x: 6.9,
        y: 5.0,
        w: 2.3,
        h: 0.8,
        fontSize: 10,
        color: theme.bg.replace("#", ""),
        align: "center",
      });
    }
  }
  await pptx.writeFile({ fileName: `${deck.title.replace(/\s+/g, "-")}.pptx` });
}

export function exportPresentationPdf(deck: Presentation) {
  const theme = SLIDE_THEMES[deck.theme];
  const doc = new jsPDF({ orientation: "landscape" });
  deck.slides.forEach((slide, idx) => {
    if (idx > 0) doc.addPage();
    // simple colored header bar
    doc.setFillColor(theme.bg);
    doc.rect(0, 0, 297, 210, "F");
    doc.setTextColor(theme.fg);
    doc.setFontSize(28);
    doc.text(slide.title, 20, 40);
    doc.setFontSize(16);
    let y = 60;
    for (const b of slide.bullets) {
      doc.text(`• ${b}`, 24, y);
      y += 12;
    }
    if (slide.imageHint) {
      doc.setFontSize(11);
      doc.text(`[Image: ${slide.imageHint}]`, 20, 180);
    }
  });
  doc.save(`${deck.title.replace(/\s+/g, "-")}.pdf`);
}

/** Simple multi-page text PDF for chapter AI outputs */
export function exportTextPdf(title: string, body: string) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  doc.setFontSize(16);
  doc.text(title, 40, 48);
  doc.setFontSize(11);
  const lines = doc.splitTextToSize(body, 515);
  let y = 72;
  for (const line of lines) {
    if (y > 780) {
      doc.addPage();
      y = 48;
    }
    doc.text(line, 40, y);
    y += 14;
  }
  doc.save(`${title.replace(/\s+/g, "-").slice(0, 40)}.pdf`);
}

export function monthAttendanceMatrix(
  students: Student[],
  records: AttendanceRecord[],
  classId: string,
  year: number,
  month: number // 0-based
) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  return students
    .filter((s) => s.classId === classId && !s.deletedAt)
    .map((s) => ({
      student: s,
      cells: days.map((d) => {
        const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const rec = records.find((r) => r.studentId === s.id && r.classId === classId && r.date === date);
        return { date, status: rec?.status ?? null };
      }),
    }));
}

export function downloadIcs(filename: string, events: { title: string; date: string; description?: string }[]) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TeachDesk//EN",
    ...events.flatMap((e) => {
      const d = e.date.replace(/-/g, "");
      return [
        "BEGIN:VEVENT",
        `DTSTART;VALUE=DATE:${d}`,
        `SUMMARY:${e.title}`,
        `DESCRIPTION:${(e.description ?? "").replace(/\n/g, "\\n")}`,
        "END:VEVENT",
      ];
    }),
    "END:VCALENDAR",
  ];
  downloadBlob(filename, new Blob([lines.join("\r\n")], { type: "text/calendar" }));
}
