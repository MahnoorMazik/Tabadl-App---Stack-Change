"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";

const languages = [
  { code: "en" as const, name: "English", flag: "🇬🇧" },
  { code: "ar" as const, name: "العربية", flag: "🇸🇦" },
];

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale();

  const currentLanguage = languages.find((lang) => lang.code === locale) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center justify-center h-8 sm:h-9 w-8 sm:w-9 p-0"
          aria-label={t("nav.language") || "Change language"}
        >
          <Globe className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
          {t("nav.language") || "Language"}
        </div>
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => setLocale(language.code)}
            className={locale === language.code ? "bg-accent" : ""}
          >
            <span className="mr-2">{language.flag}</span>
            <span>{language.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
