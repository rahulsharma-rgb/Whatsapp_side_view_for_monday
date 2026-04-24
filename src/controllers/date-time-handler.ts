import { Request, Response } from 'express';
import {
    handleSetDateTimeFieldAsNow
} from '../services/date-time-service';


export class DateTimeHandler {
    static async handleSetDateTimeColumnAsNow(req: Request, res: Response) {
        console.log('Datetimehandler.ts  calculating dateitime number for ');
        const shortLivedToken = (req as any).session?.shortLivedToken;
        const { payload }     = req.body;

        if (!shortLivedToken) {
            return res.status(401).send({ message: 'Unauthorized' });
        }

        const itemId  = payload.inputFields?.itemId  ?? payload.context?.itemId;
        const boardId = payload.inputFields?.boardId ?? payload.context?.boardId;
        const getColId = (col: any) => col?.value ?? col;
        const datetimeColId  = getColId(payload.inputFields?.columnIdDatetime);
        console.log("DAtetime ", itemId, ", boardId = ", boardId, ", colid ", datetimeColId);
        if (!itemId || !boardId || !datetimeColId) {
            return res.status(400).send({ message: 'Missing required fields' });
        }

        try {
            await handleSetDateTimeFieldAsNow(
                shortLivedToken,
                boardId,
                itemId,
                datetimeColId
            );
            console.log('[Datetimehandler] Execution Successful', {
                success: true,
                boardId: boardId,
                itemId: itemId,
                action: "Set Datetime column as Now"
            });
            return res.status(200).send({ message: 'Datetime updated successfully' });
        } catch (error: any) {
            console.error('[Datetimehandler] Execution Failed', {
                success: false,
                boardId: boardId,
                itemId: itemId,
                errorMessage: error.message,
                stackTrace: error.stack
            });
            return res.status(500).send({ message: 'Internal server error', error });
        }
    }
}
