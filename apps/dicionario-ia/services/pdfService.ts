import { jsPDF } from "jspdf";
import { VocabularyData } from "../types";

export const generatePDF = (theme: string, data: VocabularyData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let y = 20;

  // Setup Font - Courier for Brutalist feel
  doc.setFont("courier", "bold");

  // Title
  doc.setFontSize(22);
  const title = `SUPER DICIONARIO: ${theme.toUpperCase()}`;
  const splitTitle = doc.splitTextToSize(title, contentWidth);
  doc.text(splitTitle, margin, y);
  y += (splitTitle.length * 10) + 10;

  // Divider
  doc.setLineWidth(1);
  doc.line(margin, y, pageWidth - margin, y);
  y += 15;

  // Vocabulary List
  doc.setFontSize(12);
  
  data.vocabulary.forEach((entry, index) => {
    // Check for page break
    if (y > pageHeight - 30) {
      doc.addPage();
      y = 20;
    }

    // Word + Context
    doc.setFont("courier", "bold");
    const header = `${index + 1}. ${entry.word.toUpperCase()} ${entry.context ? `[${entry.context}]` : ''}`;
    const splitHeader = doc.splitTextToSize(header, contentWidth);
    doc.text(splitHeader, margin, y);
    y += (splitHeader.length * 5) + 2;

    // Definition
    doc.setFont("courier", "normal");
    const splitDef = doc.splitTextToSize(entry.definition, contentWidth);
    doc.text(splitDef, margin, y);
    y += (splitDef.length * 5) + 8; // Extra spacing between items
  });

  // Related Themes
  if (y > pageHeight - 40) {
    doc.addPage();
    y = 20;
  } else {
    y += 10;
  }

  doc.setLineWidth(1);
  doc.line(margin, y, pageWidth - margin, y);
  y += 15;

  doc.setFont("courier", "bold");
  doc.text("TEMAS SUGERIDOS:", margin, y);
  y += 10;
  
  doc.setFont("courier", "normal");
  data.relatedThemes.forEach(theme => {
    doc.text(`- ${theme.toUpperCase()}`, margin, y);
    y += 7;
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  doc.setFontSize(10);
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(`Pagina ${i} de ${pageCount} - Gerado por Super Dicionario`, margin, pageHeight - 10);
  }

  // Save
  doc.save(`super-dicionario-${theme.toLowerCase().replace(/\s+/g, '-')}.pdf`);
};
