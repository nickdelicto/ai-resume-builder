# Blog Section Documentation

## Overview

The blog section of the IntelliResume.net website is designed to support multiple content silos:

1. **Resume Examples** - Industry-specific resume examples and templates
2. **Job Descriptions** - Detailed job descriptions for various roles
3. **Career Advice** - Articles with job search tips and career guidance

This structure allows for better SEO targeting and provides valuable content for users at different stages of their job search process.

## Directory Structure

```
├── components/blog/
│   ├── CategoryNav.jsx         # Navigation for categories and content silos
│   ├── PostCard.jsx            # Card component for displaying blog posts
│   ├── RelatedPosts.jsx        # Component for displaying related posts
│   ├── TableOfContents.jsx     # Table of contents for blog posts
│   ├── SkillsSection.jsx       # Component for displaying skills in resume examples
│   └── ResumeExample.jsx       # Component for displaying resume examples
├── data/blog/
│   ├── categories.json         # Categories data
│   └── posts/                  # Blog post content in MDX format
│       ├── software-engineer-resume.mdx
│       ├── registered-nurse-job-description.mdx
│       └── job-interview-tips.mdx
├── lib/blog/
│   └── api.js                  # API utility functions for the blog
├── pages/
│   ├── api/blog/
│   │   ├── getCategories.js    # API endpoint for fetching categories
│   │   ├── getPosts.js         # API endpoint for fetching posts
│   │   └── getPostBySlug.js    # API endpoint for fetching a single post
│   ├── blog/
│   │   ├── index.js            # Blog landing page
│   │   ├── [category].js       # Category page
│   │   └── [category]/[slug].js # Blog post page
│   └── blog-sitemap.xml.js     # Blog-specific sitemap generator
└── public/images/blog/
    ├── authors/               # Author profile images
    ├── occupations/           # Resume example images
    ├── job-descriptions/      # Job description images
    └── career-advice/         # Career advice article images
```

## Content Structure

### Blog Posts

Blog posts are stored as MDX files in the `data/blog/posts/` directory. Each post has frontmatter with metadata:

```mdx
---
title: "Post Title"
slug: "post-slug"
category: "category-slug"
contentType: "Resume Example" | "Job Description" | "Career Advice"
publishedDate: "YYYY-MM-DD"
updatedDate: "YYYY-MM-DD"
author:
  name: "Author Name"
  avatar: "/images/blog/authors/author-image.jpg"
featured: true | false
description: "Brief description of the post"
featuredImage:
  src: "/images/blog/path/to/image.jpg"
  alt: "Image alt text"
seo:
  title: "SEO Title"
  description: "SEO Description"
  keywords:
    - "keyword1"
    - "keyword2"
tags:
  - "Tag 1"
  - "Tag 2"
---

## Content starts here

Regular markdown content...
```

#### Special Post Types

**Resume Examples** can include additional frontmatter:

```mdx
occupation: "job-title-slug"
resumeExample:
  imageSrc: "/images/blog/occupations/example.jpg"
  templateName: "Professional"
  downloadPdfUrl: "/downloads/example.pdf"
```

**Job Descriptions** can include:

```mdx
jobTitle: "Job Title"
```

### Categories

Categories are defined in `data/blog/categories.json`:

```json
[
  {
    "id": "technology",
    "name": "Technology",
    "slug": "technology",
    "description": "Technology industry resources",
    "color": "#4299e1",
    "featured": true,
    "seo": {
      "title": "Technology Resources",
      "description": "Technology industry resources",
      "keywords": ["tech", "software"]
    }
  }
]
```

## Components

### CategoryNav

Navigation component for browsing content by category or content silo.

### PostCard

Card component for displaying blog posts in lists.

### RelatedPosts

Component for displaying related posts at the bottom of a blog post.

### TableOfContents

Component that generates a table of contents from headings in a blog post.

### SkillsSection

Component for displaying skills in resume example posts.

### ResumeExample

Component for displaying resume examples with download options.

## API Functions

The `lib/blog/api.js` file contains utility functions for fetching blog data:

- `getAllPosts()` - Get all blog posts
- `getPostsByCategory(categorySlug)` - Get posts by category
- `getFeaturedPosts(limit)` - Get featured posts
- `getPostBySlug(slug)` - Get a single post by slug
- `getCategories()` - Get all categories
- `getFeaturedCategories()` - Get featured categories
- `getCategoryBySlug(slug)` - Get a category by slug
- `getRelatedPosts(currentSlug, limit)` - Get related posts
- `getAllPostPaths()` - Get all post paths for static generation
- `getAllCategoryPaths()` - Get all category paths for static generation
- `getOccupationBySlug(slug)` - Get occupation data by slug

## API Endpoints

The `/pages/api/blog/` directory contains API endpoints:

- `getCategories.js` - Endpoint for fetching categories
- `getPosts.js` - Endpoint for fetching posts with filtering
- `getPostBySlug.js` - Endpoint for fetching a single post

## SEO Optimization

The blog includes several SEO features:

1. **Meta Tags** - Each page has appropriate meta tags for title, description, and keywords
2. **Structured Data** - Blog posts include Schema.org structured data
3. **Sitemaps** - Two sitemap approaches are used:
   - The main site sitemap is generated by `next-sitemap` during build
   - A blog-specific sitemap is available at `/blog-sitemap.xml` for dynamic blog content
4. **Open Graph Tags** - For better social media sharing

## Adding New Content

### Adding a New Blog Post

1. Create a new MDX file in `data/blog/posts/`
2. Add the required frontmatter
3. Write your content using Markdown
4. Add any images to the appropriate directory in `public/images/blog/`

### Adding a New Category

1. Add the category to `data/blog/categories.json`
2. Make sure to include all required fields (id, name, slug, description)

## Customization

### Styling

Each component includes its own scoped styles using the `styled-jsx` library. To modify styles, edit the `<style jsx>` section in each component.

### Layout

The main layout components are:
- Blog landing page (`pages/blog/index.js`)
- Category page (`pages/blog/[category].js`)
- Blog post page (`pages/blog/[category]/[slug].js`)

## Future Improvements

1. **Search Functionality** - Add search capability for blog content
2. **Pagination** - Add pagination for category pages with many posts
3. **Comments System** - Add a comments system for blog posts
4. **Author Pages** - Create pages for each author with their bio and posts
5. **Newsletter Integration** - Add newsletter signup forms in the blog