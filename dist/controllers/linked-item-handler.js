"use strict";
// File: src/controllers/linked-item-handler.ts
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
exports.LinkedItemHandler = void 0;
const linked_item_service_1 = require("../services/linked-item-service");
class LinkedItemHandler {
    static actionFetchAndPopulate(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
            const shortLivedToken = (_a = req.session) === null || _a === void 0 ? void 0 : _a.shortLivedToken;
            const { payload } = req.body;
            if (!shortLivedToken) {
                return res.status(401).send({ message: 'Unauthorized' });
            }
            const itemId = (_c = (_b = payload.inputFields) === null || _b === void 0 ? void 0 : _b.itemId) !== null && _c !== void 0 ? _c : (_d = payload.context) === null || _d === void 0 ? void 0 : _d.itemId;
            const boardId = (_f = (_e = payload.inputFields) === null || _e === void 0 ? void 0 : _e.boardId) !== null && _f !== void 0 ? _f : (_g = payload.context) === null || _g === void 0 ? void 0 : _g.boardId;
            // Helper to extract the actual value whether it's wrapped in an object or just a string
            const getFieldValue = (field) => { var _a; return (_a = field === null || field === void 0 ? void 0 : field.value) !== null && _a !== void 0 ? _a : field; };
            // These map to the exact input field names you will define in the Monday Developer Center
            const relationColId = getFieldValue((_h = payload.inputFields) === null || _h === void 0 ? void 0 : _h.relationColumn);
            const sourceColumnId = getFieldValue((_j = payload.inputFields) === null || _j === void 0 ? void 0 : _j.sourceColumnId);
            const targetColId = getFieldValue((_k = payload.inputFields) === null || _k === void 0 ? void 0 : _k.targetColumn);
            if (!itemId || !boardId || !relationColId || !sourceColumnId || !targetColId) {
                console.warn('[LinkedItemHandler] Missing fields in payload', payload.inputFields);
                return res.status(200).send({});
            }
            // ⏱️ Respond immediately to avoid Monday's 3-second timeout
            res.status(200).send({});
            try {
                yield (0, linked_item_service_1.handleFetchAndPopulateLinkedColumn)(shortLivedToken, boardId, itemId, relationColId, sourceColumnId, targetColId);
                console.log('[LinkedItemHandler] Success: Populated target column');
            }
            catch (error) {
                console.error('[LinkedItemHandler] Execution Failed:', error.message);
            }
        });
    }
}
exports.LinkedItemHandler = LinkedItemHandler;
