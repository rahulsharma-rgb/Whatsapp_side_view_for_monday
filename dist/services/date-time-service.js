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
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSetDateTimeFieldAsNow = handleSetDateTimeFieldAsNow;
const api_1 = require("@mondaydotcomorg/api");
function getClient(token) {
    return new api_1.ApiClient({ token });
}
function handleSetDateTimeFieldAsNow(token, boardId, itemId, dateTimeColId) {
    return __awaiter(this, void 0, void 0, function* () {
        const client = getClient(token);
        // ✅ Current UTC time in required format: 2026-03-23T13:48:55Z
        const now = new Date().toISOString();
        const mutation = `
        mutation($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
            change_multiple_column_values(
                board_id: $boardId
                item_id: $itemId
                column_values: $columnValues
            ) {
                id
            }
        }
    `;
        yield client.request(mutation, {
            boardId: String(boardId),
            itemId: String(itemId),
            columnValues: JSON.stringify({
                [dateTimeColId]: {
                    date: now.split('T')[0], // Yields: "YYYY-MM-DD"
                    time: now.split('T')[1].split('.')[0] // Yields: "HH:mm:ss" (strips off the .sssZ)
                }
            })
        });
    });
}
