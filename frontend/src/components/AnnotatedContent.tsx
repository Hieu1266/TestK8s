"use client";

import { useEffect, useState } from "react";
import { getContentAnnotationsAction } from "@/actions/getContentAnnotations";
import {
  AnnotationContentType,
  ContentAnnotation,
} from "@/types/content-annotations";

type AnnotatedContentProps = {
  contentType: AnnotationContentType;
  contentId: string;
  html: string;
  className?: string;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function attachAnnotations(
  html: string,
  annotations: ContentAnnotation[],
): string {
  if (!html || annotations.length === 0) {
    return html;
  }

  const parser = new DOMParser();
  const documentResult = parser.parseFromString(
    `<div id="annotation-root">${html}</div>`,
    "text/html",
  );

  const root = documentResult.getElementById("annotation-root");

  if (!root) {
    return html;
  }

  const annotationMap = new Map<string, ContentAnnotation>();

  annotations.forEach((annotation) => {
    const selectedText = annotation.selected_text.trim();

    if (selectedText) {
      annotationMap.set(selectedText.toLocaleLowerCase(), annotation);
    }
  });

  const selectedTexts = Array.from(annotationMap.keys()).sort(
    (first, second) => second.length - first.length,
  );

  if (selectedTexts.length === 0) {
    return html;
  }

  const expression = new RegExp(
    selectedTexts.map(escapeRegExp).join("|"),
    "gi",
  );

  const walker = documentResult.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  const textNodes: Text[] = [];
  let currentNode = walker.nextNode();

  while (currentNode) {
    const parentElement = currentNode.parentElement;

    if (
      parentElement &&
      !["SCRIPT", "STYLE"].includes(parentElement.tagName) &&
      !parentElement.closest(".learner-annotation")
    ) {
      textNodes.push(currentNode as Text);
    }

    currentNode = walker.nextNode();
  }

  textNodes.forEach((textNode) => {
    const text = textNode.nodeValue || "";

    expression.lastIndex = 0;

    if (!expression.test(text)) {
      return;
    }

    expression.lastIndex = 0;

    const fragment = documentResult.createDocumentFragment();
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = expression.exec(text)) !== null) {
      const annotation = annotationMap.get(match[0].toLocaleLowerCase());

      if (!annotation) {
        continue;
      }

      if (match.index > lastIndex) {
        fragment.appendChild(
          documentResult.createTextNode(text.slice(lastIndex, match.index)),
        );
      }

      const annotationElement = documentResult.createElement("span");

      annotationElement.className = "learner-annotation";
      annotationElement.textContent = match[0];
      annotationElement.setAttribute(
        "data-annotation-tooltip",
        `${annotation.title}\n${annotation.description}`,
      );

      fragment.appendChild(annotationElement);

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      fragment.appendChild(
        documentResult.createTextNode(text.slice(lastIndex)),
      );
    }

    textNode.parentNode?.replaceChild(fragment, textNode);
  });

  return root.innerHTML;
}

export default function AnnotatedContent({
  contentType,
  contentId,
  html,
  className = "",
}: AnnotatedContentProps) {
  const [renderedHtml, setRenderedHtml] = useState(html);

  useEffect(() => {
    let cancelled = false;

    setRenderedHtml(html);

    const loadAnnotations = async () => {
      const result = await getContentAnnotationsAction(contentType, contentId);

      if (cancelled) {
        return;
      }

      if (result.success && result.data) {
        setRenderedHtml(attachAnnotations(html, result.data));
      } else {
        console.error("Không thể tải chú giải:", result.error);
      }
    };

    void loadAnnotations();

    return () => {
      cancelled = true;
    };
  }, [contentType, contentId, html]);

  return (
    <>
      <div
        className={className}
        dangerouslySetInnerHTML={{ __html: renderedHtml }}
      />

      <style jsx global>{`
        .learner-annotation {
          position: relative;
          display: inline;
          padding: 1px 3px;
          border-bottom: 2px dotted #5b5fef;
          border-radius: 4px;
          background: #eef2ff;
          color: #4338ca;
          cursor: help;
        }

        .learner-annotation::after {
          content: attr(data-annotation-tooltip);
          position: absolute;
          z-index: 100;
          top: calc(100% + 10px);
          bottom: auto;
          left: 50%;
          width: max-content;
          max-width: 320px;
          padding: 12px 14px;
          border: 1px solid #dcdafe;
          border-radius: 12px;
          background: #ffffff;
          box-shadow: 0 12px 30px rgba(43, 45, 61, 0.18);
          color: #2b2d3d;
          font-size: 14px;
          font-weight: 500;
          line-height: 1.5;
          white-space: pre-wrap;
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
          transform: translate(-50%, -5px);
          transition:
            opacity 150ms ease,
            transform 150ms ease,
            visibility 150ms ease;
        }

        .learner-annotation:hover::after {
          opacity: 1;
          visibility: visible;
          transform: translate(-50%, 0);
        }
      `}</style>
    </>
  );
}
