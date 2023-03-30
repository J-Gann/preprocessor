"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const { parse, replace, generate, Identifier, } = require("abstract-syntax-tree");
const jmespath_1 = __importDefault(require("jmespath"));
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
const getContentOptions = (content) => {
    const contents = Object.keys(tags.content);
    const contentOptions = contents.filter((value) => value.startsWith(content));
    return contentOptions;
};
// Translate keywords to jmespath statements
const pathMapper = (literal) => {
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
const jmespathQueryConstruction = (query) => {
    const contentOptions = getContentOptions(query.content);
    let contentQuery = "";
    for (const [index, content] of contentOptions.entries()) {
        const mapped = pathMapper(content);
        contentQuery += mapped;
        contentQuery += contentOptions.length - 1 == index ? "" : " || ";
    }
    const tree = parse(query.filter);
    replace(tree, (node) => {
        if (node.type === "Literal") {
            return new Identifier({ name: pathMapper(node.value) });
        }
    });
    const jmespath_filter = generate(tree).slice(0, -2);
    const query_combined = `(${contentQuery}) && (${jmespath_filter})`;
    const query_final = `[?${query_combined}].id`;
    return query_final;
};
// Compute distance of content strings
// Returns Infinity if root not parent of child
const contentDist = (root, child) => {
    if (!child.startsWith(root)) {
        return Infinity;
    }
    else if (root == child) {
        return 0;
    }
    else {
        child = child.replace(root + ".", "");
        const distance = child.split(".").length;
        return distance;
    }
};
const jmespathQuery = jmespathQueryConstruction(query);
const res = jmespath_1.default.search(data, jmespathQuery);
const getContent = (id) => {
    const attributes = jmespath_1.default.search(data, `[?id == \`${id}\`]`);
    if (attributes.length == 0)
        return ""; // id does not exist
    return attributes[0].tags.find((elem) => elem.startsWith("content:")); // should only contain one content string
};
const rankIDs = (query, ids) => {
    const idsMap = ids.map((id) => {
        return { id, dist: contentDist(query.content, getContent(id)) };
    });
    idsMap.sort((a, b) => a.dist - b.dist);
    return idsMap;
};
const result = rankIDs(query, res);
console.log("JMESPath Query:", jmespathQuery);
console.log("Query Response:", result);
