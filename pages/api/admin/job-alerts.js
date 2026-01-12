import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * API endpoint to get all job alert subscriptions (admin only)
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

    // Fetch all job alerts with employer info
    const alerts = await prisma.jobAlert.findMany({
      include: {
        employer: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate stats
    const stats = {
      total: alerts.length,
      active: alerts.filter((a) => a.active).length,
      bySpecialty: {},
      byState: {},
    };

    alerts.forEach((alert) => {
      if (alert.specialty) {
        stats.bySpecialty[alert.specialty] = (stats.bySpecialty[alert.specialty] || 0) + 1;
      }
      if (alert.state) {
        stats.byState[alert.state] = (stats.byState[alert.state] || 0) + 1;
      }
    });

    return res.status(200).json({
      success: true,
      alerts,
      stats,
    });
  } catch (error) {
    console.error("Error fetching job alerts:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
