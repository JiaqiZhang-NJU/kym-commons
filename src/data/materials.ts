export type MaterialRecord = {
  id: string;
  section: "foundation" | "track";
  trackSlug?: string;
  courseSlug: string;
  category: string;
  categoryOrder?: number;
  title: string;
  type: string;
  term: string;
  summary: string;
  href: string;
};

type FileSpec = {
  fileName: string;
  title?: string;
  summary?: string;
};

function buildId(...parts: string[]) {
  return parts
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildFileHref(basePath: string, fileName: string) {
  return `${basePath}/${encodeURIComponent(fileName)}`;
}

function buildFoundationCategoryRecords(input: {
  courseSlug: string;
  category: string;
  categoryOrder: number;
  term: string;
  summary: string;
  basePath: string;
  files: FileSpec[];
}) {
  return input.files.map((file) => ({
    id: buildId("foundation", input.courseSlug, input.category, file.fileName),
    section: "foundation" as const,
    courseSlug: input.courseSlug,
    category: input.category,
    categoryOrder: input.categoryOrder,
    title: file.title ?? file.fileName,
    type: input.category,
    term: input.term,
    summary: file.summary ?? input.summary,
    href: buildFileHref(input.basePath, file.fileName),
  }));
}

const physicsISlides = Array.from({ length: 14 }, (_, index) => ({
  fileName: `chapter${String(index + 1).padStart(2, "0")}.pdf`,
  title: `第 ${String(index + 1).padStart(2, "0")} 章课件`,
}));

const physicsIISlides = [
  { fileName: "Introduction.pdf", title: "课程导论" },
  ...Array.from({ length: 16 }, (_, index) => ({
    fileName: `chapter${String(index + 15).padStart(2, "0")}.pdf`,
    title: `第 ${String(index + 15).padStart(2, "0")} 章课件`,
  })),
];

const foundationMaterials: MaterialRecord[] = [
  ...buildFoundationCategoryRecords({
    courseSlug: "university-physics-i",
    category: "复习资料",
    categoryOrder: 1,
    term: "大学物理上",
    summary: "大学物理上复习提要与课程复习资料。",
    basePath: "/files/foundation/university-physics-i/review",
    files: [{ fileName: "review-notes-1.pdf", title: "大物复习（上）" }],
  }),
  ...buildFoundationCategoryRecords({
    courseSlug: "university-physics-i",
    category: "课程讲义",
    categoryOrder: 2,
    term: "大学物理上",
    summary: "大学物理上课程讲义与章节课件。",
    basePath: "/files/foundation/university-physics-i/course-slides",
    files: physicsISlides,
  }),
  ...buildFoundationCategoryRecords({
    courseSlug: "university-physics-i",
    category: "作业答案",
    categoryOrder: 3,
    term: "大学物理上",
    summary: "大学物理上作业答案与习题讲解。",
    basePath: "/files/foundation/university-physics-i/assignment-solutions",
    files: [
      { fileName: "sol01.pdf" },
      { fileName: "sol01-03.pdf" },
      { fileName: "sol03-04.pdf" },
      { fileName: "sol04-06.pdf" },
      { fileName: "sol06-08.pdf" },
      { fileName: "sol09-11.pdf" },
      { fileName: "sol12-14.pdf" },
      { fileName: "sol15-16.ppt" },
    ],
  }),
  ...buildFoundationCategoryRecords({
    courseSlug: "university-physics-i",
    category: "随堂测验",
    categoryOrder: 4,
    term: "大学物理上",
    summary: "大学物理上随堂测验与参考解答。",
    basePath: "/files/foundation/university-physics-i/quizzes",
    files: [
      { fileName: "Quiz01sol.pdf", title: "Quiz 01 参考解答（2016）" },
      { fileName: "Quiz02sol.pdf", title: "Quiz 02 参考解答（2016）" },
      { fileName: "Quiz03sol.pdf", title: "Quiz 03 参考解答（2016）" },
      { fileName: "Quiz04sol.pdf", title: "Quiz 04 参考解答（2016）" },
      { fileName: "Quiz05sol.pdf", title: "Quiz 05 参考解答（2016）" },
      { fileName: "Quiz061sol.pdf", title: "Quiz 06-1 参考解答（2016）" },
      { fileName: "Quiz06-2sol.pdf", title: "Quiz 06-2 参考解答（2016）" },
      { fileName: "Quiz06-3sol.pdf", title: "Quiz 06-3 参考解答（2016）" },
      { fileName: "An alternative solution to prob.3 of Quiz02.pdf", title: "Quiz 02 第 3 题另一种解法（2016）" },
      { fileName: "Quiz01sol_20190805_093055.pdf", title: "Quiz 01 参考解答（2018）" },
      { fileName: "Quiz02sol-2_20190805_093055.pdf", title: "Quiz 02 参考解答（2018）" },
      { fileName: "Quiz03sol.pdf", title: "Quiz 03 参考解答（2018）" },
      { fileName: "Quiz03-2sol.pdf", title: "Quiz 03-2 参考解答（2018）" },
      { fileName: "Quiz06-3sol-2018.pdf", title: "Quiz 06-3 参考解答（2018）" },
    ],
  }),
  ...buildFoundationCategoryRecords({
    courseSlug: "university-physics-i",
    category: "期中样卷",
    categoryOrder: 5,
    term: "大学物理上",
    summary: "大学物理上期中样卷与历年卷解答。",
    basePath: "/files/foundation/university-physics-i/midterms",
    files: [
      { fileName: "midsample1.pdf", title: "期中样卷 1" },
      { fileName: "midsample1sol.pdf", title: "期中样卷 1 解答" },
      { fileName: "midsample2.pdf", title: "期中样卷 2" },
      { fileName: "midsample2sol.pdf", title: "期中样卷 2 解答" },
      { fileName: "UPI201805midterm.pdf", title: "2018-05 期中卷" },
      { fileName: "UPI201805midtermsol.pdf", title: "2018-05 期中卷解答" },
      { fileName: "UPI201905midterm.pdf", title: "2019-05 期中卷" },
      { fileName: "UPI201905midtermsol.pdf", title: "2019-05 期中卷解答" },
      { fileName: "UPImidterm2012.pdf", title: "2012 期中卷" },
      { fileName: "UPImidterm2012sol.pdf", title: "2012 期中卷解答" },
      { fileName: "UPImidterm2013.pdf", title: "2013 期中卷" },
      { fileName: "UPImidterm2013sol.pdf", title: "2013 期中卷解答" },
      { fileName: "UPImidterm2014.pdf", title: "2014 期中卷" },
      { fileName: "UPImidterm2014sol.pdf", title: "2014 期中卷解答" },
      { fileName: "UPImidterm2015.pdf", title: "2015 期中卷" },
      { fileName: "UPImidterm2015sol.pdf", title: "2015 期中卷解答" },
      { fileName: "UPImidterm2016.pdf", title: "2016 期中卷" },
      { fileName: "UPImidterm2016sol.pdf", title: "2016 期中卷解答" },
      { fileName: "UPImidterm2017.pdf", title: "2017 期中卷" },
      { fileName: "UPImidterm2017sol.pdf", title: "2017 期中卷解答" },
    ],
  }),
  ...buildFoundationCategoryRecords({
    courseSlug: "university-physics-i",
    category: "期末样卷",
    categoryOrder: 6,
    term: "大学物理上",
    summary: "大学物理上期末样卷与参考解答。",
    basePath: "/files/foundation/university-physics-i/finals",
    files: [
      { fileName: "UPIsamplefinal01.pdf", title: "期末样卷 01" },
      { fileName: "UPIsamplefinal01sol.pdf", title: "期末样卷 01 解答" },
      { fileName: "UPIsamplefinal02.pdf", title: "期末样卷 02" },
      { fileName: "UPIsamplefinal02sol.pdf", title: "期末样卷 02 解答" },
      { fileName: "UPIsamplefinal03.pdf", title: "期末样卷 03" },
      { fileName: "UPIsamplefinal03sol.pdf", title: "期末样卷 03 解答" },
      { fileName: "UPIsamplefinal04.pdf", title: "期末样卷 04" },
      { fileName: "UPIsamplefinal04sol.pdf", title: "期末样卷 04 解答" },
      { fileName: "UPIsamplefinal05.pdf", title: "期末样卷 05" },
      { fileName: "UPIsamplefinal05sol.pdf", title: "期末样卷 05 解答" },
      { fileName: "UPIsamplefinal06.pdf", title: "期末样卷 06" },
      { fileName: "UPIsamplefinal06sol.pdf", title: "期末样卷 06 解答" },
      { fileName: "UPIsamplefinal07.pdf", title: "期末样卷 07" },
      { fileName: "UPIsamplefinal07sol.pdf", title: "期末样卷 07 解答" },
      { fileName: "UPIsamplefinal08.pdf", title: "期末样卷 08" },
      { fileName: "UPIsamplefinal08sol.pdf", title: "期末样卷 08 解答" },
      { fileName: "UPIsamplefinal09.pdf", title: "期末样卷 09" },
      { fileName: "UPIsamplefinal09sol.pdf", title: "期末样卷 09 解答" },
    ],
  }),
  ...buildFoundationCategoryRecords({
    courseSlug: "university-physics-ii",
    category: "课程讲义",
    categoryOrder: 1,
    term: "大学物理下",
    summary: "大学物理下课程讲义与章节课件。",
    basePath: "/files/foundation/university-physics-ii/course-slides",
    files: physicsIISlides,
  }),
  ...buildFoundationCategoryRecords({
    courseSlug: "university-physics-ii",
    category: "作业答案",
    categoryOrder: 2,
    term: "大学物理下",
    summary: "大学物理下作业答案与习题讲解。",
    basePath: "/files/foundation/university-physics-ii/assignment-solutions",
    files: [
      { fileName: "sol17-19.ppt" },
      { fileName: "sol19-21.ppt" },
      { fileName: "sol22-24.ppt" },
      { fileName: "sol24-25.ppt" },
      { fileName: "sol25-28.ppt" },
      { fileName: "sol29-32.ppt" },
      { fileName: "xsol22.pdf" },
      { fileName: "xsol22-24.pdf" },
      { fileName: "xsol25-27.pdf" },
      { fileName: "xsol27-29.pdf" },
      { fileName: "xsol29-30.pdf" },
    ],
  }),
  ...buildFoundationCategoryRecords({
    courseSlug: "university-physics-ii",
    category: "期中样卷",
    categoryOrder: 3,
    term: "大学物理下",
    summary: "大学物理下期中样卷与历年卷解答。",
    basePath: "/files/foundation/university-physics-ii/midterms",
    files: [
      { fileName: "201711UPIImidterm.pdf", title: "2017-11 期中卷" },
      { fileName: "201711UPIImidtermsol.pdf", title: "2017-11 期中卷解答" },
      { fileName: "UPIImidtermsample01.pdf", title: "期中样卷 01" },
      { fileName: "UPIImidtermsample01sol.pdf", title: "期中样卷 01 解答" },
      { fileName: "UPIImidtermsample02.pdf", title: "期中样卷 02" },
      { fileName: "UPIImidtermsample02sol.pdf", title: "期中样卷 02 解答" },
      { fileName: "UPIImidtermsample03.pdf", title: "期中样卷 03" },
      { fileName: "UPIImidtermsample03sol.pdf", title: "期中样卷 03 解答" },
      { fileName: "UPIImidtermsample04.pdf", title: "期中样卷 04" },
      { fileName: "UPIImidtermsample04sol.pdf", title: "期中样卷 04 解答" },
      { fileName: "UPIImidtermsample06.pdf", title: "期中样卷 06" },
      { fileName: "UPIImidtermsample06sol.pdf", title: "期中样卷 06 解答" },
      { fileName: "UPIImidtermsample08.pdf", title: "期中样卷 08" },
      { fileName: "UPIImidtermsample08sol.pdf", title: "期中样卷 08 解答" },
      { fileName: "UPIImidtermsample09.pdf", title: "期中样卷 09" },
      { fileName: "UPIImidtermsample09sol.pdf", title: "期中样卷 09 解答" },
      { fileName: "midterm-combined.pdf", title: "期中试卷合集" },
    ],
  }),
  ...buildFoundationCategoryRecords({
    courseSlug: "university-physics-ii",
    category: "期末样卷",
    categoryOrder: 4,
    term: "大学物理下",
    summary: "大学物理下期末样卷与参考解答。",
    basePath: "/files/foundation/university-physics-ii/finals",
    files: [
      { fileName: "UPIIsamplefinal01.pdf", title: "期末样卷 01" },
      { fileName: "UPIIsamplefinal01sol.pdf", title: "期末样卷 01 解答" },
      { fileName: "UPIIsamplefinal02.pdf", title: "期末样卷 02" },
      { fileName: "UPIIsamplefinal02sol.pdf", title: "期末样卷 02 解答" },
      { fileName: "UPIIsamplefinal03.pdf", title: "期末样卷 03" },
      { fileName: "UPIIsamplefinal03sol.pdf", title: "期末样卷 03 解答" },
      { fileName: "UPIIsamplefinal04.pdf", title: "期末样卷 04" },
      { fileName: "UPIIsamplefinal04sol.pdf", title: "期末样卷 04 解答" },
      { fileName: "UPIIsamplefinal05.pdf", title: "期末样卷 05" },
      { fileName: "UPIIsamplefinal05sol.pdf", title: "期末样卷 05 解答" },
      { fileName: "UPIIsamplefinal06.pdf", title: "期末样卷 06" },
      { fileName: "UPIIsamplefinal06sol.pdf", title: "期末样卷 06 解答" },
      { fileName: "UPIIsamplefinal07.pdf", title: "期末样卷 07" },
      { fileName: "UPIIsamplefinal07sol.pdf", title: "期末样卷 07 解答" },
      { fileName: "UPIIsamplefinal08.pdf", title: "期末样卷 08" },
      { fileName: "UPIIsamplefinal08sol.pdf", title: "期末样卷 08 解答" },
      { fileName: "UPIIsamplefinal09.pdf", title: "期末样卷 09" },
      { fileName: "UPIIsamplefinal09sol.pdf", title: "期末样卷 09 解答" },
      { fileName: "final-combined-1.pdf", title: "期末试卷组合 1" },
      { fileName: "final-combined-2.pdf", title: "期末试卷组合 2" },
    ],
  }),
];

const trackMaterials: MaterialRecord[] = [
  {
    id: "cs-general-ml-guide",
    section: "track",
    trackSlug: "cs",
    courseSlug: "general-resources",
    category: "精选资料",
    categoryOrder: 1,
    title: "机器学习入门资源整理",
    type: "科研入门",
    term: "2026 Spring",
    summary: "适合方向入门的课程、教材和工具资源总览。",
    href: "https://example.com/cs/ml-guide",
  },
  {
    id: "cs-data-structures-review",
    section: "track",
    trackSlug: "cs",
    courseSlug: "data-structures",
    category: "精选资料",
    categoryOrder: 1,
    title: "数据结构期末复习提要",
    type: "参考资料",
    term: "2025 Fall",
    summary: "包含链表、树、图与复杂度分析的复习框架。",
    href: "https://example.com/cs/data-structures-review",
  },
];

export const SAMPLE_MATERIALS: MaterialRecord[] = [...foundationMaterials, ...trackMaterials];
