import fs from 'fs';
import path from 'path';

// 1. Move files
const csBase = "c:/code/kym-commons/static/files/tracks/cs";
const foundationBase = "c:/code/kym-commons/static/files/foundation";

// 1.1 Split OS
const osDir = path.join(csBase, "operating-systems");
const osJyyDir = path.join(csBase, "operating-systems-jyy");
const osGeneralDir = path.join(csBase, "operating-systems-general");

if (fs.existsSync(osDir)) {
  fs.mkdirSync(osJyyDir, { recursive: true });
  fs.mkdirSync(osGeneralDir, { recursive: true });
  
  function walkAndMoveOS(dir, relPath) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const full = path.join(dir, f);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        walkAndMoveOS(full, path.join(relPath, f));
      } else {
        const isJyy = f.includes('jyy') || f.includes('蒋炎炎') || f.includes('蒋岩炎');
        const targetBase = isJyy ? osJyyDir : osGeneralDir;
        const targetDir = path.join(targetBase, relPath);
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
        fs.renameSync(full, path.join(targetDir, f));
      }
    }
  }
  walkAndMoveOS(osDir, "");
  fs.rmSync(osDir, { recursive: true, force: true });
}

// 1.2 Move Data Structures
const dsCsDir = path.join(csBase, "data-structures");
const dsFoundationDir = path.join(foundationBase, "data-structures-and-algorithms");

if (fs.existsSync(dsCsDir)) {
  fs.mkdirSync(dsFoundationDir, { recursive: true });
  function copyDir(src, dest) {
    const files = fs.readdirSync(src);
    for (const f of files) {
      const full = path.join(src, f);
      const stat = fs.statSync(full);
      const target = path.join(dest, f);
      if (stat.isDirectory()) {
        if (!fs.existsSync(target)) fs.mkdirSync(target, { recursive: true });
        copyDir(full, target);
      } else {
        fs.renameSync(full, target);
      }
    }
  }
  copyDir(dsCsDir, dsFoundationDir);
  fs.rmSync(dsCsDir, { recursive: true, force: true });
}

// 2. Update courses.ts
const coursesTsPath = 'c:/code/kym-commons/src/data/courses.ts';
let coursesTs = fs.readFileSync(coursesTsPath, 'utf8');

const newFoundation = `export const FOUNDATION_COURSES = [
  { slug: "calculus-i", title: "微积分一" },
  { slug: "calculus-ii", title: "微积分二" },
  { slug: "university-physics-i", title: "大学物理上" },
  { slug: "university-physics-ii", title: "大学物理下" },
  { slug: "linear-algebra", title: "线性代数" },
  { slug: "chemical-principles", title: "化学原理" },
  { slug: "introduction-to-programming", title: "程序设计基础" },
  { slug: "data-structures-and-algorithms", title: "数据结构与算法分析" },
];`;

coursesTs = coursesTs.replace(/export const FOUNDATION_COURSES = \[[\s\S]*?\];/, newFoundation);

coursesTs = coursesTs.replace(/{ slug: "data-structures", title: "数据结构", isGeneral: false },\n/, "");
coursesTs = coursesTs.replace(/{ slug: "computer-architecture", title: "体系结构", isGeneral: false }/, '{ slug: "computer-architecture", title: "计算机体系结构", isGeneral: false }');
coursesTs = coursesTs.replace(/{ slug: "operating-systems", title: "操作系统", isGeneral: false },/, '{ slug: "operating-systems-general", title: "操作系统（大班）", isGeneral: false },\n    { slug: "operating-systems-jyy", title: "操作系统（蒋炎岩）", isGeneral: false },');
coursesTs = coursesTs.replace(/{ slug: "computer-graphics", title: "图形学", isGeneral: false }/, '{ slug: "computer-graphics", title: "计算机图形学", isGeneral: false }');
coursesTs = coursesTs.replace(/{ slug: "big-data", title: "大数据", isGeneral: false }/, '{ slug: "big-data", title: "大数据处理", isGeneral: false }');
coursesTs = coursesTs.replace(/{ slug: "algorithms", title: "算法", isGeneral: false }/, '{ slug: "algorithms", title: "算法设计与分析", isGeneral: false }');
coursesTs = coursesTs.replace(/{ slug: "automata", title: "自动机", isGeneral: false }/, '{ slug: "automata", title: "形式语言与自动机", isGeneral: false }');
coursesTs = coursesTs.replace(/{ slug: "probability-tcs", title: "（TCS）概率论与数理统计", isGeneral: false }/, '{ slug: "probability-tcs", title: "概率论与数理统计（尹一通）", isGeneral: false }');
coursesTs = coursesTs.replace(/{ slug: "probability-general", title: "（大班）概率论与数理统计", isGeneral: false }/, '{ slug: "probability-general", title: "概率论与数理统计", isGeneral: false }');

fs.writeFileSync(coursesTsPath, coursesTs);

// 3. Update materials.ts
const materialsTsPath = 'c:/code/kym-commons/src/data/materials.ts';
let materialsTs = fs.readFileSync(materialsTsPath, 'utf8');

// Update generated arrays
materialsTs = materialsTs.replace(/"courseSlug": "data-structures"/g, '"courseSlug": "data-structures-and-algorithms"');
materialsTs = materialsTs.replace(/"section": "track",\s*"trackSlug": "cs",\s*"courseSlug": "data-structures-and-algorithms"/g, '"section": "foundation",\n    "courseSlug": "data-structures-and-algorithms"');
materialsTs = materialsTs.replace(/\/files\/tracks\/cs\/data-structures/g, '/files/foundation/data-structures-and-algorithms');

// OS split in materials
const lines = materialsTs.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('"courseSlug": "operating-systems"')) {
    // Check surrounding lines for 'jyy'
    let isJyy = false;
    for (let j = Math.max(0, i - 10); j < Math.min(lines.length, i + 10); j++) {
      if (lines[j].toLowerCase().includes('jyy') || lines[j].includes('蒋炎炎') || lines[j].includes('蒋岩炎')) {
        isJyy = true;
        break;
      }
    }
    if (isJyy) {
      lines[i] = lines[i].replace('"operating-systems"', '"operating-systems-jyy"');
      for (let j = Math.max(0, i - 10); j < Math.min(lines.length, i + 10); j++) {
        if (lines[j].includes('/files/tracks/cs/operating-systems/')) {
          lines[j] = lines[j].replace('/files/tracks/cs/operating-systems/', '/files/tracks/cs/operating-systems-jyy/');
        }
      }
    } else {
      lines[i] = lines[i].replace('"operating-systems"', '"operating-systems-general"');
      for (let j = Math.max(0, i - 10); j < Math.min(lines.length, i + 10); j++) {
        if (lines[j].includes('/files/tracks/cs/operating-systems/')) {
          lines[j] = lines[j].replace('/files/tracks/cs/operating-systems/', '/files/tracks/cs/operating-systems-general/');
        }
      }
    }
  }
}
materialsTs = lines.join('\n');

fs.writeFileSync(materialsTsPath, materialsTs);
console.log("Done fixing courses and materials.");
