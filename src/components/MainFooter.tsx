"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";

export function MainFooter() {
  const { t } = useLocale();
  return (
    <footer className="bg-[#231F20] dark:bg-background text-white dark:text-foreground py-16 border-t dark:border-border">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div className="flex flex-col items-center">
            <img
              src="/logo-vertical.png"
              alt="TABADL ALKON"
              className="h-32 md:h-48 w-auto mb-4"
              width={120}
              height={192}
              loading="lazy"
            />
            <p className="text-white/85 dark:text-muted-foreground text-sm leading-relaxed text-center">
              {t('footer.tagline')}
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-4 text-lg">{t('footer.services')}</h4>
            <ul className="space-y-3 text-white/80 dark:text-muted-foreground">
              <li>
                <Link
                  href="/misa"
                  className="hover:text-[#CB8D31] transition-colors"
                >
                  {t('footer.misaLicensing')}
                </Link>
              </li>
              <li>
                <Link
                  href="/premium-residency"
                  className="hover:text-[#CB8D31] transition-colors"
                >
                  {t('nav.premiumResidency')}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4 text-lg">{t('footer.company')}</h4>
            <ul className="space-y-3 text-white/80 dark:text-muted-foreground">
              <li>
                <Link
                  href="/about-us"
                  className="hover:text-[#CB8D31] transition-colors"
                >
                  {t('footer.aboutUs')}
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="hover:text-[#CB8D31] transition-colors"
                >
                  {t('nav.contact')}
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy-policy"
                  className="hover:text-[#CB8D31] transition-colors"
                >
                  {t('footer.privacyPolicy')}
                </Link>
              </li>
              <li>
                <Link
                  href="/terms-of-service"
                  className="hover:text-[#CB8D31] transition-colors"
                >
                  {t('footer.termsOfService')}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4 text-lg">{t('footer.getStarted')}</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/login">
                  <Button
                    variant="ghost"
                    className="text-white/80 dark:text-muted-foreground hover:text-[#CB8D31] hover:bg-transparent p-0 h-auto transition-colors"
                  >
                    {t('nav.login')}
                  </Button>
                </Link>
              </li>
              <li>
                <Link href="/signup">
                  <Button
                    variant="ghost"
                    className="text-white/80 dark:text-muted-foreground hover:text-[#CB8D31] hover:bg-transparent p-0 h-auto transition-colors"
                  >
                    {t('footer.signUp')}
                  </Button>
                </Link>
              </li>
              <li>
                <Link href="/dashboard">
                  <Button
                    variant="ghost"
                    className="text-white/80 dark:text-muted-foreground hover:text-[#CB8D31] hover:bg-transparent p-0 h-auto transition-colors"
                  >
                    {t('footer.dashboard')}
                  </Button>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/20 dark:border-border pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-white/80 dark:text-muted-foreground text-sm">
              © {new Date().getFullYear()} TABADL ALKON. {t('footer.copyright')}
            </div>
            <div className="text-white/80 dark:text-muted-foreground text-sm">
              {t('footer.developedBy')}{" "}
              <a
                href="https://mylyra.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white dark:text-foreground font-semibold hover:text-[#F6D58F] transition-colors"
              >
                Lyra AI
              </a>
            </div>
            <div className="flex gap-6 text-sm text-white/80 dark:text-muted-foreground">
              <Link
                href="/privacy-policy"
                className="hover:text-[#CB8D31] transition-colors"
              >
                {t('footer.privacyPolicy')}
              </Link>
              <Link
                href="/terms-of-service"
                className="hover:text-[#CB8D31] transition-colors"
              >
                {t('footer.termsOfService')}
              </Link>
              <Link
                href="/cookie-policy"
                className="hover:text-[#CB8D31] transition-colors"
              >
                {t('footer.cookiePolicy')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}


