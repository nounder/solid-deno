import { HTMLElements } from "./html.ts"
import { escape, ssr, ssrAttribute, ssrClassList } from "solid-js/web"

function create(type, props) {
  return () => type(props || {})
}

function jsxAttr(name: string, value: any) {
  if (name === "classlist") {
    return {
      classList: value,
    }
  } else {
    return ssrAttribute(name, value)
  }
}

function jsxTemplate(templates: TemplateStringsArray, ...exprs: any[]) {
  for (let i = 0; i < exprs.length; i++) {
    const classList = exprs[i]?.classList
    if (classList) {
      // @ts-ignore value typing is wrong
      exprs[i] = ssrAttribute("class", ssrClassList(classList))
    }
  }

  // @ts-ignore ssr excepts writable array
  const { t } = ssr(templates, ...exprs)

  return {
    t,
    outerHTML: t,
  }
}

function jsxEscape(value): string {
  return escape(value)
}

// deno-lint-ignore no-namespace
export namespace JSX {
  export type Children =
    | HTMLElements
    | string
    | number
    | boolean
    | Children[]

  export type Element = {
    t: string
    outerHTML: string
  }

  export interface IntrinsicElements extends HTMLElements {}

  export interface ElementChildrenAttribute {
    children: Children
  }
}

export {
  create as jsx,
  create as jsxDEV,
  create as jsxs,
  jsxAttr,
  jsxEscape,
  jsxTemplate,
}