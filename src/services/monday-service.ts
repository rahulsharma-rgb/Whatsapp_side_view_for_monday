// File: src/services/monday-service.ts

import { ApiClient } from '@mondaydotcomorg/api';
import { GetColumnValueQuery, GetColumnValueQueryVariables } from "../generated/graphql";
import { getColumnValueQuery } from "../queries.graphql";

class MondayService {

    static async getMe(shortLiveToken: string) {
        try {
            const mondayClient = new ApiClient({ token: shortLiveToken });
            return await mondayClient.operations.getMeOp();
        } catch (err) { console.error("❌ Monday Service Error (getMe):", err); }
    }

    static async getColumnValue(token: string, itemId: string | number, columnId: string) {
        try {
            const mondayClient = new ApiClient({ token: token });
            const params: GetColumnValueQueryVariables = { itemId: [itemId.toString()], columnId: [columnId] };
            const response: GetColumnValueQuery = await mondayClient.request<GetColumnValueQuery>(getColumnValueQuery, params);
            return response?.items?.[0]?.column_values?.[0]?.value;
        } catch (err) { console.error("❌ Monday Service Error (getColumnValue):", err); }
    }

    static async changeColumnValue(token: string, boardId: string | number, itemId: string | number, columnId: string, value: any) {
        try {
            const mondayClient = new ApiClient({ token: token });
            
            let finalValue = value;
            if (typeof value === 'string' && columnId.includes('long_text')) {
                finalValue = { text: value };
            }

            const stringifiedValue = JSON.stringify(finalValue);

            return await mondayClient.operations.changeColumnValueOp({
                boardId: String(boardId),
                itemId: String(itemId),
                columnId: columnId,
                value: stringifiedValue,
            });
        } catch (err) { 
            console.error("❌ Monday Service Error (changeColumnValue):", err); 
        }
    }

    static async getBoardColumns(token: string, boardId: number | string) {
        try {
            const mondayClient = new ApiClient({ token: token });
            const query = `
              query ($boardId: [ID!]) {
                boards(ids: $boardId) {
                  columns { id title type }
                }
              }
            `;
            const response: any = await mondayClient.request(query, { boardId: [boardId.toString()] });
            return response?.boards?.[0]?.columns;
        } catch (err) {
            console.error("❌ Monday Service Error (getBoardColumns):", err);
            return null;
        }
    }

    /**
     * THE SMART QUERY: Now explicitly fetches Formula display_values 
     * and handles Parent Items seamlessly.
     */
    static async getSmartItemData(token: string, itemId: number | string) {
        try {
            const mondayClient = new ApiClient({ token: token });
            
            const query = `
              query ($itemId: [ID!]) {
                items(ids: $itemId) {
                  board { id } 
                  assets { id public_url name } 
                  column_values {
                    id
                    column { title }
                    text
                    value
                    ... on FormulaValue { display_value }
                    ... on BoardRelationValue { display_value }
                    ... on MirrorValue { display_value }
                  }
                  parent_item {
                    id
                    assets { id public_url name }
                    column_values {
                      id
                      column { title }
                      text
                      value
                      ... on FormulaValue { display_value }
                      ... on BoardRelationValue { display_value }
                      ... on MirrorValue { display_value }
                    }
                  }
                }
              }
            `;
            
            const response: any = await mondayClient.request(query, { itemId: [itemId.toString()] });
            return response?.items?.[0]; 
        } catch (err) {
            console.error("❌ Monday Service Error (getSmartItemData):", err);
            return null;
        }
    }
}

export default MondayService;