import Link from "next/link";
import { BarChart3, FileText, AlertTriangle, Wrench, TrendingUp, Info } from "lucide-react";

import { requireSessionOrThrow } from "@/lib/auth-server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const reports = [
  {
    href: "/reports/issues",
    icon: FileText,
    title: "Issues Report",
    description:
      "Track all ISSUE_OUT movements with date range, property, location, department, and item type filters.",
    summary: "Total issues, quantity issued",
  },
  {
    href: "/reports/maintenance",
    icon: Wrench,
    title: "Maintenance Report",
    description:
      "Comprehensive maintenance ticket analysis with cost tracking, status, and vendor information.",
    summary: "Total tickets, open tickets, estimated & actual costs",
  },
  {
    href: "/reports/damage-scrap",
    icon: AlertTriangle,
    title: "Damage & Scrap Report",
    description:
      "Monitor damage reports and scrapped assets with approval tracking and detailed filtering.",
    summary: "Damage reports, scrap movements, approval status",
  },
];

export default async function ReportsLandingPage() {
  await requireSessionOrThrow();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Generate and analyze various operational reports with advanced filtering."
        icon={<BarChart3 className="h-5 w-5" />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <Link key={report.href} href={report.href}>
              <Card className="transition-all hover:border-primary/30 hover:shadow-md">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle>{report.title}</CardTitle>
                  </div>
                  <CardDescription>{report.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                    <span>{report.summary}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Report Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>Server-rendered for fast performance with large datasets</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>Advanced filtering by date range, property, location, and more</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>Summary statistics for quick insights</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>Print-friendly layouts for documentation</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>Up to 500 records per report for detailed analysis</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>Real-time data from the database</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Tips for Better Reports</AlertTitle>
        <AlertDescription>
          <ul className="mt-2 space-y-1 text-sm">
            <li>• Use date filters to focus on specific time periods</li>
            <li>• Combine multiple filters for more granular analysis</li>
            <li>• Click "Print" button on any report to generate a printable version</li>
            <li>• Summary cards provide quick KPIs at a glance</li>
            <li>• Clear filters button resets all selections</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}
