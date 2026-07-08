import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const TEMP_BASE = "c:/code/kym-commons/static/files/temp";
const FOUNDATION_BASE = "c:/code/kym-commons/static/files/foundation";
const TRACKS_BASE = "c:/code/kym-commons/static/files/tracks";

const MAPPINGS = [
  // Foundation
  { keywords: ['微积分i', '微积分一', '微积分+i', '微积分 I', '微积分i', '高等数学  （上册）', '荣誉考试试题', '层次挑战考'], slug: 'calculus-i', section: 'foundation' },
  { keywords: ['微积分ii', '微积分二', '高等数学（下）', '微积分 II', '微积分ii', '大一下微积分（二）期中试卷'], slug: 'calculus-ii', section: 'foundation' },
  { keywords: ['大学物理实验'], slug: 'university-physics-experiment', section: 'foundation' },
  { keywords: ['大学物理上', 'up1', '大物上'], slug: 'university-physics-i', section: 'foundation' },
  { keywords: ['大学物理下', '大物下'], slug: 'university-physics-ii', section: 'foundation' },
  { keywords: ['大学物理'], slug: 'university-physics-i', section: 'foundation' }, // fallback for general physics
  { keywords: ['线性代数', '线代', 'math-review'], slug: 'linear-algebra', section: 'foundation' },
  { keywords: ['化学原理'], slug: 'chemical-principles', section: 'foundation' },
  { keywords: ['马原', '马克思主义基本原理'], slug: 'marxism', section: 'foundation' },
  { keywords: ['大学英语'], slug: 'college-english', section: 'foundation' },
  { keywords: ['大学数学典型题解析'], slug: 'calculus-i', section: 'foundation' },
  { keywords: ['名师导学'], slug: 'famous-teachers-guidance', section: 'foundation' },
  { keywords: ['程序设计基础', 'c primer plus', 'cprimeplus'], slug: 'introduction-to-programming', section: 'foundation' },
  { keywords: ['数据结构与算法分析', '数据结构'], slug: 'data-structures-and-algorithms', section: 'foundation' },
  
  // Math Track
  { keywords: ['数学分析', '分析-0'], slug: 'mathematical-analysis', section: 'track', trackSlug: 'math' },
  { keywords: ['解析几何'], slug: 'analytic-geometry', section: 'track', trackSlug: 'math' },
  { keywords: ['近代应用数学', '近代数学'], slug: 'modern-applied-mathematics', section: 'track', trackSlug: 'math' },

  // Physics Track
  { keywords: ['理论力学', '力学  下'], slug: 'theoretical-mechanics', section: 'track', trackSlug: 'physics' },
  { keywords: ['光学'], slug: 'optics', section: 'track', trackSlug: 'physics' },
  { keywords: ['数学物理方法'], slug: 'methods-of-mathematical-physics', section: 'track', trackSlug: 'physics' },
  { keywords: ['固体物理', '固体（'], slug: 'solid-state-physics', section: 'track', trackSlug: 'physics' },
  { keywords: ['电动力学'], slug: 'electrodynamics', section: 'track', trackSlug: 'physics' },
  { keywords: ['量子力学'], slug: 'quantum-mechanics', section: 'track', trackSlug: 'physics' },
  { keywords: ['计算物理'], slug: 'computational-physics', section: 'track', trackSlug: 'physics' },
  { keywords: ['热力学与统计物理', '热统计'], slug: 'thermodynamics-and-statistical-physics', section: 'track', trackSlug: 'physics' },
  { keywords: ['电子电路基础', '微电子与电路基础', '模拟电路', '微电子概论', '电路.pdf'], slug: 'electronic-circuit-foundation', section: 'track', trackSlug: 'physics' },

  // CS Track
  { keywords: ['jyyos', 'jyy'], slug: 'operating-systems-jyy', section: 'track', trackSlug: 'cs' },
  { keywords: ['os期末a', '操作系统（2026春 大班）'], slug: 'operating-systems-general', section: 'track', trackSlug: 'cs' },
  { keywords: ['数字逻辑与计算机组成', '数字电路', 'quartus', 'verilog'], slug: 'digital-logic-and-computer-organization', section: 'track', trackSlug: 'cs' },
  { keywords: ['计算机系统基础', '深入理解计算机系统'], slug: 'computer-systems', section: 'track', trackSlug: 'cs' },
  { keywords: ['计算机体系结构', 'cs61c'], slug: 'computer-architecture', section: 'track', trackSlug: 'cs' },
  { keywords: ['问题求解', '问题求二', '问求二', 'ps2', '问题求解oj', '动态规划', '图论', '数据结构', '高精度', '分治', '搜索'], slug: 'problem-solving', section: 'track', trackSlug: 'cs' },
  { keywords: ['信息论'], slug: 'information-theory', section: 'track', trackSlug: 'cs' },
  { keywords: ['概率论'], slug: 'probability-general', section: 'track', trackSlug: 'cs' },
  { keywords: ['数理逻辑'], slug: 'mathematical-logic', section: 'track', trackSlug: 'cs' },
  { keywords: ['coq', '形式语义'], slug: 'formal-semantics', section: 'track', trackSlug: 'cs' },
  { keywords: ['大数据', 'big data'], slug: 'big-data', section: 'track', trackSlug: 'cs' },
  { keywords: ['管理系统', '选课系统', '点餐系统'], slug: 'software-engineering', section: 'track', trackSlug: 'cs' },
  { keywords: ['人工智能', '深度学习', '神经网络', '模式识别', '计算机视觉', '机器学习', '数据挖掘', '算法', 'robot', 'machine learning', 'deep learning', '自然语言处理', '图像处理', '统计学习', '贝叶斯', '特征工程', 'face', '奇点临近', '人类2.0', '机器之心', '机器视觉', '机器人', '1603.05279', 'rnn', 'cnn', 'scikit', 'hdr', 'slam', 'matconvnet'], slug: 'artificial-intelligence', section: 'track', trackSlug: 'cs' },
  { keywords: ['计算机网络', 'unix网络编程'], slug: 'computer-networks', section: 'track', trackSlug: 'cs' },
  
  // General Resources
  { keywords: ['25级计算机专业', 'ai专业民间选课', '计算机/其他', '数学之美', '哥德尔', '皇帝新脑', '计算机与人脑', 'abap', 'java', 'python', 'power bi', 'ssh', '电子设计', 'prolog', 'cs_recovery', 'version_5', '傅里叶', '电梯双击'], slug: 'general-resources', section: 'track', trackSlug: 'cs' },
  { keywords: ['匡院指北', '1-3学期课程清单', '保研攻略', '25级匡院课表', '课表', '期末试卷及参考答案'], slug: 'general-resources', section: 'track', trackSlug: 'other' }
];

function getCategory(filePath) {
  const fullPath = filePath.toLowerCase();
  if (fullPath.includes('期中') || fullPath.includes('mid')) return { id: 'midterms', name: '期中试卷', order: 5 };
  if (fullPath.includes('期末') || fullPath.includes('final')) return { id: 'finals', name: '期末试卷', order: 6 };
  if (fullPath.includes('答案') || fullPath.includes('习题解答')) return { id: 'assignments', name: '作业答案', order: 3 };
  if (fullPath.includes('样题') || fullPath.includes('样卷')) return { id: 'sample-exams', name: '样卷', order: 4 };
  return { id: 'materials', name: '参考资料', order: 10 };
}

function extractTermAndTitle(name) {
  let title = name.replace(/\.[^/.]+$/, "");
  let term = "未知";
  let match = title.match(/20\d{2}(级|年|春|秋|-20\d{2})?/);
  if (match) {
    term = match[0];
  } else {
      let match2 = title.match(/2[1-6](春|秋|级)/);
      if (match2) {
          term = "20" + match2[0];
      }
  }
  return { title, term };
}

const records = [];
const processedFiles = new Set();

function processDirectory(dir) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            if (item === 'njucs-past-exam-master' || item === 'courselist') continue;
            processDirectory(fullPath);
        } else {
            if (item === '.gitignore' || item === 'README.md' || processedFiles.has(fullPath)) continue;
            
            const lowerName = item.toLowerCase();
            let matchedMapping = null;
            
            for (const map of MAPPINGS) {
                if (map.keywords.some(k => lowerName.includes(k.toLowerCase()) || fullPath.toLowerCase().includes(k.toLowerCase()))) {
                    matchedMapping = map;
                    break;
                }
            }
            
            if (matchedMapping) {
                const category = getCategory(fullPath);
                const { title, term } = extractTermAndTitle(item);
                
                let targetDir;
                if (matchedMapping.section === 'foundation') {
                    targetDir = path.join(FOUNDATION_BASE, matchedMapping.slug, category.id);
                } else {
                    targetDir = path.join(TRACKS_BASE, matchedMapping.trackSlug, matchedMapping.slug, category.id);
                }
                
                if (!fs.existsSync(targetDir)) {
                    fs.mkdirSync(targetDir, { recursive: true });
                }
                
                let targetFileName = item;
                let targetPath = path.join(targetDir, targetFileName);
                let counter = 1;
                while (fs.existsSync(targetPath)) {
                    const ext = path.extname(item);
                    const base = path.basename(item, ext);
                    targetFileName = `${base}-${counter}${ext}`;
                    targetPath = path.join(targetDir, targetFileName);
                    counter++;
                }
                
                fs.copyFileSync(fullPath, targetPath);
                processedFiles.add(fullPath);
                
                let href;
                if (matchedMapping.section === 'foundation') {
                    href = `/files/foundation/${matchedMapping.slug}/${category.id}/${targetFileName}`;
                } else {
                    href = `/files/tracks/${matchedMapping.trackSlug}/${matchedMapping.slug}/${category.id}/${targetFileName}`;
                }
                
                records.push({
                    id: randomUUID(),
                    section: matchedMapping.section,
                    trackSlug: matchedMapping.trackSlug,
                    courseSlug: matchedMapping.slug,
                    category: category.name,
                    categoryOrder: category.order,
                    title: title,
                    type: "历年题/回忆",
                    term: term,
                    summary: "来源: 用户上传补充资料",
                    href: href
                });
            }
        }
    }
}

processDirectory(TEMP_BASE);

fs.writeFileSync("c:/code/kym-commons/scripts/remaining_batch.json", JSON.stringify(records, null, 2));
console.log("Done processing remaining batch. Records:", records.length);

// Delete the files from temp that we processed
for (const f of processedFiles) {
    fs.unlinkSync(f);
}
