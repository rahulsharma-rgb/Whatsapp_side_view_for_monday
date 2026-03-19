import { Request, Response } from 'express';
import {
    checkProductDuplicacyV2, checkDispatchAndBillingDuplicacyV2
 } from '../services/item-duplicacy';
 import { PRODUCT_BOARD_ID as productBoardId, 
    DISPATCH_AND_BILLING_BOARD_ID as dispatchBoardId} from "../constants/constants";
// Board IDs used to decide WHICH duplicate rule to apply
const PRODUCT_BOARD_ID              = productBoardId;//process.env.PRODUCT_BOARD_ID;
const DISPATCH_AND_BILLING_BOARD_ID = dispatchBoardId; //process.env.DISPATCH_AND_BILLING_BOARD_ID;

export class DuplicateRules {

    static async actionCheckDuplicateWithLogger(req: Request, res: Response) {
        console.log('duplicaterules.ts actionCheckDuplicateWithLogger V2 ');
        const shortLivedToken = req.session?.shortLivedToken;
        const { payload }     = req.body;

        if (!shortLivedToken) {
            return res.status(401).send({ message: 'Unauthorized' });
        }

        const itemId  = payload.inputFields?.itemId  ?? payload.context?.itemId;
        const boardId = payload.inputFields?.boardId ?? payload.context?.boardId;

        console.log('duplicaterules.ts item id ', itemId, ", boardId = ", boardId);
        

        // Extract the user-selected columns from the payload
        // Note: Monday sometimes passes column IDs as { value: "status" } or just "status"
        const getColId = (col: any) => col?.value ?? col;
        const isDupColId  = getColId(payload.inputFields?.columnIdIsDuplicate);
        const dupErrColId = getColId(payload.inputFields?.columnIdDuplicateMessage);

        if (!itemId || !isDupColId || !dupErrColId) {
            console.error('[Duplicate V2] Missing required payload data:', payload);
            return res.status(200).send({});
        }

        // RESPOND IMMEDIATELY TO PREVENT TIMEOUTS
        res.status(200).send({});

        try {
            if (boardId && String(boardId) === String(PRODUCT_BOARD_ID)) {
                console.log(`[Duplicate V2] Running product check for item ${itemId}`);
                await checkProductDuplicacyV2(shortLivedToken, itemId, isDupColId, dupErrColId);

            } else if (boardId && String(boardId) === String(DISPATCH_AND_BILLING_BOARD_ID)) {
                console.log(`[Duplicate V2] Running dispatch/billing check for item ${itemId}`);
                await checkDispatchAndBillingDuplicacyV2(shortLivedToken, itemId, isDupColId, dupErrColId);

            } else {
                console.warn(`[Duplicate V2] boardId not recognized — attempting product check as default`);
                //await checkProductDuplicacyV2(shortLivedToken, itemId, isDupColId, dupErrColId);
            }

        } catch (err: any) {
            console.error('[Duplicate V2] Error:', err.message);
        }
    }
}