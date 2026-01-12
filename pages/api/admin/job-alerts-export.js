import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * API endpoint to export job alerts as CSV (admin only)
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
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Build CSV
    const headers = [
      "Email",
      "Name",
      "Specialty",
      "State",
      "City",
      "Location",
      "Employer",
      "Source",
      "Active",
      "Created At",
      "Last Email Sent",
    ];

    const rows = alerts.map((alert) => [
      alert.email || "",
      alert.name || "",
      alert.specialty || "",
      alert.state || "",
      alert.city || "",
      alert.location || "",
      alert.employer?.name || "",
      alert.source || "",
      alert.active ? "Yes" : "No",
      alert.createdAt ? new Date(alert.createdAt).toISOString() : "",
      alert.lastEmailSent ? new Date(alert.lastEmailSent).toISOString() : "",
    ]);

    // Escape CSV values
    const escapeCSV = (value) => {
      if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map(escapeCSV).join(",")),
    ].join("\n");

    // Set headers for CSV download
    const filename = `job-alerts-${new Date().toISOString().split("T")[0]}.csv`;
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    return res.status(200).send(csvContent);
  } catch (error) {
    console.error("Error exporting job alerts:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
