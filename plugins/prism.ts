import Prism, { loadLanguages } from "../deps/prism.ts";
import { merge } from "../core/utils.ts";

import type { Page, Site } from "../core.ts";
import type { Element } from "../deps/dom.ts";

export interface Options {
  /** The list of extensions this plugin applies to */
  extensions: string[];

  /** The css selector to apply prism */
  cssSelector: string;

  /** The list of programing languages to load */
  languages: string[];
}

// Default options
export const defaults: Options = {
  extensions: [".html"],
  cssSelector: "pre code",
  languages: [],
};

/** A plugin to syntax-highlight code using the prism library */
export default function (userOptions?: Partial<Options>) {
  const options = merge(defaults, userOptions);

  return (site: Site) => {
    site.addEventListener(
      "beforeBuild",
      () => loadLanguages(options.languages),
    );
    site.process(options.extensions, prism);

    function prism(page: Page) {
      page.document!.querySelectorAll(options.cssSelector!)
        .forEach((element) => Prism.highlightElement(element as Element));
    }
  };
}
