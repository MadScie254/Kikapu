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

/**
 * Real Khetia (Gigamart Kitale) receipt format: each item is printed across
 * TWO lines (description, then "productCode qty UOM unitPrice lineTotal"),
 * surrounded by a "Label: value" header/footer block and a per-tax-code
 * breakdown table. Before the two-line parser and the metadata/VAT-row
 * fixes, this receipt produced phantom items from the Mobile:/Branch:
 * header line, the MPESA DETAILS block, and the VAT breakdown rows.
 */
export const KHETIA_TWO_LINE_ITEMS = `KHETIA GIGAMART
KITALE, Kenya
P.O. Box 668, Kitale,
Mobile: +254 708 888333 /+254 786 838383 gigamart@khetia.com
CASH SALE
VAT Reg: 00014695Q Pin No. P000628476L
Date: 08:24pm Sun 01 November 2026
Branch: 69 Till: 3 Session: 1159 Rct: 339
SELINA NALIKA WANGWE
Item          Qty      Each      Total
BREAD OVEN FRESH 800G WHITE                A
0013.12.02    1.000 PC    113.00      113.00
BREAD OVEN FRESH WHITE 1.5KG                A
0013.12.02    1.000 PC    234.00      234.00
MILK LATO WHOLE 500ML FINO                  A
0015.12.00    2.000 PC     80.00      160.00
FRUIT FRESH KIWI                            E
0023.11.00    2.000 PC    144.00      288.00
FRUIT FRESH GRANNY SMITH APPLE (KG)         E
0024.11.00    0.400 KG    434.00      173.60
FRUIT FRESH PINK LADY APPLE (KG)            E
0024.11.00    0.105 KG    455.00       47.78
CUCUMBER ENGLISH FRESH(KAKDI)1KG            E
0023.11.00    0.225 KG    188.00       42.30
VEGETABLE BHINDA OKRA                       E
0023.11.00    0.375 KG    234.00       87.75
TOTAL                                    1,146.43
CASH PAID                                    0.00
MPESA PAY                                1,147.00
CHANGE                                       0.57
Total Qty : 7.11 units
Gross Wt : 1.45 kgs (approx.)
Cashier : WAKOLI
Supervisor: Ramsley
MPESA DETAILS
Name : Daniel
Mobile No. : 2f84f5c4a805e56ee4c18d589
MPESA Trn # : UK1HL04YT2
Amount : 1,147.00
CODE   PRE-VAT    VAT    TOTAL
A - 0.00%     507.00    0.00    507.00
E - 0.00%     639.43    0.00    639.43
TOTALS      1,146.43    0.00  1,146.43`;

/** Same Khetia chain/format, mixed PC-counted and non-decimal barcode product codes, cash payment. */
export const KHETIA_BARCODE_CODES = `KHETIA DRAPERS LTD.
KHETIA'S WEBUYE
P.O. Box 668, Kitale, Kenya
Mobile: +254 708 888333 /+254 786 838383 gigamart@khetia.com
CASH SALE
VAT Reg: 00014695Q Pin No. P000628476L
Date: 07:19pm Sun 01 November 2026
Branch: 69 Till: 2 Session: 855 Rct: 357
SELINA NALIKA WANGWE
Item          Qty      Each      Total
BULB ENERGY SAVELITE 4.5W B22 COOL DAY      G
331837        2.000 PC     90.00      180.00
BREAD OVEN FRESH 600G WHITE                 A
0013.12.02    1.000 PC     88.00       88.00
DRINK ENERGY MONSTER ENERGY 500ML           G
433881        1.000 PC    235.00      235.00
TOTAL                                      503.00
CASH PAID                                  600.00
CHANGE                                      97.00
Total Qty : 4.00 units
Gross Wt : 0.20 kgs (approx.)
Cashier : FAITH.NM
Supervisor: Josiah
CODE   PRE-VAT    VAT    TOTAL
A - 0.00%      88.00    0.00     88.00
G - 16.00%    357.76   57.24    415.00
TOTALS       445.76    57.24    503.00`;
