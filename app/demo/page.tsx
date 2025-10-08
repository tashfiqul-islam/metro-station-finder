"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { OptimisticDemo } from "@/components/demo/optimistic-demo";
import { StationErrorBoundary } from "@/components/error/station-error-boundary";
import { StationSearchForm } from "@/components/forms/station-search-form";
import { StationListSuspense } from "@/components/suspense/station-list-suspense";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Demo page showcasing React 19 patterns
 * Demonstrates Server Components, Actions API, useOptimistic, and Suspense
 */
export default function DemoPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-border/40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Button asChild size="icon" variant="ghost">
              <Link href="/">
                <ArrowLeft aria-hidden="true" className="h-5 w-5" />
                <span className="sr-only">Back to home</span>
              </Link>
            </Button>
            <h1 className="font-semibold text-foreground text-lg">
              React 19 Demo
            </h1>
            <Badge variant="secondary">Modern Patterns</Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 bg-muted/30">
        <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="space-y-6">
            {/* React 19 Features Overview */}
            <Card>
              <CardHeader>
                <CardTitle>React 19 Modern Patterns Demo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <h3 className="font-semibold">Server Components</h3>
                    <p className="text-muted-foreground text-sm">
                      Data fetching with the new use() hook in server components
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold">Actions API</h3>
                    <p className="text-muted-foreground text-sm">
                      Form submissions with useActionState for state management
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold">useOptimistic</h3>
                    <p className="text-muted-foreground text-sm">
                      Instant UI feedback with optimistic updates
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold">Suspense Boundaries</h3>
                    <p className="text-muted-foreground text-sm">
                      Streaming and lazy loading with proper fallbacks
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Server Component Demo */}
            <Card>
              <CardHeader>
                <CardTitle>Server Component with use() Hook</CardTitle>
              </CardHeader>
              <CardContent>
                <StationErrorBoundary>
                  <StationListSuspense />
                </StationErrorBoundary>
              </CardContent>
            </Card>

            {/* Actions API Demo */}
            <Card>
              <CardHeader>
                <CardTitle>Actions API with useActionState</CardTitle>
              </CardHeader>
              <CardContent>
                <StationErrorBoundary>
                  <StationSearchForm />
                </StationErrorBoundary>
              </CardContent>
            </Card>

            {/* useOptimistic Demo */}
            <Card>
              <CardHeader>
                <CardTitle>useOptimistic Hook Demo</CardTitle>
              </CardHeader>
              <CardContent>
                <StationErrorBoundary>
                  <OptimisticDemo />
                </StationErrorBoundary>
              </CardContent>
            </Card>

            {/* Error Boundary Demo */}
            <Card>
              <CardHeader>
                <CardTitle>Error Boundaries</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-muted-foreground text-sm">
                  Error boundaries are protecting all components above. Try
                  triggering an error to see the fallback UI.
                </p>
                <StationErrorBoundary>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-sm">
                      This content is protected by an error boundary
                    </p>
                  </div>
                </StationErrorBoundary>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
