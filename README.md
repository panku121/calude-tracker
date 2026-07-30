# Claude Tool Tracker

Internal responsive survey for collecting Claude plan, usage, cost, and benefit details.

## Google Sheet setup

1. Open the existing spreadsheet and go to **Extensions → Apps Script**.
2. Replace the script with `google-apps-script.gs`.
3. Run `setupHeaders` once if setting up a new sheet.
4. Deploy the Apps Script as a **new web app version**.

Existing sheet data is preserved. On the first new submission, the script ensures column 12 is
named `Form Source`; Claude submissions are stored there as `Claude user form`.
