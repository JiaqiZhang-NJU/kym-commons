import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  consolidateProgrammingExamples,
  findProgrammingExamplePackages,
} from "./consolidate-programming-examples.mjs";

const temporaryDirectories = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe("programming example consolidation", () => {
  it("merges source files into the ZIP package and preserves legacy IDs", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "kym-examples-"));
    temporaryDirectories.push(root);
    const directory = path.join(
      root,
      "content",
      "packages",
      "foundation",
      "introduction-to-programming"
    );
    fs.mkdirSync(directory, { recursive: true });
    writePackage(directory, {
      id: "88ef3ae3-2633-468d-804b-c054579af7ba",
      summary: "Archive",
      materialType: "Reference",
      tags: [],
      assets: [asset("asset-1", "examples.zip")],
      legacyIds: ["archive-legacy"],
    });
    writePackage(directory, {
      id: "source-a",
      assets: [asset("asset-1", "hello.c")],
      legacyIds: ["source-a-legacy"],
    });
    writePackage(directory, {
      id: "source-b",
      assets: [asset("asset-1", "example.h")],
      legacyIds: [],
    });

    expect(consolidateProgrammingExamples({ root })).toEqual({
      mergedPackages: 2,
      assets: 3,
    });
    const { aggregate, examples } = findProgrammingExamplePackages(root);
    expect(examples).toHaveLength(0);
    expect(aggregate.materialPackage.assets.map((item) => item.fileName)).toEqual([
      "examples.zip",
      "example.h",
      "hello.c",
    ]);
    expect(aggregate.materialPackage.legacyIds).toEqual(
      expect.arrayContaining(["archive-legacy", "source-a", "source-a-legacy", "source-b"])
    );
  });
});

function writePackage(directory, materialPackage) {
  fs.writeFileSync(
    path.join(directory, `${materialPackage.id}.json`),
    JSON.stringify(materialPackage)
  );
}

function asset(id, fileName) {
  return {
    id,
    label: fileName,
    role: "primary",
    href: `/files/foundation/introduction-to-programming/materials/${fileName}`,
    fileName,
    mediaType: null,
    sizeBytes: 1,
    sha256: "a",
  };
}
