"use strict";
// File: src/services/auto-number-service.ts
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
exports.determineNextAutoNumber = determineNextAutoNumber;
exports.handleCalculateCustomAutoNumber = handleCalculateCustomAutoNumber;
const api_1 = require("@mondaydotcomorg/api");
function getClient(token) {
    return new api_1.ApiClient({ token });
}
/**
 * Method to set value in Custom Auto Number column
 */
function updateItemColumns(token, boardId, itemId, columnValues) {
    return __awaiter(this, void 0, void 0, function* () {
        const client = getClient(token);
        const mutation = `
        mutation($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
            change_multiple_column_values(
                board_id: $boardId
                item_id: $itemId
                column_values: $columnValues
                create_labels_if_missing: false
            ) { id name }
        }
    `;
        yield client.request(mutation, {
            boardId: String(boardId),
            itemId: String(itemId),
            columnValues: JSON.stringify(columnValues),
        });
    });
}
/**
 * Helper to find the latest record based on a date/text column
 */
function findLatestRecord(items, dateColId) {
    let latestItem = null;
    let latestTimestamp = 0;
    for (const item of items) {
        const dateCol = item.column_values.find((c) => c.id === dateColId);
        let itemDate = 0;
        if (dateCol) {
            let parsedValue = null;
            if (dateCol.value) {
                try {
                    parsedValue = JSON.parse(dateCol.value);
                }
                catch (e) {
                    parsedValue = null;
                }
            }
            if (parsedValue === null || parsedValue === void 0 ? void 0 : parsedValue.date) {
                // Prefer date + time if available
                const dateTimeStr = parsedValue.time
                    ? `${parsedValue.date}T${parsedValue.time}`
                    : `${parsedValue.date}`;
                itemDate = new Date(dateTimeStr).getTime();
            }
            // Fallback to text (just in case)
            else if (dateCol.text) {
                itemDate = new Date(dateCol.text).getTime();
            }
        }
        // ✅ Key change:
        // Use >= so that in case of same date, LAST item wins
        if (itemDate >= latestTimestamp) {
            latestTimestamp = itemDate;
            latestItem = item;
        }
    }
    return latestItem;
}
/**
 * Helper to calculate the next auto-number string
 * Handles prefixes and preserves leading zeros (e.g. "REG-009" -> "REG-010")
 */
function determineNextAutoNumber(previousValue) {
    if (!previousValue) {
        return "1";
    }
    const match = previousValue.match(/^(.*?)(\d+)$/);
    if (match) {
        const prefix = match[1];
        const numStr = match[2];
        const numLength = numStr.length; // Store length to preserve leading zeros
        const nextNum = parseInt(numStr, 10) + 1;
        // Pad with zeros to maintain identical string formatting (e.g. 008 -> 009)
        const nextNumStr = nextNum.toString().padStart(numLength, '0');
        const nextValue = `${prefix}${nextNumStr}`;
        return nextValue;
    }
    else {
        return "1";
    }
}
function handleCalculateCustomAutoNumber(token, boardId, itemId, createdDateColId, customAutoNumberColId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        const client = getClient(token);
        // 1. Query latest reference record (Fetch up to 500 items, but ONLY the two columns we need)
        const query = `
        query($boardId: [ID!], $colIds: [String!]) {
            boards(ids: $boardId) {
                items_page(limit: 500) {
                    items {
                        id
                        column_values(ids: $colIds) {
                            id
                            value
                            text
                        }
                    }
                }
            }
        }
    `;
        const response = yield client.request(query, {
            boardId: [String(boardId)],
            colIds: [createdDateColId, customAutoNumberColId]
        });
        const allItems = ((_c = (_b = (_a = response === null || response === void 0 ? void 0 : response.boards) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.items_page) === null || _c === void 0 ? void 0 : _c.items) || [];
        // Filter out the newly created (triggering) record
        const otherItems = allItems.filter((item) => String(item.id) !== String(itemId));
        let nextValue = "1"; // Default rule: If this is the absolute first record, start at 1.
        if (otherItems.length > 0) {
            // 2. Find the absolute latest item based on the timestamp column
            const latestItem = findLatestRecord(otherItems, createdDateColId);
            if (latestItem) {
                const autoNumCol = latestItem.column_values.find((c) => c.id === customAutoNumberColId);
                // Extract the raw string value representing the previous number/prefix
                let previousValue = (autoNumCol === null || autoNumCol === void 0 ? void 0 : autoNumCol.text) || "";
                if (!previousValue && (autoNumCol === null || autoNumCol === void 0 ? void 0 : autoNumCol.value)) {
                    try {
                        const parsed = JSON.parse(autoNumCol.value);
                        previousValue = parsed !== null && typeof parsed === 'object' ? (parsed.value || "") : String(parsed);
                    }
                    catch (e) {
                        previousValue = autoNumCol.value;
                    }
                }
                previousValue = previousValue.replace(/['"]+/g, '').trim();
                // 3. Delegate to modular helper to calculate next value
                nextValue = determineNextAutoNumber(previousValue);
            }
        }
        // 4. Update the triggering record with the newly generated auto-number
        yield updateItemColumns(token, boardId, itemId, {
            [customAutoNumberColId]: nextValue
        });
    });
}
