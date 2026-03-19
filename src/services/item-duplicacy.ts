// File: src/services/item-duplicacy.ts

import { ApiClient } from '@mondaydotcomorg/api';

// ─── Types ────────────────────────────────────────────────────
interface Board {
    id:   string;
    name: string;
}

interface ColumnValue {
    id:             string;
    title?:         string;
    text?:          string;
    value?:         string;
    display_value?: string;
    type?:          string;
}

interface BoardItem {
    id:            string;
    name:          string;
    column_values: ColumnValue[];
    board:         Board;           // ✅ Fixed — references the Board interface
}

interface BoardColumn {
    id:    string;
    title: string;
    type:  string;
}

interface DuplicateCheckResult {
    isDuplicate:   boolean;
    duplicateId?:  string;
    duplicateName?: string;
}

// ─── Private helper: build ApiClient ─────────────────────────
function getClient(token: string): ApiClient {
    return new ApiClient({ token });
}

// ─── 1. Fetch board columns ───────────────────────────────────
async function getBoardColumns(token: string, boardId: string | number): Promise<BoardColumn[]> {
    try {
        const client = getClient(token);
        const query = `
            query($boardId: [ID!]) {
                boards(ids: $boardId) {
                    columns { id title type }
                }
            }
        `;
        const response: any = await client.request(query, {
            boardId: [String(boardId)],
        });

        const columns: BoardColumn[] = response?.boards?.[0]?.columns || [];
        if (columns.length === 0) {
            throw new Error(`No columns found for board ${boardId}`);
        }
        return columns;

    } catch (err: any) {
        console.error(`❌ ItemDuplicacy Error (getBoardColumns) board ${boardId}:`, err.message);
        throw err;
    }
}

// ─── 2. Fetch single item by ID ───────────────────────────────
// board { id } is included so we can derive boardId without
// needing it passed in from the automation payload
export async function getRecordById(token: string, itemId: string | number): Promise<BoardItem> {
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
                        column {
                            title
                            type
                        }
                        text
                        value
                        ... on FormulaValue        { display_value }
                        ... on MirrorValue         { display_value }
                        ... on BoardRelationValue  { linked_item_ids display_value }
                    
                    }
                }
            }
        `;
        const response: any = await client.request(query, {
            itemId: [String(itemId)],
        });

        const item: BoardItem = response?.items?.[0];
        if (!item) throw new Error(`Item ${itemId} not found`);

        return item;

    } catch (err: any) {
        console.error(`❌ ItemDuplicacy Error (getRecordById) item ${itemId}:`, err.message);
        throw err;
    }
}

// ─── 3. Fetch all records from a board ────────────────────────
async function getAllBoardRecords(token: string, boardId: string | number): Promise<BoardItem[]> {
    try {
        const client = getClient(token);
        const query = `
            query($boardId: [ID!]) {
                boards(ids: $boardId) {
                    items_page(limit: 500) {
                        items {
                            id
                            name
                            board { id name }
                            column_values {
                                id
                                column {
                                    title
                                    type
                                }
                                text
                                value
                                ... on FormulaValue        { display_value }
                                ... on MirrorValue         { display_value }
                                ... on BoardRelationValue  { linked_item_ids display_value }
                            
                            }
                        }
                    }
                }
            }
        `;
        const response: any = await client.request(query, {
            boardId: [String(boardId)],
        });

        return response?.boards?.[0]?.items_page?.items || [];

    } catch (err: any) {
        console.error(`❌ ItemDuplicacy Error (getAllBoardRecords) board ${boardId}:`, err.message);
        throw err;
    }
}

// ─── 4. Get column ID by title ────────────────────────────────
function getColumnIdByTitle(columns: BoardColumn[], title: string): string {
    const col = columns.find(
        (c) => c.title?.trim().toLowerCase() === title.trim().toLowerCase()
    );
    if (!col) {
        const available = columns.map((c) => `"${c.title}"`).join(", ");
        throw new Error(`Column "${title}" not found. Available: ${available}`);
    }
    return col.id;
}

// ─── 5. Get item column value ─────────────────────────────────
function getItemColValue(item: BoardItem, columnId: string): string {
    const col = item.column_values?.find((cv) => cv.id === columnId);
    if (!col) return "";

    if (col.type === "formula") {
        return col.display_value?.trim().toLowerCase() ?? "";
    }
    return col.text?.trim().toLowerCase() ?? "";
}

// ─── 6. Update item columns ───────────────────────────────────
async function updateItemColumns(
    token:        string,
    boardId:      string | number,
    itemId:       string | number,
    columnValues: Record<string, any>
): Promise<void> {
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
        await client.request(mutation, {
            boardId:      String(boardId),
            itemId:       String(itemId),
            columnValues: JSON.stringify(columnValues),
        });

        console.log(`✅ ItemDuplicacy: Updated item ${itemId} on board ${boardId}`);

    } catch (err: any) {
        console.error(`❌ ItemDuplicacy Error (updateItemColumns) item ${itemId}:`, err.message);
        throw err;
    }
}

// ─── 7. Shared duplicate check core ───────────────────────────
// Extracted so both product and dispatch functions share the same logic
// boardId comes FROM the item record itself — no need for it in payload
async function runDuplicateCheck(
    token:          string,
    itemId:         string | number,
    matchColTitle:  string,          // column to check for duplicates
    isDupColTitle:  string,          // "Is Duplicate" column title
    dupErrColTitle: string,          // "Duplicate Error" column title
    logPrefix:      string           // "[Product Duplicacy]" etc.
): Promise<DuplicateCheckResult> {

    // Step 1 — fetch the triggering record first to get its boardId
    const triggeringRecord = await getRecordById(token, itemId);

    // Step 2 — derive boardId from the record itself ✅
    // This is the fix for "automation doesn't send boardId"
    const boardId = triggeringRecord.board?.id;
    if (!boardId) {
        throw new Error(`${logPrefix} Could not determine boardId for item ${itemId}`);
    }
    console.log(`${logPrefix} Item ${itemId} | Board: ${boardId}`);

    // Step 3 — fetch columns and all records in parallel now that we have boardId
    const [boardColumns, allRecords] = await Promise.all([
        getBoardColumns(token, boardId),
        getAllBoardRecords(token, boardId),
    ]);

    // Step 4 — resolve column IDs by title
    const matchColId   = getColumnIdByTitle(boardColumns, matchColTitle);
    const isDupColId   = getColumnIdByTitle(boardColumns, isDupColTitle);
    const dupErrColId  = getColumnIdByTitle(boardColumns, dupErrColTitle);

    // Step 5 — get match value from triggering record
    const matchVal = getItemColValue(triggeringRecord, matchColId);
    if (!matchVal) {
        console.log(`${logPrefix} Item ${itemId} has no value in "${matchColTitle}" — skipping`);
        return { isDuplicate: false };
    }
    console.log(`${logPrefix} Item ${itemId} | ${matchColTitle}: "${matchVal}"`);

    // Step 6 — find a duplicate
    const duplicateRecord = allRecords.find(
        (record) =>
            String(record.id) !== String(itemId) &&
            getItemColValue(record, matchColId) === matchVal
    );

    const isDuplicate  = !!duplicateRecord;
    const errorMessage = isDuplicate
        ? `Duplicate of item ID: ${duplicateRecord!.id} — "${duplicateRecord!.name}"`
        : "";

    console.log(isDuplicate
        ? `${logPrefix} ✅ Duplicate found: ${itemId} matches ${duplicateRecord!.id}`
        : `${logPrefix} ✅ No duplicate found for item ${itemId}`
    );

    // Step 7 — update the triggering record
    await updateItemColumns(token, boardId, itemId, {
        [isDupColId]:  { checked: isDuplicate ? "true" : "false" },
        [dupErrColId]: errorMessage,
    });

    return {
        isDuplicate,
        duplicateId:   duplicateRecord?.id,
        duplicateName: duplicateRecord?.name,
    };
}

// ─── 8. Product duplicate check ──────────────────────────────
// Rule: duplicate if another record has the same "Summary (Fx)" value
export async function checkProductDuplicacy(
    token:  string,
    itemId: string | number
): Promise<DuplicateCheckResult> {
    try {
        return await runDuplicateCheck(
            token,
            itemId,
            "Summary (Fx)",   // match column
            "Is Duplicate",   // flag column
            "Duplicate Error", // message column
            "[Product Duplicacy]"
        );
    } catch (err: any) {
        console.error(`[Product Duplicacy] ❌ Error for item ${itemId}:`, err.message);
        throw err;
    }
}

// ─── 9. Dispatch & Billing duplicate check ────────────────────
// Rule: duplicate if another record has the same "Invoice No." value
export async function checkDispatchAndBillingDuplicacy(
    token:  string,
    itemId: string | number
): Promise<DuplicateCheckResult> {
    try {
        return await runDuplicateCheck(
            token,
            itemId,
            "Invoice No.",    // match column
            "Is Duplicate",   // flag column
            "Duplicate Error", // message column
            "[Dispatch Duplicacy]"
        );
    } catch (err: any) {
        console.error(`[Dispatch Duplicacy] ❌ Error for item ${itemId}:`, err.message);
        throw err;
    }
}