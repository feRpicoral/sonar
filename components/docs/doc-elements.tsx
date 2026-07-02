import * as React from "react";

export { CodeBlock } from "@/components/docs/code-block";
export { Callout } from "@/components/ui/callout";

function textFromNode(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textFromNode).join("");
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return textFromNode(node.props.children);
  }
  return "";
}

function slugify(node: React.ReactNode): string | undefined {
  const text = textFromNode(node);
  if (!text) return undefined;
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function H1({ children }: { children: React.ReactNode }) {
  return <h1 className="mb-3 text-3xl font-semibold tracking-tight">{children}</h1>;
}

export function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2
      id={slugify(children)}
      className="border-border mt-10 mb-3 scroll-mt-20 border-b pb-2 text-xl font-semibold tracking-tight"
    >
      {children}
    </h2>
  );
}

export function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3
      id={slugify(children)}
      className="mt-6 mb-2 scroll-mt-20 text-base font-semibold tracking-tight"
    >
      {children}
    </h3>
  );
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground my-3 leading-relaxed">{children}</p>;
}

export function InlineCode({ children }: { children: React.ReactNode }) {
  return <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[0.85em]">{children}</code>;
}

export function Lead({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground my-4 text-lg leading-relaxed">{children}</p>;
}

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-card border-border my-4 overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="border-border bg-muted/40 text-muted-foreground border-b px-4 py-2 text-left text-xs font-medium tracking-wide uppercase">
      {children}
    </th>
  );
}

export function Td({ children }: { children: React.ReactNode }) {
  return <td className="border-border border-b px-4 py-2 align-top last:border-b-0">{children}</td>;
}
