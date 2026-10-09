"use client";

import { useState } from "react";
import { useConvexQuery } from "@/hooks/use-convex-query";
import { api } from "@/convex/_generated/api";

import { Card, CardContent } from "@/components/ui/card";
import { CATEGORIES } from "@/lib/data";
import LiveEventSearch from "@/components/live-event-search";

export default function ExplorePage() {
  const { data: currentUser } = useConvexQuery(
    api.users.getCurrentUser
  );

  const [selectedCategory, setSelectedCategory] =
    useState(
      CATEGORIES[0]?.id || "technology"
    );

  const handleCategoryClick = (categoryId) => {
    setSelectedCategory(categoryId);

    setTimeout(() => {
      document
        .getElementById("live-event-search")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 50);
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="pb-12 text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-4">
          Discover Events
        </h1>

        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
          Explore upcoming events from the live web
          by category and location.
        </p>
      </div>

      {/* Browse by Category */}
      <div className="mb-12">
        <div className="mb-6">
          <h2 className="text-3xl font-bold mb-2">
            Browse by Category
          </h2>

          <p className="text-muted-foreground">
            Choose a category to find upcoming events.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {CATEGORIES.map((category) => {
            const isSelected =
              selectedCategory === category.id;

            return (
              <Card
                key={category.id}
                className={`py-2 group cursor-pointer transition-all ${
                  isSelected
                    ? "border-purple-500 bg-purple-500/10"
                    : "hover:border-purple-500/50"
                }`}
                onClick={() =>
                  handleCategoryClick(category.id)
                }
              >
                <CardContent className="px-3 sm:p-6 flex items-center gap-3">
                  <div className="text-3xl sm:text-4xl">
                    {category.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3
                      className={`font-semibold transition-colors ${
                        isSelected
                          ? "text-purple-400"
                          : "group-hover:text-purple-400"
                      }`}
                    >
                      {category.label}
                    </h3>

                    <p className="text-sm text-muted-foreground">
                      {isSelected
                        ? "Selected"
                        : "Discover events"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Live Search */}
      <LiveEventSearch
        category={selectedCategory}
        initialState={
          currentUser?.location?.state || ""
        }
        initialCity={
          currentUser?.location?.city || ""
        }
      />
    </div>
  );
}