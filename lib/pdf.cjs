const PDFDocument = require("pdfkit");
const path = require("node:path");
const sharp = require("sharp");
const { plain, TECH, VISIT } = require("./content.cjs");
async function cover(source) {
  const optimize = async (buffer) =>
    sharp(buffer, { limitInputPixels: 40000000 })
      .rotate()
      .resize({ width: 1800, withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .toBuffer();
  if (/^data:image\/(png|jpeg|webp|avif);base64,/.test(source || "")) {
    try {
      return await optimize(Buffer.from(source.split(",")[1], "base64"));
    } catch {
      return null;
    }
  }
  if (!source) return null;
  try {
    const u = new URL(source);
    if (
      u.protocol !== "https:" ||
      ![
        "images.unsplash.com",
        "upload.wikimedia.org",
        "firebasestorage.googleapis.com",
        "i.pinimg.com",
      ].includes(u.hostname)
    )
      return null;
    const response = await fetch(u, {
      redirect: "error",
      signal: AbortSignal.timeout(5000),
    });
    if (
      !response.ok ||
      !/^image\/(jpeg|png|webp|avif)/.test(
        response.headers.get("content-type") || "",
      )
    )
      return null;
    const parts = [];
    let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > 8000000) {
        await response.body.cancel().catch(() => {});
        return null;
      }
      parts.push(chunk);
    }
    return await optimize(Buffer.concat(parts));
  } catch {
    return null;
  }
}
async function makePdf(article, site) {
  const img = await cover(article.image);
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      font: path.join(__dirname, "../assets/fonts/Schibsted-400.ttf"),
      margin: 48,
      bufferPages: true,
      info: {
        Title: article.title,
        Author: article.author,
        Subject: "DECORUM — Architecture",
        Creator: "DECORUM Collectiv",
      },
    });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.registerFont(
      "Display",
      path.join(__dirname, "../assets/fonts/Bricolage-800.ttf"),
    );
    doc.registerFont(
      "Body",
      path.join(__dirname, "../assets/fonts/Schibsted-400.ttf"),
    );
    doc.registerFont(
      "Bold",
      path.join(__dirname, "../assets/fonts/Schibsted-700.ttf"),
    );
    const width = doc.page.width - 96;
    doc
      .fillColor("#2A38F5")
      .font("Display")
      .fontSize(28)
      .text("DECORUM", 48, 45);
    doc
      .fillColor("#111114")
      .font("Body")
      .fontSize(9)
      .text(
        `À EMPORTER  /  ${article.edition || new Date().getFullYear()}`,
        48,
        84,
      );
    doc
      .moveTo(48, 108)
      .lineTo(doc.page.width - 48, 108)
      .strokeColor("#111114")
      .stroke();
    doc
      .font("Display")
      .fontSize(article.title.length > 90 ? 24 : 32)
      .fillColor("#111114")
      .text(article.title, 48, 130, { width, lineGap: 2 });
    doc
      .moveDown(0.6)
      .font("Body")
      .fontSize(10)
      .text(
        `Par ${article.author || "La rédaction"}  /  ${plain(article.date || article.publishedAt || "").slice(0, 40)}`,
      );
    const imageY = Math.max(260, doc.y + 22),
      imageHeight = Math.min(330, 640 - imageY);
    if (img && imageHeight > 100) {
      try {
        doc.image(img, 48, imageY, {
          fit: [width, imageHeight],
          align: "center",
          valign: "center",
        });
        doc.y = imageY + imageHeight + 12;
      } catch {
        doc.y = imageY;
      }
    }
    if (article.imageCredit && img)
      doc
        .fontSize(8)
        .fillColor("#555555")
        .text(article.imageCredit, 48, doc.y, { width });
    doc
      .moveDown(1)
      .font("Body")
      .fontSize(13)
      .fillColor("#111114")
      .text(plain(article.excerpt), 48, doc.y, { width, lineGap: 4 });
    doc.addPage();
    doc
      .fillColor("#2A38F5")
      .font("Bold")
      .fontSize(11)
      .text("LIRE L’ARCHITECTURE", 48, 48);
    let y = 82;
    const specs = Object.entries(TECH).filter(([k]) =>
      String(article.technical?.[k] ?? "").trim(),
    );
    if (specs.length) {
      doc
        .font("Bold")
        .fontSize(11)
        .fillColor("#111114")
        .text("FICHE TECHNIQUE", 48, y);
      y += 24;
      for (const [k, label] of specs) {
        const valueHeight = doc
          .font("Body")
          .fontSize(9)
          .heightOfString(String(article.technical[k]), { width: width - 120 });
        if (y + valueHeight > 740) {
          doc.addPage();
          y = 48;
        }
        doc.font("Bold").fontSize(9).text(label, 48, y, { width: 110 });
        doc
          .font("Body")
          .text(String(article.technical[k]), 168, y, { width: width - 120 });
        y = Math.max(y + 17, doc.y + 5);
      }
      y += 20;
    }
    // Flow full text across columns and additional pages; never crop an article to two pages.
    let raw = String(article.content || "")
      .replace(/<\/(p|h[2-4]|li|blockquote)>/gi, "\n\n")
      .replace(/<br\s*\/?>/gi, "\n");
    raw = plain(raw)
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    if (y > 650) {
      doc.addPage();
      y = 48;
    }
    doc.font("Body").fontSize(10).fillColor("#111114").text(raw, 48, y, {
      width,
      columns: 2,
      columnGap: 24,
      lineGap: 4,
      paragraphGap: 3,
    });
    const visit = Object.entries(VISIT).filter(([k]) => article.visit?.[k]);
    if (visit.length) {
      doc.addPage();
      doc
        .fillColor("#2A38F5")
        .font("Display")
        .fontSize(20)
        .text("Préparer la visite");
      doc.moveDown();
      for (const [k, label] of visit) {
        doc.font("Bold").fontSize(10).fillColor("#111114").text(label);
        doc.font("Body").fontSize(11).text(String(article.visit[k]));
        doc.moveDown();
      }
    }
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      const bottom = doc.page.height - 32;
      doc.save();
      doc.font("Body").fontSize(8).fillColor("#555555");
      doc.text(
        `DECORUM  /  ${article.edition || new Date().getFullYear()}`,
        48,
        bottom,
        { lineBreak: false },
      );
      doc.text(`${i + 1} / ${range.count}`, doc.page.width - 85, bottom, {
        lineBreak: false,
      });
      doc.restore();
    }
    doc.end();
  });
}
module.exports = { makePdf, cover };
