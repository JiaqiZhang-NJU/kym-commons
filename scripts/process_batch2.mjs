import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const SOURCE_BASE = "c:/code/kym-commons/static/files/temp/njucs-past-exam-master/njucs-past-exam-master";
const TARGET_BASE = "c:/code/kym-commons/static/files/tracks/cs";

const courses = [
  { sourceName: "信息论基础", slug: "information-theory" },
  { sourceName: "分布式系统", slug: "distributed-systems" },
  { sourceName: "图形学", slug: "computer-graphics" },
  { sourceName: "图论", slug: "graph-theory" },
  { sourceName: "大数据", slug: "big-data" },
  { sourceName: "密码学", slug: "cryptography" },
  { sourceName: "数据库概论", slug: "database-systems" }
];

function getCategory(filePath) {
  const name = path.basename(filePath).toLowerCase();
  const dir = path.dirname(filePath).toLowerCase();
  const fullPath = filePath.toLowerCase();
  
  if (fullPath.includes('期中')) return { id: 'midterms', name: '期中试卷', order: 5 };
  if (fullPath.includes('期末')) return { id: 'finals', name: '期末试卷', order: 6 };
  if (fullPath.includes('job') || fullPath.includes('作业') || (dir.includes('答案') && !name.includes('期中') && !name.includes('期末'))) return { id: 'assignments', name: '作业答案', order: 3 };
  if (fullPath.includes('样题') || fullPath.includes('样卷')) return { id: 'sample-exams', name: '样卷', order: 4 };
  return { id: 'materials', name: '参考资料', order: 10 };
}

function extractTermAndTitle(name) {
  let title = name.replace(/\.[^/.]+$/, "");
  let term = "未知";
  
  let match = title.match(/20\d{2}(级|年|春|秋)?/);
  if (match) {
    term = match[0];
  }
  
  return { title, term };
}

const records = [];

for (const course of courses) {
  const sourceDir = path.join(SOURCE_BASE, course.sourceName);
  if (!fs.existsSync(sourceDir)) continue;
  
  function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
      } else {
        const category = getCategory(fullPath);
        const { title, term } = extractTermAndTitle(file);
        
        const targetDir = path.join(TARGET_BASE, course.slug, category.id);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        
        let targetFileName = file;
        let targetPath = path.join(targetDir, targetFileName);
        let counter = 1;
        while (fs.existsSync(targetPath)) {
          const ext = path.extname(file);
          const base = path.basename(file, ext);
          targetFileName = `${base}-${counter}${ext}`;
          targetPath = path.join(targetDir, targetFileName);
          counter++;
        }
        
        fs.copyFileSync(fullPath, targetPath);
        
        records.push({
          id: randomUUID(),
          section: "track",
          trackSlug: "cs",
          courseSlug: course.slug,
          category: category.name,
          categoryOrder: category.order,
          title: title,
          type: "历年题/回忆",
          term: term,
          summary: `来源于 ${course.sourceName} 整理资料`,
          href: `/files/tracks/cs/${course.slug}/${category.id}/${targetFileName}`
        });
      }
    }
  }
  
  walk(sourceDir);
}

fs.writeFileSync("c:/code/kym-commons/scripts/batch2.json", JSON.stringify(records, null, 2));
console.log("Done processing batch 2. Records:", records.length);
