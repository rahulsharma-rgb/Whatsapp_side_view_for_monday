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
// Board IDs used to decide WHICH duplicate rule to apply
const PRODUCT_BOARD_ID = "5026452240"; //process.env.PRODUCT_BOARD_ID;
const DISPATCH_AND_BILLING_BOARD_ID = "5026792171"; //process.env.DISPATCH_AND_BILLING_BOARD_ID;
class DuplicateRules {
    static actionCheckDuplicateWithLogger(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
            console.log('duplicaterules.ts action check duplicates V2 ');
            const shortLivedToken = (_a = req.session) === null || _a === void 0 ? void 0 : _a.shortLivedToken;
            const { payload } = req.body;
            if (!shortLivedToken) {
                return res.status(401).send({ message: 'Unauthorized' });
            }
            const itemId = (_c = (_b = payload.inputFields) === null || _b === void 0 ? void 0 : _b.itemId) !== null && _c !== void 0 ? _c : (_d = payload.context) === null || _d === void 0 ? void 0 : _d.itemId;
            const boardId = (_f = (_e = payload.inputFields) === null || _e === void 0 ? void 0 : _e.boardId) !== null && _f !== void 0 ? _f : (_g = payload.context) === null || _g === void 0 ? void 0 : _g.boardId;
            // Extract the user-selected columns from the payload
            // Note: Monday sometimes passes column IDs as { value: "status" } or just "status"
            const getColId = (col) => { var _a; return (_a = col === null || col === void 0 ? void 0 : col.value) !== null && _a !== void 0 ? _a : col; };
            const isDupColId = getColId((_h = payload.inputFields) === null || _h === void 0 ? void 0 : _h.columnIdIsDuplicate);
            const dupErrColId = getColId((_j = payload.inputFields) === null || _j === void 0 ? void 0 : _j.columnIdDuplicateMessage);
            if (!itemId || !isDupColId || !dupErrColId) {
                console.error('[Duplicate V2] Missing required payload data:', payload);
                return res.status(200).send({});
            }
            // RESPOND IMMEDIATELY TO PREVENT TIMEOUTS
            res.status(200).send({});
            try {
                if (boardId && String(boardId) === String(PRODUCT_BOARD_ID)) {
                    console.log(`[Duplicate V2] Running product check for item ${itemId}`);
                    yield (0, item_duplicacy_1.checkProductDuplicacyV2)(shortLivedToken, itemId, isDupColId, dupErrColId);
                }
                else if (boardId && String(boardId) === String(DISPATCH_AND_BILLING_BOARD_ID)) {
                    console.log(`[Duplicate V2] Running dispatch/billing check for item ${itemId}`);
                    yield (0, item_duplicacy_1.checkDispatchAndBillingDuplicacyV2)(shortLivedToken, itemId, isDupColId, dupErrColId);
                }
                else {
                    console.warn(`[Duplicate V2] boardId not recognized — attempting product check as default`);
                    //await checkProductDuplicacyV2(shortLivedToken, itemId, isDupColId, dupErrColId);
                }
            }
            catch (err) {
                console.error('[Duplicate V2] Error:', err.message);
            }
        });
    }
}
exports.DuplicateRules = DuplicateRules;
