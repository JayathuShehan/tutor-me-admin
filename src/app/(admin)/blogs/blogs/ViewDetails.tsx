/* eslint-disable @next/next/no-img-element */
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useFetchUserByIdQuery } from "@/store/api/splits/users";
import { ChevronDown, ChevronUp, Eye } from "lucide-react";
import { useMemo, useState } from "react";

interface BlogContentBlock {
  _id: string;
  type: "paragraph" | "heading" | "image" | "list";
  text?: string;
  src?: string;
  caption?: string;
  level?: number;
  items?: string[];
  style?: "ordered" | "unordered";
}

interface BlogAuthor {
  id?: string | { $oid?: string };
  role?: string;
  name?: string;
  avatar?: string;
}

interface Blog {
  id: string;
  title: string;
  author: BlogAuthor;
  image?: string;
  status: "pending" | "approved" | "rejected";
  content: BlogContentBlock[];
  relatedArticles?: string[];
}

interface BlogDetailsProps {
  blog: Blog;
}

interface TocEntry {
  id: string;
  text: string;
  level: number;
  number: string;
}

const normalizeMongoId = (value?: string | { $oid?: string }) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.$oid || "";
};

function decodeHtml(html: string) {
  if (typeof document === "undefined") return html;
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
}

function buildToc(content: BlogContentBlock[]): TocEntry[] {
  const toc: TocEntry[] = [];
  let h2Counter = 0;
  let h3Counter = 0;

  for (const block of content) {
    if (block.type !== "heading" || !block.text) continue;
    const level = block.level || 2;

    if (level === 2) {
      h2Counter++;
      h3Counter = 0;
      toc.push({
        id: block._id,
        text: block.text,
        level: 2,
        number: `${h2Counter}.`,
      });
    } else if (level === 3) {
      h3Counter++;
      toc.push({
        id: block._id,
        text: block.text,
        level: 3,
        number: `${h2Counter}.${h3Counter}.`,
      });
    }
  }

  return toc;
}

export function BlogDetails({ blog }: BlogDetailsProps) {
  const [open, setOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(true);

  const authorId = useMemo(
    () => normalizeMongoId(blog.author?.id),
    [blog.author?.id],
  );

  const { data: authorData, isLoading: isAuthorLoading } =
    useFetchUserByIdQuery(authorId, { skip: !authorId });

  const authorName =
    authorData?.name?.trim() || blog.author?.name?.trim() || "Unknown";
  const authorAvatar =
    authorData?.avatar?.trim() ||
    blog.author?.avatar?.trim() ||
    "/images/user/user.png";
  const authorRole =
    authorData?.role?.trim() || blog.author?.role?.trim() || "admin";

  const toc = useMemo(() => buildToc(blog.content), [blog.content]);

  function renderBlock(block: BlogContentBlock) {
    switch (block.type) {
      case "heading": {
        const level = block.level || 2;
        if (level === 1)
          return (
            <h1
              id={block._id}
              key={block._id}
              className="scroll-mt-20 text-xl font-bold mt-6 mb-2 text-gray-900 dark:text-white"
            >
              {block.text}
            </h1>
          );
        if (level === 2)
          return (
            <h2
              id={block._id}
              key={block._id}
              className="scroll-mt-20 text-lg font-semibold mt-5 mb-2 text-gray-800 dark:text-white/90"
            >
              {block.text}
            </h2>
          );
        if (level === 3)
          return (
            <h3
              id={block._id}
              key={block._id}
              className="scroll-mt-20 text-base font-semibold mt-4 mb-1 text-gray-700 dark:text-white/80"
            >
              {block.text}
            </h3>
          );
        return (
          <h4
            id={block._id}
            key={block._id}
            className="scroll-mt-20 text-sm font-semibold mt-3 mb-1 text-gray-700 dark:text-white/70"
          >
            {block.text}
          </h4>
        );
      }
      case "paragraph":
        return (
          <p
            key={block._id}
            className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-3 [&_a]:text-brand-500! [&_a]:dark:text-brand-400! [&_a]:underline [&_a]:underline-offset-2 [&_a]:transition-colors [&_a]:hover:text-brand-600! [&_a]:dark:hover:text-brand-300!"
            dangerouslySetInnerHTML={{ __html: decodeHtml(block.text || "") }}
          />
        );
      case "list":
        if (block.style === "ordered") {
          return (
            <ol
              key={block._id}
              className="list-decimal list-outside pl-5 mb-3 space-y-1"
            >
              {(block.items || []).map((item, i) => (
                <li
                  key={i}
                  className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed [&_a]:text-brand-500! [&_a]:dark:text-brand-400! [&_a]:underline [&_a]:underline-offset-2 [&_a]:transition-colors [&_a]:hover:text-brand-600! [&_a]:dark:hover:text-brand-300!"
                  dangerouslySetInnerHTML={{ __html: decodeHtml(item) }}
                />
              ))}
            </ol>
          );
        }
        return (
          <ul
            key={block._id}
            className="list-disc list-outside pl-5 mb-3 space-y-1"
          >
            {(block.items || []).map((item, i) => (
              <li
                key={i}
                className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed [&_a]:text-brand-500! [&_a]:dark:text-brand-400! [&_a]:underline [&_a]:underline-offset-2 [&_a]:transition-colors [&_a]:hover:text-brand-600! [&_a]:dark:hover:text-brand-300!"
                dangerouslySetInnerHTML={{ __html: decodeHtml(item) }}
              />
            ))}
          </ul>
        );
      case "image":
        return (
          <figure key={block._id} className="my-4">
            <img
              src={block.src}
              alt={block.caption || ""}
              className="w-full rounded-md object-cover"
            />
            {block.caption && (
              <figcaption className="text-xs text-center text-gray-400 mt-1">
                {block.caption}
              </figcaption>
            )}
          </figure>
        );
      default:
        return null;
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Eye cursor="pointer" className="text-blue-500 hover:text-blue-700" />
      </DialogTrigger>

      <DialogContent className="sm:max-w-[680px] max-h-[85vh] overflow-hidden p-0">
        <DialogHeader className="shrink-0 px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-700">
          <DialogTitle className="text-xl font-bold leading-snug text-gray-900 dark:text-white pr-6">
            {blog.title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-6 py-4 space-y-5">
          {/* Cover image */}
          {blog.image && (
            <img
              src={blog.image}
              alt={blog.title}
              className="w-full h-56 object-cover rounded-lg"
            />
          )}

          {/* Author */}
          <div className="flex items-center gap-3 rounded-lg border border-gray-100 dark:border-gray-700 px-4 py-3">
            {isAuthorLoading ? (
              <>
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </>
            ) : (
              <>
                <img
                  src={authorAvatar}
                  alt={authorName}
                  className="h-10 w-10 rounded-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "/images/user/user.png";
                  }}
                />
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    {authorName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {authorRole}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Table of Contents */}
          {toc.length > 0 && (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <button
                type="button"
                onClick={() => setTocOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="text-sm font-semibold text-gray-700 dark:text-white/90">
                  Table of Contents
                </span>
                {tocOpen ? (
                  <ChevronUp className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                )}
              </button>

              {tocOpen && (
                <div className="px-4 py-3 space-y-1.5">
                  {toc.map((entry) => (
                    <div
                      key={entry.id}
                      className={entry.level === 3 ? "pl-5" : ""}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          document
                            .getElementById(entry.id)
                            ?.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            })
                        }
                        className="text-left text-sm text-brand-500 dark:text-brand-400 transition-colors hover:text-brand-600 dark:hover:text-brand-300"
                      >
                        <span className="mr-1.5 text-gray-500 dark:text-gray-400 text-xs font-medium">
                          {entry.number}
                        </span>
                        {entry.text}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Full content in order */}
          <article className="space-y-0">
            {blog.content.map((block) => renderBlock(block))}
          </article>
        </div>
      </DialogContent>
    </Dialog>
  );
}
