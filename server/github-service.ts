import { Octokit } from '@octokit/rest';

let connectionSettings: any;

async function getAccessToken(): Promise<string> {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
export async function getUncachableGitHubClient(): Promise<Octokit> {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

export class GitHubService {
  async getRepositories() {
    try {
      const octokit = await getUncachableGitHubClient();
      const { data: repos } = await octokit.repos.listForAuthenticatedUser({
        sort: 'updated',
        per_page: 100,
        type: 'owner'
      });

      return repos.map(repo => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        private: repo.private,
        htmlUrl: repo.html_url,
        defaultBranch: repo.default_branch,
        updatedAt: repo.updated_at,
        createdAt: repo.created_at,
        size: repo.size,
        language: repo.language,
        stargazersCount: repo.stargazers_count,
        forksCount: repo.forks_count
      }));
    } catch (error) {
      console.error('❌ Greška pri dobijanju repozitorija:', error);
      throw new Error('Greška pri dobijanju GitHub repozitorija');
    }
  }

  async createRepository(name: string, description?: string, isPrivate: boolean = true) {
    try {
      const octokit = await getUncachableGitHubClient();
      const { data: repo } = await octokit.repos.createForAuthenticatedUser({
        name,
        description: description || `Automatski backup za ${name}`,
        private: isPrivate,
        auto_init: true
      });

      return {
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        htmlUrl: repo.html_url,
        cloneUrl: repo.clone_url,
        defaultBranch: repo.default_branch
      };
    } catch (error) {
      console.error('❌ Greška pri kreiranju repozitorija:', error);
      throw new Error('Greška pri kreiranju GitHub repozitorija');
    }
  }

  async uploadFile(
    owner: string, 
    repo: string, 
    path: string, 
    content: string, 
    message: string,
    branch: string = 'main'
  ) {
    try {
      const octokit = await getUncachableGitHubClient();
      
      // Pokušaj da dobiješ postojeći fajl da vidiš da li postoji
      let sha: string | undefined;
      try {
        const { data: existingFile } = await octokit.repos.getContent({
          owner,
          repo,
          path,
          ref: branch
        });
        if ('sha' in existingFile) {
          sha = existingFile.sha;
        }
      } catch (error: any) {
        // Fajl ne postoji, to je OK
        if (error.status !== 404) {
          throw error;
        }
      }

      // Kreiraj ili ažuriraj fajl
      const { data } = await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message,
        content: Buffer.from(content).toString('base64'),
        branch,
        sha
      });

      return {
        path: data.content?.path,
        sha: data.content?.sha,
        url: data.content?.html_url
      };
    } catch (error) {
      console.error(`❌ Greška pri uploadu fajla ${path}:`, error);
      throw new Error(`Greška pri uploadu fajla ${path}`);
    }
  }

  async createBackup(repoName: string) {
    try {
      console.log('🔄 Počinje kreiranje backup-a...');
      
      // 1. Kreiraj repozitorij ako ne postoji
      let repository;
      try {
        const octokit = await getUncachableGitHubClient();
        const { data } = await octokit.repos.get({
          owner: (await octokit.users.getAuthenticated()).data.login,
          repo: repoName
        });
        repository = data;
        console.log('📁 Repozitorij već postoji:', repository.full_name);
      } catch (error: any) {
        if (error.status === 404) {
          repository = await this.createRepository(
            repoName, 
            'Automatski backup Replit aplikacije - FrigoSistem',
            true
          );
          console.log('✅ Kreiran novi repozitorij:', repository.fullName);
        } else {
          throw error;
        }
      }

      const owner = repository.full_name?.split('/')[0] || repository.name;

      // 2. Backup ključnih fajlova
      const filesToBackup = [
        'package.json',
        'shared/schema.ts',
        'server/routes.ts', 
        'server/storage.ts',
        'client/src/App.tsx',
        'theme.json',
        'vite.config.ts'
      ];

      const backupResults = [];
      
      for (const filePath of filesToBackup) {
        try {
          const { promises: fs } = await import('fs');
          const content = await fs.readFile(filePath, 'utf-8');
          
          const result = await this.uploadFile(
            owner,
            repoName,
            filePath,
            content,
            `📦 Backup: ${filePath} - ${new Date().toISOString()}`
          );
          
          backupResults.push({
            file: filePath,
            success: true,
            url: result.url
          });
          
          console.log(`✅ Backup završen za: ${filePath}`);
        } catch (error) {
          console.error(`❌ Greška pri backup-u ${filePath}:`, error);
          backupResults.push({
            file: filePath,
            success: false,
            error: error instanceof Error ? error.message : 'Nepoznata greška'
          });
        }
      }

      // 3. Kreiraj README sa informacijama
      const readmeContent = `# FrigoSistem - Automatski Backup

## Informacije o backup-u
- **Datum kreiranja**: ${new Date().toLocaleString('sr-RS')}
- **Automatski kreiran**: Replit Agent + GitHub integracija
- **Tip aplikacije**: Express + React + PostgreSQL

## Struktura projekta
- \`package.json\` - Zavisnosti i skriptovi
- \`shared/schema.ts\` - Baza podataka schema (Drizzle ORM)
- \`server/routes.ts\` - API rute i backend logika
- \`server/storage.ts\` - Storage interfejs
- \`client/src/App.tsx\` - React aplikacija
- \`theme.json\` - Tema i dizajn
- \`vite.config.ts\` - Vite konfiguracija

## Restore instrukcije
1. Kloniraj repozitorij: \`git clone ${repository.html_url}\`
2. Instaliraj zavisnosti: \`npm install\`
3. Pokreni aplikaciju: \`npm run dev\`

---
*Automatski generisan ${new Date().toISOString()}*
`;

      await this.uploadFile(
        owner,
        repoName,
        'README.md',
        readmeContent,
        '📝 Kreiran README sa backup informacijama'
      );

      console.log('✅ Backup potpuno završen!');

      return {
        repository: repository.html_url,
        backupResults,
        totalFiles: backupResults.length,
        successfulFiles: backupResults.filter(r => r.success).length,
        completedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Greška pri kreiranju backup-a:', error);
      throw new Error('Greška pri kreiranju automatskog backup-a');
    }
  }

  async getUserInfo() {
    try {
      const octokit = await getUncachableGitHubClient();
      const { data: user } = await octokit.users.getAuthenticated();
      
      return {
        login: user.login,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatar_url,
        htmlUrl: user.html_url,
        publicRepos: user.public_repos,
        privateRepos: user.total_private_repos
      };
    } catch (error) {
      console.error('❌ Greška pri dobijanju korisničkih podataka:', error);
      throw new Error('Greška pri dobijanju GitHub korisničkih podataka');
    }
  }
}

export const githubService = new GitHubService();