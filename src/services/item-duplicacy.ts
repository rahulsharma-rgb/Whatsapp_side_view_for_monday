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
    board:         Board;           
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

// ─── Private helpers ─────────────────────────────────────────
function getClient(token: string): ApiClient {
    return new ApiClient({ token });
}

async function getBoardColumns(token: string, boardId: string | number): Promise<BoardColumn[]> {
    const client = getClient(token);
    const query = `
        query($boardId: [ID!]) {
            boards(ids: $boardId) {
                columns { id title type }
            }
        }
    `;
    const response: any = await client.request(query, { boardId: [String(boardId)] });
    const columns: BoardColumn[] = response?.boards?.[0]?.columns || [];
    if (columns.length === 0) throw new Error(`No columns found for board ${boardId}`);
    return columns;
}

export async function getRecordById(token: string, itemId: string | number): Promise<BoardItem> {
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
    const response: any = await client.request(query, { itemId: [String(itemId)] });
    const item: BoardItem = response?.items?.[0];
    if (!item) throw new Error(`Item ${itemId} not found`);
    return item;
}

async function getAllBoardRecords(token: string, boardId: string | number): Promise<BoardItem[]> {
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
    const response: any = await client.request(query, { boardId: [String(boardId)] });
    return response?.boards?.[0]?.items_page?.items || [];
}

function getColumnIdByTitle(columns: BoardColumn[], title: string): string {
    const col = columns.find(c => c.title?.trim().toLowerCase() === title.trim().toLowerCase());
    if (!col) throw new Error(`Column "${title}" not found.`);
    return col.id;
}

function getItemColValue(item: BoardItem, columnId: string): string {
    const col = item.column_values?.find((cv) => cv.id === columnId);
    if (!col) return "";
    if (col.type === "formula") return col.display_value?.trim().toLowerCase() ?? "";
    return col.text?.trim().toLowerCase() ?? "";
}

async function updateItemColumns(
    token: string, boardId: string | number, itemId: string | number, columnValues: Record<string, any>
): Promise<void> {
    const client = getClient(token);
    const mutation = `
        mutation($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
            change_multiple_column_values(
                board_id: $boardId, item_id: $itemId, column_values: $columnValues, create_labels_if_missing: false
            ) { id name }
        }
    `;
    await client.request(mutation, {
        boardId: String(boardId), itemId: String(itemId), columnValues: JSON.stringify(columnValues),
    });
    //console.log(`✅ ItemDuplicacy: Updated item ${itemId} on board ${boardId}`);
}


// ============================================================================
// 1. PRODUCT / COUNT BOARD DUPLICATE CHECK (Multiple Columns)
// ============================================================================
export async function checkProductDuplicacyV2(
    token: string, itemId: string | number, isDupColId: string, dupErrColId: string
): Promise<DuplicateCheckResult> {
    console.log(`[Product Duplicacy V2] Starting check for item ${itemId}`);
    
    const triggeringRecord = await getRecordById(token, itemId);
    const boardId = triggeringRecord.board?.id;
    if (!boardId) throw new Error(`[Product Duplicacy V2] Could not determine boardId for item ${itemId}`);

    const [boardColumns, allRecords] = await Promise.all([
        getBoardColumns(token, boardId),
        getAllBoardRecords(token, boardId),
    ]);
    console.log(`[Products board V2] Starting check for item ${itemId}`);
    
    // 1. Define all columns that must match exactly
    const multiMatchColTitles = [
        "Thread Count", "Machine", "Type", "Fabric 1", "Fabric 1 (Percentage)", 
        "Fabric 2", "Fabric 2 (Percentage)", "Yarn", "Process", "Certification"
    ];

    // 2. Safely map titles to their actual column IDs on the board
    const matchColIds = multiMatchColTitles.reduce((acc, title) => {
        const col = boardColumns.find(c => c.title?.trim().toLowerCase() === title.trim().toLowerCase());
        if (col) acc.push(col.id);
        return acc;
    }, [] as string[]);

    // 3. Extract the exact string values from the triggering record
    const triggeringValues = matchColIds.map(colId => getItemColValue(triggeringRecord, colId));

    let isDuplicate = false;
    let errorMessage = "";
    let duplicateRecord;

    // Optional Check: Ensure at least ONE of these columns actually has data before calling it a blank duplicate
    const hasAnyValue = triggeringValues.some(val => val !== "");

    if (!hasAnyValue) {
        errorMessage = "All matching columns are blank.";
    } else {
        // 4. Search existing records for a complete match across all defined columns
        duplicateRecord = allRecords.find((record) => {
            if (String(record.id) === String(itemId)) return false; // skip self
            
            return matchColIds.every((colId, index) => {
                return getItemColValue(record, colId) === triggeringValues[index];
            });
        });

        isDuplicate  = !!duplicateRecord;
        errorMessage = isDuplicate 
            ? `Duplicate of item ID: ${duplicateRecord!.id} — "${duplicateRecord!.name}"` 
            : "";
    }

    // 5. Update the Dynamic Columns
    console.log("Product duplicacy checks, isDuplicate:: ", isDuplicate, ", error to be loggged: ", errorMessage);
    await updateItemColumns(token, boardId, itemId, {
        [isDupColId]:  { checked: isDuplicate ? "true" : "false" },
        [dupErrColId]: errorMessage,
    });

    return { isDuplicate, duplicateId: duplicateRecord?.id, duplicateName: duplicateRecord?.name };
}


// ============================================================================
// 2. DISPATCH & BILLING BOARD DUPLICATE CHECK (Single Column)
// ============================================================================
export async function checkDispatchAndBillingDuplicacyV2(
    token: string, itemId: string | number, isDupColId: string, dupErrColId: string
): Promise<DuplicateCheckResult> {
    console.log(`[Dispatch Duplicacy V2] Starting check for item ${itemId}`);
    
    const triggeringRecord = await getRecordById(token, itemId);
    const boardId = triggeringRecord.board?.id;
    if (!boardId) throw new Error(`[Dispatch Duplicacy V2] Could not determine boardId for item ${itemId}`);

    const [boardColumns, allRecords] = await Promise.all([
        getBoardColumns(token, boardId),
        getAllBoardRecords(token, boardId),
    ]);

    const matchColId = getColumnIdByTitle(boardColumns, "Invoice No.");
    const matchVal   = getItemColValue(triggeringRecord, matchColId);
    
    let isDuplicate = false;
    let errorMessage = "";
    let duplicateRecord;

    if (!matchVal) {
        errorMessage = "Matching value is blank.";
    } else {
        duplicateRecord = allRecords.find(record => 
            String(record.id) !== String(itemId) && getItemColValue(record, matchColId) === matchVal
        );

        isDuplicate  = !!duplicateRecord;
        errorMessage = isDuplicate 
            ? `Duplicate of item ID: ${duplicateRecord!.id} — "${duplicateRecord!.name}"` 
            : "";
    }
    console.log("Dispatch and billing duplicacy checks, isDuplicate:: ", isDuplicate, ", error to be loggged: ", errorMessage);
    

    await updateItemColumns(token, boardId, itemId, {
        [isDupColId]:  { checked: isDuplicate ? "true" : "false" },
        [dupErrColId]: errorMessage,
    });

    return { isDuplicate, duplicateId: duplicateRecord?.id, duplicateName: duplicateRecord?.name };
}

