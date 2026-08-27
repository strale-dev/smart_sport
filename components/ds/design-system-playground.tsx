"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "motion/react";
import { InboxIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { DataQualityChip } from "@/components/ai/DataQualityChip";
import { Wordmark } from "@/components/brand/Wordmark";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LiveDot } from "@/components/common/LiveDot";
import { StaleBadge } from "@/components/common/StaleBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  motionTransition,
  pulseKeyframes,
  usePrefersReducedMotion,
} from "@/lib/motion";
import { cn } from "@/lib/utils";

const demoFormSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

type DemoFormValues = z.infer<typeof demoFormSchema>;

const tokenSwatches = [
  { name: "Background", className: "bg-background border-border border" },
  { name: "Surface", className: "bg-card border-border border" },
  { name: "Primary", className: "bg-primary" },
  { name: "Info", className: "bg-info" },
  { name: "Success", className: "bg-success" },
  { name: "Warning", className: "bg-warning" },
  { name: "Live", className: "bg-live" },
  { name: "Destructive", className: "bg-destructive" },
] as const;

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-heading text-lg font-semibold">{title}</h2>
        {description ? (
          <p className="text-muted-foreground text-sm">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function MotionDemo() {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <div className="flex items-center gap-4">
      <motion.div
        className="bg-primary size-10"
        animate={pulseKeyframes(prefersReducedMotion)}
        transition={motionTransition(prefersReducedMotion, {
          duration: 1.2,
          ease: "easeInOut" as const,
        })}
      />
      <p className="text-muted-foreground text-sm">
        {prefersReducedMotion
          ? "Reduced motion is active — animations are disabled."
          : "Mint pulse demo respects prefers-reduced-motion."}
      </p>
    </div>
  );
}

function DemoForm() {
  const form = useForm<DemoFormValues>({
    resolver: zodResolver(demoFormSchema),
    defaultValues: { email: "" },
  });

  return (
    <Form {...form}>
      <form
        className="max-w-sm space-y-4"
        onSubmit={form.handleSubmit(() => {
          toast.add({
            title: "Subscribed",
            description: "Waitlist form demo submitted.",
            type: "success",
          });
        })}
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="you@example.com" {...field} />
              </FormControl>
              <FormDescription>
                Demo form wired with react-hook-form + Zod.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit demo</Button>
      </form>
    </Form>
  );
}

export function DesignSystemPlayground() {
  const staleDate = "2026-01-01T12:00:00.000Z";

  return (
    <TooltipProvider>
      <div className="space-y-10 pb-10">
        <header className="space-y-2">
          <p className="text-info text-xs font-medium tracking-wide uppercase">
            Internal only
          </p>
          <h1 className="font-heading text-2xl font-semibold">
            Kivora Design System
          </h1>
          <p className="text-muted-foreground max-w-2xl text-sm">
            Phase 0 tokens, typography, shadcn primitives, state components, and
            motion patterns for the analytics shell.
          </p>
        </header>

        <Section title="Color tokens">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {tokenSwatches.map((swatch) => (
              <div key={swatch.name} className="space-y-2">
                <div className={cn("h-12", swatch.className)} />
                <p className="text-xs">{swatch.name}</p>
              </div>
            ))}
          </div>
        </Section>

        <Separator />

        <Section title="Typography">
          <div className="space-y-3">
            <p className="font-heading text-2xl font-semibold">
              Space Grotesk — display heading
            </p>
            <p className="text-sm">
              Inter — body copy for dense analytics UI with comfortable reading.
            </p>
            <p className="font-mono text-sm tabular-nums">
              JetBrains Mono — 1.82 · 62% · 1.24 xG · 78%
            </p>
          </div>
        </Section>

        <Separator />

        <Section title="Wordmark">
          <div className="flex flex-wrap items-end gap-8">
            <Wordmark size="nav" />
            <Wordmark size="hero" />
          </div>
        </Section>

        <Separator />

        <Section title="Buttons & badges">
          <div className="flex flex-wrap gap-2">
            <Button>Primary CTA</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link" className="text-info">
              Analytical link
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="success">Win</Badge>
            <Badge variant="warning">Draw</Badge>
            <Badge variant="destructive">Loss</Badge>
            <Badge variant="info">Analytics</Badge>
            <Badge variant="live">Live</Badge>
          </div>
        </Section>

        <Separator />

        <Section title="Tabs, tooltip, dropdown">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="stats">Stats</TabsTrigger>
              <TabsTrigger value="lineups">Lineups</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="text-sm">
              Compact tab panel for match analytics sections.
            </TabsContent>
            <TabsContent value="stats" className="text-sm">
              Stats tab placeholder content.
            </TabsContent>
            <TabsContent value="lineups" className="text-sm">
              Lineups tab placeholder content.
            </TabsContent>
          </Tabs>

          <div className="flex flex-wrap gap-2">
            <Tooltip>
              <TooltipTrigger render={<Button variant="outline" size="sm" />}>
                Hover me
              </TooltipTrigger>
              <TooltipContent>Probability tooltip</TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="outline" size="sm" />}
              >
                Menu
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Dashboard</DropdownMenuItem>
                <DropdownMenuItem>Live Center</DropdownMenuItem>
                <DropdownMenuItem>Matches</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </Section>

        <Separator />

        <Section title="Dialog, sheet, toast">
          <div className="flex flex-wrap gap-2">
            <Dialog>
              <DialogTrigger render={<Button variant="outline" size="sm" />}>
                Open dialog
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Dialog title</DialogTitle>
                  <DialogDescription>
                    Modal surface for confirmations and focused tasks.
                  </DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>

            <Sheet>
              <SheetTrigger render={<Button variant="outline" size="sm" />}>
                Open sheet
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle>Sheet panel</SheetTitle>
                  <SheetDescription>
                    Mobile-friendly contextual panel pattern.
                  </SheetDescription>
                </SheetHeader>
              </SheetContent>
            </Sheet>

            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                toast.add({
                  title: "Toast demo",
                  description: "Base UI toast wired through shadcn.",
                  type: "info",
                })
              }
            >
              Show toast
            </Button>
          </div>
        </Section>

        <Separator />

        <Section title="Glass card">
          <Card>
            <CardHeader>
              <CardTitle>Match intelligence card</CardTitle>
              <CardDescription>
                Translucent surface with backdrop blur for analytics blocks.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Arsenal</span>
                <span className="font-mono tabular-nums">2 – 1</span>
                <span>Chelsea</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="info">62% home</Badge>
                <LiveDot />
              </div>
            </CardContent>
          </Card>
        </Section>

        <Separator />

        <Section title="State components">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardContent className="pt-6">
                <EmptyState
                  icon={InboxIcon}
                  title="No followed teams yet"
                  description="Follow clubs to see them on your dashboard."
                  actionLabel="Browse teams"
                  onAction={() => undefined}
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <ErrorState onRetry={() => undefined} />
              </CardContent>
            </Card>
          </div>
          <div className="flex flex-wrap gap-2">
            <StaleBadge updatedAt={new Date()} />
            <StaleBadge updatedAt={staleDate} staleAfterSeconds={60} />
            <DataQualityChip quality="COMPLETE" />
            <DataQualityChip quality="PARTIAL" />
            <DataQualityChip quality="STALE" />
          </div>
        </Section>

        <Separator />

        <Section title="Skeleton & motion">
          <div className="space-y-3">
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <MotionDemo />
          </div>
        </Section>

        <Separator />

        <Section title="Form">
          <DemoForm />
        </Section>
      </div>
    </TooltipProvider>
  );
}
