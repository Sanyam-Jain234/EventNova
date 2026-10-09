import React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="pb-16 relative overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center relative z-10">
          {/* Left content */}
          <div className="text-center sm:text-left">
            <div className="mb-6">
              <span className="text-gray-400 font-medium tracking-wide">
                EventNova
              </span>
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold mb-6 leading-[0.95] tracking-tight">
              Discover events.
              <br />
              Create experiences.
              <br />
              <span className="bg-linear-to-r from-blue-400 via-purple-400 to-orange-400 bg-clip-text text-transparent">
                All in one place.
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-400 mb-10 max-w-xl font-light">
              EventNova brings event discovery, creation, registration, and
              management together in one simple platform.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center sm:justify-start">
              <Link href="/explore">
                <Button size="xl" className="rounded-full px-8">
                  Explore Events
                </Button>
              </Link>

              <Link href="/create-event">
                <Button
                  size="xl"
                  variant="outline"
                  className="rounded-full px-8"
                >
                  Create an Event
                </Button>
              </Link>
            </div>
          </div>

          {/* Right - EventNova visual */}
          <div className="relative block">
            <Image
              src="/EventNova-hero.png"
              alt="EventNova event management platform"
              width={700}
              height={700}
              className="w-full h-auto"
              priority
            />
          </div>
        </div>
      </section>
    </div>
  );
}