import { ItemType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const query = searchParams.get("q")?.trim();
  const itemType = searchParams.get("itemType") as ItemType | null;

  if (!query) {
    return NextResponse.json({ assets: [] });
  }

  try {
    const assets = await prisma.asset.findMany({
      where: {
        ...(itemType && { item: { itemType } }),
        OR: [
          {
            assetTag: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            item: {
              name: {
                contains: query,
                mode: "insensitive",
              },
            },
          },
        ],
      },
      include: {
        item: {
          select: {
            id: true,
            name: true,
          },
        },
        currentLocation: {
          select: {
            name: true,
          },
        },
      },
      take: 50,
      orderBy: {
        assetTag: "asc",
      },
    });

    const formatted = assets.map((asset) => ({
      id: asset.id,
      assetTag: asset.assetTag,
      itemId: asset.item.id,
      itemName: asset.item.name,
      condition: asset.condition,
      currentLocationName: asset.currentLocation?.name ?? null,
    }));

    return NextResponse.json({ assets: formatted });
  } catch (error) {
    console.error("Asset search error:", error);
    return NextResponse.json(
      { error: "Failed to search assets" },
      { status: 500 },
    );
  }
}
