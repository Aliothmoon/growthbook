import { ReactNode, useEffect } from "react";
import { useRouter } from "next/router";
import type { SidebarLinkProps } from "@/components/Layout/SidebarLink";

// Fork: this build runs without a GrowthBook license. Pages that need a paid
// plan, or that are built on the code under enterprise/ (which its license
// only allows in production with a Pro or Enterprise license), are hidden
// instead of being shown locked: their sidebar and search entries are dropped
// and opening them redirects home.
const HIDDEN_ROUTES: RegExp[] = [
  // Product Analytics: explorer, funnels, journeys, SQL explorer, dashboards
  /^\/product-analytics(\/|$)/,
  /^\/sql-explorer(\/|$)/,
  // Experimentation
  /^\/bandits?(\/|$)/,
  /^\/contextual-bandits?(\/|$)/,
  /^\/holdouts?(\/|$)/,
  /^\/experiments\/templates?(\/|$)/,
  // Insights
  /^\/learnings(\/|$)/,
  /^\/timeline$/,
  /^\/metric-effects$/,
  /^\/correlations$/,
  // Features, metrics and SDK configuration
  /^\/configs(\/|$)/,
  /^\/metric-groups(\/|$)/,
  /^\/archetypes$/,
  // Settings: billing, custom fields/markdown/hooks, teams and custom roles
  /^\/settings\/(billing|usage|customfields|custom-markdown|custom-hooks)$/,
  /^\/settings\/role(\/|$)/,
  /^\/settings\/team\//,
];

// Accepts a page route (router.pathname) or a link href.
export function isHiddenRoute(path: string): boolean {
  const pathname = path.split(/[?#]/)[0];
  return HIDDEN_ROUTES.some((r) => r.test(pathname));
}

// Drops hidden pages from the sidebar, and sections left without any page.
export function withoutHiddenLinks(
  links: SidebarLinkProps[],
): SidebarLinkProps[] {
  return links.flatMap((link) => {
    if (isHiddenRoute(link.href)) return [];
    if (!link.subLinks) return [link];
    const subLinks = link.subLinks.filter((l) => !isHiddenRoute(l.href));
    return subLinks.length ? [{ ...link, subLinks }] : [];
  });
}

export function HiddenRouteGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const hidden = isHiddenRoute(router.pathname);

  useEffect(() => {
    if (hidden) router.replace("/");
  }, [hidden, router]);

  return hidden ? null : <>{children}</>;
}
