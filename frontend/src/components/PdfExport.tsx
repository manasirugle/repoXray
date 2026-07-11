import { jsPDF } from "jspdf";

export interface FileSummary {
  file_path: string;
  language: string;
  summary: string;
  key_components: string[];
}

export interface Vulnerability {
  file_path: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low" | string;
}

export interface RepoReport {
  repo_url: string;
  global_overview: string;
  security_audit: string;
  files: FileSummary[];
  vulnerabilities: Vulnerability[];
}

// Helper map for unicode characters to prevent jsPDF corruption
const unicodeMap: { [key: string]: string } = {
  // Arrows
  "→": "->",
  "➔": "->",
  "➡": "->",
  "➤": "->",
  "▶": "->",
  "⇒": "=>",
  "⟹": "=>",
  "←": "<-",
  "⇐": "<=",
  "↔": "<->",
  "↑": "^",
  "↓": "v",
  // Em dash & En dash
  "—": "-",
  "–": "-",
  "…": "...",
  // Box drawing characters
  "┌": "+",
  "┐": "+",
  "└": "+",
  "┘": "+",
  "├": "+",
  "┤": "+",
  "┬": "+",
  "┴": "+",
  "┼": "+",
  "─": "-",
  "│": "|",
  "═": "=",
  "║": "|",
  "╒": "+",
  "╓": "+",
  "╔": "+",
  "╕": "+",
  "╖": "+",
  "╗": "+",
  "╘": "+",
  "╙": "+",
  "╚": "+",
  "╛": "+",
  "╜": "+",
  "╝": "+",
  "╞": "+",
  "╟": "+",
  "╠": "+",
  "╡": "+",
  "╢": "+",
  "╣": "+",
  "╤": "+",
  "╥": "+",
  "╦": "+",
  "╧": "+",
  "╨": "+",
  "╩": "+",
  "╪": "+",
  "╫": "+",
  "╬": "+",
  // Bullets / Shapes
  "•": "*",
  "●": "*",
  "■": "*",
  "▪": "*",
  "◆": "*",
  "▲": "^",
  "▼": "v",
  "✔": "[Y]",
  "✘": "[X]",
  "✓": "[Y]",
  "✗": "[X]",
};

// Helper to clean up code lines while preserving indentation and mapping box characters
function cleanCodeLine(text: string): string {
  if (!text) return "";
  let clean = text;
  
  // Replace each mapped unicode character
  for (const [unicode, ascii] of Object.entries(unicodeMap)) {
    const escapedKey = unicode.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    clean = clean.replace(new RegExp(escapedKey, "g"), ascii);
  }

  // Strip remaining non-ASCII characters to keep built-in courier clean
  return clean.replace(/[^\x00-\x7F]/g, "");
}

// Helper to strip markdown characters and map non-ASCII characters to prevent jsPDF corruption
function stripMarkdown(text: string): string {
  if (!text) return "";

  let clean = text;
  
  // Replace each mapped unicode character
  for (const [unicode, ascii] of Object.entries(unicodeMap)) {
    const escapedKey = unicode.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    clean = clean.replace(new RegExp(escapedKey, "g"), ascii);
  }

  // Strip remaining non-ASCII characters to keep built-in Helvetica clean
  clean = clean
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/[#*`_~]/g, "") // Remove common markdown formatting symbols
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Simplify markdown links [text](url) -> text
    .replace(/^[-\s]*[-+*]\s+/gm, "• ") // Convert markdown lists to simple bullets
    .replace(/\n{3,}/g, "\n\n"); // Remove excessive newlines

  return clean;
}

export function generatePdf(report: RepoReport): void {
  // A4 dimensions: 210mm x 297mm
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageHeight = 297;
  const pageWidth = 210;
  const marginX = 20;
  const contentWidth = pageWidth - 2 * marginX; // 170mm
  const footerMargin = 15;

  let currentPageNum = 1;

  // Helper to draw clean header & footer on all content pages
  const drawHeaderFooter = (d: jsPDF, pageIndex: number) => {
    // Header
    d.setFont("helvetica", "normal");
    d.setFontSize(8);
    d.setTextColor(100, 116, 139); // Slate-500
    d.text("REPOXRAY — REPOSITORY ANALYSIS REPORT", marginX, 12);
    d.setDrawColor(226, 232, 240); // Slate-200
    d.setLineWidth(0.2);
    d.line(marginX, 14, pageWidth - marginX, 14);

    // Footer
    d.setFontSize(8);
    d.setTextColor(148, 163, 184); // Slate-400
    d.text(`Page ${pageIndex}`, pageWidth / 2, pageHeight - footerMargin, { align: "center" });
  };

  // Safe wrapper for adding text lines that automatically handles page breaks, heading formatting, bolding labels, and indents
  const addTextFlow = (
    text: string,
    startY: number,
    fontSize = 10,
    isBold = false,
    lineHeight = 6,
    color = { r: 51, g: 65, b: 85 } // Slate-700
  ): number => {
    let currentY = startY;
    const paragraphs = text.split("\n");
    let inCodeBlock = false;

    for (let p = 0; p < paragraphs.length; p++) {
      const rawLine = paragraphs[p];
      const trimmedLine = rawLine.trim();

      // Check for code block boundary
      if (trimmedLine.startsWith("```")) {
        if (!inCodeBlock) {
          // We are entering a code block!
          // Scan ahead to calculate total lines in this code block
          let codeBlockLines = 0;
          for (let i = p + 1; i < paragraphs.length; i++) {
            if (paragraphs[i].trim().startsWith("```")) {
              break;
            }
            codeBlockLines++;
          }
          
          // Calculate code block height: 3.6mm per line + padding
          const codeBlockHeight = codeBlockLines * 3.6 + 5;
          const maxPrintableHeight = pageHeight - footerMargin - 25; // ~257mm
          
          // Page boundary check: if it won't fit on this page, and can fit on a fresh page, start a new page!
          if (codeBlockHeight <= maxPrintableHeight && currentY + codeBlockHeight > pageHeight - footerMargin - 10) {
            doc.addPage();
            currentPageNum++;
            drawHeaderFooter(doc, currentPageNum);
            currentY = 25; // Top margin of new page
          }
        }
        
        inCodeBlock = !inCodeBlock;
        continue; // Skip the delimiter line itself
      }

      if (inCodeBlock) {
        // Check page boundary
        if (currentY > pageHeight - footerMargin - 10) {
          doc.addPage();
          currentPageNum++;
          drawHeaderFooter(doc, currentPageNum);
          currentY = 25;
        }

        const codeLine = cleanCodeLine(rawLine.replace(/\r$/, ""));
        doc.setFont("courier", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(31, 41, 55);

        const splitLines = codeLine ? doc.splitTextToSize(codeLine, contentWidth) : [""];
        for (let i = 0; i < splitLines.length; i++) {
          if (currentY > pageHeight - footerMargin - 10) {
            doc.addPage();
            currentPageNum++;
            drawHeaderFooter(doc, currentPageNum);
            currentY = 25;
            doc.setFont("courier", "normal");
            doc.setFontSize(6.5);
            doc.setTextColor(31, 41, 55);
          }
          doc.text(splitLines[i], marginX, currentY);
          currentY += 3.6;
        }
        continue;
      }

      let line = trimmedLine;
      if (!line) {
        currentY += 4; // Add generous paragraph separation spacing to avoid congestion!
        continue;
      }

      // Page boundary check
      if (currentY > pageHeight - footerMargin - 12) {
        doc.addPage();
        currentPageNum++;
        drawHeaderFooter(doc, currentPageNum);
        currentY = 25; // Top margin
      }

      // 1. Heading line detection (e.g. ## Executive Summary, ### SEC-03: ...)
      const isSecTitle = line.match(/^(?:###\s*)?(SEC-\d+:\s*.*)/i);
      const isNormalHeading = line.startsWith("#");

      if (isSecTitle || isNormalHeading) {
        let headingText = line;
        if (isSecTitle) {
          headingText = isSecTitle[1];
        } else {
          headingText = line.replace(/^#+\s*/, "");
        }

        // Add spacing before headings to separate blocks cleanly
        currentY += 4;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42); // Slate-900

        const wrappedHeading = doc.splitTextToSize(headingText, contentWidth);
        for (const hLine of wrappedHeading) {
          if (currentY > pageHeight - footerMargin - 10) {
            doc.addPage();
            currentPageNum++;
            drawHeaderFooter(doc, currentPageNum);
            currentY = 25;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.setTextColor(15, 23, 42);
          }
          doc.text(hLine, marginX, currentY);
          currentY += 6;
        }

        currentY += 2; // Extra padding below headings
        continue;
      }

      // 2. Bullet list line detection
      const isBullet = line.match(/^[-•*]\s+(.*)/);
      let bulletIndent = 0;
      if (isBullet) {
        line = isBullet[1];
        bulletIndent = 6;

        // Draw bullet point symbol in premium violet accent color
        doc.setFont("helvetica", "bold");
        doc.setFontSize(fontSize);
        doc.setTextColor(139, 92, 246); // Violet-500
        doc.text("•", marginX + 2, currentY);
      }

      // 3. Dynamic Bold Label detection (e.g., File Path: README.md, Description: ..., Remediation: ...)
      // Captures things like "File Path:", "File:", "Description:", "Remediation:", "Recommendation:", "Severity:"
      const labelRegex = /^((?:-\s*)?(?:\*\*)?(?:File Path|File|Description|Remediation|Recommendation|Severity)(?:\*\*)?:\s*)(.*)/i;
      const labelMatch = line.match(labelRegex);

      if (labelMatch) {
        const rawLabel = labelMatch[1];
        const rawValue = labelMatch[2];

        // Clean up markdown syntax ** and bullet points - from labels
        const cleanLabel = rawLabel.replace(/[\*-]/g, "").trim() + " ";
        const cleanValue = stripMarkdown(rawValue);

        // Print label part in BOLD Slate-900
        doc.setFont("helvetica", "bold");
        doc.setFontSize(fontSize);
        doc.setTextColor(15, 23, 42);
        doc.text(cleanLabel, marginX + bulletIndent, currentY);

        const labelWidth = doc.getTextWidth(cleanLabel) + 2;
        const indentX = marginX + bulletIndent + labelWidth;

        // Wrap and print value part in Normal weight Slate-700 next to it
        doc.setFont("helvetica", "normal");
        doc.setFontSize(fontSize);
        doc.setTextColor(color.r, color.g, color.b);

        const valueLines = doc.splitTextToSize(cleanValue, contentWidth - bulletIndent - labelWidth);
        if (valueLines.length > 0) {
          // Render first line inline
          doc.text(valueLines[0], indentX, currentY);
          currentY += lineHeight;

          // Render wrapped lines indented under the value start point
          for (let k = 1; k < valueLines.length; k++) {
            if (currentY > pageHeight - footerMargin - 10) {
              doc.addPage();
              currentPageNum++;
              drawHeaderFooter(doc, currentPageNum);
              currentY = 25;
              doc.setFont("helvetica", "normal");
              doc.setFontSize(fontSize);
              doc.setTextColor(color.r, color.g, color.b);
            }
            doc.text(valueLines[k], indentX, currentY);
            currentY += lineHeight;
          }
        }
        continue;
      }

      // 4. Default plain text rendering (e.g. paragraphs, explanations)
      const cleanText = stripMarkdown(line);
      const splitLines = doc.splitTextToSize(cleanText, contentWidth - bulletIndent);

      doc.setFont("helvetica", isBold ? "bold" : "normal");
      doc.setFontSize(fontSize);
      doc.setTextColor(color.r, color.g, color.b);

      for (let i = 0; i < splitLines.length; i++) {
        if (currentY > pageHeight - footerMargin - 10) {
          doc.addPage();
          currentPageNum++;
          drawHeaderFooter(doc, currentPageNum);
          currentY = 25;
          doc.setFont("helvetica", isBold ? "bold" : "normal");
          doc.setFontSize(fontSize);
          doc.setTextColor(color.r, color.g, color.b);
        }
        doc.text(splitLines[i], marginX + bulletIndent, currentY);
        currentY += lineHeight;
      }
    }

    return currentY;
  };

  // Helper to extract repository name from URL
  const getRepoName = (url: string): string => {
    try {
      const parts = url.trim().replace(/\/$/, "").split("/");
      return parts[parts.length - 1] || "repository";
    } catch {
      return "repository";
    }
  };

  const repoName = getRepoName(report.repo_url);
  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // ==========================================
  // PAGE 1: TITLE PAGE
  // ==========================================
  
  // Decorative modern accent background element (top edge gradient feel)
  doc.setFillColor(15, 23, 42); // Dark slate (Slate-900)
  doc.rect(0, 0, pageWidth, 60, "F");

  // RepoXray Brand logo/text in top header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  doc.text("REPOXRAY", marginX, 35);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184); // Slate-400
  doc.text("AI-POWERED REPOSITORY INTELLIGENCE", marginX, 45);

  // Main Report title
  let y = 90;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text("Repository Analysis Report", marginX, y);
  y += 12;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text("Comprehensive Architecture & Security Audit", marginX, y);
  y += 25;

  // Repository metadata block
  doc.setFillColor(248, 250, 252); // Slate-50 background
  doc.setDrawColor(226, 232, 240); // Slate-200 border
  doc.rect(marginX, y, contentWidth, 60, "FD");

  let metadataY = y + 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105); // Slate-600
  doc.text("RESOURCES ANALYZED:", marginX + 8, metadataY);
  metadataY += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text(repoName, marginX + 8, metadataY);
  metadataY += 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text("REPOSITORY URL:", marginX + 8, metadataY);
  metadataY += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(37, 99, 235); // Blue-600 for link
  doc.text(report.repo_url, marginX + 8, metadataY);
  metadataY += 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text("GENERATION DATE:", marginX + 8, metadataY);
  metadataY += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(dateStr, marginX + 8, metadataY);

  // Footer on cover page
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // Slate-400
  doc.text("This report was compiled by RepoXray AI Agents.", pageWidth / 2, pageHeight - 20, { align: "center" });

  // ==========================================
  // PAGE 2: ARCHITECTURE OVERVIEW
  // ==========================================
  doc.addPage();
  currentPageNum++;
  drawHeaderFooter(doc, currentPageNum);
  
  y = 25;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text("1. Architecture Overview", marginX, y);
  y += 10;

  // Add the global overview text
  y = addTextFlow(report.global_overview, y, 10, false, 6, { r: 51, g: 65, b: 85 });

  // ==========================================
  // PAGE 3: SECURITY AUDIT
  // ==========================================
  doc.addPage();
  currentPageNum++;
  drawHeaderFooter(doc, currentPageNum);

  y = 25;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text("2. Security Audit", marginX, y);
  y += 10;

  // Add the security audit text
  y = addTextFlow(report.security_audit, y, 10, false, 6, { r: 51, g: 65, b: 85 });

  // ==========================================
  // PAGE 4: VULNERABILITY SUMMARY (TABLE-LIKE LISTING)
  // ==========================================
  doc.addPage();
  currentPageNum++;
  drawHeaderFooter(doc, currentPageNum);

  y = 25;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text("3. Compiled Vulnerabilities List", marginX, y);
  y += 10;

  if (report.vulnerabilities.length === 0) {
    y = addTextFlow("No security vulnerabilities were identified in the scanned files.", y, 10, false, 6, { r: 100, g: 116, b: 139 });
  } else {
    // Add brief intro
    y = addTextFlow("Below is the comprehensive list of vulnerabilities detected by the analysis agents, structured by file location and graded by severity.", y, 10, false, 6, { r: 71, g: 85, b: 105 });
    y += 4;

    for (let idx = 0; idx < report.vulnerabilities.length; idx++) {
      const vuln = report.vulnerabilities[idx];
      const severity = (vuln.severity || "medium").toLowerCase();
      
      const cleanTitle = stripMarkdown(vuln.title || "Vulnerability Identified");
      const cleanDesc = stripMarkdown(vuln.description || "");
      const cleanFilePath = stripMarkdown(vuln.file_path || "");

      // Split text boundaries to calculate dynamic card height
      const titleLines = doc.splitTextToSize(cleanTitle, contentWidth - 45); // Leave room for severity badge
      const fileLines = doc.splitTextToSize(`File: ${cleanFilePath}`, contentWidth - 15);
      const descLines = doc.splitTextToSize(cleanDesc, contentWidth - 15);

      const titleHeight = titleLines.length * 5;
      const fileHeight = fileLines.length * 4;
      const descHeight = descLines.length * 4.5;
      const cardPadding = 10;
      const cardHeight = titleHeight + fileHeight + descHeight + cardPadding;

      // Page break check for a single vulnerability card block
      if (y > pageHeight - footerMargin - cardHeight - 5) {
        doc.addPage();
        currentPageNum++;
        drawHeaderFooter(doc, currentPageNum);
        y = 25;
      }

      // Draw card-like background
      doc.setFillColor(248, 250, 252); // Slate-50 background
      doc.setDrawColor(241, 245, 249); // Slate-100 border
      doc.rect(marginX, y, contentWidth, cardHeight, "FD");

      // Left bar color based on severity
      if (severity === "critical" || severity === "high") {
        doc.setFillColor(239, 68, 68); // Red-500
      } else if (severity === "medium") {
        doc.setFillColor(245, 158, 11); // Amber-500
      } else {
        doc.setFillColor(100, 116, 139); // Slate-500
      }
      doc.rect(marginX, y, 3, cardHeight, "F");

      // Card Content rendering
      let cardY = y + 5;
      
      // Title (Multi-line supported)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      for (const line of titleLines) {
        doc.text(line, marginX + 8, cardY);
        cardY += 5;
      }

      // Severity Badge text (drawn aligned with first title line)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      let badgeColor = { r: 100, g: 116, b: 139 };
      if (severity === "critical" || severity === "high") badgeColor = { r: 220, g: 38, b: 38 };
      else if (severity === "medium") badgeColor = { r: 217, g: 119, b: 6 };
      doc.setTextColor(badgeColor.r, badgeColor.g, badgeColor.b);
      doc.text(`[${severity.toUpperCase()}]`, pageWidth - marginX - 10, y + 5, { align: "right" });

      // File Path (Multi-line supported)
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      for (const line of fileLines) {
        doc.text(line, marginX + 8, cardY);
        cardY += 4;
      }
      cardY += 1.5;

      // Description (Fully expanded, multi-line supported)
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      for (const line of descLines) {
        doc.text(line, marginX + 8, cardY);
        cardY += 4.5;
      }

      y += cardHeight + 4; // Advance Y for next card
    }
  }

  // ==========================================
  // PAGE 5: FILE ANALYSIS SUMMARY
  // ==========================================
  doc.addPage();
  currentPageNum++;
  drawHeaderFooter(doc, currentPageNum);

  y = 25;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text("4. File Ingestion & Analysis Summary", marginX, y);
  y += 10;

  y = addTextFlow("Below is the summary list of individual files successfully scanned and indexed by RepoXray, including language categorization and high-level descriptions.", y, 10, false, 6, { r: 71, g: 85, b: 105 });
  y += 6;

  // Add the file listings
  for (let idx = 0; idx < report.files.length; idx++) {
    const file = report.files[idx];
    
    // Page break check for a file row block (~18mm high)
    if (y > pageHeight - footerMargin - 20) {
      doc.addPage();
      currentPageNum++;
      drawHeaderFooter(doc, currentPageNum);
      y = 25;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(file.file_path, marginX, y);
    
    // Language Tag
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(37, 99, 235); // Blue-600
    doc.text(`[${file.language || "Unknown"}]`, pageWidth - marginX, y, { align: "right" });
    y += 5;

    // Fully expanded summary (no clipping!)
    let summaryText = file.summary || "No summary provided.";
    y = addTextFlow(summaryText, y, 8.5, false, 4.5, { r: 71, g: 85, b: 105 });
    
    // Thin separating line
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.1);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 6;
  }

  // Save the constructed document
  const safeFilename = `${repoName.toLowerCase().replace(/[^a-z0-9_-]/g, "_")}-analysis-report.pdf`;
  doc.save(safeFilename);
}
