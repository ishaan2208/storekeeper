import Link from "next/link";
import {
  Package,
  PackagePlus,
  PackageMinus,
  PackageCheck,
  ArrowRightLeft,
  FileText,
  Boxes,
  Tags,
  Wrench,
  AlertCircle,
  BarChart3,
  AlertTriangle,
  Building,
  MapPin,
  FolderTree,
  List,
  Tag,
  Users,
  Info,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CardContainer, CardBody, CardItem } from "@/components/ui/3d-card";
import { CardSpotlight } from "@/components/ui/card-spotlight";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";

interface QuickActionCardProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  variant?: "default" | "primary";
}

function QuickActionCard({
  href,
  icon,
  title,
  description,
  variant = "default",
}: QuickActionCardProps) {
  if (variant === "primary") {
    return (
      <Link href={href}>
        <CardSpotlight
          className="border-primary/50 bg-gradient-to-br from-primary/5 to-accent/5 transition-all hover:border-primary hover:shadow-lg hover:shadow-primary/10"
          radius={350}
        >
          <CardContent className="flex gap-4 p-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              {icon}
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="font-semibold leading-none">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 self-center text-muted-foreground" />
          </CardContent>
        </CardSpotlight>
      </Link>
    );
  }

  return (
    <Link href={href}>
      <CardContainer className="w-full">
        <CardBody className="w-full">
          <Card className="transition-all hover:border-primary/30 hover:shadow-md w-full">
            <CardItem translateZ="50" className="w-full">
              <CardContent className="flex gap-4 p-5">
                <CardItem
                  translateZ="100"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
                >
                  {icon}
                </CardItem>
                <div className="flex-1 space-y-1">
                  <CardItem translateZ="50" as="h3" className="font-semibold leading-none">
                    {title}
                  </CardItem>
                  <CardItem translateZ="60" as="p" className="text-sm text-muted-foreground">
                    {description}
                  </CardItem>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 self-center text-muted-foreground" />
              </CardContent>
            </CardItem>
          </Card>
        </CardBody>
      </CardContainer>
    </Link>
  );
}

export default function Home() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="space-y-3">
        <TextGenerateEffect
          words="Welcome to Storekeeper"
          className="text-4xl tracking-tight"
        />
        <p className="text-lg text-muted-foreground">
          Internal inventory and maintenance tracker for your organization.
        </p>
      </div>

      {/* Dashboard Stats - Bento Grid */}
      <BentoGrid className="max-w-full">
        <BentoGridItem
          title="Quick Stats"
          description="Overview of your inventory status"
          header={
            <div className="flex flex-col gap-2 p-4 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Assets</span>
                <Package className="h-4 w-4 text-primary" />
              </div>
              <p className="text-2xl font-bold">View Dashboard</p>
            </div>
          }
          className="md:col-span-1"
        />
        <BentoGridItem
          title="Recent Activity"
          description="Latest inventory movements and updates"
          header={
            <div className="flex flex-col gap-2 p-4 bg-gradient-to-br from-primary/5 to-accent/5 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Last 7 Days</span>
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <p className="text-2xl font-bold">Activity Log</p>
            </div>
          }
          className="md:col-span-2"
        />
        <BentoGridItem
          title="Low Stock Alerts"
          description="Items that need restocking"
          header={
            <div className="flex flex-col gap-2 p-4 bg-gradient-to-br from-destructive/10 to-destructive/5 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Attention Needed</span>
                <AlertCircle className="h-4 w-4 text-destructive" />
              </div>
              <p className="text-2xl font-bold">Check Stock</p>
            </div>
          }
          className="md:col-span-2"
        />
        <BentoGridItem
          title="Maintenance"
          description="Active maintenance tickets"
          header={
            <div className="flex flex-col gap-2 p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pending</span>
                <Wrench className="h-4 w-4 text-primary" />
              </div>
              <p className="text-2xl font-bold">View Tickets</p>
            </div>
          }
          className="md:col-span-1"
        />
      </BentoGrid>

      {/* Daily Operations */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-semibold tracking-tight">
            Daily Operations
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <QuickActionCard
            href="/slips/new/receive"
            icon={<PackagePlus className="h-6 w-6" />}
            title="Receive Items (GRN)"
            description="Record incoming inventory from vendors or new purchases."
            variant="primary"
          />
          <QuickActionCard
            href="/slips/new/issue"
            icon={<PackageMinus className="h-6 w-6" />}
            title="Issue Items"
            description="Send equipment or consumables from one location to another."
          />
          <QuickActionCard
            href="/slips/new/return"
            icon={<PackageCheck className="h-6 w-6" />}
            title="Return Items"
            description="Record items coming back and update the condition if needed."
          />
          <QuickActionCard
            href="/slips/new/transfer"
            icon={<ArrowRightLeft className="h-6 w-6" />}
            title="Transfer Items"
            description="Move items between locations or properties without issue/return flow."
          />
          <QuickActionCard
            href="/slips"
            icon={<FileText className="h-6 w-6" />}
            title="View All Slips"
            description="Browse and filter movement history."
          />
        </div>
      </section>

      <Separator />

      {/* Inventory Views */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-semibold tracking-tight">
            Inventory Views
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <QuickActionCard
            href="/inventory/stock"
            icon={<Boxes className="h-6 w-6" />}
            title="Stock Inventory"
            description="View quantity-tracked items with low-stock indicators."
          />
          <QuickActionCard
            href="/inventory/assets"
            icon={<Tags className="h-6 w-6" />}
            title="Asset Inventory"
            description="Track individually tagged assets with condition and status."
          />
        </div>
      </section>

      <Separator />

      {/* Maintenance */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-semibold tracking-tight">Maintenance</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <QuickActionCard
            href="/maintenance"
            icon={<Wrench className="h-6 w-6" />}
            title="Maintenance Tickets"
            description="View and manage asset maintenance activities and repairs."
          />
          <QuickActionCard
            href="/maintenance/new"
            icon={<AlertCircle className="h-6 w-6" />}
            title="Report Issue"
            description="Create a new maintenance ticket for a broken or damaged asset."
          />
        </div>
      </section>

      <Separator />

      {/* Reports & Analytics */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-semibold tracking-tight">
            Reports & Analytics
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <QuickActionCard
            href="/reports/issues"
            icon={<BarChart3 className="h-6 w-6" />}
            title="Issues Report"
            description="Track all issue movements with advanced filtering."
          />
          <QuickActionCard
            href="/reports/maintenance"
            icon={<Wrench className="h-6 w-6" />}
            title="Maintenance Report"
            description="Analyze maintenance tickets with cost tracking."
          />
          <QuickActionCard
            href="/reports/damage-scrap"
            icon={<AlertTriangle className="h-6 w-6" />}
            title="Damage & Scrap"
            description="Monitor damage reports and scrapped assets."
          />
        </div>
      </section>

      <Separator />

      {/* Master Data */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <List className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-semibold tracking-tight">Master Data</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <QuickActionCard
            href="/masters/properties"
            icon={<Building className="h-6 w-6" />}
            title="Properties"
            description="Manage hotel properties and facilities."
          />
          <QuickActionCard
            href="/masters/locations"
            icon={<MapPin className="h-6 w-6" />}
            title="Locations"
            description="Manage storage and department locations."
          />
          <QuickActionCard
            href="/masters/categories"
            icon={<FolderTree className="h-6 w-6" />}
            title="Categories"
            description="Organize items with hierarchical categories."
          />
          <QuickActionCard
            href="/masters/items"
            icon={<List className="h-6 w-6" />}
            title="Items"
            description="Manage inventory items (assets and stock)."
          />
          <QuickActionCard
            href="/masters/assets"
            icon={<Tag className="h-6 w-6" />}
            title="Assets"
            description="Track individual assets with unique tags."
          />
          <QuickActionCard
            href="/users"
            icon={<Users className="h-6 w-6" />}
            title="Users"
            description="Manage system users and roles (Admin only)."
          />
        </div>
      </section>

      {/* Quick Guide */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-6">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Info className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Quick Guide</h3>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    Use Receive Items (GRN) to record incoming inventory from
                    vendors or new purchases.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    Use Issue Items when stock or equipment is sent out.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    Use Return Items when stock or equipment is received back.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    Use Transfer Items for simple location-to-location moves.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    Set up master data (properties, locations, categories,
                    items) before creating slips.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    All create/update operations are logged in the audit trail.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
