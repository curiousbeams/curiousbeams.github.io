// Helper function to create HTML from template strings
function html(strings, ...values) {
  const htmlString = strings.reduce((result, str, i) => {
    return result + str + (values[i] || '');
  }, '');
  
  const template = document.createElement('template');
  template.innerHTML = htmlString.trim();
  return template.content;
}

// Helper function for htm (used in org card)
function htm(strings, ...values) {
  return html(strings, ...values);
}

// Icon helper - now creates both light and dark mode versions
function icon(name, size = 16) {
  const container = document.createElement('span');
  container.style.display = 'inline-flex';
  container.style.alignItems = 'center';
  container.style.width = `${size}px`;
  container.style.height = `${size}px`;
  container.style.position = 'relative';
  
  // Light mode icon (black)
  const imgLight = document.createElement('img');
  imgLight.src = `https://raw.githubusercontent.com/primer/octicons/main/icons/${name}-${size}.svg`;
  imgLight.width = size;
  imgLight.height = size;
  imgLight.className = 'dark:hidden';
  imgLight.alt = '';
  imgLight.style.position = 'absolute';
  
  // Dark mode icon (white)
  const imgDark = document.createElement('img');
  imgDark.src = `https://raw.githubusercontent.com/primer/octicons/main/icons/${name}-${size}.svg`;
  imgDark.width = size;
  imgDark.height = size;
  imgDark.style.filter = 'invert(1)';
  imgDark.className = 'hidden dark:block';
  imgDark.alt = '';
  imgDark.style.position = 'absolute';
  
  container.appendChild(imgLight);
  container.appendChild(imgDark);
  
  return container;
}

// Fetch functions
async function fetchGithubUsers(usernames) {
  const users = await Promise.all(
    usernames.map((u) =>
      fetch(`https://api.github.com/users/${u}`).then((r) => r.json())
    )
  );
  return users;
}

async function fetchGithubRepos(reponames) {
  const repos = await Promise.all(
    reponames.map((u) =>
      fetch(`https://api.github.com/repos/${u}`).then((r) => r.json())
    )
  );
  return repos;
}

async function fetchGithubOrganizations(orgnames) {
  const orgs = await Promise.all(
    orgnames.map((org) =>
      fetch(`https://api.github.com/orgs/${org}`).then((r) => r.json())
    )
  );
  return orgs;
}

async function fetchGithubOrgStats(orgnames) {
  const repos = await Promise.all(
    orgnames.map((org) =>
      fetch(`https://api.github.com/orgs/${org}/repos?per_page=100`).then((r) =>
        r.json()
      )
    )
  );
  return repos.map((repo) => orgStats(repo));
}

function orgStats(orgRepos) {
  return {
    repoCount: orgRepos.length,
    stars: orgRepos.reduce((s, r) => s + r.stargazers_count, 0),
    forks: orgRepos.reduce((s, r) => s + r.forks_count, 0),
    watchers: orgRepos.reduce((s, r) => s + r.watchers_count, 0),
    topRepos: [...orgRepos]
      .sort((a, b) => b.stargazers_count - a.stargazers_count)
      .slice(0, 3)
  };
}

// Card creation functions
function githubCard({ href, maxWidth, content }) {
  const a = document.createElement('a');
  a.className = 'github-card';
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  if (maxWidth) {
    a.style.maxWidth = `${maxWidth}px`;
  }
  a.appendChild(content);
  return a;
}

function githubUserCard(userData, maxWidth) {
  const headerDiv = document.createElement('div');
  headerDiv.className = 'github-header';
  
  const img = document.createElement('img');
  img.src = userData.avatar_url;
  
  const infoDiv = document.createElement('div');
  const strong = document.createElement('strong');
  strong.textContent = userData.name || userData.login;
  const br = document.createElement('br');
  const small = document.createElement('small');
  small.textContent = `@${userData.login}`;
  
  infoDiv.appendChild(strong);
  infoDiv.appendChild(br);
  infoDiv.appendChild(small);
  
  headerDiv.appendChild(img);
  headerDiv.appendChild(infoDiv);
  
  const statsDiv = document.createElement('div');
  statsDiv.className = 'github-stats';
  
  const repoDiv = document.createElement('div');
  repoDiv.appendChild(icon('repo', 16));
  repoDiv.appendChild(document.createTextNode(` ${userData.public_repos} repos`));
  
  const followersDiv = document.createElement('div');
  followersDiv.appendChild(icon('people', 16));
  followersDiv.appendChild(document.createTextNode(` ${userData.followers} followers`));
  
  const followingDiv = document.createElement('div');
  followingDiv.appendChild(icon('people', 16));
  followingDiv.appendChild(document.createTextNode(` ${userData.following} following`));
  
  statsDiv.appendChild(repoDiv);
  statsDiv.appendChild(followersDiv);
  statsDiv.appendChild(followingDiv);
  
  const content = document.createElement('div');
  content.appendChild(headerDiv);
  content.appendChild(statsDiv);
  
  return githubCard({
    href: userData.html_url,
    maxWidth: maxWidth,
    content
  });
}

function githubRepoCard(repoData, maxWidth) {
  const headerDiv = document.createElement('div');
  headerDiv.className = 'github-header';
  
  const img = document.createElement('img');
  img.src = repoData.owner.avatar_url;
  
  const infoDiv = document.createElement('div');
  const strong = document.createElement('strong');
  strong.textContent = repoData.name;
  const small1 = document.createElement('small');
  small1.textContent = ` ${repoData.owner.login}`;
  const br = document.createElement('br');
  const small2 = document.createElement('small');
  small2.textContent = repoData.description || '';
  
  infoDiv.appendChild(strong);
  infoDiv.appendChild(small1);
  infoDiv.appendChild(br);
  infoDiv.appendChild(small2);
  
  headerDiv.appendChild(img);
  headerDiv.appendChild(infoDiv);
  
  const statsDiv = document.createElement('div');
  statsDiv.className = 'github-stats';
  
  const starsDiv = document.createElement('div');
  starsDiv.appendChild(icon('star', 16));
  starsDiv.appendChild(document.createTextNode(` ${repoData.stargazers_count}`));
  
  const forksDiv = document.createElement('div');
  forksDiv.appendChild(icon('git-branch', 16));
  forksDiv.appendChild(document.createTextNode(` ${repoData.forks_count}`));
  
  const langDiv = document.createElement('div');
  langDiv.appendChild(icon('repo', 16));
  langDiv.appendChild(document.createTextNode(` ${repoData.language || ''}`));
  
  statsDiv.appendChild(starsDiv);
  statsDiv.appendChild(forksDiv);
  statsDiv.appendChild(langDiv);
  
  const content = document.createElement('div');
  content.appendChild(headerDiv);
  content.appendChild(statsDiv);
  
  return githubCard({
    href: repoData.html_url,
    maxWidth: maxWidth,
    content
  });
}

function githubOrgCard(orgData, stats, maxWidth) {
  const headerDiv = document.createElement('div');
  headerDiv.className = 'github-header';
  
  const img = document.createElement('img');
  img.src = orgData.avatar_url;
  
  const infoDiv = document.createElement('div');
  const strong = document.createElement('strong');
  strong.textContent = orgData.name || orgData.login;
  const br = document.createElement('br');
  const small = document.createElement('small');
  small.textContent = orgData.description || '';
  
  infoDiv.appendChild(strong);
  infoDiv.appendChild(br);
  infoDiv.appendChild(small);
  
  headerDiv.appendChild(img);
  headerDiv.appendChild(infoDiv);
  
  const statsDiv = document.createElement('div');
  statsDiv.className = 'github-stats';
  
  const repoDiv = document.createElement('div');
  repoDiv.appendChild(icon('repo', 16));
  repoDiv.appendChild(document.createTextNode(` ${stats.repoCount} repos`));
  
  const starsDiv = document.createElement('div');
  starsDiv.appendChild(icon('star', 16));
  starsDiv.appendChild(document.createTextNode(` ${stats.stars} stars`));
  
  const forksDiv = document.createElement('div');
  forksDiv.appendChild(icon('git-branch', 16));
  forksDiv.appendChild(document.createTextNode(` ${stats.forks} forks`));
  
  statsDiv.appendChild(repoDiv);
  statsDiv.appendChild(starsDiv);
  statsDiv.appendChild(forksDiv);
  
  const reposDiv = document.createElement('div');
  reposDiv.className = 'github-repos';
  reposDiv.style.marginTop = '1rem';
  
  const reposStrong = document.createElement('strong');
  reposStrong.textContent = 'Top repositories';
  
  const ul = document.createElement('ul');
  ul.style.margin = '0.5rem 0 0';
  ul.style.paddingLeft = '1rem';
  
  stats.topRepos.forEach((r) => {
    const li = document.createElement('li');
    li.appendChild(document.createTextNode(`${r.name} `));
    li.appendChild(icon('star', 16));
    li.appendChild(document.createTextNode(r.stargazers_count));
    ul.appendChild(li);
  });
  
  reposDiv.appendChild(reposStrong);
  reposDiv.appendChild(ul);
  
  const content = document.createElement('div');
  content.appendChild(headerDiv);
  content.appendChild(statsDiv);
  content.appendChild(reposDiv);
  
  return githubCard({
    href: orgData.html_url,
    maxWidth: maxWidth,
    content
  });
}

// Grid creation functions
async function githubUserGrid(usernames, maxWidth) {
  const users = await fetchGithubUsers(usernames);
  const grid = document.createElement('div');
  grid.className = 'github-user-grid';
  
  users.forEach((u) => {
    grid.appendChild(githubUserCard(u, maxWidth));
  });
  
  return grid;
}

async function githubReposGrid(reponames, maxWidth) {
  const repos = await fetchGithubRepos(reponames);
  const grid = document.createElement('div');
  grid.className = 'github-user-grid';
  
  repos.forEach((u) => {
    grid.appendChild(githubRepoCard(u, maxWidth));
  });
  
  return grid;
}

async function githubOrgGrid(orgnames, maxWidth) {
  const orgs = await fetchGithubOrganizations(orgnames);
  const stats = await fetchGithubOrgStats(orgnames);
  const grid = document.createElement('div');
  grid.className = 'github-user-grid';
  
  orgs.forEach((org, i) => {
    grid.appendChild(githubOrgCard(org, stats[i], maxWidth));
  });
  
  return grid;
}

// Widget export
export default {
  async initialize({ model }) {
    return () => {};
  },
  
  async render({ model, el }) {
    const organizations = model.get("organizations") || [];
    const users = model.get("users") || [];
    const repos = model.get("repos") || [];
    const cssUrl = model.get("css");
    const maxWidth = model.get("max_width"); // null/undefined means inherit from container
    
    // Load CSS if provided
    if (cssUrl) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = cssUrl;
      document.head.appendChild(link);
    } else {
      // Inject default styles
      const style = document.createElement('style');
      style.textContent = `
        .github-user-grid {
          display: grid;
          grid-template-columns: ${maxWidth ? `repeat(auto-fill, minmax(${maxWidth}px, 1fr))` : 'repeat(auto-fit, minmax(300px, 1fr))'};
          gap: 0.75rem;
        }
        .github-card,
        .github-card:link,
        .github-card:visited,
        .github-card:hover,
        .github-card:active {
          font-family: system-ui, sans-serif;
          color: inherit;
          text-decoration: none;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 0.75rem;
          display: block;
        }
        .github-card:hover {
          background: rgba(0,0,0,0.02);
        }
        .dark .github-card,
        .dark .github-card:link,
        .dark .github-card:visited,
        .dark .github-card:hover,
        .dark .github-card:active {
          border-color: #444;
        }
        .dark .github-card:hover {
          background: rgba(255,255,255,0.05);
        }
        .github-card:focus-visible {
          outline: 2px solid #0969da;
          outline-offset: 2px;
        }
        .github-header {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .github-header img {
          width: 48px;
          height: 48px;
          border-radius: 50%;
        }
        .github-stats {
          display: flex;
          justify-content: space-between;
        }
        .github-stats > div {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        .github-repos ul {
          list-style: none;
        }
        .github-repos li {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          margin-bottom: 0.25rem;
        }
      `;
      document.head.appendChild(style);
    }
    
    const container = document.createElement('div');
    container.className = 'github-api-widget-container';
    
    try {
      
      // Render organizations
      if (organizations && organizations.length > 0) {
        const orgSection = document.createElement('div');
        orgSection.className = 'github-section';
        
        const orgHeading = document.createElement('h2');
        orgHeading.textContent = 'Open-Source Organizations';
        orgSection.appendChild(orgHeading);
        
        const orgGrid = await githubOrgGrid(organizations, maxWidth);
        orgSection.appendChild(orgGrid);
        container.appendChild(orgSection);
      }
      
      // Render repos
      if (repos && repos.length > 0) {
        const repoSection = document.createElement('div');
        repoSection.className = 'github-section';
        
        const repoHeading = document.createElement('h2');
        repoHeading.textContent = 'Open-Source Repositories';
        repoSection.appendChild(repoHeading);
        
        const repoGrid = await githubReposGrid(repos, maxWidth);
        repoSection.appendChild(repoGrid);
        container.appendChild(repoSection);
      }

      // Render users
      if (users && users.length > 0) {
        const userSection = document.createElement('div');
        userSection.className = 'github-section';
        
        const userHeading = document.createElement('h2');
        userHeading.textContent = 'Github Users';
        userSection.appendChild(userHeading);
        
        const userGrid = await githubUserGrid(users, maxWidth);
        userSection.appendChild(userGrid);
        container.appendChild(userSection);
      }
      
      el.appendChild(container);
      
    } catch (error) {
      console.error('Error rendering GitHub widget:', error);
      el.innerHTML = `<p style="color: red;">Error loading GitHub data: ${error.message}</p>`;
    }
    
    return () => {
      // Cleanup
      container.remove();
    };
  }
};