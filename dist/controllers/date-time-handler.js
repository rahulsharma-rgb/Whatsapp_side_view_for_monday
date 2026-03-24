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
exports.DateTimeHandler = void 0;
const date_time_service_1 = require("../services/date-time-service");
class DateTimeHandler {
    static handleSetDateTimeColumnAsNow(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            console.log('Datetimehandler.ts  calculating dateitime number for ');
            const shortLivedToken = (_a = req.session) === null || _a === void 0 ? void 0 : _a.shortLivedToken;
            const { payload } = req.body;
            if (!shortLivedToken) {
                return res.status(401).send({ message: 'Unauthorized' });
            }
            const itemId = (_c = (_b = payload.inputFields) === null || _b === void 0 ? void 0 : _b.itemId) !== null && _c !== void 0 ? _c : (_d = payload.context) === null || _d === void 0 ? void 0 : _d.itemId;
            const boardId = (_f = (_e = payload.inputFields) === null || _e === void 0 ? void 0 : _e.boardId) !== null && _f !== void 0 ? _f : (_g = payload.context) === null || _g === void 0 ? void 0 : _g.boardId;
            const getColId = (col) => { var _a; return (_a = col === null || col === void 0 ? void 0 : col.value) !== null && _a !== void 0 ? _a : col; };
            const datetimeColId = getColId((_h = payload.inputFields) === null || _h === void 0 ? void 0 : _h.columnIdDatetime);
            console.log("DAtetime ", itemId, ", boardId = ", boardId, ", colid ", datetimeColId);
            if (!itemId || !boardId || !datetimeColId) {
                return res.status(400).send({ message: 'Missing required fields' });
            }
            try {
                yield (0, date_time_service_1.handleSetDateTimeFieldAsNow)(shortLivedToken, boardId, itemId, datetimeColId);
                console.log('[Datetimehandler] Execution Successful', {
                    success: true,
                    boardId: boardId,
                    itemId: itemId,
                    action: "Set Datetime column as Now"
                });
                return res.status(200).send({ message: 'Datetime updated successfully' });
            }
            catch (error) {
                console.error('[Datetimehandler] Execution Failed', {
                    success: false,
                    boardId: boardId,
                    itemId: itemId,
                    errorMessage: error.message,
                    stackTrace: error.stack
                });
                return res.status(500).send({ message: 'Internal server error', error });
            }
        });
    }
}
exports.DateTimeHandler = DateTimeHandler;
