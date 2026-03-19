"use strict";
// File: src/services/item-duplicacy.ts
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
exports.getRecordById = getRecordById;
exports.checkProductDuplicacy = checkProductDuplicacy;
exports.checkDispatchAndBillingDuplicacy = checkDispatchAndBillingDuplicacy;
const api_1 = require("@mondaydotcomorg/api");
// ─── Private helper: build ApiClient ─────────────────────────
function getClient(token) {
    return new api_1.ApiClient({ token });
}
// ─── 1. Fetch board columns ───────────────────────────────────
function getBoardColumns(token, boardId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            const client = getClient(token);
            const query = `
            query($boardId: [ID!]) {
                boards(ids: $boardId) {
                    columns { id title type }
                }
            }
        `;
            const response = yield client.request(query, {
                boardId: [String(boardId)],
            });
            const columns = ((_b = (_a = response === null || response === void 0 ? void 0 : response.boards) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.columns) || [];
            if (columns.length === 0) {
                throw new Error(`No columns found for board ${boardId}`);
            }
            return columns;
        }
        catch (err) {
            console.error(`❌ ItemDuplicacy Error (getBoardColumns) board ${boardId}:`, err.message);
            throw err;
        }
    });
}
// ─── 2. Fetch single item by ID ───────────────────────────────
// board { id } is included so we can derive boardId without
// needing it passed in from the automation payload
function getRecordById(token, itemId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const client = getClient(token);
            const query = `
            query($itemId: [ID!]) {
                items(ids: $itemId) {
                    id
                    name
                    board { id name }
                    column_values {
                        id
                        title
                        text
                        value
                        type
                        display_value
                        ... on FormulaValue        { display_value }
                        ... on MirrorValue         { display_value }
                        ... on BoardRelationValue  { display_value }
                    }
                }
            }
        `;
            const response = yield client.request(query, {
                itemId: [String(itemId)],
            });
            const item = (_a = response === null || response === void 0 ? void 0 : response.items) === null || _a === void 0 ? void 0 : _a[0];
            if (!item)
                throw new Error(`Item ${itemId} not found`);
            return item;
        }
        catch (err) {
            console.error(`❌ ItemDuplicacy Error (getRecordById) item ${itemId}:`, err.message);
            throw err;
        }
    });
}
// ─── 3. Fetch all records from a board ────────────────────────
function getAllBoardRecords(token, boardId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        try {
            const client = getClient(token);
            const query = `
            query($boardId: [ID!]) {
                boards(ids: $boardId) {
                    items_page(limit: 500) {
                        items {
                            id
                            name
                            column_values {
                                id
                                title
                                text
                                value
                                type
                                display_value
                                ... on FormulaValue        { display_value }
                                ... on MirrorValue         { display_value }
                                ... on BoardRelationValue  { display_value }
                            }
                        }
                    }
                }
            }
        `;
            const response = yield client.request(query, {
                boardId: [String(boardId)],
            });
            return ((_c = (_b = (_a = response === null || response === void 0 ? void 0 : response.boards) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.items_page) === null || _c === void 0 ? void 0 : _c.items) || [];
        }
        catch (err) {
            console.error(`❌ ItemDuplicacy Error (getAllBoardRecords) board ${boardId}:`, err.message);
            throw err;
        }
    });
}
// ─── 4. Get column ID by title ────────────────────────────────
function getColumnIdByTitle(columns, title) {
    const col = columns.find((c) => { var _a; return ((_a = c.title) === null || _a === void 0 ? void 0 : _a.trim().toLowerCase()) === title.trim().toLowerCase(); });
    if (!col) {
        const available = columns.map((c) => `"${c.title}"`).join(", ");
        throw new Error(`Column "${title}" not found. Available: ${available}`);
    }
    return col.id;
}
// ─── 5. Get item column value ─────────────────────────────────
function getItemColValue(item, columnId) {
    var _a, _b, _c, _d, _e;
    const col = (_a = item.column_values) === null || _a === void 0 ? void 0 : _a.find((cv) => cv.id === columnId);
    if (!col)
        return "";
    if (col.type === "formula" || col.type === "mirror" || col.type === "board_relation") {
        return (_c = (_b = col.display_value) === null || _b === void 0 ? void 0 : _b.trim().toLowerCase()) !== null && _c !== void 0 ? _c : "";
    }
    return (_e = (_d = col.text) === null || _d === void 0 ? void 0 : _d.trim().toLowerCase()) !== null && _e !== void 0 ? _e : "";
}
// ─── 6. Update item columns ───────────────────────────────────
function updateItemColumns(token, boardId, itemId, columnValues) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const client = getClient(token);
            const mutation = `
            mutation($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
                change_multiple_column_values(
                    board_id:      $boardId
                    item_id:       $itemId
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
            console.log(`✅ ItemDuplicacy: Updated item ${itemId} on board ${boardId}`);
        }
        catch (err) {
            console.error(`❌ ItemDuplicacy Error (updateItemColumns) item ${itemId}:`, err.message);
            throw err;
        }
    });
}
// ─── 7. Shared duplicate check core ───────────────────────────
// Extracted so both product and dispatch functions share the same logic
// boardId comes FROM the item record itself — no need for it in payload
function runDuplicateCheck(token, itemId, matchColTitle, // column to check for duplicates
isDupColTitle, // "Is Duplicate" column title
dupErrColTitle, // "Duplicate Error" column title
logPrefix // "[Product Duplicacy]" etc.
) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        // Step 1 — fetch the triggering record first to get its boardId
        const triggeringRecord = yield getRecordById(token, itemId);
        // Step 2 — derive boardId from the record itself ✅
        // This is the fix for "automation doesn't send boardId"
        const boardId = (_a = triggeringRecord.board) === null || _a === void 0 ? void 0 : _a.id;
        if (!boardId) {
            throw new Error(`${logPrefix} Could not determine boardId for item ${itemId}`);
        }
        console.log(`${logPrefix} Item ${itemId} | Board: ${boardId}`);
        // Step 3 — fetch columns and all records in parallel now that we have boardId
        const [boardColumns, allRecords] = yield Promise.all([
            getBoardColumns(token, boardId),
            getAllBoardRecords(token, boardId),
        ]);
        // Step 4 — resolve column IDs by title
        const matchColId = getColumnIdByTitle(boardColumns, matchColTitle);
        const isDupColId = getColumnIdByTitle(boardColumns, isDupColTitle);
        const dupErrColId = getColumnIdByTitle(boardColumns, dupErrColTitle);
        // Step 5 — get match value from triggering record
        const matchVal = getItemColValue(triggeringRecord, matchColId);
        if (!matchVal) {
            console.log(`${logPrefix} Item ${itemId} has no value in "${matchColTitle}" — skipping`);
            return { isDuplicate: false };
        }
        console.log(`${logPrefix} Item ${itemId} | ${matchColTitle}: "${matchVal}"`);
        // Step 6 — find a duplicate
        const duplicateRecord = allRecords.find((record) => String(record.id) !== String(itemId) &&
            getItemColValue(record, matchColId) === matchVal);
        const isDuplicate = !!duplicateRecord;
        const errorMessage = isDuplicate
            ? `Duplicate of item ID: ${duplicateRecord.id} — "${duplicateRecord.name}"`
            : "";
        console.log(isDuplicate
            ? `${logPrefix} ✅ Duplicate found: ${itemId} matches ${duplicateRecord.id}`
            : `${logPrefix} ✅ No duplicate found for item ${itemId}`);
        // Step 7 — update the triggering record
        yield updateItemColumns(token, boardId, itemId, {
            [isDupColId]: { checked: isDuplicate ? "true" : "false" },
            [dupErrColId]: errorMessage,
        });
        return {
            isDuplicate,
            duplicateId: duplicateRecord === null || duplicateRecord === void 0 ? void 0 : duplicateRecord.id,
            duplicateName: duplicateRecord === null || duplicateRecord === void 0 ? void 0 : duplicateRecord.name,
        };
    });
}
// ─── 8. Product duplicate check ──────────────────────────────
// Rule: duplicate if another record has the same "Summary (Fx)" value
function checkProductDuplicacy(token, itemId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return yield runDuplicateCheck(token, itemId, "Summary (Fx)", // match column
            "Is Duplicate", // flag column
            "Duplicate Error", // message column
            "[Product Duplicacy]");
        }
        catch (err) {
            console.error(`[Product Duplicacy] ❌ Error for item ${itemId}:`, err.message);
            throw err;
        }
    });
}
// ─── 9. Dispatch & Billing duplicate check ────────────────────
// Rule: duplicate if another record has the same "Invoice No." value
function checkDispatchAndBillingDuplicacy(token, itemId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return yield runDuplicateCheck(token, itemId, "Invoice No.", // match column
            "Is Duplicate", // flag column
            "Duplicate Error", // message column
            "[Dispatch Duplicacy]");
        }
        catch (err) {
            console.error(`[Dispatch Duplicacy] ❌ Error for item ${itemId}:`, err.message);
            throw err;
        }
    });
}
