import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_CMS_FAQS,
  DEFAULT_CMS_HERO_SLIDES,
  DEFAULT_CMS_SITE_PAGES,
  normalizeCmsState,
} from "./cms";

describe("normalizeCmsState", () => {
  it("fills new homepage fields when an old CMS blob is missing them", () => {
    const next = normalizeCmsState({
      banners: [],
      faqs: [],
      articles: [],
      updatedAt: "2020-01-01T00:00:00.000Z",
    });
    assert.equal(next.heroSlides.length, DEFAULT_CMS_HERO_SLIDES.length);
    assert.equal(next.faqs.length, DEFAULT_CMS_FAQS.length);
    assert.equal(next.homeCopy.destTitleAr, "اكتشف العالم بطريقتك");
    assert.equal(next.sitePages.legalNameAr, DEFAULT_CMS_SITE_PAGES.legalNameAr);
    assert.ok(next.destinationGuides.length > 0);
  });

  it("keeps staff-authored arrays and merges page copy", () => {
    const next = normalizeCmsState({
      heroSlides: [
        {
          id: "custom",
          image: "/x.jpg",
          kickerAr: "أ",
          kickerEn: "A",
          titleAr: "عنوان",
          titleEn: "Title",
          subtitleAr: "",
          subtitleEn: "",
          descriptionAr: "نص",
          descriptionEn: "Text",
          active: true,
        },
      ],
      sitePages: { footerTaglineAr: "جملة مخصصة" },
    });
    assert.equal(next.heroSlides[0]?.id, "custom");
    assert.equal(next.sitePages.footerTaglineAr, "جملة مخصصة");
    assert.equal(next.sitePages.supportEmail, DEFAULT_CMS_SITE_PAGES.supportEmail);
  });
});
