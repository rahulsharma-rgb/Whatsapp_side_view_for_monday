# WhatsAppConnect — Monday.com Integration

**WhatsAppConnect** is a professional-grade integration that allows users to send WhatsApp Template messages directly from any Monday.com board using Meta's WhatsApp Business API.

---

## 🛠 Features

- **Modular Architecture**: Logic is separated into a dedicated `WhatsappService` for API calls and an `InvocableActions` controller for Monday.com webhook handling.

- **Fail-Safe ID Extraction**: The app uses a robust extraction method to find `boardId` and `itemId` from Monday's payload, regardless of nesting structure.

- **Dynamic Column Mapping**: Works on any board by allowing users to map their specific Phone column during automation setup.

- **Production Ready**: Supports environment variables for secrets, cleaning of phone number strings, and error handling to ensure automations don't get stuck on failure.

- **Dynamic Template Variables**: Supports injecting custom messages into WhatsApp templates as `{{1}}` body parameters.

---

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
  - [Monday Developer Center Setup](#monday-developer-center-setup)
  - [Environment Variables](#environment-variables)
  - [OAuth Permissions](#oauth-permissions)
- [Deployment](#deployment)
- [Usage](#usage)
- [Code Architecture](#code-architecture)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Prerequisites

- **Node.js** v18+
- **Monday.com Developer Account** with app creation access
- **Meta WhatsApp Business Account** with:
  - Permanent Access Token
  - Phone Number ID
  - Approved WhatsApp Template (e.g., `hello_world`)
- **Monday Apps CLI** installed globally:
  ```bash
  npm install -g @mondaycom/apps-cli
  ```

---

## Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd quickstart-fullstack-react-node
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build the client**:
   ```bash
   npm run client-build
   ```

---

## Configuration

### Monday Developer Center Setup

#### 1. Create a New App
- Go to [Monday Developer Center](https://monday.com/developers)
- Create a new app or select an existing one

#### 2. Add Integration Feature
- Navigate to **Features** → **Add Feature** → **Integration**
- Create a **Workflow Block** (Custom Action) named `actionSendMessage`

#### 3. Configure Input Fields

Add the following input fields with their exact keys:

| Field Label      | Key              | Type           | Source                  | Required |
|------------------|------------------|----------------|-------------------------|----------|
| Board            | `boardId`        | Board          | **Trigger Output**      | Yes      |
| Item             | `itemId`         | Item           | **Trigger Output**      | Yes      |
| To Phone Column  | `toPhoneColumn`  | Column         | **Recipe Sentence**     | Yes      |
| Template ID      | `templateId`     | Text           | Recipe Sentence         | No       |
| From Phone       | `fromPhone`      | Text           | Recipe Sentence         | No       |
| Custom Message   | `message`        | Text           | Recipe Sentence         | No       |

#### 4. Build Recipe Sentence

Use the `/` injector to create a user-friendly sentence:

```
Send template {Template ID} to {To Phone Column} using sender {From Phone} with message {Custom Message}
```

#### 5. Set Run URL

After deployment, set the **Run URL** to:
```
https://<your-app-id>-service-<service-id>.us.monday.app/api/monday/action_send_message
```

---

### Environment Variables

Create a `.env` file in the root directory:

```env
PORT=8080
MONDAY_SIGNING_SECRET=your_monday_signing_secret
WHATSAPP_ACCESS_TOKEN=your_meta_permanent_access_token
WHATSAPP_PHONE_ID=your_whatsapp_phone_number_id
```

**For Monday Code Hosting**, add these as **Environment Variables** in the Developer Center under **Server-side code** → **Environment Variables**.

---

### OAuth Permissions

Your app requires the following scopes to function:

1. Go to **OAuth & Permissions** in the Developer Center
2. Add these scopes:
   - `boards:read` — Read board data
   - `items:read` — Read item data
3. **Save** and **reinstall** the app to your workspace

---

## Deployment

### Deploy to Monday Code Hosting

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Deploy to Monday Code**:
   ```bash
   npm run deploy
   ```

3. **Select your app and version** when prompted

4. **Configure environment variables** in the Developer Center if not already set

5. **Update the Run URL** in your action feature with the deployed URL

---

### Local Development

Run the app locally with ngrok tunnel:

```bash
npm run dev-server
```

This will:
- Start the Express server on port 8080
- Create an ngrok tunnel
- Watch for file changes

---

## Usage

### Setting Up an Automation

1. **Open a Monday.com board**
2. **Create a new automation**:
   - Trigger: "When status changes to something" (or any trigger)
   - Action: Select your app → "Send WhatsApp Template"
3. **Configure the action**:
   - **To Phone Column**: Select the column containing phone numbers
   - **Template ID**: Enter your WhatsApp template name (e.g., `hello_world`)
   - **From Phone** (optional): Leave blank to use default
   - **Custom Message** (optional): Enter dynamic text for `{{1}}` variable
4. **Save and activate** the automation

### Testing in Sandbox Mode

- Use the `hello_world` template (pre-approved by Meta)
- Ensure phone numbers are in international format (e.g., `+1234567890`)
- Check logs with `mapps code:logs` to see execution details

---

## Code Architecture

### Project Structure

```
quickstart-fullstack-react-node/
├── src/
│   ├── controllers/
│   │   ├── invocable-actions.ts    # Main action handler
│   │   └── monday-controller.ts    # Boilerplate controllers
│   ├── services/
│   │   ├── whatsapp-service.ts     # WhatsApp API integration
│   │   ├── monday-service.ts       # Monday GraphQL queries
│   │   └── transformation-service.ts
│   ├── middlewares/
│   │   └── authentication.ts       # JWT verification
│   ├── routes/
│   │   ├── monday.ts               # API routes
│   │   └── index.ts
│   ├── app.ts                      # Express app entry point
│   └── queries.graphql.ts          # GraphQL queries
├── client/                         # React frontend (optional)
├── package.json
└── tsconfig.json
```

---

### Key Components

#### `InvocableActions.ts`

Entry point for the automation webhook:

- **Authentication**: Verifies `shortLivedToken` via JWT middleware
- **Data Extraction**: Extracts `boardId`, `itemId`, and `toPhoneColumn` from payload
- **Phone Number Retrieval**: Calls `MondayService.getColumnValue()` to fetch phone data
- **Phone Cleaning**: Strips non-numeric characters and validates format
- **WhatsApp API Call**: Invokes `WhatsappService.sendTemplate()`

```typescript
static async actionSendMessage(req: Request, res: Response) {
    const { payload } = req.body;
    const itemId = payload.inputFields?.itemId;
    const toPhoneColumn = payload.inputFields?.toPhoneColumn;
    
    const rawPhoneNumber = await MondayService.getColumnValue(token, itemId, toPhoneColumn);
    const cleanPhone = rawPhoneNumber.replace(/[^0-9]/g, '');
    
    await WhatsappService.sendTemplate(cleanPhone, templateName);
}
```

---

#### `WhatsappService.ts`

Handles all WhatsApp Business API communication:

- **Template Sending**: Constructs and sends template messages
- **Dynamic Variables**: Supports injecting custom messages as `{{1}}`
- **Error Handling**: Catches and logs API failures

```typescript
static async sendTemplate(
    toPhone: string, 
    templateName: string, 
    languageCode: string = 'en_US',
    fromPhone?: string,
    customMessage?: string
) {
    const payload = {
        messaging_product: 'whatsapp',
        to: toPhone,
        type: 'template',
        template: {
            name: templateName,
            language: { code: languageCode }
        }
    };
    
    if (customMessage) {
        payload.template.components = [{
            type: "body",
            parameters: [{ type: "text", text: customMessage }]
        }];
    }
    
    return await fetch(url, { method: 'POST', body: JSON.stringify(payload) });
}
```

---

#### `MondayService.ts`

GraphQL client for Monday.com API:

- **getColumnValue**: Fetches column data by `itemId` and `columnId`
- **changeColumnValue**: Updates column values (for future features)

```typescript
static async getColumnValue(token, itemId, columnId) {
    const mondayClient = new ApiClient({ token });
    const params = { itemId: [itemId], columnId: [columnId] };
    const response = await mondayClient.request(getColumnValueQuery, params);
    return response?.items?.[0]?.column_values?.[0]?.value;
}
```

---

## Testing

### View Live Logs

```bash
mapps code:logs
```

Select your app and version, then choose:
- **console** — View application logs
- **http** — View HTTP request/response logs

### Expected Log Output

```
🚀 Triggered!
BODY: {"payload":{"inputFields":{"boardId":123,"itemId":456,"toPhoneColumn":"phone"}}}
boardId=123 itemId=456 toPhoneColumn=phone
📞 Sending 'hello_world' to 1234567890...
✅ Sent to +1234567890!
```

---

## Troubleshooting

### Issue: "Unauthorized field or type"

**Cause**: Missing OAuth scopes

**Solution**: 
1. Add `boards:read` and `items:read` scopes in Developer Center
2. Reinstall the app to your workspace

---

### Issue: "Missing itemId or toPhoneColumn"

**Cause**: Input fields not mapped correctly in automation recipe

**Solution**:
1. Ensure `boardId` and `itemId` are set to **"Trigger Output"** source
2. Delete and re-add the action in your automation
3. Re-save the automation

---

### Issue: "Invalid phone format"

**Cause**: Phone number contains non-numeric characters or is too short

**Solution**:
- Ensure phone numbers are in international format: `+1234567890`
- Monday Phone columns return JSON: `{"phone": "+1234567890", "countryShortName": "US"}`
- The app automatically parses and cleans this format

---

### Issue: WhatsApp API returns error

**Cause**: Invalid template name, phone number, or access token

**Solution**:
1. Verify `WHATSAPP_ACCESS_TOKEN` is a **Permanent Token** (not temporary)
2. Verify `WHATSAPP_PHONE_ID` matches your Business Phone Number ID
3. Ensure template name exists and is approved in Meta Business Manager
4. Check phone number is registered for WhatsApp

---

## Scripts

| Command              | Description                                      |
|----------------------|--------------------------------------------------|
| `npm run dev-server` | Run locally with ngrok tunnel                    |
| `npm run build`      | Compile TypeScript and build client              |
| `npm run deploy`     | Deploy to Monday Code hosting                    |
| `npm start`          | Start production server                          |
| `mapps code:logs`    | View live logs from deployed app                 |

---

## Production Deployment Details

- **Hosting**: Monday Code (secure, managed hosting)
- **Base URL**: `https://adfcb-service-32341656-d3b021e1.us.monday.app`
- **Run URL**: `https://adfcb-service-32341656-d3b021e1.us.monday.app/api/monday/action_send_message`
- **Environment**: Node.js runtime with automatic scaling

---

## Security Best Practices

- ✅ All secrets stored as environment variables
- ✅ JWT authentication on all endpoints
- ✅ Monday signing secret verification
- ✅ No credentials in source code
- ✅ HTTPS-only communication
- ✅ Input validation and sanitization

---

## Future Enhancements

- [ ] Support for media templates (images, documents)
- [ ] Multi-language template support
- [ ] Delivery status webhooks
- [ ] Bulk message sending
- [ ] Message scheduling
- [ ] Analytics dashboard

---

## License

UNLICENSED - Private project

---

## Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review logs with `mapps code:logs`
3. Consult [Monday.com Developer Docs](https://developer.monday.com)
4. Consult [WhatsApp Business API Docs](https://developers.facebook.com/docs/whatsapp)

---

**Built with ❤️ for Monday.com automation**
