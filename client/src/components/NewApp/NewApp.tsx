import React, { useEffect, useState } from "react";
import mondaySdk, { MondayClientSdk } from "monday-sdk-js";
import { AttentionBox, Button, Dropdown, TextArea } from "@vibe/core";
import "./NewApp.css";

const monday: MondayClientSdk = mondaySdk();
const BUYERS_BOARD_ID = process.env.REACT_APP_BUYERS_BOARD_ID || "5024227503";
const SUPPLIERS_BOARD_ID = process.env.REACT_APP_SUPPLIERS_BOARD_ID || "5024227503";
const BUSINESS_UNITS_BOARD_ID = process.env.REACT_APP_BUSINESS_UNITS_BOARD_ID || "5024662780";

console.log("🔍 Board IDs Configuration:");
console.log("  - Buyers Board:", BUYERS_BOARD_ID);
console.log("  - Suppliers Board:", SUPPLIERS_BOARD_ID);
console.log("  - Business Units Board:", BUSINESS_UNITS_BOARD_ID);
console.log("  - Environment:", window.location.hostname);

interface DropdownOption {
    value: string;
    label: string;
}

const NewApp = () => {
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [buyers, setBuyers] = useState<DropdownOption[]>([]);
    const [thirdDropdownOptions, setThirdDropdownOptions] = useState<DropdownOption[]>([]);
    const [selectedBuyer, setSelectedBuyer] = useState<DropdownOption | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<DropdownOption | null>(null);
    const [selectedThirdOption, setSelectedThirdOption] = useState<DropdownOption | null>(null);
    const [selectedBankColumns, setSelectedBankColumns] = useState<string[]>([]);
    const [bankAccountDetails, setBankAccountDetails] = useState<string>("");
    const [error, setError] = useState<string>("");

    const categoryOptions: DropdownOption[] = [
        { value: "suppliers", label: "Suppliers" },
        { value: "business_units", label: "Business Units" }
    ];

    useEffect(() => {
        monday.execute("valueCreatedForUser");
        
        console.log("🔍 Token Check:");
        console.log("  - Hostname:", window.location.hostname);
        console.log("  - Is Localhost:", window.location.hostname === "localhost");
        console.log("  - Has .env token:", !!process.env.REACT_APP_MONDAY_TOKEN);
        
        // For local testing, use token from .env
        if (window.location.hostname === "localhost" && process.env.REACT_APP_MONDAY_TOKEN) {
            console.log("✅ Setting token from .env for local testing");
            monday.setToken(process.env.REACT_APP_MONDAY_TOKEN);
        }
        
        fetchBuyers();
    }, []);

    // Fetch third dropdown options when category changes
    useEffect(() => {
        if (selectedCategory) {
            setSelectedThirdOption(null); // Reset third dropdown
            fetchThirdDropdownOptions(selectedCategory.value);
        } else {
            setThirdDropdownOptions([]);
        }
    }, [selectedCategory]);

    // Fetch bank account details when third option changes and category is Business Units
    useEffect(() => {
        if (selectedThirdOption && selectedCategory?.value === "business_units") {
            fetchBankAccountDetails(selectedThirdOption.value);
        } else {
            setBankAccountDetails("");
        }
    }, [selectedThirdOption, selectedCategory]);

    // Fetch bank account details when bank columns selection changes for Suppliers
    useEffect(() => {
        if (selectedThirdOption && selectedCategory?.value === "suppliers" && selectedBankColumns.length > 0) {
            fetchSupplierBankDetails(selectedThirdOption.value, selectedBankColumns);
        } else if (selectedCategory?.value === "suppliers") {
            setBankAccountDetails("");
        }
    }, [selectedBankColumns, selectedThirdOption, selectedCategory]);

    const fetchBuyers = async () => {
        try {
            setInitialLoading(true);
            console.log("=== FETCH BUYERS DEBUG ===");
            console.log("Board ID:", BUYERS_BOARD_ID);
            
            const query = `query { 
                boards(ids: ${BUYERS_BOARD_ID}) { 
                    items_page { 
                        items { 
                            id 
                            name 
                            column_values {
                                id
                                text
                                value
                            }
                        } 
                    } 
                } 
            }`;
            console.log("GraphQL Query:", query);
            
            const response = await monday.api(query);
            console.log("✅ API Response received:", JSON.stringify(response, null, 2));
            
            if (!response || !response.data) {
                throw new Error("Response has no data property. Check if token is valid.");
            }
            
            const items = response.data?.boards?.[0]?.items_page?.items || [];
            console.log("Total items found:", items.length);
            
            // Filter only items where Group = "Buyer"
            const buyerItems = items.filter((item: any) => {
                const groupColumn = item.column_values.find((col: any) => 
                    col.text?.toLowerCase() === "buyer"
                );
                return !!groupColumn;
            });
            
            console.log("Buyer group items found:", buyerItems.length);
            
            if (buyerItems.length === 0) {
                setError("No buyers found in board.");
            } else {
                setError("");
            }
            
            const buyerOptions = buyerItems.map((item: any) => ({
                value: item.id,
                label: item.name
            }));
            
            console.log("✅ Buyer options created:", buyerOptions);
            setBuyers(buyerOptions);
        } catch (error: any) {
            console.error("❌ ERROR in fetchBuyers:", error);
            setError(`Error: ${error.message || "Failed to fetch buyers"}`);
        } finally {
            setInitialLoading(false);
        }
    };

    const fetchThirdDropdownOptions = async (category: string) => {
        try {
            console.log("=== FETCH THIRD DROPDOWN OPTIONS ===");
            console.log("Category:", category);
            
            let boardIds: string[] = [];
            
            if (category === "suppliers") {
                boardIds = [BUYERS_BOARD_ID, SUPPLIERS_BOARD_ID];
                console.log("Fetching Suppliers");
            } else if (category === "business_units") {
                boardIds = [BUSINESS_UNITS_BOARD_ID];
                console.log("Fetching Business Units");
            }
            
            console.log("Board IDs:", boardIds);
            
            const query = `query { 
                boards(ids: [${boardIds.join(", ")}]) { 
                    items_page { 
                        items { 
                            id 
                            name 
                            column_values {
                                id
                                text
                                value
                            }
                        } 
                    } 
                } 
            }`;
            console.log("GraphQL Query:", query);
            
            const response = await monday.api(query);
            console.log("✅ API Response:", JSON.stringify(response, null, 2));
            
            if (!response || !response.data) {
                throw new Error("Response has no data property.");
            }
            
            // Combine items from all boards
            const allItems: any[] = [];
            response.data.boards?.forEach((board: any) => {
                const items = board?.items_page?.items || [];
                allItems.push(...items);
            });
            
            console.log("Total items found:", allItems.length);
            
            // Filter by group type for suppliers
            let filteredItems = allItems;
            if (category === "suppliers") {
                filteredItems = allItems.filter((item: any) => {
                    const groupColumn = item.column_values.find((col: any) => 
                        col.text?.toLowerCase() === "supplier"
                    );
                    return !!groupColumn;
                });
                console.log("Supplier group items found:", filteredItems.length);
            }
            
            const options = filteredItems.map((item: any) => ({
                value: item.id,
                label: item.name
            }));
            
            console.log("✅ Third dropdown options:", options);
            setThirdDropdownOptions(options);
        } catch (error: any) {
            console.error("❌ ERROR in fetchThirdDropdownOptions:", error);
            setError(`Error: ${error.message || "Failed to fetch options"}`);
        }
    };

    const fetchBankAccountDetails = async (itemId: string) => {
        try {
            console.log("=== FETCH BANK ACCOUNT DETAILS ===");
            console.log("Item ID:", itemId);
            console.log("Board ID:", BUSINESS_UNITS_BOARD_ID);
            
            const query = `query {
                items(ids: [${itemId}]) {
                    id
                    name
                    column_values {
                        id
                        text
                        value
                    }
                }
            }`;
            
            console.log("GraphQL Query:", query);
            
            const response = await monday.api(query);
            console.log("✅ API Response:", JSON.stringify(response, null, 2));
            
            if (!response || !response.data) {
                throw new Error("Response has no data property.");
            }
            
            const item = response.data.items?.[0];
            if (!item) {
                console.log("⚠️ No item found");
                setBankAccountDetails("Business unit item not found");
                return;
            }
            
            console.log("Item columns:", item.column_values);
            
            const bankColumn = item.column_values.find((col: any) => 
                (col.text && col.text.toLowerCase().includes("bank")) ||
                col.id.toLowerCase().includes("bank")
            );
            
            if (bankColumn) {
                console.log("✅ Bank Account Details found:", bankColumn);
                const bankDetails = bankColumn.text || bankColumn.value || "";
                if (bankDetails && bankDetails !== "null" && bankDetails !== "{}") {
                    setBankAccountDetails(bankDetails);
                } else {
                    setBankAccountDetails("Value not found in column");
                }
            } else {
                console.log("⚠️ Bank Account Details column not found");
                console.log("Available columns:", item.column_values.map((c: any) => ({ id: c.id, text: c.text })));
                setBankAccountDetails("Value not found in column");
            }
        } catch (error: any) {
            console.error("❌ ERROR in fetchBankAccountDetails:", error);
            setError(`Error: ${error.message || "Failed to fetch bank details"}`);
            setBankAccountDetails("Error loading bank details");
        }
    };

    const fetchSupplierBankDetails = async (itemId: string, selectedColumns: string[]) => {
        try {
            console.log("=== FETCH SUPPLIER BANK DETAILS ===");
            console.log("Item ID:", itemId);
            console.log("Selected Columns:", selectedColumns);
            
            // First, get board structure to find column IDs by title
            const boardQuery = `query {
                boards(ids: [${BUYERS_BOARD_ID}]) {
                    columns {
                        id
                        title
                        type
                    }
                }
            }`;
            
            const boardResponse = await monday.api(boardQuery);
            const columns = boardResponse.data?.boards?.[0]?.columns || [];
            console.log("Board columns:", columns.map((c: any) => ({ id: c.id, title: c.title })));
            
            // Find column IDs by matching titles
            const columnIds: string[] = [];
            selectedColumns.forEach(colName => {
                const column = columns.find((col: any) => 
                    col.title?.toLowerCase() === colName.toLowerCase()
                );
                if (column) {
                    columnIds.push(column.id);
                    console.log(`✅ Found column "${colName}" with ID: ${column.id}`);
                } else {
                    console.log(`⚠️ Column "${colName}" not found`);
                }
            });
            
            if (columnIds.length === 0) {
                console.log("❌ No matching columns found");
                setBankAccountDetails("Selected columns not found");
                return;
            }
            
            // Now fetch the item data
            const query = `query {
                items(ids: [${itemId}]) {
                    id
                    name
                    column_values {
                        id
                        text
                        value
                    }
                }
            }`;
            
            const response = await monday.api(query);
            console.log("✅ API Response:", JSON.stringify(response, null, 2));
            
            if (!response || !response.data) {
                throw new Error("Response has no data property.");
            }
            
            const item = response.data.items?.[0];
            if (!item) {
                console.log("⚠️ No item found");
                return;
            }
            
            const bankDetails: string[] = [];
            
            columnIds.forEach((colId, index) => {
                const column = item.column_values.find((col: any) => col.id === colId);
                
                if (column) {
                    const value = column.text || column.value || "";
                    if (value && value !== "null" && value !== "{}") {
                        bankDetails.push(`${selectedColumns[index]}:\n${value}`);
                        console.log(`✅ Found data for ${selectedColumns[index]}:`, value);
                    } else {
                        bankDetails.push(`${selectedColumns[index]}:\nNo data available in this column`);
                        console.log(`⚠️ Column ${selectedColumns[index]} is empty`);
                    }
                } else {
                    bankDetails.push(`${selectedColumns[index]}:\nColumn not found`);
                    console.log(`❌ Column ${selectedColumns[index]} not found in item`);
                }
            });
            
            const mergedDetails = bankDetails.join("\n\n");
            console.log("✅ Merged Bank Details:", mergedDetails);
            setBankAccountDetails(mergedDetails);
        } catch (error: any) {
            console.error("❌ ERROR in fetchSupplierBankDetails:", error);
            setError(`Error: ${error.message || "Failed to fetch supplier bank details"}`);
        }
    };

    const handleBankColumnToggle = (columnName: string) => {
        setBankAccountDetails(""); // Clear immediately when selection changes
        setSelectedBankColumns(prev => {
            if (prev.includes(columnName)) {
                return prev.filter(col => col !== columnName);
            } else {
                return [...prev, columnName];
            }
        });
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            console.log("=== FORM SUBMISSION ===");
            console.log("Selected Buyer:", selectedBuyer);
            console.log("Selected Category:", selectedCategory);
            console.log("Selected Third Option:", selectedThirdOption);
            console.log("Bank Account Details:", bankAccountDetails);
            
            if (!selectedBuyer) {
                setError("Please select a buyer");
                return;
            }
            
            // Fetch buyer's phone number from "Office Phone" column
            console.log("=== FETCHING BUYER PHONE NUMBER ===");
            
            // First, get the board structure to find column names
            const boardQuery = `query {
                boards(ids: [${BUYERS_BOARD_ID}]) {
                    columns {
                        id
                        title
                        type
                    }
                }
            }`;
            
            const boardResponse = await monday.api(boardQuery);
            console.log("✅ Board Structure:", JSON.stringify(boardResponse, null, 2));
            
            const columns = boardResponse.data?.boards?.[0]?.columns || [];
            console.log("All columns:", columns.map((c: any) => ({ id: c.id, title: c.title, type: c.type })));
            
            const officePhoneColumn = columns.find((col: any) => 
                col.title?.toLowerCase().includes('office') && col.type === 'phone'
            );
            
            if (!officePhoneColumn) {
                console.log("Available phone columns:", columns.filter((c: any) => c.type === 'phone'));
                throw new Error("Office Phone column not found in board structure");
            }
            
            console.log("✅ Found Office Phone column ID:", officePhoneColumn.id, "Title:", officePhoneColumn.title);
            
            // Now fetch the item with that specific column
            const phoneQuery = `query {
                items(ids: [${selectedBuyer.value}]) {
                    id
                    name
                    column_values {
                        id
                        text
                        value
                    }
                }
            }`;
            
            const phoneResponse = await monday.api(phoneQuery);
            console.log("✅ Phone API Response:", JSON.stringify(phoneResponse, null, 2));
            
            if (!phoneResponse || !phoneResponse.data) {
                throw new Error("Failed to fetch buyer phone number");
            }
            
            const buyerItem = phoneResponse.data.items?.[0];
            if (!buyerItem) {
                throw new Error("Buyer item not found");
            }
            
            console.log("Buyer columns:", buyerItem.column_values);
            
            // Find the Office Phone column using the ID we got from board structure
            const phoneColumn = buyerItem.column_values.find((col: any) => 
                col.id === officePhoneColumn.id
            );
            
            console.log("Found phone column:", phoneColumn);
            
            if (!phoneColumn || !phoneColumn.text) {
                console.log("Available columns:", buyerItem.column_values.map((c: any) => ({ id: c.id, text: c.text })));
                throw new Error("Office Phone column not found or empty");
            }
            
            const phoneNumber = phoneColumn.text.replace(/[^0-9]/g, '');
            console.log("✅ Phone number found:", phoneNumber);
            
            if (!phoneNumber || phoneNumber.length < 10) {
                throw new Error("Invalid phone number format");
            }
            
            // Send WhatsApp message with bank details
            console.log("=== SENDING WHATSAPP MESSAGE ===");
            const whatsappPayload = {
                buyerName: selectedBuyer.label,
                businessUnitName: selectedThirdOption?.label || "",
                bankDetails: bankAccountDetails,
                phoneNumber: phoneNumber
            };
            
            console.log("WhatsApp Payload:", whatsappPayload);
            
            // Call backend API to send WhatsApp message
            const backendUrl = window.location.hostname === 'localhost' 
                ? 'http://localhost:8080' 
                : ''; // Use relative URL when deployed
            const sendResponse = await fetch(`${backendUrl}/api/monday/send_bank_details`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(whatsappPayload)
            });
            
            const sendResult = await sendResponse.json();
            console.log("✅ WhatsApp Send Result:", sendResult);
            
            if (sendResponse.ok) {
                alert(`✅ WhatsApp message sent successfully to ${selectedBuyer.label}!`);
            } else {
                throw new Error(sendResult.message || "Failed to send WhatsApp message");
            }
        } catch (error: any) {
            console.error("❌ ERROR in handleSubmit:", error);
            setError(`Error: ${error.message}`);
            alert(`❌ Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="new-app-container">
            {initialLoading ? (
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p className="loading-text">Loading...</p>
                </div>
            ) : (
                <>
                    <div className="content">
                        <h2>Send Bank Details</h2>
                
                <div className="card">
                    <div className="row">
                        <div className="col">
                            <div className="form-group">
                                <label>Select Buyer</label>
                                <Dropdown
                                    placeholder="Choose a buyer"
                                    options={buyers}
                                    value={selectedBuyer}
                                    onChange={setSelectedBuyer}
                                />
                                <p className="form-stats">{buyers.length} buyers available</p>
                            </div>
                        </div>
                        <div className="col">
                            <div className="form-group">
                                <label>Select Category</label>
                                <Dropdown
                                    placeholder="Choose category"
                                    options={categoryOptions}
                                    value={selectedCategory}
                                    onChange={setSelectedCategory}
                                />
                            </div>
                        </div>
                    </div>

                    {selectedCategory && (
                        <div className="row">
                            <div className="col">
                                <div className="form-group">
                                    <label>
                                        {selectedCategory.value === "suppliers" 
                                            ? "Select Supplier" 
                                            : "Select Business Unit"}
                                    </label>
                                    <Dropdown
                                        placeholder={`Choose ${selectedCategory.label}`}
                                        options={thirdDropdownOptions}
                                        value={selectedThirdOption}
                                        onChange={setSelectedThirdOption}
                                    />
                                    <p className="form-stats">{thirdDropdownOptions.length} options available</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {selectedCategory && selectedCategory.value === "suppliers" && selectedThirdOption && (
                        <div className="row">
                            <div className="col">
                                <div className="form-group">
                                    <label>Select Bank Account Details</label>
                                    <div className="checkbox-group">
                                        <label className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={selectedBankColumns.includes('Bank Account Details 1')}
                                                onChange={() => handleBankColumnToggle('Bank Account Details 1')}
                                            />
                                            Bank Account Details 1
                                        </label>
                                        <label className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={selectedBankColumns.includes('Bank Account Details 2')}
                                                onChange={() => handleBankColumnToggle('Bank Account Details 2')}
                                            />
                                            Bank Account Details 2
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {selectedCategory && selectedCategory.value === "suppliers" && selectedBankColumns.length > 0 && (
                        <div className="row">
                            <div className="col">
                                <div className="form-group">
                                    <label>Bank Account Details</label>
                                    <TextArea
                                        value={bankAccountDetails}
                                        onChange={(value: string) => setBankAccountDetails(value)}
                                        placeholder="Bank account details will appear here..."
                                        rows={6}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {selectedCategory && selectedCategory.value === "business_units" && selectedThirdOption && (
                        <div className="row">
                            <div className="col">
                                <div className="form-group">
                                    <label>Bank Account Details</label>
                                    <TextArea
                                        value={bankAccountDetails}
                                        onChange={(value: string) => setBankAccountDetails(value)}
                                        placeholder="Bank account details will appear here..."
                                        rows={4}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="button-container">
                    <Button 
                        onClick={handleSubmit} 
                        loading={loading}
                        disabled={
                            loading || 
                            !selectedBuyer || 
                            !selectedCategory || 
                            !selectedThirdOption || 
                            !bankAccountDetails ||
                            bankAccountDetails === "Value not found in column" ||
                            bankAccountDetails === "Error loading bank details" ||
                            bankAccountDetails === "Business unit item not found" ||
                            bankAccountDetails === "Selected columns not found" ||
                            bankAccountDetails.includes("No data available in this column") ||
                            bankAccountDetails.includes("Column not found") ||
                            ((selectedCategory?.value === "suppliers") && selectedBankColumns.length === 0)
                        }
                    >
                        {loading ? "Sending..." : "Send via WhatsApp"}
                    </Button>
                </div>
            </div>
                    
            {error && (
                <AttentionBox
                    title="Notice"
                    text={error}
                    type="warning"
                />
            )}
            </>
            )}
        </div>
    );
};

export default NewApp;
