import { ApiClient } from '@mondaydotcomorg/api';

class MondayService {

    static async rawMondayQuery(token: string, query: string, variables: any = {}) {
        const response = await fetch("https://api.monday.com/v2", {
            method: 'POST',
            headers: { 'Authorization': token, 'Content-Type': 'application/json', 'API-Version': '2023-10' },
            body: JSON.stringify({ query, variables })
        });
        const data = await response.json();
        if (data.errors) {
            console.error("[BACKEND - MondayService] ❌ RAW MONDAY API ERROR:", JSON.stringify(data.errors, null, 2));
            throw new Error(data.errors[0].message);
        }
        return data;
    }

    static async getBoardColumns(token: string, boardId: number | string) {
        try {
            const query = `query { boards(ids: [${boardId}]) { columns { id title type } } }`;
            const result = await this.rawMondayQuery(token, query);
            return result.data?.boards?.[0]?.columns;
        } catch (err) { return null; }
    }

    static async getChatLogsByPhone(token: string, archiveBoardId: string, phone: string) {
        console.log(`[BACKEND - MondayService] 🔍 Fetching Chat Logs for phone: ${phone}`);
        try {
            const columns = await this.getBoardColumns(token, archiveBoardId);
            if (!columns) return [];

            const phoneColId = columns.find((c: any) => c.title.toLowerCase().includes('phone') || c.title.toLowerCase().includes('whatsapp'))?.id;
            const textColId = columns.find((c: any) => c.title.toLowerCase().includes('message') || c.title.toLowerCase().includes('text'))?.id;

            if (!phoneColId || !textColId) return [];

            const query = `
                query {
                    items_page_by_column_values(board_id: ${archiveBoardId}, columns: [{column_id: "${phoneColId}", column_values: ["${phone}"]}]) {
                        items { name column_values { id text } }
                    }
                }
            `;
            
            const result = await this.rawMondayQuery(token, query);
            const items = result.data?.items_page_by_column_values?.items || [];
            
            console.log(`[BACKEND - MondayService] ✅ Found ${items.length} messages in database.`);
            return items.map((item: any) => {
                const text = item.column_values.find((c: any) => c.id === textColId)?.text;
                const isAgent = item.name && item.name.toLowerCase().includes('to');
                return { text, sender: isAgent ? 'agent' : 'customer' }; 
            });
        } catch (err) {
            console.error("[BACKEND - MondayService] ❌ getChatLogsByPhone FAILED:", err);
            return [];
        }
    }

    static async createChatLog(token: string, boardId: string, data: { phone: string; text: string; sender: string; wamid?: string }) {
        console.log(`[BACKEND - MondayService] 🏗️ Preparing Single-Shot Chat Log for ${data.phone}...`);
        try {
            const columns = await this.getBoardColumns(token, boardId);
            if (!columns) throw new Error("Could not fetch Archive Board columns");

            const phoneCol = columns.find((c: any) => c.title.toLowerCase().includes('phone') || c.title.toLowerCase().includes('whatsapp'));
            const textCol = columns.find((c: any) => c.title.toLowerCase().includes('message') || c.title.toLowerCase().includes('text'));
            const wamidCol = columns.find((c: any) => c.title.toLowerCase().includes('id') || c.title.toLowerCase().includes('wamid'));

            const direction = data.sender === 'agent' ? 'to' : 'from';
            const itemName = `Message ${direction} ${data.phone}`;

            let colVals: any = {};
            if (textCol) colVals[textCol.id] = textCol.type === 'long_text' ? { text: data.text } : data.text;
            if (phoneCol) colVals[phoneCol.id] = phoneCol.type === 'phone' ? { phone: data.phone, countryShortName: data.phone.startsWith('91') ? "IN" : "US" } : data.phone;
            if (wamidCol && data.wamid) colVals[wamidCol.id] = data.wamid;

            const query = `
                mutation($boardId: ID!, $itemName: String!, $colVals: JSON!) {
                    create_item(board_id: $boardId, item_name: $itemName, column_values: $colVals) { id }
                }
            `;

            const result = await this.rawMondayQuery(token, query, { boardId: String(boardId), itemName, colVals: JSON.stringify(colVals) });
            console.log(`[BACKEND - MondayService] ✅ Single-shot injection successful! Item ID: ${result.data?.create_item?.id}`);
            return result.data?.create_item?.id;
        } catch (error: any) {
            console.error("[BACKEND - MondayService] ❌ createChatLog CRASHED!", error);
            throw error;
        }
    }
}

export default MondayService;