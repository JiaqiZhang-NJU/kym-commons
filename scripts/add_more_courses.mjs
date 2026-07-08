import fs from 'fs';
const tsPath = 'c:/code/kym-commons/src/data/courses.ts';
let code = fs.readFileSync(tsPath, 'utf8');

const newFoundation = `export const FOUNDATION_COURSES = [
  { slug: "calculus-i", title: "微积分一" },
  { slug: "calculus-ii", title: "微积分二" },
  { slug: "university-physics-i", title: "大学物理上" },
  { slug: "university-physics-ii", title: "大学物理下" },
  { slug: "university-physics-experiment", title: "大学物理实验" },
  { slug: "linear-algebra", title: "线性代数" },
  { slug: "chemical-principles", title: "化学原理" },
  { slug: "introduction-to-programming", title: "程序设计基础" },
  { slug: "data-structures-and-algorithms", title: "数据结构与算法分析" },
  { slug: "marxism", title: "马克思主义基本原理" },
  { slug: "college-english", title: "大学英语" },
];`;
code = code.replace(/export const FOUNDATION_COURSES = \[[\s\S]*?\];/, newFoundation);

const newMath = `math: [
    { slug: "mathematical-analysis", title: "数学分析", isGeneral: false },
    { slug: "analytic-geometry", title: "解析几何", isGeneral: false },
    { slug: "modern-applied-mathematics", title: "近代应用数学", isGeneral: false },
    { slug: GENERAL_RESOURCES_SLUG, title: "General Resources", isGeneral: true }
  ],`;
code = code.replace(/math: \[[\s\S]*?\],/, newMath);

const newPhysics = `physics: [
    { slug: "theoretical-mechanics", title: "理论力学", isGeneral: false },
    { slug: "optics", title: "光学", isGeneral: false },
    { slug: "methods-of-mathematical-physics", title: "数学物理方法", isGeneral: false },
    { slug: "solid-state-physics", title: "固体物理", isGeneral: false },
    { slug: "electrodynamics", title: "电动力学", isGeneral: false },
    { slug: "quantum-mechanics", title: "量子力学", isGeneral: false },
    { slug: "computational-physics", title: "计算物理", isGeneral: false },
    { slug: "thermodynamics-and-statistical-physics", title: "热力学与统计物理", isGeneral: false },
    { slug: "electronic-circuit-foundation", title: "电子电路基础", isGeneral: false },
    { slug: GENERAL_RESOURCES_SLUG, title: "General Resources", isGeneral: true }
  ],`;
code = code.replace(/physics: \[[\s\S]*?\],/, newPhysics);

const newCsInsert = `    { slug: "digital-logic-and-computer-organization", title: "数字逻辑与计算机组成", isGeneral: false },
    { slug: GENERAL_RESOURCES_SLUG, title: "General Resources", isGeneral: true },`;
code = code.replace(/    { slug: GENERAL_RESOURCES_SLUG, title: "General Resources", isGeneral: true },/, newCsInsert);

fs.writeFileSync(tsPath, code);
console.log("Updated courses.ts");
