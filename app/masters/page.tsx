import Link from "next/link";
import {
  Building,
  MapPin,
  FolderTree,
  List,
  Tag,
  Users,
  Info,
  ChevronRight,
  Database,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FocusCards } from "@/components/ui/focus-cards";

const masterSections = [
  {
    href: "/masters/properties",
    icon: Building,
    title: "Properties",
    description: "Manage hotel properties and facilities.",
  },
  {
    href: "/masters/locations",
    icon: MapPin,
    title: "Locations",
    description: "Manage storage and department locations.",
  },
  {
    href: "/masters/categories",
    icon: FolderTree,
    title: "Categories",
    description: "Organize items with hierarchical categories.",
  },
  {
    href: "/masters/items",
    icon: List,
    title: "Items",
    description: "Manage inventory items (assets and stock).",
  },
  {
    href: "/masters/assets",
    icon: Tag,
    title: "Assets",
    description: "Track individual assets with unique tags.",
  },
  {
    href: "/users",
    icon: Users,
    title: "Users",
    description: "Manage system users and roles (Admin only).",
  },
];

export default function MastersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Data"
        description="Manage all your organization master data including properties, locations, categories, items, and assets."
        icon={<Database className="h-5 w-5" />}
        actions={
          <Button variant="outline" asChild>
            <Link href="/">
              <ChevronRight className="mr-2 h-4 w-4 rotate-180" />
              Back to Home
            </Link>
          </Button>
        }
      />

      <FocusCards
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        cards={masterSections.map((section) => {
          const Icon = section.icon;
          return (
            <Link key={section.href} href={section.href}>
              <Card className="transition-all hover:border-primary/30 hover:shadow-md h-full">
                <CardContent className="flex gap-4 p-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h3 className="font-semibold leading-none">{section.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {section.description}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 self-center text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      />

      <Card>
        <CardContent className="p-6">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Info className="h-5 w-5" />
            </div>
            <div className="space-y-3">
              <h3 className="font-semibold">Master Data Guide</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    <strong className="font-medium text-foreground">Properties:</strong> Define
                    the physical properties or facilities where inventory is managed.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    <strong className="font-medium text-foreground">Locations:</strong> Set up
                    specific locations within properties (e.g., rooms, floors, areas).
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    <strong className="font-medium text-foreground">Categories:</strong> Organize
                    items into hierarchical categories for better classification.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    <strong className="font-medium text-foreground">Items:</strong> Create items
                    that can be tracked as either assets (individual) or stock (quantity-based).
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    <strong className="font-medium text-foreground">Assets:</strong> Register
                    individual assets with unique tags, serial numbers, and condition tracking.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    <strong className="font-medium text-foreground">Users:</strong> Manage user
                    accounts and assign appropriate roles for system access.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Alert>
        <ArrowRight className="h-4 w-4" />
        <AlertTitle>Setup Sequence</AlertTitle>
        <AlertDescription>
          <p className="mb-2">For a new installation, set up master data in this order:</p>
          <ol className="space-y-1 pl-4 text-sm">
            <li>1. Create Properties (where your operations are located)</li>
            <li>2. Create Locations within each property</li>
            <li>3. Set up Categories to organize your items</li>
            <li>4. Add Items (both assets and stock types)</li>
            <li>5. Register Assets for individually tracked items</li>
            <li>6. Create Users and assign appropriate roles</li>
          </ol>
        </AlertDescription>
      </Alert>
    </div>
  );
}
