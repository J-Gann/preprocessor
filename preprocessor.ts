const {
  parse,
  replace,
  generate,
  Identifier,
} = require("abstract-syntax-tree");
import jmespath from "jmespath";
const data = require("./data.json");
const tags = require("./tags.json");

// Query ################################

const query = {
  content: "content:x.edu.de.higher.degree",
  filter: '("language:de" && !"language:en")',
};

// ######################################

/**
 * List all content strings which are part of the subtree which has the query content string as root
 */
const getContentOptions = (content: string): string[] => {
  const contents: string[] = Object.keys(tags.content);
  const contentOptions = contents.filter((value: string) =>
    value.startsWith(content)
  );
  return contentOptions;
};

/**
 * Translate keywords to jmespath statements
 */
const pathMapper = (literal: string) => {
  const [category, value] = literal.split(":");
  switch (category) {
    case "content":
    case "language":
      return `contains(tags, '${literal}')`;
    case "mime":
      return `contains(structures[].mimetype[], '${value}')`;
    case "schema":
      return `contains(structures[].schemas[], '${value}')`;
  }
};

const jmespathQueryConstruction = (query: {
  content: string;
  filter: string;
}): string => {
  const contentOptions = getContentOptions(query.content);

  let contentQuery = "";

  for (const [index, content] of contentOptions.entries()) {
    const mapped = pathMapper(content);
    contentQuery += mapped;
    contentQuery += contentOptions.length - 1 == index ? "" : " || ";
  }

  const tree = parse(query.filter);
  replace(tree, (node: any) => {
    if (node.type === "Literal") {
      return new Identifier({ name: pathMapper(node.value) });
    }
  });
  const jmespath_filter = generate(tree).slice(0, -2);

  const query_combined = `(${contentQuery}) && (${jmespath_filter})`;
  const query_final = `[?${query_combined}].id`;
  return query_final;
};

/**
 * Compute distance of content strings
 */
const contentDist = (root: string, child: string) => {
  if (!child.startsWith(root)) {
    return Infinity;
  } else if (root == child) {
    return 0;
  } else {
    child = child.replace(root + ".", "");
    const distance = child.split(".").length;
    return distance;
  }
};

/**
 * Get content string by attribute id
 */
const getContent = (id: number): string => {
  const attributes = jmespath.search(data, `[?id == \`${id}\`]`);
  if (attributes.length == 0) return ""; // id does not exist
  return attributes[0].tags.find((elem: string) => elem.startsWith("content:")); // should only contain one content string
};

/**
 * Sort attributes by distance to queried content string
 */
const rankIDs = (
  query: { content: string; filter: string },
  ids: number[]
): { id: number; dist: number }[] => {
  const idsMap = ids.map((id) => {
    return { id, dist: contentDist(query.content, getContent(id)) };
  });
  idsMap.sort((a, b) => a.dist - b.dist);
  return idsMap;
};

// Execution

const jmespathQuery = jmespathQueryConstruction(query);
const res: number[] = jmespath.search(data, jmespathQuery);

const result = rankIDs(query, res);

console.log("JMESPath Query:", jmespathQuery);
console.log("Query Response:", result);
