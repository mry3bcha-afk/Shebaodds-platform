// ============================================
// SHEBAODDS - TAX SERVICE
// Ethiopian Withholding Tax Calculations
// Supports Sportsbook & Casino
// ============================================

import mongoose from 'mongoose';
import PDFDocument = require('pdfkit');
import ExcelJS from 'exceljs';

import User from './User';
import { TaxTransaction, TaxSummary, UserTaxProfile } from './Tax';
import Bet from './Bet';
import { sendEmail } from './authRoutes';

// ============================================
// TAX CONFIGURATION
// ============================================

export const TAX_CONFIG = {
  RATE: parseFloat(process.env.TAX_RATE || '0.15'),

  TAX_FREE_LIMIT: parseFloat(
    process.env.TAX_FREE_LIMIT || '100'
  ),

  COLLECTION_METHOD:
    process.env.TAX_COLLECTION_METHOD || 'automatic',

  AUTHORITY_NAME:
    process.env.TAX_AUTHORITY_NAME ||
    'Ministry of Revenues - Ethiopia',

  AUTHORITY_ID:
    process.env.TAX_AUTHORITY_ID ||
    'TAX_SHEBAODDS_001',

  REPORTING_EMAIL:
    process.env.TAX_REPORTING_EMAIL ||
    'tax@shebaodds.com',

  PAYMENT_ACCOUNT:
    process.env.TAX_PAYMENT_ACCOUNT ||
    '1000234567890',

  PAYMENT_BANK:
    process.env.TAX_PAYMENT_BANK ||
    'Commercial Bank of Ethiopia',

  PAYMENT_REFERENCE_PREFIX:
    process.env.TAX_PAYMENT_REFERENCE_PREFIX ||
    'SHEBAODDS_TAX',

  REPORTING_FREQUENCY:
    process.env.TAX_REPORTING_FREQUENCY ||
    'monthly'
};

// ============================================
// CALCULATE TAX
// ============================================

export function calculateTax(
  winningAmount: number,
  isExempt = false
) {
  if (!Number.isFinite(winningAmount) || winningAmount < 0) {
    throw new Error('Invalid winning amount');
  }

  if (
    isExempt ||
    winningAmount <= TAX_CONFIG.TAX_FREE_LIMIT
  ) {
    return {
      taxAmount: 0,
      netWinning: winningAmount,
      isExempt: true,
      taxRate: TAX_CONFIG.RATE,
      reason: isExempt
        ? 'User tax exempt'
        : 'Below tax-free limit'
    };
  }

  const rawTax =
    winningAmount * TAX_CONFIG.RATE;

  const taxAmount =
    Math.floor(rawTax * 100) / 100;

  const netWinning =
    Math.floor(
      (winningAmount - taxAmount) * 100
    ) / 100;

  return {
    taxAmount,
    netWinning,
    isExempt: false,
    taxRate: TAX_CONFIG.RATE,
    reason: 'Withholding tax on gambling winnings'
  };
}

// ============================================
// GENERATE TAX REFERENCE
// ============================================

export function generateTaxReference(): string {
  const timestamp = Date.now();

  const random = Math.random()
    .toString(36)
    .substring(2, 10)
    .toUpperCase();

  return `${TAX_CONFIG.PAYMENT_REFERENCE_PREFIX}_${timestamp}_${random}`;
}

// ============================================
// CURRENT TAX PERIOD
// ============================================

export function getCurrentTaxPeriod(): string {
  const now = new Date();

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, '0')}`;
}

// ============================================
// PROCESS TAX FOR WINNING
// ============================================

export async function processTaxForWinning(
  betId: mongoose.Types.ObjectId | string,
  userId: mongoose.Types.ObjectId | string,
  winningAmount: number,
  matchId?: mongoose.Types.ObjectId | string
) {
  try {
    if (!winningAmount || winningAmount < 0) {
      throw new Error('Invalid winning amount');
    }

    // ------------------------------------------
    // Get user tax profile
    // ------------------------------------------

    const userTaxProfile =
      await UserTaxProfile.findOne({ userId });

    const isExempt =
      userTaxProfile?.taxExempt === true;

    // ------------------------------------------
    // Calculate tax
    // ------------------------------------------

    const taxCalculation =
      calculateTax(
        winningAmount,
        isExempt
      );

    const taxPeriod =
      getCurrentTaxPeriod();

    // ------------------------------------------
    // Create tax transaction
    // ------------------------------------------

    const taxTransaction =
      new TaxTransaction({
        userId,
        betId,
        matchId,

        grossWinning:
          winningAmount,

        taxAmount:
          taxCalculation.taxAmount,

        netWinning:
          taxCalculation.netWinning,

        taxRate:
          TAX_CONFIG.RATE,

        taxPeriod,

        taxReference:
          generateTaxReference(),

        isExempt:
          taxCalculation.isExempt,

        exemptionReason:
          taxCalculation.reason,

        status:
          taxCalculation.isExempt
            ? 'exempt'
            : 'deducted',

        deductedAt:
          taxCalculation.isExempt
            ? null
            : new Date()
      });

    await taxTransaction.save();

    // ------------------------------------------
    // Update user tax profile
    // ------------------------------------------

    await UserTaxProfile.findOneAndUpdate(
      { userId },
      {
        $inc: {
          totalTaxPaid:
            taxCalculation.taxAmount,

          totalWinningsTaxed:
            winningAmount
        },

        $set: {
          lastTaxCalculation:
            new Date(),

          updatedAt:
            new Date()
        }
      },
      {
        upsert: true,
        new: true
      }
    );

    // ------------------------------------------
    // Update user wallet
    // ------------------------------------------

    await User.findByIdAndUpdate(
      userId,
      {
        $inc: {
          'wallet.totalTaxPaid':
            taxCalculation.taxAmount,

          'taxProfile.totalTaxPaid':
            taxCalculation.taxAmount,

          'taxProfile.totalWinningsTaxed':
            winningAmount
        }
      }
    );

    // ------------------------------------------
    // Update monthly tax summary
    // ------------------------------------------

    await TaxSummary.findOneAndUpdate(
      { taxPeriod },
      {
        $inc: {
          totalWinnings:
            winningAmount,

          totalTaxCollected:
            taxCalculation.taxAmount,

          totalBets: 1
        }
      },
      {
        upsert: true,
        new: true
      }
    );

    // ------------------------------------------
    // Update bet
    // ------------------------------------------

    await Bet.findByIdAndUpdate(
      betId,
      {
        taxAmount:
          taxCalculation.taxAmount,

        netWin:
          taxCalculation.netWinning,

        taxTransactionId:
          taxTransaction._id,

        isTaxExempt:
          taxCalculation.isExempt,

        taxExemptReason:
          taxCalculation.reason
      }
    );

    return taxTransaction;

  } catch (error) {
    console.error(
      'Tax processing error:',
      error
    );

    return null;
  }
}

// ============================================
// GENERATE MONTHLY TAX REPORT
// PDF + EXCEL
// ============================================

export async function generateMonthlyTaxReport(
  taxPeriod: string
) {
  try {
    // ------------------------------------------
    // Get or create summary
    // ------------------------------------------

    let summary =
      await TaxSummary.findOne({
        taxPeriod
      });

    if (!summary) {
      summary = new TaxSummary({
        taxPeriod,

        totalWinnings: 0,

        totalTaxCollected: 0,

        totalBets: 0,

        totalUsers: 0,

        userTaxDetails: [],

        reported: false
      });

      await summary.save();
    }

    // ------------------------------------------
    // Get transactions
    // ------------------------------------------

    const transactions =
      await TaxTransaction.find({
        taxPeriod
      })
        .populate(
          'userId',
          'username email phone fullName'
        )
        .populate(
          'betId',
          'matchId marketType stake odds isCasinoBet casinoGameId'
        )
        .populate(
          'matchId',
          'homeTeam awayTeam league'
        );

    // ------------------------------------------
    // Calculate unique users
    // ------------------------------------------

    const uniqueUsers =
      new Set(
        transactions
          .map((tx: any) =>
            tx.userId?._id?.toString()
          )
          .filter(Boolean)
      );

    summary.totalUsers =
      uniqueUsers.size;

    // ------------------------------------------
    // Build user tax details
    // ------------------------------------------

    const userMap = new Map<string, any>();

    for (const tx of transactions as any[]) {
      if (!tx.userId) {
        continue;
      }

      const userId =
        tx.userId._id.toString();

      if (!userMap.has(userId)) {
        userMap.set(userId, {
          userId: tx.userId._id,

          username:
            tx.userId.username ||
            'Unknown',

          totalWinnings: 0,

          totalTax: 0
        });
      }

      const userDetail =
        userMap.get(userId);

      userDetail.totalWinnings +=
        Number(tx.grossWinning || 0);

      userDetail.totalTax +=
        Number(tx.taxAmount || 0);
    }

    summary.userTaxDetails =
      Array.from(userMap.values());

    await summary.save();

    // ==========================================
    // PDF GENERATION
    // ==========================================

    const pdfBuffer: Buffer =
      await new Promise<Buffer>(
        (resolve, reject) => {

          const doc =
            new PDFDocument({
              margin: 50,
              size: 'A4'
            });

          const chunks: Buffer[] = [];

          doc.on(
            'data',
            (chunk: Buffer) => {
              chunks.push(chunk);
            }
          );

          doc.on(
            'end',
            () => {
              resolve(
                Buffer.concat(chunks)
              );
            }
          );

          doc.on(
            'error',
            (error: Error) => {
              reject(error);
            }
          );

          // --------------------------------------
          // Header
          // --------------------------------------

          doc
            .fontSize(24)
            .font('Helvetica-Bold')
            .fillColor('#FFD700')
            .text(
              'SHEBAODDS',
              {
                align: 'center'
              }
            );

          doc
            .fontSize(12)
            .font('Helvetica')
            .fillColor('#000000')
            .text(
              'Smart Bets. Real Wins.',
              {
                align: 'center'
              }
            );

          doc.moveDown();

          // --------------------------------------
          // Title
          // --------------------------------------

          doc
            .fontSize(18)
            .font('Helvetica-Bold')
            .fillColor('#000000')
            .text(
              'MONTHLY TAX REPORT',
              {
                align: 'center'
              }
            );

          doc
            .fontSize(12)
            .font('Helvetica')
            .text(
              `Period: ${taxPeriod}`,
              {
                align: 'center'
              }
            );

          doc.moveDown();

          // --------------------------------------
          // Summary
          // --------------------------------------

          doc
            .fontSize(14)
            .font('Helvetica-Bold')
            .text(
              'Summary',
              {
                underline: true
              }
            );

          doc
            .fontSize(10)
            .font('Helvetica')
            .text(
              `Total Winnings: ${Number(
                summary.totalWinnings || 0
              ).toLocaleString()} ETB`
            )
            .text(
              `Total Tax Collected: ${Number(
                summary.totalTaxCollected || 0
              ).toLocaleString()} ETB`
            )
            .text(
              `Total Bets: ${Number(
                summary.totalBets || 0
              ).toLocaleString()}`
            )
            .text(
              `Total Users: ${Number(
                summary.totalUsers || 0
              ).toLocaleString()}`
            );

          doc.moveDown();

          // --------------------------------------
          // Tax information
          // --------------------------------------

          doc
            .fontSize(14)
            .font('Helvetica-Bold')
            .text(
              'Tax Rate Information',
              {
                underline: true
              }
            );

          doc
            .fontSize(10)
            .font('Helvetica')
            .text(
              `Tax Rate: ${
                TAX_CONFIG.RATE * 100
              }%`
            )
            .text(
              `Tax-Free Limit: ${
                TAX_CONFIG.TAX_FREE_LIMIT
              } ETB`
            )
            .text(
              `Collection Method: ${
                TAX_CONFIG.COLLECTION_METHOD
              }`
            );

          doc.moveDown();

          // --------------------------------------
          // Authority
          // --------------------------------------

          doc
            .fontSize(14)
            .font('Helvetica-Bold')
            .text(
              'Tax Authority',
              {
                underline: true
              }
            );

          doc
            .fontSize(10)
            .font('Helvetica')
            .text(
              `Name: ${
                TAX_CONFIG.AUTHORITY_NAME
              }`
            )
            .text(
              `ID: ${
                TAX_CONFIG.AUTHORITY_ID
              }`
            )
            .text(
              `Reporting Email: ${
                TAX_CONFIG.REPORTING_EMAIL
              }`
            );

          doc.moveDown();

          // --------------------------------------
          // Payment information
          // --------------------------------------

          doc
            .fontSize(14)
            .font('Helvetica-Bold')
            .text(
              'Payment Information',
              {
                underline: true
              }
            );

          doc
            .fontSize(10)
            .font('Helvetica')
            .text(
              `Bank: ${
                TAX_CONFIG.PAYMENT_BANK
              }`
            )
            .text(
              `Account Number: ${
                TAX_CONFIG.PAYMENT_ACCOUNT
              }`
            )
            .text(
              `Reference Prefix: ${
                TAX_CONFIG.PAYMENT_REFERENCE_PREFIX
              }`
            );

          doc.moveDown();

          // --------------------------------------
          // User details
          // --------------------------------------

          doc
            .fontSize(12)
            .font('Helvetica-Bold')
            .text(
              'User Tax Details'
            );

          const tableTop =
            doc.y + 10;

          doc
            .fontSize(8)
            .font('Helvetica-Bold');

          doc.text(
            'Username',
            50,
            tableTop
          );

          doc.text(
            'Total Winnings',
            200,
            tableTop
          );

          doc.text(
            'Tax Paid',
            350,
            tableTop
          );

          doc.text(
            'Net Winnings',
            450,
            tableTop
          );

          doc
            .fontSize(8)
            .font('Helvetica');

          let rowY =
            tableTop + 15;

          for (
            const userDetail
            of summary.userTaxDetails
          ) {

            if (rowY > 700) {
              doc.addPage();
              rowY = 50;
            }

            const winnings =
              Number(
                userDetail.totalWinnings || 0
              );

            const tax =
              Number(
                userDetail.totalTax || 0
              );

            const net =
              winnings - tax;

            doc.text(
              String(
                userDetail.username ||
                'Unknown'
              ),
              50,
              rowY
            );

            doc.text(
              winnings.toLocaleString(),
              200,
              rowY
            );

            doc.text(
              tax.toLocaleString(),
              350,
              rowY
            );

            doc.text(
              net.toLocaleString(),
              450,
              rowY
            );

            rowY += 15;
          }

          // --------------------------------------
          // Footer
          // --------------------------------------

          doc.moveDown();

          doc
            .fontSize(8)
            .font('Helvetica')
            .text(
              'This is an official tax report generated by SHEBAODDS.',
              {
                align: 'center'
              }
            )
            .text(
              `Generated: ${new Date().toLocaleString()}`,
              {
                align: 'center'
              }
            )
            .text(
              'SHEBAODDS - Smart Bets. Real Wins.',
              {
                align: 'center'
              }
            );

          doc.end();
        }
      );

    // ==========================================
    // EXCEL GENERATION
    // ==========================================

    const workbook =
      new ExcelJS.Workbook();

    workbook.creator =
      'SHEBAODDS';

    workbook.created =
      new Date();

    // ------------------------------------------
    // Summary Sheet
    // ------------------------------------------

    const summarySheet =
      workbook.addWorksheet(
        'Tax Summary'
      );

    summarySheet.columns = [
      {
        header: 'Metric',
        key: 'metric',
        width: 30
      },
      {
        header: 'Value',
        key: 'value',
        width: 25
      }
    ];

    summarySheet.addRow({
      metric: 'Period',
      value: taxPeriod
    });

    summarySheet.addRow({
      metric: 'Total Winnings (ETB)',
      value: summary.totalWinnings
    });

    summarySheet.addRow({
      metric: 'Total Tax Collected (ETB)',
      value:
        summary.totalTaxCollected
    });

    summarySheet.addRow({
      metric: 'Total Bets',
      value: summary.totalBets
    });

    summarySheet.addRow({
      metric: 'Total Users',
      value: summary.totalUsers
    });

    summarySheet.addRow({
      metric: 'Tax Rate',
      value:
        `${TAX_CONFIG.RATE * 100}%`
    });

    summarySheet.addRow({
      metric: 'Tax-Free Limit (ETB)',
      value:
        TAX_CONFIG.TAX_FREE_LIMIT
    });

    // ------------------------------------------
    // Transactions Sheet
    // ------------------------------------------

    const transactionsSheet =
      workbook.addWorksheet(
        'Tax Transactions'
      );

    transactionsSheet.columns = [
      {
        header: 'Tax Reference',
        key: 'reference',
        width: 35
      },
      {
        header: 'User',
        key: 'username',
        width: 20
      },
      {
        header: 'Email',
        key: 'email',
        width: 30
      },
      {
        header: 'Gross Winning',
        key: 'gross',
        width: 18
      },
      {
        header: 'Tax Amount',
        key: 'tax',
        width: 18
      },
      {
        header: 'Net Winning',
        key: 'net',
        width: 18
      },
      {
        header: 'Match/Casino',
        key: 'match',
        width: 35
      },
      {
        header: 'Date',
        key: 'date',
        width: 20
      }
    ];

    for (
      const tx of transactions as any[]
    ) {

      const bet =
        tx.betId;

      let matchLabel =
        'N/A';

      if (bet?.isCasinoBet) {

        matchLabel =
          `Casino: ${
            bet.casinoGameId ||
            'Unknown'
          }`;

      } else if (tx.matchId) {

        matchLabel =
          `${tx.matchId.homeTeam || 'Unknown'} vs ${
            tx.matchId.awayTeam || 'Unknown'
          }`;

      }

      transactionsSheet.addRow({
        reference:
          tx.taxReference,

        username:
          tx.userId?.username ||
          'Unknown',

        email:
          tx.userId?.email ||
          'Unknown',

        gross:
          Number(
            tx.grossWinning || 0
          ),

        tax:
          Number(
            tx.taxAmount || 0
          ),

        net:
          Number(
            tx.netWinning || 0
          ),

        match:
          matchLabel,

        date:
          tx.calculatedAt
            ? new Date(
                tx.calculatedAt
              ).toLocaleDateString()
            : new Date().toLocaleDateString()
      });
    }

    // ------------------------------------------
    // User Details Sheet
    // ------------------------------------------

    const userSheet =
      workbook.addWorksheet(
        'User Details'
      );

    userSheet.columns = [
      {
        header: 'Username',
        key: 'username',
        width: 20
      },
      {
        header: 'Total Winnings (ETB)',
        key: 'winnings',
        width: 22
      },
      {
        header: 'Tax Paid (ETB)',
        key: 'tax',
        width: 18
      },
      {
        header: 'Net Winnings (ETB)',
        key: 'net',
        width: 20
      }
    ];

    for (
      const userDetail
      of summary.userTaxDetails
    ) {

      const winnings =
        Number(
          userDetail.totalWinnings || 0
        );

      const tax =
        Number(
          userDetail.totalTax || 0
        );

      userSheet.addRow({
        username:
          userDetail.username ||
          'Unknown',

        winnings,

        tax,

        net:
          winnings - tax
      });
    }

    // ==========================================
    // CREATE EXCEL BUFFER
    // ==========================================

    const excelBuffer =
      await workbook.xlsx.writeBuffer();

    // ==========================================
    // RETURN REPORT
    // ==========================================

    return {
      pdf: pdfBuffer,

      excel:
        Buffer.from(
          excelBuffer
        ),

      summary
    };

  } catch (error) {

    console.error(
      'Generate tax report error:',
      error
    );

    throw error;
  }
}

// ============================================
// SUBMIT TAX REPORT
// ============================================

export async function submitTaxReport(
  taxPeriod: string
) {
  try {

    const {
      pdf,
      excel,
      summary
    } =
      await generateMonthlyTaxReport(
        taxPeriod
      );

    await sendEmail({
      to:
        TAX_CONFIG.REPORTING_EMAIL,

      subject:
        `Tax Report - ${taxPeriod} - SHEBAODDS`,

      template:
        'tax_report',

      data: {
        period:
          taxPeriod,

        totalWinnings:
          summary.totalWinnings,

        totalTaxCollected:
          summary.totalTaxCollected,

        totalBets:
          summary.totalBets,

        totalUsers:
          summary.totalUsers,

        taxRate:
          TAX_CONFIG.RATE * 100,

        taxFreeLimit:
          TAX_CONFIG.TAX_FREE_LIMIT,

        authorityName:
          TAX_CONFIG.AUTHORITY_NAME,

        reportDate:
          new Date().toLocaleDateString()
      },

      attachments: [
        {
          filename:
            `tax_report_${taxPeriod}.pdf`,

          content:
            pdf
        },

        {
          filename:
            `tax_report_${taxPeriod}.xlsx`,

          content:
            excel
        }
      ]
    });

    await TaxSummary.findOneAndUpdate(
      { taxPeriod },
      {
        reported: true,

        reportedAt:
          new Date(),

        reportReference:
          `REP_${taxPeriod}_${Date.now()}`
      }
    );

    return {
      success: true,

      message:
        'Tax report submitted successfully'
    };

  } catch (error: any) {

    console.error(
      'Submit tax report error:',
      error
    );

    return {
      success: false,

      error:
        error?.message ||
        'Failed to submit tax report'
    };
  }
}

// ============================================
// REGISTER USER FOR TAX
// ============================================

export async function registerUserForTax(
  userId: mongoose.Types.ObjectId | string,
  taxId: string,
  taxRegistrationNumber: string
) {
  try {

    const userTaxProfile =
      await UserTaxProfile.findOneAndUpdate(
        { userId },
        {
          taxId,

          taxRegistrationNumber,

          isTaxRegistered: true,

          updatedAt:
            new Date()
        },
        {
          upsert: true,

          new: true
        }
      );

    await User.findByIdAndUpdate(
      userId,
      {
        'taxProfile.taxId':
          taxId,

        'taxProfile.taxRegistrationNumber':
          taxRegistrationNumber,

        'taxProfile.isTaxRegistered':
          true
      }
    );

    return userTaxProfile;

  } catch (error) {

    console.error(
      'Tax registration error:',
      error
    );

    throw error;
  }
}

// ============================================
// EXEMPT USER FROM TAX
// ============================================

export async function exemptUserFromTax(
  userId: mongoose.Types.ObjectId | string,
  exemptionType: string,
  exemptionCertificate: string
) {
  try {

    const userTaxProfile =
      await UserTaxProfile.findOneAndUpdate(
        { userId },
        {
          taxExempt: true,

          exemptionType,

          exemptionCertificate,

          updatedAt:
            new Date()
        },
        {
          upsert: true,

          new: true
        }
      );

    await User.findByIdAndUpdate(
      userId,
      {
        'taxProfile.taxExempt':
          true,

        'taxProfile.exemptionType':
          exemptionType
      }
    );

    return userTaxProfile;

  } catch (error) {

    console.error(
      'Tax exemption error:',
      error
    );

    throw error;
  }
}