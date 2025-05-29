# Bill Splitter: AI-Powered Bill Splitting for Splitwise

**Objective:** To simplify and automate the process of splitting shared expenses, especially itemized bills like groceries, by leveraging AI for data extraction and seamlessly integrating with Splitwise for expense tracking. This project aims to overcome the limitations of manual item-by-item splitting in existing tools, saving users time and effort.

## Problem Solved

Manually splitting bills with multiple items among different people can be tedious and error-prone. Existing tools like Splitwise are excellent for tracking shared expenses, but often lack the granularity to easily divide individual items on a receipt among specific group members. This application addresses that gap by:

*   Automating the extraction of items and prices from receipts.
*   Providing a clear, guided workflow for assigning items to individuals.
*   Syncing the detailed split back to Splitwise, maintaining a familiar expense tracking environment.

## Features

*   **🤖 AI-Powered Receipt Scanning:**
    *   Upload photos of your receipts.
    *   Our AI automatically extracts items, quantities, and prices, minimizing manual data entry and saving you time.
*   **✨ Guided Bill Splitting Workflow:**
    *   A user-friendly, step-by-step process ensures all items are accounted for.
    *   Easily select the expense group and members involved.
    *   Assign individual items (or portions of items) to specific people.
    *   Review the complete split breakdown before finalizing, ensuring accuracy.
*   **🔐 Splitwise User Authentication:**
    *   Connect your Splitwise account securely.
    *   Secure user registration and login (e.g., using NextAuth) to protect your data and manage your connections.
*   **📱 Responsive & Modern UI:**
    *   Built with Tailwind CSS and Shadcn UI for a clean, accessible, and responsive experience across devices (desktop, tablet, mobile).

## How It Works (User Workflow Example)

1.  **Login/Register:** Create an account or log in.
2.  **Connect Splitwise:** Authorize the application to access your Splitwise account.
3.  **Upload Receipt:** Take a photo or upload an image of your bill.
4.  **AI Extraction & Review:** The AI extracts items and prices. Review and make any necessary corrections (Future Scope).
5.  **Select Group & Members:** Choose the relevant Splitwise group and confirm the members involved in this specific bill.
6.  **Assign Items:** Go through the list of extracted items and assign each one to the respective member(s) who consumed or are responsible for it.
7.  **Review Split:** See a summary of who owes what based on the itemized assignments.
8.  **Finalize & Sync:** Confirm the split. The expense, with its detailed itemization (as a detailed note), is then created or updated in your Splitwise account.
