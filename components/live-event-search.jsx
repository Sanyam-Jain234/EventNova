"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, MapPin, Search } from "lucide-react";
import { State, City } from "country-state-city";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const categories = [
  { id: "technology", label: "Technology" },
  { id: "music", label: "Music" },
  { id: "sports", label: "Sports" },
  { id: "art", label: "Art & Culture" },
  { id: "food", label: "Food & Drink" },
  { id: "business", label: "Business" },
  { id: "health", label: "Health & Wellness" },
  { id: "education", label: "Education" },
  { id: "gaming", label: "Gaming" },
  { id: "networking", label: "Networking" },
  { id: "outdoor", label: "Outdoor & Adventure" },
  { id: "community", label: "Community" },
];

export default function LiveEventSearch({
  category,
  onCategoryChange,
  initialCity = "",
  initialState = "",
}) {
  const [selectedCategory, setSelectedCategory] = useState(
    category || "technology"
  );

  const [selectedState, setSelectedState] = useState(initialState);
  const [selectedCity, setSelectedCity] = useState(initialCity);

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (category) {
      setSelectedCategory(category);
    }
  }, [category]);

  const indianStates = useMemo(
    () => State.getStatesOfCountry("IN"),
    []
  );

  const cities = useMemo(() => {
    if (!selectedState) return [];

    const stateData = indianStates.find(
      (state) => state.name === selectedState
    );

    if (!stateData) return [];

    return City.getCitiesOfState(
      "IN",
      stateData.isoCode
    );
  }, [selectedState, indianStates]);

  const handleCategoryChange = (value) => {
    setSelectedCategory(value);
    onCategoryChange?.(value);
    setEvents([]);
    setSearched(false);
  };

  const handleStateChange = (value) => {
    setSelectedState(value);
    setSelectedCity("");
    setEvents([]);
    setSearched(false);
  };

  const searchEvents = async () => {
    if (!selectedCategory) {
      setError("Please select a category.");
      return;
    }

    if (!selectedState) {
      setError("Please select a state.");
      return;
    }

    if (!selectedCity) {
      setError("Please select a city.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSearched(false);

      const response = await fetch("/api/search-events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category: selectedCategory,
          city: selectedCity,
          state: selectedState,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to search events"
        );
      }

      setEvents(data.events || []);
      setSearched(true);
    } catch (err) {
      console.error(err);
      setError(
        err.message || "Failed to search for events"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      id="live-event-search"
      className="mb-16 scroll-mt-24"
    >
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />

          <span className="text-sm text-green-400 font-medium">
            LIVE WEB EVENTS
          </span>
        </div>

        <h2 className="text-3xl font-bold">
          Discover Live Events
        </h2>

        <p className="text-muted-foreground mt-1">
          Search upcoming events from across the web.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        {/* Category */}
        <select
          value={selectedCategory}
          onChange={(e) =>
            handleCategoryChange(e.target.value)
          }
          className="h-10 rounded-md border border-border bg-background px-3 text-sm"
        >
          {categories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>

        {/* State */}
        <select
          value={selectedState}
          onChange={(e) =>
            handleStateChange(e.target.value)
          }
          className="h-10 rounded-md border border-border bg-background px-3 text-sm"
        >
          <option value="">Select state</option>

          {indianStates.map((state) => (
            <option
              key={state.isoCode}
              value={state.name}
            >
              {state.name}
            </option>
          ))}
        </select>

        {/* City */}
        <select
          value={selectedCity}
          onChange={(e) => {
            setSelectedCity(e.target.value);
            setEvents([]);
            setSearched(false);
          }}
          disabled={!selectedState}
          className="h-10 rounded-md border border-border bg-background px-3 text-sm disabled:opacity-50"
        >
          <option value="">
            {selectedState
              ? "Select city"
              : "Select state first"}
          </option>

          {cities.map((city) => (
            <option key={city.name} value={city.name}>
              {city.name}
            </option>
          ))}
        </select>
      </div>

      <Button
        onClick={searchEvents}
        disabled={loading}
        className="gap-2 mb-6"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Searching live events...
          </>
        ) : (
          <>
            <Search className="w-4 h-4" />
            Search Live Events
          </>
        )}
      </Button>

      {error && (
        <Card className="border-red-500/30 mb-6">
          <CardContent className="p-6 text-center">
            <p className="text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {!loading &&
        searched &&
        events.length === 0 &&
        !error && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                No upcoming events found for this
                category and location.
              </p>
            </CardContent>
          </Card>
        )}

      {events.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold">
                Upcoming {categories.find(
                  (item) =>
                    item.id === selectedCategory
                )?.label} Events
              </h3>

              <p className="text-sm text-muted-foreground">
                {selectedCity}, {selectedState}
              </p>
            </div>

            <span className="text-sm text-muted-foreground">
              {events.length} found
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event, index) => (
              <Card
                key={`${event.url}-${index}`}
                className="group hover:border-purple-500/50 transition-all"
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-400">
                      Upcoming
                    </span>
                  </div>

                  <h3 className="font-semibold text-lg line-clamp-2 mb-3 group-hover:text-purple-400 transition-colors">
                    {event.title}
                  </h3>

                  <p className="text-sm text-muted-foreground line-clamp-4 mb-4">
                    {event.description}
                  </p>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <MapPin className="w-4 h-4" />
                    <span>
                      {selectedCity},{" "}
                      {selectedState}
                    </span>
                  </div>

                  <Button
                    asChild
                    variant="outline"
                    className="w-full gap-2"
                  >
                    <a
                      href={event.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open Event Page
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </section>
  );
}