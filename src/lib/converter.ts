import ts from "typescript";
import { parseComponent } from "vue-template-compiler";
import { getNodeByKind } from "./helper";
import { convertClass } from "./converters/classApiConverter";
import { convertOptionsApi } from "./converters/optionsApiConverter";
import { getReplacer } from "./converters/replace";

export const convertSrc = (input: string): string => {
  const parsed = parseComponent(input);
  const { script } = parsed;
  if (!script) throw new Error("no convert target");
  const replacer = getReplacer(input, script);

  const sourceFile = ts.createSourceFile(
    "src.tsx",
    script.content,
    ts.ScriptTarget.Latest
  );

  const exportAssignNode = getNodeByKind(
    sourceFile,
    ts.SyntaxKind.ExportAssignment
  );
  if (exportAssignNode) {
    // optionsAPI
    const converted = convertOptionsApi(sourceFile);
    return replacer(converted);
  }

  const classNode = getNodeByKind(sourceFile, ts.SyntaxKind.ClassDeclaration);
  if (classNode && ts.isClassDeclaration(classNode)) {
    // classAPI
    return convertClass(classNode, sourceFile);
  }

  throw new Error("no convert target");
};
