/** Synthetic Kenyan supermarket/retail receipt OCR text, used across parser tests. */

/** Cash payment, VAT already included in the shelf prices (common on Kenyan supermarket receipts). */
export const NAIVAS_CLEAN = `NAIVAS SUPERMARKET
KILIMANI BRANCH
TEL: 0700 000 000
PIN: P000000000A
------------------------------
12/11/2026  18:42
------------------------------
COOKING OIL 2L        650.00
MAIZE FLOUR 2KG  2 X  190.00  380.00
MILK 500ML       3 X   65.00  195.00
SUKUMA WIKI            40.00
BATHING SOAP     2 X   85.00  170.00
------------------------------
SUBTOTAL             1,435.00
VAT 16%                198.00
TOTAL                1,435.00
CASH                 1,500.00
CHANGE                  65.00
THANK YOU, SHOP AGAIN`;

/** Same basket, paid via M-Pesa; the confirmation code must never be read as an item or amount. */
export const MPESA_PAYMENT_RECEIPT = `NAIVAS SUPERMARKET
KILIMANI BRANCH
12/11/2026  18:42
COOKING OIL 2L        650.00
SUKUMA WIKI            40.00
SUBTOTAL                690.00
TOTAL                   690.00
M-PESA REF: QGH7X9K2L1
THANK YOU, SHOP AGAIN`;

/** VAT charged additively on top of the subtotal (not already included in item prices). */
export const QUICKMART_VAT_ADDITIVE = `QUICKMART LTD
MOMBASA ROAD
Date: 2026-10-02
RICE 5KG               850.00
CHICKEN 1KG             550.00
WASHING POWDER 1KG      350.00
SUBTOTAL              1,750.00
VAT                     280.00
TOTAL                 2,030.00
VISA PAYMENT          2,030.00`;

/** Faded / noisy OCR output with common character confusions (O/0, S/5). */
export const FADED_RECEIPT_NOISY = `CHANDARANA FOODPLUS
12-O1-2O26
BREAD WHITE 4OOG       85.OO
EGGS TRAY             42O.OO
TOTAL                 5O5.OO
CASH                  6OO.OO
CHANGE                 95.OO`;

/** A receipt with no recognizable date at all. */
export const NO_DATE_RECEIPT = `CORNER SHOP
SODA 500ML             60.00
BISCUITS               45.00
TOTAL                 105.00`;

/** A receipt whose printed total doesn't match the line items (should be flagged, not silently trusted). */
export const MISMATCHED_TOTAL_RECEIPT = `TUSKYS
01/03/2026
SUGAR 2KG              230.00
TEA LEAVES 500G        180.00
SUBTOTAL               410.00
TOTAL                  520.00`;
