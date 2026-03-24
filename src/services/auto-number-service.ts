// File: src/services/auto-number-service.ts

import { ApiClient } from '@mondaydotcomorg/api';

function getClient(token: string): ApiClient {
    return new ApiClient({ token });
}

/**
 * Method to set value in Custom Auto Number column
 */
async function updateItemColumns(
    token: string, boardId: string | number, itemId: string | number, columnValues: Record<string, any>
): Promise<void> {
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
    await client.request(mutation, {
        boardId: String(boardId),
        itemId: String(itemId),
        columnValues: JSON.stringify(columnValues),
    });
}

/**
 * Helper to find the latest record based on a date/text column
 */
function findLatestRecord(items: any[], dateColId: string): any | null {
    let latestItem: any = null;
    let latestTimestamp = 0;

    for (const item of items) {
        const dateCol = item.column_values.find((c: any) => c.id === dateColId);
        let itemDate = 0;

        if (dateCol) {
            let parsedValue: any = null;

            if (dateCol.value) {
                try {
                    parsedValue = JSON.parse(dateCol.value);
                } catch (e) {
                    parsedValue = null;
                }
            }

            if (parsedValue?.date) {
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
export function determineNextAutoNumber(previousValue: string): string {
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
    } else {
        return "1"; 
    }
}

export async function handleCalculateCustomAutoNumber(
    token: string, 
    boardId: string | number, 
    itemId: string | number, 
    createdDateColId: string, 
    customAutoNumberColId: string
) {
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
    
    const response: any = await client.request(query, {
        boardId: [String(boardId)],
        colIds: [createdDateColId, customAutoNumberColId]
    });

    const allItems = response?.boards?.[0]?.items_page?.items || [];
    
    // Filter out the newly created (triggering) record
    const otherItems = allItems.filter((item: any) => String(item.id) !== String(itemId));

    let nextValue = "1"; // Default rule: If this is the absolute first record, start at 1.

    if (otherItems.length > 0) {
        
        // 2. Find the absolute latest item based on the timestamp column
        const latestItem = findLatestRecord(otherItems, createdDateColId);
        

        if (latestItem) {
            const autoNumCol = latestItem.column_values.find((c: any) => c.id === customAutoNumberColId);
           
            // Extract the raw string value representing the previous number/prefix
            let previousValue = autoNumCol?.text || "";
            
            if (!previousValue && autoNumCol?.value) {
                try {
                    const parsed = JSON.parse(autoNumCol.value);
                    previousValue = parsed !== null && typeof parsed === 'object' ? (parsed.value || "") : String(parsed);
                } catch (e) {
                    previousValue = autoNumCol.value;
                }
            }
            
            previousValue = previousValue.replace(/['"]+/g, '').trim();
            
            // 3. Delegate to modular helper to calculate next value
            nextValue = determineNextAutoNumber(previousValue);
        }
    }


    // 4. Update the triggering record with the newly generated auto-number
    await updateItemColumns(token, boardId, itemId, {
        [customAutoNumberColId]: nextValue
    });
    
}