/* =========================================================
   Schema for Login + Dashboard - SQL Server 2008 (MobileDairy)
   This file is idempotent (safe to re-run). It matches the
   columns actually referenced by BackEnd/routes/auth.js and
   BackEnd/routes/purchase.js.
   ========================================================= */

USE [master]
GO

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'MobileDairy')
BEGIN
    CREATE DATABASE [MobileDairy]
END
GO

USE [MobileDairy]
GO

-- =========================================================
-- 1) tbl_UserType
--    NOTE: column is UserTypeName (not UserType) because
--    routes/auth.js selects "UserTypeName" explicitly.
--    Roles used by the dashboard: 'Member' = own data only,
--    'Secretary' (also 'Admin'/'Manager') = all data.
-- =========================================================
IF OBJECT_ID('dbo.tbl_UserType', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[tbl_UserType](
        [UserTypeCode] [int] NOT NULL,
        [UserTypeName] [nvarchar](50) NOT NULL,
        [Status] [bit] NOT NULL,
     CONSTRAINT [PK_tbl_UserType] PRIMARY KEY CLUSTERED
    (
        [UserTypeCode] ASC
    )WITH (PAD_INDEX  = OFF, STATISTICS_NORECOMPUTE  = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS  = ON, ALLOW_PAGE_LOCKS  = ON) ON [PRIMARY]
    ) ON [PRIMARY]
END
GO

-- =========================================================
-- 2) tbl_Company (a.k.a. Society)
--    Referenced by GET /api/Company and the register/login flow.
-- =========================================================
IF OBJECT_ID('dbo.tbl_Company', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[tbl_Company](
        [CompanyCode] [int] NOT NULL,
        [Header1] [nvarchar](100) NULL,
        [Header2] [nvarchar](100) NULL,
        [MobileNumber] [varchar](20) NULL,
     CONSTRAINT [PK_tbl_Company] PRIMARY KEY CLUSTERED
    (
        [CompanyCode] ASC
    )WITH (PAD_INDEX  = OFF, STATISTICS_NORECOMPUTE  = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS  = ON, ALLOW_PAGE_LOCKS  = ON) ON [PRIMARY]
    ) ON [PRIMARY]
END
GO

-- =========================================================
-- 3) tbl_User
--    Columns match what routes/auth.js reads/writes:
--    UserCode, UserTypeCode, CompanyCode, MemberNumber,
--    RegisteredMobileNumber, UserName, Password, C_Date.
-- =========================================================
IF OBJECT_ID('dbo.tbl_User', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[tbl_User](
        [UserCode] [int] NOT NULL,
        [UserTypeCode] [int] NOT NULL,
        [CompanyCode] [int] NULL,
        [MemberNumber] [varchar](50) NULL,
        [RegisteredMobileNumber] [varchar](20) NULL,
        [UserName] [varchar](50) NOT NULL,
        [Password] [nvarchar](100) NOT NULL,
        [C_Date] [datetime] NOT NULL,
     CONSTRAINT [PK_tbl_User] PRIMARY KEY CLUSTERED
    (
        [UserCode] ASC
    )WITH (PAD_INDEX  = OFF, STATISTICS_NORECOMPUTE  = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS  = ON, ALLOW_PAGE_LOCKS  = ON) ON [PRIMARY]
    ) ON [PRIMARY]

    ALTER TABLE [dbo].[tbl_User]  WITH CHECK ADD  CONSTRAINT [FK_tbl_User_tbl_UserType] FOREIGN KEY([UserTypeCode])
    REFERENCES [dbo].[tbl_UserType] ([UserTypeCode])

    ALTER TABLE [dbo].[tbl_User] CHECK CONSTRAINT [FK_tbl_User_tbl_UserType]

    ALTER TABLE [dbo].[tbl_User]  WITH CHECK ADD  CONSTRAINT [FK_tbl_User_tbl_Company] FOREIGN KEY([CompanyCode])
    REFERENCES [dbo].[tbl_Company] ([CompanyCode])

    ALTER TABLE [dbo].[tbl_User] CHECK CONSTRAINT [FK_tbl_User_tbl_Company]
END
GO

-- If tbl_User already exists but is missing any of the newer columns
-- (older installs), add them here - safe to re-run:
IF COL_LENGTH('dbo.tbl_User', 'CompanyCode') IS NULL
    ALTER TABLE dbo.tbl_User ADD [CompanyCode] [int] NULL
GO
IF COL_LENGTH('dbo.tbl_User', 'MemberNumber') IS NULL
    ALTER TABLE dbo.tbl_User ADD [MemberNumber] [varchar](50) NULL
GO
IF COL_LENGTH('dbo.tbl_User', 'RegisteredMobileNumber') IS NULL
    ALTER TABLE dbo.tbl_User ADD [RegisteredMobileNumber] [varchar](20) NULL
GO

-- Recommended: prevent duplicate logins
-- ALTER TABLE dbo.tbl_User ADD CONSTRAINT UQ_tbl_User_UserName UNIQUE (UserName)
-- GO

-- =========================================================
-- 4) tbl_Purchase (NEW - milk purchase / collection entries)
--    Feeds the dashboard. Member users see only rows that match
--    their own CompanyCode + MemberNumber; Secretary/Admin/Manager
--    users see every row (routes/purchase.js enforces this).
-- =========================================================
IF OBJECT_ID('dbo.tbl_Purchase', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[tbl_Purchase](
        [PurchaseID] [int] IDENTITY(1,1) NOT NULL,
        [CompanyCode] [int] NOT NULL,
        [MemberNumber] [varchar](50) NOT NULL,
        [PurchaseDate] [date] NOT NULL,
        [ShiftName] [varchar](10) NOT NULL,      -- 'Morning' / 'Evening'
        [FatPercent] [decimal](5,2) NULL,
        [SNFPercent] [decimal](5,2) NULL,
        [QtyLtr] [decimal](10,2) NOT NULL,
        [Rate] [decimal](10,2) NOT NULL,
        [Amount] [decimal](12,2) NOT NULL,
        [CreatedDate] [datetime] NOT NULL CONSTRAINT [DF_tbl_Purchase_CreatedDate] DEFAULT (GETDATE()),
     CONSTRAINT [PK_tbl_Purchase] PRIMARY KEY CLUSTERED
    (
        [PurchaseID] ASC
    )WITH (PAD_INDEX  = OFF, STATISTICS_NORECOMPUTE  = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS  = ON, ALLOW_PAGE_LOCKS  = ON) ON [PRIMARY]
    ) ON [PRIMARY]

    ALTER TABLE [dbo].[tbl_Purchase]  WITH CHECK ADD  CONSTRAINT [FK_tbl_Purchase_tbl_Company] FOREIGN KEY([CompanyCode])
    REFERENCES [dbo].[tbl_Company] ([CompanyCode])

    ALTER TABLE [dbo].[tbl_Purchase] CHECK CONSTRAINT [FK_tbl_Purchase_tbl_Company]

    CREATE NONCLUSTERED INDEX [IX_tbl_Purchase_Company_Member] ON [dbo].[tbl_Purchase] ([CompanyCode], [MemberNumber])
    CREATE NONCLUSTERED INDEX [IX_tbl_Purchase_PurchaseDate] ON [dbo].[tbl_Purchase] ([PurchaseDate])
END
GO

-- =========================================================
-- Seed user types (UserTypeCode is NOT an IDENTITY column in this
-- schema, so values are assigned explicitly here and by the app).
-- 'Member' and 'Secretary' are required - the frontend Login/AddUser
-- forms default to "Member", and the dashboard checks for
-- "Secretary" (Admin/Manager also get full access) to decide
-- between the member-only view and the all-data view.
-- =========================================================
IF NOT EXISTS (SELECT 1 FROM dbo.tbl_UserType WHERE UserTypeCode = 1)
    INSERT INTO dbo.tbl_UserType (UserTypeCode, UserTypeName, Status) VALUES (1, 'Admin', 1)

IF NOT EXISTS (SELECT 1 FROM dbo.tbl_UserType WHERE UserTypeCode = 2)
    INSERT INTO dbo.tbl_UserType (UserTypeCode, UserTypeName, Status) VALUES (2, 'Secretary', 1)

IF NOT EXISTS (SELECT 1 FROM dbo.tbl_UserType WHERE UserTypeCode = 3)
    INSERT INTO dbo.tbl_UserType (UserTypeCode, UserTypeName, Status) VALUES (3, 'Member', 1)

IF NOT EXISTS (SELECT 1 FROM dbo.tbl_UserType WHERE UserTypeCode = 4)
    INSERT INTO dbo.tbl_UserType (UserTypeCode, UserTypeName, Status) VALUES (4, 'Manager', 1)
GO

-- =========================================================
-- OPTIONAL sample data for local testing only.
-- Uncomment to try the dashboard against demo rows.
-- =========================================================
-- IF NOT EXISTS (SELECT 1 FROM dbo.tbl_Company WHERE CompanyCode = 1)
--     INSERT INTO dbo.tbl_Company (CompanyCode, Header1, Header2, MobileNumber)
--     VALUES (1, 'Sri Krishna ', 'Dairy Society', '9876543210')
-- GO
--
-- IF NOT EXISTS (SELECT 1 FROM dbo.tbl_Purchase WHERE MemberNumber = 'M001')
-- BEGIN
--     INSERT INTO dbo.tbl_Purchase (CompanyCode, MemberNumber, PurchaseDate, ShiftName, FatPercent, SNFPercent, QtyLtr, Rate, Amount)
--     VALUES
--     (1, 'M001', CAST(GETDATE() AS DATE), 'Morning', 4.2, 8.5, 12.50, 45.00, 562.50),
--     (1, 'M001', CAST(GETDATE() AS DATE), 'Evening', 4.0, 8.4, 10.00, 44.50, 445.00),
--     (1, 'M002', CAST(GETDATE() AS DATE), 'Morning', 3.8, 8.2, 8.00,  43.00, 344.00)
-- END
-- GO

-- =========================================================
-- Handy reference queries (the app runs the equivalent of these)
-- =========================================================

-- Dropdown source:
-- SELECT UserTypeCode, UserTypeName, Status FROM dbo.tbl_UserType WHERE Status = 1 ORDER BY UserTypeCode

-- Login lookup (see routes/auth.js POST /api/login):
-- SELECT u.UserCode, u.UserName, u.Password, u.UserTypeCode, u.CompanyCode, u.MemberNumber, t.UserTypeName
-- FROM dbo.tbl_User u
-- INNER JOIN dbo.tbl_UserType t ON u.UserTypeCode = t.UserTypeCode
-- WHERE u.UserName = @UserName AND u.UserTypeCode = @UserTypeCode

-- Add user (UserCode is generated by the app as MAX(UserCode)+1 since it
-- is not an IDENTITY column):
-- INSERT INTO dbo.tbl_User (UserCode, UserTypeCode, CompanyCode, MemberNumber, RegisteredMobileNumber, UserName, Password, C_Date)
-- VALUES (@UserCode, @UserTypeCode, @CompanyCode, @MemberNumber, @RegisteredMobileNumber, @UserName, @Password, GETDATE())

-- Purchase data (see routes/purchase.js GET /api/purchases):
-- Member view  -> WHERE CompanyCode=@myCompany AND MemberNumber=@myMember
-- Secretary/Admin/Manager view -> all rows, optionally filtered by CompanyCode / MemberNumber / date range
