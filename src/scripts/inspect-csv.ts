import fs from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "src", "scripts", "data", "clients-import-data.csv");
const buffer = fs.readFileSync(filePath);

// Check encoding (UTF-16LE has BOM 0xFF 0xFE or null bytes)
let textContent = "";
if (buffer[0] === 0xff && buffer[1] === 0xfe) {
  textContent = buffer.toString("utf16le");
} else if (buffer[0] === 0xfe && buffer[1] === 0xff) {
  textContent = buffer.toString("utf16be");
} else {
  textContent = buffer.toString("utf8");
}

const lines = textContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
console.log("TOTAL_LINES:", lines.length);
console.log("HEADER_ROW:", lines[0]);
console.log("SAMPLE_ROW_1:", lines[1]);
console.log("SAMPLE_ROW_2:", lines[2]);
