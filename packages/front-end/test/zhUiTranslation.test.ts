import {
  compileDictionary,
  normalizeText,
  translateText,
  zhDictionaryValidator,
} from "@/services/zh/dictionary";
import { createUiTranslator } from "@/services/zh/uiTranslator";

const dict = compileDictionary({
  strings: {
    "Add Metric": "添加指标",
    Experiments: "实验",
    "Don't save": "不保存",
    Search: "搜索",
    Untranslated: "",
  },
  patterns: {
    "{0} experiments": "{0} 个实验",
    "{0} of {1} selected": "已选择 {0}/{1}",
    "Showing {0} of {1}": "共 {1} 条，显示 {0} 条",
    "{0} ago": "{0}前",
    "{0} field{1} edited": "已编辑 {0} 个字段{1}",
    "Your setup{0} has {1} check{2} to review.":
      "你的设置{0}有 {1} 项检查待审阅。",
  },
});

const nestedDict = compileDictionary({
  strings: { Monday: "周一", "less than a minute": "不到 1 分钟" },
  patterns: {
    "{0} ago": "{0}前",
    "in {0}": "{0}后",
    "{0} days": "{0} 天",
    "about {0} hours": "约 {0} 小时",
    "last {0} at {1}": "上{0} {1}",
  },
});

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("normalizeText", () => {
  it("collapses whitespace and nbsp, then trims", () => {
    const nbsp = String.fromCharCode(160);
    expect(normalizeText(`  Add \n  Metric${nbsp} `)).toBe("Add Metric");
    expect(normalizeText(`Add${nbsp}Metric`)).toBe("Add Metric");
  });
});

describe("translateText", () => {
  it("translates exact strings and keeps surrounding whitespace", () => {
    expect(translateText(" Add  Metric ", dict)).toBe(" 添加指标 ");
    expect(translateText("Experiments", dict)).toBe("实验");
  });

  it("returns null for unknown, empty or non-latin text", () => {
    expect(translateText("Something else", dict)).toBeNull();
    expect(translateText("   ", dict)).toBeNull();
    expect(translateText("123 %", dict)).toBeNull();
    expect(translateText("实验", dict)).toBeNull();
  });

  it("skips empty translations", () => {
    expect(translateText("Untranslated", dict)).toBeNull();
  });

  it("fills pattern placeholders, including reordered ones", () => {
    expect(translateText("12 experiments", dict)).toBe("12 个实验");
    expect(translateText("3 of 10 selected", dict)).toBe("已选择 3/10");
    expect(translateText("Showing 20 of 135", dict)).toBe(
      "共 135 条，显示 20 条",
    );
  });

  it("prefers the more specific pattern", () => {
    // "{0} of {1} selected" has a longer literal part than "{0} ago" and must not lose to it
    expect(translateText("2 of 4 selected", dict)).toBe("已选择 2/4");
    expect(translateText("5 minutes ago", dict)).toBe("5 minutes前");
  });

  it("drops English plural suffixes glued to a word but keeps other values", () => {
    expect(translateText("3 fields edited", dict)).toBe("已编辑 3 个字段");
    expect(translateText("1 field edited", dict)).toBe("已编辑 1 个字段");
    expect(translateText("Your setup has 2 checks to review.", dict)).toBe(
      "你的设置有 2 项检查待审阅。",
    );
    expect(
      translateText("Your setup in Shop has 1 check to review.", dict),
    ).toBe("你的设置 in Shop有 1 项检查待审阅。");
  });

  it("translates the values captured by a pattern", () => {
    expect(translateText("3 days ago", nestedDict)).toBe("3 天前");
    expect(translateText("less than a minute ago", nestedDict)).toBe(
      "不到 1 分钟前",
    );
    expect(translateText("in about 2 hours", nestedDict)).toBe("约 2 小时后");
    expect(translateText("last Monday at 3:12 PM", nestedDict)).toBe(
      "上周一 3:12 PM",
    );
    // unknown values are kept as they are
    expect(translateText("lots of time ago", nestedDict)).toBe(
      "lots of time前",
    );
  });

  it("only fills {#n} placeholders with numbers", () => {
    const numeric = compileDictionary({
      strings: {},
      patterns: { "{#0} days ago": "{#0} 天前", "in {#0} days": "{#0} 天后" },
    });
    expect(translateText("3 days ago", numeric)).toBe("3 天前");
    expect(translateText("in 1,250 days", numeric)).toBe("1,250 天后");
    expect(translateText("a few days ago", numeric)).toBeNull();
    expect(translateText("in production days", numeric)).toBeNull();
  });
});

describe("zhDictionaryValidator", () => {
  it("rejects malformed dictionaries", () => {
    expect(zhDictionaryValidator.safeParse({ strings: {} }).success).toBe(
      false,
    );
    expect(
      zhDictionaryValidator.safeParse({ strings: { a: 1 }, patterns: {} })
        .success,
    ).toBe(false);
  });
});

describe("createUiTranslator", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("translates text and attributes on start", () => {
    document.body.innerHTML = `
      <div>
        <button title="Add Metric">Add Metric</button>
        <input placeholder="Search" />
        <span>12 experiments</span>
      </div>`;
    const t = createUiTranslator(dict, document.body);
    t.start();
    t.stop();

    expect(document.querySelector("button")?.textContent).toBe("添加指标");
    expect(document.querySelector("button")?.getAttribute("title")).toBe(
      "添加指标",
    );
    expect(document.querySelector("input")?.getAttribute("placeholder")).toBe(
      "搜索",
    );
    expect(document.querySelector("span")?.textContent).toBe("12 个实验");
  });

  it("leaves code, editors and opted-out elements alone", () => {
    document.body.innerHTML = `
      <pre>Experiments</pre>
      <code>Experiments</code>
      <div class="ace_editor"><span>Experiments</span></div>
      <div data-no-translate><span>Experiments</span></div>
      <p>Experiments</p>`;
    const t = createUiTranslator(dict, document.body);
    t.start();
    t.stop();

    expect(document.querySelector("pre")?.textContent).toBe("Experiments");
    expect(document.querySelector("code")?.textContent).toBe("Experiments");
    expect(document.querySelector(".ace_editor span")?.textContent).toBe(
      "Experiments",
    );
    expect(
      document.querySelector("[data-no-translate] span")?.textContent,
    ).toBe("Experiments");
    expect(document.querySelector("p")?.textContent).toBe("实验");
  });

  it("reports each untranslated text once", () => {
    document.body.innerHTML = `
      <p>Experiments</p>
      <p> Brand new  label </p>
      <p>Brand new label</p>
      <p>42</p>
      <input placeholder="Type here" />
      <pre>Not reported</pre>`;
    const missed: string[] = [];
    const t = createUiTranslator(dict, document.body, {
      onMiss: (text) => missed.push(text),
    });
    t.start();
    t.stop();

    expect(missed.sort()).toEqual(["Brand new label", "Type here"]);
  });

  it("translates content added or changed later", async () => {
    const t = createUiTranslator(dict, document.body);
    t.start();

    const div = document.createElement("div");
    div.innerHTML = `<span>Don't save</span>`;
    document.body.appendChild(div);
    await flush();
    expect(div.textContent).toBe("不保存");

    const span = div.querySelector("span");
    const text = span?.firstChild;
    if (text) text.nodeValue = "Experiments";
    await flush();
    expect(span?.textContent).toBe("实验");

    span?.setAttribute("title", "Search");
    await flush();
    expect(span?.getAttribute("title")).toBe("搜索");

    t.stop();
  });
});
