import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Only allow GET requests
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get userId from session (you need to add authentication)
    // For now, we'll use a placeholder - update this based on your auth implementation
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get current date for calculations
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // 1. Get all bank accounts for this user
    const bankAccounts = await prisma.bankAccount.findMany({
      where: {
        ownerId: userId,
        isActive: true,
      },
      select: {
        id: true,
        bankProvider: true,
        accountNumber: true,
        accountName: true,
        currency: true,
      },
    });

    // 2. Get all transactions for the user's accounts (last 90 days)
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const transactions = await prisma.bankTransaction.findMany({
      where: {
        bankAccount: { ownerId: userId },
        transactionDate: { gte: ninetyDaysAgo },
      },
      include: {
        category: true,
        bankAccount: true,
      },
      orderBy: { transactionDate: "desc" },
    });

    // 3. Calculate metrics
    const currentMonthTransactions = transactions.filter(
      (t) =>
        t.transactionDate >= currentMonthStart &&
        t.transactionDate <= currentMonthEnd,
    );

    const totalIncome = currentMonthTransactions
      .filter((t) => t.type === "CREDIT")
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

    const totalExpense = currentMonthTransactions
      .filter((t) => t.type === "DEBIT")
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

    const netFlow = totalIncome - totalExpense;

    // 4. Get the current balance (last transaction of each account)
    const accountBalances = await Promise.all(
      bankAccounts.map(async (account) => {
        const lastTransaction = await prisma.bankTransaction.findFirst({
          where: { bankAccountId: account.id },
          orderBy: { transactionDate: "desc" },
          select: { balance: true },
        });
        return {
          ...account,
          balance: lastTransaction?.balance || 0,
        };
      }),
    );

    const totalBalance = accountBalances.reduce(
      (sum, acc) => sum + parseFloat(acc.balance.toString()),
      0,
    );

    // 5. Get monthly cash flow (last 12 months)
    const monthlyData: Array<{
      month: string;
      credit: number;
      debit: number;
    }> = [];

    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth(),
        1,
      );
      const monthEnd = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth() + 1,
        0,
      );

      const monthTransactions = transactions.filter(
        (t) => t.transactionDate >= monthStart && t.transactionDate <= monthEnd,
      );

      const credit = monthTransactions
        .filter((t) => t.type === "CREDIT")
        .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

      const debit = monthTransactions
        .filter((t) => t.type === "DEBIT")
        .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

      monthlyData.push({
        month: monthDate.toLocaleDateString("id-ID", {
          year: "numeric",
          month: "short",
        }),
        credit,
        debit,
      });
    }

    // 6. Get spending by category
    const categoryExpenses = await prisma.bankTransaction.groupBy({
      by: ["categoryId"],
      where: {
        bankAccount: { ownerId: userId },
        type: "DEBIT",
        transactionDate: { gte: ninetyDaysAgo },
      },
      _sum: {
        amount: true,
      },
    });

    const spendingByCategory = await Promise.all(
      categoryExpenses
        .filter((c) => c.categoryId !== null)
        .map(async (item) => {
          const category = await prisma.transactionCategory.findUnique({
            where: { id: item.categoryId! },
          });
          return {
            category: category?.name || "Uncategorized",
            amount: parseFloat(item._sum.amount?.toString() || "0"),
          };
        }),
    );

    // 7. Get recent transactions (last 10)
    const recentTransactions = transactions.slice(0, 10).map((t) => ({
      id: t.id,
      date: t.transactionDate,
      description: t.description,
      type: t.type,
      amount: parseFloat(t.amount.toString()),
      category: t.category?.name || "Uncategorized",
      bankAccount: t.bankAccount.accountName,
      reference: t.reference,
    }));

    // 8. Calculate net flow trend (monthly)
    const netFlowTrend = monthlyData.map((month) => ({
      month: month.month,
      netFlow: month.credit - month.debit,
    }));

    // Return all data
    return res.status(200).json({
      metrics: {
        totalIncome,
        totalExpense,
        netFlow,
        totalBalance,
      },
      cashFlow: monthlyData,
      bankAccounts: accountBalances,
      spendingByCategory,
      recentTransactions,
      netFlowTrend,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
