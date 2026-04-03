// File: src/services/linked-item-service.ts

import { ApiClient } from '@mondaydotcomorg/api';

function getClient(token: string): ApiClient {
    return new ApiClient({ token });
}

/**
 * Universal formatter: Converts Monday's READ format into Monday's WRITE format
 */
function formatValueForUpdate(sourceType: string, parsedValue: any, rawText: string): any {
    if (!parsedValue && !rawText) return null;

    switch (sourceType) {
        case 'board_relation':
            // READ: {"linkedPulseIds":[{"linkedPulseId":123}]}
            // WRITE: {"item_ids": [123]}
            const extractedIds = parsedValue?.linkedPulseIds?.map((p: any) => p.linkedPulseId) || [];
            return { item_ids: extractedIds };

        case 'people':
        case 'multiple_person': // Sometimes Monday uses this internally
            // READ & WRITE are mostly compatible, but it's safe to reconstruct it
            const personsAndTeams = parsedValue?.personsAndTeams || [];
            return { personsAndTeams };

        case 'status':
            // Best practice for Status is to write using the label string
            if (parsedValue?.label) return { label: parsedValue.label };
            if (rawText) return { label: rawText };
            return null;

        case 'dropdown':
            // WRITE: {"labels": ["Option 1", "Option 2"]}
            const labels = parsedValue?.chosenValues?.map((v: any) => v.name) || [];
            return labels.length > 0 ? { labels } : null;

        case 'date':
            // WRITE: {"date": "YYYY-MM-DD"}
            return parsedValue?.date ? { date: parsedValue.date } : null;

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

export async function handleFetchAndPopulateLinkedColumn(
    token: string,
    boardId: string | number,
    itemId: string | number,
    relationColId: string,
    sourceColumnId: string,
    targetColId: string
) {
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
    const itemRes: any = await client.request(itemQuery, {
        itemId: [String(itemId)],
        colIds: [relationColId]
    });

    const relationCol = itemRes?.items?.[0]?.column_values?.[0];
    let linkedItemId = null;

    if (relationCol?.linked_item_ids && relationCol.linked_item_ids.length > 0) {
        linkedItemId = relationCol.linked_item_ids[0];
    } else if (relationCol?.value) {
        const parsed = JSON.parse(relationCol.value);
        linkedItemId = parsed?.linkedPulseIds?.[0]?.linkedPulseId;
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
    const linkedItemRes: any = await client.request(linkedItemQuery, {
        linkedItemId: [String(linkedItemId)],
        sourceColIds: [sourceColumnId]
    });

    const sourceCol = linkedItemRes?.items?.[0]?.column_values?.[0];

    if (!sourceCol || (!sourceCol.value && !sourceCol.text)) {
        console.log(`[LinkedItemService] Source column ${sourceColumnId} is empty on linked item ${linkedItemId}`);
        return;
    }

    // 3. Use the Universal Formatter
    let parsedSourceValue = null;
    try {
        if (sourceCol.value) parsedSourceValue = JSON.parse(sourceCol.value);
    } catch (e) {
        // Value wasn't valid JSON (sometimes text columns are just raw strings)
    }

    const finalValueToUpdate = formatValueForUpdate(
        sourceCol.type, 
        parsedSourceValue, 
        sourceCol.text
    );

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

    await client.request(mutation, {
        boardId: String(boardId),
        itemId: String(itemId),
        colValues: JSON.stringify({
            [targetColId]: finalValueToUpdate 
        })
    });
}