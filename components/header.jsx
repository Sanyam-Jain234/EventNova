"use client";

import React from "react";
import Link from "next/link";

import {
  Building,
  Plus,
  Ticket,
} from "lucide-react";

import {
  SignInButton,
  UserButton,
  SignedIn,
  SignedOut,
} from "@clerk/nextjs";

import { BarLoader } from "react-spinners";

import { useStoreUser } from "@/hooks/use-store-user";
import { useOnboarding } from "@/hooks/use-onboarding";

import OnboardingModal from "./onboarding-modal";
import SearchLocationBar from "./search-location-bar";

import { Button } from "@/components/ui/button";

export default function Header() {
  const { isLoading } =
    useStoreUser();

  const {
    showOnboarding,
    handleOnboardingComplete,
    handleOnboardingSkip,
  } =
    useOnboarding();

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 bg-background/80 backdrop-blur-xl z-20 border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}

          <Link
            href="/"
            className="flex items-center"
          >
            <span className="text-2xl font-bold tracking-tight">
              Event
              <span className="text-purple-500">
                Nova
              </span>
            </span>
          </Link>

          {/* Search */}

          <div className="hidden md:flex flex-1 justify-center">
            <SearchLocationBar />
          </div>

          {/* Actions */}

          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="mr-2"
            >
              <Link href="/explore">
                Explore
              </Link>
            </Button>

            <SignedIn>
              <Button
                size="sm"
                asChild
                className="flex gap-2 mr-4"
              >
                <Link href="/create-event">
                  <Plus className="w-4 h-4" />

                  <span className="hidden sm:inline">
                    Create Event
                  </span>
                </Link>
              </Button>

              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox:
                      "w-9 h-9",
                  },
                }}
              >
                <UserButton.MenuItems>
                  <UserButton.Link
                    label="My Tickets"
                    labelIcon={
                      <Ticket
                        size={16}
                      />
                    }
                    href="/my-tickets"
                  />

                  <UserButton.Link
                    label="My Events"
                    labelIcon={
                      <Building
                        size={16}
                      />
                    }
                    href="/my-events"
                  />

                  <UserButton.Action
                    label="manageAccount"
                  />
                </UserButton.MenuItems>
              </UserButton>
            </SignedIn>

            <SignedOut>
              <SignInButton mode="modal">
                <Button size="sm">
                  Sign In
                </Button>
              </SignInButton>
            </SignedOut>
          </div>
        </div>

        {/* Mobile Search */}

        <div className="md:hidden border-t px-3 py-3">
          <SearchLocationBar />
        </div>

        {isLoading && (
          <div className="absolute bottom-0 left-0 w-full">
            <BarLoader
              width="100%"
              color="#a855f7"
            />
          </div>
        )}
      </nav>

      {/* Onboarding */}

      <OnboardingModal
        isOpen={
          showOnboarding
        }
        onClose={
          handleOnboardingSkip
        }
        onComplete={
          handleOnboardingComplete
        }
      />
    </>
  );
}