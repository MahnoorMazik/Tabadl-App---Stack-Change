"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Menu } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeSwitcher } from "./ThemeSwitcher";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function MainHeader() {
  const { t } = useLocale();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigationLinks = [
    { href: "/", label: t("nav.home") },
    { href: "/about-us", label: t("nav.about") },
    { href: "/misa", label: t("nav.misa") },
    { href: "/premium-residency", label: t("nav.premiumResidency") },
    { href: "/contact", label: t("nav.contact") },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 w-full bg-white/90 dark:bg-background/90 backdrop-blur-lg border-b dark:border-border z-50 transition-all">
      <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Left side: Logo with adjusted padding */}
          <div className="flex items-center flex-shrink-0 pl-2 sm:pl-4">
            <Link href="/" className="flex items-center">
              {/* Reduced logo size - Left aligned */}
              <img
                src="/logo-horizontal.png"
                alt="TABADL ALKON"
                className="h-7 sm:h-8 md:h-9 lg:h-10 w-auto cursor-pointer"
                width={180}
                height={45}
                loading="eager"
                fetchPriority="high"
              />
            </Link>
          </div>
          
          {/* Center: Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6 xl:gap-8 absolute left-1/2 transform -translate-x-1/2">
            {navigationLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-gray-600 dark:text-foreground hover:text-[#0B6B37] transition-colors font-medium text-sm xl:text-base"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side: Language switcher, theme switcher, buttons (desktop) / Hamburger menu (mobile/tablet) */}
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-shrink-0">
            {/* Language Switcher - Hidden on mobile, shown on tablet+ */}
            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>
            {/* Theme Switcher - Hidden on mobile, shown on tablet+ */}
            <div className="hidden sm:block">
              <ThemeSwitcher />
            </div>
            
            {/* Desktop: Show buttons */}
            <Link href="/login" className="hidden md:block">
              <Button variant="ghost" size="sm" className="text-sm">
                {t("nav.login")}
              </Button>
            </Link>
            <Link href="/signup" className="hidden md:block">
              <Button size="sm" className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg border-0 text-sm">
                {t("nav.getStarted")}
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
            
            {/* Hamburger menu (mobile/tablet) - Right side */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Sheet */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="right" className="w-[85vw] sm:w-[400px] max-w-[400px] overflow-y-auto">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle className="text-left text-xl font-bold">{t("nav.menu")}</SheetTitle>
          </SheetHeader>
          
          {/* Language and Theme Switchers in Mobile Menu */}
          <div className="pt-4 pb-2 sm:hidden flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeSwitcher />
          </div>
          
          <nav className="flex flex-col gap-1 mt-4">
            {navigationLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-gray-700 dark:text-foreground hover:text-[#0B6B37] hover:bg-gray-50 dark:hover:bg-card transition-colors font-medium text-base py-3 px-4 rounded-lg"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Action Buttons - Prominently displayed */}
          <div className="flex flex-col gap-3 mt-6 pt-6 border-t border-gray-200">
            <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="w-full">
              <Button variant="outline" className="w-full h-11 text-base font-semibold">
                {t("nav.login")}
              </Button>
            </Link>
            <Link href="/signup" onClick={() => setIsMobileMenuOpen(false)} className="w-full">
              <Button className="w-full h-11 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg border-0 text-base font-semibold">
                {t("nav.getStarted")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}

