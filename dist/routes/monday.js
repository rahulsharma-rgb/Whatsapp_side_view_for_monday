"use strict";
// File: src/routes/monday.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
const transformationController = __importStar(require("../controllers/monday-controller"));
const authentication_1 = __importDefault(require("../middlewares/authentication"));
const invocable_actions_1 = require("../controllers/invocable-actions"); // IMPORT NEW CLASS
const duplicate_rules_1 = require("../controllers/duplicate-rules");
const auto_number_handler_1 = require("../controllers/auto-number-handler");
const date_time_handler_1 = require("../controllers/date-time-handler");
// 1. Existing boilerplate routes
router.post('/api/monday/execute_action', authentication_1.default, transformationController.executeAction);
router.post('/api/monday/reverse_string', authentication_1.default, transformationController.reverseString);
// ==========================================
// NEW PRODUCTION ROUTE
// ==========================================
// This is the Run URL you will put in the Monday Developer Center:
// https://[your-tunnel-url]/api/monday/action_send_message
// File: src/routes/monday.ts
// 2. WhatsApp Messages
router.post('/api/monday/action_send_message', authentication_1.default, invocable_actions_1.InvocableActions.actionSendMessage);
router.post('/api/monday/action_send_message', authentication_1.default, invocable_actions_1.InvocableActions.actionSendMessage);
// Add this new route for the dropdown!
router.post('/api/monday/get_templates', authentication_1.default, invocable_actions_1.InvocableActions.getTemplates);
router.post('/api/monday/get_columns', authentication_1.default, invocable_actions_1.InvocableActions.getColumns);
//3. Checking Duplicates
router.post("/api/monday/check-duplicates", authentication_1.default, duplicate_rules_1.DuplicateRules.actionCheckDuplicateWithLogger);
//4. Increase Custom Auto Number (Text or Numeric) fields after creation.
router.post("/api/monday/calculate-auto-number", authentication_1.default, auto_number_handler_1.AutoNumberHandler.handleCustomAutoNumberCalculation);
router.post("/api/monday/set-date-to-now", authentication_1.default, date_time_handler_1.DateTimeHandler.handleSetDateTimeColumnAsNow);
// 5. Send Bank Details via WhatsApp (Board View Feature)
router.post('/api/monday/send_bank_details', invocable_actions_1.InvocableActions.sendBankDetails);
exports.default = router;
