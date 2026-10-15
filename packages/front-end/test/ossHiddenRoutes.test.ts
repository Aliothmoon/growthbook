import { describe, expect, it } from "vitest";
import { navlinks } from "@/components/Layout/sidebarNav";
import { isHiddenRoute } from "@/services/oss/hiddenRoutes";

describe("isHiddenRoute", () => {
  it("hides paid and enterprise-licensed pages", () => {
    [
      "/product-analytics/explore",
      "/product-analytics/dashboards/[did]",
      "/sql-explorer/[id]",
      "/bandits",
      "/bandit/[bid]",
      "/contextual-bandits",
      "/contextual-bandit/[cbid]",
      "/holdouts",
      "/holdout/[hid]",
      "/experiments/templates",
      "/experiments/template/[tid]",
      "/learnings/[lid]",
      "/timeline",
      "/metric-effects",
      "/correlations",
      "/configs/[cfgid]",
      "/metric-groups/[mgid]",
      "/archetypes",
      "/archetypes#simulate",
      "/settings/billing",
      "/settings/customfields",
      "/settings/custom-markdown",
      "/settings/custom-hooks",
      "/settings/role/new",
      "/settings/team/[tid]",
    ].forEach((route) => expect(isHiddenRoute(route), route).toBe(true));
  });

  it("keeps the free pages", () => {
    [
      "/",
      "/features",
      "/constants",
      "/experiments",
      "/experiment/[eid]",
      "/power-calculator",
      "/namespaces",
      "/metrics",
      "/metrics#metricgroups",
      "/fact-tables/[ftid]",
      "/datasources/[did]",
      "/dashboard",
      "/presentations",
      "/sdks",
      "/saved-groups",
      "/settings",
      "/settings/team",
      "/settings/team#teams",
      "/settings/webhooks",
      "/events",
    ].forEach((route) => expect(isHiddenRoute(route), route).toBe(false));
  });
});

describe("sidebar", () => {
  const sections = Object.fromEntries(
    navlinks.map((l) => [l.name, (l.subLinks || []).map((s) => s.name)]),
  );

  it("drops sections left without pages", () => {
    expect(Object.keys(sections)).toEqual([
      "Home",
      "Features",
      "Experimentation",
      "Metrics and Data",
      "Insights",
      "SDK Configuration",
      "Settings",
    ]);
  });

  it("drops hidden pages from the remaining sections", () => {
    expect(sections["Features"]).toEqual(["Feature Flags", "Constants"]);
    expect(sections["Experimentation"]).toEqual([
      "Experiments",
      "Power Calculator",
      "Namespaces",
    ]);
    expect(sections["Insights"]).toEqual(["Dashboard", "Presentations"]);
    expect(sections["SDK Configuration"]).not.toContain("Archetypes");
    expect(sections["Settings"]).toEqual(
      expect.not.arrayContaining([
        "Custom Fields",
        "Custom Markdown",
        "Custom Hooks",
        "Billing",
        "Usage",
      ]),
    );
    expect(sections["Settings"]).toContain("Members");
  });
});
