# 🚀 WhatsApp Business API: Complete Setup Guide for Kaarthika Trading Company

This guide covers every step required to go from having nothing to having a fully functional WhatsApp Business API account ready to send automated "Utility" templates.

---

## Phase 1: The Basics (Email & Facebook)

### Step 1: Create a Business Gmail Account
Set up a dedicated email for your business.
1. Go to `accounts.google.com/signup`.
2. **What to fill in the fields:**
   * **First name:** Kaarthika
   * **Last name:** Trading
   * **Username:** `kaarthikatradingcompany@gmail.com` (or similar if taken)
   * **Password:** (Create a strong password and save it)
3. Verify your phone number to complete the setup.

### Step 2: Create a Personal Facebook Account
*Note: Meta requires a personal Facebook account to manage business assets.*
1. Go to `facebook.com` and click **Create New Account**.
2. **What to fill in the fields:**
   * **First name:** (Your real first name)
   * **Surname:** (Your real last name)
   * **Mobile number or email address:** Enter the Gmail you just created.
   * **Date of birth:** (Your real date of birth)
   * **Gender:** (Select your gender)
> **⚠️ CRITICAL WARNING FOR NEW ACCOUNTS:** Facebook's anti-spam bots block brand-new accounts from creating Business Pages immediately. If you just created this today, add a profile picture and wait **24 to 48 hours** before doing Step 3. If you have an older, existing Facebook account, use that instead!

### Step 3: Create a Facebook Business Page
Meta needs proof that your business exists.
1. Log into your Facebook account, go to the left menu, click **Pages** > **Create New Page**.
2. **What to fill in the fields:**
   * **Page name (required):** Kaarthika Trading Company *(Must be typed exactly like this)*
   * **Category (required):** Type "Commercial & Industrial" or "Trading" and select the best match.
   * **Bio (optional):** "Official page for Kaarthika Trading Company."
3. Click **Create Page**.
4. Copy the link to this page from your browser's top bar (e.g., `https://www.facebook.com/profile.php?id=...`). You will need this link later.

---

## Phase 2: Meta Developer & WhatsApp Setup

### Step 4: Register as a Meta Developer
1. Go to `developers.facebook.com` and log in.
2. Click **Get Started** or **My Apps** in the top right.
3. **What to fill in the fields:**
   * **Verify Account:** Enter the code sent to your email or phone.
   * **About You:** Select "Developer" or "Business Owner".

### Step 5: Create a WhatsApp App
1. Inside the Developer Dashboard, click **Create App**.
2. **What to fill in the fields:**
   * **Use case:** Select "Other", then click Next.
   * **App Type:** Select "Business", then click Next.
   * **App name:** Kaarthika Trading API
   * **App contact email:** `kaarthikatradingcompany@gmail.com`
   * **Business Account:** Leave as "No Business Manager account selected" (Meta will create one automatically).
3. Click **Create App**.
4. Scroll down to find the **WhatsApp** box and click **Set Up**.

### Step 6: Add Your Phone Number & Verify Business
1. On the WhatsApp "Getting Started" screen, click **Add phone number**.
2. **What to fill in the fields:**
   * **Business name:** Kaarthika Trading Company
   * **Business website or profile page:** Paste the Facebook Page link you copied in Step 3.
   * **Country:** Select "India"
   * **Timezone:** Select "Asia/Kolkata"
3. Click Next.
4. **WhatsApp Business Profile:**
   * **WhatsApp Business Profile Display Name:** Kaarthika Trading
   * **Category:** Other (or Retail/Trading)
5. Enter the exact phone number you want to use for WhatsApp and verify it with the OTP.

---

## Phase 3: Billing & Permanent Access

### Step 7: Add a Payment Method (Credit Card)
1. Go to `business.facebook.com` and log in.
2. Click the **Gear Icon (Settings)** > **Business Settings**.
3. On the left menu, click **Billing & payments** > **Add payment method**.
4. **What to fill in the fields:**
   * **Country/region:** India
   * **Currency:** Indian Rupee (INR)
   * **Time zone:** Kolkata, Asia (GMT+05:30)
   * **Name on card:** (The name printed on your bank card)
   * **Card number, Expiry, CVV:** (Your card details)

### Step 8: Link Card to WhatsApp
1. On the bottom half of the "Billing & payments" screen, click the **WhatsApp Business accounts** tab.
2. Select "Kaarthika Trading Company" from the dropdown.
3. Assign the credit card you just added.

### Step 9: Generate a Permanent Access Token
1. Go back to **Business Settings** > **Users** > **System Users**.
2. Click **Add**. 
3. **What to fill in the fields:**
   * **System user name:** Kaarthika Bot
   * **System user role:** Admin
4. Click **Create**, then click **Add Assets**.
   * **Asset type:** Select "Apps".
   * **Select asset:** Check the box next to "Kaarthika Trading API".
   * **App control:** Toggle on "Full Control (Manage App)". Click Save.
5. Click **Generate New Token**.
6. **What to fill in the fields:**
   * **App:** Kaarthika Trading API
   * **Token expiration:** Select "Never" (if the option exists) or "Permanent".
   * **Permissions:** Scroll down and check exactly these two boxes:
     1. `whatsapp_business_messaging`
     2. `whatsapp_business_management`
7. Click **Generate Token**.
> **⚠️ CRITICAL STEP:** Copy this long string of letters and numbers immediately! Paste it into a secure Notepad file. This is your Permanent Token. 

---

## Phase 4: Create Your First Message

### Step 10: Build a Utility Template
1. Go to your **WhatsApp Manager** (`business.facebook.com/wa/manage/`).
2. Click the **Message templates** icon on the left menu, then **Create template**.
3. **What to fill in the fields:**
   * **Category:** Utility
   * **Name:** `order_confirmation_1` *(Must be lowercase with underscores)*
   * **Language:** English (or English UK/US)
4. Click Continue.
5. **What to fill in the Message Body:**
   * Type your message. Example: "Hello {{1}}, thank you for choosing Kaarthika Trading Company. Your order for {{2}} has been confirmed."
6. Click **Submit**. Meta usually approves this in a few minutes!