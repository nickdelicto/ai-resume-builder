import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * API endpoint to get all users with subscription info (admin only)
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Check admin auth
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Supports multiple admin emails separated by semicolon or comma
    const adminEmails = (process.env.ADMIN_EMAIL || '')
      .split(/[;,]/)
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);
    const isAdmin = adminEmails.includes(session.user.email.toLowerCase());
    if (!isAdmin) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Fetch all users with subscriptions and resume count
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        planType: true,
        createdAt: true,
        subscriptions: {
          select: {
            id: true,
            planId: true,
            status: true,
            currentPeriodEnd: true,
            createdAt: true,
            plan: {
              select: {
                name: true,
                price: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 1, // Get most recent subscription
        },
        _count: {
          select: {
            resumeData: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Process users data
    const processedUsers = users.map((user) => {
      const latestSub = user.subscriptions[0];
      const isActive = latestSub &&
        latestSub.status === "active" &&
        new Date(latestSub.currentPeriodEnd) > new Date();

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        planType: user.planType,
        createdAt: user.createdAt,
        resumeCount: user._count.resumeData,
        subscription: latestSub ? {
          planName: latestSub.plan?.name || latestSub.planId,
          price: latestSub.plan?.price || 0,
          status: latestSub.status,
          expiresAt: latestSub.currentPeriodEnd,
          isActive,
        } : null,
      };
    });

    // Calculate stats
    const stats = {
      total: processedUsers.length,
      withSubscription: processedUsers.filter(u => u.subscription?.isActive).length,
      free: processedUsers.filter(u => !u.subscription?.isActive).length,
      totalResumes: processedUsers.reduce((sum, u) => sum + u.resumeCount, 0),
      thisMonth: processedUsers.filter(u => {
        const created = new Date(u.createdAt);
        const now = new Date();
        return created.getMonth() === now.getMonth() &&
               created.getFullYear() === now.getFullYear();
      }).length,
    };

    return res.status(200).json({
      success: true,
      users: processedUsers,
      stats,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
