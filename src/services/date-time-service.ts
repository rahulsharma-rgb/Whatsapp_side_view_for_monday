import { ApiClient } from '@mondaydotcomorg/api';

function getClient(token: string): ApiClient {
    return new ApiClient({ token });
}

export async function handleSetDateTimeFieldAsNow(
    token: string, 
    boardId: string | number, 
    itemId: string | number, 
    dateTimeColId: string
) {
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

    await client.request(mutation, {
        boardId: String(boardId),
        itemId: String(itemId),
        columnValues: JSON.stringify({
            [dateTimeColId]: {
                date: now.split('T')[0],              // Yields: "YYYY-MM-DD"
                time: now.split('T')[1].split('.')[0] // Yields: "HH:mm:ss" (strips off the .sssZ)
            }
        })
    });

}

