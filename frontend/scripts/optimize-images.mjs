import { readdir, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const sourceDirectory = path.resolve("public/images/products");
const outputDirectory = path.resolve("public/images/products-optimized");
const supportedExtensions = new Set([".png", ".jpg", ".jpeg", ".webp"]);

await mkdir(outputDirectory, { recursive: true });
const entries = await readdir(sourceDirectory, { withFileTypes: true });
const imageFiles = entries
  .filter((entry) => entry.isFile() && supportedExtensions.has(path.extname(entry.name).toLowerCase()))
  .sort((left, right) => left.name.localeCompare(right.name));

if (imageFiles.length === 0) {
  console.log("Không tìm thấy ảnh PNG, JPG hoặc WebP để tối ưu.");
  process.exit(0);
}

const results = [];
for (const entry of imageFiles) {
  const inputPath = path.join(sourceDirectory, entry.name);
  const outputName = `${path.parse(entry.name).name}.webp`;
  const outputPath = path.join(outputDirectory, outputName);
  const beforeBytes = (await stat(inputPath)).size;

  await sharp(inputPath)
    .rotate()
    .resize({ width: 900, height: 900, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80, effort: 5 })
    .toFile(outputPath);

  const afterBytes = (await stat(outputPath)).size;
  results.push({ file: entry.name, beforeBytes, outputName, afterBytes });
}

const totalBefore = results.reduce((sum, item) => sum + item.beforeBytes, 0);
const totalAfter = results.reduce((sum, item) => sum + item.afterBytes, 0);
const rows = results.map(({ file, beforeBytes, outputName, afterBytes }) => ({
  "Ảnh gốc": file,
  "Trước (KB)": (beforeBytes / 1024).toFixed(1),
  "Ảnh WebP": outputName,
  "Sau (KB)": (afterBytes / 1024).toFixed(1)
}));
console.table(rows);
console.log(`Tổng: ${(totalBefore / 1024 / 1024).toFixed(2)} MiB → ${(totalAfter / 1024 / 1024).toFixed(2)} MiB (${((1 - totalAfter / totalBefore) * 100).toFixed(1)}% giảm).`);
console.log(`Ảnh gốc được giữ nguyên tại ${sourceDirectory}; ảnh đã tối ưu nằm ở ${outputDirectory}.`);
