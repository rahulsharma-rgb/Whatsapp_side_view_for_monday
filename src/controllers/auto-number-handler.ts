import { Request, Response } from 'express';
import {
    handleCalculateCustomAutoNumber
} from '../services/auto-number-service';


export class AutoNumberHandler {
    static async handleCustomAutoNumberCalculation(req: Request, res: Response) {
        const shortLivedToken = req.session?.shortLivedToken;
        const { payload }     = req.body;

        if (!shortLivedToken) {
            return res.status(401).send({ message: 'Unauthorized' });
        }

        const itemId  = payload.inputFields?.itemId  ?? payload.context?.itemId;
        const boardId = payload.inputFields?.boardId ?? payload.context?.boardId;
        const getColId = (col: any) => col?.value ?? col;
        
        const createdDateColId  = getColId(payload.inputFields?.columnIdCreatedDate);
        const customAutoNumberColId = getColId(payload.inputFields?.columnIdCustomAutoNumber);

        if (!itemId || !createdDateColId || !customAutoNumberColId) {
            return res.status(200).send({});
        }

        // RESPOND IMMEDIATELY TO PREVENT TIMEOUTS
        res.status(200).send({});
        try {
        
           await handleCalculateCustomAutoNumber(
                shortLivedToken, 
                boardId, 
                itemId, 
                createdDateColId, 
                customAutoNumberColId
            );
            console.log('[Auto-Number] Execution Successful', {
                success: true,
                boardId: boardId,
                itemId: itemId,
                action: "Calculated next auto-number"
            });
        } catch (err: any) {
            console.error('[Auto-Number] Execution Failed', {
                success: false,
                boardId: boardId,
                itemId: itemId,
                errorMessage: err.message,
                stackTrace: err.stack
            });
        }
    }   
}
