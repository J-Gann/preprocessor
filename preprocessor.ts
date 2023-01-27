const {
  parse,
  find,
  replace,
  generate,
  Identifier,
} = require("abstract-syntax-tree");
import jmespath from "jmespath";
const prompts = require("prompts");
const data = require("./data.json");

/**
 * Preprocessor for translation of Enmeshed querying syntax
 */

const query =
  '("language:de" && !"language:en") && "mime:application/json" && ("schema:xschule" || "schema:elmo")';

const fileMetadataPathMapper = (literal: string) => {
  const [category, value] = literal.split(":");
  switch (category) {
    case "language":
      return `contains(tags, '${literal}')`;
    case "mime":
      return `contains(structures[].mimetype[], '${value}')`;
    case "schema":
      return `contains(structures[].schemas[], '${value}')`;
    case "content":
      return `contains(content, '${value}')`;
  }
};

const jmespath_translator = (query: string, pathMapper: Function) => {
  const tree = parse(query);
  replace(tree, (node: any) => {
    if (node.type === "Literal") {
      return new Identifier({ name: pathMapper(node.value) });
    }
  });
  const jmespath_query = generate(tree);
  const jmespath_query_final = `[?${jmespath_query.slice(0, -2)}].id`;
  return jmespath_query_final;
};

(async () => {
  const response = await prompts({
    type: "text",
    name: "query",
    message: "Write query",
    validate: (query: string) => {
      try {
        const jmespath_query = jmespath_translator(
          query,
          fileMetadataPathMapper
        );
        jmespath.search(data, jmespath_query);
        return true;
      } catch (err: any) {
        return "Error";
      }
    },
  });

  const jmespath_query = jmespath_translator(
    response.query,
    fileMetadataPathMapper
  );
  const res = jmespath.search(data, jmespath_query);

  console.log("JMESPath Query:", jmespath_query);
  console.log("Query Response:", res);
})();
