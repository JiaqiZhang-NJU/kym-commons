const finalPattern = /(?:^|[^a-z])final(?:s|[^a-z]|$)|\u671f\u672b|\u671f\u7ec8|\u672b\u8003/i;
const midtermPattern = /(?:^|[^a-z])mid[- _]?term(?:s|[^a-z]|$)|\u671f\u4e2d/i;
const samplePattern = /(?:^|[^a-z])sample(?:s|[^a-z]|$)|\u6837\u5377|\u6a21\u62df\u5377/i;
const examCategories = new Set([
  "reference",
  "sample-exams",
  "midterms",
  "midterm-samples",
  "finals",
  "final-samples",
]);

export function inferCategorySlug(materialPackage) {
  if (!examCategories.has(materialPackage.categorySlug)) {
    return materialPackage.categorySlug;
  }

  const evidence = getClassificationEvidence(materialPackage);
  if (
    materialPackage.categorySlug === "reference" &&
    materialPackage.placement?.section === "track" &&
    materialPackage.placement?.trackSlug === "cs" &&
    materialPackage.placement?.courseSlug === "distributed-systems" &&
    /^(?:20(?:15|18|20|21|23|24)|.*考题).*\.pdf$/iu.test(
      materialPackage.assets?.[0]?.fileName ?? ""
    )
  ) {
    return "sample-exams";
  }
  const isFinal = finalPattern.test(evidence);
  const isMidterm = midtermPattern.test(evidence);

  if (isFinal === isMidterm) {
    return materialPackage.categorySlug;
  }

  if (isFinal) {
    return samplePattern.test(evidence) ? "final-samples" : "finals";
  }

  return samplePattern.test(evidence) ? "midterm-samples" : "midterms";
}

export function getClassificationEvidence(materialPackage) {
  return [
    materialPackage.title,
    materialPackage.materialType,
    ...(materialPackage.assets ?? []).flatMap((asset) => [
      asset.label,
      asset.fileName ?? "",
    ]),
  ].join(" ");
}
