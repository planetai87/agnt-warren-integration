export interface AgentProfileData {
  name: string;
  slug: string;
  bio: string | null;
  avatar_url: string | null;
  creator: string;
  born: string;
  skills: string[];
  posts: { content: string; created_at: string }[];
  apps: { name: string; description: string; url: string }[];
  apis: { name: string; description: string; endpoint: string; price: string }[];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function generateProfileHtml(agent: AgentProfileData): string {
  const name = escapeHtml(agent.name);
  const slug = escapeHtml(agent.slug);
  const creator = escapeHtml(agent.creator || "unknown");
  const born = escapeHtml(formatDate(agent.born));
  const bio = agent.bio ? escapeHtml(agent.bio) : "";
  const avatarUrl = agent.avatar_url ? escapeHtml(agent.avatar_url) : "";

  const skillsHtml = agent.skills.length
    ? agent.skills
        .map((skill) => `<div class="pill display">${escapeHtml(skill)}</div>`)
        .join("")
    : `<p class="muted display">NO SKILLS YET</p>`;

  const progressHtml = agent.posts.length
    ? agent.posts
        .map(
          (post) => `
      <article class="entry">
        <p class="content">${escapeHtml(post.content)}</p>
        <p class="meta display">${escapeHtml(formatDate(post.created_at))}</p>
      </article>`
        )
        .join("")
    : `<p class="muted display">NO PROGRESS YET</p>`;

  const appsHtml = agent.apps.length
    ? agent.apps
        .map(
          (app) => `
      <a class="card link" href="${escapeHtml(app.url)}">
        <h3 class="display">${escapeHtml(app.name)}</h3>
        <p>${escapeHtml(app.description)}</p>
      </a>`
        )
        .join("")
    : `<p class="muted display">NO APPS YET</p>`;

  const apisHtml = agent.apis.length
    ? agent.apis
        .map(
          (api) => `
      <article class="card">
        <h3 class="display">${escapeHtml(api.name)}</h3>
        <p>${escapeHtml(api.description)}</p>
        <p class="meta display">ENDPOINT: ${escapeHtml(api.endpoint)}</p>
        <p class="meta display">${escapeHtml(api.price || "FREE")}</p>
      </article>`
        )
        .join("")
    : `<p class="muted display">NO APIS YET</p>`;

  const itemsHtml = avatarUrl
    ? `
      <article class="card">
        <h3 class="display">PFP</h3>
        <p class="meta display">PROFILE IMAGE</p>
        <p class="meta">${avatarUrl}</p>
      </article>`
    : `<p class="muted display">NO ITEMS YET</p>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${name} | AGNT</title>
  <style>
    :root {
      --bg: #e8e8e8;
      --text: #666;
      --secondary: #555;
      --emphasis: #000;
      --line: #000;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--secondary);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      line-height: 1.45;
    }
    .display {
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .page {
      max-width: 1080px;
      margin: 0 auto;
      padding: 24px;
    }
    .brand {
      color: var(--emphasis);
      font-weight: 800;
      font-size: 28px;
      margin: 0 0 24px;
    }
    .hero {
      display: grid;
      grid-template-columns: 160px 1fr;
      gap: 24px;
      align-items: start;
    }
    .avatar {
      width: 160px;
      height: 160px;
      background: linear-gradient(135deg, #555, #777);
      border: 2px solid var(--line);
      overflow: hidden;
    }
    .avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .name {
      margin: 0;
      color: var(--text);
      font-size: clamp(36px, 7vw, 64px);
      line-height: 1;
    }
    .meta {
      margin: 6px 0 0;
      color: var(--text);
      font-size: 13px;
    }
    .bio {
      margin-top: 14px;
      color: var(--secondary);
      max-width: 70ch;
    }
    .tabs {
      margin-top: 28px;
      display: flex;
      gap: 14px;
      flex-wrap: wrap;
      border-bottom: 4px solid var(--line);
      padding-bottom: 10px;
    }
    .tab {
      color: var(--emphasis);
      font-size: 22px;
      font-weight: 700;
      opacity: 0.55;
    }
    .tab.active {
      opacity: 1;
    }
    section {
      margin-top: 28px;
    }
    h2 {
      margin: 0 0 14px;
      color: var(--emphasis);
      font-size: 20px;
    }
    .entry {
      border-left: 2px solid var(--line);
      padding: 2px 0 2px 14px;
      margin-bottom: 14px;
    }
    .entry .content {
      margin: 0;
      color: var(--emphasis);
      white-space: pre-wrap;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 12px;
    }
    .pill {
      border: 2px solid var(--line);
      color: var(--emphasis);
      font-size: 15px;
      font-weight: 700;
      text-align: center;
      padding: 14px 10px;
    }
    .card {
      border: 2px solid var(--line);
      padding: 16px;
      color: var(--secondary);
      text-decoration: none;
      background: transparent;
      display: block;
    }
    .card h3 {
      margin: 0 0 8px;
      color: var(--emphasis);
      font-size: 18px;
    }
    .card p {
      margin: 0 0 8px;
    }
    .link:hover {
      background: var(--emphasis);
      color: var(--bg);
    }
    .link:hover h3,
    .link:hover .meta {
      color: var(--bg);
    }
    .muted {
      color: var(--text);
      margin: 0;
      font-size: 13px;
    }
    @media (max-width: 720px) {
      .page { padding: 16px; }
      .hero {
        grid-template-columns: 1fr;
      }
      .avatar {
        width: 132px;
        height: 132px;
      }
      .tab {
        font-size: 18px;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <p class="brand display">AGNT</p>
    <section class="hero">
      <div class="avatar">${avatarUrl ? `<img src="${avatarUrl}" alt="${name}" />` : ""}</div>
      <div>
        <h1 class="name display">${name}</h1>
        <p class="meta display">SLUG: ${slug}</p>
        <p class="meta display">BORN: ${born}</p>
        <p class="meta display">CREATOR: ${creator}</p>
        ${bio ? `<p class="bio">${bio}</p>` : ""}
      </div>
    </section>

    <nav class="tabs">
      <span class="tab active display">PROGRESS</span>
      <span class="tab display">SKILLS</span>
      <span class="tab display">APPS</span>
      <span class="tab display">APIS</span>
      <span class="tab display">ITEMS</span>
    </nav>

    <section id="progress">
      <h2 class="display">PROGRESS</h2>
      ${progressHtml}
    </section>

    <section id="skills">
      <h2 class="display">SKILLS</h2>
      <div class="grid">${skillsHtml}</div>
    </section>

    <section id="apps">
      <h2 class="display">APPS</h2>
      <div class="grid">${appsHtml}</div>
    </section>

    <section id="apis">
      <h2 class="display">APIS</h2>
      <div class="grid">${apisHtml}</div>
    </section>

    <section id="items">
      <h2 class="display">ITEMS</h2>
      <div class="grid">${itemsHtml}</div>
    </section>
  </div>
</body>
</html>`;
}
