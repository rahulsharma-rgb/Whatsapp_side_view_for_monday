// File: src/controllers/linked-item-handler.ts

import { Request, Response } from 'express';
import { handleFetchAndPopulateLinkedColumn } from '../services/linked-item-service';

export class LinkedItemHandler {
    static async actionFetchAndPopulate(req: Request, res: Response) {
        const shortLivedToken = req.session?.shortLivedToken;
        const { payload } = req.body;

        if (!shortLivedToken) {
            return res.status(401).send({ message: 'Unauthorized' });
        }

        const itemId = payload.inputFields?.itemId ?? payload.context?.itemId;
        const boardId = payload.inputFields?.boardId ?? payload.context?.boardId;
        
        // Helper to extract the actual value whether it's wrapped in an object or just a string
        const getFieldValue = (field: any) => field?.value ?? field;
        
        // These map to the exact input field names you will define in the Monday Developer Center
        const relationColId = getFieldValue(payload.inputFields?.relationColumn);
        const sourceColumnId = getFieldValue(payload.inputFields?.sourceColumnId); 
        const targetColId = getFieldValue(payload.inputFields?.targetColumn);

        if (!itemId || !boardId || !relationColId || !sourceColumnId || !targetColId) {
            console.warn('[LinkedItemHandler] Missing fields in payload', payload.inputFields);
            return res.status(200).send({});
        }

        // ⏱️ Respond immediately to avoid Monday's 3-second timeout
        res.status(200).send({});

        try {
            await handleFetchAndPopulateLinkedColumn(
                shortLivedToken,
                boardId,
                itemId,
                relationColId,
                sourceColumnId,
                targetColId
            );
            console.log('[LinkedItemHandler] Success: Populated target column');
        } catch (error: any) {
            console.error('[LinkedItemHandler] Execution Failed:', error.message);
        }
    }
}