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
exports.AutoNumberHandler = void 0;
const auto_number_service_1 = require("../services/auto-number-service");
class AutoNumberHandler {
    static handleCustomAutoNumberCalculation(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
            const shortLivedToken = (_a = req.session) === null || _a === void 0 ? void 0 : _a.shortLivedToken;
            const { payload } = req.body;
            if (!shortLivedToken) {
                return res.status(401).send({ message: 'Unauthorized' });
            }
            const itemId = (_c = (_b = payload.inputFields) === null || _b === void 0 ? void 0 : _b.itemId) !== null && _c !== void 0 ? _c : (_d = payload.context) === null || _d === void 0 ? void 0 : _d.itemId;
            const boardId = (_f = (_e = payload.inputFields) === null || _e === void 0 ? void 0 : _e.boardId) !== null && _f !== void 0 ? _f : (_g = payload.context) === null || _g === void 0 ? void 0 : _g.boardId;
            const getColId = (col) => { var _a; return (_a = col === null || col === void 0 ? void 0 : col.value) !== null && _a !== void 0 ? _a : col; };
            const createdDateColId = getColId((_h = payload.inputFields) === null || _h === void 0 ? void 0 : _h.columnIdCreatedDate);
            const customAutoNumberColId = getColId((_j = payload.inputFields) === null || _j === void 0 ? void 0 : _j.columnIdCustomAutoNumber);
            if (!itemId || !createdDateColId || !customAutoNumberColId) {
                return res.status(200).send({});
            }
            // RESPOND IMMEDIATELY TO PREVENT TIMEOUTS
            res.status(200).send({});
            try {
                yield (0, auto_number_service_1.handleCalculateCustomAutoNumber)(shortLivedToken, boardId, itemId, createdDateColId, customAutoNumberColId);
                console.log('[Auto-Number] Execution Successful', {
                    success: true,
                    boardId: boardId,
                    itemId: itemId,
                    action: "Calculated next auto-number"
                });
            }
            catch (err) {
                console.error('[Auto-Number] Execution Failed', {
                    success: false,
                    boardId: boardId,
                    itemId: itemId,
                    errorMessage: err.message,
                    stackTrace: err.stack
                });
            }
        });
    }
}
exports.AutoNumberHandler = AutoNumberHandler;
