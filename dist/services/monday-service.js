"use strict";
// File: src/services/monday-service.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = require("@mondaydotcomorg/api");
const queries_graphql_1 = require("../queries.graphql");
class MondayService {
    /**
     * Gets basic user information
     */
    static getMe(shortLiveToken) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const mondayClient = new api_1.ApiClient({ token: shortLiveToken });
                return yield mondayClient.operations.getMeOp();
            }
            catch (err) {
                console.error("❌ Monday Service Error (getMe):", err);
            }
        });
    }
    /**
     * Fetches a specific column value - useful for simple lookups
     */
    static getColumnValue(token, itemId, columnId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            try {
                const mondayClient = new api_1.ApiClient({ token: token });
                const params = { itemId: [itemId.toString()], columnId: [columnId] };
                const response = yield mondayClient.request(queries_graphql_1.getColumnValueQuery, params);
                return (_d = (_c = (_b = (_a = response === null || response === void 0 ? void 0 : response.items) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.column_values) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.value;
            }
            catch (err) {
                console.error("❌ Monday Service Error (getColumnValue):", err);
            }
        });
    }
    /**
     * Updates a column value. Automatically handles Long Text formatting.
     */
    static changeColumnValue(token, boardId, itemId, columnId, value) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const mondayClient = new api_1.ApiClient({ token: token });
                let finalValue = value;
                // If it's a Long Text column, Monday requires a specific JSON object {text: "..."}
                if (typeof value === 'string' && columnId.includes('long_text')) {
                    finalValue = { text: value };
                }
                const stringifiedValue = JSON.stringify(finalValue);
                return yield mondayClient.operations.changeColumnValueOp({
                    boardId: String(boardId),
                    itemId: String(itemId),
                    columnId: columnId,
                    value: stringifiedValue,
                });
            }
            catch (err) {
                console.error("❌ Monday Service Error (changeColumnValue):", err);
            }
        });
    }
    /**
     * Fetches all column definitions for a board.
     * Used to populate dropdowns in the automation recipe.
     */
    static getBoardColumns(token, boardId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const mondayClient = new api_1.ApiClient({ token: token });
                const query = `
              query ($boardId: [ID!]) {
                boards(ids: $boardId) {
                  columns { id title type }
                }
              }
            `;
                const response = yield mondayClient.request(query, { boardId: [boardId.toString()] });
                return (_b = (_a = response === null || response === void 0 ? void 0 : response.boards) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.columns;
            }
            catch (err) {
                console.error("❌ Monday Service Error (getBoardColumns):", err);
                return null;
            }
        });
    }
    /**
     * THE SMART QUERY: Fetches item data, assets, and column values.
     * Optimized to prevent "Complexity Budget Exhausted" errors on Subitems.
     */
    static getSmartItemData(token, itemId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const mondayClient = new api_1.ApiClient({ token: token });
                // We fetch the board ID dynamically so subitem updates work correctly.
                // Fragments for BoardRelation and MirrorValue are kept light (no nested assets).
                const query = `
              query ($itemId: [ID!]) {
                items(ids: $itemId) {
                  board { id } 
                  assets { id public_url name } 
                  column_values {
                    id
                    column { title }
                    text
                    value
                    ... on BoardRelationValue {
                      display_value
                    }
                    ... on MirrorValue {
                      display_value
                    }
                  }
                }
              }
            `;
                const response = yield mondayClient.request(query, { itemId: [itemId.toString()] });
                return (_a = response === null || response === void 0 ? void 0 : response.items) === null || _a === void 0 ? void 0 : _a[0];
            }
            catch (err) {
                console.error("❌ Monday Service Error (getSmartItemData):", err);
                return null;
            }
        });
    }
}
exports.default = MondayService;
