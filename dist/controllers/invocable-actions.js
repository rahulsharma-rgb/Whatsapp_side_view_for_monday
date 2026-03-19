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
    static getTemplates(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return res.status(200).send({
                    options: [
                        { title: "Dispatch & Billing (Doc)", value: "disptach_and_billing" },
                        { title: "Sales Conf. - BUYER (Doc)", value: "sales_confirmation_buyer" },
                        { title: "Sales Conf. - SUPPLIER (Doc)", value: "sales_confirmation_supplier" },
                        { title: "Commission Invoice (Doc)", value: "commission_invoice" },
                        { title: "Transport Invoice (Doc)", value: "transport_invoice" },
                        { title: "Custom Invoice (Text/Doc)", value: "custom_invoice_document" },
                        { title: "Delivery Update (Text)", value: "delivery_update" },
                        { title: "WhatsApp Document (PDF)", value: "whatsapp_document" },
                        { title: "Hello World (Test)", value: "hello_world" }
                    ]
                });
            }
            catch (err) {
                return res.status(500).send({ message: 'Internal error' });
            }
        });
    }
    static getColumns(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const shortLivedToken = (_a = req.session) === null || _a === void 0 ? void 0 : _a.shortLivedToken;
            const { payload } = req.body;
            const boardId = payload === null || payload === void 0 ? void 0 : payload.boardId;
            if (!shortLivedToken || !boardId)
                return res.status(200).send({ options: [] });
            try {
                const columns = yield monday_service_1.default.getBoardColumns(shortLivedToken, boardId);
                if (!columns)
                    return res.status(200).send({ options: [] });
                const options = columns.map((col) => ({
                    title: `${col.title} (${col.type})`,
                    value: col.id
                }));
                return res.status(200).send({ options });
            }
            catch (err) {
                return res.status(500).send({ message: 'Internal error' });
            }
        });
    }
    static actionSendMessage(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6;
            const shortLivedToken = (_a = req.session) === null || _a === void 0 ? void 0 : _a.shortLivedToken;
            const { payload } = req.body;
            if (!shortLivedToken)
                return res.status(401).send({ message: 'Unauthorized' });
            const boardId = (_c = (_b = payload.inputFields) === null || _b === void 0 ? void 0 : _b.boardId) !== null && _c !== void 0 ? _c : (_d = payload.context) === null || _d === void 0 ? void 0 : _d.boardId;
            const itemId = (_f = (_e = payload.inputFields) === null || _e === void 0 ? void 0 : _e.itemId) !== null && _f !== void 0 ? _f : (_g = payload.context) === null || _g === void 0 ? void 0 : _g.itemId;
            let actualBoardId = boardId;
            try {
                let finalResponseColId = (_j = (_h = payload.inputFields) === null || _h === void 0 ? void 0 : _h.responseColumn) !== null && _j !== void 0 ? _j : (_k = payload.inboundFieldValues) === null || _k === void 0 ? void 0 : _k.responseColumn;
                let finalWamidColId = (_m = (_l = payload.inputFields) === null || _l === void 0 ? void 0 : _l.wamidColumn) !== null && _m !== void 0 ? _m : (_o = payload.inboundFieldValues) === null || _o === void 0 ? void 0 : _o.wamidColumn;
                let finalTemplateColId = (_q = (_p = payload.inputFields) === null || _p === void 0 ? void 0 : _p.templateLogColumn) !== null && _q !== void 0 ? _q : (_r = payload.inboundFieldValues) === null || _r === void 0 ? void 0 : _r.templateLogColumn;
                let finalMessageColId = (_t = (_s = payload.inputFields) === null || _s === void 0 ? void 0 : _s.messageLogColumn) !== null && _t !== void 0 ? _t : (_u = payload.inboundFieldValues) === null || _u === void 0 ? void 0 : _u.messageLogColumn;
                const documentColumnObj = (_w = (_v = payload.inputFields) === null || _v === void 0 ? void 0 : _v.documentColumn) !== null && _w !== void 0 ? _w : (_x = payload.inboundFieldValues) === null || _x === void 0 ? void 0 : _x.documentColumn;
                let finalDocumentColId = (_y = documentColumnObj === null || documentColumnObj === void 0 ? void 0 : documentColumnObj.value) !== null && _y !== void 0 ? _y : documentColumnObj;
                const { templateId, toPhoneColumn } = payload.inboundFieldValues || {};
                const templateName = (_0 = (_z = templateId === null || templateId === void 0 ? void 0 : templateId.value) !== null && _z !== void 0 ? _z : templateId) !== null && _0 !== void 0 ? _0 : 'hello_world';
                let finalPhoneColId = (_1 = toPhoneColumn === null || toPhoneColumn === void 0 ? void 0 : toPhoneColumn.value) !== null && _1 !== void 0 ? _1 : toPhoneColumn;
                if (!itemId || !finalPhoneColId)
                    return res.status(200).send({});
                const itemData = yield monday_service_1.default.getSmartItemData(shortLivedToken, itemId);
                if (!itemData)
                    return res.status(200).send({});
                actualBoardId = ((_2 = itemData.board) === null || _2 === void 0 ? void 0 : _2.id) || boardId;
                const isSubitem = String(actualBoardId) !== String(boardId);
                if (isSubitem) {
                    const parentColumns = yield monday_service_1.default.getBoardColumns(shortLivedToken, boardId);
                    if (parentColumns) {
                        const getSubitemColId = (parentColId) => {
                            if (!parentColId)
                                return undefined;
                            const parentCol = parentColumns.find((c) => c.id === parentColId);
                            if (!parentCol)
                                return parentColId;
                            const subCol = itemData.column_values.find((c) => { var _a, _b; return ((_b = (_a = c.column) === null || _a === void 0 ? void 0 : _a.title) === null || _b === void 0 ? void 0 : _b.toLowerCase().trim()) === parentCol.title.toLowerCase().trim(); });
                            return subCol ? subCol.id : parentColId;
                        };
                        finalPhoneColId = getSubitemColId(finalPhoneColId);
                        finalResponseColId = getSubitemColId(finalResponseColId);
                        finalWamidColId = getSubitemColId(finalWamidColId);
                        finalTemplateColId = getSubitemColId(finalTemplateColId);
                        finalMessageColId = getSubitemColId(finalMessageColId);
                        finalDocumentColId = getSubitemColId(finalDocumentColId);
                    }
                }
                // ==========================================
                // UNIVERSAL EXTRACTOR (Partial Match & Formula Fix)
                // ==========================================
                const getColText = (...titles) => {
                    var _a, _b;
                    let foundCol = null;
                    // 1. Exact Match Search
                    for (const title of titles) {
                        const cleanTitle = title.toLowerCase().trim();
                        foundCol = itemData.column_values.find((c) => { var _a, _b; return ((_b = (_a = c.column) === null || _a === void 0 ? void 0 : _a.title) === null || _b === void 0 ? void 0 : _b.toLowerCase().trim()) === cleanTitle; });
                        if (!foundCol && ((_a = itemData.parent_item) === null || _a === void 0 ? void 0 : _a.column_values)) {
                            foundCol = itemData.parent_item.column_values.find((c) => { var _a, _b; return ((_b = (_a = c.column) === null || _a === void 0 ? void 0 : _a.title) === null || _b === void 0 ? void 0 : _b.toLowerCase().trim()) === cleanTitle; });
                        }
                        if (foundCol)
                            break;
                    }
                    // 2. Partial Match Search (if exact fails - e.g. looking for "Total Amount" but column is "Total Amount (Rs)")
                    if (!foundCol) {
                        for (const title of titles) {
                            const cleanTitle = title.toLowerCase().trim();
                            foundCol = itemData.column_values.find((c) => { var _a, _b; return (_b = (_a = c.column) === null || _a === void 0 ? void 0 : _a.title) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes(cleanTitle); });
                            if (!foundCol && ((_b = itemData.parent_item) === null || _b === void 0 ? void 0 : _b.column_values)) {
                                foundCol = itemData.parent_item.column_values.find((c) => { var _a, _b; return (_b = (_a = c.column) === null || _a === void 0 ? void 0 : _a.title) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes(cleanTitle); });
                            }
                            if (foundCol)
                                break;
                        }
                    }
                    // Extract and format the value
                    if (foundCol) {
                        // Clean up extra quotes Monday puts on formulas 
                        const cleanStr = (str) => String(str).replace(/['"]+/g, '');
                        if (foundCol.display_value)
                            return cleanStr(foundCol.display_value);
                        if (foundCol.text)
                            return cleanStr(foundCol.text);
                        if (foundCol.value) {
                            try {
                                const parsed = JSON.parse(foundCol.value);
                                if (parsed !== null && typeof parsed === 'object') {
                                    if (parsed.result !== undefined && parsed.result !== null)
                                        return cleanStr(parsed.result);
                                    if (parsed.value !== undefined && parsed.value !== null)
                                        return cleanStr(parsed.value);
                                }
                                else if (parsed !== null && parsed !== "") {
                                    return cleanStr(parsed);
                                }
                            }
                            catch (e) {
                                return cleanStr(foundCol.value);
                            }
                        }
                    }
                    return "N/A";
                };
                const phoneCol = itemData.column_values.find((c) => c.id === finalPhoneColId);
                const rawPhone = phoneCol ? (phoneCol.text || phoneCol.display_value || "") : "";
                let cleanPhone = rawPhone.replace(/[^0-9]/g, '').slice(0, 15);
                if (!cleanPhone || cleanPhone.length < 10) {
                    if (finalResponseColId)
                        yield monday_service_1.default.changeColumnValue(shortLivedToken, actualBoardId, itemId, finalResponseColId, "❌ Error: Invalid Phone");
                    return res.status(200).send({});
                }
                let variables = [];
                let fileUrl = undefined;
                let fileName = undefined;
                let messageToLog = `[Template Sent: ${templateName}]`;
                // Document Handler
                if (finalDocumentColId) {
                    let docCol = (_3 = itemData.column_values) === null || _3 === void 0 ? void 0 : _3.find((c) => c.id === finalDocumentColId);
                    let assetsSource = itemData.assets;
                    if (!docCol && itemData.parent_item) {
                        docCol = (_4 = itemData.parent_item.column_values) === null || _4 === void 0 ? void 0 : _4.find((c) => c.id === finalDocumentColId);
                        assetsSource = itemData.parent_item.assets;
                    }
                    if (docCol && docCol.value) {
                        try {
                            const parsedValue = JSON.parse(docCol.value);
                            if (((_5 = parsedValue === null || parsedValue === void 0 ? void 0 : parsedValue.files) === null || _5 === void 0 ? void 0 : _5.length) > 0) {
                                const targetAssetId = parsedValue.files[0].assetId.toString();
                                const specificAsset = assetsSource === null || assetsSource === void 0 ? void 0 : assetsSource.find((a) => a.id.toString() === targetAssetId);
                                if (specificAsset) {
                                    fileUrl = specificAsset.public_url;
                                    fileName = specificAsset.name;
                                }
                            }
                        }
                        catch (e) {
                            console.error("Could not parse file value");
                        }
                    }
                }
                // ==========================================
                // TEMPLATE MAPPINGS
                // ==========================================
                let actualMetaTemplateName = templateName;
                if (templateName === 'disptach_and_billing') {
                    variables = [
                        getColText("Buyer Business Unit"),
                        getColText("Supplier"),
                        getColText("Buyer"),
                        getColText("Counts Summary"),
                        isSubitem ? getColText("Quantity Dispatched") : getColText("Quantity"),
                        getColText("Total Weight"),
                        getColText("Buyer Office Address"),
                        getColText("Dispatch Date")
                    ];
                    const bodyText = `Greetings from ${variables[0]}.\n\nWe are reaching out to confirm that your shipment has been delivered successfully. The delivery included items from the mill ${variables[1]} for the buyer ${variables[2]}. The specific counts for this order are ${variables[3]}, packed securely in ${variables[4]} bags, with a total delivery weight of ${variables[5]} KG. The entire shipment was delivered safely to the location ${variables[6]} on ${variables[7]}.\n\nThank You for your business!`;
                    messageToLog = fileUrl ? `[Document Sent: ${fileName}]\n\n${bodyText}` : bodyText;
                }
                else if (templateName === 'sales_confirmation_buyer') {
                    actualMetaTemplateName = 'sales_confirmation';
                    variables = [
                        getColText("Buyer Business Unit"),
                        getColText("Supplier"),
                        getColText("Buyer"),
                        getColText("Summary"),
                        getColText("Quantity"),
                        getColText("Bag Weight"),
                        getColText("Final Rate")
                    ];
                    const bodyText = `Greetings from ${variables[0]},\n\nConfirmation has been sent for:\n* '${variables[1]} - ${variables[2]} - ${variables[3]} - ${variables[4]}Bags - ${variables[5]}Kg/Bag - ${variables[6]} EX-Mill'*\nAll other details are provided in the attached document.`;
                    messageToLog = fileUrl ? `[Document Sent: ${fileName}]\n\n${bodyText}` : bodyText;
                }
                else if (templateName === 'sales_confirmation_supplier') {
                    actualMetaTemplateName = 'sales_confirmation';
                    variables = [
                        getColText("Supplier Business Unit"),
                        getColText("Supplier"),
                        getColText("Buyer"),
                        getColText("Summary"),
                        getColText("Quantity"),
                        getColText("Bag Weight"),
                        getColText("Final Rate")
                    ];
                    const bodyText = `Greetings from ${variables[0]},\n\nConfirmation has been sent for:\n* '${variables[1]} - ${variables[2]} - ${variables[3]} - ${variables[4]}Bags - ${variables[5]}Kg/Bag - ${variables[6]} EX-Mill'*\nAll other details are provided in the attached document.`;
                    messageToLog = fileUrl ? `[Document Sent: ${fileName}]\n\n${bodyText}` : bodyText;
                }
                else if (templateName === 'commission_invoice') {
                    variables = [
                        getColText("Business Units"),
                        getColText("Company Mill/Factory/Delivery Address"),
                        getColText("Company"),
                        getColText("Net Amount"),
                        getColText("Invoice From Date"),
                        getColText("Invoice To Date"),
                        getColText("Phone"),
                        getColText("Company")
                    ];
                    const bodyText = `Thanks for purchasing yarn via ${variables[0]}.\n\n${variables[1]} - ${variables[2]} commission bill amt Rs. ${variables[3]} from Date ${variables[4]} to ${variables[5]} has been raised and dispatched to your office.\n\nHope to receive the payment at earliest contact - ${variables[6]}\nThanks.\nAccount dept\n${variables[7]}\nAll other details are provided in the attached document.`;
                    messageToLog = fileUrl ? `[Document Sent: ${fileName}]\n\n${bodyText}` : bodyText;
                }
                else if (templateName === 'transport_invoice') {
                    variables = [
                        getColText("Business Units"),
                        getColText("To"),
                        getColText("Total Amount"),
                        getColText("Date")
                    ];
                    const bodyText = `The Transport In\n\n${variables[0]} – ${variables[1]} commission bill amt Rs ${variables[2]} for Date ${variables[3]} has been raised and dispatched to your office.\n\nHope to receive payment at earliest.\nAll other details are provided in the attached document.`;
                    messageToLog = fileUrl ? `[Document Sent: ${fileName}]\n\n${bodyText}` : bodyText;
                }
                else if (templateName === 'custom_invoice_document') {
                    variables = [getColText("Client Name", "Buyer"), getColText("Invoice No"), getColText("Amount"), getColText("Business Unit")];
                    const bodyText = `Dear ${variables[0]},\n\nPlease find attached your Brokerage Bill (Invoice No.${variables[1]}) for the total amount of Rs.${variables[2]}.\n\nWe at ${variables[3]} appreciate your business and wish you a great day!`;
                    messageToLog = fileUrl ? `[Document Sent: ${fileName}]\n\n${bodyText}` : bodyText;
                }
                else if (templateName === 'delivery_update') {
                    variables = [
                        getColText("Business Units"), getColText("Mill"), getColText("Buyer"),
                        getColText("Count"), getColText("Bags"), getColText("Total KGS"),
                        getColText("Sizing Name"), getColText("Date")
                    ];
                    messageToLog = `Delivery Update from ${variables[0]}\n\nMill: ${variables[1]}\nBuyer: ${variables[2]}\nCount: ${variables[3]}\nQty: ${variables[4]} Bags\nWeight: ${variables[5]} KG\nTo: ${variables[6]}\nDate: ${variables[7]}\n\nThank You.`;
                }
                else if (templateName === 'hello_world') {
                    messageToLog = "Welcome and congratulations!! This message demonstrates your ability to send a WhatsApp message notification.";
                }
                const lang = actualMetaTemplateName === 'hello_world' ? 'en_US' : 'en';
                console.log(`📞 Sending '${actualMetaTemplateName}' to phone: ${cleanPhone}`);
                const result = yield whatsapp_service_1.WhatsappService.sendAdvancedTemplate(cleanPhone, actualMetaTemplateName, variables, fileUrl, fileName, lang);
                if (result.messages) {
                    if (finalWamidColId)
                        yield monday_service_1.default.changeColumnValue(shortLivedToken, actualBoardId, itemId, finalWamidColId, result.messages[0].id);
                    if (finalTemplateColId)
                        yield monday_service_1.default.changeColumnValue(shortLivedToken, actualBoardId, itemId, finalTemplateColId, templateName);
                    if (finalMessageColId)
                        yield monday_service_1.default.changeColumnValue(shortLivedToken, actualBoardId, itemId, finalMessageColId, messageToLog);
                    if (finalResponseColId)
                        yield monday_service_1.default.changeColumnValue(shortLivedToken, actualBoardId, itemId, finalResponseColId, "✅ Sent!");
                }
                else {
                    if (finalResponseColId)
                        yield monday_service_1.default.changeColumnValue(shortLivedToken, actualBoardId, itemId, finalResponseColId, `❌ ${((_6 = result.error) === null || _6 === void 0 ? void 0 : _6.message) || "Error"}`);
                }
                return res.status(200).send({});
            }
            catch (err) {
                console.error("❌ Catch Error in actionSendMessage:", err);
                return res.status(500).send({ message: 'Error' });
            }
        });
    }
}
exports.InvocableActions = InvocableActions;
