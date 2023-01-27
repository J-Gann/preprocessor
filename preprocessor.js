"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const { parse, find, replace, generate, Identifier, } = require("abstract-syntax-tree");
const jmespath_1 = __importDefault(require("jmespath"));
const prompts = require("prompts");
const data = require("./data.json");
/**
 * Preprocessor for translation of Enmeshed querying syntax
 */
const query = '("language:de" && !"language:en") && "mime:application/json" && ("schema:xschule" || "schema:elmo")';
const fileMetadataPathMapper = (literal) => {
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
const jmespath_translator = (query, pathMapper) => {
    const tree = parse(query);
    replace(tree, (node) => {
        if (node.type === "Literal") {
            return new Identifier({ name: pathMapper(node.value) });
        }
    });
    const jmespath_query = generate(tree);
    const jmespath_query_final = `[?${jmespath_query.slice(0, -2)}].id`;
    return jmespath_query_final;
};
(() => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield prompts({
        type: "text",
        name: "query",
        message: "Write query",
        validate: (query) => {
            try {
                const jmespath_query = jmespath_translator(query, fileMetadataPathMapper);
                jmespath_1.default.search(data, jmespath_query);
                return true;
            }
            catch (err) {
                return "Error";
            }
        },
    });
    const jmespath_query = jmespath_translator(response.query, fileMetadataPathMapper);
    const res = jmespath_1.default.search(data, jmespath_query);
    console.log("JMESPath Query:", jmespath_query);
    console.log("Query Response:", res);
}))();
