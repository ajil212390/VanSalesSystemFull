-- SQL Import Script for Sundry Debtors with Opening Balance and Route
-- Run this directly in pgAdmin Query Tool or psql

BEGIN;

INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('NICE CATERING KUTTIADY', 21, 2000.00, 'DR', 0.00, 0.00, 2000.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('SALKARA HOTEL KUTTIADY', 21, 1000.00, 'DR', 0.00, 0.00, 1000.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01003', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('ASHOKA HOTEL KUTTIADY', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01004', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('DARUL RAHMA KODAKKAL', 21, 5140.00, 'DR', 0.00, 0.00, 5140.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01005', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('COFFEE HOUSE KADER', 21, 2650.00, 'DR', 0.00, 0.00, 2650.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01007', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('KAYANKANDI HOTEL KUTTIADY', 21, 86610.00, 'DR', 0.00, 0.00, 86610.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01008', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('KALATHIL RESTORENT KUTTIADY', 21, 16000.00, 'DR', 0.00, 0.00, 16000.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01009', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('KANNANS HOTEL KUMBALAM', 21, 100.00, 'DR', 0.00, 0.00, 100.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '010100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('Q CARE KUMBALAM', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '010102', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('THEERTHAS', 21, 2580.00, 'DR', 0.00, 0.00, 2580.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '010105', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('MAGNUS', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '010107', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('KADAVU RESTORENT KUTTIADY', 21, 50000.00, 'DR', 0.00, 0.00, 50000.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01010', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('PRAVEEN RAJAN', 21, 2660.00, 'DR', 0.00, 0.00, 2660.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '010111', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('CAKE FULLY', 21, 2000.00, 'DR', 0.00, 0.00, 2000.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '010114', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('CHAYA CAFE', 21, 1000.00, 'DR', 0.00, 0.00, 1000.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '010114', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('Hot&Spicy', 21, 160.00, 'DR', 0.00, 0.00, 160.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '010116', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('17KG KUTTIADY', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '010118', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('MAKKANI KUMBALAM', 21, 3360.00, 'DR', 0.00, 0.00, 3360.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '010119', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('CAKE REST KUMBALAM', 21, 5820.00, 'DR', 0.00, 0.00, 5820.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '010120', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('MEHFIL AUDITORIUM', 21, 12000.00, 'DR', 0.00, 0.00, 12000.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '010120', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('ACTIVE PLANET MANIMALA', 21, 15600.00, 'DR', 0.00, 0.00, 15600.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '010121', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('THALEEKKARA STORE', 21, 670.00, 'DR', 0.00, 0.00, 670.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '010125', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('LIKE POYILMUKK', 21, 4510.00, 'DR', 0.00, 0.00, 4510.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '010126', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('4KG KUTTIADY SALE', 21, 1500.00, 'DR', 0.00, 0.00, 1500.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '010127', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('KABABATE KUTTIADY', 21, 7310.00, 'DR', 0.00, 0.00, 7310.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '010128', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('PRADEESH MARKET KUTTIADY', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01012', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('KP TEA', 21, 7630.00, 'DR', 0.00, 0.00, 7630.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '010130', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('SHOBHIKA', 21, 100.00, 'DR', 0.00, 0.00, 100.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '010132', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('MAJEED MARKET KUTTIADY', 21, 6140.00, 'DR', 0.00, 0.00, 6140.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01013', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('THANIMA HOTEL KUTTIADY', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '010144', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('OTI THATTUKADA', 21, 2670.00, 'DR', 0.00, 0.00, 2670.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '010145', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('REENA HOTEL KUTTIADY', 21, 5160.00, 'DR', 0.00, 0.00, 5160.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01014', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('JISHA HOTEL KUTTIADY', 21, 4650.00, 'DR', 0.00, 0.00, 4650.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01015', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('SAMTHRIPTHY KUMBALAM', 21, 1200.00, 'DR', 0.00, 0.00, 1200.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01016', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('CKM FOOD VALAYANNUR', 21, 5000.00, 'DR', 0.00, 0.00, 5000.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01017', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('THATTUKADA NARIKUTUNCHAL', 21, 2510.00, 'DR', 0.00, 0.00, 2510.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01019', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('NICE CATERING KAYAKKODI', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01020', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('BAMBOO HOTEL KUTTIADY', 21, 12000.00, 'DR', 0.00, 0.00, 12000.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01022', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('LIVE KADEKACHAL', 21, 49000.00, 'DR', 0.00, 0.00, 49000.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01024', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('BERRYZ KUTTIADY', 21, 10000.00, 'DR', 0.00, 0.00, 10000.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01025', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('SIRAJUL HUDA OTHYOT', 21, 141360.00, 'DR', 0.00, 0.00, 141360.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01027', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('LAWISH CAFE KUTTIADY', 21, 4000.00, 'DR', 0.00, 0.00, 4000.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01028', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('YUMMY KUTTIADY', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01029', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('IRISH MANDI KUTTIADY', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01030', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('VIBES  KUTTIADY', 21, 12800.00, 'DR', 0.00, 0.00, 12800.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01031', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('MAZAYA SHAWAYA KUTTIADY', 21, 70090.00, 'DR', 0.00, 0.00, 70090.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01032', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('SUNDARAN KARANDOD', 21, 910.00, 'DR', 0.00, 0.00, 910.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01033', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('ZINGER CAFE KUTTIADY', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01034', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('RAYDAN MANDI KUTTIADY', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01036', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('ROLEX ADUKATH', 21, 5570.00, 'DR', 0.00, 0.00, 5570.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01037', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('FAMILY FOODCOURT(NAJAF)', 21, 13000.00, 'DR', 0.00, 0.00, 13000.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01038', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('SAFARI HOTEL KUTTIADY', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01039', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('CHICKEES RESTORENT KUTTIADY', 21, 76000.00, 'DR', 0.00, 0.00, 76000.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01040', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('HOMELY MEALS KUMBALAM', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01041', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('OLIVE KANJIROLI', 21, 2540.00, 'DR', 0.00, 0.00, 2540.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01042', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('ORCHID KANJIROLI', 21, 4090.00, 'DR', 0.00, 0.00, 4090.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01043', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('ADEN MANDI KUMBALAM', 21, 1060.00, 'DR', 0.00, 0.00, 1060.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01044', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('KRISHNA HOTEL KUTTIADY', 21, 22000.00, 'DR', 0.00, 0.00, 22000.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01045', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('THATTUKADA KUMBALAM', 21, 2740.00, 'DR', 0.00, 0.00, 2740.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01046', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('KANDATHIL HOTEL KUTTIADY', 21, 27850.00, 'DR', 0.00, 0.00, 27850.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01048', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('AFC KUTTIADY', 21, 12850.00, 'DR', 0.00, 0.00, 12850.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01049', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('12KG KUTTIADY SALE', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01050', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('GALAXY BACKERY KUTTIADY', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01051', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('OLIVE SPICY KUMBALAM', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01053', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('THABAK CAFE KUTTIADY', 21, 2580.00, 'DR', 0.00, 0.00, 2580.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01054', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('TAAZA CAFE KUTTIADY', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01055', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('GREEN KITCHEN NEELECHKUNN', 21, 47000.00, 'DR', 0.00, 0.00, 47000.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01056', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('JAZA CATERING(RASHID)', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01057', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('TAJ AUDITORIUM KUMBALAM', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01058', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('JAAMIS KUTTIADY', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01060', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('ROYAL ADUKKATH', 21, 6900.00, 'DR', 0.00, 0.00, 6900.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01061', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('AL BAITH KADEKACHAL', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01064', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('VASU CANTEEN KUTTIADY', 21, 600.00, 'DR', 0.00, 0.00, 600.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01064', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('RUCHI KAMMANATHAZHA', 21, 3770.00, 'DR', 0.00, 0.00, 3770.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01065', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('SURESH ADUKATH', 21, 1300.00, 'DR', 0.00, 0.00, 1300.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01066', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('PRATHEEKSHA', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01067', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('OLIVE KUMBALAM', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01068', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('HAWA AGENCIES', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01070', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('SAYTHAAN THATTUKADA KUTTIADY', 21, 3610.00, 'DR', 0.00, 0.00, 3610.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01071', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('KAAYAMKANDY', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01072', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('MUNEER ADUKATH COOK', 21, 3930.00, 'DR', 0.00, 0.00, 3930.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01073', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('REAL BAKERY ADUKKATH', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01074', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('CAFE BITE', 21, 2490.00, 'DR', 0.00, 0.00, 2490.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01076', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('MADHURAM KUTTIADY', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01077', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('JOLLY BEE KUTTIADY', 21, 1000.00, 'DR', 0.00, 0.00, 1000.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01079', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('BALAN THALEEKKARA', 21, 1480.00, 'DR', 0.00, 0.00, 1480.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01080', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('SASIENDRAN ADUKKATH', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01081', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('JUCEE KUTTIADY', 21, 300.00, 'DR', 0.00, 0.00, 300.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01082', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('VANITHA HOTEL KUTTIADY', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01083', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('NISSAR VADAYAM', 21, 300.00, 'DR', 0.00, 0.00, 300.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01084', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('VADAYAM THATTUKADA', 21, 150.00, 'DR', 0.00, 0.00, 150.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01085', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('MILMA KUTTIADY', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01086', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('AANOOS KUMBALAM', 21, 2580.00, 'DR', 0.00, 0.00, 2580.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01088', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('PR VANITHA HOTEL', 21, 210.00, 'DR', 0.00, 0.00, 210.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01089', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('FOOD PLUS', 21, 180.00, 'DR', 0.00, 0.00, 180.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01091', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('AL MANAR SCHOOL', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01093', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('PARIS BISCUT ADUKATH', 21, 2670.00, 'DR', 0.00, 0.00, 2670.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01095', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('12KG', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01096', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('DAY NIGHT KUTTIADY', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01097', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('NANMA TRUST KUTTIADY', 21, 5100.00, 'DR', 0.00, 0.00, 5100.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01098', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('JCB ADUKKATH', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01099', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('EAT&DRINK KUTTIADY', 21, 2670.00, 'DR', 0.00, 0.00, 2670.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('AKK TOURIST HOME', 21, 1550.00, 'DR', 0.00, 0.00, 1550.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01101', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('SIRAJUL HUDA ENGLISH MEDIOM', 21, 5140.00, 'DR', 0.00, 0.00, 5140.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01108', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('NANO THATTUKADA SUBAIR', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01120', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('BROTHERS KAYAKKODI', 21, 1020.00, 'DR', 0.00, 0.00, 1020.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01122', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('VKS KADEKACHAL', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01123', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('TEA TIME KUTTIADY', 21, 1000.00, 'DR', 0.00, 0.00, 1000.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01126', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('MUNDAKUTTY HOTEL KUNJALI', 21, 2580.00, 'DR', 0.00, 0.00, 2580.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01128', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('FAISAL KALLAD CATERING', 21, 70.00, 'DR', 0.00, 0.00, 70.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01130', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('NADAN FOOD OLODITHAZHA(ANEESH)', 21, 3520.00, 'DR', 0.00, 0.00, 3520.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01131', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('TASTY THATTUKADA OTHYOT', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01133', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('SUBAIR TAJ', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01134', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('KAPPA KUTTIADY', 21, 2590.00, 'DR', 0.00, 0.00, 2590.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01135', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('NARIKUTUNCHAL THATTUKADA', 21, 50.00, 'DR', 0.00, 0.00, 50.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01137', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('SREEKRISHNA RIVER ROAD KTY', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01140', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('SUBAIR APK', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01140', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('Liver Road', 21, 2310.00, 'DR', 0.00, 0.00, 2310.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01141', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('MATHRUTHWA PARAKADAVU', 21, 5060.00, 'DR', 0.00, 0.00, 5060.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01142', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('REAL HALWA ADUKATH', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01143', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('SHAREEF VELLAPAM VADAYAM', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01144', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('AMMAS THALEEKARA', 21, 130.00, 'DR', 0.00, 0.00, 130.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01145', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('BAKE HOME KUTTIADY', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01146', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('Q CARE OTHYOT', 21, 5050.00, 'DR', 0.00, 0.00, 5050.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01146', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('SARA REAL', 21, 500.00, 'DR', 0.00, 0.00, 500.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01149', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('RUCHI KAYAKKODI', 21, 5050.00, 'DR', 0.00, 0.00, 5050.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01150', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('SNEHA COOLBAR', 21, 100.00, 'DR', 0.00, 0.00, 100.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01152', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('KHAYAL AAYENCHERI', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01155', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('OLIVE KUTTIADY', 21, 2280.00, 'DR', 0.00, 0.00, 2280.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01155', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('GRAMA PANCHAYATH KUTTIADY', 21, 5020.00, 'DR', 0.00, 0.00, 5020.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01156', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('LAUNDRY', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01156', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('SEASON', 21, 5080.00, 'DR', 0.00, 0.00, 5080.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01157', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('JUICE CLUB KUTTIADY', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01158', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('JAMEELA', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01160', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('VALAYANNUR PALLI', 21, 1500.00, 'DR', 0.00, 0.00, 1500.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01161', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('ALI C/O', 21, 200.00, 'DR', 0.00, 0.00, 200.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01163', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('BAMBOO SIYA', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01165', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('RASACK  PALERI', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01167', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('SEMEER PURAYIKKOOD', 21, 6820.00, 'DR', 0.00, 0.00, 6820.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01170', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('BAR MANAGER', 21, 500.00, 'DR', 0.00, 0.00, 500.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01175', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('GFC KUTTIADI', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01176', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('BAKE 58', 21, 2570.00, 'DR', 0.00, 0.00, 2570.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01178', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('JAMEELA VALAYANNUR', 21, 2400.00, 'DR', 0.00, 0.00, 2400.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01178', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('SHAFI URATH', 21, 1450.00, 'DR', 0.00, 0.00, 1450.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01179', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('HOT AND SPICY', 21, 5160.00, 'DR', 0.00, 0.00, 5160.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01180', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('MOYILOTHARA SASI', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01183', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('CAKE LOOM KUTTIADY', 21, 10.00, 'DR', 0.00, 0.00, 10.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01185', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('LIVE CATERING NEELECHKUNN', 21, 3540.00, 'DR', 0.00, 0.00, 3540.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01186', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('COUSINS KULANGARATHAZA', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01187', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('FRIED EXPRESS KUTTIADY', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01187', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('KUMARAN NEAR BAR', 21, 200.00, 'DR', 0.00, 0.00, 200.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01189', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('PRAKASHAN KALLAD', 21, 2520.00, 'DR', 0.00, 0.00, 2520.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01190', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('SKC KUTTIADY', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01192', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('TEA POT KUTTIADY UBAID', 21, 5640.00, 'DR', 0.00, 0.00, 5640.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01195', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('CHAIGRAM SIRAJULHUDA', 21, 9770.00, 'DR', 0.00, 0.00, 9770.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01198', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('MEMESS KUTTIADY', 21, 140.00, 'DR', 0.00, 0.00, 140.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01201', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('PETRAS KUTTIADY', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01202', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('SFA RATHA', 21, 1500.00, 'DR', 0.00, 0.00, 1500.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01204', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('LIMRA KUTTIADY', 21, 550.00, 'DR', 0.00, 0.00, 550.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01205', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('THATTUKADA THOTATHANKANDI', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01205', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('FAISAL LIVE SHAWARMA', 21, 2570.00, 'DR', 0.00, 0.00, 2570.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01206', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('PRABHAKARAN', 21, 500.00, 'DR', 0.00, 0.00, 500.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01207', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('BISTRO REST KADEKACAHL', 21, 12850.00, 'DR', 0.00, 0.00, 12850.00, false, 0, 0.00, 0.00, true, false, 1, 15, 525, '01209', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('OLIVE KULANGARATHAZHA', 21, 1000.00, 'DR', 0.00, 0.00, 1000.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('OOTTUPURA NARIKUTUNCHAL', 21, 7920.00, 'DR', 0.00, 0.00, 7920.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02002', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('AL SAFA PARAKKADAVE', 21, 4370.00, 'DR', 0.00, 0.00, 4370.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02003', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('OLIVE KALLIKKANDI', 21, 28980.00, 'DR', 0.00, 0.00, 28980.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02004', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('OLIVE CHERUPARAMB', 21, 15600.00, 'DR', 0.00, 0.00, 15600.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02005', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('JUBILY KITCHEN', 21, 4030.00, 'DR', 0.00, 0.00, 4030.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02006', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('OLIVE KADAVATHOOR', 21, 22870.00, 'DR', 0.00, 0.00, 22870.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02007', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('MRA PERIGATHUR', 21, 27000.00, 'DR', 0.00, 0.00, 27000.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02008', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('OLIVE KARIYAD', 21, 6140.00, 'DR', 0.00, 0.00, 6140.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02009', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('KP CHAI NADAPURAM', 21, 24190.00, 'DR', 0.00, 0.00, 24190.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02010', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('MOUNTAIN CAFE PAKRATHALAM', 21, 11000.00, 'DR', 0.00, 0.00, 11000.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '020117', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('MRA NADAPURAM', 21, 2530.00, 'DR', 0.00, 0.00, 2530.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02011', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('BAKE LAND KALLACHI', 21, 21420.00, 'DR', 0.00, 0.00, 21420.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02012', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('VIMS KALLACHI', 21, 13000.00, 'DR', 0.00, 0.00, 13000.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02013', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('OLIVE KULANGARATH', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02014', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('VANITHA HOTEL KAKKATT', 21, 970.00, 'DR', 0.00, 0.00, 970.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02015', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('TEA BREAK NARKCHL(STAR THATTUKADA)', 21, 10000.00, 'DR', 0.00, 0.00, 10000.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02016', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('VANITHA HOTEL NARIKOOTTUMCHAL', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02017', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('OLIVE NEELECHUMKUNNU', 21, 1000.00, 'DR', 0.00, 0.00, 1000.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02018', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('MUHABATH HOTEL THOTTILPALAM', 21, 1620.00, 'DR', 0.00, 0.00, 1620.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02019', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('CHIKKOOS THOTTILPALAM', 21, 1000.00, 'DR', 0.00, 0.00, 1000.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02020', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('SWADESI HOTEL THOTTILPALAM', 21, 5540.00, 'DR', 0.00, 0.00, 5540.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02021', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('RAINBOW THOTTILPALAM', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02022', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('GAYATHRI HOTEL KAKKATT', 21, 12000.00, 'DR', 0.00, 0.00, 12000.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02024', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('OLIVE PARAKKADAVE', 21, 12000.00, 'DR', 0.00, 0.00, 12000.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02025', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('BAKE POINT NADAPURAM', 21, 3590.00, 'DR', 0.00, 0.00, 3590.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02026', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('VANITHA HOTEL KALLACHI', 21, 4300.00, 'DR', 0.00, 0.00, 4300.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02027', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('STAR ONE AROOR', 21, 12000.00, 'DR', 0.00, 0.00, 12000.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02028', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('VANITHA HOTEL VATTOLI', 21, 2480.00, 'DR', 0.00, 0.00, 2480.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02029', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('TURN 10', 21, 12000.00, 'DR', 0.00, 0.00, 12000.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02031', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('SELECT THOTTILPALAM', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02032', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('THANIMA THOTTILPALAM NEW', 21, 1000.00, 'DR', 0.00, 0.00, 1000.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02033', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('CHENNAI TEA', 21, 2220.00, 'DR', 0.00, 0.00, 2220.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02034', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('PALAYAD', 21, 9500.00, 'DR', 0.00, 0.00, 9500.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02035', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('AATTOOS KAKKATT', 21, 5300.00, 'DR', 0.00, 0.00, 5300.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02036', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('HILLBARA PAKRANTHALAM', 21, 45000.00, 'DR', 0.00, 0.00, 45000.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02037', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('T4 PAKRAMTHALAM', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02038', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('NICE NARIKOOTTUMCHAL', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02039', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('OFC KALLIKKANDI', 21, 2000.00, 'DR', 0.00, 0.00, 2000.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02040', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('PAYYADAPPALAM', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02041', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('CAKE CLUB KADAVATHOOR', 21, 2550.00, 'DR', 0.00, 0.00, 2550.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02042', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('MEHR CONVENTITION CENTRE', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02045', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('MOMO NADAPURAM', 21, 5040.00, 'DR', 0.00, 0.00, 5040.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02046', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('DARUL HUDA NADAPURAM', 21, 15000.00, 'DR', 0.00, 0.00, 15000.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02047', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('JUICE VALLEY', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02048', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('KGS', 21, 3730.00, 'DR', 0.00, 0.00, 3730.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02049', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('12KG NADAPURAM', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02050', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('BAKE ONE THOTTILPALAM', 21, 3250.00, 'DR', 0.00, 0.00, 3250.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02051', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('PUZHAYORAM', 21, 5500.00, 'DR', 0.00, 0.00, 5500.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02052', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('LIVE KOODAL', 21, 5030.00, 'DR', 0.00, 0.00, 5030.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02053', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('RUKKUS KAIVELY', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02053', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('JINCY VATTOLI', 21, 50.00, 'DR', 0.00, 0.00, 50.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02057', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('NEW STAR CHETTAKANDI', 21, 20.00, 'DR', 0.00, 0.00, 20.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02059', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('EHAB NADAPURAM', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02060', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('AISWARYA NADAPURAM', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02062', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('SREE KRISHNA THALEEKKARA', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02064', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('CHAI CURVE', 21, 9440.00, 'DR', 0.00, 0.00, 9440.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02069', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('KK BUILDERS', 21, 2620.00, 'DR', 0.00, 0.00, 2620.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02070', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('TK BAKE&COOL', 21, 2500.00, 'DR', 0.00, 0.00, 2500.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02071', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('VANITHA HOTEL MOKERI', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02073', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('JEEVITHA YATHRA', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02074', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('HONEY VATTOLI', 21, 2550.00, 'DR', 0.00, 0.00, 2550.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02075', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('17KG NADAPURAM SALE', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02078', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('CHAYAKADA KALLIKKANDI', 21, 2820.00, 'DR', 0.00, 0.00, 2820.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02079', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('TIAGOS KULAGARATH', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02080', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('HONEY THOTTILPALAM', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02083', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('OLIVE NARIKOOTTUMCHAL', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02084', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('MIYA MIYA', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02085', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('KANTHARI VATTOLI', 21, 2550.00, 'DR', 0.00, 0.00, 2550.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02087', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('SAI KRISHNA THALEEKARA', 21, 570.00, 'DR', 0.00, 0.00, 570.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02088', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('ZAIN VATTOLI (KANDHARI)', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02089', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('4KG NADAPURAM SALE', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02090', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('NADAPURAM SALE', 21, 350.00, 'DR', 0.00, 0.00, 350.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02092', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('OTHIYIL AUDITORIUM', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02093', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('NANU KAIVELI', 21, 4800.00, 'DR', 0.00, 0.00, 4800.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02094', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('A&A POOTHAMPARA', 21, 15450.00, 'DR', 0.00, 0.00, 15450.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02095', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('MRA HOME', 21, 17430.00, 'DR', 0.00, 0.00, 17430.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02097', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('KUS KAKKATT', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02098', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('VANITHA HOTEL THOTTILPALAM', 21, 510.00, 'DR', 0.00, 0.00, 510.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02102', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('KVS CHELAKKAD', 21, 7030.00, 'DR', 0.00, 0.00, 7030.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02104', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('HAPPY BAKE THOTTILPALAM', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02107', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('SALIA CHICKEN MOKERI', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02109', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('HP PUMP DEVERKOVIL', 21, 5000.00, 'DR', 0.00, 0.00, 5000.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02112', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('GRACE THOTTILPALAM', 21, 2570.00, 'DR', 0.00, 0.00, 2570.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02115', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('ZAYKA AVOLAM', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02118', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('LAST CHANCE', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02121', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('IQRA THOTTILPALAM', 21, 1650.00, 'DR', 0.00, 0.00, 1650.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02122', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('VANITHA HOTEL KAIVELI', 21, 2600.00, 'DR', 0.00, 0.00, 2600.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02124', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('NEW KVR AVOLAM', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02125', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('AR BAKERY KANDOTHKUNI', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02126', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('TEA POT KAKKAMVELLI', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02128', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('ORCHID PEROD', 21, 118950.00, 'DR', 0.00, 0.00, 118950.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02130', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('TEA POT NADAPURAM', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02131', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('SPICE AND GRILL CHELAKKAD', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 526, '02133', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('TASTY PALERI', 21, 610.00, 'DR', 0.00, 0.00, 610.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('CHILLIES PALERI', 21, 990.00, 'DR', 0.00, 0.00, 990.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03002', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('CHAI GRAM PURAVOOR', 21, 1520.00, 'DR', 0.00, 0.00, 1520.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03003', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('CHANDRAN KADIYAGAD', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03004', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('LIVE KADIYAGAD', 21, 12000.00, 'DR', 0.00, 0.00, 12000.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03005', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('CHIKITHA  PERAMBRA', 21, 4620.00, 'DR', 0.00, 0.00, 4620.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03006', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('EMBASSY  HOTEL PERAMBRA', 21, 12000.00, 'DR', 0.00, 0.00, 12000.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03008', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('RAINBOW 3 YATHIMGANA', 21, 6500.00, 'DR', 0.00, 0.00, 6500.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03009', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('FATHIMA PURAVOOR', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '030101', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('CHAI BISCUIT PURAVOOR', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '030104', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('BARKA', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '030105', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('PRAVASI KOZHIMUKKU', 21, 2460.00, 'DR', 0.00, 0.00, 2460.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '030106', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('CHAPPATHI COMPANY PBA', 21, 5650.00, 'DR', 0.00, 0.00, 5650.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '030107', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('WATER PROOF', 21, 2520.00, 'DR', 0.00, 0.00, 2520.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '030107', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('BHOOFY KURUDIMUKKU', 21, 1000.00, 'DR', 0.00, 0.00, 1000.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '030108', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('TEA HUB PERAMBRA', 21, 610.00, 'DR', 0.00, 0.00, 610.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03010', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('SHAHIN KIZHPAYYUR', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '030112', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('TEA BENCH', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '030117', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('CHILLIES KADIYAGAD', 21, 70.00, 'DR', 0.00, 0.00, 70.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '030118', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('AL FAB PAYYOLI', 21, 12600.00, 'DR', 0.00, 0.00, 12600.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '030119', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('CANDLE LIGHT', 21, 3200.00, 'DR', 0.00, 0.00, 3200.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03011', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('PAPPAYA MEPPAYYUR', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '030120', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('FRIENDS PERUVAYAL', 21, 4710.00, 'DR', 0.00, 0.00, 4710.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '030121', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('KHANA PEENA', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '030121', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('HI-TECH', 21, 4420.00, 'DR', 0.00, 0.00, 4420.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '030122', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('OMAN CAFE KADIYANGAD', 21, 3050.00, 'DR', 0.00, 0.00, 3050.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '030124', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('NANO PERAMBRA', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '030125', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('LARIZ MEPPAYYUR', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '030126', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('VANITHA HOTEL KAKKAD', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '030127', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('TEA POT KADIYANGAD', 21, 2500.00, 'DR', 0.00, 0.00, 2500.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '030128', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('HONESTY PERAMBRA', 21, 1560.00, 'DR', 0.00, 0.00, 1560.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '030129', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('VANITHA HOTEL VELLIYOOR', 21, 170.00, 'DR', 0.00, 0.00, 170.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03012', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('SIRAJUL HUDA PERAMBRA', 21, 5010.00, 'DR', 0.00, 0.00, 5010.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '030130', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('NANDHU MANJAKKULAM', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '030131', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('THATTUKADA MEPPAYUR', 21, 2560.00, 'DR', 0.00, 0.00, 2560.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '030132', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('NAVYA KOOTHALI', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '030133', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('PP THATTUKADA', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '030136', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('DE PARIS CHALIKKARA', 21, 5230.00, 'DR', 0.00, 0.00, 5230.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03013', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('RAYDAN MEPPAYUR', 21, 1940.00, 'DR', 0.00, 0.00, 1940.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03014', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('HONESTY MEPPAYUR', 21, 9240.00, 'DR', 0.00, 0.00, 9240.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03015', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('K K CHAYA', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03016', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('GREEN OAK', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03018', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('KARIKK MANJAKKULAM', 21, 2530.00, 'DR', 0.00, 0.00, 2530.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03019', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('DINE TIME MEPAYUR', 21, 12000.00, 'DR', 0.00, 0.00, 12000.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03020', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('ANIYA MEPPAYUR', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03021', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('AFC PERAMBRA', 21, 1000.00, 'DR', 0.00, 0.00, 1000.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03022', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('AMMA PERAMBRA', 21, 2340.00, 'DR', 0.00, 0.00, 2340.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03023', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('RAYDAN PERAMBRA', 21, 100.00, 'DR', 0.00, 0.00, 100.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03024', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('TEA COM PERAMBRA', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03025', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('CAFE RESTO', 21, 18000.00, 'DR', 0.00, 0.00, 18000.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03026', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('FLAVOURY KADIYANGAD', 21, 14000.00, 'DR', 0.00, 0.00, 14000.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03027', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('JIJI PANTHIRIKKARA', 21, 980.00, 'DR', 0.00, 0.00, 980.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03028', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('MUBARAK HOTEL PANTHIRIKKARA', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03029', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('CAFE 99 KADIYAGAD', 21, 1000.00, 'DR', 0.00, 0.00, 1000.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03030', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('METRO PARAKKADAVE', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03031', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('SUPREME BAKERY PALERI', 21, 3100.00, 'DR', 0.00, 0.00, 3100.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03032', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('SUNI PERAMBRA STAR AGENCIES', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03033', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('KARAMA', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03035', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('IDIVETTI ROAD PALERI', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03037', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('AADHOOS HOTEL VADAKKUMBAD', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03038', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('A ONE KADIYAGAD', 21, 3220.00, 'DR', 0.00, 0.00, 3220.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03039', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('BAKE HOME MEPPAYYUR', 21, 3260.00, 'DR', 0.00, 0.00, 3260.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03041', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('SREE SHANKARA', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03042', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('ROYAL LOUNGE', 21, 1080.00, 'DR', 0.00, 0.00, 1080.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03044', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('ILANEERKADA(NALUMANIKKATT)', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03046', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('CAFFIO PERAMBRA', 21, 2400.00, 'DR', 0.00, 0.00, 2400.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03047', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('RUBI PERAMBRA', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03048', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('THANAL KADIYAGAD', 21, 14000.00, 'DR', 0.00, 0.00, 14000.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03049', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('12KG PERAMBRA', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03050', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('FOODIES HUB', 21, 2720.00, 'DR', 0.00, 0.00, 2720.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03051', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('RN CAR WASH', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03053', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('RAHMANIYA PARAKADAVU', 21, 1000.00, 'DR', 0.00, 0.00, 1000.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03054', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('CHAY KISSA', 21, 8740.00, 'DR', 0.00, 0.00, 8740.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03055', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('SHAIMA PERAMBRA', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03056', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('KANNANS HOTEL PERAMBRA', 21, 3900.00, 'DR', 0.00, 0.00, 3900.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03057', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('MALABAR KAITHAKKAL', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03058', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('LUSTER', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03059', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('17KG PERAMBRA', 21, 1000.00, 'DR', 0.00, 0.00, 1000.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03060', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('MUKILE CHAYA', 21, 7820.00, 'DR', 0.00, 0.00, 7820.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03061', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('BURGER LOUNGE PERAMBRA', 21, 60.00, 'DR', 0.00, 0.00, 60.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03062', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('NANDANAM PARAKKADAVE', 21, 4040.00, 'DR', 0.00, 0.00, 4040.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03063', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('NANU PALERI', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03065', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('BLACK  PEPPER', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03066', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('Cafe Hut', 21, 2460.00, 'DR', 0.00, 0.00, 2460.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03067', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('RAINBOW 2 HIGHSCHOOL', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03068', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('DE PARIS MEPPAYYUR', 21, 2590.00, 'DR', 0.00, 0.00, 2590.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03070', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('K MART', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03071', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('LIYA KALLAMPURAM', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03071', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('HABEEBS MEPAYUR', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03072', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('BAKE PALACE', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03073', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('CITY BURGER', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03074', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('PICKLE JAR', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03075', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('NESTEA PERAMBRA', 21, 30.00, 'DR', 0.00, 0.00, 30.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03077', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('OJAS KADIYAGAD', 21, 12000.00, 'DR', 0.00, 0.00, 12000.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03078', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('ZAYAN KADIYAGAD PALAM', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03079', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('VADAKADA', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03081', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('HASHIM', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03082', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('PUTHUMA MEPPAYYUR', 21, 2560.00, 'DR', 0.00, 0.00, 2560.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03083', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('MALAVIKA PAYYOLI', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03084', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('TEA TIME PERAMBRA', 21, 2430.00, 'DR', 0.00, 0.00, 2430.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03085', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('REWATHI PERAMBRA', 21, 880.00, 'DR', 0.00, 0.00, 880.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03087', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('AANDY MOORIKUTHI', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03089', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('FROZEN TREAT', 21, 1880.00, 'DR', 0.00, 0.00, 1880.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03090', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('KARGIL VALOOR', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03091', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('KERALA KADIYAGAD', 21, 490.00, 'DR', 0.00, 0.00, 490.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03093', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('CAFE BITE BISTRO', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03098', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('MALABAR KADIYAGAD', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03099', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('THANAL PANTHIRIKARA', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03101', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('VISMAYA PERAMBRA', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03101', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('ELANEER KADA PERAMBRA', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03102', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('ALKA MANDI PERAMBRA', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03104', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('STAR KADIYAGAD', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03107', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('GRAVITY', 21, 1950.00, 'DR', 0.00, 0.00, 1950.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03108', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('RANVIN', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03109', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('VASIS PERAMBRA', 21, 1500.00, 'DR', 0.00, 0.00, 1500.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03110', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('BADHUSHA PERAMBRA', 21, 2560.00, 'DR', 0.00, 0.00, 2560.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03112', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('JAYA MILL PERAMBRA', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03114', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('BYPASS THATTUKADA', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03115', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('VARIETY JUICE', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03116', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('PARAG PERAMBRA', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03118', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('RAYDAN KADIYAGAD', 21, 3500.00, 'DR', 0.00, 0.00, 3500.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03119', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('AFSAL VADAKARA', 21, 6750.00, 'DR', 0.00, 0.00, 6750.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03123', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('SHAMAI PERAMBRA', 21, 2500.00, 'DR', 0.00, 0.00, 2500.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03124', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('SONA COOLBAR KADIYAGAD', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03139', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('LATHEEF SOOPPYKADA', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03141', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('LULU THATTUKADA', 21, 40.00, 'DR', 0.00, 0.00, 40.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03142', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('SEENATH STORE MEPAYYUR', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03146', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('KATTAN CO KUYIMBIL', 21, 1900.00, 'DR', 0.00, 0.00, 1900.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03147', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('AJMEER PURAVOOR', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03149', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('SAIDUL KADIYANGAD', 21, 100.00, 'DR', 0.00, 0.00, 100.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03150', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('VIBE KITCHEN MOORIKUTHI', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03151', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('NANDHA KOOTHALI', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03152', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('TEA BAITH PALERI', 21, 2260.00, 'DR', 0.00, 0.00, 2260.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03153', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('BAPPU KITCHEN KADIYNGAD', 21, 5140.00, 'DR', 0.00, 0.00, 5140.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03154', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('HAPPINS CAFE MEPAYUR', 21, 650.00, 'DR', 0.00, 0.00, 650.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03155', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('FALCON', 21, 5220.00, 'DR', 0.00, 0.00, 5220.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03159', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('KUMARAN KOOLIKKUNNU', 21, 960.00, 'DR', 0.00, 0.00, 960.00, false, 0, 0.00, 0.00, true, false, 1, 15, 527, '03160', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('MRA CHOKLI', 21, 5520.00, 'DR', 0.00, 0.00, 5520.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('SNACK HOUSE THALASSERY', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04002', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('FAMILY RESTAURANT', 21, 1050.00, 'DR', 0.00, 0.00, 1050.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04003', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('PRANAM', 21, 1700.00, 'DR', 0.00, 0.00, 1700.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04004', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('BEST PARAL', 21, 5190.00, 'DR', 0.00, 0.00, 5190.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04005', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('HARIDAS', 21, 800.00, 'DR', 0.00, 0.00, 800.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04006', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('PAAL ICE CAFE', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04008', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('THALASSERY RESTAURANT', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04009', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('KULFI', 21, 2700.00, 'DR', 0.00, 0.00, 2700.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04010', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('RUBIN', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04011', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('RICE&ROTTI', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04012', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('AAPPY PUTTU', 21, 7680.00, 'DR', 0.00, 0.00, 7680.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04013', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('PONNIUM', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04014', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('AAPPY PUTTU KOLASSERY', 21, 21860.00, 'DR', 0.00, 0.00, 21860.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04015', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('CHAY SPOT', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04018', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('GO GRILL', 21, 2000.00, 'CR', 0.00, 0.00, -2000.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04020', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('SMOKE HOUSE', 21, 7600.00, 'DR', 0.00, 0.00, 7600.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04021', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('FALAFELL', 21, 5100.00, 'DR', 0.00, 0.00, 5100.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04023', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('ASHARA', 21, 6940.00, 'DR', 0.00, 0.00, 6940.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04024', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('AFC THALASSERY', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04025', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('MANAKEESH THALASSERY', 21, 10290.00, 'DR', 0.00, 0.00, 10290.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04027', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('ALIF', 21, 8750.00, 'DR', 0.00, 0.00, 8750.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04028', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('RAHEES-8138060469', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04028', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('HARIS PERIGATHOOR', 21, 6620.00, 'DR', 0.00, 0.00, 6620.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04029', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('STAR PARAL', 21, 7240.00, 'DR', 0.00, 0.00, 7240.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04030', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('REGENCY', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04031', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('TASTISH CHAPPATHI', 21, 2550.00, 'DR', 0.00, 0.00, 2550.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04032', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('NAVAS', 21, 15210.00, 'DR', 0.00, 0.00, 15210.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04033', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('SEA VIEW PARK THALASSERY', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04034', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('J SHAVARMA', 21, 15551.00, 'DR', 0.00, 0.00, 15551.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04035', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('MAMMOOTTIKKA CHAYAKKADA', 21, 5100.00, 'DR', 0.00, 0.00, 5100.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04036', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('MANAKEESH CHOKLI', 21, 200.00, 'DR', 0.00, 0.00, 200.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04037', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('BERRYZ KOOTHUPARAMBA', 21, 81840.00, 'DR', 0.00, 0.00, 81840.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04040', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('NATIONAL', 21, 2570.00, 'DR', 0.00, 0.00, 2570.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04041', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('VKG', 21, 2570.00, 'DR', 0.00, 0.00, 2570.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04042', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('VKG CATERING', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04043', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('KAVIYOOR', 21, 3800.00, 'DR', 0.00, 0.00, 3800.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04044', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('PARIS RESIDENCY', 21, 84110.00, 'DR', 0.00, 0.00, 84110.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04047', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('PARIS RESTAURANT', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04048', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('12KG THALASSERY', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04050', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('ABHAYA CANCER CENTER', 21, 200.00, 'DR', 0.00, 0.00, 200.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04051', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('FOOD CLUB', 21, 28209.60, 'DR', 0.00, 0.00, 28209.60, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04052', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('CHAYAKKADA HOSPITAL', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04053', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('SREE NARAYANA', 21, 5120.00, 'DR', 0.00, 0.00, 5120.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04054', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('FEEL LABAN', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04055', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('CHAYAPURA KADAL PALAM', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04056', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('SWASRAYA THALASSERY', 21, 2550.00, 'DR', 0.00, 0.00, 2550.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04057', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('SMASHITTO', 21, 2550.00, 'DR', 0.00, 0.00, 2550.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04058', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('D CAKE', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04059', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('CHAYAKADA OLD BUS STAND', 21, 5120.00, 'DR', 0.00, 0.00, 5120.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04060', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('THATHAS', 21, 100.00, 'DR', 0.00, 0.00, 100.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04063', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('PAAL ICE', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04064', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('THALAYI', 21, 2010.00, 'DR', 0.00, 0.00, 2010.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04065', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('SANGAMAM', 21, 15360.00, 'DR', 0.00, 0.00, 15360.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04066', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('JUICE WORLD', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04071', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('LA FAIR THALASSERY', 21, 10200.00, 'DR', 0.00, 0.00, 10200.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04072', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('PRADEEPAN CHOKLY', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04073', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('PUNNOL VEED', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04076', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('RIYAS TEA SHOP TLY', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04081', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('TESTESH THALASSERY', 21, 5270.00, 'DR', 0.00, 0.00, 5270.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04082', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('HAIRAS PUNNOL', 21, 2050.00, 'DR', 0.00, 0.00, 2050.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04083', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('VICTORIA THALASSERY', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04085', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('ADHAM PARAL', 21, 2450.00, 'DR', 0.00, 0.00, 2450.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04086', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('SREE KRISHNA', 21, 2320.00, 'DR', 0.00, 0.00, 2320.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04088', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('RUCHI CHOKLY', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04090', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('BEST TEA STALL', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04091', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('KAVIYOOR BAKE', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04098', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('KK TEA STALL', 21, 7690.00, 'DR', 0.00, 0.00, 7690.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04098', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('NASIYA', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('BAKING THRIVENI', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04102', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('WATER AUTHORITY', 21, 2570.00, 'DR', 0.00, 0.00, 2570.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04103', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('RIDERS CAFE', 21, 2870.00, 'DR', 0.00, 0.00, 2870.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04104', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('SAMBROS THALASSERY', 21, 2570.00, 'DR', 0.00, 0.00, 2570.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04184', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('CAKE CLUB', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04185', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('DEVA MEKKUNNU', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04186', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('ABUBACKER P NAMBIAR PEEDIKA', 21, 5140.00, 'DR', 0.00, 0.00, 5140.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04187', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('17KG THALASSERY SALE', 21, 6400.00, 'DR', 0.00, 0.00, 6400.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04188', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('SHAVAR BUG', 21, 20.00, 'DR', 0.00, 0.00, 20.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04189', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('CHAYA SPOT CHIRAKKARA', 21, 5210.00, 'DR', 0.00, 0.00, 5210.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04190', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('LE SHAY CAFE', 21, 5380.00, 'DR', 0.00, 0.00, 5380.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04191', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('ROYAL HUD CHALAKKARA', 21, 2570.00, 'DR', 0.00, 0.00, 2570.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04192', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('BERRYS THALASSERI', 21, 4960.00, 'DR', 0.00, 0.00, 4960.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04193', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('ORCHID MEKKUNNU', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04194', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('TRF KITCHEN', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04195', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('SCHOOFE KODUVALLI', 21, 570.00, 'DR', 0.00, 0.00, 570.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04196', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;
INSERT INTO "Ledger" ("LedgerName", "GroupId", "OpeningBalance", "OpeningBalanceType", "DebitBalance", "CreditBalance", "CurrentBalance", "IsBillWise", "CreditPeriodDays", "CreditLimit", "EmptyStockLimit", "IsActive", "IsSystem", "CompanyId", "DeliveryFrequencyDays", "RouteId", "CustomerCode", "CreatedAt", "UpdatedAt")
VALUES ('FAMILY BIG MART TUNERI', 21, 0.00, 'DR', 0.00, 0.00, 0.00, false, 0, 0.00, 0.00, true, false, 1, 15, 528, '04197', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("LedgerId") DO NOTHING;

-- Update sequence to ensure next manual ledger creation gets valid ID
SELECT setval('public."Ledger_LedgerId_seq"', COALESCE((SELECT MAX("LedgerId") FROM "Ledger"), 1));

COMMIT;
