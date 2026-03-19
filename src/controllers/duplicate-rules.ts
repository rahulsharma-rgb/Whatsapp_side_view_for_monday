import { Request, Response } from 'express';
import { checkProductDuplicacy, checkDispatchAndBillingDuplicacy } from '../services/item-duplicacy';
import { getRecordById } from "../services/item-duplicacy";
// Board IDs used to decide WHICH duplicate rule to apply
const PRODUCT_BOARD_ID              = "5026452240";//process.env.PRODUCT_BOARD_ID;
const DISPATCH_AND_BILLING_BOARD_ID = "5026792171"; //process.env.DISPATCH_AND_BILLING_BOARD_ID;

export class DuplicateRules {

    static async actionCheckDuplicate2(req: Request, res: Response) {
        console.log('duplicaterules.ts action check duplicates 102 ');
        const shortLivedToken = req.session?.shortLivedToken;
        const { payload }     = req.body;
        console.log('Token = ', shortLivedToken, " , body ", payload);
        return res.status(200).send({});

    }

    static async actionCheckDuplicate(req: Request, res: Response) {
        console.log('duplicaterules.ts action check duplicates 100 ');
        const shortLivedToken = req.session?.shortLivedToken;
        const { payload }     = req.body;
        

        if (!shortLivedToken) {
            return res.status(401).send({ message: 'Unauthorized' });
        }

        // itemId is the only thing we need from the payload now
        // boardId is derived inside item-duplicacy.ts from the item record itself
        const itemId  = payload.inputFields?.itemId  ?? payload.context?.itemId;
        const triggeringRcord = await getRecordById(shortLivedToken, itemId);
        // boardId still read from payload — only used here in the controller
        // to decide WHICH rule to apply (product vs dispatch)
        // If missing, item-duplicacy.ts will still work since it derives its own boardId
        const boardId = triggeringRcord?.board?.id ?? ""; //payload.inputFields?.boardId ?? payload.context?.boardId ?? null;
        console.log('Board id ', boardId, ', item id = ', itemId);
        // ── Fix 1: only block if itemId is missing ────────────────
        // boardId is optional now since we derive it from the item
        if (!itemId) {
            console.error('[Duplicate] Missing itemId in payload:', payload);
            return res.status(200).send({});
        }

        // ── Fix 2: Respond immediately BEFORE the async work ─────
        res.status(200).send({});

        // ── Fix 3: Correct argument order ────────────────────────
        // item-duplicacy.ts exports: checkProductDuplicacy(token, itemId)
        // Previous code had them reversed: checkProductDuplicacy(itemId, token)
        try {
            if (boardId && String(boardId) === String(PRODUCT_BOARD_ID)) {
                // boardId was provided and matches product board
                console.log(`[Duplicate] Running product check for item ${itemId}`);
                await checkProductDuplicacy(shortLivedToken, itemId);

            } else if (boardId && String(boardId) === String(DISPATCH_AND_BILLING_BOARD_ID)) {
                // boardId was provided and matches dispatch/billing board
                console.log(`[Duplicate] Running dispatch/billing check for item ${itemId}`);
                await checkDispatchAndBillingDuplicacy(shortLivedToken, itemId);

            } else {
                // ── Fix 4: boardId missing or unrecognised ────────
                // item-duplicacy.ts will derive the real boardId from the item
                // so we can still attempt the check — it won't blindly run both,
                // it will just use whatever board the item actually belongs to.
                // Log a warning but don't skip.
                console.warn(`[Duplicate] boardId "${boardId}" not matched to a configured board — attempting product check as default`);
                await checkProductDuplicacy(shortLivedToken, itemId);
            }

        } catch (err: any) {
            console.error('[Duplicate] Error:', err.message);
        }
    }
}