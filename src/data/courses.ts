import { GENERAL_RESOURCES_SLUG } from "../lib/materials";

export const FOUNDATION_COURSES = [
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
  { slug: "famous-teachers-guidance", title: "名师导学" },
];

export const TRACK_COURSES = {
  math: [
    { slug: "mathematical-analysis", title: "数学分析", isGeneral: false },
    { slug: "analytic-geometry", title: "解析几何", isGeneral: false },
    { slug: "modern-applied-mathematics", title: "近代应用数学", isGeneral: false },
    { slug: GENERAL_RESOURCES_SLUG, title: "General Resources", isGeneral: true }
  ],
  biochem: [{ slug: GENERAL_RESOURCES_SLUG, title: "General Resources", isGeneral: true }],
  cs: [
    { slug: "artificial-intelligence", title: "人工智能", isGeneral: false },
    { slug: "machine-learning", title: "机器学习", isGeneral: false },
    { slug: "computer-architecture", title: "计算机体系结构", isGeneral: false },
    { slug: "operating-systems-general", title: "操作系统（大班）", isGeneral: false },
    { slug: "operating-systems-jyy", title: "操作系统（蒋炎岩）", isGeneral: false },
    { slug: "computer-networks", title: "计算机网络", isGeneral: false },
    { slug: "compilers", title: "编译原理", isGeneral: false },
    { slug: "information-theory", title: "信息论基础", isGeneral: false },
    { slug: "distributed-systems", title: "分布式系统", isGeneral: false },
    { slug: "computer-graphics", title: "计算机图形学", isGeneral: false },
    { slug: "graph-theory", title: "图论", isGeneral: false },
    { slug: "big-data", title: "大数据处理", isGeneral: false },
    { slug: "cryptography", title: "密码学", isGeneral: false },
    { slug: "database-systems", title: "数据库概论", isGeneral: false },
    { slug: "mathematical-logic", title: "数理逻辑", isGeneral: false },
    { slug: "intelligent-computing-systems", title: "智能计算系统", isGeneral: false },
    { slug: "discrete-mathematics", title: "离散数学", isGeneral: false },
    { slug: "formal-semantics", title: "程序设计语言的形式语义", isGeneral: false },
    { slug: "algorithms", title: "算法设计与分析", isGeneral: false },
    { slug: "combinatorics", title: "组合数学", isGeneral: false },
    { slug: "automata", title: "形式语言与自动机", isGeneral: false },
    { slug: "computer-systems", title: "计算机系统基础", isGeneral: false },
    { slug: "software-analysis", title: "软件分析", isGeneral: false },
    { slug: "software-engineering", title: "软件工程", isGeneral: false },
    { slug: "problem-solving", title: "问题求解", isGeneral: false },
    { slug: "probability-tcs", title: "概率论与数理统计（尹一通）", isGeneral: false },
    { slug: "probability-general", title: "概率论与数理统计", isGeneral: false },
    { slug: "digital-logic-and-computer-organization", title: "数字逻辑与计算机组成", isGeneral: false },
    { slug: GENERAL_RESOURCES_SLUG, title: "General Resources", isGeneral: true },
  ],
  physics: [
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
  ],
  astronomy: [
    { slug: "quantum-mechanics", title: "量子力学", isGeneral: false },
    { slug: GENERAL_RESOURCES_SLUG, title: "General Resources", isGeneral: true }
  ],
  other: [{ slug: GENERAL_RESOURCES_SLUG, title: "General Resources", isGeneral: true }],
} as const;
