"use strict";
// File: src/controllers/invocable-actions.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvocableActions = void 0;
const monday_service_1 = __importDefault(require("../services/monday-service"));
const whatsapp_service_1 = require("../services/whatsapp-service");
class InvocableActions {
    static actionSendMessage(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w;
            const shortLivedToken = (_a = req.session) === null || _a === void 0 ? void 0 : _a.shortLivedToken;
            const { payload } = req.body;
            console.log("🚀 Triggered!");
            console.log("BODY:", JSON.stringify(req.body));
            console.log("inputFields:", JSON.stringify(payload === null || payload === void 0 ? void 0 : payload.inputFields));
            console.log("inboundFieldValues:", JSON.stringify(payload === null || payload === void 0 ? void 0 : payload.inboundFieldValues));
            console.log("context:", JSON.stringify(payload === null || payload === void 0 ? void 0 : payload.context));
            if (!shortLivedToken) {
                return res.status(401).send({ message: 'Unauthorized: Missing token' });
            }
            try {
                // 1. Extract variables from Monday payload
                const boardId = (_c = (_b = payload.inputFields) === null || _b === void 0 ? void 0 : _b.boardId) !== null && _c !== void 0 ? _c : (_d = payload.context) === null || _d === void 0 ? void 0 : _d.boardId;
                const itemId = (_f = (_e = payload.inputFields) === null || _e === void 0 ? void 0 : _e.itemId) !== null && _f !== void 0 ? _f : (_g = payload.context) === null || _g === void 0 ? void 0 : _g.itemId;
                const toPhoneColumn = (_j = (_h = payload.inputFields) === null || _h === void 0 ? void 0 : _h.toPhoneColumn) !== null && _j !== void 0 ? _j : (_k = payload.inboundFieldValues) === null || _k === void 0 ? void 0 : _k.toPhoneColumn;
                const responseColumn = (_m = (_l = payload.inputFields) === null || _l === void 0 ? void 0 : _l.responseColumn) !== null && _m !== void 0 ? _m : (_o = payload.inboundFieldValues) === null || _o === void 0 ? void 0 : _o.responseColumn;
                // Extract the new WAMID column!
                const wamidColumn = (_q = (_p = payload.inputFields) === null || _p === void 0 ? void 0 : _p.wamidColumn) !== null && _q !== void 0 ? _q : (_r = payload.inboundFieldValues) === null || _r === void 0 ? void 0 : _r.wamidColumn;
                const { templateId, fromPhone, message } = payload.inboundFieldValues || {};
                console.log(`boardId=${boardId} itemId=${itemId} toPhoneColumn=${toPhoneColumn} responseColumn=${responseColumn} wamidColumn=${wamidColumn}`);
                if (!itemId || !toPhoneColumn) {
                    console.log("❌ Missing itemId or toPhoneColumn");
                    return res.status(200).send({});
                }
                // 2. Fetch the phone number from the board
                const rawPhoneNumber = yield monday_service_1.default.getColumnValue(shortLivedToken, itemId, toPhoneColumn);
                if (!rawPhoneNumber) {
                    console.log(`❌ No phone number found in column: ${toPhoneColumn}`);
                    return res.status(200).send({});
                }
                // 3. Clean the phone number
                let cleanPhone = "";
                try {
                    const parsed = JSON.parse(rawPhoneNumber);
                    cleanPhone = (parsed && parsed.phone) ? parsed.phone.replace(/[^0-9]/g, '') : rawPhoneNumber.replace(/[^0-9]/g, '');
                }
                catch (e) {
                    cleanPhone = rawPhoneNumber.replace(/[^0-9]/g, '').slice(0, 15);
                }
                if (!cleanPhone || cleanPhone.length < 10) {
                    console.log(`❌ Invalid phone format: ${cleanPhone}`);
                    return res.status(200).send({});
                }
                const templateName = (_t = (_s = templateId === null || templateId === void 0 ? void 0 : templateId.value) !== null && _s !== void 0 ? _s : templateId) !== null && _t !== void 0 ? _t : 'hello_world';
                const finalFromPhone = (_u = fromPhone === null || fromPhone === void 0 ? void 0 : fromPhone.value) !== null && _u !== void 0 ? _u : fromPhone;
                const finalMessage = (_v = message === null || message === void 0 ? void 0 : message.value) !== null && _v !== void 0 ? _v : message;
                console.log(`📞 Sending '${templateName}' to ${cleanPhone}...`);
                // 4. Call Meta API
                const result = yield whatsapp_service_1.WhatsappService.sendTemplate(cleanPhone, templateName, 'en_US', finalFromPhone, finalMessage);
                // 5. Handle the Response and Write to BOTH columns
                if (result.messages && result.messages.length > 0) {
                    const wamid = result.messages[0].id;
                    console.log(`✅ Sent successfully! Message ID: ${wamid}`);
                    // Write a clean SUCCESS message to the Response column
                    if (responseColumn) {
                        yield monday_service_1.default.changeColumnValue(shortLivedToken, boardId, itemId, responseColumn, JSON.stringify("✅ Successfully Sent!"));
                    }
                    // Write the raw ID to the new WAMID column
                    if (wamidColumn) {
                        yield monday_service_1.default.changeColumnValue(shortLivedToken, boardId, itemId, wamidColumn, JSON.stringify(wamid));
                    }
                }
                else {
                    console.error(`❌ WhatsApp API Failed:`, JSON.stringify(result.error));
                    // Write the exact ERROR to the Response column
                    if (responseColumn) {
                        const errorMsg = ((_w = result.error) === null || _w === void 0 ? void 0 : _w.message) || "Unknown Meta API Error";
                        yield monday_service_1.default.changeColumnValue(shortLivedToken, boardId, itemId, responseColumn, JSON.stringify(`❌ Error: ${errorMsg}`));
                    }
                    // Clear out the WAMID column since it failed
                    if (wamidColumn) {
                        yield monday_service_1.default.changeColumnValue(shortLivedToken, boardId, itemId, wamidColumn, JSON.stringify(""));
                    }
                }
                return res.status(200).send({});
            }
            catch (err) {
                console.error("❌ Error:", err);
                return res.status(500).send({ message: 'Internal server error' });
            }
        });
    }
}
exports.InvocableActions = InvocableActions;
