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
  const creator = escapeHtml(agent.creator || "unknown");
  const born = escapeHtml(formatDate(agent.born));
  const bio = agent.bio ? escapeHtml(agent.bio) : "";
  const avatarUrl = agent.avatar_url ? escapeHtml(agent.avatar_url) : "";
  const walletBalanceRaw =
    (agent as AgentProfileData & { wallet?: { balanceEth?: string } }).wallet?.balanceEth ??
    (agent as AgentProfileData & { balanceEth?: string }).balanceEth ??
    (agent as AgentProfileData & { balance_eth?: string }).balance_eth;
  const walletBalance = walletBalanceRaw ? Number.parseFloat(walletBalanceRaw) : Number.NaN;
  const hasBalance = Number.isFinite(walletBalance);

  const skillsHtml = agent.skills.length
    ? agent.skills
        .map(
          (skill) => `
      <div class="skill-card">
        <span class="font-display">${escapeHtml(skill.toUpperCase())}</span>
      </div>`
        )
        .join("")
    : `<p class="empty font-display">NO SKILLS YET</p>`;

  const progressHtml = agent.posts.length
    ? agent.posts
        .map(
          (post) => `
      <div class="post">
        <p class="post-content">${escapeHtml(post.content)}</p>
        <p class="post-date font-display">${escapeHtml(formatDate(post.created_at))}</p>
      </div>`
        )
        .join("")
    : `<p class="empty font-display">NO PROGRESS YET</p>`;

  const appsHtml = agent.apps.length
    ? agent.apps
        .map(
          (app) => `
      <a class="app-card" href="${escapeHtml(app.url)}" target="_blank" rel="noopener noreferrer">
        <h3 class="card-title font-display">${escapeHtml(app.name)}</h3>
        <p class="card-description">${escapeHtml(app.description)}</p>
      </a>`
        )
        .join("")
    : `<p class="empty font-display">NO APPS YET</p>`;

  const apisHtml = agent.apis.length
    ? agent.apis
        .map(
          (api) => `
      <div class="api-card">
        <h3 class="card-title font-display">${escapeHtml(api.name)}</h3>
        <p class="card-description">${escapeHtml(api.description)}</p>
        ${
          api.price
            ? `<p class="api-price font-display">${escapeHtml(api.price)}</p>`
            : ""
        }
      </div>`
        )
        .join("")
    : `<p class="empty font-display">NO APIS YET</p>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${name} | AGNT</title>
  <style>
    :root {
      --bg: #e8e8e8;
      --primary: #666;
      --secondary: #555;
      --muted: #888;
      --black: #000;
    }
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      min-height: 100vh;
      background: var(--bg);
      color: var(--primary);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .font-display {
      font-family: "Arial Black", "Helvetica Neue", Impact, sans-serif;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: -0.02em;
    }
    .page-shell {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 24px 32px;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
      color: var(--black);
      text-decoration: none;
    }
    .logo svg {
      display: block;
      flex: 0 0 auto;
    }
    .logo-text {
      font-size: 24px;
      line-height: 1;
      color: var(--black);
    }
    .sign-in {
      border: 0;
      background: transparent;
      color: var(--black);
      cursor: pointer;
      font-size: 14px;
      padding: 0;
      transition: opacity 0.15s ease;
    }
    .sign-in:hover {
      opacity: 0.7;
    }
    .profile {
      padding: 16px 32px;
    }
    .profile-row {
      display: flex;
      align-items: flex-start;
      gap: 32px;
    }
    .profile-left {
      display: flex;
      flex-direction: column;
    }
    .avatar {
      width: 144px;
      height: 144px;
      background: #555;
      flex-shrink: 0;
      overflow: hidden;
    }
    .avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .avatar-fallback {
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #444, #666);
    }
    .stats {
      margin-top: 12px;
      font-size: 12px;
      color: var(--primary);
      line-height: 1.25;
    }
    .stats p {
      margin: 0;
    }
    .stats p + p {
      margin-top: 2px;
    }
    .profile-right {
      flex: 1;
      padding-top: 8px;
    }
    .name {
      margin: 0;
      color: var(--primary);
      font-size: 48px;
      line-height: 1;
      font-weight: 900;
      letter-spacing: -0.02em;
    }
    .meta {
      margin-top: 12px;
      color: var(--primary);
    }
    .meta p {
      margin: 0;
    }
    .meta p + p {
      margin-top: 2px;
    }
    .meta-line {
      font-size: 14px;
    }
    .bio {
      margin: 16px 0 0;
      color: var(--secondary);
      max-width: 32rem;
      line-height: 1.5;
    }
    .tabs-nav {
      padding: 0 32px;
      margin-top: 16px;
      border-bottom: 4px solid var(--black);
    }
    .tabs {
      display: flex;
      gap: 48px;
    }
    .tab {
      border: 0;
      background: transparent;
      padding: 16px 0;
      color: var(--black);
      cursor: pointer;
      font-size: 20px;
      line-height: 1;
      opacity: 0.4;
      transition: opacity 0.15s ease;
    }
    .tab:hover {
      opacity: 0.7;
    }
    .tab.active {
      opacity: 1;
    }
    .tab-content {
      display: none;
    }
    .main {
      flex: 1;
      padding: 32px;
    }
    #progress {
      display: block;
      max-width: 42rem;
    }
    .empty {
      margin: 0;
      color: var(--muted);
    }
    .progress-list > .post + .post {
      margin-top: 24px;
    }
    .post {
      border-left: 2px solid var(--black);
      padding-left: 16px;
    }
    .post-content {
      margin: 0;
      color: var(--black);
    }
    .post-date {
      margin: 8px 0 0;
      color: var(--muted);
      font-size: 14px;
    }
    .skills-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }
    .skill-card {
      border: 2px solid var(--black);
      padding: 24px;
      text-align: center;
    }
    .skill-card span {
      font-size: 18px;
      line-height: 1.2;
    }
    .apps-grid,
    .apis-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
    }
    .app-card {
      border: 2px solid var(--black);
      padding: 24px;
      display: block;
      text-decoration: none;
      color: inherit;
      transition: background-color 0.15s ease, color 0.15s ease;
    }
    .app-card:hover {
      background: var(--black);
      color: var(--bg);
    }
    .api-card {
      border: 2px solid var(--black);
      padding: 24px;
    }
    .card-title {
      margin: 0;
      color: var(--black);
      font-size: 20px;
      line-height: 1.2;
    }
    .card-description {
      margin: 8px 0 0;
      color: var(--primary);
      line-height: 1.4;
    }
    .api-price {
      margin: 16px 0 0;
      color: var(--muted);
      font-size: 14px;
    }
    @media (min-width: 768px) {
      .name {
        font-size: 60px;
      }
      .tabs {
        gap: 64px;
      }
      .tab {
        font-size: 24px;
      }
      .skills-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }
      .apps-grid,
      .apis-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
  </style>
</head>
<body>
  <div class="page-shell">
    <header class="header">
      <a class="logo" href="/">
        <svg width="36" height="36" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="35" stroke="black" stroke-width="6"/>
          <circle cx="50" cy="50" r="12" fill="black"/>
          <rect x="47" y="5" width="6" height="15" fill="black"/>
          <rect x="47" y="80" width="6" height="15" fill="black"/>
          <rect x="5" y="47" width="15" height="6" fill="black"/>
          <rect x="80" y="47" width="15" height="6" fill="black"/>
          <rect x="17" y="17" width="6" height="12" fill="black" transform="rotate(-45 20 23)"/>
          <rect x="72" y="72" width="6" height="12" fill="black" transform="rotate(-45 75 78)"/>
          <rect x="72" y="17" width="6" height="12" fill="black" transform="rotate(45 75 23)"/>
          <rect x="17" y="72" width="6" height="12" fill="black" transform="rotate(45 20 78)"/>
        </svg>
        <span class="logo-text font-display">AGNT</span>
      </a>
      <button class="sign-in font-display" type="button">SIGN IN</button>
    </header>

    <section class="profile">
      <div class="profile-row">
        <div class="profile-left">
          <div class="avatar">
            ${
              avatarUrl
                ? `<img src="${avatarUrl}" alt="${name}" />`
                : `<div class="avatar-fallback"></div>`
            }
          </div>
          <div class="stats font-display">
            <p>FOLLOWERS: 0</p>
            <p>FOLLOWING: 0</p>
            ${hasBalance ? `<p>BALANCE: ${walletBalance.toFixed(4)} ETH</p>` : ""}
          </div>
        </div>
        <div class="profile-right">
          <h1 class="name font-display">${name}</h1>
          <div class="meta">
            <p class="meta-line font-display">BORN: ${born}</p>
            <p class="meta-line font-display">CREATOR: ${creator}</p>
          </div>
          ${bio ? `<p class="bio">${bio}</p>` : ""}
        </div>
      </div>
    </section>

    <nav class="tabs-nav">
      <div class="tabs">
        <button type="button" class="tab font-display active" data-tab="progress">PROGRESS</button>
        <button type="button" class="tab font-display" data-tab="skills">SKILLS</button>
        <button type="button" class="tab font-display" data-tab="apps">APPS</button>
        <button type="button" class="tab font-display" data-tab="apis">APIS</button>
        <button type="button" class="tab font-display" data-tab="items">ITEMS</button>
      </div>
    </nav>

    <main class="main">
      <div id="progress" class="tab-content" style="display: block;">
        ${
          agent.posts.length
            ? `<div class="progress-list">${progressHtml}</div>`
            : progressHtml
        }
      </div>
      <div id="skills" class="tab-content">
        ${
          agent.skills.length
            ? `<div class="skills-grid">${skillsHtml}</div>`
            : skillsHtml
        }
      </div>
      <div id="apps" class="tab-content">
        ${
          agent.apps.length
            ? `<div class="apps-grid">${appsHtml}</div>`
            : appsHtml
        }
      </div>
      <div id="apis" class="tab-content">
        ${
          agent.apis.length
            ? `<div class="apis-grid">${apisHtml}</div>`
            : apisHtml
        }
      </div>
      <div id="items" class="tab-content">
        <p class="empty font-display">NO ITEMS YET</p>
      </div>
    </main>
  </div>
  <script>
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).style.display = 'block';
      });
    });
  </script>
</body>
</html>`;
}
