import React from "react";
import { twMerge } from "tailwind-merge";

const REQUIRED_MARKER_CLASS = "text-red-500";

function RequiredMarker({ className }: { className?: string }) {
  return <span className={twMerge(REQUIRED_MARKER_CLASS, className)}>*</span>;
}

function trimPreviousText(nodes: React.ReactNode[]) {
  for (let index = nodes.length - 1; index >= 0; index -= 1) {
    const node = nodes[index];

    if (typeof node !== "string") {
      return;
    }

    const trimmed = node.trimEnd();
    if (trimmed) {
      nodes[index] = trimmed;
      return;
    }

    nodes.splice(index, 1);
  }
}

function renderRequiredText(text: string) {
  const match = text.match(/^(.*?)(\s*\*)$/);

  if (!match) {
    return text;
  }

  return [match[1].trimEnd(), <RequiredMarker key="required-marker" />].filter(
    Boolean,
  );
}

function isRequiredMarkerElement(
  node: React.ReactElement<{ children?: React.ReactNode }>,
) {
  const children = React.Children.toArray(node.props.children);
  return children.length === 1 && children[0] === "*";
}

export function renderRequiredLabel(children: React.ReactNode) {
  const nodes = React.Children.toArray(children);

  if (!nodes.length) {
    return children;
  }

  const output: React.ReactNode[] = [];

  nodes.forEach((child) => {
    if (typeof child === "string") {
      const renderedText = renderRequiredText(child);
      if (Array.isArray(renderedText)) {
        output.push(...renderedText);
        return;
      }

      output.push(renderedText);
      return;
    }

    if (
      React.isValidElement<{ className?: string; children?: React.ReactNode }>(
        child,
      ) &&
      isRequiredMarkerElement(child)
    ) {
      trimPreviousText(output);
      output.push(
        React.cloneElement(child, {
          className: twMerge(child.props.className, REQUIRED_MARKER_CLASS),
        }),
      );
      return;
    }

    output.push(child);
  });

  return output.length === 1 ? output[0] : output;
}
