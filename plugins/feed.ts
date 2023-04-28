import {
  DeepPartial,
  getExtension,
  getLumeVersion,
  merge,
} from "../core/utils.ts";
import { getDataValue } from "./utils.ts";
import { $XML, stringify } from "../deps/xml.ts";
import { Page } from "../core/filesystem.ts";
import { Search } from "../plugins/search.ts";

import type { Data, Site } from "../core.ts";

export interface Options {
  output: string | string[];
  query: string;
  sort: string;
  limit: number;
  info: {
    title: string;
    subtitle?: string;
    date: Date;
    description: string;
    lang: string;
    generator: string | boolean;
  };
  items: {
    title: string;
    description: string;
    date: string;
    content: string;
    lang: string;
  };
}

export const defaults: Options = {
  output: "/feed.rss",
  query: "",
  sort: "date=desc",
  limit: 10,
  info: {
    title: "My RSS Feed",
    date: new Date(),
    description: "",
    lang: "en",
    generator: true,
  },
  items: {
    title: "title",
    description: "description",
    date: "date",
    content: "children",
    lang: "lang",
  },
};

export interface FeedData {
  title: string;
  url: string;
  description: string;
  date: Date;
  lang: string;
  generator?: string;
  items: FeedItem[];
}

export interface FeedItem {
  title: string;
  url: string;
  description: string;
  date: Date;
  content: string;
  lang: string;
}

const defaultGenerator = `Lume ${getLumeVersion()}`;

export default (userOptions?: DeepPartial<Options>) => {
  const options = merge(defaults, userOptions);

  return (site: Site) => {
    const search = new Search(site, true);

    site.addEventListener("afterRender", () => {
      const output = Array.isArray(options.output)
        ? options.output
        : [options.output];

      const pages = search.pages(
        options.query,
        options.sort,
        options.limit,
      ) as Data[];
      const { info } = options;

      const feed: FeedData = {
        title: info.title,
        description: info.description,
        date: info.date,
        lang: info.lang,
        url: site.url("", true),
        generator: info.generator === true
          ? defaultGenerator
          : info.generator || undefined,
        items: pages.map((data): FeedItem => {
          return {
            title: options.items.title &&
              getDataValue(data, `=${options.items.title}`),
            url: site.url(data.url as string, true),
            description: options.items.description &&
              getDataValue(data, `=${options.items.description}`),
            date: options.items.date &&
              getDataValue(data, `=${options.items.date}`),
            content: options.items.content &&
              getDataValue(data, `=${options.items.content}`)?.toString(),
            lang: options.items.lang &&
              getDataValue(data, `=${options.items.lang}`),
          };
        }),
      };

      for (const filename of output) {
        const format = getExtension(filename).slice(1);
        const file = site.url(filename, true);

        switch (format) {
          case "rss":
          case "feed":
          case "xml":
            site.pages.push(Page.create(filename, generateRss(feed, file)));
            break;

          case "json":
            site.pages.push(Page.create(filename, generateJson(feed, file)));
            break;

          default:
            throw new Error(`Invalid Feed format "${format}"`);
        }
      }
    });
  };
};

function generateRss(data: FeedData, file: string): string {
  const feed = {
    [$XML]: { cdata: [["rss", "channel", "item", "content:encoded"]] },
    xml: {
      "@version": "1.0",
      "@encoding": "UTF-8",
    },
    rss: {
      "@xmlns:content": "http://purl.org/rss/1.0/modules/content/",
      "@xmlns:wfw": "http://wellformedweb.org/CommentAPI/",
      "@xmlns:dc": "http://purl.org/dc/elements/1.1/",
      "@xmlns:atom": "http://www.w3.org/2005/Atom",
      "@xmlns:sy": "http://purl.org/rss/1.0/modules/syndication/",
      "@xmlns:slash": "http://purl.org/rss/1.0/modules/slash/",
      "@version": "2.0",
      channel: {
        title: data.title,
        link: data.url,
        "atom:link": {
          "@href": file,
          "@rel": "self",
          "@type": "application/rss+xml",
        },
        description: data.description,
        lastBuildDate: data.date.toISOString(),
        language: data.lang,
        generator: data.generator,
        item: data.items.map((item) => ({
          title: item.title,
          link: item.url,
          guid: {
            "@isPermaLink": false,
            "#text": item.url,
          },
          description: item.description,
          "content:encoded": item.content,
          pubDate: item.date.toISOString(),
        })),
      },
    },
  };

  return stringify(feed);
}

function generateJson(data: FeedData, file: string): string {
  const feed = {
    version: "https://jsonfeed.org/version/1",
    title: data.title,
    home_page_url: data.url,
    feed_url: file,
    description: data.description,
    items: data.items.map((item) => ({
      id: item.url,
      url: item.url,
      title: item.title,
      content_html: item.content,
      date_published: item.date.toUTCString(),
    })),
  };

  return JSON.stringify(feed);
}