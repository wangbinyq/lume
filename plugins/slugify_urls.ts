import { merge } from "../core/utils.ts";
import createSlugifier, {
  defaults as slugifierDefaults,
} from "../core/slugifier.ts";

import type { Extensions, Helper, Page, Site } from "../core.ts";
import type { Options as SlugifierOptions } from "../core/slugifier.ts";

export interface Options extends SlugifierOptions {
  /** The list of extensions this plugin applies to */
  extensions: Extensions;
}

// Default options
export const defaults: Options = {
  extensions: [".html"],
  ...slugifierDefaults,
};

/** A plugin to slugify all URLs, replacing non-URL-safe characters */
export default function (userOptions?: Partial<Options>) {
  const options = merge(defaults, userOptions);
  const slugify = createSlugifier(options);

  return (site: Site) => {
    site.filter("slugify", slugify as Helper);
    site.preprocess(options.extensions, slugifyUrls);

    // Slugify the static files
    site.addEventListener("beforeRender", () => {
      site.files
        .filter((file) => extensionMatches(file.outputPath, options.extensions))
        .forEach((file) => file.outputPath = slugify(file.outputPath));
    });
  };

  function slugifyUrls(page: Page) {
    if (typeof page.data.url === "string") {
      page.data.url = slugify(page.data.url);
    }
  }
}

function extensionMatches(path: string, extensions: Extensions): boolean {
  return extensions === "*" || extensions.some((ext) => path.endsWith(ext));
}
