"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DuplicateRules = void 0;
const item_duplicacy_1 = require("../services/item-duplicacy");
const item_duplicacy_2 = require("../services/item-duplicacy");
// Board IDs used to decide WHICH duplicate rule to apply
const PRODUCT_BOARD_ID = "5026452240"; //process.env.PRODUCT_BOARD_ID;
const DISPATCH_AND_BILLING_BOARD_ID = "5026792171"; //process.env.DISPATCH_AND_BILLING_BOARD_ID;
class DuplicateRules {
    static actionCheckDuplicate2(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            console.log('duplicaterules.ts action check duplicates 102 ');
            const shortLivedToken = (_a = req.session) === null || _a === void 0 ? void 0 : _a.shortLivedToken;
            const { payload } = req.body;
            console.log('Token = ', shortLivedToken, " , body ", payload);
            return res.status(200).send({});
        });
    }
    static actionCheckDuplicate(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f;
            console.log('duplicaterules.ts action check duplicates 100 ');
            const shortLivedToken = (_a = req.session) === null || _a === void 0 ? void 0 : _a.shortLivedToken;
            const { payload } = req.body;
            if (!shortLivedToken) {
                return res.status(401).send({ message: 'Unauthorized' });
            }
            // itemId is the only thing we need from the payload now
            // boardId is derived inside item-duplicacy.ts from the item record itself
            const itemId = (_c = (_b = payload.inputFields) === null || _b === void 0 ? void 0 : _b.itemId) !== null && _c !== void 0 ? _c : (_d = payload.context) === null || _d === void 0 ? void 0 : _d.itemId;
            const triggeringRcord = yield (0, item_duplicacy_2.getRecordById)(shortLivedToken, itemId);
            // boardId still read from payload — only used here in the controller
            // to decide WHICH rule to apply (product vs dispatch)
            // If missing, item-duplicacy.ts will still work since it derives its own boardId
            const boardId = (_f = (_e = triggeringRcord === null || triggeringRcord === void 0 ? void 0 : triggeringRcord.board) === null || _e === void 0 ? void 0 : _e.id) !== null && _f !== void 0 ? _f : ""; //payload.inputFields?.boardId ?? payload.context?.boardId ?? null;
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
                    yield (0, item_duplicacy_1.checkProductDuplicacy)(shortLivedToken, itemId);
                }
                else if (boardId && String(boardId) === String(DISPATCH_AND_BILLING_BOARD_ID)) {
                    // boardId was provided and matches dispatch/billing board
                    console.log(`[Duplicate] Running dispatch/billing check for item ${itemId}`);
                    yield (0, item_duplicacy_1.checkDispatchAndBillingDuplicacy)(shortLivedToken, itemId);
                }
                else {
                    // ── Fix 4: boardId missing or unrecognised ────────
                    // item-duplicacy.ts will derive the real boardId from the item
                    // so we can still attempt the check — it won't blindly run both,
                    // it will just use whatever board the item actually belongs to.
                    // Log a warning but don't skip.
                    console.warn(`[Duplicate] boardId "${boardId}" not matched to a configured board — attempting product check as default`);
                    yield (0, item_duplicacy_1.checkProductDuplicacy)(shortLivedToken, itemId);
                }
            }
            catch (err) {
                console.error('[Duplicate] Error:', err.message);
            }
        });
    }
}
exports.DuplicateRules = DuplicateRules;
