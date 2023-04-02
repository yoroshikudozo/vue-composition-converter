import ts from "typescript";
import {
  ConvertedExpression,
  getInitializerProps,
  nonNull,
  storePath,
} from "../../helper";

export const computedConverter = (
  node: ts.Node,
  sourceFile: ts.SourceFile
): ConvertedExpression[] => {
  return getInitializerProps(node)
    .map((prop) => {
      if (ts.isSpreadAssignment(prop)) {
        // mapGetters, mapState
        if (!ts.isCallExpression(prop.expression)) return;

        const { expression } = prop.expression;
        if (!ts.isIdentifier(expression)) return;

        switch (expression.text) {
          case "mapState":
            return convertMapState(prop.expression);
          case "mapGetters":
            // console.log("mapGetters", names);
            return convertMapGetters(prop.expression);
        }
        return null;
      } else if (ts.isMethodDeclaration(prop)) {
        // computed method
        const { name: propName, body, type } = prop;
        const typeName = type ? `:${type.getText(sourceFile)}` : "";
        const block = body?.getText(sourceFile) || "{}";
        const name = propName.getText(sourceFile);

        return {
          use: "computed",
          expression: `const ${name} = computed(()${typeName} => ${block})`,
          returnNames: [name],
        };
      } else if (ts.isPropertyAssignment(prop)) {
        // computed getter/setter
        if (!ts.isObjectLiteralExpression(prop.initializer)) return;

        const name = prop.name.getText(sourceFile);
        const block = prop.initializer.getText(sourceFile) || "{}";

        return {
          use: "computed",
          expression: `const ${name} = computed(${block})`,
          returnNames: [name],
        };
      }
    })
    .flat()
    .filter(nonNull);
};

const convertMapState = (
  expression: ts.CallExpression
): ConvertedExpression[] => {
  const { arguments: args } = expression;

  const [namespace, mapArray] = args;
  if (!ts.isStringLiteral(namespace)) return [];
  if (!ts.isArrayLiteralExpression(mapArray)) return [];

  const namespaceText = namespace.text;
  const names = mapArray.elements as ts.NodeArray<ts.StringLiteral>;

  return names.map(({ text: name }) => {
    return {
      use: "computed",
      expression: `const ${name} = computed(() => ${storePath}.state.${namespaceText}.${name})`,
      returnNames: [name],
    };
  });
};

const convertMapGetters = (
  expression: ts.CallExpression
): ConvertedExpression[] => {
  const { arguments: args } = expression;
  if (ts.isStringLiteral(args[0])) {
    if (ts.isArrayLiteralExpression(args[1])) {
      const mapArray = args[1] as ts.ArrayLiteralExpression;
      const namespaceText = args[0].text;
      const names = mapArray.elements as ts.NodeArray<ts.StringLiteral>;
      return names.map(({ text: name }) => {
        return {
          use: "computed",
          expression: `const ${name} = computed(() => ${storePath}.getters['${namespaceText}/${name}'])`,
          returnNames: [name],
        };
      });
    }
  } else if (ts.isObjectLiteralExpression(args[0])) {
    return args[0].properties
      .filter(ts.isPropertyAssignment)
      .map((property) => {
        const name = property.name as ts.Identifier;
        const initializer = property.initializer as ts.Identifier;
        return {
          use: "computed",
          expression: `const ${name.text} = computed(() => ${storePath}.getters['${initializer.text}'])`,
          returnNames: [name.text],
        };
      });
  }
  return [];
};
