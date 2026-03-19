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
exports.checkProductDuplicacyV2 = checkProductDuplicacyV2;
exports.checkDispatchAndBillingDuplicacyV2 = checkDispatchAndBillingDuplicacyV2;
const api_1 = require("@mondaydotcomorg/api");
// ─── Private helpers ─────────────────────────────────────────
function getClient(token) {
    return new api_1.ApiClient({ token });
}
function getBoardColumns(token, boardId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const client = getClient(token);
        const query = `
        query($boardId: [ID!]) {
            boards(ids: $boardId) {
                columns { id title type }
            }
        }
    `;
        const response = yield client.request(query, { boardId: [String(boardId)] });
        const columns = ((_b = (_a = response === null || response === void 0 ? void 0 : response.boards) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.columns) || [];
        if (columns.length === 0)
            throw new Error(`No columns found for board ${boardId}`);
        return columns;
    });
}
function getRecordById(token, itemId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const client = getClient(token);
        const query = `
        query($itemId: [ID!]) {
            items(ids: $itemId) {
                id name
                board { id name }
                column_values {
                    id
                    column { title type }
                    text value
                    ... on FormulaValue        { display_value }
                    ... on MirrorValue         { display_value }
                    ... on BoardRelationValue  { linked_item_ids display_value }
                }
            }
        }
    `;
        const response = yield client.request(query, { itemId: [String(itemId)] });
        const item = (_a = response === null || response === void 0 ? void 0 : response.items) === null || _a === void 0 ? void 0 : _a[0];
        if (!item)
            throw new Error(`Item ${itemId} not found`);
        return item;
    });
}
function getAllBoardRecords(token, boardId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        const client = getClient(token);
        const query = `
        query($boardId: [ID!]) {
            boards(ids: $boardId) {
                items_page(limit: 500) {
                    items {
                        id name
                        board { id name }
                        column_values {
                            id
                            column { title type }
                            text value
                            ... on FormulaValue        { display_value }
                            ... on MirrorValue         { display_value }
                            ... on BoardRelationValue  { linked_item_ids display_value }
                        }
                    }
                }
            }
        }
    `;
        const response = yield client.request(query, { boardId: [String(boardId)] });
        return ((_c = (_b = (_a = response === null || response === void 0 ? void 0 : response.boards) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.items_page) === null || _c === void 0 ? void 0 : _c.items) || [];
    });
}
function getColumnIdByTitle(columns, title) {
    const col = columns.find(c => { var _a; return ((_a = c.title) === null || _a === void 0 ? void 0 : _a.trim().toLowerCase()) === title.trim().toLowerCase(); });
    if (!col)
        throw new Error(`Column "${title}" not found.`);
    return col.id;
}
function getItemColValue(item, columnId) {
    var _a, _b, _c, _d, _e;
    const col = (_a = item.column_values) === null || _a === void 0 ? void 0 : _a.find((cv) => cv.id === columnId);
    if (!col)
        return "";
    if (col.type === "formula")
        return (_c = (_b = col.display_value) === null || _b === void 0 ? void 0 : _b.trim().toLowerCase()) !== null && _c !== void 0 ? _c : "";
    return (_e = (_d = col.text) === null || _d === void 0 ? void 0 : _d.trim().toLowerCase()) !== null && _e !== void 0 ? _e : "";
}
function updateItemColumns(token, boardId, itemId, columnValues) {
    return __awaiter(this, void 0, void 0, function* () {
        const client = getClient(token);
        const mutation = `
        mutation($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
            change_multiple_column_values(
                board_id: $boardId, item_id: $itemId, column_values: $columnValues, create_labels_if_missing: false
            ) { id name }
        }
    `;
        yield client.request(mutation, {
            boardId: String(boardId), itemId: String(itemId), columnValues: JSON.stringify(columnValues),
        });
        console.log(`✅ ItemDuplicacy: Updated item ${itemId} on board ${boardId}`);
    });
}
// ============================================================================
// 1. PRODUCT / COUNT BOARD DUPLICATE CHECK (Multiple Columns)
// ============================================================================
function checkProductDuplicacyV2(token, itemId, isDupColId, dupErrColId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        console.log(`[Product Duplicacy V2] Starting check for item ${itemId}`);
        const triggeringRecord = yield getRecordById(token, itemId);
        const boardId = (_a = triggeringRecord.board) === null || _a === void 0 ? void 0 : _a.id;
        if (!boardId)
            throw new Error(`[Product Duplicacy V2] Could not determine boardId for item ${itemId}`);
        const [boardColumns, allRecords] = yield Promise.all([
            getBoardColumns(token, boardId),
            getAllBoardRecords(token, boardId),
        ]);
        // 1. Define all columns that must match exactly
        const multiMatchColTitles = [
            "Thread Count", "Machine", "Type", "Fabric 1", "Fabric 1 (Percentage)",
            "Fabric 2", "Fabric 2 (Percentage)", "Yarn", "Process", "Certification"
        ];
        // 2. Safely map titles to their actual column IDs on the board
        const matchColIds = multiMatchColTitles.reduce((acc, title) => {
            const col = boardColumns.find(c => { var _a; return ((_a = c.title) === null || _a === void 0 ? void 0 : _a.trim().toLowerCase()) === title.trim().toLowerCase(); });
            if (col)
                acc.push(col.id);
            return acc;
        }, []);
        // 3. Extract the exact string values from the triggering record
        const triggeringValues = matchColIds.map(colId => getItemColValue(triggeringRecord, colId));
        let isDuplicate = false;
        let errorMessage = "";
        let duplicateRecord;
        // Optional Check: Ensure at least ONE of these columns actually has data before calling it a blank duplicate
        const hasAnyValue = triggeringValues.some(val => val !== "");
        if (!hasAnyValue) {
            errorMessage = "All matching columns are blank.";
        }
        else {
            // 4. Search existing records for a complete match across all defined columns
            duplicateRecord = allRecords.find((record) => {
                if (String(record.id) === String(itemId))
                    return false; // skip self
                return matchColIds.every((colId, index) => {
                    return getItemColValue(record, colId) === triggeringValues[index];
                });
            });
            isDuplicate = !!duplicateRecord;
            errorMessage = isDuplicate
                ? `Duplicate of item ID: ${duplicateRecord.id} — "${duplicateRecord.name}"`
                : "";
        }
        // 5. Update the Dynamic Columns
        yield updateItemColumns(token, boardId, itemId, {
            [isDupColId]: { checked: isDuplicate ? "true" : "false" },
            [dupErrColId]: errorMessage,
        });
        return { isDuplicate, duplicateId: duplicateRecord === null || duplicateRecord === void 0 ? void 0 : duplicateRecord.id, duplicateName: duplicateRecord === null || duplicateRecord === void 0 ? void 0 : duplicateRecord.name };
    });
}
// ============================================================================
// 2. DISPATCH & BILLING BOARD DUPLICATE CHECK (Single Column)
// ============================================================================
function checkDispatchAndBillingDuplicacyV2(token, itemId, isDupColId, dupErrColId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        console.log(`[Dispatch Duplicacy V2] Starting check for item ${itemId}`);
        const triggeringRecord = yield getRecordById(token, itemId);
        const boardId = (_a = triggeringRecord.board) === null || _a === void 0 ? void 0 : _a.id;
        if (!boardId)
            throw new Error(`[Dispatch Duplicacy V2] Could not determine boardId for item ${itemId}`);
        const [boardColumns, allRecords] = yield Promise.all([
            getBoardColumns(token, boardId),
            getAllBoardRecords(token, boardId),
        ]);
        const matchColId = getColumnIdByTitle(boardColumns, "Invoice No.");
        const matchVal = getItemColValue(triggeringRecord, matchColId);
        let isDuplicate = false;
        let errorMessage = "";
        let duplicateRecord;
        if (!matchVal) {
            errorMessage = "Matching value is blank.";
        }
        else {
            duplicateRecord = allRecords.find(record => String(record.id) !== String(itemId) && getItemColValue(record, matchColId) === matchVal);
            isDuplicate = !!duplicateRecord;
            errorMessage = isDuplicate
                ? `Duplicate of item ID: ${duplicateRecord.id} — "${duplicateRecord.name}"`
                : "";
        }
        yield updateItemColumns(token, boardId, itemId, {
            [isDupColId]: { checked: isDuplicate ? "true" : "false" },
            [dupErrColId]: errorMessage,
        });
        return { isDuplicate, duplicateId: duplicateRecord === null || duplicateRecord === void 0 ? void 0 : duplicateRecord.id, duplicateName: duplicateRecord === null || duplicateRecord === void 0 ? void 0 : duplicateRecord.name };
    });
}
/*
// ============================================================================
// 3. V1 BACKWARDS COMPATIBILITY
// (For any old workflows that don't pass dynamic columns)
// ============================================================================
export async function checkProductDuplicacy(token: string, itemId: string | number): Promise<DuplicateCheckResult> {
    const triggeringRecord = await getRecordById(token, itemId);
    const boardColumns = await getBoardColumns(token, triggeringRecord.board!.id);
    const isDupColId = getColumnIdByTitle(boardColumns, "Is Duplicate");
    const dupErrColId = getColumnIdByTitle(boardColumns, "Duplicate Error");
    return await checkProductDuplicacyV2(token, itemId, isDupColId, dupErrColId);
}

export async function checkDispatchAndBillingDuplicacy(token: string, itemId: string | number): Promise<DuplicateCheckResult> {
    const triggeringRecord = await getRecordById(token, itemId);
    const boardColumns = await getBoardColumns(token, triggeringRecord.board!.id);
    const isDupColId = getColumnIdByTitle(boardColumns, "Is Duplicate");
    const dupErrColId = getColumnIdByTitle(boardColumns, "Duplicate Error");
    return await checkDispatchAndBillingDuplicacyV2(token, itemId, isDupColId, dupErrColId);
}
*/ 
