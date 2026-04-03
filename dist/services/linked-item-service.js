"use strict";
// File: src/services/linked-item-service.ts
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
exports.handleFetchAndPopulateLinkedColumn = handleFetchAndPopulateLinkedColumn;
const api_1 = require("@mondaydotcomorg/api");
function getClient(token) {
    return new api_1.ApiClient({ token });
}
/**
 * Universal formatter: Converts Monday's READ format into Monday's WRITE format
 */
function formatValueForUpdate(sourceType, parsedValue, rawText) {
    var _a, _b;
    if (!parsedValue && !rawText)
        return null;
    switch (sourceType) {
        case 'board_relation':
            // READ: {"linkedPulseIds":[{"linkedPulseId":123}]}
            // WRITE: {"item_ids": [123]}
            const extractedIds = ((_a = parsedValue === null || parsedValue === void 0 ? void 0 : parsedValue.linkedPulseIds) === null || _a === void 0 ? void 0 : _a.map((p) => p.linkedPulseId)) || [];
            return { item_ids: extractedIds };
        case 'people':
        case 'multiple_person': // Sometimes Monday uses this internally
            // READ & WRITE are mostly compatible, but it's safe to reconstruct it
            const personsAndTeams = (parsedValue === null || parsedValue === void 0 ? void 0 : parsedValue.personsAndTeams) || [];
            return { personsAndTeams };
        case 'status':
            // Best practice for Status is to write using the label string
            if (parsedValue === null || parsedValue === void 0 ? void 0 : parsedValue.label)
                return { label: parsedValue.label };
            if (rawText)
                return { label: rawText };
            return null;
        case 'dropdown':
            // WRITE: {"labels": ["Option 1", "Option 2"]}
            const labels = ((_b = parsedValue === null || parsedValue === void 0 ? void 0 : parsedValue.chosenValues) === null || _b === void 0 ? void 0 : _b.map((v) => v.name)) || [];
            return labels.length > 0 ? { labels } : null;
        case 'date':
            // WRITE: {"date": "YYYY-MM-DD"}
            return (parsedValue === null || parsedValue === void 0 ? void 0 : parsedValue.date) ? { date: parsedValue.date } : null;
        case 'numbers':
            // WRITE: "123" or 123
            return rawText ? String(rawText) : null;
        case 'mirror':
        case 'formula':
            // Mirrors and Formulas are READ-ONLY sources. 
            // We can only copy their text output into target Text/Long Text columns.
            return rawText ? String(rawText) : null;
        case 'text':
        case 'long_text':
            return rawText ? String(rawText) : null;
        default:
            // Fallback for unknown/simple types: return the raw parsed object
            return parsedValue || rawText;
    }
}
function handleFetchAndPopulateLinkedColumn(token, boardId, itemId, relationColId, sourceColumnId, targetColId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const client = getClient(token);
        // 1. Fetch the triggering item to get the linked item ID
        const itemQuery = `
        query($itemId: [ID!], $colIds: [String!]) {
            items(ids: $itemId) {
                column_values(ids: $colIds) {
                    ... on BoardRelationValue {
                        linked_item_ids
                    }
                    value
                }
            }
        }
    `;
        const itemRes = yield client.request(itemQuery, {
            itemId: [String(itemId)],
            colIds: [relationColId]
        });
        const relationCol = (_c = (_b = (_a = itemRes === null || itemRes === void 0 ? void 0 : itemRes.items) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.column_values) === null || _c === void 0 ? void 0 : _c[0];
        let linkedItemId = null;
        if ((relationCol === null || relationCol === void 0 ? void 0 : relationCol.linked_item_ids) && relationCol.linked_item_ids.length > 0) {
            linkedItemId = relationCol.linked_item_ids[0];
        }
        else if (relationCol === null || relationCol === void 0 ? void 0 : relationCol.value) {
            const parsed = JSON.parse(relationCol.value);
            linkedItemId = (_e = (_d = parsed === null || parsed === void 0 ? void 0 : parsed.linkedPulseIds) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.linkedPulseId;
        }
        if (!linkedItemId) {
            console.log(`[LinkedItemService] No linked item found in column ${relationColId} for item ${itemId}`);
            return;
        }
        // 2. Fetch the specific Source Column from the Linked Item
        // We request 'text', 'type', and 'value' to handle all scenarios
        const linkedItemQuery = `
        query($linkedItemId: [ID!], $sourceColIds: [String!]) {
            items(ids: $linkedItemId) {
                column_values(ids: $sourceColIds) {
                    id
                    type
                    text
                    value
                }
            }
        }
    `;
        const linkedItemRes = yield client.request(linkedItemQuery, {
            linkedItemId: [String(linkedItemId)],
            sourceColIds: [sourceColumnId]
        });
        const sourceCol = (_h = (_g = (_f = linkedItemRes === null || linkedItemRes === void 0 ? void 0 : linkedItemRes.items) === null || _f === void 0 ? void 0 : _f[0]) === null || _g === void 0 ? void 0 : _g.column_values) === null || _h === void 0 ? void 0 : _h[0];
        if (!sourceCol || (!sourceCol.value && !sourceCol.text)) {
            console.log(`[LinkedItemService] Source column ${sourceColumnId} is empty on linked item ${linkedItemId}`);
            return;
        }
        // 3. Use the Universal Formatter
        let parsedSourceValue = null;
        try {
            if (sourceCol.value)
                parsedSourceValue = JSON.parse(sourceCol.value);
        }
        catch (e) {
            // Value wasn't valid JSON (sometimes text columns are just raw strings)
        }
        const finalValueToUpdate = formatValueForUpdate(sourceCol.type, parsedSourceValue, sourceCol.text);
        if (finalValueToUpdate === null) {
            console.log(`[LinkedItemService] Could not format data for source type: ${sourceCol.type}`);
            return;
        }
        // 4. Update the Target Column on the original item
        const mutation = `
        mutation($boardId: ID!, $itemId: ID!, $colValues: JSON!) {
            change_multiple_column_values(
                board_id: $boardId,
                item_id: $itemId,
                column_values: $colValues
            ) { id }
        }
    `;
        yield client.request(mutation, {
            boardId: String(boardId),
            itemId: String(itemId),
            colValues: JSON.stringify({
                [targetColId]: finalValueToUpdate
            })
        });
    });
}
